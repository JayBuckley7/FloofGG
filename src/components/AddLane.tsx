import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { toast } from "sonner";
import { gradientOptions } from "../lib/gradients";

interface AddLaneProps {
  boardId: Id<"boards">;
}

export function AddLane({ boardId }: AddLaneProps) {
  const createLane = useMutation(api.lanes.create);
  
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [color, setColor] = useState("#f3f4f6");
  const [isCreating, setIsCreating] = useState(false);

  const handleCreateLane = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsCreating(true);
    try {
      await createLane({
        boardId,
        name: name.trim(),
        color,
      });
      setName("");
      setColor("#f3f4f6");
      setShowForm(false);
      toast.success("Lane created successfully!");
    } catch (error) {
      toast.error("Failed to create lane");
    } finally {
      setIsCreating(false);
    }
  };

  if (showForm) {
    return (
      <div className="w-80 bg-gray-100 rounded-lg p-4 flex-shrink-0">
        <form onSubmit={handleCreateLane}>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2 text-sm font-semibold bg-white border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 mb-3"
            placeholder="Enter lane name"
            autoFocus
          />
          <div className="mb-3">
            <label className="mr-2 text-sm font-medium">Color:</label>
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="border rounded w-8 h-8 align-middle"
            />
          </div>
          <div className="mb-3">
            <div className="text-sm font-medium mb-1">Gradients:</div>
            <div className="grid grid-cols-4 gap-2">
              {gradientOptions.map((g) => (
                <button
                  type="button"
                  key={g}
                  onClick={() => setColor(g)}
                  className="w-8 h-8 rounded border"
                  style={{ background: g }}
                />
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={isCreating || !name.trim()}
              className="px-3 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isCreating ? "Adding..." : "Add Lane"}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                setName("");
                setColor("#f3f4f6");
              }}
              className="px-3 py-2 text-sm bg-gray-300 text-gray-700 rounded hover:bg-gray-400 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="w-80 flex-shrink-0">
      <button
        onClick={() => setShowForm(true)}
        className="w-full p-4 text-gray-600 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300 hover:bg-gray-100 hover:border-gray-400 transition-colors"
      >
        + Add another lane
      </button>
    </div>
  );
}
