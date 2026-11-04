export type GuildRole = 'applicant' | 'raider' | 'officer' | 'admin';
export type GuildRegion = 'us' | 'eu' | 'kr' | 'tw' | 'cn';
export type GuildFaction = 'alliance' | 'horde';
export type GameVersion = 'classicann' | 'forever';

export interface Guild {
  id: string;
  name: string;
  realm: string;
  region: GuildRegion;
  faction: GuildFaction;
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

export interface CharacterOwner {
  discord_id: string;
  display_name: string | null;
}

export interface Character {
  id: string;
  guild_id: string | null;
  game_version: GameVersion;
  user_id: string | null;
  player_name: string | null;
  owner: CharacterOwner | null;
  can_manage: boolean;
  name: string;
  region: string;
  server: string | null;
  class: string;
  race: string;
  spec: string;
  role: CharacterRole;
  rank: CharacterRank;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface CharacterPayload {
  name: string;
  region: string;
  server: string | null;
  class: string;
  race: string;
  spec: string;
  role: CharacterRole;
  rank: CharacterRank;
  player_name: string | null;
}

export interface CharacterLookup {
  class: string | null;
  race: string | null;
  spec: string | null;
  faction: string | null;
  level: number | null;
}

export interface CompositionRaid {
  title: string;
  slots: (string | null)[];
  bench: string[];
}

export interface Composition {
  id: string;
  guild_id: string;
  game_version: GameVersion;
  name: string;
  raid_size: number;
  raids: CompositionRaid[];
  revision: number;
  created_at: string;
  updated_at: string;
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
