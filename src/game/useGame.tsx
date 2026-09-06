import { createContext, useContext, useEffect, useMemo, useReducer, useRef, type ReactNode, type Dispatch } from "react";
import type { Action, GameState, Stats } from "./types";
import { getStats, loadGame, reducer, saveGame } from "./logic";

const Ctx = createContext<{ s: GameState; d: Dispatch<Action>; stats: Stats } | null>(null);

export function GameProvider({ children }: { children: ReactNode }) {
  const [s, d] = useReducer(reducer, null, () => loadGame());
  const ref = useRef(s);
  ref.current = s;

  useEffect(() => {
    let last = performance.now();
    const loop = setInterval(() => {
      const now = performance.now();
      const dt = Math.min((now - last) / 1000, 0.5);
      last = now;
      d({ type: "TICK", dt });
    }, 100);
    const saver = setInterval(() => saveGame(ref.current), 4000);
    const onHide = () => saveGame(ref.current);
    window.addEventListener("beforeunload", onHide);
    document.addEventListener("visibilitychange", onHide);
    return () => {
      clearInterval(loop);
      clearInterval(saver);
      window.removeEventListener("beforeunload", onHide);
      document.removeEventListener("visibilitychange", onHide);
    };
  }, []);

  const stats = useMemo(() => getStats(s), [s]);
  return <Ctx.Provider value={{ s, d, stats }}>{children}</Ctx.Provider>;
}

export function useGame() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useGame outside provider");
  return c;
}
