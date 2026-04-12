import React, { useState } from 'react';
import { DraggableWindow } from './DraggableWindow';
import { Zap, RefreshCw, Sparkles, Network } from 'lucide-react';
import { generateEnvironmentAI, generateNodesAI } from '../services/geminiService';

interface WorldGeneratorWindowProps {
  onClose: () => void;
  onUpdateEnv: (envSettings: any, nodes: any[]) => void;
  onAddNodes: (nodes: any[], connections: any[]) => void;
}

export const WorldGeneratorWindow = ({ onClose, onUpdateEnv, onAddNodes }: WorldGeneratorWindowProps) => {
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [mode, setMode] = useState<'env' | 'nodes'>('env');

  const handleGenerate = async () => {
    if (!prompt.trim() || isGenerating) return;
    setIsGenerating(true);
    try {
      if (mode === 'env') {
        const result = await generateEnvironmentAI(prompt);
        onUpdateEnv(result.envSettings || {}, result.nodes || []);
      } else {
        const result = await generateNodesAI(prompt);
        onAddNodes(result.nodes || [], result.connections || []);
      }
    } catch (error) {
      console.error("AI Generation failed:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <DraggableWindow title="AI Architect" onClose={onClose} defaultPosition={{ x: 100, y: 100 }}>
      <div className="w-80 space-y-4 p-4">
        <div className="flex gap-2">
          <button onClick={() => setMode('env')} className={`flex-1 py-1 text-xs rounded ${mode === 'env' ? 'bg-neon-blue text-space-900' : 'bg-white/5 text-gray-400'}`}>Environment</button>
          <button onClick={() => setMode('nodes')} className={`flex-1 py-1 text-xs rounded ${mode === 'nodes' ? 'bg-neon-purple text-space-900' : 'bg-white/5 text-gray-400'}`}>Nodes</button>
        </div>
        <p className="text-xs text-gray-400">Describe the {mode === 'env' ? '3D environment' : 'nodes and connections'} you want to create.</p>
        <textarea 
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder={mode === 'env' ? "e.g., 'A neon cyberpunk city with floating sentinels'..." : "e.g., 'Create a network of nodes representing a solar system'..."}
          className="w-full bg-space-900 border border-white/10 rounded p-3 text-sm text-white focus:outline-none focus:border-neon-blue min-h-[100px] resize-none"
        />
        <button 
          onClick={handleGenerate}
          disabled={isGenerating || !prompt.trim()}
          className={`w-full py-2 rounded flex items-center justify-center gap-2 transition-all ${isGenerating ? 'bg-gray-600 cursor-not-allowed' : (mode === 'env' ? 'bg-neon-blue text-space-900' : 'bg-neon-purple text-white') + ' font-bold hover:brightness-110 shadow-[0_0_15px_rgba(0,210,255,0.3)]'}`}
        >
          {isGenerating ? (
            <RefreshCw size={16} className="animate-spin" />
          ) : (
            mode === 'env' ? <Sparkles size={16} /> : <Network size={16} />
          )}
          {isGenerating ? 'Generating...' : `Generate ${mode === 'env' ? 'World' : 'Nodes'}`}
        </button>
      </div>
    </DraggableWindow>
  );
};
