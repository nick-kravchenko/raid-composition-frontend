import { Character, CompositionRaid } from '../guild.models';

export type Roster = ReadonlyMap<string, Character>;

export interface PlacementResult {
  raids: CompositionRaid[];
  /** The character already filling this player's place, when the move was refused. */
  conflictId?: string;
}

/** Identifies who plays a character: the bound user, else the player label. */
export function playerKey(character: Character | undefined): string | null {
  if (!character) return null;
  if (character.user_id) return `user:${character.user_id}`;
  const label = character.player_name?.trim().toLowerCase();
  return label ? `name:${label}` : null;
}

export function playerLabel(character: Character): string | null {
  return character.owner?.display_name ?? character.player_name ?? null;
}

export function emptyRaid(size: number, title: string): CompositionRaid {
  return { title, slots: new Array(size).fill(null), bench: [] };
}

export function characterPlaced(raids: CompositionRaid[], id: string): boolean {
  return raids.some((raid) => raid.slots.includes(id) || raid.bench.includes(id));
}

function samePlayerInRaid(
  raid: CompositionRaid,
  character: Character | undefined,
  roster: Roster,
  ignoreId?: string,
): string | undefined {
  const key = playerKey(character);
  if (!key) return undefined;
  return raid.slots.find(
    (id): id is string =>
      !!id && id !== character?.id && id !== ignoreId && playerKey(roster.get(id)) === key,
  );
}

function updateRaid(
  raids: CompositionRaid[],
  index: number,
  change: (raid: CompositionRaid) => CompositionRaid,
): CompositionRaid[] {
  return raids.map((raid, i) => (i === index ? change(raid) : raid));
}

function setSlot(raid: CompositionRaid, slot: number, id: string | null): CompositionRaid {
  return { ...raid, slots: raid.slots.map((current, i) => (i === slot ? id : current)) };
}

function withoutCharacter(raids: CompositionRaid[], id: string): CompositionRaid[] {
  return raids.map((raid) => ({
    ...raid,
    slots: raid.slots.map((current) => (current === id ? null : current)),
    bench: raid.bench.filter((current) => current !== id),
  }));
}

/** Fills the first free slot in a raid that doesn't already have this player. */
export function autoPlace(raids: CompositionRaid[], id: string, roster: Roster): CompositionRaid[] {
  if (characterPlaced(raids, id)) return raids;
  const character = roster.get(id);
  const raidIndex = raids.findIndex(
    (raid) => raid.slots.includes(null) && !samePlayerInRaid(raid, character, roster),
  );
  if (raidIndex === -1) return raids;
  return updateRaid(raids, raidIndex, (raid) => setSlot(raid, raid.slots.indexOf(null), id));
}

/**
 * Places a roster or bench character in a slot. Whoever already holds the slot goes back to the
 * roster, matching a drop onto a filled slot from outside the raids.
 */
export function placeInSlot(
  raids: CompositionRaid[],
  raidIndex: number,
  slot: number,
  id: string,
  roster: Roster,
): PlacementResult {
  const replaced = raids[raidIndex].slots[slot] ?? undefined;
  const conflictId = samePlayerInRaid(raids[raidIndex], roster.get(id), roster, replaced);
  if (conflictId) return { raids, conflictId };
  return {
    raids: updateRaid(withoutCharacter(raids, id), raidIndex, (raid) => setSlot(raid, slot, id)),
  };
}

/** Moves between slots, swapping with whoever holds the target. */
export function moveSlot(
  raids: CompositionRaid[],
  fromRaid: number,
  fromSlot: number,
  toRaid: number,
  toSlot: number,
  roster: Roster,
): PlacementResult {
  const moving = raids[fromRaid].slots[fromSlot];
  if (!moving || (fromRaid === toRaid && fromSlot === toSlot)) return { raids };
  const swapped = raids[toRaid].slots[toSlot];

  if (fromRaid !== toRaid) {
    const conflictId =
      samePlayerInRaid(raids[toRaid], roster.get(moving), roster, swapped ?? undefined) ??
      (swapped
        ? samePlayerInRaid(raids[fromRaid], roster.get(swapped), roster, moving)
        : undefined);
    if (conflictId) return { raids, conflictId };
  }

  return {
    raids: raids.map((raid, i) => {
      let slots = raid.slots;
      if (i === fromRaid) slots = slots.map((id, s) => (s === fromSlot ? swapped : id));
      if (i === toRaid) slots = slots.map((id, s) => (s === toSlot ? moving : id));
      return slots === raid.slots ? raid : { ...raid, slots };
    }),
  };
}

export function moveToBench(
  raids: CompositionRaid[],
  raidIndex: number,
  id: string,
): CompositionRaid[] {
  return updateRaid(withoutCharacter(raids, id), raidIndex, (raid) => ({
    ...raid,
    bench: [...raid.bench, id],
  }));
}

export function removeCharacter(raids: CompositionRaid[], id: string): CompositionRaid[] {
  return withoutCharacter(raids, id);
}

export function clearRaid(raids: CompositionRaid[], raidIndex: number): CompositionRaid[] {
  return updateRaid(raids, raidIndex, (raid) => ({
    ...raid,
    slots: raid.slots.map(() => null),
  }));
}

/**
 * Pours everyone into raids of the new size in their current order. A player who would land twice
 * in one raid goes to its bench, because that combination can't be saved.
 */
export function resizeRaids(
  raids: CompositionRaid[],
  size: number,
  roster: Roster,
): CompositionRaid[] {
  const placed = raids.flatMap((raid) => raid.slots).filter((id): id is string => !!id);
  const raidCount = Math.max(Math.ceil(placed.length / size), 1);
  const resized = Array.from({ length: raidCount }, (_, i) =>
    emptyRaid(size, raids[i]?.title ?? `Raid #${i + 1}`),
  );

  let raidIndex = 0;
  let slot = 0;
  for (const id of placed) {
    if (slot === size) {
      raidIndex += 1;
      slot = 0;
    }
    if (samePlayerInRaid(resized[raidIndex], roster.get(id), roster)) {
      resized[raidIndex].bench.push(id);
    } else {
      resized[raidIndex].slots[slot] = id;
      slot += 1;
    }
  }

  // Benches keep their raid where it still exists; the rest join the last raid.
  raids.forEach((raid, i) => {
    resized[Math.min(i, resized.length - 1)].bench.push(...raid.bench);
  });
  return resized;
}

/**
 * Reconciles a saved composition with today's roster: removed characters disappear, and a player
 * who now appears twice in a raid (after a character was bound) keeps one slot, with the rest benched.
 */
export function sanitizeRaids(
  raids: CompositionRaid[],
  size: number,
  roster: Roster,
): CompositionRaid[] {
  const seen = new Set<string>();
  const keep = (id: string | null): id is string => {
    if (!id || !roster.has(id) || seen.has(id)) return false;
    seen.add(id);
    return true;
  };

  return raids.map((raid) => {
    const slots: (string | null)[] = new Array(size).fill(null);
    const bench: string[] = [];
    const players = new Set<string>();
    raid.slots.slice(0, size).forEach((id, slot) => {
      if (!keep(id)) return;
      const key = playerKey(roster.get(id));
      if (key && players.has(key)) {
        bench.push(id);
        return;
      }
      if (key) players.add(key);
      slots[slot] = id;
    });
    bench.push(...raid.bench.filter(keep));
    return { title: raid.title, slots, bench };
  });
}

/** Hidden from the sidebar once placed, or once their player has a character in every raid. */
export function isAvailable(
  raids: CompositionRaid[],
  character: Character,
  roster: Roster,
): boolean {
  if (characterPlaced(raids, character.id)) return false;
  return !(raids.length > 0 && raids.every((raid) => samePlayerInRaid(raid, character, roster)));
}

export function mrtExport(raid: CompositionRaid, roster: Roster): string {
  return raid.slots.map((id) => (id ? (roster.get(id)?.name ?? '') : '')).join('\n');
}

/** Mentions per group, then a whisper line for the requesting player's character when in the raid. */
export function discordPings(
  raid: CompositionRaid,
  roster: Roster,
  currentUserId?: string,
): string {
  const rows: string[] = [];
  for (let start = 0; start < raid.slots.length; start += 5) {
    const mentions = raid.slots
      .slice(start, start + 5)
      .map((id) => (id ? roster.get(id)?.owner?.discord_id : undefined))
      .filter((discordId): discordId is string => !!discordId)
      .map((discordId) => `<@${discordId}>`);
    if (mentions.length > 0) rows.push(mentions.join(' '));
  }
  const own = raid.slots
    .map((id) => (id ? roster.get(id) : undefined))
    .find((character) => !!currentUserId && character?.user_id === currentUserId);
  if (own) rows.push(`\`\`\`/w ${own.name} 123\`\`\``);
  return rows.join('\n');
}
