import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ActivatedRoute } from '@angular/router';
import { computed, signal } from '@angular/core';
import { of, throwError } from 'rxjs';

import { AuthService } from '../auth/auth.service';
import { AuthState, SafeUser } from '../auth/auth.models';
import { GuildService } from '../guild.service';
import { Guild } from '../guild.models';
import { AcceptInviteComponent } from './accept-invite.component';

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

const stubGuild: Guild = {
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
  membership_role: 'raider',
};

describe('AcceptInviteComponent', () => {
  let fixture: ComponentFixture<AcceptInviteComponent>;
  let component: AcceptInviteComponent;
  let authState: ReturnType<typeof signal<AuthState>>;
  let guildService: Pick<GuildService, 'acceptInvite'>;

  function buildAuthService(state: ReturnType<typeof signal<AuthState>>) {
    return {
      state: state.asReadonly(),
      currentUser: computed(() => {
        const s = state();
        return s.status === 'authenticated' ? s.user : null;
      }),
    };
  }

  function setupModule(initialAuthState: AuthState, code = 'invite-code-abc'): void {
    authState = signal<AuthState>(initialAuthState);
    guildService = {
      acceptInvite: vi.fn().mockReturnValue(of(stubGuild)),
    };

    TestBed.configureTestingModule({
      imports: [AcceptInviteComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: buildAuthService(authState) },
        { provide: GuildService, useValue: guildService },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: { get: (key: string) => (key === 'code' ? code : null) },
            },
          },
        },
      ],
    });
  }

  async function createComponent(): Promise<void> {
    await TestBed.compileComponents();
    fixture = TestBed.createComponent(AcceptInviteComponent);
    component = fixture.componentInstance;
  }

  it('unauthenticated auth state sets status to needs-auth and does not call acceptInvite', async () => {
    setupModule({ status: 'unauthenticated' });
    await createComponent();

    fixture.detectChanges();
    await fixture.whenStable();

    expect(component.status()).toBe('needs-auth');
    expect(guildService.acceptInvite).not.toHaveBeenCalled();
  });

  it('authenticated auth state calls acceptInvite and sets status to success with returned guild', async () => {
    setupModule({ status: 'authenticated', user: stubUser, session: {} as never });
    await createComponent();

    fixture.detectChanges();
    await fixture.whenStable();

    expect(guildService.acceptInvite).toHaveBeenCalledWith('invite-code-abc');
    expect(component.status()).toBe('success');
    expect(component.guild()).toEqual(stubGuild);
  });

  it('acceptInvite failure sets status to error', async () => {
    setupModule({ status: 'authenticated', user: stubUser, session: {} as never });
    (guildService.acceptInvite as ReturnType<typeof vi.fn>).mockReturnValue(
      throwError(() => new Error('Network error')),
    );
    await createComponent();

    fixture.detectChanges();
    await fixture.whenStable();

    expect(component.status()).toBe('error');
  });
});
