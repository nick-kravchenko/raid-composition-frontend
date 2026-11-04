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
        <sup class="tile-player" data-html2canvas-ignore="true">{{ label }}</sup>
      }
    }
  `,
  styles: `
    :host {
      display: flex;
      position: relative;
      align-items: center;
      min-width: 0;
      height: 38px;
      padding: 4px 12px 4px 4px;
      background: #45494f;
      border: 1px solid #383838;
      border-radius: 2px;
      cursor: default;
      font-weight: bold;
      user-select: none;
      white-space: nowrap;
    }
    :host(:hover) {
      z-index: 2;
    }
    :host(:hover) .tile-player {
      opacity: 1;
      visibility: visible;
    }
    .tile-icon {
      flex: none;
      width: 28px;
      height: 28px;
      margin-right: 4px;
      border: 1px solid #000;
    }
    .tile-rank {
      flex: none;
      width: 8px;
      height: 8px;
      margin-right: 4px;
      border-radius: 50%;
      background: green;
    }
    .tile-rank--alt {
      background: yellow;
    }
    .tile-name {
      overflow: hidden;
      text-overflow: ellipsis;
      text-shadow:
        -1px -1px 0 #0005,
        1px -1px 0 #0005,
        -1px 1px 0 #0005,
        1px 1px 0 #0005;
    }
    .tile-player {
      position: absolute;
      top: 0;
      left: 50%;
      padding: 2px 4px;
      border-radius: 2px;
      background: rgba(0, 0, 0, 0.75);
      color: #fff;
      font-size: 0.85em;
      line-height: 1;
      opacity: 0;
      transform: translate(-50%, -100%);
      transition: opacity 0.2s;
      visibility: hidden;
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
