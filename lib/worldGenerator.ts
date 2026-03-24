import { NodeData } from '../components/NodeElement';
import { Connection } from '../types';
import { v4 as uuidv4 } from 'uuid';

export const generateProceduralWorld = (type: 'grid' | 'sphere' | 'fractal' | 'random', count: number = 20) => {
  const nodes: NodeData[] = [];
  const connections: Connection[] = [];
  const centerX = window.innerWidth / 2;
  const centerY = window.innerHeight / 2;

  switch (type) {
    case 'grid': {
      const size = Math.ceil(Math.sqrt(count));
      const spacing = 150;
      for (let i = 0; i < count; i++) {
        const x = (i % size) * spacing + (centerX - (size * spacing) / 2);
        const y = Math.floor(i / size) * spacing + (centerY - (size * spacing) / 2);
        const node: NodeData = {
          id: uuidv4(),
          title: `Node ${i}`,
          type: 'text',
          x,
          y,
          z: (Math.random() - 0.5) * 200,
          opacity: 1
        };
        nodes.push(node);
        
        // Connect to neighbors
        if (i % size > 0) {
          connections.push({ id: uuidv4(), source: nodes[i-1].id, target: node.id });
        }
        if (i >= size) {
          connections.push({ id: uuidv4(), source: nodes[i-size].id, target: node.id });
        }
      }
      break;
    }
    case 'sphere': {
      const radius = 300;
      for (let i = 0; i < count; i++) {
        const phi = Math.acos(-1 + (2 * i) / count);
        const theta = Math.sqrt(count * Math.PI) * phi;
        
        const x = centerX + radius * Math.sin(phi) * Math.cos(theta);
        const y = centerY + radius * Math.sin(phi) * Math.sin(theta);
        const z = radius * Math.cos(phi);
        
        const node: NodeData = {
          id: uuidv4(),
          title: `Sphere Node ${i}`,
          type: 'text',
          x,
          y,
          z,
          opacity: 1
        };
        nodes.push(node);
        
        // Connect to previous
        if (i > 0) {
          connections.push({ id: uuidv4(), source: nodes[i-1].id, target: node.id });
        }
      }
      break;
    }
    case 'fractal': {
      const createFractal = (px: number, py: number, pz: number, depth: number, parentId?: string) => {
        if (depth <= 0) return;
        
        const node: NodeData = {
          id: uuidv4(),
          title: `Fractal ${depth}`,
          type: 'text',
          x: px,
          y: py,
          z: pz,
          opacity: 1
        };
        nodes.push(node);
        
        if (parentId) {
          connections.push({ id: uuidv4(), source: parentId, target: node.id });
        }
        
        const branches = 3;
        const dist = depth * 100;
        for (let i = 0; i < branches; i++) {
          const angle = (i / branches) * Math.PI * 2;
          createFractal(
            px + Math.cos(angle) * dist,
            py + Math.sin(angle) * dist,
            pz + (Math.random() - 0.5) * dist,
            depth - 1,
            node.id
          );
        }
      };
      createFractal(centerX, centerY, 0, 3);
      break;
    }
    case 'random': {
      for (let i = 0; i < count; i++) {
        const node: NodeData = {
          id: uuidv4(),
          title: `Random Node ${i}`,
          type: 'text',
          x: Math.random() * window.innerWidth,
          y: Math.random() * window.innerHeight,
          z: (Math.random() - 0.5) * 500,
          opacity: 1
        };
        nodes.push(node);
        
        if (i > 0 && Math.random() > 0.5) {
          connections.push({ id: uuidv4(), source: nodes[Math.floor(Math.random() * i)].id, target: node.id });
        }
      }
      break;
    }
  }

  return { nodes, connections };
};
