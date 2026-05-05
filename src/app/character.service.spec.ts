import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';

import { API_BASE } from './app.tokens';
import { CharacterService } from './character.service';
import { CharacterDetail } from './guild.models';

const API = 'http://localhost:8000/api/v1';

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
  battlenet: {
    avatar_url: null,
    level: 70,
    equipped_item_level: 350,
    active_spec_name: 'Fury',
    faction: 'alliance',
    error: null,
    fetched_at: '2026-05-01T00:00:00Z',
  },
  warcraftlogs: {
    gear: [{ id: 12345, slot: 1, permanentEnchantID: null }],
    best_performance_average: 87.3,
    median_performance_average: 72.1,
    total_kills: 42,
    partial: false,
    error: null,
    fetched_at: '2026-05-01T00:00:00Z',
  },
};

describe('CharacterService', () => {
  let service: CharacterService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_BASE, useValue: API },
      ],
    });
    service = TestBed.inject(CharacterService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
  });

  it('getCharacter: GET /characters/:id with credentials, returns unwrapped character', async () => {
    const result = firstValueFrom(service.getCharacter('char-1'));

    const req = http.expectOne(`${API}/characters/char-1`);
    expect(req.request.method).toBe('GET');
    expect(req.request.withCredentials).toBe(true);
    req.flush({ character: stubCharacter });

    await expect(result).resolves.toEqual(stubCharacter);
  });

  it('refreshBattleNet: POST /characters/:id/battlenet/refresh with credentials', async () => {
    const result = firstValueFrom(service.refreshBattleNet('char-1'));

    const req = http.expectOne(`${API}/characters/char-1/battlenet/refresh`);
    expect(req.request.method).toBe('POST');
    expect(req.request.withCredentials).toBe(true);
    expect(req.request.body).toEqual({});
    req.flush(null);

    await expect(result).resolves.toBeNull();
  });

  it('refreshWarcraftLogs: POST /characters/:id/warcraftlogs/refresh with credentials', async () => {
    const result = firstValueFrom(service.refreshWarcraftLogs('char-1'));

    const req = http.expectOne(`${API}/characters/char-1/warcraftlogs/refresh`);
    expect(req.request.method).toBe('POST');
    expect(req.request.withCredentials).toBe(true);
    expect(req.request.body).toEqual({});
    req.flush(null);

    await expect(result).resolves.toBeNull();
  });
});
