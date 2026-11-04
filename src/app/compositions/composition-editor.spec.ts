import { Character, CompositionRaid } from '../guild.models';
import {
  Roster,
  autoPlace,
  clearRaid,
  discordPings,
  emptyRaid,
  isAvailable,
  moveSlot,
  moveToBench,
  mrtExport,
  placeInSlot,
  playerKey,
  resizeRaids,
  sanitizeRaids,
} from './composition-editor';

function character(id: string, overrides: Partial<Character> = {}): Character {
  return {
    id,
    guild_id: 'g',
    game_version: 'classicann',
    user_id: null,
    player_name: null,
    owner: null,
    can_manage: true,
    name: id,
    region: 'eu',
    server: 's',
    class: 'warrior',
    race: 'Orc',
    spec: 'Fury',
    role: 'melee',
    rank: 'main',
    created_at: '',
    updated_at: '',
    deleted_at: null,
    ...overrides,
  };
}

const main = character('main', { user_id: 'u1', owner: { discord_id: 'd1', display_name: 'One' } });
const alt = character('alt', { user_id: 'u1', owner: { discord_id: 'd1', display_name: 'One' } });
const labelledA = character('labelledA', { player_name: 'Lazykit' });
const labelledB = character('labelledB', { player_name: ' lazykit ' });
const solo = character('solo');
const solo2 = character('solo2');
const roster: Roster = new Map(
  [main, alt, labelledA, labelledB, solo, solo2].map((c) => [c.id, c]),
);

function raidWith(size: number, ...ids: (string | null)[]): CompositionRaid {
  const raid = emptyRaid(size, 'R');
  ids.forEach((id, i) => (raid.slots[i] = id));
  return raid;
}

describe('playerKey', () => {
  it('groups by bound user, else normalized label, else not at all', () => {
    expect(playerKey(main)).toBe(playerKey(alt));
    expect(playerKey(labelledA)).toBe(playerKey(labelledB));
    expect(playerKey(solo)).toBeNull();
  });
});

describe('autoPlace', () => {
  it('fills the first free slot', () => {
    const [raid] = autoPlace([raidWith(10, 'solo')], 'solo2', roster);
    expect(raid.slots.slice(0, 2)).toEqual(['solo', 'solo2']);
  });

  it('skips raids that already have the player', () => {
    const raids = autoPlace([raidWith(10, 'main'), raidWith(10)], 'alt', roster);
    expect(raids[0].slots).not.toContain('alt');
    expect(raids[1].slots[0]).toBe('alt');
  });

  it('never places a character twice', () => {
    const raids = [raidWith(10, 'solo')];
    expect(autoPlace(raids, 'solo', roster)).toBe(raids);
  });

  it('leaves raids unchanged when nothing fits', () => {
    const raids = [raidWith(10, 'main')];
    expect(autoPlace(raids, 'alt', roster)).toBe(raids);
  });
});

describe('placeInSlot', () => {
  it('reports the conflicting character instead of placing a second one for the player', () => {
    const raids = [raidWith(10, 'labelledA')];
    const result = placeInSlot(raids, 0, 3, 'labelledB', roster);
    expect(result.conflictId).toBe('labelledA');
    expect(result.raids).toBe(raids);
  });

  it('allows replacing the same player, and takes the character off the bench', () => {
    const raid = raidWith(10, 'main');
    raid.bench = ['alt'];
    const result = placeInSlot([raid], 0, 0, 'alt', roster);
    expect(result.conflictId).toBeUndefined();
    expect(result.raids[0].slots[0]).toBe('alt');
    expect(result.raids[0].bench).toEqual([]);
  });
});

describe('moveSlot', () => {
  it('moves into an empty slot', () => {
    const { raids } = moveSlot([raidWith(10, 'solo')], 0, 0, 0, 4, roster);
    expect(raids[0].slots[0]).toBeNull();
    expect(raids[0].slots[4]).toBe('solo');
  });

  it('swaps across raids', () => {
    const { raids } = moveSlot([raidWith(10, 'solo'), raidWith(10, 'solo2')], 0, 0, 1, 0, roster);
    expect(raids[0].slots[0]).toBe('solo2');
    expect(raids[1].slots[0]).toBe('solo');
  });

  it('refuses a move that would put a player in a raid twice', () => {
    const before = [raidWith(10, 'main'), raidWith(10, 'alt', 'solo')];
    const result = moveSlot(before, 0, 0, 1, 2, roster);
    expect(result.conflictId).toBe('alt');
    expect(result.raids).toBe(before);
  });

  it('refuses a swap when the character coming back conflicts', () => {
    const before = [raidWith(10, 'solo', 'main'), raidWith(10, 'alt')];
    const result = moveSlot(before, 0, 0, 1, 0, roster);
    expect(result.conflictId).toBe('main');
  });

  it('allows swapping a player with their own other character across raids', () => {
    const result = moveSlot([raidWith(10, 'main'), raidWith(10, 'alt')], 0, 0, 1, 0, roster);
    expect(result.conflictId).toBeUndefined();
    expect(result.raids[0].slots[0]).toBe('alt');
    expect(result.raids[1].slots[0]).toBe('main');
  });
});

describe('moveToBench and clearRaid', () => {
  it('moves a raid member to a bench exactly once', () => {
    const [first, second] = moveToBench([raidWith(10, 'solo'), raidWith(10)], 1, 'solo');
    expect(first.slots[0]).toBeNull();
    expect(second.bench).toEqual(['solo']);
  });

  it('clearing empties slots but keeps the bench and title', () => {
    const raid = raidWith(10, 'solo');
    raid.bench = ['solo2'];
    const [cleared] = clearRaid([raid], 0);
    expect(cleared.slots.every((id) => id === null)).toBe(true);
    expect(cleared.bench).toEqual(['solo2']);
    expect(cleared.title).toBe('R');
  });
});

describe('resizeRaids', () => {
  it.each([10, 20, 25, 40])('produces raids with %i slots', (size) => {
    const raids = resizeRaids([raidWith(25, 'solo')], size, roster);
    expect(raids[0].slots).toHaveLength(size);
  });

  it('pours overflow into additional raids', () => {
    const raids = resizeRaids([raidWith(25, 'a', 'b', 'c')], 10, roster);
    expect(raids).toHaveLength(1);

    const big = raidWith(25, ...Array.from({ length: 12 }, (_, i) => `x${i}`));
    const split = resizeRaids([big], 10, roster);
    expect(split).toHaveLength(2);
    expect(split[1].slots.slice(0, 2)).toEqual(['x10', 'x11']);
  });

  it('merges smaller raids and benches a player who would land twice', () => {
    const raids = resizeRaids([raidWith(10, 'main'), raidWith(10, 'alt')], 25, roster);
    expect(raids).toHaveLength(1);
    expect(raids[0].slots).toContain('main');
    expect(raids[0].slots).not.toContain('alt');
    expect(raids[0].bench).toContain('alt');
  });

  it('keeps benches and titles', () => {
    const first = { ...raidWith(10), title: 'Team A', bench: ['solo'] };
    const second = { ...raidWith(10), title: 'Team B', bench: ['solo2'] };
    const raids = resizeRaids([first, second], 25, roster);
    expect(raids).toHaveLength(1);
    expect(raids[0].title).toBe('Team A');
    expect(raids[0].bench).toEqual(['solo', 'solo2']);
  });

  it('always leaves one raid to work with', () => {
    expect(resizeRaids([], 25, roster)).toHaveLength(1);
  });
});

describe('sanitizeRaids', () => {
  it('drops characters no longer on the roster', () => {
    const raid = raidWith(10, 'gone', 'solo');
    raid.bench = ['gone-too'];
    const [clean] = sanitizeRaids([raid], 10, roster);
    expect(clean.slots[0]).toBeNull();
    expect(clean.slots[1]).toBe('solo');
    expect(clean.bench).toEqual([]);
  });

  it('benches a player who now appears twice after a bind', () => {
    const [clean] = sanitizeRaids([raidWith(10, 'main', 'alt')], 10, roster);
    expect(clean.slots[0]).toBe('main');
    expect(clean.slots[1]).toBeNull();
    expect(clean.bench).toEqual(['alt']);
  });

  it('removes a character duplicated across raids', () => {
    const raids = sanitizeRaids([raidWith(10, 'solo'), raidWith(10, 'solo')], 10, roster);
    expect(raids[1].slots[0]).toBeNull();
  });
});

describe('isAvailable', () => {
  it('hides placed and benched characters', () => {
    const raid = raidWith(10, 'solo');
    raid.bench = ['solo2'];
    expect(isAvailable([raid], solo, roster)).toBe(false);
    expect(isAvailable([raid], solo2, roster)).toBe(false);
  });

  it('hides characters of a player present in every raid', () => {
    expect(isAvailable([raidWith(10, 'main')], alt, roster)).toBe(false);
    expect(isAvailable([raidWith(10, 'main'), raidWith(10)], alt, roster)).toBe(true);
  });
});

describe('raid tools', () => {
  it('exports names per slot for MRT', () => {
    expect(mrtExport(raidWith(2, 'solo', null), roster)).toBe('solo\n');
  });

  it('pings bound players by group and adds a whisper for the current user', () => {
    const raid = raidWith(10, 'main', 'solo', null, null, null, 'labelledA');
    expect(discordPings(raid, roster, 'u1')).toBe('<@d1>\n```/w main 123```');
  });

  it('omits the whisper when the current user is not in the raid', () => {
    expect(discordPings(raidWith(10, 'main'), roster, 'other')).toBe('<@d1>');
  });
});
