import React, { useEffect, useRef } from 'react';

const WaveformMonitor: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let time = 0;
    
    const draw = () => {
        // Resize
        const width = canvas.parentElement?.clientWidth || 300;
        const height = canvas.parentElement?.clientHeight || 200;
        canvas.width = width;
        canvas.height = height;

        // Clear
        ctx.fillStyle = "rgba(5, 5, 16, 0.8)";
        ctx.fillRect(0, 0, width, height);

        // Grid
        ctx.strokeStyle = "rgba(0, 243, 255, 0.1)";
        ctx.lineWidth = 1;
        
        // Vertical grid lines
        for(let x = 0; x < width; x += 30) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, height);
            ctx.stroke();
        }
        // Horizontal grid lines
        for(let y = 0; y < height; y += 30) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
            ctx.stroke();
        }

        const centerY = height / 2;
        
        // Draw Wave 1 (Red/Orange - High Frequency)
        ctx.beginPath();
        ctx.strokeStyle = "#ff4d00"; // Neon Orange/Red
        ctx.lineWidth = 2;
        ctx.shadowBlur = 10;
        ctx.shadowColor = "#ff4d00";
        
        for (let x = 0; x < width; x++) {
            // Math function: Composite Sine Wave
            // y = sin(x + t) * envelope
            const normalizedX = x / width;
            const signal = Math.sin((x * 0.05) + (time * 0.1)) 
                         * Math.sin((x * 0.1) + (time * 0.2)) // Beat frequency
                         + Math.sin((x * 0.02) - (time * 0.05)) * 0.5; // Carrier
            
            // Random glitch
            const glitch = Math.random() > 0.98 ? (Math.random() - 0.5) * 50 : 0;
            
            const y = centerY + (signal * (height * 0.3)) + glitch;
            if(x === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Draw Wave 2 (Cyan - Low Frequency/Control)
        ctx.beginPath();
        ctx.strokeStyle = "#00f3ff"; // Neon Cyan
        ctx.lineWidth = 2;
        ctx.shadowBlur = 5;
        ctx.shadowColor = "#00f3ff";

        for (let x = 0; x < width; x++) {
            const signal = Math.cos((x * 0.03) + (time * 0.08)) 
                         * Math.sin((x * 0.01) + (time * 0.01)); 
            
            // Square wave approximation
            const squareish = Math.sign(Math.sin((x * 0.05) + time * 0.05)) * 0.2;

            const y = centerY + (signal * (height * 0.2)) + (squareish * 20);
             if(x === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.stroke();

        // UI Labels
        ctx.font = "10px Rajdhani";
        ctx.fillStyle = "rgba(0, 243, 255, 0.7)";
        ctx.fillText("SIGNAL AMPLITUDE (a.u.)", 10, centerY - 10);
        
        ctx.fillStyle = "rgba(255, 77, 0, 0.7)";
        ctx.fillText("FREQ_MOD_A", 10, height - 10);
        
        time += 1;
        requestAnimationFrame(draw);
    };

    draw();

    return () => {};
  }, []);

  return (
    <div className="w-full h-full relative rounded border border-neon-blue/30 overflow-hidden bg-black/50 backdrop-blur-sm">
        {/* Corner Accents */}
        <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-neon-blue"></div>
        <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-neon-blue"></div>
        <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-neon-blue"></div>
        <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-neon-blue"></div>
        
        <canvas ref={canvasRef} className="w-full h-full block" />
    </div>
  );
};

export default WaveformMonitor;