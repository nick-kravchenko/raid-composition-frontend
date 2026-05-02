import { Component, afterNextRender, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { firstValueFrom, filter, take } from 'rxjs';
import { toObservable } from '@angular/core/rxjs-interop';

import { AuthService } from '../auth/auth.service';
import { GuildService } from '../guild.service';
import { Guild } from '../guild.models';

type AcceptInviteStatus = 'loading' | 'success' | 'error' | 'needs-auth';

@Component({
  selector: 'rc-accept-invite',
  imports: [RouterLink],
  template: `
    <main class="accept-invite">
      @if (status() === 'loading') {
        <h1>Joining guild...</h1>
      } @else if (status() === 'success') {
        <h1>You have joined {{ guild()!.name }}!</h1>
        <a [routerLink]="['/guilds', guild()!.id]">Go to guild</a>
      } @else if (status() === 'error') {
        <h1>Failed to join guild. The invite link may be invalid or expired.</h1>
        <a routerLink="/guilds">Back to guilds</a>
      } @else if (status() === 'needs-auth') {
        <h1>Please sign in to manage guilds.</h1>
      }
    </main>
  `,
  styles: [
    `
      .accept-invite {
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

      a {
        color: var(--text-secondary);
      }
    `,
  ],
})
export class AcceptInviteComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly guildService = inject(GuildService);
  private readonly authService = inject(AuthService);

  // Field initializer — valid injection context for toObservable
  private readonly authState$ = toObservable(this.authService.state);

  readonly status = signal<AcceptInviteStatus>('loading');
  readonly guild = signal<Guild | null>(null);

  constructor() {
    // afterNextRender runs only in the browser after hydration completes,
    // preventing SSR/hydration mismatch (NG0100) caused by status changing
    // before the client has finished reconciling the server-rendered HTML.
    afterNextRender(() => {
      this.startAcceptFlow();
    });
  }

  private startAcceptFlow(): void {
    const code = this.route.snapshot.paramMap.get('code');
    const authState = this.authService.state();

    if (authState.status === 'unauthenticated') {
      this.status.set('needs-auth');
      return;
    }

    if (authState.status === 'loading') {
      this.authState$
        .pipe(
          filter((s) => s.status !== 'loading'),
          take(1),
        )
        .subscribe((resolvedState) => {
          if (resolvedState.status === 'unauthenticated') {
            this.status.set('needs-auth');
          } else {
            void this.acceptInvite(code);
          }
        });
      return;
    }

    void this.acceptInvite(code);
  }

  private async acceptInvite(code: string | null): Promise<void> {
    if (!code) {
      this.status.set('error');
      return;
    }

    try {
      const result = await firstValueFrom(this.guildService.acceptInvite(code));
      this.guild.set(result);
      this.status.set('success');
    } catch {
      this.status.set('error');
    }
  }
}
