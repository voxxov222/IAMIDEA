import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Image as ImageIcon, Video, Type, Code, Link as LinkIcon, Search, Settings, X, Sparkles, Globe, Activity, Terminal, Layout, Mic } from 'lucide-react';
import { DraggableWindow } from './components/DraggableWindow';
import { NodeElement, NodeData, NodeType } from './components/NodeElement';
import { Universe3D } from './components/Universe3D';
import { io, Socket } from 'socket.io-client';
import { generateZimCode } from './services/geminiService';
import { AITerminal } from './components/AITerminal';
import { VoiceUplink } from './components/VoiceUplink';
import { WidgetType, EnvironmentSettings } from './types';

export interface Connection {
  id: string;
  source: string;
  target: string;
  color?: string;
}

const DEFAULT_NODES: NodeData[] = [
  { id: 'core-1', type: 'core', title: 'Core Project', x: 500, y: 400 },
  { id: 'img-1', type: 'image', title: 'Visual Concepts v1.2', url: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAj2x5Ews4pBgG7h4nHiLThrYuob8miVR94xy2vgESH2XCntQQCrGub_UyKWJ-5L3ZlADii_51tDN6JWIMY58dk4r8gik80rqutMYLUnvpHmP41Zdu3d8xP4CcoQBl2Tzd4NTxWk6EnGLw2gzZK7KgjZrM4t_uIp1dU6eA974tZO6GgMKjTZSVy1FqFf1T_feq7aCWkhqFXImpIvKqY_-RPA4UvlihapqTuKcE4BUV-0QqkRNUCfrr60_pn9SCN2vXIGxCPwjmkO-Hu', x: 200, y: 300 },
  { id: 'vid-1', type: 'video', title: '3D Animation Techniques', url: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDNNzNeS9UAgaMu3lzrNn2hBmuzm_XOsw17V34-Z3uC8NiwfJ3AEeI9ngWcD8m4Di7__Oqg2-lILYUN7U6yBalBZZQBX8-1Vmxc9GAJnapDkAdsi6RjnsOFi8osV8vd_ZWy0h4jXYieYRRVeq1_CtIWWebR6bRYcAU5_-t9WV0Dqo6AwazkM-Bjh4Fv-WvQY5q6-2SuywzcJ2L8wsj0gpw2I6-e7YEUVWVjYmEPk6PFCtjKpTfmeDcXeL2OHCwMM-ZSkiR8JtE5Nxfm', x: 800, y: 400 },
  { id: 'code-1', type: 'code', title: 'Code Snippet', content: "const universe = {\n  nodes: 42,\n  links: 128,\n  status: 'active'\n};", x: 150, y: 600 },
  { id: 'gif-1', type: 'gif', title: 'Dynamic Texture Reference', x: 450, y: 750 },
  { id: 'zim-1', type: 'zim', title: 'ZIM 3D Interactive', content: "const rect = new Rectangle(200, 200, 'orange', 'white', 4).center().drag();\nrect.animate({props:{rotation:360, rotY:360}, time:4, loop:true, ease:'linear'});\nnew Label('Drag me!', 20, 'Arial', 'white').center(rect).mov(0, 120);", x: 850, y: 700 },
];

const DEFAULT_CONNECTIONS: Connection[] = [
  { id: 'conn-1', source: 'core-1', target: 'img-1' },
  { id: 'conn-2', source: 'core-1', target: 'vid-1' },
  { id: 'conn-3', source: 'core-1', target: 'code-1' },
  { id: 'conn-4', source: 'core-1', target: 'gif-1' },
];

export function App() {
  const [nodes, setNodes] = useState<NodeData[]>(DEFAULT_NODES);
  const [connections, setConnections] = useState<Connection[]>(DEFAULT_CONNECTIONS);

  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [selectedConnection, setSelectedConnection] = useState<string | null>(null);
  const [connectingFrom, setConnectingFrom] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeWindows, setActiveWindows] = useState<string[]>([]);
  const [bgTheme, setBgTheme] = useState('bg-nebula-gradient');
  const [envSettings, setEnvSettings] = useState<EnvironmentSettings>({
    backgroundType: 'grid',
    skyboxType: 'space',
    backgroundColor: '#050505',
    enclosedBox: false,
    boxSize: 200,
    boxTextures: {}
  });
  
  useEffect(() => {
    document.body.className = `h-full select-none ${bgTheme}`;
  }, [bgTheme]);

  useEffect(() => {
    const handleClick = () => closeContextMenu();
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, []);

  const [newNodeType, setNewNodeType] = useState<NodeType>('text');
  const [newNodeTitle, setNewNodeTitle] = useState('');
  const [newNodeContent, setNewNodeContent] = useState('');
  const [newNodeUrl, setNewNodeUrl] = useState('');
  const [newNodeShape, setNewNodeShape] = useState<'sphere' | 'box' | 'cylinder' | 'torus' | 'cone'>('sphere');
  const [newNodeWidgetType, setNewNodeWidgetType] = useState<WidgetType>('METRIC');
  const [newNodeMotionType, setNewNodeMotionType] = useState<'none' | 'orbit' | 'random' | 'zigzag' | 'pop' | 'bounce' | 'slow_trail'>('none');
  const [newNodeMotionTargetId, setNewNodeMotionTargetId] = useState('');
  const [editNodeTitle, setEditNodeTitle] = useState('');
  const [editNodeContent, setEditNodeContent] = useState('');
  const [editNodeUrl, setEditNodeUrl] = useState('');
  const [editNodeMotionType, setEditNodeMotionType] = useState<'none' | 'orbit' | 'random' | 'zigzag' | 'pop' | 'bounce' | 'slow_trail'>('none');
  const [editNodeMotionTargetId, setEditNodeMotionTargetId] = useState('');
  const [editNodeMotionSpeed, setEditNodeMotionSpeed] = useState(1);
  const [editNodeMotionDirection, setEditNodeMotionDirection] = useState<1 | -1>(1);
  const [editNodeShape, setEditNodeShape] = useState<'sphere' | 'box' | 'cylinder' | 'torus' | 'cone'>('sphere');

  const clusterRef = useRef<HTMLDivElement>(null);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [startPan, setStartPan] = useState({ x: 0, y: 0 });

  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  const [is3D, setIs3D] = useState(false);
  const [isRotating, setIsRotating] = useState(false);
  const [startRotation, setStartRotation] = useState({ x: 0, y: 0 });

  const [zoom, setZoom] = useState(1);
  const [contextMenu, setContextMenu] = useState<{ x: number, y: number, visible: boolean }>({ x: 0, y: 0, visible: false });

  const [searchQuery, setSearchQuery] = useState('');
  const [isGeneratingZim, setIsGeneratingZim] = useState(false);
  const [isVoiceUplinkOpen, setIsVoiceUplinkOpen] = useState(false);

  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    // Initialize socket connection
    const socket = io();
    socketRef.current = socket;

    socket.on('init-state', (state: { nodes: NodeData[], connections: Connection[] }) => {
      const uniqueNodes = Array.from(new Map(state.nodes.map(n => [n.id, n])).values());
      const uniqueConns = Array.from(new Map(state.connections.map(c => [c.id, c])).values());
      setNodes(uniqueNodes);
      setConnections(uniqueConns);
    });

    socket.on('node-updated', (data: { id: string, updates: Partial<NodeData> }) => {
      setNodes(prev => prev.map(n => n.id === data.id ? { ...n, ...data.updates } : n));
    });

    socket.on('node-created', (node: NodeData) => {
      setNodes(prev => prev.some(n => n.id === node.id) ? prev : [...prev, node]);
    });

    socket.on('node-deleted', (id: string) => {
      setNodes(prev => prev.filter(n => n.id !== id));
      setConnections(prev => prev.filter(c => c.source !== id && c.target !== id));
    });

    socket.on('connection-created', (conn: Connection) => {
      setConnections(prev => prev.some(c => c.id === conn.id) ? prev : [...prev, conn]);
    });

    socket.on('state-synced', (state: { nodes: NodeData[], connections: Connection[] }) => {
      const uniqueNodes = Array.from(new Map(state.nodes.map(n => [n.id, n])).values());
      const uniqueConns = Array.from(new Map(state.connections.map(c => [c.id, c])).values());
      setNodes(uniqueNodes);
      setConnections(uniqueConns);
    });

    socket.on('universe-reset', (state: { nodes: NodeData[], connections: Connection[] }) => {
      const uniqueNodes = Array.from(new Map(state.nodes.map(n => [n.id, n])).values());
      const uniqueConns = Array.from(new Map(state.connections.map(c => [c.id, c])).values());
      setNodes(uniqueNodes);
      setConnections(uniqueConns);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  useEffect(() => {
    if (is3D) return;

    let animationFrame: number;
    const startTime = Date.now();

    const loop = () => {
      const time = (Date.now() - startTime) / 1000;
      
      setNodes(prevNodes => {
        const hasMotion = prevNodes.some(n => n.motionType && n.motionType !== 'none');
        if (!hasMotion) return prevNodes;

        return prevNodes.map(node => {
          if (!node.motionType || node.motionType === 'none') return node;
          
          const speed = node.motionSpeed || 1;
          const direction = node.motionDirection || 1;
          const t = time * speed * direction;

          switch (node.motionType) {
            case 'orbit':
              if (node.motionTargetId) {
                const target = prevNodes.find(n => n.id === node.motionTargetId);
                if (target) {
                  const radius = 300; 
                  return {
                    ...node,
                    x: target.x + Math.cos(t) * radius,
                    y: target.y + Math.sin(t) * radius
                  };
                }
              }
              break;
            case 'random':
              return {
                ...node,
                x: node.x + (Math.random() - 0.5) * 10 * speed,
                y: node.y + (Math.random() - 0.5) * 10 * speed
              };
            case 'zigzag':
              return {
                ...node,
                x: node.x + Math.sin(t) * 5,
                y: node.y + Math.cos(t * 0.5) * 2
              };
            case 'pop':
              const popVal = (Math.sin(t * 2) + 1) / 2;
              return {
                ...node,
                opacity: popVal,
                scale: 0.5 + popVal * 0.5
              };
            case 'bounce':
              let vx = node.velocity?.x ?? (Math.random() - 0.5) * 5 * speed;
              let vy = node.velocity?.y ?? (Math.random() - 0.5) * 5 * speed;
              
              // Add a slight centripetal force to make it "elliptical"
              const centerX = window.innerWidth / 2;
              const centerY = window.innerHeight / 2;
              const dx = node.x - centerX;
              const dy = node.y - centerY;
              const dist = Math.sqrt(dx * dx + dy * dy);
              
              if (dist > 400) {
                vx -= dx * 0.0001;
                vy -= dy * 0.0001;
              }

              let nx = node.x + vx;
              let ny = node.y + vy;
              
              if (nx < 0 || nx > window.innerWidth) vx *= -1;
              if (ny < 0 || ny > window.innerHeight) vy *= -1;
              
              return {
                ...node,
                x: nx,
                y: ny,
                velocity: { x: vx, y: vy }
              };
            case 'slow_trail':
              const stX = node.x + Math.cos(t * 0.2) * 2 * speed;
              const stY = node.y + Math.sin(t * 0.2) * 2 * speed;
              const newTrail = [...(node.trail || []), { x: node.x, y: node.y }].slice(-20);
              return {
                ...node,
                x: stX,
                y: stY,
                trail: newTrail
              };
          }
          return node;
        });
      });

      animationFrame = requestAnimationFrame(loop);
    };

    animationFrame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animationFrame);
  }, [is3D]);

  // Handle Canvas Panning
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget || (e.target as HTMLElement).tagName === 'svg' || (e.target as HTMLElement).classList.contains('world-container') || (e.target as HTMLElement).classList.contains('grid-overlay')) {
      if (e.button === 2 || (e.button === 0 && e.ctrlKey)) {
        // Right click or Ctrl+Left click -> Rotate
        setIsRotating(true);
        setStartRotation({ x: e.clientX, y: e.clientY });
      } else {
        // Left click -> Pan
        setIsPanning(true);
        setStartPan({ x: e.clientX - pan.x, y: e.clientY - pan.y });
      }
      setConnectingFrom(null);
      setSelectedNode(null);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
      setPan({ x: e.clientX - startPan.x, y: e.clientY - startPan.y });
    }
    if (connectingFrom) {
      setMousePos({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
    setIsRotating(false);
  };

  const handleNodeDragEnd = (id: string, x: number, y: number) => {
    setNodes(prev => prev.map(n => n.id === id ? { ...n, x, y } : n));
    socketRef.current?.emit('update-node', { id, updates: { x, y } });
  };

  const handleNodeSelect = (id: string) => {
    if (connectingFrom) {
      if (connectingFrom !== id) {
        // Create connection
        const newConn = { id: `conn-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, source: connectingFrom, target: id };
        setConnections([...connections, newConn]);
        socketRef.current?.emit('create-connection', newConn);
      }
      setConnectingFrom(null);
    } else {
      setSelectedNode(id);
    }
  };

  const handleConnectStart = (id: string, e: React.MouseEvent) => {
    setConnectingFrom(id);
    setMousePos({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const toggleWindow = (id: string) => {
    setActiveWindows(prev => prev.includes(id) ? prev.filter(w => w !== id) : [...prev, id]);
  };

  const handleCreateAndLink = (sourceId: string, newNodeData: Partial<NodeData>) => {
    const sourceNode = nodes.find(n => n.id === sourceId);
    if (!sourceNode) return;

    const newNode: NodeData = {
      id: `node-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: newNodeData.type || 'text',
      title: newNodeData.title || 'New Node',
      content: newNodeData.content,
      url: newNodeData.url,
      x: sourceNode.x + 300,
      y: sourceNode.y + (Math.random() * 100 - 50),
      z: (sourceNode.z || 0) + (Math.random() * 50 - 25),
      scale: 1
    };

    const newConn = {
      id: `conn-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      source: sourceId,
      target: newNode.id
    };

    setNodes(prev => {
      if (prev.some(n => n.id === newNode.id)) return prev;
      return [...prev, newNode];
    });
    setConnections(prev => {
      if (prev.some(c => c.id === newConn.id)) return prev;
      return [...prev, newConn];
    });
    socketRef.current?.emit('create-node', newNode);
    socketRef.current?.emit('create-connection', newConn);
  };

  const handleLinkExisting = (sourceId: string, targetId: string) => {
    const exists = connections.some(c => 
      (c.source === sourceId && c.target === targetId) || 
      (c.source === targetId && c.target === sourceId)
    );
    if (!exists) {
      const newConn = {
        id: `conn-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        source: sourceId,
        target: targetId
      };
      setConnections(prev => [...prev, newConn]);
      socketRef.current?.emit('create-connection', newConn);
    }
  };

  const handleAddNode = () => {
    if (!newNodeTitle) return;
    const newNode: NodeData = {
      id: `node-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: newNodeType,
      title: newNodeTitle,
      content: newNodeContent,
      url: newNodeUrl,
      shape: newNodeShape,
      widgetType: newNodeType === 'widget' ? newNodeWidgetType : undefined,
      x: window.innerWidth / 2 - pan.x,
      y: window.innerHeight / 2 - pan.y,
      motionType: newNodeMotionType,
      motionTargetId: newNodeMotionTargetId,
      motionSpeed: 1,
      motionDirection: 1
    };
    setNodes(prev => {
      if (prev.some(n => n.id === newNode.id)) return prev;
      return [...prev, newNode];
    });
    socketRef.current?.emit('create-node', newNode);
    setNewNodeTitle('');
    setNewNodeContent('');
    setNewNodeUrl('');
    setNewNodeMotionType('none');
    setNewNodeMotionTargetId('');
    toggleWindow('addNode');
  };

  const handleDeleteNode = (id: string) => {
    setNodes(prev => prev.filter(n => n.id !== id));
    setConnections(prev => prev.filter(c => c.source !== id && c.target !== id));
    socketRef.current?.emit('delete-node', id);
    if (selectedNode === id) {
      setSelectedNode(null);
    }
  };

  const [lastTouchDist, setLastTouchDist] = useState<number>(0);
  const viewportRef = useRef<HTMLElement>(null);
  const touchStateRef = useRef({
    isRotating: false,
    startRotation: { x: 0, y: 0 },
    lastTouchDist: 0,
    pan: { x: 0, y: 0 }
  });

  // Sync ref with state for use in manual listeners
  useEffect(() => {
    touchStateRef.current.pan = pan;
  }, [pan]);

  const handleTouchStartManual = useCallback((e: TouchEvent) => {
    if (is3D) return;
    
    if (e.touches.length === 2) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      setLastTouchDist(dist);
      touchStateRef.current.lastTouchDist = dist;
    } else if (e.touches.length === 1) {
      const target = e.target as HTMLElement;
      const currentTarget = viewportRef.current;
      if (target === currentTarget || target.tagName === 'svg' || target.classList.contains('world-container') || target.classList.contains('grid-overlay')) {
        setIsRotating(true);
        touchStateRef.current.isRotating = true;
        const startPos = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        setStartRotation(startPos);
        touchStateRef.current.startRotation = startPos;
      }
    }
  }, [is3D]);

  const handleTouchMoveManual = useCallback((e: TouchEvent) => {
    if (is3D) return;

    if (e.touches.length === 2) {
      if (e.cancelable) e.preventDefault();
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const delta = dist - touchStateRef.current.lastTouchDist;
      touchStateRef.current.lastTouchDist = dist;
      setLastTouchDist(dist);

      setZoom(z => Math.min(Math.max(z + delta * 0.005, 0.05), 10));
    } else if (e.touches.length === 1 && touchStateRef.current.isRotating) {
      if (e.cancelable) e.preventDefault();
      const deltaX = e.touches[0].clientX - touchStateRef.current.startRotation.x;
      const deltaY = e.touches[0].clientY - touchStateRef.current.startRotation.y;
      
      const newPan = { 
        x: touchStateRef.current.pan.x + deltaX, 
        y: touchStateRef.current.pan.y + deltaY 
      };
      
      setPan(newPan);
      touchStateRef.current.pan = newPan;
      touchStateRef.current.startRotation = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      setStartRotation(touchStateRef.current.startRotation);
    }
  }, [is3D]);

  const handleTouchEndManual = useCallback(() => {
    setIsRotating(false);
    touchStateRef.current.isRotating = false;
  }, []);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    viewport.addEventListener('touchstart', handleTouchStartManual, { passive: false });
    viewport.addEventListener('touchmove', handleTouchMoveManual, { passive: false });
    viewport.addEventListener('touchend', handleTouchEndManual);

    return () => {
      viewport.removeEventListener('touchstart', handleTouchStartManual);
      viewport.removeEventListener('touchmove', handleTouchMoveManual);
      viewport.removeEventListener('touchend', handleTouchEndManual);
    };
  }, [handleTouchStartManual, handleTouchMoveManual, handleTouchEndManual]);

  const handleTouchStart = (e: React.TouchEvent) => {
    // Handled by manual listeners for passive: false support
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    // Handled by manual listeners
  };

  const handleTouchEnd = () => {
    // Handled by manual listeners
  };

  // Calculate connection lines
  const getLineCoordinates = (sourceId: string, targetId: string) => {
    const source = nodes.find(n => n.id === sourceId);
    const target = nodes.find(n => n.id === targetId);
    if (!source || !target) return null;
    
    // Approximate center of nodes (could be improved based on node type/size)
    const sx = source.x + (source.type === 'core' ? 64 : 100);
    const sy = source.y + (source.type === 'core' ? 64 : 50);
    const tx = target.x + (target.type === 'core' ? 64 : 100);
    const ty = target.y + (target.type === 'core' ? 64 : 50);
    
    return { x1: sx, y1: sy, x2: tx, y2: ty };
  };

  const handleUpdateNode = (id: string, data: Partial<NodeData>) => {
    setNodes(prev => prev.map(n => n.id === id ? { ...n, ...data } : n));
    socketRef.current?.emit('update-node', { id, updates: data });
  };

  const handleResetUniverse = () => {
    socketRef.current?.emit('reset-universe');
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, visible: true });
  };

  const closeContextMenu = () => setContextMenu(prev => ({ ...prev, visible: false }));

  const handleVoiceAction = (action: any) => {
    console.log("Voice Action:", action);
    switch (action.type) {
      case 'addNode':
        const newNode: NodeData = {
          id: `node-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          type: action.payload.type || 'text',
          title: action.payload.title,
          content: action.payload.content,
          x: window.innerWidth / 2 - pan.x + (Math.random() * 200 - 100),
          y: window.innerHeight / 2 - pan.y + (Math.random() * 200 - 100),
          scale: 1
        };
        setNodes(prev => prev.some(n => n.id === newNode.id) ? prev : [...prev, newNode]);
        socketRef.current?.emit('create-node', newNode);
        break;
      case 'connectNodes':
        const source = nodes.find(n => n.title.toLowerCase().includes(action.payload.sourceId.toLowerCase()));
        const target = nodes.find(n => n.title.toLowerCase().includes(action.payload.targetId.toLowerCase()));
        if (source && target) {
          const newConn = {
            id: `conn-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            source: source.id,
            target: target.id
          };
          setConnections(prev => prev.some(c => c.id === newConn.id) ? prev : [...prev, newConn]);
          socketRef.current?.emit('create-connection', newConn);
        }
        break;
      case 'searchUniverse':
        setSearchQuery(action.payload.query);
        break;
    }
  };

  return (
    <main 
      ref={viewportRef as any}
      className="relative w-full h-full overflow-hidden" 
      data-purpose="3d-universe-viewport"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onContextMenu={handleContextMenu}
      onWheel={(e) => {
        if (is3D) return;
        // Zoom on wheel (no ctrl key required as per user request)
        if (selectedNode) {
          setNodes(prev => prev.map(n => n.id === selectedNode ? { ...n, scale: Math.min(Math.max((n.scale || 1) - e.deltaY * 0.001, 0.2), 5) } : n));
        } else {
          setZoom(z => Math.min(Math.max(z - e.deltaY * 0.001, 0.1), 5));
        }
      }}
    >
      <div className="absolute inset-0 w-full h-full" style={{ perspective: is3D ? '1000px' : 'none' }}>
        {/* Subtle Grid Background for 2D */}
        {!is3D && <div aria-hidden="true" className="absolute inset-0 grid-overlay pointer-events-none" style={{ transform: `translate(${pan.x % 50}px, ${pan.y % 50}px)` }}></div>}
        
        {is3D ? (
          <Universe3D
            nodes={nodes}
            connections={connections}
            selectedNode={selectedNode}
            connectingFrom={connectingFrom}
            searchQuery={searchQuery}
            envSettings={envSettings}
            onSelect={handleNodeSelect}
            onDragEnd={handleNodeDragEnd}
            onConnectStart={handleConnectStart}
            onCreateAndLink={handleCreateAndLink}
            onLinkExisting={handleLinkExisting}
            onDelete={handleDeleteNode}
            onUpdateNode={handleUpdateNode}
          />
        ) : (
          <div 
            className="world-container absolute inset-0 w-full h-full" 
            style={{ 
              transformStyle: 'preserve-3d',
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transformOrigin: '0 0',
              transition: isPanning || isRotating ? 'none' : 'transform 0.1s ease-out'
            }}
          >
            {/* Trails Layer */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ transformStyle: 'preserve-3d' }}>
              {nodes.filter(n => n.trail && n.trail.length > 1).map(node => (
                <polyline
                  key={`trail-${node.id}`}
                  points={node.trail!.map(p => `${p.x + (node.type === 'core' ? 64 : 100)},${p.y + (node.type === 'core' ? 64 : 50)}`).join(' ')}
                  fill="none"
                  stroke="rgba(0, 210, 255, 0.3)"
                  strokeWidth="2"
                  strokeDasharray="4 2"
                  style={{ transform: `translateZ(${node.z || 0}px)` }}
                />
              ))}
            </svg>

            {/* Connections Layer */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ transformStyle: 'preserve-3d' }}>
              {connections.map(conn => {
                const coords = getLineCoordinates(conn.source, conn.target);
                if (!coords) return null;
                const source = nodes.find(n => n.id === conn.source);
                const target = nodes.find(n => n.id === conn.target);
                return (
                  <line
                    key={conn.id}
                    x1={coords.x1}
                    y1={coords.y1}
                    x2={coords.x2}
                    y2={coords.y2}
                    stroke={conn.color || "rgba(0, 210, 255, 0.4)"}
                    strokeWidth="2"
                    style={{ transform: `translateZ(${(source?.z || 0) + (target?.z || 0) / 2}px)` }}
                  />
                );
              })}
            </svg>
            {connectingFrom && (
                <div
                  className="absolute bg-neon-blue/30"
                  style={{
                    left: nodes.find(n => n.id === connectingFrom)?.x! + (nodes.find(n => n.id === connectingFrom)?.type === 'core' ? 64 : 100),
                    top: nodes.find(n => n.id === connectingFrom)?.y! + (nodes.find(n => n.id === connectingFrom)?.type === 'core' ? 64 : 50),
                    width: Math.sqrt(Math.pow(mousePos.x - (nodes.find(n => n.id === connectingFrom)?.x! + 100), 2) + Math.pow(mousePos.y - (nodes.find(n => n.id === connectingFrom)?.y! + 50), 2)),
                    height: 2,
                    transformOrigin: '0 50%',
                    transform: `rotateZ(${Math.atan2(mousePos.y - (nodes.find(n => n.id === connectingFrom)?.y! + 50), mousePos.x - (nodes.find(n => n.id === connectingFrom)?.x! + 100)) * 180 / Math.PI}deg)`
                  }}
                />
              )}
            
            {/* Interactive Nodes Container */}
            {nodes.map(node => {
              const isMatch = searchQuery ? (node.title.toLowerCase().includes(searchQuery.toLowerCase()) || node.content?.toLowerCase().includes(searchQuery.toLowerCase())) : false;
              return (
                <NodeElement 
                  key={node.id}
                  node={node}
                  nodes={nodes}
                  isSelected={selectedNode === node.id || connectingFrom === node.id}
                  isMatch={isMatch}
                  onSelect={handleNodeSelect}
                  onDragEnd={handleNodeDragEnd}
                  onConnectStart={handleConnectStart}
                  onCreateAndLink={handleCreateAndLink}
                  onLinkExisting={handleLinkExisting}
                  onDelete={handleDeleteNode}
                  onUpdateNode={handleUpdateNode}
                />
              );
            })}
          </div>
        )}
      </div>

      {/* Top Bar Navigation/Breadcrumbs */}
      <header className="absolute top-0 left-0 w-full p-8 flex justify-between items-start pointer-events-none z-20">
        <div className="pointer-events-auto">
          <h1 className="text-2xl font-black tracking-tighter text-white uppercase italic">Nebula<span className="text-neon-blue">Mind</span></h1>
          <p className="text-[10px] text-gray-500 tracking-[0.2em] uppercase mt-1">Workspace / Project Alpha-9</p>
        </div>
        <div className="flex gap-4 pointer-events-auto">
          <button 
            onClick={handleResetUniverse}
            className="glass-morphism px-4 py-2 rounded-full text-xs font-bold hover:bg-white/10 transition-colors border border-neon-purple/50 text-neon-purple hover:shadow-[0_0_15px_rgba(157,80,187,0.4)]"
          >
            NEW UNIVERSE
          </button>
          <button className="glass-morphism px-4 py-2 rounded-full text-xs font-bold hover:bg-white/10 transition-colors">SHARE</button>
          <button className="bg-neon-blue text-space-900 px-4 py-2 rounded-full text-xs font-bold hover:brightness-110 transition-all shadow-[0_0_20px_rgba(0,210,255,0.3)]">EXPORT</button>
        </div>
      </header>

      {/* Selected Node Action Bar */}
      <AnimatePresence>
        {selectedNode && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="absolute bottom-10 left-1/2 -translate-x-1/2 flex items-center gap-2 glass-morphism px-4 py-2 rounded-full z-30"
          >
            <span className="text-xs text-gray-300 mr-2">Node Selected</span>
            <button 
              onClick={() => {
                setNodes(prev => prev.filter(n => n.id !== selectedNode));
                setConnections(prev => prev.filter(c => c.source !== selectedNode && c.target !== selectedNode));
                setSelectedNode(null);
              }}
              className="px-3 py-1 bg-red-500/20 text-red-400 hover:bg-red-500/40 rounded text-xs font-bold transition-colors"
            >
              Delete
            </button>
            <button 
              onClick={() => {
                const node = nodes.find(n => n.id === selectedNode);
                if (node) {
                  setEditNodeTitle(node.title);
                  setEditNodeContent(node.content || '');
                  setEditNodeUrl(node.url || '');
                  setEditNodeMotionType(node.motionType || 'none');
                  setEditNodeMotionTargetId(node.motionTargetId || '');
                  setEditNodeMotionSpeed(node.motionSpeed || 1);
                  setEditNodeMotionDirection(node.motionDirection || 1);
                  setEditNodeShape(node.shape || 'sphere');
                  if (!activeWindows.includes('editNode')) {
                    setActiveWindows([...activeWindows, 'editNode']);
                  }
                }
              }}
              className="px-3 py-1 bg-neon-blue/20 text-neon-blue hover:bg-neon-blue/40 rounded text-xs font-bold transition-colors"
            >
              Edit
            </button>
            <button 
              onClick={async () => {
                const node = nodes.find(n => n.id === selectedNode);
                if (node) {
                  try {
                    const { expandNodeDeep } = await import('./services/geminiService');
                    const result = await expandNodeDeep(node.title, node.content || '');
                    
                    const newNodes = (result.newConcepts || []).filter(c => c && c.name).map((concept, index) => ({
                      id: `node-${Date.now()}-${index}-${Math.random().toString(36).substr(2, 5)}`,
                      type: 'text' as const,
                      title: concept.name,
                      content: concept.description,
                      x: node.x + Math.cos((index / result.newConcepts.length) * Math.PI * 2) * 600,
                      y: node.y + Math.sin((index / result.newConcepts.length) * Math.PI * 2) * 600,
                    }));

                    const newConnections = newNodes.map(n => ({
                      id: `conn-${Date.now()}-${n.id}-${Math.random().toString(36).substr(2, 5)}`,
                      source: node.id,
                      target: n.id
                    }));

                    setNodes(prev => {
                      const existingIds = new Set(prev.map(n => n.id));
                      const uniqueNewNodes = newNodes.filter(n => !existingIds.has(n.id));
                      return [...prev, ...uniqueNewNodes];
                    });
                    setConnections(prev => {
                      const existingIds = new Set(prev.map(c => c.id));
                      const uniqueNewConnections = newConnections.filter(c => !existingIds.has(c.id));
                      return [...prev, ...uniqueNewConnections];
                    });
                    
                    newNodes.forEach(n => socketRef.current?.emit('create-node', n));
                    newConnections.forEach(c => socketRef.current?.emit('create-connection', c));
                  } catch (e) {
                    console.error("Research failed", e);
                  }
                }
              }}
              className="px-3 py-1 bg-neon-purple/20 text-neon-purple hover:bg-neon-purple/40 rounded text-xs font-bold transition-colors flex items-center gap-1"
            >
              <Sparkles size={12} />
              Research
            </button>
            <button 
              onClick={() => setSelectedNode(null)}
              className="px-3 py-1 bg-white/10 text-white hover:bg-white/20 rounded text-xs font-bold transition-colors"
            >
              Deselect
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Voice Uplink Overlay */}
      <VoiceUplink 
        isOpen={isVoiceUplinkOpen} 
        onClose={() => setIsVoiceUplinkOpen(false)} 
        onAction={handleVoiceAction}
      />

      {/* Floating Action Menu - Moved to Top Right for better visibility */}
      <div className="absolute top-28 right-10 flex flex-col items-end gap-4 z-30" data-purpose="ui-controls">
        {/* Minimalist Menu Button */}
        <button 
          className={`group glass-morphism w-14 h-14 rounded-full flex items-center justify-center hover:scale-110 active:scale-95 transition-all duration-300 relative overflow-hidden ${menuOpen ? 'rotate-90 bg-white/10' : ''}`}
          onClick={() => setMenuOpen(!menuOpen)}
        >
          <div className="space-y-1 z-10">
            <div className="w-5 h-0.5 bg-white transition-all group-hover:w-6"></div>
            <div className="w-5 h-0.5 bg-white transition-all group-hover:translate-x-1"></div>
            <div className="w-3 h-0.5 bg-neon-blue transition-all group-hover:w-6"></div>
          </div>
          {/* Pulse effect */}
          <div className="absolute inset-0 bg-white/5 animate-ping opacity-20"></div>
        </button>

        <AnimatePresence>
          {menuOpen && (
            <motion.div 
              initial={{ opacity: 0, y: -20, scale: 0.8 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.8 }}
              className="flex flex-col gap-2 mt-2 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar"
            >
              <button onClick={() => toggleWindow('addNode')} className="glass-morphism w-12 h-12 rounded-full flex items-center justify-center hover:bg-neon-blue/20 hover:text-neon-blue transition-colors group relative">
                <Plus size={20} />
                <span className="absolute right-14 bg-space-900 px-2 py-1 rounded text-[10px] opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">Add Node</span>
              </button>
              <button onClick={() => toggleWindow('search')} className="glass-morphism w-12 h-12 rounded-full flex items-center justify-center hover:bg-neon-purple/20 hover:text-neon-purple transition-colors group relative">
                <Search size={20} />
                <span className="absolute right-14 bg-space-900 px-2 py-1 rounded text-[10px] opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">Search Universe</span>
              </button>
              <button onClick={() => toggleWindow('bookmarks')} className="glass-morphism w-12 h-12 rounded-full flex items-center justify-center hover:bg-yellow-500/20 hover:text-yellow-500 transition-colors group relative">
                <LinkIcon size={20} />
                <span className="absolute right-14 bg-space-900 px-2 py-1 rounded text-[10px] opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">Bookmarks</span>
              </button>
              <button onClick={() => toggleWindow('settings')} className="glass-morphism w-12 h-12 rounded-full flex items-center justify-center hover:bg-neon-pink/20 hover:text-neon-pink transition-colors group relative">
                <Settings size={20} />
                <span className="absolute right-14 bg-space-900 px-2 py-1 rounded text-[10px] opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">Environment Settings</span>
              </button>
              <button onClick={() => toggleWindow('terminal')} className="glass-morphism w-12 h-12 rounded-full flex items-center justify-center hover:bg-emerald-500/20 hover:text-emerald-400 transition-colors group relative">
                <Terminal size={20} />
                <span className="absolute right-14 bg-space-900 px-2 py-1 rounded text-[10px] opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap uppercase tracking-widest">AI Terminal</span>
              </button>
              <button onClick={() => setIsVoiceUplinkOpen(!isVoiceUplinkOpen)} className={`glass-morphism w-12 h-12 rounded-full flex items-center justify-center transition-colors group relative ${isVoiceUplinkOpen ? 'bg-neon-blue/20 text-neon-blue' : 'hover:bg-neon-blue/20 hover:text-neon-blue'}`}>
                <Mic size={20} />
                <span className="absolute right-14 bg-space-900 px-2 py-1 rounded text-[10px] opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap uppercase tracking-widest">Voice Uplink</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* Zoom Controls */}
        <div className="glass-morphism flex flex-col rounded-full p-1 gap-1">
          <button onClick={() => setZoom(z => Math.min(z + 0.25, 10))} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/10 text-lg" title="Zoom In">+</button>
          <button 
            onClick={() => {
              setPan({ x: 0, y: 0 });
              setZoom(1);
            }} 
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/10 text-[10px] font-bold"
            title="Center View"
          >
            FIT
          </button>
          <button onClick={() => setZoom(z => Math.max(z - 0.25, 0.05))} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/10 text-lg" title="Zoom Out">-</button>
        </div>
      </div>

      {/* User Status Indicator */}
      <div className="absolute bottom-10 left-10 flex items-center gap-3 glass-morphism px-4 py-2 rounded-full border-none shadow-2xl z-20">
        <div className="relative">
          <div className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse"></div>
          <div className="absolute inset-0 bg-green-500 rounded-full animate-ping opacity-40"></div>
        </div>
        <span className="text-[10px] font-bold tracking-widest text-gray-400 uppercase">System Online</span>
      </div>

      {/* Draggable Windows */}
      <AnimatePresence>
        {activeWindows.includes('addNode') && (
          <DraggableWindow title="Add Node" onClose={() => toggleWindow('addNode')} defaultPosition={{ x: Math.max(20, window.innerWidth / 2 - 160), y: 150 }}>
            <div className="space-y-4 w-64">
              <div className="flex gap-2 flex-wrap">
                {(['text', 'image', 'video', 'code', 'gif', '3d', 'search', 'webpage', 'embed', 'zim', 'widget'] as NodeType[]).map(type => (
                  <button 
                    key={type}
                    onClick={() => setNewNodeType(type)}
                    className={`p-2 rounded-lg flex-1 min-w-[30px] flex justify-center items-center transition-colors ${newNodeType === type ? 'bg-neon-blue/20 text-neon-blue border border-neon-blue/50' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}
                  >
                    {type === 'text' && <Type size={16} />}
                    {type === 'image' && <ImageIcon size={16} />}
                    {type === 'video' && <Video size={16} />}
                    {type === 'code' && <Code size={16} />}
                    {type === 'gif' && <span className="text-[10px] font-bold">GIF</span>}
                    {type === '3d' && <span className="text-[10px] font-bold">3D</span>}
                    {type === 'search' && <Search size={16} />}
                    {type === 'webpage' && <Globe size={16} />}
                    {type === 'embed' && <span className="text-[10px] font-bold">EMBED</span>}
                    {type === 'zim' && <Activity size={16} />}
                    {type === 'widget' && <Layout size={16} />}
                  </button>
                ))}
              </div>

              {newNodeType === 'widget' && (
                <div className="space-y-2">
                  <label className="text-[10px] text-gray-400 uppercase tracking-wider">Widget Type</label>
                  <select 
                    value={newNodeWidgetType}
                    onChange={(e) => setNewNodeWidgetType(e.target.value as WidgetType)}
                    className="w-full bg-space-800 border border-white/10 rounded p-2 text-sm text-white focus:outline-none focus:border-neon-blue"
                  >
                    <option value="METRIC">Metric Gauge</option>
                    <option value="VIDEO">Live Video</option>
                    <option value="LOG_STREAM">System Logs</option>
                    <option value="TASK_PROGRESS">Task Progress</option>
                    <option value="NEXUS_VOLUME">Nexus Volume</option>
                    <option value="SOCKET_STREAM">Socket Stream</option>
                    <option value="WEATHER">Weather Station</option>
                    <option value="CLOCK">Digital Clock</option>
                    <option value="CPU_USAGE">CPU Usage</option>
                    <option value="NETWORK_TRAFFIC">Network Traffic</option>
                    <option value="STOCK_TICKER">Stock Ticker</option>
                    <option value="NEWS_FEED">News Feed</option>
                  </select>
                </div>
              )}
              
              <div className="space-y-2">
                <label className="text-[10px] text-gray-400 uppercase tracking-wider">Title</label>
                <input 
                  type="text" 
                  value={newNodeTitle}
                  onChange={(e) => setNewNodeTitle(e.target.value)}
                  className="w-full bg-space-800 border border-white/10 rounded p-2 text-sm text-white focus:outline-none focus:border-neon-blue"
                  placeholder="Node Title..."
                />
              </div>

              {(newNodeType === 'image' || newNodeType === 'video' || newNodeType === 'gif' || newNodeType === '3d' || newNodeType === 'webpage') && (
                <div className="space-y-2">
                  <label className="text-[10px] text-gray-400 uppercase tracking-wider">URL / Source</label>
                  <input 
                    type="text" 
                    value={newNodeUrl.startsWith('data:') ? '(Uploaded File)' : newNodeUrl}
                    onChange={(e) => {
                      if (e.target.value !== '(Uploaded File)') {
                        setNewNodeUrl(e.target.value);
                      }
                    }}
                    className="w-full bg-space-800 border border-white/10 rounded p-2 text-sm text-white focus:outline-none focus:border-neon-blue"
                    placeholder="https://..."
                  />
                  {(newNodeType === 'image' || newNodeType === 'gif' || newNodeType === '3d') && (
                    <div className="mt-2">
                      <label className="text-[10px] text-gray-400 uppercase tracking-wider block mb-1">Or Upload File</label>
                      <input 
                        type="file" 
                        accept={newNodeType === 'image' ? "image/*" : newNodeType === 'gif' ? "image/gif" : ".glb,.gltf,.obj"}
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            const reader = new FileReader();
                            reader.onload = (event) => {
                              if (event.target?.result) {
                                setNewNodeUrl(event.target.result as string);
                              }
                            };
                            reader.readAsDataURL(e.target.files[0]);
                          }
                        }}
                        className="w-full text-xs text-gray-400 file:mr-4 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-neon-blue/20 file:text-neon-blue hover:file:bg-neon-blue/30"
                      />
                    </div>
                  )}
                </div>
              )}

              {(newNodeType === 'text' || newNodeType === 'code' || newNodeType === 'embed' || newNodeType === 'zim') && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] text-gray-400 uppercase tracking-wider">Content</label>
                    {newNodeType === 'zim' && (
                      <button 
                        onClick={async () => {
                          if (!newNodeTitle) return;
                          setIsGeneratingZim(true);
                          const code = await generateZimCode(newNodeTitle);
                          setNewNodeContent(code);
                          setIsGeneratingZim(false);
                        }}
                        disabled={isGeneratingZim || !newNodeTitle}
                        className="text-[10px] bg-neon-purple/20 text-neon-purple px-2 py-0.5 rounded hover:bg-neon-purple/40 disabled:opacity-50 flex items-center gap-1 transition-all"
                      >
                        <Sparkles size={10} /> {isGeneratingZim ? 'Generating...' : 'AI Assist'}
                      </button>
                    )}
                  </div>

                  {newNodeType === 'zim' && (
                    <div className="flex flex-wrap gap-1 mb-2">
                      {[
                        { name: 'TextureActive', code: 'new TextureActive({width:W, height:H, color:pink, corner:20}).center();\nnew Circle(100, blue).center(prev).drag();' },
                        { name: 'Shader', code: 'new Shader(W, H, `\nprecision mediump float;\nuniform float time;\nuniform vec2 resolution;\nvoid main() {\n    vec2 uv = gl_FragCoord.xy / resolution.xy;\n    gl_FragColor = vec4(uv.x, uv.y, sin(time), 1.0);\n}`).center();' },
                        { name: 'Synth', code: 'const synth = new Synth();\nnew Dial().center().change(e=>{synth.play(e.target.value*10+200);});' },
                        { name: 'Perspective', code: 'new Perspective({layers:[new Rectangle(W,H,blue), new Circle(100,red).center()], depth:.5}).center().drag();' }
                      ].map(template => (
                        <button
                          key={template.name}
                          onClick={() => {
                            setNewNodeContent(template.code);
                            if (!newNodeTitle) setNewNodeTitle(template.name);
                          }}
                          className="text-[9px] bg-white/5 border border-white/10 px-2 py-1 rounded hover:bg-white/10 text-gray-400 hover:text-white transition-all"
                        >
                          {template.name}
                        </button>
                      ))}
                    </div>
                  )}

                  <textarea 
                    value={newNodeContent}
                    onChange={(e) => setNewNodeContent(e.target.value)}
                    className="w-full bg-space-800 border border-white/10 rounded p-2 text-sm text-white focus:outline-none focus:border-neon-blue min-h-[100px] font-mono"
                    placeholder={newNodeType === 'embed' ? "Paste iframe or HTML embed code here..." : newNodeType === 'zim' ? "Enter ZIM code (e.g. new Circle(100, 'purple').center().drag();)" : "Enter content..."}
                  />
                </div>
              )}

              {newNodeType === '3d' && (
                <div className="space-y-2">
                  <label className="text-[10px] text-gray-500 uppercase tracking-widest">3D Shape</label>
                  <select 
                    value={newNodeShape} 
                    onChange={(e) => setNewNodeShape(e.target.value as any)}
                    className="w-full bg-white/5 border border-white/10 rounded px-2 py-1.5 text-xs text-white outline-none focus:border-neon-blue"
                  >
                    <option value="sphere">Sphere</option>
                    <option value="box">Box</option>
                    <option value="cylinder">Cylinder</option>
                    <option value="torus">Torus</option>
                    <option value="cone">Cone</option>
                  </select>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-[10px] text-gray-400 uppercase tracking-wider">Motion Type</label>
                <select 
                  value={newNodeMotionType}
                  onChange={(e) => setNewNodeMotionType(e.target.value as any)}
                  className="w-full bg-space-800 border border-white/10 rounded p-2 text-sm text-white focus:outline-none focus:border-neon-blue"
                >
                  <option value="none">None</option>
                  <option value="orbit">Orbit</option>
                  <option value="random">Random Movement</option>
                  <option value="zigzag">Zig Zag</option>
                  <option value="pop">Pop In/Out</option>
                  <option value="bounce">Elliptical Bounce</option>
                  <option value="slow_trail">Slow Motion + Trails</option>
                </select>
              </div>

              {newNodeMotionType === 'orbit' && (
                <div className="space-y-2">
                  <label className="text-[10px] text-gray-400 uppercase tracking-wider">Orbit Around</label>
                  <select 
                    value={newNodeMotionTargetId}
                    onChange={(e) => setNewNodeMotionTargetId(e.target.value)}
                    className="w-full bg-space-800 border border-white/10 rounded p-2 text-sm text-white focus:outline-none focus:border-neon-blue"
                  >
                    <option value="">Select Node...</option>
                    {nodes.map(n => (
                      <option key={n.id} value={n.id}>{n.title}</option>
                    ))}
                  </select>
                </div>
              )}

              <button 
                onClick={handleAddNode}
                className="w-full py-2 bg-neon-blue text-space-900 font-bold rounded hover:brightness-110 transition-all"
              >
                Create Node
              </button>
            </div>
          </DraggableWindow>
        )}

        {activeWindows.includes('editNode') && selectedNode && (
          <DraggableWindow title="Edit Node" onClose={() => toggleWindow('editNode')} defaultPosition={{ x: window.innerWidth - 350, y: 100 }}>
            <div className="w-64 space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] text-gray-400 uppercase tracking-wider">Title</label>
                <input 
                  type="text" 
                  value={editNodeTitle}
                  onChange={(e) => setEditNodeTitle(e.target.value)}
                  className="w-full bg-space-800 border border-white/10 rounded p-2 text-sm text-white focus:outline-none focus:border-neon-blue"
                />
              </div>

              {nodes.find(n => n.id === selectedNode)?.type !== 'core' && (
                <>
                  {['image', 'video', 'gif', '3d', 'webpage'].includes(nodes.find(n => n.id === selectedNode)?.type || '') ? (
                    <div className="space-y-2">
                      <label className="text-[10px] text-gray-400 uppercase tracking-wider">URL / Source</label>
                      <input 
                        type="text" 
                        value={editNodeUrl.startsWith('data:') ? '(Uploaded File)' : editNodeUrl}
                        onChange={(e) => {
                          if (e.target.value !== '(Uploaded File)') {
                            setEditNodeUrl(e.target.value);
                          }
                        }}
                        className="w-full bg-space-800 border border-white/10 rounded p-2 text-sm text-white focus:outline-none focus:border-neon-blue"
                      />
                      {['image', 'gif', '3d'].includes(nodes.find(n => n.id === selectedNode)?.type || '') && (
                        <div className="mt-2">
                          <label className="text-[10px] text-gray-400 uppercase tracking-wider block mb-1">Or Upload File</label>
                          <input 
                            type="file" 
                            accept={nodes.find(n => n.id === selectedNode)?.type === 'image' ? "image/*" : nodes.find(n => n.id === selectedNode)?.type === 'gif' ? "image/gif" : ".glb,.gltf,.obj"}
                            onChange={(e) => {
                              if (e.target.files && e.target.files[0]) {
                                const reader = new FileReader();
                                reader.onload = (event) => {
                                  if (event.target?.result) {
                                    setEditNodeUrl(event.target.result as string);
                                  }
                                };
                                reader.readAsDataURL(e.target.files[0]);
                              }
                            }}
                            className="w-full text-xs text-gray-400 file:mr-4 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-neon-blue/20 file:text-neon-blue hover:file:bg-neon-blue/30"
                          />
                        </div>
                      )}
                    </div>
                  ) : ['text', 'code', 'embed', 'zim'].includes(nodes.find(n => n.id === selectedNode)?.type || '') ? (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] text-gray-400 uppercase tracking-wider">Content</label>
                        {nodes.find(n => n.id === selectedNode)?.type === 'zim' && (
                          <button 
                            onClick={async () => {
                              if (!editNodeTitle) return;
                              setIsGeneratingZim(true);
                              const code = await generateZimCode(editNodeTitle);
                              setEditNodeContent(code);
                              setIsGeneratingZim(false);
                            }}
                            disabled={isGeneratingZim || !editNodeTitle}
                            className="text-[10px] bg-neon-purple/20 text-neon-purple px-2 py-0.5 rounded hover:bg-neon-purple/40 disabled:opacity-50 flex items-center gap-1 transition-all"
                          >
                            <Sparkles size={10} /> {isGeneratingZim ? 'Generating...' : 'AI Assist'}
                          </button>
                        )}
                      </div>

                      {nodes.find(n => n.id === selectedNode)?.type === 'zim' && (
                        <div className="flex flex-wrap gap-1 mb-2">
                          {[
                            { name: 'TextureActive', code: 'new TextureActive({width:W, height:H, color:pink, corner:20}).center();\nnew Circle(100, blue).center().drag();' },
                            { name: 'Shader', code: 'new Shader(W, H, `\nprecision mediump float;\nuniform float time;\nuniform vec2 resolution;\nvoid main() {\n    vec2 uv = gl_FragCoord.xy / resolution.xy;\n    gl_FragColor = vec4(uv.x, uv.y, sin(time), 1.0);\n}`).center();' },
                            { name: 'Synth', code: 'const synth = new Synth();\nnew Dial().center().change(e=>{synth.play(e.target.value*10+200);});' },
                            { name: 'Perspective', code: 'new Perspective({layers:[new Rectangle(W,H,blue), new Circle(100,red).center()], depth:.5}).center().drag();' }
                          ].map(template => (
                            <button
                              key={template.name}
                              onClick={() => {
                                setEditNodeContent(template.code);
                                if (!editNodeTitle) setEditNodeTitle(template.name);
                              }}
                              className="text-[9px] bg-white/5 border border-white/10 px-2 py-1 rounded hover:bg-white/10 text-gray-400 hover:text-white transition-all"
                            >
                              {template.name}
                            </button>
                          ))}
                        </div>
                      )}

                      <textarea 
                        value={editNodeContent}
                        onChange={(e) => setEditNodeContent(e.target.value)}
                        className="w-full bg-space-800 border border-white/10 rounded p-2 text-sm text-white focus:outline-none focus:border-neon-blue min-h-[100px] font-mono"
                      />
                    </div>
                  ) : null}
                </>
              )}

              <div className="space-y-4 border-t border-white/10 pt-4">
                <div className="space-y-2">
                  <label className="text-[10px] text-gray-400 uppercase tracking-wider">3D Shape</label>
                  <select 
                    value={editNodeShape}
                    onChange={(e) => setEditNodeShape(e.target.value as any)}
                    className="w-full bg-space-800 border border-white/10 rounded p-2 text-sm text-white focus:outline-none focus:border-neon-blue"
                  >
                    <option value="sphere">Sphere</option>
                    <option value="box">Box</option>
                    <option value="cylinder">Cylinder</option>
                    <option value="torus">Torus</option>
                    <option value="cone">Cone</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] text-gray-400 uppercase tracking-wider">Motion Type</label>
                  <select 
                    value={editNodeMotionType}
                    onChange={(e) => setEditNodeMotionType(e.target.value as any)}
                    className="w-full bg-space-800 border border-white/10 rounded p-2 text-sm text-white focus:outline-none focus:border-neon-blue"
                  >
                    <option value="none">None</option>
                    <option value="orbit">Orbit</option>
                    <option value="random">Random Movement</option>
                    <option value="zigzag">Zig Zag</option>
                    <option value="pop">Pop In/Out</option>
                    <option value="bounce">Elliptical Bounce</option>
                    <option value="slow_trail">Slow Motion + Trails</option>
                  </select>
                </div>

                {editNodeMotionType === 'orbit' && (
                  <div className="space-y-2">
                    <label className="text-[10px] text-gray-400 uppercase tracking-wider">Orbit Around</label>
                    <select 
                      value={editNodeMotionTargetId}
                      onChange={(e) => setEditNodeMotionTargetId(e.target.value)}
                      className="w-full bg-space-800 border border-white/10 rounded p-2 text-sm text-white focus:outline-none focus:border-neon-blue"
                    >
                      <option value="">Select Node...</option>
                      {nodes.filter(n => n.id !== selectedNode).map(n => (
                        <option key={n.id} value={n.id}>{n.title}</option>
                      ))}
                    </select>
                  </div>
                )}

                {editNodeMotionType !== 'none' && (
                  <>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <label className="text-[10px] text-gray-400 uppercase tracking-wider">Speed</label>
                        <span className="text-[10px] text-neon-blue">{editNodeMotionSpeed}x</span>
                      </div>
                      <input 
                        type="range" 
                        min="0.1" 
                        max="5" 
                        step="0.1"
                        value={editNodeMotionSpeed}
                        onChange={(e) => setEditNodeMotionSpeed(parseFloat(e.target.value))}
                        className="w-full accent-neon-blue"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] text-gray-400 uppercase tracking-wider">Direction</label>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => setEditNodeMotionDirection(1)}
                          className={`flex-1 py-1 rounded text-[10px] font-bold transition-all ${editNodeMotionDirection === 1 ? 'bg-neon-blue text-space-900' : 'bg-white/5 text-gray-400'}`}
                        >
                          Clockwise
                        </button>
                        <button 
                          onClick={() => setEditNodeMotionDirection(-1)}
                          className={`flex-1 py-1 rounded text-[10px] font-bold transition-all ${editNodeMotionDirection === -1 ? 'bg-neon-blue text-space-900' : 'bg-white/5 text-gray-400'}`}
                        >
                          Counter-CW
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>

              <button 
                onClick={() => {
                  const node = nodes.find(n => n.id === selectedNode);
                  if (!node) return;
                  
                  const updates = { 
                    title: editNodeTitle, 
                    content: editNodeContent, 
                    url: editNodeUrl,
                    motionType: editNodeMotionType,
                    motionTargetId: editNodeMotionTargetId,
                    motionSpeed: editNodeMotionSpeed,
                    motionDirection: editNodeMotionDirection,
                    shape: editNodeShape,
                    trail: node.motionType !== editNodeMotionType ? [] : node.trail,
                    velocity: node.motionType !== editNodeMotionType ? undefined : node.velocity
                  };
                  handleUpdateNode(selectedNode, updates);
                  toggleWindow('editNode');
                }}
                className="w-full py-2 bg-neon-blue text-space-900 font-bold rounded hover:brightness-110 transition-all"
              >
                Save Changes
              </button>
            </div>
          </DraggableWindow>
        )}

        {activeWindows.includes('search') && (
          <DraggableWindow title="Search Universe" onClose={() => toggleWindow('search')} defaultPosition={{ x: 50, y: 100 }}>
            <div className="w-72 space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
                <input 
                  type="text" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-space-800 border border-white/10 rounded-full py-2 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-neon-purple"
                  placeholder="Search nodes, tags, content..."
                />
              </div>
              <div className="space-y-2">
                <p className="text-[10px] text-gray-500 uppercase tracking-wider">Recent Searches</p>
                <div className="flex flex-wrap gap-2">
                  <span className="px-2 py-1 bg-white/5 rounded text-xs text-gray-300 hover:bg-white/10 cursor-pointer">3D Models</span>
                  <span className="px-2 py-1 bg-white/5 rounded text-xs text-gray-300 hover:bg-white/10 cursor-pointer">React Architecture</span>
                  <span className="px-2 py-1 bg-white/5 rounded text-xs text-gray-300 hover:bg-white/10 cursor-pointer">Inspiration</span>
                </div>
              </div>
            </div>
          </DraggableWindow>
        )}

        {activeWindows.includes('bookmarks') && (
          <DraggableWindow title="Bookmarks" onClose={() => toggleWindow('bookmarks')} defaultPosition={{ x: 50, y: 200 }}>
            <div className="w-64 space-y-2">
              <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-2">Saved Nodes</p>
              {nodes.slice(0, 3).map(node => (
                <div key={`bm-${node.id}`} className="flex items-center justify-between p-2 bg-white/5 hover:bg-white/10 rounded cursor-pointer transition-colors" onClick={() => {
                  setPan({ x: window.innerWidth / 2 - node.x, y: window.innerHeight / 2 - node.y });
                  setSelectedNode(node.id);
                }}>
                  <div className="flex items-center gap-2 overflow-hidden">
                    <div className={`w-2 h-2 rounded-full ${node.type === 'core' ? 'bg-neon-blue' : node.type === 'image' ? 'bg-neon-pink' : 'bg-neon-purple'}`}></div>
                    <span className="text-xs text-gray-300 truncate">{node.title}</span>
                  </div>
                  <span className="text-[10px] text-gray-500 uppercase">{node.type}</span>
                </div>
              ))}
              <button className="w-full py-2 mt-2 border border-white/10 text-gray-400 text-xs rounded hover:bg-white/5 transition-colors">
                View All Bookmarks
              </button>
            </div>
          </DraggableWindow>
        )}

        {activeWindows.includes('settings') && (
          <DraggableWindow title="Environment Settings" onClose={() => toggleWindow('settings')} defaultPosition={{ x: 100, y: 200 }}>
            <div className="w-72 space-y-6 max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
              <div className="space-y-2">
                <p className="text-[10px] text-gray-500 uppercase tracking-wider">2D Background Theme</p>
                <div className="grid grid-cols-3 gap-2">
                  <div onClick={() => setBgTheme('bg-nebula-gradient')} className={`h-12 rounded bg-gradient-to-br from-space-700 to-space-900 border cursor-pointer ${bgTheme === 'bg-nebula-gradient' ? 'border-neon-blue' : 'border-transparent hover:border-white/30'}`}></div>
                  <div onClick={() => setBgTheme('bg-gradient-to-br from-purple-900 to-black')} className={`h-12 rounded bg-gradient-to-br from-purple-900 to-black border cursor-pointer ${bgTheme === 'bg-gradient-to-br from-purple-900 to-black' ? 'border-neon-blue' : 'border-transparent hover:border-white/30'}`}></div>
                  <div onClick={() => setBgTheme('bg-gradient-to-br from-emerald-900 to-black')} className={`h-12 rounded bg-gradient-to-br from-emerald-900 to-black border cursor-pointer ${bgTheme === 'bg-gradient-to-br from-emerald-900 to-black' ? 'border-neon-blue' : 'border-transparent hover:border-white/30'}`}></div>
                </div>
              </div>

              <div className="space-y-4 border-t border-white/10 pt-4">
                <p className="text-[10px] text-neon-blue uppercase tracking-wider font-bold">3D Environment</p>
                
                <div className="flex items-center justify-between bg-space-800 p-2 rounded">
                  <span className="text-xs text-gray-300">Enable 3D Perspective</span>
                  <div 
                    onClick={() => setIs3D(!is3D)}
                    className={`w-8 h-4 rounded-full relative cursor-pointer transition-colors ${is3D ? 'bg-neon-pink' : 'bg-gray-600'}`}
                  >
                    <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-transform ${is3D ? 'right-1' : 'left-1'}`}></div>
                  </div>
                </div>

                {is3D && (
                  <>
                    <div className="space-y-2">
                      <label className="text-[10px] text-gray-400 uppercase tracking-wider">Skybox Type</label>
                      <select 
                        value={envSettings.skyboxType}
                        onChange={(e) => setEnvSettings({...envSettings, skyboxType: e.target.value as any})}
                        className="w-full bg-space-800 border border-white/10 rounded p-2 text-xs text-white focus:outline-none focus:border-neon-blue"
                      >
                        <option value="none">None</option>
                        <option value="space">Deep Space</option>
                        <option value="city">Cyber City</option>
                        <option value="abstract">Abstract Sunset</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] text-gray-400 uppercase tracking-wider">Background Type</label>
                      <select 
                        value={envSettings.backgroundType}
                        onChange={(e) => setEnvSettings({...envSettings, backgroundType: e.target.value as any})}
                        className="w-full bg-space-800 border border-white/10 rounded p-2 text-xs text-white focus:outline-none focus:border-neon-blue"
                      >
                        <option value="none">None</option>
                        <option value="grid">Cyber Grid</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] text-gray-400 uppercase tracking-wider">Background Color</label>
                      <input 
                        type="color"
                        value={envSettings.backgroundColor}
                        onChange={(e) => setEnvSettings({...envSettings, backgroundColor: e.target.value})}
                        className="w-full h-8 bg-space-800 border border-white/10 rounded cursor-pointer"
                      />
                    </div>

                    <div className="space-y-2 border-t border-white/5 pt-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-300">Enclosed Box</span>
                        <div 
                          onClick={() => setEnvSettings({...envSettings, enclosedBox: !envSettings.enclosedBox})}
                          className={`w-8 h-4 rounded-full relative cursor-pointer transition-colors ${envSettings.enclosedBox ? 'bg-emerald-500' : 'bg-gray-600'}`}
                        >
                          <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-transform ${envSettings.enclosedBox ? 'right-1' : 'left-1'}`}></div>
                        </div>
                      </div>
                      {envSettings.enclosedBox && (
                        <div className="space-y-2 mt-2">
                          <label className="text-[10px] text-gray-400 uppercase tracking-wider flex justify-between">
                            Box Size <span>{envSettings.boxSize}px</span>
                          </label>
                          <input 
                            type="range"
                            min="50"
                            max="500"
                            value={envSettings.boxSize}
                            onChange={(e) => setEnvSettings({...envSettings, boxSize: parseInt(e.target.value)})}
                            className="w-full accent-emerald-500"
                          />
                        </div>
                      )}
                    </div>

                    <div className="mt-2 text-[10px] text-neon-blue space-y-1 bg-space-900/50 p-2 rounded border border-neon-blue/20">
                      <p>• Right-click and drag to look around.</p>
                      <p>• Use W, A, S, D, Q, E to fly through space.</p>
                      <p>• Scroll to zoom/move forward.</p>
                    </div>
                  </>
                )}

                <div className="space-y-2 border-t border-white/10 pt-4">
                  <label className="text-[10px] text-gray-400 uppercase tracking-wider">Universe Management</label>
                  <button 
                    onClick={handleResetUniverse}
                    className="w-full py-2 bg-red-500/20 text-red-500 border border-red-500/50 rounded text-xs font-bold hover:bg-red-500/30 transition-all"
                  >
                    Reset to Default Universe
                  </button>
                </div>
              </div>
            </div>
          </DraggableWindow>
        )}

        <AnimatePresence>
          {contextMenu.visible && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              style={{ top: contextMenu.y, left: contextMenu.x }}
              className="fixed z-[200] w-48 bg-space-900 border border-white/10 rounded-lg shadow-2xl overflow-hidden backdrop-blur-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-1">
                <button 
                  onClick={() => { toggleWindow('addNode'); closeContextMenu(); }}
                  className="w-full flex items-center gap-3 px-3 py-2 text-xs text-gray-300 hover:bg-white/5 hover:text-neon-blue rounded transition-colors"
                >
                  <Plus size={14} /> Add New Node
                </button>
                <button 
                  onClick={() => { toggleWindow('terminal'); closeContextMenu(); }}
                  className="w-full flex items-center gap-3 px-3 py-2 text-xs text-gray-300 hover:bg-white/5 hover:text-neon-blue rounded transition-colors"
                >
                  <Terminal size={14} /> Open AI Terminal
                </button>
                <button 
                  onClick={() => { setIs3D(!is3D); closeContextMenu(); }}
                  className="w-full flex items-center gap-3 px-3 py-2 text-xs text-gray-300 hover:bg-white/5 hover:text-neon-blue rounded transition-colors"
                >
                  <Globe size={14} /> {is3D ? 'Switch to 2D' : 'Switch to 3D'}
                </button>
                <div className="h-px bg-white/5 my-1" />
                <button 
                  onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); closeContextMenu(); }}
                  className="w-full flex items-center gap-3 px-3 py-2 text-xs text-gray-300 hover:bg-white/5 hover:text-neon-blue rounded transition-colors"
                >
                  <Layout size={14} /> Reset View
                </button>
                <button 
                  onClick={() => { toggleWindow('settings'); closeContextMenu(); }}
                  className="w-full flex items-center gap-3 px-3 py-2 text-xs text-gray-300 hover:bg-white/5 hover:text-neon-blue rounded transition-colors"
                >
                  <Settings size={14} /> Settings
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {activeWindows.includes('terminal') && (
            <AITerminal 
              onClose={() => toggleWindow('terminal')}
              nodes={nodes}
              connections={connections}
              onAddNode={(node) => {
                setNodes(prev => prev.some(n => n.id === node.id) ? prev : [...prev, node]);
                socketRef.current?.emit('create-node', node);
              }}
              onDeleteNode={(id) => {
                setNodes(prev => prev.filter(n => n.id !== id));
                setConnections(prev => prev.filter(c => c.source !== id && c.target !== id));
                socketRef.current?.emit('delete-node', id);
              }}
              onUpdateNode={(id, updates) => {
                setNodes(prev => prev.map(n => n.id === id ? { ...n, ...updates } : n));
                socketRef.current?.emit('update-node', { id, updates });
              }}
              onConnectNodes={(source, target) => {
                const conn = { id: `conn-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, source, target };
                setConnections(prev => prev.some(c => c.id === conn.id) ? prev : [...prev, conn]);
                socketRef.current?.emit('create-connection', conn);
              }}
            />
          )}
        </AnimatePresence>
      </AnimatePresence>
    </main>
  );
}
