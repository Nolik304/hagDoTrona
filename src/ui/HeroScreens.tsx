import { useState } from "react";
import { useGame } from "../game/useGame";
import { CLASSES, RARITY, INV_CAP, SLOT_UP_BONUS, SLOT_UP_MAX, slotUpCost, VIP_LEVELS } from "../game/data";
import { fmt, SLOTS } from "../game/logic";
import { Icon, ItemRow, slotIcon, SectionTitle, rarColor } from "./bits";
import { HeroArt } from "./art";
import type { Slot } from "../game/types";

const SLOT_LABEL: Record<Slot, string> = {
  weapon: "Оружие", helm: "Шлем", amulet: "Амулет", armor: "Доспех",
  gloves: "Перчатки", boots: "Сапоги", ring1: "Кольцо", ring2: "Кольцо 2",
};

function SlotBox({ slot }: { slot: Slot }) {
  const { s, d } = useGame();
  const [arm, setArm] = useState(false);
  const it = s.equip[slot];
  const c = it ? rarColor(it.rarity) : "#3a4656";
  return (
    <button
      onClick={() => {
        if (!it) return;
        if (arm) { d({ type: "UNEQUIP", slot }); setArm(false); }
        else setArm(true);
        setTimeout(() => setArm(false), 1600);
      }}
      className="w-14 h-14 rounded-xl border grid place-items-center relative transition-all duration-150 shrink-0"
      style={{
        borderColor: arm ? "#e5484d" : c + "66",
        color: it ? c : "#3a4656",
        background: it ? `linear-gradient(160deg, ${c}22, ${c}08)` : "rgba(11,14,19,0.6)",
        boxShadow: it && it.rarity >= 3 ? `0 0 12px ${c}44` : undefined,
      }}>
      <Icon n={slotIcon(slot, s.hero.classId)} className="w-6 h-6" />
      {it && <span className="absolute top-0.5 right-0.5 w-2 h-2 rounded-full" style={{ background: c, boxShadow: `0 0 6px ${c}` }} />}
      {(s.slotLevel[slot] || 0) > 0 && (
        <span className="absolute -top-1.5 -left-1.5 text-[8px] font-display px-1 py-px rounded-md bg-gold text-ink border border-ink leading-none"
          style={{ boxShadow: "0 0 8px rgba(240,180,41,0.55)" }}>
          +{s.slotLevel[slot]}
        </span>
      )}
      <span className="absolute -bottom-0.5 inset-x-0 text-center text-[8px] text-dim leading-none">{arm && it ? "снять?" : SLOT_LABEL[slot]}</span>
      <span className="sr-only">{it?.name ?? SLOT_LABEL[slot]}</span>
    </button>
  );
}

/** Заточка слотов: бонус живёт в слоте, а не в предмете */
function SharpenPanel() {
  const { s, d } = useGame();
  const ilvl = s.battle.zone * 12 + s.battle.wave;
  return (
    <div className="panel p-3">
      <SectionTitle icon="bolt" right={<span className="text-[9px] text-dim">+{SLOT_UP_BONUS}% к статам слота за ур.</span>}>
        ЗАТОЧКА СЛОТОВ
      </SectionTitle>
      <p className="text-[10px] text-dim/80 mb-2 leading-snug">
        Бонус привязан к <b className="text-fog">слоту</b>, а не к шмотке: надели новый предмет — заточка осталась. Работает только когда слот занят.
      </p>
      <div className="flex flex-col gap-1.5">
        {SLOTS.map(slot => {
          const lvl = s.slotLevel[slot] || 0;
          const it = s.equip[slot];
          const max = lvl >= SLOT_UP_MAX;
          const cost = slotUpCost(lvl, ilvl);
          const afford = s.hero.gold >= cost;
          return (
            <div key={slot} className="bg-abyss/60 border border-line/60 rounded-lg px-2.5 py-1.5 flex items-center gap-2">
              <span className="text-gold/80"><Icon n={slotIcon(slot, s.hero.classId)} className="w-4 h-4" /></span>
              <div className="flex-1 min-w-0">
                <div className="text-[11px] text-fog font-semibold flex items-center gap-1.5">
                  {SLOT_LABEL[slot]}
                  {lvl > 0 && <span className="text-[9px] font-display text-gold">+{lvl}</span>}
                </div>
                <div className="text-[9px] text-dim truncate">
                  {it ? <>«{it.name}» · бонус +{SLOT_UP_BONUS * lvl}%</> : "слот пуст — заточка ждёт предмет"}
                </div>
              </div>
              <button disabled={max || !afford} onClick={() => d({ type: "UPGRADE_SLOT", slot })}
                className="btn btn-dark px-2.5 py-1.5 text-[10px] shrink-0 flex items-center gap-1"
                style={afford && !max ? { borderColor: "#f0b42955" } : undefined}>
                {max ? "MAX" : <><Icon n="coin" className="w-3 h-3 text-gold" filled />{fmt(cost)}</>}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function HeroTab() {
  const { s, stats } = useGame();
  const cls = CLASSES[s.hero.classId];
  const buffList = s.buffs;
  const rows: { l: string; v: string; c?: string }[] = [
    { l: "Урон", v: fmt(stats.dmg), c: "#ff6b3d" },
    { l: "DPS", v: fmt(stats.dps), c: "#f0b429" },
    { l: "Атак в сек", v: stats.as.toFixed(2), c: "#3fd0b6" },
    { l: "Крит шанс", v: stats.crit.toFixed(1) + "%", c: "#4cc3ff" },
    { l: "Крит урон", v: stats.critDmg.toFixed(0) + "%", c: "#4cc3ff" },
    { l: "Здоровье", v: fmt(stats.maxHp), c: "#e5484d" },
    { l: "Броня", v: `${fmt(stats.armor)} (${(stats.mit * 100).toFixed(0)}%)`, c: "#9aa4b2" },
    { l: "Реген HP", v: stats.regen.toFixed(2) + "%/с", c: "#4ade80" },
    { l: "Золото", v: "+" + stats.goldPct.toFixed(0) + "%", c: "#f0b429" },
    { l: "Опыт", v: "+" + stats.xpPct.toFixed(0) + "%", c: "#3fd0b6" },
    { l: "Удача (дроп)", v: "+" + stats.luck.toFixed(0) + "%", c: "#c084fc" },
    { l: "Офлайн доход", v: fmt(stats.offline) + " зол./с", c: "#f0b429" },
  ];
  return (
    <div className="flex flex-col gap-3">
      <div className="panel p-3">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-lg grid place-items-center border" style={{ borderColor: cls.color + "66", color: cls.color, background: cls.color + "15" }}>
            <Icon n={s.hero.classId === "mage" ? "staff" : "bow"} className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <div className="font-display text-[15px] text-fog leading-tight flex items-center gap-1.5">
              {s.hero.name}
              {s.vip > 0 && (
                <span className="text-[8px] font-display px-1 py-px rounded border leading-none"
                  style={{ color: VIP_LEVELS[s.vip - 1].color, borderColor: VIP_LEVELS[s.vip - 1].color + "66", background: VIP_LEVELS[s.vip - 1].color + "1a" }}>
                  VIP {s.vip}
                </span>
              )}
            </div>
            <div className="text-[10px] text-dim">{cls.name} · «{cls.title}» · {s.hero.level} уровень</div>
          </div>
          <div className="text-right">
            <div className="text-[10px] text-dim">Очки навыков</div>
            <div className="font-display text-lg text-gold leading-none">{s.hero.skillPoints}</div>
          </div>
        </div>
      </div>

      <div className="flex items-stretch gap-2">
        <div className="flex flex-col gap-2 justify-center">
          {(["weapon", "gloves", "ring1"] as Slot[]).map(sl => <SlotBox key={sl} slot={sl} />)}
        </div>
        <div className="flex-1 panel relative overflow-hidden min-h-[210px]">
          <div className="absolute inset-0" style={{ background: `radial-gradient(220px 160px at 50% 40%, ${cls.color}18, transparent 70%)` }} />
          <div className="relative h-[210px] p-1">
            <HeroArt classId={s.hero.classId} equip={s.equip} />
          </div>
          <div className="absolute bottom-1.5 inset-x-0 text-center text-[9px] text-dim">
            Надето {SLOTS.filter(sl => s.equip[sl]).length}/8 · тап по шмотке = снять
          </div>
        </div>
        <div className="flex flex-col gap-2 justify-center">
          {(["helm", "armor", "amulet"] as Slot[]).map(sl => <SlotBox key={sl} slot={sl} />)}
        </div>
      </div>
      <div className="flex justify-center gap-2">
        {(["ring2", "boots"] as Slot[]).map(sl => <SlotBox key={sl} slot={sl} />)}
      </div>

      <SharpenPanel />

      {buffList.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {buffList.map(b => (
            <span key={b.id} className="text-[10px] font-bold px-2 py-1 rounded-lg bg-arc/10 border border-arc/40 text-arc flex items-center gap-1">
              <Icon n="spark" className="w-3 h-3" />{b.label} · {Math.ceil(b.t)}с
            </span>
          ))}
        </div>
      )}

      <div className="panel p-3">
        <SectionTitle icon="bolt">ХАРАКТЕРИСТИКИ</SectionTitle>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
          {rows.map(r => (
            <div key={r.l} className="flex items-baseline justify-between border-b border-line/40 pb-1">
              <span className="text-[11px] text-dim">{r.l}</span>
              <span className="text-[12px] font-bold tabular-nums" style={{ color: r.c }}>{r.v}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="panel p-3">
        <SectionTitle icon="trophy">ПОСЛУЖНОЙ СПИСОК</SectionTitle>
        <div className="grid grid-cols-3 gap-2 text-center">
          {[
            { l: "Побед", v: fmt(s.totals.kills) },
            { l: "Боссов", v: fmt(s.totals.bosses) },
            { l: "Критов", v: fmt(s.totals.crits) },
            { l: "Смертей", v: fmt(s.totals.deaths) },
            { l: "Лута найдено", v: fmt(s.totals.items) },
            { l: "Макс волна", v: fmt(s.totals.maxWave) },
          ].map(x => (
            <div key={x.l} className="bg-abyss/60 border border-line/50 rounded-lg py-2">
              <div className="font-display text-[15px] text-fog">{x.v}</div>
              <div className="text-[9px] text-dim">{x.l}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function InventoryTab() {
  const { s, d } = useGame();
  const items = [...s.inv].sort((a, b) => b.rarity - a.rarity || b.ilvl - a.ilvl);
  const junkCount = s.inv.filter(i => i.rarity === 0).length;
  return (
    <div className="flex flex-col gap-2.5">
      <div className="panel px-3 py-2.5 flex items-center gap-2">
        <Icon n="bag" className="w-5 h-5 text-gold" />
        <div className="flex-1">
          <div className="font-display text-[13px] text-fog">РЮКЗАК</div>
          <div className="text-[10px] text-dim">{s.inv.length} / {INV_CAP} · переполнение = автопродажа</div>
        </div>
        <button onClick={() => d({ type: "SELL_JUNK" })} disabled={junkCount === 0} className="btn btn-dark px-3 py-2 text-[11px]">
          Хлам ({junkCount})
        </button>
      </div>

      {items.length === 0 && (
        <div className="panel p-6 text-center">
          <Icon n="bag" className="w-8 h-8 text-dim/40 mx-auto mb-2" />
          <p className="text-dim text-xs">Пусто, как в кошельке барда.<br />Идите в поход — лут сам себя не поднимет.</p>
        </div>
      )}

      {items.map(it => (
        <ItemRow key={it.uid} it={it}>
          <div className="flex flex-col gap-1 shrink-0">
            <button onClick={() => d({ type: "EQUIP", uid: it.uid })} className="btn btn-arc px-2.5 py-1 text-[10px]">Надеть</button>
            <button onClick={() => d({ type: "SELL", uid: it.uid })} className="btn btn-dark px-2.5 py-1 text-[10px] flex items-center justify-center gap-0.5">
              <Icon n="coin" className="w-3 h-3 text-gold" filled />{it.sell}
            </button>
          </div>
        </ItemRow>
      ))}
      {items.length > 0 && (
        <div className="text-center text-[10px] text-dim/70 pb-1">
          Легендарки светятся. Это не баг, это уважение. ({RARITY[4].name}: {s.totals.legendaries} шт. за всё время)
        </div>
      )}
    </div>
  );
}
