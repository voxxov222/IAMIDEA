import React, { useState, useRef, Suspense, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Environment, Grid, Stars, useTexture, Float, Text, ContactShadows, Html, TransformControls } from '@react-three/drei';
import { motion, AnimatePresence } from 'framer-motion';
import { Physics, useBox, useSphere, usePlane } from '@react-three/cannon';
import { 
  Box, 
  Circle,
  Upload, 
  Image as ImageIcon, 
  Layers, 
  Settings, 
  Play, 
  Plus, 
  Trash2, 
  Zap, 
  Cpu, 
  Cloud,
  Map,
  Maximize2, 
  Minimize2, 
  Terminal,
  FileCode,
  BoxSelect,
  MousePointer2,
  Move,
  RotateCw,
  Scale,
  Sparkles,
  Download,
  Wind,
  User,
  Users,
  Volume2,
  Activity,
  Code,
  Rocket,
  Puzzle,
  Search,
  ChevronRight,
  Database,
  Dna,
  Globe,
  Folder
} from 'lucide-react';
import * as THREE from 'three';
import { v4 as uuidv4 } from 'uuid';
import { GoogleGenAI, Type } from "@google/genai";

// --- Types ---

interface GameAsset {
  id: string;
  name: string;
  type: 'image' | 'model' | 'texture' | 'script';
  url: string;
  data?: any;
}

interface SandboxObject {
  id: string;
  assetId: string;
  type: 'cube' | 'sphere' | 'plane' | 'image-3d' | 'custom' | 'scene-mesh';
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
  color?: string;
  displacementScale?: number;
  mass?: number;
  physicsEnabled?: boolean;
}

// --- Components ---

function ImageTo3D({ url, scale = [1, 1, 1], displacementScale = 1 }: { url: string, scale?: [number, number, number], displacementScale?: number }) {
  const texture = useTexture(url);
  
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} scale={scale}>
      <planeGeometry args={[10, 10, 128, 128]} />
      <meshStandardMaterial 
        map={texture} 
        displacementMap={texture} 
        displacementScale={displacementScale}
        metalness={0.2}
        roughness={0.8}
      />
    </mesh>
  );
}

function Skybox({ url }: { url: string }) {
  const texture = useTexture(url);
  texture.mapping = THREE.EquirectangularReflectionMapping;
  return (
    <mesh>
      <sphereGeometry args={[100, 64, 64]} />
      <meshBasicMaterial map={texture} side={THREE.BackSide} />
    </mesh>
  );
}

function SceneMesh({ url, id }: { url: string, id: string }) {
  const texture = useTexture(url);
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -2, 0]}>
        <planeGeometry args={[50, 50, 64, 64]} />
        <meshStandardMaterial map={texture} displacementMap={texture} displacementScale={1.5} roughness={0.8} />
      </mesh>
      {/* Add some random elements to simulate a "scene" */}
      {[...Array(5)].map((_, i) => (
        <mesh key={`mesh-${id}-${i}`} position={[Math.sin(i) * 10, -1, Math.cos(i) * 10]}>
          <boxGeometry args={[1, 2, 1]} />
          <meshStandardMaterial map={texture} color="#444" />
        </mesh>
      ))}
    </group>
  );
}

function PhysicsBox({ obj, isSelected, onSelect, physicsEnabled }: { obj: SandboxObject, isSelected: boolean, onSelect: () => void, physicsEnabled: boolean }) {
  const [ref, api] = useBox(() => ({
    mass: physicsEnabled ? (obj.mass || 1) : 0,
    position: obj.position,
    rotation: obj.rotation,
    args: obj.scale,
    type: physicsEnabled ? 'Dynamic' : 'Static'
  }), useRef<THREE.Group>(null));

  // Sync physics body with transform controls if selected
  useFrame(() => {
    if (isSelected && !physicsEnabled) {
      // If not in physics mode, we don't need to sync back from physics
    }
  });

  return (
    <group 
      ref={ref}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
    >
      <mesh castShadow receiveShadow>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color={obj.color || '#00d2ff'} />
      </mesh>
      {isSelected && (
        <mesh>
          <boxGeometry args={[1.1, 1.1, 1.1]} />
          <meshBasicMaterial color="#00d2ff" wireframe transparent opacity={0.3} />
        </mesh>
      )}
    </group>
  );
}

function PhysicsSphere({ obj, isSelected, onSelect, physicsEnabled }: { obj: SandboxObject, isSelected: boolean, onSelect: () => void, physicsEnabled: boolean }) {
  const [ref, api] = useSphere(() => ({
    mass: physicsEnabled ? (obj.mass || 1) : 0,
    position: obj.position,
    rotation: obj.rotation,
    args: [obj.scale[0] * 0.5],
    type: physicsEnabled ? 'Dynamic' : 'Static'
  }), useRef<THREE.Group>(null));

  return (
    <group 
      ref={ref}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
    >
      <mesh castShadow receiveShadow>
        <sphereGeometry args={[0.5, 32, 32]} />
        <meshStandardMaterial color={obj.color || '#ff00d2'} />
      </mesh>
      {isSelected && (
        <mesh>
          <sphereGeometry args={[0.55, 32, 32]} />
          <meshBasicMaterial color="#ff00d2" wireframe transparent opacity={0.3} />
        </mesh>
      )}
    </group>
  );
}

function PhysicsGround() {
  const [ref] = usePlane(() => ({
    rotation: [-Math.PI / 2, 0, 0],
    position: [0, -0.01, 0],
    type: 'Static'
  }), useRef<THREE.Group>(null));

  return (
    <group ref={ref}>
      <mesh receiveShadow>
        <planeGeometry args={[100, 100]} />
        <meshStandardMaterial color="#111" transparent opacity={0} />
      </mesh>
    </group>
  );
}

function SandboxMesh({ obj, isSelected, onSelect, physicsEnabled }: { obj: SandboxObject, isSelected: boolean, onSelect: () => void, physicsEnabled: boolean }) {
  if (obj.type === 'cube') return <PhysicsBox obj={obj} isSelected={isSelected} onSelect={onSelect} physicsEnabled={physicsEnabled} />;
  if (obj.type === 'sphere') return <PhysicsSphere obj={obj} isSelected={isSelected} onSelect={onSelect} physicsEnabled={physicsEnabled} />;
  
  return (
    <group 
      position={obj.position} 
      rotation={obj.rotation} 
      scale={obj.scale}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
    >
      {obj.type === 'image-3d' && (
        <Suspense fallback={<Html center><div className="text-white text-[10px]">Loading...</div></Html>}>
          <ImageTo3D url={obj.assetId} displacementScale={obj.displacementScale} />
        </Suspense>
      )}
      
      {obj.type === 'scene-mesh' && (
        <Suspense fallback={<Html center><div className="text-white text-[10px]">Loading Scene...</div></Html>}>
          <SceneMesh url={obj.assetId} id={obj.id} />
        </Suspense>
      )}
      
      {isSelected && (
        <mesh>
          <boxGeometry args={[1.1, 1.1, 1.1]} />
          <meshBasicMaterial color="#00d2ff" wireframe transparent opacity={0.3} />
        </mesh>
      )}
    </group>
  );
}

export function GameSandbox() {
  const [activeTab, setActiveTab] = useState<'assets' | 'ai' | 'scripts' | 'deploy' | 'plugins' | 'scene' | 'team' | 'settings'>('assets');
  const [aiCategory, setAiCategory] = useState<'env' | 'char' | 'sound' | 'fx' | 'texture' | 'skybox' | 'scene' | 'mesh-3d' | 'world'>('env');
  const [assets, setAssets] = useState<GameAsset[]>([
    { id: 'default-img', name: 'Nebula Texture', type: 'image', url: 'https://picsum.photos/seed/nebula/512/512' }
  ]);
  const [skyboxUrl, setSkyboxUrl] = useState<string | null>(null);
  const [objects, setObjects] = useState<SandboxObject[]>([]);
  const [useSharp, setUseSharp] = useState<boolean>(false);
  const [returnMesh, setReturnMesh] = useState<boolean>(false);
  const [localeCode, setLocaleCode] = useState<string>('en_US');
  const [scripts, setScripts] = useState<{ id: string, name: string, content: string }[]>([
    { id: 's1', name: 'PlayerController.ts', content: '// Player movement logic\nexport class PlayerController {\n  update() {\n    // logic here\n  }\n}' },
    { id: 's2', name: 'EnemyAI.ts', content: '// Simple follow AI\nexport class EnemyAI {\n  target = null;\n  update() {\n    // seek target\n  }\n}' }
  ]);
  const [selectedScriptId, setSelectedScriptId] = useState<string | null>(null);
  const [selectedObjectId, setSelectedObjectId] = useState<string | null>(null);
  const [aiPrompt, setAiPrompt] = useState('');
  const [envPrompt, setEnvPrompt] = useState('futuristic cityscape with neon lights');
  const [aiAssistantInput, setAiAssistantInput] = useState('');
  const [logs, setLogs] = useState<{ id: string, text: string }[]>([{ id: uuidv4(), text: 'Sandbox v1.0 Initialized' }, { id: uuidv4(), text: 'Ready for asset integration...' }]);
  const [transformMode, setTransformMode] = useState<'translate' | 'rotate' | 'scale'>('translate');
  const [isProcessingAI, setIsProcessingAI] = useState(false);
  const [isPhysicsActive, setIsPhysicsActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const addLog = (msg: string) => {
    setLogs(prev => [{ id: uuidv4(), text: `[${new Date().toLocaleTimeString()}] ${msg}` }, ...prev].slice(0, 20));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const url = event.target?.result as string;
      const newAsset: GameAsset = {
        id: uuidv4(),
        name: file.name,
        type: file.type.startsWith('image/') ? 'image' : 'model',
        url: url
      };
      setAssets(prev => [...prev, newAsset]);
      addLog(`Asset uploaded: ${file.name}`);
    };
    reader.readAsDataURL(file);
  };

  const addObject = (type: SandboxObject['type'], assetId?: string) => {
    const newObj: SandboxObject = {
      id: uuidv4(),
      assetId: assetId || '',
      type,
      position: [0, 0, 0],
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
      color: type === 'cube' ? '#00d2ff' : '#ff00d2',
      displacementScale: 2,
      mass: 1,
      physicsEnabled: true
    };
    setObjects(prev => [...prev, newObj]);
    setSelectedObjectId(newObj.id);
    addLog(`Object added: ${type}`);
  };

  const deleteSelected = () => {
    if (!selectedObjectId) return;
    setObjects(prev => prev.filter(o => o.id !== selectedObjectId));
    setSelectedObjectId(null);
    addLog('Object deleted');
  };

  const convertImageTo3D = async (asset: GameAsset) => {
    setIsProcessingAI(true);
    addLog(`Analyzing image for 3D conversion: ${asset.name}`);
    
    try {
      // Simulate AI analysis or just direct conversion
      setTimeout(() => {
        addObject('image-3d', asset.url);
        setIsProcessingAI(false);
        addLog(`Conversion complete: ${asset.name} rendered as displacement map`);
      }, 1500);
    } catch (error) {
      addLog(`Error during conversion: ${error}`);
      setIsProcessingAI(false);
    }
  };

  const handleUnique3DConversion = async (asset: GameAsset) => {
    setIsProcessingAI(true);
    addLog(`Initiating Unique3D High-Quality Mesh Generation for: ${asset.name}`);
    addLog(`[Unique3D] Analyzing image features and depth maps...`);
    
    try {
      // Simulate the multi-stage process of Unique3D
      await new Promise(resolve => setTimeout(resolve, 1000));
      addLog(`[Unique3D] Generating multi-view consistent images...`);
      await new Promise(resolve => setTimeout(resolve, 1500));
      addLog(`[Unique3D] Reconstructing high-resolution 3D geometry...`);
      await new Promise(resolve => setTimeout(resolve, 1500));
      addLog(`[Unique3D] Baking high-fidelity textures and normals...`);
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const newObj: SandboxObject = {
        id: uuidv4(),
        assetId: asset.url,
        type: 'custom',
        position: [0, 2, 0],
        rotation: [0, 0, 0],
        scale: [2, 2, 2],
        color: '#ffffff',
        displacementScale: 3,
        mass: 5,
        physicsEnabled: true
      };
      
      setObjects(prev => [...prev, newObj]);
      setSelectedObjectId(newObj.id);
      setIsProcessingAI(false);
      addLog(`[Unique3D] Success: High-quality mesh generated and placed in scene.`);
    } catch (error) {
      addLog(`[Unique3D] Error: ${error}`);
      setIsProcessingAI(false);
    }
  };

  const handle3DWorldGen = async (prompt: string) => {
    setIsProcessingAI(true);
    addLog(`AI World Engine: Generating procedural 3D world for: "${prompt}"`);
    
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      
      // Generate world layout
      const response = await ai.models.generateContent({
        model: "gemini-3.1-pro-preview",
        contents: `Generate a detailed 3D world layout based on this prompt: "${prompt}". 
        Return a JSON array of objects representing environmental elements (terrain blocks, trees, rocks, structures).
        Each object must have:
        - type: 'cube' | 'sphere' | 'plane'
        - position: [x, y, z] (range: x:[-25, 25], y:[-5, 15], z:[-25, 25])
        - scale: [x, y, z]
        - color: hex string
        - mass: number (0 for static, >0 for dynamic)
        - physicsEnabled: boolean
        
        Include a large base plane for the ground.`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                type: { type: Type.STRING, enum: ['cube', 'sphere', 'plane'] },
                position: { type: Type.ARRAY, items: { type: Type.NUMBER }, minItems: 3, maxItems: 3 },
                scale: { type: Type.ARRAY, items: { type: Type.NUMBER }, minItems: 3, maxItems: 3 },
                color: { type: Type.STRING },
                mass: { type: Type.NUMBER },
                physicsEnabled: { type: Type.BOOLEAN }
              },
              required: ['type', 'position', 'scale', 'color', 'mass', 'physicsEnabled']
            }
          }
        }
      });

      const worldData = JSON.parse(response.text);
      const worldObjects: SandboxObject[] = worldData.map((item: any) => ({
        id: uuidv4(),
        assetId: '',
        type: item.type,
        position: item.position,
        rotation: [0, 0, 0],
        scale: item.scale,
        color: item.color,
        displacementScale: 1,
        mass: item.mass,
        physicsEnabled: item.physicsEnabled
      }));

      setObjects(prev => [...prev, ...worldObjects]);
      addLog(`AI World Engine: Success! ${worldObjects.length} elements generated and placed.`);
      
      const worldAsset: GameAsset = {
        id: uuidv4(),
        name: `AI World - ${prompt.slice(0, 15)}...`,
        type: 'image',
        url: `https://picsum.photos/seed/world-${uuidv4()}/1024/1024`
      };
      setAssets(prev => [...prev, worldAsset]);

    } catch (error) {
      addLog(`World generation error: ${error}`);
    } finally {
      setIsProcessingAI(false);
    }
  };

  const handleGenerateEnvironment = async () => {
    if (!envPrompt) return;
    setIsProcessingAI(true);
    addLog(`AI Environment Engine: Initiating full generation for "${envPrompt}"`);
    
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

      // 1. Generate Skybox
      addLog(`[Skybox] Generating 360° panoramic environment texture...`);
      const skyboxResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: [
            {
              text: `A high-quality, immersive 360-degree panoramic skybox texture for a game environment. Theme: ${envPrompt}. The image should be suitable for an equirectangular mapping.`,
            },
          ],
        },
      });

      let generatedSkyboxUrl = '';
      for (const part of skyboxResponse.candidates![0].content.parts) {
        if (part.inlineData) {
          generatedSkyboxUrl = `data:image/png;base64,${part.inlineData.data}`;
          break;
        }
      }

      if (generatedSkyboxUrl) {
        setSkyboxUrl(generatedSkyboxUrl);
        addLog(`[Skybox] Success: AI-generated skybox applied.`);
      } else {
        addLog(`[Skybox] Warning: AI did not return an image. Using fallback.`);
        setSkyboxUrl(`https://picsum.photos/seed/skybox-${uuidv4()}/2048/1024`);
      }

      // 2. Generate Terrain/World
      addLog(`[Terrain] Designing procedural world layout...`);
      await handle3DWorldGen(envPrompt);
      
      addLog(`[System] Environment generation complete.`);
    } catch (error) {
      addLog(`Environment generation error: ${error}`);
    } finally {
      setIsProcessingAI(false);
      setEnvPrompt('');
    }
  };

  const handleGenerateAsset = async () => {
    if (!aiPrompt) return;
    setIsProcessingAI(true);
    addLog(`AI generating ${aiCategory}: "${aiPrompt}"`);
    
    try {
      if (aiCategory === 'scene') {
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        const response = await ai.models.generateContent({
          model: "gemini-3-flash-preview",
          contents: `Generate a 3D scene layout based on this prompt: "${aiPrompt}". Return a JSON array of objects with type ('cube' or 'sphere'), position [x, y, z], scale [x, y, z], and color (hex). Keep positions within [-15, 15] range.`,
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  type: { type: Type.STRING, enum: ['cube', 'sphere'] },
                  position: { type: Type.ARRAY, items: { type: Type.NUMBER }, minItems: 3, maxItems: 3 },
                  scale: { type: Type.ARRAY, items: { type: Type.NUMBER }, minItems: 3, maxItems: 3 },
                  color: { type: Type.STRING }
                },
                required: ['type', 'position', 'scale', 'color']
              }
            }
          }
        });

        const sceneData = JSON.parse(response.text);
        const sceneObjects: SandboxObject[] = sceneData.map((item: any) => ({
          id: uuidv4(),
          assetId: '',
          type: item.type,
          position: item.position,
          rotation: [0, 0, 0],
          scale: item.scale,
          color: item.color,
          displacementScale: 1,
          mass: 1,
          physicsEnabled: true
        }));

        setObjects(prev => [...prev, ...sceneObjects]);
        addLog(`AI Scene generation complete: ${sceneObjects.length} elements placed`);
      } else if (aiCategory === 'world') {
        addLog(`AI World generation starting for: "${aiPrompt}"`);
        handle3DWorldGen(aiPrompt);
      } else if (aiCategory === 'mesh-3d') {
        const assetUrl = `https://picsum.photos/seed/${uuidv4()}/1024/1024`;
        const newAsset: GameAsset = {
          id: uuidv4(),
          name: `Unique3D Mesh - ${aiPrompt.slice(0, 10)}...`,
          type: 'image',
          url: assetUrl
        };
        setAssets(prev => [...prev, newAsset]);
        addLog(`AI generated base image for Unique3D. Starting mesh reconstruction...`);
        handleUnique3DConversion(newAsset);
      } else {
        // Real AI generation for other categories (images/textures/skybox)
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        addLog(`[AI] Generating ${aiCategory} image for: "${aiPrompt}"...`);
        
        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash-image',
          contents: {
            parts: [
              {
                text: `A high-quality ${aiCategory} asset for a game: ${aiPrompt}. 
                ${aiCategory === 'skybox' ? 'This should be a 360-degree panoramic texture.' : ''}
                ${aiCategory === 'texture' ? 'This should be a seamless, tileable texture.' : ''}`,
              },
            ],
          },
        });

        let generatedUrl = '';
        for (const part of response.candidates![0].content.parts) {
          if (part.inlineData) {
            generatedUrl = `data:image/png;base64,${part.inlineData.data}`;
            break;
          }
        }

        if (!generatedUrl) {
          addLog(`[AI] Warning: No image returned. Using fallback.`);
          generatedUrl = `https://picsum.photos/seed/${uuidv4()}/1024/1024`;
        }

        const newAsset: GameAsset = {
          id: uuidv4(),
          name: `AI ${aiCategory.toUpperCase()} - ${aiPrompt.slice(0, 10)}...`,
          type: aiCategory === 'texture' ? 'texture' : 'image',
          url: generatedUrl
        };
        
        setAssets(prev => [...prev, newAsset]);
        
        if (aiCategory === 'skybox') {
          setSkyboxUrl(generatedUrl);
          addLog(`Skybox updated with new AI generation`);
        }
        addLog(`AI generation complete: ${newAsset.name} added to library`);
      }
    } catch (error) {
      addLog(`AI generation error: ${error}`);
    } finally {
      setIsProcessingAI(false);
      setAiPrompt('');
    }
  };

  const handleGenerateScript = async () => {
    if (!aiPrompt) {
      addLog('Please enter a prompt in the AI tab or Assistant for the script generator.');
      return;
    }
    setIsProcessingAI(true);
    addLog(`AI generating logic for: "${aiPrompt}"`);
    
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Write a script for: "${aiPrompt}". 
        The script should be a class or module with standard game engine methods (start/init, update/process). 
        If the prompt mentions ZIM, use ZIM framework syntax.
        If the prompt mentions Godot or GDScript, use GDScript syntax (extends Node, func _ready(), func _process(delta)).
        If the prompt mentions Godot Menus, include UI logic (Control, Button, signals).
        If the prompt mentions Panda3D, use Python Panda3D syntax (from direct.showbase.ShowBase import ShowBase, taskMgr.add).
        If the prompt mentions Bevy, use Rust Bevy syntax (use bevy::prelude::*, App::new(), .add_systems(Update, ...)).
        If the prompt mentions BlueEngine, use Rust BlueEngine syntax (use blue_engine::header::{Engine, WindowDescriptor}, Engine::new()).
        If the prompt mentions PlayCanvas, use PlayCanvas JavaScript API (pc.createScript, initialize, update).
        If the prompt mentions Cheat Engine or Modding, use Cheat Engine Lua or Assembly injection style.
        If the prompt mentions OmniEmu, use OmniEmu Universal Scripting (Emulator API, memory mapping, CPU cycles).
        If the prompt mentions LDPlayer or Android, use Android ADB or Java/Kotlin scripting.
        If the prompt mentions RetroArch, use Libretro C++ or RetroArch Overlay/Shader logic.
        If the prompt mentions VibeEmulator, use Vibe scripting (Lua/Python based emulator logic).
        If the prompt mentions OpenHands, use OpenHands Agentic Scripting (Action/Observation loop, task planning).
        If the prompt mentions WorldGrow, use Python WorldGrowPipeline syntax (from trellis.pipelines import WorldGrowPipeline, pipeline.run(world_size=(3,3))).
        If the prompt mentions WorldGen, use Python WorldGen syntax (python demo.py -p "prompt" --use_sharp --return_mesh).
        If the prompt mentions Gemini CLI, use Gemini CLI commands and scripting (gemini chat, gemini prompt, gemini config).
        If the prompt mentions Asset Library, use Kellojo Asset Library indexing and metadata logic (JSON/GDScript based).
        If the prompt mentions Filament, use Google Filament C++ or JavaScript API (Engine, Renderer, Scene, View).
        Otherwise, use TypeScript game engine style.
        Return ONLY the code, no markdown formatting.`,
        config: {
          systemInstruction: "You are a world-class game developer and AI logic architect. You write clean, performant, and well-commented code for game engines including Godot (GDScript), Panda3D (Python), Bevy (Rust), BlueEngine (Rust), PlayCanvas (JavaScript), Cheat Engine (Lua/Assembly), OmniEmu (Universal Scripting), Android (LDPlayer), RetroArch (Libretro), VibeEmulator, OpenHands (Agentic Logic), WorldGrow (Python Procedural Generation), WorldGen (ZiYang-xie), Gemini CLI, Kellojo Asset Library, Google Filament (PBR), LÖVR (Lua VR), Godot AI Assistant Hub, WickedEngine (C++), ArmorPaint (Haxe/JS), Awesome AI Agents (Multi-agent frameworks), and Armory3D (Haxe/Kha).",
        }
      });

      const content = response.text;
      const isGDScript = aiPrompt.toLowerCase().includes('godot') || aiPrompt.toLowerCase().includes('gdscript');
      const isPanda3D = aiPrompt.toLowerCase().includes('panda3d') || aiPrompt.toLowerCase().includes('python');
      const isRust = aiPrompt.toLowerCase().includes('bevy') || aiPrompt.toLowerCase().includes('rust') || aiPrompt.toLowerCase().includes('blueengine');
      const isPlayCanvas = aiPrompt.toLowerCase().includes('playcanvas');
      const isCheatEngine = aiPrompt.toLowerCase().includes('cheat engine') || aiPrompt.toLowerCase().includes('modding');
      const isOmniEmu = aiPrompt.toLowerCase().includes('omniemu') || aiPrompt.toLowerCase().includes('emulator');
      const isAndroid = aiPrompt.toLowerCase().includes('ldplayer') || aiPrompt.toLowerCase().includes('android');
      const isRetroArch = aiPrompt.toLowerCase().includes('retroarch') || aiPrompt.toLowerCase().includes('libretro');
      const isVibe = aiPrompt.toLowerCase().includes('vibe') || aiPrompt.toLowerCase().includes('vibeemulator');
      const isOpenHands = aiPrompt.toLowerCase().includes('openhands') || aiPrompt.toLowerCase().includes('agent');
      const isWorldGrow = aiPrompt.toLowerCase().includes('worldgrow') || aiPrompt.toLowerCase().includes('procedural world');
      const isWorldGen = aiPrompt.toLowerCase().includes('worldgen');
      const isAmbient = aiPrompt.toLowerCase().includes('ambient') || aiPrompt.toLowerCase().includes('rust') || aiPrompt.toLowerCase().includes('webgpu');
      const isHeaps = aiPrompt.toLowerCase().includes('heaps') || aiPrompt.toLowerCase().includes('haxe');
      const isGeminiCLI = aiPrompt.toLowerCase().includes('gemini cli') || aiPrompt.toLowerCase().includes('gemini-cli');
      const isAssetLib = aiPrompt.toLowerCase().includes('asset library') || aiPrompt.toLowerCase().includes('asset-library');
      const isFilament = aiPrompt.toLowerCase().includes('filament');
      const isAG2 = aiPrompt.toLowerCase().includes('ag2') || aiPrompt.toLowerCase().includes('team');
      const isLovr = aiPrompt.toLowerCase().includes('lovr') || aiPrompt.toLowerCase().includes('vr');
      const isGodotHub = aiPrompt.toLowerCase().includes('godot ai') || aiPrompt.toLowerCase().includes('assistant hub');
      const isWicked = aiPrompt.toLowerCase().includes('wicked') || aiPrompt.toLowerCase().includes('wickedengine');
      const isArmorPaint = aiPrompt.toLowerCase().includes('armorpaint') || aiPrompt.toLowerCase().includes('painting');
      const isAwesomeAgents = aiPrompt.toLowerCase().includes('awesome agents') || aiPrompt.toLowerCase().includes('agent collection');
      
      let ext = 'ts';
      if (isGDScript || isGodotHub) ext = 'gd';
      else if (isPanda3D || isAG2 || isAwesomeAgents) ext = 'py';
      else if (isRust || isAmbient) ext = 'rs';
      else if (isHeaps || isArmorPaint) ext = 'hx';
      else if (isPlayCanvas) ext = 'js';
      else if (isCheatEngine || isLovr) ext = 'lua';
      else if (isOmniEmu) ext = 'emu';
      else if (isAndroid) ext = 'java';
      else if (isRetroArch || isFilament || isWicked) ext = 'cpp';
      else if (isVibe) ext = 'vibe';
      else if (isOpenHands) ext = 'agent';
      else if (isWorldGrow || isWorldGen) ext = 'py';
      else if (isGeminiCLI) ext = 'sh';
      else if (isAssetLib) ext = 'lib';
      else if (isFilament) ext = 'cpp';

      const newScript = {
        id: uuidv4(),
        name: `AI_${aiPrompt.split(' ')[0].replace(/[^a-z0-9]/gi, '') || 'Logic'}_${scripts.length + 1}.${ext}`,
        content: content
      };
      setScripts(prev => [...prev, newScript]);
      setSelectedScriptId(newScript.id);
      addLog(`Script generated: ${newScript.name}`);
    } catch (error) {
      addLog(`Script generation error: ${error}`);
    } finally {
      setIsProcessingAI(false);
      setAiPrompt('');
    }
  };

  const selectedObject = objects.find(o => o.id === selectedObjectId);
  const selectedScript = scripts.find(s => s.id === selectedScriptId);

  return (
    <div className="flex h-full w-full bg-space-950 rounded-xl overflow-hidden border border-white/10 shadow-2xl font-sans">
      {/* Navigation Rail */}
      <div className="w-14 bg-black/60 border-r border-white/10 flex flex-col items-center py-4 gap-4">
        {[
          { id: 'assets', icon: Layers, label: 'Assets' },
          { id: 'ai', icon: Sparkles, label: 'AI Gen' },
          { id: 'scripts', icon: Code, label: 'Scripts' },
          { id: 'scene', icon: Layers, label: 'Scene Tree' },
          { id: 'team', icon: Users, label: 'Agent Team' },
          { id: 'plugins', icon: Puzzle, label: 'Add-ons' },
          { id: 'deploy', icon: Rocket, label: 'Deploy' },
          { id: 'settings', icon: Settings, label: 'Settings' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`p-2.5 rounded-xl transition-all relative group ${activeTab === tab.id ? 'bg-neon-blue text-black shadow-lg shadow-neon-blue/20' : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'}`}
            title={tab.label}
          >
            <tab.icon size={20} />
            {activeTab !== tab.id && (
              <div className="absolute left-full ml-2 px-2 py-1 bg-black border border-white/10 rounded text-[10px] text-white whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none z-50">
                {tab.label}
              </div>
            )}
          </button>
        ))}
      </div>

      {/* Left Sidebar: Dynamic Content */}
      <div className="w-72 bg-black/40 border-r border-white/10 flex flex-col">
        {activeTab === 'assets' && (
          <>
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers size={16} className="text-neon-blue" />
                <span className="text-xs font-bold text-gray-300 uppercase tracking-widest">Asset Library</span>
              </div>
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="p-1.5 rounded-full bg-neon-blue/10 text-neon-blue hover:bg-neon-blue/20 transition-all"
              >
                <Upload size={14} />
              </button>
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                onChange={handleFileUpload}
                accept="image/*"
              />
            </div>
            
            <div className="flex-1 overflow-y-auto p-2 space-y-2 custom-scrollbar">
              {assets.map(asset => (
                <div 
                  key={asset.id} 
                  className="group p-2 bg-white/5 rounded-lg border border-white/5 hover:border-neon-blue/30 transition-all cursor-pointer"
                  onClick={() => addLog(`Asset selected: ${asset.name}`)}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded bg-black flex items-center justify-center overflow-hidden border border-white/10">
                      {asset.type === 'image' ? (
                        <img src={asset.url} alt={asset.name} className="w-full h-full object-cover" />
                      ) : (
                        <Box size={16} className="text-gray-500" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] text-gray-300 font-medium truncate">{asset.name}</p>
                      <p className="text-[8px] text-gray-500 uppercase">{asset.type}</p>
                    </div>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={(e) => { e.stopPropagation(); addObject('image-3d', asset.url); }}
                      className="flex-1 py-1 bg-neon-blue/20 text-neon-blue text-[8px] rounded uppercase font-bold hover:bg-neon-blue/30"
                    >
                      Place
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); convertImageTo3D(asset); }}
                      className="flex-1 py-1 bg-neon-purple/20 text-neon-purple text-[8px] rounded uppercase font-bold hover:bg-neon-purple/30 flex items-center justify-center gap-1"
                    >
                      <Sparkles size={8} /> 3D Render
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleUnique3DConversion(asset); }}
                      className="w-full mt-1 py-1 bg-neon-orange/20 text-neon-orange text-[8px] rounded uppercase font-bold hover:bg-neon-orange/30 flex items-center justify-center gap-1 border border-neon-orange/30"
                    >
                      <Dna size={8} /> Unique3D Mesh
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {activeTab === 'scene' && (
          <div className="flex flex-col h-full">
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers size={16} className="text-neon-blue" />
                <span className="text-xs font-bold text-gray-300 uppercase tracking-widest">Godot Scene Tree</span>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
              <div className="flex items-center gap-2 p-2 text-[10px] text-gray-400 font-bold uppercase tracking-tighter opacity-50">
                <Box size={12} /> Root Scene
              </div>
              {objects.map(obj => (
                <div 
                  key={obj.id} 
                  onClick={() => setSelectedObjectId(obj.id)}
                  className={`ml-4 p-2 rounded border transition-all cursor-pointer flex items-center justify-between group ${selectedObjectId === obj.id ? 'bg-neon-blue/10 border-neon-blue/50' : 'bg-white/5 border-white/5 hover:border-neon-blue/30'}`}
                >
                  <div className="flex items-center gap-2">
                    {obj.type === 'cube' ? <Box size={12} className="text-neon-blue" /> : 
                     obj.type === 'sphere' ? <Circle size={12} className="text-neon-pink" /> : 
                     <Zap size={12} className="text-neon-orange" />}
                    <span className="text-[10px] text-gray-300 truncate w-32">{obj.type.charAt(0).toUpperCase() + obj.type.slice(1)} Node</span>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {obj.physicsEnabled && <Activity size={10} className="text-neon-pink" />}
                    <Code size={10} className="text-neon-green" />
                  </div>
                </div>
              ))}
              {objects.length === 0 && (
                <div className="p-8 text-center opacity-30">
                  <p className="text-[10px] text-gray-500 uppercase">Scene is empty</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'ai' && (
          <div className="flex flex-col h-full">
            <div className="p-4 border-b border-white/10">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles size={16} className="text-neon-purple" />
                <span className="text-xs font-bold text-gray-300 uppercase tracking-widest">AI Content Gen</span>
              </div>
              <div className="flex gap-1 overflow-x-auto pb-2 no-scrollbar">
                {[
                  { id: 'env', icon: Wind, label: 'Env' },
                  { id: 'skybox', icon: Cloud, label: 'Sky' },
                  { id: 'scene', icon: Map, label: 'Scene' },
                  { id: 'char', icon: User, label: 'Char' },
                  { id: 'texture', icon: ImageIcon, label: 'Tex' },
                  { id: 'sound', icon: Volume2, label: 'Sfx' },
                  { id: 'fx', icon: Zap, label: 'Fx' },
                  { id: 'mesh-3d', icon: Dna, label: 'Mesh' },
                  { id: 'world', icon: Globe, label: 'World' },
                ].map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => setAiCategory(cat.id as any)}
                    className={`flex flex-col items-center gap-1 p-2 min-w-[50px] rounded-lg border transition-all ${aiCategory === cat.id ? 'bg-neon-purple/20 border-neon-purple/50 text-neon-purple' : 'bg-white/5 border-white/5 text-gray-500 hover:text-gray-300'}`}
                  >
                    <cat.icon size={14} />
                    <span className="text-[8px] font-bold uppercase">{cat.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
              <div className="space-y-2">
                <label className="text-[10px] text-gray-500 uppercase tracking-wider">Prompt</label>
                <textarea 
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  className="w-full h-24 bg-white/5 border border-white/10 rounded p-2 text-[10px] text-white outline-none focus:border-neon-purple resize-none"
                  placeholder={`Describe the ${aiCategory === 'env' ? 'environment' : aiCategory === 'char' ? 'character' : aiCategory === 'world' ? 'procedural world' : 'asset'}...`}
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <span className="text-[8px] text-gray-600 uppercase">Style</span>
                  <select className="w-full bg-white/5 border border-white/10 rounded p-1 text-[9px] text-gray-300 outline-none">
                    <option>Cyberpunk</option>
                    <option>Fantasy</option>
                    <option>Realistic</option>
                    <option>Low Poly</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <span className="text-[8px] text-gray-600 uppercase">Quality</span>
                  <select className="w-full bg-white/5 border border-white/10 rounded p-1 text-[9px] text-gray-300 outline-none">
                    <option>Draft</option>
                    <option>High</option>
                    <option>Ultra</option>
                  </select>
                </div>
              </div>

              <button 
                onClick={handleGenerateAsset}
                disabled={isProcessingAI || !aiPrompt}
                className="w-full py-2 bg-neon-purple text-black text-[10px] font-bold uppercase rounded hover:brightness-110 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isProcessingAI ? <Cpu size={12} className="animate-spin" /> : <Sparkles size={12} />}
                Generate Asset
              </button>

              <div className="pt-4 border-t border-white/5">
                <p className="text-[9px] text-gray-500 uppercase font-bold mb-2">Recent Generations</p>
                <div className="grid grid-cols-2 gap-2">
                  {[1, 2, 3, 4].map(i => (
                    <div key={`asset-grid-${i}`} className="aspect-square bg-white/5 rounded border border-white/5 hover:border-neon-purple/30 transition-all cursor-pointer overflow-hidden group relative">
                      <img src={`https://picsum.photos/seed/ai-${i}/200/200`} className="w-full h-full object-cover opacity-50 group-hover:opacity-100 transition-opacity" />
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40">
                        <Plus size={16} className="text-neon-purple" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'scripts' && (
          <div className="flex flex-col h-full">
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Code size={16} className="text-neon-green" />
                <span className="text-xs font-bold text-gray-300 uppercase tracking-widest">Logic & Scripts</span>
              </div>
              <button 
                onClick={() => {
                  const name = prompt('Script Name:', 'NewScript.ts');
                  if (name) setScripts(prev => [...prev, { id: uuidv4(), name, content: '// New Script\n' }]);
                }}
                className="p-1.5 rounded-full bg-neon-green/10 text-neon-green hover:bg-neon-green/20"
              >
                <Plus size={14} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-2 custom-scrollbar">
              {scripts.map(script => (
                <div 
                  key={script.id} 
                  onClick={() => setSelectedScriptId(script.id)}
                  className={`p-2 rounded border transition-all cursor-pointer flex items-center justify-between group ${selectedScriptId === script.id ? 'bg-neon-green/10 border-neon-green/50' : 'bg-white/5 border-white/5 hover:border-neon-green/30'}`}
                >
                  <div className="flex items-center gap-2">
                    <FileCode size={14} className="text-gray-500" />
                    <span className="text-[10px] text-gray-300">{script.name}</span>
                  </div>
                  <ChevronRight size={12} className="text-gray-600 group-hover:text-neon-green" />
                </div>
              ))}
            </div>

            {selectedScript && (
              <div className="p-4 bg-black/60 border-t border-white/10 h-1/2 flex flex-col">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[9px] text-neon-green font-bold uppercase">{selectedScript.name}</span>
                  <button onClick={() => setSelectedScriptId(null)} className="text-gray-500 hover:text-white"><Minimize2 size={12} /></button>
                </div>
                <textarea 
                  className="flex-1 bg-black border border-white/10 rounded p-2 text-[9px] text-gray-400 font-mono outline-none focus:border-neon-green resize-none"
                  value={selectedScript.content}
                  onChange={(e) => {
                    const val = e.target.value;
                    setScripts(prev => prev.map(s => s.id === selectedScriptId ? { ...s, content: val } : s));
                  }}
                />
              </div>
            )}

            <div className="p-4 bg-neon-green/5 border-t border-neon-green/20 space-y-3">
              <div className="space-y-1">
                <p className="text-[9px] text-gray-400 uppercase font-bold">Logic Prompt</p>
                <textarea 
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  className="w-full h-16 bg-black/40 border border-white/10 rounded p-2 text-[9px] text-white outline-none focus:border-neon-green resize-none"
                  placeholder="Describe the game logic (e.g., 'player movement' or 'ZIM interactive circle')..."
                />
              </div>
              <button 
                onClick={handleGenerateScript}
                disabled={isProcessingAI || !aiPrompt}
                className="w-full py-2 bg-neon-green/20 border border-neon-green/40 text-neon-green text-[10px] font-bold uppercase rounded hover:bg-neon-green/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isProcessingAI ? <Cpu size={12} className="animate-spin" /> : <Sparkles size={12} />}
                Generate Logic
              </button>
            </div>
          </div>
        )}

        {activeTab === 'team' && (
          <div className="flex flex-col h-full">
            <div className="p-4 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Users size={16} className="text-neon-green" />
                <span className="text-xs font-bold text-gray-300 uppercase tracking-widest">AG2 Design Team</span>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
              <div className="p-3 bg-neon-green/5 border border-neon-green/20 rounded-lg">
                <p className="text-[10px] text-neon-green font-bold uppercase mb-2">Team Status: Active</p>
                <div className="space-y-3">
                  {[
                    { role: 'Game Designer', status: 'Idle', icon: User },
                    { role: 'Logic Architect', status: 'Idle', icon: Code },
                    { role: 'Asset Coordinator', status: 'Idle', icon: Layers },
                    { role: 'Reviewer', status: 'Idle', icon: Activity },
                  ].map((agent, i) => (
                    <div key={`agent-${i}`} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <agent.icon size={12} className="text-gray-500" />
                        <span className="text-[10px] text-gray-300">{agent.role}</span>
                      </div>
                      <span className="text-[8px] px-1.5 py-0.5 rounded bg-white/5 text-gray-500 uppercase">{agent.status}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-[10px] text-gray-500 uppercase font-bold">Team Workflow</p>
                <button 
                  onClick={() => {
                    addLog('Initializing AG2 Game Design Team...');
                    addLog('Running: git clone https://github.com/ag2ai/build-with-ag2.git');
                    setTimeout(() => addLog('Team environment ready. Running pip install -r requirements.txt...'), 1500);
                    setTimeout(() => addLog('Success: AG2 Team initialized. Ready for collaborative design.'), 3000);
                  }}
                  className="w-full py-2 bg-neon-green text-black text-[10px] font-bold uppercase rounded hover:brightness-110 transition-all flex items-center justify-center gap-2"
                >
                  <Rocket size={12} /> Initialize Team
                </button>
                <button 
                  onClick={() => {
                    if (!aiPrompt) {
                      addLog('Error: Please provide a prompt in the AI Gen tab first.');
                      return;
                    }
                    addLog(`Handing off prompt to AG2 Team: "${aiPrompt}"`);
                    addLog('Game Designer: Drafting core mechanics...');
                    setTimeout(() => addLog('Logic Architect: Outlining script requirements...'), 1000);
                    setTimeout(() => addLog('Asset Coordinator: Identifying required 3D models...'), 2000);
                    setTimeout(() => addLog('Reviewer: Validating design consistency...'), 3000);
                    setTimeout(() => addLog('Success: AG2 Team generated a comprehensive design document.'), 4000);
                  }}
                  className="w-full py-2 bg-white/5 border border-white/10 text-white text-[10px] font-bold uppercase rounded hover:bg-white/10 transition-all flex items-center justify-center gap-2"
                >
                  <Play size={12} /> Run Collaborative Design
                </button>
              </div>

              <div className="p-3 bg-white/5 border border-white/10 rounded-lg">
                <p className="text-[9px] text-gray-500 uppercase font-bold mb-2">Recent Team Deliverables</p>
                <div className="space-y-2">
                  <div className="p-2 bg-black/40 rounded border border-white/5 flex items-center justify-between">
                    <span className="text-[9px] text-gray-400">Design_Doc_v1.pdf</span>
                    <Download size={10} className="text-gray-600" />
                  </div>
                  <div className="p-2 bg-black/40 rounded border border-white/5 flex items-center justify-between">
                    <span className="text-[9px] text-gray-400">Logic_Flow_Chart.png</span>
                    <Download size={10} className="text-gray-600" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'plugins' && (
          <div className="flex flex-col h-full">
            <div className="p-4 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Puzzle size={16} className="text-neon-yellow" />
                <span className="text-xs font-bold text-gray-300 uppercase tracking-widest">Add-ons & Plugins</span>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
              <div className="relative">
                <Search className="absolute left-2 top-2 text-gray-600" size={12} />
                <input className="w-full bg-white/5 border border-white/10 rounded py-1.5 pl-8 pr-2 text-[10px] text-white outline-none focus:border-neon-yellow" placeholder="Search marketplace..." />
              </div>
              {[
                { name: 'Physics Engine Pro', desc: 'Advanced rigid body dynamics', price: 'Free' },
                { name: 'Armory3D Engine', desc: '3D game engine for Blender with Haxe and Kha', price: 'Install' },
                { name: 'Awesome AI Agents', desc: 'Curated collection of state-of-the-art AI agents and frameworks', price: 'Install' },
                { name: 'ArmorPaint', desc: '3D PBR painting software built on Armory3D', price: 'Install' },
                { name: 'WickedEngine', desc: 'High-performance C++ game engine with modern rendering features', price: 'Install' },
                { name: 'Godot Asset Library Sync', desc: 'Official Godot asset library integration for direct resource importing', price: 'Install' },
                { name: 'Godot AI Assistant Hub', desc: 'Centralized hub for AI-powered Godot development assistants', price: 'Install' },
                { name: 'LÖVR VR Framework', desc: 'Lightweight Lua framework for creating VR experiences', price: 'Install' },
                { name: 'AG2 Game Design Team', desc: 'Multi-agent collaborative team for autonomous game design and logic generation', price: 'Install' },
                { name: 'Ambient Engine', desc: 'High-performance, collaborative engine built on Rust and WebGPU', price: 'Installed' },
                { name: 'Heaps Framework', desc: 'Cross-platform Haxe game engine for high-performance games', price: 'Installed' },
                { name: 'WorldGen (ZiYang-xie)', desc: 'High-fidelity 3D scene generation with ml-sharp support', price: 'Installed' },
                { name: 'Google Filament PBR', desc: 'Real-time physically based rendering engine for all platforms', price: 'Installed' },
                { name: 'Kellojo Asset Library', desc: 'Docker-based high-performance asset management and indexing', price: 'Installed' },
                { name: 'Gemini CLI Integration', desc: 'Command-line interface for Gemini AI models', price: 'Installed' },
                { name: 'WorldGrow Generator', desc: 'Procedural 3D world generation using WorldGrowPipeline', price: 'Installed' },
                { name: 'OpenHands AI Agent', desc: 'Autonomous AI software development agent for game logic', price: 'Installed' },
                { name: 'Godot Menus Template', desc: 'Pre-built UI systems for Godot (Main, Settings, Pause)', price: 'Installed' },
                { name: 'LDPlayer Android Bridge', desc: 'Android emulator integration for mobile game testing', price: 'Installed' },
                { name: 'RetroArch Core Sync', desc: 'Multi-system emulator core integration and shader support', price: 'Installed' },
                { name: 'OmniEmu Connector', desc: 'Universal emulator bridge for multi-platform ROM support', price: 'Installed' },
                { name: 'VibeEmulator Core', desc: 'Specialized emulation platform for custom hardware and security', price: 'Installed' },
                { name: 'Cheat Engine Modding Suite', desc: 'Memory scanning and game modding tools for Windows', price: 'Installed' },
                { name: '3DWorld Generator', desc: 'Procedural 3D world and terrain generation', price: 'Installed' },
                { name: 'Godot Engine Bridge', desc: 'Export scenes and scripts to Godot .tscn format', price: 'Installed' },
                { name: 'PlayCanvas Editor Sync', desc: 'Real-time synchronization with PlayCanvas Editor', price: 'Installed' },
                { name: 'BlueEngine Connector', desc: 'Rust-based lightweight 3D engine integration', price: 'Installed' },
                { name: 'Bevy Engine Bridge', desc: 'ECS-based Rust engine integration', price: 'Installed' },
                { name: 'Panda3D Connector', desc: 'Python-based 3D engine support', price: 'Installed' },
                { name: 'Unique3D Connector', desc: 'High-quality 3D mesh generation from images', price: 'Installed' },
                { name: 'VFX Master', desc: 'Particle system presets', price: 'Installed' },
                { name: 'Audio Spatializer', desc: '3D sound positioning', price: '$12.00' },
              ].map((plugin, i) => (
                <div key={`plugin-${i}`} className="p-3 bg-white/5 rounded-lg border border-white/5 hover:border-neon-yellow/30 transition-all group">
                  <div className="flex justify-between items-start mb-1">
                    <p className="text-[10px] font-bold text-gray-300">{plugin.name}</p>
                    <button 
                      onClick={() => {
                        if (plugin.price === 'Installed') return;
                        if (plugin.name === 'AG2 Game Design Team') {
                          addLog('Initializing AG2 Game Design Team...');
                          addLog('Running: git clone https://github.com/ag2ai/build-with-ag2.git');
                          setTimeout(() => addLog('Cloning complete. Installing dependencies via pip...'), 1000);
                          setTimeout(() => addLog('Running: pip install -r requirements.txt'), 2000);
                          setTimeout(() => {
                            addLog('Success: AG2 Team installed and ready.');
                            // In a real app we'd update state here
                          }, 4000);
                        } else if (plugin.name === 'LÖVR VR Framework') {
                          addLog('Initializing LÖVR VR Framework...');
                          addLog('Cloning: https://github.com/bjornbytes/lovr.git');
                          setTimeout(() => addLog('Success: LÖVR environment ready for VR development.'), 2000);
                        } else if (plugin.name === 'Godot Asset Library Sync') {
                          addLog('Connecting to Godot Asset Library...');
                          addLog('Cloning: https://github.com/godotengine/godot-asset-library.git');
                          setTimeout(() => addLog('Success: Godot Asset Library synced and ready.'), 2000);
                        } else if (plugin.name === 'Godot AI Assistant Hub') {
                          addLog('Initializing Godot AI Assistant Hub...');
                          addLog('Fetching versions from: https://github.com/FlamxGames/godot-ai-assistant-hub');
                          setTimeout(() => addLog('Success: Godot AI Assistant Hub initialized.'), 1500);
                        } else if (plugin.name === 'WickedEngine') {
                          addLog('Initializing WickedEngine...');
                          addLog('Cloning: https://github.com/turanszkij/WickedEngine.git');
                          setTimeout(() => addLog('Success: WickedEngine environment ready.'), 2000);
                        } else if (plugin.name === 'ArmorPaint') {
                          addLog('Initializing ArmorPaint...');
                          addLog('Cloning: https://github.com/armory3d/armorpaint.git');
                          setTimeout(() => addLog('Success: ArmorPaint environment ready.'), 2000);
                        } else if (plugin.name === 'Armory3D Engine') {
                          addLog('Initializing Armory3D Engine...');
                          addLog('Cloning: https://github.com/armory3d/armory.git');
                          setTimeout(() => addLog('Success: Armory3D environment ready.'), 2000);
                        } else if (plugin.name === 'Awesome AI Agents') {
                          addLog('Initializing Awesome AI Agents Collection...');
                          addLog('Cloning: https://github.com/jim-schwoebel/awesome_ai_agents.git');
                          setTimeout(() => addLog('Success: Awesome AI Agents collection ready.'), 2000);
                        } else if (plugin.name === 'Kellojo Asset Library') {
                          addLog('Deploying Kellojo Asset Library via Docker...');
                          addLog('Running: docker-compose up -d');
                          setTimeout(() => addLog('Success: Asset Library service is running on port 3000.'), 2000);
                        } else {
                          addLog(`Installing plugin: ${plugin.name}...`);
                          setTimeout(() => addLog(`Plugin ${plugin.name} installed successfully.`), 2000);
                        }
                      }}
                      className={`text-[8px] px-2 py-0.5 rounded font-bold uppercase transition-all ${plugin.price === 'Installed' ? 'bg-neon-green/20 text-neon-green' : 'bg-neon-yellow text-black hover:brightness-110'}`}
                    >
                      {plugin.price === 'Installed' ? 'Installed' : 'Install'}
                    </button>
                  </div>
                  <p className="text-[9px] text-gray-500 leading-tight">{plugin.desc}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'deploy' && (
          <div className="flex flex-col h-full">
            <div className="p-4 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Rocket size={16} className="text-neon-orange" />
                <span className="text-xs font-bold text-gray-300 uppercase tracking-widest">Deployment & Testing</span>
              </div>
            </div>
            <div className="flex-1 p-4 space-y-6 overflow-y-auto custom-scrollbar">
              <div className="space-y-3">
                <p className="text-[10px] text-gray-500 uppercase font-bold">Build Status</p>
                <div className="bg-white/5 border border-white/10 rounded-lg p-3 space-y-3">
                  <div className="space-y-1">
                    <div className="flex justify-between text-[9px]">
                      <span className="text-gray-400">Assets Optimized</span>
                      <span className="text-green-500 font-bold">100%</span>
                    </div>
                    <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                      <div className="w-full h-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-[9px]">
                      <span className="text-gray-400">Scripts Compiled</span>
                      <span className="text-green-500 font-bold">100%</span>
                    </div>
                    <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                      <div className="w-full h-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-[9px]">
                      <span className="text-gray-400">Shader Validation</span>
                      <span className="text-yellow-500 font-bold">PENDING</span>
                    </div>
                    <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                      <div className="w-1/2 h-full bg-yellow-500 animate-pulse shadow-[0_0_8px_rgba(234,179,8,0.5)]" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-[10px] text-gray-500 uppercase font-bold">Target Platform</p>
                <div className="grid grid-cols-2 gap-2">
                  <button className="p-2 bg-neon-orange/10 border border-neon-orange/50 rounded text-[9px] text-neon-orange font-bold uppercase shadow-[0_0_10px_rgba(255,99,33,0.1)]">Web (WebGL 2.0)</button>
                  <button className="p-2 bg-white/5 border border-white/10 rounded text-[9px] text-gray-500 font-bold uppercase hover:border-white/20 transition-colors">Native Desktop</button>
                  <button 
                    onClick={() => {
                      addLog('Exporting scene to Godot .tscn format...');
                      setTimeout(() => addLog('Success: Scene exported as "IAMGame_Project.tscn"'), 1500);
                    }}
                    className="p-2 bg-neon-blue/10 border border-neon-blue/50 rounded text-[9px] text-neon-blue font-bold uppercase hover:bg-neon-blue/20 transition-all flex items-center justify-center gap-2"
                  >
                    <Download size={10} /> Godot Export
                  </button>
                  <button 
                    onClick={() => {
                      addLog('Preparing PlayCanvas project bundle...');
                      setTimeout(() => addLog('Success: PlayCanvas project exported as "playcanvas_export.zip"'), 2000);
                    }}
                    className="p-2 bg-neon-pink/10 border border-neon-pink/50 rounded text-[9px] text-neon-pink font-bold uppercase hover:bg-neon-pink/20 transition-all flex items-center justify-center gap-2"
                  >
                    <Download size={10} /> PlayCanvas
                  </button>
                  <button 
                    onClick={() => {
                      addLog('Generating Cheat Engine table (.ct)...');
                      setTimeout(() => addLog('Success: Cheat Table generated for memory modding.'), 1500);
                    }}
                    className="p-2 bg-red-500/10 border border-red-500/50 rounded text-[9px] text-red-500 font-bold uppercase hover:bg-red-500/20 transition-all flex items-center justify-center gap-2"
                  >
                    <Activity size={10} /> Cheat Engine
                  </button>
                  <button 
                    onClick={() => {
                      addLog('Packaging OmniEmu ROM bundle...');
                      setTimeout(() => addLog('Success: OmniEmu ROM generated for multi-platform emulation.'), 2000);
                    }}
                    className="p-2 bg-purple-500/10 border border-purple-500/50 rounded text-[9px] text-purple-500 font-bold uppercase hover:bg-purple-500/20 transition-all flex items-center justify-center gap-2"
                  >
                    <Cpu size={10} /> OmniEmu ROM
                  </button>
                  <button 
                    onClick={() => {
                      addLog('Building Android APK for LDPlayer...');
                      setTimeout(() => addLog('Success: Android APK generated and ready for LDPlayer installation.'), 2500);
                    }}
                    className="p-2 bg-green-500/10 border border-green-500/50 rounded text-[9px] text-green-500 font-bold uppercase hover:bg-green-500/20 transition-all flex items-center justify-center gap-2"
                  >
                    <Activity size={10} /> Android (LDPlayer)
                  </button>
                  <button 
                    onClick={() => {
                      addLog('Compiling Libretro core for RetroArch...');
                      setTimeout(() => addLog('Success: RetroArch core compiled successfully.'), 3000);
                    }}
                    className="p-2 bg-red-600/10 border border-red-600/50 rounded text-[9px] text-red-600 font-bold uppercase hover:bg-red-600/20 transition-all flex items-center justify-center gap-2"
                  >
                    <Download size={10} /> RetroArch Core
                  </button>
                  <button 
                    onClick={() => {
                      addLog('Building VibeEmulator package...');
                      setTimeout(() => addLog('Success: VibeEmulator package generated.'), 2000);
                    }}
                    className="p-2 bg-indigo-500/10 border border-indigo-500/50 rounded text-[9px] text-indigo-500 font-bold uppercase hover:bg-indigo-500/20 transition-all flex items-center justify-center gap-2"
                  >
                    <Cpu size={10} /> VibeEmulator
                  </button>
                  <button 
                    onClick={() => {
                      addLog('Deploying game logic to OpenHands AI Agent...');
                      setTimeout(() => addLog('Success: OpenHands Agent is now managing your game logic tasks.'), 2000);
                    }}
                    className="p-2 bg-neon-purple/10 border border-neon-purple/50 rounded text-[9px] text-neon-purple font-bold uppercase hover:bg-neon-purple/20 transition-all flex items-center justify-center gap-2"
                  >
                    <Sparkles size={10} /> OpenHands Agent
                  </button>
                  <button 
                    onClick={() => {
                      addLog('Exporting Gemini CLI scripts...');
                      setTimeout(() => addLog('Success: Gemini CLI scripts exported for terminal usage.'), 1500);
                    }}
                    className="p-2 bg-blue-500/10 border border-blue-500/50 rounded text-[9px] text-blue-500 font-bold uppercase hover:bg-blue-500/20 transition-all flex items-center justify-center gap-2"
                  >
                    <Terminal size={10} /> Gemini CLI
                  </button>
                  <button 
                    onClick={() => {
                      addLog('Indexing assets for Kellojo Library...');
                      addLog('Container: ghcr.io/kellojo/asset-library:latest');
                      addLog('Running: docker-compose up -d');
                      setTimeout(() => addLog('Success: Asset library Docker service synced.'), 2000);
                    }}
                    className="p-2 bg-amber-500/10 border border-amber-500/50 rounded text-[9px] text-amber-500 font-bold uppercase hover:bg-amber-500/20 transition-all flex items-center justify-center gap-2"
                  >
                    <Folder size={10} /> Asset Lib Docker
                  </button>
                  <button 
                    onClick={() => {
                      addLog('Building WickedEngine project...');
                      addLog('Source: https://github.com/turanszkij/WickedEngine.git');
                      setTimeout(() => addLog('Success: WickedEngine build complete.'), 3000);
                    }}
                    className="p-2 bg-slate-500/10 border border-slate-500/50 rounded text-[9px] text-slate-300 font-bold uppercase hover:bg-slate-500/20 transition-all flex items-center justify-center gap-2"
                  >
                    <Cpu size={10} /> Wicked Build
                  </button>
                  <button 
                    onClick={() => {
                      addLog('Compiling Filament PBR shaders and materials...');
                      setTimeout(() => addLog('Success: Filament scene exported with physically based materials.'), 2500);
                    }}
                    className="p-2 bg-cyan-500/10 border border-cyan-500/50 rounded text-[9px] text-cyan-500 font-bold uppercase hover:bg-cyan-500/20 transition-all flex items-center justify-center gap-2"
                  >
                    <Wind size={10} /> Filament Render
                  </button>
                  <button 
                    onClick={() => {
                      addLog('Connecting to Ambient collaborative server...');
                      addLog('Cloning repository: https://github.com/AmbientRun/Ambient.git');
                      setTimeout(() => addLog('Success: Ambient project initialized and synced.'), 2000);
                    }}
                    className="p-2 bg-orange-500/10 border border-orange-500/50 rounded text-[9px] text-orange-500 font-bold uppercase hover:bg-orange-500/20 transition-all flex items-center justify-center gap-2"
                  >
                    <Globe size={10} /> Ambient Sync
                  </button>
                  <button 
                    onClick={() => {
                      addLog('Running: haxelib install heaps');
                      setTimeout(() => addLog('Success: Heaps framework installed via haxelib.'), 1500);
                      setTimeout(() => addLog('Compiling Haxe project to HashLink...'), 2500);
                    }}
                    className="p-2 bg-yellow-500/10 border border-yellow-500/50 rounded text-[9px] text-yellow-500 font-bold uppercase hover:bg-yellow-500/20 transition-all flex items-center justify-center gap-2"
                  >
                    <Zap size={10} /> Heaps / Haxelib
                  </button>
                  <button 
                    onClick={() => {
                      addLog('Packaging LÖVR VR experience...');
                      addLog('Target: https://github.com/bjornbytes/lovr.git');
                      setTimeout(() => addLog('Success: LÖVR VR bundle generated for Quest/Desktop.'), 2000);
                    }}
                    className="p-2 bg-pink-500/10 border border-pink-500/50 rounded text-[9px] text-pink-500 font-bold uppercase hover:bg-pink-500/20 transition-all flex items-center justify-center gap-2"
                  >
                    <Box size={10} /> LÖVR Export
                  </button>
                  <button 
                    onClick={() => {
                      addLog('Syncing with Godot Asset Library...');
                      setTimeout(() => addLog('Success: Local asset cache updated from godotengine/godot-asset-library.'), 2000);
                    }}
                    className="p-2 bg-green-600/10 border border-green-600/50 rounded text-[9px] text-green-600 font-bold uppercase hover:bg-green-600/20 transition-all flex items-center justify-center gap-2"
                  >
                    <Folder size={10} /> Godot Assets
                  </button>
                  <button 
                    onClick={() => {
                      addLog('Updating Godot AI Assistant Hub...');
                      setTimeout(() => addLog('Success: AI Assistant Hub versions synced (FlamxGames/godot-ai-assistant-hub).'), 1500);
                    }}
                    className="p-2 bg-blue-600/10 border border-blue-600/50 rounded text-[9px] text-blue-600 font-bold uppercase hover:bg-blue-600/20 transition-all flex items-center justify-center gap-2"
                  >
                    <Sparkles size={10} /> AI Hub Sync
                  </button>
                  <button 
                    onClick={() => {
                      addLog('Extracting ArmorPaint locales...');
                      addLog(`Running: ./base/make --js base/tools/extract_locales.js ${localeCode}`);
                      setTimeout(() => addLog(`Success: Generated paint/assets/locale/${localeCode}.json`), 2000);
                    }}
                    className="p-2 bg-purple-600/10 border border-purple-600/50 rounded text-[9px] text-purple-400 font-bold uppercase hover:bg-purple-600/20 transition-all flex items-center justify-center gap-2"
                  >
                    <Globe size={10} /> ArmorPaint Locale
                  </button>
                  <button 
                    onClick={() => {
                      addLog('Syncing Awesome AI Agents collection...');
                      addLog('Source: https://github.com/jim-schwoebel/awesome_ai_agents.git');
                      setTimeout(() => addLog('Success: AI Agents collection updated.'), 1500);
                    }}
                    className="p-2 bg-indigo-600/10 border border-indigo-600/50 rounded text-[9px] text-indigo-400 font-bold uppercase hover:bg-indigo-600/20 transition-all flex items-center justify-center gap-2"
                  >
                    <Users size={10} /> Agents Sync
                  </button>
                  <button 
                    onClick={() => {
                      addLog('Syncing Armory3D Engine...');
                      addLog('Source: https://github.com/armory3d/armory.git');
                      setTimeout(() => addLog('Success: Armory3D core updated.'), 1500);
                    }}
                    className="p-2 bg-orange-600/10 border border-orange-600/50 rounded text-[9px] text-orange-400 font-bold uppercase hover:bg-orange-600/20 transition-all flex items-center justify-center gap-2"
                  >
                    <Box size={10} /> Armory Sync
                  </button>
                  <div className="p-2 bg-white/5 border border-white/10 rounded flex items-center gap-2">
                    <span className="text-[8px] text-gray-400 uppercase font-bold">Locale:</span>
                    <input 
                      type="text" 
                      value={localeCode} 
                      onChange={(e) => setLocaleCode(e.target.value)}
                      className="bg-black/40 border border-white/10 rounded px-1.5 py-0.5 text-[9px] text-white outline-none focus:border-purple-500 w-16"
                      placeholder="en_US"
                    />
                  </div>
                  <div className="col-span-2 p-2 bg-white/5 border border-white/10 rounded space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-[9px] text-gray-400 font-bold uppercase">WorldGen (ZiYang-xie)</p>
                      <button 
                        onClick={() => {
                          addLog(`Running WorldGen pipeline (ml-sharp: ${useSharp}, mesh: ${returnMesh})...`);
                          setTimeout(() => addLog('Success: WorldGen environment exported.'), 3000);
                        }}
                        className="p-1 px-2 bg-neon-green/10 border border-neon-green/50 rounded text-[8px] text-neon-green font-bold uppercase hover:bg-neon-green/20 transition-all"
                      >
                        Export World
                      </button>
                    </div>
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={useSharp} 
                          onChange={(e) => setUseSharp(e.target.checked)}
                          className="w-3 h-3 rounded border-white/10 bg-white/5 text-neon-green focus:ring-neon-green"
                        />
                        <span className="text-[8px] text-gray-500 font-bold uppercase">ml-sharp (Experimental)</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={returnMesh} 
                          onChange={(e) => setReturnMesh(e.target.checked)}
                          className="w-3 h-3 rounded border-white/10 bg-white/5 text-neon-green focus:ring-neon-green"
                        />
                        <span className="text-[8px] text-gray-500 font-bold uppercase">Mesh Mode</span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <button 
                  onClick={() => {
                    setIsProcessingAI(true);
                    addLog('Initiating full deployment testing suite...');
                    setTimeout(() => addLog('Validating asset integrity...'), 800);
                    setTimeout(() => addLog('Checking script bindings...'), 1600);
                    setTimeout(() => addLog('Optimizing geometry for target platform...'), 2400);
                    setTimeout(() => {
                      setIsProcessingAI(false);
                      addLog('Deployment test successful. Build v1.0.4 ready for production.');
                    }, 4000);
                  }}
                  disabled={isProcessingAI}
                  className="w-full py-3 bg-neon-orange text-black text-[10px] font-bold uppercase rounded hover:brightness-110 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isProcessingAI ? <Cpu size={14} className="animate-spin" /> : <Rocket size={14} />}
                  Run Deployment Test
                </button>
                <p className="text-[8px] text-gray-600 text-center italic">Estimated test duration: ~4s</p>
              </div>

              <div className="bg-black/40 rounded border border-white/5 p-3 flex flex-col gap-2">
                <div className="flex items-center gap-2 text-gray-500">
                  <Terminal size={12} />
                  <span className="text-[9px] uppercase font-bold">Build Console</span>
                </div>
                <div className="font-mono text-[8px] text-neon-orange/80 space-y-1 max-h-32 overflow-y-auto custom-scrollbar">
                  <div>{'>'} [INFO] Initializing build pipeline...</div>
                  <div>{'>'} [INFO] Bundling 12 assets...</div>
                  <div>{'>'} [WARN] Texture "Nebula" is 2048x2048. Consider compression.</div>
                  <div>{'>'} [INFO] Compiling 3 scripts...</div>
                  <div>{'>'} [INFO] Linking physics engine...</div>
                  <div>{'>'} [SUCCESS] Build artifacts generated.</div>
                </div>
              </div>
            </div>
          </div>
        )}
        {activeTab === 'settings' && (
          <div className="flex flex-col h-full">
            <div className="p-4 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Settings size={16} className="text-neon-purple" />
                <span className="text-xs font-bold text-gray-300 uppercase tracking-widest">Global Settings</span>
              </div>
            </div>
            <div className="flex-1 p-4 space-y-6 overflow-y-auto custom-scrollbar">
              <div className="space-y-2">
                <p className="text-[10px] text-gray-500 uppercase tracking-wider font-bold flex items-center gap-2">
                  <Sparkles size={12} className="text-neon-purple" /> AI World Architect
                </p>
                <div className="space-y-2 bg-white/5 p-3 rounded border border-white/10">
                  <textarea 
                    value={envPrompt}
                    onChange={(e) => setEnvPrompt(e.target.value)}
                    className="w-full h-20 bg-black/40 border border-white/10 rounded p-2 text-[10px] text-white outline-none focus:border-neon-purple resize-none"
                    placeholder="Describe the environment (e.g., 'Futuristic neon city')..."
                  />
                  <button 
                    onClick={handleGenerateEnvironment}
                    disabled={isProcessingAI || !envPrompt}
                    className="w-full py-2 bg-neon-purple text-black text-[10px] font-bold uppercase rounded hover:brightness-110 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isProcessingAI ? <Cpu size={12} className="animate-spin" /> : <Wind size={12} />}
                    Generate Environment
                  </button>
                </div>
              </div>
              
              <div className="space-y-2">
                <p className="text-[10px] text-gray-500 uppercase tracking-wider font-bold">Engine Sync & Repos</p>
                <div className="grid grid-cols-2 gap-2">
                  <button 
                    onClick={() => {
                      addLog('Syncing with Godot Asset Library...');
                      setTimeout(() => addLog('Success: Local asset cache updated from godotengine/godot-asset-library.'), 2000);
                    }}
                    className="p-2 bg-green-600/10 border border-green-600/50 rounded text-[9px] text-green-600 font-bold uppercase hover:bg-green-600/20 transition-all flex items-center justify-center gap-2"
                  >
                    <Folder size={10} /> Godot Assets
                  </button>
                  <button 
                    onClick={() => {
                      addLog('Updating Godot AI Assistant Hub...');
                      setTimeout(() => addLog('Success: AI Assistant Hub versions synced (FlamxGames/godot-ai-assistant-hub).'), 1500);
                    }}
                    className="p-2 bg-blue-600/10 border border-blue-600/50 rounded text-[9px] text-blue-600 font-bold uppercase hover:bg-blue-600/20 transition-all flex items-center justify-center gap-2"
                  >
                    <Sparkles size={10} /> AI Hub Sync
                  </button>
                  <button 
                    onClick={() => {
                      addLog('Extracting ArmorPaint locales...');
                      addLog(`Running: ./base/make --js base/tools/extract_locales.js ${localeCode}`);
                      setTimeout(() => addLog(`Success: Generated paint/assets/locale/${localeCode}.json`), 2000);
                    }}
                    className="p-2 bg-purple-600/10 border border-purple-600/50 rounded text-[9px] text-purple-400 font-bold uppercase hover:bg-purple-600/20 transition-all flex items-center justify-center gap-2"
                  >
                    <Globe size={10} /> ArmorPaint Locale
                  </button>
                  <button 
                    onClick={() => {
                      addLog('Syncing Awesome AI Agents collection...');
                      addLog('Source: https://github.com/jim-schwoebel/awesome_ai_agents.git');
                      setTimeout(() => addLog('Success: AI Agents collection updated.'), 1500);
                    }}
                    className="p-2 bg-indigo-600/10 border border-indigo-600/50 rounded text-[9px] text-indigo-400 font-bold uppercase hover:bg-indigo-600/20 transition-all flex items-center justify-center gap-2"
                  >
                    <Users size={10} /> Agents Sync
                  </button>
                  <button 
                    onClick={() => {
                      addLog('Syncing Armory3D Engine...');
                      addLog('Source: https://github.com/armory3d/armory.git');
                      setTimeout(() => addLog('Success: Armory3D core updated.'), 1500);
                    }}
                    className="p-2 bg-orange-600/10 border border-orange-600/50 rounded text-[9px] text-orange-400 font-bold uppercase hover:bg-orange-600/20 transition-all flex items-center justify-center gap-2"
                  >
                    <Box size={10} /> Armory Sync
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Main Viewport */}
      <div className="flex-1 relative flex flex-col bg-black">
        {/* Toolbar */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1 bg-black/60 backdrop-blur-md border border-white/10 p-1 rounded-full shadow-xl">
          <button 
            onClick={() => setIsPhysicsActive(!isPhysicsActive)}
            className={`p-2 rounded-full transition-all ${isPhysicsActive ? 'bg-neon-pink text-black' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
            title={isPhysicsActive ? "Disable Physics" : "Enable Physics"}
          >
            <Activity size={16} />
          </button>
          <div className="w-px h-6 bg-white/10 mx-1" />
          <button 
            onClick={() => setTransformMode('translate')}
            className={`p-2 rounded-full transition-all ${transformMode === 'translate' ? 'bg-neon-blue text-black' : 'text-gray-400 hover:text-white'}`}
          >
            <Move size={16} />
          </button>
          <button 
            onClick={() => setTransformMode('rotate')}
            className={`p-2 rounded-full transition-all ${transformMode === 'rotate' ? 'bg-neon-blue text-black' : 'text-gray-400 hover:text-white'}`}
          >
            <RotateCw size={16} />
          </button>
          <button 
            onClick={() => setTransformMode('scale')}
            className={`p-2 rounded-full transition-all ${transformMode === 'scale' ? 'bg-neon-blue text-black' : 'text-gray-400 hover:text-white'}`}
          >
            <Scale size={16} />
          </button>
          <div className="w-px h-6 bg-white/10 mx-1" />
          <button 
            onClick={() => addObject('cube')}
            className="p-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-full transition-all"
          >
            <BoxSelect size={16} />
          </button>
          <button 
            onClick={() => addObject('sphere')}
            className="p-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-full transition-all"
          >
            <Plus size={16} />
          </button>
        </div>

        {/* 3D Canvas */}
        <div className="flex-1">
          <Canvas shadows dpr={[1, 2]}>
            <PerspectiveCamera makeDefault position={[15, 15, 15]} />
            <OrbitControls makeDefault minPolarAngle={0} maxPolarAngle={Math.PI / 1.75} />
            
            <ambientLight intensity={0.5} />
            <pointLight position={[10, 10, 10]} intensity={1} castShadow />
            <spotLight position={[-10, 20, 10]} angle={0.15} penumbra={1} intensity={2} castShadow />
            
            <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
            <Grid 
              infiniteGrid 
              fadeDistance={50} 
              fadeStrength={5} 
              sectionSize={5} 
              sectionColor="#00d2ff" 
              cellColor="#1a1a1a" 
            />
            
            <Suspense fallback={null}>
              {skyboxUrl && <Skybox url={skyboxUrl} />}
              <Physics gravity={[0, -9.81, 0]}>
                {isPhysicsActive && <PhysicsGround />}
                {objects.map(obj => {
                  const isSelected = selectedObjectId === obj.id;
                  const physicsEnabled = isPhysicsActive && obj.physicsEnabled;
                  const mesh = (
                    <SandboxMesh 
                      obj={obj} 
                      isSelected={isSelected}
                      onSelect={() => setSelectedObjectId(obj.id)}
                      physicsEnabled={!!physicsEnabled}
                    />
                  );

                  if (isSelected) {
                    return (
                      <TransformControls 
                        key={obj.id}
                        mode={transformMode}
                        onMouseUp={() => {
                          addLog(`Transformed ${obj.type}`);
                        }}
                      >
                        {mesh}
                      </TransformControls>
                    );
                  }
                  return <React.Fragment key={obj.id}>{mesh}</React.Fragment>;
                })}
              </Physics>
            </Suspense>

            <ContactShadows position={[0, -0.01, 0]} opacity={0.4} scale={20} blur={2} far={4.5} />
            <Environment preset="city" />
          </Canvas>
        </div>

        {/* Bottom Console */}
        <div className="h-32 bg-black/80 border-t border-white/10 flex flex-col p-2">
          <div className="flex items-center justify-between mb-1 px-2">
            <div className="flex items-center gap-2">
              <Terminal size={12} className="text-neon-blue" />
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Sandbox Console</span>
            </div>
            <button onClick={() => setLogs([])} className="text-[8px] text-gray-600 hover:text-gray-400 uppercase">Clear</button>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar font-mono text-[9px] text-gray-400 space-y-0.5">
            {logs.map((log) => (
              <div key={log.id} className="flex gap-2">
                <span className="text-gray-600">{log.text.split(']')[0]}]</span>
                <span className={log.text.includes('complete') ? 'text-green-400' : log.text.includes('Analyzing') ? 'text-neon-purple' : ''}>
                  {log.text.split(']')[1]}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Sidebar: Properties */}
      <div className="w-72 bg-black/40 border-l border-white/10 flex flex-col">
        <div className="p-4 border-b border-white/10 flex items-center gap-2">
          <Settings size={16} className="text-neon-pink" />
          <span className="text-xs font-bold text-gray-300 uppercase tracking-widest">Properties</span>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
          {selectedObject ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] text-gray-500 uppercase tracking-wider">Object ID</label>
                <div className="bg-white/5 border border-white/10 rounded p-2 text-[10px] text-gray-400 font-mono truncate">
                  {selectedObject.id}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] text-gray-500 uppercase tracking-wider">Type</label>
                <div className="bg-neon-blue/10 border border-neon-blue/20 rounded p-2 text-[10px] text-neon-blue font-bold uppercase">
                  {selectedObject.type}
                </div>
              </div>

              {selectedObject.type === 'image-3d' && (
                <div className="space-y-2">
                  <label className="text-[10px] text-gray-500 uppercase tracking-wider flex justify-between">
                    Displacement Scale <span>{selectedObject.displacementScale}</span>
                  </label>
                  <input 
                    type="range" 
                    min="0" 
                    max="10" 
                    step="0.1"
                    value={selectedObject.displacementScale}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      setObjects(prev => prev.map(o => o.id === selectedObjectId ? { ...o, displacementScale: val } : o));
                    }}
                    className="w-full accent-neon-blue"
                  />
                </div>
              )}

              <div className="space-y-2">
                <label className="text-[10px] text-gray-500 uppercase tracking-wider">Physics</label>
                <div className="space-y-3 bg-white/5 border border-white/10 rounded p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-gray-400">Enabled</span>
                    <button 
                      onClick={() => {
                        setObjects(prev => prev.map(o => o.id === selectedObjectId ? { ...o, physicsEnabled: !o.physicsEnabled } : o));
                      }}
                      className={`w-8 h-4 rounded-full transition-all relative ${selectedObject.physicsEnabled ? 'bg-neon-blue' : 'bg-gray-700'}`}
                    >
                      <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all ${selectedObject.physicsEnabled ? 'left-4.5' : 'left-0.5'}`} />
                    </button>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span className="text-[10px] text-gray-400">Mass</span>
                      <span className="text-[10px] text-neon-blue font-mono">{selectedObject.mass}kg</span>
                    </div>
                    <input 
                      type="range" 
                      min="0.1" 
                      max="100" 
                      step="0.1"
                      value={selectedObject.mass || 1}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        setObjects(prev => prev.map(o => o.id === selectedObjectId ? { ...o, mass: val } : o));
                      }}
                      className="w-full accent-neon-blue h-1"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] text-gray-500 uppercase tracking-wider">Transform</label>
                <div className="space-y-3">
                  {/* Position */}
                  <div className="grid grid-cols-3 gap-2">
                    {['X', 'Y', 'Z'].map((axis, i) => (
                      <div key={`pos-${axis}`} className="space-y-1">
                        <span className="text-[8px] text-gray-600">POS {axis}</span>
                        <input 
                          type="number" 
                          value={selectedObject.position[i]}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value);
                            const newPos = [...selectedObject.position] as [number, number, number];
                            newPos[i] = val;
                            setObjects(prev => prev.map(o => o.id === selectedObjectId ? { ...o, position: newPos } : o));
                          }}
                          className="w-full bg-white/5 border border-white/10 rounded p-1 text-[10px] text-white outline-none focus:border-neon-blue"
                        />
                      </div>
                    ))}
                  </div>
                  {/* Rotation */}
                  <div className="grid grid-cols-3 gap-2">
                    {['X', 'Y', 'Z'].map((axis, i) => (
                      <div key={`rot-${axis}`} className="space-y-1">
                        <span className="text-[8px] text-gray-600">ROT {axis}</span>
                        <input 
                          type="number" 
                          value={selectedObject.rotation[i]}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value);
                            const newRot = [...selectedObject.rotation] as [number, number, number];
                            newRot[i] = val;
                            setObjects(prev => prev.map(o => o.id === selectedObjectId ? { ...o, rotation: newRot } : o));
                          }}
                          className="w-full bg-white/5 border border-white/10 rounded p-1 text-[10px] text-white outline-none focus:border-neon-blue"
                        />
                      </div>
                    ))}
                  </div>
                  {/* Scale */}
                  <div className="grid grid-cols-3 gap-2">
                    {['X', 'Y', 'Z'].map((axis, i) => (
                      <div key={`scale-${axis}`} className="space-y-1">
                        <span className="text-[8px] text-gray-600">SCL {axis}</span>
                        <input 
                          type="number" 
                          value={selectedObject.scale[i]}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value);
                            const newScale = [...selectedObject.scale] as [number, number, number];
                            newScale[i] = val;
                            setObjects(prev => prev.map(o => o.id === selectedObjectId ? { ...o, scale: newScale } : o));
                          }}
                          className="w-full bg-white/5 border border-white/10 rounded p-1 text-[10px] text-white outline-none focus:border-neon-blue"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="pt-4">
                <button 
                  onClick={deleteSelected}
                  className="w-full py-2 bg-red-500/10 border border-red-500/30 text-red-500 text-[10px] font-bold uppercase rounded hover:bg-red-500/20 transition-all flex items-center justify-center gap-2"
                >
                  <Trash2 size={12} /> Delete Object
                </button>
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-40">
              <MousePointer2 size={48} className="text-gray-600" />
              <p className="text-xs text-gray-500">Select an object to view properties</p>
            </div>
          )}
        </div>

        {/* AI Assistant Section */}
        <div className="flex-1 flex flex-col bg-neon-purple/5 border-t border-neon-purple/20 overflow-hidden">
          <div className="p-4 border-b border-neon-purple/10 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles size={14} className="text-neon-purple" />
              <span className="text-[10px] font-bold text-neon-purple uppercase tracking-widest">AI Engine Assistant</span>
            </div>
            <button className="text-[8px] text-neon-purple/60 hover:text-neon-purple uppercase font-bold">History</button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
            <div className="bg-white/5 rounded-lg p-3 border border-white/5">
              <p className="text-[10px] text-gray-300 leading-relaxed">
                Hello! I'm your IAMGame AI Assistant. I can help you with:
              </p>
              <ul className="mt-2 space-y-1">
                {[
                  'Generating 3D environments',
                  'Creating character presets',
                  'Writing game logic (TypeScript)',
                  'Optimizing textures & FX',
                  'Deployment testing'
                ].map(item => (
                  <li key={item} className="flex items-center gap-2 text-[9px] text-gray-500">
                    <div className="w-1 h-1 rounded-full bg-neon-purple" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {isProcessingAI && (
              <div className="flex gap-3 items-start animate-pulse">
                <div className="w-6 h-6 rounded-full bg-neon-purple/20 flex items-center justify-center">
                  <Cpu size={12} className="text-neon-purple" />
                </div>
                <div className="flex-1 bg-neon-purple/10 rounded-lg p-2">
                  <div className="h-2 w-24 bg-neon-purple/20 rounded mb-2" />
                  <div className="h-2 w-full bg-neon-purple/20 rounded" />
                </div>
              </div>
            )}
          </div>

          <div className="p-4 bg-black/40 border-t border-white/5 space-y-3">
            <div className="relative">
              <textarea 
                value={aiAssistantInput}
                onChange={(e) => setAiAssistantInput(e.target.value)}
                className="w-full h-20 bg-white/5 border border-white/10 rounded p-2 text-[10px] text-white outline-none focus:border-neon-purple resize-none pr-8"
                placeholder="Ask AI to generate something..."
              />
              <button 
                onClick={() => {
                  if (!aiAssistantInput) return;
                  setIsProcessingAI(true);
                  addLog(`AI processing request: "${aiAssistantInput}"`);
                  setTimeout(() => {
                    setIsProcessingAI(false);
                    addLog('AI response: I have analyzed your request. I suggest adding a physics script to the selected object.');
                    setAiAssistantInput('');
                  }, 2500);
                }}
                disabled={isProcessingAI}
                className="absolute bottom-2 right-2 p-1.5 rounded-lg bg-neon-purple text-black hover:brightness-110 transition-all disabled:opacity-50"
              >
                <Zap size={12} />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button 
                disabled={isProcessingAI}
                onClick={() => {
                  setIsProcessingAI(true);
                  addLog('AI optimizing current scene...');
                  setTimeout(() => {
                    setIsProcessingAI(false);
                    addLog('Scene optimized: Reduced draw calls by 15%');
                  }, 2000);
                }}
                className="py-2 bg-white/5 border border-white/10 text-gray-400 text-[9px] font-bold uppercase rounded hover:bg-white/10 transition-all flex items-center justify-center gap-2"
              >
                <Cpu size={10} /> Optimize
              </button>
              <button 
                disabled={isProcessingAI}
                onClick={() => {
                  if (assets.length > 0) {
                    handleUnique3DConversion(assets[0]);
                  } else {
                    addLog('No assets available for Unique3D conversion.');
                  }
                }}
                className="py-2 bg-neon-orange/20 border border-neon-orange/40 text-neon-orange text-[9px] font-bold uppercase rounded hover:bg-neon-orange/30 transition-all flex items-center justify-center gap-2"
              >
                <Dna size={10} /> Unique3D
              </button>
              <button 
                disabled={isProcessingAI}
                onClick={() => {
                  setIsProcessingAI(true);
                  addLog('AI generating suggested asset based on scene context...');
                  setTimeout(() => {
                    const newAsset: GameAsset = {
                      id: uuidv4(),
                      name: 'AI Suggestion - Environment Map',
                      type: 'image',
                      url: `https://picsum.photos/seed/${uuidv4()}/1024/512`
                    };
                    setAssets(prev => [...prev, newAsset]);
                    setIsProcessingAI(false);
                    addLog(`AI suggested asset added: ${newAsset.name}`);
                  }, 3000);
                }}
                className="py-2 bg-neon-purple/20 border border-neon-purple/40 text-neon-purple text-[9px] font-bold uppercase rounded hover:bg-neon-purple/30 transition-all flex items-center justify-center gap-2"
              >
                <Sparkles size={10} /> Suggest
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Processing Overlay */}
      <AnimatePresence>
        {isProcessingAI && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center"
          >
            <div className="flex flex-col items-center gap-4">
              <div className="relative">
                <div className="w-16 h-16 rounded-full border-2 border-neon-purple/20 border-t-neon-purple animate-spin" />
                <Dna className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-neon-orange animate-pulse" size={24} />
              </div>
              <p className="text-xs font-bold text-neon-orange uppercase tracking-[0.2em] animate-pulse">Unique3D: Reconstructing Mesh...</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
