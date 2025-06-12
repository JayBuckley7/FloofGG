import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Doc, Id } from "../../convex/_generated/dataModel";
import { toast } from "sonner";

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

  const [title, setTitle] = useState(card.title);
  const [description, setDescription] = useState(card.description || "");
  const [commentText, setCommentText] = useState("");

  const handleSave = async () => {
    await updateCard({
      cardId: card._id,
      title: title.trim() || card.title,
      description: description.trim() || undefined,
    });
    toast.success("Card updated");
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    await addComment({ cardId: card._id, text: commentText.trim() });
    setCommentText("");
  };

  const handleToggleLabel = async (labelId: Id<"labels">) => {
    await toggleLabel({ cardId: card._id, labelId });
  };

  const hasLabel = (labelId: Id<"labels">) =>
    cardLabels?.some((l) => l._id === labelId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-2">
      <div className="bg-white rounded w-full max-w-xl p-4 overflow-y-auto max-h-full">
        <div className="flex justify-between items-start mb-4">
          <h2 className="text-lg font-semibold">Card Details</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            ✕
          </button>
        </div>
        <div className="space-y-4">
          <div>
            <input
              className="w-full border rounded px-2 py-1 mb-2"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <textarea
              className="w-full border rounded px-2 py-1"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
            <button
              onClick={handleSave}
              className="mt-2 px-3 py-1 text-sm bg-blue-600 text-white rounded"
            >
              Save
            </button>
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
