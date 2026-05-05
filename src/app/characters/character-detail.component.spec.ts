import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PLATFORM_ID, computed, signal } from '@angular/core';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { Subject, of, throwError } from 'rxjs';

import { AuthState, SafeUser } from '../auth/auth.models';
import { AuthService } from '../auth/auth.service';
import { CharacterService } from '../character.service';
import { CharacterBattleNetSnapshot, CharacterDetail, CharacterWarcraftLogsSnapshot } from '../guild.models';
import { CharacterDetailComponent } from './character-detail.component';

const stubUser: SafeUser = {
  id: 'user-1',
  created_at: '2026-05-01T00:00:00Z',
  discord: {
    id: 'discord-1',
    username: 'raider',
    global_name: 'Raid Leader',
    avatar_url: 'https://cdn.example.test/avatar.png',
  },
};

const stubBnet: CharacterBattleNetSnapshot = {
  avatar_url: null,
  level: 70,
  equipped_item_level: 350,
  active_spec_name: 'Fury',
  faction: 'alliance',
  error: null,
  fetched_at: '2026-05-01T00:00:00Z',
};

const stubWcl: CharacterWarcraftLogsSnapshot = {
  gear: [{ id: 12345, slot: 1, permanentEnchantID: null }],
  best_performance_average: 87.3,
  median_performance_average: 72.1,
  total_kills: 42,
  partial: false,
  error: null,
  fetched_at: '2026-05-01T00:00:00Z',
};

const stubCharacter: CharacterDetail = {
  id: 'char-1',
  user_id: 'user-1',
  name: 'Artheon',
  region: 'eu',
  server: 'silvermoon',
  class: 'warrior',
  race: 'Human',
  spec: 'fury',
  role: 'melee',
  rank: 'main',
  created_at: '2026-05-01T00:00:00Z',
  updated_at: '2026-05-01T00:00:00Z',
  deleted_at: null,
  battlenet: stubBnet,
  warcraftlogs: stubWcl,
};

describe('CharacterDetailComponent', () => {
  let fixture: ComponentFixture<CharacterDetailComponent>;
  let characterService: Pick<CharacterService, 'getCharacter' | 'refreshBattleNet' | 'refreshWarcraftLogs'>;
  let authState: ReturnType<typeof signal<AuthState>>;

  function buildAuthService(state: ReturnType<typeof signal<AuthState>>) {
    return {
      state: state.asReadonly(),
      currentUser: computed(() => {
        const s = state();
        return s.status === 'authenticated' ? s.user : null;
      }),
    };
  }

  function setupModule(
    initialAuthState: AuthState = { status: 'authenticated', user: stubUser, session: {} as never },
    serviceStub: Partial<typeof characterService> = {},
    platformId: Object = 'browser',
  ): void {
    authState = signal<AuthState>(initialAuthState);
    characterService = {
      getCharacter: vi.fn().mockReturnValue(of(stubCharacter)),
      refreshBattleNet: vi.fn().mockReturnValue(of(null)),
      refreshWarcraftLogs: vi.fn().mockReturnValue(of(null)),
      ...serviceStub,
    };

    TestBed.configureTestingModule({
      imports: [CharacterDetailComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: buildAuthService(authState) },
        { provide: CharacterService, useValue: characterService },
        { provide: PLATFORM_ID, useValue: platformId },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { paramMap: { get: (key: string) => (key === 'id' ? 'char-1' : null) } },
          },
        },
      ],
    });
  }

  async function createComponent(): Promise<void> {
    await TestBed.compileComponents();
    fixture = TestBed.createComponent(CharacterDetailComponent);
  }

  async function render(): Promise<void> {
    fixture.detectChanges();
    await fixture.whenStable();
    await Promise.resolve();
    await Promise.resolve();
    fixture.detectChanges();
  }

  it('unauthenticated state shows auth message and does not call the API', async () => {
    setupModule({ status: 'unauthenticated' });
    await createComponent();

    await render();

    expect(fixture.nativeElement.textContent).toContain('Please sign in to view character details.');
    expect(characterService.getCharacter).not.toHaveBeenCalled();
  });

  it('loading state shows before character request resolves', async () => {
    const pending = new Subject<CharacterDetail>();
    setupModule(undefined, { getCharacter: vi.fn().mockReturnValue(pending.asObservable()) });
    await createComponent();

    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Loading...');
    pending.next(stubCharacter);
    pending.complete();
    await fixture.whenStable();
  });

  it('404 state renders character not found message', async () => {
    setupModule(undefined, {
      getCharacter: vi.fn().mockReturnValue(
        throwError(() => new HttpErrorResponse({ status: 404 })),
      ),
    });
    await createComponent();

    await render();

    expect(fixture.nativeElement.textContent).toContain('Character not found.');
  });

  it('generic error state renders fallback load error', async () => {
    setupModule(undefined, {
      getCharacter: vi.fn().mockReturnValue(throwError(() => new Error('boom'))),
    });
    await createComponent();

    await render();

    expect(fixture.nativeElement.textContent).toContain('Failed to load character. Please try again.');
  });

  it('loaded state renders profile data, snapshots, gear, and rankings placeholder', async () => {
    setupModule();
    await createComponent();

    await render();

    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Artheon');
    expect(text).toContain('Warrior');
    expect(text).toContain('Fury');
    expect(text).toContain('silvermoon');
    expect(text).toContain('EU');
    expect(text).toContain('Rankings');
    expect(text).toContain('Per-boss rankings coming soon.');

    const gearAnchor = fixture.nativeElement.querySelector('a[href="https://www.wowhead.com/item=12345"]');
    expect(gearAnchor).not.toBeNull();
    expect(gearAnchor.getAttribute('data-wh-icon-size')).toBe('large');
    expect(fixture.nativeElement.textContent).toContain('Neck');
  });

  it('gear href includes permanent enchant when present', async () => {
    setupModule(undefined, {
      getCharacter: vi.fn().mockReturnValue(
        of({
          ...stubCharacter,
          warcraftlogs: { ...stubWcl, gear: [{ id: 12345, slot: 1, permanentEnchantID: 999 }] },
        }),
      ),
    });
    await createComponent();

    await render();

    const links: NodeListOf<HTMLAnchorElement> = fixture.nativeElement.querySelectorAll('a');
    expect(Array.from(links).some((link) => link.getAttribute('href') === 'https://www.wowhead.com/item=12345&ench=999')).toBe(true);
  });

  it('hides BattleNet and WCL sections when snapshots are null', async () => {
    setupModule(undefined, {
      getCharacter: vi.fn().mockReturnValue(
        of({ ...stubCharacter, battlenet: null, warcraftlogs: null }),
      ),
    });
    await createComponent();

    await render();

    const text = fixture.nativeElement.textContent;
    expect(text).not.toContain('Battle.net');
    expect(text).not.toContain('WarcraftLogs');
    expect(text).not.toContain('Rankings');
  });

  it('refresh BNet calls refresh endpoint then refetches the character', async () => {
    setupModule();
    await createComponent();
    await render();

    await fixture.componentInstance.onRefreshBNet();

    expect(characterService.refreshBattleNet).toHaveBeenCalledWith('char-1');
    expect(characterService.getCharacter).toHaveBeenCalledTimes(2);
  });

  it('refresh WCL calls refresh endpoint then refetches the character', async () => {
    setupModule();
    await createComponent();
    await render();

    await fixture.componentInstance.onRefreshWcl();

    expect(characterService.refreshWarcraftLogs).toHaveBeenCalledWith('char-1');
    expect(characterService.getCharacter).toHaveBeenCalledTimes(2);
  });

  it('refresh errors are shown inline', async () => {
    setupModule(undefined, {
      refreshBattleNet: vi.fn().mockReturnValue(throwError(() => new Error('refresh failed'))),
    });
    await createComponent();
    await render();

    await fixture.componentInstance.onRefreshBNet();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Failed to refresh Battle.net data.');
  });

  it('calls WowHead refreshLinks after character loads in browser platform', async () => {
    const refreshLinks = vi.fn();
    (window as unknown as { $WowheadPower?: { refreshLinks: () => void } }).$WowheadPower = { refreshLinks };
    setupModule();
    await createComponent();

    await render();

    expect(refreshLinks).toHaveBeenCalled();
    delete (window as unknown as { $WowheadPower?: { refreshLinks: () => void } }).$WowheadPower;
  });
});
