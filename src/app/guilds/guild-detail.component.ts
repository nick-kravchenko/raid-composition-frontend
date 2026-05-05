import { TitleCasePipe, UpperCasePipe, isPlatformBrowser } from '@angular/common';
import { Component, OnInit, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { AuthService } from '../auth/auth.service';
import { Character, Guild, GuildMember } from '../guild.models';
import { GuildService } from '../guild.service';

@Component({
  selector: 'rc-guild-detail',
  standalone: true,
  imports: [RouterLink, TitleCasePipe, UpperCasePipe],
  templateUrl: './guild-detail.component.html',
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

  isAdmin = computed(() => this.guild()?.membership_role === 'admin');
  // After rotating, show the new URL; otherwise fall back to the guild's existing invite_url.
  displayInviteUrl = computed(() => this.inviteUrl() ?? (this.guild()?.invite_url || null));

  groupedByClass = computed(() => {
    const map = new Map<string, Character[]>();
    for (const c of this.characters()) {
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
      const [guild, members, characters] = await Promise.all([
        firstValueFrom(this.guildService.getGuild(id)),
        firstValueFrom(this.guildService.listMembers(id)),
        firstValueFrom(this.guildService.listCharacters(id)),
      ]);
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
      this.members.update((list) =>
        list.map((m) => (m.user_id === userId ? { ...m, role } : m)),
      );
    } finally {
      this.promotingUserId.set(null);
    }
  }
}
