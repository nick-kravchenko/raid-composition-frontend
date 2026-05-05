import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ActivatedRoute } from '@angular/router';
import { computed, signal } from '@angular/core';
import { of } from 'rxjs';

import { AuthService } from '../auth/auth.service';
import { AuthState, SafeUser } from '../auth/auth.models';
import { GuildService } from '../guild.service';
import { Character, Guild, GuildMember, GuildInvite } from '../guild.models';
import { GuildDetailComponent } from './guild-detail.component';

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

function makeGuild(role: Guild['membership_role']): Guild {
  return {
    id: 'guild-1',
    name: 'The Mighty',
    realm: 'Silvermoon',
    region: 'eu',
    faction: 'alliance',
    game_version: 'classic',
  invite_url: 'http://localhost:4200/guild-invites/stub-code',
    created_at: '2026-05-01T00:00:00Z',
    updated_at: '2026-05-01T00:00:00Z',
    deleted_at: null,
    membership_role: role,
  };
}

const stubMember: GuildMember = {
  user_id: 'user-2',
  role: 'applicant',
  discord: {
    id: 'discord-2',
    username: 'applicant_user',
    global_name: 'Applicant',
    avatar_url: 'https://cdn.example.test/avatar2.png',
  },
  created_at: '2026-05-01T00:00:00Z',
  updated_at: '2026-05-01T00:00:00Z',
};

const stubInvite: GuildInvite = { guild_id: 'guild-1', code: 'abc123' };

function makeCharacter(id: string, cls: string, spec: string): Character {
  return {
    id,
    user_id: 'user-1',
    name: `Char-${id}`,
    region: 'eu',
    server: 'silvermoon',
    class: cls,
    race: 'Human',
    spec,
    role: 'melee',
    rank: 'main',
    created_at: '2026-05-01T00:00:00Z',
    updated_at: '2026-05-01T00:00:00Z',
    deleted_at: null,
  };
}

describe('GuildDetailComponent', () => {
  let fixture: ComponentFixture<GuildDetailComponent>;
  let component: GuildDetailComponent;
  let authState: ReturnType<typeof signal<AuthState>>;
  let guildService: Pick<
    GuildService,
    'getGuild' | 'listMembers' | 'listCharacters' | 'createInvite' | 'promoteMember'
  >;

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
    initialAuthState: AuthState,
    guildRole: Guild['membership_role'] = 'raider',
    members: GuildMember[] = [stubMember],
    characters: Character[] = [],
  ): void {
    authState = signal<AuthState>(initialAuthState);
    guildService = {
      getGuild: vi.fn().mockReturnValue(of(makeGuild(guildRole))),
      listMembers: vi.fn().mockReturnValue(of(members)),
      listCharacters: vi.fn().mockReturnValue(of(characters)),
      createInvite: vi.fn().mockReturnValue(of(stubInvite)),
      promoteMember: vi.fn().mockReturnValue(
        of({ ...stubMember, role: 'raider' as const }),
      ),
    };

    TestBed.configureTestingModule({
      imports: [GuildDetailComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: buildAuthService(authState) },
        { provide: GuildService, useValue: guildService },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { paramMap: { get: (key: string) => (key === 'id' ? 'guild-1' : null) } },
          },
        },
      ],
    });
  }

  async function createComponent(): Promise<void> {
    await TestBed.compileComponents();
    fixture = TestBed.createComponent(GuildDetailComponent);
    component = fixture.componentInstance;
  }

  it('unauthenticated state shows auth message, no API calls', async () => {
    setupModule({ status: 'unauthenticated' });
    await createComponent();

    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Please sign in to view guild details.');
    expect(guildService.getGuild).not.toHaveBeenCalled();
    expect(guildService.listMembers).not.toHaveBeenCalled();
    expect(guildService.listCharacters).not.toHaveBeenCalled();
  });

  it('non-admin membership role hides Generate Invite button and promotion buttons', async () => {
    setupModule(
      { status: 'authenticated', user: stubUser, session: {} as never },
      'raider',
      [stubMember],
    );
    await createComponent();

    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    // The Generate Invite button should not be present (only shown for admin)
    // Check that no button with "Generate Invite" text exists
    const allButtons: NodeListOf<HTMLButtonElement> =
      fixture.nativeElement.querySelectorAll('button');
    const generateInviteBtn = Array.from(allButtons).find((b) =>
      b.textContent?.includes('Generate Invite'),
    );
    expect(generateInviteBtn).toBeUndefined();

    const promoteBtn = Array.from(allButtons).find((b) =>
      b.textContent?.includes('Promote'),
    );
    expect(promoteBtn).toBeUndefined();
  });

  it('admin membership role shows Generate Invite button', async () => {
    setupModule(
      { status: 'authenticated', user: stubUser, session: {} as never },
      'admin',
      [],
    );
    await createComponent();

    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const allButtons: NodeListOf<HTMLButtonElement> =
      fixture.nativeElement.querySelectorAll('button');
    const inviteBtn = Array.from(allButtons).find((b) =>
      b.textContent?.trim().includes('Invite'),
    );
    expect(inviteBtn).toBeDefined();
  });

  it('onGenerateInvite calls createInvite and sets inviteUrl', async () => {
    setupModule(
      { status: 'authenticated', user: stubUser, session: {} as never },
      'admin',
      [],
    );
    await createComponent();

    fixture.detectChanges();
    await fixture.whenStable();

    await component.onGenerateInvite();
    fixture.detectChanges();

    expect(guildService.createInvite).toHaveBeenCalledWith('guild-1');
    expect(component.inviteUrl()).toContain('abc123');
  });

  it('onPromoteMember calls promoteMember and updates the member role in the signal', async () => {
    setupModule(
      { status: 'authenticated', user: stubUser, session: {} as never },
      'admin',
      [stubMember],
    );
    await createComponent();

    fixture.detectChanges();
    await fixture.whenStable();

    await component.onPromoteMember('user-2', 'raider');
    fixture.detectChanges();

    expect(guildService.promoteMember).toHaveBeenCalledWith('guild-1', 'user-2', 'raider');
    const updatedMember = component.members().find((m) => m.user_id === 'user-2');
    expect(updatedMember?.role).toBe('raider');
  });

  it('groupedByClass returns empty array when characters signal is empty', async () => {
    setupModule(
      { status: 'authenticated', user: stubUser, session: {} as never },
      'raider',
      [],
      [],
    );
    await createComponent();

    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(component.groupedByClass()).toEqual([]);
  });

  it('groupedByClass groups by class, sorts groups alphabetically, sorts specs within groups alphabetically', async () => {
    const chars: Character[] = [
      makeCharacter('c1', 'Warrior', 'Protection'),
      makeCharacter('c2', 'Warrior', 'Arms'),
      makeCharacter('c3', 'Druid', 'Restoration'),
      makeCharacter('c4', 'Druid', 'Balance'),
    ];
    setupModule(
      { status: 'authenticated', user: stubUser, session: {} as never },
      'raider',
      [],
      chars,
    );
    await createComponent();

    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const groups = component.groupedByClass();
    expect(groups.map((g) => g.className)).toEqual(['Druid', 'Warrior']);
    expect(groups[0].characters.map((c) => c.spec)).toEqual(['Balance', 'Restoration']);
    expect(groups[1].characters.map((c) => c.spec)).toEqual(['Arms', 'Protection']);
  });

  it('ngOnInit calls listCharacters with the guild id on authenticated load', async () => {
    setupModule(
      { status: 'authenticated', user: stubUser, session: {} as never },
      'raider',
      [],
      [],
    );
    await createComponent();

    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(guildService.listCharacters).toHaveBeenCalledWith('guild-1');
  });

  it('template renders character rows with class, spec, name, rank when characters exist', async () => {
    const chars: Character[] = [
      makeCharacter('c1', 'Druid', 'Balance'),
    ];
    setupModule(
      { status: 'authenticated', user: stubUser, session: {} as never },
      'raider',
      [],
      chars,
    );
    await createComponent();

    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const text: string = fixture.nativeElement.textContent;
    expect(text).toContain('Druid');
    expect(text).toContain('Balance');
    expect(text).toContain('Char-c1');
    expect(text).toContain('main');
    const link: HTMLAnchorElement | null = fixture.nativeElement.querySelector('a[href="/characters/c1"]');
    expect(link).not.toBeNull();
  });

  it('template renders "No characters found." when characters is empty', async () => {
    setupModule(
      { status: 'authenticated', user: stubUser, session: {} as never },
      'raider',
      [],
      [],
    );
    await createComponent();

    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('No characters found.');
  });
});
