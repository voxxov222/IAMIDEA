import React, { useState, useEffect } from 'react';
import { Zap, Image as ImageIcon, Video, Music, Type, RefreshCw, Download, ExternalLink, Sparkles } from 'lucide-react';
import { NodeData } from './NodeElement';

interface PollinationsNodeContentProps {
  node: NodeData;
  onUpdateNode?: (id: string, data: Partial<NodeData>) => void;
}

type GenMode = 'text' | 'image' | 'video' | 'audio';

export function PollinationsNodeContent({ node, onUpdateNode }: PollinationsNodeContentProps) {
  const [mode, setMode] = useState<GenMode>((node as any).pollinationsMode || 'image');
  const [prompt, setPrompt] = useState(node.content || '');
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState(node.url || '');
  const [textResult, setTextResult] = useState((node as any).pollinationsText || '');
  const [model, setModel] = useState((node as any).pollinationsModel || '');

  const apiKey = (import.meta as any).env.VITE_POLLINATIONS_API_KEY || '';

  const handleGenerate = async () => {
    if (!prompt) return;
    setIsGenerating(true);

    try {
      if (mode === 'text') {
        const response = await fetch('https://gen.pollinations.ai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model: model || 'openai',
            messages: [{ role: 'user', content: prompt }]
          })
        });
        const data = await response.json();
        const text = data.choices[0].message.content;
        setTextResult(text);
        if (onUpdateNode) {
          onUpdateNode(node.id, { 
            content: prompt,
            pollinationsText: text,
            pollinationsMode: mode,
            pollinationsModel: model || 'openai'
          } as any);
        }
      } else if (mode === 'image' || mode === 'video') {
        const baseUrl = 'https://gen.pollinations.ai/image';
        const params = new URLSearchParams({
          model: model || (mode === 'video' ? 'veo' : 'flux'),
          width: '1024',
          height: '1024',
          seed: '-1',
          enhance: 'true'
        });
        if (mode === 'video') {
            params.set('duration', '5');
            params.set('aspectRatio', '16:9');
        }
        
        const url = `${baseUrl}/${encodeURIComponent(prompt)}?${params.toString()}${apiKey ? `&key=${apiKey}` : ''}`;
        setResult(url);
        if (onUpdateNode) {
          onUpdateNode(node.id, { 
            url, 
            content: prompt,
            pollinationsMode: mode,
            pollinationsModel: model || (mode === 'video' ? 'veo' : 'flux')
          } as any);
        }
      } else if (mode === 'audio') {
        const baseUrl = 'https://gen.pollinations.ai/audio';
        const url = `${baseUrl}/${encodeURIComponent(prompt)}?voice=nova${apiKey ? `&key=${apiKey}` : ''}`;
        setResult(url);
        if (onUpdateNode) {
          onUpdateNode(node.id, { 
            url, 
            content: prompt,
            pollinationsMode: mode,
            pollinationsModel: 'elevenlabs'
          } as any);
        }
      }
    } catch (error) {
      console.error('Pollinations Generation Error:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="flex flex-col h-full gap-3 p-1">
      <div className="flex gap-1 bg-white/5 p-1 rounded-lg">
        {(['image', 'video', 'audio', 'text'] as GenMode[]).map(m => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`flex-1 flex flex-col items-center justify-center p-2 rounded transition-all ${mode === m ? 'bg-neon-blue/20 text-neon-blue' : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'}`}
          >
            {m === 'image' && <ImageIcon size={14} />}
            {m === 'video' && <Video size={14} />}
            {m === 'audio' && <Music size={14} />}
            {m === 'text' && <Type size={14} />}
            <span className="text-[8px] mt-1 uppercase font-bold">{m}</span>
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-2">
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder={`Describe your ${mode}...`}
          className="w-full bg-black/30 border border-white/10 rounded p-2 text-[10px] text-white focus:outline-none focus:border-neon-blue resize-none h-16 custom-scrollbar"
        />
        
        <div className="flex gap-2">
          <select 
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className="flex-1 bg-black/30 border border-white/10 rounded px-2 py-1 text-[10px] text-gray-400 focus:outline-none focus:border-neon-blue"
          >
            <option value="">Default Model</option>
            {mode === 'text' && (
              <>
                <option value="openai">GPT-5 Mini</option>
                <option value="openai-large">GPT-5.2 (Paid)</option>
                <option value="gemini">Gemini 3 Flash</option>
                <option value="deepseek">DeepSeek V3.2</option>
                <option value="claude">Claude Sonnet 4.6</option>
              </>
            )}
            {mode === 'image' && (
              <>
                <option value="flux">Flux Schnell</option>
                <option value="zimage">Z-Image Turbo</option>
                <option value="grok-imagine">Grok Imagine</option>
                <option value="nanobanana">NanoBanana (Paid)</option>
              </>
            )}
            {mode === 'video' && (
              <>
                <option value="veo">Veo 3.1 Fast</option>
                <option value="wan">Wan 2.6 (Paid)</option>
                <option value="ltx-2">LTX-2</option>
              </>
            )}
          </select>
          
          <button
            onClick={handleGenerate}
            disabled={isGenerating || !prompt}
            className="bg-neon-blue/20 text-neon-blue border border-neon-blue/50 px-3 py-1 rounded text-[10px] font-bold hover:bg-neon-blue/40 disabled:opacity-50 flex items-center gap-1 transition-all"
          >
            {isGenerating ? <RefreshCw size={12} className="animate-spin" /> : <Zap size={12} />}
            {isGenerating ? '...' : 'GEN'}
          </button>
        </div>
      </div>

      <div className="flex-1 bg-black/30 rounded border border-white/5 overflow-hidden relative group">
        {isGenerating ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
            <div className="w-8 h-8 border-2 border-neon-blue border-t-transparent rounded-full animate-spin"></div>
            <span className="text-[8px] text-neon-blue animate-pulse uppercase font-bold tracking-widest">Generating {mode}...</span>
          </div>
        ) : result || textResult ? (
          <div className="w-full h-full p-2 overflow-auto custom-scrollbar">
            {mode === 'text' ? (
              <p className="text-[10px] text-gray-300 leading-relaxed whitespace-pre-wrap">{textResult}</p>
            ) : mode === 'image' ? (
              <img src={result} alt={prompt} className="w-full h-full object-contain rounded" referrerPolicy="no-referrer" />
            ) : mode === 'video' ? (
              <video src={result} controls className="w-full h-full object-contain rounded" />
            ) : mode === 'audio' ? (
              <div className="flex flex-col items-center justify-center h-full gap-2">
                <Music size={24} className="text-neon-blue opacity-50" />
                <audio src={result} controls className="w-full h-8" />
              </div>
            ) : null}
            
            <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              {result && (
                <a href={result} target="_blank" rel="noopener noreferrer" className="p-1 bg-black/50 rounded text-white hover:text-neon-blue">
                  <ExternalLink size={10} />
                </a>
              )}
            </div>
          </div>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-600 gap-2">
            <Sparkles size={20} className="opacity-20" />
            <span className="text-[8px] uppercase font-bold tracking-widest">Ready to Generate</span>
          </div>
        )}
      </div>
    </div>
  );
}
