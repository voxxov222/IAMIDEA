import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { createNoise2D } from 'simplex-noise';
import * as THREE from 'three';

interface TerrainProps {
  enabled?: boolean;
  seed?: number;
  scale?: number;
  height?: number;
  color?: string;
  wireframe?: boolean;
  animate?: boolean;
  speed?: number;
}

export const TerrainGenerator = ({
  enabled = false,
  seed = 42,
  scale = 20,
  height = 5,
  color = "#00d2ff",
  wireframe = true,
  animate = false,
  speed = 0.5
}: TerrainProps) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const waterRef = useRef<THREE.Mesh>(null);
  const sunRef = useRef<THREE.DirectionalLight>(null);
  
  const noise2D = useMemo(() => createNoise2D(() => seed), [seed]);

  // FBM (Fractal Brownian Motion) for more detailed terrain
  const fbm = (x: number, y: number, octaves = 4) => {
    let value = 0;
    let amplitude = 1;
    let frequency = 1;
    for (let i = 0; i < octaves; i++) {
      value += amplitude * noise2D(x * frequency, y * frequency);
      amplitude *= 0.5;
      frequency *= 2;
    }
    return value;
  };

  const { geometry, colors } = useMemo(() => {
    const size = 200;
    const segments = 128;
    const geo = new THREE.PlaneGeometry(size, size, segments, segments);
    
    const vertices = geo.attributes.position.array;
    const colorsArr = new Float32Array(vertices.length);
    
    const colorWater = new THREE.Color("#004466");
    const colorGrass = new THREE.Color("#00aa44");
    const colorRock = new THREE.Color("#666666");
    const colorSnow = new THREE.Color("#ffffff");

    for (let i = 0; i < vertices.length; i += 3) {
      const x = vertices[i];
      const y = vertices[i + 1];
      
      const h = fbm(x / scale, y / scale) * height;
      vertices[i + 2] = h;

      // Set colors based on height
      let vertexColor = colorGrass;
      if (h < -height * 0.2) vertexColor = colorWater;
      else if (h > height * 0.6) vertexColor = colorSnow;
      else if (h > height * 0.3) vertexColor = colorRock;

      colorsArr[i] = vertexColor.r;
      colorsArr[i + 1] = vertexColor.g;
      colorsArr[i + 2] = vertexColor.b;
    }
    
    geo.setAttribute('color', new THREE.BufferAttribute(colorsArr, 3));
    geo.computeVertexNormals();
    return { geometry: geo, colors: colorsArr };
  }, [seed, scale, height]);

  useFrame((state) => {
    const time = state.clock.getElapsedTime() * speed;
    
    if (sunRef.current) {
      const sunAngle = time * 0.1;
      sunRef.current.position.set(
        Math.cos(sunAngle) * 100,
        Math.sin(sunAngle) * 100,
        0
      );
      sunRef.current.intensity = Math.max(0, Math.sin(sunAngle)) * 2;
    }

    if (!meshRef.current || !animate) return;
    
    const vertices = meshRef.current.geometry.attributes.position.array as Float32Array;
    const colorsArr = meshRef.current.geometry.attributes.color.array as Float32Array;
    
    const colorWater = new THREE.Color("#004466");
    const colorGrass = new THREE.Color("#00aa44");
    const colorRock = new THREE.Color("#666666");
    const colorSnow = new THREE.Color("#ffffff");

    for (let i = 0; i < vertices.length; i += 3) {
      const x = vertices[i];
      const y = vertices[i + 1];
      
      const h = fbm(x / scale + time * 0.1, y / scale + time * 0.1) * height;
      vertices[i + 2] = h;

      let vertexColor = colorGrass;
      if (h < -height * 0.2) vertexColor = colorWater;
      else if (h > height * 0.6) vertexColor = colorSnow;
      else if (h > height * 0.3) vertexColor = colorRock;

      colorsArr[i] = vertexColor.r;
      colorsArr[i + 1] = vertexColor.g;
      colorsArr[i + 2] = vertexColor.b;
    }
    
    meshRef.current.geometry.attributes.position.needsUpdate = true;
    meshRef.current.geometry.attributes.color.needsUpdate = true;
    meshRef.current.geometry.computeVertexNormals();

    if (waterRef.current) {
      waterRef.current.position.y = -10 + Math.sin(time) * 0.2;
    }
  });

  const scatteredObjects = useMemo(() => {
    if (wireframe || !enabled) return null;
    const objects = [];
    const count = 50;
    const size = 200;
    
    for (let i = 0; i < count; i++) {
      const x = (Math.random() - 0.5) * size;
      const y = (Math.random() - 0.5) * size;
      const h = fbm(x / scale, y / scale) * height;
      
      if (h > height * 0.1 && h < height * 0.6) {
        // Only place objects on grass/rock, not water or snow
        const type = Math.random() > 0.5 ? 'tree' : 'rock';
        objects.push({
          id: i,
          position: [x, h - 10, y] as [number, number, number],
          scale: type === 'tree' ? 0.5 + Math.random() : 0.2 + Math.random() * 0.5,
          type
        });
      }
    }
    return objects;
  }, [enabled, wireframe, seed, scale, height]);

  if (!enabled) return null;

  return (
    <group>
      <directionalLight ref={sunRef} castShadow />
      <mesh 
        ref={meshRef} 
        rotation={[-Math.PI / 2, 0, 0]} 
        position={[0, -10, 0]} 
        geometry={geometry}
      >
        <meshStandardMaterial 
          vertexColors={!wireframe}
          color={wireframe ? color : "#ffffff"} 
          wireframe={wireframe} 
          transparent={wireframe}
          opacity={wireframe ? 0.6 : 1}
          emissive={wireframe ? color : "#000000"}
          emissiveIntensity={wireframe ? 0.5 : 0}
          side={THREE.DoubleSide}
          flatShading={!wireframe}
        />
      </mesh>

      {scatteredObjects?.map(obj => (
        <group key={`scatter-${obj.id}`} position={obj.position} scale={obj.scale}>
          {obj.type === 'tree' ? (
            <>
              <mesh position={[0, 1.5, 0]}>
                <coneGeometry args={[0.5, 2, 8]} />
                <meshStandardMaterial color="#005522" />
              </mesh>
              <mesh position={[0, 0.5, 0]}>
                <cylinderGeometry args={[0.1, 0.1, 1, 8]} />
                <meshStandardMaterial color="#442200" />
              </mesh>
            </>
          ) : (
            <mesh position={[0, 0.2, 0]}>
              <dodecahedronGeometry args={[0.5]} />
              <meshStandardMaterial color="#888888" />
            </mesh>
          )}
        </group>
      ))}

      {!wireframe && (
        <group>
          {Array.from({ length: 10 }).map((_, i) => (
            <mesh 
              key={`cloud-${i}`} 
              position={[
                (Math.random() - 0.5) * 200, 
                20 + Math.random() * 10, 
                (Math.random() - 0.5) * 200
              ]}
            >
              <sphereGeometry args={[5 + Math.random() * 5, 16, 16]} />
              <meshStandardMaterial color="#ffffff" transparent opacity={0.4} />
            </mesh>
          ))}
        </group>
      )}

      {!wireframe && (
        <mesh 
          ref={waterRef}
          rotation={[-Math.PI / 2, 0, 0]} 
          position={[0, -10 - height * 0.1, 0]}
        >
          <planeGeometry args={[200, 200]} />
          <meshStandardMaterial 
            color="#0066ff" 
            transparent 
            opacity={0.6} 
            metalness={0.8} 
            roughness={0.2} 
          />
        </mesh>
      )}
    </group>
  );
};
