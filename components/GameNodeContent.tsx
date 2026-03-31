import React, { useEffect, useRef, useState } from 'react';
import { Play, Pause, RotateCcw, Maximize2, Minimize2, X, Terminal, Settings, Zap } from 'lucide-react';
import { NodeData } from './NodeElement';

interface GameNodeContentProps {
  node: NodeData;
  onUpdateNode?: (id: string, data: Partial<NodeData>) => void;
}

export function GameNodeContent({ node, onUpdateNode }: GameNodeContentProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [logs, setLogs] = useState<string[]>(['IAMGame Engine v0.1 Initialized', 'Ready for input...']);
  const [showTerminal, setShowTerminal] = useState(false);

  useEffect(() => {
    if (!canvasRef.current || !isPlaying) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrame: number;
    let particles: { x: number; y: number; vx: number; vy: number; color: string; size: number }[] = [];

    // Simple procedural game loop for demonstration
    const init = () => {
      particles = Array.from({ length: 50 }, () => ({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 2,
        vy: (Math.random() - 0.5) * 2,
        color: `hsl(${Math.random() * 360}, 70%, 60%)`,
        size: Math.random() * 4 + 1
      }));
    };

    const update = () => {
      particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1;
      });
    };

    const draw = () => {
      ctx.fillStyle = 'rgba(5, 5, 5, 0.2)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      particles.forEach(p => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.fill();
        
        // Add glow
        ctx.shadowBlur = 10;
        ctx.shadowColor = p.color;
      });
      ctx.shadowBlur = 0;
    };

    const loop = () => {
      update();
      draw();
      animationFrame = requestAnimationFrame(loop);
    };

    init();
    loop();

    return () => cancelAnimationFrame(animationFrame);
  }, [isPlaying]);

  const addLog = (msg: string) => {
    setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`].slice(-10));
  };

  return (
    <div className={`flex flex-col h-full bg-space-950/90 rounded-xl overflow-hidden border border-white/10 shadow-2xl transition-all duration-300 ${isMinimized ? 'h-12' : 'h-80'}`}>
      {/* Header */}
      <div className="bg-white/5 px-3 py-2 flex items-center justify-between border-b border-white/10">
        <div className="flex items-center gap-2">
          <Zap size={14} className="text-neon-blue animate-pulse" />
          <span className="text-[10px] font-bold text-gray-300 uppercase tracking-widest">{node.title || 'IAMGame Engine'}</span>
        </div>
        <div className="flex items-center gap-1">
          <button 
            onClick={() => setShowTerminal(!showTerminal)}
            className={`p-1 rounded hover:bg-white/10 transition-colors ${showTerminal ? 'text-neon-blue' : 'text-gray-500'}`}
          >
            <Terminal size={12} />
          </button>
          <button 
            onClick={() => setIsMinimized(!isMinimized)}
            className="p-1 rounded hover:bg-white/10 text-gray-500 transition-colors"
          >
            {isMinimized ? <Maximize2 size={12} /> : <Minimize2 size={12} />}
          </button>
        </div>
      </div>

      {!isMinimized && (
        <div className="flex-1 relative flex flex-col">
          {/* Canvas Area */}
          <div className="flex-1 bg-black relative overflow-hidden">
            <canvas 
              ref={canvasRef} 
              width={400} 
              height={300} 
              className="w-full h-full object-contain"
            />
            
            {!isPlaying && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                <button 
                  onClick={() => {
                    setIsPlaying(true);
                    addLog('Engine Started');
                  }}
                  className="group relative px-6 py-3 bg-neon-blue/20 border border-neon-blue/50 rounded-full text-neon-blue font-bold uppercase tracking-widest hover:bg-neon-blue/40 transition-all"
                >
                  <div className="absolute inset-0 rounded-full blur-md bg-neon-blue/20 group-hover:bg-neon-blue/40 transition-all" />
                  <span className="relative flex items-center gap-2">
                    <Play size={16} fill="currentColor" />
                    Launch Engine
                  </span>
                </button>
              </div>
            )}

            {/* HUD Overlay */}
            {isPlaying && (
              <div className="absolute top-2 left-2 pointer-events-none">
                <div className="bg-black/40 backdrop-blur-md border border-white/10 rounded px-2 py-1 text-[8px] font-mono text-neon-blue flex flex-col gap-0.5">
                  <div className="flex justify-between gap-4">
                    <span>FPS: 60</span>
                    <span>MEM: 12.4MB</span>
                  </div>
                  <div className="w-16 h-1 bg-white/10 rounded-full overflow-hidden">
                    <div className="w-2/3 h-full bg-neon-blue" />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Controls */}
          <div className="bg-white/5 p-2 flex items-center justify-between border-t border-white/10">
            <div className="flex items-center gap-2">
              <button 
                onClick={() => {
                  setIsPlaying(!isPlaying);
                  addLog(isPlaying ? 'Engine Paused' : 'Engine Resumed');
                }}
                className={`p-1.5 rounded-full transition-all ${isPlaying ? 'bg-yellow-500/20 text-yellow-500 hover:bg-yellow-500/40' : 'bg-green-500/20 text-green-500 hover:bg-green-500/40'}`}
              >
                {isPlaying ? <Pause size={14} /> : <Play size={14} />}
              </button>
              <button 
                onClick={() => {
                  addLog('Engine Reset');
                  // Trigger re-init
                  setIsPlaying(false);
                  setTimeout(() => setIsPlaying(true), 100);
                }}
                className="p-1.5 rounded-full bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white transition-all"
              >
                <RotateCcw size={14} />
              </button>
            </div>
            
            <div className="flex items-center gap-2">
              <div className="h-4 w-px bg-white/10 mx-1" />
              <button className="p-1.5 rounded-full bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white transition-all">
                <Settings size={14} />
              </button>
            </div>
          </div>

          {/* Terminal Overlay */}
          {showTerminal && (
            <div className="absolute bottom-12 left-0 right-0 bg-black/80 backdrop-blur-md border-t border-white/10 p-2 max-h-32 overflow-y-auto custom-scrollbar">
              <div className="flex items-center gap-2 mb-1 border-b border-white/5 pb-1">
                <Terminal size={10} className="text-neon-blue" />
                <span className="text-[8px] font-bold text-gray-500 uppercase tracking-widest">System Logs</span>
              </div>
              {logs.map((log, i) => (
                <div key={i} className="text-[9px] font-mono text-gray-400 mb-0.5">
                  {log}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
