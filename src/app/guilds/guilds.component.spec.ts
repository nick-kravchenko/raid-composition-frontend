import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { computed, signal } from '@angular/core';
import { of, throwError } from 'rxjs';

import { AuthService } from '../auth/auth.service';
import { AuthState, SafeUser } from '../auth/auth.models';
import { GuildService } from '../guild.service';
import { Guild } from '../guild.models';
import { GuildsComponent } from './guilds.component';

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
  membership_role: 'admin',
};

describe('GuildsComponent', () => {
  let fixture: ComponentFixture<GuildsComponent>;
  let component: GuildsComponent;
  let authState: ReturnType<typeof signal<AuthState>>;
  let guildService: Pick<GuildService, 'listGuilds' | 'createGuild'>;

  function createComponent(): Promise<void> {
    return TestBed.compileComponents().then(() => {
      fixture = TestBed.createComponent(GuildsComponent);
      component = fixture.componentInstance;
    });
  }

  function setupModule(initialAuthState: AuthState): void {
    authState = signal<AuthState>(initialAuthState);
    guildService = {
      listGuilds: vi.fn().mockReturnValue(of([stubGuild])),
      createGuild: vi.fn().mockReturnValue(of(stubGuild)),
    };

    TestBed.configureTestingModule({
      imports: [GuildsComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: buildAuthService(authState) },
        { provide: GuildService, useValue: guildService },
      ],
    });
  }

  function buildAuthService(state: ReturnType<typeof signal<AuthState>>) {
    return {
      state: state.asReadonly(),
      currentUser: computed(() => {
        const s = state();
        return s.status === 'authenticated' ? s.user : null;
      }),
    };
  }

  it('unauthenticated state shows auth message and makes no API call', async () => {
    setupModule({ status: 'unauthenticated' });
    await createComponent();

    fixture.detectChanges();
    await fixture.whenStable();

    expect(fixture.nativeElement.textContent).toContain('Please sign in to manage guilds');
    expect(guildService.listGuilds).not.toHaveBeenCalled();
  });

  it('authenticated state calls listGuilds on init and renders guild names', async () => {
    setupModule({ status: 'authenticated', user: stubUser, session: {} as never });
    await createComponent();

    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(guildService.listGuilds).toHaveBeenCalledOnce();
    expect(fixture.nativeElement.textContent).toContain('The Mighty');
  });

  it('createGuild appends result to guild list signal on success', async () => {
    setupModule({ status: 'authenticated', user: stubUser, session: {} as never });
    await createComponent();

    fixture.detectChanges();
    await fixture.whenStable();

    const newGuild: Guild = { ...stubGuild, id: 'guild-2', name: 'New Guild' };
    (guildService.createGuild as ReturnType<typeof vi.fn>).mockReturnValue(of(newGuild));

    component.formName.set('New Guild');
    component.formRealm.set('Realm');
    component.formRegion.set('us');
    component.formFaction.set('horde');
    component.formGameVersion.set('classic');

    await component.onCreateGuild();
    fixture.detectChanges();

    expect(guildService.createGuild).toHaveBeenCalledWith({
      name: 'New Guild',
      realm: 'Realm',
      region: 'us',
      faction: 'horde',
      game_version: 'classic',
    });
    expect(component.guilds()).toContainEqual(newGuild);
  });

  it('createGuild failure sets createError signal', async () => {
    setupModule({ status: 'authenticated', user: stubUser, session: {} as never });
    await createComponent();

    fixture.detectChanges();
    await fixture.whenStable();

    (guildService.createGuild as ReturnType<typeof vi.fn>).mockReturnValue(
      throwError(() => new Error('Network error')),
    );

    component.formName.set('Bad Guild');
    component.formRealm.set('Realm');
    component.formRegion.set('us');
    component.formFaction.set('horde');
    component.formGameVersion.set('classic');

    await component.onCreateGuild();
    fixture.detectChanges();

    expect(component.createError()).toBe('Failed to create guild. Please try again.');
  });
});
