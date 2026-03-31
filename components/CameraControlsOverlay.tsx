import React from 'react';
import { motion } from 'motion/react';
import { Maximize2, Minimize2, RotateCw, Box, Move, Eye } from 'lucide-react';

export const CameraControlsOverlay: React.FC = () => {
  const dispatchCameraAction = (type: string, detail: any = {}) => {
    window.dispatchEvent(new CustomEvent('camera-control', { 
      detail: { type, ...detail } 
    }));
  };

  return (
    <div className="fixed bottom-24 right-6 flex flex-col gap-2 z-[90]">
      <div className="glass-morphism p-2 rounded-2xl border border-white/10 flex flex-col gap-2 shadow-2xl">
        <button 
          onClick={() => dispatchCameraAction('reset')}
          className="p-2 bg-white/5 hover:bg-neon-blue/20 text-gray-400 hover:text-neon-blue rounded-xl transition-all"
          title="Reset Camera"
        >
          <RotateCw size={18} />
        </button>
        
        <div className="h-px bg-white/5 mx-1" />
        
        <button 
          onClick={() => dispatchCameraAction('zoom', { factor: 0.8, type: 'zoom-in' })}
          className="p-2 bg-white/5 hover:bg-neon-blue/20 text-gray-400 hover:text-neon-blue rounded-xl transition-all"
          title="Zoom In"
        >
          <Maximize2 size={18} />
        </button>
        
        <button 
          onClick={() => dispatchCameraAction('zoom', { factor: 1.2, type: 'zoom-out' })}
          className="p-2 bg-white/5 hover:bg-neon-blue/20 text-gray-400 hover:text-neon-blue rounded-xl transition-all"
          title="Zoom Out"
        >
          <Minimize2 size={18} />
        </button>
        
        <div className="h-px bg-white/5 mx-1" />
        
        <div className="flex flex-col gap-1">
          <button 
            onClick={() => dispatchCameraAction('view', { position: { x: 0, y: 150, z: 0 } })}
            className="p-1.5 text-[9px] font-bold text-gray-500 hover:text-neon-blue uppercase tracking-widest transition-colors"
          >
            Top
          </button>
          <button 
            onClick={() => dispatchCameraAction('view', { position: { x: 0, y: 0, z: 150 } })}
            className="p-1.5 text-[9px] font-bold text-gray-500 hover:text-neon-blue uppercase tracking-widest transition-colors"
          >
            Front
          </button>
          <button 
            onClick={() => dispatchCameraAction('view', { position: { x: 150, y: 0, z: 0 } })}
            className="p-1.5 text-[9px] font-bold text-gray-500 hover:text-neon-blue uppercase tracking-widest transition-colors"
          >
            Side
          </button>
        </div>
      </div>
      
      <div className="glass-morphism p-2 rounded-2xl border border-white/10 flex items-center justify-center text-[9px] text-gray-500 font-bold uppercase tracking-widest">
        3D Nav
      </div>
    </div>
  );
};
