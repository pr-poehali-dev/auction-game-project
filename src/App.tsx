import { useState, useEffect, useCallback, useRef } from "react";

// ============================================================
// LOCALSTORAGE PERSISTENCE
// ============================================================
function usePersistedState<T>(key: string, defaultValue: T) {
  const [state, setState] = useState<T>(() => {
    try {
      const saved = localStorage.getItem(key);
      return saved !== null ? JSON.parse(saved) : defaultValue;
    } catch {
      return defaultValue;
    }
  });

  const setPersistedState = useCallback((value: T | ((prev: T) => T)) => {
    setState(prev => {
      const next = typeof value === "function" ? (value as (prev: T) => T)(prev) : value;
      try { localStorage.setItem(key, JSON.stringify(next)); } catch (_e) { /* ignore */ }
      return next;
    });
  }, [key]);

  return [state, setPersistedState] as const;
}
import Icon from "@/components/ui/icon";

// ============================================================
// API
// ============================================================
const GOOGLE_AUTH_URL = "https://functions.poehali.dev/bb065b3c-3a26-4ba4-bc3b-3dd311d53a0c";
const PLAYER_DATA_URL = "https://functions.poehali.dev/86df8212-6ca5-42ec-8616-c89c4c78560f";

const GOOGLE_CLIENT_ID = (window as Record<string, unknown>).__GOOGLE_CLIENT_ID__ as string || import.meta.env.VITE_GOOGLE_CLIENT_ID || "";

interface Session {
  player_id: number;
  session_token: string;
  name: string;
  email: string;
  avatar: string;
}

function getSession(): Session | null {
  try {
    const s = localStorage.getItem("rj_session");
    return s ? JSON.parse(s) : null;
  } catch { return null; }
}

function saveSession(s: Session) {
  localStorage.setItem("rj_session", JSON.stringify(s));
}

function clearSession() {
  localStorage.removeItem("rj_session");
}

async function apiGoogleAuth(token: string): Promise<Session> {
  const res = await fetch(GOOGLE_AUTH_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Auth failed");
  return data as Session;
}

async function apiLoadPlayer(session: Session) {
  const res = await fetch(PLAYER_DATA_URL, {
    headers: { "X-Player-Id": String(session.player_id), "X-Session-Token": session.session_token },
  });
  if (!res.ok) return null;
  return res.json();
}

async function apiSavePlayer(session: Session, data: Record<string, unknown>) {
  await fetch(PLAYER_DATA_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Player-Id": String(session.player_id), "X-Session-Token": session.session_token },
    body: JSON.stringify(data),
  });
}

// ============================================================
// GOOGLE LOGIN SCREEN
// ============================================================
function LoginScreen({ onLogin }: { onLogin: (session: Session) => void }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const btnRef = useRef<HTMLDivElement>(null);
  const noClientId = !GOOGLE_CLIENT_ID;

  useEffect(() => {
    if (noClientId || !btnRef.current) return;
    const g = (window as Record<string, unknown>).google as { accounts: { id: { initialize: (o: unknown) => void; renderButton: (el: HTMLElement, o: unknown) => void } } } | undefined;
    if (!g) return;

    g.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: async (response: { credential: string }) => {
        setLoading(true);
        setError("");
        try {
          const session = await apiGoogleAuth(response.credential);
          saveSession(session);
          onLogin(session);
        } catch (e: unknown) {
          setError(e instanceof Error ? e.message : "Ошибка входа");
        } finally {
          setLoading(false);
        }
      },
    });

    g.accounts.id.renderButton(btnRef.current, {
      theme: "filled_black",
      size: "large",
      shape: "pill",
      width: 280,
      text: "signin_with",
      locale: "ru",
    });
  }, [noClientId, onLogin]);

  return (
    <div className="min-h-screen bg-[#0d0d0d] flex flex-col items-center justify-center px-6">
      <div className="text-center mb-10 animate-fade-in-up">
        <div className="text-7xl mb-4 animate-float">👑</div>
        <h1 className="text-5xl font-playfair font-black gold-text mb-2">Royal Jackpot</h1>
        <div className="divider-gold mx-10 my-3" />
        <p className="font-cormorant italic text-muted-foreground text-xl">Казино. Аукцион. Трофеи.</p>
      </div>

      <div className="casino-card rounded-3xl p-8 w-full max-w-sm border border-yellow-800/30 animate-scale-in text-center">
        <h2 className="font-playfair text-2xl text-yellow-300 mb-2">Добро пожаловать</h2>
        <p className="font-cormorant italic text-muted-foreground mb-6">Войдите, чтобы ваш прогресс сохранялся</p>

        {noClientId ? (
          <div className="bg-yellow-950/40 border border-yellow-700/40 rounded-xl p-4 text-yellow-400 text-sm font-oswald">
            ⚠️ Добавьте GOOGLE_CLIENT_ID в секреты проекта для активации входа
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4">
            <div ref={btnRef} />
            {loading && <p className="text-muted-foreground font-oswald text-sm animate-pulse">Входим...</p>}
            {error && <p className="text-red-400 font-oswald text-sm">{error}</p>}
          </div>
        )}

        <div className="divider-gold my-4" />
        <p className="text-[10px] font-oswald tracking-widest text-muted-foreground/40 uppercase">♠ ♥ ♦ ♣ ♦ ♥ ♠</p>
      </div>
    </div>
  );
}

// ============================================================
// TYPES
// ============================================================
type Page = "menu" | "slots" | "auction" | "shop" | "profile" | "info";

interface Prize {
  id: string;
  emoji: string;
  name: string;
  rarity: "common" | "rare" | "epic" | "legendary";
  value: number;
}

interface AuctionLot {
  id: string;
  prize: Prize;
  seller: string;
  startPrice: number;
  currentBid: number;
  bidder: string;
  endsIn: number;
}

interface ShopItem {
  id: string;
  name: string;
  description: string;
  price: number;
  emoji: string;
  type: "boost" | "style" | "utility";
}

// ============================================================
// CONSTANTS
// ============================================================
const REEL_SYMBOLS = ["🍒", "💎", "7️⃣", "🃏", "⭐", "👑", "🔔", "💰"];

const PRIZES: Prize[] = [
  { id: "p1", emoji: "🍒", name: "Три вишни", rarity: "common", value: 50 },
  { id: "p2", emoji: "🔔", name: "Колокол удачи", rarity: "common", value: 80 },
  { id: "p3", emoji: "⭐", name: "Звезда фортуны", rarity: "rare", value: 250 },
  { id: "p4", emoji: "💰", name: "Мешок золота", rarity: "rare", value: 400 },
  { id: "p5", emoji: "💎", name: "Бриллиант", rarity: "epic", value: 1200 },
  { id: "p6", emoji: "7️⃣", name: "Счастливая семёрка", rarity: "epic", value: 1500 },
  { id: "p7", emoji: "🃏", name: "Джокер", rarity: "epic", value: 1800 },
  { id: "p8", emoji: "👑", name: "Корона Королей", rarity: "legendary", value: 5000 },
];

const INITIAL_AUCTION: AuctionLot[] = [
  { id: "a1", prize: PRIZES[5], seller: "VIP_Player", startPrice: 800, currentBid: 1200, bidder: "LuckyAce", endsIn: 142 },
  { id: "a2", prize: PRIZES[7], seller: "GoldKing", startPrice: 3000, currentBid: 4200, bidder: "DiamondFox", endsIn: 67 },
  { id: "a3", prize: PRIZES[4], seller: "RoyalBet", startPrice: 600, currentBid: 950, bidder: "NightOwl", endsIn: 210 },
  { id: "a4", prize: PRIZES[3], seller: "AceOfSpades", startPrice: 200, currentBid: 380, bidder: "GoldRush", endsIn: 35 },
];

const SHOP_ITEMS: ShopItem[] = [
  { id: "s1", name: "Двойные прокруты", description: "+2 прокрута к следующей выдаче", price: 300, emoji: "🎰", type: "boost" },
  { id: "s2", name: "Щит аукциона", description: "Защита ставки на 30 минут", price: 500, emoji: "🛡️", type: "utility" },
  { id: "s3", name: "Золотая рамка", description: "Эксклюзивная рамка профиля", price: 800, emoji: "🖼️", type: "style" },
  { id: "s4", name: "Множитель x2", description: "Двойные выигрыши на 1 час", price: 1200, emoji: "⚡", type: "boost" },
  { id: "s5", name: "VIP статус", description: "3 доп. прокрута каждые 5 часов", price: 3000, emoji: "💎", type: "boost" },
  { id: "s6", name: "Корона профиля", description: "Легендарный значок VIP", price: 5000, emoji: "👑", type: "style" },
];

const RARITY_CONFIG = {
  common: { label: "Обычный", color: "text-gray-400", bg: "bg-gray-800/50", border: "border-gray-600" },
  rare: { label: "Редкий", color: "text-blue-400", bg: "bg-blue-950/50", border: "border-blue-600" },
  epic: { label: "Эпический", color: "text-purple-400", bg: "bg-purple-950/50", border: "border-purple-600" },
  legendary: { label: "Легендарный", color: "text-yellow-300", bg: "bg-yellow-950/50", border: "border-yellow-600" },
};

// ============================================================
// HELPERS
// ============================================================
function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

function getPrizeFromSymbols(s1: string, s2: string, s3: string): Prize | null {
  if (s1 === s2 && s2 === s3) {
    const found = PRIZES.find(p => p.emoji === s1);
    return found || null;
  }
  return null;
}

// ============================================================
// SLOT MACHINE
// ============================================================
function SlotsPage({ inventory, onInventoryChange, session, onSave }: {
  coins: number;
  onCoinsChange: (v: number) => void;
  inventory: Prize[];
  onInventoryChange: (v: Prize[]) => void;
  session: Session;
  onSave: (s: Session, d: Record<string, unknown>) => void;
}) {
  const [reels, setReels] = usePersistedState<string[]>("rj_reels", ["🍒", "💎", "7️⃣"]);
  const [spinning, setSpinning] = useState([false, false, false]);
  const [spinsLeft, setSpinsLeft] = usePersistedState<number>("rj_spins_left", 2);
  const [spinHistory, setSpinHistory] = usePersistedState<string[]>("rj_spin_history", []);
  const [lastWin, setLastWin] = useState<Prize | null>(null);
  const [showWin, setShowWin] = useState(false);

  // Сохраняем момент последнего обнуления таймера
  const [spinRefillAt, setSpinRefillAt] = usePersistedState<number>(
    "rj_spin_refill_at",
    Date.now() + 5 * 60 * 60 * 1000
  );
  const [nextSpinTime, setNextSpinTime] = useState(() =>
    Math.max(0, Math.round((spinRefillAt - Date.now()) / 1000))
  );

  useEffect(() => {
    const timer = setInterval(() => {
      const remaining = Math.max(0, Math.round((spinRefillAt - Date.now()) / 1000));
      setNextSpinTime(remaining);
      if (remaining <= 0) {
        setSpinsLeft(prev => Math.min(prev + 2, 10));
        const next = Date.now() + 5 * 60 * 60 * 1000;
        setSpinRefillAt(next);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [spinRefillAt]);

  const spin = useCallback(() => {
    if (spinsLeft <= 0 || spinning.some(s => s)) return;

    setSpinsLeft(p => p - 1);
    setShowWin(false);
    setLastWin(null);

    const results = REEL_SYMBOLS.map(() => REEL_SYMBOLS[Math.floor(Math.random() * REEL_SYMBOLS.length)]);

    setSpinning([true, true, true]);

    setTimeout(() => setSpinning([false, true, true]), 600);
    setTimeout(() => setSpinning([false, false, true]), 1000);
    setTimeout(() => {
      setSpinning([false, false, false]);
      setReels(results);
      const prize = getPrizeFromSymbols(results[0], results[1], results[2]);
      const newSpinsLeft = spinsLeft - 1;
      if (prize) {
        setLastWin(prize);
        setShowWin(true);
        const newInventory = [...inventory, { ...prize, id: `${prize.id}-${Date.now()}` }];
        onInventoryChange(newInventory);
        setSpinHistory(h => {
          const next = [`🏆 Выиграл: ${prize.emoji} ${prize.name}`, ...h.slice(0, 4)];
          onSave(session, { spins_left: newSpinsLeft, spin_history: next, inventory: newInventory });
          return next;
        });
      } else {
        setSpinHistory(h => {
          const next = [`${results[0]} ${results[1]} ${results[2]} — нет совпадений`, ...h.slice(0, 4)];
          onSave(session, { spins_left: newSpinsLeft, spin_history: next });
          return next;
        });
      }
    }, 1400);
  }, [spinsLeft, spinning, inventory, onInventoryChange, session, onSave]);

  return (
    <div className="flex flex-col items-center gap-6 py-4 animate-fade-in-up">
      <div className="text-center">
        <h1 className="text-4xl font-playfair font-bold gold-text mb-1">Слот-машина</h1>
        <p className="text-muted-foreground font-cormorant italic text-lg">Крути барабаны — лови удачу</p>
      </div>

      <div className="flex gap-4 items-center">
        <div className="casino-card rounded-xl px-6 py-3 text-center">
          <div className="text-3xl font-playfair font-bold text-yellow-300">{spinsLeft}</div>
          <div className="text-xs text-muted-foreground font-oswald uppercase tracking-widest">прокрутов</div>
        </div>
        <div className="casino-card rounded-xl px-6 py-3 text-center">
          <div className="text-xl font-oswald text-yellow-300 tracking-wider">{formatTime(nextSpinTime)}</div>
          <div className="text-xs text-muted-foreground font-oswald uppercase tracking-widest">до пополнения</div>
        </div>
      </div>

      {showWin && lastWin && (
        <div className="animate-scale-in casino-card rounded-2xl px-8 py-4 border border-yellow-600 text-center">
          <div className="text-5xl mb-1">{lastWin.emoji}</div>
          <div className="text-xl font-playfair font-bold text-yellow-300">{lastWin.name}</div>
          <div className={`text-sm font-oswald uppercase tracking-widest ${RARITY_CONFIG[lastWin.rarity].color}`}>
            {RARITY_CONFIG[lastWin.rarity].label}
          </div>
          <div className="text-yellow-600 font-oswald text-lg mt-1">+{lastWin.value} ценность</div>
        </div>
      )}

      <div className="relative">
        <div className="casino-card rounded-3xl p-6 border-2 border-yellow-800/40 animate-glow-pulse">
          <div className="flex justify-center gap-2 mb-4">
            {[...Array(9)].map((_, i) => (
              <div key={i} className={`w-2 h-2 rounded-full transition-colors ${spinning.some(s => s) ? "bg-yellow-300 animate-pulse" : "bg-yellow-800/60"}`} style={{ animationDelay: `${i * 0.1}s` }} />
            ))}
          </div>

          <div className="flex gap-3">
            {reels.map((sym, idx) => (
              <div key={idx} className="slot-reel w-24 h-24 flex items-center justify-center">
                <span className={`text-5xl select-none transition-all duration-100 ${spinning[idx] ? "blur-sm scale-110" : ""}`}>
                  {sym}
                </span>
              </div>
            ))}
          </div>

          <div className="relative my-3">
            <div className="divider-gold" />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-[10px] font-oswald tracking-[0.3em] text-yellow-800/60 bg-[#111] px-2">ЛИНИЯ ВЫПЛАТ</span>
            </div>
          </div>

          <button
            onClick={spin}
            disabled={spinsLeft <= 0 || spinning.some(s => s)}
            className={`btn-gold w-full py-4 rounded-2xl text-lg font-oswald font-semibold tracking-widest
              ${(spinsLeft <= 0 || spinning.some(s => s)) ? "opacity-40 cursor-not-allowed" : ""}`}
          >
            {spinning.some(s => s) ? "🎰 КРУТИМ..." : spinsLeft > 0 ? "🎰 КРУТИТЬ" : "⏳ ЖДИТЕ"}
          </button>

          <div className="flex justify-center gap-2 mt-4">
            {[...Array(9)].map((_, i) => (
              <div key={i} className={`w-2 h-2 rounded-full transition-colors ${spinning.some(s => s) ? "bg-red-500 animate-pulse" : "bg-red-900/60"}`} style={{ animationDelay: `${i * 0.1}s` }} />
            ))}
          </div>
        </div>
      </div>

      <div className="w-full max-w-sm casino-card rounded-2xl p-4">
        <h3 className="font-playfair text-yellow-300 text-center mb-3 text-lg">Таблица выплат</h3>
        <div className="divider-gold mb-3" />
        <div className="grid grid-cols-2 gap-2">
          {PRIZES.map(p => (
            <div key={p.id} className={`flex items-center gap-2 rounded-lg px-2 py-1.5 border ${RARITY_CONFIG[p.rarity].border} ${RARITY_CONFIG[p.rarity].bg}`}>
              <span className="text-lg">{p.emoji}{p.emoji}{p.emoji}</span>
              <div>
                <div className="text-xs font-oswald text-yellow-300">{p.value}</div>
                <div className={`text-[10px] ${RARITY_CONFIG[p.rarity].color}`}>{RARITY_CONFIG[p.rarity].label}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {spinHistory.length > 0 && (
        <div className="w-full max-w-sm casino-card rounded-2xl p-4">
          <h3 className="font-oswald text-yellow-800 uppercase tracking-widest text-sm mb-2">История прокрутов</h3>
          {spinHistory.map((h, i) => (
            <div key={i} className="text-sm text-muted-foreground font-cormorant py-1 border-b border-border/30 last:border-0">{h}</div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================
// AUCTION PAGE
// ============================================================
function AuctionPage({ coins, onCoinsChange, inventory, onInventoryChange }: {
  coins: number;
  onCoinsChange: (v: number) => void;
  inventory: Prize[];
  onInventoryChange: (v: Prize[]) => void;
}) {
  const [lots, setLots] = usePersistedState<AuctionLot[]>("rj_auction_lots", INITIAL_AUCTION);
  const [bidAmounts, setBidAmounts] = useState<Record<string, number>>({});
  const [showSellModal, setShowSellModal] = useState(false);
  const [selectedPrize, setSelectedPrize] = useState<Prize | null>(null);
  const [sellPrice, setSellPrice] = useState("");
  const [feedback, setFeedback] = useState<Record<string, string>>({});

  useEffect(() => {
    const timer = setInterval(() => {
      setLots(prev => prev.map(lot => ({ ...lot, endsIn: Math.max(0, lot.endsIn - 1) })));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const placeBid = (lot: AuctionLot) => {
    const amount = bidAmounts[lot.id] || lot.currentBid + 50;
    if (amount <= lot.currentBid) {
      setFeedback(f => ({ ...f, [lot.id]: "Ставка должна быть выше текущей!" }));
      return;
    }
    if (amount > coins) {
      setFeedback(f => ({ ...f, [lot.id]: "Недостаточно монет!" }));
      return;
    }
    onCoinsChange(coins - amount + lot.currentBid);
    setLots(prev => prev.map(l => l.id === lot.id ? { ...l, currentBid: amount, bidder: "Вы" } : l));
    setFeedback(f => ({ ...f, [lot.id]: `✓ Ставка ${amount} принята!` }));
    setTimeout(() => setFeedback(f => ({ ...f, [lot.id]: "" })), 3000);
  };

  const sellPrize = () => {
    if (!selectedPrize || !sellPrice) return;
    const price = parseInt(sellPrice);
    if (isNaN(price) || price < 1) return;

    const newLot: AuctionLot = {
      id: `custom-${Date.now()}`,
      prize: selectedPrize,
      seller: "Вы",
      startPrice: price,
      currentBid: price,
      bidder: "—",
      endsIn: 3600,
    };
    setLots(prev => [newLot, ...prev]);
    onInventoryChange(inventory.filter(p => p.id !== selectedPrize.id));
    setShowSellModal(false);
    setSelectedPrize(null);
    setSellPrice("");
  };

  return (
    <div className="flex flex-col gap-6 py-4 animate-fade-in-up">
      <div className="text-center">
        <h1 className="text-4xl font-playfair font-bold gold-text mb-1">Аукцион</h1>
        <p className="text-muted-foreground font-cormorant italic text-lg">Торгуйте трофеями с другими игроками</p>
      </div>

      {inventory.length > 0 && (
        <button onClick={() => setShowSellModal(true)} className="btn-crimson rounded-xl py-3 px-6 mx-auto flex items-center gap-2 text-sm">
          🏷️ Выставить приз на аукцион
        </button>
      )}

      <div className="flex flex-col gap-4">
        {lots.map((lot, idx) => (
          <div key={lot.id} className={`casino-card rounded-2xl p-4 animate-fade-in-up`} style={{ animationDelay: `${idx * 0.1}s`, opacity: 0 }}>
            <div className="flex items-start gap-4">
              <div className={`w-16 h-16 rounded-xl flex items-center justify-center text-3xl border ${RARITY_CONFIG[lot.prize.rarity].border} ${RARITY_CONFIG[lot.prize.rarity].bg} flex-shrink-0`}>
                {lot.prize.emoji}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="font-playfair font-semibold text-yellow-300">{lot.prize.name}</span>
                  <span className={`text-[10px] font-oswald px-2 py-0.5 rounded-full border ${RARITY_CONFIG[lot.prize.rarity].border} ${RARITY_CONFIG[lot.prize.rarity].color}`}>
                    {RARITY_CONFIG[lot.prize.rarity].label}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground font-oswald">от {lot.seller}</div>
                <div className="divider-gold my-2" />
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Ставка</div>
                    <div className="text-xl font-playfair font-bold text-yellow-300">
                      {lot.currentBid} <span className="text-xs font-oswald">монет</span>
                    </div>
                    <div className="text-[10px] text-muted-foreground">лидер: {lot.bidder}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] text-muted-foreground uppercase tracking-wider">До конца</div>
                    <div className={`font-oswald text-sm ${lot.endsIn < 60 ? "text-red-400 animate-pulse" : "text-yellow-300"}`}>
                      {formatTime(lot.endsIn)}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-3 flex gap-2">
              <input
                type="number"
                placeholder={`Мин. ${lot.currentBid + 50}`}
                className="flex-1 bg-[#1a1a1a] border border-yellow-800/30 rounded-lg px-3 py-2 text-sm text-foreground font-oswald focus:outline-none focus:border-yellow-700"
                value={bidAmounts[lot.id] || ""}
                onChange={e => setBidAmounts(prev => ({ ...prev, [lot.id]: parseInt(e.target.value) }))}
              />
              <button
                onClick={() => placeBid(lot)}
                disabled={lot.endsIn === 0}
                className="btn-gold px-4 py-2 rounded-lg text-sm disabled:opacity-40"
              >
                Ставка
              </button>
            </div>
            {feedback[lot.id] && (
              <div className="text-xs mt-1 text-yellow-300 font-oswald">{feedback[lot.id]}</div>
            )}
          </div>
        ))}
      </div>

      {showSellModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={() => setShowSellModal(false)}>
          <div className="casino-card rounded-2xl p-6 w-full max-w-sm border border-yellow-800/50 animate-scale-in" onClick={e => e.stopPropagation()}>
            <h2 className="font-playfair text-2xl text-yellow-300 mb-4 text-center">Выставить на аукцион</h2>
            <div className="divider-gold mb-4" />

            <div className="grid grid-cols-2 gap-2 mb-4">
              {inventory.map(prize => (
                <button
                  key={prize.id}
                  onClick={() => setSelectedPrize(prize)}
                  className={`rounded-xl p-3 border flex flex-col items-center gap-1 transition-all ${
                    selectedPrize?.id === prize.id
                      ? "border-yellow-400 bg-yellow-950/60"
                      : `${RARITY_CONFIG[prize.rarity].border} ${RARITY_CONFIG[prize.rarity].bg}`
                  }`}
                >
                  <span className="text-2xl">{prize.emoji}</span>
                  <span className="text-xs font-oswald text-yellow-300 text-center leading-tight">{prize.name}</span>
                </button>
              ))}
            </div>

            {selectedPrize && (
              <div className="mb-4">
                <label className="text-xs text-muted-foreground font-oswald uppercase tracking-wider block mb-1">Начальная цена (монеты)</label>
                <input
                  type="number"
                  value={sellPrice}
                  onChange={e => setSellPrice(e.target.value)}
                  placeholder={`Рекомендуем ${selectedPrize.value}`}
                  className="w-full bg-[#1a1a1a] border border-yellow-800/30 rounded-lg px-3 py-2 text-foreground font-oswald focus:outline-none focus:border-yellow-700"
                />
              </div>
            )}

            <button
              onClick={sellPrize}
              disabled={!selectedPrize || !sellPrice}
              className="btn-gold w-full py-3 rounded-xl text-sm disabled:opacity-40"
            >
              Выставить на продажу
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// SHOP PAGE
// ============================================================
function ShopPage({ coins, onCoinsChange, session, onSave }: {
  coins: number;
  onCoinsChange: (v: number) => void;
  session: Session;
  onSave: (s: Session, d: Record<string, unknown>) => void;
}) {
  const [purchased, setPurchased] = usePersistedState<string[]>("rj_purchased", []);
  const purchasedSet = new Set(purchased);
  const [feedback, setFeedback] = useState("");

  const buy = (item: ShopItem) => {
    if (coins < item.price || purchasedSet.has(item.id)) return;
    const newCoins = coins - item.price;
    onCoinsChange(newCoins);
    const next = [...purchased, item.id];
    setPurchased(next);
    onSave(session, { coins: newCoins, purchased_items: next });
    setFeedback(`✓ Куплено: ${item.name}`);
    setTimeout(() => setFeedback(""), 3000);
  };

  const typeLabel: Record<string, string> = { boost: "Бустер", style: "Стиль", utility: "Утилита" };
  const typeColor: Record<string, string> = { boost: "text-yellow-300", style: "text-purple-400", utility: "text-blue-400" };

  return (
    <div className="flex flex-col gap-6 py-4 animate-fade-in-up">
      <div className="text-center">
        <h1 className="text-4xl font-playfair font-bold gold-text mb-1">Магазин</h1>
        <p className="text-muted-foreground font-cormorant italic text-lg">Улучшай игровой опыт за монеты</p>
      </div>

      {feedback && (
        <div className="casino-card border border-yellow-800 rounded-xl px-4 py-2 text-center text-yellow-300 font-oswald text-sm animate-scale-in">
          {feedback}
        </div>
      )}

      <div className="flex flex-col gap-4">
        {SHOP_ITEMS.map((item, idx) => {
          const owned = purchasedSet.has(item.id);
          const canAfford = coins >= item.price;
          return (
            <div key={item.id} className="casino-card rounded-2xl p-4 flex items-center gap-4" style={{ animationDelay: `${idx * 0.08}s` }}>
              <div className="w-14 h-14 rounded-xl bg-[#1a1a1a] border border-yellow-800/30 flex items-center justify-center text-3xl flex-shrink-0">
                {item.emoji}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-playfair font-semibold text-foreground">{item.name}</span>
                  <span className={`text-[10px] font-oswald uppercase ${typeColor[item.type]}`}>{typeLabel[item.type]}</span>
                </div>
                <p className="text-xs text-muted-foreground font-cormorant mt-0.5">{item.description}</p>
              </div>
              <button
                onClick={() => buy(item)}
                disabled={owned || !canAfford}
                className={`flex-shrink-0 px-4 py-2 rounded-xl text-sm font-oswald font-semibold tracking-wider transition-all
                  ${owned ? "bg-green-900/60 text-green-400 border border-green-700 cursor-default" :
                    canAfford ? "btn-gold" : "opacity-40 bg-[#1a1a1a] border border-border text-muted-foreground cursor-not-allowed"}`}
              >
                {owned ? "✓" : `${item.price.toLocaleString()}`}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================
// PROFILE PAGE
// ============================================================
function ProfilePage({ coins, inventory, session }: { coins: number; inventory: Prize[]; session: Session }) {
  const stats = { spins: 47, wins: 12, auctionWins: 3, level: 7, xp: 680, nextXp: 1000 };

  const grouped = {
    legendary: inventory.filter(p => p.rarity === "legendary"),
    epic: inventory.filter(p => p.rarity === "epic"),
    rare: inventory.filter(p => p.rarity === "rare"),
    common: inventory.filter(p => p.rarity === "common"),
  };

  return (
    <div className="flex flex-col gap-6 py-4 animate-fade-in-up">
      <div className="casino-card rounded-3xl p-6 text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-red-950/20 to-transparent pointer-events-none" />
        <div className="relative">
          <div className="w-20 h-20 rounded-full bg-[#1a1a1a] border-2 border-yellow-800 mx-auto mb-3 overflow-hidden flex items-center justify-center animate-float">
            {session.avatar
              ? <img src={session.avatar} alt={session.name} className="w-full h-full object-cover" />
              : <span className="text-4xl">🎭</span>}
          </div>
          <h2 className="font-playfair text-2xl font-bold text-yellow-300">{session.name || "Игрок"}</h2>
          <p className="font-cormorant italic text-muted-foreground">{session.email}</p>
          <div className="divider-gold my-3" />
          <div className="flex justify-center gap-6">
            <div>
              <div className="text-2xl font-playfair font-bold text-yellow-300">{coins.toLocaleString()}</div>
              <div className="text-[10px] text-muted-foreground font-oswald uppercase tracking-wider">монет</div>
            </div>
            <div className="w-px bg-yellow-800/30" />
            <div>
              <div className="text-2xl font-playfair font-bold text-yellow-300">{stats.level}</div>
              <div className="text-[10px] text-muted-foreground font-oswald uppercase tracking-wider">уровень</div>
            </div>
            <div className="w-px bg-yellow-800/30" />
            <div>
              <div className="text-2xl font-playfair font-bold text-yellow-300">{inventory.length}</div>
              <div className="text-[10px] text-muted-foreground font-oswald uppercase tracking-wider">призов</div>
            </div>
          </div>
        </div>
      </div>

      <div className="casino-card rounded-2xl p-4">
        <div className="flex justify-between text-xs font-oswald text-muted-foreground mb-2 uppercase tracking-wider">
          <span>Опыт уровня {stats.level}</span>
          <span>{stats.xp} / {stats.nextXp}</span>
        </div>
        <div className="h-2 bg-[#1a1a1a] rounded-full overflow-hidden">
          <div className="h-full rounded-full" style={{ width: `${(stats.xp / stats.nextXp) * 100}%`, background: "linear-gradient(90deg, #b8860b, #ffd700)" }} />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Прокрутов", value: stats.spins, emoji: "🎰" },
          { label: "Побед", value: stats.wins, emoji: "🏆" },
          { label: "Аукцион", value: stats.auctionWins, emoji: "🔨" },
        ].map(s => (
          <div key={s.label} className="casino-card rounded-2xl p-3 text-center">
            <div className="text-2xl mb-1">{s.emoji}</div>
            <div className="text-xl font-playfair font-bold text-yellow-300">{s.value}</div>
            <div className="text-[10px] text-muted-foreground font-oswald uppercase tracking-wider leading-tight">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="casino-card rounded-2xl p-4">
        <h3 className="font-playfair text-yellow-300 text-xl mb-3">Коллекция призов</h3>
        <div className="divider-gold mb-3" />
        {inventory.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-4xl mb-2">🎰</div>
            <p className="text-muted-foreground font-cormorant italic">Пора крутить слоты и собирать призы!</p>
          </div>
        ) : (
          Object.entries(grouped).map(([rarity, prizes]) => prizes.length > 0 && (
            <div key={rarity} className="mb-3">
              <div className={`text-xs font-oswald uppercase tracking-widest mb-2 ${RARITY_CONFIG[rarity as Prize["rarity"]].color}`}>
                {RARITY_CONFIG[rarity as Prize["rarity"]].label} ({prizes.length})
              </div>
              <div className="flex flex-wrap gap-2">
                {prizes.map(p => (
                  <div key={p.id} className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border text-xs ${RARITY_CONFIG[p.rarity].border} ${RARITY_CONFIG[p.rarity].bg}`}>
                    <span>{p.emoji}</span>
                    <span className="font-oswald text-foreground">{p.name}</span>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ============================================================
// INFO PAGE
// ============================================================
function InfoPage() {
  const sections = [
    { emoji: "🎰", title: "Слоты", content: "Каждые 5 часов вы получаете 2 бесплатных прокрута. Совпадение 3 символов — победа! Призы автоматически попадают в вашу коллекцию." },
    { emoji: "🔨", title: "Аукцион", content: "Выставляйте призы на торги или покупайте у других игроков. Побеждает последняя ставка до конца таймера. Монеты возвращаются при перебивании." },
    { emoji: "🏪", title: "Магазин", content: "Тратьте монеты на бустеры, украшения профиля и утилиты. Бустеры дают игровые преимущества, стили — уникальный вид." },
    { emoji: "💰", title: "Монеты", content: "Игровая валюта. Зарабатывайте продавая призы на аукционе. Тратьте в магазине на улучшения и преимущества." },
    { emoji: "⭐", title: "Редкость призов", content: "Обычный → Редкий → Эпический → Легендарный. Более редкие призы стоят дороже на аукционе и сложнее выпадают в слотах." },
  ];

  return (
    <div className="flex flex-col gap-6 py-4 animate-fade-in-up">
      <div className="text-center">
        <h1 className="text-4xl font-playfair font-bold gold-text mb-1">Об игре</h1>
        <p className="text-muted-foreground font-cormorant italic text-lg">Royal Jackpot — казино с аукционом</p>
      </div>

      <div className="casino-card rounded-3xl p-6 text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-red-950/15 via-transparent to-yellow-900/10 pointer-events-none" />
        <div className="relative">
          <div className="text-6xl mb-3 animate-float">👑</div>
          <h2 className="font-playfair text-2xl font-bold text-yellow-300 mb-2">Royal Jackpot</h2>
          <p className="font-cormorant italic text-muted-foreground leading-relaxed">
            Уникальная игровая платформа, где каждый прокрут барабана — шанс получить ценный приз, который можно продать на аукционе.
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {sections.map((s, idx) => (
          <div key={s.title} className="casino-card rounded-2xl p-4" style={{ animationDelay: `${idx * 0.1}s` }}>
            <div className="flex gap-3">
              <div className="text-3xl flex-shrink-0">{s.emoji}</div>
              <div>
                <h3 className="font-playfair font-semibold text-yellow-300 text-lg mb-1">{s.title}</h3>
                <p className="text-sm text-muted-foreground font-cormorant leading-relaxed">{s.content}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="casino-card rounded-2xl p-4">
        <h3 className="font-playfair text-yellow-300 text-xl mb-3 text-center">Редкость призов</h3>
        <div className="divider-gold mb-3" />
        <div className="flex flex-col gap-2">
          {(Object.entries(RARITY_CONFIG) as [Prize["rarity"], typeof RARITY_CONFIG[Prize["rarity"]]][]).map(([key, cfg]) => (
            <div key={key} className={`flex items-center gap-3 p-2 rounded-lg border ${cfg.border} ${cfg.bg}`}>
              <span className={`font-oswald uppercase text-sm tracking-wider ${cfg.color}`}>{cfg.label}</span>
              <span className="text-muted-foreground text-xs font-cormorant ml-auto">
                {key === "common" ? "Выпадает часто" : key === "rare" ? "Редко" : key === "epic" ? "Очень редко" : "Крайне редко"}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="text-center">
        <p className="text-[10px] font-oswald tracking-[0.3em] text-muted-foreground/30 uppercase">
          ♠ ♥ ♦ ♣ Royal Jackpot v1.0 ♣ ♦ ♥ ♠
        </p>
      </div>
    </div>
  );
}

// ============================================================
// MAIN MENU
// ============================================================
function MenuPage({ onNavigate }: { onNavigate: (p: Page) => void }) {
  const items = [
    { page: "slots" as Page, emoji: "🎰", title: "Слоты", desc: "Крути барабаны и выигрывай призы" },
    { page: "auction" as Page, emoji: "🔨", title: "Аукцион", desc: "Торгуй трофеями с другими игроками" },
    { page: "shop" as Page, emoji: "🏪", title: "Магазин", desc: "Улучшения и бустеры за монеты" },
    { page: "profile" as Page, emoji: "🎭", title: "Профиль", desc: "Статистика и коллекция призов" },
    { page: "info" as Page, emoji: "📖", title: "Об игре", desc: "Правила и механики игры" },
  ];

  return (
    <div className="flex flex-col items-center gap-8 py-6 animate-fade-in-up">
      <div className="text-center">
        <div className="text-6xl mb-2 animate-float">👑</div>
        <h1 className="text-5xl font-playfair font-black gold-text leading-tight">Royal</h1>
        <h1 className="text-5xl font-playfair font-black gold-text leading-tight">Jackpot</h1>
        <div className="divider-gold my-3 mx-8" />
        <p className="font-cormorant italic text-muted-foreground text-lg tracking-wide">
          Казино. Аукцион. Трофеи.
        </p>
      </div>

      <div className="w-full flex flex-col gap-3">
        {items.map((item, idx) => (
          <button
            key={item.page}
            onClick={() => onNavigate(item.page)}
            className="casino-card rounded-2xl p-4 flex items-center gap-4 w-full text-left transition-all duration-200 hover:scale-[1.01]"
            style={{ animationDelay: `${idx * 0.1}s` }}
          >
            <div className="w-14 h-14 rounded-xl bg-[#1a1a1a] border border-yellow-800/30 flex items-center justify-center text-3xl flex-shrink-0">
              {item.emoji}
            </div>
            <div className="flex-1">
              <div className="font-playfair font-bold text-yellow-300 text-xl">{item.title}</div>
              <div className="font-cormorant italic text-muted-foreground text-sm">{item.desc}</div>
            </div>
            <Icon name="ChevronRight" size={20} className="text-yellow-800/60 flex-shrink-0" />
          </button>
        ))}
      </div>

      <p className="text-[10px] font-oswald tracking-[0.3em] text-muted-foreground/30 uppercase">
        ♠ ♥ ♦ ♣ Royal Jackpot ♣ ♦ ♥ ♠
      </p>
    </div>
  );
}

// ============================================================
// ROOT APP
// ============================================================
export default function App() {
  const [session, setSession] = useState<Session | null>(() => getSession());
  const [page, setPage] = usePersistedState<Page>("rj_page", "menu");
  const [coins, setCoins] = usePersistedState<number>("rj_coins", 2500);
  const [inventory, setInventory] = usePersistedState<Prize[]>("rj_inventory", []);
  const [loadingData, setLoadingData] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Загружаем данные с сервера после логина
  const loadPlayerData = useCallback(async (s: Session) => {
    setLoadingData(true);
    try {
      const data = await apiLoadPlayer(s);
      if (data) {
        setCoins(data.coins ?? 2500);
        setInventory(data.inventory ?? []);
        localStorage.setItem("rj_spins_left", JSON.stringify(data.spins_left ?? 2));
        localStorage.setItem("rj_spin_refill_at", JSON.stringify(data.spin_refill_at ?? Date.now() + 5 * 60 * 60 * 1000));
        localStorage.setItem("rj_spin_history", JSON.stringify(data.spin_history ?? []));
        localStorage.setItem("rj_purchased", JSON.stringify(data.purchased_items ?? []));
      }
    } finally {
      setLoadingData(false);
    }
  }, [setCoins, setInventory]);

  // При старте — если сессия есть, грузим данные
  useEffect(() => {
    if (session) loadPlayerData(session);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Debounced сохранение на сервер при любом изменении
  const scheduleSave = useCallback((s: Session, data: Record<string, unknown>) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => apiSavePlayer(s, data), 2000);
  }, []);

  const handleCoinsChange = useCallback((v: number) => {
    setCoins(v);
    if (session) scheduleSave(session, { coins: v });
  }, [session, setCoins, scheduleSave]);

  const handleInventoryChange = useCallback((v: Prize[]) => {
    setInventory(v);
    if (session) scheduleSave(session, { inventory: v });
  }, [session, setInventory, scheduleSave]);

  const handleLogin = useCallback((s: Session) => {
    setSession(s);
    loadPlayerData(s);
  }, [loadPlayerData]);

  const handleLogout = useCallback(() => {
    clearSession();
    setSession(null);
  }, []);

  const NAV_ITEMS: { page: Page; icon: string; label: string }[] = [
    { page: "menu", icon: "Home", label: "Меню" },
    { page: "slots", icon: "Dices", label: "Слоты" },
    { page: "auction", icon: "Gavel", label: "Аукцион" },
    { page: "shop", icon: "ShoppingBag", label: "Магазин" },
    { page: "profile", icon: "User", label: "Профиль" },
  ];

  if (!session) return <LoginScreen onLogin={handleLogin} />;

  if (loadingData) return (
    <div className="min-h-screen bg-[#0d0d0d] flex flex-col items-center justify-center gap-4">
      <div className="text-5xl animate-float">👑</div>
      <p className="font-playfair text-xl gold-text animate-pulse">Загружаем ваш профиль...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0d0d0d] flex flex-col">
      {/* Top Bar */}
      <header className="sticky top-0 z-40 border-b border-yellow-800/20 bg-[#0d0d0d]/95 backdrop-blur-sm">
        <div className="max-w-md mx-auto px-4 py-3 flex items-center justify-between">
          <button onClick={() => setPage("menu")} className="font-playfair font-bold text-lg gold-text">
            👑 Royal Jackpot
          </button>
          <div className="flex items-center gap-2">
            <div className="casino-card rounded-full px-4 py-1.5 flex items-center gap-1.5">
              <span className="text-base">💰</span>
              <span className="font-oswald font-semibold text-yellow-300 text-sm">{coins.toLocaleString()}</span>
            </div>
            {session.avatar ? (
              <button onClick={handleLogout} title="Выйти">
                <img src={session.avatar} alt={session.name} className="w-8 h-8 rounded-full border border-yellow-800/50" />
              </button>
            ) : (
              <button onClick={handleLogout} className="w-8 h-8 rounded-full bg-[#1a1a1a] border border-yellow-800/50 flex items-center justify-center">
                <Icon name="User" size={14} className="text-yellow-600" />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 max-w-md mx-auto w-full px-4 pb-24 overflow-y-auto">
        {page === "menu" && <MenuPage onNavigate={setPage} />}
        {page === "slots" && <SlotsPage coins={coins} onCoinsChange={handleCoinsChange} inventory={inventory} onInventoryChange={handleInventoryChange} session={session} onSave={scheduleSave} />}
        {page === "auction" && <AuctionPage coins={coins} onCoinsChange={handleCoinsChange} inventory={inventory} onInventoryChange={handleInventoryChange} />}
        {page === "shop" && <ShopPage coins={coins} onCoinsChange={handleCoinsChange} session={session} onSave={scheduleSave} />}
        {page === "profile" && <ProfilePage coins={coins} inventory={inventory} session={session} />}
        {page === "info" && <InfoPage />}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-yellow-800/20 bg-[#0d0d0d]/95 backdrop-blur-sm">
        <div className="max-w-md mx-auto px-2 py-2 flex items-center justify-around">
          {NAV_ITEMS.map(item => (
            <button
              key={item.page}
              onClick={() => setPage(item.page)}
              className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all nav-item ${page === item.page ? "active bg-yellow-900/20" : ""}`}
            >
              <Icon name={item.icon} size={20} fallback="Circle" />
              <span className="text-[10px] leading-none">{item.label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}