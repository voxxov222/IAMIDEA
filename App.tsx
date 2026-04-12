import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Image as ImageIcon, Video, Type, Code, Link as LinkIcon, Search, Settings, X, Sparkles, Globe, Activity, Terminal, Layout, Mic, Zap, Grid as GridIcon, Layers, Trash2, RefreshCw, Music, Box } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { generateProceduralWorld } from './lib/worldGenerator';
import { DraggableWindow } from './components/DraggableWindow';
import { WorldGeneratorWindow } from './components/WorldGeneratorWindow';
import { NodeElement, NodeData, NodeType, MotionType } from './components/NodeElement';
import { Universe3D } from './components/Universe3D';
import { CameraControlsOverlay } from './components/CameraControlsOverlay';
import { io, Socket } from 'socket.io-client';
import { generateZimCode, generateEnvironmentAI } from './services/geminiService';
import { MatrixBackground } from './src/components/MatrixBackground';
import { AITerminal } from './components/AITerminal';
import { SystemStatusMindMap } from './src/components/SystemStatusMindMap';
import { VoiceUplink } from './components/VoiceUplink';
import { GameSandbox } from './components/GameSandbox';
import { AudioGenerator } from './components/AudioGenerator';
import { ObjectPalette } from './components/ObjectPalette';
import { WidgetType, EnvironmentSettings, Connection } from './types';

const DEFAULT_NODES: NodeData[] = [
  { id: 'core-1', type: 'core', title: 'Core Project', x: 500, y: 400 },
  { id: 'img-1', type: 'image', title: 'Visual Concepts v1.2', url: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAj2x5Ews4pBgG7h4nHiLThrYuob8miVR94xy2vgESH2XCntQQCrGub_UyKWJ-5L3ZlADii_51tDN6JWIMY58dk4r8gik80rqutMYLUnvpHmP41Zdu3d8xP4CcoQBl2Tzd4NTxWk6EnGLw2gzZK7KgjZrM4t_uIp1dU6eA974tZO6GgMKjTZSVy1FqFf1T_feq7aCWkhqFXImpIvKqY_-RPA4UvlihapqTuKcE4BUV-0QqkRNUCfrr60_pn9SCN2vXIGxCPwjmkO-Hu', x: 200, y: 300 },
  { id: 'vid-1', type: 'video', title: '3D Animation Techniques', url: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDNNzNeS9UAgaMu3lzrNn2hBmuzm_XOsw17V34-Z3uC8NiwfJ3AEeI9ngWcD8m4Di7__Oqg2-lILYUN7U6yBalBZZQBX8-1Vmxc9GAJnapDkAdsi6RjnsOFi8osV8vd_ZWy0h4jXYieYRRVeq1_CtIWWebR6bRYcAU5_-t9WV0Dqo6AwazkM-Bjh4Fv-WvQY5q6-2SuywzcJ2L8wsj0gpw2I6-e7YEUVWVjYmEPk6PFCtjKpTfmeDcXeL2OHCwMM-ZSkiR8JtE5Nxfm', x: 800, y: 400 },
  { id: 'code-1', type: 'code', title: 'Code Snippet', content: "const universe = {\n  nodes: 42,\n  links: 128,\n  status: 'active'\n};", x: 150, y: 600 },
  { id: 'gif-1', type: 'gif', title: 'Dynamic Texture Reference', x: 450, y: 750 },
  { id: 'zim-1', type: 'zim', title: 'ZIM 3D Interactive', content: "const rect = new Rectangle(200, 200, 'orange', 'white', 4).center().drag();\nrect.animate({props:{rotation:360, rotY:360}, time:4, loop:true, ease:'linear'});\nnew Label('Drag me!', 20, 'Arial', 'white').center(rect).mov(0, 120);", x: 850, y: 700 },
  { id: 'game-1', type: 'game', title: 'IAMGame Engine v0.1', x: 1100, y: 300 },
];

const DEFAULT_CONNECTIONS: Connection[] = [
  { id: 'conn-1', source: 'core-1', target: 'img-1' },
  { id: 'conn-2', source: 'core-1', target: 'vid-1' },
  { id: 'conn-3', source: 'core-1', target: 'code-1' },
  { id: 'conn-4', source: 'core-1', target: 'gif-1' },
  { id: 'conn-5', source: 'core-1', target: 'game-1' },
];

export function App() {
  const [nodes, setNodes] = useState<NodeData[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);

  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [selectedConnection, setSelectedConnection] = useState<string | null>(null);
  const [connectingFrom, setConnectingFrom] = useState<string | null>(null);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeWindows, setActiveWindows] = useState<string[]>([]);
  const [bgTheme, setBgTheme] = useState('bg-nebula-gradient');
  const [envSettings, setEnvSettings] = useState<EnvironmentSettings>({
    backgroundType: 'grid',
    skyboxType: 'space',
    backgroundColor: '#050505',
    gridColor: '#00d2ff',
    enclosedBox: false,
    boxSize: 200,
    boxTextures: {},
    terrain: {
      enabled: false,
      seed: 42,
      scale: 20,
      height: 5,
      color: '#00d2ff',
      wireframe: true,
      animate: false,
      speed: 0.5
    },
    aiPrompt: '',
    terrainFeatures: {
      elevation: 0,
      waterLevel: 0,
      sandCoverage: 0,
      rockCoverage: 0,
      mountainDensity: 0,
      cityDensity: 0,
      roadDensity: 0,
      farmDensity: 0,
      skyscraperDensity: 0
    }
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
  const [newNodeColor, setNewNodeColor] = useState('#10b981');
  const [newNodeWidgetType, setNewNodeWidgetType] = useState<WidgetType>('METRIC');
  const [newNodeMotionType, setNewNodeMotionType] = useState<MotionType>('none');
  const [newNodeMotionTargetId, setNewNodeMotionTargetId] = useState('');
  const [editNodeTitle, setEditNodeTitle] = useState('');
  const [editNodeContent, setEditNodeContent] = useState('');
  const [editNodeUrl, setEditNodeUrl] = useState('');
  const [editNodeMotionType, setEditNodeMotionType] = useState<MotionType>('none');
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
  const [isGeneratingEnv, setIsGeneratingEnv] = useState(false);
  const [envPrompt, setEnvPrompt] = useState('');
  const [isVoiceUplinkOpen, setIsVoiceUplinkOpen] = useState(false);
  const [isAudioGeneratorOpen, setIsAudioGeneratorOpen] = useState(false);

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
    let lastTime = Date.now();

    const loop = () => {
      const now = Date.now();
      const delta = (now - lastTime) / 16.666; // Normalize to 60fps
      lastTime = now;
      const t = now * 0.001;

      setNodes(prevNodes => {
        const hasMotion = prevNodes.some(n => n.motionType && n.motionType !== 'none');
        if (!hasMotion) return prevNodes;

        return prevNodes.map(node => {
          if (!node.motionType || node.motionType === 'none') return node;
          
          const speed = node.motionSpeed || 1;
          const direction = node.motionDirection || 1;
          const mt = t * speed * direction;

          switch (node.motionType) {
            case 'orbit':
              if (node.motionTargetId) {
                const target = prevNodes.find(n => n.id === node.motionTargetId);
                if (target) {
                  const radius = 300; 
                  return {
                    ...node,
                    x: target.x + Math.cos(mt) * radius,
                    y: target.y + Math.sin(mt) * radius
                  };
                }
              }
              break;
            case 'random':
              return {
                ...node,
                x: node.x + (Math.random() - 0.5) * 10 * speed * delta,
                y: node.y + (Math.random() - 0.5) * 10 * speed * delta
              };
            case 'zigzag':
              return {
                ...node,
                x: node.x + Math.sin(mt) * 5 * delta,
                y: node.y + Math.cos(mt * 0.5) * 2 * delta
              };
            case 'pop':
              const popVal = (Math.sin(mt * 2) + 1) / 2;
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
                vx -= dx * 0.0001 * delta;
                vy -= dy * 0.0001 * delta;
              }

              let nx = node.x + vx * delta;
              let ny = node.y + vy * delta;
              
              if (nx < 0 || nx > window.innerWidth) vx *= -1;
              if (ny < 0 || ny > window.innerHeight) vy *= -1;
              
              return {
                ...node,
                x: nx,
                y: ny,
                velocity: { x: vx, y: vy }
              };
            case 'slow_trail':
              const stX = node.x + Math.cos(mt * 0.2) * 2 * speed * delta;
              const stY = node.y + Math.sin(mt * 0.2) * 2 * speed * delta;
              const newTrail = [...(node.trail || []), { x: node.x, y: node.y }].slice(-20);
              return {
                ...node,
                x: stX,
                y: stY,
                trail: newTrail
              };
            case 'figure_eight':
              return {
                ...node,
                x: node.x + Math.sin(mt) * 10 * speed * delta,
                y: node.y + Math.sin(mt * 2) * 5 * speed * delta
              };
            case 'pendulum':
              return {
                ...node,
                x: node.x + Math.sin(mt) * 15 * speed * delta,
                y: node.y + Math.abs(Math.cos(mt)) * 5 * speed * delta
              };
            case 'spiral':
              const spiralRadius = (mt % 10) * 20;
              return {
                ...node,
                x: node.x + Math.cos(mt * 5) * spiralRadius * 0.1 * speed * delta,
                y: node.y + Math.sin(mt * 5) * spiralRadius * 0.1 * speed * delta
              };
            case 'heartbeat':
              const beat = Math.pow(Math.sin(mt * 3), 10);
              return {
                ...node,
                scale: 1 + beat * 0.5
              };
            case 'wave':
              return {
                ...node,
                x: node.x + 2 * speed * delta,
                y: node.y + Math.sin(mt * 5) * 10 * speed * delta
              };
            case 'breathe':
              return {
                ...node,
                scale: 1 + Math.sin(mt * 2) * 0.2
              };
            case 'flicker':
              return {
                ...node,
                opacity: Math.random() > 0.5 ? 1 : 0.3
              };
            case 'glitch':
              if (Math.random() > 0.9) {
                return {
                  ...node,
                  x: node.x + (Math.random() - 0.5) * 50,
                  y: node.y + (Math.random() - 0.5) * 50
                };
              }
              return node;
            case 'orbit_elliptical':
              if (node.motionTargetId) {
                const target = prevNodes.find(n => n.id === node.motionTargetId);
                if (target) {
                  return {
                    ...node,
                    x: target.x + Math.cos(mt) * 400,
                    y: target.y + Math.sin(mt) * 150
                  };
                }
              }
              break;
            case 'spring':
              return {
                ...node,
                y: node.y + Math.sin(mt * 10) * Math.exp(-(mt % 2)) * 20 * speed * delta
              };
            case 'orbit_figure_eight':
              if (node.motionTargetId) {
                const target = prevNodes.find(n => n.id === node.motionTargetId);
                if (target) {
                  return {
                    ...node,
                    x: target.x + Math.sin(mt) * 300,
                    y: target.y + Math.sin(mt * 2) * 150
                  };
                }
              }
              break;
            case 'chase':
              if (node.motionTargetId) {
                const target = prevNodes.find(n => n.id === node.motionTargetId);
                if (target) {
                  const dx = target.x - node.x;
                  const dy = target.y - node.y;
                  return {
                    ...node,
                    x: node.x + dx * 0.05 * speed * delta,
                    y: node.y + dy * 0.05 * speed * delta
                  };
                }
              }
              break;
            case 'flee':
              if (node.motionTargetId) {
                const target = prevNodes.find(n => n.id === node.motionTargetId);
                if (target) {
                  const dx = node.x - target.x;
                  const dy = node.y - target.y;
                  const dist = Math.sqrt(dx * dx + dy * dy);
                  if (dist < 500) {
                    return {
                      ...node,
                      x: node.x + (dx / dist) * 5 * speed * delta,
                      y: node.y + (dy / dist) * 5 * speed * delta
                    };
                  }
                }
              }
              break;
            case 'wander':
              return {
                ...node,
                x: node.x + Math.sin(mt * 0.5) * 5 * speed * delta + Math.cos(mt * 1.2) * 2 * speed * delta,
                y: node.y + Math.cos(mt * 0.7) * 5 * speed * delta + Math.sin(mt * 1.5) * 2 * speed * delta
              };
            case 'pulse_wave':
              return {
                ...node,
                scale: 1 + Math.sin(node.x * 0.01 + mt * 5) * 0.3
              };
            case 'spin_cycle':
              return {
                ...node,
                x: node.x + Math.cos(mt * 5) * 5 * speed * delta,
                y: node.y + Math.sin(mt * 5) * 5 * speed * delta,
                rotationZ: (node.rotationZ || 0) + 5 * speed * delta
              };
            case 'orbit_eccentric':
              if (node.motionTargetId) {
                const target = prevNodes.find(n => n.id === node.motionTargetId);
                if (target) {
                  const r = 200 + Math.sin(mt * 3) * 100;
                  return {
                    ...node,
                    x: target.x + Math.cos(mt) * r,
                    y: target.y + Math.sin(mt) * r
                  };
                }
              }
              break;
            case 'gravity_well': {
              const cx = window.innerWidth / 2;
              const cy = window.innerHeight / 2;
              const gdx = cx - node.x;
              const gdy = cy - node.y;
              const gDist = Math.sqrt(gdx * gdx + gdy * gdy);
              let gvx = node.velocity?.x || 0;
              let gvy = node.velocity?.y || 0;
              if (gDist > 50) {
                gvx += (gdx / gDist) * 0.5 * speed * delta;
                gvy += (gdy / gDist) * 0.5 * speed * delta;
              } else {
                gvx = (Math.random() - 0.5) * 50 * speed;
                gvy = (Math.random() - 0.5) * 50 * speed;
              }
              return {
                ...node,
                x: node.x + gvx * delta,
                y: node.y + gvy * delta,
                velocity: { x: gvx, y: gvy }
              };
            }
            case 'magnetic': {
              let mx = node.x;
              let my = node.y;
              prevNodes.forEach(other => {
                if (other.id !== node.id) {
                  const dx = other.x - node.x;
                  const dy = other.y - node.y;
                  const dist = Math.sqrt(dx * dx + dy * dy);
                  if (dist > 0 && dist < 300) {
                    mx += (dx / dist) * 0.5 * speed * delta;
                    my += (dy / dist) * 0.5 * speed * delta;
                  }
                }
              });
              return { ...node, x: mx, y: my };
            }
            case 'repel': {
              let rx = node.x;
              let ry = node.y;
              prevNodes.forEach(other => {
                if (other.id !== node.id) {
                  const dx = node.x - other.x;
                  const dy = node.y - other.y;
                  const dist = Math.sqrt(dx * dx + dy * dy);
                  if (dist > 0 && dist < 200) {
                    rx += (dx / dist) * 2 * speed * delta;
                    ry += (dy / dist) * 2 * speed * delta;
                  }
                }
              });
              return { ...node, x: rx, y: ry };
            }
            case 'orbit_wobble':
              if (node.motionTargetId) {
                const target = prevNodes.find(n => n.id === node.motionTargetId);
                if (target) {
                  const radius = 300;
                  return {
                    ...node,
                    x: target.x + Math.cos(mt) * radius + Math.sin(mt * 10) * 20,
                    y: target.y + Math.sin(mt) * radius + Math.cos(mt * 10) * 20
                  };
                }
              }
              break;
            case 'tornado':
              const torRadius = (mt % 5) * 50;
              return {
                ...node,
                x: node.x + Math.cos(mt * 10) * torRadius * 0.1 * speed * delta,
                y: node.y - 2 * speed * delta + Math.sin(mt * 10) * torRadius * 0.1 * speed * delta
              };
            case 'float_away':
              return {
                ...node,
                y: node.y - 1 * speed * delta,
                x: node.x + Math.sin(mt) * 2 * speed * delta
              };
            case 'sink':
              return {
                ...node,
                y: node.y + 1 * speed * delta,
                x: node.x + Math.sin(mt) * 2 * speed * delta
              };
            case 'teleport':
              if (Math.random() > 0.98) {
                return {
                  ...node,
                  x: Math.random() * window.innerWidth,
                  y: Math.random() * window.innerHeight
                };
              }
              return node;
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

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setConnectingFrom(null);
        setSelectedNode(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
      setPan({ x: e.clientX - startPan.x, y: e.clientY - startPan.y });
    }
    if (connectingFrom) {
      setMousePos({ x: (e.clientX - pan.x) / zoom, y: (e.clientY - pan.y) / zoom });
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
        const newConn = { id: uuidv4(), source: connectingFrom, target: id };
        setConnections(prev => {
          if (prev.some(c => c.id === newConn.id)) return prev;
          return [...prev, newConn];
        });
        socketRef.current?.emit('create-connection', newConn);
      }
      setConnectingFrom(null);
    } else {
      setSelectedNode(id);
    }
  };

  const handleConnectStart = (id: string, e: React.MouseEvent) => {
    setConnectingFrom(id);
    setMousePos({ x: (e.clientX - pan.x) / zoom, y: (e.clientY - pan.y) / zoom });
  };

  const toggleWindow = (id: string) => {
    setActiveWindows(prev => prev.includes(id) ? prev.filter(w => w !== id) : [...prev, id]);
  };

  const handleCreateAndLink = (sourceId: string, newNodeData: Partial<NodeData>) => {
    const sourceNode = nodes.find(n => n.id === sourceId);
    if (!sourceNode) return;

    const newNode: NodeData = {
      id: uuidv4(),
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
      id: uuidv4(),
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
        id: uuidv4(),
        source: sourceId,
        target: targetId
      };
      setConnections(prev => {
        if (prev.some(c => c.id === newConn.id)) return prev;
        return [...prev, newConn];
      });
      socketRef.current?.emit('create-connection', newConn);
    }
  };

  const handleAddObject = (type: NodeType, shape?: string) => {
    const newNode: NodeData = {
      id: uuidv4(),
      type,
      title: shape ? `New ${shape.charAt(0).toUpperCase() + shape.slice(1)}` : `New ${type.charAt(0).toUpperCase() + type.slice(1)}`,
      x: window.innerWidth / 2 + (Math.random() - 0.5) * 200,
      y: window.innerHeight / 2 + (Math.random() - 0.5) * 200,
      z: (Math.random() - 0.5) * 100,
      shape: shape as any,
      color: type === '3d' ? '#10b981' : undefined,
      scale: 1,
      animationState: 'playing',
      animation: 'none',
      defaultOpen: type === 'zim',
      isFrameVisible: type === 'zim' ? true : undefined
    };
    setNodes(prev => [...prev, newNode]);
    setSelectedNode(newNode.id);
  };

  const handleGenerateEnvironment = async (prompt?: string) => {
    const finalPrompt = prompt || envPrompt;
    if (!finalPrompt.trim() || isGeneratingEnv) return;
    setIsGeneratingEnv(true);
    try {
      const result = await generateEnvironmentAI(finalPrompt);
      if (result.envSettings) {
        setEnvSettings(prev => ({ ...prev, ...result.envSettings }));
      }
      if (result.nodes && Array.isArray(result.nodes)) {
        const newNodes = result.nodes.map(n => ({
          ...n,
          id: uuidv4(),
          x: Math.random() * 1000 - 500,
          y: Math.random() * 1000 - 500,
          z: Math.random() * 1000 - 500,
        }));
        setNodes(prev => [...prev, ...newNodes]);
      }
      if (!prompt) setEnvPrompt('');
    } catch (error) {
      console.error("AI Environment Generation failed:", error);
    } finally {
      setIsGeneratingEnv(false);
    }
  };

  const handleAddNode = () => {
    if (!newNodeTitle) return;
    const newNode: NodeData = {
      id: uuidv4(),
      type: newNodeType,
      title: newNodeTitle,
      content: newNodeContent,
      url: newNodeUrl,
      shape: newNodeShape,
      color: newNodeColor,
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
          id: uuidv4(),
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
            id: uuidv4(),
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
    <>
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
          <>
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
            <CameraControlsOverlay />
          </>
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
              {connectingFrom && (() => {
                const source = nodes.find(n => n.id === connectingFrom);
                if (!source) return null;
                const sx = source.x + (source.type === 'core' ? 64 : 100);
                const sy = source.y + (source.type === 'core' ? 64 : 50);
                
                let tx = mousePos.x;
                let ty = mousePos.y;
                
                if (hoveredNodeId && hoveredNodeId !== connectingFrom) {
                  const target = nodes.find(n => n.id === hoveredNodeId);
                  if (target) {
                    tx = target.x + (target.type === 'core' ? 64 : 100);
                    ty = target.y + (target.type === 'core' ? 64 : 50);
                  }
                }

                return (
                  <line
                    x1={sx}
                    y1={sy}
                    x2={tx}
                    y2={ty}
                    stroke={hoveredNodeId && hoveredNodeId !== connectingFrom ? "rgba(0, 255, 150, 0.8)" : "rgba(0, 210, 255, 0.8)"}
                    strokeWidth="2"
                    strokeDasharray={hoveredNodeId ? "0" : "5,5"}
                    className={hoveredNodeId ? "" : "animate-pulse"}
                    style={{ transform: `translateZ(${source.z || 0}px)` }}
                  />
                );
              })()}
            </svg>
            
            {/* Interactive Nodes Container */}
            {nodes.map(node => {
              const isMatch = searchQuery ? (node.title.toLowerCase().includes(searchQuery.toLowerCase()) || node.content?.toLowerCase().includes(searchQuery.toLowerCase())) : false;
              return (
                <NodeElement 
                  key={node.id}
                  node={node}
                  nodes={nodes}
                  isSelected={selectedNode === node.id || connectingFrom === node.id}
                  isConnectingTarget={connectingFrom !== null && hoveredNodeId === node.id && connectingFrom !== node.id}
                  isMatch={isMatch}
                  onSelect={handleNodeSelect}
                  onDragEnd={handleNodeDragEnd}
                  onConnectStart={handleConnectStart}
                  onCreateAndLink={handleCreateAndLink}
                  onLinkExisting={handleLinkExisting}
                  onDelete={handleDeleteNode}
                  onUpdateNode={handleUpdateNode}
                  onMouseEnter={() => setHoveredNodeId(node.id)}
                  onMouseLeave={() => setHoveredNodeId(null)}
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
            onClick={() => toggleWindow('gameSandbox')}
            className="glass-morphism px-4 py-2 rounded-full text-xs font-bold hover:bg-neon-pink/20 transition-colors border border-neon-pink/50 text-neon-pink hover:shadow-[0_0_15px_rgba(255,0,255,0.4)] flex items-center gap-2"
          >
            <Zap size={12} />
            GAME ENGINE
          </button>
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
                      id: uuidv4(),
                      type: 'text' as const,
                      title: concept.name,
                      content: concept.description,
                      x: node.x + Math.cos((index / result.newConcepts.length) * Math.PI * 2) * 600,
                      y: node.y + Math.sin((index / result.newConcepts.length) * Math.PI * 2) * 600,
                    }));

                    const newConnections = newNodes.map(n => ({
                      id: uuidv4(),
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

      <AudioGenerator 
        isOpen={isAudioGeneratorOpen}
        onClose={() => setIsAudioGeneratorOpen(false)}
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
              <button onClick={() => toggleWindow('worldGen')} className="glass-morphism w-12 h-12 rounded-full flex items-center justify-center hover:bg-emerald-500/20 hover:text-emerald-400 transition-colors group relative">
                <Globe size={20} />
                <span className="absolute right-14 bg-space-900 px-2 py-1 rounded text-[10px] opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap uppercase tracking-widest">World Generator</span>
              </button>
              <button onClick={() => toggleWindow('gameSandbox')} className="glass-morphism w-12 h-12 rounded-full flex items-center justify-center hover:bg-neon-pink/20 hover:text-neon-pink transition-colors group relative">
                <Zap size={20} />
                <span className="absolute right-14 bg-space-900 px-2 py-1 rounded text-[10px] opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap uppercase tracking-widest">Game Sandbox</span>
              </button>
              <button onClick={() => toggleWindow('systemStatus')} className="glass-morphism w-12 h-12 rounded-full flex items-center justify-center hover:bg-green-500/20 hover:text-green-400 transition-colors group relative">
                <Activity size={20} />
                <span className="absolute right-14 bg-space-900 px-2 py-1 rounded text-[10px] opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap uppercase tracking-widest">System Status</span>
              </button>
              <button onClick={() => setIsVoiceUplinkOpen(!isVoiceUplinkOpen)} className={`glass-morphism w-12 h-12 rounded-full flex items-center justify-center transition-colors group relative ${isVoiceUplinkOpen ? 'bg-neon-blue/20 text-neon-blue' : 'hover:bg-neon-blue/20 hover:text-neon-blue'}`}>
                <Mic size={20} />
                <span className="absolute right-14 bg-space-900 px-2 py-1 rounded text-[10px] opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap uppercase tracking-widest">Voice Uplink</span>
              </button>
              <button onClick={() => setIsAudioGeneratorOpen(!isAudioGeneratorOpen)} className={`glass-morphism w-12 h-12 rounded-full flex items-center justify-center transition-colors group relative ${isAudioGeneratorOpen ? 'bg-neon-pink/20 text-neon-pink' : 'hover:bg-neon-pink/20 hover:text-neon-pink'}`}>
                <Music size={20} />
                <span className="absolute right-14 bg-space-900 px-2 py-1 rounded text-[10px] opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap uppercase tracking-widest">Audio Generator</span>
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
        {activeWindows.includes('systemStatus') && (
          <DraggableWindow title="System Status" onClose={() => toggleWindow('systemStatus')} defaultPosition={{ x: 100, y: 100 }}>
            <SystemStatusMindMap />
          </DraggableWindow>
        )}
        {activeWindows.includes('addNode') && (
          <DraggableWindow title="Add Node" onClose={() => toggleWindow('addNode')} defaultPosition={{ x: Math.max(20, window.innerWidth / 2 - 160), y: 150 }}>
            <div className="space-y-4 w-64">
              <div className="flex gap-2 flex-wrap">
                {(['text', 'image', 'video', 'code', 'gif', '3d', 'search', 'webpage', 'embed', 'zim', 'widget', 'pollinations', 'game', 'playcanvas'] as NodeType[]).map(type => (
                  <button 
                    key={`type-${type}`}
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
                    {type === 'pollinations' && <Zap size={16} />}
                    {type === 'game' && <Zap size={16} />}
                    {type === 'playcanvas' && <Box size={16} />}
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
                    <option value="RADAR_SWEEP">Radar Sweep</option>
                    <option value="AUDIO_VISUALIZER">Audio Visualizer</option>
                    <option value="HEART_RATE">Heart Rate</option>
                    <option value="BATTERY_STATUS">Battery Status</option>
                    <option value="MEMORY_USAGE">Memory Usage</option>
                    <option value="DISK_SPACE">Disk Space</option>
                    <option value="SERVER_PING">Server Ping</option>
                    <option value="DOWNLOAD_SPEED">Download Speed</option>
                    <option value="UPLOAD_SPEED">Upload Speed</option>
                    <option value="ACTIVE_USERS">Active Users</option>
                    <option value="REVENUE_CHART">Revenue Chart</option>
                    <option value="CONVERSION_RATE">Conversion Rate</option>
                    <option value="ERROR_RATE">Error Rate</option>
                    <option value="DATABASE_LOAD">Database Load</option>
                    <option value="CACHE_HIT_RATIO">Cache Hit Ratio</option>
                    <option value="API_REQUESTS">API Requests</option>
                    <option value="LATENCY_GRAPH">Latency Graph</option>
                    <option value="UPTIME_COUNTER">Uptime Counter</option>
                    <option value="SECURITY_ALERTS">Security Alerts</option>
                    <option value="THREAT_LEVEL">Threat Level</option>
                    <option value="FIREWALL_STATUS">Firewall Status</option>
                    <option value="ENCRYPTION_STATUS">Encryption Status</option>
                    <option value="VPN_CONNECTION">VPN Connection</option>
                    <option value="SATELLITE_TRACKING">Satellite Tracking</option>
                    <option value="GPS_COORDINATES">GPS Coordinates</option>
                    <option value="COMPASS">Compass</option>
                    <option value="ALTIMETER">Altimeter</option>
                    <option value="SPEEDOMETER">Speedometer</option>
                    <option value="TACHOMETER">Tachometer</option>
                    <option value="FUEL_GAUGE">Fuel Gauge</option>
                    <option value="ENGINE_TEMP">Engine Temp</option>
                    <option value="OIL_PRESSURE">Oil Pressure</option>
                    <option value="GEAR_INDICATOR">Gear Indicator</option>
                    <option value="G_FORCE_METER">G Force Meter</option>
                    <option value="GYROSCOPE">Gyroscope</option>
                    <option value="ACCELEROMETER">Accelerometer</option>
                    <option value="MAGNETIC_FIELD">Magnetic Field</option>
                    <option value="LIGHT_SENSOR">Light Sensor</option>
                    <option value="PROXIMITY_SENSOR">Proximity Sensor</option>
                    <option value="PRESSURE_SENSOR">Pressure Sensor</option>
                    <option value="HUMIDITY_SENSOR">Humidity Sensor</option>
                    <option value="CO2_LEVEL">CO2 Level</option>
                    <option value="AIR_QUALITY">Air Quality</option>
                    <option value="RADIATION_LEVEL">Radiation Level</option>
                    <option value="SEISMIC_ACTIVITY">Seismic Activity</option>
                    <option value="SOLAR_FLARE">Solar Flare</option>
                    <option value="LUNAR_PHASE">Lunar Phase</option>
                    <option value="TIDE_LEVEL">Tide Level</option>
                    <option value="WIND_DIRECTION">Wind Direction</option>
                    <option value="PRECIPITATION_PROB">Precipitation Prob</option>
                  </select>
                </div>
              )}
              
              {newNodeType === '3d' && (
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-2">
                    <label className="text-[10px] text-gray-400 uppercase tracking-wider">Shape</label>
                    <select 
                      value={newNodeShape}
                      onChange={(e) => setNewNodeShape(e.target.value as any)}
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
                    <label className="text-[10px] text-gray-400 uppercase tracking-wider">Color</label>
                    <input 
                      type="color"
                      value={newNodeColor}
                      onChange={(e) => setNewNodeColor(e.target.value)}
                      className="w-full h-9 bg-space-800 border border-white/10 rounded cursor-pointer"
                    />
                  </div>
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
                        { name: 'Perspective', code: 'new Perspective({layers:[new Rectangle(W,H,blue), new Circle(100,red).center()], depth:.5}).center().drag();' },
                        { name: 'Animation', code: 'new Circle(100, pink).center().animate({props:{scale:1.5}, time:1, loop:true, rewind:true});' },
                        { name: 'Events', code: 'new Rectangle(200, 200, blue).center().tap(e => { e.target.color = e.target.color == blue ? green : blue; S.update(); });' },
                        { name: '3D Spin', code: 'new Rectangle(200, 200, orange).center().drag().animate({props:{rotY:360, rotX:360}, time:5, loop:true, ease:"linear"});' },
                        { name: '3D Cube', code: 'new Box(150, 150, 150, green).center().drag();' }
                      ].map((template, i) => (
                        <button
                          key={`template-${i}`}
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
                  <option value="figure_eight">Figure Eight</option>
                  <option value="pendulum">Pendulum</option>
                  <option value="spiral">Spiral</option>
                  <option value="heartbeat">Heartbeat</option>
                  <option value="wave">Wave</option>
                  <option value="breathe">Breathe</option>
                  <option value="flicker">Flicker</option>
                  <option value="glitch">Glitch</option>
                  <option value="orbit_elliptical">Elliptical Orbit</option>
                  <option value="spring">Spring</option>
                  <option value="orbit_figure_eight">Figure-8 Orbit</option>
                  <option value="chase">Chase Target</option>
                  <option value="flee">Flee Target</option>
                  <option value="wander">Wander</option>
                  <option value="pulse_wave">Pulse Wave</option>
                  <option value="spin_cycle">Spin Cycle</option>
                  <option value="orbit_eccentric">Eccentric Orbit</option>
                  <option value="gravity_well">Gravity Well</option>
                  <option value="magnetic">Magnetic</option>
                  <option value="repel">Repel</option>
                  <option value="orbit_wobble">Wobble Orbit</option>
                  <option value="tornado">Tornado</option>
                  <option value="float_away">Float Away</option>
                  <option value="sink">Sink</option>
                  <option value="teleport">Teleport</option>
                </select>
              </div>

              {['orbit', 'orbit_elliptical', 'orbit_figure_eight', 'chase', 'flee', 'orbit_eccentric', 'orbit_wobble'].includes(newNodeMotionType) && (
                <div className="space-y-2">
                  <label className="text-[10px] text-gray-400 uppercase tracking-wider">Orbit Around</label>
                  <select 
                    value={newNodeMotionTargetId}
                    onChange={(e) => setNewNodeMotionTargetId(e.target.value)}
                    className="w-full bg-space-800 border border-white/10 rounded p-2 text-sm text-white focus:outline-none focus:border-neon-blue"
                  >
                    <option value="">Select Node...</option>
                    {nodes.map(n => (
                      <option key={`opt-${n.id}`} value={n.id}>{n.title}</option>
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
                            { name: 'TextureActive', code: 'new TextureActive({width:W, height:H, color:pink, corner:20}).center();\nnew Circle(100, blue).center(prev).drag();' },
                            { name: 'Shader', code: 'new Shader(W, H, `\nprecision mediump float;\nuniform float time;\nuniform vec2 resolution;\nvoid main() {\n    vec2 uv = gl_FragCoord.xy / resolution.xy;\n    gl_FragColor = vec4(uv.x, uv.y, sin(time), 1.0);\n}`).center();' },
                            { name: 'Synth', code: 'const synth = new Synth();\nnew Dial().center().change(e=>{synth.play(e.target.value*10+200);});' },
                            { name: 'Perspective', code: 'new Perspective({layers:[new Rectangle(W,H,blue), new Circle(100,red).center()], depth:.5}).center().drag();' },
                            { name: 'Animation', code: 'new Circle(100, pink).center().animate({props:{scale:1.5}, time:1, loop:true, rewind:true});' },
                            { name: 'Events', code: 'new Rectangle(200, 200, blue).center().tap(e => { e.target.color = e.target.color == blue ? green : blue; S.update(); });' },
                            { name: '3D Spin', code: 'new Rectangle(200, 200, orange).center().drag().animate({props:{rotY:360, rotX:360}, time:5, loop:true, ease:"linear"});' },
                            { name: '3D Cube', code: 'new Box(150, 150, 150, green).center().drag();' }
                          ].map((template, i) => (
                            <button
                              key={`edit-template-${i}`}
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
                    <option value="figure_eight">Figure Eight</option>
                    <option value="pendulum">Pendulum</option>
                    <option value="spiral">Spiral</option>
                    <option value="heartbeat">Heartbeat</option>
                    <option value="wave">Wave</option>
                    <option value="breathe">Breathe</option>
                    <option value="flicker">Flicker</option>
                    <option value="glitch">Glitch</option>
                    <option value="orbit_elliptical">Elliptical Orbit</option>
                    <option value="spring">Spring</option>
                    <option value="orbit_figure_eight">Figure-8 Orbit</option>
                    <option value="chase">Chase Target</option>
                    <option value="flee">Flee Target</option>
                    <option value="wander">Wander</option>
                    <option value="pulse_wave">Pulse Wave</option>
                    <option value="spin_cycle">Spin Cycle</option>
                    <option value="orbit_eccentric">Eccentric Orbit</option>
                    <option value="gravity_well">Gravity Well</option>
                    <option value="magnetic">Magnetic</option>
                    <option value="repel">Repel</option>
                    <option value="orbit_wobble">Wobble Orbit</option>
                    <option value="tornado">Tornado</option>
                    <option value="float_away">Float Away</option>
                    <option value="sink">Sink</option>
                    <option value="teleport">Teleport</option>
                  </select>
                </div>

                {['orbit', 'orbit_elliptical', 'orbit_figure_eight', 'chase', 'flee', 'orbit_eccentric', 'orbit_wobble'].includes(editNodeMotionType) && (
                  <div className="space-y-2">
                    <label className="text-[10px] text-gray-400 uppercase tracking-wider">Orbit Around</label>
                    <select 
                      value={editNodeMotionTargetId}
                      onChange={(e) => setEditNodeMotionTargetId(e.target.value)}
                      className="w-full bg-space-800 border border-white/10 rounded p-2 text-sm text-white focus:outline-none focus:border-neon-blue"
                    >
                      <option value="">Select Node...</option>
                      {nodes.filter(n => n.id !== selectedNode).map(n => (
                        <option key={`edit-opt-${n.id}`} value={n.id}>{n.title}</option>
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

        {activeWindows.includes('worldGen') && (
          <DraggableWindow title="World Generator" onClose={() => toggleWindow('worldGen')} defaultPosition={{ x: 50, y: 50 }}>
            <WorldGeneratorWindow 
              onClose={() => toggleWindow('worldGen')} 
              onUpdateEnv={(envSettings, nodes) => {
                if (envSettings) {
                  setEnvSettings(prev => ({ ...prev, ...envSettings }));
                }
                if (nodes && Array.isArray(nodes)) {
                  const newNodes = nodes.map(n => ({
                    ...n,
                    id: uuidv4(),
                    x: Math.random() * 1000 - 500,
                    y: Math.random() * 1000 - 500,
                    z: Math.random() * 1000 - 500,
                  }));
                  setNodes(prev => [...prev, ...newNodes]);
                }
              }} 
              onAddNodes={(nodes, connections) => {
                const newNodes = nodes.map(n => ({
                  ...n,
                  id: uuidv4(),
                  x: Math.random() * 1000 - 500,
                  y: Math.random() * 1000 - 500,
                  z: Math.random() * 1000 - 500,
                }));
                setNodes(prev => [...prev, ...newNodes]);
                
                const newConnections = connections.map(c => {
                  const sourceNode = newNodes.find(n => n.title === c.sourceTitle);
                  const targetNode = newNodes.find(n => n.title === c.targetTitle);
                  return {
                    id: uuidv4(),
                    source: sourceNode?.id || '',
                    target: targetNode?.id || '',
                  };
                }).filter(c => c.source && c.target);
                
                setConnections(prev => [...prev, ...newConnections]);
              }}
            />
            <p className="text-[10px] text-gray-400 uppercase tracking-wider">Procedural Universe Creation</p>
            <div className="grid grid-cols-2 gap-2">
              <button 
                onClick={() => {
                  const { nodes: newNodes, connections: newConns } = generateProceduralWorld('grid', 16);
                  setNodes(prev => {
                    const combined = [...prev, ...newNodes];
                    return Array.from(new Map(combined.map(n => [n.id, n])).values());
                  });
                  setConnections(prev => {
                    const combined = [...prev, ...newConns];
                    return Array.from(new Map(combined.map(c => [c.id, c])).values());
                  });
                  // Sync with server
                  newNodes.forEach(n => socketRef.current?.emit('create-node', n));
                  newConns.forEach(c => socketRef.current?.emit('create-connection', c));
                }}
                className="flex flex-col items-center gap-2 p-3 bg-white/5 hover:bg-neon-blue/20 border border-white/10 hover:border-neon-blue/50 rounded transition-all group"
              >
                <GridIcon size={24} className="text-gray-400 group-hover:text-neon-blue" />
                <span className="text-[10px] text-gray-300 uppercase">Grid Matrix</span>
              </button>
              
              <button 
                onClick={() => {
                  const { nodes: newNodes, connections: newConns } = generateProceduralWorld('sphere', 24);
                  setNodes(prev => {
                    const combined = [...prev, ...newNodes];
                    return Array.from(new Map(combined.map(n => [n.id, n])).values());
                  });
                  setConnections(prev => {
                    const combined = [...prev, ...newConns];
                    return Array.from(new Map(combined.map(c => [c.id, c])).values());
                  });
                  // Sync with server
                  newNodes.forEach(n => socketRef.current?.emit('create-node', n));
                  newConns.forEach(c => socketRef.current?.emit('create-connection', c));
                }}
                className="flex flex-col items-center gap-2 p-3 bg-white/5 hover:bg-neon-purple/20 border border-white/10 hover:border-neon-purple/50 rounded transition-all group"
              >
                <Globe size={24} className="text-gray-400 group-hover:text-neon-purple" />
                <span className="text-[10px] text-gray-300 uppercase">Orbital Sphere</span>
              </button>
              
              <button 
                onClick={() => {
                  const { nodes: newNodes, connections: newConns } = generateProceduralWorld('fractal', 1);
                  setNodes(prev => {
                    const combined = [...prev, ...newNodes];
                    return Array.from(new Map(combined.map(n => [n.id, n])).values());
                  });
                  setConnections(prev => {
                    const combined = [...prev, ...newConns];
                    return Array.from(new Map(combined.map(c => [c.id, c])).values());
                  });
                  // Sync with server
                  newNodes.forEach(n => socketRef.current?.emit('create-node', n));
                  newConns.forEach(c => socketRef.current?.emit('create-connection', c));
                }}
                className="flex flex-col items-center gap-2 p-3 bg-white/5 hover:bg-neon-pink/20 border border-white/10 hover:border-neon-pink/50 rounded transition-all group"
              >
                <Layers size={24} className="text-gray-400 group-hover:text-neon-pink" />
                <span className="text-[10px] text-gray-300 uppercase">Fractal Tree</span>
              </button>
              
              <button 
                onClick={() => {
                  const { nodes: newNodes, connections: newConns } = generateProceduralWorld('random', 15);
                  setNodes(prev => {
                    const combined = [...prev, ...newNodes];
                    return Array.from(new Map(combined.map(n => [n.id, n])).values());
                  });
                  setConnections(prev => {
                    const combined = [...prev, ...newConns];
                    return Array.from(new Map(combined.map(c => [c.id, c])).values());
                  });
                  // Sync with server
                  newNodes.forEach(n => socketRef.current?.emit('create-node', n));
                  newConns.forEach(c => socketRef.current?.emit('create-connection', c));
                }}
                className="flex flex-col items-center gap-2 p-3 bg-white/5 hover:bg-emerald-500/20 border border-white/10 hover:border-emerald-500/50 rounded transition-all group"
              >
                <Zap size={24} className="text-gray-400 group-hover:text-emerald-400" />
                <span className="text-[10px] text-gray-300 uppercase">Chaos Cluster</span>
              </button>
            </div>

            <div className="p-3 bg-space-900/50 rounded border border-white/5 text-[10px] text-gray-400 italic">
              Procedural generation uses mathematical algorithms to create complex structures instantly.
            </div>

            <button 
              onClick={handleResetUniverse}
              className="w-full py-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 text-[10px] uppercase tracking-widest rounded transition-colors flex items-center justify-center gap-2"
            >
              <Trash2 size={12} />
              Purge All Nodes
            </button>
          </DraggableWindow>
        )}

        {activeWindows.includes('bookmarks') && (
          <DraggableWindow title="Bookmarks" onClose={() => toggleWindow('bookmarks')} defaultPosition={{ x: 50, y: 200 }}>
            <div className="w-64 space-y-2">
              <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-2">Saved Nodes</p>
              {nodes.slice(0, 3).map(node => (
                <div key={`bookmark-${node.id}`} className="flex items-center justify-between p-2 bg-white/5 hover:bg-white/10 rounded cursor-pointer transition-colors" onClick={() => {
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
              {/* Object Library Section */}
              <div className="pt-4 border-t border-white/10">
                <ObjectPalette onAddObject={handleAddObject} />
              </div>

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
                        <option value="cyberpunk">Cyberpunk Night</option>
                        <option value="vaporwave">Vaporwave</option>
                        <option value="minimalist">Minimalist</option>
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

                    {envSettings.backgroundType === 'grid' && (
                      <div className="space-y-2">
                        <label className="text-[10px] text-gray-400 uppercase tracking-wider">Grid Color</label>
                        <input 
                          type="color"
                          value={envSettings.gridColor || '#00d2ff'}
                          onChange={(e) => setEnvSettings({...envSettings, gridColor: e.target.value})}
                          className="w-full h-8 bg-space-800 border border-white/10 rounded cursor-pointer"
                        />
                      </div>
                    )}

                    <div className="space-y-4 border-t border-white/5 pt-4">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-neon-blue font-bold uppercase tracking-wider">Terrain Generator</span>
                        <div 
                          onClick={() => setEnvSettings({
                            ...envSettings, 
                            terrain: { ...(envSettings.terrain || { enabled: false, seed: 42, scale: 20, height: 5, color: "#00d2ff", wireframe: true, animate: false, speed: 0.5 }), enabled: !envSettings.terrain?.enabled }
                          })}
                          className={`w-8 h-4 rounded-full relative cursor-pointer transition-colors ${envSettings.terrain?.enabled ? 'bg-neon-blue' : 'bg-gray-600'}`}
                        >
                          <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-transform ${envSettings.terrain?.enabled ? 'right-1' : 'left-1'}`}></div>
                        </div>
                      </div>

                      {envSettings.terrain?.enabled && (
                        <div className="space-y-3 pl-2 border-l border-neon-blue/20">
                          <div className="space-y-1">
                            <label className="text-[10px] text-gray-400 uppercase tracking-wider flex justify-between">
                              Seed <span>{envSettings.terrain.seed}</span>
                            </label>
                            <input 
                              type="range"
                              min="1"
                              max="1000"
                              value={envSettings.terrain.seed}
                              onChange={(e) => setEnvSettings({
                                ...envSettings,
                                terrain: { ...envSettings.terrain!, seed: parseInt(e.target.value) }
                              })}
                              className="w-full accent-neon-blue"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-[10px] text-gray-400 uppercase tracking-wider flex justify-between">
                              Scale <span>{envSettings.terrain.scale}</span>
                            </label>
                            <input 
                              type="range"
                              min="5"
                              max="100"
                              value={envSettings.terrain.scale}
                              onChange={(e) => setEnvSettings({
                                ...envSettings,
                                terrain: { ...envSettings.terrain!, scale: parseInt(e.target.value) }
                              })}
                              className="w-full accent-neon-blue"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-[10px] text-gray-400 uppercase tracking-wider flex justify-between">
                              Height <span>{envSettings.terrain.height}</span>
                            </label>
                            <input 
                              type="range"
                              min="1"
                              max="50"
                              value={envSettings.terrain.height}
                              onChange={(e) => setEnvSettings({
                                ...envSettings,
                                terrain: { ...envSettings.terrain!, height: parseInt(e.target.value) }
                              })}
                              className="w-full accent-neon-blue"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-[10px] text-gray-400 uppercase tracking-wider">Terrain Color</label>
                            <input 
                              type="color"
                              value={envSettings.terrain.color}
                              onChange={(e) => setEnvSettings({
                                ...envSettings,
                                terrain: { ...envSettings.terrain!, color: e.target.value }
                              })}
                              className="w-full h-6 bg-space-800 border border-white/10 rounded cursor-pointer"
                            />
                          </div>

                          <div className="flex items-center justify-between">
                            <span className="text-[10px] text-gray-400 uppercase tracking-wider">Wireframe</span>
                            <div 
                              onClick={() => setEnvSettings({
                                ...envSettings,
                                terrain: { ...envSettings.terrain!, wireframe: !envSettings.terrain!.wireframe }
                              })}
                              className={`w-8 h-4 rounded-full relative cursor-pointer transition-colors ${envSettings.terrain.wireframe ? 'bg-neon-pink' : 'bg-gray-600'}`}
                            >
                              <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-transform ${envSettings.terrain.wireframe ? 'right-1' : 'left-1'}`}></div>
                            </div>
                          </div>

                          <div className="flex items-center justify-between">
                            <span className="text-[10px] text-gray-400 uppercase tracking-wider">Animate</span>
                            <div 
                              onClick={() => setEnvSettings({
                                ...envSettings,
                                terrain: { ...envSettings.terrain!, animate: !envSettings.terrain!.animate }
                              })}
                              className={`w-8 h-4 rounded-full relative cursor-pointer transition-colors ${envSettings.terrain.animate ? 'bg-emerald-500' : 'bg-gray-600'}`}
                            >
                              <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-transform ${envSettings.terrain.animate ? 'right-1' : 'left-1'}`}></div>
                            </div>
                          </div>

                          {envSettings.terrain.animate && (
                            <div className="space-y-1">
                              <label className="text-[10px] text-gray-400 uppercase tracking-wider flex justify-between">
                                Animation Speed <span>{envSettings.terrain.speed}</span>
                              </label>
                              <input 
                                type="range"
                                min="0.1"
                                max="2"
                                step="0.1"
                                value={envSettings.terrain.speed}
                                onChange={(e) => setEnvSettings({
                                  ...envSettings,
                                  terrain: { ...envSettings.terrain!, speed: parseFloat(e.target.value) }
                                })}
                                className="w-full accent-neon-blue"
                              />
                            </div>
                          )}
                        </div>
                      )}
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

                    <div className="space-y-4 border-t border-white/5 pt-4">
                      <p className="text-[10px] text-neon-pink font-bold uppercase tracking-wider">Procedural World Gen</p>
                      <div className="grid grid-cols-2 gap-2">
                        <button 
                          onClick={() => {
                            const { nodes: newNodes, connections: newConns } = generateProceduralWorld('grid', 25);
                            setNodes(newNodes);
                            setConnections(newConns);
                          }}
                          className="py-2 bg-space-800 border border-white/10 rounded text-[10px] text-gray-300 hover:border-neon-pink hover:text-white transition-all"
                        >
                          Grid Matrix
                        </button>
                        <button 
                          onClick={() => {
                            const { nodes: newNodes, connections: newConns } = generateProceduralWorld('sphere', 30);
                            setNodes(newNodes);
                            setConnections(newConns);
                          }}
                          className="py-2 bg-space-800 border border-white/10 rounded text-[10px] text-gray-300 hover:border-neon-pink hover:text-white transition-all"
                        >
                          Orbital Sphere
                        </button>
                        <button 
                          onClick={() => {
                            const { nodes: newNodes, connections: newConns } = generateProceduralWorld('fractal', 3);
                            setNodes(newNodes);
                            setConnections(newConns);
                          }}
                          className="py-2 bg-space-800 border border-white/10 rounded text-[10px] text-gray-300 hover:border-neon-pink hover:text-white transition-all"
                        >
                          Fractal Tree
                        </button>
                        <button 
                          onClick={() => {
                            const { nodes: newNodes, connections: newConns } = generateProceduralWorld('random', 20);
                            setNodes(newNodes);
                            setConnections(newConns);
                          }}
                          className="py-2 bg-space-800 border border-white/10 rounded text-[10px] text-gray-300 hover:border-neon-pink hover:text-white transition-all"
                        >
                          Chaos Cluster
                        </button>
                      </div>
                    </div>

                    {/* AI Environment Generation */}
                    <div className="space-y-2 pt-4 border-t border-white/10">
                      <p className="text-[10px] text-neon-blue uppercase tracking-wider font-bold">AI Environment Generator</p>
                      <textarea
                        value={envSettings.aiPrompt || ''}
                        onChange={(e) => setEnvSettings({...envSettings, aiPrompt: e.target.value})}
                        placeholder="Describe your environment (e.g., 'A desert landscape with a river and a small city')"
                        className="w-full bg-space-800 border border-white/10 rounded p-2 text-xs text-white focus:outline-none focus:border-neon-blue"
                        rows={3}
                      />
                      <button
                        onClick={() => handleGenerateEnvironment(envSettings.aiPrompt)}
                        className="w-full py-2 bg-neon-blue/20 text-neon-blue border border-neon-blue/30 rounded text-xs font-bold hover:bg-neon-blue/30 transition-all"
                      >
                        Generate Environment
                      </button>
                    </div>

                    {/* Terrain Features */}
                    <div className="space-y-4 pt-4 border-t border-white/10">
                      <p className="text-[10px] text-neon-pink uppercase tracking-wider font-bold">Terrain Features</p>
                      {Object.keys(envSettings.terrainFeatures || {}).map((feature) => (
                        <div key={feature} className="space-y-1">
                          <label className="text-[10px] text-gray-400 uppercase tracking-wider flex justify-between capitalize">
                            {feature.replace(/([A-Z])/g, ' $1')} <span>{envSettings.terrainFeatures?.[feature as keyof typeof envSettings.terrainFeatures]}</span>
                          </label>
                          <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.1"
                            value={envSettings.terrainFeatures?.[feature as keyof typeof envSettings.terrainFeatures] || 0}
                            onChange={(e) => setEnvSettings({
                              ...envSettings,
                              terrainFeatures: {
                                ...envSettings.terrainFeatures!,
                                [feature]: parseFloat(e.target.value)
                              }
                            })}
                            className="w-full accent-neon-pink"
                          />
                        </div>
                      ))}
                    </div>

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

        {activeWindows.includes('gameSandbox') && (
          <DraggableWindow 
            title="IAMGame Engine Sandbox" 
            onClose={() => toggleWindow('gameSandbox')} 
            defaultPosition={{ x: 50, y: 50 }}
          >
            <div className="w-[1100px] h-[700px]">
              <GameSandbox />
            </div>
          </DraggableWindow>
        )}

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
                onClick={() => { toggleWindow('gameSandbox'); closeContextMenu(); }}
                className="w-full flex items-center gap-3 px-3 py-2 text-xs text-gray-300 hover:bg-white/5 hover:text-neon-pink rounded transition-colors"
              >
                <Zap size={14} /> Game Engine Sandbox
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
              const conn = { id: uuidv4(), source, target };
              setConnections(prev => prev.some(c => c.id === conn.id) ? prev : [...prev, conn]);
              socketRef.current?.emit('create-connection', conn);
            }}
            onGenerateEnvironment={handleGenerateEnvironment}
          />
        )}
      </AnimatePresence>
    </main>
    <motion.button
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
      onClick={() => toggleWindow('gameSandbox')}
      className="fixed bottom-6 right-6 z-[100] w-14 h-14 bg-neon-pink rounded-full shadow-lg shadow-neon-pink/20 flex items-center justify-center text-white border border-white/20"
      title="Open Game Engine Sandbox"
    >
      <Zap size={24} fill="currentColor" />
    </motion.button>
  </>
);
}
