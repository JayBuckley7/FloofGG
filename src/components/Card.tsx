import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Doc } from "../../convex/_generated/dataModel";
import { toast } from "sonner";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import { Id } from "../../convex/_generated/dataModel";
import { CardModal } from "./CardModal";

interface CardProps {
  card: Doc<"cards">;
  boardId: Id<"boards">;
  isDragging?: boolean;
  viewMode?: "use" | "design" | "view";
}

export function Card({ card, boardId, isDragging = false, viewMode = "use" }: CardProps) {
  const deleteCard = useMutation(api.cards.remove);
  
  const [showModal, setShowModal] = useState(false);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({
    id: card._id,
    data: {
      type: "card",
      card,
    },
    disabled: viewMode !== "use",
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };


  const handleDeleteCard = async () => {
    if (!confirm(`Are you sure you want to delete "${card.title}"?`)) {
      return;
    }

    try {
      await deleteCard({ cardId: card._id });
      toast.success("Card deleted successfully!");
    } catch (error) {
      toast.error("Failed to delete card");
    }
  };


  return (
    <>
      <div
        ref={setNodeRef}
        style={{ ...style, touchAction: "none" }}
        {...attributes}
        className={`bg-white rounded-lg p-3 shadow-sm border border-gray-200 transition-shadow group ${
          viewMode === "use" ? "cursor-pointer hover:shadow-md" : "cursor-default"
        } ${isSortableDragging || isDragging ? "opacity-50" : ""}`}
        onClick={viewMode === "use" ? () => setShowModal(true) : undefined}
      >
        <div className="flex justify-between items-start">
          {viewMode === "use" && (
            <div className="flex items-center mr-2">
              <div 
                {...listeners}
                className="w-2 h-4 flex flex-col justify-center gap-0.5 opacity-30 hover:opacity-60 cursor-grab active:cursor-grabbing"
                style={{ touchAction: "none" }}
              >
                <div className="w-full h-0.5 bg-gray-400 rounded"></div>
                <div className="w-full h-0.5 bg-gray-400 rounded"></div>
                <div className="w-full h-0.5 bg-gray-400 rounded"></div>
              </div>
            </div>
          )}
          <div className="flex-1">
            <h4 className="font-medium text-gray-900 text-sm mb-1">{card.title}</h4>
            {card.description && (
              <p className="text-gray-600 text-xs whitespace-pre-line">{card.description}</p>
            )}
          </div>
          {viewMode === "use" && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleDeleteCard();
              }}
              className="text-gray-400 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100 ml-2"
              title="Delete card"
            >
              🗑️
            </button>
          )}
        </div>
      </div>
      {showModal && (
        <CardModal card={card} boardId={boardId} onClose={() => setShowModal(false)} />
      )}
    </>
  );
}
