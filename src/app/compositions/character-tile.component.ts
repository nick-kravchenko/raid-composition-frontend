import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { specIcon } from '../game-data';
import { Character } from '../guild.models';
import { playerLabel } from './composition-editor';

@Component({
  selector: 'rc-character-tile',
  template: `
    @if (character(); as c) {
      <img class="tile-icon" [src]="'assets/icons/' + icon()" alt="" draggable="false" />
      <span class="tile-rank" [class.tile-rank--alt]="c.rank === 'alt'"></span>
      <span class="tile-name" [style.color]="'var(--class-' + c.class + ')'">{{ c.name }}</span>
      @if (player(); as label) {
        <span class="tile-player">{{ label }}</span>
      }
    }
  `,
  styles: `
    :host {
      display: flex;
      align-items: center;
      gap: 6px;
      min-width: 0;
      height: 34px;
      padding: 2px 8px 2px 2px;
      border: 1px solid var(--border-default);
      border-radius: 3px;
      background: var(--bg-elevated);
      font-size: var(--text-sm);
      font-weight: var(--fw-bold);
      user-select: none;
      white-space: nowrap;
      overflow: hidden;
    }
    .tile-icon {
      width: 28px;
      height: 28px;
      flex: none;
    }
    .tile-rank {
      width: 7px;
      height: 7px;
      flex: none;
      border-radius: 50%;
      background: var(--state-success);
    }
    .tile-rank--alt {
      background: var(--state-warning);
    }
    .tile-name {
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .tile-player {
      margin-left: auto;
      padding-left: 4px;
      overflow: hidden;
      color: var(--text-muted);
      font-size: 11px;
      font-weight: var(--fw-normal, 400);
      text-overflow: ellipsis;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CharacterTileComponent {
  readonly character = input<Character | null | undefined>(null);
  readonly icon = computed(() => {
    const c = this.character();
    return c ? specIcon(c.class, c.spec, c.role) : '';
  });
  readonly player = computed(() => {
    const c = this.character();
    return c ? playerLabel(c) : null;
  });
}
