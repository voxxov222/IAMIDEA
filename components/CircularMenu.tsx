import React, { useState, useRef, useEffect } from 'react';
import { Activity } from 'lucide-react';

interface CircularMenuProps {
  isOpen: boolean;
  onToggle: () => void;
  onActivate: () => void;   // Top Left: Linking Mode
  onScan: () => void;       // Top Right: Auto-Organize/Search
  onConfigure: () => void;  // Bottom Left: Change Visual Mode
  onDisengage: () => void;  // Bottom Right: Clear/Reset
  onLibrary: () => void;    // Center/New: ZIM Library
  activeMode?: boolean;     // For "Activate" toggle state
}

const CircularMenu: React.FC<CircularMenuProps> = ({ 
  isOpen, onToggle, onActivate, onScan, onConfigure, onDisengage, onLibrary, activeMode 
}) => {
  // State for Position and Scale
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [scale, setScale] = useState(1);
  const [isInitialized, setIsInitialized] = useState(false);

  // Refs for gesture tracking
  const gestureRef = useRef({
    isDragging: false,
    isPinching: false,
    startX: 0,
    startY: 0,
    initialPos: { x: 0, y: 0 },
    startDist: 0,
    initialScale: 1,
    hasMoved: false
  });

  // Initialize position on mount (client-side only)
  useEffect(() => {
    // Default to bottom-right, but slightly higher up for mobile safety
    setPos({ 
      x: window.innerWidth - 80, 
      y: window.innerHeight - 150 
    });
    setIsInitialized(true);

    // Mouse Move/Up handlers for Desktop Dragging
    const handleMouseMove = (e: MouseEvent) => {
        if (!gestureRef.current.isDragging) return;
        
        const dx = e.clientX - gestureRef.current.startX;
        const dy = e.clientY - gestureRef.current.startY;
        
        if (Math.abs(dx) > 5 || Math.abs(dy) > 5) gestureRef.current.hasMoved = true;

        setPos({
            x: gestureRef.current.initialPos.x + dx,
            y: gestureRef.current.initialPos.y + dy
        });
    };

    const handleMouseUp = () => {
        gestureRef.current.isDragging = false;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  const handleTouchStart = (e: React.TouchEvent) => {
    // Prevent default to stop scrolling/zooming the whole page
    // e.preventDefault(); // Note: React synthetic events might complain, rely on touch-action: none css

    if (e.touches.length === 1) {
        gestureRef.current.isDragging = true;
        gestureRef.current.isPinching = false;
        gestureRef.current.startX = e.touches[0].clientX;
        gestureRef.current.startY = e.touches[0].clientY;
        gestureRef.current.initialPos = { ...pos };
        gestureRef.current.hasMoved = false;
    } else if (e.touches.length === 2) {
        gestureRef.current.isPinching = true;
        gestureRef.current.isDragging = false;
        const dist = Math.hypot(
            e.touches[0].clientX - e.touches[1].clientX,
            e.touches[0].clientY - e.touches[1].clientY
        );
        gestureRef.current.startDist = dist;
        gestureRef.current.initialScale = scale;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (gestureRef.current.isPinching && e.touches.length === 2) {
        const dist = Math.hypot(
            e.touches[0].clientX - e.touches[1].clientX,
            e.touches[0].clientY - e.touches[1].clientY
        );
        const ratio = dist / gestureRef.current.startDist;
        const newScale = Math.max(0.4, Math.min(2.0, gestureRef.current.initialScale * ratio));
        setScale(newScale);
    } else if (gestureRef.current.isDragging && e.touches.length === 1) {
        const dx = e.touches[0].clientX - gestureRef.current.startX;
        const dy = e.touches[0].clientY - gestureRef.current.startY;
        
        if (Math.abs(dx) > 5 || Math.abs(dy) > 5) gestureRef.current.hasMoved = true;

        setPos({
            x: gestureRef.current.initialPos.x + dx,
            y: gestureRef.current.initialPos.y + dy
        });
    }
  };

  const handleTouchEnd = () => {
    gestureRef.current.isDragging = false;
    gestureRef.current.isPinching = false;
  };

  const handleMouseDown = (e: React.MouseEvent) => {
      // Only left click starts drag
      if (e.button !== 0) return;
      gestureRef.current.isDragging = true;
      gestureRef.current.startX = e.clientX;
      gestureRef.current.startY = e.clientY;
      gestureRef.current.initialPos = { ...pos };
      gestureRef.current.hasMoved = false;
  };

  const handleTriggerClick = (e: React.MouseEvent) => {
      // Only toggle if we haven't moved significantly (differentiate drag vs click)
      if (!gestureRef.current.hasMoved) {
          onToggle();
      }
  };

  if (!isInitialized) return null;

  return (
    <div 
        style={{ 
            left: `${pos.x}px`, 
            top: `${pos.y}px`, 
            transform: `scale(${scale})`,
            touchAction: 'none' // Critical for preventing scroll while dragging
        }}
        className="fixed z-50 flex items-center justify-center pointer-events-auto cursor-grab active:cursor-grabbing"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
    >
      {/* Trigger Button (The "Little Box") */}
      <div 
        onClick={handleTriggerClick}
        className={`relative w-12 h-12 border border-neon-blue bg-black/80 flex items-center justify-center hover:bg-neon-blue/20 transition-colors duration-300 z-50 ${isOpen ? 'rotate-45' : ''}`}
      >
         <div className="w-1 h-4 bg-neon-blue absolute"></div>
         <div className="w-4 h-1 bg-neon-blue absolute"></div>
         {isOpen && <div className="absolute inset-0 border-2 border-neon-blue animate-ping opacity-50"></div>}
      </div>

      {/* The Menu Overlay */}
      <div className={`absolute transition-all duration-500 ease-out ${isOpen ? 'opacity-100 scale-100' : 'opacity-0 scale-50 pointer-events-none'}`}>
          
          {/* Outer Ring */}
          <div className="absolute inset-0 -m-32 w-80 h-80 rounded-full border border-neon-blue/20 border-dashed animate-[spin_10s_linear_infinite]"></div>
          <div className="absolute inset-0 -m-28 w-72 h-72 rounded-full border border-neon-blue/10"></div>

          {/* Quadrants Container */}
          <div className="relative w-64 h-64 -translate-x-1/2 -translate-y-1/2 left-1/2 top-1/2">
             
             {/* 1. ACTIVATE (Top Left) */}
             <button 
                onClick={(e) => { e.stopPropagation(); onActivate(); }}
                className="absolute top-0 left-0 w-32 h-32 border-t-2 border-l-2 border-neon-blue/60 hover:bg-neon-blue/20 rounded-tl-[4rem] group overflow-hidden pointer-events-auto"
             >
                <div className="absolute top-8 left-8 text-neon-blue font-display text-xs tracking-widest group-hover:text-white transition-colors rotate-[-45deg] origin-center translate-x-[-10px] translate-y-[10px]">
                    {activeMode ? 'LINKING' : 'ACTIVATE'}
                </div>
                {activeMode && <div className="absolute top-4 left-4 w-2 h-2 bg-neon-green shadow-[0_0_10px_#0f0] rounded-full animate-pulse"></div>}
             </button>

             {/* 2. SCAN (Top Right) */}
             <button 
                onClick={(e) => { e.stopPropagation(); onScan(); }}
                className="absolute top-0 right-0 w-32 h-32 border-t-2 border-r-2 border-neon-blue/60 hover:bg-neon-blue/20 rounded-tr-[4rem] group overflow-hidden pointer-events-auto"
             >
                <div className="absolute top-8 right-8 text-neon-blue font-display text-xs tracking-widest group-hover:text-white transition-colors rotate-[45deg] origin-center translate-x-[10px] translate-y-[10px]">
                    SCAN
                </div>
             </button>

             {/* 3. CONFIGURE (Bottom Left) */}
             <button 
                onClick={(e) => { e.stopPropagation(); onConfigure(); }}
                className="absolute bottom-0 left-0 w-32 h-32 border-b-2 border-l-2 border-neon-blue/60 hover:bg-neon-blue/20 rounded-bl-[4rem] group overflow-hidden pointer-events-auto"
             >
                 <div className="absolute bottom-8 left-8 text-neon-blue font-display text-xs tracking-widest group-hover:text-white transition-colors rotate-[45deg] origin-center translate-x-[-5px] translate-y-[-5px] md:translate-x-[-10px] md:translate-y-[-10px]">
                    CONFIG
                </div>
             </button>

             {/* 4. DISENGAGE (Bottom Right) */}
             <button 
                onClick={(e) => { e.stopPropagation(); onDisengage(); }}
                className="absolute bottom-0 right-0 w-32 h-32 border-b-2 border-r-2 border-neon-blue/60 hover:bg-red-500/20 hover:border-red-500 rounded-br-[4rem] group overflow-hidden pointer-events-auto"
             >
                 <div className="absolute bottom-8 right-8 text-neon-blue font-display text-xs tracking-widest group-hover:text-red-500 transition-colors rotate-[-45deg] origin-center translate-x-[10px] translate-y-[-10px]">
                    DISENGAGE
                </div>
             </button>

             {/* Center Deadzone (Visual Only) */}
             <button 
                onClick={(e) => { e.stopPropagation(); onLibrary(); }}
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 bg-black rounded-full border border-neon-pink flex items-center justify-center shadow-[0_0_20px_rgba(255,0,255,0.3)] hover:bg-neon-pink/20 transition-all pointer-events-auto z-[60]"
             >
                 <div className="w-8 h-8 border border-neon-pink/50 rounded-full flex items-center justify-center">
                    <Activity size={16} className="text-neon-pink" />
                 </div>
                 <div className="absolute -bottom-6 text-[8px] text-neon-pink font-bold tracking-tighter whitespace-nowrap">ZIM LIB</div>
             </button>
             
             {/* Crosshairs */}
             <div className="absolute top-1/2 left-0 w-full h-px bg-neon-blue/30 pointer-events-none"></div>
             <div className="absolute top-0 left-1/2 w-px h-full bg-neon-blue/30 pointer-events-none"></div>
          </div>
      </div>
    </div>
  );
};

export default CircularMenu;