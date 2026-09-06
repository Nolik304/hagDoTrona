import { useGame } from "../game/useGame";
import { SKILLS, mmrRank } from "../game/data";
import { fmt, getStats } from "../game/logic";
import { Bar, Icon, SectionTitle } from "./bits";

export function DuelScreen() {
  const { s, d } = useGame();
  const duel = s.duel;
  const stats = getStats(s);
  const skills = SKILLS.filter(skill => skill.classId === s.hero.classId);

  return (
    <div className="flex flex-col gap-3">
      <div className="panel p-4">
        <div className="flex items-center justify-between mb-3">
          <SectionTitle icon="crossed">АРЕНА ДУЭЛЕЙ</SectionTitle>
          <span className="text-[10px] text-gold">{duel.mmr} · {mmrRank(duel.mmr)}</span>
        </div>
        <div className="grid grid-cols-3 gap-2 mb-3 text-center text-[10px]">
          <div className="bg-abyss/60 border border-line/60 rounded-xl py-2"><b className="font-display text-r1">{duel.wins}</b><br />побед</div>
          <div className="bg-abyss/60 border border-line/60 rounded-xl py-2"><b className="font-display text-blood">{duel.losses}</b><br />поражений</div>
          <div className="bg-abyss/60 border border-line/60 rounded-xl py-2"><b className="font-display text-mana">{duel.tokens}</b><br />жетонов</div>
        </div>
        {duel.state === "search" && <div className="text-center text-blood font-display py-4">ПОИСК СОПЕРНИКА...</div>}
        {(duel.state === "fight" || duel.state === "result") && duel.foe && (
          <div className="space-y-2 mb-3">
            <div className="flex justify-between text-[10px]"><span>{s.hero.name}</span><span>{fmt(Math.max(0, duel.heroHp))}/{fmt(stats.maxHp)}</span></div>
            <Bar v={duel.heroHp} max={stats.maxHp} color="#4ade80" h="h-3" />
            <div className="flex justify-between text-[10px"><span>{duel.foe.name} · MMR {duel.foe.mmr}</span><span>{fmt(Math.max(0, duel.foe.hp))}/{fmt(duel.foe.maxHp)}</span></div>
            <Bar v={duel.foe.hp} max={duel.foe.maxHp} color="#e5484d" h="h-3" />
            <div className="text-[10px] text-dim text-center">{duel.log[0] ?? "Бой начался..."}</div>
          </div>
        )}
        {duel.state === "result" ? (
          <div className="text-center space-y-2">
            <div className="font-display text-xl" style={{ color: duel.result === "win" ? "#f0b429" : "#e5484d" }}>{duel.result === "win" ? "ПОБЕДА!" : "ПОРАЖЕНИЕ"}</div>
            <div className="text-[11px] text-dim">MMR: {duel.delta >= 0 ? "+" : ""}{duel.delta} · награда: {fmt(duel.reward)} зол.</div>
            <button className="btn btn-gold w-full py-2.5" onClick={() => d({ type: "DUEL_SEARCH" })} disabled={duel.tokens < 1}>ЕЩЁ РАЗ</button>
            <button className="btn btn-dark w-full py-2.5" onClick={() => d({ type: "DUEL_CLOSE" })}>В ЛОББИ</button>
          </div>
        ) : duel.state === "fight" ? (
          <div className="grid grid-cols-3 gap-2">
            {skills.map(skill => <button key={skill.id} className="btn btn-dark py-2 text-[10px]" onClick={() => d({ type: "DUEL_CAST", id: skill.id })}>{skill.name}</button>)}
          </div>
        ) : (
          <button className="btn btn-ember w-full py-3" onClick={() => d({ type: "DUEL_SEARCH" })} disabled={duel.tokens < 1}>{duel.tokens < 1 ? "НЕТ ЖЕТОНОВ" : "НАЙТИ ПРОТИВНИКА (1 ЖЕТОН)"}</button>
        )}
      </div>
      <div className="panel p-3 text-[11px] text-dim leading-relaxed"><SectionTitle icon="info">КАК ЭТО РАБОТАЕТ</SectionTitle>Бой автоматический, а кнопки навыков наносят удар сразу. За победу начисляются MMR и золото.</div>
    </div>
  );
}