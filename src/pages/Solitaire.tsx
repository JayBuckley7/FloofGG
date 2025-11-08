import { type CSSProperties, useCallback, useEffect, useMemo, useState } from "react";
import clsx from "clsx";

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
  for (let i = clone.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [clone[i], clone[j]] = [clone[j], clone[i]];
  }
  return clone;
};

const dealGame = (): GameState => {
  const deck = shuffle(createDeck());
  const tableau: CardData[][] = Array.from({ length: 7 }, () => []);
  let deckIndex = 0;

  for (let column = 0; column < 7; column += 1) {
    for (let row = 0; row <= column; row += 1) {
      const card = { ...deck[deckIndex], faceUp: row === column };
      tableau[column].push(card);
      deckIndex += 1;
    }
  }

  const stock = deck.slice(deckIndex).map((card) => ({ ...card, faceUp: false }));

  return {
    tableau,
    stock,
    waste: [],
    foundations: Array.from({ length: 4 }, () => []),
  };
};

const cloneState = (state: GameState): GameState => ({
  tableau: state.tableau.map((column) => column.map((card) => ({ ...card }))),
  stock: state.stock.map((card) => ({ ...card })),
  waste: state.waste.map((card) => ({ ...card })),
  foundations: state.foundations.map((foundation) => foundation.map((card) => ({ ...card }))),
});

const isOppositeColor = (a: CardData, b: CardData) => a.color !== b.color;

const canPlaceOnTableau = (moving: CardData, target?: CardData) => {
  if (!target) {
    return moving.rank === "K";
  }
  return target.faceUp && target.value === moving.value + 1 && isOppositeColor(moving, target);
};

const canPlaceOnFoundation = (moving: CardData, stack: CardData[]) => {
  if (stack.length === 0) {
    return moving.rank === "A";
  }
  const top = stack[stack.length - 1];
  return moving.suit === top.suit && moving.value === top.value + 1;
};

const getTableauOffset = (length: number) => {
  if (length <= 4) return 36;
  if (length <= 8) return 30;
  if (length <= 12) return 26;
  return 22;
};

const cardSymbols: Record<Suit, string> = {
  hearts: "\u2665",
  diamonds: "\u2666",
  clubs: "\u2663",
  spades: "\u2660",
};

interface CardProps {
  card: CardData;
  onClick: () => void;
  onDoubleClick: () => void;
  isSelectable: boolean;
  isSelected: boolean;
  style?: CSSProperties;
}

const Card = ({ card, onClick, onDoubleClick, isSelectable, isSelected, style }: CardProps) => {
  const baseClasses = "relative w-16 sm:w-[4.5rem] aspect-[2.5/3.5] rounded-xl shadow-lg transition-transform duration-150";
  const faceUpClasses = "bg-white border border-slate-200";
  const faceDownClasses = "bg-gradient-to-br from-emerald-600 to-emerald-800 border border-emerald-900";

  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        if (isSelectable) {
          onClick();
        }
      }}
      onDoubleClick={(event) => {
        event.stopPropagation();
        if (card.faceUp) {
          onDoubleClick();
        }
      }}
      className={clsx(
        baseClasses,
        card.faceUp ? faceUpClasses : faceDownClasses,
        !isSelectable && "cursor-not-allowed opacity-70",
        isSelected && "ring-4 ring-amber-400 scale-105",
      )}
      style={style}
    >
      {card.faceUp ? (
        <div className="flex flex-col h-full justify-between p-2">
          <div className={clsx("font-semibold text-sm", card.color === "red" ? "text-red-600" : "text-slate-800")}> 
            {card.rank}
          </div>
          <div className="flex justify-center text-3xl" aria-hidden>
            <span className={card.color === "red" ? "text-red-500" : "text-slate-700"}>{cardSymbols[card.suit]}</span>
          </div>
          <div className={clsx("self-end text-sm font-semibold", card.color === "red" ? "text-red-600" : "text-slate-800")}> 
            {card.rank}
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
    </button>
  );
};

const EmptyCardSlot = ({ label }: { label: string }) => (
  <div className="w-16 sm:w-[4.5rem] aspect-[2.5/3.5] rounded-xl border-2 border-dashed border-white/30 bg-white/5 flex items-center justify-center text-xs uppercase tracking-wide text-white/70">
    {label}
  </div>
);

const Solitaire = () => {
  const [game, setGame] = useState<GameState>(() => dealGame());
  const [history, setHistory] = useState<GameState[]>([]);
  const [selection, setSelection] = useState<Selection | null>(null);
  const [message, setMessage] = useState("");

  const totalCardsInFoundation = useMemo(
    () => game.foundations.reduce((acc, stack) => acc + stack.length, 0),
    [game.foundations],
  );

  const recordHistory = useCallback(
    (previous: GameState) => {
      setHistory((prev) => [...prev, cloneState(previous)]);
    },
    [setHistory],
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
    [recordHistory],
  );

  const startNewGame = useCallback(() => {
    setGame(dealGame());
    setHistory([]);
    setSelection(null);
    setMessage("");
  }, []);

  const flipTopCard = (column: CardData[]) => {
    if (column.length > 0) {
      const top = column[column.length - 1];
      if (!top.faceUp) {
        top.faceUp = true;
      }
    }
  };

  const moveCardsToTableau = useCallback(
    (payload: { movingCards: CardData[]; targetColumnIndex: number; from: Selection }) => {
      updateGame((draft) => {
        const targetColumn = draft.tableau[payload.targetColumnIndex];
        const targetTop = targetColumn[targetColumn.length - 1];
        const leadCard = payload.movingCards[0];

        if (!canPlaceOnTableau(leadCard, targetTop)) {
          return { changed: false, state: draft };
        }

        switch (payload.from.source) {
          case "tableau": {
            const sourceColumn = draft.tableau[payload.from.columnIndex];
            const removed = sourceColumn.splice(payload.from.cardIndex);
            if (removed.length === 0) {
              return { changed: false, state: draft };
            }
            draft.tableau[payload.targetColumnIndex].push(...removed.map((card) => ({ ...card })));
            flipTopCard(sourceColumn);
            break;
          }
          case "waste": {
            if (draft.waste.length === 0) {
              return { changed: false, state: draft };
            }
            const wasteCard = draft.waste.pop();
            if (!wasteCard) {
              return { changed: false, state: draft };
            }
            draft.tableau[payload.targetColumnIndex].push({ ...wasteCard });
            break;
          }
          case "foundation": {
            const foundationStack = draft.foundations[payload.from.foundationIndex];
            if (foundationStack.length === 0) {
              return { changed: false, state: draft };
            }
            const foundationCard = foundationStack.pop();
            if (!foundationCard) {
              return { changed: false, state: draft };
            }
            draft.tableau[payload.targetColumnIndex].push({ ...foundationCard });
            break;
          }
          default:
            break;
        }

        return { changed: true, state: draft };
      });
      resetSelection();
    },
    [resetSelection, updateGame],
  );

  const moveCardToFoundation = useCallback(
    (payload: { card: CardData; from: Selection }) => {
      const foundationIndex = suits.indexOf(payload.card.suit);

      updateGame((draft) => {
        const targetFoundation = draft.foundations[foundationIndex];
        if (!canPlaceOnFoundation(payload.card, targetFoundation)) {
          return { changed: false, state: draft };
        }

        switch (payload.from.source) {
          case "tableau": {
            const sourceColumn = draft.tableau[payload.from.columnIndex];
            const removed = sourceColumn.splice(payload.from.cardIndex);
            if (removed.length !== 1) {
              // Only allow single card to foundation
              sourceColumn.splice(payload.from.cardIndex, 0, ...removed);
              return { changed: false, state: draft };
            }
            targetFoundation.push({ ...removed[0] });
            flipTopCard(sourceColumn);
            break;
          }
          case "waste": {
            const wasteCard = draft.waste.pop();
            if (!wasteCard) {
              return { changed: false, state: draft };
            }
            targetFoundation.push({ ...wasteCard });
            break;
          }
          case "foundation": {
            const sourceFoundation = draft.foundations[payload.from.foundationIndex];
            if (sourceFoundation.length === 0) {
              return { changed: false, state: draft };
            }
            const card = sourceFoundation.pop();
            if (!card || card.id !== payload.card.id) {
              if (card) sourceFoundation.push(card);
              return { changed: false, state: draft };
            }
            targetFoundation.push({ ...card });
            break;
          }
          default:
            break;
        }

        return { changed: true, state: draft };
      });
      resetSelection();
    },
    [resetSelection, updateGame],
  );

  const handleStockClick = useCallback(() => {
    updateGame((draft) => {
      if (draft.stock.length === 0) {
        if (draft.waste.length === 0) {
          return { changed: false, state: draft };
        }
        draft.stock = draft.waste
          .map((card) => ({ ...card, faceUp: false }))
          .reverse();
        draft.waste = [];
        return { changed: true, state: draft };
      }

      const card = draft.stock.pop();
      if (!card) {
        return { changed: false, state: draft };
      }
      card.faceUp = true;
      draft.waste.push({ ...card });
      return { changed: true, state: draft };
    });
    resetSelection();
  }, [resetSelection, updateGame]);

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
    [game.tableau, selection, updateGame],
  );

  const handleTableauBackgroundClick = useCallback(
    (columnIndex: number) => {
      if (!selection) {
        return;
      }

      let movingCards: CardData[] | null = null;
      switch (selection.source) {
        case "tableau": {
          const column = game.tableau[selection.columnIndex];
          movingCards = column.slice(selection.cardIndex);
          break;
        }
        case "waste": {
          if (game.waste.length === 0) return;
          movingCards = [game.waste[game.waste.length - 1]];
          break;
        }
        case "foundation": {
          const foundationStack = game.foundations[selection.foundationIndex];
          if (foundationStack.length === 0) return;
          movingCards = [foundationStack[foundationStack.length - 1]];
          break;
        }
        default:
          break;
      }

      if (!movingCards || movingCards.length === 0) {
        return;
      }

      moveCardsToTableau({ movingCards, targetColumnIndex: columnIndex, from: selection });
    },
    [game.foundations, game.tableau, game.waste, moveCardsToTableau, selection],
  );

  const handleWasteClick = useCallback(() => {
    if (game.waste.length === 0) {
      setSelection(null);
      return;
    }

    if (selection?.source === "waste") {
      setSelection(null);
      return;
    }

    setSelection({ source: "waste" });
  }, [game.waste, selection]);

  const handleFoundationClick = useCallback(
    (foundationIndex: number) => {
      const stack = game.foundations[foundationIndex];
      const top = stack[stack.length - 1];

      if (!selection) {
        if (top) {
          setSelection({ source: "foundation", foundationIndex });
        }
        return;
      }

      let cardToMove: CardData | undefined;
      switch (selection.source) {
        case "tableau": {
          cardToMove = game.tableau[selection.columnIndex][selection.cardIndex];
          break;
        }
        case "waste": {
          cardToMove = game.waste[game.waste.length - 1];
          break;
        }
        case "foundation": {
          cardToMove = game.foundations[selection.foundationIndex][
            game.foundations[selection.foundationIndex].length - 1
          ];
          break;
        }
        default:
          break;
      }

      if (!cardToMove) {
        setSelection(null);
        return;
      }

      moveCardToFoundation({ card: cardToMove, from: selection });
    },
    [game.foundations, game.tableau, game.waste, moveCardToFoundation, selection],
  );

  const handleAutoMoveSelection = useCallback(() => {
    if (!selection) return;

    let cardToMove: CardData | undefined;
    switch (selection.source) {
      case "tableau":
        cardToMove = game.tableau[selection.columnIndex][selection.cardIndex];
        break;
      case "waste":
        cardToMove = game.waste[game.waste.length - 1];
        break;
      case "foundation":
        cardToMove = game.foundations[selection.foundationIndex][
          game.foundations[selection.foundationIndex].length - 1
        ];
        break;
      default:
        break;
    }

    if (!cardToMove) {
      setSelection(null);
      return;
    }

    moveCardToFoundation({ card: cardToMove, from: selection });
  }, [game.foundations, game.tableau, game.waste, moveCardToFoundation, selection]);

  const handleCardDoubleClick = useCallback(
    (origin: Selection, card: CardData) => {
      moveCardToFoundation({ card, from: origin });
    },
    [moveCardToFoundation],
  );

  const autoPlayToFoundation = useCallback(() => {
    let moved = false;

    updateGame((draft) => {
      const tryMove = () => {
        for (let i = 0; i < draft.tableau.length; i += 1) {
          const column = draft.tableau[i];
          const card = column[column.length - 1];
          if (card && card.faceUp) {
            const foundationIndex = suits.indexOf(card.suit);
            if (canPlaceOnFoundation(card, draft.foundations[foundationIndex])) {
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
          if (canPlaceOnFoundation(wasteCard, draft.foundations[foundationIndex])) {
            draft.waste.pop();
            draft.foundations[foundationIndex].push(wasteCard);
            return true;
          }
        }

        return false;
      };

      while (tryMove()) {
        moved = true;
      }

      return { changed: moved, state: draft };
    });

    if (moved) {
      resetSelection();
    }
  }, [resetSelection, updateGame]);

  const undo = useCallback(() => {
    setHistory((prev) => {
      if (prev.length === 0) {
        return prev;
      }
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
    } else {
      setMessage("");
    }
  }, [totalCardsInFoundation]);

  const activeSelection = selection;

  const gameControls = (
    <div className="flex flex-wrap items-center gap-2 sm:gap-3">
      <button
        type="button"
        onClick={startNewGame}
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
    </div>
  );

  return (
    <div className="min-h-[calc(100vh-8rem)] bg-gradient-to-br from-emerald-900 via-emerald-800 to-slate-900 text-white">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-6 sm:py-8">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Solitaire</h1>
            <p className="text-sm text-emerald-100 sm:text-base">
              Draw one Klondike solitaire built for desktop and mobile. Tap a card to select it and tap a destination to
              move it. Double-tap or use the foundation buttons for quick plays.
            </p>
          </div>
          {gameControls}
        </header>

        {message && (
          <div className="rounded-xl border border-emerald-200/40 bg-white/10 p-4 text-center text-lg font-semibold text-emerald-50">
            {message}
          </div>
        )}

        <section className="rounded-3xl border border-white/10 bg-white/5 p-3 sm:p-4">
          <div className="grid gap-4 sm:gap-6">
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
                      />
                    ) : (
                      <button
                        type="button"
                        onClick={handleStockClick}
                        className="flex h-full items-center justify-center"
                      >
                        <EmptyCardSlot label="Draw" />
                      </button>
                    )}
                  </div>
                  <div>
                    {game.waste.length > 0 ? (
                      <Card
                        card={game.waste[game.waste.length - 1]}
                        onClick={handleWasteClick}
                        onDoubleClick={() =>
                          handleCardDoubleClick({ source: "waste" }, game.waste[game.waste.length - 1])
                        }
                        isSelectable
                        isSelected={activeSelection?.source === "waste"}
                      />
                    ) : (
                      <button type="button" onClick={handleWasteClick} className="flex h-full items-center justify-center">
                        <EmptyCardSlot label="Waste" />
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
                      <button
                        key={suit}
                        type="button"
                        onClick={() => handleFoundationClick(index)}
                        className="flex flex-col items-center gap-1"
                      >
                        {top ? (
                          <Card
                            card={top}
                            onClick={() => handleFoundationClick(index)}
                            onDoubleClick={() => handleFoundationClick(index)}
                            isSelectable
                            isSelected={Boolean(isSelected)}
                          />
                        ) : (
                          <EmptyCardSlot label={suit} />
                        )}
                        <span className="text-xs capitalize text-white/70">{suit}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between text-xs uppercase tracking-widest text-white/60">
                <span>Tableau</span>
                <span>{totalCardsInFoundation} / 52 cards home</span>
              </div>
              <div className="overflow-x-auto">
                <div className="flex min-w-[640px] gap-2 sm:gap-3">
                  {game.tableau.map((column, columnIndex) => {
                    const offset = getTableauOffset(column.length);
                    const selectionMatches =
                      activeSelection?.source === "tableau" && activeSelection.columnIndex === columnIndex;

                    return (
                      <div
                        key={`column-${columnIndex}`}
                        className={clsx(
                          "relative flex-1 rounded-2xl border border-white/10 bg-white/5 p-1",
                          selectionMatches && "border-amber-400",
                        )}
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
                                  selectionMatches && selection?.cardIndex === cardIndex && card.faceUp
                                }
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
          <div>
            Tap to select cards and tap a column or foundation to complete a move. Use the auto play button to quickly
            collect eligible cards.
          </div>
          <div className="flex flex-wrap gap-2 text-xs uppercase tracking-widest text-white/60">
            <span>Draw 1</span>
            <span>Undo Enabled</span>
            <span>Mobile Friendly</span>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default Solitaire;
