import { computed, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';

import { AuthService } from '../auth/auth.service';
import { Character, Composition, Guild, GuildRole } from '../guild.models';
import { GuildService } from '../guild.service';
import { CompositionEditorComponent } from './composition-editor.component';
import { CompositionService } from './composition.service';

function makeCharacter(id: string, overrides: Partial<Character> = {}): Character {
  return {
    id,
    guild_id: 'g1',
    game_version: 'classicann',
    user_id: null,
    player_name: null,
    owner: null,
    can_manage: false,
    name: `Name-${id}`,
    region: 'eu',
    server: 's',
    class: 'warrior',
    race: 'Orc',
    spec: 'Fury',
    role: 'melee',
    rank: 'main',
    created_at: '',
    updated_at: '',
    deleted_at: null,
    ...overrides,
  };
}

describe('CompositionEditorComponent', () => {
  let fixture: ComponentFixture<CompositionEditorComponent>;
  let component: CompositionEditorComponent;
  let compositionService: { get: ReturnType<typeof vi.fn>; update: ReturnType<typeof vi.fn> };

  const composition: Composition = {
    id: 'c1',
    guild_id: 'g1',
    game_version: 'classicann',
    name: 'Kara',
    raid_size: 10,
    raids: [{ title: 'Team A', slots: ['a', ...new Array(9).fill(null)], bench: [] }],
    revision: 4,
    created_at: '',
    updated_at: '',
  };

  async function setup(role: GuildRole): Promise<void> {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    const guild = { id: 'g1', name: 'G', membership_role: role } as Guild;
    compositionService = {
      get: vi.fn().mockReturnValue(of(composition)),
      update: vi.fn().mockReturnValue(of({ ...composition, revision: 5 })),
    };
    const state = signal({ status: 'authenticated', user: { id: 'u1' } });
    TestBed.configureTestingModule({
      imports: [CompositionEditorComponent],
      providers: [
        provideRouter([]),
        {
          provide: AuthService,
          useValue: { currentUser: computed(() => state().user) },
        },
        {
          provide: GuildService,
          useValue: {
            getGuild: () => of(guild),
            listCharacters: () =>
              of([
                makeCharacter('a'),
                makeCharacter('b'),
                makeCharacter('frv', { game_version: 'forever' }),
              ]),
          },
        },
        { provide: CompositionService, useValue: compositionService },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: { get: (key: string) => (key === 'id' ? 'g1' : 'c1') },
            },
          },
        },
      ],
    });
    fixture = TestBed.createComponent(CompositionEditorComponent);
    component = fixture.componentInstance;
    await component.ngOnInit();
    fixture.detectChanges();
  }

  afterEach(() => {
    vi.useRealTimers();
  });

  it('offers only unplaced characters of the composition game version', async () => {
    await setup('admin');
    const ids = component.availableCharacters().map((c) => c.id);
    expect(ids).toEqual(['b']);
  });

  it('autosaves edits with the current revision, debounced', async () => {
    await setup('officer');

    component.onRosterClick('b');
    component.onTitleChange(0, 'Team B');
    expect(component.saveStatus()).toBe('unsaved');
    expect(compositionService.update).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(600);

    expect(compositionService.update).toHaveBeenCalledTimes(1);
    const [, , payload] = compositionService.update.mock.calls[0];
    expect(payload.revision).toBe(4);
    expect(payload.raids[0].title).toBe('Team B');
    expect(payload.raids[0].slots.slice(0, 2)).toEqual(['a', 'b']);
    expect(component.saveStatus()).toBe('saved');

    component.onSlotClick('b');
    await vi.advanceTimersByTimeAsync(600);
    expect(compositionService.update.mock.calls[1][2].revision).toBe(5);
  });

  it('stops saving and offers a reload when someone else changed it', async () => {
    await setup('admin');
    compositionService.update.mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 409 })),
    );

    component.onRosterClick('b');
    await vi.advanceTimersByTimeAsync(600);
    expect(component.saveStatus()).toBe('conflict');

    component.onSlotClick('a');
    await vi.advanceTimersByTimeAsync(600);
    expect(compositionService.update).toHaveBeenCalledTimes(1);

    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Reload');
  });

  it('gives raiders a read-only view that never saves', async () => {
    await setup('raider');

    expect(fixture.nativeElement.querySelector('.editor-sidebar')).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Name-a');
    expect(fixture.nativeElement.textContent).not.toContain('Add raid');

    component.onRosterClick('b');
    await vi.advanceTimersByTimeAsync(600);
    expect(compositionService.update).not.toHaveBeenCalled();
  });

  it.each([10, 20, 25, 40])('renders %i slots in groups of five', async (size) => {
    await setup('admin');
    component.onRaidSizeChange(size);
    fixture.detectChanges();

    const article = fixture.nativeElement.querySelector('.editor-raid');
    expect(
      article.querySelectorAll('.editor-groups:not(.editor-bench) rc-character-tile'),
    ).toHaveLength(size);
    expect(
      article.querySelectorAll('.editor-groups:not(.editor-bench) .editor-group-label'),
    ).toHaveLength(size / 5);
  });
});
