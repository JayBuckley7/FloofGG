import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { toast } from "sonner";

interface BoardListProps {
  onSelectBoard: (boardId: Id<"boards">) => void;
}

export function BoardList({ onSelectBoard }: BoardListProps) {
  const boards = useQuery(api.boards.list) || [];
  const createBoard = useMutation(api.boards.create);
  const deleteBoard = useMutation(api.boards.remove);
  const duplicateBoard = useMutation(api.boards.duplicate);
  
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newBoardName, setNewBoardName] = useState("");
  const [newBoardDescription, setNewBoardDescription] = useState("");
  const [newBoardPublic, setNewBoardPublic] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const handleCreateBoard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBoardName.trim()) return;

    setIsCreating(true);
    try {
      await createBoard({
        name: newBoardName.trim(),
        description: newBoardDescription.trim() || undefined,
        isPublic: newBoardPublic,
      });
      setNewBoardName("");
      setNewBoardDescription("");
      setNewBoardPublic(false);
      setShowCreateForm(false);
      toast.success("Board created successfully!");
    } catch (error) {
      toast.error("Failed to create board");
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteBoard = async (boardId: Id<"boards">, boardName: string) => {
    if (!confirm(`Are you sure you want to delete "${boardName}"? This will delete all lanes and cards.`)) {
      return;
    }

    try {
      await deleteBoard({ boardId });
      toast.success("Board deleted successfully!");
    } catch (error) {
      toast.error("Failed to delete board");
    }
  };

  const handleDuplicateBoard = async (boardId: Id<"boards">, boardName: string) => {
    const withCards = confirm(
      `Do you want to also duplicate the cards in "${boardName}"? Click 'Ok' to include cards or 'Cancel' for an empty copy.`
    );
    try {
      await duplicateBoard({ boardId, withCards });
      toast.success("Board duplicated successfully!");
    } catch (error) {
      toast.error("Failed to duplicate board");
    }
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Your Boards</h1>
          <p className="text-gray-600 mt-1">Organize your work with Kanban boards</p>
        </div>
        <button
          onClick={() => setShowCreateForm(true)}
          className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-3 rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-200 font-medium shadow-sm hover:shadow-md flex items-center gap-2 whitespace-nowrap"
        >
          <span className="text-lg">+</span>
          Create Board
        </button>
      </div>

      {showCreateForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-semibold mb-4">Create New Board</h2>
            <form onSubmit={handleCreateBoard}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Board Name *
                </label>
                <input
                  type="text"
                  value={newBoardName}
                  onChange={(e) => setNewBoardName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter board name"
                  required
                />
              </div>
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={newBoardDescription}
                  onChange={(e) => setNewBoardDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter board description (optional)"
                  rows={3}
                />
              </div>
              <div className="mb-6 flex items-center gap-2">
                <input
                  id="publicToggle"
                  type="checkbox"
                  checked={newBoardPublic}
                  onChange={(e) => setNewBoardPublic(e.target.checked)}
                />
                <label htmlFor="publicToggle" className="text-sm text-gray-700">
                  Public board
                </label>
              </div>
              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={isCreating || !newBoardName.trim()}
                  className="flex-1 bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isCreating ? "Creating..." : "Create Board"}
                </button>
                <button
                  type="button"
                onClick={() => {
                    setShowCreateForm(false);
                    setNewBoardName("");
                    setNewBoardDescription("");
                    setNewBoardPublic(false);
                  }}
                  className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-md hover:bg-gray-400 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {boards.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-400 text-6xl mb-4">📋</div>
          <h2 className="text-xl font-medium text-gray-600 mb-2">No boards yet</h2>
          <p className="text-gray-500">Create your first board to get started!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 lg:gap-6">
          {boards.map((board) => (
            <div
              key={board._id}
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-lg hover:border-blue-200 transition-all duration-200 cursor-pointer group relative overflow-hidden"
              onClick={() => onSelectBoard(board._id)}
            >
              {/* Background gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 to-purple-50/50 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
              
              <div className="relative">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors duration-200 truncate">
                      {board.name}
                    </h3>
                    {board.description && (
                      <p className="text-gray-600 text-sm mt-1 line-clamp-2">
                        {board.description}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDuplicateBoard(board._id, board.name);
                      }}
                      className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-all duration-200"
                      title="Duplicate board"
                    >
                      ⧉
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteBoard(board._id, board.name);
                      }}
                      className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all duration-200"
                      title="Delete board"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
                
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
                  <div className="text-xs text-gray-500">
                    {new Date(board._creationTime).toLocaleDateString()}
                  </div>
                  <div className="flex items-center text-xs text-blue-600 font-medium group-hover:text-blue-700">
                    Open →
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
