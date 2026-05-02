import { TitleCasePipe, UpperCasePipe } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { AuthService } from '../auth/auth.service';
import { GuildService } from '../guild.service';
import { Guild, CreateGuildPayload, GuildRegion, GuildFaction, GuildGameVersion } from '../guild.models';

@Component({
  selector: 'rc-guilds',
  imports: [RouterLink, TitleCasePipe, UpperCasePipe],
  templateUrl: './guilds.component.html',
  styleUrl: './guilds.component.scss',
})
export class GuildsComponent implements OnInit {
  private readonly guildService = inject(GuildService);
  private readonly authService = inject(AuthService);

  readonly currentUser = this.authService.currentUser;

  guilds = signal<Guild[]>([]);
  creating = signal(false);
  createError = signal<string | null>(null);

  formName = signal('');
  formRealm = signal('');
  formRegion = signal<GuildRegion | ''>('');
  formFaction = signal<GuildFaction | ''>('');
  formGameVersion = signal<GuildGameVersion | ''>('');

  async ngOnInit(): Promise<void> {
    if (this.authService.currentUser() === null) {
      return;
    }

    try {
      const list = await firstValueFrom(this.guildService.listGuilds());
      this.guilds.set(list);
    } catch {
      // leave guilds empty; non-critical on load
    }
  }

  get isSubmitDisabled(): boolean {
    return (
      this.creating() ||
      this.formName().trim() === '' ||
      this.formRealm().trim() === '' ||
      this.formRegion() === '' ||
      this.formFaction() === '' ||
      this.formGameVersion() === ''
    );
  }

  async onCreateGuild(): Promise<void> {
    if (this.isSubmitDisabled) {
      return;
    }

    const payload: CreateGuildPayload = {
      name: this.formName().trim(),
      realm: this.formRealm().trim(),
      region: this.formRegion() as GuildRegion,
      faction: this.formFaction() as GuildFaction,
      game_version: this.formGameVersion() as GuildGameVersion,
    };

    this.creating.set(true);
    this.createError.set(null);

    try {
      const newGuild = await firstValueFrom(this.guildService.createGuild(payload));
      this.guilds.update((list) => [...list, newGuild]);
      this.formName.set('');
      this.formRealm.set('');
      this.formRegion.set('');
      this.formFaction.set('');
      this.formGameVersion.set('');
    } catch {
      this.createError.set('Failed to create guild. Please try again.');
    } finally {
      this.creating.set(false);
    }
  }
}
