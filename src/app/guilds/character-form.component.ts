import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { CHARACTER_ROLES, REGIONS, WOW_CLASSES, findClass } from '../game-data';
import {
  Character,
  CharacterPayload,
  CharacterRank,
  CharacterRole,
  GameVersion,
} from '../guild.models';
import { GuildService } from '../guild.service';

@Component({
  selector: 'rc-character-form',
  template: `
    <form class="character-form" (submit)="$event.preventDefault(); onSubmit()">
      <h3>{{ character() ? 'Edit character' : 'Add character' }}</h3>

      @if (error()) {
        <p class="character-form-error" role="alert">{{ error() }}</p>
      }

      <div class="character-form-grid">
        <label>
          Name
          <input
            type="text"
            autocomplete="off"
            [value]="name()"
            (input)="name.set($any($event.target).value)"
          />
        </label>
        <label>
          Region
          <select [value]="region()" (change)="region.set($any($event.target).value)">
            @for (option of regions; track option) {
              <option [value]="option" [selected]="option === region()">
                {{ option.toUpperCase() }}
              </option>
            }
          </select>
        </label>
        <label>
          {{ serverRequired() ? 'Server' : 'Server (optional)' }}
          <input
            type="text"
            autocomplete="off"
            [value]="server()"
            (input)="server.set($any($event.target).value)"
          />
        </label>
        @if (serverRequired()) {
          <button
            class="btn btn-ghost character-form-lookup"
            type="button"
            [disabled]="lookingUp() || !name().trim() || !server().trim()"
            (click)="onLookup()"
          >
            {{ lookingUp() ? 'Looking up…' : 'Import from Battle.net' }}
          </button>
        }
        <label>
          Class
          <select [value]="classId()" (change)="onClassChange($any($event.target).value)">
            <option value="" [selected]="!classId()" disabled>Choose</option>
            @for (option of classes; track option.id) {
              <option [value]="option.id" [selected]="option.id === classId()">
                {{ option.label }}
              </option>
            }
          </select>
        </label>
        <label>
          Race
          <input
            type="text"
            autocomplete="off"
            [value]="race()"
            (input)="race.set($any($event.target).value)"
          />
        </label>
        <label>
          Spec
          <select [value]="spec()" (change)="onSpecChange($any($event.target).value)">
            <option value="" [selected]="!spec()" disabled>Choose</option>
            @for (option of specNames(); track option) {
              <option [value]="option" [selected]="option === spec()">{{ option }}</option>
            }
          </select>
        </label>
        <label>
          Role
          <select [value]="role()" (change)="role.set($any($event.target).value)">
            @for (option of roles; track option.value) {
              <option [value]="option.value" [selected]="option.value === role()">
                {{ option.label }}
              </option>
            }
          </select>
        </label>
        <label>
          Rank
          <select [value]="rank()" (change)="rank.set($any($event.target).value)">
            <option value="main" [selected]="rank() === 'main'">Main</option>
            <option value="alt" [selected]="rank() === 'alt'">Alt</option>
          </select>
        </label>
        @if (showPlayerName()) {
          <label>
            Player name (until bound)
            <input
              type="text"
              autocomplete="off"
              [value]="playerName()"
              (input)="playerName.set($any($event.target).value)"
            />
          </label>
        }
      </div>

      <div class="character-form-actions">
        <button class="btn btn-primary" type="submit" [disabled]="saving() || !isValid()">
          {{ saving() ? 'Saving…' : 'Save' }}
        </button>
        <button class="btn btn-ghost" type="button" (click)="cancelled.emit()">Cancel</button>
      </div>
    </form>
  `,
  styles: `
    .character-form {
      margin-bottom: 24px;
      padding: 16px;
      border: 1px solid var(--border-default);
      border-radius: 6px;
      background: var(--bg-surface);
    }
    h3 {
      margin-bottom: 12px;
      color: var(--text-primary);
    }
    .character-form-error {
      margin-bottom: 12px;
      color: var(--state-error);
      font-size: var(--text-sm);
    }
    .character-form-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
      gap: 12px;
      align-items: end;
    }
    label {
      display: grid;
      gap: 4px;
      color: var(--text-secondary);
      font-size: var(--text-sm);
    }
    .character-form-actions {
      display: flex;
      gap: 8px;
      margin-top: 16px;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CharacterFormComponent implements OnInit {
  private readonly guildService = inject(GuildService);

  readonly guildId = input.required<string>();
  readonly gameVersion = input.required<GameVersion>();
  readonly defaultRegion = input('eu');
  readonly defaultServer = input('');
  readonly character = input<Character | null>(null);
  /** Leaders can leave a character unbound, labelled with the player's name. */
  readonly canManageRoster = input(false);
  readonly saved = output<Character>();
  readonly cancelled = output<void>();

  readonly regions = REGIONS;
  readonly classes = WOW_CLASSES;
  readonly roles = CHARACTER_ROLES;

  readonly name = signal('');
  readonly region = signal('eu');
  readonly server = signal('');
  readonly classId = signal('');
  readonly race = signal('');
  readonly spec = signal('');
  readonly role = signal<CharacterRole>('melee');
  readonly rank = signal<CharacterRank>('main');
  readonly playerName = signal('');
  readonly saving = signal(false);
  readonly lookingUp = signal(false);
  readonly error = signal<string | null>(null);

  readonly serverRequired = computed(() => this.gameVersion() === 'classicann');
  readonly specNames = computed(() => [
    ...new Set(findClass(this.classId())?.specs.map((option) => option.spec) ?? []),
  ]);
  readonly showPlayerName = computed(() => {
    const character = this.character();
    return character ? !character.user_id : this.canManageRoster();
  });
  readonly isValid = computed(
    () =>
      !!this.name().trim() &&
      !!this.classId() &&
      !!this.race().trim() &&
      !!this.spec() &&
      (!this.serverRequired() || !!this.server().trim()),
  );

  ngOnInit(): void {
    const character = this.character();
    if (character) {
      this.name.set(character.name);
      this.region.set(character.region);
      this.server.set(character.server ?? '');
      this.classId.set(character.class);
      this.race.set(character.race);
      this.spec.set(character.spec);
      this.role.set(character.role);
      this.rank.set(character.rank);
      this.playerName.set(character.player_name ?? '');
    } else {
      this.region.set(this.defaultRegion());
      this.server.set(this.serverRequired() ? this.defaultServer() : '');
    }
  }

  onClassChange(classId: string): void {
    this.classId.set(classId);
    this.onSpecChange(findClass(classId)?.specs[0]?.spec ?? '');
  }

  onSpecChange(spec: string): void {
    this.spec.set(spec);
    const option = findClass(this.classId())?.specs.find((s) => s.spec === spec);
    if (option) this.role.set(option.role);
  }

  async onLookup(): Promise<void> {
    this.lookingUp.set(true);
    this.error.set(null);
    try {
      const found = await firstValueFrom(
        this.guildService.lookupCharacter(this.guildId(), {
          name: this.name().trim(),
          server: this.server().trim(),
          region: this.region(),
        }),
      );
      if (found.class && findClass(found.class)) this.onClassChange(found.class);
      if (found.race) this.race.set(found.race);
      const spec = found.spec?.replace(/\s+/g, '');
      if (spec && this.specNames().includes(spec)) this.onSpecChange(spec);
    } catch (error) {
      this.error.set(
        error instanceof HttpErrorResponse && error.status === 404
          ? 'Battle.net has no such character. Check the name and server, or fill the details in by hand.'
          : 'Battle.net is unavailable right now. You can fill the details in by hand.',
      );
    } finally {
      this.lookingUp.set(false);
    }
  }

  async onSubmit(): Promise<void> {
    if (!this.isValid() || this.saving()) return;
    const payload: CharacterPayload = {
      name: this.name().trim(),
      region: this.region(),
      server: this.server().trim() || null,
      class: this.classId(),
      race: this.race().trim(),
      spec: this.spec(),
      role: this.role(),
      rank: this.rank(),
      player_name: this.playerName().trim() || null,
    };
    const existing = this.character();

    this.saving.set(true);
    this.error.set(null);
    try {
      const saved = await firstValueFrom(
        existing
          ? this.guildService.updateCharacter(existing.id, payload)
          : this.guildService.createCharacter(this.guildId(), {
              ...payload,
              game_version: this.gameVersion(),
            }),
      );
      this.saved.emit(saved);
    } catch (error) {
      this.error.set(
        error instanceof HttpErrorResponse && error.status === 409
          ? 'This character is already on the roster for this game version.'
          : 'Failed to save the character. Please try again.',
      );
    } finally {
      this.saving.set(false);
    }
  }
}
