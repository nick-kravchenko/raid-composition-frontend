import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

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

const API = 'http://localhost:8000/api/v1';

@Injectable({ providedIn: 'root' })
export class GuildService {
  private readonly http = inject(HttpClient);

  listGuilds(): Observable<Guild[]> {
    return this.http
      .get<GuildsResponse>(`${API}/guilds`, { withCredentials: true })
      .pipe(map((res) => res.guilds));
  }

  createGuild(payload: CreateGuildPayload): Observable<Guild> {
    return this.http
      .post<GuildResponse>(`${API}/guilds`, payload, { withCredentials: true })
      .pipe(map((res) => res.guild));
  }

  getGuild(id: string): Observable<Guild> {
    return this.http
      .get<GuildResponse>(`${API}/guilds/${id}`, { withCredentials: true })
      .pipe(map((res) => res.guild));
  }

  listMembers(id: string): Observable<GuildMember[]> {
    return this.http
      .get<GuildMembersResponse>(`${API}/guilds/${id}/members`, { withCredentials: true })
      .pipe(map((res) => res.members));
  }

  createInvite(guildId: string): Observable<GuildInvite> {
    return this.http
      .post<GuildInviteResponse>(`${API}/guilds/${guildId}/invites`, {}, { withCredentials: true })
      .pipe(map((res) => res.invite));
  }

  acceptInvite(code: string): Observable<Guild> {
    return this.http
      .post<GuildResponse>(`${API}/guild-invites/${code}/accept`, {}, { withCredentials: true })
      .pipe(map((res) => res.guild));
  }

  promoteMember(guildId: string, userId: string, role: 'raider' | 'officer'): Observable<GuildMember> {
    return this.http
      .patch<{ member: GuildMember }>(
        `${API}/guilds/${guildId}/members/${userId}`,
        { role },
        { withCredentials: true },
      )
      .pipe(map((res) => res.member));
  }
}
