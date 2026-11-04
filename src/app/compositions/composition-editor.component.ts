import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { firstValueFrom, forkJoin, of, switchMap } from 'rxjs';

import { AuthService } from '../auth/auth.service';
import {
  CHARACTER_ROLES,
  GAME_VERSIONS,
  RAID_SIZES,
  ROLE_FILTERS,
  RoleFilterOption,
} from '../game-data';
import {
  Character,
  CharacterRank,
  CharacterRole,
  Composition,
  CompositionRaid,
  Guild,
} from '../guild.models';
import { GuildService } from '../guild.service';
import { CharacterTileComponent } from './character-tile.component';
import {
  Roster,
  autoPlace,
  clearRaid,
  discordPings,
  emptyRaid,
  isAvailable,
  moveSlot,
  moveToBench,
  mrtExport,
  placeInSlot,
  removeCharacter,
  resizeRaids,
  sanitizeRaids,
} from './composition-editor';
import { CompositionService } from './composition.service';

type DragSource =
  | { kind: 'roster'; id: string }
  | { kind: 'slot'; raid: number; slot: number; id: string }
  | { kind: 'bench'; raid: number; id: string };

type SaveStatus = 'saved' | 'saving' | 'unsaved' | 'conflict' | 'error';

const AUTOSAVE_DELAY_MS = 500;
const HIGHLIGHT_MS = 2000;
const COPIED_MS = 2000;

@Component({
  selector: 'rc-composition-editor',
  imports: [RouterLink, CharacterTileComponent],
  templateUrl: './composition-editor.component.html',
  styleUrl: './composition-editor.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CompositionEditorComponent implements OnInit, OnDestroy {
  private readonly authService = inject(AuthService);
  private readonly guildService = inject(GuildService);
  private readonly compositionService = inject(CompositionService);
  private readonly route = inject(ActivatedRoute);

  readonly guildId = this.route.snapshot.paramMap.get('id') ?? '';
  private readonly compositionId = this.route.snapshot.paramMap.get('compositionId') ?? '';

  readonly sizes = RAID_SIZES;
  readonly roleFilters = ROLE_FILTERS;
  readonly roles = CHARACTER_ROLES;

  readonly guild = signal<Guild | null>(null);
  readonly composition = signal<Composition | null>(null);
  readonly characters = signal<Character[]>([]);
  readonly name = signal('');
  readonly raidSize = signal(25);
  readonly raids = signal<CompositionRaid[]>([]);
  readonly unauthenticated = signal(false);
  readonly loadError = signal<string | null>(null);
  readonly saveStatus = signal<SaveStatus>('saved');
  readonly saveError = signal<string | null>(null);
  readonly highlightId = signal<string | null>(null);
  readonly copied = signal<string | null>(null);
  readonly rankFilter = signal<CharacterRank | ''>('');
  readonly roleFilterKeys = signal<ReadonlySet<string>>(new Set());

  private readonly raidGroups = viewChild<ElementRef<HTMLElement>>('raidGroups');
  private drag: DragSource | null = null;
  private revision = 0;
  private saveTimer: ReturnType<typeof setTimeout> | null = null;
  private saving = false;
  private dirty = false;
  private destroyed = false;

  readonly canEdit = computed(() => {
    const role = this.guild()?.membership_role;
    return role === 'admin' || role === 'officer';
  });
  readonly versionLabel = computed(
    () => GAME_VERSIONS.find((v) => v.value === this.composition()?.game_version)?.label ?? '',
  );
  readonly roster = computed<Roster>(() => new Map(this.characters().map((c) => [c.id, c])));
  readonly availableCharacters = computed(() => {
    const raids = this.raids();
    const roster = this.roster();
    const rank = this.rankFilter();
    const keys = this.roleFilterKeys();
    return this.characters()
      .filter((c) => isAvailable(raids, c, roster))
      .filter((c) => !rank || c.rank === rank)
      .filter((c) => keys.size === 0 || keys.has(`${c.class}_${c.role}`))
      .sort((a, b) => a.class.localeCompare(b.class) || a.name.localeCompare(b.name));
  });

  async ngOnInit(): Promise<void> {
    if (this.authService.currentUser() === null) {
      this.unauthenticated.set(true);
      return;
    }
    await this.load();
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
      this.saveTimer = null;
      void this.save();
    }
  }

  async load(): Promise<void> {
    this.loadError.set(null);
    try {
      const { guild, composition, characters } = await firstValueFrom(
        this.guildService.getGuild(this.guildId).pipe(
          switchMap((guild) =>
            forkJoin({
              guild: of(guild),
              composition: this.compositionService.get(this.guildId, this.compositionId),
              characters: this.guildService.listCharacters(this.guildId),
            }),
          ),
        ),
      );
      const versionCharacters = characters.filter(
        (c) => c.game_version === composition.game_version,
      );
      this.guild.set(guild);
      this.composition.set(composition);
      this.characters.set(versionCharacters);
      this.name.set(composition.name);
      this.raidSize.set(composition.raid_size);
      this.revision = composition.revision;
      this.raids.set(sanitizeRaids(composition.raids, composition.raid_size, this.roster()));
      this.dirty = false;
      this.saveStatus.set('saved');
      this.saveError.set(null);
    } catch (error) {
      this.loadError.set(
        error instanceof HttpErrorResponse && error.status === 403
          ? 'Compositions become available once a guild admin approves you.'
          : 'Failed to load composition. Please try again.',
      );
    }
  }

  // Rendering helpers

  character(id: string | null): Character | undefined {
    return id ? this.roster().get(id) : undefined;
  }

  groupRows(raid: CompositionRaid): number[] {
    return Array.from({ length: Math.ceil(raid.slots.length / 5) }, (_, i) => i);
  }

  roleCount(raid: CompositionRaid, role: CharacterRole): number {
    return raid.slots.filter((id) => this.character(id)?.role === role).length;
  }

  rankCount(raid: CompositionRaid, rank: CharacterRank): number {
    return raid.slots.filter((id) => this.character(id)?.rank === rank).length;
  }

  roleFilterActive(option: RoleFilterOption): boolean {
    const keys = this.roleFilterKeys();
    return keys.size === 0 || keys.has(option.key);
  }

  toggleRoleFilter(option: RoleFilterOption): void {
    this.roleFilterKeys.update((keys) => {
      const next = new Set(keys);
      if (!next.delete(option.key)) next.add(option.key);
      return next;
    });
  }

  // Editing

  onRosterClick(id: string): void {
    this.apply(autoPlace(this.raids(), id, this.roster()));
  }

  onSlotClick(id: string | null): void {
    if (id) this.apply(removeCharacter(this.raids(), id));
  }

  onBenchClick(id: string): void {
    this.apply(removeCharacter(this.raids(), id));
  }

  onDragStart(source: DragSource): void {
    this.drag = source;
  }

  onDragEnd(): void {
    this.drag = null;
  }

  onSlotDrop(event: DragEvent, raid: number, slot: number): void {
    event.preventDefault();
    const source = this.drag;
    this.drag = null;
    if (!source) return;
    const result =
      source.kind === 'slot'
        ? moveSlot(this.raids(), source.raid, source.slot, raid, slot, this.roster())
        : placeInSlot(this.raids(), raid, slot, source.id, this.roster());
    if (result.conflictId) {
      this.highlight(result.conflictId);
      return;
    }
    this.apply(result.raids);
  }

  onBenchDrop(event: DragEvent, raid: number): void {
    event.preventDefault();
    const source = this.drag;
    this.drag = null;
    if (source) this.apply(moveToBench(this.raids(), raid, source.id));
  }

  onClearRaid(index: number): void {
    if (window.confirm('Are you sure you want to clear this raid?')) {
      this.apply(clearRaid(this.raids(), index));
    }
  }

  onRemoveRaid(index: number): void {
    if (window.confirm('Are you sure you want to remove this raid completely?')) {
      this.apply(this.raids().filter((_, i) => i !== index));
    }
  }

  onAddRaid(): void {
    const raids = this.raids();
    this.apply([...raids, emptyRaid(this.raidSize(), `Raid #${raids.length + 1}`)]);
  }

  onTitleChange(index: number, title: string): void {
    this.apply(this.raids().map((raid, i) => (i === index ? { ...raid, title } : raid)));
  }

  onNameChange(name: string): void {
    this.name.set(name);
    if (name.trim()) this.scheduleSave();
  }

  onRaidSizeChange(size: number): void {
    this.raidSize.set(size);
    this.apply(resizeRaids(this.raids(), size, this.roster()));
  }

  // Raid tools

  onCopyMrt(raid: CompositionRaid): Promise<void> {
    return this.copyText(mrtExport(raid, this.roster()), 'mrt');
  }

  onCopyPings(raid: CompositionRaid): Promise<void> {
    const userId = this.authService.currentUser()?.id;
    return this.copyText(discordPings(raid, this.roster(), userId), 'pings');
  }

  onCopyLink(): Promise<void> {
    return this.copyText(window.location.href, 'link');
  }

  async onCopyImage(element?: HTMLElement): Promise<void> {
    const target = element ?? this.raidGroups()?.nativeElement;
    if (!target) return;
    const { default: html2canvas } = await import('html2canvas-pro');
    const canvas = await html2canvas(target, { backgroundColor: '#17171f' });
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve));
    if (blob) {
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
      this.flashCopied('image');
    }
  }

  private async copyText(text: string, key: string): Promise<void> {
    await navigator.clipboard.writeText(text);
    this.flashCopied(key);
  }

  private flashCopied(key: string): void {
    this.copied.set(key);
    setTimeout(() => this.copied.set(null), COPIED_MS);
  }

  private highlight(id: string): void {
    this.highlightId.set(id);
    setTimeout(() => this.highlightId.set(null), HIGHLIGHT_MS);
  }

  // Saving

  private apply(raids: CompositionRaid[]): void {
    if (raids === this.raids()) return;
    this.raids.set(raids);
    this.scheduleSave();
  }

  private scheduleSave(): void {
    if (!this.canEdit() || this.saveStatus() === 'conflict') return;
    this.dirty = true;
    this.saveStatus.set('unsaved');
    if (this.saveTimer) clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => {
      this.saveTimer = null;
      void this.save();
    }, AUTOSAVE_DELAY_MS);
  }

  private async save(): Promise<void> {
    if (this.saving) return;
    this.saving = true;
    this.dirty = false;
    this.saveStatus.set('saving');
    try {
      const saved = await firstValueFrom(
        this.compositionService.update(this.guildId, this.compositionId, {
          name: this.name().trim(),
          raid_size: this.raidSize(),
          raids: this.raids(),
          revision: this.revision,
        }),
      );
      this.revision = saved.revision;
      this.saveError.set(null);
      this.saveStatus.set(this.dirty ? 'unsaved' : 'saved');
    } catch (error) {
      this.handleSaveError(error);
    } finally {
      this.saving = false;
    }
    // Changes made while the request was in flight.
    if (this.dirty && !this.saveTimer && !this.destroyed && this.saveStatus() === 'unsaved') {
      void this.save();
    }
  }

  private handleSaveError(error: unknown): void {
    this.dirty = false;
    if (error instanceof HttpErrorResponse && error.status === 409) {
      this.saveStatus.set('conflict');
      this.saveError.set('Someone else changed this composition. Reload to continue.');
      return;
    }
    this.saveStatus.set('error');
    this.saveError.set(
      error instanceof HttpErrorResponse && error.status === 400 && error.error?.error?.message
        ? error.error.error.message
        : 'Could not save your last change.',
    );
  }
}
