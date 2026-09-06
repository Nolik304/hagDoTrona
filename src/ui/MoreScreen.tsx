import { useState } from "react";
import { useGame } from "../game/useGame";
import { QUESTS, DAILIES, WEEKLIES, ACHS, SHOP, RARITY, shopCost, VIP_LEVELS, type QuestDef } from "../game/data";
import { fmt, getMetric, saveGame } from "../game/logic";
import { Bar, Icon, SectionTitle } from "./bits";

type Seg = "quests" | "shop" | "ach" | "opt";

function QuestRow({ def, done, progress, onClaim }: { def: QuestDef; done: boolean; progress: number; onClaim: () => void }) {
  const ready = !done && progress >= def.target;
  return (
    <div className={`bg-abyss/60 border rounded-xl p-3 ${done ? "border-line/40 opacity-60" : ready ? "border-gold/50" : "border-line/60"}`}
      style={ready ? { boxShadow: "0 0 14px rgba(240,180,41,0.15)" } : undefined}>
      <div className="flex items-center gap-2">
        <div className="flex-1 min-w-0">
          <div className="font-display text-[13px] text-fog flex items-center gap-1.5">
            {done && <Icon n="check" className="w-3.5 h-3.5 text-r1" />}{def.title}
          </div>
          <div className="text-[11px] text-dim">{def.desc}</div>
          {def.flavor && <div className="text-[10px] text-dim/70 italic mt-0.5">«{def.flavor}»</div>}
        </div>
        <div className="shrink-0 text-right">
          <div className="flex items-center gap-2 justify-end text-[11px] font-bold">
            {def.reward.gold && <span className="text-gold flex items-center gap-0.5"><Icon n="coin" className="w-3.5 h-3.5" filled />{fmt(def.reward.gold)}</span>}
            {def.reward.gems && <span className="text-mana flex items-center gap-0.5"><Icon n="gem" className="w-3.5 h-3.5" filled />{def.reward.gems}</span>}
          </div>
          {done ? (
            <span className="text-[10px] text-dim">получено</span>
          ) : (
            <button disabled={!ready} onClick={onClaim} className="btn btn-gold px-3 py-1.5 text-[11px] mt-1">Забрать</button>
          )}
        </div>
      </div>
      {!done && (
        <div className="mt-2 flex items-center gap-2">
          <Bar v={progress} max={def.target} color={ready ? "#f0b429" : "#3fd0b6"} h="h-1.5" className="flex-1" />
          <span className="text-[10px] text-dim tabular-nums">{fmt(Math.min(progress, def.target))}/{fmt(def.target)}</span>
        </div>
      )}
    </div>
  );
}

function QuestsSeg() {
  const { s, d } = useGame();
  const doneChain = s.questsClaimed.length;
  return (
    <div className="flex flex-col gap-2.5">
      <div className="panel p-3">
        <SectionTitle icon="map" right={<span className="text-[10px] text-dim">глава {Math.min(doneChain + 1, QUESTS.length)}/{QUESTS.length}</span>}>
          КАМПАНИЯ
        </SectionTitle>
        <div className="flex flex-col gap-2">
          {QUESTS.map(q => (
            <QuestRow key={q.id} def={q} done={s.questsClaimed.includes(q.id)} progress={getMetric(s, q.metric)}
              onClaim={() => d({ type: "CLAIM_QUEST", id: q.id })} />
          ))}
        </div>
      </div>
      <div className="panel p-3">
        <SectionTitle icon="refresh" right={<span className="text-[10px] text-dim">обновляются ежедневно</span>}>ЕЖЕДНЕВКИ</SectionTitle>
        <div className="flex flex-col gap-2">
          {DAILIES.map(q => (
            <QuestRow key={q.id} def={q} done={s.daily.claimed.includes(q.id)} progress={getMetric(s, q.metric)}
              onClaim={() => d({ type: "CLAIM_DAILY", id: q.id })} />
          ))}
        </div>
      </div>
      <div className="panel p-3">
        <SectionTitle icon="crown" right={<span className="text-[10px] text-dim">сброс в понедельник</span>}>ЕЖЕНЕДЕЛЬНИК</SectionTitle>
        <div className="flex flex-col gap-2">
          {WEEKLIES.map(q => (
            <QuestRow key={q.id} def={q} done={s.weekly.claimed.includes(q.id)} progress={getMetric(s, q.metric)}
              onClaim={() => d({ type: "CLAIM_WEEKLY", id: q.id })} />
          ))}
        </div>
      </div>
    </div>
  );
}

function VipPanel() {
  const { s, d } = useGame();
  const cur = s.vip > 0 ? VIP_LEVELS[s.vip - 1] : null;
  const next = s.vip < VIP_LEVELS.length ? VIP_LEVELS[s.vip] : null;
  return (
    <div className="panel p-3 relative overflow-hidden">
      <div className="absolute -top-14 -right-10 w-36 h-36 rounded-full blur-2xl pointer-events-none"
        style={{ background: (cur?.color ?? "#f0b429") + "2e" }} />
      <SectionTitle icon="crown" right={cur
        ? <span className="text-[10px] font-display" style={{ color: cur.color }}>VIP {s.vip} · {cur.name.toUpperCase()}</span>
        : <span className="text-[10px] text-dim">не активирован</span>}>
        ПРИВИЛЕГИИ
      </SectionTitle>

      {cur && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {cur.perks.map(p => (
            <span key={p} className="text-[9px] font-bold px-2 py-1 rounded-md border"
              style={{ color: cur.color, borderColor: cur.color + "55", background: cur.color + "12" }}>
              {p}
            </span>
          ))}
        </div>
      )}

      {next ? (
        <div className="bg-abyss/60 border rounded-xl p-3" style={{ borderColor: next.color + "44" }}>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="font-display text-[13px]" style={{ color: next.color }}>VIP {s.vip + 1} · {next.name.toUpperCase()}</span>
            <span className="ml-auto text-[9px] text-dim">воскрешение за {next.respawn} с</span>
          </div>
          <div className="flex flex-wrap gap-1 mb-3">
            {next.perks.map(p => (
              <span key={p} className="text-[9px] px-1.5 py-0.5 rounded bg-panel2 text-fog/85 border border-line/60">{p}</span>
            ))}
          </div>
          <button disabled={s.hero.gems < next.cost} onClick={() => d({ type: "BUY_VIP" })}
            className="btn btn-gold w-full py-2.5 text-[13px] flex items-center justify-center gap-1.5">
            <Icon n="gem" className="w-4 h-4" filled />АКТИВИРОВАТЬ ЗА {fmt(next.cost)}
          </button>
        </div>
      ) : (
        <div className="text-center text-[11px] text-dim py-2">Максимальный VIP. Бездна уважает таких клиентов.</div>
      )}
    </div>
  );
}

function ShopSeg() {
  const { s, d } = useGame();
  return (
    <div className="flex flex-col gap-3">
      <VipPanel />
      <div className="panel p-3">
      <SectionTitle icon="goblin" right={<span className="text-[10px] text-dim italic">«скидки не будет»</span>}>ЛАВКА ГОБЛИНА</SectionTitle>
      <div className="grid grid-cols-2 gap-2.5">
        {SHOP.map(def => {
          const cost = shopCost(def, s.shopBuys[def.id] || 0);
          const gold = def.currency === "gold";
          const afford = gold ? s.hero.gold >= cost : s.hero.gems >= cost;
          const minR = def.minRarity ?? 0;
          return (
            <div key={def.id} className="bg-abyss/60 border border-line/60 rounded-xl p-3 flex flex-col">
              <div className="w-12 h-12 mx-auto mb-2 rounded-xl grid place-items-center border border-gold/30 bg-gold/8 text-gold">
                <Icon n={def.icon} className="w-7 h-7" />
              </div>
              <div className="font-display text-[12px] text-fog text-center leading-tight">{def.name}</div>
              <div className="text-[10px] text-dim text-center mt-1 flex-1">{def.desc}</div>
              {def.kind === "box" && minR > 0 && (
                <div className="text-[9px] text-center mt-1" style={{ color: RARITY[minR].color }}>минимум: {RARITY[minR].name}</div>
              )}
              <button disabled={!afford} onClick={() => d({ type: "BUY_SHOP", id: def.id })}
                className={`btn ${gold ? "btn-gold" : "btn-arc"} w-full py-2 text-[12px] mt-2 flex items-center justify-center gap-1`}>
                <Icon n={gold ? "coin" : "gem"} className="w-3.5 h-3.5" filled />{fmt(cost)}
              </button>
            </div>
          );
        })}
      </div>
      <p className="text-[10px] text-dim/70 text-center mt-3">
        Сундуки дорожают с каждой покупкой. Гоблин называет это «динамическим ценообразованием».
      </p>
      </div>
    </div>
  );
}

function AchSeg() {
  const { s, d } = useGame();
  const claimed = s.achClaimed.length;
  return (
    <div className="panel p-3">
      <SectionTitle icon="trophy" right={<span className="text-[10px] text-dim">{claimed}/{ACHS.length}</span>}>ДОСТИЖЕНИЯ</SectionTitle>
      <div className="flex flex-col gap-2">
        {ACHS.map(a => {
          const done = s.achClaimed.includes(a.id);
          const p = getMetric(s, a.metric);
          const ready = !done && p >= a.target;
          return (
            <div key={a.id} className={`bg-abyss/60 border rounded-xl px-3 py-2.5 flex items-center gap-2.5 ${done ? "border-line/40 opacity-60" : ready ? "border-mana/50" : "border-line/60"}`}>
              <div className={`w-9 h-9 shrink-0 rounded-lg grid place-items-center border ${done ? "text-dim border-line" : ready ? "text-mana border-mana/50 bg-mana/10" : "text-gold/70 border-line bg-panel2"}`}>
                <Icon n={done ? "check" : "trophy"} className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-display text-[12px] text-fog">{a.title}</div>
                <div className="text-[10px] text-dim">{a.desc} · <span className="text-mana font-bold">+{a.reward.gems} крист.</span></div>
                {!done && <Bar v={p} max={a.target} color={ready ? "#4cc3ff" : "#33415a"} h="h-1" className="mt-1.5" />}
              </div>
              {!done && <button disabled={!ready} onClick={() => d({ type: "CLAIM_ACH", id: a.id })} className="btn btn-arc px-2.5 py-1.5 text-[10px] shrink-0">Взять</button>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function OptSeg() {
  const { s, d } = useGame();
  const [confirmReset, setConfirmReset] = useState(false);
  const [saved, setSaved] = useState(false);
  return (
    <div className="panel p-3 flex flex-col gap-3">
      <SectionTitle icon="gear">ОПЦИИ</SectionTitle>
      <div className="bg-abyss/60 border border-line/60 rounded-xl p-3 text-[11px] text-dim leading-relaxed space-y-1">
        <p>· Прогресс сохраняется каждые 4 секунды и при сворачивании приложения.</p>
        <p>· Пока вы офлайн, наёмники продолжают фармить — до 8 часов.</p>
        <p>· Смерть не страшна: <b className="text-fog">автовоскрешение</b> через 3 сек (−20% золота). VIP ускоряет до 0.5 сек.</p>
        <p>· Заточка слотов привязана к слоту — новая шмотка наследует бонус.</p>
      </div>
      <button onClick={() => { saveGame(s); setSaved(true); setTimeout(() => setSaved(false), 1500); }}
        className="btn btn-arc w-full py-3 text-[13px]">{saved ? "СОХРАНЕНО!" : "СОХРАНИТЬ СЕЙЧАС"}</button>
      <button
        onClick={() => {
          if (!confirmReset) { setConfirmReset(true); setTimeout(() => setConfirmReset(false), 3000); return; }
          d({ type: "RESET" });
        }}
        className={`btn w-full py-3 text-[13px] ${confirmReset ? "btn-ember" : "btn-dark"}`}>
        {confirmReset ? "ТОЧНО СБРОСИТЬ? ВСЁ ПРОПАДЁТ" : "СБРОСИТЬ ПРОГРЕСС"}
      </button>
      <button
        onClick={() => {
          const text = "Я рублю боссов в «Бездна Idle» — рогалик-idle, где даже слизни платят налоги золотом. Присоединяйся!";
          if (navigator.share) navigator.share({ title: "Бездна Idle", text }).catch(() => undefined);
        }}
        className="btn btn-dark w-full py-3 text-[13px] flex items-center justify-center gap-2">
        <Icon n="share" className="w-4 h-4" />ПОЗВАТЬ ДРУГА В ПОХОД
      </button>
      <div className="text-center text-[10px] text-dim/60">
        «Бездна Idle» v1.0 · сделано на коленке у костра · VK Mini App
        <div className="mt-1">Убийств: {fmt(s.totals.kills)} · Боссов: {fmt(s.totals.bosses)} · Событий пережито: {s.totals.events}</div>
      </div>
    </div>
  );
}

export function MoreScreen() {
  const [seg, setSeg] = useState<Seg>("quests");
  const tabs: { id: Seg; n: string; i: string }[] = [
    { id: "quests", n: "Квесты", i: "scroll" },
    { id: "shop", n: "Лавка", i: "bag" },
    { id: "ach", n: "Свершения", i: "trophy" },
    { id: "opt", n: "Опции", i: "gear" },
  ];
  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-4 gap-1.5 p-1.5 panel">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setSeg(t.id)}
            className={`py-2 rounded-lg flex flex-col items-center gap-0.5 transition-all duration-150 ${seg === t.id ? "bg-gold/15 text-gold border border-gold/40" : "text-dim border border-transparent"}`}>
            <Icon n={t.i} className="w-4.5 h-4.5" />
            <span className="text-[9px] font-display tracking-wide">{t.n}</span>
          </button>
        ))}
      </div>
      {seg === "quests" && <QuestsSeg />}
      {seg === "shop" && <ShopSeg />}
      {seg === "ach" && <AchSeg />}
      {seg === "opt" && <OptSeg />}
    </div>
  );
}
