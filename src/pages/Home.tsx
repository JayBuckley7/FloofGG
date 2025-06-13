import { useEffect, useState } from "react";
import FloofCard from "../components/floof/FloofCard";
import ShopModal from "../components/shop/ShopModal";

const featuredFloofs = [
  {
    id: 1,
    name: "Foxy Adventurer",
    fluffinessScore: 95.0,
    specialSkills: "Master of exploration with a trusty deck and side",
    imageUrl: "/images/newpfp.jpg",
    discordInvite: "#",
    onlyFansLink: "#",
  },
  {
    id: 2,
    name: "Elfy",
    fluffinessScore: 90.0,
    specialSkills: "Crafty snacky goodness",
    imageUrl: "/images/elfy300300.png",
    discordInvite: "#",
    onlyFansLink: "#",
  },
  {
    id: 3,
    name: "Salsa",
    fluffinessScore: 100.0,
    specialSkills: "The smalley fluffiest hungriest baby, 100% floofy",
    imageUrl: "/images/salsa42.png",
    uncroppedImageUrl: "/images/salsa300.png",
    discordInvite: "#",
    onlyFansLink: "#",
  },
];

interface ShopItem {
  id: string;
  picture: string;
  name: string;
  price: number;
}

interface InventoryItem {
  id: string;
  name: string;
  picture: string;
}

export default function Home() {
  const [gameInitialized, setGameInitialized] = useState(false);
  const [shopUnlocked, setShopUnlocked] = useState(false);
  const [shopModalOpen, setShopModalOpen] = useState(false);
  const [points, setPoints] = useState(0);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [purchasedItems, setPurchasedItems] = useState<string[]>([]);
  const [itemQuantities, setItemQuantities] = useState<Record<string, number>>({});
  const [momentum, setMomentum] = useState(0);
  const [showNibModal, setShowNibModal] = useState(false);
  const [lastClickTime, setLastClickTime] = useState(0);
  const [nibModalType, setNibModalType] = useState<'penalty' | 'protected'>('penalty');
  const [hypeTrainUnlocked, setHypeTrainUnlocked] = useState(false);
  const [hypeTrain2Unlocked, setHypeTrain2Unlocked] = useState(false);
  const [trainGameActive, setTrainGameActive] = useState(false);
  const [trainPosition, setTrainPosition] = useState<{top: string, left: string} | null>(null);
  const [lastTrainCorner, setLastTrainCorner] = useState<number>(-1);
  const [foxyPurchaseMode, setFoxyPurchaseMode] = useState(false);
  const [foxyPurchaseMessage, setFoxyPurchaseMessage] = useState("");
  const [foxyCloseMode, setFoxyCloseMode] = useState(false);
  const [foxyCloseMessage, setFoxyCloseMessage] = useState("");
  const [elfyFloofiness, setElfyFloofiness] = useState(85); // Elfy starts at 85%
  const [mindDrainUnlocked, setMindDrainUnlocked] = useState(false);
  const [foxyFloofiness, setFoxyFloofiness] = useState(90); // Foxy starts at 90%
  const [speedUpTimeUnlocked, setSpeedUpTimeUnlocked] = useState(false);
  const [trainGame2Active, setTrainGame2Active] = useState(false);
  const [train2Position, setTrain2Position] = useState<{top: string, left: string} | null>(null);
  const [lastTrain2Corner, setLastTrain2Corner] = useState<number>(-1);
  const [giftedSubsUnlocked, setGiftedSubsUnlocked] = useState(false);
  const [speedUpTime2Unlocked, setSpeedUpTime2Unlocked] = useState(false);
  const [showEvenCdPage, setShowEvenCdPage] = useState(false);
  const [basePointsPerSecond, setBasePointsPerSecond] = useState(1);

  const gameinit = () => {
    setGameInitialized(true);
    setPoints(0); // Starting points
    console.log("Game initialized!");
  };

  const unlockShop = () => {
    setShopUnlocked(true);
  };

  const openShop = () => {
    setShopModalOpen(true);
  };

  const closeShop = () => {
    setShopModalOpen(false);
    
    // Trigger Foxy close reaction (only if not already in purchase mode)
    if (!foxyPurchaseMode) {
      const messages = ["Nah it's cool", "You still cheap af", "🦊👉👈"];
      const randomMessage = messages[Math.floor(Math.random() * messages.length)];
      setFoxyCloseMessage(randomMessage);
      setFoxyCloseMode(true);
      
      // Reset Foxy after 4 seconds
      setTimeout(() => {
        setFoxyCloseMode(false);
        setFoxyCloseMessage("");
      }, 4000);
    }
  };

  const addPoints = () => {
    // Calculate bonus points from owned items
    let pointsToAdd = 1; // Base points
    
    // Add points for each Elfy Sub owned (up to 5)
    const elfySubCount = itemQuantities["elfysub"] || 0;
    pointsToAdd += elfySubCount;
    
    // Add points for each 5 Gifted Subs owned (+5 points each)
    const giftedSubsCount = itemQuantities["giftedSubs"] || 0;
    pointsToAdd += giftedSubsCount * 5;
    
    // Check if player owns Elfy Follow (+1 point per click) 
    if (purchasedItems.includes("elfyfollow")) {
      pointsToAdd += 1;
    }
    
    setPoints(prev => prev + pointsToAdd);
    setLastClickTime(Date.now());
    setMomentum(prev => {
      const newMomentum = Math.min(prev + 10, 100); // 10% per click, max 100%
      if (newMomentum >= 100) {
        // Momentum bar full - check for protections
        if (mindDrainUnlocked) {
          // Mind Drain protection - no penalty, no modal
          console.log("Mind Drain protection activated - no momentum penalty!");
          return 0; // Reset momentum
        } else if (purchasedItems.includes("antihandtrap")) {
          // Player has Anti Hand Trap - protect them and give bonus
          setNibModalType('protected');
          setShowNibModal(true);
          setPoints(current => current + 300);
          
          // Remove Anti Hand Trap from inventory and purchased items
          setInventory(prev => prev.filter(item => item.id !== "antihandtrap"));
          setPurchasedItems(prev => prev.filter(id => id !== "antihandtrap"));
        } else {
          // No protection - apply penalty
          setNibModalType('penalty');
          setShowNibModal(true);
          setPoints(current => Math.max(current - 1000, 0));
        }
        return 0; // Reset momentum
      }
      return newMomentum;
    });
  };

  const handlePurchase = (item: ShopItem) => {
    if (points >= item.price) {
      // Check if this item has quantity limits
      const currentQuantity = itemQuantities[item.id] || 0;
      
      if (item.id === "elfysub" && currentQuantity >= 5) {
        alert("Maximum 5 Elfy Subs allowed!");
        return;
      }
      
      setPoints(prev => prev - item.price);
      setInventory(prev => [...prev, { 
        id: item.id, 
        name: item.name, 
        picture: item.picture 
      }]);
      
      // Update quantities
      setItemQuantities(prev => ({
        ...prev,
        [item.id]: (prev[item.id] || 0) + 1
      }));
      
      // Only add to purchasedItems if it's the first purchase (for other items)
      if (item.id !== "elfysub" && !purchasedItems.includes(item.id)) {
        setPurchasedItems(prev => [...prev, item.id]);
      } else if (item.id === "elfysub" && currentQuantity === 0) {
        setPurchasedItems(prev => [...prev, item.id]);
      }
      
      // Special handling for Hype Train 1 - start train game and increase base points per second by 5
      if (item.id === "hypetrain1") {
        startTrainGame();
        setBasePointsPerSecond(prev => prev + 5);
      }
      
      // Special handling for Hype Train 2 - start train game 2 and increase base points per second by 10
      if (item.id === "hypetrain2") {
        startTrainGame2();
        setBasePointsPerSecond(prev => prev + 10);
      }
      
      // Special handling for Elfy Sub - increase Foxy's floofiness by 1% and base points per second by 5
      if (item.id === "elfysub") {
        setFoxyFloofiness(prev => {
          const newFloofiness = Math.min(prev + 1, 100);
          // Unlock Mind Drain when Foxy reaches 100% floofiness
          if (newFloofiness === 100 && !mindDrainUnlocked) {
            setMindDrainUnlocked(true);
            console.log("Foxy reached 100% floofiness! Mind Drain is now available in the store!");
          }
          return newFloofiness;
        });
        
        // Increase base points per second by 5
        setBasePointsPerSecond(prev => prev + 5);
      }
      
      // Special handling for Anti Hand Trap - increase Foxy's floofiness by 2%
      if (item.id === "antihandtrap") {
        setFoxyFloofiness(prev => {
          const newFloofiness = Math.min(prev + 2, 100);
          // Unlock Mind Drain when Foxy reaches 100% floofiness
          if (newFloofiness === 100 && !mindDrainUnlocked) {
            setMindDrainUnlocked(true);
            console.log("Foxy reached 100% floofiness! Mind Drain is now available in the store!");
          }
          return newFloofiness;
        });
      }
      
      // Special handling for Speed Up Time - unlock Speed Up Time 2
      if (item.id === "speeduptime") {
        setSpeedUpTime2Unlocked(true);
        console.log("Speed Up Time purchased! Speed Up Time 2 is now available in the store!");
      }
      
      // Special handling for Strongest Yugioh Card - show Even CD page
      if (item.id === "strongestcard") {
        setShowEvenCdPage(true);
        console.log("Strongest Yugioh Card purchased! Even CD page activated!");
      }
      
      console.log(`Purchased ${item.name} for ${item.price} points!`);
      
      // Trigger Foxy purchase reaction
      const messages = ["🦊 👍", "Real", "I got you"];
      const randomMessage = messages[Math.floor(Math.random() * messages.length)];
      setFoxyPurchaseMessage(randomMessage);
      setFoxyPurchaseMode(true);
      
      // Reset Foxy after 4 seconds
      setTimeout(() => {
        setFoxyPurchaseMode(false);
        setFoxyPurchaseMessage("");
      }, 4000);
      
      // Auto-close shop after any purchase
      closeShop();
    }
  };

  const closeNibModal = () => {
    setShowNibModal(false);
  };

  const handleElfyCheeseEat = () => {
    if (purchasedItems.includes("cheese")) {
      // Remove cheese from inventory and purchased items (so it goes back to shop)
      setInventory(prev => prev.filter(item => item.id !== "cheese"));
      setPurchasedItems(prev => prev.filter(id => id !== "cheese"));
      
      // Always unlock Hype Train 1 in the store and remove it from purchased items so it appears in shop
      setHypeTrainUnlocked(true);
      setPurchasedItems(prev => prev.filter(id => id !== "hypetrain1"));
      
      // Increase base points per second by 1
      setBasePointsPerSecond(prev => prev + 1);
      
      // Increase Elfy's floofiness by 5%
      setElfyFloofiness(prev => {
        const newFloofiness = Math.min(prev + 5, 100);
        // Unlock Speed Up Time when Elfy reaches 100% floofiness
        if (newFloofiness === 100 && !speedUpTimeUnlocked) {
          setSpeedUpTimeUnlocked(true);
          console.log("Elfy reached 100% floofiness! Speed Up Time is now available in the store!");
        }
        return newFloofiness;
      });
      
              console.log("Elfy ate your cheese! Hype Train 1 is now available in the store! Cheese is back in the shop! Elfy got 5% fluffier! Points per second increased by 1!");
    }
  };

  const handleSalsaChururFeed = () => {
    if (purchasedItems.includes("churu")) {
      // Remove churu from inventory and purchased items
      setInventory(prev => prev.filter(item => item.id !== "churu"));
      setPurchasedItems(prev => prev.filter(id => id !== "churu"));
      
      // Unlock Hype Train 2 in the store and start train game 2
      setHypeTrain2Unlocked(true);
      setGiftedSubsUnlocked(true); // Also unlock 5 Gifted Subs
      startTrainGame2();
      
      console.log("Salsa ate your churu! Hype Train 2 is now available in the store! Train Game 2 started!");
    }
  };

  const startTrainGame = () => {
    setTrainGameActive(true);
    spawnTrain();
    
    // End train game after 10 seconds
    setTimeout(() => {
      setTrainGameActive(false);
      setTrainPosition(null);
      
      // Remove Hype Train 1 from inventory after game ends
      setInventory(prev => prev.filter(item => item.id !== "hypetrain1"));
      console.log("Hype Train 1 removed from inventory after train game ended!");
    }, 10000);
  };

  const spawnTrain = () => {
    const corners = [
      { top: '0%', left: '0%' },      // Top-left quadrant
      { top: '0%', left: '50%' },     // Top-right quadrant  
      { top: '50%', left: '0%' },     // Bottom-left quadrant
      { top: '50%', left: '50%' }     // Bottom-right quadrant
    ];
    
    let newCornerIndex;
    do {
      newCornerIndex = Math.floor(Math.random() * corners.length);
    } while (newCornerIndex === lastTrainCorner && corners.length > 1);
    
    setLastTrainCorner(newCornerIndex);
    setTrainPosition(corners[newCornerIndex]);
  };

  const handleTrainClick = () => {
    setPoints(prev => prev + 200);
    spawnTrain(); // Spawn new train in different corner
  };

  const startTrainGame2 = () => {
    setTrainGame2Active(true);
    spawnTrain2();
    
    // End train game 2 after 10 seconds
    setTimeout(() => {
      setTrainGame2Active(false);
      setTrain2Position(null);
    }, 10000);
  };

  const spawnTrain2 = () => {
    const corners = [
      { top: '0%', left: '0%' },      // Top-left quadrant
      { top: '0%', left: '50%' },     // Top-right quadrant  
      { top: '50%', left: '0%' },     // Bottom-left quadrant
      { top: '50%', left: '50%' }     // Bottom-right quadrant
    ];
    
    let newCornerIndex;
    do {
      newCornerIndex = Math.floor(Math.random() * corners.length);
    } while (newCornerIndex === lastTrain2Corner && corners.length > 1);
    
    setLastTrain2Corner(newCornerIndex);
    setTrain2Position(corners[newCornerIndex]);
  };

  const handleTrain2Click = () => {
    setPoints(prev => prev + 2000);
    spawnTrain2(); // Spawn new train2 in different corner
  };

  useEffect(() => {
    document.title = "FloofGG | Home";
  }, []);

  // Add global cursor style when cheese or churu is purchased
  useEffect(() => {
    if (purchasedItems.includes("churu")) {
      const style = document.createElement('style');
      style.textContent = `
        *, *:hover, button, button:hover, a, a:hover {
          cursor: url('/images/churu.png') 16 16, pointer !important;
        }
      `;
      document.head.appendChild(style);
      
      return () => {
        document.head.removeChild(style);
      };
    } else if (purchasedItems.includes("cheese")) {
      const style = document.createElement('style');
      style.textContent = `
        *, *:hover, button, button:hover, a, a:hover {
          cursor: url('/images/cheese_32.png') 16 16, pointer !important;
        }
      `;
      document.head.appendChild(style);
      
      return () => {
        document.head.removeChild(style);
      };
    }
  }, [purchasedItems]);

  // Auto-increment points with speed based on purchased items
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (gameInitialized) {
      // Calculate interval based on speed up items
      let intervalTime = 1000; // Base: 1 second
      
      if (purchasedItems.includes("speeduptime")) {
        intervalTime = 500; // Speed Up Time: 0.5 seconds
      }
      
      if (purchasedItems.includes("speeduptime2")) {
        intervalTime = 250; // Speed Up Time 2: 0.25 seconds
      }
      
      interval = setInterval(() => {
        setPoints(prev => prev + basePointsPerSecond);
      }, intervalTime);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [gameInitialized, purchasedItems, basePointsPerSecond]);

  // Momentum decay system
  useEffect(() => {
    let decayInterval: NodeJS.Timeout;
    if (gameInitialized && momentum > 0) {
      decayInterval = setInterval(() => {
        const now = Date.now();
        const timeSinceLastClick = now - lastClickTime;
        
        // Start decaying after 1 second of no clicks
        if (timeSinceLastClick > 1000) {
          setMomentum(prev => {
            const decayAmount = 20; // Decay 20% every 100ms = 100% in 500ms (5 seconds total)
            return Math.max(prev - decayAmount, 0);
          });
        }
      }, 100); // Check every 100ms
    }
    return () => {
      if (decayInterval) clearInterval(decayInterval);
    };
  }, [gameInitialized, momentum, lastClickTime]);

  // Show Even CD page if Strongest Yugioh Card was purchased
  if (showEvenCdPage) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-black">
        <img 
          src="/images/even_cd.jpg" 
          alt="Even CD" 
          className="max-w-full max-h-full object-contain"
        />
      </div>
    );
  }

  return (
    <div 
      className={`bg-gray-100 min-h-screen ${
        purchasedItems.includes("churu") ? "cursor-churu" : 
        purchasedItems.includes("cheese") ? "cursor-cheese" : ""
      }`}
      style={
        purchasedItems.includes("churu") 
          ? { 
              cursor: "url('/images/churu.png') 16 16, pointer",
            }
          : purchasedItems.includes("cheese") 
          ? { 
              cursor: "url('/images/cheese_32.png') 16 16, pointer",
            }
          : {}
      }
          >
        <main className="container mx-auto px-4 py-8">
          <div className="text-center mb-12">
            <h1 className="text-5xl font-extrabold text-gray-800 mb-2">Featured Floofs</h1>
            <p className="text-lg text-gray-600">Discover the most adorable and talented floofs around!</p>
          </div>

        <section>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {featuredFloofs.map((floof) => (
              <FloofCard 
                key={floof.id} 
                {...floof} 
                fluffinessScore={
                  floof.name === "Elfy" ? elfyFloofiness : 
                  floof.name === "Foxy Adventurer" ? foxyFloofiness : 
                  floof.fluffinessScore
                }
                onGameInit={gameinit}
                gameInitialized={gameInitialized}
                onShopUnlock={unlockShop}
                shopUnlocked={shopUnlocked}
                onOpenShop={openShop}
                onElfyCheeseEat={floof.name === "Elfy" ? handleElfyCheeseEat : undefined}
                hasCheese={purchasedItems.includes("cheese")}
                onSalsaChururFeed={floof.name === "Salsa" ? handleSalsaChururFeed : undefined}
                hasChuru={purchasedItems.includes("churu")}
                trainGameActive={floof.name === "Elfy" ? trainGameActive : false}
                trainPosition={floof.name === "Elfy" ? trainPosition : null}
                onTrainClick={floof.name === "Elfy" ? handleTrainClick : undefined}
                trainGame2Active={floof.name === "Salsa" ? trainGame2Active : false}
                train2Position={floof.name === "Salsa" ? train2Position : null}
                onTrain2Click={floof.name === "Salsa" ? handleTrain2Click : undefined}
                foxyPurchaseMode={floof.name === "Foxy Adventurer" ? foxyPurchaseMode : false}
                foxyPurchaseMessage={floof.name === "Foxy Adventurer" ? foxyPurchaseMessage : ""}
                foxyCloseMode={floof.name === "Foxy Adventurer" ? foxyCloseMode : false}
                foxyCloseMessage={floof.name === "Foxy Adventurer" ? foxyCloseMessage : ""}
              />
            ))}
          </div>
        </section>

        {/* Points Button - appears after game init */}
        {gameInitialized && (
          <div className="text-center mt-8">
            <button 
              onClick={addPoints}
              className="bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-6 rounded-full text-xl shadow-lg transform hover:scale-105 transition-all duration-200"
            >
              + Points ({points}) 
              {(() => {
                let clickBonus = 1;
                const elfySubCount = itemQuantities["elfysub"] || 0;
                clickBonus += elfySubCount;
                const giftedSubsCount = itemQuantities["giftedSubs"] || 0;
                clickBonus += giftedSubsCount * 5;
                if (purchasedItems.includes("elfyfollow")) clickBonus += 1;
                return clickBonus > 1 ? ` [+${clickBonus}]` : '';
              })()}
            </button>
            
            {/* Momentum Bar */}
            <div className="mt-4 max-w-md mx-auto">
              <div className="text-sm text-gray-600 mb-1">Momentum: {momentum}%</div>
              <div className="w-full bg-gray-300 rounded-full h-4">
                <div 
                  className="bg-blue-500 h-4 rounded-full transition-all duration-300"
                  style={{ width: `${momentum}%` }}
                ></div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Floating Inventory Footer */}
      {gameInitialized && (
        <div className="fixed bottom-0 left-0 right-0 bg-gray-800 text-white p-4 shadow-lg">
          <div className="container mx-auto">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-bold">Inventory</h3>
              <div className="text-sm">Points: {points}</div>
            </div>
            <div className="mt-2 min-h-[60px] bg-gray-700 rounded p-2">
              {inventory.length === 0 ? (
                <span className="text-gray-400">Your inventory is empty</span>
              ) : (
                <div className="flex gap-2 flex-wrap">
                  {inventory.map((item, index) => (
                    <div key={index} className="bg-gray-600 p-1 rounded flex items-center gap-2">
                      <img 
                        src={item.picture} 
                        alt={item.name}
                        className="w-8 h-8 object-contain"
                      />
                      <span className="text-sm">{item.name}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Shop Modal */}
      <div 
        style={
          purchasedItems.includes("cheese") 
            ? { cursor: "url('/images/cheese_32.png') 16 16, pointer" }
            : {}
        }
      >
        <ShopModal 
          isOpen={shopModalOpen}
          onClose={closeShop}
          points={points}
          onPurchase={handlePurchase}
          purchasedItems={purchasedItems}
          itemQuantities={itemQuantities}
          hypeTrainUnlocked={hypeTrainUnlocked}
          hypeTrain2Unlocked={hypeTrain2Unlocked}
          mindDrainUnlocked={mindDrainUnlocked}
          speedUpTimeUnlocked={speedUpTimeUnlocked}
          speedUpTime2Unlocked={speedUpTime2Unlocked}
          giftedSubsUnlocked={giftedSubsUnlocked}
        />
      </div>

      {/* Nib Modal */}
      {showNibModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-md w-full m-4">
            <div className="text-center">
              {nibModalType === 'protected' ? (
                <>
                  <h2 className="text-2xl font-bold mb-4 text-green-600">Anti Hand Trap Activated!</h2>
                  <img 
                    src="/images/ash.png" 
                    alt="Anti Hand Trap" 
                    className="w-48 h-48 mx-auto object-contain rounded-lg mb-4"
                  />
                  <p className="text-lg mb-4 text-green-600">+300 Points!</p>
                  <p className="text-gray-600 mb-6">Your Anti Hand Trap protected you from Nib! It's now back in stock.</p>
                </>
              ) : (
                <>
                  <h2 className="text-2xl font-bold mb-4">Momentum Complete!</h2>
                  <img 
                    src="/images/nib_cd.jpg" 
                    alt="Nib" 
                    className="w-48 h-48 mx-auto object-cover rounded-lg mb-4"
                  />
                  <p className="text-lg mb-4 text-red-600">-1000 Points!</p>
                  <p className="text-gray-600 mb-6">You've reached maximum momentum!</p>
                </>
              )}
              <button
                onClick={closeNibModal}
                className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-6 rounded transition-colors"
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
