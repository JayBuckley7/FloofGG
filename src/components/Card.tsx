import { useState, useEffect } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Doc } from "../../convex/_generated/dataModel";
import { toast } from "sonner";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface CardProps {
  card: Doc<"cards">;
  isDragging?: boolean;
  viewMode?: "use" | "design" | "view";
}

export function Card({ card, isDragging = false, viewMode = "use" }: CardProps) {
  const updateCard = useMutation(api.cards.update);
  const deleteCard = useMutation(api.cards.remove);
  
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(card.title);
  const [editDescription, setEditDescription] = useState(card.description || "");

  useEffect(() => {
    if (viewMode !== "use") {
      setIsEditing(false);
      setEditTitle(card.title);
      setEditDescription(card.description || "");
    }
  }, [viewMode, card.title, card.description]);

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
    disabled: isEditing || viewMode !== "use",
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const handleUpdateCard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTitle.trim()) return;

    try {
      await updateCard({
        cardId: card._id,
        title: editTitle.trim(),
        description: editDescription.trim() || undefined,
      });
      setIsEditing(false);
      toast.success("Card updated successfully!");
    } catch (error) {
      toast.error("Failed to update card");
    }
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

  if (isEditing) {
    return (
      <div className="bg-white rounded-lg p-3 shadow-sm border border-gray-200">
        <form onSubmit={handleUpdateCard}>
          <input
            type="text"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            className="w-full px-2 py-1 text-sm font-medium bg-white border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 mb-2"
            placeholder="Card title"
            autoFocus
          />
          <textarea
            value={editDescription}
            onChange={(e) => setEditDescription(e.target.value)}
            className="w-full px-2 py-1 text-sm bg-white border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 mb-2"
            placeholder="Card description (optional)"
            rows={2}
          />
          <div className="flex gap-2">
            <button
              type="submit"
              className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            >
              Save
            </button>
            <button
              type="button"
              onClick={() => {
                setEditTitle(card.title);
                setEditDescription(card.description || "");
                setIsEditing(false);
              }}
              className="px-3 py-1 text-xs bg-gray-300 text-gray-700 rounded hover:bg-gray-400 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={{ ...style, touchAction: "none" }}
      {...attributes}
      className={`bg-white rounded-lg p-3 shadow-sm border border-gray-200 transition-shadow group ${
        viewMode === "use" ? "cursor-pointer hover:shadow-md" : "cursor-default"
      } ${isSortableDragging || isDragging ? "opacity-50" : ""}`}
      onClick={viewMode === "use" ? () => setIsEditing(true) : undefined}
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
  );
}
