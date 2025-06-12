import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { toast } from "sonner";

interface AddCardProps {
  laneId: Id<"lanes">;
}

export function AddCard({ laneId }: AddCardProps) {
  const createCard = useMutation(api.cards.create);
  
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const handleCreateCard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setIsCreating(true);
    try {
      await createCard({
        laneId,
        title: title.trim(),
        description: description.trim() || undefined,
      });
      setTitle("");
      setDescription("");
      setShowForm(false);
      toast.success("Card created successfully!");
    } catch (error) {
      toast.error("Failed to create card");
    } finally {
      setIsCreating(false);
    }
  };

  if (showForm) {
    return (
      <div className="bg-white rounded-lg p-3 shadow-sm border border-gray-200">
        <form onSubmit={handleCreateCard}>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-2 py-1 text-sm font-medium bg-white border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 mb-2"
            placeholder="Enter card title"
            autoFocus
          />
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-2 py-1 text-sm bg-white border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 mb-2"
            placeholder="Enter card description (optional)"
            rows={2}
          />
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={isCreating || !title.trim()}
              className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isCreating ? "Adding..." : "Add Card"}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                setTitle("");
                setDescription("");
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
    <button
      onClick={() => setShowForm(true)}
      className="w-full p-3 text-sm text-gray-600 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300 hover:bg-gray-100 hover:border-gray-400 transition-colors"
    >
      + Add a card
    </button>
  );
}
