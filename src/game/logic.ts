import {
  CLASSES, SKILLS, PASSIVES, ZONES, MOBS, KILL_PHRASES, QUESTS, DAILIES, WEEKLIES, ACHS,
  genItem, INV_CAP, skillCost, shopCost, SHOP, VIP_LEVELS, SLOT_UP_BONUS, SLOT_UP_MAX, slotUpCost,
  RELICS, META, RUN_WAVES, RUN_BOSS_EVERY, shardReward, DUEL_NAMES, DUEL_TOKENS_START, DUEL_TOKENS_MAX, ABYSS_SET, ABYSS_SET_BONUS, GODSTONE,
} from "./data";
import type { Action, DuelFoe, DuelS, Enemy, GameState, RunS, Slot, Stats } from "./types";

export const SAVE_KEY = "bezdna-idle-save-v1";
export const SLOTS: Slot[] = ["weapon", "helm", "amulet", "armor", "gloves", "boots", "ring1", "ring2"];

export const todayStr = () => new Date().toISOString().slice(0, 10);
export const xpNeed = (level: number) => Math.floor(50 * Math.pow(level, 1.55));

/** ISO-неделя вида "2026-W7" для еженедельников */
export function weekKey(d = new Date()): string {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${date.getUTCFullYear()}-W${week}`;
}

/** Время до автовоскрешения: 3 сек базово, VIP ускоряет */
export const respawnTime = (vip: number) =>
  vip > 0 && VIP_LEVELS[vip - 1] ? VIP_LEVELS[vip - 1].respawn : 3;

export const emptyWeekly = () => ({ week: weekKey(), kills: 0, bosses: 0, gold: 0, casts: 0, claimed: [] as string[] });

export function fmt(n: number): string {
  if (n >= 1e9) return (n / 1e9).toFixed(1) + "Б";
  if (n >= 1e6) return (n / 1e6).toFixed(1) + "М";
  if (n >= 1e4) return (n / 1e3).toFixed(1) + "к";
  return String(Math.floor(n));
}
export const fmtTime = (sec: number) => {
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60);
  return h > 0 ? `${h} ч ${m} мин` : `${m} мин`;
};

export const newDuel = (): DuelS => ({
  state: "idle", mmr: 1000, tokens: DUEL_TOKENS_START, wins: 0, losses: 0,
  searchT: 0, foe: null, heroHp: 0, heroT: 0, foeT: 0, skillT: 0, foeSkillT: 0,
  cds: {}, fx: [], log: [], result: null, delta: 0, reward: 0,
});

/* =============== derived stats =============== */
export function getStats(s: GameState): Stats {
  const c = CLASSES[s.hero.classId].base;
  let flatDmg = 0, dmgPct = 0, flatHp = 0, hpPct = 0, crit = c.crit, critDmg = 150,
    asPct = 0, goldPct = 0, xpPct = 0, luck = 0, armor = 0, regen = 0, offlinePct = 0;

  for (const slot of SLOTS) {
    const it = s.equip[slot];
    if (!it) continue;
    // заточка слота: бонус живёт в слоте, а не в предмете
    const slotMult = 1 + (SLOT_UP_BONUS / 100) * (s.slotLevel[slot] || 0);
    for (const [k, v] of Object.entries(it.stats)) {
      const val = (v ?? 0) * slotMult;
      switch (k) {
        case "dmg": flatDmg += val; break;
        case "dmgPct": dmgPct += val; break;
        case "hp": flatHp += val; break;
        case "armor": armor += val; break;
        case "crit": crit += val; break;
        case "critDmg": critDmg += val; break;
        case "as": asPct += val; break;
        case "goldPct": goldPct += val; break;
        case "xpPct": xpPct += val; break;
        case "luck": luck += val; break;
        case "regen": regen += val; break;
      }
    }
  }
  const abyssPieces = SLOTS.filter(slot => s.equip[slot]?.abyss).length;
  dmgPct += abyssPieces * ABYSS_SET_BONUS;
  hpPct += abyssPieces * ABYSS_SET_BONUS;
  if (s.godstone !== null) {
    const god = s.godstone;
    dmgPct += god * 2;
    hpPct += god * 2;
    crit += god * 0.5;
    asPct += god * 0.5;
    luck += god;
    goldPct += god;
    xpPct += god;
    armor += god;
  }
  const P = (id: string) => s.passives[id] || 0;
  dmgPct += 8 * P("power"); crit += 2.5 * P("focus"); hpPct += 8 * P("vitality");
  armor += 6 * P("skin"); goldPct += 8 * P("greed"); xpPct += 7 * P("wisdom");
  luck += 5 * P("fortune"); offlinePct += 12 * P("treasury");

  // VIP-привилегии (кумулятивные)
  if (s.vip > 0) {
    const vip = VIP_LEVELS[Math.min(s.vip, VIP_LEVELS.length) - 1];
    goldPct += vip.goldPct; xpPct += vip.xpPct; luck += vip.luck;
    dmgPct += vip.dmgPct; hpPct += vip.hpPct; offlinePct += vip.offlinePct;
  }
  // мета-апгрейды Алтаря (постоянные)
  for (const m of META) {
    const r = s.meta?.[m.id] || 0;
    if (!r) continue;
    if (m.dmgPct) dmgPct += m.dmgPct * r;
    if (m.hpPct) hpPct += m.hpPct * r;
    if (m.luck) luck += m.luck * r;
    if (m.goldPct) goldPct += m.goldPct * r;
  }

  let dmgBuff = 1, luckBuff = 0;
  for (const b of s.buffs) { if (b.dmgMult) dmgBuff *= b.dmgMult; if (b.luckAdd) luckBuff += b.luckAdd; }

  const lvlMult = 1 + (s.hero.level - 1) * 0.13;
  const dmg = (c.dmg * lvlMult + flatDmg) * (1 + dmgPct / 100) * dmgBuff;
  const as = c.as * (1 + asPct / 100);
  const maxHp = Math.round((c.hp + s.hero.level * 22 + flatHp) * (1 + hpPct / 100));
  const mit = armor / (armor + 110);
  const dps = dmg * as * (1 + (crit / 100) * (critDmg / 100 - 1));
  const offline = (dps / 10) * (1 + goldPct / 100) * (1 + offlinePct / 100);

  return { dmg, dps, as, crit: Math.min(85, crit), critDmg, maxHp, armor, mit, goldPct, xpPct, luck: luck + luckBuff, regen, offline };
}

/* =============== enemies =============== */
export function spawnEnemy(zone: number, wave: number): Enemy {
  const z = ZONES[zone];
  const boss = wave % 10 === 0;
  const key = boss ? z.boss : z.mobs[Math.floor(Math.random() * z.mobs.length)];
  const p = zone * 12 + wave;
  let hp = (26 + zone * 14) * Math.pow(1.17, p) * (boss ? 7 : 1);
  let dmg = (5 + zone * 3.2) * Math.pow(1.135, p) * (boss ? 1.8 : 1);
  if (z.endless && wave > 10) {
    hp *= 1 + (wave - 10) * 0.22;
    dmg *= 1 + (wave - 10) * 0.12;
  }
  const gold = Math.round((4 + zone * 6 + wave * 1.4) * (boss ? 13 : 1) * (0.9 + Math.random() * 0.2));
  const xp = Math.round((7 + zone * 7 + wave * 1.6) * (boss ? 9 : 1));
  const r = Math.round(hp);
  return { key, name: MOBS[key]?.n ?? key, hp: r, maxHp: r, dmg, as: boss ? 0.6 : 0.85, boss, gold, xp };
}

/* =============== РОГАЛИК: экспедиция =============== */
export const newRun = (): RunS => ({
  active: false, kind: "exp", wave: 1, enemy: null, heroT: 0, enemyT: 0, hp: 0, maxHp: 0,
  cds: {}, relics: {}, bosses: 0, goldEarned: 0,
});

export function spawnRunEnemy(wave: number): Enemy {
  const tier = Math.min(Math.floor((wave - 1) / RUN_BOSS_EVERY), ZONES.length - 2);
  const z = ZONES[tier];
  const boss = wave % RUN_BOSS_EVERY === 0;
  const key = boss ? z.boss : z.mobs[Math.floor(Math.random() * z.mobs.length)];
  let hp = 60 * Math.pow(1.33, wave) * (boss ? 5 : 1);
  let dmg = 8 * Math.pow(1.24, wave) * (boss ? 1.6 : 1);
  const gold = Math.round((10 + wave * 3) * (boss ? 8 : 1) * (0.9 + Math.random() * 0.2));
  const r = Math.round(hp);
  return { key, name: MOBS[key]?.n ?? key, hp: r, maxHp: r, dmg, as: boss ? 0.55 : 0.9, boss, gold, xp: 0 };
}

function genAbyssItem(uid: number, classId: GameState["hero"]["classId"], wave: number) {
  const slots = Object.keys(ABYSS_SET) as Array<keyof typeof ABYSS_SET>;
  const base = slots[Math.floor(Math.random() * slots.length)];
  const def = ABYSS_SET[base];
  return { uid, base, name: def?.name ?? "Предмет Бездны", rarity: 5 as const, ilvl: wave * 2, stats: def?.stats ?? {}, sell: 400 + wave * 6, abyss: true };
}

/** статы героя с учётом даров забега */
export function runStats(s: GameState): Stats & { lifesteal: number; thorns: number; skillLvl: number; bossGoldMult: number } {
  const base = getStats(s);
  let dmgPct = 0, as = 0, crit = 0, critDmg = 0, hpPct = 0, luck = 0, goldPct = 0, xpPct = 0;
  let lifesteal = 0, thorns = 0, skillLvl = 0, bossGoldMult = 1;
  for (const def of RELICS) {
    const r = s.run.relics[def.id] || 0;
    if (!r) continue;
    if (def.dmgPct) dmgPct += def.dmgPct * r;
    if (def.as) as += def.as * r;
    if (def.crit) crit += def.crit * r;
    if (def.critDmg) critDmg += def.critDmg * r;
    if (def.hpPct) hpPct += def.hpPct * r;
    if (def.luck) luck += def.luck * r;
    if (def.goldPct) goldPct += def.goldPct * r;
    if (def.xpPct) xpPct += def.xpPct * r;
    if (def.lifesteal) lifesteal += def.lifesteal * r;
    if (def.thorns) thorns += def.thorns * r;
    if (def.skillLvl) skillLvl += def.skillLvl * r;
    if (def.bossGold) bossGoldMult += def.bossGold * r;
  }
  return {
    ...base,
    dmg: base.dmg * (1 + dmgPct / 100),
    as: base.as * (1 + as / 100),
    crit: Math.min(90, base.crit + crit),
    critDmg: base.critDmg + critDmg,
    maxHp: Math.round(base.maxHp * (1 + hpPct / 100)),
    luck: base.luck + luck,
    goldPct: base.goldPct + goldPct,
    xpPct: base.xpPct + xpPct,
    lifesteal, thorns, skillLvl, bossGoldMult,
  };
}

export const relicOffer = (relics: Record<string, number>): string[] => {
  const pool = RELICS.filter(r => (relics[r.id] || 0) < r.max);
  const out: string[] = [];
  const copy = [...pool];
  while (out.length < 3 && copy.length) {
    out.push(copy.splice(Math.floor(Math.random() * copy.length), 1)[0].id);
  }
  return out;
};

function runHeroHit(st: GameState, mult: number) {
  const e = st.run.enemy;
  if (!e) return;
  const rs = runStats(st);
  const isCrit = Math.random() * 100 < rs.crit;
  let dmg = rs.dmg * mult * (0.9 + Math.random() * 0.2);
  if (isCrit) dmg *= rs.critDmg / 100;
  const d = Math.max(1, Math.round(dmg));
  st.run.enemy = { ...e, hp: e.hp - d };
  if (isCrit) st.totals.crits += 1;
  st.totals.dmgDealt += d;
  if (st.run.enemy.hp <= 0) runKill(st);
}

function runKill(st: GameState) {
  const e = st.run.enemy;
  if (!e) return;
  const rs = runStats(st);
    const gold = Math.round(e.gold * (1 + rs.goldPct / 100) * (e.boss ? rs.bossGoldMult : 1));
  st.hero.gold += gold;
  st.totals.goldEarned += gold;
  st.run.goldEarned += gold;
  st.run.enemy = null;
  if (rs.lifesteal > 0) st.run.hp = Math.min(rs.maxHp, st.run.hp + rs.maxHp * rs.lifesteal / 100);

  const wasBoss = e.boss;
  if (wasBoss) st.run.bosses += 1;

  if (st.run.kind === "portal") {
    if (wasBoss) {
      st.uidSeq += 1;
      const item = genAbyssItem(st.uidSeq, st.hero.classId, st.run.wave);
      if (st.inv.length < INV_CAP) st.inv = [...st.inv, item];
      else { st.hero.gold += item.sell; st.totals.goldEarned += item.sell; }
      if (Math.random() < 0.08) { st.blood += 1; toast(st, "Кровь Демона! Портал зовёт снова", "gem"); }
    } else if (Math.random() < 0.3) {
      st.uidSeq += 1;
      const item = genItem(st.hero.level * 4 + st.run.wave * 2, 2, st.hero.classId, rs.luck, st.uidSeq);
      if (st.inv.length < INV_CAP) st.inv = [...st.inv, item];
    }
  } else if (wasBoss && Math.random() < 0.07) {
    st.blood += 1;
    toast(st, "КРОВЬ ДЕМОНА! Ключ к Порталу Бездны", "gem");
  }

  if (st.run.wave >= RUN_WAVES) { endRun(st, true); return; }
  st.run.wave += 1;
  st.run.enemy = spawnRunEnemy(st.run.wave);
  st.run.heroT = 0;
  st.run.enemyT = 0;
  if (wasBoss) {
    st.run.hp = Math.min(rs.maxHp, st.run.hp + rs.maxHp * 0.25);
    const opts = relicOffer(st.run.relics);
    if (opts.length) st.modal = { t: "runpick", options: opts };
  }
}

function runEnemyHit(st: GameState) {
  const e = st.run.enemy;
  if (!e) return;
  const rs = runStats(st);
  const mit = rs.armor / (rs.armor + 110);
  const taken = Math.max(1, Math.round(e.dmg * (0.9 + Math.random() * 0.2) * (1 - mit)));
  st.run.hp -= taken;
  if (rs.thorns > 0 && st.run.enemy) {
    const th = Math.round(rs.dmg * rs.thorns / 100);
    st.run.enemy = { ...st.run.enemy, hp: st.run.enemy.hp - th };
    if (st.run.enemy.hp <= 0) { runKill(st); return; }
  }
  if (st.run.hp <= 0) endRun(st, false);
}

function endRun(st: GameState, win: boolean, abandoned = false): GameState {
  const reached = st.run.wave;
  const shards = abandoned ? Math.round(shardReward(reached, st.run.bosses, false) / 2) : shardReward(reached, st.run.bosses, win);
  st.shards += shards;
  st.bestWave = Math.max(st.bestWave, reached);
  st.run = { ...st.run, active: false, enemy: null };
  st.modal = { t: "runover", wave: reached, shards, win };
  toast(st, win ? "Экспедиция пройдена! Бездна впечатлена" : `Забег оборвался на волне ${reached}`, win ? "gem" : "warn");
  return st;
}

/* =============== helpers =============== */
function toast(st: GameState, text: string, kind: "info" | "gold" | "loot" | "warn" | "gem" = "info") {
  st.toastSeq += 1;
  st.toasts = [...st.toasts.slice(-2), { id: st.toastSeq, text, kind }];
}
function pushLog(st: GameState, msg: string) {
  st.battle.log = [msg, ...st.battle.log].slice(0, 6);
}
function pushFx(st: GameState, text: string, kind: "dmg" | "crit" | "hurt" | "heal" | "gold" | "xp", x: number, y: number) {
  st.fxSeq += 1;
  st.battle.fx = [{ id: st.fxSeq, text, kind, x, y, life: 0.95 }, ...st.battle.fx].slice(0, 16);
}

function gainXp(st: GameState, xp: number, silent = false) {
  st.hero.xp += xp;
  let leveled = false;
  while (st.hero.xp >= xpNeed(st.hero.level)) {
    st.hero.xp -= xpNeed(st.hero.level);
    st.hero.level += 1;
    st.hero.skillPoints += 1;
    leveled = true;
  }
  if (leveled) {
    st.hero.hp = getStats(st).maxHp;
    if (!silent) {
      if (!st.modal) st.modal = { t: "levelup", level: st.hero.level };
      toast(st, `Уровень ${st.hero.level}! +1 очко навыков`, "gem");
      pushLog(st, `Уровень ${st.hero.level}. Мир содрогнулся (немного)`);
    }
  }
}

function heroHit(st: GameState, stats: Stats, mult: number) {
  const e = st.battle.enemy;
  if (!e) return;
  const isCrit = Math.random() * 100 < stats.crit;
  let dmg = stats.dmg * mult * (0.9 + Math.random() * 0.2);
  if (isCrit) dmg *= stats.critDmg / 100;
  const d = Math.max(1, Math.round(dmg));
  st.battle.enemy = { ...e, hp: e.hp - d };
  pushFx(st, fmt(d), isCrit ? "crit" : "dmg", 28 + Math.random() * 44, 22 + Math.random() * 30);
  if (isCrit) st.totals.crits += 1;
  st.totals.dmgDealt += d;
  if (st.battle.enemy.hp <= 0) killEnemy(st, stats);
}

function dropItem(st: GameState, stats: Stats, boss: boolean) {
  const ilvl = st.battle.zone * 12 + st.battle.wave + (boss ? 4 : 0);
  st.uidSeq += 1;
  const it = genItem(ilvl, boss ? 1 : 0, st.hero.classId, stats.luck, st.uidSeq);
  st.totals.items += 1;
  if (it.rarity === 4) st.totals.legendaries += 1;
  if (st.inv.length >= INV_CAP) {
    st.hero.gold += it.sell;
    st.totals.goldEarned += it.sell;
    pushLog(st, `Рюкзак полон: «${it.name}» продан за ${it.sell} зол.`);
  } else {
    st.inv = [...st.inv, it];
    toast(st, `Добыча: ${it.name}`, "loot");
  }
}

function killEnemy(st: GameState, stats: Stats) {
  const e = st.battle.enemy;
  if (!e) return;
  st.battle.enemy = null;
  st.totals.kills += 1;
  st.daily.kills += 1;
  st.weekly.kills += 1;
  if (e.boss) { st.totals.bosses += 1; st.daily.bosses += 1; st.weekly.bosses += 1; }

  const gold = Math.round(e.gold * (1 + stats.goldPct / 100));
  st.hero.gold += gold;
  st.totals.goldEarned += gold;
  st.daily.gold += gold;
  st.weekly.gold += gold;
  pushFx(st, `+${fmt(gold)}`, "gold", 40 + Math.random() * 20, 55);
  gainXp(st, Math.round(e.xp * (1 + stats.xpPct / 100)));

  if (Math.random() < 0.14) { st.hero.potions += 1; pushLog(st, "С врага шлёпнулось зелье"); }
  const dropChance = (e.boss ? 1 : 0.34) + stats.luck / 100;
  if (Math.random() < dropChance) dropItem(st, stats, e.boss);
  if (e.boss && Math.random() < 0.5) dropItem(st, stats, true);

  pushLog(st, KILL_PHRASES[Math.floor(Math.random() * KILL_PHRASES.length)].replace("{e}", e.name));

  if (e.boss) {
    if (!st.bossDone[st.battle.zone]) {
      st.bossDone = [...st.bossDone];
      st.bossDone[st.battle.zone] = true;
    }
    if (st.battle.zone + 1 < ZONES.length && st.zones < st.battle.zone + 2) {
      st.zones = st.battle.zone + 2;
      toast(st, `Открыта зона: ${ZONES[st.battle.zone + 1].name}!`, "gem");
    }
    if (Math.random() < 0.65 && !st.modal) {
      const ids = ["toad", "chest", "bard", "goblin"];
      st.modal = { t: "event", id: ids[Math.floor(Math.random() * ids.length)] };
    }
  }

  st.battle.wave += 1;
  st.totals.maxWave = Math.max(st.totals.maxWave, st.battle.zone * 10 + st.battle.wave);
  st.battle.enemyT = 0;
  st.battle.dotT = 0;
  st.battle.dotDps = 0;
  st.battle.enemy = spawnEnemy(st.battle.zone, st.battle.wave);
}

function enemyHit(st: GameState, stats: Stats) {
  const e = st.battle.enemy;
  if (!e || st.battle.paused) return;
  const taken = Math.max(1, Math.round(e.dmg * (0.9 + Math.random() * 0.2) * (1 - stats.mit)));
  st.hero.hp -= taken;
  pushFx(st, `-${fmt(taken)}`, "hurt", 18 + Math.random() * 24, 62 + Math.random() * 12);
  if (st.hero.hp <= 0) {
    st.hero.hp = 0;
    st.battle.paused = true;
    const lost = Math.floor(st.hero.gold * 0.2);
    st.hero.gold -= lost;
    st.totals.deaths += 1;
    // автовоскрешение: никакой вечной модалки, таймер тикает в TICK
    st.battle.respawnT = respawnTime(st.vip);
    pushLog(st, `Вы пали (−${fmt(lost)} зол.). Автовоскрешение через ${st.battle.respawnT} с...`);
  }
}

/* =============== metric =============== */
export function getMetric(s: GameState, key: string): number {
  const t = s.totals;
  const eq = SLOTS.filter(sl => s.equip[sl]).length;
  switch (key) {
    case "kills": return t.kills;
    case "bosses": return t.bosses;
    case "crits": return t.crits;
    case "goldEarned": return t.goldEarned;
    case "level": return s.hero.level;
    case "equippedCount": return eq;
    case "invCount": return s.inv.length;
    case "casts": return t.casts;
    case "maxWave": return t.maxWave;
    case "legendaries": return t.legendaries;
    case "potionsUsed": return t.potions;
    case "deaths": return t.deaths;
    case "boss1": return s.bossDone[0] ? 1 : 0;
    case "boss2": return s.bossDone[1] ? 1 : 0;
    case "dkills": return s.daily.kills;
    case "dbosses": return s.daily.bosses;
    case "dgold": return s.daily.gold;
    case "wkills": return s.weekly?.kills ?? 0;
    case "wbosses": return s.weekly?.bosses ?? 0;
    case "wgold": return s.weekly?.gold ?? 0;
    case "wcasts": return s.weekly?.casts ?? 0;
    default: return 0;
  }
}

/* =============== state factory =============== */
export function newGame(): GameState {
  return {
    v: 1,
    hero: { classId: "mage", name: "Бродяга", level: 1, xp: 0, skillPoints: 1, gold: 100, gems: 10, potions: 2, hp: 95 },
    equip: { weapon: null, helm: null, amulet: null, armor: null, gloves: null, boots: null, ring1: null, ring2: null },
    inv: [], skills: {}, passives: {},
    battle: { zone: 0, wave: 1, enemy: null, heroT: 0, enemyT: 0, dotDps: 0, dotT: 0, cds: {}, fx: [], log: [], paused: false, respawnT: 0 },
    zones: 1, bossDone: ZONES.map(() => false),
    totals: { kills: 0, bosses: 0, crits: 0, goldEarned: 0, dmgDealt: 0, items: 0, legendaries: 0, maxWave: 0, deaths: 0, casts: 0, potions: 0, events: 0, questsDone: 0 },
    achClaimed: [], questsClaimed: [], buffs: [], toasts: [],
    modal: { t: "class" },
    daily: { date: todayStr(), kills: 0, bosses: 0, gold: 0, claimed: [] },
    weekly: emptyWeekly(),
    vip: 0,
    slotLevel: { weapon: 0, helm: 0, amulet: 0, armor: 0, gloves: 0, boots: 0, ring1: 0, ring2: 0 },
    run: newRun(),
    shards: 0,
    meta: {},
    bestWave: 0,
    blood: 0,
    godstone: null,
    duel: newDuel(),
    shopBuys: {}, lastSeen: Date.now(), uidSeq: 1, fxSeq: 1, toastSeq: 1,
  };
}

/* =============== reducer =============== */
export function reducer(s: GameState, a: Action): GameState {
  switch (a.type) {
    case "TICK": return tick(s, a.dt);

    case "CHOOSE_CLASS": {
      const st = { ...s, hero: { ...s.hero }, battle: { ...s.battle, fx: [], log: [] } };
      st.hero.classId = a.classId;
      st.hero.name = a.name.trim() || (a.classId === "mage" ? "Пиромант" : "Стрелка");
      st.hero.hp = CLASSES[a.classId].base.hp;
      st.battle.enemy = spawnEnemy(0, 1);
      st.battle.wave = 1;
      st.modal = null;
      toast(st, `${CLASSES[a.classId].name} в деле. Вперёд, за лутом!`, "gem");
      pushLog(st, "Поход начался. Прелый лес уже жалеет об этом");
      return st;
    }

    case "SET_ZONE": {
      if (a.zone >= s.zones || a.zone === s.battle.zone) return s;
      const st = { ...s, battle: { ...s.battle, cds: { ...s.battle.cds }, fx: [...s.battle.fx], log: [...s.battle.log] } };
      st.battle.zone = a.zone;
      st.battle.wave = 1;
      st.battle.heroT = 0; st.battle.enemyT = 0; st.battle.dotT = 0; st.battle.paused = false; st.battle.respawnT = 0;
      st.battle.enemy = spawnEnemy(a.zone, 1);
      pushLog(st, `Вы вошли в «${ZONES[a.zone].name}»`);
      return st;
    }

    case "CAST": {
      const def = SKILLS.find(k => k.id === a.id);
      if (!def || def.classId !== s.hero.classId) return s;
      const st = { ...s, battle: { ...s.battle, cds: { ...s.battle.cds }, fx: [...s.battle.fx], log: [...s.battle.log] }, totals: { ...s.totals }, weekly: { ...s.weekly, claimed: [...s.weekly.claimed] } };
      if (s.hero.level < def.unlockLevel) { toast(st, `${def.name}: откроется на ${def.unlockLevel} уровне`, "warn"); return st; }
      if (!st.battle.enemy || st.battle.paused) return s;
      if ((st.battle.cds[a.id] || 0) > 0) return s;
      st.battle.cds[a.id] = def.cd;
      st.totals.casts += 1;
      st.weekly.casts += 1;
      const stats = getStats(s);
      const lvl = s.skills[a.id] || 1;
      const hits = def.hits(lvl);
      for (let i = 0; i < hits; i++) heroHit(st, stats, def.mult(lvl));
      if (def.slow && st.battle.enemy) st.battle.enemyT = Math.max(0, st.battle.enemyT - 1);
      if (def.dotPct && st.battle.enemy) { st.battle.dotDps = stats.dmg * def.dotPct(lvl); st.battle.dotT = 5; }
      pushLog(st, `${def.name}!`);
      return st;
    }

    case "USE_POTION": {
      const st = { ...s, hero: { ...s.hero }, totals: { ...s.totals }, battle: { ...s.battle, fx: [...s.battle.fx], log: [...s.battle.log] } };
      const stats = getStats(s);
      if (st.hero.potions <= 0) { toast(st, "Зелий нет. Гоблин уже потирает руки", "warn"); return st; }
      if (st.hero.hp >= stats.maxHp) { toast(st, "HP и так полное", "info"); return st; }
      st.hero.potions -= 1;
      st.hero.hp = Math.min(stats.maxHp, st.hero.hp + stats.maxHp * 0.45);
      st.totals.potions += 1;
      pushFx(st, "ХРУМ!", "heal", 30, 65);
      pushLog(st, "Зелье выпито. Вкус — компот, эффект — жизнь");
      return st;
    }

    case "EQUIP": {
      const it = s.inv.find(i => i.uid === a.uid);
      if (!it) return s;
      const st = { ...s, inv: s.inv.filter(i => i.uid !== a.uid), equip: { ...s.equip }, hero: { ...s.hero } };
      let slot: Slot = it.base as Slot;
      if (it.base === "ring") slot = !s.equip.ring1 ? "ring1" : !s.equip.ring2 ? "ring2" : "ring1";
      const old = st.equip[slot];
      st.equip[slot] = it;
      if (old) st.inv = [...st.inv, old];
      st.hero.hp = Math.min(st.hero.hp, getStats(st).maxHp);
      return st;
    }

    case "UNEQUIP": {
      const it = s.equip[a.slot];
      if (!it) return s;
      if (s.inv.length >= INV_CAP) { const st = { ...s }; toast(st, "Рюкзак полон!", "warn"); return st; }
      const st = { ...s, equip: { ...s.equip, [a.slot]: null }, inv: [...s.inv, it], hero: { ...s.hero } };
      st.hero.hp = Math.min(st.hero.hp, getStats(st).maxHp);
      return st;
    }

    case "SELL": {
      const it = s.inv.find(i => i.uid === a.uid);
      if (!it) return s;
      const st = { ...s, inv: s.inv.filter(i => i.uid !== a.uid), hero: { ...s.hero, gold: s.hero.gold + it.sell }, totals: { ...s.totals, goldEarned: s.totals.goldEarned + it.sell } };
      toast(st, `Продано за ${it.sell} зол.`, "gold");
      return st;
    }

    case "SELL_JUNK": {
      const junk = s.inv.filter(i => i.rarity === 0);
      if (!junk.length) { const st = { ...s }; toast(st, "Серого хлама нет", "info"); return st; }
      const sum = junk.reduce((acc, i) => acc + i.sell, 0);
      const st = { ...s, inv: s.inv.filter(i => i.rarity !== 0), hero: { ...s.hero, gold: s.hero.gold + sum }, totals: { ...s.totals, goldEarned: s.totals.goldEarned + sum } };
      toast(st, `Продано ${junk.length} шт. хлама за ${sum} зол.`, "gold");
      return st;
    }

    case "BUY_SHOP": {
      const def = SHOP.find(x => x.id === a.id);
      if (!def) return s;
      const buys = s.shopBuys[a.id] || 0;
      const cost = shopCost(def, buys);
      const st = { ...s, hero: { ...s.hero }, shopBuys: { ...s.shopBuys }, totals: { ...s.totals }, inv: [...s.inv], battle: { ...s.battle, log: [...s.battle.log] } };
      const pay = def.currency === "gold" ? st.hero.gold : st.hero.gems;
      if (pay < cost) { toast(st, def.currency === "gold" ? "Не хватает золота" : "Не хватает кристаллов", "warn"); return st; }
      if (def.currency === "gold") st.hero.gold -= cost; else st.hero.gems -= cost;
      st.shopBuys[a.id] = buys + 1;
      if (def.kind === "potion") {
        st.hero.potions += 1;
        toast(st, "Зелье куплено. Гоблин довольно хрюкнул", "gold");
      } else {
        const ilvl = st.battle.zone * 12 + st.battle.wave + 3;
        st.uidSeq += 1;
        const it = genItem(ilvl, def.minRarity ?? 0, st.hero.classId, getStats(s).luck, st.uidSeq);
        st.totals.items += 1;
        if (it.rarity === 4) st.totals.legendaries += 1;
        if (st.inv.length >= INV_CAP) {
          st.hero.gold += it.sell;
          st.totals.goldEarned += it.sell;
          toast(st, `Рюкзак полон — ${it.name} сразу продан`, "gold");
        } else {
          st.inv.push(it);
          toast(st, `Из ларца: ${it.name}`, "loot");
        }
      }
      return st;
    }

    case "LEVEL_SKILL": {
      const def = SKILLS.find(k => k.id === a.id);
      if (!def) return s;
      const lvl = s.skills[a.id] || 1;
      const cost = skillCost(lvl);
      const st = { ...s, hero: { ...s.hero }, skills: { ...s.skills } };
      if (s.hero.gold < cost) { toast(st, "Не хватает золота", "warn"); return st; }
      st.hero.gold -= cost;
      st.skills[a.id] = lvl + 1;
      toast(st, `${def.name} ур. ${lvl + 1}`, "gem");
      return st;
    }

    case "LEVEL_PASSIVE": {
      const def = PASSIVES.find(p => p.id === a.id);
      if (!def) return s;
      const rank = s.passives[a.id] || 0;
      const st = { ...s, hero: { ...s.hero }, passives: { ...s.passives } };
      if (rank >= def.max) return s;
      if (s.hero.skillPoints <= 0) { toast(st, "Нет очков навыков — качайте уровень", "warn"); return st; }
      st.hero.skillPoints -= 1;
      st.passives[a.id] = rank + 1;
      return st;
    }

    case "CLAIM_QUEST": {
      const def = QUESTS.find(q => q.id === a.id);
      if (!def || s.questsClaimed.includes(a.id)) return s;
      if (getMetric(s, def.metric) < def.target) return s;
      const st = { ...s, hero: { ...s.hero }, questsClaimed: [...s.questsClaimed, a.id], totals: { ...s.totals, questsDone: s.totals.questsDone + 1 } };
      if (def.reward.gold) st.hero.gold += def.reward.gold;
      if (def.reward.gems) st.hero.gems += def.reward.gems;
      toast(st, `Квест выполнен: «${def.title}»`, "gem");
      return st;
    }

    case "CLAIM_DAILY": {
      const def = DAILIES.find(q => q.id === a.id);
      if (!def || s.daily.claimed.includes(a.id)) return s;
      if (getMetric(s, def.metric) < def.target) return s;
      const st = { ...s, hero: { ...s.hero }, daily: { ...s.daily, claimed: [...s.daily.claimed, a.id] } };
      if (def.reward.gold) st.hero.gold += def.reward.gold;
      if (def.reward.gems) st.hero.gems += def.reward.gems;
      toast(st, `Ежедневка получена: «${def.title}»`, "gem");
      return st;
    }

    case "CLAIM_ACH": {
      const def = ACHS.find(q => q.id === a.id);
      if (!def || s.achClaimed.includes(a.id)) return s;
      if (getMetric(s, def.metric) < def.target) return s;
      const st = { ...s, hero: { ...s.hero, gems: s.hero.gems + (def.reward.gems || 0) }, achClaimed: [...s.achClaimed, a.id] };
      toast(st, `Достижение: «${def.title}» +${def.reward.gems || 0} крист.`, "gem");
      return st;
    }

    case "CHOOSE_EVENT": return chooseEvent(s, a.idx);

    case "CLAIM_WEEKLY": {
      const def = WEEKLIES.find(q => q.id === a.id);
      if (!def || s.weekly.claimed.includes(a.id)) return s;
      if (getMetric(s, def.metric) < def.target) return s;
      const st = { ...s, hero: { ...s.hero }, weekly: { ...s.weekly, claimed: [...s.weekly.claimed, a.id] } };
      if (def.reward.gold) st.hero.gold += def.reward.gold;
      if (def.reward.gems) st.hero.gems += def.reward.gems;
      toast(st, `Еженедельник получен: «${def.title}»`, "gem");
      return st;
    }

    case "UPGRADE_SLOT": {
      const lvl = s.slotLevel[a.slot] || 0;
      const st = { ...s, hero: { ...s.hero }, slotLevel: { ...s.slotLevel } };
      if (lvl >= SLOT_UP_MAX) { toast(st, "Заточка на пределе", "warn"); return st; }
      const ilvl = s.battle.zone * 12 + s.battle.wave;
      const cost = slotUpCost(lvl, ilvl);
      if (s.hero.gold < cost) { toast(st, "Не хватает золота на точильный камень", "warn"); return st; }
      st.hero.gold -= cost;
      st.slotLevel[a.slot] = lvl + 1;
      toast(st, `Заточка слота: +${lvl + 1} (${SLOT_UP_BONUS * (lvl + 1)}% к статам)`, "gem");
      return st;
    }

    case "BUY_VIP": {
      if (s.vip >= VIP_LEVELS.length) return s;
      const def = VIP_LEVELS[s.vip];
      const st = { ...s, hero: { ...s.hero } };
      if (s.hero.gems < def.cost) { toast(st, "Не хватает кристаллов на VIP", "warn"); return st; }
      st.hero.gems -= def.cost;
      st.vip = s.vip + 1;
      toast(st, `VIP «${def.name}» активирован!`, "gem");
      return st;
    }

    case "START_RUN": {
      if (s.run.active) return s;
      const kind = a.kind ?? "exp";
      if (kind === "portal" && s.blood < 1) {
        const st = { ...s };
        toast(st, "Нужна Кровь Демона — выбивай её с боссов", "warn");
        return st;
      }
      const st: GameState = {
        ...s, hero: { ...s.hero }, run: { ...newRun(), kind, relics: {} },
        battle: { ...s.battle, paused: true, log: [...s.battle.log] },
      };
      if (kind === "portal") st.blood -= 1;
      const rs = runStats(st);
      st.run.maxHp = rs.maxHp;
      st.run.hp = rs.maxHp;
      st.run.active = true;
      st.run.enemy = spawnRunEnemy(1);
      // мета «Фора»: стартовые дары
      const head = META.find(m => m.id === "headstart");
      const headRank = head ? s.meta?.[head.id] || 0 : 0;
      for (let i = 0; i < headRank; i++) {
        const opts = relicOffer(st.run.relics);
        if (opts.length) st.run.relics = { ...st.run.relics, [opts[0]]: (st.run.relics[opts[0]] || 0) + 1 };
      }
      pushLog(st, kind === "portal" ? "Портал Бездны открыт! Фарм на паузе" : "Экспедиция началась! Фарм на паузе — герой в Бездне");
      return st;
    }

    case "BUY_GODSTONE": {
      if (s.godstone !== null) return s;
      const st = { ...s, hero: { ...s.hero } };
      if (st.hero.gems < GODSTONE.price) { toast(st, "Нужно 40 кристаллов для пробуждения", "warn"); return st; }
      st.hero.gems -= GODSTONE.price;
      st.godstone = 0;
      toast(st, "Камень Бога пробуждён", "gem");
      return st;
    }

    case "UP_GODSTONE": {
      if (s.godstone === null) return s;
      const level = s.godstone;
      const st = { ...s, hero: { ...s.hero } };
      const cost = GODSTONE.cost(level);
      if (st.hero.gold < cost) { toast(st, "Не хватает золота для усиления Камня Бога", "warn"); return st; }
      st.hero.gold -= cost;
      st.godstone = level + 1;
      toast(st, `Камень Бога усилен до ${level + 1} уровня`, "gem");
      return st;
    }

    case "ABANDON_RUN": {
      if (!s.run.active) return s;
      const st: GameState = { ...s, run: { ...s.run, relics: { ...s.run.relics } }, hero: { ...s.hero }, totals: { ...s.totals } };
      return endRun(st, false, true);
    }

    case "RUN_CAST": {
      if (!s.run.active || !s.run.enemy) return s;
      const def = SKILLS.find(k => k.id === a.id);
      if (!def || def.classId !== s.hero.classId) return s;
      if (s.hero.level < def.unlockLevel) return s;
      if ((s.run.cds[a.id] || 0) > 0) return s;
      const st: GameState = { ...s, run: { ...s.run, cds: { ...s.run.cds } }, totals: { ...s.totals } };
      st.run.cds[a.id] = def.cd;
      st.totals.casts += 1;
      st.weekly.casts += 1;
      const rs = runStats(s);
      const lvl = (s.skills[a.id] || 1) + rs.skillLvl;
      for (let i = 0; i < def.hits(lvl); i++) runHeroHit(st, def.mult(lvl));
      return st;
    }

    case "RUN_USE_POTION": {
      if (!s.run.active || s.hero.potions <= 0) return s;
      const st: GameState = { ...s, hero: { ...s.hero }, run: { ...s.run }, totals: { ...s.totals } };
      const rs = runStats(s);
      if (st.run.hp >= rs.maxHp) return s;
      st.hero.potions -= 1;
      st.run.hp = Math.min(rs.maxHp, st.run.hp + rs.maxHp * 0.45);
      st.totals.potions += 1;
      return st;
    }

    case "RUN_PICK": {
      const def = RELICS.find(r => r.id === a.id);
      if (!def) return s;
      const st: GameState = { ...s, run: { ...s.run, relics: { ...s.run.relics } }, modal: null };
      st.run.relics[a.id] = (st.run.relics[a.id] || 0) + 1;
      const rs = runStats(st);
      st.run.maxHp = rs.maxHp;
      if (def.hpPct && def.hpPct > 0) st.run.hp = Math.min(rs.maxHp, st.run.hp + rs.maxHp * 0.3);
      toast(st, `Дар принят: «${def.name}»`, "loot");
      return st;
    }

    case "RUN_CLOSE": {
      const st: GameState = { ...s, modal: null, battle: { ...s.battle, paused: false }, run: { ...newRun() } };
      st.hero.hp = Math.max(st.hero.hp, 1);
      pushLog(st, "Герой вернулся с экспедиции. Фарм продолжается");
      return st;
    }

    case "BUY_META": {
      const def = META.find(m => m.id === a.id);
      if (!def) return s;
      const rank = s.meta?.[a.id] || 0;
      if (rank >= def.max) return s;
      const cost = def.cost(rank);
      const st: GameState = { ...s, meta: { ...s.meta } };
      if (s.shards < cost) { toast(st, "Не хватает осколков бездны", "warn"); return st; }
      st.shards -= cost;
      st.meta[a.id] = rank + 1;
      toast(st, `Алтарь: «${def.name}» ур. ${rank + 1}`, "gem");
      return st;
    }

    case "DUEL_SEARCH": {
      const duel = { ...s.duel, cds: { ...s.duel.cds }, fx: [...s.duel.fx], log: [...s.duel.log] };
      if (duel.state === "search" || duel.state === "fight") return s;
      if (duel.tokens < 1) { const st = { ...s, duel }; toast(st, "Нет жетонов дуэлей", "warn"); return st; }
      duel.tokens -= 1;
      duel.state = "search";
      duel.searchT = 1.2 + Math.random() * 1.3;
      duel.result = null;
      return { ...s, duel };
    }

    case "DUEL_CAST": {
      const def = SKILLS.find(skill => skill.id === a.id && skill.classId === s.hero.classId);
      if (!def || s.duel.state !== "fight" || !s.duel.foe || s.hero.level < def.unlockLevel || (s.duel.cds[a.id] || 0) > 0) return s;
      const duel = { ...s.duel, cds: { ...s.duel.cds }, fx: [...s.duel.fx], log: [...s.duel.log], foe: { ...s.duel.foe } };
      duel.cds[a.id] = def.cd;
      const stats = getStats(s);
      const lvl = s.skills[a.id] || 1;
      for (let i = 0; i < def.hits(lvl); i++) {
        let damage = stats.dmg * def.mult(lvl) * (0.9 + Math.random() * 0.2);
        if (Math.random() * 100 < stats.crit) damage *= stats.critDmg / 100;
        duel.foe.hp -= Math.max(1, Math.round(damage));
      }
      duel.log = [`Ваш «${def.name}» попадает в цель!`, ...duel.log].slice(0, 5);
      return duel.foe.hp <= 0 ? finishDuel({ ...s, duel }, true) : { ...s, duel };
    }

    case "DUEL_CLOSE":
      return { ...s, duel: { ...newDuel(), mmr: s.duel.mmr, tokens: s.duel.tokens, wins: s.duel.wins, losses: s.duel.losses } };

    case "CLOSE_MODAL": return { ...s, modal: null };
    case "DISMISS_TOAST": return { ...s, toasts: s.toasts.filter(t => t.id !== a.id) };
    case "RESET": {
      try { localStorage.removeItem(SAVE_KEY); } catch { /* noop */ }
      return newGame();
    }
    default: return s;
  }
}

function finishDuel(s: GameState, win: boolean): GameState {
  const foe = s.duel.foe;
  const expected = foe ? 1 / (1 + Math.pow(10, (foe.mmr - s.duel.mmr) / 400)) : 0.5;
  const delta = win ? Math.max(6, Math.round(32 * (1 - expected))) : -Math.max(6, Math.round(32 * expected));
  const reward = Math.round(win ? 100 + s.duel.mmr * 0.15 + Math.random() * 80 : 20 + s.duel.mmr * 0.03);
  const duel = { ...s.duel, state: "result" as const, result: win ? "win" as const : "lose" as const, mmr: Math.max(100, s.duel.mmr + delta), delta, reward, wins: s.duel.wins + (win ? 1 : 0), losses: s.duel.losses + (win ? 0 : 1), log: [`${foe?.name ?? "Соперник"}: ${win ? "победа" : "поражение"}`, ...s.duel.log].slice(0, 5) };
  return { ...s, duel, hero: { ...s.hero, gold: s.hero.gold + reward }, totals: { ...s.totals, goldEarned: s.totals.goldEarned + reward } };
}

function duelTick(s: GameState, dt: number) {
  const duel = s.duel;
  duel.fx = duel.fx.map(f => ({ ...f, life: f.life - dt })).filter(f => f.life > 0);
  for (const key of Object.keys(duel.cds)) duel.cds[key] = Math.max(0, duel.cds[key] - dt);
  if (duel.state === "search") {
    duel.searchT -= dt;
    if (duel.searchT <= 0) {
      const stats = getStats(s);
      const mmr = Math.max(100, duel.mmr + Math.round(Math.random() * 460 - 230));
      const scale = (0.85 + Math.random() * 0.3) * (1 + (mmr - duel.mmr) / 1600);
      const maxHp = Math.round(stats.maxHp * scale);
      const foe: DuelFoe = { name: DUEL_NAMES[Math.floor(Math.random() * DUEL_NAMES.length)], classId: Math.random() < 0.5 ? "mage" : "archer", mmr, hp: maxHp, maxHp, dmg: stats.dps / stats.as * scale, as: stats.as * (0.9 + Math.random() * 0.25), crit: Math.min(70, stats.crit), critDmg: stats.critDmg };
      duel.foe = foe; duel.heroHp = stats.maxHp; duel.heroT = 0; duel.foeT = 0; duel.skillT = 7; duel.foeSkillT = 5.5; duel.state = "fight";
    }
    return;
  }
  if (duel.state !== "fight" || !duel.foe) return;
  const stats = getStats(s);
  duel.heroT += stats.as * dt;
  if (duel.heroT >= 1) { duel.heroT -= 1; duel.foe.hp -= Math.max(1, Math.round(stats.dmg * (0.9 + Math.random() * 0.2))); }
  if (duel.foe.hp <= 0) { Object.assign(s, finishDuel(s, true)); return; }
  duel.foeT += duel.foe.as * dt;
  if (duel.foeT >= 1) { duel.foeT -= 1; duel.heroHp -= Math.max(1, Math.round(duel.foe.dmg * (1 - stats.mit))); }
  if (duel.heroHp <= 0) { duel.heroHp = 0; Object.assign(s, finishDuel(s, false)); }
}

/* =============== tick =============== */
function runTick(s: GameState, dt: number): GameState {
  const st: GameState = {
    ...s, hero: { ...s.hero }, totals: { ...s.totals },
    run: { ...s.run, cds: { ...s.run.cds }, relics: { ...s.run.relics } },
  };
  const R = st.run;
  for (const k of Object.keys(R.cds)) if (R.cds[k] > 0) R.cds[k] = Math.max(0, R.cds[k] - dt);

  if (!R.enemy || !R.active) return st;
  const rs = runStats(st);

  R.heroT += rs.as * dt;
  while (R.heroT >= 1 && R.enemy && R.active) { R.heroT -= 1; runHeroHit(st, 1); }
  if (R.enemy && R.active) {
    R.enemyT += R.enemy.as * dt;
    while (R.enemyT >= 1 && R.enemy && R.active) { R.enemyT -= 1; runEnemyHit(st); }
  }
  return st;
}

function tick(s: GameState, dt: number): GameState {
  const base = s.run.active ? runTick(s, dt) : s;
  if (base.duel.state !== "idle" || base.duel.fx.length) {
    const st = { ...base, duel: { ...base.duel, cds: { ...base.duel.cds }, fx: base.duel.fx.map(f => ({ ...f })), log: [...base.duel.log], foe: base.duel.foe ? { ...base.duel.foe } : null } };
    duelTick(st, dt);
    return st;
  }
  if (s.run.active) return base;
  if (!s.battle.enemy && !s.battle.fx.length && !s.buffs.length) {
    // даже без боя нужны сбросы дня/недели
    const daily = s.daily.date !== todayStr() ? { date: todayStr(), kills: 0, bosses: 0, gold: 0, claimed: [] as string[] } : s.daily;
    const weekly = s.weekly?.week !== weekKey() ? emptyWeekly() : s.weekly;
    if (daily !== s.daily || weekly !== s.weekly) return { ...s, daily, weekly };
    return s;
  }
  const st: GameState = {
    ...s,
    hero: { ...s.hero },
    totals: { ...s.totals },
    weekly: { ...s.weekly, claimed: [...s.weekly.claimed] },
    buffs: s.buffs.map(b => ({ ...b })),
    battle: { ...s.battle, cds: { ...s.battle.cds }, fx: s.battle.fx.map(f => ({ ...f })), log: [...s.battle.log] },
  };
  const B = st.battle;

  B.fx = B.fx.map(f => ({ ...f, life: f.life - dt })).filter(f => f.life > 0).slice(0, 16);

  if (st.buffs.length) {
    st.buffs = st.buffs.map(b => ({ ...b, t: b.t - dt })).filter(b => {
      if (b.t <= 0) pushLog(st, `Эффект «${b.label}» развеялся`);
      return b.t > 0;
    });
  }
  for (const k of Object.keys(B.cds)) if (B.cds[k] > 0) B.cds[k] = Math.max(0, B.cds[k] - dt);
  if (st.daily.date !== todayStr()) st.daily = { date: todayStr(), kills: 0, bosses: 0, gold: 0, claimed: [] };
  if (st.weekly.week !== weekKey()) st.weekly = emptyWeekly();

  // автовоскрешение — без модалок и кликов
  if (B.paused && B.respawnT > 0) {
    B.respawnT -= dt;
    if (B.respawnT <= 0) {
      B.respawnT = 0;
      B.paused = false;
      B.enemyT = 0;
      B.heroT = 0;
      st.hero.hp = Math.round(getStats(st).maxHp * 0.6);
      pushLog(st, "Автовоскрешение! Помятый, но злой — снова в строю");
    }
  }

  if (!B.enemy || B.paused) return st;

  const stats = getStats(st);
  if (stats.regen > 0) st.hero.hp = Math.min(stats.maxHp, st.hero.hp + (stats.maxHp * stats.regen / 100) * dt);

  if (B.dotT > 0 && B.enemy) {
    B.dotT -= dt;
    B.enemy = { ...B.enemy, hp: B.enemy.hp - B.dotDps * dt };
    if (B.enemy.hp <= 0) killEnemy(st, stats);
  }
  if (B.enemy && !B.paused) {
    B.heroT += stats.as * dt;
    while (B.heroT >= 1 && B.enemy && !B.paused) { B.heroT -= 1; heroHit(st, stats, 1); }
  }
  if (B.enemy && !B.paused) {
    B.enemyT += B.enemy.as * dt;
    while (B.enemyT >= 1 && B.enemy && !B.paused) { B.enemyT -= 1; enemyHit(st, stats); }
  }
  return st;
}

/* =============== events =============== */
function chooseEvent(s: GameState, idx: number): GameState {
  if (!s.modal || s.modal.t !== "event") return s;
  const id = s.modal.id;
  const st: GameState = {
    ...s, hero: { ...s.hero }, modal: null, buffs: [...s.buffs],
    battle: { ...s.battle, fx: [...s.battle.fx], log: [...s.battle.log] },
    totals: { ...s.totals, events: s.totals.events + 1 },
  };
  const stats = getStats(s);

  if (id === "toad") {
    if (idx === 0) {
      if (Math.random() < 0.5) {
        st.buffs.push({ id: "toad", label: "Поцелуй жабы", dmgMult: 1.3, t: 90 });
        pushLog(st, "Жаба чмокнула в ответ. Урон +30% на 90 сек!");
      } else {
        st.hero.hp = stats.maxHp;
        pushLog(st, "Жаба оказалась принцессой-целительницей. HP восстановлено");
      }
    } else {
      st.hero.gold += 60; st.totals.goldEarned += 60;
      pushLog(st, "Жаба вздохнула и отсыпала 60 золота на дорогу");
    }
  } else if (id === "chest") {
    if (idx === 0) {
      if (Math.random() < 0.6) {
        const g = 120 + st.hero.level * 40;
        st.hero.gold += g; st.totals.goldEarned += g;
        toast(st, `В сундуке ${g} золота!`, "gold");
      } else {
        st.hero.hp = Math.max(1, st.hero.hp - stats.maxHp * 0.2);
        pushLog(st, "ЭТО БЫЛ МИМИК! Откусил 20% HP и извинился");
      }
    } else {
      gainXp(st, 40 + st.hero.level * 10);
      pushLog(st, "Осторожность — тоже опыт. +XP");
    }
  } else if (id === "bard") {
    if (idx === 0) {
      gainXp(st, 60 + st.hero.level * 25);
      pushLog(st, "Баллада была так себе, но душа наполнилась. +XP");
    } else {
      if (st.hero.gold >= 40) {
        st.hero.gold -= 40;
        st.buffs.push({ id: "karma", label: "Карма гоблина", luckAdd: 60, t: 120 });
        pushLog(st, "Бард записал вас в «свои». Дроп +60% на 2 мин");
      } else {
        toast(st, "Не хватает 40 золота на барда", "warn");
      }
    }
  } else if (id === "goblin") {
    if (idx === 0) {
      if (st.hero.gold >= 60) {
        st.hero.gold -= 60;
        st.hero.potions += 1;
        pushLog(st, "Зелье куплено у стажёра. Шеф будет доволен");
      } else {
        toast(st, "Не хватает 60 золота", "warn");
      }
    } else {
      pushLog(st, "Гоблин ушёл в лес. Он там, кстати, работает");
    }
  }
  return st;
}

/* =============== persistence =============== */
export function saveGame(s: GameState) {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify({ ...s, lastSeen: Date.now(), toasts: [], modal: s.modal?.t === "class" ? s.modal : null }));
  } catch { /* noop */ }
}

export function loadGame(): GameState {
  let s: GameState;
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return newGame();
    s = JSON.parse(raw) as GameState;
    if (!s || s.v !== 1 || !s.hero || !s.battle) return newGame();
  } catch {
    return newGame();
  }
  s.toasts = [];
  s.battle = { ...s.battle, fx: [], respawnT: s.battle.respawnT ?? 0 };
  if (s.daily?.date !== todayStr()) s.daily = { date: todayStr(), kills: 0, bosses: 0, gold: 0, claimed: [] };
  // миграция со старых сейвов: новые поля
  if (s.vip == null) s.vip = 0;
  if (!s.slotLevel) s.slotLevel = { weapon: 0, helm: 0, amulet: 0, armor: 0, gloves: 0, boots: 0, ring1: 0, ring2: 0 };
  for (const sl of SLOTS) if (s.slotLevel[sl] == null) s.slotLevel[sl] = 0;
  if (!s.weekly || s.weekly.week !== weekKey()) s.weekly = emptyWeekly();
  // рогалик-режим (миграция)
  if (!s.run) s.run = newRun();
  if (!s.run.kind) s.run.kind = "exp";
  s.run.active = false; s.run.enemy = null;
  if (s.shards == null) s.shards = 0;
  if (!s.meta) s.meta = {};
  if (s.bestWave == null) s.bestWave = 0;
  if (s.blood == null) s.blood = 0;
  if (s.godstone === undefined) s.godstone = null;
  if (!s.duel) s.duel = newDuel();
  // если герой застрял мёртвым в старом сейве — сразу воскрешаем
  if (s.hero.hp <= 0) s.hero = { ...s.hero, hp: Math.round(getStats(s).maxHp * 0.6) };
  if (s.battle.paused && s.battle.respawnT <= 0 && s.battle.enemy) s.battle.paused = false;

  const elapsed = (Date.now() - (s.lastSeen || Date.now())) / 1000;
  if (elapsed > 90 && s.battle.enemy && !s.battle.paused) {
    const stats = getStats(s);
    const sec = Math.min(elapsed, 8 * 3600);
    const gold = Math.round(stats.offline * sec);
    const xp = Math.round((stats.dps / 18) * sec * (1 + stats.xpPct / 100));
    s.hero = { ...s.hero, gold: s.hero.gold + gold };
    s.totals = { ...s.totals, goldEarned: s.totals.goldEarned + gold };
    gainXp(s, xp, true);
    s.modal = { t: "offline", gold, xp, sec };
  }
  s.lastSeen = Date.now();
  return s;
}
