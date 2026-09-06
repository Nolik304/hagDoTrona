import {
  CLASSES, SKILLS, PASSIVES, ZONES, MOBS, KILL_PHRASES, QUESTS, DAILIES, ACHS,
  genItem, INV_CAP, skillCost, shopCost, SHOP,
} from "./data";
import type { Action, Enemy, GameState, Slot, Stats } from "./types";

export const SAVE_KEY = "bezdna-idle-save-v1";
export const SLOTS: Slot[] = ["weapon", "helm", "amulet", "armor", "gloves", "boots", "ring1", "ring2"];

export const todayStr = () => new Date().toISOString().slice(0, 10);
export const xpNeed = (level: number) => Math.floor(50 * Math.pow(level, 1.55));

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

/* =============== derived stats =============== */
export function getStats(s: GameState): Stats {
  const c = CLASSES[s.hero.classId].base;
  let flatDmg = 0, dmgPct = 0, flatHp = 0, hpPct = 0, crit = c.crit, critDmg = 150,
    asPct = 0, goldPct = 0, xpPct = 0, luck = 0, armor = 0, regen = 0, offlinePct = 0;

  for (const slot of SLOTS) {
    const it = s.equip[slot];
    if (!it) continue;
    for (const [k, v] of Object.entries(it.stats)) {
      const val = v ?? 0;
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
  const P = (id: string) => s.passives[id] || 0;
  dmgPct += 8 * P("power"); crit += 2.5 * P("focus"); hpPct += 8 * P("vitality");
  armor += 6 * P("skin"); goldPct += 8 * P("greed"); xpPct += 7 * P("wisdom");
  luck += 5 * P("fortune"); offlinePct += 12 * P("treasury");

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
  if (e.boss) { st.totals.bosses += 1; st.daily.bosses += 1; }

  const gold = Math.round(e.gold * (1 + stats.goldPct / 100));
  st.hero.gold += gold;
  st.totals.goldEarned += gold;
  st.daily.gold += gold;
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
    st.modal = { t: "death", lost };
    pushLog(st, "Вы пали. Гоблины уже делят ваши ботинки");
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
    battle: { zone: 0, wave: 1, enemy: null, heroT: 0, enemyT: 0, dotDps: 0, dotT: 0, cds: {}, fx: [], log: [], paused: false },
    zones: 1, bossDone: ZONES.map(() => false),
    totals: { kills: 0, bosses: 0, crits: 0, goldEarned: 0, dmgDealt: 0, items: 0, legendaries: 0, maxWave: 0, deaths: 0, casts: 0, potions: 0, events: 0, questsDone: 0 },
    achClaimed: [], questsClaimed: [], buffs: [], toasts: [],
    modal: { t: "class" },
    daily: { date: todayStr(), kills: 0, bosses: 0, gold: 0, claimed: [] },
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
      st.battle.heroT = 0; st.battle.enemyT = 0; st.battle.dotT = 0; st.battle.paused = false;
      st.battle.enemy = spawnEnemy(a.zone, 1);
      pushLog(st, `Вы вошли в «${ZONES[a.zone].name}»`);
      return st;
    }

    case "CAST": {
      const def = SKILLS.find(k => k.id === a.id);
      if (!def || def.classId !== s.hero.classId) return s;
      const st = { ...s, battle: { ...s.battle, cds: { ...s.battle.cds }, fx: [...s.battle.fx], log: [...s.battle.log] }, totals: { ...s.totals } };
      if (s.hero.level < def.unlockLevel) { toast(st, `${def.name}: откроется на ${def.unlockLevel} уровне`, "warn"); return st; }
      if (!st.battle.enemy || st.battle.paused) return s;
      if ((st.battle.cds[a.id] || 0) > 0) return s;
      st.battle.cds[a.id] = def.cd;
      st.totals.casts += 1;
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

    case "REVIVE": {
      const st = { ...s, hero: { ...s.hero }, battle: { ...s.battle, log: [...s.battle.log] }, modal: null };
      st.hero.hp = Math.round(getStats(st).maxHp * 0.6);
      st.battle.paused = false;
      st.battle.enemyT = 0;
      st.battle.heroT = 0;
      pushLog(st, "Вы воскресли. Слегка помятый, но злой");
      return st;
    }

    case "CLOSE_MODAL": return { ...s, modal: null };
    case "DISMISS_TOAST": return { ...s, toasts: s.toasts.filter(t => t.id !== a.id) };
    case "RESET": {
      try { localStorage.removeItem(SAVE_KEY); } catch { /* noop */ }
      return newGame();
    }
    default: return s;
  }
}

/* =============== tick =============== */
function tick(s: GameState, dt: number): GameState {
  if (!s.battle.enemy && !s.battle.fx.length && !s.buffs.length) {
    // still need daily rollover
    if (s.daily.date !== todayStr()) return { ...s, daily: { date: todayStr(), kills: 0, bosses: 0, gold: 0, claimed: [] } };
    return s;
  }
  const st: GameState = {
    ...s,
    hero: { ...s.hero },
    totals: { ...s.totals },
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
  s.battle = { ...s.battle, fx: [] };
  if (s.daily?.date !== todayStr()) s.daily = { date: todayStr(), kills: 0, bosses: 0, gold: 0, claimed: [] };

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
