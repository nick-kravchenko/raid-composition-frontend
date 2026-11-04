import { TitleCasePipe, UpperCasePipe, isPlatformBrowser } from '@angular/common';
import {
  Component,
  OnInit,
  PLATFORM_ID,
  computed,
  inject,
  signal,
  ChangeDetectionStrategy,
} from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { firstValueFrom, forkJoin, of, switchMap } from 'rxjs';

import { AuthService } from '../auth/auth.service';
import { GAME_VERSIONS, specIcon } from '../game-data';
import { Character, GameVersion, Guild, GuildMember } from '../guild.models';
import { GuildService } from '../guild.service';
import { CharacterFormComponent } from './character-form.component';

@Component({
  selector: 'rc-guild-detail',
  standalone: true,
  imports: [RouterLink, TitleCasePipe, UpperCasePipe, CharacterFormComponent],
  templateUrl: './guild-detail.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './guild-detail.component.scss',
})
export class GuildDetailComponent implements OnInit {
  private readonly guildService = inject(GuildService);
  private readonly authService = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly platformId = inject(PLATFORM_ID);

  readonly currentUser = this.authService.currentUser;

  guild = signal<Guild | null>(null);
  members = signal<GuildMember[]>([]);
  characters = signal<Character[]>([]);
  loadError = signal<string | null>(null);
  inviteUrl = signal<string | null>(null);
  generatingInvite = signal(false);
  promotingUserId = signal<string | null>(null);
  unauthenticated = signal(false);
  readonly gameVersions = GAME_VERSIONS;
  gameVersion = signal<GameVersion>('classicann');
  actionError = signal<string | null>(null);
  inviteCopied = signal(false);
  showCharacterForm = signal(false);
  editingCharacter = signal<Character | null>(null);

  isAdmin = computed(() => this.guild()?.membership_role === 'admin');
  isApplicant = computed(() => this.guild()?.membership_role === 'applicant');
  isLeader = computed(() => {
    const role = this.guild()?.membership_role;
    return role === 'admin' || role === 'officer';
  });
  // After rotating, show the new URL; otherwise fall back to the guild's existing invite_url.
  displayInviteUrl = computed(() => this.inviteUrl() ?? (this.guild()?.invite_url || null));

  groupedByClass = computed(() => {
    const map = new Map<string, Character[]>();
    for (const c of this.characters().filter((c) => c.game_version === this.gameVersion())) {
      const key = c.class;
      const group = map.get(key) ?? [];
      group.push(c);
      map.set(key, group);
    }
    return [...map.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([className, chars]) => ({
        className,
        characters: [...chars].sort((a, b) => a.spec.localeCompare(b.spec)),
      }));
  });

  async ngOnInit(): Promise<void> {
    if (this.authService.currentUser() === null) {
      this.unauthenticated.set(true);
      return;
    }

    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.loadError.set('Guild ID is missing.');
      return;
    }

    try {
      // Chained rather than awaited in turn: a gap between requests would let SSR consider the app
      // stable and serialize the loading state.
      const { guild, members, characters } = await firstValueFrom(
        this.guildService.getGuild(id).pipe(
          switchMap((guild) =>
            // The API keeps the roster from applicants until an admin promotes them.
            guild.membership_role === 'applicant'
              ? of({ guild, members: [], characters: [] })
              : forkJoin({
                  guild: of(guild),
                  members: this.guildService.listMembers(id),
                  characters: this.guildService.listCharacters(id),
                }),
          ),
        ),
      );
      this.guild.set(guild);
      this.members.set(members);
      this.characters.set(characters);
    } catch {
      this.loadError.set('Failed to load guild. Please try again.');
    }
  }

  async onGenerateInvite(): Promise<void> {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) return;

    this.generatingInvite.set(true);
    try {
      const invite = await firstValueFrom(this.guildService.createInvite(id));
      const origin = isPlatformBrowser(this.platformId) ? window.location.origin : '';
      this.inviteUrl.set(origin + '/guild-invites/' + invite.code);
    } catch {
      this.actionError.set('Failed to create the invite. Please try again.');
    } finally {
      this.generatingInvite.set(false);
    }
  }

  async onPromoteMember(userId: string, role: 'raider' | 'officer'): Promise<void> {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) return;

    this.promotingUserId.set(userId);
    try {
      await firstValueFrom(this.guildService.promoteMember(id, userId, role));
      this.members.update((list) => list.map((m) => (m.user_id === userId ? { ...m, role } : m)));
    } catch {
      this.actionError.set('Failed to promote the member. Please try again.');
    } finally {
      this.promotingUserId.set(null);
    }
  }

  async onRejectApplicant(member: GuildMember): Promise<void> {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id || !window.confirm('Reject this applicant? Characters bound to them become unbound.')) {
      return;
    }
    this.actionError.set(null);
    try {
      await firstValueFrom(this.guildService.rejectApplicant(id, member.user_id));
      this.members.update((list) => list.filter((m) => m.user_id !== member.user_id));
      this.characters.update((list) =>
        list.map((c) => (c.user_id === member.user_id ? { ...c, user_id: null, owner: null } : c)),
      );
    } catch {
      this.actionError.set('Failed to reject the applicant. Please try again.');
    }
  }

  async onCopyInvite(): Promise<void> {
    const url = this.displayInviteUrl();
    if (!url) return;
    await navigator.clipboard.writeText(url);
    this.inviteCopied.set(true);
    setTimeout(() => this.inviteCopied.set(false), 2000);
  }

  onAddCharacter(): void {
    this.editingCharacter.set(null);
    this.showCharacterForm.set(true);
  }

  onEditCharacter(character: Character): void {
    this.editingCharacter.set(character);
    this.showCharacterForm.set(true);
  }

  onCharacterSaved(saved: Character): void {
    this.characters.update((list) =>
      list.some((c) => c.id === saved.id)
        ? list.map((c) => (c.id === saved.id ? saved : c))
        : [...list, saved],
    );
    this.showCharacterForm.set(false);
    this.editingCharacter.set(null);
  }

  onCharacterFormCancelled(): void {
    this.showCharacterForm.set(false);
    this.editingCharacter.set(null);
  }

  async onDeleteCharacter(character: Character): Promise<void> {
    if (!window.confirm(`Remove ${character.name} from the roster?`)) return;
    this.actionError.set(null);
    try {
      await firstValueFrom(this.guildService.deleteCharacter(character.id));
      this.characters.update((list) => list.filter((c) => c.id !== character.id));
    } catch {
      this.actionError.set('Failed to remove the character. Please try again.');
    }
  }

  async onBindCharacter(character: Character, userId: string): Promise<void> {
    this.actionError.set(null);
    try {
      const bound = await firstValueFrom(this.guildService.bindCharacter(character.id, userId || null));
      this.characters.update((list) => list.map((c) => (c.id === bound.id ? bound : c)));
    } catch {
      this.actionError.set(`Failed to update the owner of ${character.name}.`);
    }
  }

  memberName(member: GuildMember): string {
    return member.discord.global_name ?? member.discord.username ?? 'Discord user';
  }

  characterIcon(character: Character): string {
    return specIcon(character.class, character.spec, character.role);
  }

  characterPlayer(character: Character): string | null {
    return character.owner?.display_name ?? character.player_name;
  }
}
