import type { CSSProperties, ReactNode } from "react";
import { RARITY, STAT_LABEL, SLOT_INFO } from "../game/data";
import type { Item, Slot } from "../game/types";

/* ================= ICONS ================= */
const P: Record<string, ReactNode> = {
  sword: (<><path d="M14.5 17.5 3 6V3h3l11.5 11.5" /><path d="M13 19l6-6" /><path d="M16 16l4 4" /><path d="M19 21l2-2" /></>),
  bow: (<><path d="M4 20c8-2 14-8 16-16" /><path d="M4 20c2-8 8-14 16-16" /><path d="M4 20 20 4" /><path d="m14 4 6 6" /></>),
  staff: (<><path d="M12 22V8" /><circle cx="12" cy="5" r="3" /><path d="M7 22h10" /></>),
  helm: (<><path d="M4 15v-4a8 8 0 0 1 16 0v4l-2.5 5h-11Z" /><path d="M4 15h16" /><path d="M12 7v4" /></>),
  shield: (<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6Z" />),
  gloves: (<><path d="M7 11V6a2 2 0 0 1 4 0v4V5a2 2 0 0 1 4 0v6" /><path d="M15 11V7a2 2 0 0 1 4 0v7c0 4-2.5 7-6.5 7S7 18 7 14v-3" /></>),
  boots: (<path d="M6 3h6v9l5 3c2 1.2 2 6-1 6H6c-1.5 0-2-1-2-2.5V5c0-1 .8-2 2-2Z" />),
  ring: (<><circle cx="12" cy="14" r="6" /><path d="M9 5l3-3 3 3-3 4Z" /></>),
  amulet: (<><path d="M5 3c2 4 4 6 7 6s5-2 7-6" /><path d="M12 9l4 5-4 7-4-7Z" /></>),
  coin: (<><circle cx="12" cy="12" r="8" /><path d="M12 8v8M9.5 10h4a1.5 1.5 0 0 1 0 3h-3a1.5 1.5 0 0 0 0 3h4" /></>),
  gem: (<><path d="M7 3h10l4 6-9 12L3 9Z" /><path d="M3 9h18M12 21 8.5 9 12 3l3.5 6L12 21" /></>),
  skull: (<><path d="M12 2a8 8 0 0 0-8 8c0 3 1.5 5 3 6v4h10v-4c1.5-1 3-3 3-6a8 8 0 0 0-8-8Z" /><circle cx="9" cy="10" r="1.6" fill="currentColor" /><circle cx="15" cy="10" r="1.6" fill="currentColor" /><path d="M10 20v-2M14 20v-2" /></>),
  star: (<path d="m12 2 3 6.6 7 .8-5.2 4.8L18.2 21 12 17.4 5.8 21l1.4-6.8L2 9.4l7-.8Z" />),
  heart: (<path d="M12 21S4 15 4 9.5A4.5 4.5 0 0 1 12 6a4.5 4.5 0 0 1 8 3.5C20 15 12 21 12 21Z" />),
  bolt: (<path d="M13 2 4 14h6l-1 8 9-12h-6Z" />),
  flame: (<path d="M12 2s6 5 6 11a6 6 0 0 1-12 0c0-2 1-4 2-5 0 2 1 3 2 3-1-3 0-7 2-9Z" />),
  snow: (<><path d="M12 2v20M4 6l16 12M20 6 4 18" /><path d="m9 4 3 2 3-2M9 20l3-2 3 2" /></>),
  meteor: (<><circle cx="15" cy="15" r="6" /><path d="M3 3l6 6M9 2l4 4M2 9l4 4" /></>),
  arrows: (<><path d="m5 4 4 4-4 4" /><path d="m11 4 4 4-4 4" /><path d="M17 20V4" /><path d="m14 7 3-3 3 3" /></>),
  venom: (<><path d="M12 2s7 8 7 13a7 7 0 0 1-14 0c0-5 7-13 7-13Z" /><circle cx="9.5" cy="14" r="1" fill="currentColor" /><circle cx="14.5" cy="14" r="1" fill="currentColor" /></>),
  rain: (<><path d="M12 3v4M7 5v5M17 5v5M9.5 12v6M14.5 12v6M12 16v5" /><path d="m10 21 2 2 2-2" /></>),
  target: (<><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="4.5" /><circle cx="12" cy="12" r="0.8" fill="currentColor" /></>),
  clover: (<><circle cx="12" cy="7" r="4" /><circle cx="7.5" cy="12.5" r="4" /><circle cx="16.5" cy="12.5" r="4" /><path d="M12 14v8" /></>),
  chest: (<><rect x="3" y="8" width="18" height="12" rx="2" /><path d="M3 12h18M12 10v4" /><path d="M5 8c0-3 3-5 7-5s7 2 7 5" /></>),
  crown: (<path d="M4 18 3 7l5 4 4-7 4 7 5-4-1 11Z" />),
  ghost: (<><path d="M12 2a8 8 0 0 0-8 8v12l3-2.5L10 22l2-2 2 2 3-2.5L20 22V10a8 8 0 0 0-8-8Z" /><circle cx="9" cy="10" r="1.4" fill="currentColor" /><circle cx="15" cy="10" r="1.4" fill="currentColor" /></>),
  toad: (<><path d="M4 16c0-6 4-10 8-10s8 4 8 10-3 6-8 6-8 0-8-6Z" /><circle cx="8" cy="7" r="2.5" /><circle cx="16" cy="7" r="2.5" /><path d="M8 17q4 3 8 0" /></>),
  goblin: (<><path d="M12 3c5 0 8 3.5 8 8 0 5-3.5 9-8 9s-8-4-8-9c0-4.5 3-8 8-8Z" /><path d="M4 11 1 9M20 11l3-2" /><circle cx="9" cy="11" r="1.2" fill="currentColor" /><circle cx="15" cy="11" r="1.2" fill="currentColor" /><path d="M9 16q3 2 6 0" /></>),
  scroll: (<><path d="M6 3h12a2 2 0 0 1 2 2v2h-4" /><path d="M6 3a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7" /><path d="M8 11h6M8 15h6" /></>),
  flask: (<><path d="M10 2v6L4 19a2 2 0 0 0 2 3h12a2 2 0 0 0 2-3L14 8V2" /><path d="M8 2h8M7 15h10" /></>),
  gear: (<><circle cx="12" cy="12" r="3.5" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.5 4.5l2 2M17.5 17.5l2 2M19.5 4.5l-2 2M6.5 17.5l-2 2" /></>),
  check: (<path d="m4 12.5 5 5L20 6.5" />),
  lock: (<><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></>),
  x: (<path d="M5 5l14 14M19 5 5 19" />),
  plus: (<path d="M12 5v14M5 12h14" />),
  dots: (<><circle cx="5" cy="12" r="1.6" fill="currentColor" /><circle cx="12" cy="12" r="1.6" fill="currentColor" /><circle cx="19" cy="12" r="1.6" fill="currentColor" /></>),
  map: (<><path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2Z" /><path d="M9 4v14M15 6v14" /></>),
  trophy: (<><path d="M8 4h8v6a4 4 0 0 1-8 0Z" /><path d="M8 5H4c0 4 2 6 4 6M16 5h4c0 4-2 6-4 6" /><path d="M12 14v4M8 21h8M10 18h4v3h-4Z" /></>),
  user: (<><circle cx="12" cy="8" r="4.5" /><path d="M4 21c1-4.5 4-7 8-7s7 2.5 8 7" /></>),
  bag: (<><path d="M5 8h14l-1.2 12a2 2 0 0 1-2 1.8H8.2a2 2 0 0 1-2-1.8Z" /><path d="M8.5 10V6.5a3.5 3.5 0 0 1 7 0V10" /></>),
  spark: (<path d="M12 2 14 9l7 3-7 3-2 7-2-7-7-3 7-3Z" />),
  share: (<><circle cx="6" cy="12" r="3" /><circle cx="18" cy="6" r="3" /><circle cx="18" cy="18" r="3" /><path d="m8.7 10.6 6.6-3.2M8.7 13.4l6.6 3.2" /></>),
  refresh: (<><path d="M20 8A8 8 0 1 0 21 13" /><path d="M21 3v5h-5" /></>),
  info: (<><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8v.5" /></>),
  wave: (<path d="M2 12c2-4 4-4 6 0s4 4 6 0 4-4 6 0" />),
  gate: (<><path d="M4 21V10a8 8 0 0 1 16 0v11" /><path d="M2 21h20" /><path d="M9 21v-8a3 3 0 0 1 6 0v8" /><path d="M12 2v3M8 3l1 2M16 3l-1 2" /></>),
  stone: (<><path d="M12 2 5 8l2 12h10l2-12Z" /><path d="M5 8h14M12 2v18M9.5 8 12 20l2.5-12" /></>),
  crossed: (<><path d="M4 4l14 14M20 4 6 18" /><path d="M4 4l3 .5L18.5 16M20 4l-3 .5L5.5 16" /><path d="m5 19 2-2M19 19l-2-2" /></>),
  drop: (<><path d="M12 3s6 7 6 11.5a6 6 0 0 1-12 0C6 10 12 3 12 3Z" /><path d="M9.5 14a2.5 2.5 0 0 0 2.5 2.5" /></>),
  ticket: (<><path d="M3 8a2 2 0 0 0 2-2h14a2 2 0 0 0 2 2v3a2 2 0 0 0 0 2v3a2 2 0 0 0-2 2H5a2 2 0 0 0-2-2v-3a2 2 0 0 0 0-2Z" /><path d="M14 6v12" strokeDasharray="2 2.5" /></>),
  book: (<><path d="M4 4h9a3 3 0 0 1 3 3v13H7a3 3 0 0 1-3-3Z" /><path d="M16 8h4v12h-4" /><path d="M8 8h4M8 12h4" /></>),
  run: (<><circle cx="14" cy="5" r="2.2" /><path d="M6 21l3-6 3-2-1-5 4 2 3 2M9 8 5 10l1 4" /></>),
  fang: (<path d="M12 2c4 0 7 4 7 9 0 6-4 11-7 11S5 17 5 11c0-5 3-9 7-9Zm0 3c-2 0-4 3-4 6 0 4 2.5 8 4 8s4-4 4-8c0-3-2-6-4-6Z" />),
  feather: (<><path d="M20 4c-6 0-12 5-13 13 6 0 12-4 13-13Z" /><path d="M7 17 4 20M9 15l6-6M11 17l6-6" /></>),
  thorn: (<><path d="M12 2 9 8l-7 1 5 5-1.5 8L12 18l6.5 4L17 14l5-5-7-1Z" /></>),
  shard: (<><path d="M12 2 7 8l2 13h6l2-13Z" /><path d="M12 2 12 21" /></>),
  route: (<><circle cx="6" cy="5" r="2.2" /><circle cx="18" cy="19" r="2.2" /><path d="M6 7.5V12a3 3 0 0 0 3 3h6a3 3 0 0 1 3 3v-1.5" strokeDasharray="3 2.5" /></>),
};

export function Icon({ n, className = "w-5 h-5", filled = false, style }: {
  n: string; className?: string; filled?: boolean; style?: CSSProperties;
}) {
  return (
    <svg viewBox="0 0 24 24" className={className} style={style} fill={filled ? "currentColor" : "none"}
      stroke="currentColor" strokeWidth={filled ? 0 : 2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {P[n] ?? P.spark}
    </svg>
  );
}

export const slotIcon = (slot: Slot, classId?: "mage" | "archer"): string => {
  if (slot === "weapon") return classId === "archer" ? "bow" : "staff";
  if (slot === "ring1" || slot === "ring2") return "ring";
  return SLOT_INFO[slot].icon;
};

/* ================= BARS ================= */
export function Bar({ v, max, color, h = "h-3", shine = false, className = "" }: {
  v: number; max: number; color: string; h?: string; shine?: boolean; className?: string;
}) {
  const pct = Math.max(0, Math.min(100, (v / Math.max(1, max)) * 100));
  return (
    <div className={`relative w-full ${h} rounded-full bg-black/50 border border-white/5 overflow-hidden ${className}`}>
      <div className="absolute inset-y-0 left-0 rounded-full transition-[width] duration-300 ease-out"
        style={{ width: pct + "%", background: `linear-gradient(180deg, ${color}, ${color}bb)`, boxShadow: `0 0 10px ${color}66` }} />
      {shine && pct > 4 && (
        <div className="absolute inset-y-0 left-0 rounded-full overflow-hidden transition-[width] duration-300" style={{ width: pct + "%" }}>
          <div className="absolute inset-x-0 top-0 h-1/2 bg-white/25 rounded-full" />
        </div>
      )}
    </div>
  );
}

/* ================= RARITY & ITEMS ================= */
export const rarColor = (r: number) => RARITY[r]?.color ?? "#9aa4b2";

export function ItemRow({ it, children }: { it: Item; children?: ReactNode }) {
  const c = rarColor(it.rarity);
  return (
    <div className="panel p-2.5 flex items-center gap-2.5"
      style={{ borderColor: c + (it.rarity >= 3 ? "88" : "40"), boxShadow: it.rarity >= 3 ? `0 0 14px ${c}33, inset 0 1px 0 rgba(255,255,255,0.04)` : undefined }}>
      <div className="w-11 h-11 shrink-0 rounded-lg grid place-items-center border"
        style={{ background: `linear-gradient(160deg, ${c}26, ${c}0a)`, borderColor: c + "55", color: c }}>
        <Icon n={SLOT_INFO[it.base].icon} className="w-6 h-6" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate font-semibold text-[13px] leading-tight" style={{ color: c }}>{it.name}</div>
        <div className="text-[11px] text-dim leading-tight mt-0.5">
          <span style={{ color: c }}>{RARITY[it.rarity].name}</span> · мощь {it.ilvl} · {Object.entries(it.stats).map(([k, v]) => `${STAT_LABEL[k as keyof typeof STAT_LABEL]} +${v}`).join(", ")}
        </div>
      </div>
      {children}
    </div>
  );
}

export function CoinText({ n, icon, color }: { n: string; icon: string; color: string }) {
  return (
    <span className="inline-flex items-center gap-1 font-bold tabular-nums" style={{ color }}>
      <Icon n={icon} className="w-4 h-4" filled />{n}
    </span>
  );
}

export function SectionTitle({ icon, children, right }: { icon?: string; children: ReactNode; right?: ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-2">
      <div className="flex items-center gap-2 font-display text-[15px] tracking-wide text-fog">
        {icon && <Icon n={icon} className="w-4.5 h-4.5 text-gold" />}{children}
      </div>
      {right}
    </div>
  );
}
