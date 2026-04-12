import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ZimEditorModal } from './ZimEditorModal';
import { MatrixBackground } from '../src/components/MatrixBackground';
import { PlayCanvasNodeContent } from './PlayCanvasNodeContent';
import { GameNodeContent } from './GameNodeContent';
import { SearchNodeContent } from './SearchNodeContent';
import { PollinationsNodeContent } from './PollinationsNodeContent';
import { Globe, Search, Minimize2, Maximize2, X, ExternalLink, RefreshCw, Code, Play, Pause, Square, RotateCw, Vibrate, Activity, ArrowUpCircle, ArrowDownCircle, Link2, Settings2, Layout, Sparkles, Zap } from 'lucide-react';
import { WidgetType, DashboardWidget } from '../types';
import * as Widgets from './Widgets';
import * as MoreWidgets from './MoreWidgets';
import { generateZimCode } from '../services/geminiService';

export type NodeType = 'core' | 'image' | 'video' | 'gif' | 'code' | 'text' | '3d' | 'search' | 'webpage' | 'embed' | 'zim' | 'widget' | 'pollinations' | 'game' | 'playcanvas';

export type MotionType = 'none' | 'orbit' | 'random' | 'zigzag' | 'pop' | 'bounce' | 'slow_trail' | 'figure_eight' | 'pendulum' | 'spiral' | 'heartbeat' | 'wave' | 'breathe' | 'flicker' | 'glitch' | 'orbit_elliptical' | 'spring' | 'orbit_figure_eight' | 'chase' | 'flee' | 'wander' | 'pulse_wave' | 'spin_cycle' | 'orbit_eccentric' | 'gravity_well' | 'magnetic' | 'repel' | 'orbit_wobble' | 'tornado' | 'float_away' | 'sink' | 'teleport';

export interface NodeData {
  id: string;
  type: NodeType;
  title: string;
  content?: string;
  url?: string;
  x: number;
  y: number;
  z?: number;
  scale?: number;
  rotationX?: number;
  rotationY?: number;
  rotationZ?: number;
  animation?: 'none' | 'spin' | 'shake' | 'wobble' | 'pulse' | 'float' | 'orbit' | 'dance' | 'jiggle' | 'bounce' | 'rocket' | 'explode' | 'blackhole' | 'random';
  animationState?: 'playing' | 'paused' | 'stopped';
  widgetType?: WidgetType;
  shape?: 'sphere' | 'box' | 'cylinder' | 'torus' | 'cone';
  color?: string;
  motionType?: MotionType;
  motionTargetId?: string;
  motionSpeed?: number;
  motionDirection?: 1 | -1;
  trail?: { x: number; y: number; z?: number }[];
  opacity?: number;
  velocity?: { x: number; y: number; z?: number };
  width?: number;
  height?: number;
  isLocked?: boolean;
  loopType?: 'none' | 'pingpong' | 'repeat' | 'oscillate';
  gamingEffect?: 'none' | 'neon_pulse' | 'glitch_static' | 'particle_trail' | 'hologram_flicker';
  defaultOpen?: boolean;
  isFrameVisible?: boolean;
}

interface NodeElementProps {
  node: NodeData;
  nodes: NodeData[];
  isSelected: boolean;
  isConnectingTarget?: boolean;
  isMatch?: boolean;
  disableDrag?: boolean;
  onSelect: (id: string) => void;
  onDragEnd: (id: string, x: number, y: number) => void;
  onConnectStart: (id: string, e: React.MouseEvent) => void;
  onCreateAndLink?: (sourceId: string, newNode: Partial<NodeData>) => void;
  onLinkExisting?: (sourceId: string, targetId: string) => void;
  onDelete?: (id: string) => void;
  onUpdateNode?: (id: string, data: Partial<NodeData>) => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  is3D?: boolean;
}

export function NodeElement({ 
  node, 
  nodes, 
  isSelected, 
  isConnectingTarget, 
  isMatch, 
  disableDrag, 
  onSelect, 
  onDragEnd, 
  onConnectStart, 
  onCreateAndLink, 
  onLinkExisting, 
  onDelete, 
  onUpdateNode, 
  onMouseEnter, 
  onMouseLeave,
  is3D = false
}: NodeElementProps) {
  const [isMinimized, setIsMinimized] = useState(false);
  const [useProxy, setUseProxy] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [menuTab, setMenuTab] = useState<'main' | 'animate' | 'transform'>('main');
  const [lastPinchDist, setLastPinchDist] = useState<number | null>(null);
  const [isZimModalOpen, setIsZimModalOpen] = useState(node.defaultOpen || false);
  const [isEditingZim, setIsEditingZim] = useState(false);
  const [isGeneratingZim, setIsGeneratingZim] = useState(false);
  const [zimCode, setZimCode] = useState(node.content || '');

  React.useEffect(() => {
    if (node.defaultOpen) {
      setIsZimModalOpen(true);
      onUpdateNode?.(node.id, { defaultOpen: false });
    }
  }, [node.defaultOpen, node.id, onUpdateNode]);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      e.stopPropagation();
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      setLastPinchDist(dist);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && lastPinchDist !== null) {
      e.stopPropagation();
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const delta = dist - lastPinchDist;
      setLastPinchDist(dist);
      
      if (onUpdateNode) {
        const newScale = Math.min(Math.max((node.scale || 1) + delta * 0.01, 0.2), 5);
        onUpdateNode(node.id, { scale: newScale });
      }
    }
  };

  const handleTouchEnd = () => {
    setLastPinchDist(null);
  };

  const handleDragEnd = (e: any, info: any) => {
    if (disableDrag) return;
    onDragEnd(node.id, node.x + info.offset.x, node.y + info.offset.y);
  };

  const handleResizeDrag = (e: any, info: any, corner: string) => {
    e.stopPropagation();
    if (!onUpdateNode) return;
    
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(5);
    }
    
    const delta = (info.delta.x + info.delta.y) * 0.01;
    let scaleChange = 0;
    
    if (corner === 'br') scaleChange = delta;
    if (corner === 'tl') scaleChange = -delta;
    if (corner === 'tr') scaleChange = (info.delta.x - info.delta.y) * 0.01;
    if (corner === 'bl') scaleChange = (-info.delta.x + info.delta.y) * 0.01;
    
    const newScale = Math.min(Math.max((node.scale || 1) + scaleChange, 0.2), 5);
    onUpdateNode(node.id, { scale: newScale });
  };

  const handleRotateDrag = (e: any, info: any) => {
    e.stopPropagation();
    if (!onUpdateNode) return;
    
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(5);
    }
    
    const delta = info.delta.x;
    const newRotation = (node.rotationZ || 0) + delta;
    onUpdateNode(node.id, { rotationZ: newRotation });
  };

  const handleTiltDrag = (e: any, info: any) => {
    e.stopPropagation();
    if (!onUpdateNode) return;
    
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(5);
    }
    
    const deltaX = info.delta.x;
    const deltaY = info.delta.y;
    const newRotationY = (node.rotationY || 0) + deltaX;
    const newRotationX = (node.rotationX || 0) - deltaY;
    onUpdateNode(node.id, { rotationY: newRotationY, rotationX: newRotationX });
  };

  const formatUrl = (url?: string) => {
    if (!url) return '';
    
    // If it looks like a search query (has spaces or no dots), route to Google Search
    // The igu=1 parameter allows Google Search to be embedded in an iframe
    if (!url.includes('.') || url.includes(' ')) {
      return `https://www.google.com/search?igu=1&q=${encodeURIComponent(url)}`;
    }
    
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      return `https://${url}`;
    }
    return url;
  };

  const renderContent = () => {
    let content: React.ReactNode;
    switch (node.type) {
      case 'core':
        content = (
          <div className={`w-32 h-32 rounded-full bg-gradient-to-br from-neon-blue to-neon-purple p-1 shadow-[0_0_50px_rgba(0,210,255,0.4)] transition-transform duration-500 hover:scale-110 ${is3D ? 'pointer-events-none' : ''}`}>
            <div className="w-full h-full rounded-full bg-space-900 flex items-center justify-center overflow-hidden">
              <span className="text-xs font-bold tracking-widest text-neon-blue uppercase text-center px-2">{node.title}</span>
            </div>
          </div>
        );
        break;
      case 'image':
        content = (
          <div className={`p-2 w-48 shadow-lg transition-all hover:border-neon-blue ${isSelected ? 'selected-node' : ''} ${is3D ? 'pointer-events-none' : ''}`}>
            {node.url ? (
              <img alt={node.title} className="rounded-lg w-full aspect-video object-cover mb-2 pointer-events-none" src={node.url} referrerPolicy="no-referrer" />
            ) : (
              <div className="rounded-lg w-full aspect-video bg-white/5 mb-2 flex items-center justify-center text-gray-500 text-xs">No Image</div>
            )}
            <p className="text-[10px] text-gray-400 font-medium px-1 truncate">{node.title}</p>
          </div>
        );
        break;
      case 'video':
        content = (
          <div className={`p-2 w-56 shadow-lg transition-all hover:border-neon-purple ${isSelected ? 'selected-node' : ''} ${is3D ? 'pointer-events-none' : ''}`}>
            <div className="relative pointer-events-none">
              {node.url ? (
                <img alt={node.title} className="rounded-lg w-full aspect-video object-cover" src={node.url} referrerPolicy="no-referrer" />
              ) : (
                <div className="rounded-lg w-full aspect-video bg-white/5 flex items-center justify-center text-gray-500 text-xs">No Video</div>
              )}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-10 h-10 bg-red-600 rounded-full flex items-center justify-center shadow-lg">
                  <div className="w-0 h-0 border-t-[6px] border-t-transparent border-l-[10px] border-l-white border-b-[6px] border-b-transparent ml-1"></div>
                </div>
              </div>
            </div>
            <div className="mt-2 px-1 pointer-events-none">
              <p className="text-[10px] text-white font-bold truncate">{node.title}</p>
              <p className="text-[8px] text-gray-500">YouTube</p>
            </div>
          </div>
        );
        break;
      case 'gif':
        content = (
          <div className={`w-40 h-40 p-1 flex items-center justify-center text-center border-dashed border-neon-pink/50 transition-all ${isSelected ? 'selected-node' : ''} overflow-hidden relative ${is3D ? 'pointer-events-none' : ''}`}>
            {node.url ? (
              <img alt={node.title} className="w-full h-full object-cover rounded-full pointer-events-none" src={node.url} referrerPolicy="no-referrer" />
            ) : (
              <div className="space-y-1 pointer-events-none">
                <div className="text-neon-pink text-xl font-bold">GIF</div>
                <p className="text-[9px] leading-tight text-gray-300 px-2">{node.title}</p>
              </div>
            )}
          </div>
        );
        break;
      case 'code':
        content = (
          <div className={`w-40 h-auto min-h-[8rem] flex flex-col p-3 border-l-4 border-l-neon-blue transition-all ${isSelected ? 'selected-node' : ''} ${is3D ? 'pointer-events-none' : ''}`}>
            <div className="flex gap-1 mb-2 pointer-events-none">
              <div className="w-2 h-2 rounded-full bg-red-500/50"></div>
              <div className="w-2 h-2 rounded-full bg-yellow-500/50"></div>
              <div className="w-2 h-2 rounded-full bg-green-500/50"></div>
            </div>
            <p className="text-[10px] font-mono text-neon-blue leading-relaxed pointer-events-none whitespace-pre-wrap break-words">
              {node.content || '// No code provided'}
            </p>
          </div>
        );
        break;
      case '3d':
        content = (
          <div className={`p-2 w-48 shadow-lg transition-all hover:border-emerald-400 ${isSelected ? 'selected-node' : ''} ${is3D ? 'pointer-events-none' : ''}`}>
            <div className="rounded-lg w-full aspect-square bg-space-800 border border-white/10 mb-2 flex items-center justify-center relative overflow-hidden">
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-emerald-400 font-bold text-xs bg-space-900/80 px-2 py-1 rounded">3D Data Node</span>
              </div>
            </div>
            <p className="text-[10px] text-gray-400 font-medium px-1 truncate">{node.title}</p>
          </div>
        );
        break;
      case 'search':
        content = (
          <div className={`p-3 w-64 ${isMinimized ? 'h-auto' : 'h-72'} shadow-lg transition-all hover:border-neon-blue flex flex-col ${isSelected ? 'selected-node' : ''} ${is3D ? 'pointer-events-none' : ''}`}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 pointer-events-none">
                <Search size={16} className="text-neon-blue" />
                <h3 className="text-sm font-bold text-white truncate">{node.title || 'Search Node'}</h3>
              </div>
              <div className="flex items-center gap-1">
                <button onPointerDownCapture={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); setIsMinimized(!isMinimized); }} className="text-gray-400 hover:text-white p-1 pointer-events-auto">
                  {isMinimized ? <Maximize2 size={12} /> : <Minimize2 size={12} />}
                </button>
                <button onPointerDownCapture={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); onDelete?.(node.id); }} className="text-gray-400 hover:text-red-500 p-1 pointer-events-auto">
                  <X size={12} />
                </button>
              </div>
            </div>
            {!isMinimized && (
              <div className="pointer-events-auto">
                <SearchNodeContent node={node} nodes={nodes} onCreateAndLink={onCreateAndLink} onLinkExisting={onLinkExisting} />
              </div>
            )}
          </div>
        );
        break;
      case 'pollinations':
        content = (
          <div className={`p-3 w-64 ${isMinimized ? 'h-auto' : 'h-80'} shadow-lg transition-all hover:border-neon-blue flex flex-col ${isSelected ? 'selected-node' : ''} ${is3D ? 'pointer-events-none' : ''}`}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 pointer-events-none">
                <Zap size={16} className="text-neon-blue" />
                <h3 className="text-sm font-bold text-white truncate">{node.title || 'Pollinations AI'}</h3>
              </div>
              <div className="flex items-center gap-1">
                <button onPointerDownCapture={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); setIsMinimized(!isMinimized); }} className="text-gray-400 hover:text-white p-1 pointer-events-auto">
                  {isMinimized ? <Maximize2 size={12} /> : <Minimize2 size={12} />}
                </button>
                <button onPointerDownCapture={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); onDelete?.(node.id); }} className="text-gray-400 hover:text-red-500 p-1 pointer-events-auto">
                  <X size={12} />
                </button>
              </div>
            </div>
            {!isMinimized && (
              <div className="pointer-events-auto">
                <PollinationsNodeContent node={node} onUpdateNode={onUpdateNode} />
              </div>
            )}
          </div>
        );
        break;
      case 'webpage': {
        const formattedUrl = formatUrl(node.url);
        const iframeSrc = useProxy && formattedUrl ? `https://corsproxy.io/?${encodeURIComponent(formattedUrl)}` : formattedUrl;
        
        content = (
          <div className={`p-2 w-80 ${isMinimized ? 'h-auto' : 'h-64'} shadow-lg transition-all hover:border-neon-blue flex flex-col ${isSelected ? 'selected-node' : ''} ${is3D ? 'pointer-events-none' : ''}`}>
            <div className="flex items-center justify-between mb-2 px-1">
              <div className="flex items-center gap-2 pointer-events-none">
                <Globe size={12} className="text-neon-blue" />
                <h3 className="text-xs font-bold text-white truncate">{node.title || formattedUrl}</h3>
              </div>
              <div className="flex items-center gap-1">
                {formattedUrl && (
                  <>
                    <button 
                      onPointerDownCapture={(e) => e.stopPropagation()} 
                      onClick={(e) => { e.stopPropagation(); setUseProxy(!useProxy); }} 
                      className={`p-1 pointer-events-auto transition-colors ${useProxy ? 'text-emerald-400 hover:text-emerald-300' : 'text-gray-400 hover:text-emerald-400'}`} 
                      title={useProxy ? "Disable Proxy" : "Try Proxy (if blocked)"}
                    >
                      <RefreshCw size={12} />
                    </button>
                    <a href={formattedUrl} target="_blank" rel="noopener noreferrer" onPointerDownCapture={(e) => e.stopPropagation()} className="text-gray-400 hover:text-neon-blue p-1 pointer-events-auto" title="Open in new tab">
                      <ExternalLink size={12} />
                    </a>
                  </>
                )}
                <button onPointerDownCapture={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); setIsMinimized(!isMinimized); }} className="text-gray-400 hover:text-white p-1 pointer-events-auto" title={isMinimized ? "Maximize" : "Minimize"}>
                  {isMinimized ? <Maximize2 size={12} /> : <Minimize2 size={12} />}
                </button>
                <button onPointerDownCapture={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); onDelete?.(node.id); }} className="text-gray-400 hover:text-red-500 p-1 pointer-events-auto" title="Close">
                  <X size={12} />
                </button>
              </div>
            </div>
            {!isMinimized && (
              <div className="flex-1 bg-space-900 rounded border border-white/10 overflow-hidden relative pointer-events-auto group" onPointerDownCapture={(e) => e.stopPropagation()} onWheelCapture={(e) => e.stopPropagation()}>
                {formattedUrl ? (
                  <>
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-500 text-xs p-4 text-center opacity-50 group-hover:opacity-100 transition-opacity pointer-events-none z-0">
                      <Globe size={24} className="mb-2 opacity-50" />
                      <p>If the website refuses to connect, it may block embedding.</p>
                      <p className="mt-1">Click the <RefreshCw size={10} className="inline" /> icon to try a proxy, or <ExternalLink size={10} className="inline" /> to open in a new tab.</p>
                    </div>
                    <iframe 
                      key={iframeSrc}
                      src={iframeSrc} 
                      title={node.title}
                      className="w-full h-full border-0 relative z-10 bg-white/5"
                      sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
                    />
                  </>
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-gray-500 text-xs">No URL provided</div>
                )}
              </div>
            )}
          </div>
        );
        break;
      }
      case 'embed': {
        const embedSrcDoc = `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <style>
      body { 
        margin: 0; 
        padding: 0; 
        width: 100vw; 
        height: 100vh; 
        display: flex; 
        justify-content: center; 
        align-items: center; 
        overflow: hidden;
        color: white;
        font-family: system-ui, sans-serif;
      }
      body > iframe { 
        width: 100% !important; 
        height: 100% !important; 
        border: none !important; 
        }
    </style>
  </head>
  <body>
    ${node.content || ''}
  </body>
</html>`;

        content = (
          <div className={`p-2 w-80 ${isMinimized ? 'h-auto' : 'h-64'} shadow-lg transition-all hover:border-neon-blue flex flex-col ${isSelected ? 'selected-node' : ''} ${is3D ? 'pointer-events-none' : ''}`}>
            <div className="flex items-center justify-between mb-2 px-1">
              <div className="flex items-center gap-2 pointer-events-none">
                <Code size={12} className="text-neon-blue" />
                <h3 className="text-xs font-bold text-white truncate">{node.title || 'Embed'}</h3>
              </div>
              <div className="flex items-center gap-1">
                <button onPointerDownCapture={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); setIsMinimized(!isMinimized); }} className="text-gray-400 hover:text-white p-1 pointer-events-auto" title={isMinimized ? "Maximize" : "Minimize"}>
                  {isMinimized ? <Maximize2 size={12} /> : <Minimize2 size={12} />}
                </button>
                <button onPointerDownCapture={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); onDelete?.(node.id); }} className="text-gray-400 hover:text-red-500 p-1 pointer-events-auto" title="Close">
                  <X size={12} />
                </button>
              </div>
            </div>
            {!isMinimized && (
              <div className="flex-1 bg-space-900 rounded border border-white/10 overflow-hidden relative pointer-events-auto" onPointerDownCapture={(e) => e.stopPropagation()} onWheelCapture={(e) => e.stopPropagation()}>
                {node.content ? (
                  <iframe 
                    srcDoc={embedSrcDoc}
                    title={node.title || 'Embed'}
                    className="w-full h-full border-0 bg-transparent"
                    sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-gray-500 text-xs">No embed code provided</div>
                )}
              </div>
            )}
          </div>
        );
        break;
      }
      case 'zim': {
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
      
      // ZIM Frame initialization
      // We use FIT to make it responsive within the iframe
      const frame = new Frame(FIT, 1024, 768, "transparent", "transparent");
      frame.on("ready", () => {
        const stage = frame.stage;
        const stageW = frame.width;
        const stageH = frame.height;
        
        // Provide shorthands as local variables for the injected code
        const S = stage;
        const W = stageW;
        const H = stageH;
        const F = frame;
        
        // Also provide them globally just in case
        window.S = stage;
        window.W = stageW;
        window.H = stageH;
        window.F = frame;
        
        try {
          // The user's code is injected directly here
          ${node.content || 'new Circle(100, "purple").center().drag();'}
          
          stage.update();
        } catch (e) {
          console.error("ZIM Error:", e);
          const label = new Label("ZIM Error: " + e.message, 20, "Arial", "red");
          label.center();
          stage.update();
        }
      });
    </script>
  </head>
  <body>
  </body>
</html>`;

        content = (
          <div className={`${node.isFrameVisible === false ? '' : 'p-2 w-80'} ${isMinimized ? 'h-auto' : 'h-64'} ${node.isFrameVisible === false ? '' : 'shadow-lg transition-all hover:border-neon-pink flex flex-col'} ${isSelected ? 'selected-node' : ''} ${is3D ? 'pointer-events-none' : ''}`}>
            {node.isFrameVisible !== false && (
              <div className="flex items-center justify-between mb-2 px-1">
                <div className="flex items-center gap-2 pointer-events-none">
                  <Activity size={12} className="text-neon-pink" />
                  <h3 className="text-xs font-bold text-white truncate">{node.title || 'ZIM Interactive'}</h3>
                </div>
                <div className="flex items-center gap-1">
                  <button onPointerDownCapture={(e) => e.stopPropagation()} onClick={(e) => { 
                    e.stopPropagation(); 
                    setIsGeneratingZim(true);
                    generateZimCode(`Suggest ZIMjs code for: ${node.title}`).then(code => {
                        onUpdateNode?.(node.id, { content: code });
                        setIsGeneratingZim(false);
                    }).catch(e => {
                        console.error("AI Suggestion failed:", e);
                        setIsGeneratingZim(false);
                    });
                  }} className="text-gray-400 hover:text-neon-pink p-1 pointer-events-auto" title="AI Suggestion">
                    {isGeneratingZim ? <RefreshCw size={12} className="animate-spin" /> : <Sparkles size={12} />}
                  </button>
                  <button onPointerDownCapture={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); setIsZimModalOpen(true); }} className="text-gray-400 hover:text-white p-1 pointer-events-auto" title="Edit Code">
                    <Code size={12} />
                  </button>
                  <button onPointerDownCapture={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); setIsMinimized(!isMinimized); }} className="text-gray-400 hover:text-white p-1 pointer-events-auto" title={isMinimized ? "Maximize" : "Minimize"}>
                    {isMinimized ? <Maximize2 size={12} /> : <Minimize2 size={12} />}
                  </button>
                  <button onPointerDownCapture={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); onDelete?.(node.id); }} className="text-gray-400 hover:text-red-500 p-1 pointer-events-auto" title="Close">
                    <X size={12} />
                  </button>
                </div>
              </div>
            )}
            {!isMinimized && (
              <div className={`flex-1 ${node.isFrameVisible === false ? '' : 'bg-space-900/50 rounded border border-white/10'} overflow-hidden relative pointer-events-auto flex flex-col`} onPointerDownCapture={(e) => e.stopPropagation()} onWheelCapture={(e) => e.stopPropagation()}>
                  <MatrixBackground />
                  <iframe 
                    srcDoc={zimSrcDoc}
                    title={node.title || 'ZIM'}
                    className="w-full h-full border-0 bg-transparent absolute inset-0"
                    sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
                  />
              </div>
            )}
          </div>
        );
        break;
      }
      case 'game':
        content = (
          <div className={`p-0 w-80 h-80 shadow-2xl transition-all ${isSelected ? 'selected-node' : ''} ${is3D ? 'pointer-events-none' : ''}`}>
            <GameNodeContent node={node} onUpdateNode={onUpdateNode} />
          </div>
        );
        break;
      case 'playcanvas':
        content = (
          <div className={`p-0 w-80 h-80 shadow-2xl transition-all ${isSelected ? 'selected-node' : ''} ${is3D ? 'pointer-events-none' : ''}`}>
            <PlayCanvasNodeContent node={node} onUpdateNode={onUpdateNode} />
          </div>
        );
        break;
      case 'text':
      case 'widget':
        const widgetData: DashboardWidget = {
          id: node.id,
          type: node.widgetType || 'METRIC',
          title: node.title,
          sourceUrl: node.url,
          refreshRate: 1000,
        };
        content = (
          <div className={`w-full h-full bg-space-900/80 border border-white/10 rounded-xl overflow-hidden ${is3D ? 'pointer-events-none' : 'pointer-events-auto'}`}>
            <div className="bg-white/5 px-3 py-1.5 flex items-center justify-between border-b border-white/10">
              <div className="flex items-center gap-2">
                <Layout size={12} className="text-neon-blue" />
                <span className="text-[10px] font-bold text-gray-300 uppercase tracking-widest">{node.title}</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
                <span className="text-[8px] text-gray-500 font-mono">ACTIVE</span>
              </div>
            </div>
            <div className={`flex-1 h-[calc(100%-28px)] relative ${is3D ? 'pointer-events-auto' : ''}`}>
              {(() => {
                const type = node.widgetType || 'METRIC';
                const componentName = type.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join('') + 'Widget';
                const WidgetComponent = (Widgets as any)[componentName] || (MoreWidgets as any)[componentName];
                if (WidgetComponent) {
                  return <WidgetComponent widget={widgetData} />;
                }
                return <div className="p-4 text-red-500">Unknown widget type: {type}</div>;
              })()}
            </div>
          </div>
        );
        break;
      default:
        content = (
          <div className={`p-4 w-48 shadow-lg transition-all hover:border-white/30 ${isSelected ? 'selected-node' : ''} ${is3D ? 'pointer-events-none' : ''}`}>
            <h3 className="text-sm font-bold text-white mb-2 truncate">{node.title}</h3>
            <p className="text-[10px] text-gray-400 line-clamp-4">{node.content}</p>
          </div>
        );
        break;
    }

    return content;
  };

  const getAnimationProps = () => {
    const baseAnimate: any = { 
      x: node.x, 
      y: node.y, 
      z: node.z || 0,
      scale: node.scale || 1,
      opacity: node.opacity ?? 1,
      rotateX: node.rotationX || 0,
      rotateY: node.rotationY || 0,
      rotateZ: node.rotationZ || 0,
    };

    if (node.animationState === 'playing') {
      switch (node.animation) {
        case 'spin':
          baseAnimate.rotateY = [node.rotationY || 0, (node.rotationY || 0) + 360];
          break;
        case 'shake':
          baseAnimate.x = [node.x, node.x - 10, node.x + 10, node.x - 10, node.x + 10, node.x];
          break;
        case 'wobble':
          baseAnimate.rotateZ = [node.rotationZ || 0, (node.rotationZ || 0) - 15, (node.rotationZ || 0) + 15, (node.rotationZ || 0) - 15, (node.rotationZ || 0) + 15, node.rotationZ || 0];
          break;
        case 'pulse':
          baseAnimate.scale = [node.scale || 1, (node.scale || 1) * 1.1, node.scale || 1];
          break;
        case 'float':
          baseAnimate.y = [node.y, node.y - 20, node.y];
          break;
      }
    }
    return baseAnimate;
  };

  const getTransitionProps = () => {
    if (node.animationState === 'playing' && node.animation && node.animation !== 'none') {
      return {
        duration: node.animation === 'spin' ? 2 : 1,
        repeat: Infinity,
        ease: "easeInOut" as any
      };
    }
    return { type: "spring", stiffness: 300, damping: 30 } as any;
  };

  return (
    <motion.div
      drag={!is3D && !disableDrag}
      dragMomentum={false}
      onDragEnd={handleDragEnd}
      onPointerDown={(e) => {
        if (is3D) return; // Let 3D scene handle selection and dragging
        e.stopPropagation();
        onSelect(node.id);
        setShowMenu(true);
      }}
      onDoubleClick={(e) => {
        e.stopPropagation();
        if (node.type === 'zim') {
          setIsZimModalOpen(true);
        }
      }}
      initial={disableDrag ? {} : { x: node.x, y: node.y, z: node.z || 0, scale: node.scale || 1, opacity: node.opacity ?? 1, rotateX: node.rotationX || 0, rotateY: node.rotationY || 0, rotateZ: node.rotationZ || 0 }}
      animate={disableDrag ? {} : getAnimationProps()}
      transition={getTransitionProps()}
      className={`absolute cursor-grab active:cursor-grabbing ${is3D ? 'pointer-events-none' : 'pointer-events-auto'} 
        ${isSelected ? 'ring-4 ring-neon-blue rounded-xl shadow-[0_0_40px_rgba(0,243,255,0.8)]' : ''} 
        ${isConnectingTarget ? 'ring-4 ring-emerald-400 rounded-xl shadow-[0_0_30px_rgba(52,211,153,0.6)] animate-pulse' : ''}
        ${isMatch ? 'ring-4 ring-neon-purple rounded-xl shadow-[0_0_30px_rgba(157,80,187,0.6)]' : ''}`}
      style={{ 
        left: is3D ? 0 : node.x, 
        top: is3D ? 0 : node.y,
        width: node.width || 200,
        height: node.height || 'auto',
        rotateZ: node.rotationZ || 0,
        rotateY: node.rotationY || 0,
        rotateX: node.rotationX || 0,
        opacity: node.opacity ?? 1,
        scale: node.scale ?? 1,
        zIndex: isSelected || isMatch ? 50 : 10,
        transformStyle: 'preserve-3d'
      }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onContextMenu={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onConnectStart(node.id, e);
      }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {isZimModalOpen && (
        <ZimEditorModal 
          node={node} 
          isOpen={isZimModalOpen} 
          onClose={() => setIsZimModalOpen(false)} 
          onUpdateNode={onUpdateNode!} 
        />
      )}
      {renderContent()}

      {isSelected && !is3D && (
        <>
          {/* Top Left */}
          <motion.div 
            onPan={(e, info) => handleResizeDrag(e, info, 'tl')}
            onPointerDown={(e) => e.stopPropagation()}
            className="absolute -top-4 -left-4 w-8 h-8 bg-white border-2 border-neon-blue cursor-nwse-resize z-50 rounded-sm hover:bg-neon-blue hover:scale-110 transition-transform shadow-[0_0_10px_rgba(255,255,255,0.5)] pointer-events-auto"
          />
          {/* Top Right */}
          <motion.div 
            onPan={(e, info) => handleResizeDrag(e, info, 'tr')}
            onPointerDown={(e) => e.stopPropagation()}
            className="absolute -top-4 -right-4 w-8 h-8 bg-white border-2 border-neon-blue cursor-nesw-resize z-50 rounded-sm hover:bg-neon-blue hover:scale-110 transition-transform shadow-[0_0_10px_rgba(255,255,255,0.5)] pointer-events-auto"
          />
          {/* Bottom Left */}
          <motion.div 
            onPan={(e, info) => handleResizeDrag(e, info, 'bl')}
            onPointerDown={(e) => e.stopPropagation()}
            className="absolute -bottom-4 -left-4 w-8 h-8 bg-white border-2 border-neon-blue cursor-nesw-resize z-50 rounded-sm hover:bg-neon-blue hover:scale-110 transition-transform shadow-[0_0_10px_rgba(255,255,255,0.5)] pointer-events-auto"
          />
          {/* Bottom Right */}
          <motion.div 
            onPan={(e, info) => handleResizeDrag(e, info, 'br')}
            onPointerDown={(e) => e.stopPropagation()}
            className="absolute -bottom-4 -right-4 w-8 h-8 bg-white border-2 border-neon-blue cursor-nwse-resize z-50 rounded-sm hover:bg-neon-blue hover:scale-110 transition-transform shadow-[0_0_10_rgba(255,255,255,0.5)] pointer-events-auto"
          />
          {/* Rotate Handle */}
          <motion.div 
            onPan={handleRotateDrag}
            onPointerDown={(e) => e.stopPropagation()}
            className="absolute -top-12 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-white border-2 border-neon-purple cursor-ew-resize z-50 hover:bg-neon-purple hover:scale-110 transition-transform flex items-center justify-center shadow-[0_0_10px_rgba(255,255,255,0.5)] pointer-events-auto"
          >
            <RotateCw size={14} className="text-black" />
          </motion.div>
          {/* Tilt Handle */}
          <motion.div 
            onPan={handleTiltDrag}
            onPointerDown={(e) => e.stopPropagation()}
            className="absolute -bottom-12 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-white border-2 border-neon-pink cursor-move z-50 hover:bg-neon-pink hover:scale-110 transition-transform flex items-center justify-center shadow-[0_0_10px_rgba(255,255,255,0.5)] pointer-events-auto"
          >
            <Layout size={14} className="text-black" />
          </motion.div>
        </>
      )}

      {isSelected && showMenu && (
        <motion.div 
          drag
          dragMomentum={false}
          onPointerDown={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
          className="absolute -bottom-16 left-1/2 -translate-x-1/2 z-[100] pointer-events-auto cursor-move"
        >
          <div 
            className="glass-morphism rounded-xl p-2 flex flex-col items-center gap-2 min-w-[200px]"
            style={{ transform: `rotateX(${- (node.rotationX || 0)}deg) rotateY(${- (node.rotationY || 0)}deg) rotateZ(${- (node.rotationZ || 0)}deg)` }}
          >
            {menuTab === 'main' && (
              <div className="flex items-center gap-2">
                <button onClick={(e) => { e.stopPropagation(); onConnectStart(node.id, e); }} className="p-1.5 hover:bg-white/10 rounded text-neon-blue" title="Connect">
                  <Link2 size={16} />
                </button>
                <button onClick={(e) => { e.stopPropagation(); setMenuTab('animate'); }} className="p-1.5 hover:bg-white/10 rounded text-neon-purple" title="Animate">
                  <Activity size={16} />
                </button>
                <button onClick={(e) => { e.stopPropagation(); setMenuTab('transform'); }} className="p-1.5 hover:bg-white/10 rounded text-neon-pink" title="Transform">
                  <Settings2 size={16} />
                </button>
                <div className="w-px h-4 bg-white/20 mx-1" />
                <button onClick={(e) => { e.stopPropagation(); setShowMenu(false); }} className="p-1.5 hover:bg-white/10 rounded text-gray-400" title="Close Menu">
                  <X size={16} />
                </button>
              </div>
            )}

            {menuTab === 'animate' && (
              <div className="flex flex-col gap-2 w-full">
                <div className="flex items-center justify-between w-full gap-1">
                  <button onClick={() => setMenuTab('main')} className="text-gray-400 hover:text-white"><X size={12} /></button>
                  <span className="text-[10px] font-bold text-gray-300 uppercase">Animate</span>
                  <div className="flex gap-1">
                    <button onClick={() => onUpdateNode?.(node.id, { animationState: 'playing' })} className={`p-1 rounded ${node.animationState === 'playing' ? 'bg-green-500/20 text-green-400' : 'hover:bg-white/10 text-gray-400'}`}><Play size={12} /></button>
                    <button onClick={() => onUpdateNode?.(node.id, { animationState: 'paused' })} className={`p-1 rounded ${node.animationState === 'paused' ? 'bg-yellow-500/20 text-yellow-400' : 'hover:bg-white/10 text-gray-400'}`}><Pause size={12} /></button>
                    <button onClick={() => onUpdateNode?.(node.id, { animationState: 'stopped', animation: 'none' })} className={`p-1 rounded ${node.animationState === 'stopped' ? 'bg-red-500/20 text-red-400' : 'hover:bg-white/10 text-gray-400'}`}><Square size={12} /></button>
                  </div>
                </div>
                <div className="flex gap-1 justify-center flex-wrap">
                  {(['spin', 'shake', 'wobble', 'pulse', 'float', 'orbit', 'dance', 'jiggle', 'bounce', 'rocket', 'explode'] as const).map(anim => (
                    <button 
                      key={`anim-${node.id}-${anim}`}
                      onClick={() => onUpdateNode?.(node.id, { animation: anim, animationState: 'playing' })}
                      className={`px-2 py-1 text-[10px] rounded ${node.animation === anim ? 'bg-neon-purple/30 text-neon-purple' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}
                    >
                      {anim}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {menuTab === 'transform' && (
              <div className="flex flex-col gap-2 w-full">
                <div className="flex items-center justify-between w-full">
                  <button onClick={() => setMenuTab('main')} className="text-gray-400 hover:text-white"><X size={12} /></button>
                  <span className="text-[10px] font-bold text-gray-300 uppercase">Transform</span>
                  <button onClick={() => onUpdateNode?.(node.id, { rotationX: 0, rotationY: 0, rotationZ: 0, scale: 1 })} className="text-[10px] text-neon-blue hover:underline">Reset</button>
                </div>
                <div className="grid grid-cols-[auto_1fr] gap-2 items-center text-[10px] text-gray-400 max-h-48 overflow-y-auto pr-2">
                  <span>X (L/R)</span>
                  <input type="range" min="-2000" max="2000" value={node.x} onChange={(e) => onUpdateNode?.(node.id, { x: parseInt(e.target.value) })} className="w-full accent-white" />
                  <span>Y (U/D)</span>
                  <input type="range" min="-2000" max="2000" value={node.y} onChange={(e) => onUpdateNode?.(node.id, { y: parseInt(e.target.value) })} className="w-full accent-white" />
                  <span>Z (F/B)</span>
                  <input type="range" min="-2000" max="2000" value={node.z || 0} onChange={(e) => onUpdateNode?.(node.id, { z: parseInt(e.target.value) })} className="w-full accent-white" />
                  
                  <div className="col-span-2 h-px bg-white/10 my-1" />
                  
                  <span>Size</span>
                  <input type="range" min="0.2" max="5" step="0.1" value={node.scale || 1} onChange={(e) => onUpdateNode?.(node.id, { scale: parseFloat(e.target.value) })} className="w-full accent-white" />
                  <span>Tilt X</span>
                  <input type="range" min="-180" max="180" value={node.rotationX || 0} onChange={(e) => onUpdateNode?.(node.id, { rotationX: parseInt(e.target.value) })} className="w-full accent-neon-pink" />
                  <span>Tilt Y</span>
                  <input type="range" min="-180" max="180" value={node.rotationY || 0} onChange={(e) => onUpdateNode?.(node.id, { rotationY: parseInt(e.target.value) })} className="w-full accent-neon-blue" />
                  <span>Tilt Z</span>
                  <input type="range" min="-180" max="180" value={node.rotationZ || 0} onChange={(e) => onUpdateNode?.(node.id, { rotationZ: parseInt(e.target.value) })} className="w-full accent-neon-purple" />
                  
                  <div className="col-span-2 h-px bg-white/10 my-1" />
                  
                  <span>Shape</span>
                  <select value={node.shape || 'sphere'} onChange={(e) => onUpdateNode?.(node.id, { shape: e.target.value as any })} className="bg-black/50 border border-white/10 rounded text-[10px] p-1 text-white">
                    <option value="sphere">Sphere</option>
                    <option value="box">Box</option>
                    <option value="cylinder">Cylinder</option>
                    <option value="torus">Torus</option>
                    <option value="cone">Cone</option>
                  </select>
                  <span>Color</span>
                  <input type="color" value={node.color || '#10b981'} onChange={(e) => onUpdateNode?.(node.id, { color: e.target.value })} className="w-full h-4 bg-transparent border-0 cursor-pointer" />
                </div>
              </div>
            )}
          </div>
        </motion.div>
      )}
      {isZimModalOpen && (
        <ZimEditorModal 
          node={node} 
          isOpen={isZimModalOpen} 
          onClose={() => setIsZimModalOpen(false)} 
          onUpdateNode={onUpdateNode!} 
        />
      )}
    </motion.div>
  );
}
