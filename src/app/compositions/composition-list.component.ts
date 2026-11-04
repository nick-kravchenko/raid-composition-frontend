import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { firstValueFrom, forkJoin, of, switchMap } from 'rxjs';

import { AuthService } from '../auth/auth.service';
import { GAME_VERSIONS, RAID_SIZES } from '../game-data';
import { Composition, GameVersion, Guild } from '../guild.models';
import { GuildService } from '../guild.service';
import { CompositionService } from './composition.service';

@Component({
  selector: 'rc-composition-list',
  imports: [RouterLink],
  template: `
    <div class="container compositions-page">
      <a class="compositions-back" [routerLink]="['/guilds', guildId]">&larr; Back to guild</a>

      @if (unauthenticated()) {
        <p>Please sign in to view compositions.</p>
      } @else if (loadError()) {
        <p class="compositions-error">{{ loadError() }}</p>
      } @else if (guild(); as g) {
        <h1>{{ g.name }} compositions</h1>

        <div class="compositions-tabs" role="tablist">
          @for (version of versions; track version.value) {
            <button
              type="button"
              role="tab"
              class="btn btn--sm"
              [class.btn-primary]="gameVersion() === version.value"
              [class.btn-ghost]="gameVersion() !== version.value"
              [attr.aria-selected]="gameVersion() === version.value"
              (click)="gameVersion.set(version.value)"
            >
              {{ version.label }}
            </button>
          }
        </div>

        @if (actionError()) {
          <p class="compositions-error">{{ actionError() }}</p>
        }

        @if (canEdit()) {
          <form class="compositions-create" (submit)="$event.preventDefault(); onCreate()">
            <input
              type="text"
              placeholder="Composition name"
              maxlength="100"
              aria-label="Composition name"
              [value]="name()"
              (input)="name.set($any($event.target).value)"
            />
            <select
              aria-label="Raid size"
              [value]="raidSize()"
              (change)="raidSize.set(+$any($event.target).value)"
            >
              @for (size of sizes; track size) {
                <option [value]="size" [selected]="size === raidSize()">{{ size }} man</option>
              }
            </select>
            <button class="btn btn-primary" type="submit" [disabled]="creating() || !name().trim()">
              Create
            </button>
          </form>
        }

        @if (visible().length === 0) {
          <p class="compositions-empty">No compositions for this game version yet.</p>
        } @else {
          <ul class="compositions-list">
            @for (composition of visible(); track composition.id) {
              <li>
                <a [routerLink]="['/guilds', guildId, 'compositions', composition.id]">
                  <span class="compositions-name">{{ composition.name }}</span>
                  <span class="compositions-meta">
                    {{ composition.raid_size }} man &middot; {{ composition.raids.length }}
                    {{ composition.raids.length === 1 ? 'raid' : 'raids' }}
                  </span>
                </a>
                @if (canEdit()) {
                  <button
                    class="btn btn-ghost btn--sm"
                    type="button"
                    (click)="onDelete(composition)"
                  >
                    Delete
                  </button>
                }
              </li>
            }
          </ul>
        }
      }
    </div>
  `,
  styles: `
    .compositions-page {
      padding: 48px 0;
    }
    .compositions-back {
      display: inline-block;
      margin-bottom: 24px;
      color: var(--accent);
      font-size: var(--text-sm);
    }
    h1 {
      margin-bottom: 24px;
      color: var(--text-primary);
      font-size: var(--text-3xl);
    }
    .compositions-tabs,
    .compositions-create {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-bottom: 24px;
    }
    .compositions-error {
      margin-bottom: 16px;
      color: var(--state-error);
      font-size: var(--text-sm);
    }
    .compositions-empty,
    .compositions-meta {
      color: var(--text-secondary);
      font-size: var(--text-sm);
    }
    .compositions-list {
      display: grid;
      gap: 8px;
      list-style: none;
      padding: 0;
    }
    .compositions-list li {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding: 12px 16px;
      border: 1px solid var(--border-default);
      border-radius: 6px;
      background: var(--bg-surface);
    }
    .compositions-list a {
      display: grid;
      gap: 2px;
      flex: 1;
      min-width: 0;
      text-decoration: none;
    }
    .compositions-name {
      color: var(--text-primary);
      font-weight: var(--fw-bold);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CompositionListComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly guildService = inject(GuildService);
  private readonly compositionService = inject(CompositionService);
  private readonly router = inject(Router);

  readonly guildId = inject(ActivatedRoute).snapshot.paramMap.get('id') ?? '';
  readonly versions = GAME_VERSIONS;
  readonly sizes = RAID_SIZES;

  readonly guild = signal<Guild | null>(null);
  readonly compositions = signal<Composition[]>([]);
  readonly gameVersion = signal<GameVersion>('classicann');
  readonly unauthenticated = signal(false);
  readonly loadError = signal<string | null>(null);
  readonly actionError = signal<string | null>(null);
  readonly name = signal('');
  readonly raidSize = signal(25);
  readonly creating = signal(false);

  readonly canEdit = computed(() => {
    const role = this.guild()?.membership_role;
    return role === 'admin' || role === 'officer';
  });
  readonly visible = computed(() =>
    this.compositions().filter((c) => c.game_version === this.gameVersion()),
  );

  async ngOnInit(): Promise<void> {
    if (this.authService.currentUser() === null) {
      this.unauthenticated.set(true);
      return;
    }
    try {
      const { guild, compositions } = await firstValueFrom(
        this.guildService
          .getGuild(this.guildId)
          .pipe(
            switchMap((guild) =>
              guild.membership_role === 'applicant'
                ? of({ guild, compositions: [] as Composition[] })
                : forkJoin({
                    guild: of(guild),
                    compositions: this.compositionService.list(this.guildId),
                  }),
            ),
          ),
      );
      if (guild.membership_role === 'applicant') {
        this.loadError.set('Compositions become available once a guild admin approves you.');
        return;
      }
      this.guild.set(guild);
      this.compositions.set(compositions);
    } catch {
      this.loadError.set('Failed to load compositions. Please try again.');
    }
  }

  async onCreate(): Promise<void> {
    const name = this.name().trim();
    if (!name || this.creating()) return;
    this.creating.set(true);
    this.actionError.set(null);
    try {
      const created = await firstValueFrom(
        this.compositionService.create(this.guildId, {
          game_version: this.gameVersion(),
          name,
          raid_size: this.raidSize(),
        }),
      );
      await this.router.navigate(['/guilds', this.guildId, 'compositions', created.id]);
    } catch {
      this.actionError.set('Failed to create composition. Please try again.');
    } finally {
      this.creating.set(false);
    }
  }

  async onDelete(composition: Composition): Promise<void> {
    if (!window.confirm(`Delete "${composition.name}"?`)) return;
    this.actionError.set(null);
    try {
      await firstValueFrom(this.compositionService.delete(this.guildId, composition.id));
      this.compositions.update((list) => list.filter((c) => c.id !== composition.id));
    } catch {
      this.actionError.set('Failed to delete composition. Please try again.');
    }
  }
}
