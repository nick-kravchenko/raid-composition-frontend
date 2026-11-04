import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { API_BASE } from '../app.tokens';
import { Composition, CompositionRaid, GameVersion } from '../guild.models';

@Injectable({ providedIn: 'root' })
export class CompositionService {
  private readonly http = inject(HttpClient);
  private readonly apiBase = inject(API_BASE);

  private url(guildId: string, compositionId?: string): string {
    const base = `${this.apiBase}/guilds/${guildId}/compositions`;
    return compositionId ? `${base}/${compositionId}` : base;
  }

  list(guildId: string): Observable<Composition[]> {
    return this.http
      .get<{ compositions: Composition[] }>(this.url(guildId), { withCredentials: true })
      .pipe(map((res) => res.compositions));
  }

  get(guildId: string, compositionId: string): Observable<Composition> {
    return this.http
      .get<{ composition: Composition }>(this.url(guildId, compositionId), {
        withCredentials: true,
      })
      .pipe(map((res) => res.composition));
  }

  create(
    guildId: string,
    payload: { game_version: GameVersion; name: string; raid_size: number },
  ): Observable<Composition> {
    return this.http
      .post<{ composition: Composition }>(this.url(guildId), payload, { withCredentials: true })
      .pipe(map((res) => res.composition));
  }

  update(
    guildId: string,
    compositionId: string,
    payload: { name: string; raid_size: number; raids: CompositionRaid[]; revision: number },
  ): Observable<Composition> {
    return this.http
      .put<{ composition: Composition }>(this.url(guildId, compositionId), payload, {
        withCredentials: true,
      })
      .pipe(map((res) => res.composition));
  }

  delete(guildId: string, compositionId: string): Observable<void> {
    return this.http.delete<void>(this.url(guildId, compositionId), { withCredentials: true });
  }
}
