import { useState, useEffect } from 'react';

interface Player {
  id: number;
  lifePoints: number;
  name: string;
}

interface LogEntry {
  id: string;
  timestamp: Date;
  action: string;
  player?: string;
  details?: string;
}

export default function Duel() {
  const [players, setPlayers] = useState<Player[]>([
    { id: 1, lifePoints: 8000, name: 'Player 1' },
    { id: 2, lifePoints: 8000, name: 'Player 2' }
  ]);
  
  const [operand, setOperand] = useState('0000');
  const [selectedPlayer, setSelectedPlayer] = useState<number | null>(null);
  const [timer, setTimer] = useState(45 * 60); // 45 minutes in seconds
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [isLogOpen, setIsLogOpen] = useState(false);
  const [actionLog, setActionLog] = useState<LogEntry[]>([]);
  const [showDiceModal, setShowDiceModal] = useState(false);
  const [showCoinModal, setShowCoinModal] = useState(false);
  const [showTimerModal, setShowTimerModal] = useState(false);
  const [diceResult, setDiceResult] = useState<number | null>(null);
  const [coinResult, setCoinResult] = useState<string | null>(null);
  const [editMinutes, setEditMinutes] = useState('45');
  const [editSeconds, setEditSeconds] = useState('00');
  const [defaultTime, setDefaultTime] = useState(45); // 30, 45, or 50 minutes
  const [showDefaultTimeModal, setShowDefaultTimeModal] = useState(false);
  const [showKeyboardHelp, setShowKeyboardHelp] = useState(false);
  const [undoStack, setUndoStack] = useState<{players: Player[], operand: string}[]>([]);
  const [showMobileKeypad, setShowMobileKeypad] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [showToolsModal, setShowToolsModal] = useState(false);

  // Set page title
  useEffect(() => {
    document.title = "FloofGG | Duel";
  }, []);

  // Timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isTimerRunning && timer > 0) {
      interval = setInterval(() => {
        setTimer(prev => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning, timer]);

  // Keyboard event handler
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      // Don't handle keys if modals are open or if typing in inputs
      if (showDiceModal || showCoinModal || showTimerModal || showDefaultTimeModal || isLogOpen || showKeyboardHelp || showMobileKeypad) {
        return;
      }
      
      const key = event.key.toLowerCase();
      
      // Ctrl+Z for undo
      if (event.ctrlKey && key === 'z') {
        event.preventDefault();
        performUndo();
        return;
      }
      
      // Ctrl+- for subtracting from Player 2
      if (event.ctrlKey && key === '-') {
        event.preventDefault();
        updateLifePoints(players[1].id, -parseInt(operand));
        return;
      }
      
      // Ctrl++ for adding to Player 2
      if (event.ctrlKey && (key === '+' || key === '=')) {
        event.preventDefault();
        updateLifePoints(players[1].id, parseInt(operand));
        return;
      }
      
      // Number keys (0-9) for operand input
      if (key >= '0' && key <= '9') {
        event.preventDefault();
        insertDigit(parseInt(key));
      }
      
      // Backspace or Delete for deleting digits
      else if (key === 'backspace' || key === 'delete') {
        event.preventDefault();
        deleteLastDigit();
      }
      
      // Regular minus key (subtract from Player 1)
      else if (key === '-' && !event.ctrlKey) {
        event.preventDefault();
        updateLifePoints(players[0].id, -parseInt(operand));
      }
      
      // Plus key (add to Player 1)
      else if ((key === '+' || key === '=') && !event.ctrlKey) {
        event.preventDefault();
        updateLifePoints(players[0].id, parseInt(operand));
      }
      
      // Enter or Space for timer toggle
      else if (key === 'enter' || key === ' ') {
        event.preventDefault();
        toggleTimer();
      }
      
      // R for reset life points
      else if (key === 'r') {
        event.preventDefault();
        resetLifePoints();
      }
      
      // T for timer reset
      else if (key === 't') {
        event.preventDefault();
        resetTimer();
      }
      
      // D for dice roll
      else if (key === 'd') {
        event.preventDefault();
        rollDice();
      }
      
      // C for coin flip
      else if (key === 'c') {
        event.preventDefault();
        flipCoin();
      }
      
      // L for log toggle
      else if (key === 'l') {
        event.preventDefault();
        setIsLogOpen(!isLogOpen);
      }
      
      // U for undo (not implemented yet, but placeholder)
      else if (key === 'u') {
        event.preventDefault();
        // Could add undo functionality here
      }
      
      // Player 1 controls: Q (add), A (subtract), Z (halve)
      else if (key === 'q') {
        event.preventDefault();
        updateLifePoints(1, parseInt(operand));
      }
      else if (key === 'a') {
        event.preventDefault();
        updateLifePoints(1, -parseInt(operand));
      }
      else if (key === 'z') {
        event.preventDefault();
        halveLifePoints(1);
      }
      
      // Player 2 controls: E (add), S (subtract), X (halve)
      else if (key === 'e') {
        event.preventDefault();
        updateLifePoints(2, parseInt(operand));
      }
      else if (key === 's') {
        event.preventDefault();
        updateLifePoints(2, -parseInt(operand));
      }
      else if (key === 'x') {
        event.preventDefault();
        halveLifePoints(2);
      }
      
      // H for help
      else if (key === 'h') {
        event.preventDefault();
        setShowKeyboardHelp(true);
      }
      
      // Escape to close any open modals
      else if (key === 'escape') {
        event.preventDefault();
        if (isLogOpen) setIsLogOpen(false);
        if (showDiceModal) closeDiceModal();
        if (showCoinModal) closeCoinModal();
        if (showTimerModal) closeTimerModal();
        if (showDefaultTimeModal) closeDefaultTimeModal();
        if (showKeyboardHelp) setShowKeyboardHelp(false);
      }
    };

    // Add event listener
    document.addEventListener('keydown', handleKeyPress);
    
    // Cleanup
    return () => {
      document.removeEventListener('keydown', handleKeyPress);
    };
     }, [operand, isLogOpen, showDiceModal, showCoinModal, showTimerModal, showDefaultTimeModal, showKeyboardHelp]);

  // Mobile detection effect
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    window.addEventListener('orientationchange', checkMobile);

    return () => {
      window.removeEventListener('resize', checkMobile);
      window.removeEventListener('orientationchange', checkMobile);
    };
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const addLogEntry = (action: string, player?: string, details?: string) => {
    const newEntry: LogEntry = {
      id: Date.now().toString(),
      timestamp: new Date(),
      action,
      player,
      details
    };
    setActionLog(prev => [newEntry, ...prev]);
  };

  const formatLogTime = (date: Date) => {
    return date.toLocaleTimeString();
  };

  const saveStateToUndo = () => {
    setUndoStack(prev => [...prev.slice(-9), { players: [...players], operand }]);
  };

  const performUndo = () => {
    if (undoStack.length === 0) return;
    
    const lastState = undoStack[undoStack.length - 1];
    setPlayers(lastState.players);
    setOperand(lastState.operand);
    setUndoStack(prev => prev.slice(0, -1));
    addLogEntry('Undo', undefined, 'Last action undone');
  };

  const updateLifePoints = (playerId: number, change: number) => {
    saveStateToUndo();
    
    const player = players.find(p => p.id === playerId);
    const action = change > 0 ? 'gained' : 'lost';
    const amount = Math.abs(change);
    
    setPlayers(prev => prev.map(player => 
      player.id === playerId 
        ? { ...player, lifePoints: Math.max(0, player.lifePoints + change) }
        : player
    ));
    
    addLogEntry(`Life Points ${action}`, player?.name, `${amount} LP`);
    setOperand('0000');
  };

  const insertDigit = (digit: number) => {
    if (operand === '0000') {
      setOperand('000' + digit);
    } else {
      const newOperand = operand.slice(1) + digit;
      setOperand(newOperand);
    }
  };

  const insertZeros = (count: number) => {
    setOperand((prev) => {
      let next = prev;
      for (let i = 0; i < count; i += 1) {
        // If operand is all zeros, inserting more zeros does not change it
        next = next === '0000' ? '0000' : next.slice(1) + '0';
      }
      return next;
    });
  };

  const deleteLastDigit = () => {
    setOperand('0' + operand.slice(0, -1));
  };

  const resetLifePoints = () => {
    saveStateToUndo();
    setPlayers(prev => prev.map(player => ({ ...player, lifePoints: 8000 })));
    addLogEntry('Life Points Reset', 'All Players', '8000 LP');
    setOperand('0000');
  };

  const resetTimer = () => {
    const resetTime = defaultTime * 60;
    setTimer(resetTime);
    setIsTimerRunning(false);
    addLogEntry('Timer Reset', undefined, `${defaultTime}:00`);
  };

  const toggleDefaultTime = () => {
    setShowDefaultTimeModal(true);
  };

  const getNextDefaultTime = (current: number): number => {
    if (current === 30) return 45;
    if (current === 45) return 50;
    return 30;
  };

  const changeDefaultTime = (newDefault: number) => {
    setDefaultTime(newDefault);
    const resetTime = newDefault * 60;
    setTimer(resetTime);
    setIsTimerRunning(false);
    addLogEntry('Default Timer Changed & Reset', undefined, `${newDefault}:00`);
    setShowDefaultTimeModal(false);
  };

  const closeDefaultTimeModal = () => {
    setShowDefaultTimeModal(false);
  };

  const toggleTimer = () => {
    setIsTimerRunning(!isTimerRunning);
    addLogEntry(isTimerRunning ? 'Timer Stopped' : 'Timer Started');
  };

  const rollDice = () => {
    const result = Math.floor(Math.random() * 6) + 1;
    setDiceResult(result);
    setShowDiceModal(true);
    addLogEntry('Dice Rolled', undefined, `Result: ${result}`);
  };

  const flipCoin = () => {
    const result = Math.random() < 0.5 ? 'Heads' : 'Tails';
    setCoinResult(result);
    setShowCoinModal(true);
    addLogEntry('Coin Flipped', undefined, `Result: ${result}`);
  };

  const closeDiceModal = () => {
    setShowDiceModal(false);
    setDiceResult(null);
  };

  const closeCoinModal = () => {
    setShowCoinModal(false);
    setCoinResult(null);
  };

  const openTimerModal = () => {
    const mins = Math.floor(timer / 60);
    const secs = timer % 60;
    setEditMinutes(mins.toString().padStart(2, '0'));
    setEditSeconds(secs.toString().padStart(2, '0'));
    setShowTimerModal(true);
  };

  const closeTimerModal = () => {
    setShowTimerModal(false);
  };

  const saveTimerEdit = () => {
    const mins = parseInt(editMinutes) || 0;
    const secs = parseInt(editSeconds) || 0;
    const newTime = (mins * 60) + secs;
    setTimer(newTime);
    setIsTimerRunning(false);
    addLogEntry('Timer Set', undefined, `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`);
    setShowTimerModal(false);
  };

  const halveLifePoints = (playerId: number) => {
    saveStateToUndo();
    const player = players.find(p => p.id === playerId);
    const currentLP = player?.lifePoints || 0;
    const newLP = Math.floor(currentLP / 2);
    
    setPlayers(prev => prev.map(player => 
      player.id === playerId 
        ? { ...player, lifePoints: newLP }
        : player
    ));
    
    addLogEntry('Life Points Halved', player?.name, `${currentLP} → ${newLP} LP`);
  };

  const openMobileKeypad = (playerId?: number) => {
    setSelectedPlayer(playerId || null);
    setShowMobileKeypad(true);
  };

  const closeMobileKeypad = () => {
    setShowMobileKeypad(false);
    setSelectedPlayer(null);
  };

  const applyMobileKeypadValue = (isAdd: boolean) => {
    if (selectedPlayer) {
      updateLifePoints(selectedPlayer, isAdd ? parseInt(operand) : -parseInt(operand));
    }
    closeMobileKeypad();
  };

  return (
    <div className="min-h-[100dvh] w-full bg-gray-900 text-white flex overflow-hidden select-none">
      {/* Main Calculator Area */}
      <div className="flex-1 flex flex-col p-2 sm:p-4">
        {/* Life Points Display */}
        <div className="flex-1 grid gap-2 sm:gap-4 mb-3 sm:mb-6 grid-cols-1 grid-rows-2 sm:grid-cols-2 sm:grid-rows-1">
          {players.map(player => (
            <div key={player.id} className="bg-gray-800 rounded-lg p-3 sm:p-6 flex flex-col">
              <div className="flex items-center justify-between mb-2 sm:mb-4">
                <span className="text-sm sm:text-lg text-gray-400">{player.name}</span>
                <button
                  onClick={() => halveLifePoints(player.id)}
                  className="bg-red-600 hover:bg-red-700 px-3 sm:px-4 py-1 sm:py-2 rounded text-sm sm:text-lg font-bold"
                >
                  ½
                </button>
              </div>
              <div 
                className="flex-1 flex items-center justify-center cursor-pointer sm:cursor-default"
                onClick={() => isMobile ? openMobileKeypad(player.id) : undefined}
              >
                <div className="text-4xl sm:text-6xl lg:text-8xl font-bold font-mono tabular-nums leading-none text-center">
                  {player.lifePoints.toLocaleString()}
                </div>
              </div>
              <div className="hidden sm:flex gap-2 sm:gap-4 mt-2 sm:mt-4">
                <button
                  onClick={() => updateLifePoints(player.id, parseInt(operand))}
                  className="flex-1 bg-green-600 hover:bg-green-700 py-3 sm:py-4 rounded font-bold text-lg sm:text-2xl"
                >
                  +
                </button>
                <button
                  onClick={() => updateLifePoints(player.id, -parseInt(operand))}
                  className="flex-1 bg-red-600 hover:bg-red-700 py-3 sm:py-4 rounded font-bold text-lg sm:text-2xl"
                >
                  −
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Timer and Operand */}
        <div className="bg-gray-800 rounded-lg p-3 sm:p-6 mb-3 sm:mb-6">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-3 sm:gap-0 flex-wrap sm:flex-nowrap">
            <div className="flex flex-col items-center gap-2 sm:gap-3">
              <div className="flex items-center gap-2 sm:gap-3">
                <button
                  onClick={openTimerModal}
                  className={`px-4 sm:px-8 py-2 sm:py-4 rounded font-bold text-lg sm:text-2xl hover:bg-opacity-80 transition-colors ${
                    timer <= 0 ? 'bg-red-600 text-white' : 'bg-gray-700 hover:bg-gray-600'
                  }`}
                  title="Click to edit timer"
                >
                  {timer <= 0 ? 'TIME' : formatTime(timer)}
                </button>
                {(() => {
                  const next = getNextDefaultTime(defaultTime);
                  return (
                    <button
                      onClick={() => changeDefaultTime(next)}
                      className={`px-2 sm:px-3 py-1 sm:py-2 rounded text-xs sm:text-sm font-bold transition-colors ${
                        next === 30
                          ? 'bg-orange-600 hover:bg-orange-700'
                          : next === 50
                          ? 'bg-purple-600 hover:bg-purple-700'
                          : 'bg-gray-600 hover:bg-gray-700'
                      }`}
                      title={`Default: ${defaultTime} min (click to toggle to ${next}:00)`}
                    >
                      {next}m
                    </button>
                  );
                })()}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={toggleTimer}
                  className={`px-2 sm:px-3 py-1 sm:py-2 rounded text-xs sm:text-sm font-bold ${
                    isTimerRunning 
                      ? 'bg-yellow-600 hover:bg-yellow-700' 
                      : 'bg-green-600 hover:bg-green-700'
                  }`}
                  title={isTimerRunning ? 'Pause Timer' : 'Start Timer'}
                >
                  {isTimerRunning ? '⏸️' : '▶️'}
                </button>
                <button
                  onClick={resetTimer}
                  className="px-2 sm:px-3 py-1 sm:py-2 rounded text-xs sm:text-sm font-bold bg-blue-600 hover:bg-blue-700"
                  title={`Reset to ${defaultTime}:00`}
                >
                  🔄
                </button>
                <button
                  onClick={() => setIsLogOpen(true)}
                  className="sm:hidden px-2 py-1 rounded text-xs font-bold bg-green-600 hover:bg-green-700"
                  title="Action Log"
                >
                  📖
                </button>
                <button
                  onClick={() => setShowToolsModal(true)}
                  className="sm:hidden px-2 py-1 rounded text-xs font-bold bg-gray-600 hover:bg-gray-700"
                  title="More tools"
                >
                  ⋯
                </button>
              </div>
            </div>
            <div className="hidden sm:flex items-center gap-2 sm:gap-3">
              <div 
                className="text-2xl sm:text-4xl font-mono tabular-nums bg-gray-700 px-4 sm:px-8 py-2 sm:py-4 rounded cursor-pointer sm:cursor-default tracking-tight min-w-[6ch] text-center"
                onClick={() => isMobile ? openMobileKeypad() : undefined}
              >
                {operand}
              </div>
              <button
                onClick={() => setShowKeyboardHelp(true)}
                className="bg-gray-600 hover:bg-gray-700 px-2 sm:px-3 py-1 sm:py-2 rounded text-xs sm:text-sm"
                title="Keyboard Shortcuts (H)"
              >
                ⌨️
              </button>
            </div>
          </div>
        </div>

        {/* Function Buttons */}
        <div className="hidden sm:grid grid-cols-5 gap-2 sm:gap-4 mb-3 sm:mb-6">
          <button
            onClick={resetLifePoints}
            className="bg-blue-600 hover:bg-blue-700 p-3 sm:p-6 rounded text-lg sm:text-2xl"
            title="Reset"
          >
            ↻
          </button>
          <button
            onClick={deleteLastDigit}
            className="bg-red-600 hover:bg-red-700 p-3 sm:p-6 rounded text-lg sm:text-2xl"
            title="Back"
          >
            ⌫
          </button>
          <button
            onClick={rollDice}
            className="bg-purple-600 hover:bg-purple-700 p-3 sm:p-6 rounded text-lg sm:text-2xl"
            title="Roll Dice"
          >
            ⚀
          </button>
          <button
            onClick={flipCoin}
            className="bg-yellow-600 hover:bg-yellow-700 p-3 sm:p-6 rounded text-lg sm:text-2xl"
            title="Flip Coin"
          >
            ○
          </button>
          <button
            onClick={() => setIsLogOpen(true)}
            className="bg-green-600 hover:bg-green-700 p-3 sm:p-6 rounded text-lg sm:text-2xl"
            title="Action Log"
          >
            📖
          </button>
        </div>

        {/* Number Pad */}
        <div className="hidden sm:grid grid-cols-6 gap-2 sm:gap-4">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map(digit => (
            <button
              key={digit}
              onClick={() => insertDigit(digit)}
              className="bg-gray-700 hover:bg-gray-600 p-4 sm:p-6 rounded text-xl sm:text-3xl font-bold touch-manipulation"
            >
              {digit}
            </button>
          ))}
          <button
            onClick={() => insertZeros(2)}
            className="bg-gray-700 hover:bg-gray-600 p-4 sm:p-6 rounded text-xl sm:text-3xl font-bold touch-manipulation"
            title="Append 00"
          >
            00
          </button>
          <button
            onClick={() => insertZeros(3)}
            className="bg-gray-700 hover:bg-gray-600 p-4 sm:p-6 rounded text-xl sm:text-3xl font-bold touch-manipulation"
            title="Append 000"
          >
            000
          </button>
        </div>
      </div>

      {/* Sidebar Drawer */}
      <div className={`fixed inset-y-0 right-0 w-full sm:w-96 bg-gray-800 transform transition-transform duration-300 ease-in-out z-50 ${
        isLogOpen ? 'translate-x-0' : 'translate-x-full'
      }`}>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-700">
            <h2 className="text-2xl font-bold">Action Log</h2>
            <button
              onClick={() => setIsLogOpen(false)}
              className="text-gray-400 hover:text-white text-2xl"
            >
              ✕
            </button>
          </div>

          {/* Log Entries */}
          <div className="flex-1 overflow-y-auto p-6">
            {actionLog.length === 0 ? (
              <p className="text-gray-400 text-center">No actions logged yet</p>
            ) : (
              <div className="space-y-4">
                {actionLog.map(entry => (
                  <div key={entry.id} className="bg-gray-700 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-semibold text-white">{entry.action}</span>
                      <span className="text-xs text-gray-400">{formatLogTime(entry.timestamp)}</span>
                    </div>
                    {entry.player && (
                      <div className="text-sm text-blue-400 mb-1">{entry.player}</div>
                    )}
                    {entry.details && (
                      <div className="text-sm text-gray-300">{entry.details}</div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Clear Log Button */}
          <div className="p-6 border-t border-gray-700">
            <button
              onClick={() => setActionLog([])}
              className="w-full bg-red-600 hover:bg-red-700 py-3 rounded font-bold"
            >
              Clear Log
            </button>
          </div>
        </div>
      </div>

      {/* Overlay */}
      {isLogOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={() => setIsLogOpen(false)}
        />
      )}

      {/* Dice Modal */}
      {showDiceModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
          <div 
            className="bg-gray-800 rounded-lg p-8 text-center max-w-sm mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-2xl font-bold mb-6">Dice Roll</h3>
            <div className="text-8xl mb-6">
              {diceResult === 1 ? '⚀' : 
               diceResult === 2 ? '⚁' : 
               diceResult === 3 ? '⚂' : 
               diceResult === 4 ? '⚃' : 
               diceResult === 5 ? '⚄' : '⚅'}
            </div>
            <div className="text-4xl font-bold mb-6">{diceResult}</div>
            <button
              onClick={closeDiceModal}
              className="bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded font-bold"
            >
              Close
            </button>
          </div>
          <div 
            className="absolute inset-0"
            onClick={closeDiceModal}
          />
        </div>
      )}

      {/* Coin Modal */}
      {showCoinModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
          <div 
            className="bg-gray-800 rounded-lg p-8 text-center max-w-sm mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-2xl font-bold mb-6">Coin Flip</h3>
            <div className="text-8xl mb-6">
              {coinResult === 'Heads' ? '🪙' : '🪙'}
            </div>
            <div className="text-4xl font-bold mb-6">{coinResult}</div>
            <button
              onClick={closeCoinModal}
              className="bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded font-bold"
            >
              Close
            </button>
          </div>
                     <div 
             className="absolute inset-0"
             onClick={closeCoinModal}
           />
         </div>
       )}

      {/* Timer Edit Modal */}
      {showTimerModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-gray-800 rounded-lg w-full max-w-sm">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-700">
              <h3 className="text-xl font-bold">Set Timer</h3>
              <button
                onClick={closeTimerModal}
                className="text-gray-400 hover:text-white text-2xl"
              >
                ✕
              </button>
            </div>

            {/* Time Display */}
            <div className="p-6">
              <div className="text-center mb-6">
                <div className="text-6xl font-mono font-bold mb-4">
                  {editMinutes.padStart(2, '0')}:{editSeconds.padStart(2, '0')}
                </div>
              </div>

              {/* Quick Preset Buttons */}
              <div className="grid grid-cols-3 gap-3 mb-6">
                <button
                  onClick={() => {setEditMinutes(defaultTime.toString()); setEditSeconds('00');}}
                  className={`py-3 rounded font-bold ${
                    defaultTime === 30 
                      ? 'bg-orange-600 hover:bg-orange-700' 
                      : defaultTime === 50 
                      ? 'bg-purple-600 hover:bg-purple-700' 
                      : 'bg-blue-600 hover:bg-blue-700'
                  }`}
                >
                  {defaultTime}:00
                </button>
                <button
                  onClick={() => {setEditMinutes('45'); setEditSeconds('00');}}
                  className="bg-blue-600 hover:bg-blue-700 py-3 rounded font-bold"
                >
                  45:00
                </button>
                <button
                  onClick={() => {setEditMinutes('30'); setEditSeconds('00');}}
                  className="bg-blue-600 hover:bg-blue-700 py-3 rounded font-bold"
                >
                  30:00
                </button>
                <button
                  onClick={() => {setEditMinutes('15'); setEditSeconds('00');}}
                  className="bg-blue-600 hover:bg-blue-700 py-3 rounded font-bold"
                >
                  15:00
                </button>
                <button
                  onClick={() => {setEditMinutes('10'); setEditSeconds('00');}}
                  className="bg-blue-600 hover:bg-blue-700 py-3 rounded font-bold"
                >
                  10:00
                </button>
                <button
                  onClick={() => {setEditMinutes('05'); setEditSeconds('00');}}
                  className="bg-blue-600 hover:bg-blue-700 py-3 rounded font-bold"
                >
                  05:00
                </button>
              </div>

              {/* Manual Input */}
              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Minutes (0-99)</label>
                  <input
                    type="number"
                    min="0"
                    max="99"
                    value={editMinutes}
                    onChange={(e) => {
                      const val = e.target.value.slice(0, 2);
                      setEditMinutes(val);
                    }}
                    className="w-full px-4 py-3 bg-gray-700 rounded text-center text-xl font-bold"
                    placeholder="00"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Seconds (0-59)</label>
                  <input
                    type="number"
                    min="0"
                    max="59"
                    value={editSeconds}
                    onChange={(e) => {
                      const val = Math.min(59, parseInt(e.target.value) || 0).toString().padStart(2, '0');
                      setEditSeconds(val);
                    }}
                    className="w-full px-4 py-3 bg-gray-700 rounded text-center text-xl font-bold"
                    placeholder="00"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={closeTimerModal}
                  className="flex-1 bg-gray-600 hover:bg-gray-700 py-4 rounded font-bold text-lg"
                >
                  Cancel
                </button>
                <button
                  onClick={saveTimerEdit}
                  className="flex-1 bg-green-600 hover:bg-green-700 py-4 rounded font-bold text-lg"
                >
                  Set Timer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Default Time Selection Modal */}
      {showDefaultTimeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-gray-800 rounded-lg w-full max-w-sm">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-700">
              <h3 className="text-xl font-bold">Change Default Timer</h3>
              <button
                onClick={closeDefaultTimeModal}
                className="text-gray-400 hover:text-white text-2xl"
              >
                ✕
              </button>
            </div>

            {/* Content */}
            <div className="p-6">
              <p className="text-gray-300 mb-6 text-center">
                This will reset the current timer to the new default time.
              </p>

              {/* Time Options */}
              <div className="space-y-3 mb-6">
                <button
                  onClick={() => changeDefaultTime(30)}
                  className={`w-full py-4 rounded font-bold text-lg transition-colors ${
                    defaultTime === 30 
                      ? 'bg-orange-600 border-2 border-orange-400' 
                      : 'bg-orange-600 hover:bg-orange-700'
                  }`}
                >
                  30 Minutes
                  {defaultTime === 30 && <span className="ml-2">✓</span>}
                </button>
                <button
                  onClick={() => changeDefaultTime(45)}
                  className={`w-full py-4 rounded font-bold text-lg transition-colors ${
                    defaultTime === 45 
                      ? 'bg-gray-600 border-2 border-gray-400' 
                      : 'bg-gray-600 hover:bg-gray-700'
                  }`}
                >
                  45 Minutes (Standard)
                  {defaultTime === 45 && <span className="ml-2">✓</span>}
                </button>
                <button
                  onClick={() => changeDefaultTime(50)}
                  className={`w-full py-4 rounded font-bold text-lg transition-colors ${
                    defaultTime === 50 
                      ? 'bg-purple-600 border-2 border-purple-400' 
                      : 'bg-purple-600 hover:bg-purple-700'
                  }`}
                >
                  50 Minutes
                  {defaultTime === 50 && <span className="ml-2">✓</span>}
                </button>
              </div>

              {/* Cancel Button */}
              <button
                onClick={closeDefaultTimeModal}
                className="w-full bg-gray-600 hover:bg-gray-700 py-3 rounded font-bold"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Keyboard Help Modal */}
      {showKeyboardHelp && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-gray-800 rounded-lg w-full max-w-md max-h-[80vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-700">
              <h3 className="text-xl font-bold">Keyboard Shortcuts</h3>
              <button
                onClick={() => setShowKeyboardHelp(false)}
                className="text-gray-400 hover:text-white text-2xl"
              >
                ✕
              </button>
            </div>

            {/* Content */}
            <div className="p-6">
              <div className="space-y-6">
                {/* Number Input */}
                <div>
                  <h4 className="text-lg font-semibold mb-3 text-blue-400">Number Input & Quick Actions</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-300">0-9</span>
                      <span className="text-gray-400">Enter digits</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-300">Backspace/Delete</span>
                      <span className="text-gray-400">Delete last digit</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-300">+</span>
                      <span className="text-gray-400">Add to Player 1</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-300">-</span>
                      <span className="text-gray-400">Subtract from Player 1</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-300">Ctrl++</span>
                      <span className="text-gray-400">Add to Player 2</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-300">Ctrl+-</span>
                      <span className="text-gray-400">Subtract from Player 2</span>
                    </div>
                  </div>
                </div>

                {/* Player 1 Controls */}
                <div>
                  <h4 className="text-lg font-semibold mb-3 text-green-400">Player 1 (Top)</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-300">Q</span>
                      <span className="text-gray-400">Add life points</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-300">A</span>
                      <span className="text-gray-400">Subtract life points</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-300">Z</span>
                      <span className="text-gray-400">Halve life points</span>
                    </div>
                  </div>
                </div>

                {/* Player 2 Controls */}
                <div>
                  <h4 className="text-lg font-semibold mb-3 text-red-400">Player 2 (Bottom)</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-300">E</span>
                      <span className="text-gray-400">Add life points</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-300">S</span>
                      <span className="text-gray-400">Subtract life points</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-300">X</span>
                      <span className="text-gray-400">Halve life points</span>
                    </div>
                  </div>
                </div>

                {/* Timer Controls */}
                <div>
                  <h4 className="text-lg font-semibold mb-3 text-yellow-400">Timer</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-300">Space / Enter</span>
                      <span className="text-gray-400">Start/Stop timer</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-300">T</span>
                      <span className="text-gray-400">Reset timer</span>
                    </div>
                  </div>
                </div>

                {/* Game Functions */}
                <div>
                  <h4 className="text-lg font-semibold mb-3 text-purple-400">Game Functions</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-300">R</span>
                      <span className="text-gray-400">Reset life points</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-300">D</span>
                      <span className="text-gray-400">Roll dice</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-300">C</span>
                      <span className="text-gray-400">Flip coin</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-300">L</span>
                      <span className="text-gray-400">Toggle action log</span>
                    </div>
                  </div>
                </div>

                {/* General */}
                <div>
                  <h4 className="text-lg font-semibold mb-3 text-gray-400">General</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-300">H</span>
                      <span className="text-gray-400">Show this help</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-300">Ctrl+Z</span>
                      <span className="text-gray-400">Undo last action</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-300">Escape</span>
                      <span className="text-gray-400">Close modals</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Close Button */}
              <button
                onClick={() => setShowKeyboardHelp(false)}
                className="w-full mt-6 bg-blue-600 hover:bg-blue-700 py-3 rounded font-bold"
              >
                Got it!
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tools Modal (compressed view helpers) */}
      {showToolsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4" onClick={() => setShowToolsModal(false)}>
          <div className="bg-gray-800 rounded-lg w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b border-gray-700">
              <h3 className="text-xl font-bold">Tools</h3>
              <button onClick={() => setShowToolsModal(false)} className="text-gray-400 hover:text-white text-2xl">✕</button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <button onClick={resetLifePoints} className="bg-blue-600 hover:bg-blue-700 py-3 rounded font-bold">↻ Reset LP</button>
                <button onClick={resetTimer} className="bg-blue-600 hover:bg-blue-700 py-3 rounded font-bold">⏱ Reset Timer</button>
                <button onClick={rollDice} className="bg-purple-600 hover:bg-purple-700 py-3 rounded font-bold">⚀ Dice</button>
                <button onClick={flipCoin} className="bg-yellow-600 hover:bg-yellow-700 py-3 rounded font-bold">○ Coin</button>
              </div>
              <button onClick={() => setIsLogOpen(true)} className="w-full bg-green-600 hover:bg-green-700 py-3 rounded font-bold">📖 Action Log</button>
              <button onClick={toggleTimer} className={`w-full py-3 rounded font-bold ${isTimerRunning ? 'bg-yellow-600 hover:bg-yellow-700' : 'bg-green-600 hover:bg-green-700'}`}>{isTimerRunning ? '⏸️ Pause Timer' : '▶️ Start Timer'}</button>
              <button onClick={() => setShowToolsModal(false)} className="w-full bg-gray-600 hover:bg-gray-700 py-3 rounded font-bold">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Keypad Modal */}
      {showMobileKeypad && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end sm:items-center justify-center"
          onClick={closeMobileKeypad}
        >
          <div
            className="bg-gray-800 rounded-t-lg sm:rounded-lg w-full sm:w-auto sm:max-w-md p-6"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold">
                {selectedPlayer ? `Player ${selectedPlayer}` : 'Enter Amount'}
              </h3>
              <button
                onClick={closeMobileKeypad}
                className="text-gray-400 hover:text-white text-2xl"
              >
                ✕
              </button>
            </div>

            {/* Current Value Display */}
            <div className="text-center mb-6">
              <div className="text-4xl font-mono bg-gray-700 px-6 py-4 rounded mb-4">
                {operand}
              </div>
              {selectedPlayer && (
                <div className="text-lg text-gray-400">
                  Current: {players.find(p => p.id === selectedPlayer)?.lifePoints.toLocaleString()} LP
                </div>
              )}
            </div>

            {/* Number Pad */}
            <div className="grid grid-cols-3 gap-3 mb-6">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(digit => (
                <button
                  key={digit}
                  onClick={() => insertDigit(digit)}
                  className="bg-gray-700 hover:bg-gray-600 p-4 rounded text-2xl font-bold"
                >
                  {digit}
                </button>
              ))}
              <button
                onClick={deleteLastDigit}
                className="bg-red-600 hover:bg-red-700 p-4 rounded text-xl font-bold"
              >
                ⌫
              </button>
              <button
                onClick={() => insertDigit(0)}
                className="bg-gray-700 hover:bg-gray-600 p-4 rounded text-2xl font-bold"
              >
                0
              </button>
              <button
                onClick={() => setOperand('0000')}
                className="bg-blue-600 hover:bg-blue-700 p-4 rounded text-lg font-bold"
              >
                Clear
              </button>
            </div>

            {/* Quick 00 / 000 */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              <button
                onClick={() => insertZeros(2)}
                className="bg-gray-700 hover:bg-gray-600 p-4 rounded text-2xl font-bold"
              >
                00
              </button>
              <button
                onClick={() => insertZeros(3)}
                className="bg-gray-700 hover:bg-gray-600 p-4 rounded text-2xl font-bold"
              >
                000
              </button>
            </div>

            {/* Action Buttons */}
            {selectedPlayer ? (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => applyMobileKeypadValue(true)}
                    className="bg-green-600 hover:bg-green-700 py-4 rounded font-bold text-xl"
                  >
                    + Add
                  </button>
                  <button
                    onClick={() => applyMobileKeypadValue(false)}
                    className="bg-red-600 hover:bg-red-700 py-4 rounded font-bold text-xl"
                  >
                    − Subtract
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => {
                      halveLifePoints(selectedPlayer);
                      closeMobileKeypad();
                    }}
                    className="bg-yellow-600 hover:bg-yellow-700 py-3 rounded font-bold text-lg"
                  >
                    ÷2 Halve
                  </button>
                  <button
                    onClick={() => {
                      resetLifePoints();
                      closeMobileKeypad();
                    }}
                    className="bg-blue-600 hover:bg-blue-700 py-3 rounded font-bold text-lg"
                  >
                    ↻ Reset All
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => {
                      rollDice();
                      closeMobileKeypad();
                    }}
                    className="bg-purple-600 hover:bg-purple-700 py-3 rounded font-bold text-lg"
                  >
                    ⚀ Dice
                  </button>
                  <button
                    onClick={() => {
                      flipCoin();
                      closeMobileKeypad();
                    }}
                    className="bg-orange-600 hover:bg-orange-700 py-3 rounded font-bold text-lg"
                  >
                    ○ Coin
                  </button>
                </div>
                <button
                  onClick={closeMobileKeypad}
                  className="w-full bg-gray-600 hover:bg-gray-700 py-3 rounded font-bold text-lg"
                >
                  Close
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Apply to Player controls when no player selected */}
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => { updateLifePoints(1, parseInt(operand)); closeMobileKeypad(); }}
                    className="bg-green-600 hover:bg-green-700 py-4 rounded font-bold text-lg"
                  >
                    + Player 1
                  </button>
                  <button
                    onClick={() => { updateLifePoints(1, -parseInt(operand)); closeMobileKeypad(); }}
                    className="bg-red-600 hover:bg-red-700 py-4 rounded font-bold text-lg"
                  >
                    − Player 1
                  </button>
                  <button
                    onClick={() => { updateLifePoints(2, parseInt(operand)); closeMobileKeypad(); }}
                    className="bg-green-600 hover:bg-green-700 py-4 rounded font-bold text-lg"
                  >
                    + Player 2
                  </button>
                  <button
                    onClick={() => { updateLifePoints(2, -parseInt(operand)); closeMobileKeypad(); }}
                    className="bg-red-600 hover:bg-red-700 py-4 rounded font-bold text-lg"
                  >
                    − Player 2
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => { rollDice(); closeMobileKeypad(); }}
                    className="bg-purple-600 hover:bg-purple-700 py-3 rounded font-bold text-lg"
                  >
                    ⚀ Dice
                  </button>
                  <button
                    onClick={() => { flipCoin(); closeMobileKeypad(); }}
                    className="bg-yellow-600 hover:bg-yellow-700 py-3 rounded font-bold text-lg"
                  >
                    ○ Coin
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => { resetLifePoints(); closeMobileKeypad(); }}
                    className="bg-gray-600 hover:bg-gray-700 py-3 rounded font-bold text-lg"
                  >
                    ↻ Reset All
                  </button>
                  <button
                    onClick={closeMobileKeypad}
                    className="bg-blue-600 hover:bg-blue-700 py-3 rounded font-bold text-lg"
                  >
                    Close
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
} 