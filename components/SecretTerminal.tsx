import React, { useState, useRef, useEffect } from 'react';
import { GraphData, ChatMessage } from '../types';
import { askSystemArchitect } from '../services/geminiService';

interface SecretTerminalProps {
  onClose: () => void;
  graphContext: GraphData;
  onMergeData: (data: GraphData) => void;
}

const SecretTerminal: React.FC<SecretTerminalProps> = ({ onClose, graphContext, onMergeData }) => {
  const [input, setInput] = useState('');
  const [history, setHistory] = useState<ChatMessage[]>([
    { id: 'root-0', role: 'system', content: 'ROOT ACCESS GRANTED. WELCOME, USER 1337.\nTHE ARCHITECT IS LISTENING...', timestamp: Date.now() }
  ]);
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [history]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMsg: ChatMessage = { 
      id: `user-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      role: 'user', 
      content: input, 
      timestamp: Date.now() 
    };
    setHistory(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      // Create context string
      const contextSummary = `Total Nodes: ${graphContext.nodes.length}. Root: ${graphContext.nodes[0]?.name || 'Unknown'}. Sample Nodes: ${graphContext.nodes.slice(0, 5).filter(n => n && n.name).map(n => n.name).join(', ')}`;
      
      const response = await askSystemArchitect(userMsg.content, contextSummary);
      
      const sysMsg: ChatMessage = { 
          id: `sys-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          role: 'system', 
          content: response.text, 
          dataPayload: response.dataPayload,
          timestamp: Date.now() 
      };
      setHistory(prev => [...prev, sysMsg]);
    } catch (err) {
      setHistory(prev => [...prev, { 
        id: `err-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        role: 'system', 
        content: 'ERROR: UPLINK FAILED.', 
        timestamp: Date.now() 
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleMerge = (data: GraphData, index: number) => {
     onMergeData(data);
     setHistory(prev => {
         const newHist = [...prev];
         newHist[index] = { ...newHist[index], content: newHist[index].content + '\n\n[ SYSTEM: DATA INTEGRATION SUCCESSFUL ]' };
         // Remove payload so button disappears
         delete newHist[index].dataPayload; 
         return newHist;
     });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-2xl h-[80vh] bg-black border border-green-500 shadow-[0_0_50px_rgba(0,255,0,0.2)] flex flex-col font-mono text-sm md:text-base relative overflow-hidden rounded-lg">
        
        {/* CRT Scanline Effect */}
        <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] z-10 bg-[length:100%_2px,3px_100%]"></div>
        
        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b border-green-500/50 bg-green-900/20 text-green-400">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
            <span className="tracking-widest font-bold">TERMINAL // 1337</span>
          </div>
          <button onClick={onClose} className="hover:text-white transition-colors">
            [ CLOSE_CONNECTION ]
          </button>
        </div>

        {/* Output */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 text-green-300 custom-scrollbar">
          {history.map((msg, i) => (
            <div key={msg.id} className={`flex flex-col ${msg.role === 'user' ? 'items-end text-white' : 'items-start'}`}>
               <div className={`max-w-[90%] p-2 rounded ${msg.role === 'user' ? 'bg-white/10' : 'bg-transparent'}`}>
                  <div className="whitespace-pre-wrap leading-relaxed">
                      <span className="opacity-50 mr-2">
                        {msg.role === 'user' ? '>' : '#'}
                      </span>
                      {(msg.content || '').replace(/```json[\s\S]*?```/, '[ DATA BLOCK RECEIVED ]')}
                  </div>
                  
                  {/* Data Injection Button */}
                  {msg.dataPayload && (
                      <div className="mt-3 p-3 border border-green-500/30 bg-green-900/10 rounded flex flex-col gap-2">
                          <div className="text-xs uppercase opacity-70">Intercepted Data Packet</div>
                          <div className="text-xs">Nodes: {msg.dataPayload.nodes.length} | Links: {msg.dataPayload.links.length}</div>
                          <button 
                             onClick={() => handleMerge(msg.dataPayload!, i)}
                             className="mt-2 bg-green-600 hover:bg-green-500 text-black font-bold py-2 px-4 rounded transition-all hover:shadow-[0_0_15px_#0f0]"
                          >
                             INITIALIZE MERGE SEQUENCE
                          </button>
                      </div>
                  )}
               </div>
            </div>
          ))}
          {loading && (
             <div className="text-green-500 animate-pulse">
                # PROCESSING REQUEST...
             </div>
          )}
        </div>

        {/* Input */}
        <div className="p-4 border-t border-green-500/50 bg-black z-20">
          <form onSubmit={handleSubmit} className="flex gap-2">
            <span className="text-green-500 select-none">{'>'}</span>
            <input 
               ref={inputRef}
               type="text" 
               value={input}
               onChange={e => setInput(e.target.value)}
               className="flex-1 bg-transparent border-none outline-none text-green-400 placeholder-green-800 font-mono"
               placeholder="ENTER COMMAND..."
               autoComplete="off"
            />
          </form>
        </div>
      </div>
    </div>
  );
};

export default SecretTerminal;