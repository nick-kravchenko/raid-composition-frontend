import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { computed, signal } from '@angular/core';

import { AuthService } from '../../auth/auth.service';
import { AuthState } from '../../auth/auth.models';
import { HeaderComponent } from './header.component';

describe('HeaderComponent', () => {
  let fixture: ComponentFixture<HeaderComponent>;
  let authState: ReturnType<typeof signal<AuthState>>;
  let authService: Pick<
    AuthService,
    'state' | 'currentUser' | 'beginDiscordLogin' | 'loadSession' | 'logout'
  >;

  beforeEach(async () => {
    authState = signal<AuthState>({ status: 'unauthenticated' });
    authService = {
      state: authState.asReadonly(),
      currentUser: computed(() => {
        const state = authState();
        return state.status === 'authenticated' ? state.user : null;
      }),
      beginDiscordLogin: vi.fn().mockResolvedValue(undefined),
      loadSession: vi.fn().mockResolvedValue(undefined),
      logout: vi.fn().mockResolvedValue(undefined),
    };

    await TestBed.configureTestingModule({
      imports: [HeaderComponent],
      providers: [provideRouter([]), { provide: AuthService, useValue: authService }],
    }).compileComponents();

    fixture = TestBed.createComponent(HeaderComponent);
    fixture.detectChanges();
  });

  it('loads the current session on init', () => {
    expect(authService.loadSession).toHaveBeenCalled();
  });

  it('starts Discord login from the header action', () => {
    const button = getDiscordLoginButton();

    button.click();

    expect(authService.beginDiscordLogin).toHaveBeenCalled();
  });

  it('shows Discord identity instead of the login action when authenticated', () => {
    authState.set({
      status: 'authenticated',
      user: {
        id: 'user-1',
        created_at: '2026-05-02T10:00:00Z',
        discord: {
          id: 'discord-1',
          username: 'raidlead',
          global_name: 'Raid Lead',
          avatar_url: 'https://cdn.example.test/avatar.png',
        },
      },
      session: {
        id: 'session-1',
        created_at: '2026-05-02T10:00:00Z',
        last_seen_at: '2026-05-02T10:00:00Z',
        expires_at: '2026-05-03T10:00:00Z',
        user_agent: null,
        login_location: { country: null, region: null, city: null },
        current_location: { country: null, region: null, city: null },
        is_current: true,
      },
    });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Raid Lead');
    expect(fixture.nativeElement.textContent).toContain('@raidlead');
    expect(getDiscordLoginButton()).toBeNull();
  });

  it('toggles a logout menu from the user profile button', () => {
    authState.set({
      status: 'authenticated',
      user: {
        id: 'user-1',
        created_at: '2026-05-02T10:00:00Z',
        discord: {
          id: 'discord-1',
          username: 'raidlead',
          global_name: 'Raid Lead',
          avatar_url: 'https://cdn.example.test/avatar.png',
        },
      },
      session: {
        id: 'session-1',
        created_at: '2026-05-02T10:00:00Z',
        last_seen_at: '2026-05-02T10:00:00Z',
        expires_at: '2026-05-03T10:00:00Z',
        user_agent: null,
        login_location: { country: null, region: null, city: null },
        current_location: { country: null, region: null, city: null },
        is_current: true,
      },
    });
    fixture.detectChanges();

    getUserProfileButton().click();
    fixture.detectChanges();

    expect(getLogoutButton()).not.toBeNull();
  });

  it('logs out through the profile menu', async () => {
    authState.set({
      status: 'authenticated',
      user: {
        id: 'user-1',
        created_at: '2026-05-02T10:00:00Z',
        discord: {
          id: 'discord-1',
          username: 'raidlead',
          global_name: 'Raid Lead',
          avatar_url: 'https://cdn.example.test/avatar.png',
        },
      },
      session: {
        id: 'session-1',
        created_at: '2026-05-02T10:00:00Z',
        last_seen_at: '2026-05-02T10:00:00Z',
        expires_at: '2026-05-03T10:00:00Z',
        user_agent: null,
        login_location: { country: null, region: null, city: null },
        current_location: { country: null, region: null, city: null },
        is_current: true,
      },
    });
    fixture.detectChanges();

    getUserProfileButton().click();
    fixture.detectChanges();
    getLogoutButton().click();

    expect(authService.logout).toHaveBeenCalled();
  });

  function getDiscordLoginButton(): HTMLButtonElement {
    return fixture.nativeElement.querySelector('.btn-discord');
  }

  function getUserProfileButton(): HTMLButtonElement {
    return fixture.nativeElement.querySelector('.user-profile');
  }

  function getLogoutButton(): HTMLButtonElement {
    return fixture.nativeElement.querySelector('.user-menu-button');
  }
});
