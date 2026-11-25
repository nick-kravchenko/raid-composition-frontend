import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  linkedSignal,
  signal,
} from '@angular/core';
import { AuthService } from '../../auth/auth.service';

@Component({
  selector: 'rc-profile',
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfileComponent {
  private readonly auth = inject(AuthService);
  readonly state = this.auth.state;
  readonly user = this.auth.currentUser;
  readonly displayName = computed(
    () =>
      this.user()?.discord.global_name?.trim() ||
      this.user()?.discord.username?.trim() ||
      'Discord user',
  );
  readonly avatarFailed = linkedSignal({ source: this.user, computation: () => false });
  readonly feedback = linkedSignal({ source: this.user, computation: () => '' });
  readonly pending = signal(false);
  readonly actionError = linkedSignal({ source: this.user, computation: () => '' });

  connect(provider: 'Battle.net' | 'Warcraft Logs'): void {
    this.feedback.set(`${provider}: Coming soon.`);
  }

  async signIn(): Promise<void> {
    await this.runAction(
      () => this.auth.beginDiscordLogin('/profile'),
      'Unable to start Discord sign-in. Please try again.',
    );
  }

  async retry(): Promise<void> {
    await this.runAction(
      () => this.auth.loadSession(),
      'Unable to load your profile. Please try again.',
    );
  }

  private async runAction(action: () => Promise<void>, errorMessage: string): Promise<void> {
    if (this.pending()) return;
    this.pending.set(true);
    this.actionError.set('');
    try {
      await action();
    } catch {
      this.actionError.set(errorMessage);
    } finally {
      this.pending.set(false);
    }
  }
}
