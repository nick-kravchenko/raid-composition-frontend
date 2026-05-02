import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ActivatedRoute } from '@angular/router';
import { computed, signal } from '@angular/core';
import { of } from 'rxjs';

import { AuthService } from '../auth/auth.service';
import { AuthState, SafeUser } from '../auth/auth.models';
import { GuildService } from '../guild.service';
import { Guild, GuildMember, GuildInvite } from '../guild.models';
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

describe('GuildDetailComponent', () => {
  let fixture: ComponentFixture<GuildDetailComponent>;
  let component: GuildDetailComponent;
  let authState: ReturnType<typeof signal<AuthState>>;
  let guildService: Pick<
    GuildService,
    'getGuild' | 'listMembers' | 'createInvite' | 'promoteMember'
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
  ): void {
    authState = signal<AuthState>(initialAuthState);
    guildService = {
      getGuild: vi.fn().mockReturnValue(of(makeGuild(guildRole))),
      listMembers: vi.fn().mockReturnValue(of(members)),
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
});
