import { useParams } from "react-router-dom";
import { useQuery, useMutation, useConvexAuth } from "convex/react";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Board } from "../components/Board";
import PublicBoardHeader from "../components/PublicBoardHeader";
import { Id } from "../../convex/_generated/dataModel";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";

export default function PublicBoard() {
  const { boardId } = useParams();
  const board = useQuery(api.boards.getPublic, { boardId: boardId as Id<"boards"> });
  const cloneBoard = useMutation(api.boards.clone);
  const { isAuthenticated } = useConvexAuth();
  const navigate = useNavigate();
  
  // Update document title for public boards
  useEffect(() => {
    if (board?.name) {
      document.title = `${board.name} (Public) - Kanban Organizer`;
    }
    
    return () => {
      document.title = "Kanban Organizer";
    };
  }, [board?.name]);
  
  if (!boardId) return <div className="p-4">Kanban not found</div>;
  
  if (board === undefined) {
    return (
      <div className="min-h-screen no-flash">
        <PublicBoardHeader />
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading kanban...</p>
          </div>
        </div>
      </div>
    );
  }

  if (board === null) {
    return (
      <div className="min-h-screen no-flash">
        <PublicBoardHeader />
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="text-center">
            <p className="text-gray-600 mb-4">This kanban is not public or doesn't exist.</p>
            <a 
              href="/kanban" 
              className="inline-flex items-center px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg"
            >
              Create Your Own Kanban
            </a>
          </div>
        </div>
      </div>
    );
  }

  const handleUseTemplate = async () => {
    if (!boardId) return;
    if (!isAuthenticated) {
      navigate("/kanban");
      return;
    }
    try {
      await cloneBoard({ boardId: boardId as Id<"boards"> });
      toast.success("Board copied to your account");
      navigate("/kanban");
    } catch (err) {
      toast.error("Failed to copy board");
    }
  };

  return (
    <>
      <PublicBoardHeader boardTitle={board.name} onUseTemplate={handleUseTemplate} />
      <Board boardId={boardId as Id<"boards">} publicView />
    </>
  );
}
