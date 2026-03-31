import React, { useRef, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { NodeData } from './NodeElement';

interface CameraControllerProps {
  selectedNode: string | null;
  nodes: NodeData[];
  isDraggingNode?: boolean;
}

export const CameraController: React.FC<CameraControllerProps> = ({ selectedNode, nodes, isDraggingNode = false }) => {
  const { camera, gl } = useThree();
  const controlsRef = useRef<any>(null);
  const targetPosition = useRef(new THREE.Vector3());
  const isAnimating = useRef(false);

  useEffect(() => {
    if (selectedNode && controlsRef.current) {
      const node = nodes.find(n => n.id === selectedNode);
      if (node) {
        const scale = 0.05;
        const tx = (node.x - window.innerWidth / 2) * scale;
        const ty = -(node.y - window.innerHeight / 2) * scale;
        const tz = (node.z || 0) * scale;
        
        targetPosition.current.set(tx, ty, tz);
        isAnimating.current = true;
      }
    }
  }, [selectedNode, nodes]);

  useEffect(() => {
    const handleDoubleTap = (e: Event) => {
      const customEvent = e as CustomEvent;
      const nodeId = customEvent.detail.nodeId;
      if (nodeId && controlsRef.current) {
        const node = nodes.find(n => n.id === nodeId);
        if (node) {
          const scale = 0.05;
          const tx = (node.x - window.innerWidth / 2) * scale;
          const ty = -(node.y - window.innerHeight / 2) * scale;
          const tz = (node.z || 0) * scale;
          
          targetPosition.current.set(tx, ty, tz);
          isAnimating.current = true;
        }
      }
    };

    window.addEventListener('node-double-tap', handleDoubleTap);
    
    const handleCameraAction = (e: Event) => {
      const customEvent = e as CustomEvent;
      const { type, position, target } = customEvent.detail;
      
      if (controlsRef.current) {
        if (type === 'reset') {
          targetPosition.current.set(0, 0, 0);
          camera.position.set(100, 100, 100);
          isAnimating.current = true;
        } else if (type === 'view') {
          targetPosition.current.set(0, 0, 0);
          if (position) camera.position.set(position.x, position.y, position.z);
          isAnimating.current = true;
        } else if (type === 'zoom') {
          const factor = customEvent.detail.factor || 1.1;
          const distance = camera.position.distanceTo(controlsRef.current.target);
          const newDistance = type === 'zoom-in' ? distance / factor : distance * factor;
          
          const direction = new THREE.Vector3().subVectors(camera.position, controlsRef.current.target).normalize();
          camera.position.copy(controlsRef.current.target).add(direction.multiplyScalar(newDistance));
        }
      }
    };

    window.addEventListener('camera-control', handleCameraAction);
    
    return () => {
      window.removeEventListener('node-double-tap', handleDoubleTap);
      window.removeEventListener('camera-control', handleCameraAction);
    };
  }, [nodes, camera]);

  useFrame((state, delta) => {
    if (controlsRef.current) {
      if (isAnimating.current) {
        // Smoothly interpolate the controls target with a slightly faster but smoother lerp
        controlsRef.current.target.lerp(targetPosition.current, 0.1);
        
        // Smoothly move the camera closer to the target
        const currentDistance = camera.position.distanceTo(controlsRef.current.target);
        const targetDistance = 40; // Desired zoom distance
        
        if (Math.abs(currentDistance - targetDistance) > 0.1) {
            const direction = new THREE.Vector3().subVectors(camera.position, controlsRef.current.target).normalize();
            const idealPos = new THREE.Vector3().copy(controlsRef.current.target).add(direction.multiplyScalar(targetDistance));
            camera.position.lerp(idealPos, 0.08);
        }

        // Stop animating if close enough
        if (controlsRef.current.target.distanceTo(targetPosition.current) < 0.01 && Math.abs(currentDistance - targetDistance) < 0.5) {
          isAnimating.current = false;
        }
      }
      controlsRef.current.update();
    }
  });

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  return (
    <OrbitControls 
      ref={controlsRef}
      makeDefault 
      enableDamping 
      dampingFactor={0.08} // Slightly higher damping for a more premium feel
      rotateSpeed={isMobile ? 0.6 : 0.8} 
      zoomSpeed={isMobile ? 1.0 : 1.2}
      panSpeed={isMobile ? 0.8 : 1.0}
      screenSpacePanning={true}
      enablePan={!isDraggingNode}
      enableRotate={!isDraggingNode}
      minDistance={10}
      maxDistance={800}
      minPolarAngle={0}
      maxPolarAngle={Math.PI * 0.95}
    />
  );
};
