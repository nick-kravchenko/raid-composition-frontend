import { isPlatformBrowser } from '@angular/common';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { API_BASE } from '../app.tokens';
import {
  AuthSessionResponse,
  AuthState,
  DiscordAuthUrlResponse,
  DiscordCallbackRequest,
} from './auth.models';

const POST_LOGIN_URL_KEY = 'rc.postLoginUrl';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly apiBase = inject(API_BASE);
  private readonly authState = signal<AuthState>({ status: 'loading' });

  readonly state = this.authState.asReadonly();
  readonly currentUser = computed(() => {
    const state = this.authState();
    return state.status === 'authenticated' ? state.user : null;
  });

  async loadSession(): Promise<void> {
    this.authState.set({ status: 'loading' });

    try {
      const response = await firstValueFrom(
        this.http.get<AuthSessionResponse>(`${this.apiBase}/auth/session`, {
          withCredentials: true,
        }),
      );

      this.authState.set({
        status: 'authenticated',
        user: response.user,
        session: response.session,
      });
    } catch (error) {
      if (error instanceof HttpErrorResponse && error.status === 401) {
        this.authState.set({ status: 'unauthenticated' });
        return;
      }

      this.authState.set({
        status: 'error',
        message: 'Unable to load authentication session.',
      });
      throw error;
    }
  }

  async getDiscordAuthorizationUrl(): Promise<string> {
    const response = await firstValueFrom(
      this.http.get<DiscordAuthUrlResponse>(`${this.apiBase}/auth/discord/url`, {
        withCredentials: true,
      }),
    );

    return response.url;
  }

  /** Starts login; `returnUrl` is where the callback sends the user afterwards. */
  async beginDiscordLogin(returnUrl?: string): Promise<void> {
    const url = await this.getDiscordAuthorizationUrl();

    if (isPlatformBrowser(this.platformId)) {
      if (returnUrl) {
        sessionStorage.setItem(POST_LOGIN_URL_KEY, returnUrl);
      }
      window.location.href = url;
    }
  }

  /** The page to open after login. Only same-site paths are honoured. */
  consumePostLoginUrl(): string {
    if (!isPlatformBrowser(this.platformId)) {
      return '/';
    }
    const url = sessionStorage.getItem(POST_LOGIN_URL_KEY);
    sessionStorage.removeItem(POST_LOGIN_URL_KEY);
    return url?.startsWith('/') && !url.startsWith('//') ? url : '/';
  }

  async completeDiscordCallback(code: string, state: string): Promise<void> {
    const body: DiscordCallbackRequest = { code, state };

    await firstValueFrom(
      this.http.post<void>(`${this.apiBase}/auth/discord/callback`, body, {
        withCredentials: true,
      }),
    );

    await this.loadSession();
  }

  async logout(): Promise<void> {
    try {
      await firstValueFrom(
        this.http.post<void>(`${this.apiBase}/auth/logout`, {}, { withCredentials: true }),
      );
      this.authState.set({ status: 'unauthenticated' });
    } catch (error) {
      if (error instanceof HttpErrorResponse && error.status === 401) {
        this.authState.set({ status: 'unauthenticated' });
        return;
      }

      this.authState.set({
        status: 'error',
        message: 'Unable to sign out right now.',
      });
      throw error;
    }
  }
}
