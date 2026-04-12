import React, { useState, useEffect } from 'react';
import { X, Sparkles, RefreshCw, Play } from 'lucide-react';
import { generateZimCode } from '../services/geminiService';
import { NodeData } from './NodeElement';

interface ZimEditorModalProps {
  node: NodeData;
  isOpen: boolean;
  onClose: () => void;
  onUpdateNode: (id: string, data: Partial<NodeData>) => void;
}

export function ZimEditorModal({ node, isOpen, onClose, onUpdateNode }: ZimEditorModalProps) {
  const [zimCode, setZimCode] = useState(node.content || '');
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');

  useEffect(() => {
    setZimCode(node.content || '');
  }, [node.content]);

  if (!isOpen) return null;

  const zimSrcDoc = `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <style>
      body { margin: 0; padding: 0; width: 100vw; height: 100vh; overflow: hidden; background: transparent; }
    </style>
    <script src="https://zimjs.org/cdn/nft/016/zim_three.js"></script>
    <script type="module">
      import "https://zimjs.org/cdn/019/zim";
      const frame = new Frame(FIT, 1024, 768, "transparent", "transparent");
      frame.on("ready", () => {
        const stage = frame.stage;
        const S = stage;
        const W = frame.width;
        const H = frame.height;
        const F = frame;
        window.S = stage; window.W = W; window.H = H; window.F = F;
        try {
          ${zimCode || 'new Circle(100, "purple").center().drag();'}
          stage.update();
        } catch (e) {
          console.error("ZIM Error:", e);
        }
      });
    </script>
  </head>
  <body></body>
</html>`;

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/80 p-4">
      <div className="bg-space-900 border border-white/20 rounded-xl w-full max-w-5xl h-[85vh] flex flex-col shadow-2xl">
        <div className="flex justify-between items-center p-4 border-b border-white/10">
          <h2 className="text-lg font-bold text-white">ZIM Architect: {node.title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white"><X size={20} /></button>
        </div>
        <div className="flex-1 flex overflow-hidden">
          <div className="w-1/2 flex flex-col p-4 border-r border-white/10 gap-4">
            <div className="flex flex-col gap-2">
              <span className="text-xs text-gray-400 uppercase tracking-wider">AI Architect Prompt</span>
              <div className="flex gap-2">
                <input 
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  placeholder="Describe a complex interactive idea..."
                  className="flex-1 bg-black/50 border border-white/10 rounded p-2 text-sm text-white focus:outline-none focus:border-neon-purple"
                />
                <button 
                  onClick={async () => {
                    setIsGenerating(true);
                    const code = await generateZimCode(aiPrompt + "\n\nOriginal Code: " + zimCode);
                    setZimCode(code);
                    onUpdateNode(node.id, { content: code });
                    setIsGenerating(false);
                  }}
                  disabled={isGenerating || !aiPrompt}
                  className="bg-neon-purple text-white px-4 py-2 rounded hover:bg-neon-purple/80 disabled:opacity-50 flex items-center gap-2 transition-all"
                >
                  {isGenerating ? <RefreshCw size={14} className="animate-spin" /> : <Sparkles size={14} />}
                  Generate
                </button>
              </div>
            </div>
            <div className="flex-1 flex flex-col gap-2">
              <span className="text-xs text-gray-400 uppercase tracking-wider">Code Editor</span>
              <textarea 
                value={zimCode}
                onChange={(e) => setZimCode(e.target.value)}
                className="flex-1 w-full bg-black/50 border border-white/10 rounded p-4 font-mono text-sm text-neon-blue focus:outline-none focus:border-neon-pink resize-none custom-scrollbar"
              />
              <button 
                  onClick={() => {
                    onUpdateNode(node.id, { content: zimCode });
                    onClose();
                  }}
                  className="w-full bg-neon-blue/20 text-neon-blue py-2 rounded hover:bg-neon-blue/40 flex items-center justify-center gap-2"
              >
                  <Play size={14} /> Apply Changes
              </button>
              <button 
                  onClick={() => {
                    onUpdateNode(node.id, { content: zimCode, isFrameVisible: false });
                    onClose();
                  }}
                  className="w-full bg-neon-pink/20 text-neon-pink py-2 rounded hover:bg-neon-pink/40 flex items-center justify-center gap-2 mt-2"
              >
                  <Sparkles size={14} /> Place on Canvas
              </button>
            </div>
          </div>
          <div className="w-1/2 bg-black/20 flex flex-col">
            <div className="p-2 text-xs text-gray-400 border-b border-white/10">Live Preview</div>
            <iframe 
              srcDoc={zimSrcDoc}
              className="w-full h-full border-0"
              sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
