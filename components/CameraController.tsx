import React, { useRef, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { NodeData } from './NodeElement';

interface CameraControllerProps {
  selectedNode: string | null;
  nodes: NodeData[];
}

export const CameraController: React.FC<CameraControllerProps> = ({ selectedNode, nodes }) => {
  const { camera, gl } = useThree();
  const controlsRef = useRef<any>(null);
  const targetPosition = useRef(new THREE.Vector3());
  const isAnimating = useRef(false);

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
    return () => window.removeEventListener('node-double-tap', handleDoubleTap);
  }, [nodes]);

  useFrame((state, delta) => {
    if (controlsRef.current) {
      if (isAnimating.current) {
        // Smoothly interpolate the controls target
        controlsRef.current.target.lerp(targetPosition.current, 0.05);
        
        // Smoothly move the camera closer to the target
        const currentDistance = camera.position.distanceTo(controlsRef.current.target);
        const targetDistance = 30; // Desired zoom distance
        
        if (currentDistance > targetDistance + 1 || currentDistance < targetDistance - 1) {
            const direction = new THREE.Vector3().subVectors(camera.position, controlsRef.current.target).normalize();
            const newPos = new THREE.Vector3().copy(controlsRef.current.target).add(direction.multiplyScalar(THREE.MathUtils.lerp(currentDistance, targetDistance, 0.05)));
            camera.position.copy(newPos);
        }

        // Stop animating if close enough
        if (controlsRef.current.target.distanceTo(targetPosition.current) < 0.1) {
          isAnimating.current = false;
        }
      }
      controlsRef.current.update();
    }
  });

  const isMobile = window.innerWidth < 768;

  return (
    <OrbitControls 
      ref={controlsRef}
      makeDefault 
      enableDamping 
      dampingFactor={0.05} 
      rotateSpeed={isMobile ? 0.5 : 0.8} 
      zoomSpeed={isMobile ? 0.8 : 1.2}
      panSpeed={isMobile ? 0.5 : 0.8}
      enablePan={true}
      minDistance={5}
      maxDistance={500}
    />
  );
};
