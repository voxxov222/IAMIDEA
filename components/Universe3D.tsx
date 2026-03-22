import React, { useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Html, OrbitControls, Grid, Line, Stars, Sphere, Box, Cylinder, Torus, Cone, Environment } from '@react-three/drei';
import { NodeElement, NodeData } from './NodeElement';
import * as THREE from 'three';
import { EnvironmentSettings } from '../types';

interface Connection {
  id: string;
  source: string;
  target: string;
}

interface Universe3DProps {
  nodes: NodeData[];
  connections: Connection[];
  selectedNode: string | null;
  connectingFrom: string | null;
  searchQuery: string;
  envSettings: EnvironmentSettings;
  onSelect: (id: string) => void;
  onDragEnd: (id: string, x: number, y: number) => void;
  onConnectStart: (id: string, e: React.MouseEvent) => void;
  onCreateAndLink: (sourceId: string, newNode: Partial<NodeData>) => void;
  onLinkExisting: (sourceId: string, targetId: string) => void;
  onDelete: (id: string) => void;
  onUpdateNode: (id: string, data: Partial<NodeData>) => void;
}

const Skybox = ({ settings }: { settings: EnvironmentSettings }) => {
  if (settings.skyboxType === 'none') return null;
  
  if (settings.skyboxType === 'space') return <Stars radius={300} depth={60} count={20000} factor={7} saturation={0} fade speed={1} />;
  
  if (settings.skyboxType === 'city') return <Environment preset="city" background />;
  
  if (settings.skyboxType === 'abstract') return <Environment preset="sunset" background />;

  return null;
};

const EnclosedBox = ({ settings }: { settings: EnvironmentSettings }) => {
  if (!settings.enclosedBox) return null;

  const size = settings.boxSize || 200;
  
  return (
    <Box args={[size, size, size]} position={[0, 0, 0]}>
      <meshStandardMaterial 
        color={settings.backgroundColor || "#111"} 
        side={THREE.BackSide} 
        transparent 
        opacity={0.9}
        metalness={0.5}
        roughness={0.2}
      />
    </Box>
  );
};

const Node3D = ({ node, nodes, isSelected, isMatch, onSelect, onDragEnd, onConnectStart, onCreateAndLink, onLinkExisting, onDelete, onUpdateNode }: any) => {
  const meshRef = useRef<THREE.Group>(null);
  
  useFrame((state) => {
    if (!meshRef.current) return;

    const time = state.clock.getElapsedTime();

    // Handle Motion (Movement in space)
    if (node.motionType && node.motionType !== 'none') {
      const speed = node.motionSpeed || 1;
      const direction = node.motionDirection || 1;
      const t = time * speed * direction;

      switch (node.motionType) {
        case 'orbit':
          if (node.motionTargetId) {
            const target = nodes.find((n: NodeData) => n.id === node.motionTargetId);
            if (target) {
              const scale = 0.05;
              const tx = (target.x - window.innerWidth / 2) * scale;
              const ty = -(target.y - window.innerHeight / 2) * scale;
              const tz = (target.z || 0) * scale;
              
              const radius = 10;
              meshRef.current.position.x = tx + Math.cos(t) * radius;
              meshRef.current.position.z = tz + Math.sin(t) * radius;
              meshRef.current.position.y = ty;
            }
          }
          break;
        case 'random':
          meshRef.current.position.x += (Math.random() - 0.5) * 0.1 * speed;
          meshRef.current.position.y += (Math.random() - 0.5) * 0.1 * speed;
          meshRef.current.position.z += (Math.random() - 0.5) * 0.1 * speed;
          break;
        case 'zigzag':
          meshRef.current.position.x += Math.sin(t) * 0.1;
          meshRef.current.position.y += Math.cos(t * 0.5) * 0.05;
          break;
        case 'pop':
          const popVal = (Math.sin(t * 2) + 1) / 2;
          meshRef.current.scale.setScalar(node.scale || 1 * (0.5 + popVal * 0.5));
          break;
        case 'bounce':
          const boxSize = 15;
          if (!node.velocity) {
            node.velocity = { 
              x: (Math.random() - 0.5) * 0.1 * speed, 
              y: (Math.random() - 0.5) * 0.1 * speed, 
              z: (Math.random() - 0.5) * 0.1 * speed 
            };
          }
          
          // Add a slight centripetal force to make it "elliptical"
          const dist3d = Math.sqrt(
            meshRef.current.position.x ** 2 + 
            meshRef.current.position.y ** 2 + 
            meshRef.current.position.z ** 2
          );
          
          if (dist3d > boxSize) {
            node.velocity.x -= meshRef.current.position.x * 0.001;
            node.velocity.y -= meshRef.current.position.y * 0.001;
            node.velocity.z -= meshRef.current.position.z * 0.001;
          }

          meshRef.current.position.x += node.velocity.x;
          meshRef.current.position.y += node.velocity.y;
          meshRef.current.position.z += node.velocity.z;

          if (Math.abs(meshRef.current.position.x) > boxSize * 1.5) node.velocity.x *= -1;
          if (Math.abs(meshRef.current.position.y) > boxSize * 1.5) node.velocity.y *= -1;
          if (Math.abs(meshRef.current.position.z) > boxSize * 1.5) node.velocity.z *= -1;
          break;
        case 'slow_trail':
          meshRef.current.position.x += Math.cos(t * 0.2) * 0.05 * speed;
          meshRef.current.position.y += Math.sin(t * 0.2) * 0.05 * speed;
          meshRef.current.position.z += Math.sin(t * 0.3) * 0.05 * speed;
          
          // Update trail data for 3D
          if (!node.trail) node.trail = [];
          node.trail.push({ x: meshRef.current.position.x, y: meshRef.current.position.y, z: meshRef.current.position.z });
          if (node.trail.length > 20) node.trail.shift();
          break;
      }
    }

    // Handle Animation (Visual effect)
    if (node.animationState !== 'playing') return;
    
    switch (node.animation) {
      case 'spin':
        meshRef.current.rotation.y += 0.05;
        break;
      case 'orbit':
        meshRef.current.position.x += Math.cos(time * 2) * 0.1;
        meshRef.current.position.z += Math.sin(time * 2) * 0.1;
        break;
      case 'dance':
        meshRef.current.position.y += Math.sin(time * 5) * 0.05;
        meshRef.current.rotation.z = Math.sin(time * 3) * 0.2;
        break;
      case 'jiggle':
        const s = 1 + Math.sin(time * 20) * 0.05;
        meshRef.current.scale.set(s, s, s);
        break;
      case 'bounce':
        meshRef.current.position.y += Math.abs(Math.sin(time * 5)) * 0.1;
        break;
      case 'rocket':
        meshRef.current.position.y += 0.2;
        if (meshRef.current.position.y > 50) meshRef.current.position.y = -50;
        break;
      case 'explode':
        const es = meshRef.current.scale.x + 0.02;
        meshRef.current.scale.set(es, es, es);
        if (es > 3) meshRef.current.scale.set(1, 1, 1);
        break;
      case 'blackhole':
        const bs = Math.max(0.1, meshRef.current.scale.x - 0.01);
        meshRef.current.scale.set(bs, bs, bs);
        meshRef.current.rotation.y += 0.2;
        if (bs <= 0.1) meshRef.current.scale.set(1, 1, 1);
        break;
      case 'random':
        meshRef.current.rotation.x += Math.random() * 0.05;
        meshRef.current.rotation.y += Math.random() * 0.05;
        break;
    }
  });

  const scale = 0.05;
  const position: [number, number, number] = [
    (node.x - window.innerWidth / 2) * scale,
    -(node.y - window.innerHeight / 2) * scale,
    (node.z || 0) * scale
  ];
  
  const rotation: [number, number, number] = [
    (node.rotationX || 0) * Math.PI / 180,
    (node.rotationY || 0) * Math.PI / 180,
    (node.rotationZ || 0) * Math.PI / 180
  ];

  return (
    <group ref={meshRef} position={position} rotation={rotation} scale={node.scale || 1}>
      <group onClick={() => onSelect(node.id)}>
        {isSelected && (
          <Sphere args={[5, 32, 32]}>
            <meshStandardMaterial 
              color="#00f3ff" 
              transparent 
              opacity={0.3} 
              emissive="#00f3ff" 
              emissiveIntensity={2} 
              side={THREE.BackSide}
            />
          </Sphere>
        )}
        {/* 3D Geometry removed as per user request */}
        
        {node.type === '3d' ? (
          <Html distanceFactor={10} position={[0, 4, 0]}>
            <div className="bg-space-900/80 px-2 py-1 rounded border border-emerald-500/50 text-[10px] text-emerald-400 whitespace-nowrap">
              {node.title}
            </div>
          </Html>
        ) : (
          <Html 
            transform 
            distanceFactor={10}
            position={[0, 0, 0.1]} // Slightly in front of the mesh center
            style={{ 
              pointerEvents: 'auto',
              userSelect: 'none'
            }}
          >
            <div 
              style={{ 
                transform: 'translate(-50%, -50%)',
                pointerEvents: 'auto'
              }}
              onPointerDown={(e) => e.stopPropagation()}
            >
              <NodeElement 
                node={node}
                nodes={nodes}
                isSelected={isSelected}
                isMatch={isMatch}
                disableDrag={true}
                onSelect={onSelect}
                onDragEnd={onDragEnd}
                onConnectStart={onConnectStart}
                onCreateAndLink={onCreateAndLink}
                onLinkExisting={onLinkExisting}
                onDelete={onDelete}
                onUpdateNode={onUpdateNode}
              />
            </div>
          </Html>
        )}
      </group>
    </group>
  );
};

const Connections3D = ({ connections, nodes }: { connections: Connection[], nodes: NodeData[] }) => {
  const scale = 0.05;
  
  return (
    <group>
      {connections.map(conn => {
        const source = nodes.find(n => n.id === conn.source);
        const target = nodes.find(n => n.id === conn.target);
        if (!source || !target) return null;

        const sx = (source.x - window.innerWidth / 2 + (source.type === 'core' ? 64 : 100)) * scale;
        const sy = -(source.y - window.innerHeight / 2 + (source.type === 'core' ? 64 : 50)) * scale;
        const sz = (source.z || 0) * scale;
        
        const tx = (target.x - window.innerWidth / 2 + (target.type === 'core' ? 64 : 100)) * scale;
        const ty = -(target.y - window.innerHeight / 2 + (target.type === 'core' ? 64 : 50)) * scale;
        const tz = (target.z || 0) * scale;

        return (
          <Line
            key={conn.id}
            points={[[sx, sy, sz], [tx, ty, tz]]}
            color="#00d2ff"
            lineWidth={2}
            transparent
            opacity={0.5}
          />
        );
      })}
    </group>
  );
};

const Trails3D = ({ nodes }: { nodes: NodeData[] }) => {
  return (
    <group>
      {nodes.filter(n => n.motionType === 'slow_trail' && n.trail && n.trail.length > 1).map(node => (
        <Line
          key={`trail-3d-${node.id}`}
          points={node.trail!.map(p => [p.x, p.y, p.z || 0]) as [number, number, number][]}
          color="#00d2ff"
          lineWidth={1}
          transparent
          opacity={0.3}
          dashed
          dashScale={2}
          dashSize={0.5}
          gapSize={0.5}
        />
      ))}
    </group>
  );
};

export function Universe3D(props: Universe3DProps) {
  return (
    <div className="absolute inset-0 w-full h-full bg-black">
      <Canvas camera={{ position: [0, 0, 50], fov: 60 }}>
        <color attach="background" args={[props.envSettings.backgroundColor || '#050505']} />
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} intensity={1} />
        
        <Skybox settings={props.envSettings} />
        <EnclosedBox settings={props.envSettings} />
        
        <Trails3D nodes={props.nodes} />
        
        {props.envSettings.backgroundType === 'grid' && (
          <Grid 
            position={[0, -20, 0]} 
            args={[100, 100]} 
            cellSize={1} 
            cellThickness={1} 
            cellColor="#00d2ff" 
            sectionSize={5} 
            sectionThickness={1.5} 
            sectionColor="#9d50bb" 
            fadeDistance={50} 
            fadeStrength={1} 
          />
        )}

        <Connections3D connections={props.connections} nodes={props.nodes} />
        
        {props.nodes.map(node => (
          <Node3D 
            key={node.id}
            node={node}
            {...props}
            isMatch={props.searchQuery ? (node.title.toLowerCase().includes(props.searchQuery.toLowerCase()) || node.content?.toLowerCase().includes(props.searchQuery.toLowerCase())) : false}
            isSelected={props.selectedNode === node.id || props.connectingFrom === node.id}
          />
        ))}
        
        <OrbitControls 
          makeDefault 
          enableDamping 
          dampingFactor={0.05} 
          rotateSpeed={1.0} 
          enablePan={true}
          panSpeed={0.8}
          minDistance={10}
          maxDistance={200}
        />
      </Canvas>
    </div>
  );
}
