import {
  type CSSProperties,
  type TouchEvent as ReactTouchEvent,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  DragDropContext,
  Draggable,
  Droppable,
  type DraggableStateSnapshot,
  type DraggingStyle,
  type NotDraggingStyle,
} from "@hello-pangea/dnd";
import { Settings, X } from "lucide-react";
import clsx from "clsx";

// ─────────────────────────────────────────────────────────────────────────────
// Constants & types
// ─────────────────────────────────────────────────────────────────────────────
const suits = ["hearts", "diamonds", "clubs", "spades"] as const;
const ranks = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"] as const;

type Suit = (typeof suits)[number];
type Rank = (typeof ranks)[number];
type CardColor = "red" | "black";

interface CardData {
  id: string;
  suit: Suit;
  rank: Rank;
  value: number;
  color: CardColor;
  faceUp: boolean;
}

interface GameState {
  tableau: CardData[][];
  stock: CardData[];
  waste: CardData[];
  foundations: CardData[][];
}

type Selection =
  | { source: "tableau"; columnIndex: number; cardIndex: number }
  | { source: "waste" }
  | { source: "foundation"; foundationIndex: number };

const STORAGE_KEY = "floof-solitaire-v1"; // ✨ persist game state
const SETTINGS_KEY = "floof-solitaire-settings-v1"; // ✨ persist settings

const WIN_GIFS = [
  "/images/cat.gif", // Cat jumping
  "/images/baby.gif", // Baby celebrating
  "/images/dog.gif", // Puppy sticker
  "/images/girl.gif", // Anime kiss
];

interface GameSettings {
  hapticFeedback: boolean;
  showHints: boolean;
  cardSize: "compact" | "normal" | "large";
  autoFlip: boolean;
  animationSpeed: "fast" | "normal" | "slow";
  noUnwinnable: boolean;
  cardsToFlip: 1 | 3;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers & hooks
// ─────────────────────────────────────────────────────────────────────────────
const createDeck = () => {
  let counter = 0;
  const deck: CardData[] = [];
  for (const suit of suits) {
    for (const rank of ranks) {
      deck.push({
        id: `${suit}-${rank}-${counter++}`,
        suit,
        rank,
        value: ranks.indexOf(rank) + 1,
        color: suit === "hearts" || suit === "diamonds" ? "red" : "black",
        faceUp: false,
      });
    }
  }
  return deck;
};

const shuffle = <T,>(items: T[]) => {
  const clone = [...items];
  for (let i = clone.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [clone[i], clone[j]] = [clone[j], clone[i]];
  }
  return clone;
};

const dealGame = (): GameState => {
  const deck = shuffle(createDeck());
  const tableau: CardData[][] = Array.from({ length: 7 }, () => []);
  let deckIndex = 0;

  for (let column = 0; column < 7; column++) {
    for (let row = 0; row <= column; row++) {
      const card = { ...deck[deckIndex], faceUp: row === column };
      tableau[column].push(card);
      deckIndex += 1;
    }
  }

  const stock = deck.slice(deckIndex).map((c) => ({ ...c, faceUp: false }));

  return {
    tableau,
    stock,
    waste: [],
    foundations: Array.from({ length: 4 }, () => []),
  };
};

const cloneState = (s: GameState): GameState => ({
  tableau: s.tableau.map((col) => col.map((c) => ({ ...c }))),
  stock: s.stock.map((c) => ({ ...c })),
  waste: s.waste.map((c) => ({ ...c })),
  foundations: s.foundations.map((f) => f.map((c) => ({ ...c }))),
});

const isOppositeColor = (a: CardData, b: CardData) => a.color !== b.color;

// Better validation logic from old solitaire
const isValidTableauMove = (cardsToMove: CardData[], destinationColumn: CardData[]) => {
  if (destinationColumn.length === 0) {
    return cardsToMove[0].rank === "K";
  }
  const lastCard = destinationColumn[destinationColumn.length - 1];
  const firstCardToMove = cardsToMove[0];
  return (
    lastCard.faceUp &&
    firstCardToMove.value === lastCard.value - 1 &&
    isOppositeColor(firstCardToMove, lastCard)
  );
};

const isValidFoundationMove = (cardsToMove: CardData[], foundationPile: CardData[], suitIndex: number) => {
  if (cardsToMove.length !== 1) return false; // Only single cards to foundation
  if (foundationPile.length === 0) {
    return cardsToMove[0].rank === "A" && suits.indexOf(cardsToMove[0].suit) === suitIndex;
  }
  const lastCard = foundationPile[foundationPile.length - 1];
  const firstCardToMove = cardsToMove[0];
  return (
    firstCardToMove.suit === lastCard.suit &&
    firstCardToMove.value === lastCard.value + 1
  );
};

const canPlaceOnTableau = (moving: CardData, target?: CardData) => {
  if (!target) return moving.rank === "K";
  return target.faceUp && moving.value === target.value - 1 && isOppositeColor(moving, target);
};

const canPlaceOnFoundation = (moving: CardData, stack: CardData[], suitIndex: number) => {
  if (stack.length === 0) return moving.rank === "A" && suits.indexOf(moving.suit) === suitIndex;
  const top = stack[stack.length - 1];
  return moving.suit === top.suit && moving.value === top.value + 1;
};

// Helper for hint checking
const canDropOnFoundationIndex = (card: CardData, foundationIndex: number, foundations: CardData[][]) => {
  return canPlaceOnFoundation(card, foundations[foundationIndex], foundationIndex);
};

const cardSymbols: Record<Suit, string> = {
  hearts: "\u2665", // Traditional heart (flat)
  diamonds: "\u2666",
  clubs: "🐾", // Cat's paw prints
  spades: "\u263E", // Moon symbol (dark, mushroom)
};

// ✨ Compute stack spacing from actual card width.
// Keeps columns readable on small screens.
const getTableauOffset = (length: number, cardWidth: number) => {
  const base = Math.round(cardWidth * 0.34); // short stacks
  const medium = Math.round(cardWidth * 0.28);
  const long = Math.round(cardWidth * 0.24);
  if (length <= 4) return Math.max(20, base);
  if (length <= 8) return Math.max(18, medium);
  if (length <= 12) return Math.max(16, long);
  // very long stacks → tighter spacing
  return Math.max(14, Math.round(cardWidth * 0.20));
};

// ✨ Simple double‑tap hook (reliable on iOS/Android)
function useDoubleTap(cb: () => void, delay = 240) {
  const last = useRef(0);
  const timeout = useRef<number | null>(null);
  useEffect(() => {
    return () => {
      if (timeout.current) window.clearTimeout(timeout.current);
    };
  }, []);
  return useCallback(() => {
    const now = Date.now();
    if (now - last.current < delay) {
      if (timeout.current) window.clearTimeout(timeout.current);
      last.current = 0;
      cb();
    } else {
      last.current = now;
      timeout.current = window.setTimeout(() => (last.current = 0), delay);
    }
  }, [cb, delay]);
}

// ✨ Measure container size with ResizeObserver (better than window.innerWidth on mobile)
function useMeasure<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  useLayoutEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setSize({ width, height });
    });
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);
  return [ref, size] as const;
}

// ─────────────────────────────────────────────────────────────────────────────
// Card
// ─────────────────────────────────────────────────────────────────────────────
interface CardProps {
  card: CardData;
  onClick: () => void;
  onDoubleClick: () => void; // double‑tap on mobile
  isSelectable: boolean;
  isSelected: boolean;
  width: number;
  style?: CSSProperties;
  forceFlip?: boolean; // Force flip animation on mount
}

const Card = ({
  card,
  onClick,
  onDoubleClick,
  isSelectable,
  isSelected,
  width,
  style,
  forceFlip = false,
}: CardProps) => {
  const [isFlipping, setIsFlipping] = useState(forceFlip);
  const prevFaceUpRef = useRef(card.faceUp);

  // Detect when card flips from face-down to face-up
  useEffect(() => {
    if (forceFlip) {
      setIsFlipping(true);
      const timer = setTimeout(() => setIsFlipping(false), 600);
      return () => clearTimeout(timer);
    }
    if (!prevFaceUpRef.current && card.faceUp) {
      setIsFlipping(true);
      const timer = setTimeout(() => setIsFlipping(false), 600);
      return () => clearTimeout(timer);
    }
    prevFaceUpRef.current = card.faceUp;
  }, [card.faceUp, forceFlip]);

  const baseClasses =
    // ✨ slightly larger hit‑target (negative margin creates "hit slop" around the card)
    "relative aspect-[2.5/3.5] rounded-xl shadow-lg transition-transform duration-150 touch-none select-none p-0 -m-0.5";
  const faceUpClasses = "bg-white border border-slate-200";
  const faceDownClasses =
    "bg-gradient-to-br from-emerald-600 to-emerald-800 border border-emerald-900";

  const handleDoubleTap = useDoubleTap(() => {
    if (card.faceUp) onDoubleClick();
  });

  return (
    <div
      onClick={(e) => {
        // Don't prevent drag - let react-beautiful-dnd handle it
        if (isSelectable && !e.defaultPrevented) onClick();
      }}
      onDoubleClick={(e) => {
        if (card.faceUp && !e.defaultPrevented) onDoubleClick();
      }}
      onTouchEnd={(e) => {
        if (!e.defaultPrevented) handleDoubleTap();
      }}
      className={clsx(
        baseClasses,
        card.faceUp ? faceUpClasses : faceDownClasses,
        !isSelectable && "cursor-not-allowed opacity-70",
        isSelected && "ring-4 ring-amber-400 scale-105",
        isFlipping && "animate-card-flip",
        "cursor-pointer"
      )}
      style={{ width, ...style }}
      role="button"
      tabIndex={isSelectable ? 0 : -1}
      aria-label={
        card.faceUp
          ? `${card.rank} of ${card.suit}`
          : "Face down card"
      }
    >
      {card.faceUp ? (
        <div className="flex h-full flex-col justify-between p-2">
          <div
            className={clsx(
              "font-bold leading-tight text-base",
              card.color === "red" ? "text-red-600" : "text-slate-800"
            )}
          >
            {card.rank}
          </div>
          <div className="flex justify-center text-3xl leading-none" aria-hidden>
            <span className={card.color === "red" ? "text-red-500" : "text-slate-700"}>
              {cardSymbols[card.suit]}
            </span>
          </div>
        </div>
      ) : (
        <div className="absolute inset-0 overflow-hidden rounded-xl">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(255,255,255,0.15),_rgba(0,0,0,0))]" />
          <div className="absolute inset-0 flex items-center justify-center text-emerald-100 text-xs font-semibold uppercase tracking-widest">
            Floof
          </div>
        </div>
      )}
    </div>
  );
};

const EmptyCardSlot = ({ label, width }: { label: string; width: number }) => (
  <div
    className="aspect-[2.5/3.5] rounded-xl border-2 border-dashed border-white/30 bg-white/5 flex items-center justify-center text-xs uppercase tracking-wide text-white/70"
    style={{ width }}
  >
    {label}
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// Greedy solver for "no unwinnable games" setting
// ─────────────────────────────────────────────────────────────────────────────
function isLikelyWinnable(seed: GameState, stepLimit = 1500, maxStockCycles = 3): boolean {
  const state = cloneState(seed);
  let stockCycles = 0;
  let steps = 0;

  const topOf = (arr: CardData[]) => arr[arr.length - 1];

  const moveTableauToFoundation = () => {
    for (let i = 0; i < state.tableau.length; i++) {
      const top = topOf(state.tableau[i]);
      if (top?.faceUp) {
        const fi = suits.indexOf(top.suit);
        if (canPlaceOnFoundation(top, state.foundations[fi], fi)) {
          state.tableau[i].pop();
          state.foundations[fi].push(top);
          if (topOf(state.tableau[i]) && !topOf(state.tableau[i])!.faceUp) topOf(state.tableau[i])!.faceUp = true;
          return true;
        }
      }
    }
    return false;
  };

  const moveWasteToFoundation = () => {
    const w = topOf(state.waste);
    if (!w) return false;
    const fi = suits.indexOf(w.suit);
    if (canPlaceOnFoundation(w, state.foundations[fi], fi)) {
      state.waste.pop();
      state.foundations[fi].push(w);
      return true;
    }
    return false;
  };

  const flipAnyTop = () => {
    for (const col of state.tableau) {
      if (col.length && !topOf(col)!.faceUp) {
        topOf(col)!.faceUp = true;
        return true;
      }
    }
    return false;
  };

  const moveTableauToTableau = () => {
    for (let from = 0; from < state.tableau.length; from++) {
      const col = state.tableau[from];
      const firstUpIdx = col.findIndex((c) => c.faceUp);
      if (firstUpIdx < 0) continue;
      for (let start = firstUpIdx; start < col.length; start++) {
        const lead = col[start];
        for (let to = 0; to < state.tableau.length; to++) {
          if (to === from) continue;
          const targetTop = topOf(state.tableau[to]);
          if (canPlaceOnTableau(lead, targetTop)) {
            const moving = col.splice(start);
            state.tableau[to].push(...moving);
            if (topOf(col) && !topOf(col)!.faceUp) topOf(col)!.faceUp = true;
            return true;
          }
        }
      }
    }
    return false;
  };

  const moveWasteToTableau = () => {
    const w = topOf(state.waste);
    if (!w) return false;
    for (let to = 0; to < state.tableau.length; to++) {
      const targetTop = topOf(state.tableau[to]);
      if (canPlaceOnTableau(w, targetTop)) {
        state.waste.pop();
        state.tableau[to].push(w);
        return true;
      }
    }
    return false;
  };

  const draw = () => {
    if (state.stock.length) {
      const c = state.stock.pop()!;
      c.faceUp = true;
      state.waste.push(c);
      return true;
    }
    if (state.waste.length && stockCycles < maxStockCycles) {
      state.stock = state.waste.map((c) => ({ ...c, faceUp: false })).reverse();
      state.waste = [];
      stockCycles++;
      return true;
    }
    return false;
  };

  const foundationCount = () => state.foundations.reduce((n, f) => n + f.length, 0);

  while (steps++ < stepLimit) {
    if (foundationCount() === 52) return true;
    if (
      moveTableauToFoundation() ||
      moveWasteToFoundation() ||
      flipAnyTop() ||
      moveTableauToTableau() ||
      moveWasteToTableau() ||
      draw()
    ) {
      continue;
    }
    break; // stuck
  }

  return foundationCount() === 52;
}

function dealLikelyWinnable(attempts = 80): GameState {
  for (let i = 0; i < attempts; i++) {
    const g = dealGame();
    if (isLikelyWinnable(g)) return g;
  }
  return dealGame(); // fallback
}

// ─────────────────────────────────────────────────────────────────────────────
// Drag and drop helpers (react-beautiful-dnd)
// ─────────────────────────────────────────────────────────────────────────────

// Stop reordering animation - from old solitaire
export function getStyle(style: DraggingStyle | NotDraggingStyle | undefined, snapshot: DraggableStateSnapshot) {
  if (!snapshot.isDragging) {
    return {};
  }
  if (!snapshot.isDropAnimating) {
    return style;
  }
  return {
    ...style,
    transitionDuration: '0.001s',
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────
const Solitaire = () => {
  // ✨ load from localStorage first
  const [game, setGame] = useState<GameState>(() => {
    if (typeof window !== "undefined") {
      try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (raw) return JSON.parse(raw) as GameState;
      } catch {}
    }
    return dealGame();
  });

  const [history, setHistory] = useState<GameState[]>([]);
  const [selection, setSelection] = useState<Selection | null>(null);
  const [message, setMessage] = useState("");
  const [showSettings, setShowSettings] = useState(false);

  // ✨ load settings from localStorage
  const [settings, setSettings] = useState<GameSettings>(() => {
    if (typeof window !== "undefined") {
      try {
        const raw = window.localStorage.getItem(SETTINGS_KEY);
        if (raw) return JSON.parse(raw) as GameSettings;
      } catch {}
    }
    return {
      hapticFeedback: true,
      showHints: true,
      cardSize: "normal",
      autoFlip: true,
      animationSpeed: "normal",
      noUnwinnable: false,
      cardsToFlip: 1,
    };
  });

  const [lastWasteFlipId, setLastWasteFlipId] = useState<string | null>(null);
  const [showNewGameConfirm, setShowNewGameConfirm] = useState(false);
  const [showWinAnimation, setShowWinAnimation] = useState(false);
  const [winGifUrl, setWinGifUrl] = useState<string>("");

  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  // ✨ board measurement (replaces window.innerWidth for better mobile behavior)
  const [boardRef, boardSize] = useMeasure<HTMLDivElement>();

  // ✨ card sizing: larger minimum width for thumbs, foundation slightly smaller
  const sidePadding = 16; // px-4 on container
  const interColumnGap = 8; // gap-2
  const availableWidth = Math.max(
    320,
    (boardSize.width || (typeof window !== "undefined" ? window.innerWidth : 375)) -
      sidePadding * 2 -
      interColumnGap * 6
  );
  const computedCardWidth = Math.floor(availableWidth / 7);
  
  // Apply card size setting
  const sizeMultiplier = settings.cardSize === "compact" ? 0.85 : settings.cardSize === "large" ? 1.15 : 1;
  const baseCardWidth = computedCardWidth * sizeMultiplier;
  const cardWidth = Math.max(48, Math.min(baseCardWidth, 120)); // ✨ min 48px, max 120px
  const foundationCardWidth = Math.max(40, Math.min(Math.round(cardWidth * 0.78), 90));
  const columnWidth = cardWidth; // padding is visually accounted for with gaps

  const totalCardsInFoundation = useMemo(
    () => game.foundations.reduce((acc, stack) => acc + stack.length, 0),
    [game.foundations]
  );

  // ✨ persist state
  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(game));
    } catch {}
  }, [game]);

  // ✨ persist settings
  useEffect(() => {
    try {
      window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch {}
  }, [settings]);

  const recordHistory = useCallback(
    (previous: GameState) => setHistory((prev) => [...prev, cloneState(previous)]),
    []
  );

  const resetSelection = useCallback(() => setSelection(null), []);

  const updateGame = useCallback(
    (updater: (draft: GameState) => { changed: boolean; state: GameState }) => {
      setGame((current) => {
        const draft = cloneState(current);
        const { changed, state } = updater(draft);
        if (changed) {
          recordHistory(current);
          return state;
        }
        return current;
      });
    },
    [recordHistory]
  );

  const startNewGame = useCallback(() => {
    const next = settings.noUnwinnable ? dealLikelyWinnable(80) : dealGame();
    setGame(next);
    setHistory([]);
    setSelection(null);
    setMessage("");
    setShowNewGameConfirm(false);
  }, [settings.noUnwinnable]);

  const handleNewGameClick = useCallback(() => {
    // Check if there's any progress
    const hasProgress = totalCardsInFoundation > 0 || history.length > 0;
    if (hasProgress) {
      setShowNewGameConfirm(true);
    } else {
      startNewGame();
    }
  }, [totalCardsInFoundation, history.length, startNewGame]);

  const flipTopCard = (column: CardData[]) => {
    if (column.length > 0) {
      const top = column[column.length - 1];
      if (!top.faceUp) top.faceUp = true;
    }
  };

  // Drag handler from old solitaire - exact logic
  const handleDragEndWrapper = useCallback(
    (result: { source: any; destination: any }) => {
      setIsDragging(null);
      // Remove manual transforms
      const draggedCards = document.querySelectorAll('[data-rbd-draggable-id]');
      draggedCards.forEach((card) => {
        const element = card as HTMLElement;
        if (element.style.zIndex && parseInt(element.style.zIndex) > 5000) {
          element.style.zIndex = '';
        }
      });
      
      const { source, destination } = result;

      const uTableau = game.tableau.map((col) => col.map((c) => ({ ...c })));
      const uFoundations = game.foundations.map((f) => f.map((c) => ({ ...c })));
      let uWaste = [...game.waste];
      let failure = true;

      if (!destination || (source.droppableId === destination.droppableId && source.index === destination.index)) {
      resetSelection();
        return;
      }

      const sParts = source.droppableId.split('-');
      const dParts = destination.droppableId.split('-');

      const isCol = (parts: string[]) => parts[0] === 'col';
      const isSuit = (parts: string[]) => parts[0] === 'suit';

      const sColIdx = parseInt(sParts[1]);
      const dColIdx = parseInt(dParts[1]);
      const sIdx = source.index;

      if (isCol(sParts)) {
        if (isCol(dParts) && sColIdx !== dColIdx) {
          // Moving cards between tableau columns
          const cardsToMove = uTableau[sColIdx].slice(sIdx);
          if (isValidTableauMove(cardsToMove, uTableau[dColIdx])) {
            uTableau[dColIdx] = uTableau[dColIdx].concat(cardsToMove);
            uTableau[sColIdx] = uTableau[sColIdx].slice(0, sIdx);
            failure = false;
          }
        } else if (isSuit(dParts)) {
          // Moving cards from tableau to foundation
          const cardsToMove = uTableau[sColIdx].slice(sIdx);
          if (isValidFoundationMove(cardsToMove, uFoundations[dColIdx], dColIdx)) {
            uFoundations[dColIdx] = uFoundations[dColIdx].concat(cardsToMove);
            uTableau[sColIdx] = uTableau[sColIdx].slice(0, sIdx);
            failure = false;
          }
        }
      } else if (sParts[0] === 'waste') {
        // Moving cards from waste to tableau or foundation
        const cardsToMove = uWaste.slice(-1);
        if (isCol(dParts)) {
          if (isValidTableauMove(cardsToMove, uTableau[dColIdx])) {
            uTableau[dColIdx] = uTableau[dColIdx].concat(cardsToMove);
            uWaste = uWaste.slice(0, -1);
            failure = false;
          }
        } else if (isSuit(dParts)) {
          if (isValidFoundationMove(cardsToMove, uFoundations[dColIdx], dColIdx)) {
            uFoundations[dColIdx] = uFoundations[dColIdx].concat(cardsToMove);
            uWaste = uWaste.slice(0, -1);
            failure = false;
          }
        }
      } else if (isSuit(sParts) && isCol(dParts)) {
        // Moving cards from foundation to tableau
        const cardsToMove = uFoundations[sColIdx].slice(sIdx);
        if (isValidTableauMove(cardsToMove, uTableau[dColIdx])) {
          uTableau[dColIdx] = uTableau[dColIdx].concat(cardsToMove);
          uFoundations[sColIdx] = uFoundations[sColIdx].slice(0, sIdx);
          failure = false;
        }
      }

      // Flip cards programmatically
      uTableau.forEach((column) => {
        if (column.length > 0) {
          const lastCard = column[column.length - 1];
          if (!lastCard.faceUp) {
            lastCard.faceUp = true;
          }
        }
      });

      if (failure) {
        if (settings.hapticFeedback && navigator.vibrate) navigator.vibrate(8);
      resetSelection();
        return;
      }

      if (settings.hapticFeedback && navigator.vibrate) navigator.vibrate(12);

      updateGame(() => ({
        changed: true,
        state: {
          tableau: uTableau,
          stock: game.stock,
          waste: uWaste,
          foundations: uFoundations,
        },
      }));
      resetSelection();
    },
    [game, resetSelection, updateGame, settings.hapticFeedback]
  );

  const handleStockClick = useCallback(() => {
    if (game.stock.length === 0) {
    updateGame((draft) => {
        if (draft.waste.length === 0) return { changed: false, state: draft };
        draft.stock = draft.waste.map((c) => ({ ...c, faceUp: false })).reverse();
        draft.waste = [];
        return { changed: true, state: draft };
      });
      resetSelection();
      return;
      }

    const cardsToFlipCount = settings.cardsToFlip;
    const cardIds: string[] = [];
    
    updateGame((draft) => {
      const cardsToFlip: CardData[] = [];
      // Flip the specified number of cards (1 or 3)
      for (let i = 0; i < cardsToFlipCount && draft.stock.length > 0; i++) {
        const card = draft.stock.pop();
        if (card) {
          cardIds.push(card.id);
          card.faceUp = true;
          cardsToFlip.push(card);
        }
      }
      
      if (cardsToFlip.length === 0) return { changed: false, state: draft };
      
      // Add cards to waste in reverse order so the last flipped card is on top
      draft.waste.push(...cardsToFlip.reverse());
      return { changed: true, state: draft };
    });
    
    // Set the flip ID for pop-in animation (use the last card flipped)
    if (cardIds.length > 0) {
      setLastWasteFlipId(cardIds[cardIds.length - 1]);
      setTimeout(() => setLastWasteFlipId(null), 600); // Match card flip animation duration
    }
    
    resetSelection();
  }, [game.stock, resetSelection, updateGame, settings.cardsToFlip]);

  const handleTableauCardClick = useCallback(
    (columnIndex: number, cardIndex: number) => {
      const column = game.tableau[columnIndex];
      const card = column[cardIndex];
      if (!card.faceUp) {
        if (cardIndex === column.length - 1) {
          updateGame((draft) => {
            const targetColumn = draft.tableau[columnIndex];
            const top = targetColumn[targetColumn.length - 1];
            if (top && !top.faceUp) {
              top.faceUp = true;
              return { changed: true, state: draft };
            }
            return { changed: false, state: draft };
          });
        }
        return;
      }

      if (
        selection &&
        selection.source === "tableau" &&
        selection.columnIndex === columnIndex &&
        selection.cardIndex === cardIndex
      ) {
        setSelection(null);
        return;
      }

      setSelection({ source: "tableau", columnIndex, cardIndex });
    },
    [game.tableau, selection, updateGame]
  );

  const getMovingCardsFromSelection = useCallback((): CardData[] | null => {
    if (!selection) return null;
      switch (selection.source) {
      case "tableau":
        return game.tableau[selection.columnIndex].slice(selection.cardIndex);
      case "waste":
        return game.waste.length ? [game.waste[game.waste.length - 1]] : null;
      case "foundation":
        return game.foundations[selection.foundationIndex].length
          ? [game.foundations[selection.foundationIndex].slice(-1)[0]]
          : null;
    }
  }, [game.foundations, game.tableau, game.waste, selection]);

  // ✨ target‑hint helpers (used to auto‑highlight droppables)
  const canDropOnColumn = (idx: number) => {
    const moving = getMovingCardsFromSelection();
    if (!moving || moving.length === 0) return false;
    const targetTop = game.tableau[idx][game.tableau[idx].length - 1];
    return canPlaceOnTableau(moving[0], targetTop);
  };
  const canDropOnFoundationIndex = (idx: number) => {
    const moving = getMovingCardsFromSelection();
    if (!moving || moving.length === 0) return false;
    return canPlaceOnFoundation(moving[0], game.foundations[idx], idx);
  };

  const handleTableauBackgroundClick = useCallback(
    (columnIndex: number) => {
      if (!selection) return;
      // Convert selection to react-beautiful-dnd format for click moves
      let source: any = {};
      if (selection.source === "tableau") {
        source = { droppableId: `col-${selection.columnIndex}`, index: selection.cardIndex };
      } else if (selection.source === "waste") {
        source = { droppableId: "waste", index: game.waste.length - 1 };
      } else if (selection.source === "foundation") {
        source = { droppableId: `suit-${selection.foundationIndex}`, index: game.foundations[selection.foundationIndex].length - 1 };
      }
      handleDragEndWrapper({ source, destination: { droppableId: `col-${columnIndex}`, index: game.tableau[columnIndex].length } });
    },
    [handleDragEndWrapper, selection, game]
  );

  const handleWasteClick = useCallback(() => {
    if (!game.waste.length) return setSelection(null);
    if (selection?.source === "waste") return setSelection(null);
    setSelection({ source: "waste" });
  }, [game.waste, selection]);

  const handleFoundationClick = useCallback(
    (foundationIndex: number) => {
      const stack = game.foundations[foundationIndex];
      const top = stack[stack.length - 1];

      if (!selection) {
        if (top) setSelection({ source: "foundation", foundationIndex });
        return;
      }

      // Convert selection to react-beautiful-dnd format for click moves
      let source: any = {};
      if (selection.source === "tableau") {
        source = { droppableId: `col-${selection.columnIndex}`, index: selection.cardIndex };
      } else if (selection.source === "waste") {
        source = { droppableId: "waste", index: game.waste.length - 1 };
      } else if (selection.source === "foundation") {
        source = { droppableId: `suit-${selection.foundationIndex}`, index: game.foundations[selection.foundationIndex].length - 1 };
      }
      handleDragEndWrapper({ source, destination: { droppableId: `suit-${foundationIndex}`, index: stack.length } });
    },
    [handleDragEndWrapper, game.foundations, game.waste, game.tableau, selection]
  );

  const handleAutoMoveSelection = useCallback(() => {
    if (!selection) return;
    // Try to move to foundation - find the right foundation for this card
    let cardToMove: CardData | undefined;
    switch (selection.source) {
      case "tableau":
        cardToMove = game.tableau[selection.columnIndex][selection.cardIndex];
        break;
      case "waste":
        cardToMove = game.waste.slice(-1)[0];
        break;
      case "foundation":
        cardToMove = game.foundations[selection.foundationIndex].slice(-1)[0];
        break;
    }
    if (!cardToMove) return setSelection(null);
    const foundationIndex = suits.indexOf(cardToMove.suit);
    
    // Convert selection to react-beautiful-dnd format
    let source: any = {};
    if (selection.source === "tableau") {
      source = { droppableId: `col-${selection.columnIndex}`, index: selection.cardIndex };
    } else if (selection.source === "waste") {
      source = { droppableId: "waste", index: game.waste.length - 1 };
    } else if (selection.source === "foundation") {
      source = { droppableId: `suit-${selection.foundationIndex}`, index: game.foundations[selection.foundationIndex].length - 1 };
    }
    handleDragEndWrapper({ source, destination: { droppableId: `suit-${foundationIndex}`, index: game.foundations[foundationIndex].length } });
  }, [game.foundations, game.tableau, game.waste, handleDragEndWrapper, selection]);

  const handleCardDoubleClick = useCallback(
    (origin: Selection, card: CardData) => {
      const foundationIndex = suits.indexOf(card.suit);
      
      // Convert selection to react-beautiful-dnd format
      let source: any = {};
      if (origin.source === "tableau") {
        source = { droppableId: `col-${origin.columnIndex}`, index: origin.cardIndex };
      } else if (origin.source === "waste") {
        source = { droppableId: "waste", index: game.waste.length - 1 };
      } else if (origin.source === "foundation") {
        source = { droppableId: `suit-${origin.foundationIndex}`, index: game.foundations[origin.foundationIndex].length - 1 };
      }
      handleDragEndWrapper({ source, destination: { droppableId: `suit-${foundationIndex}`, index: game.foundations[foundationIndex].length } });
    },
    [handleDragEndWrapper, game]
  );

  const autoPlayToFoundation = useCallback(() => {
    let moved = false;
    updateGame((draft) => {
      const tryMove = () => {
        for (let i = 0; i < draft.tableau.length; i++) {
          const column = draft.tableau[i];
          const card = column[column.length - 1];
          if (card && card.faceUp) {
            const foundationIndex = suits.indexOf(card.suit);
            if (canPlaceOnFoundation(card, draft.foundations[foundationIndex], foundationIndex)) {
              const movedCard = column.pop();
              if (movedCard) {
                draft.foundations[foundationIndex].push(movedCard);
                flipTopCard(column);
                return true;
              }
            }
          }
        }
        const wasteCard = draft.waste[draft.waste.length - 1];
        if (wasteCard) {
          const foundationIndex = suits.indexOf(wasteCard.suit);
          if (canPlaceOnFoundation(wasteCard, draft.foundations[foundationIndex], foundationIndex)) {
            draft.waste.pop();
            draft.foundations[foundationIndex].push(wasteCard);
            return true;
          }
        }
        return false;
      };
      while (tryMove()) moved = true;
      return { changed: moved, state: draft };
    });
    if (moved) resetSelection();
  }, [resetSelection, updateGame]);

  const simulateWin = useCallback(() => {
    updateGame((draft) => {
      // Collect all cards
      const allCards: CardData[] = [];
      
      // Get all cards from tableau
      draft.tableau.forEach(col => {
        col.forEach(card => {
          allCards.push({ ...card, faceUp: true });
        });
      });
      
      // Get all cards from waste
      draft.waste.forEach(card => {
        allCards.push({ ...card, faceUp: true });
      });
      
      // Get all cards from stock
      draft.stock.forEach(card => {
        allCards.push({ ...card, faceUp: true });
      });
      
      // Sort cards by suit and rank
      const sortedCards: CardData[][] = [[], [], [], []]; // One array per suit
      allCards.forEach(card => {
        const suitIndex = suits.indexOf(card.suit);
        sortedCards[suitIndex].push(card);
      });
      
      // Sort each suit by rank (A, 2, 3, ..., K)
      sortedCards.forEach(suitCards => {
        suitCards.sort((a, b) => a.value - b.value);
      });
      
      // Move all cards to foundations
      draft.foundations = sortedCards;
      draft.tableau = [[], [], [], [], [], [], []];
      draft.waste = [];
      draft.stock = [];
      
      return { changed: true, state: draft };
    });
  }, [updateGame]);

  const undo = useCallback(() => {
    setHistory((prev) => {
      if (!prev.length) return prev;
      const last = prev[prev.length - 1];
      setGame(cloneState(last));
      setMessage("");
      return prev.slice(0, -1);
    });
    setSelection(null);
  }, []);

  useEffect(() => {
    if (totalCardsInFoundation === 52) {
      setMessage("Congratulations! You won the game.");
      // Randomly select a GIF
      const randomGif = WIN_GIFS[Math.floor(Math.random() * WIN_GIFS.length)];
      console.log('Win detected! Setting GIF:', randomGif);
      setWinGifUrl(randomGif);
      setShowWinAnimation(true);
      console.log('Win animation should be showing');
      // Hide animation after 5 seconds (increased from 3)
      const timer = setTimeout(() => {
        setShowWinAnimation(false);
        console.log('Win animation hidden');
      }, 5000);
      
      // Cleanup timer if component unmounts or win condition changes
      return () => clearTimeout(timer);
    } else {
      setMessage("");
      // Don't reset showWinAnimation here - let it fade naturally
    }
  }, [totalCardsInFoundation]);

  // Swipe gestures (kept from your version)

  const trySwipeMoveToAdjacentColumn = useCallback(
    (direction: -1 | 1) => {
      if (!selection) return false;
      const movingCards = getMovingCardsFromSelection();
      if (!movingCards?.length) return false;
      const leadCard = movingCards[0];

      let start =
        selection.source === "tableau"
          ? selection.columnIndex
          : direction === 1
          ? -1
          : game.tableau.length;

      for (let i = start + direction; i >= 0 && i < game.tableau.length; i += direction) {
        const target = game.tableau[i][game.tableau[i].length - 1];
        if (canPlaceOnTableau(leadCard, target)) {
          // Convert selection to react-beautiful-dnd format
          let source: any = {};
          if (selection.source === "tableau") {
            source = { droppableId: `col-${selection.columnIndex}`, index: selection.cardIndex };
          } else if (selection.source === "waste") {
            source = { droppableId: "waste", index: game.waste.length - 1 };
          } else if (selection.source === "foundation") {
            source = { droppableId: `suit-${selection.foundationIndex}`, index: game.foundations[selection.foundationIndex].length - 1 };
          }
          handleDragEndWrapper({ source, destination: { droppableId: `col-${i}`, index: game.tableau[i].length } });
          if (settings.hapticFeedback && navigator.vibrate) navigator.vibrate(10);
          return true;
        }
      }
      return false;
    },
    [game.tableau, game.waste, game.foundations, getMovingCardsFromSelection, handleDragEndWrapper, selection, settings.hapticFeedback]
  );

  const trySwipeMoveToFoundation = useCallback(() => {
    if (!selection) return false;
    let cardToMove: CardData | undefined;
    switch (selection.source) {
      case "tableau":
        cardToMove = game.tableau[selection.columnIndex][selection.cardIndex];
        break;
      case "waste":
        cardToMove = game.waste.slice(-1)[0];
        break;
      case "foundation":
        cardToMove = game.foundations[selection.foundationIndex].slice(-1)[0];
        break;
    }
    if (cardToMove) {
      const foundationIndex = suits.indexOf(cardToMove.suit);
      
      // Convert selection to react-beautiful-dnd format
      let source: any = {};
      if (selection.source === "tableau") {
        source = { droppableId: `col-${selection.columnIndex}`, index: selection.cardIndex };
      } else if (selection.source === "waste") {
        source = { droppableId: "waste", index: game.waste.length - 1 };
      } else if (selection.source === "foundation") {
        source = { droppableId: `suit-${selection.foundationIndex}`, index: game.foundations[selection.foundationIndex].length - 1 };
      }
      handleDragEndWrapper({ source, destination: { droppableId: `suit-${foundationIndex}`, index: game.foundations[foundationIndex].length } });
      if (settings.hapticFeedback && navigator.vibrate) navigator.vibrate(10);
      return true;
    }
    return false;
  }, [game.foundations, game.tableau, game.waste, handleDragEndWrapper, selection, settings.hapticFeedback]);

  const onTouchStart = useCallback(
    (e: ReactTouchEvent) => {
      if (!selection) return;
      const t = e.touches[0];
      touchStartRef.current = { x: t.clientX, y: t.clientY };
    },
    [selection]
  );

  const onTouchEnd = useCallback(
    (e: ReactTouchEvent) => {
      if (!selection || !touchStartRef.current) return;
      const t = e.changedTouches[0];
      const dx = t.clientX - touchStartRef.current.x;
      const dy = t.clientY - touchStartRef.current.y;
      touchStartRef.current = null;

      const absX = Math.abs(dx);
      const absY = Math.abs(dy);
      const threshold = 28;
      if (absX < threshold && absY < threshold) return;

      if (absX > absY) {
        dx > 0 ? trySwipeMoveToAdjacentColumn(1) : trySwipeMoveToAdjacentColumn(-1);
      } else {
        if (dy < 0) trySwipeMoveToFoundation();
        else {
          setSelection(null);
          if (settings.hapticFeedback && navigator.vibrate) navigator.vibrate(5);
        }
      }
    },
    [selection, trySwipeMoveToAdjacentColumn, trySwipeMoveToFoundation, settings.hapticFeedback]
  );

  // Controls (unchanged)
  const gameControls = (
    <div className="flex flex-wrap items-center gap-2 sm:gap-3">
      <button
        type="button"
        onClick={handleNewGameClick}
        className="rounded-full bg-purple-600 px-4 py-2 text-sm font-semibold text-white shadow-md transition hover:bg-purple-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
      >
        New Game
      </button>
      <button
        type="button"
        onClick={undo}
        className="rounded-full bg-white/10 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/80 disabled:cursor-not-allowed disabled:opacity-50"
        disabled={history.length === 0}
      >
        Undo
      </button>
      <button
        type="button"
        onClick={handleAutoMoveSelection}
        className="rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-emerald-950 shadow-md transition hover:bg-emerald-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-white disabled:cursor-not-allowed disabled:opacity-50"
        disabled={!selection}
      >
        Send to Foundation
      </button>
      <button
        type="button"
        onClick={autoPlayToFoundation}
        className="rounded-full bg-amber-400 px-4 py-2 text-sm font-semibold text-amber-950 shadow-md transition hover:bg-amber-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
      >
        Auto Play
      </button>
      <button
        type="button"
        onClick={simulateWin}
        className="rounded-full bg-pink-500 px-3 py-2 text-white shadow-md transition hover:bg-pink-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-white text-xs font-semibold"
        title="Simulate Win"
      >
        🎉
      </button>
    </div>
  );

  const [isDragging, setIsDragging] = useState<any>(null);

  const handleMultipleDrag = useCallback(() => {
    if (!isDragging) return;
    const source = isDragging.source || isDragging;
    const sParts = source.droppableId.split('-');
    
    if (sParts[0] === 'col') {
      const colIdx = parseInt(sParts[1]);
      const startIdx = source.index;
      const column = game.tableau[colIdx];
      
      const draggedCards = column.slice(startIdx);
      const draggedCard = document.querySelector(`[data-rbd-draggable-id="${draggedCards[0].id}"]`) as HTMLElement;
      if (!draggedCard) return;
      
      const translate = draggedCard.style.transform.match(/translate\(((-)?\d*.\d*)px, ((-)?\d*.\d*)px\)/);
      if (!translate) return;
      
      const x = parseFloat(translate[1]);
      const y = parseFloat(translate[3]);
      const offset = getTableauOffset(column.length, cardWidth);
      
      for (let i = 1; i < draggedCards.length; i++) {
        const card = document.querySelector(`[data-rbd-draggable-id="${draggedCards[i].id}"]`) as HTMLElement;
        if (card) {
          card.style.transform = `translate(${x}px, ${y + offset * i}px)`;
          card.style.zIndex = `${i + 5000}`;
        }
      }
    }
  }, [isDragging, game.tableau, cardWidth]);

  const handleDragStart = useCallback((result: { source: any; draggableId: string }) => {
    setIsDragging(result);
  }, []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('touchmove', handleMultipleDrag);
      window.addEventListener('mousemove', handleMultipleDrag);
    } else {
      window.removeEventListener('touchmove', handleMultipleDrag);
      window.removeEventListener('mousemove', handleMultipleDrag);
    }
    return () => {
      window.removeEventListener('touchmove', handleMultipleDrag);
      window.removeEventListener('mousemove', handleMultipleDrag);
    };
  }, [isDragging, handleMultipleDrag]);

  // Suppress @hello-pangea/dnd scroll container warnings
  useEffect(() => {
    const originalWarn = console.warn;
    console.warn = (...args: any[]) => {
      if (args[0]?.includes?.('@hello-pangea/dnd') && args[0]?.includes?.('scroll container')) {
        return; // Suppress this specific warning
      }
      originalWarn.apply(console, args);
    };
    return () => {
      console.warn = originalWarn;
    };
  }, []);

  const activeSelection = selection;

  return (
    <DragDropContext
      onDragEnd={handleDragEndWrapper}
      onDragStart={handleDragStart}
      onDragUpdate={() => {
        // Clean up any manual transforms after drag update
        const draggedCards = document.querySelectorAll('[data-rbd-draggable-id]');
        draggedCards.forEach((card) => {
          const element = card as HTMLElement;
          if (element.style.zIndex && parseInt(element.style.zIndex) > 5000) {
            // Reset z-index after drag
            setTimeout(() => {
              element.style.zIndex = '';
            }, 0);
          }
        });
      }}
      // Suppress scroll container warnings
      enableDefaultSensors={true}
    >
      <div
        className="fixed inset-0 bg-gradient-to-br from-emerald-900 via-emerald-800 to-slate-900 text-white"
        style={{
          height: "100dvh", // ✨ dynamic viewport height (iOS friendly)
          touchAction: "manipulation",
          overscrollBehaviorY: "contain", // ✨ avoid pull-to-refresh during drags
          paddingTop: "env(safe-area-inset-top)", // ✨ notch safe area
        }}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        {/* Win Animation */}
        {showWinAnimation && (
          <div className="fixed inset-0 z-[100] pointer-events-none flex items-center justify-center">
            {/* Confetti particles */}
            <div className="absolute inset-0 overflow-hidden">
              {Array.from({ length: 50 }).map((_, i) => {
                const delay = Math.random() * 0.5;
                const duration = 2 + Math.random() * 1;
                const left = Math.random() * 100;
                const colors = ['#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#8b5cf6', '#ec4899'];
                const color = colors[Math.floor(Math.random() * colors.length)];
                return (
                  <div
                    key={i}
                    className="absolute w-3 h-3 rounded-full animate-confetti"
                    style={{
                      left: `${left}%`,
                      backgroundColor: color,
                      animationDelay: `${delay}s`,
                      animationDuration: `${duration}s`,
                      top: '-10px',
                    }}
                  />
                );
              })}
            </div>
            
            {/* Celebration message with GIF */}
            <div className="relative z-10 text-center animate-bounce bg-black/20 rounded-2xl p-8 backdrop-blur-sm">
              {winGifUrl ? (
                <div className="mb-4 flex justify-center">
                  <img 
                    src={winGifUrl} 
                    alt="Celebration" 
                    className="w-48 h-48 object-contain"
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      console.error('GIF failed to load:', winGifUrl);
                      // Fallback to emoji
                      const target = e.target as HTMLImageElement;
                      if (target.parentElement) {
                        target.parentElement.innerHTML = '<div class="text-6xl">🎉</div>';
                      }
                    }}
                    onLoad={() => {
                      console.log('GIF loaded successfully:', winGifUrl);
                    }}
                  />
                </div>
              ) : (
                <div className="mb-4 text-6xl">🎉</div>
              )}
              <div className="text-4xl font-bold text-white mb-2 drop-shadow-lg">
                You Won!
              </div>
              <div className="text-xl text-white/90 drop-shadow-md">
                Amazing job! 🎊
              </div>
            </div>
          </div>
        )}

        {/* New Game Confirmation Modal */}
        {showNewGameConfirm && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
            onClick={() => setShowNewGameConfirm(false)}
          >
            <div
              className="bg-gradient-to-br from-emerald-900 via-emerald-800 to-slate-900 rounded-2xl border border-white/20 shadow-2xl max-w-sm w-full mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6">
                <h2 className="text-xl font-bold text-white mb-2">Start New Game?</h2>
                <p className="text-white/80 mb-6">
                  Your current progress will be lost. Are you sure you want to start a new game?
                </p>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setShowNewGameConfirm(false)}
                    className="flex-1 rounded-xl bg-white/10 px-4 py-3 text-sm font-semibold text-white shadow-lg active:scale-95 transition-transform hover:bg-white/20"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={startNewGame}
                    className="flex-1 rounded-xl bg-purple-600 px-4 py-3 text-sm font-semibold text-white shadow-lg active:scale-95 transition-transform hover:bg-purple-500"
                  >
                    New Game
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Settings Modal */}
        {showSettings && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
            onClick={() => setShowSettings(false)}
          >
            <div
              className="bg-gradient-to-br from-emerald-900 via-emerald-800 to-slate-900 rounded-2xl border border-white/20 shadow-2xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-4 border-b border-white/10">
                <h2 className="text-xl font-bold text-white">Settings</h2>
                <button
                  type="button"
                  onClick={() => setShowSettings(false)}
                  className="p-1 rounded-full hover:bg-white/10 transition-colors"
                  aria-label="Close settings"
                >
                  <X className="w-5 h-5 text-white" />
                </button>
              </div>
              <div className="p-4 space-y-4">
                {/* Haptic Feedback */}
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-semibold text-white">Haptic Feedback</label>
                    <p className="text-xs text-white/70">Vibration on moves</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSettings((s) => ({ ...s, hapticFeedback: !s.hapticFeedback }))}
                    className={clsx(
                      "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                      settings.hapticFeedback ? "bg-emerald-500" : "bg-white/20"
                    )}
                  >
                    <span
                      className={clsx(
                        "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                        settings.hapticFeedback ? "translate-x-6" : "translate-x-1"
                      )}
                    />
                  </button>
                </div>

                {/* Show Hints */}
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-semibold text-white">Show Hints</label>
                    <p className="text-xs text-white/70">Highlight valid moves</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSettings((s) => ({ ...s, showHints: !s.showHints }))}
                    className={clsx(
                      "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                      settings.showHints ? "bg-emerald-500" : "bg-white/20"
                    )}
                  >
                    <span
                      className={clsx(
                        "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                        settings.showHints ? "translate-x-6" : "translate-x-1"
                      )}
                    />
                  </button>
                </div>

                {/* Auto Flip */}
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-semibold text-white">Auto Flip Cards</label>
                    <p className="text-xs text-white/70">Flip cards automatically</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSettings((s) => ({ ...s, autoFlip: !s.autoFlip }))}
                    className={clsx(
                      "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                      settings.autoFlip ? "bg-emerald-500" : "bg-white/20"
                    )}
                  >
                    <span
                      className={clsx(
                        "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                        settings.autoFlip ? "translate-x-6" : "translate-x-1"
                      )}
                    />
                  </button>
                </div>

                {/* Card Size */}
                <div>
                  <label className="text-sm font-semibold text-white block mb-2">Card Size</label>
                  <div className="flex gap-2">
                    {(["compact", "normal", "large"] as const).map((size) => (
                      <button
                        key={size}
                        type="button"
                        onClick={() => setSettings((s) => ({ ...s, cardSize: size }))}
                        className={clsx(
                          "flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                          settings.cardSize === size
                            ? "bg-emerald-500 text-white"
                            : "bg-white/10 text-white/70 hover:bg-white/20"
                        )}
                      >
                        {size.charAt(0).toUpperCase() + size.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Animation Speed */}
                <div>
                  <label className="text-sm font-semibold text-white block mb-2">Animation Speed</label>
                  <div className="flex gap-2">
                    {(["fast", "normal", "slow"] as const).map((speed) => (
                      <button
                        key={speed}
                        type="button"
                        onClick={() => setSettings((s) => ({ ...s, animationSpeed: speed }))}
                        className={clsx(
                          "flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                          settings.animationSpeed === speed
                            ? "bg-emerald-500 text-white"
                            : "bg-white/10 text-white/70 hover:bg-white/20"
                        )}
                      >
                        {speed.charAt(0).toUpperCase() + speed.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Cards to Flip */}
                <div>
                  <label className="text-sm font-semibold text-white block mb-2">Cards to Flip</label>
                  <div className="flex gap-2">
                    {([1, 3] as const).map((count) => (
                      <button
                        key={count}
                        type="button"
                        onClick={() => setSettings((s) => ({ ...s, cardsToFlip: count }))}
                        className={clsx(
                          "flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                          settings.cardsToFlip === count
                            ? "bg-emerald-500 text-white"
                            : "bg-white/10 text-white/70 hover:bg-white/20"
                        )}
                      >
                        {count} Card{count > 1 ? 's' : ''}
                      </button>
                    ))}
                  </div>
                </div>

                {/* No unwinnable games */}
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <label className="text-sm font-semibold text-white">No unwinnable games</label>
                    <p className="text-xs text-white/70">
                      Try multiple deals and pick one that's likely solvable. (Fast heuristic)
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSettings((s) => ({ ...s, noUnwinnable: !s.noUnwinnable }))}
                    className={clsx(
                      "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                      settings.noUnwinnable ? "bg-emerald-500" : "bg-white/20"
                    )}
                  >
                    <span
                      className={clsx(
                        "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                        settings.noUnwinnable ? "translate-x-6" : "translate-x-1"
                      )}
                    />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Mobile board */}
        <div ref={boardRef} className="h-full flex flex-col">
          {/* Top area: Stock/Waste + Foundations */}
          <div className="flex-shrink-0 px-2 pt-2 pb-1">
            <div className="flex items-start justify-between gap-2">
              {/* Stock & Waste */}
              <div className="flex items-center gap-2">
                <div>
                  {game.stock.length > 0 ? (
                    <Card
                      card={game.stock[game.stock.length - 1]}
                      onClick={handleStockClick}
                      onDoubleClick={() => {}}
                      isSelectable
                      isSelected={false}
                      width={cardWidth}
                    />
                  ) : (
                    <button type="button" onClick={handleStockClick} className="flex h-full items-center justify-center">
                      <EmptyCardSlot label="Draw" width={cardWidth} />
                    </button>
                  )}
                </div>
                <Droppable droppableId="waste" isDropDisabled={true} isCombineEnabled={false}>
                  {(provided) => (
                    <div ref={provided.innerRef} {...provided.droppableProps}>
                      {game.waste.length > 0 ? (
                        <Draggable
                          draggableId={game.waste[game.waste.length - 1].id}
                          index={game.waste.length - 1}
                        >
                          {(provided, snapshot) => {
                            const topWaste = game.waste[game.waste.length - 1];
                            const animateThis = lastWasteFlipId === topWaste.id;
                            return (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                style={getStyle(provided.draggableProps.style, snapshot)}
                                className={clsx(animateThis && "animate-pop-in")}
                              >
                                <Card
                                  card={topWaste}
                                  onClick={handleWasteClick}
                                  onDoubleClick={() => handleCardDoubleClick({ source: "waste" }, topWaste)}
                                  isSelectable
                                  isSelected={activeSelection?.source === "waste"}
                                  width={cardWidth}
                                  forceFlip={animateThis}
                                />
                              </div>
                            );
                          }}
                        </Draggable>
                      ) : (
                        <button type="button" onClick={handleWasteClick} className="flex h-full items-center justify-center">
                          <EmptyCardSlot label="Waste" width={cardWidth} />
                        </button>
                      )}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </div>

              {/* Foundations (✨ highlight valid targets when a card is selected) */}
              <div className="flex items-center gap-2">
                {suits.map((suit, index) => {
                  const stack = game.foundations[index];
                  const top = stack[stack.length - 1];
                  const isSelected =
                    activeSelection?.source === "foundation" && activeSelection.foundationIndex === index;
                  const canAccept = settings.showHints && selection ? canDropOnFoundationIndex(index) : false;

                  return (
                    <Droppable key={suit} droppableId={`suit-${index}`} isDropDisabled={false} isCombineEnabled={false}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.droppableProps}
                          className={clsx(
                            "rounded-lg p-0.5",
                            (snapshot.isDraggingOver || isSelected || canAccept) && "ring-2 ring-amber-400/70"
                          )}
                        >
                          {stack.map((card, cardIndex) => (
                            <Draggable
                              key={card.id}
                              draggableId={card.id}
                              index={cardIndex}
                            >
                              {(provided, snapshot) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps}
                                  style={getStyle(provided.draggableProps.style, snapshot)}
                                  className={cardIndex === stack.length - 1 ? "" : "absolute"}
                                >
                                  <Card
                                    card={card}
                                    onClick={() => handleFoundationClick(index)}
                                    onDoubleClick={() => handleFoundationClick(index)}
                                    isSelectable
                                    isSelected={Boolean(isSelected && cardIndex === stack.length - 1)}
                                    width={foundationCardWidth}
                                  />
                                </div>
                              )}
                            </Draggable>
                          ))}
                          {stack.length === 0 && (
                            <EmptyCardSlot label={suit.charAt(0)} width={foundationCardWidth} />
                          )}
                          {provided.placeholder}
                        </div>
                      )}
                    </Droppable>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Tableau — ✨ horizontal scroll with snap, y hidden for perf */}
          <div
            className="flex-1 overflow-x-auto overflow-y-hidden pb-20 snap-x snap-mandatory"
            style={{ WebkitOverflowScrolling: "touch" }}
          >
            <div className="flex gap-2 px-2 h-full min-w-fit">
              {game.tableau.map((column, columnIndex) => {
                const offset = getTableauOffset(column.length, cardWidth);
                const selectionMatches =
                  activeSelection?.source === "tableau" && activeSelection.columnIndex === columnIndex;
                const canAccept = settings.showHints && selection ? canDropOnColumn(columnIndex) : false;

                return (
                  <Droppable key={`column-${columnIndex}`} droppableId={`col-${columnIndex}`} isDropDisabled={false} isCombineEnabled={false}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={clsx(
                          "relative rounded-lg border-2 bg-white/5 snap-start",
                          selectionMatches || snapshot.isDraggingOver || canAccept
                            ? "border-amber-400 bg-amber-400/10"
                            : "border-white/20"
                        )}
                        style={{ width: columnWidth }}
                        onClick={() => handleTableauBackgroundClick(columnIndex)}
                      >
                        {column.length === 0 ? (
                          <div className="flex h-full min-h-[120px] items-center justify-center text-xs uppercase tracking-wide text-white/30">
                            King
                          </div>
                        ) : (
                          <div
                            className="relative min-h-[120px] pb-2"
                            style={{
                              paddingBottom: `${Math.max(20, offset * column.length + 20)}px`,
                            }}
                          >
                            {column.map((card, cardIndex) => (
                              <Draggable
                                key={card.id}
                                draggableId={card.id}
                                index={cardIndex}
                                isDragDisabled={!card.faceUp}
                              >
                                {(provided, snapshot) => (
                                  <div
                                    ref={provided.innerRef}
                                    {...provided.draggableProps}
                                    {...provided.dragHandleProps}
                                    style={{
                                      ...getStyle(provided.draggableProps.style, snapshot),
                                      position: "absolute",
                                      top: `${cardIndex * offset}px`,
                                      left: 0,
                                    }}
                                  >
                                    <Card
                                      card={card}
                                      onClick={() => handleTableauCardClick(columnIndex, cardIndex)}
                                      onDoubleClick={() =>
                                        handleCardDoubleClick({ source: "tableau", columnIndex, cardIndex }, card)
                                      }
                                      isSelectable={card.faceUp}
                                      isSelected={
                                        selection?.source === "tableau" &&
                                        selection.columnIndex === columnIndex &&
                                        selection.cardIndex === cardIndex &&
                                        card.faceUp
                                      }
                                      width={cardWidth}
                                    />
                                  </div>
                                )}
                              </Draggable>
                            ))}
                          </div>
                        )}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                );
              })}
            </div>
          </div>

          {/* Sticky bottom controls */}
          <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-t from-emerald-900 via-emerald-800 to-emerald-800/80 backdrop-blur-sm border-t border-white/10 z-50"
               style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
            <div className="px-3 py-3 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={handleNewGameClick}
                className="flex-1 rounded-xl bg-purple-600 px-4 py-3 text-sm font-semibold text-white shadow-lg active:scale-95 transition-transform"
              >
                New
              </button>
              <button
                type="button"
                onClick={undo}
                className="flex-1 rounded-xl bg-white/10 px-4 py-3 text-sm font-semibold text-white shadow-lg active:scale-95 transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={history.length === 0}
              >
                Undo
              </button>
              <button
                type="button"
                onClick={autoPlayToFoundation}
                className="flex-1 rounded-xl bg-amber-400 px-4 py-3 text-sm font-semibold text-amber-950 shadow-lg active:scale-95 transition-transform"
              >
                Auto
              </button>
              <button
                type="button"
                onClick={() => setShowSettings(true)}
                className="rounded-xl bg-white/10 px-3 py-3 text-white shadow-lg active:scale-95 transition-transform hover:bg-white/20"
                aria-label="Settings"
              >
                <Settings className="w-5 h-5 text-white" />
              </button>
              <button
                type="button"
                onClick={simulateWin}
                className="rounded-xl bg-pink-500 px-3 py-3 text-white shadow-lg active:scale-95 transition-transform hover:bg-pink-600 text-xs font-semibold"
                title="Simulate Win"
              >
                🎉
              </button>
            </div>
            {message && (
              <div className="px-3 pb-2 text-center text-sm font-semibold text-emerald-50">{message}</div>
            )}
            <div className="px-3 pb-3 text-center text-xs text-white/60">{totalCardsInFoundation} / 52</div>
          </div>
        </div>

        {/* Desktop layout (unchanged aside from new getTableauOffset signature) */}
        <div className="hidden sm:block mx-auto max-w-[1200px] flex flex-col gap-4 px-4 py-8 h-full overflow-auto">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Solitaire</h1>
            <p className="text-sm text-emerald-100 sm:text-base">
                Draw-one Klondike built for desktop and mobile. Tap to select; swipe between columns or up to send home.
            </p>
          </div>
            <div>{/* re-using controls */}{gameControls}</div>
        </header>

        {message && (
          <div className="rounded-xl border border-emerald-200/40 bg-white/10 p-4 text-center text-lg font-semibold text-emerald-50">
            {message}
          </div>
        )}

        <section className="rounded-3xl border border-white/10 bg-white/5 p-3 sm:p-4">
          <div className="grid gap-4 sm:gap-6">
              {/* Stock/Waste + Foundations (desktop) */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-7 sm:gap-4">
              <div className="col-span-1 flex flex-col items-start gap-2 sm:col-span-3">
                <span className="text-xs uppercase tracking-widest text-white/70">Stock &amp; Waste</span>
                <div className="flex items-center gap-3">
                  <div>
                    {game.stock.length > 0 ? (
                      <Card
                        card={game.stock[game.stock.length - 1]}
                        onClick={handleStockClick}
                        onDoubleClick={() => {}}
                        isSelectable
                        isSelected={false}
                          width={cardWidth}
                      />
                    ) : (
                        <button type="button" onClick={handleStockClick} className="flex h-full items-center justify-center">
                          <EmptyCardSlot label="Draw" width={cardWidth} />
                      </button>
                    )}
                  </div>
                  <div>
                    {game.waste.length > 0 ? (
                      <div className={clsx(lastWasteFlipId === game.waste[game.waste.length - 1].id && "animate-pop-in")}>
                      <Card
                        card={game.waste[game.waste.length - 1]}
                        onClick={handleWasteClick}
                          onDoubleClick={() => handleCardDoubleClick({ source: "waste" }, game.waste.slice(-1)[0])}
                        isSelectable
                        isSelected={activeSelection?.source === "waste"}
                          width={cardWidth}
                          forceFlip={lastWasteFlipId === game.waste[game.waste.length - 1].id}
                      />
                      </div>
                    ) : (
                      <button type="button" onClick={handleWasteClick} className="flex h-full items-center justify-center">
                          <EmptyCardSlot label="Waste" width={cardWidth} />
                      </button>
                    )}
                  </div>
                </div>
                <p className="text-xs text-white/60">
                  Tap the draw pile to reveal a card. Tap the waste pile to select the top card.
                </p>
              </div>

              <div className="col-span-1 flex flex-col gap-2 sm:col-span-4">
                <span className="text-xs uppercase tracking-widest text-white/70">Foundations</span>
                <div className="flex flex-wrap items-start gap-3">
                  {suits.map((suit, index) => {
                    const stack = game.foundations[index];
                    const top = stack[stack.length - 1];
                    const isSelected =
                      activeSelection?.source === "foundation" && activeSelection.foundationIndex === index;
                    return (
                      <div
                        key={suit}
                        className="flex flex-col items-center gap-1"
                      >
                        {top ? (
                          <Card
                            card={top}
                            onClick={() => handleFoundationClick(index)}
                            onDoubleClick={() => handleFoundationClick(index)}
                            isSelectable
                            isSelected={Boolean(isSelected)}
                              width={cardWidth}
                          />
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleFoundationClick(index)}
                            className="flex h-full items-center justify-center"
                          >
                            <EmptyCardSlot label={suit} width={cardWidth} />
                          </button>
                        )}
                        <span className="text-xs capitalize text-white/70">{suit}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

              {/* Tableau (desktop) */}
            <div>
              <div className="mb-2 flex items-center justify-between text-xs uppercase tracking-widest text-white/60">
                <span>Tableau</span>
                <span>{totalCardsInFoundation} / 52 cards home</span>
              </div>
                <div>
                  <div className="flex gap-2 sm:gap-3">
                  {game.tableau.map((column, columnIndex) => {
                      const offset = getTableauOffset(column.length, cardWidth);
                    const selectionMatches =
                      activeSelection?.source === "tableau" && activeSelection.columnIndex === columnIndex;

                    return (
                      <div
                        key={`column-${columnIndex}`}
                        className={clsx(
                            "relative rounded-2xl border bg-white/5 p-1",
                            selectionMatches ? "border-amber-400" : "border-white/10"
                        )}
                          style={{ width: columnWidth }}
                        onClick={() => handleTableauBackgroundClick(columnIndex)}
                      >
                        {column.length === 0 ? (
                          <div className="flex h-full min-h-[8rem] items-center justify-center text-xs uppercase tracking-wide text-white/40">
                            Empty — place a King
                          </div>
                        ) : (
                          <div
                            className="relative min-h-[9rem] pb-12"
                            style={{ paddingBottom: `${Math.max(120, offset * column.length + 80)}px` }}
                          >
                            {column.map((card, cardIndex) => (
                              <Card
                                key={card.id}
                                card={card}
                                onClick={() => handleTableauCardClick(columnIndex, cardIndex)}
                                onDoubleClick={() =>
                                  handleCardDoubleClick({ source: "tableau", columnIndex, cardIndex }, card)
                                }
                                isSelectable={card.faceUp}
                                isSelected={
                                    selection?.source === "tableau" &&
                                    selection.columnIndex === columnIndex &&
                                    selection.cardIndex === cardIndex &&
                                    card.faceUp
                                }
                                  width={cardWidth}
                                style={{ position: "absolute", top: `${cardIndex * offset}px` }}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </section>

        <footer className="flex flex-col gap-2 rounded-3xl border border-white/10 bg-white/10 p-4 text-sm text-emerald-50 sm:flex-row sm:items-center sm:justify-between">
            <div>Tap cards to select. Double‑tap to send home. Swipe left/right to move between columns.</div>
          <div className="flex flex-wrap gap-2 text-xs uppercase tracking-widest text-white/60">
            <span>Draw 1</span>
            <span>Undo Enabled</span>
            <span>Mobile Friendly</span>
          </div>
        </footer>
      </div>

    </div>
    </DragDropContext>
  );
};

export default Solitaire;
