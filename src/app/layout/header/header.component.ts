import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { AuthService } from '../../auth/auth.service';
import { SafeUser } from '../../auth/auth.models';

@Component({
  selector: 'rc-header',
  imports: [RouterLink],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss',
})
export class HeaderComponent {
  private readonly auth = inject(AuthService);

  isMenuOpen = signal(false);
  isUserMenuOpen = signal(false);
  isLogoutPending = signal(false);
  isLoginPending = signal(false);
  authState = this.auth.state;
  currentUser = this.auth.currentUser;

  toggleMenu(): void {
    this.isMenuOpen.update((v) => !v);
  }

  toggleUserMenu(): void {
    this.isUserMenuOpen.update((v) => !v);
  }

  async onDiscordLogin(): Promise<void> {
    if (this.isLoginPending()) {
      return;
    }

    this.isLoginPending.set(true);

    try {
      await this.auth.beginDiscordLogin();
    } finally {
      this.isLoginPending.set(false);
    }
  }

  async onLogout(): Promise<void> {
    if (this.isLogoutPending()) {
      return;
    }

    this.isLogoutPending.set(true);

    try {
      await this.auth.logout();
    } finally {
      this.isLogoutPending.set(false);
      this.isUserMenuOpen.set(false);
    }
  }

  displayName(user: SafeUser): string {
    return user.discord.global_name ?? user.discord.username ?? 'Discord user';
  }

  username(user: SafeUser): string {
    return user.discord.username ?? user.discord.id;
  }
}
