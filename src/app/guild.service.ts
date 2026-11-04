import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { API_BASE } from './app.tokens';
import {
  Character,
  CharacterLookup,
  CharacterPayload,
  CharactersResponse,
  CreateGuildPayload,
  Guild,
  GuildInvite,
  GuildInviteResponse,
  GuildMember,
  GuildMembersResponse,
  GuildResponse,
  GuildsResponse,
  GameVersion,
} from './guild.models';

@Injectable({ providedIn: 'root' })
export class GuildService {
  private readonly http = inject(HttpClient);
  private readonly apiBase = inject(API_BASE);

  listGuilds(): Observable<Guild[]> {
    return this.http
      .get<GuildsResponse>(`${this.apiBase}/guilds`, { withCredentials: true })
      .pipe(map((res) => res.guilds));
  }

  createGuild(payload: CreateGuildPayload): Observable<Guild> {
    return this.http
      .post<GuildResponse>(`${this.apiBase}/guilds`, payload, { withCredentials: true })
      .pipe(map((res) => res.guild));
  }

  getGuild(id: string): Observable<Guild> {
    return this.http
      .get<GuildResponse>(`${this.apiBase}/guilds/${id}`, { withCredentials: true })
      .pipe(map((res) => res.guild));
  }

  listMembers(id: string): Observable<GuildMember[]> {
    return this.http
      .get<GuildMembersResponse>(`${this.apiBase}/guilds/${id}/members`, { withCredentials: true })
      .pipe(map((res) => res.members));
  }

  listCharacters(id: string): Observable<Character[]> {
    return this.http
      .get<CharactersResponse>(`${this.apiBase}/guilds/${id}/characters`, { withCredentials: true })
      .pipe(map((res) => res.characters));
  }

  createCharacter(
    guildId: string,
    payload: CharacterPayload & { game_version: GameVersion },
  ): Observable<Character> {
    return this.http
      .post<{ character: Character }>(`${this.apiBase}/guilds/${guildId}/characters`, payload, {
        withCredentials: true,
      })
      .pipe(map((res) => res.character));
  }

  updateCharacter(id: string, payload: CharacterPayload): Observable<Character> {
    return this.http
      .put<{ character: Character }>(`${this.apiBase}/characters/${id}`, payload, {
        withCredentials: true,
      })
      .pipe(map((res) => res.character));
  }

  deleteCharacter(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiBase}/characters/${id}`, { withCredentials: true });
  }

  /** Binds a character to a guild member, or releases it when userId is null. */
  bindCharacter(id: string, userId: string | null): Observable<Character> {
    return this.http
      .put<{ character: Character }>(
        `${this.apiBase}/characters/${id}/owner`,
        { user_id: userId },
        { withCredentials: true },
      )
      .pipe(map((res) => res.character));
  }

  lookupCharacter(
    guildId: string,
    query: { name: string; server: string; region: string },
  ): Observable<CharacterLookup> {
    return this.http.get<CharacterLookup>(`${this.apiBase}/guilds/${guildId}/characters/lookup`, {
      params: query,
      withCredentials: true,
    });
  }

  rejectApplicant(guildId: string, userId: string): Observable<void> {
    return this.http.delete<void>(`${this.apiBase}/guilds/${guildId}/members/${userId}`, {
      withCredentials: true,
    });
  }

  createInvite(guildId: string): Observable<GuildInvite> {
    return this.http
      .post<GuildInviteResponse>(`${this.apiBase}/guilds/${guildId}/invites`, {}, { withCredentials: true })
      .pipe(map((res) => res.invite));
  }

  acceptInvite(code: string): Observable<Guild> {
    return this.http
      .post<GuildResponse>(`${this.apiBase}/guild-invites/${code}/accept`, {}, { withCredentials: true })
      .pipe(map((res) => res.guild));
  }

  promoteMember(guildId: string, userId: string, role: 'raider' | 'officer'): Observable<GuildMember> {
    return this.http
      .patch<{ member: GuildMember }>(
        `${this.apiBase}/guilds/${guildId}/members/${userId}`,
        { role },
        { withCredentials: true },
      )
      .pipe(map((res) => res.member));
  }
}
