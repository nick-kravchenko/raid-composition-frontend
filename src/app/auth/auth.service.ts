import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import {
  AuthSessionResponse,
  AuthState,
  DiscordAuthUrlResponse,
  DiscordCallbackRequest,
} from './auth.models';

const API_BASE_URL = 'http://localhost:8000/api/v1';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly document = inject(DOCUMENT);
  private readonly platformId = inject(PLATFORM_ID);
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
        this.http.get<AuthSessionResponse>(`${API_BASE_URL}/auth/session`, {
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
      this.http.get<DiscordAuthUrlResponse>(`${API_BASE_URL}/auth/discord/url`, {
        withCredentials: true,
      }),
    );

    return response.url;
  }

  async beginDiscordLogin(): Promise<void> {
    const url = await this.getDiscordAuthorizationUrl();

    if (isPlatformBrowser(this.platformId)) {
      window.location.href = url;
    }
  }

  async completeDiscordCallback(code: string, state: string): Promise<void> {
    const body: DiscordCallbackRequest = { code, state };

    await firstValueFrom(
      this.http.post<void>(`${API_BASE_URL}/auth/discord/callback`, body, {
        withCredentials: true,
      }),
    );

    await this.loadSession();
  }

  async logout(): Promise<void> {
    const csrfToken = this.getCookieValue('csrf');

    if (!csrfToken) {
      this.authState.set({
        status: 'error',
        message: 'Unable to sign out because the CSRF token cookie is missing.',
      });
      throw new Error('CSRF token cookie is missing.');
    }

    try {
      await firstValueFrom(
        this.http.post<void>(
          `${API_BASE_URL}/auth/logout`,
          {},
          {
            withCredentials: true,
            headers: {
              'X-CSRF-Token': csrfToken,
            },
          },
        ),
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

  private getCookieValue(name: string): string | null {
    if (!isPlatformBrowser(this.platformId)) {
      return null;
    }

    const cookie = this.document.cookie ?? '';
    const prefix = `${name}=`;

    for (const entry of cookie.split(';')) {
      const trimmed = entry.trim();
      if (trimmed.startsWith(prefix)) {
        return decodeURIComponent(trimmed.slice(prefix.length));
      }
    }

    return null;
  }
}
