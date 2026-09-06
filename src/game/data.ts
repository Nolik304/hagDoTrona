import type { BaseSlot, ClassId, Item, Rarity, StatKey } from "./types";

/* ================= CLASSES ================= */
export const CLASSES: Record<ClassId, {
  name: string; title: string; desc: string; color: string;
  base: { dmg: number; as: number; hp: number; crit: number };
}> = {
  mage: {
    name: "Маг", title: "Пиро-бездельник", color: "#4cc3ff",
    desc: "Бьёт редко, но так, что у боссов отваливается полоска HP. Стеклянная пушка с манией величия.",
    base: { dmg: 9.5, as: 0.85, hp: 95, crit: 5 },
  },
  archer: {
    name: "Лучница", title: "Штурмовик кустов", color: "#4ade80",
    desc: "Строчит стрелами как пулемёт, уворачивается от налогов и медленно, но верно закликивает врагов.",
    base: { dmg: 6.2, as: 1.4, hp: 115, crit: 9 },
  },
};

/* ================= SKILLS ================= */
export interface SkillDef {
  id: string; classId: ClassId; name: string; icon: string; cd: number;
  unlockLevel: number; desc: (lvl: number) => string;
  kind: "burst" | "multi" | "dot";
  mult: (lvl: number) => number; // per hit
  hits: (lvl: number) => number;
  dotPct?: (lvl: number) => number; // % of dmg per second
  slow?: boolean;
}

export const SKILLS: SkillDef[] = [
  {
    id: "fireball", classId: "mage", name: "Огненный шар", icon: "flame", cd: 6, unlockLevel: 1,
    kind: "burst", mult: l => 2.1 + 0.45 * l, hits: () => 1,
    desc: l => `Сгусток пламени на ${(210 + 45 * l)}% урона. Поджаривает даже совесть.`,
  },
  {
    id: "frost", classId: "mage", name: "Ледяной раскол", icon: "snow", cd: 10, unlockLevel: 3,
    kind: "burst", mult: l => 3 + 0.6 * l, hits: () => 1, slow: true,
    desc: l => `Лёд на ${(300 + 60 * l)}% урона, враг цепенеет и пропускает замах.`,
  },
  {
    id: "meteor", classId: "mage", name: "Метеор «Хрум»", icon: "meteor", cd: 24, unlockLevel: 6,
    kind: "burst", mult: l => 6.5 + 1.1 * l, hits: () => 1,
    desc: l => `Небо падает на ${(650 + 110 * l)}% урона. Боссы пишут жалобы.`,
  },
  {
    id: "triple", classId: "archer", name: "Тройной выстрел", icon: "arrows", cd: 6, unlockLevel: 1,
    kind: "multi", mult: l => 1.05 + 0.22 * l, hits: () => 3,
    desc: l => `3 стрелы по ${(105 + 22 * l)}% урона. Одна — в цель, две — для стиля.`,
  },
  {
    id: "poison", classId: "archer", name: "Гнилая стрела", icon: "venom", cd: 9, unlockLevel: 3,
    kind: "dot", mult: l => 1.1 + 0.2 * l, hits: () => 1, dotPct: l => 0.45 + 0.09 * l,
    desc: l => `Удар ${(110 + 20 * l)}% + яд ${(45 + 9 * l)}% урона/сек на 5 сек.`,
  },
  {
    id: "rain", classId: "archer", name: "Ливень стрел", icon: "rain", cd: 22, unlockLevel: 6,
    kind: "multi", mult: l => 0.7 + 0.13 * l, hits: () => 8,
    desc: l => `8 стрел по ${(70 + 13 * l)}% урона. Погода: дождь, местами боль.`,
  },
];

export const skillCost = (lvl: number) => Math.round(70 * Math.pow(2.15, lvl - 1));

/* ================= PASSIVES ================= */
export interface PassiveDef {
  id: string; name: string; icon: string; max: number;
  desc: (rank: number) => string; stat: string;
}
export const PASSIVES: PassiveDef[] = [
  { id: "power", name: "Мощь", icon: "sword", max: 10, stat: "dmgPct", desc: r => `+${8 * r}% к урону` },
  { id: "focus", name: "Фокус", icon: "target", max: 10, stat: "crit", desc: r => `+${(2.5 * r).toFixed(1)}% шанса крита` },
  { id: "vitality", name: "Живучесть", icon: "heart", max: 10, stat: "hpPct", desc: r => `+${8 * r}% к здоровью` },
  { id: "skin", name: "Каменная кожа", icon: "shield", max: 10, stat: "armor", desc: r => `+${6 * r} брони` },
  { id: "greed", name: "Жадность", icon: "coin", max: 10, stat: "goldPct", desc: r => `+${8 * r}% золота с врагов` },
  { id: "wisdom", name: "Мудрость", icon: "scroll", max: 10, stat: "xpPct", desc: r => `+${7 * r}% опыта` },
  { id: "fortune", name: "Удача", icon: "clover", max: 10, stat: "luck", desc: r => `+${5 * r}% к шансу дропа` },
  { id: "treasury", name: "Скрытая казна", icon: "chest", max: 10, stat: "offline", desc: r => `+${12 * r}% к офлайн-доходу` },
];

/* ================= ZONES & MOBS ================= */
export interface ZoneDef {
  name: string; flavor: string; mobs: string[]; boss: string; tint: string; endless?: boolean;
}
export const ZONES: ZoneDef[] = [
  { name: "Прелый лес", flavor: "Пахнет грибами и плохими решениями", mobs: ["slime", "shroom", "wolf"], boss: "treant", tint: "#7dc95e" },
  { name: "Костяные пещеры", flavor: "Скелеты тут работают за еду. Которую не едят", mobs: ["skel", "rat", "bat"], boss: "boneTyrant", tint: "#c9d4de" },
  { name: "Логово разбойников", flavor: "Вход бесплатный. Выход — по тарифу", mobs: ["bandit", "thrower", "ogre"], boss: "ataman", tint: "#e0a34e" },
  { name: "Цитадель Пустоты", flavor: "Здесь даже эхо говорит шёпотом", mobs: ["wisp", "golem", "acolyte"], boss: "devourer", tint: "#9b7bd8" },
  { name: "Бездна", flavor: "Бесконечный этаж. Лифт не предусмотрен", mobs: ["voidling", "golem", "wisp"], boss: "voidmaw", tint: "#ff6b8d", endless: true },
];

export const MOBS: Record<string, { n: string; c1: string; c2: string }> = {
  slime: { n: "Слизень-бухгалтер", c1: "#8ee06e", c2: "#4f8f3a" },
  shroom: { n: "Гнилошляп", c1: "#e06a5a", c2: "#8f3b30" },
  wolf: { n: "Лютый волк", c1: "#9fb2c8", c2: "#5a6b80" },
  treant: { n: "Гнилодрев", c1: "#7a5a34", c2: "#4a3620" },
  skel: { n: "Скелет-работяга", c1: "#e8e2d0", c2: "#9a947f" },
  rat: { n: "Крысолюд", c1: "#b08d6a", c2: "#6e5638" },
  bat: { n: "Летуха-крикуха", c1: "#8a7fae", c2: "#544b70" },
  boneTyrant: { n: "Костяной Тиран", c1: "#f0ead8", c2: "#a89f85" },
  bandit: { n: "Разбойник", c1: "#c8794a", c2: "#7c4526" },
  thrower: { n: "Метатель ножей", c1: "#a8b8c8", c2: "#5f7185" },
  ogre: { n: "Огр-вышибала", c1: "#9fbf6a", c2: "#5e7a3a" },
  ataman: { n: "Атаман Шлык", c1: "#d8a04a", c2: "#8a5f22" },
  wisp: { n: "Блуждающий огонёк", c1: "#7fe0d0", c2: "#2a8f80" },
  golem: { n: "Голем-консьерж", c1: "#8a93a8", c2: "#4a5266" },
  acolyte: { n: "Послушник Пустоты", c1: "#b49ae0", c2: "#6a4fa0" },
  devourer: { n: "Пожиратель Пустоты", c1: "#c77fe0", c2: "#7a2aa0" },
  voidling: { n: "Отголосок Бездны", c1: "#ff8fae", c2: "#a03a5f" },
  voidmaw: { n: "Отродье Бездны", c1: "#ff6b8d", c2: "#8f1f4a" },
};

export const KILL_PHRASES = [
  "{e} рассыпался на пиксели",
  "{e} ушёл перерождаться в жабу",
  "{e} выронил всё и обиделся",
  "Крит! {e} пишет жалобу в гильдию",
  "{e} узнал, что такое баланс... урона",
  "{e} передал привет респауну",
  "{e} выбыл. Ставки сделаны",
  "{e} телепортировался в небытие",
];

/* ================= ITEMS ================= */
export const RARITY: { name: string; color: string; mult: number }[] = [
  { name: "Обычный", color: "#9aa4b2", mult: 1 },
  { name: "Необычный", color: "#4ade80", mult: 1.35 },
  { name: "Редкий", color: "#38bdf8", mult: 1.8 },
  { name: "Эпический", color: "#c084fc", mult: 2.4 },
  { name: "Легендарный", color: "#fbbf24", mult: 3.2 },
  { name: "Бездна", color: "#ff4d6d", mult: 4.4 },
];

/* ================= СЕТ БЕЗДНЫ (Портал) ================= */
export const ABYSS_SET: Partial<Record<BaseSlot, { name: string; stats: Partial<Record<StatKey, number>> }>> = {
  weapon: { name: "Коготь Пожирателя", stats: { dmg: 16, dmgPct: 14, crit: 6 } },
  helm: { name: "Венец Пустоты", stats: { hp: 90, armor: 22, xpPct: 8 } },
  amulet: { name: "Око Бездны", stats: { crit: 9, critDmg: 28, dmgPct: 10 } },
  armor: { name: "Панцирь Отродья", stats: { armor: 30, hp: 120, regen: 1.4 } },
  gloves: { name: "Когтистые перчатки Бездны", stats: { as: 12, crit: 6, dmgPct: 8 } },
  boots: { name: "Поступь Тьмы", stats: { armor: 18, goldPct: 16, hp: 60 } },
  ring: { name: "Печатка Отродья", stats: { critDmg: 24, luck: 10, dmgPct: 10 } },
};
export const ABYSS_SET_BONUS = 3; // % урона и HP за каждую надетую вещь сета

export const SLOT_INFO: Record<BaseSlot, { n: string; icon: string }> = {
  weapon: { n: "Оружие", icon: "sword" },
  helm: { n: "Шлем", icon: "helm" },
  amulet: { n: "Амулет", icon: "amulet" },
  armor: { n: "Доспех", icon: "shield" },
  gloves: { n: "Перчатки", icon: "gloves" },
  boots: { n: "Сапоги", icon: "boots" },
  ring: { n: "Кольцо", icon: "ring" },
};

const BASE_NAMES: Record<BaseSlot, string[]> = {
  weapon: ["Клинок", "Жезл", "Посох", "Лук", "Кинжал", "Молот"],
  helm: ["Шлем", "Капюшон", "Венец", "Каска", "Тиара"],
  amulet: ["Амулет", "Кулон", "Оберег", "Медальон"],
  armor: ["Кираса", "Мантия", "Кольчуга", "Нагрудник"],
  gloves: ["Перчатки", "Рукавицы", "Наручи"],
  boots: ["Сапоги", "Ботинки", "Поножи"],
  ring: ["Кольцо", "Перстень", "Печатка"],
};

const PREFIX: string[][] = [
  ["Ржавый", "Потрёпанный", "Б/у"],
  ["Крепкий", "Ладный", "Смазанный"],
  ["Зачарованный", "Сияющий", "Грозный"],
  ["Проклятый", "Древний", "Бездонный"],
  ["Легендарный", "Божественный", "Хтонический"],
];

const SUFFIX = [
  "великого пончика", "хромой утки", "тысячи лягушек", "Грязного Шлыка",
  "последнего понедельника", "сырого подвала", "жадного гоблина",
  "утреннего кофе", "злого тапка", "восьмого носка",
];

const SLOT_STATS: Record<BaseSlot, StatKey[]> = {
  weapon: ["dmg", "dmgPct", "crit"],
  helm: ["hp", "armor", "xpPct"],
  amulet: ["crit", "dmgPct", "critDmg"],
  armor: ["armor", "hp", "regen"],
  gloves: ["as", "crit", "dmgPct"],
  boots: ["armor", "goldPct", "hp"],
  ring: ["critDmg", "luck", "dmgPct", "goldPct"],
};

const STAT_BASE: Record<StatKey, (ilvl: number) => number> = {
  dmg: il => 2 + il * 0.85,
  dmgPct: il => 3 + il * 0.12,
  hp: il => 9 + il * 2.1,
  armor: il => 1.5 + il * 0.45,
  crit: () => 2,
  critDmg: () => 7,
  as: () => 3,
  goldPct: () => 4,
  xpPct: () => 4,
  luck: () => 2.5,
  regen: () => 0.35,
};

export const STAT_LABEL: Record<StatKey, string> = {
  dmg: "Урон", dmgPct: "Урон %", hp: "Здоровье", armor: "Броня",
  crit: "Крит %", critDmg: "Крит. урон %", as: "Скор. атаки %",
  goldPct: "Золото %", xpPct: "Опыт %", luck: "Удача %", regen: "Реген %/с",
};

export function rollRarity(min: number, luck: number): Rarity {
  const w = [46 - luck * 0.2, 27, 15 + luck * 0.1, 8 + luck * 0.08, 4 + luck * 0.05];
  for (let i = 0; i < min; i++) w[i] = 0;
  const sum = w.reduce((a, b) => a + b, 0);
  let r = Math.random() * sum;
  for (let i = 0; i < 5; i++) { r -= w[i]; if (r <= 0) return i as Rarity; }
  return 4;
}

export function genItem(ilvl: number, minRarity: number, classId: ClassId, luck: number, uid: number): Item {
  const rarity = rollRarity(minRarity, luck);
  const base = (Object.keys(SLOT_STATS) as BaseSlot[])[Math.floor(Math.random() * 7)];
  const pool = [...SLOT_STATS[base]];
  const nStats = rarity <= 1 ? rarity + 1 : rarity <= 3 ? 3 : 3;
  const stats: Partial<Record<StatKey, number>> = {};
  for (let i = 0; i < nStats && pool.length; i++) {
    const idx = Math.floor(Math.random() * pool.length);
    const key = pool.splice(idx, 1)[0];
    let v = STAT_BASE[key](ilvl) * RARITY[rarity].mult * (0.85 + Math.random() * 0.3);
    if (key === "dmg" && base === "weapon") v *= classId === "mage" ? 1.25 : 0.9;
    stats[key] = key === "dmg" || key === "hp" ? Math.round(v) : Math.round(v * 10) / 10;
  }
  const names = BASE_NAMES[base];
  let name = `${PREFIX[rarity][Math.floor(Math.random() * 3)]} ${names[Math.floor(Math.random() * names.length)].toLowerCase()}`;
  if (rarity >= 2 && Math.random() < 0.55) name += ` ${SUFFIX[Math.floor(Math.random() * SUFFIX.length)]}`;
  if (base === "weapon") {
    if (classId === "mage") name = name.replace(/^(\w+)\s(лук|кинжал|молот|клинок)/i, "$1 посох");
    if (classId === "archer") name = name.replace(/^(\w+)\s(посох|жезл|молот)/i, "$1 лук");
  }
  const sell = Math.round(Math.pow(rarity + 1, 2.1) * 9 + ilvl * 1.4);
  return { uid, base, name, rarity, ilvl, stats, sell };
}

export const INV_CAP = 40;

/* ================= QUESTS ================= */
export interface QuestDef {
  id: string; title: string; desc: string; metric: string; target: number;
  reward: { gold?: number; gems?: number; tokens?: number }; flavor: string;
}

/* ================= КАМЕНЬ БОГА ================= */
export const GODSTONE = {
  price: 40, // кристаллы за пробуждение
  cost: (lvl: number) => Math.round(400 * Math.pow(1.33, lvl)),
  chance: (lvl: number) => Math.max(1.5, Math.round(90 * Math.pow(0.92, lvl) * 10) / 10),
  desc: "бесконечная шкала: урон, HP, крит, скорость, удача, золото, опыт, броня",
};

/* ================= ДУЭЛИ ================= */
export const DUEL_NAMES = [
  "Шмыга Одноглазый", "Барон фон Тыква", "Лысый Джакомо", "Сэр Помидор",
  "Хозяйка Болота", "Граф Носок", "Ведьма с 8-го этажа", "Кузнец Хряк",
  "Тёмный Олег", "Инквизитор Булка", "Паладин Штифт", "Жнец-стажёр",
  "Королева Слизней", "Гном-переросток", "Мастер Меча (самоучка)", "Тень Утюга",
];
export const mmrRank = (mmr: number) =>
  mmr < 900 ? "Новичок" : mmr < 1150 ? "Боец" : mmr < 1400 ? "Гладиатор" :
  mmr < 1650 ? "Чемпион" : mmr < 1900 ? "Мастер" : "Легенда Бездны";
export const DUEL_TOKENS_START = 3;
export const DUEL_TOKENS_MAX = 10;
export const QUESTS: QuestDef[] = [
  { id: "q1", title: "Разминка", desc: "Победи 15 врагов", metric: "kills", target: 15, reward: { gold: 120 }, flavor: "Гильдия даёт новичкам самое грязное дело. Держи метлу... то есть меч." },
  { id: "q2", title: "Приодеться", desc: "Надень 3 предмета экипировки", metric: "equippedCount", target: 3, reward: { gold: 200, gems: 3 }, flavor: "Голый герой — плохая реклама для гильдии." },
  { id: "q3", title: "Фокус-покус", desc: "Примени навыки 5 раз", metric: "casts", target: 5, reward: { gold: 180 }, flavor: "Кнопки внизу сами себя не нажмут." },
  { id: "q4", title: "Первая голова", desc: "Победи босса", metric: "bosses", target: 1, reward: { gems: 10 }, flavor: "Гнилодрев сам себя не срубит." },
  { id: "q5", title: "Пятый уровень", desc: "Достигни 5 уровня", metric: "level", target: 5, reward: { gold: 350 }, flavor: "Борода растёт — опыт капает." },
  { id: "q6", title: "Гроза леса", desc: "Одолей босса Прелого леса", metric: "boss1", target: 1, reward: { gems: 12 }, flavor: "Лес больше не пахнет плохими решениями. Только пеплом." },
  { id: "q7", title: "Плюшкин", desc: "Собери 12 предметов в рюкзаке", metric: "invCount", target: 12, reward: { gold: 500 }, flavor: "«А вдруг пригодится» — девиз всех великих." },
  { id: "q8", title: "Заклинатель", desc: "Примени навыки 30 раз", metric: "casts", target: 30, reward: { gems: 15 }, flavor: "Мана не бесконечна. А вот энтузиазм — да." },
  { id: "q9", title: "Владыка пещер", desc: "Одолей Костяного Тирана", metric: "boss2", target: 1, reward: { gems: 25 }, flavor: "Тиран пал. В пещерах ввели демократию скелетов." },
  { id: "q10", title: "Легенда Бездны", desc: "Добудь легендарный предмет", metric: "legendaries", target: 1, reward: { gems: 50 }, flavor: "О таком луте слагают баллады. Призрак барда уже записывает." },
];

export const DAILIES: QuestDef[] = [
  { id: "d1", title: "Ежедневная зачистка", desc: "Победи 100 врагов сегодня", metric: "dkills", target: 100, reward: { gold: 250 }, flavor: "" },
  { id: "d2", title: "Охота на главаря", desc: "Победи 1 босса сегодня", metric: "dbosses", target: 1, reward: { gems: 5, tokens: 1 }, flavor: "" },
  { id: "d3", title: "Золотая лихорадка", desc: "Заработай 2000 золота сегодня", metric: "dgold", target: 2000, reward: { gems: 3 }, flavor: "" },
];

export const WEEKLIES: QuestDef[] = [
  { id: "w1", title: "Неделя зачистки", desc: "Победи 500 врагов за неделю", metric: "wkills", target: 500, reward: { gold: 1500, gems: 15 }, flavor: "Гильдия объявила тотальную зачистку. Слизни создают профсоюз." },
  { id: "w2", title: "Гроза главарей", desc: "Победи 5 боссов за неделю", metric: "wbosses", target: 5, reward: { gems: 30, tokens: 2 }, flavor: "Пять голов — пять наград. Боссы скидываются на адвоката." },
  { id: "w3", title: "Скиллодром", desc: "Примени навыки 100 раз за неделю", metric: "wcasts", target: 100, reward: { gold: 1000, gems: 10 }, flavor: "Кнопки стёрлись до дыр. Это считается за кардио." },
];

/* ================= ACHIEVEMENTS ================= */
export const ACHS: QuestDef[] = [
  { id: "a1", title: "Зачистка", desc: "100 побед", metric: "kills", target: 100, reward: { gems: 5 }, flavor: "" },
  { id: "a2", title: "Конвейер смерти", desc: "1000 побед", metric: "kills", target: 1000, reward: { gems: 20 }, flavor: "" },
  { id: "a3", title: "Гроза боссов", desc: "5 боссов", metric: "bosses", target: 5, reward: { gems: 15 }, flavor: "" },
  { id: "a4", title: "Меткий глаз", desc: "100 критов", metric: "crits", target: 100, reward: { gems: 5 }, flavor: "" },
  { id: "a5", title: "Скряга", desc: "10 000 золота за всё время", metric: "goldEarned", target: 10000, reward: { gems: 10 }, flavor: "" },
  { id: "a6", title: "Десятка", desc: "10 уровень", metric: "level", target: 10, reward: { gems: 10 }, flavor: "" },
  { id: "a7", title: "Ветеран Бездны", desc: "25 уровень", metric: "level", target: 25, reward: { gems: 30 }, flavor: "" },
  { id: "a8", title: "Охотник за легендами", desc: "1 легендарный предмет", metric: "legendaries", target: 1, reward: { gems: 10 }, flavor: "" },
  { id: "a9", title: "Модник", desc: "Заполни все 8 слотов", metric: "equippedCount", target: 8, reward: { gems: 15 }, flavor: "" },
  { id: "a10", title: "Глубоководье", desc: "Волна 50 (Бездна, волна 10)", metric: "maxWave", target: 50, reward: { gems: 15 }, flavor: "" },
  { id: "a11", title: "Аптечка", desc: "Выпей 10 зелий", metric: "potionsUsed", target: 10, reward: { gems: 5 }, flavor: "" },
  { id: "a12", title: "Бывалый", desc: "Умри хотя бы раз", metric: "deaths", target: 1, reward: { gems: 5 }, flavor: "" },
];

/* ================= EVENTS ================= */
export interface EventDef {
  id: string; icon: string; title: string; text: string;
  options: { label: string; hint: string }[];
}
export const EVENTS: EventDef[] = [
  {
    id: "toad", icon: "toad", title: "Целующаяся жаба",
    text: "Огромная жаба в короне преграждает путь и томно хлопает ресницами. «Поцелуй меня, герой, не пожалеешь... наверное».",
    options: [
      { label: "Поцеловать", hint: "???" },
      { label: "Вежливо отказаться", hint: "+60 золота на дорожные расходы" },
    ],
  },
  {
    id: "chest", icon: "chest", title: "Подозрительный сундук",
    text: "Посреди коридора стоит сундук. Слишком красивый. Из щелей доносится тихое хихиканье.",
    options: [
      { label: "Открыть", hint: "60% — золото, 40% — мимик" },
      { label: "Обойти", hint: "+40 опыта за осторожность" },
    ],
  },
  {
    id: "bard", icon: "ghost", title: "Призрак барда",
    text: "Полупрозрачный бард настраивает лютню: «О, герой! Баллада о твоих подвигах? Оплата — по настроению».",
    options: [
      { label: "Послушать балладу", hint: "Опыт и лёгкая грусть" },
      { label: "Кинуть 40 золота", hint: "Карма гоблина: +60% дропа на 2 мин" },
    ],
  },
  {
    id: "goblin", icon: "goblin", title: "Гоблин-стажёр",
    text: "«Здрасьте, я гоблин-стажёр из лавки. Шеф послал торговать в поле. Зелье будете? Почти не кусается».",
    options: [
      { label: "Купить зелье (60 зол.)", hint: "+1 зелье" },
      { label: "Послать в лес", hint: "Он и так знает дорогу" },
    ],
  },
];

/* ================= SHOP ================= */
export interface ShopDef {
  id: string; name: string; desc: string; icon: string;
  cost: number; currency: "gold" | "gems"; kind: "box" | "potion"; minRarity?: number;
}
export const SHOP: ShopDef[] = [
  { id: "box1", name: "Мешок с хламом", desc: "Случайный предмет. Гоблин клянётся, что не кусается", icon: "bag", cost: 160, currency: "gold", kind: "box", minRarity: 0 },
  { id: "box2", name: "Сундук наёмника", desc: "Случайный предмет, необычный или лучше", icon: "chest", cost: 650, currency: "gold", kind: "box", minRarity: 1 },
  { id: "box3", name: "Королевский ларец", desc: "Случайный предмет, редкий или лучше. Блеск!", icon: "crown", cost: 25, currency: "gems", kind: "box", minRarity: 2 },
  { id: "potion", name: "Зелье бодрости", desc: "Лечит 45% HP в бою. На вкус — компот", icon: "flask", cost: 90, currency: "gold", kind: "potion" },
];
export const shopCost = (def: ShopDef, buys: number) =>
  def.kind === "box" ? Math.round(def.cost * Math.pow(1.22, buys)) : def.cost;

/* ================= РОГАЛИК: ДАРЫ БЕЗДНЫ ================= */
export interface RelicDef {
  id: string; name: string; icon: string; max: number; cursed?: boolean;
  desc: (rank: number) => string;
  // какие статы даёт за 1 ранг
  dmgPct?: number; as?: number; crit?: number; critDmg?: number; hpPct?: number;
  luck?: number; goldPct?: number; xpPct?: number; lifesteal?: number; thorns?: number;
  skillLvl?: number; bossGold?: number;
}
export const RELICS: RelicDef[] = [
  { id: "fang", name: "Клык ярости", icon: "fang", max: 3, dmgPct: 25, desc: r => `+${25 * r}% урона` },
  { id: "feather", name: "Перо сокола", icon: "feather", max: 3, as: 18, desc: r => `+${18 * r}% скорости атаки` },
  { id: "eye", name: "Глаз снайпера", icon: "target", max: 3, crit: 12, desc: r => `+${12 * r}% шанса крита` },
  { id: "heart2", name: "Бычье сердце", icon: "heart", max: 3, hpPct: 30, desc: r => `+${30 * r}% макс. HP` },
  { id: "clover2", name: "Клевер гоблина", icon: "clover", max: 3, luck: 25, desc: r => `+${25 * r}% удачи` },
  { id: "magnet", name: "Монетный магнит", icon: "coin", max: 3, goldPct: 35, desc: r => `+${35 * r}% золота` },
  { id: "crystal", name: "Кристалл мудрости", icon: "star", max: 3, xpPct: 30, desc: r => `+${30 * r}% опыта` },
  { id: "blood", name: "Кровавый клык", icon: "venom", max: 3, lifesteal: 8, desc: r => `Вампиризм: ${8 * r}% HP за убийство` },
  { id: "thorn", name: "Шипастая броня", icon: "thorn", max: 3, thorns: 60, desc: r => `Шипы: ${60 * r}% урона врагу за его удар` },
  { id: "focus", name: "Смертельный фокус", icon: "bolt", max: 3, critDmg: 40, desc: r => `+${40 * r}% крит. урона` },
  { id: "gambit", name: "Азарт бездны", icon: "spark", max: 2, skillLvl: 1, desc: r => `+${r} к уровню всех скилов в забеге` },
  { id: "idol", name: "Жадный идол", icon: "crown", max: 2, bossGold: 1, desc: r => `Золото с боссов ×${1 + r}` },
  { id: "cursed", name: "Проклятая сила", icon: "skull", max: 1, cursed: true, dmgPct: 60, hpPct: -25, desc: () => `+60% урона, но −25% макс. HP. Оно того стоит?` },
];

/* ================= РОГАЛИК: АЛТАРЬ (МЕТА) ================= */
export interface MetaDef {
  id: string; name: string; icon: string; max: number; cost: (rank: number) => number;
  desc: (rank: number) => string;
  dmgPct?: number; hpPct?: number; goldPct?: number; luck?: number; headstart?: number;
}
export const META: MetaDef[] = [
  { id: "temper", name: "Закалка", icon: "sword", max: 10, cost: r => 25 * (r + 1), dmgPct: 5, desc: r => `+${5 * r}% урона (везде)` },
  { id: "hide", name: "Шкура носорога", icon: "shield", max: 10, cost: r => 25 * (r + 1), hpPct: 6, desc: r => `+${6 * r}% HP (везде)` },
  { id: "hunch", name: "Предчувствие", icon: "clover", max: 10, cost: r => 20 * (r + 1), luck: 6, desc: r => `+${6 * r}% удачи (везде)` },
  { id: "greed", name: "Алчность", icon: "coin", max: 10, cost: r => 20 * (r + 1), goldPct: 10, desc: r => `+${10 * r}% золота (везде)` },
  { id: "headstart", name: "Фора", icon: "spark", max: 3, cost: r => 60 * (r + 1), headstart: 1, desc: r => `Забег начинается с ${r} случайн. даром(ами)` },
];

export const RUN_WAVES = 20;
export const RUN_BOSS_EVERY = 5;
export const shardReward = (wave: number, bosses: number, win: boolean) =>
  wave * 2 + bosses * 10 + (win ? 100 : 0);

/* ================= VIP ================= */
export interface VipDef {
  name: string; color: string; cost: number;
  goldPct: number; xpPct: number; luck: number; dmgPct: number; hpPct: number; offlinePct: number;
  respawn: number; // секунды до автовоскрешения
  perks: string[];
}
export const VIP_LEVELS: VipDef[] = [
  {
    name: "Бронза", color: "#cd7f32", cost: 150,
    goldPct: 10, xpPct: 5, luck: 0, dmgPct: 0, hpPct: 0, offlinePct: 0, respawn: 2.5,
    perks: ["+10% золото", "+5% опыт", "Воскрешение за 2.5 с"],
  },
  {
    name: "Серебро", color: "#c9d4de", cost: 400,
    goldPct: 18, xpPct: 10, luck: 10, dmgPct: 0, hpPct: 0, offlinePct: 12, respawn: 2,
    perks: ["+18% золото", "+10% опыт", "+10 удача", "+12% офлайн-доход", "Воскрешение за 2 с"],
  },
  {
    name: "Золото", color: "#f0b429", cost: 900,
    goldPct: 28, xpPct: 15, luck: 18, dmgPct: 10, hpPct: 10, offlinePct: 25, respawn: 1.5,
    perks: ["+28% золото", "+15% опыт", "+18 удача", "+10% урон", "+10% HP", "Воскрешение за 1.5 с"],
  },
  {
    name: "Платина", color: "#9fd8e8", cost: 2000,
    goldPct: 40, xpPct: 22, luck: 28, dmgPct: 18, hpPct: 15, offlinePct: 40, respawn: 1,
    perks: ["+40% золото", "+22% опыт", "+28 удача", "+18% урон", "+15% HP", "Воскрешение за 1 с"],
  },
  {
    name: "Бездна", color: "#c084fc", cost: 4500,
    goldPct: 60, xpPct: 30, luck: 40, dmgPct: 30, hpPct: 25, offlinePct: 60, respawn: 0.5,
    perks: ["+60% золото", "+30% опыт", "+40 удача", "+30% урон", "+25% HP", "Воскрешение за 0.5 с"],
  },
];

/* ================= ЗАТОЧКА СЛОТОВ ================= */
// Бонус заточки: +10% ко всем статам предмета в слоте за каждый уровень.
// Привязана к слоту: сменил шмотку — бонус остался.
export const SLOT_UP_BONUS = 10; // % за уровень
export const SLOT_UP_MAX = 25;
export const slotUpCost = (lvl: number, ilvl: number) =>
  Math.round((80 + ilvl * 22) * Math.pow(1.6, lvl));
