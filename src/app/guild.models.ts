export type GuildRole = 'applicant' | 'raider' | 'officer' | 'admin';
export type GuildRegion = 'us' | 'eu' | 'kr' | 'tw' | 'cn';
export type GuildFaction = 'alliance' | 'horde';
export type GuildGameVersion = 'classic1x' | 'classic' | 'classicann';

export interface Guild {
  id: string;
  name: string;
  realm: string;
  region: GuildRegion;
  faction: GuildFaction;
  game_version: GuildGameVersion;
  invite_url: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  membership_role: GuildRole | null;
}

export interface GuildMemberDiscord {
  id: string;
  username: string | null;
  global_name: string | null;
  avatar_url: string;
}

export interface GuildMember {
  user_id: string;
  role: GuildRole;
  discord: GuildMemberDiscord;
  created_at: string;
  updated_at: string;
}

export interface GuildInvite {
  guild_id: string;
  code: string;
}

export interface CreateGuildPayload {
  name: string;
  realm: string;
  region: GuildRegion;
  faction: GuildFaction;
  game_version: GuildGameVersion;
}

export interface GuildsResponse {
  guilds: Guild[];
}

export interface GuildResponse {
  guild: Guild;
}

export interface GuildMembersResponse {
  members: GuildMember[];
}

export interface GuildInviteResponse {
  invite: GuildInvite;
}
