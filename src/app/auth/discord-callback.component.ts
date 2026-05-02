import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { take } from 'rxjs';

import { AuthService } from './auth.service';

type CallbackStatus = 'pending' | 'error';

@Component({
  selector: 'rc-discord-callback',
  imports: [RouterLink],
  template: `
    <main class="auth-callback">
      @if (status() === 'pending') {
        <h1>Signing in with Discord...</h1>
        <p>Keep this tab open while we finish your login.</p>
      } @else {
        <h1>{{ errorTitle() }}</h1>
        <p>{{ errorMessage() }}</p>
        <a routerLink="/">Back to home</a>
      }
    </main>
  `,
  styles: [
    `
      .auth-callback {
        min-height: 100dvh;
        display: grid;
        place-content: center;
        gap: 0.75rem;
        padding: 2rem;
        text-align: center;
      }

      h1 {
        font-size: var(--text-2xl);
        line-height: var(--leading-2xl);
      }

      p,
      a {
        color: var(--text-secondary);
      }
    `,
  ],
})
export class DiscordCallbackComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly status = signal<CallbackStatus>('pending');
  readonly errorTitle = signal('Discord sign-in failed');
  readonly errorMessage = signal('Please try signing in again.');

  ngOnInit(): void {
    this.route.queryParams.pipe(take(1)).subscribe((params) => {
      void this.handleCallback(params['code'], params['state']);
    });
  }

  private async handleCallback(code: unknown, state: unknown): Promise<void> {
    if (!this.isPresent(code) || !this.isPresent(state)) {
      this.status.set('error');
      this.errorTitle.set('Discord sign-in link is invalid');
      this.errorMessage.set('Start the Discord login flow again from the header.');
      return;
    }

    try {
      await this.auth.completeDiscordCallback(code, state);
      await this.router.navigateByUrl('/');
    } catch {
      this.status.set('error');
      this.errorTitle.set('Discord sign-in failed');
      this.errorMessage.set('The backend could not complete Discord authorization.');
    }
  }

  private isPresent(value: unknown): value is string {
    return typeof value === 'string' && value.trim().length > 0;
  }
}
