import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { useDroppable } from "@dnd-kit/core";
import { api } from "../../convex/_generated/api";
import { Doc, Id } from "../../convex/_generated/dataModel";
import { toast } from "sonner";
import { Pencil, ArrowLeft, X } from "lucide-react";

interface CardModalProps {
  card: Doc<"cards">;
  boardId: Id<"boards">;
  onClose: () => void;
}

export function CardModal({ card, boardId, onClose }: CardModalProps) {
  const updateCard = useMutation(api.cards.update);
  const comments = useQuery(api.comments.list, { cardId: card._id });
  const addComment = useMutation(api.comments.add);
  const labels = useQuery(api.labels.listForBoard, { boardId });
  const cardLabels = useQuery(api.labels.labelsForCard, { cardId: card._id });
  const toggleLabel = useMutation(api.labels.toggleLabelOnCard);
  const activities = useQuery(api.activities.listForCard, { cardId: card._id });
  const checklist = useQuery(api.checklists.list, { cardId: card._id });
  const addItem = useMutation(api.checklists.add);
  const toggleItem = useMutation(api.checklists.toggle);
  const removeItem = useMutation(api.checklists.remove);
  const lanes = useQuery(api.lanes.list, { boardId });
  const createCard = useMutation(api.cards.create);

  const [title, setTitle] = useState(card.title);
  const [description, setDescription] = useState(card.description || "");
  const [commentText, setCommentText] = useState("");
  const [itemText, setItemText] = useState("");
  const [isEditing, setIsEditing] = useState(false);

  const { setNodeRef, isOver } = useDroppable({
    id: `modal-${card._id}`,
    data: { type: "cardModal", cardId: card._id },
  });

  const handleSave = async () => {
    await updateCard({
      cardId: card._id,
      title: title.trim() || card.title,
      description: description.trim() || undefined,
    });
    setIsEditing(false);
    toast.success("Card updated");
  };

  const handleCancel = () => {
    setTitle(card.title);
    setDescription(card.description || "");
    setIsEditing(false);
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    await addComment({ cardId: card._id, text: commentText.trim() });
    setCommentText("");
  };

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemText.trim()) return;
    await addItem({ cardId: card._id, text: itemText.trim() });
    setItemText("");
  };

  const handleToggleItem = async (
    itemId: Id<"checklists">,
    completed: boolean
  ) => {
    await toggleItem({ itemId, completed: !completed });
  };

  const handleRemoveItem = async (itemId: Id<"checklists">) => {
    await removeItem({ itemId });
  };

  const handleSpawnTask = async (text: string) => {
    if (!lanes) return;
    const todo = lanes.find((l) => l.name.toLowerCase() === "to do");
    if (!todo) {
      toast.error("No 'To Do' lane found");
      return;
    }
    await createCard({ laneId: todo._id, title: text, description: undefined });
    toast.success("Task created");
  };

  const handleToggleLabel = async (labelId: Id<"labels">) => {
    await toggleLabel({ cardId: card._id, labelId });
  };

  const hasLabel = (labelId: Id<"labels">) =>
    cardLabels?.some((l) => l._id === labelId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-2">
      <div
        ref={setNodeRef}
        className={`bg-white rounded w-full max-w-xl p-4 overflow-y-auto max-h-full ${isOver ? 'ring-2 ring-blue-500' : ''}`}
      >
        <div className="flex justify-between items-start mb-4">
          <h2 className="text-lg font-semibold">Card Details</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            ✕
          </button>
        </div>
        <div className="space-y-4">
          <div>
            {!isEditing ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-medium text-gray-900">{card.title}</h3>
                  <button
                    onClick={() => setIsEditing(true)}
                    className="text-gray-500 hover:text-gray-700"
                    title="Edit title and description"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                </div>
                {card.description && (
                  <p className="text-gray-700 whitespace-pre-line">{card.description}</p>
                )}
                {!card.description && (
                  <p className="text-gray-400 italic">No description</p>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <input
                  className="w-full border rounded px-2 py-1 font-medium"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Card title"
                />
                <textarea
                  className="w-full border rounded px-2 py-1"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  placeholder="Add a description..."
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleSave}
                    className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    Save
                  </button>
                  <button
                    onClick={handleCancel}
                    className="px-3 py-1 text-sm bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>

          {labels && (
            <div>
              <h4 className="font-medium mb-1">Labels</h4>
              <div className="flex flex-wrap gap-2">
                {labels.map((label) => (
                  <label key={label._id} className="flex items-center gap-1 text-sm">
                    <input
                      type="checkbox"
                      checked={!!hasLabel(label._id)}
                      onChange={() => handleToggleLabel(label._id)}
                    />
                    <span
                      className="px-2 py-0.5 rounded"
                      style={{ background: label.color }}
                    >
                      {label.name}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {checklist && (
            <div>
              <h4 className="font-medium mb-1">Checklist</h4>
              <form onSubmit={handleAddItem} className="flex gap-2 mb-2">
                <input
                  className="flex-1 border rounded px-2 py-1 text-sm"
                  value={itemText}
                  onChange={(e) => setItemText(e.target.value)}
                  placeholder="Add item"
                />
                <button type="submit" className="px-3 py-1 bg-gray-800 text-white rounded text-sm">
                  Add
                </button>
              </form>
              <div className="space-y-1">
                {checklist.map((item) => (
                  <label key={item._id} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={item.completed}
                      onChange={() => handleToggleItem(item._id, item.completed)}
                    />
                    <span className={item.completed ? "line-through text-gray-500" : ""}>{item.text}</span>
                    <button
                      type="button"
                      onClick={() => handleSpawnTask(item.text)}
                      className="text-gray-400 hover:text-blue-500"
                    >
                      <ArrowLeft className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(item._id)}
                      className="text-gray-400 hover:text-red-500 ml-1"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </label>
                ))}
              </div>
            </div>
          )}

          <div>
            <h4 className="font-medium mb-1">Add Comment</h4>
            <form onSubmit={handleAddComment} className="flex gap-2 mb-2">
              <input
                className="flex-1 border rounded px-2 py-1 text-sm"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Write a comment"
              />
              <button type="submit" className="px-3 py-1 bg-gray-800 text-white rounded text-sm">
                Add
              </button>
            </form>
            <div className="space-y-2">
              {comments?.map((c) => (
                <div key={c._id} className="bg-gray-100 p-2 rounded text-sm">
                  <p>{c.text}</p>
                  <div className="text-xs text-gray-500 mt-1">
                    {new Date(c.createdAt).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {activities && (
            <div>
              <h4 className="font-medium mb-1">Activity</h4>
              <div className="space-y-1 text-sm">
                {activities.map((a) => (
                  <div key={a._id} className="text-gray-700">
                    {new Date(a.createdAt).toLocaleString()} - {a.type === "comment" ? `Commented: ${a.text}` : a.text}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
