import { useEffect, useState } from "react";
import { GameProvider, useGame } from "./game/useGame";
import { fmt, xpNeed } from "./game/logic";
import { CLASSES, VIP_LEVELS } from "./game/data";
import { Icon } from "./ui/bits";
import { BattleScreen } from "./ui/BattleScreen";
import { HeroTab, InventoryTab } from "./ui/HeroScreens";
import { SkillsScreen } from "./ui/SkillsScreen";
import { MoreScreen } from "./ui/MoreScreen";
import { RunScreen } from "./ui/RunScreen";
import { Modals } from "./ui/Modals";
import { initVK } from "./platform/vk";

type Tab = "battle" | "run" | "hero" | "inv" | "skills" | "more";

function HUD() {
  const { s, stats } = useGame();
  const cls = CLASSES[s.hero.classId];
  const hpPct = (s.hero.hp / stats.maxHp) * 100;
  return (
    <div className="panel px-3 py-2 safe-t">
      <div className="flex items-center gap-2.5">
        <div className="relative w-10 h-10 shrink-0 rounded-xl grid place-items-center border"
          style={{ borderColor: cls.color + "77", background: `linear-gradient(160deg, ${cls.color}26, ${cls.color}0a)`, color: cls.color }}>
          <Icon n={s.hero.classId === "mage" ? "staff" : "bow"} className="w-5 h-5" />
          <span className="absolute -bottom-1.5 -right-1.5 bg-gold text-ink text-[9px] font-display px-1 rounded-md border border-ink leading-tight py-px">
            {s.hero.level}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-1.5">
            <span className="font-display text-[13px] text-fog truncate flex items-center gap-1.5">
              {s.hero.name}
              {s.vip > 0 && (
                <span className="text-[8px] font-display px-1 py-px rounded border leading-none flex items-center gap-0.5"
                  style={{
                    color: VIP_LEVELS[s.vip - 1].color,
                    borderColor: VIP_LEVELS[s.vip - 1].color + "66",
                    background: VIP_LEVELS[s.vip - 1].color + "1a",
                    boxShadow: `0 0 8px ${VIP_LEVELS[s.vip - 1].color}33`,
                  }}>
                  <Icon n="crown" className="w-2.5 h-2.5" />VIP {s.vip}
                </span>
              )}
            </span>
            <span className="text-[9px] text-dim tabular-nums shrink-0">{fmt(s.hero.xp)}/{fmt(xpNeed(s.hero.level))} XP</span>
          </div>
          <div className="relative h-1.5 mt-1 rounded-full bg-black/50 overflow-hidden">
            <div className="absolute inset-y-0 left-0 bg-gradient-to-r from-[#3fd0b6] to-[#7ee8d6] transition-[width] duration-300"
              style={{ width: Math.min(100, (s.hero.xp / xpNeed(s.hero.level)) * 100) + "%" }} />
          </div>
          <div className="relative h-2.5 mt-1 rounded-full bg-black/50 overflow-hidden border border-white/5">
            <div className="absolute inset-y-0 left-0 rounded-full transition-[width] duration-300"
              style={{
                width: Math.max(0, Math.min(100, hpPct)) + "%",
                background: hpPct < 30 ? "linear-gradient(180deg,#ff8a8e,#e5484d)" : "linear-gradient(180deg,#ff9068,#e05a30)",
                boxShadow: "0 0 8px rgba(229,72,77,0.5)",
              }} />
            <span className="absolute inset-0 grid place-items-center text-[8px] font-bold text-white/90 tabular-nums leading-none">
              {fmt(Math.max(0, s.hero.hp))} / {fmt(stats.maxHp)}
            </span>
          </div>
        </div>
        <div className="shrink-0 text-right space-y-0.5">
          <div className="flex items-center gap-1 justify-end text-gold font-bold text-[13px] tabular-nums">
            <Icon n="coin" className="w-3.5 h-3.5" filled />{fmt(s.hero.gold)}
          </div>
          <div className="flex items-center gap-1 justify-end text-mana font-bold text-[13px] tabular-nums">
            <Icon n="gem" className="w-3.5 h-3.5" filled />{fmt(s.hero.gems)}
          </div>
        </div>
      </div>
    </div>
  );
}

function Toasts() {
  const { s, d } = useGame();
  useEffect(() => {
    if (!s.toasts.length) return;
    const t = setTimeout(() => d({ type: "DISMISS_TOAST", id: s.toasts[0].id }), 2600);
    return () => clearTimeout(t);
  }, [s.toasts, d]);
  const style: Record<string, { c: string; i: string }> = {
    info: { c: "#8b98a9", i: "info" },
    gold: { c: "#f0b429", i: "coin" },
    loot: { c: "#c084fc", i: "bag" },
    warn: { c: "#e5484d", i: "skull" },
    gem: { c: "#4cc3ff", i: "gem" },
  };
  return (
    <div className="fixed top-2 inset-x-0 z-[60] flex flex-col items-center gap-1.5 px-4 pointer-events-none">
      {s.toasts.map(t => {
        const st = style[t.kind] ?? style.info;
        return (
          <div key={t.id} className="anim-toast panel px-3.5 py-2 flex items-center gap-2 max-w-sm"
            style={{ borderColor: st.c + "66", boxShadow: `0 6px 20px rgba(0,0,0,0.5), 0 0 12px ${st.c}22` }}>
            <span style={{ color: st.c }}><Icon n={st.i} className="w-4 h-4" filled={t.kind !== "info"} /></span>
            <span className="text-[12px] font-semibold" style={{ color: st.c }}>{t.text}</span>
          </div>
        );
      })}
    </div>
  );
}

function Nav({ tab, setTab }: { tab: Tab; setTab: (t: Tab) => void }) {
  const { s } = useGame();
  const items: { id: Tab; n: string; i: string; badge?: boolean }[] = [
    { id: "battle", n: "Поход", i: "sword" },
    { id: "run", n: "Рогалик", i: "route", badge: s.shards > 0 && !s.run.active },
    { id: "hero", n: "Герой", i: "user" },
    { id: "inv", n: "Рюкзак", i: "bag", badge: s.inv.length > 0 },
    { id: "skills", n: "Скилы", i: "spark", badge: s.hero.skillPoints > 0 },
    { id: "more", n: "Ещё", i: "dots" },
  ];
  return (
    <div className="panel mx-3 mb-2 safe-b px-1.5 py-1.5 grid grid-cols-6 gap-1 relative z-10">
      {items.map(it => {
        const active = tab === it.id;
        return (
          <button key={it.id} onClick={() => setTab(it.id)}
            className={`relative py-1.5 rounded-xl flex flex-col items-center gap-0.5 transition-all duration-150 ${active ? "text-gold bg-gold/12 border border-gold/30" : "text-dim border border-transparent"}`}>
            <Icon n={it.i} className="w-4.5 h-4.5" />
            <span className="text-[8px] font-display tracking-wide leading-none">{it.n}</span>
            {it.badge && !active && <span className="absolute top-1 right-1/4 w-1.5 h-1.5 rounded-full bg-arc shadow-[0_0_6px_#3fd0b6]" />}
          </button>
        );
      })}
    </div>
  );
}

function Shell() {
  const [tab, setTab] = useState<Tab>("battle");
  return (
    <div className="h-full flex flex-col bg-dungeon bg-noise relative select-none" onContextMenu={e => e.preventDefault()}>
      {/* torches */}
      <div className="torch w-56 h-56 bg-ember/25 -top-20 -left-16" />
      <div className="torch w-64 h-64 bg-arc/15 top-1/3 -right-24" style={{ animationDelay: "-2.2s" }} />
      <div className="torch w-52 h-52 bg-gold/12 bottom-10 -left-20" style={{ animationDelay: "-4s" }} />

      <div className="relative z-10 h-full max-w-md mx-auto w-full flex flex-col">
        <div className="px-3 pt-2"><HUD /></div>
        <main className="flex-1 overflow-y-auto scroll-slim overscroll-contain px-3 py-3">
          <div key={tab} className="anim-rise">
            {tab === "battle" && <BattleScreen />}
            {tab === "run" && <RunScreen />}
            {tab === "hero" && <HeroTab />}
            {tab === "inv" && <InventoryTab />}
            {tab === "skills" && <SkillsScreen />}
            {tab === "more" && <MoreScreen />}
          </div>
          <div className="h-2" />
        </main>
        <Nav tab={tab} setTab={setTab} />
      </div>
      <Toasts />
      <Modals />
    </div>
  );
}

export default function App() {
  useEffect(() => {
    void initVK();
  }, []);

  return (
    <GameProvider>
      <Shell />
    </GameProvider>
  );
}
