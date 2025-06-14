import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id, Doc } from "../../convex/_generated/dataModel";
import { Lane } from "./Lane";
import { AddLane } from "./AddLane";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { SortableContext, horizontalListSortingStrategy } from "@dnd-kit/sortable";
import { useState, useEffect, useRef } from "react";
import { Card } from "./Card";
import { gradientOptions } from "../lib/gradients";
import { toast } from "sonner";
import { Pencil } from "lucide-react";

interface BoardProps {
  boardId: Id<"boards">;
  publicView?: boolean;
}

export function Board({ boardId, publicView = false }: BoardProps) {
  const board = useQuery(publicView ? api.boards.getPublic : api.boards.get, { boardId });
  const lanes = useQuery(publicView ? api.lanes.listPublic : api.lanes.list, { boardId });
  const moveCard = useMutation(api.cards.move);
  const addChecklistItem = useMutation(api.checklists.add);
  const updateBoard = useMutation(api.boards.update);
  
  const [activeCard, setActiveCard] = useState<any>(null);
  const [activeCardData, setActiveCardData] = useState<any>(null);
  const [viewMode, setViewMode] = useState<"use" | "design" | "view">(
    publicView ? "view" : "use"
  );
  // zoom level for mobile lane scaling
  const [laneZoom, setLaneZoom] = useState(1);
  const pinchState = useRef<{ distance: number | null; zoom: number }>({
    distance: null,
    zoom: 1,
  });
  const [bgMode, setBgMode] = useState<'color' | 'gradient' | 'image' | 'gradient+image'>('color');
  const [bgColor, setBgColor] = useState('#ffffff');
  const [bgGradient, setBgGradient] = useState(gradientOptions[0]);
  const [bgImage, setBgImage] = useState('');
  const [bgImageMode, setBgImageMode] = useState<'stretch' | 'center' | 'tile'>('stretch');
  const laneContainerRef = useRef<HTMLDivElement>(null);
  const lastMoveDirection = useRef<'left' | 'right' | null>(null);

  const [isEditingName, setIsEditingName] = useState(false);
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');

  // Update document title when board loads
  useEffect(() => {
    if (board?.name) {
      document.title = `${board.name} - Kanban Board Organizer`;
    }
    
    // Cleanup: restore original title when component unmounts
    return () => {
      document.title = "Kanban Board Organizer";
    };
  }, [board?.name]);

  useEffect(() => {
    if (board) {
      setEditName(board.name);
      setEditDescription(board.description || '');
    }
  }, [board?.name, board?.description]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 200,
        tolerance: 15,
      },
    })
  );

  // Helper function to determine if a color is light or dark
  const isLightColor = (color: string): boolean => {
    if (!color) return true; // Default to light if no color
    
    // Handle gradients - extract first color
    if (color.startsWith('linear-gradient')) {
      const hexMatch = color.match(/#[0-9a-fA-F]{6}/);
      if (hexMatch) {
        color = hexMatch[0];
      } else {
        return false; // Default to dark for complex gradients
      }
    }
    
    // Handle image URLs - assume dark for better readability
    if (color.startsWith('url(')) {
      return false;
    }
    
    // Convert hex to RGB
    const hex = color.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    
    // Calculate luminance using the relative luminance formula
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    
    return luminance > 0.5;
  };

  // Get smart text color based on background
  const getSmartTextColor = (background: string) => {
    return isLightColor(background) ? 'text-gray-900' : 'text-white';
  };

  // Move useEffect to top level to avoid conditional hook calls
  useEffect(() => {
    if (!board) return; // Guard clause for when board is null/undefined
    
    if (!board.background) {
      setBgMode('color');
      setBgColor('#ffffff');
      return;
    }
    if (board.background.includes('linear-gradient') && board.background.includes('url(')) {
      // Combined gradient + image mode
      setBgMode('gradient+image');
      // Extract gradient (everything before the first comma)
      const gradientMatch = board.background.match(/(linear-gradient\([^)]+\))/);
      if (gradientMatch) {
        setBgGradient(gradientMatch[1]);
      }
      // Extract image URL
      const urlMatch = board.background.match(/url\(['"]?(.*?)['"]?\)/);
      if (urlMatch) {
        setBgImage(urlMatch[1]);
      }
      // Check if it's a tiled background
      // Determine image mode from background CSS
      if (board.background.includes(' repeat') && !board.background.includes('no-repeat')) {
        setBgImageMode('tile');
      } else if (board.background.includes('center/contain')) {
        setBgImageMode('center');
      } else {
        setBgImageMode('stretch');
      }
    } else if (board.background.startsWith('url(')) {
      setBgMode('image');
      // Extract just the URL part, handle quotes and additional CSS properties
      const urlMatch = board.background.match(/url\(['"]?(.*?)['"]?\)/);
      if (urlMatch) {
        setBgImage(urlMatch[1]);
      }
      // Determine image mode from background CSS
      if (board.background.includes(' repeat') && !board.background.includes('no-repeat')) {
        setBgImageMode('tile');
      } else if (board.background.includes('center/contain')) {
        setBgImageMode('center');
      } else {
        setBgImageMode('stretch');
      }
    } else if (board.background.startsWith('linear-gradient')) {
      setBgMode('gradient');
      setBgGradient(board.background);
    } else {
      setBgMode('color');
      setBgColor(board.background);
    }
  }, [board]);

  // Update the browser tab title when a board is viewed
  useEffect(() => {
    if (board) {
      document.title = `${board.name} - Kanban`;
    }
    return () => {
      document.title = "Floofy Kanban";
    };
  }, [board]);

  if (board === undefined || lanes === undefined) {
    return (
      <div className="flex-1 relative w-full min-h-screen bg-gray-100">
        <div className="flex justify-center items-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading board...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!board) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-medium text-gray-600">Board not found</h2>
      </div>
    );
  }

  const sortedLanes = [...lanes].sort((a, b) => a.position - b.position);

  const handleBackgroundChange = async (bg: string) => {
    await updateBoard({
      boardId,
      name: board.name,
      description: board.description,
      background: bg,
      isPublic: board.isPublic,
    });
  };

  const getImageCSS = (mode = bgImageMode) => {
    if (!bgImage) return '';
    switch (mode) {
      case 'tile':
        return `url("${bgImage}") repeat`;
      case 'center':
        return `url("${bgImage}") no-repeat center/contain`;
      case 'stretch':
        return `url("${bgImage}") no-repeat center/cover`;
      default:
        return `url("${bgImage}") no-repeat center/cover`;
    }
  };

  const handleImageBackgroundChange = (mode = bgImageMode) => {
    if (!bgImage) return;
    handleBackgroundChange(getImageCSS(mode));
  };

  const handleCombinedBackgroundChange = (mode = bgImageMode, gradient = bgGradient) => {
    if (!bgImage || !gradient) return;
    const imagePart = getImageCSS(mode);
    const bgValue = `${imagePart}, ${gradient}`;
    handleBackgroundChange(bgValue);
  };

  const saveBoardName = async () => {
    if (!board) return;
    if (!editName.trim()) return;
    await updateBoard({
      boardId,
      name: editName.trim(),
      description: board.description,
      background: board.background,
      isPublic: board.isPublic,
    });
    setIsEditingName(false);
  };

  const saveBoardDescription = async () => {
    if (!board) return;
    await updateBoard({
      boardId,
      name: board.name,
      description: editDescription.trim() || undefined,
      background: board.background,
      isPublic: board.isPublic,
    });
    setIsEditingDescription(false);
  };

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    if (active.data.current?.type === "card") {
      setActiveCard(active.id);
      setActiveCardData(active.data.current.card);
    }
  };

  const handleDragMove = (event: any) => {
    const container = laneContainerRef.current;
    if (!container) return;
    if (window.innerWidth > 640) return; // only small screens
    if (container.scrollWidth <= container.clientWidth) return;

    const deltaX = event.delta?.x || 0;
    if (deltaX > 0) {
      lastMoveDirection.current = 'right';
    } else if (deltaX < 0) {
      lastMoveDirection.current = 'left';
    }

    if (!event.over) {
      const maxScroll = container.scrollWidth - container.clientWidth;
      if (lastMoveDirection.current === 'right' && container.scrollLeft < maxScroll) {
        container.scrollBy({ left: container.clientWidth, behavior: 'smooth' });
      } else if (lastMoveDirection.current === 'left' && container.scrollLeft > 0) {
        container.scrollBy({ left: -container.clientWidth, behavior: 'smooth' });
      }
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over) return;

    if (active.data.current?.type === "card") {
      const cardId = active.id as Id<"cards">;
      const overId = over.id;
      const overData = over.data.current;
      const draggedCard = active.data.current.card as Doc<"cards">;

      if (overData?.type === "lane") {
        // Moving to a different lane
        const newLaneId = overId as Id<"lanes">;
        await moveCard({
          cardId,
          newLaneId,
          newPosition: 0, // Add to top of lane
        });
      } else if (overData?.type === "card") {
        // Moving to a specific position within a lane
        const targetCard = overData.card;
        await moveCard({
          cardId,
          newLaneId: targetCard.laneId,
          newPosition: targetCard.position,
        });
      } else if (overData?.type === "cardModal") {
        const targetCardId = overData.cardId as Id<"cards">;
        await addChecklistItem({ cardId: targetCardId, text: draggedCard.title });
        toast.success(`Added "${draggedCard.title}" to checklist`);
      }
    }

    setActiveCard(null);
    setActiveCardData(null);
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      pinchState.current.distance = Math.hypot(dx, dy);
      pinchState.current.zoom = laneZoom;
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 2 && pinchState.current.distance) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const distance = Math.hypot(dx, dy);
      const scale = distance / pinchState.current.distance;
      let newZoom = pinchState.current.zoom * scale;
      newZoom = Math.min(1.5, Math.max(0.5, newZoom));
      setLaneZoom(newZoom);
    }
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length < 2) {
      pinchState.current.distance = null;
    }
  };

  return (
    <div 
      style={{ 
        background: board.background ?? 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)'
      }} 
      className="flex-1 relative w-full min-h-screen"
    >
      <div className="w-full px-0 sm:px-6 lg:px-8 py-6">
        <div className="mb-4 sm:mb-6">
          {isEditingName ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                saveBoardName();
              }}
            >
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="w-full px-2 py-1 text-xl sm:text-2xl font-bold rounded border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 mb-2"
                autoFocus
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
                    setIsEditingName(false);
                    setEditName(board.name);
                  }}
                  className="px-3 py-1 text-xs bg-gray-300 text-gray-700 rounded hover:bg-gray-400 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <h1
              className={`text-2xl sm:text-3xl font-bold mb-2 flex items-center gap-2 ${getSmartTextColor(board.background || '#ffffff')}`}
            >
              {board.name}
              {!publicView && viewMode === 'design' && (
                <button
                  type="button"
                  onClick={() => setIsEditingName(true)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <Pencil className="w-4 h-4" />
                </button>
              )}
            </h1>
          )}

          {isEditingDescription ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                saveBoardDescription();
              }}
            >
              <textarea
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                rows={2}
                className="w-full px-2 py-1 text-sm sm:text-base rounded border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 mb-2"
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
                    setIsEditingDescription(false);
                    setEditDescription(board.description || '');
                  }}
                  className="px-3 py-1 text-xs bg-gray-300 text-gray-700 rounded hover:bg-gray-400 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <>
              {board.description ? (
                <p
                  className={`text-sm sm:text-base ${getSmartTextColor(board.background || '#ffffff')} opacity-90 flex items-center gap-2`}
                >
                  {board.description}
                  {!publicView && viewMode === 'design' && (
                    <button
                      type="button"
                      onClick={() => setIsEditingDescription(true)}
                      className="text-gray-500 hover:text-gray-700"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                  )}
                </p>
              ) : (
                !publicView && viewMode === 'design' && (
                  <button
                    type="button"
                    onClick={() => setIsEditingDescription(true)}
                    className={`text-sm flex items-center gap-1 ${getSmartTextColor(board.background || '#ffffff')} opacity-75`}
                  >
                    <Pencil className="w-3 h-3" /> Add description
                  </button>
                )
              )}
            </>
          )}
        {!publicView && viewMode === "design" && (
          <div className="mt-3 flex items-center">
            <label className="inline-flex items-center group cursor-pointer">
              <div className="relative">
                <input
                  type="checkbox"
                  checked={board.isPublic}
                  onChange={async (e) => {
                    await updateBoard({
                      boardId,
                      name: board.name,
                      description: board.description,
                      background: board.background,
                      isPublic: e.target.checked,
                    });
                  }}
                  className="sr-only"
                />
                <div className={`w-11 h-6 rounded-full transition-all duration-300 ${
                  board.isPublic 
                    ? 'bg-gradient-to-r from-green-400 to-green-500 shadow-lg' 
                    : 'bg-gray-300 hover:bg-gray-400'
                }`}>
                  <div className={`w-5 h-5 bg-white rounded-full shadow-md transform transition-all duration-300 ${
                    board.isPublic ? 'translate-x-5' : 'translate-x-0.5'
                  } mt-0.5`}>
                  </div>
                </div>
              </div>
              <span className={`ml-3 text-sm font-medium ${getSmartTextColor(board.background || '#ffffff')} flex items-center gap-2`}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                    d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Make Public
                {board.isPublic && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    Live
                  </span>
                )}
              </span>
            </label>
          </div>
        )}
        {!publicView && viewMode === "view" && (
          <div className="mt-3 relative">
            <button
              type="button"
              onClick={async (e) => {
                if (board.isPublic) {
                  const url = `${window.location.origin}/board/${boardId}`;
                  
                  try {
                    // Try modern clipboard API first
                    if (navigator.clipboard && navigator.clipboard.writeText) {
                      await navigator.clipboard.writeText(url);
                      toast.success("Board URL copied to clipboard!", {
                        position: "top-center",
                        duration: 2000,
                      });
                    } else {
                      // Fallback for older browsers or non-HTTPS
                      const textArea = document.createElement('textarea');
                      textArea.value = url;
                      textArea.style.position = 'fixed';
                      textArea.style.left = '-999999px';
                      textArea.style.top = '-999999px';
                      document.body.appendChild(textArea);
                      textArea.focus();
                      textArea.select();
                      
                      try {
                        document.execCommand('copy');
                        toast.success("Board URL copied to clipboard!", {
                          position: "top-center",
                          duration: 2000,
                        });
                      } catch (err) {
                        toast.error("Could not copy to clipboard. Please copy manually: " + url, {
                          position: "top-center",
                          duration: 5000,
                        });
                      }
                      
                      document.body.removeChild(textArea);
                    }
                  } catch (err) {
                    toast.error("Could not copy to clipboard. Please copy manually: " + url, {
                      position: "top-center",
                      duration: 5000,
                    });
                  }
                } else {
                  toast.error("Board not public!", {
                    position: "top-center", 
                    duration: 2000,
                  });
                }
              }}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200 shadow-sm hover:shadow-md ${
                isLightColor(board.background || '#ffffff')
                  ? 'bg-blue-600 hover:bg-blue-700 text-white'
                  : 'bg-white hover:bg-gray-50 text-gray-900 border border-gray-200'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
              </svg>
              Share Board
            </button>
          </div>
        )}
        {viewMode === "design" && (
          <div className="mt-2 space-y-2">
            <div className="flex items-center gap-2">
              <label className={`text-sm font-medium ${getSmartTextColor(board.background || '#ffffff')}`}>Board Background:</label>
              <select
                value={bgMode}
                onChange={(e) => setBgMode(e.target.value as 'color' | 'gradient' | 'image' | 'gradient+image')}
                className="border px-1 py-0.5 rounded text-sm"
              >
                <option value="color">Static color</option>
                <option value="gradient">Gradient</option>
                <option value="image">Image URL</option>
                <option value="gradient+image">Gradient + Image</option>
              </select>
              {bgMode === 'color' && (
                <input
                  type="color"
                  value={bgColor}
                  onChange={(e) => {
                    setBgColor(e.target.value);
                    handleBackgroundChange(e.target.value);
                  }}
                  className="border p-1 rounded"
                />
              )}
            </div>
            {bgMode === 'gradient' && (
              <div className="flex flex-wrap gap-0.5">
                {gradientOptions.map((g) => (
                  <button
                    type="button"
                    key={g}
                    onClick={() => {
                      setBgGradient(g);
                      handleBackgroundChange(g);
                    }}
                    className="w-8 h-8 rounded border hover:scale-110 transition-transform shadow-sm transform-gpu will-change-transform"
                    style={{ background: g }}
                  />
                ))}
              </div>
            )}
            {bgMode === 'image' && (
              <div className="space-y-2">
                <input
                  type="text"
                  value={bgImage}
                  onChange={(e) => setBgImage(e.target.value)}
                  onBlur={handleImageBackgroundChange}
                  placeholder="Image or GIF URL"
                  className="border p-1 rounded w-64 text-sm"
                />
                <div className="flex items-center gap-2">
                  <label className={`text-sm font-medium ${getSmartTextColor(board.background || '#ffffff')}`}>
                    Image Mode:
                  </label>
                  <select
                    value={bgImageMode}
                                         onChange={(e) => {
                       const newMode = e.target.value as 'stretch' | 'center' | 'tile';
                       setBgImageMode(newMode);
                       if (bgImage) {
                         handleImageBackgroundChange(newMode);
                       }
                     }}
                    className="border px-2 py-1 rounded text-sm"
                  >
                    <option value="stretch">Stretch (Cover)</option>
                    <option value="center">Center (Contain)</option>
                    <option value="tile">Tile (Repeat)</option>
                  </select>
                </div>
              </div>
            )}
            {bgMode === 'gradient+image' && (
              <div className="space-y-3">
                <div>
                  <label className={`text-xs font-medium ${getSmartTextColor(board.background || '#ffffff')} block mb-1`}>
                    Gradient (Background Layer)
                  </label>
                  <div className="flex flex-wrap gap-0.5">
                    {gradientOptions.map((g) => (
                      <button
                        type="button"
                        key={g}
                        onClick={() => {
                          setBgGradient(g);
                          if (bgImage) handleCombinedBackgroundChange(bgImageMode, g);
                        }}
                        className="w-8 h-8 rounded border hover:scale-110 transition-transform shadow-sm transform-gpu will-change-transform"
                        style={{ background: g }}
                      />
                    ))}
                  </div>
                </div>
                <div>
                                     <label className={`text-xs font-medium ${getSmartTextColor(board.background || '#ffffff')} block mb-1`}>
                     Image (Overlay Layer)
                   </label>
                   <input
                     type="text"
                     value={bgImage}
                     onChange={(e) => setBgImage(e.target.value)}
                     onBlur={() => {
                       if (bgGradient) handleCombinedBackgroundChange();
                     }}
                     placeholder="Image or GIF URL (PNG with transparency works best)"
                     className="border p-1 rounded w-64 text-sm mb-2"
                   />
                   <div className={`text-xs ${getSmartTextColor(board.background || '#ffffff')} opacity-75 mb-2`}>
                     💡 Tips: Works with JPG, PNG, GIF, WebP. Use PNG/GIF with transparency for best overlay effects. Try "Center" mode if gradient isn't visible.
                   </div>
                                     <div className="flex items-center gap-2">
                     <label className={`text-sm font-medium ${getSmartTextColor(board.background || '#ffffff')}`}>
                       Image Mode:
                     </label>
                     <select
                       value={bgImageMode}
                       onChange={(e) => {
                         const newMode = e.target.value as 'stretch' | 'center' | 'tile';
                         setBgImageMode(newMode);
                         if (bgImage && bgGradient) {
                           handleCombinedBackgroundChange(newMode);
                         }
                       }}
                       className="border px-2 py-1 rounded text-sm"
                     >
                       <option value="stretch">Stretch (Cover)</option>
                       <option value="center">Center (Contain)</option>
                       <option value="tile">Tile (Repeat)</option>
                     </select>
                   </div>
                </div>
              </div>
            )}
          </div>
        )}
        {!publicView && (
          <div className="mt-3 sm:mt-4 flex gap-1 sm:gap-2">
            {[
              ["use", "Use"],
              ["design", "Design"],
              ["view", "View"],
            ].map(([mode, label]) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode as "use" | "design" | "view")}
                className={`px-2 sm:px-3 py-1 rounded-md text-xs sm:text-sm font-medium transition-colors ${
                  viewMode === mode
                    ? "bg-blue-600 text-white"
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Mobile zoom hint */}
      <div className="text-center text-xs text-gray-500 mt-2 sm:hidden">
        Pinch with two fingers to zoom
      </div>

      <DndContext
        sensors={sensors}
        onDragStart={viewMode === "use" ? handleDragStart : undefined}
        onDragMove={viewMode === "use" ? handleDragMove : undefined}
        onDragEnd={viewMode === "use" ? handleDragEnd : undefined}
      >
        <div
          ref={laneContainerRef}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          style={{ transform: `scale(${laneZoom})`, transformOrigin: 'top left' }}
          className="flex gap-2 sm:gap-4 lg:gap-6 overflow-x-auto pb-6 scrollbar-hide px-0"
        >
          <SortableContext items={sortedLanes.map(l => l._id)} strategy={horizontalListSortingStrategy}>
            {sortedLanes.map((lane) => (
              <Lane key={lane._id} lane={lane} viewMode={viewMode} publicView={publicView} />
            ))}
          </SortableContext>
          {viewMode === "design" && <AddLane boardId={boardId} />}
        </div>
        
        {viewMode === "use" && (
          <DragOverlay>
            {activeCard && activeCardData ? (
              <div className="rotate-3 opacity-90">
                <Card card={activeCardData} isDragging />
              </div>
            ) : null}
          </DragOverlay>
        )}
      </DndContext>
      </div>
    </div>
  );
}
