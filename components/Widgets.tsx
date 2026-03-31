import { v4 as uuidv4 } from 'uuid';
import React, { useState, useEffect, useRef } from 'react';
import { DashboardWidget } from '../types';
import { animate } from "motion";
import { Cloud, Sun, CloudRain, Thermometer, Clock as ClockIcon, Cpu, Activity, TrendingUp, Newspaper } from 'lucide-react';

export const WeatherWidget = ({ widget }: { widget: DashboardWidget }) => {
  const [temp, setTemp] = useState(22);
  const [condition, setCondition] = useState('Sunny');

  useEffect(() => {
    const interval = setInterval(() => {
      setTemp(prev => prev + (Math.random() * 2 - 1));
      const conditions = ['Sunny', 'Cloudy', 'Rainy', 'Stormy'];
      setCondition(conditions[Math.floor(Math.random() * conditions.length)]);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="h-full flex flex-col items-center justify-center bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded p-4 text-white">
      <div className="flex items-center gap-4">
        {condition === 'Sunny' && <Sun className="text-yellow-400 animate-spin-slow" size={48} />}
        {condition === 'Cloudy' && <Cloud className="text-gray-300 animate-pulse" size={48} />}
        {condition === 'Rainy' && <CloudRain className="text-blue-400" size={48} />}
        <div className="text-center">
          <div className="text-3xl font-bold">{Math.round(temp)}°C</div>
          <div className="text-xs uppercase tracking-widest text-cyan-400">{condition}</div>
        </div>
      </div>
      <div className="mt-4 flex items-center gap-2 text-[10px] text-gray-400">
        <Thermometer size={12} />
        <span>HUMIDITY: 45%</span>
        <Activity size={12} className="ml-2" />
        <span>WIND: 12km/h</span>
      </div>
    </div>
  );
};

export const ClockWidget = ({ widget }: { widget: DashboardWidget }) => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="h-full flex flex-col items-center justify-center bg-black/40 rounded p-4 font-mono">
      <div className="text-4xl font-bold text-neon-blue tracking-tighter shadow-neon-blue/20 drop-shadow-lg">
        {time.toLocaleTimeString([], { hour12: false })}
      </div>
      <div className="text-[10px] text-gray-500 mt-2 uppercase tracking-[0.3em]">
        {time.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' })}
      </div>
    </div>
  );
};

export const CpuUsageWidget = ({ widget }: { widget: DashboardWidget }) => {
  const [usage, setUsage] = useState<{ id: string, val: number }[]>(
    Array(20).fill(0).map((_, i) => ({ id: `cpu-${i}`, val: 0 }))
  );
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      setUsage(prev => {
        const next = [...prev.slice(1), { id: uuidv4(), val: Math.random() * 100 }];
        return next;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="h-full flex flex-col bg-space-900/50 rounded p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 text-emerald-400">
          <Cpu size={14} />
          <span className="text-[10px] font-bold uppercase">CPU LOAD</span>
        </div>
        <span className="text-xs font-mono text-white">{Math.round(usage[usage.length - 1].val)}%</span>
      </div>
      <div className="flex-1 flex items-end gap-1 h-full">
        {usage.map((u, i) => (
          <div 
            key={u.id} 
            className="flex-1 bg-emerald-500/30 rounded-t-sm transition-all duration-500"
            style={{ height: `${u.val}%`, opacity: 0.3 + (i / usage.length) * 0.7 }}
          />
        ))}
      </div>
    </div>
  );
};

export const NetworkTrafficWidget = ({ widget }: { widget: DashboardWidget }) => {
  const [data, setData] = useState<{ id: string, in: number, out: number }[]>(
    Array(15).fill(0).map((_, i) => ({ id: `net-${i}`, in: 0, out: 0 }))
  );

  useEffect(() => {
    const interval = setInterval(() => {
      setData(prev => [...prev.slice(1), {
        id: uuidv4(),
        in: Math.random() * 80,
        out: Math.random() * 40
      }]);
    }, 1500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="h-full flex flex-col bg-space-900/50 rounded p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 text-neon-purple">
          <Activity size={14} />
          <span className="text-[10px] font-bold uppercase">NETWORK</span>
        </div>
        <div className="flex gap-2 text-[8px]">
          <span className="text-blue-400">IN</span>
          <span className="text-pink-400">OUT</span>
        </div>
      </div>
      <div className="flex-1 relative">
        <div className="absolute inset-0 flex items-end gap-1">
          {data.map((d) => (
            <div key={d.id} className="flex-1 flex flex-col-reverse gap-[1px]">
              <div className="w-full bg-blue-500/40 rounded-sm" style={{ height: `${d.in}%` }} />
              <div className="w-full bg-pink-500/40 rounded-sm" style={{ height: `${d.out}%` }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export const StockTickerWidget = ({ widget }: { widget: DashboardWidget }) => {
  const [stocks] = useState([
    { symbol: 'NEX', price: 420.69, change: 2.5 },
    { symbol: 'GMN', price: 1337.00, change: -1.2 },
    { symbol: 'VEO', price: 88.21, change: 0.8 },
    { symbol: 'AIG', price: 256.12, change: 5.4 }
  ]);

  return (
    <div className="h-full flex flex-col bg-black/40 rounded p-3 overflow-hidden">
      <div className="flex items-center gap-2 text-yellow-500 mb-3">
        <TrendingUp size={14} />
        <span className="text-[10px] font-bold uppercase">MARKET DATA</span>
      </div>
      <div className="space-y-2">
        {stocks.map(stock => (
          <div key={stock.symbol} className="flex items-center justify-between border-b border-white/5 pb-1">
            <span className="text-xs font-bold text-white">{stock.symbol}</span>
            <div className="text-right">
              <div className="text-xs font-mono text-gray-300">${stock.price.toFixed(2)}</div>
              <div className={`text-[8px] font-mono ${stock.change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {stock.change >= 0 ? '+' : ''}{stock.change}%
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export const NewsFeedWidget = ({ widget }: { widget: DashboardWidget }) => {
  const headlines = [
    { id: 'h1', text: "NebulaMind Core Update v5.2 Released" },
    { id: 'h2', text: "Quantum Computing Breakthrough in Sector 7" },
    { id: 'h3', text: "New Galaxy Discovered via AI Telescope" },
    { id: 'h4', text: "Cybersecurity Alert: Nexus Protocol Patch Required" },
    { id: 'h5', text: "Mars Colony Reaches 1 Million Residents" }
  ];

  return (
    <div className="h-full flex flex-col bg-space-900/50 rounded p-3">
      <div className="flex items-center gap-2 text-neon-blue mb-3">
        <Newspaper size={14} />
        <span className="text-[10px] font-bold uppercase">NEWS FEED</span>
      </div>
      <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar">
        {headlines.map((h, i) => (
          <div key={h.id} className="group cursor-pointer">
            <p className="text-[10px] text-gray-300 group-hover:text-neon-blue transition-colors leading-tight">
              {h.text}
            </p>
            <span className="text-[8px] text-gray-600 uppercase">{i + 1}h ago</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export const VideoWidget = ({ widget }: { widget: DashboardWidget }) => (
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
                    className="w-full h-full object-cover opacity-80 pointer-events-auto border-none"
                    allow="autoplay; encrypted-media; picture-in-picture"
                    title={widget.title}
                 />
             ) : (
                 <div className="w-full h-full flex items-center justify-center text-neon-blue/30 font-display text-xs animate-pulse">NO SIGNAL</div>
             )}
         </div>
    </div>
);

export const MetricWidget = ({ widget }: { widget: DashboardWidget }) => {
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

export const LogStreamWidget = ({ widget }: { widget: DashboardWidget }) => {
    const [logs, setLogs] = useState<{ id: string, text: string }[]>([]);
    useEffect(() => {
        const interval = setInterval(() => {
            const actions = ['FETCH', 'DECRYPT', 'SYNC', 'PING', 'BUFFER', 'OPT'];
            const newLog = `[${new Date().toLocaleTimeString().split(' ')[0]}] ${actions[Math.floor(Math.random()*actions.length)]}::${Math.floor(Math.random()*999)}`;
            setLogs(prev => [...prev.slice(-8), { id: uuidv4(), text: newLog }]);
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

export const TaskProgressWidget = ({ widget }: { widget: DashboardWidget }) => {
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

export const NexusVolumeWidget = ({ widget }: { widget: DashboardWidget }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

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

            <div className="grid grid-cols-1 gap-4">
                <div className="glass-panel rounded-xl p-4 flex flex-col gap-4">
                    <div className="flex justify-between items-start">
                         <span className="text-[10px] text-zinc-500 uppercase">Total Volume</span>
                         <span className="text-emerald-500 text-xs">▲</span>
                    </div>
                    <div className="text-xl font-medium text-white tracking-tight text-glow">$4,281,904</div>
                    
                    <div className="space-y-2">
                         {['Time Scale', 'Depth', 'Amplitude'].map((label, i) => (
                             <div key={`nexus-param-${label}`} className="group">
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

                <div className="glass-panel rounded-xl relative min-h-[150px] overflow-hidden flex flex-col">
                    <div className="absolute top-2 left-2 z-10">
                        <div className="text-[8px] text-zinc-500 uppercase">Sector View</div>
                        <div className="text-sm font-medium text-white">Gin Ily <span className="text-cyan-400">215mn</span></div>
                    </div>
                    <canvas ref={canvasRef} className="w-full h-full bg-zinc-950/50" />
                </div>
            </div>
        </div>
    );
};

export const SocketStreamWidget = ({ widget }: { widget: DashboardWidget }) => {
  const [messages, setMessages] = useState<{id: string, text: string}[]>([]);
  
  useEffect(() => {
    // In a real app, we'd connect to the provided URL
    // For this demo, we'll simulate a stream
    const interval = setInterval(() => {
      const newMsg = `[${new Date().toLocaleTimeString()}] DATA_PACKET_${Math.floor(Math.random() * 1000)}: ${Math.random().toFixed(4)}`;
      setMessages(prev => [{ id: uuidv4(), text: newMsg }, ...prev].slice(0, 20));
    }, 1000);
    
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="h-full flex flex-col bg-black/40 rounded p-2 font-mono text-[10px] pointer-events-none">
      <div className="flex items-center justify-between mb-2 border-b border-white/10 pb-1">
        <span className="text-emerald-400 flex items-center gap-1">
          <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div>
          LIVE STREAM
        </span>
        <span className="text-gray-500">ws://nexus.stream</span>
      </div>
      <div className="flex-1 overflow-y-auto space-y-1 custom-scrollbar">
        {messages.map((msg) => (
          <div key={msg.id} className="text-gray-300 border-l border-emerald-500/30 pl-2 truncate">
            {msg.text}
          </div>
        ))}
      </div>
    </div>
  );
};
