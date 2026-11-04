import { CharacterRole, GameVersion } from './guild.models';

export const GAME_VERSIONS: { value: GameVersion; label: string }[] = [
  { value: 'classicann', label: 'TBC Anniversary' },
  { value: 'forever', label: 'WoW Forever' },
];

export const RAID_SIZES = [10, 20, 25, 40] as const;
export const REGIONS = ['eu', 'us', 'kr', 'tw', 'cn'] as const;
export const CHARACTER_ROLES: { value: CharacterRole; label: string }[] = [
  { value: 'tank', label: 'Tank' },
  { value: 'heal', label: 'Healer' },
  { value: 'melee', label: 'Melee' },
  { value: 'ranged', label: 'Ranged' },
];

export interface SpecOption {
  spec: string;
  role: CharacterRole;
  icon: string;
}

export interface ClassOption {
  id: string;
  label: string;
  icon: string;
  specs: SpecOption[];
}

export const WOW_CLASSES: ClassOption[] = [
  {
    id: 'warrior',
    label: 'Warrior',
    icon: 'class_warrior.jpg',
    specs: [
      { spec: 'Fury', role: 'melee', icon: 'ability_warrior_innerrage.jpg' },
      { spec: 'Arms', role: 'melee', icon: 'ability_warrior_savageblow.jpg' },
      { spec: 'Protection', role: 'tank', icon: 'ability_warrior_defensivestance.jpg' },
    ],
  },
  {
    id: 'paladin',
    label: 'Paladin',
    icon: 'class_paladin.jpg',
    specs: [
      { spec: 'Retribution', role: 'melee', icon: 'spell_holy_auraoflight.jpg' },
      { spec: 'Protection', role: 'tank', icon: 'spell_holy_devotionaura.jpg' },
      { spec: 'Holy', role: 'heal', icon: 'spell_holy_holybolt.jpg' },
    ],
  },
  {
    id: 'hunter',
    label: 'Hunter',
    icon: 'class_hunter.jpg',
    specs: [
      { spec: 'BeastMastery', role: 'ranged', icon: 'ability_hunter_bestialdiscipline.jpg' },
      { spec: 'Survival', role: 'ranged', icon: 'ability_hunter_camouflage.jpg' },
      { spec: 'Marksmanship', role: 'ranged', icon: 'ability_hunter_focusedaim.jpg' },
    ],
  },
  {
    id: 'druid',
    label: 'Druid',
    icon: 'class_druid.jpg',
    specs: [
      { spec: 'Feral', role: 'melee', icon: 'ability_druid_catform.jpg' },
      { spec: 'Feral', role: 'tank', icon: 'ability_racial_bearform.jpg' },
      { spec: 'Balance', role: 'ranged', icon: 'spell_nature_starfall.jpg' },
      { spec: 'Dreamstate', role: 'heal', icon: 'ability_druid_dreamstate.jpg' },
      { spec: 'Restoration', role: 'heal', icon: 'spell_nature_healingtouch.jpg' },
    ],
  },
  {
    id: 'rogue',
    label: 'Rogue',
    icon: 'class_rogue.jpg',
    specs: [
      { spec: 'Assassination', role: 'melee', icon: 'ability_rogue_eviscerate.jpg' },
      { spec: 'Combat', role: 'melee', icon: 'ability_backstab.jpg' },
      { spec: 'Subtlety', role: 'melee', icon: 'ability_stealth.jpg' },
    ],
  },
  {
    id: 'warlock',
    label: 'Warlock',
    icon: 'class_warlock.jpg',
    specs: [
      { spec: 'Destruction', role: 'ranged', icon: 'spell_shadow_rainoffire.jpg' },
      { spec: 'Affliction', role: 'ranged', icon: 'classicon_warlock.jpg' },
      { spec: 'Demonology', role: 'ranged', icon: 'spell_shadow_metamorphosis.jpg' },
    ],
  },
  {
    id: 'mage',
    label: 'Mage',
    icon: 'class_mage.jpg',
    specs: [
      { spec: 'Arcane', role: 'ranged', icon: 'spell_holy_magicalsentry.jpg' },
      { spec: 'Fire', role: 'ranged', icon: 'spell_fire_flamebolt.jpg' },
      { spec: 'Frost', role: 'ranged', icon: 'spell_frost_arcticwinds.jpg' },
    ],
  },
  {
    id: 'priest',
    label: 'Priest',
    icon: 'class_priest.jpg',
    specs: [
      { spec: 'Shadow', role: 'ranged', icon: 'spell_shadow_shadowwordpain.jpg' },
      { spec: 'Holy', role: 'heal', icon: 'spell_holy_guardianspirit.jpg' },
      { spec: 'Discipline', role: 'heal', icon: 'spell_holy_wordfortitude.jpg' },
    ],
  },
  {
    id: 'shaman',
    label: 'Shaman',
    icon: 'class_shaman.png',
    specs: [
      { spec: 'Enhancement', role: 'melee', icon: 'spell_nature_lightningshield.jpg' },
      { spec: 'Elemental', role: 'ranged', icon: 'spell_nature_lightning.jpg' },
      { spec: 'Restoration', role: 'heal', icon: 'spell_nature_magicimmunity.jpg' },
    ],
  },
];

export function findClass(classId: string): ClassOption | undefined {
  return WOW_CLASSES.find((option) => option.id === classId.toLowerCase());
}

export function specIcon(classId: string, spec: string, role: CharacterRole): string {
  const option = findClass(classId);
  const match =
    option?.specs.find((s) => s.spec === spec && s.role === role) ??
    option?.specs.find((s) => s.spec === spec);
  return match?.icon ?? option?.icon ?? 'class_warrior.jpg';
}

export interface RoleFilterOption {
  key: string;
  classId: string;
  role: CharacterRole;
  icon: string;
}

/** One toggle per class and role, using the first spec of that role as its icon. */
export const ROLE_FILTERS: RoleFilterOption[] = WOW_CLASSES.flatMap((option) => {
  const seen = new Set<CharacterRole>();
  return option.specs
    .filter((spec) => (seen.has(spec.role) ? false : (seen.add(spec.role), true)))
    .map((spec) => ({
      key: `${option.id}_${spec.role}`,
      classId: option.id,
      role: spec.role,
      icon: spec.icon,
    }));
});
