import { ComponentFixture, TestBed } from '@angular/core/testing';
import { computed, signal } from '@angular/core';
import { AuthService } from '../../auth/auth.service';
import { AuthState } from '../../auth/auth.models';
import { ProfileComponent } from './profile.component';

const authenticated: Extract<AuthState, { status: 'authenticated' }> = {
  status: 'authenticated',
  user: {
    id: 'user-1',
    created_at: '',
    discord: {
      id: '123456789',
      username: 'raidlead',
      global_name: 'Raid Lead',
      avatar_url: 'https://example.test/avatar.png',
    },
  },
  session: {
    id: 'session-1',
    created_at: '',
    last_seen_at: '',
    expires_at: '',
    user_agent: null,
    login_location: { country: null, region: null, city: null },
    current_location: { country: null, region: null, city: null },
    is_current: true,
  },
};

describe('ProfileComponent', () => {
  let fixture: ComponentFixture<ProfileComponent>;
  let state: ReturnType<typeof signal<AuthState>>;
  let auth: Pick<AuthService, 'state' | 'currentUser' | 'beginDiscordLogin' | 'loadSession'>;
  const text = () => fixture.nativeElement.textContent as string;
  const button = (label: string): HTMLButtonElement =>
    Array.from(
      fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>,
    ).find((b) => b.textContent?.includes(label))!;

  beforeEach(async () => {
    state = signal<AuthState>(structuredClone(authenticated));
    auth = {
      state: state.asReadonly(),
      currentUser: computed(() => {
        const s = state();
        return s.status === 'authenticated' ? s.user : null;
      }),
      beginDiscordLogin: vi.fn().mockResolvedValue(undefined),
      loadSession: vi.fn().mockResolvedValue(undefined),
    };
    await TestBed.configureTestingModule({
      imports: [ProfileComponent],
      providers: [{ provide: AuthService, useValue: auth }],
    }).compileComponents();
    fixture = TestBed.createComponent(ProfileComponent);
    fixture.detectChanges();
  });

  it('renders Discord identity and avatar without requesting a new session', () => {
    expect(text()).toContain('Raid Lead');
    expect(text()).toContain('raidlead');
    expect(text()).toContain('123456789');
    expect(fixture.nativeElement.querySelector('img').getAttribute('src')).toBe(
      authenticated.user.discord.avatar_url,
    );
    expect(auth.loadSession).not.toHaveBeenCalled();
  });

  it('handles absent names and broken avatars and resets for another identity', () => {
    const user = structuredClone(authenticated.user);
    user.discord.global_name = null;
    state.set({ ...authenticated, user });
    fixture.detectChanges();
    expect(text()).toContain('raidlead');
    user.discord.username = null;
    state.set({ ...authenticated, user: structuredClone(user) });
    fixture.detectChanges();
    expect(text()).toContain('Discord user');
    expect(text()).toContain('Unavailable');
    fixture.nativeElement.querySelector('img').dispatchEvent(new Event('error'));
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('img')).toBeNull();
    expect(fixture.nativeElement.querySelector('.avatar-fallback')).not.toBeNull();
    state.set(structuredClone(authenticated));
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('img')).not.toBeNull();
  });

  it('announces each dummy connection without calling authentication services', () => {
    button('Connect Battle.net').click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role=status]').textContent).toContain(
      'Battle.net: Coming soon.',
    );
    button('Connect Warcraft Logs').click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role=status]').textContent).toContain(
      'Warcraft Logs: Coming soon.',
    );
    expect(auth.beginDiscordLogin).not.toHaveBeenCalled();
    expect(auth.loadSession).not.toHaveBeenCalled();
    state.set({ status: 'unauthenticated' });
    fixture.detectChanges();
    state.set(structuredClone(authenticated));
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role=status]').textContent.trim()).toBe('');
  });

  it('shows loading without sign-in or profile details and reacts to logout', () => {
    state.set({ status: 'loading' });
    fixture.detectChanges();
    expect(text()).toContain('Loading your profile');
    expect(text()).not.toContain('Sign in with Discord');
    expect(text()).not.toContain('123456789');
    state.set({ status: 'unauthenticated' });
    fixture.detectChanges();
    expect(text()).toContain('Sign in with Discord');
    expect(text()).not.toContain('Connect Battle.net');
  });

  it('signs in with a profile return URL and prevents duplicate requests', async () => {
    state.set({ status: 'unauthenticated' });
    fixture.detectChanges();
    let resolve!: () => void;
    vi.mocked(auth.beginDiscordLogin).mockImplementation(
      () => new Promise<void>((r) => (resolve = r)),
    );
    button('Sign in with Discord').click();
    await fixture.componentInstance.signIn();
    fixture.detectChanges();
    expect(auth.beginDiscordLogin).toHaveBeenCalledExactlyOnceWith('/profile');
    expect(button('Connecting').disabled).toBe(true);
    resolve();
    await fixture.whenStable();
  });

  it('shows sign-in errors and restores the action', async () => {
    state.set({ status: 'unauthenticated' });
    fixture.detectChanges();
    vi.mocked(auth.beginDiscordLogin).mockRejectedValue(new Error('offline'));
    button('Sign in with Discord').click();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role=alert]').textContent).toContain(
      'Unable to start Discord sign-in',
    );
    expect(button('Sign in with Discord').disabled).toBe(false);
  });

  it('retries session failures and handles a rejected retry', async () => {
    state.set({ status: 'error', message: 'offline' });
    fixture.detectChanges();
    vi.mocked(auth.loadSession).mockRejectedValueOnce(new Error('offline'));
    button('Try again').click();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(auth.loadSession).toHaveBeenCalledTimes(1);
    expect(text()).toContain('Please try again');
    vi.mocked(auth.loadSession).mockImplementation(async () => {
      state.set(structuredClone(authenticated));
    });
    button('Try again').click();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(text()).toContain('Raid Lead');
    expect(fixture.nativeElement.querySelector('[role=alert]')).toBeNull();
  });
});
