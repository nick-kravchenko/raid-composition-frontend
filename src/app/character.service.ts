import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { API_BASE } from './app.tokens';
import { CharacterDetail, CharacterDetailResponse } from './guild.models';

@Injectable({ providedIn: 'root' })
export class CharacterService {
  private readonly http = inject(HttpClient);
  private readonly apiBase = inject(API_BASE);

  getCharacter(id: string): Observable<CharacterDetail> {
    return this.http
      .get<CharacterDetailResponse>(`${this.apiBase}/characters/${id}`, { withCredentials: true })
      .pipe(map((res) => res.character));
  }

  refreshBattleNet(id: string): Observable<void> {
    return this.http.post<void>(`${this.apiBase}/characters/${id}/battlenet/refresh`, {}, { withCredentials: true });
  }

  refreshWarcraftLogs(id: string): Observable<void> {
    return this.http.post<void>(`${this.apiBase}/characters/${id}/warcraftlogs/refresh`, {}, { withCredentials: true });
  }
}
