import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { API_BASE } from './app.tokens';
import {
  CreateGuildPayload,
  Guild,
  GuildInvite,
  GuildInviteResponse,
  GuildMember,
  GuildMembersResponse,
  GuildResponse,
  GuildsResponse,
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
