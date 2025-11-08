import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Settings, X, Flag, Timer, Bomb } from "lucide-react";
import clsx from "clsx";

// ─────────────────────────────────────────────────────────────────────────────
// Constants & types
// ─────────────────────────────────────────────────────────────────────────────
type Difficulty = "beginner" | "intermediate" | "expert" | "custom";
type CellState = "hidden" | "revealed" | "flagged" | "question";
type Cell = {
  isMine: boolean;
  adjacentMines: number;
  state: CellState;
};

interface GameSettings {
  difficulty: Difficulty;
  customWidth: number;
  customHeight: number;
  customMines: number;
  hapticFeedback: boolean;
  firstClickSafe: boolean;
}

interface GameState {
  board: Cell[][];
  width: number;
  height: number;
  mines: number;
  flagsPlaced: number;
  revealedCount: number;
  gameStatus: "playing" | "won" | "lost";
  startTime: number | null;
  endTime: number | null;
}

const STORAGE_KEY = "floof-minesweeper-v1";
const SETTINGS_KEY = "floof-minesweeper-settings-v1";

const DIFFICULTY_PRESETS: Record<Difficulty, { width: number; height: number; mines: number }> = {
  beginner: { width: 9, height: 9, mines: 10 },
  intermediate: { width: 16, height: 16, mines: 40 },
  expert: { width: 16, height: 30, mines: 99 },
  custom: { width: 0, height: 0, mines: 0 },
};

const WIN_GIFS = [
  "/images/cat.gif",
  "/images/baby.gif",
  "/images/dog.gif",
  "/images/girl.gif",
];

// ─────────────────────────────────────────────────────────────────────────────
// Game logic helpers
// ─────────────────────────────────────────────────────────────────────────────
const createEmptyBoard = (width: number, height: number): Cell[][] => {
  return Array.from({ length: height }, () =>
    Array.from({ length: width }, () => ({
      isMine: false,
      adjacentMines: 0,
      state: "hidden" as CellState,
    }))
  );
};

const placeMines = (
  board: Cell[][],
  width: number,
  height: number,
  mineCount: number,
  excludeRow: number,
  excludeCol: number
): Cell[][] => {
  const newBoard = board.map((row) => row.map((cell) => ({ ...cell })));
  const positions: Array<[number, number]> = [];
  
  for (let row = 0; row < height; row++) {
    for (let col = 0; col < width; col++) {
      if (row !== excludeRow || col !== excludeCol) {
        positions.push([row, col]);
      }
    }
  }
  
  // Shuffle and take first mineCount positions
  for (let i = positions.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [positions[i], positions[j]] = [positions[j], positions[i]];
  }
  
  for (let i = 0; i < mineCount && i < positions.length; i++) {
    const [row, col] = positions[i];
    newBoard[row][col].isMine = true;
  }
  
  // Calculate adjacent mines
  for (let row = 0; row < height; row++) {
    for (let col = 0; col < width; col++) {
      if (!newBoard[row][col].isMine) {
        let count = 0;
        for (let dr = -1; dr <= 1; dr++) {
          for (let dc = -1; dc <= 1; dc++) {
            if (dr === 0 && dc === 0) continue;
            const nr = row + dr;
            const nc = col + dc;
            if (nr >= 0 && nr < height && nc >= 0 && nc < width) {
              if (newBoard[nr][nc].isMine) count++;
            }
          }
        }
        newBoard[row][col].adjacentMines = count;
      }
    }
  }
  
  return newBoard;
};

const revealCell = (
  board: Cell[][],
  row: number,
  col: number,
  width: number,
  height: number
): Cell[][] => {
  const newBoard = board.map((r) => r.map((c) => ({ ...c })));
  
  const reveal = (r: number, c: number) => {
    if (r < 0 || r >= height || c < 0 || c >= width) return;
    if (newBoard[r][c].state === "revealed" || newBoard[r][c].state === "flagged") return;
    
    newBoard[r][c].state = "revealed";
    
    // Auto-reveal adjacent cells if this cell has no adjacent mines
    if (newBoard[r][c].adjacentMines === 0) {
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (dr === 0 && dc === 0) continue;
          reveal(r + dr, c + dc);
        }
      }
    }
  };
  
  reveal(row, col);
  return newBoard;
};

const countRevealed = (board: Cell[][]): number => {
  return board.reduce(
    (acc, row) => acc + row.filter((cell) => cell.state === "revealed").length,
    0
  );
};

const countFlags = (board: Cell[][]): number => {
  return board.reduce(
    (acc, row) => acc + row.filter((cell) => cell.state === "flagged").length,
    0
  );
};

const checkWin = (board: Cell[][], mines: number, width: number, height: number): boolean => {
  const revealed = countRevealed(board);
  return revealed === width * height - mines;
};

const revealAllMines = (board: Cell[][]): Cell[][] => {
  return board.map((row) =>
    row.map((cell) => ({
      ...cell,
      state: cell.isMine ? "revealed" : cell.state,
    }))
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────
const Minesweeper = () => {
  const [settings, setSettings] = useState<GameSettings>(() => {
    if (typeof window !== "undefined") {
      try {
        const raw = window.localStorage.getItem(SETTINGS_KEY);
        if (raw) return JSON.parse(raw) as GameSettings;
      } catch {}
    }
    return {
      difficulty: "beginner",
      customWidth: 20,
      customHeight: 20,
      customMines: 60,
      hapticFeedback: true,
      firstClickSafe: true,
    };
  });

  const getGameConfig = useCallback(() => {
    if (settings.difficulty === "custom") {
      return {
        width: Math.max(8, Math.min(30, settings.customWidth)),
        height: Math.max(8, Math.min(30, settings.customHeight)),
        mines: Math.max(1, Math.min(
          settings.customWidth * settings.customHeight - 1,
          settings.customMines
        )),
      };
    }
    return DIFFICULTY_PRESETS[settings.difficulty];
  }, [settings]);

  const config = getGameConfig();

  const [game, setGame] = useState<GameState>(() => {
    if (typeof window !== "undefined") {
      try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const saved = JSON.parse(raw) as GameState;
          // Validate saved game matches current settings
          const currentConfig = getGameConfig();
          if (
            saved.width === currentConfig.width &&
            saved.height === currentConfig.height &&
            saved.mines === currentConfig.mines
          ) {
            return saved;
          }
        }
      } catch {}
    }
    return {
      board: createEmptyBoard(config.width, config.height),
      width: config.width,
      height: config.height,
      mines: config.mines,
      flagsPlaced: 0,
      revealedCount: 0,
      gameStatus: "playing",
      startTime: null,
      endTime: null,
    };
  });

  const [showSettings, setShowSettings] = useState(false);
  const [showWinAnimation, setShowWinAnimation] = useState(false);
  const [winGifUrl, setWinGifUrl] = useState<string>("");
  const [showNewGameConfirm, setShowNewGameConfirm] = useState(false);
  const [currentTime, setCurrentTime] = useState(Date.now());
  const timerIntervalRef = useRef<number | null>(null);
  const longPressTimerRef = useRef<number | null>(null);
  const touchStartRef = useRef<{ row: number; col: number; time: number } | null>(null);

  // Persist game state
  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(game));
    } catch {}
  }, [game]);

  // Persist settings
  useEffect(() => {
    try {
      window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch {}
  }, [settings]);

  // Timer - update every second when game is playing
  useEffect(() => {
    if (game.gameStatus === "playing" && game.startTime !== null && game.endTime === null) {
      timerIntervalRef.current = window.setInterval(() => {
        setCurrentTime(Date.now());
      }, 1000);
      return () => {
        if (timerIntervalRef.current) {
          window.clearInterval(timerIntervalRef.current);
          timerIntervalRef.current = null;
        }
      };
    } else {
      if (timerIntervalRef.current) {
        window.clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
      // Update currentTime when game ends to show final time
      if (game.endTime !== null) {
        setCurrentTime(game.endTime);
      }
    }
  }, [game.gameStatus, game.startTime, game.endTime]);

  const elapsedTime = useMemo(() => {
    if (game.startTime === null) return 0;
    const end = game.endTime ?? currentTime;
    return Math.floor((end - game.startTime) / 1000);
  }, [game.startTime, game.endTime, currentTime]);

  // Handle win animation display
  useEffect(() => {
    if (game.gameStatus === "won") {
      // Randomly select a GIF
      const randomGif = WIN_GIFS[Math.floor(Math.random() * WIN_GIFS.length)];
      console.log('Win detected! Setting GIF:', randomGif);
      setWinGifUrl(randomGif);
      setShowWinAnimation(true);
      console.log('Win animation should be showing');
      // Hide animation after 5 seconds
      const timer = setTimeout(() => {
        setShowWinAnimation(false);
        console.log('Win animation hidden');
      }, 5000);
      
      // Cleanup timer if component unmounts or win condition changes
      return () => clearTimeout(timer);
    } else {
      // Don't reset showWinAnimation here - let it fade naturally
    }
  }, [game.gameStatus]);

  const startNewGame = useCallback(() => {
    const config = getGameConfig();
    setGame({
      board: createEmptyBoard(config.width, config.height),
      width: config.width,
      height: config.height,
      mines: config.mines,
      flagsPlaced: 0,
      revealedCount: 0,
      gameStatus: "playing",
      startTime: null,
      endTime: null,
    });
    setShowNewGameConfirm(false);
    setShowWinAnimation(false);
    setCurrentTime(Date.now());
  }, [getGameConfig]);

  const handleCellClick = useCallback(
    (row: number, col: number, isRightClick: boolean = false) => {
      if (game.gameStatus !== "playing") return;
      if (isRightClick) {
        // Toggle flag
        setGame((prev) => {
          const newBoard = prev.board.map((r) => r.map((c) => ({ ...c })));
          const cell = newBoard[row][col];
          
          if (cell.state === "revealed") return prev;
          
          if (cell.state === "hidden") {
            cell.state = "flagged";
          } else if (cell.state === "flagged") {
            cell.state = "question";
          } else {
            cell.state = "hidden";
          }
          
          const flagsPlaced = countFlags(newBoard);
          const revealedCount = countRevealed(newBoard);
          
          if (settings.hapticFeedback && navigator.vibrate) {
            navigator.vibrate(10);
          }
          
          return {
            ...prev,
            board: newBoard,
            flagsPlaced,
            revealedCount,
          };
        });
        return;
      }

      // Left click - reveal cell
      setGame((prev) => {
        const cell = prev.board[row][col];
        if (cell.state !== "hidden" && cell.state !== "question") return prev;
        
        let newBoard = prev.board.map((r) => r.map((c) => ({ ...c })));
        let startTime = prev.startTime;
        
        // First click - place mines (excluding this cell if firstClickSafe)
        if (startTime === null) {
          if (settings.firstClickSafe && cell.isMine) {
            // Recreate board without mine at this position
            newBoard = placeMines(
              createEmptyBoard(prev.width, prev.height),
              prev.width,
              prev.height,
              prev.mines,
              row,
              col
            );
          } else if (!cell.isMine) {
            // Place mines normally
            newBoard = placeMines(
              createEmptyBoard(prev.width, prev.height),
              prev.width,
              prev.height,
              prev.mines,
              -1,
              -1
            );
          }
          startTime = Date.now();
        }
        
        // Reveal the cell
        if (newBoard[row][col].isMine) {
          // Game over
          newBoard = revealAllMines(newBoard);
          if (settings.hapticFeedback && navigator.vibrate) {
            navigator.vibrate([100, 50, 100]);
          }
          return {
            ...prev,
            board: newBoard,
            gameStatus: "lost",
            startTime,
            endTime: Date.now(),
          };
        }
        
        newBoard = revealCell(newBoard, row, col, prev.width, prev.height);
        const revealedCount = countRevealed(newBoard);
        const flagsPlaced = countFlags(newBoard);
        
        // Check win
        if (checkWin(newBoard, prev.mines, prev.width, prev.height)) {
          if (settings.hapticFeedback && navigator.vibrate) {
            navigator.vibrate([50, 50, 50, 50, 50]);
          }
          
          return {
            ...prev,
            board: newBoard,
            revealedCount,
            flagsPlaced,
            gameStatus: "won",
            startTime,
            endTime: Date.now(),
          };
        }
        
        if (settings.hapticFeedback && navigator.vibrate) {
          navigator.vibrate(5);
        }
        
        return {
          ...prev,
          board: newBoard,
          revealedCount,
          flagsPlaced,
          startTime,
        };
      });
    },
    [game.gameStatus, settings.firstClickSafe, settings.hapticFeedback]
  );

  const handleCellLongPress = useCallback(
    (row: number, col: number) => {
      longPressTimerRef.current = window.setTimeout(() => {
        handleCellClick(row, col, true);
        if (settings.hapticFeedback && navigator.vibrate) {
          navigator.vibrate(15);
        }
      }, 500);
    },
    [handleCellClick, settings.hapticFeedback]
  );

  const cancelLongPress = useCallback(() => {
    if (longPressTimerRef.current) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }, []);

  const getCellDisplay = (cell: Cell) => {
    if (cell.state === "hidden" || cell.state === "question") {
      return cell.state === "question" ? "?" : "";
    }
    if (cell.state === "flagged") {
      return "🚩";
    }
    if (cell.isMine) {
      return "💣";
    }
    if (cell.adjacentMines === 0) {
      return "";
    }
    return cell.adjacentMines.toString();
  };

  const getCellColor = (cell: Cell) => {
    if (cell.state === "revealed") {
      const colors = [
        "",
        "text-blue-600",
        "text-green-600",
        "text-red-600",
        "text-purple-600",
        "text-yellow-600",
        "text-pink-600",
        "text-gray-800",
        "text-black",
      ];
      return colors[cell.adjacentMines] || "";
    }
    return "";
  };

  const boardContainerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

  // Measure container size with ResizeObserver (better than window.innerWidth on mobile)
  useEffect(() => {
    if (!boardContainerRef.current) return;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setContainerSize({ width, height });
    });
    ro.observe(boardContainerRef.current);
    return () => ro.disconnect();
  }, []);

  const cellSize = useMemo(() => {
    // Account for padding (px-4 = 16px each side = 32px total)
    const availableWidth = containerSize.width > 0 ? containerSize.width - 24 : (typeof window !== "undefined" ? window.innerWidth - 48 : 400);
    const availableHeight = containerSize.height > 0 ? containerSize.height - 8 : (typeof window !== "undefined" ? window.innerHeight - 280 : 600);
    
    const cellWidth = availableWidth / game.width;
    const cellHeight = availableHeight / game.height;
    
    // Use the smaller dimension to ensure board fits
    const baseSize = Math.min(cellWidth, cellHeight);
    
    // Clamp between reasonable min and max sizes - increased minimum for less cramped feel
    return Math.max(30, Math.min(baseSize, 65));
  }, [game.width, game.height, containerSize]);
  
  const boardScale = useMemo(() => {
    const boardWidth = game.width * cellSize;
    const boardHeight = game.height * cellSize;
    const availableWidth = containerSize.width > 0 ? containerSize.width - 24 : (typeof window !== "undefined" ? window.innerWidth - 48 : 400);
    const availableHeight = containerSize.height > 0 ? containerSize.height - 8 : (typeof window !== "undefined" ? window.innerHeight - 280 : 600);
    
    if (boardWidth <= availableWidth && boardHeight <= availableHeight) {
      return 1;
    }
    
    const scaleX = availableWidth / boardWidth;
    const scaleY = availableHeight / boardHeight;
    // Allow slight scaling down but prefer larger cells
    return Math.min(scaleX, scaleY, 1);
  }, [game.width, game.height, cellSize, containerSize]);

  const remainingMines = game.mines - game.flagsPlaced;

  return (
    <div
      className="fixed inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white overflow-auto"
      style={{
        height: "100dvh",
        touchAction: "manipulation",
        paddingTop: "env(safe-area-inset-top)",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
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
            className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-2xl border border-white/20 shadow-2xl max-w-sm w-full mx-4"
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
            className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-2xl border border-white/20 shadow-2xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto"
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
              {/* Difficulty */}
              <div>
                <label className="text-sm font-semibold text-white block mb-2">Difficulty</label>
                <div className="flex flex-wrap gap-2">
                  {(["beginner", "intermediate", "expert", "custom"] as const).map((diff) => (
                    <button
                      key={diff}
                      type="button"
                      onClick={() => setSettings((s) => ({ ...s, difficulty: diff }))}
                      className={clsx(
                        "px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                        settings.difficulty === diff
                          ? "bg-purple-600 text-white"
                          : "bg-white/10 text-white/70 hover:bg-white/20"
                      )}
                    >
                      {diff.charAt(0).toUpperCase() + diff.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom difficulty settings */}
              {settings.difficulty === "custom" && (
                <>
                  <div>
                    <label className="text-sm font-semibold text-white block mb-2">
                      Width: {settings.customWidth}
                    </label>
                    <input
                      type="range"
                      min="8"
                      max="30"
                      value={settings.customWidth}
                      onChange={(e) =>
                        setSettings((s) => ({
                          ...s,
                          customWidth: parseInt(e.target.value),
                        }))
                      }
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-white block mb-2">
                      Height: {settings.customHeight}
                    </label>
                    <input
                      type="range"
                      min="8"
                      max="30"
                      value={settings.customHeight}
                      onChange={(e) =>
                        setSettings((s) => ({
                          ...s,
                          customHeight: parseInt(e.target.value),
                        }))
                      }
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-white block mb-2">
                      Mines: {settings.customMines}
                    </label>
                    <input
                      type="range"
                      min="1"
                      max={settings.customWidth * settings.customHeight - 1}
                      value={settings.customMines}
                      onChange={(e) =>
                        setSettings((s) => ({
                          ...s,
                          customMines: parseInt(e.target.value),
                        }))
                      }
                      className="w-full"
                    />
                  </div>
                </>
              )}

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
                    settings.hapticFeedback ? "bg-purple-600" : "bg-white/20"
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

              {/* First Click Safe */}
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-semibold text-white">First Click Safe</label>
                  <p className="text-xs text-white/70">First click never hits a mine</p>
                </div>
                <button
                  type="button"
                  onClick={() => setSettings((s) => ({ ...s, firstClickSafe: !s.firstClickSafe }))}
                  className={clsx(
                    "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                    settings.firstClickSafe ? "bg-purple-600" : "bg-white/20"
                  )}
                >
                  <span
                    className={clsx(
                      "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                      settings.firstClickSafe ? "translate-x-6" : "translate-x-1"
                    )}
                  />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Game Board */}
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex-shrink-0 px-3 pt-3 pb-2">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold">Minesweeper</h1>
              <div className="text-xs text-white/60 mt-0.5">
                {settings.difficulty.charAt(0).toUpperCase() + settings.difficulty.slice(1)}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowSettings(true)}
              className="rounded-xl bg-white/10 p-2 text-white shadow-lg active:scale-95 transition-transform hover:bg-white/20"
              aria-label="Settings"
            >
              <Settings className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>

          {/* Stats Bar */}
          <div className="flex items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-2 bg-white/10 rounded-lg px-3 py-2">
              <Bomb className="w-4 h-4" />
              <span className="text-sm font-semibold">
                {remainingMines >= 0 ? remainingMines : 0}
              </span>
            </div>
            <div className="flex items-center gap-2 bg-white/10 rounded-lg px-3 py-2">
              <Timer className="w-4 h-4" />
              <span className="text-sm font-semibold">{elapsedTime}s</span>
            </div>
            <div className="flex items-center gap-2 bg-white/10 rounded-lg px-3 py-2">
              <Flag className="w-4 h-4" />
              <span className="text-sm font-semibold">{game.flagsPlaced}</span>
            </div>
          </div>

          {/* Game Status */}
          {game.gameStatus === "won" && (
            <div className="mb-4 rounded-lg bg-green-500/20 border border-green-500/50 p-3 text-center">
              <div className="text-lg font-bold text-green-300">🎉 You Won!</div>
            </div>
          )}
          {game.gameStatus === "lost" && (
            <div className="mb-4 rounded-lg bg-red-500/20 border border-red-500/50 p-3 text-center">
              <div className="text-lg font-bold text-red-300">💣 Game Over</div>
            </div>
          )}
        </div>

        {/* Board */}
        <div 
          ref={boardContainerRef}
          className={clsx(
            "flex-1 overflow-hidden px-3 flex items-center justify-center",
            game.startTime === null || game.gameStatus !== "playing" ? "pb-20" : "pb-2"
          )}
        >
          <div
            className="inline-grid gap-1.5 mx-auto"
            style={{
              gridTemplateColumns: `repeat(${game.width}, ${cellSize}px)`,
              gridTemplateRows: `repeat(${game.height}, ${cellSize}px)`,
              transform: `scale(${boardScale})`,
              transformOrigin: "center center",
            }}
          >
            {game.board.map((row, rowIndex) =>
              row.map((cell, colIndex) => (
                <button
                  key={`${rowIndex}-${colIndex}`}
                  type="button"
                  onClick={() => handleCellClick(rowIndex, colIndex, false)}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    handleCellClick(rowIndex, colIndex, true);
                  }}
                  onTouchStart={() => {
                    touchStartRef.current = { row: rowIndex, col: colIndex, time: Date.now() };
                    handleCellLongPress(rowIndex, colIndex);
                  }}
                  onTouchEnd={() => {
                    cancelLongPress();
                    if (touchStartRef.current) {
                      const { row, col, time } = touchStartRef.current;
                      const duration = Date.now() - time;
                      if (duration < 500 && row === rowIndex && col === colIndex) {
                        handleCellClick(rowIndex, colIndex, false);
                      }
                    }
                    touchStartRef.current = null;
                  }}
                  onTouchMove={() => {
                    cancelLongPress();
                  }}
                  className={clsx(
                    "flex items-center justify-center font-bold rounded transition-all active:scale-95",
                    cell.state === "revealed"
                      ? clsx(
                          "bg-slate-200 text-slate-900",
                          cell.isMine && "bg-red-500",
                          getCellColor(cell)
                        )
                      : "bg-slate-600 hover:bg-slate-500 active:bg-slate-400",
                    cell.state === "flagged" && "bg-yellow-600",
                    cell.state === "question" && "bg-slate-500"
                  )}
                  style={{ 
                    width: cellSize, 
                    height: cellSize,
                    fontSize: `${Math.max(14, Math.min(cellSize * 0.55, 20))}px`,
                  }}
                  disabled={game.gameStatus !== "playing"}
                >
                  {getCellDisplay(cell)}
                </button>
              ))
            )}
          </div>
        </div>

        {/* Bottom Controls - only show when game hasn't started or game is over */}
        {(game.startTime === null || game.gameStatus !== "playing") && (
          <div
            className="fixed bottom-0 left-0 right-0 bg-gradient-to-t from-slate-900 via-slate-800 to-slate-800/80 backdrop-blur-sm border-t border-white/10 z-50"
            style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
          >
            <div className="px-3 py-3 flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => {
                  const hasProgress = game.revealedCount > 0 || game.flagsPlaced > 0;
                  if (hasProgress) {
                    setShowNewGameConfirm(true);
                  } else {
                    startNewGame();
                  }
                }}
                className="rounded-xl bg-purple-600 px-4 py-3 text-sm font-semibold text-white shadow-lg active:scale-95 transition-transform"
              >
                New Game
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Minesweeper;

