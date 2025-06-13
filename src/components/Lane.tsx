import { useState, useEffect, useRef } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Doc } from "../../convex/_generated/dataModel";
import { Card } from "./Card";
import { AddCard } from "./AddCard";
import { toast } from "sonner";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { gradientOptions } from "../lib/gradients";

interface LaneProps {
  lane: Doc<"lanes">;
  viewMode: "use" | "design" | "view";
  publicView?: boolean;
}
export function Lane({ lane, viewMode, publicView = false }: LaneProps) {
  const cards = useQuery(publicView ? api.cards.listPublic : api.cards.list, { laneId: lane._id });
  const updateLane = useMutation(api.lanes.update);
  const deleteLane = useMutation(api.lanes.remove);

  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(lane.name);
  const [editColor, setEditColor] = useState(lane.color || "#f3f4f6");
  const formRef = useRef<HTMLFormElement>(null);

  // Helper function to extract hex color from gradient or return the color as-is
  const getHexColorFromValue = (colorValue: string) => {
    if (colorValue.startsWith('linear-gradient')) {
      // Extract first hex color from gradient string
      const hexMatch = colorValue.match(/#[0-9a-fA-F]{6}/);
      return hexMatch ? hexMatch[0] : "#f3f4f6";
    }
    return colorValue;
  };

  useEffect(() => {
    if (viewMode !== "design") {
      setIsEditing(false);
      setEditName(lane.name);
      setEditColor(lane.color || "#f3f4f6");
    }
  }, [viewMode, lane.name, lane.color]);

  const { setNodeRef, isOver } = useDroppable({
    id: lane._id,
    data: {
      type: "lane",
      lane,
    },
  });

  const handleUpdateLane = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editName.trim()) return;

    try {
      await updateLane({
        laneId: lane._id,
        name: editName.trim(),
        color: editColor,
      });
      setIsEditing(false);
      toast.success("Lane updated successfully!");
    } catch (error) {
      toast.error("Failed to update lane");
    }
  };

  const handleDeleteLane = async () => {
    if (!confirm(`Are you sure you want to delete "${lane.name}"? This will delete all cards in this lane.`)) {
      return;
    }

    try {
      await deleteLane({ laneId: lane._id });
      toast.success("Lane deleted successfully!");
    } catch (error) {
      toast.error("Failed to delete lane");
    }
  };

  if (cards === undefined) {
    return (
      <div className="w-80 rounded-lg p-4" style={{ background: lane.color || "#f3f4f6" }}>
        <div className="animate-pulse">
          <div className="h-6 bg-gray-300 rounded mb-4"></div>
          <div className="space-y-3">
            <div className="h-20 bg-gray-300 rounded"></div>
            <div className="h-20 bg-gray-300 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  const sortedCards = [...cards].sort((a, b) => a.position - b.position);

  // Use editColor when editing, otherwise use lane.color
  const currentColor = isEditing ? editColor : (lane.color || "#f3f4f6");

  return (
    <div
      ref={setNodeRef}
      style={isOver ? undefined : { background: currentColor }}
      className={`w-[calc(100vw-2rem)] sm:w-80 md:w-72 lg:w-80 xl:w-80 rounded-xl p-3 sm:p-4 flex-shrink-0 transition-all duration-200 flex flex-col min-h-[400px] sm:min-h-[500px] shadow-sm border border-white/20 backdrop-blur-sm ${
        isOver ? "bg-blue-50/90 ring-2 ring-blue-400 scale-[1.02]" : ""
      }`}
    >
      <div className="flex items-center justify-between mb-4">
        {isEditing ? (
          <form
            ref={formRef}
            onSubmit={handleUpdateLane}
            className="flex-1 space-y-2"
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                setEditName(lane.name);
                setEditColor(lane.color || "#f3f4f6");
                setIsEditing(false);
              } else if (e.key === "Enter" && e.target.tagName !== "BUTTON") {
                e.preventDefault();
                handleUpdateLane(e as any);
              }
            }}
          >
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="w-full px-2 py-1 text-sm font-semibold bg-white border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
            <input
              type="color"
              value={getHexColorFromValue(editColor)}
              onChange={async (e) => {
                const newColor = e.target.value;
                setEditColor(newColor);
                // Auto-save when color picker changes
                try {
                  await updateLane({
                    laneId: lane._id,
                    name: editName.trim() || lane.name,
                    color: newColor,
                  });
                  toast.success("Lane color updated!");
                } catch (error) {
                  toast.error("Failed to update lane color");
                }
              }}
              className="border rounded w-8 h-8"
            />
            <div className="grid grid-cols-4 gap-2">
              {gradientOptions.map((g) => (
                <button
                  type="button"
                  key={g}
                  onClick={async () => {
                    setEditColor(g);
                    // Auto-save when clicking gradient
                    try {
                      await updateLane({
                        laneId: lane._id,
                        name: editName.trim() || lane.name,
                        color: g,
                      });
                      toast.success("Lane color updated!");
                    } catch (error) {
                      toast.error("Failed to update lane color");
                    }
                  }}
                  className="w-8 h-8 rounded border hover:scale-110 transition-transform"
                  style={{ background: g }}
                />
              ))}
            </div>
          </form>
        ) : (
          <h3
            className={`font-semibold text-gray-800 flex-1 ${
              viewMode === "design" ? "cursor-pointer hover:text-gray-600" : ""
            }`}
            onClick={
              viewMode === "design" ? () => setIsEditing(true) : undefined
            }
          >
            {lane.name} ({sortedCards.length})
          </h3>
        )}
        {viewMode === "design" && (
          <button
            onClick={handleDeleteLane}
            className="text-gray-400 hover:text-red-500 transition-colors ml-2"
            title="Delete lane"
          >
            🗑️
          </button>
        )}
      </div>

      <SortableContext items={sortedCards.map(c => c._id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-3 flex-1 flex flex-col">
          {sortedCards.map((card) => (
            <Card key={card._id} card={card} boardId={lane.boardId} viewMode={viewMode} />
          ))}
        </div>
      </SortableContext>

      {viewMode === "use" && (
        <div className="mt-4">
          <AddCard laneId={lane._id} />
        </div>
      )}
    </div>
  );
}
