export type ClassId = "mage" | "archer";

export type BaseSlot = "weapon" | "helm" | "amulet" | "armor" | "gloves" | "boots" | "ring";
export type Slot = Exclude<BaseSlot, "ring"> | "ring1" | "ring2";
export type Rarity = 0 | 1 | 2 | 3 | 4;

export type StatKey =
  | "dmg" | "dmgPct" | "hp" | "armor" | "crit" | "critDmg"
  | "as" | "goldPct" | "xpPct" | "luck" | "regen";

export interface Item {
  uid: number;
  base: BaseSlot;
  name: string;
  rarity: Rarity;
  ilvl: number;
  stats: Partial<Record<StatKey, number>>;
  sell: number;
}

export interface Enemy {
  key: string;
  name: string;
  hp: number;
  maxHp: number;
  dmg: number;
  as: number;
  boss: boolean;
  gold: number;
  xp: number;
}

export interface Fx {
  id: number;
  text: string;
  kind: "dmg" | "crit" | "hurt" | "heal" | "gold" | "xp";
  x: number; // 0..100
  y: number; // 0..100
  life: number;
}

export interface Buff {
  id: string;
  label: string;
  t: number;
  dmgMult?: number;
  luckAdd?: number;
}

export interface HeroS {
  classId: ClassId;
  name: string;
  level: number;
  xp: number;
  skillPoints: number;
  gold: number;
  gems: number;
  potions: number;
  hp: number;
}

export interface BattleS {
  zone: number;
  wave: number;
  enemy: Enemy | null;
  heroT: number;
  enemyT: number;
  dotDps: number;
  dotT: number;
  cds: Record<string, number>;
  fx: Fx[];
  log: string[];
  paused: boolean;
  respawnT: number; // автовоскрешение: сек до возрождения (0 = не мёртв)
}

export interface TotalsS {
  kills: number;
  bosses: number;
  crits: number;
  goldEarned: number;
  dmgDealt: number;
  items: number;
  legendaries: number;
  maxWave: number;
  deaths: number;
  casts: number;
  potions: number;
  events: number;
  questsDone: number;
}

export interface DailyS {
  date: string;
  kills: number;
  bosses: number;
  gold: number;
  claimed: string[];
}

export interface WeeklyS {
  week: string;
  kills: number;
  bosses: number;
  gold: number;
  casts: number;
  claimed: string[];
}

export interface RunS {
  active: boolean;
  wave: number; // 1..20
  enemy: Enemy | null;
  heroT: number;
  enemyT: number;
  hp: number;
  maxHp: number;
  cds: Record<string, number>;
  relics: Record<string, number>; // id -> rank
  bosses: number;
  goldEarned: number;
}

export type Modal =
  | { t: "class" }
  | { t: "offline"; gold: number; xp: number; sec: number }
  | { t: "event"; id: string }
  | { t: "levelup"; level: number }
  | { t: "runpick"; options: string[] }
  | { t: "runover"; wave: number; shards: number; win: boolean };

export interface Toast { id: number; text: string; kind: "info" | "gold" | "loot" | "warn" | "gem"; }

export interface GameState {
  v: number;
  hero: HeroS;
  equip: Record<Slot, Item | null>;
  inv: Item[];
  skills: Record<string, number>;
  passives: Record<string, number>;
  battle: BattleS;
  zones: number;
  bossDone: boolean[];
  totals: TotalsS;
  achClaimed: string[];
  questsClaimed: string[];
  buffs: Buff[];
  toasts: Toast[];
  modal: Modal | null;
  daily: DailyS;
  weekly: WeeklyS;
  vip: number; // 0..5
  slotLevel: Record<Slot, number>; // заточка слотов (привязана к слоту, не к предмету)
  run: RunS; // рогалик-режим «Экспедиция»
  shards: number; // осколки бездны — мета-валюта
  meta: Record<string, number>; // мета-апгрейды (Алтарь)
  bestWave: number;
  shopBuys: Record<string, number>;
  lastSeen: number;
  uidSeq: number;
  fxSeq: number;
  toastSeq: number;
}

export interface Stats {
  dmg: number;
  dps: number;
  as: number;
  crit: number;
  critDmg: number;
  maxHp: number;
  armor: number;
  mit: number;
  goldPct: number;
  xpPct: number;
  luck: number;
  regen: number;
  offline: number;
}

export type Action =
  | { type: "TICK"; dt: number }
  | { type: "CHOOSE_CLASS"; classId: ClassId; name: string }
  | { type: "SET_ZONE"; zone: number }
  | { type: "CAST"; id: string }
  | { type: "USE_POTION" }
  | { type: "EQUIP"; uid: number }
  | { type: "UNEQUIP"; slot: Slot }
  | { type: "SELL"; uid: number }
  | { type: "SELL_JUNK" }
  | { type: "BUY_SHOP"; id: string }
  | { type: "LEVEL_SKILL"; id: string }
  | { type: "LEVEL_PASSIVE"; id: string }
  | { type: "CLAIM_QUEST"; id: string }
  | { type: "CLAIM_DAILY"; id: string }
  | { type: "CLAIM_WEEKLY"; id: string }
  | { type: "CLAIM_ACH"; id: string }
  | { type: "CHOOSE_EVENT"; idx: number }
  | { type: "UPGRADE_SLOT"; slot: Slot }
  | { type: "BUY_VIP" }
  | { type: "START_RUN" }
  | { type: "ABANDON_RUN" }
  | { type: "RUN_CAST"; id: string }
  | { type: "RUN_USE_POTION" }
  | { type: "RUN_PICK"; id: string }
  | { type: "RUN_CLOSE" }
  | { type: "BUY_META"; id: string }
  | { type: "CLOSE_MODAL" }
  | { type: "DISMISS_TOAST"; id: number }
  | { type: "RESET" };
