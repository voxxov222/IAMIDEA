import React, { useRef, useState, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { motion, AnimatePresence } from 'motion/react';
import { Html, Grid, Line, Stars, Sphere, Box, Cylinder, Torus, Cone, Environment, Trail, Float, GizmoHelper, GizmoViewport } from '@react-three/drei';
import { EffectComposer, Bloom, ChromaticAberration, Noise, Vignette, Glitch } from '@react-three/postprocessing';
import { NodeElement, NodeData } from './NodeElement';
import { CameraController } from './CameraController';
import { TerrainGenerator } from './TerrainGenerator';
import * as THREE from 'three';
import { EnvironmentSettings } from '../types';
import { BlendFunction } from 'postprocessing';
import { Lock, Unlock, Zap, Activity, Trash2, Maximize2, Minimize2, RotateCw, Play, Pause, Repeat, X } from 'lucide-react';

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

  if (settings.skyboxType === 'cyberpunk') return <Environment preset="night" background />;

  if (settings.skyboxType === 'vaporwave') return <Environment preset="dawn" background />;

  if (settings.skyboxType === 'minimalist') return <Environment preset="apartment" background />;

  return null;
};

const EnclosedBox = ({ settings }: { settings: EnvironmentSettings }) => {
  if (!settings.enclosedBox) return null;

  const size = settings.boxSize || 200;
  
  return (
    <Box args={[size, size, size]} position={[0, 0, 0]} raycast={() => null}>
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

const Node3D = ({ node, nodes, isSelected, isMatch, isSnapTarget, onSnapTargetChange, onSelect, onDragStart, onDragEnd, onConnectStart, onCreateAndLink, onLinkExisting, onDelete, onUpdateNode }: any) => {
  const meshRef = useRef<THREE.Group>(null);
  const ringRef = useRef<THREE.Mesh>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isHolding, setIsHolding] = useState(false);
  const [localSnapTargetId, setLocalSnapTargetId] = useState<string | null>(null);
  const [showContextMenu, setShowContextMenu] = useState(false);
  const holdTimer = useRef<any>(null);
  const lastTap = useRef<number>(0);
  const originalPosition = useRef(new THREE.Vector3());
  const tapScale = useRef(1);
  const hoverScale = useRef(1);
  const dragTarget = useRef(new THREE.Vector3());
  const dragPlane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 0, 1), 0), []);
  const { camera, raycaster } = useThree();
  
  useFrame((state, delta) => {
    if (!meshRef.current) return;

    const time = state.clock.getElapsedTime();
    const d = delta * 60; // Normalize to 60fps

    // Handle Dragging
    if (isDragging && !node.isLocked) {
      const pointer = state.pointer;
      raycaster.setFromCamera(pointer, camera);
      const intersectPoint = new THREE.Vector3();
      raycaster.ray.intersectPlane(dragPlane, intersectPoint);
      
      // Smoothly move the drag target
      dragTarget.current.lerp(intersectPoint, 0.2 * d);
      
      // Convert back to world coordinates for the node
      const scaleFactor = 0.05;
      let nx = dragTarget.current.x / scaleFactor + window.innerWidth / 2;
      let ny = -(dragTarget.current.y / scaleFactor - window.innerHeight / 2);

      // Magnetic snapping to nearby nodes
      let currentSnapTargetId = null;
      const snapRadius = 100; // 2D units
      nodes.forEach((n: any) => {
        if (n.id === node.id) return;
        const dx = n.x - nx;
        const dy = n.y - ny;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < snapRadius) {
          currentSnapTargetId = n.id;
          // Apply magnetic pull
          const pull = (1 - dist / snapRadius) * 0.3;
          nx += dx * pull;
          ny += dy * pull;
        }
      });
      
      if (currentSnapTargetId !== localSnapTargetId) {
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
          navigator.vibrate(20);
        }
        onSnapTargetChange(currentSnapTargetId);
      }
      
      setLocalSnapTargetId(currentSnapTargetId);
      onUpdateNode(node.id, { x: nx, y: ny });
    }

    // Smoothly animate tap scale back to 1
    tapScale.current = THREE.MathUtils.lerp(tapScale.current, 1, 0.1 * d);
    
    // Smoothly animate hover scale
    const targetHoverScale = isHovered || isSelected || isDragging ? 1.2 : 1;
    hoverScale.current = THREE.MathUtils.lerp(hoverScale.current, targetHoverScale, 0.15 * d);

    const finalScale = (node.scale || 1) * tapScale.current * hoverScale.current;
    
    // Pulse effect for selected node
    if (isSelected && !isDragging) {
      const pulse = (Math.sin(time * 4) + 1) / 2;
      meshRef.current.scale.set(finalScale * (1 + pulse * 0.05), finalScale * (1 + pulse * 0.05), finalScale * (1 + pulse * 0.05));
    } else {
      meshRef.current.scale.set(finalScale, finalScale, finalScale);
    }

    // Tilt effect based on pointer
    const pointer = state.pointer;
    const targetRotationX = (node.rotationX || 0) * Math.PI / 180 + (isHovered || isDragging ? -pointer.y * 0.4 : 0);
    const targetRotationY = (node.rotationY || 0) * Math.PI / 180 + (isHovered || isDragging ? pointer.x * 0.4 : 0);
    
    meshRef.current.rotation.x = THREE.MathUtils.lerp(meshRef.current.rotation.x, targetRotationX, 0.12 * d);
    meshRef.current.rotation.y = THREE.MathUtils.lerp(meshRef.current.rotation.y, targetRotationY, 0.12 * d);

    // Extra rotation when dragging
    if (isDragging) {
      meshRef.current.rotation.y += 0.05 * d;
      meshRef.current.rotation.x += 0.02 * d;
    }

    // Snap target ring animation
    if (ringRef.current && isSnapTarget) {
      ringRef.current.rotation.z += 0.05 * d;
      const pulse = 1 + Math.sin(time * 8) * 0.1;
      ringRef.current.scale.set(pulse, pulse, pulse);
    }

    // Loop Movements
    if (node.loopType && node.loopType !== 'none' && !isDragging) {
      const speed = node.motionSpeed || 1;
      const t = time * speed;
      
      switch (node.loopType) {
        case 'pingpong':
          meshRef.current.position.y += Math.sin(t) * 0.05 * d;
          break;
        case 'oscillate':
          meshRef.current.position.x += Math.cos(t) * 0.05 * d;
          meshRef.current.position.z += Math.sin(t) * 0.05 * d;
          break;
        case 'repeat':
          meshRef.current.rotation.y += 0.02 * d;
          break;
      }
    }

    // Subtle floating effect
    const floatY = Math.sin(time * 1.5 + node.x * 0.1) * 0.15;
    const floatX = Math.cos(time * 1.2 + node.y * 0.1) * 0.1;
    
    // Base position
    const scaleFactor = 0.05;
    const bx = (node.x - window.innerWidth / 2) * scaleFactor;
    const by = -(node.y - window.innerHeight / 2) * scaleFactor;
    const bz = (node.z || 0) * scaleFactor;

    if (!isDragging) {
      meshRef.current.position.x = THREE.MathUtils.lerp(meshRef.current.position.x, bx + floatX, 0.1 * d);
      meshRef.current.position.y = THREE.MathUtils.lerp(meshRef.current.position.y, by + floatY, 0.1 * d);
      meshRef.current.position.z = THREE.MathUtils.lerp(meshRef.current.position.z, bz, 0.1 * d);
    }

    // Handle Motion (Movement in space)
    if (node.motionType && node.motionType !== 'none' && !isDragging) {
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
          meshRef.current.position.x += (Math.random() - 0.5) * 0.1 * speed * d;
          meshRef.current.position.y += (Math.random() - 0.5) * 0.1 * speed * d;
          meshRef.current.position.z += (Math.random() - 0.5) * 0.1 * speed * d;
          break;
        case 'zigzag':
          meshRef.current.position.x += Math.sin(t) * 0.1 * d;
          meshRef.current.position.y += Math.cos(t * 0.5) * 0.05 * d;
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
            node.velocity.x -= meshRef.current.position.x * 0.001 * d;
            node.velocity.y -= meshRef.current.position.y * 0.001 * d;
            node.velocity.z -= meshRef.current.position.z * 0.001 * d;
          }

          meshRef.current.position.x += node.velocity.x * d;
          meshRef.current.position.y += node.velocity.y * d;
          meshRef.current.position.z += node.velocity.z * d;

          if (Math.abs(meshRef.current.position.x) > boxSize * 1.5) node.velocity.x *= -1;
          if (Math.abs(meshRef.current.position.y) > boxSize * 1.5) node.velocity.y *= -1;
          if (Math.abs(meshRef.current.position.z) > boxSize * 1.5) node.velocity.z *= -1;
          break;
        case 'slow_trail':
          meshRef.current.position.x += Math.cos(t * 0.2) * 0.05 * speed * d;
          meshRef.current.position.y += Math.sin(t * 0.2) * 0.05 * speed * d;
          meshRef.current.position.z += Math.sin(t * 0.3) * 0.05 * speed * d;
          
          // Update trail data for 3D
          if (!node.trail) node.trail = [];
          node.trail.push({ x: meshRef.current.position.x, y: meshRef.current.position.y, z: meshRef.current.position.z });
          if (node.trail.length > 20) node.trail.shift();
          break;
        case 'figure_eight':
          meshRef.current.position.x += Math.sin(t) * 0.1 * speed * d;
          meshRef.current.position.y += Math.sin(t * 2) * 0.05 * speed * d;
          break;
        case 'pendulum':
          meshRef.current.position.x += Math.sin(t) * 0.15 * speed * d;
          meshRef.current.position.y += Math.abs(Math.cos(t)) * 0.05 * speed * d;
          break;
        case 'spiral':
          const spiralRadius = (t % 10) * 0.5;
          meshRef.current.position.x += Math.cos(t * 5) * spiralRadius * 0.01 * speed * d;
          meshRef.current.position.z += Math.sin(t * 5) * spiralRadius * 0.01 * speed * d;
          break;
        case 'heartbeat':
          const beat = Math.pow(Math.sin(t * 3), 10);
          meshRef.current.scale.setScalar((node.scale || 1) * (1 + beat * 0.5));
          break;
        case 'wave':
          meshRef.current.position.x += 0.02 * speed * d;
          meshRef.current.position.y += Math.sin(t * 5) * 0.1 * speed * d;
          break;
        case 'breathe':
          meshRef.current.scale.setScalar((node.scale || 1) * (1 + Math.sin(t * 2) * 0.2));
          break;
        case 'flicker':
          meshRef.current.visible = Math.random() > 0.5;
          break;
        case 'glitch':
          if (Math.random() > 0.9) {
            meshRef.current.position.x += (Math.random() - 0.5) * 2;
            meshRef.current.position.y += (Math.random() - 0.5) * 2;
            meshRef.current.position.z += (Math.random() - 0.5) * 2;
          }
          break;
        case 'orbit_elliptical':
          if (node.motionTargetId) {
            const target = nodes.find((n: NodeData) => n.id === node.motionTargetId);
            if (target) {
              const scale = 0.05;
              const tx = (target.x - window.innerWidth / 2) * scale;
              const ty = -(target.y - window.innerHeight / 2) * scale;
              const tz = (target.z || 0) * scale;
              meshRef.current.position.x = tx + Math.cos(t) * 15;
              meshRef.current.position.z = tz + Math.sin(t) * 5;
              meshRef.current.position.y = ty;
            }
          }
          break;
        case 'spring':
          meshRef.current.position.y += Math.sin(t * 10) * Math.exp(-(t % 2)) * 0.2 * speed * d;
          break;
        case 'orbit_figure_eight':
          if (node.motionTargetId) {
            const target = nodes.find((n: NodeData) => n.id === node.motionTargetId);
            if (target) {
              const scale = 0.05;
              const tx = (target.x - window.innerWidth / 2) * scale;
              const ty = -(target.y - window.innerHeight / 2) * scale;
              const tz = (target.z || 0) * scale;
              meshRef.current.position.x = tx + Math.sin(t) * 10;
              meshRef.current.position.z = tz + Math.sin(t * 2) * 5;
              meshRef.current.position.y = ty;
            }
          }
          break;
        case 'chase':
          if (node.motionTargetId) {
            const target = nodes.find((n: NodeData) => n.id === node.motionTargetId);
            if (target) {
              const scale = 0.05;
              const tx = (target.x - window.innerWidth / 2) * scale;
              const ty = -(target.y - window.innerHeight / 2) * scale;
              const tz = (target.z || 0) * scale;
              const dx = tx - meshRef.current.position.x;
              const dy = ty - meshRef.current.position.y;
              const dz = tz - meshRef.current.position.z;
              meshRef.current.position.x += dx * 0.05 * speed * d;
              meshRef.current.position.y += dy * 0.05 * speed * d;
              meshRef.current.position.z += dz * 0.05 * speed * d;
            }
          }
          break;
        case 'flee':
          if (node.motionTargetId) {
            const target = nodes.find((n: NodeData) => n.id === node.motionTargetId);
            if (target) {
              const scale = 0.05;
              const tx = (target.x - window.innerWidth / 2) * scale;
              const ty = -(target.y - window.innerHeight / 2) * scale;
              const tz = (target.z || 0) * scale;
              const dx = meshRef.current.position.x - tx;
              const dy = meshRef.current.position.y - ty;
              const dz = meshRef.current.position.z - tz;
              const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
              if (dist < 20) {
                meshRef.current.position.x += (dx / dist) * 0.1 * speed * d;
                meshRef.current.position.y += (dy / dist) * 0.1 * speed * d;
                meshRef.current.position.z += (dz / dist) * 0.1 * speed * d;
              }
            }
          }
          break;
        case 'wander':
          meshRef.current.position.x += (Math.sin(t * 0.5) * 0.05 + Math.cos(t * 1.2) * 0.02) * speed * d;
          meshRef.current.position.y += (Math.cos(t * 0.7) * 0.05 + Math.sin(t * 1.5) * 0.02) * speed * d;
          meshRef.current.position.z += (Math.sin(t * 0.9) * 0.05 + Math.cos(t * 1.1) * 0.02) * speed * d;
          break;
        case 'pulse_wave':
          meshRef.current.scale.setScalar((node.scale || 1) * (1 + Math.sin(meshRef.current.position.x * 0.5 + t * 5) * 0.3));
          break;
        case 'spin_cycle':
          meshRef.current.position.x += Math.cos(t * 5) * 0.05 * speed * d;
          meshRef.current.position.z += Math.sin(t * 5) * 0.05 * speed * d;
          meshRef.current.rotation.y += 0.1 * speed * d;
          break;
        case 'orbit_eccentric':
          if (node.motionTargetId) {
            const target = nodes.find((n: NodeData) => n.id === node.motionTargetId);
            if (target) {
              const scale = 0.05;
              const tx = (target.x - window.innerWidth / 2) * scale;
              const ty = -(target.y - window.innerHeight / 2) * scale;
              const tz = (target.z || 0) * scale;
              const r = 5 + Math.sin(t * 3) * 3;
              meshRef.current.position.x = tx + Math.cos(t) * r;
              meshRef.current.position.z = tz + Math.sin(t) * r;
              meshRef.current.position.y = ty;
            }
          }
          break;
        case 'gravity_well': {
          const gdx = -meshRef.current.position.x;
          const gdy = -meshRef.current.position.y;
          const gdz = -meshRef.current.position.z;
          const gDist = Math.sqrt(gdx * gdx + gdy * gdy + gdz * gdz);
          let gvx = node.velocity?.x || 0;
          let gvy = node.velocity?.y || 0;
          let gvz = node.velocity?.z || 0;
          if (gDist > 2) {
            gvx += (gdx / gDist) * 0.01 * speed * d;
            gvy += (gdy / gDist) * 0.01 * speed * d;
            gvz += (gdz / gDist) * 0.01 * speed * d;
          } else {
            gvx = (Math.random() - 0.5) * 1 * speed;
            gvy = (Math.random() - 0.5) * 1 * speed;
            gvz = (Math.random() - 0.5) * 1 * speed;
          }
          meshRef.current.position.x += gvx * d;
          meshRef.current.position.y += gvy * d;
          meshRef.current.position.z += gvz * d;
          node.velocity = { x: gvx, y: gvy, z: gvz };
          break;
        }
        case 'magnetic': {
          let mx = meshRef.current.position.x;
          let my = meshRef.current.position.y;
          let mz = meshRef.current.position.z;
          const scale = 0.05;
          nodes.forEach((other: NodeData) => {
            if (other.id !== node.id) {
              const ox = (other.x - window.innerWidth / 2) * scale;
              const oy = -(other.y - window.innerHeight / 2) * scale;
              const oz = (other.z || 0) * scale;
              const dx = ox - mx;
              const dy = oy - my;
              const dz = oz - mz;
              const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
              if (dist > 0 && dist < 10) {
                mx += (dx / dist) * 0.01 * speed * d;
                my += (dy / dist) * 0.01 * speed * d;
                mz += (dz / dist) * 0.01 * speed * d;
              }
            }
          });
          meshRef.current.position.x = mx;
          meshRef.current.position.y = my;
          meshRef.current.position.z = mz;
          break;
        }
        case 'repel': {
          let rx = meshRef.current.position.x;
          let ry = meshRef.current.position.y;
          let rz = meshRef.current.position.z;
          const scale = 0.05;
          nodes.forEach((other: NodeData) => {
            if (other.id !== node.id) {
              const ox = (other.x - window.innerWidth / 2) * scale;
              const oy = -(other.y - window.innerHeight / 2) * scale;
              const oz = (other.z || 0) * scale;
              const dx = rx - ox;
              const dy = ry - oy;
              const dz = rz - oz;
              const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
              if (dist > 0 && dist < 5) {
                rx += (dx / dist) * 0.05 * speed * d;
                ry += (dy / dist) * 0.05 * speed * d;
                rz += (dz / dist) * 0.05 * speed * d;
              }
            }
          });
          meshRef.current.position.x = rx;
          meshRef.current.position.y = ry;
          meshRef.current.position.z = rz;
          break;
        }
        case 'orbit_wobble':
          if (node.motionTargetId) {
            const target = nodes.find((n: NodeData) => n.id === node.motionTargetId);
            if (target) {
              const scale = 0.05;
              const tx = (target.x - window.innerWidth / 2) * scale;
              const ty = -(target.y - window.innerHeight / 2) * scale;
              const tz = (target.z || 0) * scale;
              meshRef.current.position.x = tx + Math.cos(t) * 10 + Math.sin(t * 10) * 1;
              meshRef.current.position.z = tz + Math.sin(t) * 10 + Math.cos(t * 10) * 1;
              meshRef.current.position.y = ty + Math.sin(t * 5) * 2;
            }
          }
          break;
        case 'tornado':
          const torRadius = (t % 5) * 2;
          meshRef.current.position.x += Math.cos(t * 10) * torRadius * 0.01 * speed * d;
          meshRef.current.position.z += Math.sin(t * 10) * torRadius * 0.01 * speed * d;
          meshRef.current.position.y += 0.05 * speed * d;
          break;
        case 'float_away':
          meshRef.current.position.y += 0.02 * speed * d;
          meshRef.current.position.x += Math.sin(t) * 0.02 * speed * d;
          break;
        case 'sink':
          meshRef.current.position.y -= 0.02 * speed * d;
          meshRef.current.position.x += Math.sin(t) * 0.02 * speed * d;
          break;
        case 'teleport':
          if (Math.random() > 0.98) {
            meshRef.current.position.x = (Math.random() - 0.5) * 40;
            meshRef.current.position.y = (Math.random() - 0.5) * 40;
            meshRef.current.position.z = (Math.random() - 0.5) * 40;
          }
          break;
      }
    }

    // Handle Animation (Visual effect)
    if (node.animationState !== 'playing') return;
    
    switch (node.animation) {
      case 'spin':
        meshRef.current.rotation.y += 0.05 * d;
        break;
      case 'orbit':
        meshRef.current.position.x += Math.cos(time * 2) * 0.1 * d;
        meshRef.current.position.z += Math.sin(time * 2) * 0.1 * d;
        break;
      case 'dance':
        meshRef.current.position.y += Math.sin(time * 5) * 0.05 * d;
        meshRef.current.rotation.z = Math.sin(time * 3) * 0.2 * d;
        break;
      case 'jiggle':
        const s = 1 + Math.sin(time * 20) * 0.05;
        meshRef.current.scale.set(s, s, s);
        break;
      case 'bounce':
        meshRef.current.position.y += Math.abs(Math.sin(time * 5)) * 0.1 * d;
        break;
      case 'rocket':
        meshRef.current.position.y += 0.2 * d;
        if (meshRef.current.position.y > 50) meshRef.current.position.y = -50;
        break;
      case 'explode':
        const es = meshRef.current.scale.x + 0.02 * d;
        meshRef.current.scale.set(es, es, es);
        if (es > 3) meshRef.current.scale.set(1, 1, 1);
        break;
      case 'blackhole':
        const bs = Math.max(0.1, meshRef.current.scale.x - 0.01 * d);
        meshRef.current.scale.set(bs, bs, bs);
        meshRef.current.rotation.y += 0.2 * d;
        if (bs <= 0.1) meshRef.current.scale.set(1, 1, 1);
        break;
      case 'random':
        meshRef.current.rotation.x += Math.random() * 0.05 * d;
        meshRef.current.rotation.y += Math.random() * 0.05 * d;
        break;
    }
  });

  const handlePointerDown = (e: any) => {
    e.stopPropagation();
    const now = Date.now();
    
    // Haptic feedback
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(10);
    }

    // Squish effect
    tapScale.current = 0.8;
    
    // Hold timer for highlight/select
    holdTimer.current = setTimeout(() => {
      setIsHolding(true);
      setShowContextMenu(true);
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate([20, 50, 20]);
      }
    }, 600);

    if (now - lastTap.current < 300) {
      // Double tap detected
      window.dispatchEvent(new CustomEvent('node-double-tap', { detail: { nodeId: node.id } }));
    }
    lastTap.current = now;
    onSelect(node.id);
    
    // Start dragging
    if (!node.isLocked) {
      setIsDragging(true);
      originalPosition.current.set(node.x, node.y, node.z || 0);
      onDragStart();
      
      // Update drag plane to be perpendicular to camera
      const normal = new THREE.Vector3();
      camera.getWorldDirection(normal);
      dragPlane.setFromNormalAndCoplanarPoint(normal.negate(), meshRef.current!.position);
      dragTarget.current.copy(meshRef.current!.position);
    }
  };

  const handlePointerUp = (e: any) => {
    e.stopPropagation();
    if (holdTimer.current) {
      clearTimeout(holdTimer.current);
      holdTimer.current = null;
    }
    setIsHolding(false);
    setIsDragging(false);
    setLocalSnapTargetId(null);
    onDragEnd(node.id, node.x, node.y);
  };
  const scaleFactor = 0.05;
  const position: [number, number, number] = [
    (node.x - window.innerWidth / 2) * scaleFactor,
    -(node.y - window.innerHeight / 2) * scaleFactor,
    (node.z || 0) * scaleFactor
  ];
  
  const rotation: [number, number, number] = [
    (node.rotationX || 0) * Math.PI / 180,
    (node.rotationY || 0) * Math.PI / 180,
    (node.rotationZ || 0) * Math.PI / 180
  ];

  return (
    <group 
      ref={meshRef} 
      position={position} 
      rotation={rotation} 
      scale={node.scale || 1}
      onPointerOver={(e) => { e.stopPropagation(); setIsHovered(true); }}
      onPointerOut={(e) => { e.stopPropagation(); setIsHovered(false); }}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
    >
      {showContextMenu && isSelected && (
        <Html distanceFactor={10} position={[0, 6, 0]} center>
          <motion.div 
            initial={{ opacity: 0, scale: 0.5, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="glass-morphism rounded-2xl p-3 flex flex-col gap-3 min-w-[180px] border border-white/10 shadow-2xl pointer-events-auto"
          >
            <div className="flex items-center justify-between border-b border-white/5 pb-2">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Node Options</span>
              <button onClick={() => setShowContextMenu(false)} className="text-gray-500 hover:text-white">
                <X size={12} />
              </button>
            </div>
            
            <div className="grid grid-cols-2 gap-2">
              <button 
                onClick={() => onUpdateNode(node.id, { isLocked: !node.isLocked })}
                className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${node.isLocked ? 'bg-red-500/20 text-red-400' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}
              >
                {node.isLocked ? <Lock size={16} /> : <Unlock size={16} />}
                <span className="text-[8px] font-bold uppercase">{node.isLocked ? 'Locked' : 'Lock'}</span>
              </button>
              
              <button 
                onClick={() => onUpdateNode(node.id, { animationState: node.animationState === 'playing' ? 'paused' : 'playing' })}
                className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${node.animationState === 'playing' ? 'bg-neon-blue/20 text-neon-blue' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}
              >
                {node.animationState === 'playing' ? <Pause size={16} /> : <Play size={16} />}
                <span className="text-[8px] font-bold uppercase">{node.animationState === 'playing' ? 'Pause' : 'Play'}</span>
              </button>

              <button 
                onClick={() => {
                  const loops: any[] = ['none', 'pingpong', 'repeat', 'oscillate'];
                  const currentIndex = loops.indexOf(node.loopType || 'none');
                  const nextIndex = (currentIndex + 1) % loops.length;
                  onUpdateNode(node.id, { loopType: loops[nextIndex] });
                }}
                className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${node.loopType && node.loopType !== 'none' ? 'bg-neon-purple/20 text-neon-purple' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}
              >
                <Repeat size={16} />
                <span className="text-[8px] font-bold uppercase">{node.loopType || 'Loop'}</span>
              </button>

              <button 
                onClick={() => {
                  const effects: any[] = ['none', 'neon_pulse', 'glitch_static', 'particle_trail', 'hologram_flicker'];
                  const currentIndex = effects.indexOf(node.gamingEffect || 'none');
                  const nextIndex = (currentIndex + 1) % effects.length;
                  onUpdateNode(node.id, { gamingEffect: effects[nextIndex] });
                }}
                className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${node.gamingEffect && node.gamingEffect !== 'none' ? 'bg-neon-pink/20 text-neon-pink' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}
              >
                <Zap size={16} />
                <span className="text-[8px] font-bold uppercase">Effect</span>
              </button>
            </div>

            <button 
              onClick={() => onDelete(node.id)}
              className="w-full py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl flex items-center justify-center gap-2 transition-all border border-red-500/20"
            >
              <Trash2 size={12} />
              <span className="text-[8px] font-bold uppercase">Delete Node</span>
            </button>
          </motion.div>
        </Html>
      )}

      <group>
        {/* Gaming Effects Layer */}
        {node.gamingEffect === 'neon_pulse' && (
          <Sphere args={[5, 32, 32]}>
            <meshStandardMaterial 
              color={node.color || "#00f3ff"} 
              transparent 
              opacity={0.2 + Math.sin(Date.now() * 0.005) * 0.1} 
              emissive={node.color || "#00f3ff"} 
              emissiveIntensity={5 + Math.sin(Date.now() * 0.005) * 3} 
              side={THREE.BackSide}
            />
          </Sphere>
        )}

        {node.gamingEffect === 'particle_trail' && (
          <Trail
            width={2}
            length={10}
            color={new THREE.Color(node.color || "#ff00ff")}
            attenuation={(t) => t * t}
          >
            <mesh position={[0, 0, 0]} />
          </Trail>
        )}

        {/* Connection Preview Line */}
        {isDragging && localSnapTargetId && (
          <group>
            <Line
              points={[
                [0, 0, 0],
                [
                  (nodes.find((n: any) => n.id === localSnapTargetId)?.x - node.x) * scaleFactor,
                  -(nodes.find((n: any) => n.id === localSnapTargetId)?.y - node.y) * scaleFactor,
                  ((nodes.find((n: any) => n.id === localSnapTargetId)?.z || 0) - (node.z || 0)) * scaleFactor
                ]
              ]}
              color="#ff00ff"
              lineWidth={2 + Math.sin(Date.now() * 0.01) * 1}
              transparent
              opacity={0.8}
            />
            <Line
              points={[
                [0, 0, 0],
                [
                  (nodes.find((n: any) => n.id === localSnapTargetId)?.x - node.x) * scaleFactor,
                  -(nodes.find((n: any) => n.id === localSnapTargetId)?.y - node.y) * scaleFactor,
                  ((nodes.find((n: any) => n.id === localSnapTargetId)?.z || 0) - (node.z || 0)) * scaleFactor
                ]
              ]}
              color="#ff00ff"
              lineWidth={8 + Math.sin(Date.now() * 0.01) * 4}
              transparent
              opacity={0.2}
            />
          </group>
        )}

        {/* Drag Origin Line */}
        {isDragging && (
          <Line
            points={[
              [0, 0, 0],
              [
                (originalPosition.current.x - node.x) * scaleFactor,
                -(originalPosition.current.y - node.y) * scaleFactor,
                (originalPosition.current.z - (node.z || 0)) * scaleFactor
              ]
            ]}
            color="#ffffff"
            lineWidth={1}
            transparent
            opacity={0.2}
            dashed
          />
        )}

        {/* Invisible Hitbox for better touch interaction */}
        <Sphere args={[6, 16, 16]} visible={false}>
          <meshBasicMaterial transparent opacity={0} />
        </Sphere>

        {isSnapTarget && (
          <Torus ref={ringRef} args={[5, 0.1, 16, 100]} rotation={[Math.PI / 2, 0, 0]}>
            <meshStandardMaterial color="#ff00ff" emissive="#ff00ff" emissiveIntensity={10} transparent opacity={0.6} />
          </Torus>
        )}

        {(isSelected || isHovered || isDragging || isSnapTarget) && (
          <group>
            <Sphere args={[5.5, 32, 32]}>
              <meshStandardMaterial 
                color={isDragging ? "#ff00ff" : (isSnapTarget ? "#ff00ff" : (isSelected ? "#00f3ff" : "#9d50bb"))} 
                transparent 
                opacity={isDragging ? 0.4 : (isSnapTarget ? 0.4 : (isSelected ? 0.3 : 0.15))} 
                emissive={isDragging ? "#ff00ff" : (isSnapTarget ? "#ff00ff" : (isSelected ? "#00f3ff" : "#9d50bb"))} 
                emissiveIntensity={isDragging ? 4 : (isSnapTarget ? 4 : (isSelected ? 2 : 1))} 
                side={THREE.BackSide}
              />
            </Sphere>
            {/* Holographic Base */}
            <Cylinder args={[3.5, 3.5, 0.2, 32]} position={[0, -2, 0]}>
              <meshStandardMaterial 
                color={isDragging || isSnapTarget ? "#ff00ff" : "#00f3ff"} 
                transparent 
                opacity={0.6} 
                emissive={isDragging || isSnapTarget ? "#ff00ff" : "#00f3ff"} 
                emissiveIntensity={isDragging || isSnapTarget ? 5 : 2} 
                wireframe
              />
            </Cylinder>
            {/* Floating Particles */}
            {[...Array(isDragging || isSnapTarget ? 10 : 5)].map((_, i) => (
              <Sphere key={`particle-${node.id}-${i}`} args={[0.15, 8, 8]} position={[
                Math.sin(i * 1.2 + (isDragging || isSnapTarget ? Date.now() * 0.01 : 0)) * (isDragging || isSnapTarget ? 6 : 4),
                Math.cos(i * 0.8 + (isDragging || isSnapTarget ? Date.now() * 0.01 : 0)) * (isDragging || isSnapTarget ? 6 : 4),
                Math.sin(i * 2.1 + (isDragging || isSnapTarget ? Date.now() * 0.01 : 0)) * (isDragging || isSnapTarget ? 6 : 4)
              ]}>
                <meshStandardMaterial 
                  color={isDragging || isSnapTarget ? "#ff00ff" : "#00f3ff"} 
                  emissive={isDragging || isSnapTarget ? "#ff00ff" : "#00f3ff"} 
                  emissiveIntensity={isDragging || isSnapTarget ? 8 : 5} 
                />
              </Sphere>
            ))}
          </group>
        )}
        {/* 3D Geometry */}
        {node.type === '3d' ? (
          <group>
            {node.shape === 'box' && <Box args={[4, 4, 4]}><meshStandardMaterial color={node.color || "#10b981"} emissive={node.color || "#10b981"} emissiveIntensity={0.5} /></Box>}
            {node.shape === 'sphere' && <Sphere args={[2.5, 32, 32]}><meshStandardMaterial color={node.color || "#10b981"} emissive={node.color || "#10b981"} emissiveIntensity={0.5} /></Sphere>}
            {node.shape === 'cylinder' && <Cylinder args={[2, 2, 4, 32]}><meshStandardMaterial color={node.color || "#10b981"} emissive={node.color || "#10b981"} emissiveIntensity={0.5} /></Cylinder>}
            {node.shape === 'torus' && <Torus args={[2, 0.5, 16, 100]}><meshStandardMaterial color={node.color || "#10b981"} emissive={node.color || "#10b981"} emissiveIntensity={0.5} /></Torus>}
            {node.shape === 'cone' && <Cone args={[2, 4, 32]}><meshStandardMaterial color={node.color || "#10b981"} emissive={node.color || "#10b981"} emissiveIntensity={0.5} /></Cone>}
            {!node.shape && <Box args={[4, 4, 4]}><meshStandardMaterial color={node.color || "#10b981"} emissive={node.color || "#10b981"} emissiveIntensity={0.5} /></Box>}
            
            <Html distanceFactor={10} position={[0, 4, 0]}>
              <div className="bg-space-900/80 px-2 py-1 rounded border border-emerald-500/50 text-[10px] text-emerald-400 whitespace-nowrap">
                {node.title}
              </div>
            </Html>
          </group>
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
                pointerEvents: 'none' // Allow 3D interaction to pass through to the hitbox
              }}
            >
              <div style={{ pointerEvents: 'auto' }}> {/* Re-enable for the actual content */}
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
                  is3D={true}
                />
              </div>
            </div>
          </Html>
        )}
      </group>
    </group>
  );
};

const Connections3D = ({ connections, nodes, selectedNode }: { connections: Connection[], nodes: NodeData[], selectedNode: string | null }) => {
  const scale = 0.05;
  
  return (
    <group>
      {connections.map(conn => {
        const source = nodes.find(n => n.id === conn.source);
        const target = nodes.find(n => n.id === conn.target);
        if (!source || !target) return null;

        const isHighlighted = selectedNode === conn.source || selectedNode === conn.target;

        const sx = (source.x - window.innerWidth / 2 + (source.type === 'core' ? 64 : 100)) * scale;
        const sy = -(source.y - window.innerHeight / 2 + (source.type === 'core' ? 64 : 50)) * scale;
        const sz = (source.z || 0) * scale;
        
        const tx = (target.x - window.innerWidth / 2 + (target.type === 'core' ? 64 : 100)) * scale;
        const ty = -(target.y - window.innerHeight / 2 + (target.type === 'core' ? 64 : 50)) * scale;
        const tz = (target.z || 0) * scale;

        return (
          <group key={conn.id}>
            <Line
              points={[[sx, sy, sz], [tx, ty, tz]]}
              color={isHighlighted ? "#ff00ff" : "#00d2ff"}
              lineWidth={isHighlighted ? 4 : 2}
              transparent
              opacity={isHighlighted ? 0.8 : 0.5}
              raycast={() => null}
            />
            {isHighlighted && (
              <Line
                points={[[sx, sy, sz], [tx, ty, tz]]}
                color="#ff00ff"
                lineWidth={10}
                transparent
                opacity={0.2}
                raycast={() => null}
              />
            )}
          </group>
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
          raycast={() => null}
        />
      ))}
    </group>
  );
};

export function Universe3D(props: Universe3DProps) {
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const [snapTargetId, setSnapTargetId] = useState<string | null>(null);

  return (
    <div className="absolute inset-0 w-full h-full bg-black">
      <Canvas 
        camera={{ position: [0, 0, 50], fov: 60 }} 
        dpr={[1, 2]} 
        performance={{ min: 0.5 }}
        onPointerDown={(e) => {
          if (e.target === e.currentTarget) {
            props.onSelect('');
          }
        }}
      >
        <color attach="background" args={[props.envSettings.backgroundColor || '#050505']} />
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} intensity={1} />
        
        <Skybox settings={props.envSettings} />
        <EnclosedBox settings={props.envSettings} />
        
        <TerrainGenerator 
          enabled={props.envSettings.terrain?.enabled}
          seed={props.envSettings.terrain?.seed}
          scale={props.envSettings.terrain?.scale}
          height={props.envSettings.terrain?.height}
          color={props.envSettings.terrain?.color}
          wireframe={props.envSettings.terrain?.wireframe}
          animate={props.envSettings.terrain?.animate}
          speed={props.envSettings.terrain?.speed}
        />
        
        <Trails3D nodes={props.nodes} />
        
        {props.envSettings.backgroundType === 'grid' && (
          <Grid 
            position={[0, -20, 0]} 
            args={[100, 100]} 
            cellSize={1} 
            cellThickness={1} 
            cellColor={props.envSettings.gridColor || "#00d2ff"} 
            sectionSize={5} 
            sectionThickness={1.5} 
            sectionColor={props.envSettings.gridColor || "#9d50bb"} 
            fadeDistance={50} 
            fadeStrength={1} 
          />
        )}

        <Connections3D connections={props.connections} nodes={props.nodes} selectedNode={props.selectedNode} />
        
        {props.nodes.map(node => (
          <Node3D 
            key={node.id}
            node={node}
            {...props}
            isMatch={props.searchQuery ? (node.title.toLowerCase().includes(props.searchQuery.toLowerCase()) || node.content?.toLowerCase().includes(props.searchQuery.toLowerCase())) : false}
            isSelected={props.selectedNode === node.id || props.connectingFrom === node.id}
            isSnapTarget={snapTargetId === node.id}
            onSnapTargetChange={setSnapTargetId}
            onDragStart={() => setDraggingNodeId(node.id)}
            onDragEnd={(id: string, x: number, y: number) => {
              if (snapTargetId) {
                props.onLinkExisting(id, snapTargetId);
              }
              setDraggingNodeId(null);
              setSnapTargetId(null);
              props.onDragEnd(id, x, y);
            }}
          />
        ))}
        
        <CameraController 
          selectedNode={props.selectedNode} 
          nodes={props.nodes} 
          isDraggingNode={!!draggingNodeId} 
        />

        <GizmoHelper
          alignment="bottom-right" // widget alignment within scene
          margin={[80, 80]} // widget margin (pixels)
        >
          <GizmoViewport axisColors={['#ff3653', '#0adb46', '#2c8fff']} labelColor="white" />
        </GizmoHelper>

        <EffectComposer>
          <Bloom 
            intensity={1.5} 
            luminanceThreshold={0.2} 
            luminanceSmoothing={0.9} 
            mipmapBlur 
          />
          <ChromaticAberration 
            blendFunction={BlendFunction.NORMAL} 
            offset={new THREE.Vector2(0.0005, 0.0005)} 
          />
          <Noise opacity={0.02} />
          <Vignette eskil={false} offset={0.1} darkness={1.1} />
        </EffectComposer>
      </Canvas>
    </div>
  );
}
