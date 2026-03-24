import React, { useState, useRef, useEffect } from 'react';
import { Terminal, X, Maximize2, Minimize2, Play, Package, Plus, Link as LinkIcon, Trash2, Search, Sparkles, Minus, Code2 } from 'lucide-react';
import { motion, AnimatePresence, useDragControls } from 'framer-motion';
import { processTerminalCommand, TerminalAction } from '../services/geminiService';
import { Connection } from '../types';
import { NodeData } from './NodeElement';

interface AITerminalProps {
  onClose: () => void;
  nodes: NodeData[];
  connections: Connection[];
  onAddNode: (node: NodeData) => void;
  onDeleteNode: (id: string) => void;
  onUpdateNode: (id: string, updates: Partial<NodeData>) => void;
  onConnectNodes: (sourceId: string, targetId: string) => void;
}

interface TerminalMessage {
  id: string;
  role: 'user' | 'system' | 'ai';
  content: string;
  timestamp: number;
  actions?: TerminalAction[];
}

export const AITerminal: React.FC<AITerminalProps> = ({ 
  onClose, nodes, connections, onAddNode, onDeleteNode, onUpdateNode, onConnectNodes 
}) => {
  const [input, setInput] = useState('');
  const [history, setHistory] = useState<TerminalMessage[]>([
    { id: 'msg-init', role: 'system', content: 'NEBULA OS v4.2.0 - TERMINAL INITIALIZED\nUPLINK ESTABLISHED WITH GEMINI 3.1 PRO (LATEST MODEL)\nTYPE "HELP" FOR COMMANDS OR TALK TO THE ARCHITECT.', timestamp: Date.now() }
  ]);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [viewMode, setViewMode] = useState<'terminal' | 'editor'>('terminal');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const msgCounter = useRef(Date.now());
  const dragControls = useDragControls();

  const generateId = () => {
    return `msg-${msgCounter.current++}-${Math.random().toString(36).substring(2, 11)}`;
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [history]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleAction = (action: TerminalAction) => {
    if (!action.payload) return;
    
    switch (action.type) {
      case 'ADD_NODE':
        const newNode: NodeData = {
          id: `node-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          type: (action.payload.type || 'text') as any,
          title: action.payload.title || 'New Node',
          content: action.payload.content || '',
          url: action.payload.url || '',
          x: Math.random() * (window.innerWidth - 200) + 100,
          y: Math.random() * (window.innerHeight - 200) + 100,
          shape: action.payload.shape || 'sphere',
          widgetType: action.payload.widgetType,
        };
        onAddNode(newNode);
        setHistory(prev => [...prev, { 
          id: generateId(),
          role: 'system', 
          content: `[ SYSTEM ] NODE CREATED: ${newNode.title} (${newNode.type})`, 
          timestamp: Date.now() 
        }]);
        break;
      case 'DELETE_NODE':
        if (action.payload.id) onDeleteNode(action.payload.id);
        break;
      case 'UPDATE_NODE':
        if (action.payload.id) {
          onUpdateNode(action.payload.id, action.payload);
          setHistory(prev => [...prev, { 
            id: generateId(),
            role: 'system', 
            content: `[ SYSTEM ] NODE UPDATED: ${action.payload.id}`, 
            timestamp: Date.now() 
          }]);
        }
        break;
      case 'CONNECT_NODES':
        if (action.payload.sourceId && action.payload.targetId) {
          onConnectNodes(action.payload.sourceId, action.payload.targetId);
        }
        break;
      case 'INSTALL_PACKAGE':
        // Simulated installation
        const pkgName = action.payload.name || 'unknown-package';
        setHistory(prev => [...prev, { 
          id: generateId(),
          role: 'system', 
          content: `[ NPM ] INSTALLING ${pkgName}...\n[ NPM ] ADDED 1 PACKAGE, AND AUDITED 124 PACKAGES IN 3s\n[ NPM ] SUCCESS: ${pkgName} IS NOW AVAILABLE IN THE WORKSPACE.`, 
          timestamp: Date.now() 
        }]);
        break;
      case 'CLEAR_TERMINAL':
        setHistory([{ id: `msg-clear-${Date.now()}`, role: 'system', content: 'TERMINAL CLEARED BY ARCHITECT.', timestamp: Date.now() }]);
        break;
      default:
        console.log('Unhandled action:', action);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMsg: TerminalMessage = { 
      id: generateId(),
      role: 'user', 
      content: input, 
      timestamp: Date.now() 
    };
    setHistory(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    // Built-in commands
    const cmd = input.trim().toLowerCase();
    if (cmd === 'help') {
      setHistory(prev => [...prev, { 
        id: generateId(),
        role: 'system', 
        content: 'AVAILABLE COMMANDS:\n- HELP: SHOW THIS MENU\n- CLEAR: CLEAR TERMINAL HISTORY\n- NODES: LIST ALL NODES\n- CONNS: LIST ALL CONNECTIONS\n- EXIT: CLOSE TERMINAL\n\nOR JUST TALK TO THE ARCHITECT TO PERFORM COMPLEX TASKS.', 
        timestamp: Date.now() 
      }]);
      setIsLoading(false);
      return;
    } else if (cmd === 'clear') {
      setHistory([{ id: `msg-clear-${Date.now()}`, role: 'system', content: 'TERMINAL CLEARED.', timestamp: Date.now() }]);
      setIsLoading(false);
      return;
    } else if (cmd === 'nodes') {
      const nodeInfo = nodes.map(n => `[${n.id}] ${n.title} (${n.type})`).join('\n');
      setHistory(prev => [...prev, { 
        id: generateId(),
        role: 'system', 
        content: `ACTIVE NODES:\n${nodeInfo || 'NONE'}`, 
        timestamp: Date.now() 
      }]);
      setIsLoading(false);
      return;
    } else if (cmd === 'exit') {
      onClose();
      return;
    }

    try {
      const context = `Current Nodes: ${nodes.length}. Current Connections: ${connections.length}.`;
      const response = await processTerminalCommand(input, context);
      
      const aiMsg: TerminalMessage = { 
        id: generateId(),
        role: 'ai', 
        content: response.text, 
        timestamp: Date.now(),
        actions: response.actions
      };
      
      setHistory(prev => [...prev, aiMsg]);
      
      // Auto-execute actions
      response.actions.forEach(handleAction);
      
    } catch (err) {
      setHistory(prev => [...prev, { 
        id: generateId(),
        role: 'system', 
        content: 'ERROR: ARCHITECT OFFLINE.', 
        timestamp: Date.now() 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.div 
      drag={!isExpanded}
      dragControls={dragControls}
      dragListener={false}
      dragMomentum={false}
      initial={{ opacity: 0, scale: 0.9, x: window.innerWidth - 550, y: window.innerHeight - 450 }}
      animate={{ 
        opacity: 1, 
        scale: 1, 
        x: isExpanded ? 0 : undefined,
        y: isExpanded ? 0 : undefined,
        width: isExpanded ? 'calc(100% - 32px)' : '500px',
        height: isMinimized ? '48px' : isExpanded ? 'calc(100% - 32px)' : '400px',
        top: isExpanded ? '16px' : undefined,
        left: isExpanded ? '16px' : undefined,
      }}
      exit={{ opacity: 0, scale: 0.9 }}
      className={`fixed z-[100] bg-space-950 border border-neon-blue/30 shadow-[0_0_50px_rgba(0,210,255,0.2)] rounded-lg overflow-hidden flex flex-col font-mono transition-all duration-300`}
    >
      {/* Header */}
      <div 
        onPointerDown={(e) => !isExpanded && dragControls.start(e)}
        className={`bg-space-900 p-3 border-b border-white/10 flex items-center justify-between select-none ${!isExpanded ? 'cursor-move' : ''}`}
      >
        <div className="flex items-center gap-2">
          <Terminal size={16} className="text-neon-blue" />
          <span className="text-xs font-bold tracking-widest text-gray-300 uppercase">System Terminal // Architect AI</span>
        </div>
        <div className="flex gap-4 pointer-events-auto">
          <button 
            onClick={() => setViewMode(viewMode === 'terminal' ? 'editor' : 'terminal')}
            className={`text-[10px] flex items-center gap-1 transition-colors ${viewMode === 'editor' ? 'text-yellow-400' : 'text-neon-blue hover:text-white'}`}
            title={viewMode === 'terminal' ? 'Switch to Code Editor' : 'Switch to Terminal'}
          >
            <Code2 size={12} /> {viewMode === 'terminal' ? 'EDITOR' : 'TERMINAL'}
          </button>
          <button 
            onClick={() => setInput('Create a ZIMjs Perspective node with 3 layers of depth')}
            className="text-[10px] text-neon-blue hover:text-white transition-colors flex items-center gap-1"
          >
            <Sparkles size={10} /> PERSPECTIVE
          </button>
          <button onClick={() => setIsMinimized(!isMinimized)} className="p-1 hover:bg-white/10 rounded text-gray-400 transition-colors">
            <Minus size={14} />
          </button>
          <button onClick={() => { setIsExpanded(!isExpanded); setIsMinimized(false); }} className="p-1 hover:bg-white/10 rounded text-gray-400 transition-colors">
            {isExpanded ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
          </button>
          <button onClick={onClose} className="p-1 hover:bg-red-500/20 hover:text-red-400 rounded text-gray-400 transition-colors">
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Output Area & Input Area */}
      {!isMinimized && (
        <>
          {viewMode === 'terminal' ? (
            <>
              <div 
                ref={scrollRef}
                className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar bg-black/40"
              >
                {history.map((msg) => (
                  <div key={msg.id} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                    <div className={`max-w-[90%] p-2 rounded text-sm ${
                      msg.role === 'user' ? 'bg-neon-blue/10 text-neon-blue border border-neon-blue/20' : 
                      msg.role === 'ai' ? 'text-emerald-400' : 
                      'text-gray-400 italic'
                    }`}>
                      <div className="flex items-center gap-2 mb-1 opacity-50 text-[10px]">
                        <span>{msg.role === 'user' ? 'USER' : msg.role === 'ai' ? 'ARCHITECT' : 'SYSTEM'}</span>
                        <span>•</span>
                        <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                      </div>
                      <div className="whitespace-pre-wrap leading-relaxed">
                        {msg.role === 'user' && <span className="mr-2 text-neon-blue font-bold">{'>'}</span>}
                        {msg.content}
                      </div>
                      
                      {/* Action Badges */}
                      {msg.actions && msg.actions.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {msg.actions.map((action, ai) => (
                            <div key={`${msg.id}-action-${ai}`} className="flex items-center gap-1 bg-white/5 border border-white/10 px-2 py-0.5 rounded text-[10px] uppercase font-bold text-white/70">
                              {action.type === 'INSTALL_PACKAGE' && <Package size={10} className="text-neon-blue" />}
                              {action.type === 'ADD_NODE' && <Plus size={10} className="text-emerald-400" />}
                              {action.type === 'DELETE_NODE' && <Trash2 size={10} className="text-red-400" />}
                              {action.type === 'CONNECT_NODES' && <LinkIcon size={10} className="text-neon-purple" />}
                              {action.type === 'SEARCH_WEB' && <Search size={10} className="text-orange-400" />}
                              {action.type === 'EXECUTE_CODE' && <Play size={10} className="text-yellow-400" />}
                              <span>{(action.type || '').replace('_', ' ')}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {isLoading && (
                  <div className="flex items-center gap-2 text-neon-blue animate-pulse text-sm">
                    <Sparkles size={14} />
                    <span>ARCHITECT IS PROCESSING...</span>
                  </div>
                )}
              </div>

              {/* Input Area */}
              <div className="p-4 bg-space-900 border-t border-white/10">
                <form onSubmit={handleSubmit} className="flex items-center gap-3">
                  <span className="text-neon-blue font-bold select-none">{'>'}</span>
                  <input 
                    ref={inputRef}
                    type="text"
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    className="flex-1 bg-transparent border-none outline-none text-white placeholder-gray-600 font-mono text-sm"
                    placeholder="TYPE COMMAND OR MESSAGE..."
                    autoComplete="off"
                  />
                  <div className="flex items-center gap-2 text-[10px] text-gray-500 uppercase tracking-widest font-bold">
                    <span className="animate-pulse">Online</span>
                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>
                  </div>
                </form>
              </div>
            </>
          ) : (
            <div className="flex-1 bg-black relative">
              <iframe 
                src="https://zimjs.com/editor/view/Z_Q7CMJ" 
                className="w-full h-full border-none"
                title="ZIM Code Editor"
                allow="accelerometer; border-radius; camera; encrypted-media; geolocation; gyroscope; microphone; midi; picture-in-picture; usb; xr-spatial-tracking"
                sandbox="allow-forms allow-modals allow-popups allow-presentation allow-same-origin allow-scripts"
              />
              <div className="absolute bottom-4 right-4 flex gap-2">
                <button 
                  onClick={() => setViewMode('terminal')}
                  className="bg-neon-blue/20 hover:bg-neon-blue/40 border border-neon-blue/50 text-neon-blue px-3 py-1 rounded text-[10px] font-bold backdrop-blur-md transition-all"
                >
                  RETURN TO TERMINAL
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </motion.div>
  );
};
