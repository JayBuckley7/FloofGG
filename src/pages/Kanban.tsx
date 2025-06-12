import { Authenticated, Unauthenticated } from "convex/react";
import { SignInForm } from "../SignInForm";
import { useState, useEffect } from "react";
import { BoardList } from "../components/BoardList";
import { Board } from "../components/Board";
import { Id } from "../../convex/_generated/dataModel";
import { SignOutButton } from "../SignOutButton";
import { Layout } from "lucide-react";

export default function Kanban() {
  const [selectedBoardId, setSelectedBoardId] = useState<Id<"boards"> | null>(null);

  useEffect(() => {
    if (selectedBoardId === null) {
      document.title = "Floofy Kanban";
    }
  }, [selectedBoardId]);

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-50 via-gray-50 to-blue-50">
      <header className="bg-white/95 has-blur desktop-blur border-b border-gray-200 shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Left side - Kanban branding */}
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                  <Layout className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">Kanban</h1>
                  <p className="text-xs text-gray-500 leading-none">Kanban Organizer</p>
                </div>
              </div>
              {selectedBoardId && (
                <>
                  <div className="w-px h-6 bg-gray-300" />
                <button
                  onClick={() => setSelectedBoardId(null)}
                    className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
                >
                    ← All Kanbans
                </button>
                </>
              )}
            </div>

            {/* Right side - Sign out */}
            <SignOutButton />
          </div>
        </div>
      </header>
      
      <main className="flex-1">
        <Authenticated>
          {selectedBoardId ? (
            <Board boardId={selectedBoardId} />
          ) : (
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
              <BoardList onSelectBoard={setSelectedBoardId} />
            </div>
          )}
        </Authenticated>
        <Unauthenticated>
          <div className="max-w-md mx-auto px-4 py-20">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <span className="text-white font-bold text-2xl">K</span>
              </div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-4">
                Welcome to Kanban
              </h1>
              <p className="text-xl text-gray-600">Sign in to manage your kanbans and tasks</p>
            </div>
            <SignInForm />
          </div>
        </Unauthenticated>
      </main>
    </div>
  );
} 