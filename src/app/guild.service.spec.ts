import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';

import { GuildService } from './guild.service';

const API = 'http://localhost:8000/api/v1';

const stubGuild = {
  id: 'guild-1',
  name: 'The Mighty',
  realm: 'Silvermoon',
  region: 'eu' as const,
  faction: 'alliance' as const,
  game_version: 'classic' as const,
  created_at: '2026-05-01T00:00:00Z',
  updated_at: '2026-05-01T00:00:00Z',
  deleted_at: null,
  membership_role: 'admin' as const,
};

const stubMember = {
  user_id: 'user-1',
  role: 'raider' as const,
  discord: {
    id: 'discord-1',
    username: 'raider',
    global_name: 'Raid Leader',
    avatar_url: 'https://cdn.example.test/avatar.png',
  },
  created_at: '2026-05-01T00:00:00Z',
  updated_at: '2026-05-01T00:00:00Z',
};

const stubInvite = {
  guild_id: 'guild-1',
  code: 'invite-code-abc',
};

describe('GuildService', () => {
  let service: GuildService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(GuildService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
  });

  it('listGuilds: GET /guilds with credentials, returns unwrapped guilds array', async () => {
    const result = firstValueFrom(service.listGuilds());

    const req = http.expectOne(`${API}/guilds`);
    expect(req.request.method).toBe('GET');
    expect(req.request.withCredentials).toBe(true);
    req.flush({ guilds: [stubGuild] });

    await expect(result).resolves.toEqual([stubGuild]);
  });

  it('createGuild: POST /guilds with credentials and payload, returns unwrapped guild', async () => {
    const payload = { name: 'The Mighty', realm: 'Silvermoon', region: 'eu' as const, faction: 'alliance' as const, game_version: 'classic' as const };
    const result = firstValueFrom(service.createGuild(payload));

    const req = http.expectOne(`${API}/guilds`);
    expect(req.request.method).toBe('POST');
    expect(req.request.withCredentials).toBe(true);
    expect(req.request.body).toEqual(payload);
    req.flush({ guild: stubGuild });

    await expect(result).resolves.toEqual(stubGuild);
  });

  it('getGuild: GET /guilds/:id with credentials, returns unwrapped guild', async () => {
    const result = firstValueFrom(service.getGuild('guild-1'));

    const req = http.expectOne(`${API}/guilds/guild-1`);
    expect(req.request.method).toBe('GET');
    expect(req.request.withCredentials).toBe(true);
    req.flush({ guild: stubGuild });

    await expect(result).resolves.toEqual(stubGuild);
  });

  it('listMembers: GET /guilds/:id/members with credentials, returns unwrapped members array', async () => {
    const result = firstValueFrom(service.listMembers('guild-1'));

    const req = http.expectOne(`${API}/guilds/guild-1/members`);
    expect(req.request.method).toBe('GET');
    expect(req.request.withCredentials).toBe(true);
    req.flush({ members: [stubMember] });

    await expect(result).resolves.toEqual([stubMember]);
  });

  it('createInvite: POST /guilds/:id/invites with credentials, returns unwrapped invite', async () => {
    const result = firstValueFrom(service.createInvite('guild-1'));

    const req = http.expectOne(`${API}/guilds/guild-1/invites`);
    expect(req.request.method).toBe('POST');
    expect(req.request.withCredentials).toBe(true);
    req.flush({ invite: stubInvite });

    await expect(result).resolves.toEqual(stubInvite);
  });

  it('acceptInvite: POST /guild-invites/:code/accept with credentials, returns unwrapped guild', async () => {
    const result = firstValueFrom(service.acceptInvite('invite-code-abc'));

    const req = http.expectOne(`${API}/guild-invites/invite-code-abc/accept`);
    expect(req.request.method).toBe('POST');
    expect(req.request.withCredentials).toBe(true);
    req.flush({ guild: stubGuild });

    await expect(result).resolves.toEqual(stubGuild);
  });

  it('promoteMember: PATCH /guilds/:id/members/:userId with credentials, returns unwrapped member', async () => {
    const result = firstValueFrom(service.promoteMember('guild-1', 'user-1', 'officer'));

    const req = http.expectOne(`${API}/guilds/guild-1/members/user-1`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.withCredentials).toBe(true);
    expect(req.request.body).toEqual({ role: 'officer' });
    req.flush({ member: { ...stubMember, role: 'officer' } });

    await expect(result).resolves.toEqual({ ...stubMember, role: 'officer' });
  });
});
