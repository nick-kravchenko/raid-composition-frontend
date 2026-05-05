import { DatePipe, DecimalPipe, TitleCasePipe, UpperCasePipe, isPlatformBrowser } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, PLATFORM_ID, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { AuthService } from '../auth/auth.service';
import { CharacterService } from '../character.service';
import { CharacterDetail, WclGearItem } from '../guild.models';

const GEAR_SLOT_NAMES: Record<string, number> = {
  Helm: 1,
  Neck: 2,
  Shoulder: 3,
  Cloak: 15,
  Chest: 5,
  Shirt: 4,
  Tabard: 19,
  Bracer: 9,
  Hands: 10,
  Belt: 6,
  Legs: 7,
  Boots: 8,
  'Ring 1': 11,
  'Ring 2': 12,
  'Trinket 1': 13,
  'Trinket 2': 14,
  'Main Hand': 16,
  'Off Hand': 17,
  Ranged: 18,
};

@Component({
  selector: 'rc-character-detail',
  standalone: true,
  imports: [TitleCasePipe, UpperCasePipe, DecimalPipe, DatePipe],
  templateUrl: './character-detail.component.html',
  styleUrl: './character-detail.component.scss',
})
export class CharacterDetailComponent implements OnInit {
  private readonly characterService = inject(CharacterService);
  private readonly authService = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly platformId = inject(PLATFORM_ID);

  readonly leftSlots = ['Helm', 'Neck', 'Shoulder', 'Cloak', 'Chest', 'Shirt', 'Tabard', 'Bracer'];
  readonly rightSlots = [
    'Hands',
    'Belt',
    'Legs',
    'Boots',
    'Ring 1',
    'Ring 2',
    'Trinket 1',
    'Trinket 2',
  ];
  readonly weaponSlots = ['Main Hand', 'Off Hand', 'Ranged'];

  character = signal<CharacterDetail | null>(null);
  loading = signal(false);
  loadError = signal<string | null>(null);
  notFound = signal(false);
  unauthenticated = signal(false);
  refreshingBNet = signal(false);
  refreshingWcl = signal(false);
  refreshError = signal<string | null>(null);

  async ngOnInit(): Promise<void> {
    if (this.authService.currentUser() === null) {
      this.unauthenticated.set(true);
      return;
    }

    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.loadError.set('Character ID is missing.');
      return;
    }

    this.loading.set(true);
    this.loadError.set(null);
    this.notFound.set(false);

    try {
      await this.loadCharacter(id);
      this.refreshWowheadLinks();
    } catch (error) {
      if (error instanceof HttpErrorResponse && error.status === 404) {
        this.notFound.set(true);
      } else {
        this.loadError.set('Failed to load character. Please try again.');
      }
    } finally {
      this.loading.set(false);
    }
  }

  getItemBySlotName(slotName: string): WclGearItem | undefined {
    const slot = GEAR_SLOT_NAMES[slotName];
    return this.character()?.warcraftlogs?.gear[slot];
  }

  getWowheadHref(item: WclGearItem): string {
    let url = `https://www.wowhead.com/tbc/`;
    if (item.id) {
      url += `item=${item.id}&`;
    }
    if (item.permanentEnchant) {
      url += `ench=${item.permanentEnchant}&`;
    }
    if (item.gems) {
      url += `gems=${item.gems.map((i) => i.id).join(':')}&`;
    }
    return url;
  }

  parseColorClass(pct: number | null): string {
    if (pct === null) return 'parse-gray';
    if (pct === 100) return 'parse-gold';
    if (pct >= 99) return 'parse-pink';
    if (pct >= 95) return 'parse-orange';
    if (pct >= 75) return 'parse-purple';
    if (pct >= 50) return 'parse-blue';
    if (pct >= 25) return 'parse-green';
    return 'parse-gray';
  }

  onBack(): void {
    if (isPlatformBrowser(this.platformId)) {
      history.back();
    }
  }

  async onRefreshBNet(): Promise<void> {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) return;

    this.refreshingBNet.set(true);
    this.refreshError.set(null);
    try {
      await firstValueFrom(this.characterService.refreshBattleNet(id));
      await this.loadCharacter(id);
    } catch {
      this.refreshError.set('Failed to refresh Battle.net data.');
    } finally {
      this.refreshingBNet.set(false);
    }
  }

  async onRefreshWcl(): Promise<void> {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) return;

    this.refreshingWcl.set(true);
    this.refreshError.set(null);
    try {
      await firstValueFrom(this.characterService.refreshWarcraftLogs(id));
      await this.loadCharacter(id);
    } catch {
      this.refreshError.set('Failed to refresh WarcraftLogs data.');
    } finally {
      this.refreshingWcl.set(false);
    }
  }

  private async loadCharacter(id: string): Promise<void> {
    const character = await firstValueFrom(this.characterService.getCharacter(id));
    this.character.set(character);
    this.refreshWowheadLinks();
  }

  private refreshWowheadLinks(): void {
    if (isPlatformBrowser(this.platformId)) {
      setTimeout(() => {
        (window as unknown as { $WowheadPower?: { refreshLinks: () => void } }).$WowheadPower?.refreshLinks();
      }, 0);
    }
  }
}
