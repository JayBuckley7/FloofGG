import { Link } from "react-router-dom";
import { Share2, Plus, Layout } from "lucide-react";

interface PublicBoardHeaderProps {
  boardTitle?: string;
  onUseTemplate?: () => void;
}

export default function PublicBoardHeader({ boardTitle, onUseTemplate }: PublicBoardHeaderProps) {
  return (
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
            {boardTitle && (
              <>
                <div className="w-px h-6 bg-gray-300" />
                <div className="flex items-center space-x-2">
                  <Share2 className="w-4 h-4 text-gray-400" />
                  <span className="text-sm font-medium text-gray-700 truncate max-w-xs">
                    {boardTitle}
                  </span>
                </div>
              </>
            )}
          </div>

          {/* Right side - CTA button */}
          <div className="flex items-center space-x-4">
            <div className="hidden sm:block text-sm text-gray-600">
              Like what you see?
            </div>
            {onUseTemplate && (
              <button
                onClick={onUseTemplate}
                className="inline-flex items-center px-3 sm:px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white text-xs sm:text-sm font-medium rounded-lg transition-all duration-200 shadow-sm hover:shadow-md active:scale-95 whitespace-nowrap"
              >
                <Plus className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                <span className="hidden xs:inline">Use as Template</span>
                <span className="inline xs:hidden">Template</span>
              </button>
            )}
            <Link
              to="/kanban"
              className="inline-flex items-center px-3 sm:px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white text-xs sm:text-sm font-medium rounded-lg transition-all duration-200 shadow-sm hover:shadow-md active:scale-95 whitespace-nowrap"
            >
              <Plus className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
              <span className="hidden xs:inline">Start Your Kanban</span>
              <span className="inline xs:hidden">Start</span>
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
} 