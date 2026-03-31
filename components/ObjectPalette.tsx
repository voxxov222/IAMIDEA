import React from 'react';
import { motion } from 'motion/react';
import { Box, Circle, Cylinder, Torus, Cone, Plus, Sparkles } from 'lucide-react';
import { NodeType } from './NodeElement';

interface ObjectPaletteProps {
  onAddObject: (type: NodeType, shape?: string) => void;
}

const OBJECT_TEMPLATES = [
  { id: 'box', name: 'Cube', icon: Box, shape: 'box', color: '#10b981' },
  { id: 'sphere', name: 'Sphere', icon: Circle, shape: 'sphere', color: '#3b82f6' },
  { id: 'cylinder', name: 'Cylinder', icon: Cylinder, shape: 'cylinder', color: '#f59e0b' },
  { id: 'torus', name: 'Torus', icon: Torus, shape: 'torus', color: '#8b5cf6' },
  { id: 'cone', name: 'Cone', icon: Cone, shape: 'cone', color: '#ec4899' },
];

export const ObjectPalette: React.FC<ObjectPaletteProps> = ({ onAddObject }) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <Sparkles size={14} className="text-neon-blue" />
        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Object Library</span>
      </div>
      
      <div className="grid grid-cols-2 gap-2">
        {OBJECT_TEMPLATES.map((obj) => (
          <motion.button
            key={obj.id}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => onAddObject('3d', obj.shape)}
            className="flex flex-col items-center gap-2 p-3 glass-morphism rounded-xl border border-white/5 hover:border-neon-blue/50 transition-all group"
          >
            <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center group-hover:bg-neon-blue/20 transition-colors">
              <obj.icon size={20} className="text-gray-400 group-hover:text-neon-blue" />
            </div>
            <span className="text-[9px] font-bold text-gray-500 group-hover:text-gray-300 uppercase">{obj.name}</span>
          </motion.button>
        ))}
      </div>

      <div className="pt-4 border-t border-white/5">
        <button
          onClick={() => onAddObject('pollinations')}
          className="w-full py-3 glass-morphism rounded-xl border border-neon-purple/30 hover:border-neon-purple text-neon-purple flex items-center justify-center gap-2 transition-all group"
        >
          <Plus size={16} />
          <span className="text-[10px] font-bold uppercase">Add AI Generator</span>
        </button>
      </div>
    </div>
  );
};
