import { Routes } from '@angular/router';
import { DiscordCallbackComponent } from './auth/discord-callback.component';
import { LayoutComponent } from './layout/layout.component';
import { HomeComponent } from './pages/home/home.component';
import { StyleDemoComponent } from './pages/style-demo/style-demo.component';

export const routes: Routes = [
  { path: 'auth/discord/callback', component: DiscordCallbackComponent },
  {
    path: '',
    component: LayoutComponent,
    children: [
      { path: '', component: HomeComponent, pathMatch: 'full' },
      { path: 'style-demo', component: StyleDemoComponent },
      { path: 'guilds', loadComponent: () => import('./guilds/guilds.component').then(m => m.GuildsComponent) },
      { path: 'guilds/:id', loadComponent: () => import('./guilds/guild-detail.component').then(m => m.GuildDetailComponent) },
      { path: 'guild-invites/:code', loadComponent: () => import('./guild-invites/accept-invite.component').then(m => m.AcceptInviteComponent) },
    ],
  },
];
