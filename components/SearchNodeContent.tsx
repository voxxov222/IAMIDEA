import React, { useState } from 'react';
import { Search, Globe, Database, Link as LinkIcon, Plus, ArrowLeft, ArrowRight, Home, RefreshCw, ExternalLink } from 'lucide-react';
import { NodeData } from './NodeElement';
import { performWebSearch, WebSearchResult } from '../services/geminiService';

interface SearchNodeContentProps {
  node: NodeData;
  nodes: NodeData[];
  onCreateAndLink?: (sourceId: string, newNode: Partial<NodeData>) => void;
  onLinkExisting?: (sourceId: string, targetId: string) => void;
}

export function SearchNodeContent({ node, nodes, onCreateAndLink, onLinkExisting }: SearchNodeContentProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [webResults, setWebResults] = useState<WebSearchResult[]>([]);
  const [graphResults, setGraphResults] = useState<NodeData[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // Browser state
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  const [useProxy, setUseProxy] = useState(false);

  const handleSearch = async () => {
    if (!searchQuery) return;
    setIsSearching(true);
    setHasSearched(true);
    
    // Local Graph Search
    const local = nodes.filter(n => 
      n.id !== node.id && 
      (n.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
       n.content?.toLowerCase().includes(searchQuery.toLowerCase()))
    ).slice(0, 3);
    setGraphResults(local);

    // Web Search (Google via Gemini)
    try {
      const results = await performWebSearch(searchQuery);
      setWebResults(results);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSearching(false);
    }
  };

  const openUrl = (url: string) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(url);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  const goBack = () => {
    if (historyIndex >= 0) setHistoryIndex(historyIndex - 1);
  };

  const goForward = () => {
    if (historyIndex < history.length - 1) setHistoryIndex(historyIndex + 1);
  };

  const goHome = () => {
    setHistoryIndex(-1);
  };

  const formatUrl = (url?: string) => {
    if (!url) return '';
    if (!url.includes('.') || url.includes(' ')) {
      return `https://www.google.com/search?igu=1&q=${encodeURIComponent(url)}`;
    }
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      return `https://${url}`;
    }
    return url;
  };

  if (historyIndex >= 0) {
    const currentUrl = history[historyIndex];
    const formattedUrl = formatUrl(currentUrl);
    const iframeSrc = useProxy && formattedUrl ? `https://corsproxy.io/?${encodeURIComponent(formattedUrl)}` : formattedUrl;

    return (
      <div className="flex flex-col h-full w-full">
        <div className="flex items-center justify-between mb-2 bg-space-900 border border-white/10 rounded p-1 pointer-events-auto shrink-0">
          <div className="flex items-center gap-1">
            <button onClick={goBack} className={`p-1 rounded ${historyIndex >= 0 ? 'text-gray-300 hover:bg-white/10' : 'text-gray-600'}`} title="Back">
              <ArrowLeft size={12} />
            </button>
            <button onClick={goForward} disabled={historyIndex >= history.length - 1} className={`p-1 rounded ${historyIndex < history.length - 1 ? 'text-gray-300 hover:bg-white/10' : 'text-gray-600'}`} title="Forward">
              <ArrowRight size={12} />
            </button>
            <button onClick={goHome} className="p-1 rounded text-gray-300 hover:bg-white/10" title="Back to Search">
              <Home size={12} />
            </button>
            <button onClick={() => setUseProxy(!useProxy)} className={`p-1 rounded transition-colors ${useProxy ? 'text-emerald-400 hover:bg-emerald-400/20' : 'text-gray-400 hover:bg-white/10'}`} title={useProxy ? "Disable Proxy" : "Try Proxy (if blocked)"}>
              <RefreshCw size={12} />
            </button>
          </div>
          <div className="flex items-center gap-1">
            <a href={formattedUrl} target="_blank" rel="noopener noreferrer" className="p-1 rounded text-gray-400 hover:text-neon-blue hover:bg-white/10" title="Open in new tab">
              <ExternalLink size={12} />
            </a>
            <button
              onClick={() => {
                if (onCreateAndLink) {
                  onCreateAndLink(node.id, {
                    type: 'webpage',
                    title: (currentUrl || '').replace(/^https?:\/\//, '').split('/')[0],
                    url: currentUrl
                  });
                }
              }}
              className="text-[10px] bg-emerald-500/20 text-emerald-400 px-1.5 py-1 rounded hover:bg-emerald-500/30 transition-colors flex items-center gap-1"
              title="Add as linked node"
            >
              <Plus size={10} /> Add Node
            </button>
          </div>
        </div>
        <div className="flex-1 bg-space-900 rounded border border-white/10 overflow-hidden relative pointer-events-auto group" onPointerDownCapture={(e) => e.stopPropagation()} onWheelCapture={(e) => e.stopPropagation()}>
          <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-500 text-xs p-4 text-center opacity-50 group-hover:opacity-100 transition-opacity pointer-events-none z-0">
            <Globe size={24} className="mb-2 opacity-50" />
            <p>If the website refuses to connect, it may block embedding.</p>
            <p className="mt-1">Click the <RefreshCw size={10} className="inline" /> icon to try a proxy, or <ExternalLink size={10} className="inline" /> to open in a new tab.</p>
          </div>
          <iframe 
            key={iframeSrc}
            src={iframeSrc} 
            title="Browser View"
            className="w-full h-full border-0 relative z-10 bg-white/5"
            sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full w-full">
      <div className="flex gap-1 mb-2">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleSearch();
            }
          }}
          onPointerDownCapture={(e) => e.stopPropagation()}
          placeholder="Search web & graph..."
          className="flex-1 bg-space-900 border border-white/10 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-neon-blue pointer-events-auto"
        />
        <button 
          onClick={handleSearch} 
          onPointerDownCapture={(e) => e.stopPropagation()}
          className="bg-neon-purple/20 text-neon-purple px-2 py-1 rounded text-xs hover:bg-neon-purple/40 pointer-events-auto"
          title="AI Search"
        >
          AI
        </button>
        <button 
          onClick={() => {
            if (searchQuery) openUrl(searchQuery);
          }} 
          onPointerDownCapture={(e) => e.stopPropagation()}
          className="bg-neon-blue/20 text-neon-blue px-2 py-1 rounded text-xs hover:bg-neon-blue/40 pointer-events-auto"
          title="Web Search"
        >
          Web
        </button>
      </div>
      
      <div className="space-y-3 overflow-y-auto custom-scrollbar flex-1 pointer-events-auto pb-2" onPointerDownCapture={(e) => e.stopPropagation()} onWheelCapture={(e) => e.stopPropagation()}>
        {isSearching && <div className="text-xs text-gray-400 text-center py-2">Searching...</div>}
        
        {!isSearching && hasSearched && graphResults.length === 0 && webResults.length === 0 && (
          <div className="text-xs text-gray-500 text-center py-2">No results found</div>
        )}

        {graphResults.length > 0 && (
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-[10px] text-neon-purple uppercase tracking-wider font-bold mb-1">
              <Database size={10} /> Local Graph
            </div>
            {graphResults.map((res) => (
              <div key={res.id} className="bg-space-800/80 p-2 rounded border border-white/5 group relative flex items-center justify-between">
                <div className="flex-1 min-w-0 pr-2">
                  <h4 className="text-xs font-bold text-white truncate">{res.title}</h4>
                  <p className="text-[9px] text-gray-400 capitalize">{res.type} Node</p>
                </div>
                <button
                  onClick={() => onLinkExisting && onLinkExisting(node.id, res.id)}
                  className="text-[10px] bg-neon-purple/20 text-neon-purple px-1.5 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 shrink-0"
                  title="Link to this node"
                >
                  <LinkIcon size={10} /> Link
                </button>
              </div>
            ))}
          </div>
        )}

        {webResults.length > 0 && (
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-[10px] text-neon-blue uppercase tracking-wider font-bold mb-1 mt-2">
              <Globe size={10} /> Web Results
            </div>
            {webResults.map((res, i) => (
              <div key={`${res.url}-${i}`} className="bg-space-800/80 p-2 rounded border border-white/5 group relative">
                <div className="flex justify-between items-start mb-1">
                  <h4 
                    className="text-xs font-bold text-white truncate pr-14 cursor-pointer hover:text-neon-blue transition-colors" 
                    dangerouslySetInnerHTML={{ __html: res.title }}
                    onClick={() => openUrl(res.url)}
                    title="Click to explore"
                  ></h4>
                  <button
                    onClick={() => {
                      if (onCreateAndLink) {
                        onCreateAndLink(node.id, {
                          type: 'webpage',
                          title: (res.title || '').replace(/<\/?[^>]+(>|$)/g, ""),
                          content: (res.snippet || '').replace(/<\/?[^>]+(>|$)/g, ""),
                          url: res.url
                        });
                      }
                    }}
                    className="absolute top-1.5 right-1.5 text-[10px] bg-emerald-500/20 text-emerald-400 px-1.5 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity z-10 flex items-center gap-1"
                    title="Add as linked node"
                  >
                    <Plus size={10} /> Add
                  </button>
                </div>
                <p className="text-[9px] text-gray-400 line-clamp-2" dangerouslySetInnerHTML={{ __html: res.snippet }}></p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
