import React, { useState, useEffect, useRef } from 'react';
import { DashboardWidget } from '../types';

interface LiveStreamDeckProps {
    widgets: DashboardWidget[];
    onAddWidget: (w: DashboardWidget) => void;
    onRemoveWidget: (id: string) => void;
    onUpdateWidget: (id: string, updates: Partial<DashboardWidget>) => void;
}

export const LiveStreamDeck: React.FC<LiveStreamDeckProps> = ({ widgets, onAddWidget, onRemoveWidget, onUpdateWidget }) => {
    const [isConfigOpen, setIsConfigOpen] = useState(false);
    
    // --- CANVAS STATE ---
    const [view, setView] = useState({ x: 0, y: 0, scale: 1 });
    const containerRef = useRef<HTMLDivElement>(null);
    const isDraggingCanvas = useRef(false);
    const lastMousePos = useRef({ x: 0, y: 0 });
    const lastPinchDistRef = useRef<number | null>(null);
    
    // --- WIDGET INTERACTION STATE ---
    // Tracks which widget is being dragged or resized
    const activeOperation = useRef<{ 
        type: 'DRAG' | 'RESIZE' | 'PINCH_RESIZE', 
        id: string, 
        startX: number, startY: number, 
        initialX: number, initialY: number, 
        initialW: number, initialH: number,
        startDist?: number 
    } | null>(null);

    // --- CANVAS GESTURE HANDLERS ---
    const handleWheel = (e: React.WheelEvent) => {
        if (activeOperation.current) return;
        const zoomSensitivity = 0.001;
        const newScale = Math.max(0.1, Math.min(5, view.scale - e.deltaY * zoomSensitivity));
        setView(v => ({ ...v, scale: newScale }));
    };

    const handleCanvasMouseDown = (e: React.MouseEvent) => {
        if (e.button === 0 && !activeOperation.current) {
            isDraggingCanvas.current = true;
            lastMousePos.current = { x: e.clientX, y: e.clientY };
        }
    };

    const handleCanvasTouchStart = (e: React.TouchEvent) => {
        if (activeOperation.current) return;
        
        if (e.touches.length === 1) {
            isDraggingCanvas.current = true;
            lastMousePos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        } else if (e.touches.length === 2) {
            isDraggingCanvas.current = false; // Zooming, not panning
            const dist = Math.hypot(
                e.touches[0].clientX - e.touches[1].clientX,
                e.touches[0].clientY - e.touches[1].clientY
            );
            lastPinchDistRef.current = dist;
        }
    };

    // --- WIDGET RENDERERS ---
    const VideoWidget = ({ widget }: { widget: DashboardWidget }) => (
        <div className="w-full h-full flex flex-col pointer-events-none">
             <div className="relative flex-1 bg-black overflow-hidden group">
                 <div className="absolute inset-0 z-10 border-[0.5px] border-neon-blue/10 bg-[linear-gradient(45deg,transparent_25%,rgba(0,243,255,0.05)_50%,transparent_75%)] bg-[length:250%_250%] animate-blob"></div>
                 <div className="absolute top-2 right-2 z-20 flex gap-1">
                     <div className="w-1 h-1 bg-red-500 rounded-full animate-pulse"></div>
                     <span className="text-[8px] text-red-500 font-mono">LIVE</span>
                 </div>
                 {widget.sourceUrl ? (
                     <iframe 
                        src={widget.sourceUrl} 
                        className="w-full h-full object-cover opacity-80 pointer-events-auto"
                        allow="autoplay; encrypted-media; picture-in-picture"
                        title={widget.title}
                     />
                 ) : (
                     <div className="w-full h-full flex items-center justify-center text-neon-blue/30 font-display text-xs animate-pulse">NO SIGNAL</div>
                 )}
             </div>
        </div>
    );

    const MetricWidget = ({ widget }: { widget: DashboardWidget }) => {
        const [value, setValue] = useState(0);
        useEffect(() => {
            const interval = setInterval(() => setValue(Math.random() * 100), widget.refreshRate || 1000);
            return () => clearInterval(interval);
        }, [widget.refreshRate]);
        return (
            <div className="w-full h-full flex flex-col items-center justify-center relative pointer-events-none">
                 <svg className="w-3/4 h-3/4 transform -rotate-90" viewBox="0 0 100 100">
                     <circle cx="50" cy="50" r="40" stroke="#1a1a1a" strokeWidth="8" fill="transparent" />
                     <circle cx="50" cy="50" r="40" stroke="#00f3ff" strokeWidth="8" fill="transparent" strokeDasharray={251.2} strokeDashoffset={251.2 - (251.2 * value) / 100} className="transition-all duration-500 ease-out" />
                 </svg>
                 <div className="absolute inset-0 flex flex-col items-center justify-center">
                     <span className="text-xl md:text-3xl font-mono text-white font-bold">{Math.round(value)}</span>
                     <span className="text-[10px] text-neon-blue tracking-wider">%</span>
                 </div>
            </div>
        );
    };

    const LogStreamWidget = ({ widget }: { widget: DashboardWidget }) => {
        const [logs, setLogs] = useState<{ id: string, text: string }[]>([]);
        const endRef = useRef<HTMLDivElement>(null);
        useEffect(() => {
            const interval = setInterval(() => {
                const actions = ['FETCH', 'DECRYPT', 'SYNC', 'PING', 'BUFFER', 'OPT'];
                const newLog = `[${new Date().toLocaleTimeString().split(' ')[0]}] ${actions[Math.floor(Math.random()*actions.length)]}::${Math.floor(Math.random()*999)}`;
                setLogs(prev => [...prev.slice(-8), { id: `log-${Date.now()}-${Math.random()}`, text: newLog }]);
            }, 800);
            return () => clearInterval(interval);
        }, []);
        return (
            <div className="w-full h-full bg-black/50 p-2 font-mono text-[10px] text-neon-green/80 overflow-hidden flex flex-col relative pointer-events-none">
                <div className="flex-1 overflow-hidden space-y-1 mt-1">
                    {logs.map((log) => <div key={log.id} className="border-b border-white/5 pb-0.5 truncate">{log.text}</div>)}
                </div>
            </div>
        );
    };

    const TaskProgressWidget = ({ widget }: { widget: DashboardWidget }) => {
        const [progress, setProgress] = useState(45);
        useEffect(() => {
            const interval = setInterval(() => setProgress(p => (p >= 100 ? 0 : p + 1)), 200);
            return () => clearInterval(interval);
        }, []);
        return (
             <div className="w-full h-full flex flex-col justify-center gap-2 px-4 pointer-events-none">
                 <div className="flex justify-between text-xs text-neon-pink font-display tracking-widest"><span>{widget.title}</span><span>{progress}%</span></div>
                 <div className="w-full h-4 bg-gray-900 border border-neon-pink/30 skew-x-[-12deg] p-0.5">
                     <div className="h-full bg-neon-pink shadow-[0_0_10px_#ff00ff] transition-all duration-200" style={{ width: `${progress}%` }}></div>
                 </div>
             </div>
        );
    };

    const NexusVolumeWidget = ({ widget }: { widget: DashboardWidget }) => {
        const canvasRef = useRef<HTMLCanvasElement>(null);

        // Simple starfield/volume simulation for the map part
        useEffect(() => {
            const canvas = canvasRef.current;
            if(!canvas) return;
            const ctx = canvas.getContext('2d');
            if(!ctx) return;
            
            let w = canvas.width = canvas.parentElement?.clientWidth || 300;
            let h = canvas.height = canvas.parentElement?.clientHeight || 200;
            
            const particles = Array.from({length: 50}, () => ({
                x: Math.random() * w, y: Math.random() * h, r: Math.random() * 2, speed: Math.random() * 0.5
            }));

            const animate = () => {
                ctx.clearRect(0,0,w,h);
                // Grid
                ctx.strokeStyle = "rgba(34, 211, 238, 0.1)";
                ctx.beginPath();
                for(let i=0; i<w; i+=40) { ctx.moveTo(i,0); ctx.lineTo(i,h); }
                for(let i=0; i<h; i+=40) { ctx.moveTo(0,i); ctx.lineTo(w,i); }
                ctx.stroke();

                // Particles
                ctx.fillStyle = "#22d3ee";
                particles.forEach(p => {
                    p.y -= p.speed;
                    if(p.y < 0) p.y = h;
                    ctx.beginPath();
                    ctx.arc(p.x, p.y, p.r, 0, Math.PI*2);
                    ctx.fill();
                });
                requestAnimationFrame(animate);
            };
            const id = requestAnimationFrame(animate);
            
            const resize = () => {
                if(canvas.parentElement) {
                    w = canvas.width = canvas.parentElement.clientWidth;
                    h = canvas.height = canvas.parentElement.clientHeight;
                }
            };
            window.addEventListener('resize', resize);
            return () => { cancelAnimationFrame(id); window.removeEventListener('resize', resize); };
        }, []);

        return (
            <div className="w-full h-full bg-zinc-950 text-zinc-300 font-mono overflow-auto p-4 custom-scrollbar pointer-events-auto">
                <style>{`
                    .glass-panel { background: rgba(9, 9, 11, 0.6); backdrop-filter: blur(12px); border: 1px solid rgba(255, 255, 255, 0.08); }
                    .text-glow { text-shadow: 0 0 20px rgba(34, 211, 238, 0.3); }
                    .animate-float { animation: float 6s ease-in-out infinite; }
                    @keyframes float { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-5px); } }
                `}</style>
                
                {/* Header */}
                <header className="flex w-full items-center justify-between glass-panel rounded-lg p-2 mb-4">
                    <div className="flex items-center gap-2">
                         <div className="h-6 w-6 rounded bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
                             <div className="text-white text-[10px]">NX</div>
                         </div>
                         <div>
                             <h1 className="text-xs font-medium tracking-tight text-white uppercase leading-none">Nexus<span className="text-zinc-500">_Core</span></h1>
                             <span className="text-[10px] text-cyan-500 tracking-wide">V.4.1.0</span>
                         </div>
                    </div>
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {/* Controls */}
                    <div className="glass-panel rounded-xl p-4 flex flex-col gap-4">
                        <div className="flex justify-between items-start">
                             <span className="text-[10px] text-zinc-500 uppercase">Total Volume</span>
                             <span className="text-emerald-500 text-xs">▲</span>
                        </div>
                        <div className="text-xl font-medium text-white tracking-tight text-glow">$4,281,904</div>
                        
                        <div className="space-y-2">
                             {['Time Scale', 'Depth', 'Amplitude'].map((label, i) => (
                                 <div key={label} className="group">
                                     <div className="flex justify-between text-[10px] mb-1">
                                         <span className="text-zinc-400">{label}</span>
                                         <span className="text-cyan-400">{60 + i*10}%</span>
                                     </div>
                                     <div className="h-1 w-full bg-zinc-800 rounded-full relative overflow-hidden">
                                         <div className="absolute h-full bg-gradient-to-r from-cyan-600 to-cyan-400" style={{width: `${60+i*10}%`}}></div>
                                     </div>
                                 </div>
                             ))}
                        </div>
                    </div>

                    {/* Map Area */}
                    <div className="glass-panel rounded-xl relative min-h-[150px] overflow-hidden flex flex-col">
                        <div className="absolute top-2 left-2 z-10">
                            <div className="text-[8px] text-zinc-500 uppercase">Sector View</div>
                            <div className="text-sm font-medium text-white">Gin Ily <span className="text-cyan-400">215mn</span></div>
                        </div>
                        <canvas ref={canvasRef} className="w-full h-full bg-zinc-950/50" />
                        
                        {/* Floating Labels */}
                        <div className="absolute top-1/2 left-1/4 animate-float pointer-events-none">
                             <div className="px-1 bg-orange-500/10 border border-orange-500/50 rounded text-[8px] text-orange-200">PEAK_A12</div>
                        </div>
                    </div>
                </div>

                {/* Feed */}
                <div className="glass-panel rounded-xl mt-4 p-2 space-y-2">
                     <div className="text-[10px] text-zinc-400 uppercase tracking-widest flex items-center gap-2 border-b border-white/5 pb-2">
                        <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse"></div> Live Inflow
                     </div>
                     {[1,2].map((val) => (
                         <div key={val} className="flex items-center gap-2 p-1.5 rounded hover:bg-white/5 cursor-default">
                             <div className="w-4 h-4 rounded bg-zinc-800 flex items-center justify-center border border-zinc-700 text-[8px] text-emerald-400">⚡</div>
                             <div className="flex-1 min-w-0">
                                 <div className="flex justify-between items-center"><span className="text-[10px] text-zinc-200">Volume Spike</span><span className="text-[8px] text-zinc-500">2s ago</span></div>
                                 <div className="flex justify-between items-center"><span className="text-[8px] text-zinc-500">Sector 7G</span><span className="text-[8px] text-emerald-400">+450k</span></div>
                             </div>
                         </div>
                     ))}
                </div>
            </div>
        );
    };

    // --- GLOBAL MOUSE/TOUCH HANDLERS ---
    useEffect(() => {
        const handleMove = (clientX: number, clientY: number) => {
             // 1. Pan Canvas
             if (isDraggingCanvas.current) {
                 const dx = clientX - lastMousePos.current.x;
                 const dy = clientY - lastMousePos.current.y;
                 setView(v => ({ ...v, x: v.x + dx, y: v.y + dy }));
                 lastMousePos.current = { x: clientX, y: clientY };
                 return;
             }

             // 2. Widget Operations
             if (activeOperation.current) {
                 const op = activeOperation.current;
                 const dx = (clientX - op.startX) / view.scale; // Adjust delta by zoom level
                 const dy = (clientY - op.startY) / view.scale;

                 if (op.type === 'DRAG') {
                     onUpdateWidget(op.id, { x: op.initialX + dx, y: op.initialY + dy });
                 } else if (op.type === 'RESIZE') {
                     onUpdateWidget(op.id, { w: Math.max(100, op.initialW + dx), h: Math.max(60, op.initialH + dy) });
                 }
             }
        };

        const handleUp = () => {
            isDraggingCanvas.current = false;
            activeOperation.current = null;
            lastPinchDistRef.current = null;
        };

        const onMouseMove = (e: MouseEvent) => handleMove(e.clientX, e.clientY);
        const onMouseUp = () => handleUp();
        
        // Touch logic for canvas (Pinch zoom / Pan)
        const onTouchMove = (e: TouchEvent) => {
            // Check for multi-touch (Canvas Zoom)
            if (e.touches.length === 2 && !activeOperation.current) {
                 e.preventDefault(); // Prevent page zoom
                 const dist = Math.hypot(
                     e.touches[0].clientX - e.touches[1].clientX,
                     e.touches[0].clientY - e.touches[1].clientY
                 );
                 
                 if (lastPinchDistRef.current !== null) {
                     const delta = dist - lastPinchDistRef.current;
                     setView(v => ({ 
                         ...v, 
                         scale: Math.max(0.1, Math.min(5, v.scale + delta * 0.005)) 
                     }));
                 }
                 lastPinchDistRef.current = dist;
                 return; 
            }
            if (e.touches.length === 1) {
                handleMove(e.touches[0].clientX, e.touches[0].clientY);
            }
        };

        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
        window.addEventListener('touchmove', onTouchMove, { passive: false });
        window.addEventListener('touchend', handleUp);

        return () => {
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
            window.removeEventListener('touchmove', onTouchMove);
            window.removeEventListener('touchend', handleUp);
        };
    }, [view.scale, onUpdateWidget]); // Re-bind when scale changes

    // --- WIDGET EVENT STARTERS ---
    const startDragWidget = (e: React.MouseEvent | React.TouchEvent, widget: DashboardWidget) => {
        e.stopPropagation();
        const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
        
        activeOperation.current = {
            type: 'DRAG',
            id: widget.id,
            startX: clientX,
            startY: clientY,
            initialX: widget.x || 0,
            initialY: widget.y || 0,
            initialW: widget.w || 200,
            initialH: widget.h || 150
        };
    };

    const startResizeWidget = (e: React.MouseEvent, widget: DashboardWidget) => {
        e.stopPropagation();
        activeOperation.current = {
            type: 'RESIZE',
            id: widget.id,
            startX: e.clientX,
            startY: e.clientY,
            initialX: widget.x || 0,
            initialY: widget.y || 0,
            initialW: widget.w || 200,
            initialH: widget.h || 150
        };
    };

    // Widget Touch Start (Detect Pinch vs Drag)
    const handleWidgetTouchStart = (e: React.TouchEvent, widget: DashboardWidget) => {
        e.stopPropagation();
        if (e.touches.length === 1) {
             startDragWidget(e, widget);
        } else if (e.touches.length === 2) {
             const dist = Math.hypot(
                 e.touches[0].clientX - e.touches[1].clientX,
                 e.touches[0].clientY - e.touches[1].clientY
             );
             activeOperation.current = {
                 type: 'PINCH_RESIZE',
                 id: widget.id,
                 startX: 0, startY: 0, // Unused for pinch
                 initialX: widget.x || 0, initialY: widget.y || 0,
                 initialW: widget.w || 200, initialH: widget.h || 150,
                 startDist: dist
             };
        }
    };

    const handleWidgetTouchMove = (e: React.TouchEvent) => {
        if (activeOperation.current?.type === 'PINCH_RESIZE' && e.touches.length === 2) {
             e.stopPropagation();
             const dist = Math.hypot(
                 e.touches[0].clientX - e.touches[1].clientX,
                 e.touches[0].clientY - e.touches[1].clientY
             );
             const ratio = dist / (activeOperation.current.startDist || 1);
             const op = activeOperation.current;
             onUpdateWidget(op.id, {
                 w: Math.max(100, op.initialW * ratio),
                 h: Math.max(60, op.initialH * ratio)
             });
        }
    };

    // --- FORM COMPONENT ---
    const ConfigModal = () => {
        const [type, setType] = useState('VIDEO');
        const [title, setTitle] = useState('');
        const [url, setUrl] = useState('');

        const handleSubmit = (e: React.FormEvent) => {
            e.preventDefault();
            // Add new widget at center of current view
            const centerX = (-view.x + window.innerWidth/2) / view.scale;
            const centerY = (-view.y + window.innerHeight/2) / view.scale;
            
            onAddWidget({
                id: `w-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                type: type as any,
                title: title || 'New Widget',
                sourceUrl: url,
                x: centerX - 150, y: centerY - 100, w: 300, h: 200
            });
            setIsConfigOpen(false);
        };

        return (
            <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur" onMouseDown={e => e.stopPropagation()}>
                <form onSubmit={handleSubmit} className="bg-black border border-neon-blue p-6 rounded w-96 shadow-[0_0_30px_rgba(0,243,255,0.3)] relative">
                    <button type="button" onClick={() => setIsConfigOpen(false)} className="absolute top-2 right-2 text-neon-blue hover:text-white"><div className="text-xl">×</div></button>
                    <h2 className="text-neon-blue font-display text-lg mb-4 tracking-widest">ADD_WIDGET_MODULE</h2>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs text-gray-400 mb-1">MODULE TYPE</label>
                            <select value={type} onChange={e => setType(e.target.value)} className="w-full bg-white/5 border border-neon-blue/30 text-white p-2 text-sm outline-none focus:border-neon-blue">
                                <option value="VIDEO">VIDEO FEED (TikTok/YT)</option>
                                <option value="METRIC">DATA METRIC (Speed/%)</option>
                                <option value="LOG_STREAM">API LOG STREAM</option>
                                <option value="TASK_PROGRESS">TASK PROGRESS BAR</option>
                                <option value="NEXUS_VOLUME">NEXUS VOLUME INTERFACE</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs text-gray-400 mb-1">DISPLAY TITLE</label>
                            <input value={title} onChange={e => setTitle(e.target.value)} className="w-full bg-white/5 border border-neon-blue/30 text-white p-2 text-sm outline-none focus:border-neon-blue" placeholder="e.g. Main Camera" />
                        </div>
                        <div>
                            <label className="block text-xs text-gray-400 mb-1">DATA SOURCE / URL</label>
                            <input value={url} onChange={e => setUrl(e.target.value)} className="w-full bg-white/5 border border-neon-blue/30 text-white p-2 text-sm outline-none focus:border-neon-blue" placeholder="https://..." />
                        </div>
                        <button type="submit" className="w-full py-2 bg-neon-blue/20 hover:bg-neon-blue/40 border border-neon-blue text-neon-blue font-bold tracking-widest transition-all">INITIALIZE</button>
                    </div>
                </form>
            </div>
        );
    };

    return (
        <div 
            ref={containerRef}
            className="absolute inset-0 z-40 bg-black/90 pointer-events-auto overflow-hidden cursor-grab active:cursor-grabbing"
            onWheel={handleWheel}
            onMouseDown={handleCanvasMouseDown}
            onTouchStart={handleCanvasTouchStart}
            style={{ touchAction: 'none' }} // Crucial for gestures
        >
            {/* Background Grid */}
            <div className="absolute inset-0 z-[-1]" 
                style={{ 
                    backgroundImage: 'linear-gradient(#00f3ff 1px, transparent 1px), linear-gradient(90deg, #00f3ff 1px, transparent 1px)', 
                    backgroundSize: `${40 * view.scale}px ${40 * view.scale}px`,
                    backgroundPosition: `${view.x}px ${view.y}px`,
                    opacity: 0.15 
                }}>
            </div>

            {/* UI Overlay (Header) - Fixed on Screen */}
            <div className="absolute top-0 left-0 w-full p-4 pt-24 z-50 pointer-events-none flex justify-between items-start">
                 <div className="pointer-events-auto">
                     <h1 className="text-2xl md:text-4xl font-display text-white tracking-[0.2em] neon-text-shadow">LIVE_STREAM_DECK</h1>
                     <div className="flex gap-4 text-xs font-mono text-neon-green mt-1">
                         <span>ZOOM: {(view.scale * 100).toFixed(0)}%</span>
                         <span>WIDGETS: {widgets.length}</span>
                     </div>
                 </div>
                 <button onClick={() => setIsConfigOpen(true)} className="pointer-events-auto px-6 py-2 border border-neon-blue bg-black/50 hover:bg-neon-blue/20 text-neon-blue transition-all font-display text-sm tracking-widest flex items-center gap-2 group backdrop-blur-sm">
                     <span>+ ADD ELEMENT</span>
                 </button>
            </div>

            {/* Transform Container */}
            <div 
                className="absolute top-0 left-0 w-full h-full origin-top-left"
                style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})` }}
            >
                {widgets.map(widget => (
                    <div 
                        key={widget.id}
                        style={{ 
                            left: widget.x || 0, 
                            top: widget.y || 0, 
                            width: widget.w || 300, 
                            height: widget.h || 200 
                        }}
                        className="absolute bg-black/60 border border-neon-blue/30 rounded-lg overflow-hidden flex flex-col hover:border-neon-blue hover:shadow-[0_0_20px_rgba(0,243,255,0.3)] transition-shadow group"
                        onTouchStart={(e) => handleWidgetTouchStart(e, widget)}
                        onTouchMove={handleWidgetTouchMove}
                    >
                        {/* Drag Handle / Header */}
                        <div 
                            className="bg-white/5 p-2 flex justify-between items-center border-b border-white/5 cursor-move active:bg-neon-blue/20 transition-colors"
                            onMouseDown={(e) => startDragWidget(e, widget)}
                        >
                            <span className="text-[10px] font-display tracking-widest text-neon-blue uppercase pointer-events-none select-none">{widget.title}</span>
                            <div className="flex gap-2">
                                <button onClick={(e) => { e.stopPropagation(); onRemoveWidget(widget.id); }} className="text-gray-500 hover:text-red-500 transition-colors text-xs pointer-events-auto px-2">×</button>
                            </div>
                        </div>
                        
                        {/* Content Area */}
                        <div className="flex-1 relative">
                            {widget.type === 'VIDEO' && <VideoWidget widget={widget} />}
                            {widget.type === 'METRIC' && <MetricWidget widget={widget} />}
                            {widget.type === 'LOG_STREAM' && <LogStreamWidget widget={widget} />}
                            {widget.type === 'TASK_PROGRESS' && <TaskProgressWidget widget={widget} />}
                            {widget.type === 'NEXUS_VOLUME' && <NexusVolumeWidget widget={widget} />}
                        </div>

                        {/* Resize Handle (Desktop) */}
                        <div 
                            className="absolute bottom-0 right-0 w-6 h-6 cursor-nwse-resize z-20 hover:bg-neon-blue/30"
                            onMouseDown={(e) => startResizeWidget(e, widget)}
                        >
                            <div className="absolute bottom-1 right-1 w-2 h-2 border-r border-b border-neon-blue"></div>
                        </div>

                        {/* Visual Corner Accents */}
                        <div className="absolute bottom-0 left-0 w-3 h-3 border-b border-l border-neon-blue/50 pointer-events-none"></div>
                    </div>
                ))}
            </div>

            {isConfigOpen && <ConfigModal />}
        </div>
    );
};