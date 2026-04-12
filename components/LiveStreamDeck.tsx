import { v4 as uuidv4 } from 'uuid';
import React, { useState, useRef, useEffect } from 'react';
import { DashboardWidget } from '../types';
import * as Widgets from './Widgets';
import * as MoreWidgets from './MoreWidgets';

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
    const renderWidget = (widget: DashboardWidget) => {
        const AllWidgets: any = { ...Widgets, ...MoreWidgets };
        // Convert type to component name, e.g., 'VIDEO' -> 'VideoWidget', 'RADAR_SWEEP' -> 'RadarSweepWidget'
        const componentName = widget.type.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join('') + 'Widget';
        const WidgetComponent = AllWidgets[componentName];
        if (WidgetComponent) {
            return <WidgetComponent widget={widget} />;
        }
        return <div className="text-white p-4">Unknown Widget Type: {widget.type}</div>;
    };

    // DEBUG: Check for duplicate keys
    useEffect(() => {
        const ids = widgets.map(w => w.id);
        const uniqueIds = new Set(ids);
        if (ids.length !== uniqueIds.size) {
            console.error("Duplicate widget IDs found:", ids.filter((id, index) => ids.indexOf(id) !== index));
        }
    }, [widgets]);

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
                id: uuidv4(),
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
                                <option value="SOCKET_STREAM">SOCKET STREAM</option>
                                <option value="WEATHER">WEATHER</option>
                                <option value="CLOCK">CLOCK</option>
                                <option value="CPU_USAGE">CPU USAGE</option>
                                <option value="NETWORK_TRAFFIC">NETWORK TRAFFIC</option>
                                <option value="STOCK_TICKER">STOCK TICKER</option>
                                <option value="NEWS_FEED">NEWS FEED</option>
                                <option value="RADAR_SWEEP">RADAR SWEEP</option>
                                <option value="AUDIO_VISUALIZER">AUDIO VISUALIZER</option>
                                <option value="HEART_RATE">HEART RATE</option>
                                <option value="BATTERY_STATUS">BATTERY STATUS</option>
                                <option value="MEMORY_USAGE">MEMORY USAGE</option>
                                <option value="DISK_SPACE">DISK SPACE</option>
                                <option value="SERVER_PING">SERVER PING</option>
                                <option value="DOWNLOAD_SPEED">DOWNLOAD SPEED</option>
                                <option value="UPLOAD_SPEED">UPLOAD SPEED</option>
                                <option value="ACTIVE_USERS">ACTIVE USERS</option>
                                <option value="REVENUE_CHART">REVENUE CHART</option>
                                <option value="CONVERSION_RATE">CONVERSION RATE</option>
                                <option value="ERROR_RATE">ERROR RATE</option>
                                <option value="DATABASE_LOAD">DATABASE LOAD</option>
                                <option value="CACHE_HIT_RATIO">CACHE HIT RATIO</option>
                                <option value="API_REQUESTS">API REQUESTS</option>
                                <option value="LATENCY_GRAPH">LATENCY GRAPH</option>
                                <option value="UPTIME_COUNTER">UPTIME COUNTER</option>
                                <option value="SECURITY_ALERTS">SECURITY ALERTS</option>
                                <option value="THREAT_LEVEL">THREAT LEVEL</option>
                                <option value="FIREWALL_STATUS">FIREWALL STATUS</option>
                                <option value="ENCRYPTION_STATUS">ENCRYPTION STATUS</option>
                                <option value="VPN_CONNECTION">VPN CONNECTION</option>
                                <option value="SATELLITE_TRACKING">SATELLITE TRACKING</option>
                                <option value="GPS_COORDINATES">GPS COORDINATES</option>
                                <option value="COMPASS">COMPASS</option>
                                <option value="ALTIMETER">ALTIMETER</option>
                                <option value="SPEEDOMETER">SPEEDOMETER</option>
                                <option value="TACHOMETER">TACHOMETER</option>
                                <option value="FUEL_GAUGE">FUEL GAUGE</option>
                                <option value="ENGINE_TEMP">ENGINE TEMP</option>
                                <option value="OIL_PRESSURE">OIL PRESSURE</option>
                                <option value="GEAR_INDICATOR">GEAR INDICATOR</option>
                                <option value="G_FORCE_METER">G FORCE METER</option>
                                <option value="GYROSCOPE">GYROSCOPE</option>
                                <option value="ACCELEROMETER">ACCELEROMETER</option>
                                <option value="MAGNETIC_FIELD">MAGNETIC FIELD</option>
                                <option value="LIGHT_SENSOR">LIGHT SENSOR</option>
                                <option value="PROXIMITY_SENSOR">PROXIMITY SENSOR</option>
                                <option value="PRESSURE_SENSOR">PRESSURE SENSOR</option>
                                <option value="HUMIDITY_SENSOR">HUMIDITY SENSOR</option>
                                <option value="CO2_LEVEL">CO2 LEVEL</option>
                                <option value="AIR_QUALITY">AIR QUALITY</option>
                                <option value="RADIATION_LEVEL">RADIATION LEVEL</option>
                                <option value="SEISMIC_ACTIVITY">SEISMIC ACTIVITY</option>
                                <option value="SOLAR_FLARE">SOLAR FLARE</option>
                                <option value="LUNAR_PHASE">LUNAR PHASE</option>
                                <option value="TIDE_LEVEL">TIDE LEVEL</option>
                                <option value="WIND_DIRECTION">WIND DIRECTION</option>
                                <option value="PRECIPITATION_PROB">PRECIPITATION PROB</option>
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
                {widgets.map((widget, index) => (
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
                            {renderWidget(widget)}
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