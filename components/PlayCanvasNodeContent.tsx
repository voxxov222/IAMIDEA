import React, { useEffect, useRef } from 'react';
import * as pc from 'playcanvas';
import { NodeData } from './NodeElement';

interface PlayCanvasNodeContentProps {
  node: NodeData;
  onUpdateNode?: (id: string, data: Partial<NodeData>) => void;
}

export function PlayCanvasNodeContent({ node, onUpdateNode }: PlayCanvasNodeContentProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const appRef = useRef<pc.Application | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    
    // Initialize PlayCanvas
    const app = new pc.Application(canvas, {
        mouse: new pc.Mouse(canvas),
        touch: new pc.TouchDevice(canvas),
        keyboard: new pc.Keyboard(window)
    });
    appRef.current = app;

    app.start();

    // Fill the screen
    app.setCanvasFillMode(pc.FILLMODE_FILL_WINDOW);
    app.setCanvasResolution(pc.RESOLUTION_AUTO);

    // Create a camera
    const camera = new pc.Entity();
    camera.addComponent('camera', {
        clearColor: new pc.Color(0.1, 0.1, 0.1)
    });
    camera.setPosition(0, 0, 3);
    app.root.addChild(camera);

    // Create a light
    const light = new pc.Entity();
    light.addComponent('light');
    app.root.addChild(light);

    // Create a box
    const box = new pc.Entity();
    box.addComponent('model', {
        type: 'box'
    });
    app.root.addChild(box);

    // Update loop
    app.on('update', (dt) => {
        box.rotate(10 * dt, 20 * dt, 30 * dt);
    });

    return () => {
        app.destroy();
    };
  }, []);

  return (
    <div className="w-full h-full bg-black rounded-xl overflow-hidden border border-white/10">
      <canvas ref={canvasRef} className="w-full h-full" />
    </div>
  );
}
