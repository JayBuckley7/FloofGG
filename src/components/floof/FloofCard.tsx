import { useState, useEffect } from "react";

type FloofCardProps = {
  name: string;
  fluffinessScore: number;
  specialSkills: string;
  imageUrl: string;
  uncroppedImageUrl?: string;
  discordInvite: string;
  onlyFansLink: string;
  onGameInit?: () => void;
  gameInitialized?: boolean;
  onShopUnlock?: () => void;
  shopUnlocked?: boolean;
  onOpenShop?: () => void;
  onElfyCheeseEat?: () => void;
  hasCheese?: boolean;
  onSalsaChururFeed?: () => void;
  hasChuru?: boolean;
  trainGameActive?: boolean;
  trainPosition?: {top: string, left: string} | null;
  onTrainClick?: () => void;
  foxyPurchaseMode?: boolean;
  foxyPurchaseMessage?: string;
  foxyCloseMode?: boolean;
  foxyCloseMessage?: string;
  trainGame2Active?: boolean;
  train2Position?: {top: string, left: string} | null;
  onTrain2Click?: () => void;
};

export default function FloofCard({
  name,
  fluffinessScore,
  specialSkills,
  imageUrl,
  uncroppedImageUrl,
  onGameInit,
  gameInitialized = false,
  onShopUnlock,
  shopUnlocked = false,
  onOpenShop,
  onElfyCheeseEat,
  hasCheese = false,
  onSalsaChururFeed,
  hasChuru = false,
  trainGameActive = false,
  trainPosition,
  onTrainClick,
  foxyPurchaseMode = false,
  foxyPurchaseMessage = "",
  foxyCloseMode = false,
  foxyCloseMessage = "",
  trainGame2Active = false,
  train2Position,
  onTrain2Click,
}: FloofCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [showButtons, setShowButtons] = useState(false);
  const [isPurchaseMode, setIsPurchaseMode] = useState(false);
  
  // Timer to reset purchase mode after 4 seconds
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isPurchaseMode) {
      timer = setTimeout(() => {
        setIsPurchaseMode(false);
      }, 4000);
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [isPurchaseMode]);
  
  const getDisplayImage = () => {
    if (isPurchaseMode) return "/images/fox_chatter.gif";
    if (foxyPurchaseMode && name === "Foxy Adventurer") return "/images/fox_chatter.gif";
    if (foxyCloseMode && name === "Foxy Adventurer") return "/images/fox_chatter.gif";
    if (isHovered && uncroppedImageUrl) return uncroppedImageUrl;
    // Only Foxy Adventurer uses newpfp.jpg, others keep their original image
    return name === "Foxy Adventurer" ? "/images/newpfp.jpg" : imageUrl;
  };
  
  const getDisplayDescription = () => {
    if (isPurchaseMode) return "making a purchase?";
    if (foxyPurchaseMode && name === "Foxy Adventurer") return foxyPurchaseMessage;
    if (foxyCloseMode && name === "Foxy Adventurer") return foxyCloseMessage;
    return specialSkills;
  };

  const handleCardClick = () => {
    if (name === "Foxy Adventurer") {
      setShowButtons(!showButtons);
    } else if (name === "Elfy" && hasCheese && onElfyCheeseEat) {
      onElfyCheeseEat();
    } else if (name === "Salsa" && hasChuru && onSalsaChururFeed) {
      onSalsaChururFeed();
    }
  };

  return (
    <div 
      className="bg-white rounded-lg shadow-lg overflow-hidden transform hover:scale-105 transition-transform duration-300 cursor-pointer"
      onClick={handleCardClick}
    >
      <div 
        className="relative w-full h-56 overflow-hidden"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <img
          src={getDisplayImage()}
          alt={name}
          className={`w-full h-full transition-all duration-300 ${
            isHovered && uncroppedImageUrl ? 'object-contain bg-gray-100' : 'object-cover'
          }`}
        />
        {isHovered && uncroppedImageUrl && (
          <div className="absolute top-2 right-2 bg-black bg-opacity-70 text-white text-xs px-2 py-1 rounded">
            Uncropped
          </div>
        )}
        {/* Train Game Overlay for Elfy - positioned relative to the card container, not the image */}
        {name === "Elfy" && trainGameActive && trainPosition && (
          <div 
            className="absolute cursor-pointer z-10 transform hover:scale-105 transition-transform"
            style={{
              top: trainPosition.top,
              left: trainPosition.left,
              width: '50%',
              height: '50%'
            }}
            onClick={(e) => {
              e.stopPropagation();
              if (onTrainClick) {
                onTrainClick();
              }
            }}
          >
            <img 
              src="/images/train1.png" 
              alt="Train" 
              className="w-full h-full object-contain shadow-lg rounded-lg bg-white bg-opacity-90 p-2"
            />
          </div>
        )}
        {/* Train Game 2 Overlay for Salsa - positioned relative to the card container, not the image */}
        {name === "Salsa" && trainGame2Active && train2Position && (
          <div 
            className="absolute cursor-pointer z-10 transform hover:scale-105 transition-transform"
            style={{
              top: train2Position.top,
              left: train2Position.left,
              width: '50%',
              height: '50%'
            }}
            onClick={(e) => {
              e.stopPropagation();
              if (onTrain2Click) {
                onTrain2Click();
              }
            }}
          >
            <img 
              src="/images/train2.png" 
              alt="Train 2" 
              className="w-full h-full object-contain shadow-lg rounded-lg bg-white bg-opacity-90 p-2"
            />
          </div>
        )}
      </div>
      <div className="p-6">
        <h3 className="text-2xl font-bold text-gray-800 mb-2">{name}</h3>
        <p className="text-gray-600 mb-4">{getDisplayDescription()}</p>
        <div className="flex justify-between items-center">
          <span className="text-lg font-semibold text-pink-500">{fluffinessScore}% Fluffy</span>
        </div>
        
        {showButtons && name === "Foxy Adventurer" && (
          <div className="mt-4 flex gap-3">
            <button 
              className="flex-1 bg-purple-500 hover:bg-purple-600 text-white font-bold py-2 px-4 rounded transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                if (!gameInitialized && onGameInit) {
                  // First time clicking - start game and show purchase animation
                  onGameInit();
                  setIsPurchaseMode(true);
                  if (onShopUnlock) {
                    onShopUnlock();
                  }
                  console.log("??? button clicked - Game started and purchase animation shown!");
                } else if (!shopUnlocked && onShopUnlock) {
                  // Game is initialized but shop not unlocked yet
                  onShopUnlock();
                  console.log("??? button clicked - Shop unlocked!");
                } else {
                  // Handle Shop button click - open shop modal
                  if (onOpenShop) {
                    onOpenShop();
                  }
                  console.log("Shop button clicked");
                }
              }}
            >
              {shopUnlocked ? "Shop" : "???"}
            </button>
            {!gameInitialized && (
              <button 
                className="flex-1 bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded transition-colors flex items-center justify-center"
                onClick={(e) => {
                  e.stopPropagation();
                  // Handle [Card] button click
                  console.log("[Card] button clicked");
                }}
              >
                <img src="/images/card_bk.png" alt="Card" className="w-6 h-6" />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
