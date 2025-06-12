import { useState } from "react";

interface ShopItem {
  id: string;
  picture: string;
  name: string;
  price: number;
}

interface ShopModalProps {
  isOpen: boolean;
  onClose: () => void;
  points: number;
  onPurchase: (item: ShopItem) => void;
  purchasedItems: string[];
  itemQuantities: Record<string, number>;
  hypeTrainUnlocked: boolean;
  hypeTrain2Unlocked: boolean;
  mindDrainUnlocked: boolean;
  speedUpTimeUnlocked: boolean;
  speedUpTime2Unlocked: boolean;
  giftedSubsUnlocked: boolean;
}

const shopItems: ShopItem[] = [
  {
    id: "elfysub",
    picture: "/images/elfy300300.png", 
    name: "Elfy Sub",
    price: 100
  },
  {
    id: "elfyfollow",
    picture: "/images/elfy300300.png",
    name: "Elfy Follow", 
    price: 50
  },
  {
    id: "strongestcard",
    picture: "/images/card_bk.png",
    name: "Strongest Yugioh Card",
    price: 30000
  },
  {
    id: "antihandtrap",
    picture: "/images/ash.png",
    name: "Anti Hand Trap",
    price: 300
  },
  {
    id: "snackbg",
    picture: "/images/snack.png",
    name: "Snack BG",
    price: 500
  }
];

// Unlockable items (appear after Snack BG is purchased)
const unlockableItems: ShopItem[] = [
  {
    id: "cheese",
    picture: "/images/cheese.webp", // Using cheese.webp
    name: "Cheese",
    price: 100
  },
  {
    id: "churu",
    picture: "/images/churu.png", // Using churu.png
    name: "Churu",
    price: 10000
  }
];

// Hype Train items
const hypeTrainItem: ShopItem = {
  id: "hypetrain1",
  picture: "/images/elfy300300.png",
  name: "Hype Train 1",
  price: 1000
};

const hypeTrain2Item: ShopItem = {
  id: "hypetrain2", 
  picture: "/images/salsa42.png",
  name: "Hype Train 2",
  price: 2000
};

const mindDrainItem: ShopItem = {
  id: "minddrain",
  picture: "/images/drain.jpg",
  name: "Mind Drain",
  price: 1000
};

const speedUpTimeItem: ShopItem = {
  id: "speeduptime",
  picture: "/images/time.jpeg",
  name: "Speed Up Time",
  price: 1000
};

const speedUpTime2Item: ShopItem = {
  id: "speeduptime2",
  picture: "/images/time.jpeg",
  name: "Speed Up Time 2",
  price: 2000
};

const giftedSubsItem: ShopItem = {
  id: "giftedSubs",
  picture: "/images/elfy300300.png",
  name: "5 Gifted Subs",
  price: 500
};

export default function ShopModal({ isOpen, onClose, points, onPurchase, purchasedItems, itemQuantities, hypeTrainUnlocked, hypeTrain2Unlocked, mindDrainUnlocked, speedUpTimeUnlocked, speedUpTime2Unlocked, giftedSubsUnlocked }: ShopModalProps) {
  if (!isOpen) return null;

  const handlePurchase = (item: ShopItem) => {
    if (points >= item.price) {
      onPurchase(item);
    } else {
      alert("Not enough points!");
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-lg max-w-4xl w-full m-4 max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b flex justify-between items-center">
          <h2 className="text-2xl font-bold">Floof Shop</h2>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl"
          >
            ×
          </button>
        </div>
        
        <div className="flex h-96">
          {/* Left side - Fox Chatter */}
          <div className="w-1/2 p-4 flex items-center justify-center bg-gray-50">
            <img 
              src="/images/fox_chatter.gif" 
              alt="Fox Chatter" 
              className="max-w-full max-h-full object-contain"
            />
          </div>
          
          {/* Right side - Shop Items */}
          <div className="w-1/2 p-4 overflow-y-auto">
            <div className="mb-4">
              <p className="text-lg font-semibold">Your Points: {points}</p>
            </div>
            
            <div className="space-y-3">
              {[
                ...shopItems, 
                ...(purchasedItems.includes("snackbg") ? unlockableItems : []),
                ...(hypeTrainUnlocked ? [hypeTrainItem] : []),
                ...(hypeTrain2Unlocked ? [hypeTrain2Item] : []),
                ...(mindDrainUnlocked ? [mindDrainItem] : []),
                ...(speedUpTimeUnlocked ? [speedUpTimeItem] : []),
                ...(speedUpTime2Unlocked ? [speedUpTime2Item] : []),
                ...(giftedSubsUnlocked ? [giftedSubsItem] : [])
              ]
                .filter(item => {
                  // Special handling for Elfy Sub - allow up to 5
                  if (item.id === "elfysub") {
                    const quantity = itemQuantities[item.id] || 0;
                    return quantity < 5;
                  }
                  // Special handling for 5 Gifted Subs - allow unlimited purchases
                  if (item.id === "giftedSubs") {
                    return true; // Always show
                  }
                  // Other items - hide once purchased
                  return !purchasedItems.includes(item.id);
                })
                .map((item) => (
                <div key={item.id} className="border rounded-lg p-3 flex items-center gap-3">
                  <img 
                    src={item.picture} 
                    alt={item.name}
                    className="w-12 h-12 object-contain"
                  />
                  <div className="flex-grow">
                    <h3 className="font-semibold">
                      {item.name}
                      {item.id === "elfysub" && (
                        <span className="text-sm text-gray-500 ml-2">
                          ({(itemQuantities[item.id] || 0)}/5)
                        </span>
                      )}
                      {item.id === "giftedSubs" && (
                        <span className="text-sm text-gray-500 ml-2">
                          (Owned: {(itemQuantities[item.id] || 0)})
                        </span>
                      )}
                    </h3>
                    <p className="text-gray-600">{item.price} points</p>
                  </div>
                  <button
                    onClick={() => handlePurchase(item)}
                    disabled={points < item.price}
                    className={`px-4 py-2 rounded font-bold transition-colors ${
                      points >= item.price
                        ? "bg-green-500 hover:bg-green-600 text-white"
                        : "bg-gray-300 text-gray-500 cursor-not-allowed"
                    }`}
                  >
                    Buy
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 