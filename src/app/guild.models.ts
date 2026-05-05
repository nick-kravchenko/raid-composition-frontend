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

export type CharacterRole = 'tank' | 'heal' | 'melee' | 'ranged';
export type CharacterRank = 'main' | 'alt';

export interface Character {
  id: string;
  user_id: string;
  name: string;
  region: string;
  server: string;
  class: string;
  race: string;
  spec: string;
  role: CharacterRole;
  rank: CharacterRank;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface CharactersResponse {
  characters: Character[];
}

export interface WclGearItem {
  id: number;
  slot: number;
  permanentEnchant: number | null;
  gems: {
    icon: string;
    id: number;
    itemLevel: number;
  }[] | null;
}

export interface CharacterBattleNetSnapshot {
  avatar_url: string | null;
  level: number | null;
  equipped_item_level: number | null;
  active_spec_name: string | null;
  faction: string | null;
  error: string | null;
  fetched_at: string | null;
}

export interface CharacterWarcraftLogsSnapshot {
  gear: WclGearItem[];
  best_performance_average: number | null;
  median_performance_average: number | null;
  total_kills: number;
  partial: boolean;
  error: string | null;
  fetched_at: string | null;
}

export interface CharacterDetail extends Character {
  battlenet: CharacterBattleNetSnapshot | null;
  warcraftlogs: CharacterWarcraftLogsSnapshot | null;
}

export interface CharacterDetailResponse {
  character: CharacterDetail;
}
