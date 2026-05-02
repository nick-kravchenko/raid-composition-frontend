export interface DiscordAuthUrlResponse {
  url: string;
}

export interface DiscordCallbackRequest {
  code: string;
  state: string;
}

export interface AuthSessionResponse {
  user: SafeUser;
  session: SafeSession;
}

export interface SafeUser {
  id: string;
  created_at: string;
  discord: SafeDiscordUser;
}

export interface SafeDiscordUser {
  id: string;
  username: string | null;
  global_name: string | null;
  avatar_url: string;
}

export interface SafeSession {
  id: string;
  created_at: string;
  last_seen_at: string;
  expires_at: string;
  user_agent: string | null;
  login_location: Location;
  current_location: Location;
  is_current: boolean;
}

export interface Location {
  country: string | null;
  region: string | null;
  city: string | null;
}

export type AuthState =
  | { status: 'loading' }
  | { status: 'unauthenticated' }
  | { status: 'authenticated'; user: SafeUser; session: SafeSession }
  | { status: 'error'; message: string };
