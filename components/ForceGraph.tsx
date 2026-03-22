import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { GraphData, GraphNode, GraphLink, VisualMode } from '../types';

interface ForceGraphProps {
  data: GraphData;
  selectedNode: GraphNode | null;
  onNodeClick: (node: GraphNode) => void;
  onExpand?: (node: GraphNode) => void;
  onDelete?: (node: GraphNode) => void;
  mode: VisualMode;
  isLinkingMode?: boolean;
  onLinkConnect?: (source: GraphNode, target: GraphNode) => void;
}

export const ForceGraph: React.FC<ForceGraphProps> = ({ 
  data, selectedNode, onNodeClick, onExpand, onDelete, mode, isLinkingMode, onLinkConnect 
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number | null>(null);

  // Track selected node in ref
  const selectedNodeRef = useRef<GraphNode | null>(selectedNode);
  const hoveredNodeRef = useRef<GraphNode | null>(null);
  
  // Linking State
  const tempLinkRef = useRef<{ source: GraphNode, screenX: number, screenY: number } | null>(null);

  useEffect(() => {
    if (!isLinkingMode) {
      tempLinkRef.current = null;
    }
  }, [isLinkingMode]);

  useEffect(() => {
    selectedNodeRef.current = selectedNode;
  }, [selectedNode]);

  // 3D Camera State
  const rotationRef = useRef({ x: 0.3, y: 0.5 }); 
  const zoomRef = useRef(1.2);
  const panRef = useRef({ x: 0, y: 0 });
  
  // Interaction State
  const isDraggingGlobalRef = useRef(false);
  const isPanningRef = useRef(false);
  const lastMousePosRef = useRef({ x: 0, y: 0 });
  const lastTouchDistRef = useRef<number>(0);
  
  // Node Dragging State for 3D
  const dragNodeRef = useRef<GraphNode | null>(null);
  const trailRef = useRef<{x: number, y: number}[]>([]); 

  // Context Menu State
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; node: GraphNode | null } | null>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

  const handleCenterView = (node: GraphNode) => {
    if (mode === VisualMode.SCHEMATIC_BLUEPRINT) {
        rotationRef.current = { x: 0, y: 0 };
        zoomRef.current = 1.0;
        panRef.current = { x: - (node.x || 0), y: - (node.y || 0) }; 
    }
    
    // Standard 3D center calculation
    const cosX = Math.cos(rotationRef.current.x);
    const sinX = Math.sin(rotationRef.current.x);
    const cosY = Math.cos(rotationRef.current.y);
    const sinY = Math.sin(rotationRef.current.y);
    const zoom = zoomRef.current;

    let x = node.x || 0;
    let z = node.z || 0;
    let tempX = x * cosY - z * sinY;
    let tempZ = z * cosY + x * sinY;
    x = tempX;
    z = tempZ;

    let y = node.y || 0;
    let tempY = y * cosX - z * sinX;
    let tempZ_final = z * cosX + y * sinX;
    y = tempY;
    z = tempZ_final;

    const perspective = 800; 
    const scaleFactor = Math.max(0.1, (perspective + z * zoom) / perspective); 
    const finalScale = scaleFactor * zoom;

    panRef.current = { x: -x * finalScale, y: -y * finalScale };
    setContextMenu(null);
  };

  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        });
      }
    };
    window.addEventListener('resize', updateDimensions);
    updateDimensions();
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  useEffect(() => {
    if (!svgRef.current) return;
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const { width, height } = dimensions;
    const g = svg.append("g");

    const closeMenu = () => setContextMenu(null);
    svgRef.current.addEventListener('click', closeMenu);

    // Initial positioning helper for Orbital
    const GLOBE_RADIUS = Math.min(width, height) * 0.4;
    data.nodes.forEach((node, i) => {
        if (node.spawnProgress === undefined) node.spawnProgress = 0; 
        if (node.x === undefined || node.z === undefined) {
            const phi = Math.acos(1 - 2 * (i + 0.5) / data.nodes.length);
            const theta = Math.PI * (1 + 5**0.5) * (i + 0.5);
            node.x = GLOBE_RADIUS * Math.sin(phi) * Math.cos(theta);
            node.y = GLOBE_RADIUS * Math.sin(phi) * Math.sin(theta);
            node.z = GLOBE_RADIUS * Math.cos(phi);
        }
    });

    // Layer Groups
    const gridGroup = g.append("g").attr("class", "grid-floor");
    const linksGroupBack = g.append("g").attr("class", "links-back");
    const nodesGroupBack = g.append("g").attr("class", "nodes-back");
    const trailGroup = g.append("g").attr("class", "trails");
    const linksGroupFront = g.append("g").attr("class", "links-front");
    const nodesGroupFront = g.append("g").attr("class", "nodes-front");
    const tempLinkGroup = g.append("g").attr("class", "temp-link-group");
    const hudLayer = g.append("g").attr("class", "hud-layer").style("pointer-events", "none");

    // Defs for Glows
    const defs = svg.append("defs");
    
    // Standard Glow
    const glowFilter = defs.append("filter").attr("id", "glow3d");
    glowFilter.append("feGaussianBlur").attr("stdDeviation", "2.5").attr("result", "coloredBlur");
    const feMerge = glowFilter.append("feMerge");
    feMerge.append("feMergeNode").attr("in", "coloredBlur");
    feMerge.append("feMergeNode").attr("in", "SourceGraphic");

    // Selected Glow
    const glowSelected = defs.append("filter").attr("id", "glowSelected");
    glowSelected.append("feGaussianBlur").attr("stdDeviation", "6.0").attr("result", "coloredBlur");
    const feMergeSel = glowSelected.append("feMerge");
    feMergeSel.append("feMergeNode").attr("in", "coloredBlur");
    feMergeSel.append("feMergeNode").attr("in", "SourceGraphic");
    
    // --- MOUSE HANDLERS ---
    const preventDefault = (e: Event) => e.preventDefault();
    svgRef.current.addEventListener('wheel', preventDefault, { passive: false });
    
    const onWheel = (e: WheelEvent) => {
        e.preventDefault();
        if (selectedNodeRef.current && (e.ctrlKey || e.metaKey)) {
            const node = selectedNodeRef.current;
            node.scale = Math.min(Math.max((node.scale || 1) - e.deltaY * 0.01, 0.2), 5);
            return;
        }
        const zoomSensitivity = 0.001;
        zoomRef.current = Math.max(0.1, Math.min(8, zoomRef.current - e.deltaY * zoomSensitivity));
    };

    const onMouseDownGlobal = (event: MouseEvent) => {
        if (contextMenu) return;
        
        if (isLinkingMode && tempLinkRef.current && event.button !== 2) {
            tempLinkRef.current = null;
        }

        if (event.button === 2) { 
            isPanningRef.current = true;
        } else {
            isDraggingGlobalRef.current = true;
        }
        lastMousePosRef.current = { x: event.clientX, y: event.clientY };
    };

    const onNodeMouseDown = (event: MouseEvent, node: GraphNode) => {
        event.stopPropagation();
        if (event.button === 2) return;
        
        if (!isLinkingMode) {
            isDraggingGlobalRef.current = false;
            isPanningRef.current = false;
            dragNodeRef.current = node;
            trailRef.current = [];
        }
        lastMousePosRef.current = { x: event.clientX, y: event.clientY };
    };
    
    const onNodeContextMenu = (event: MouseEvent, node: GraphNode) => {
        event.preventDefault();
        event.stopPropagation();
        setContextMenu({ x: event.clientX, y: event.clientY, node: node });
    };

    const onMouseMove = (event: MouseEvent) => {
        const dx = event.clientX - lastMousePosRef.current.x;
        const dy = event.clientY - lastMousePosRef.current.y;
        lastMousePosRef.current = { x: event.clientX, y: event.clientY };

        if (tempLinkRef.current) {
            const rect = svgRef.current?.getBoundingClientRect();
            if(rect) {
               tempLinkRef.current.screenX = event.clientX - rect.left;
               tempLinkRef.current.screenY = event.clientY - rect.top;
            }
        }

        if (dragNodeRef.current) {
            const node = dragNodeRef.current;
            const cosX = Math.cos(rotationRef.current.x);
            const sinX = Math.sin(rotationRef.current.x);
            const cosY = Math.cos(rotationRef.current.y);
            const sinY = Math.sin(rotationRef.current.y);
            const isZMode = event.shiftKey;
            const zoom = zoomRef.current;
            const vDx = (isZMode ? 0 : dx) / zoom;
            const vDy = (isZMode ? 0 : dy) / zoom;
            const vDz = (isZMode ? -dy : 0) / zoom; 
            const v1x = vDx;
            const v1y = vDy * cosX + vDz * sinX;
            const v1z = -vDy * sinX + vDz * cosX;
            const dwX = v1x * cosY + v1z * sinY;
            const dwY = v1y;
            const dwZ = v1z * cosY - v1x * sinY;
            node.x = (node.x || 0) + dwX;
            node.y = (node.y || 0) + dwY;
            node.z = (node.z || 0) + dwZ;
            return;
        }
        if (isPanningRef.current) {
            panRef.current.x += dx;
            panRef.current.y += dy;
            return;
        }
        if (isDraggingGlobalRef.current) {
            rotationRef.current.y += dx * 0.005;
            rotationRef.current.x -= dy * 0.005;
        }
    };

    const onMouseUp = (event: MouseEvent) => { 
        isDraggingGlobalRef.current = false; 
        isPanningRef.current = false;
        dragNodeRef.current = null;
    };

    // --- TOUCH HANDLERS (ZOOM/ROTATE) ---
    const onTouchStart = (e: TouchEvent) => {
        if (contextMenu) return;
        if (e.touches.length === 1) {
            isDraggingGlobalRef.current = true;
            lastMousePosRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        } else if (e.touches.length === 2) {
            isDraggingGlobalRef.current = false; // Stop rotating if pinching
            const dist = Math.hypot(
                e.touches[0].clientX - e.touches[1].clientX,
                e.touches[0].clientY - e.touches[1].clientY
            );
            lastTouchDistRef.current = dist;
        }
    };

    const onTouchMove = (e: TouchEvent) => {
        e.preventDefault(); // Prevent page scroll
        
        // 2-Finger Pinch Zoom
        if (e.touches.length === 2) {
            const dist = Math.hypot(
                e.touches[0].clientX - e.touches[1].clientX,
                e.touches[0].clientY - e.touches[1].clientY
            );
            
            const delta = dist - lastTouchDistRef.current;
            lastTouchDistRef.current = dist;
            
            if (selectedNodeRef.current) {
                const node = selectedNodeRef.current;
                node.scale = Math.min(Math.max((node.scale || 1) + delta * 0.01, 0.2), 5);
                return;
            }

            const zoomSensitivity = 0.005; 
            zoomRef.current = Math.max(0.1, Math.min(8, zoomRef.current + delta * zoomSensitivity));
            return;
        }

        // 1-Finger Rotate (Standard)
        if (e.touches.length === 1 && isDraggingGlobalRef.current) {
             const dx = e.touches[0].clientX - lastMousePosRef.current.x;
             const dy = e.touches[0].clientY - lastMousePosRef.current.y;
             lastMousePosRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
             
             rotationRef.current.y += dx * 0.005;
             rotationRef.current.x -= dy * 0.005;
        }
    };
    
    const onTouchEnd = () => {
        isDraggingGlobalRef.current = false;
    };

    svgRef.current.addEventListener('mousedown', onMouseDownGlobal);
    svgRef.current.addEventListener('wheel', onWheel);
    // Touch Events
    svgRef.current.addEventListener('touchstart', onTouchStart, { passive: false });
    svgRef.current.addEventListener('touchmove', onTouchMove, { passive: false });
    svgRef.current.addEventListener('touchend', onTouchEnd);

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);

    // --- GRID GENERATION ---
    const isDataScape = mode === VisualMode.DATA_SCAPE;
    const isInventory = mode === VisualMode.INVENTORY_GRID;
    const isSchematic = mode === VisualMode.SCHEMATIC_BLUEPRINT;

    const gridLines: {x1: number, y1: number, z1: number, x2: number, y2: number, z2: number}[] = [];
    const gridSize = 2000;
    const step = isDataScape ? 100 : 200;
    for (let i = -gridSize; i <= gridSize; i += step) {
         gridLines.push({ x1: -gridSize, y1: 0, z1: i, x2: gridSize, y2: 0, z2: i });
         gridLines.push({ x1: i, y1: 0, z1: -gridSize, x2: i, y2: 0, z2: gridSize });
    }

    // --- HELPER: Draw Cube Wireframe Path ---
    const getCubePath = (s: number) => {
        const h = s / 2;
        // Simple perspective box
        return `M ${-h},${-h} L ${h},${-h} L ${h},${h} L ${-h},${h} Z 
                M ${-h},${-h} L ${-h*0.5},${-h*1.5} L ${h*1.5},${-h*1.5} L ${h},${-h}
                M ${h},${-h} L ${h*1.5},${-h*1.5} L ${h*1.5},${h*0.5} L ${h},${h}
               `;
    }

    // --- HELPER: Get Icon Path based on type ---
    const getIconPath = (type: string, s: number) => {
         const h = s * 0.4;
         if (type === 'root') return `M 0,${-h} L ${h},${-h/2} L ${h},${h/2} L 0,${h} L ${-h},${h/2} L ${-h},${-h/2} Z`; // Hexagon
         if (type === 'topic') return `M ${-h},${-h} L ${h},${-h} L ${h},${h} L ${-h},${h} Z`; // Square
         return `M 0,${-h} L ${h},0 L 0,${h} L ${-h},0 Z`; // Diamond
    }

    // --- HELPER: Get Mini Chart Path ---
    const getMiniChartPath = (id: string, width: number, height: number, time: number) => {
        let seed = 0;
        for(let i=0; i<id.length; i++) seed += id.charCodeAt(i);
        const bars = 4;
        const barWidth = width / bars;
        let d = "";
        
        if (seed % 2 === 0) { // Bar Chart
            for(let i=0; i<bars; i++) {
                // Animate height
                const speed = 0.002 + (seed % 10) * 0.0001;
                const offset = i * 1000;
                const val = (Math.sin(time * speed + offset + seed) + 1) / 2;
                const h = Math.max(2, val * height);
                const x = -width/2 + i * barWidth + 1;
                const y = height/2 - h;
                d += `M ${x},${height/2} L ${x},${y} L ${x + barWidth - 2},${y} L ${x + barWidth - 2},${height/2} Z `;
            }
        } else { // Area Chart
             d = `M ${-width/2},${height/2}`;
             for(let i=0; i<=bars; i++) {
                 const speed = 0.003;
                 const val = (Math.sin(time * speed + (i * 200) + seed) + 1) / 2;
                 const h = val * height;
                 const x = -width/2 + i * barWidth;
                 const y = height/2 - h;
                 d += ` L ${x},${y}`;
             }
             d += ` L ${width/2},${height/2} Z`;
        }
        return d;
    }

    const tick = () => {
        const time = Date.now();
        const pulse = 1 + Math.sin(time * 0.005) * 0.15;
        
        // Auto-Rotation logic
        if (!isDraggingGlobalRef.current && !dragNodeRef.current && !isPanningRef.current) {
            if (isSchematic) {
                // Lock view for blueprint
                rotationRef.current.x = rotationRef.current.x * 0.9 + 0 * 0.1;
                rotationRef.current.y = rotationRef.current.y * 0.9 + 0 * 0.1; 
            } else if (isInventory) {
                rotationRef.current.y += 0.003; 
                rotationRef.current.x = Math.sin(time * 0.001) * 0.05; 
            } else {
                 rotationRef.current.y += 0.0005;
            }
        }

        const cx = (width / 2) + panRef.current.x;
        const cy = (height / 2) + panRef.current.y;
        const zoom = zoomRef.current;
        const cosX = Math.cos(rotationRef.current.x);
        const sinX = Math.sin(rotationRef.current.x);
        const cosY = Math.cos(rotationRef.current.y);
        const sinY = Math.sin(rotationRef.current.y);

        // --- SPECIAL LAYOUT LOGIC ---
        if (isInventory) {
             // Massive Helix / Spiral Layout
             const sortedNodes = [...data.nodes].sort((a,b) => a.type.localeCompare(b.type));
             const spacingY = 80;
             const radius = 350;
             const angleStep = 0.5;
             
             sortedNodes.forEach((node, i) => {
                 if (dragNodeRef.current?.id === node.id) return;
                 const angle = i * angleStep;
                 const yPos = (i * spacingY) - (data.nodes.length * spacingY / 2);
                 node.x = Math.cos(angle) * radius;
                 node.z = Math.sin(angle) * radius;
                 node.y = yPos;
             });

        } else if (isSchematic) {
             // Blueprint Layout (Flat, focused)
             const centerNode = selectedNodeRef.current || data.nodes[0];
             // Group children by type
             const children = data.nodes.filter(n => n.id !== centerNode?.id);
             
             if (centerNode && !dragNodeRef.current) {
                centerNode.x = 0; centerNode.y = 0; centerNode.z = 0;
             }
             
             children.forEach((node, i) => {
                  if (dragNodeRef.current?.id === node.id) return;
                  const ring = (i % 2 === 0) ? 1 : 2;
                  const countInRing = Math.ceil(children.length / 2);
                  const angle = (i / countInRing) * Math.PI * 2 + (ring * 0.5);
                  const radius = 300 * ring;
                  node.x = Math.cos(angle) * radius;
                  node.y = Math.sin(angle) * radius;
                  node.z = 0;
             });
        }

        // --- PROJECTION FUNCTION ---
        const project = (x: number, y: number, z: number) => {
            let terrainY = 0;
            if (isDataScape) {
                 terrainY = 200 + 80 * Math.sin((x / 500) + time * 0.0005) * Math.cos((z / 500) + time * 0.0005);
            }
            const finalY = y + terrainY;
            let tx = x * cosY - z * sinY;
            let tz = z * cosY + x * sinY;
            let ty = finalY * cosX - tz * sinX;
            tz = tz * cosX + finalY * sinX;
            const p = 800;
            const s = Math.max(0.1, (p + tz * zoom) / p);
            return { x: cx + tx * s * zoom, y: cy + ty * s * zoom + (isDataScape ? 200 : 300) * zoom, s }; 
        }

        // --- RENDER GRID ---
        if (!isSchematic) { 
            const renderedGridPaths: string[] = [];
            // ... (Keep existing DataScape/Standard Grid logic)
            if (isDataScape) {
                const subDivs = 10;
                gridLines.forEach(line => {
                    const points = [];
                    for(let j=0; j<=subDivs; j++) {
                        const t = j / subDivs;
                        const px = line.x1 + (line.x2 - line.x1) * t;
                        const pz = line.z1 + (line.z2 - line.z1) * t;
                        points.push(project(px, 0, pz));
                    }
                    let d = `M ${points[0].x},${points[0].y}`;
                    for(let k=1; k<points.length; k++) d += ` L ${points[k].x},${points[k].y}`;
                    renderedGridPaths.push(d);
                });
                gridGroup.selectAll("path").data(renderedGridPaths).join("path")
                    .attr("d", d => d).attr("fill", "none")
                    .attr("stroke", (d, i) => i % 2 === 0 ? "#0f0" : "#ff4d00")
                    .attr("stroke-width", 1).attr("stroke-opacity", 0.3);
            } else {
                 const projectedGrid = gridLines.map(line => {
                    const p1 = project(line.x1, line.y1, line.z1);
                    const p2 = project(line.x2, line.y2, line.z2);
                    return { p1, p2, opacity: Math.min(p1.s, p2.s) };
                });
                gridGroup.selectAll("line").data(projectedGrid).join("line")
                    .attr("x1", d => d.p1.x).attr("y1", d => d.p1.y).attr("x2", d => d.p2.x).attr("y2", d => d.p2.y)
                    .attr("stroke", "#00f3ff").attr("stroke-opacity", d => d.opacity * 0.1).attr("stroke-width", 1);
                gridGroup.selectAll("path").remove();
            }
        } else {
            // SCHEMATIC BACKGROUND
            // Draw a subtle coordinate system crosshair
            gridGroup.selectAll("*").remove();
            const center = project(0,0,0);
            gridGroup.append("line").attr("x1", center.x - 1000).attr("y1", center.y).attr("x2", center.x + 1000).attr("y2", center.y).attr("stroke", "#00f3ff").attr("stroke-opacity", 0.1);
            gridGroup.append("line").attr("x1", center.x).attr("y1", center.y - 1000).attr("x2", center.x).attr("y2", center.y + 1000).attr("stroke", "#00f3ff").attr("stroke-opacity", 0.1);
            gridGroup.append("circle").attr("cx", center.x).attr("cy", center.y).attr("r", 300 * zoom).attr("fill", "none").attr("stroke", "#ff00ff").attr("stroke-dasharray", "5,5").attr("stroke-opacity", 0.1);
        }

        const projectedNodes = data.nodes.map((node, i) => {
            const projected = project(node.x!, node.y!, node.z!);
            const isSelected = selectedNodeRef.current?.id === node.id;
            const isHovered = hoveredNodeRef.current?.id === node.id;
            const scaleMultiplier = isSelected ? pulse * 1.2 : isHovered ? 1.1 : 1;
            let finalScale = projected.s * zoom * (node.spawnProgress || 1) * scaleMultiplier * (node.scale || 1); 
            if (isInventory) finalScale *= 1.8; 
            return { ...node, screenX: projected.x, screenY: projected.y, depth: node.z, scale: finalScale, isSelected, isHovered, index: i };
        });

        // Simple Z-sort
        projectedNodes.sort((a, b) => (b.depth || 0) - (a.depth || 0));

        // --- RENDER LINKS ---
        const drawLinks = (selection: d3.Selection<any, any, any, any>, nodes: any[], linksData: GraphLink[]) => {
             const nodeMap = new Map(nodes.map(n => [n.id, n]));
             const activeLinks = linksData.map(l => {
                const sId = typeof l.source === 'object' ? l.source.id : l.source;
                const tId = typeof l.target === 'object' ? l.target.id : l.target;
                return { ...l, s: nodeMap.get(sId), t: nodeMap.get(tId) };
             }).filter(l => l.s && l.t);

             selection.selectAll("path").data(activeLinks).join("path")
                .attr("d", (d: any) => {
                    const x1 = d.s.screenX, y1 = d.s.screenY;
                    const x2 = d.t.screenX, y2 = d.t.screenY;
                    
                    if (isSchematic) {
                        // Tech-line: Horizontal then Vertical
                        const midX = x1 + (x2 - x1) / 2;
                        return `M ${x1},${y1} L ${midX},${y1} L ${midX},${y2} L ${x2},${y2}`;
                    } else if (isInventory) {
                        return `M ${x1},${y1} L ${x2},${y2}`; // Direct for spiral
                    } else if (isDataScape) {
                         // Sine Wave
                        const dist = Math.hypot(x2 - x1, y2 - y1);
                        const nx = -(y2 - y1) / dist, ny = (x2 - x1) / dist;
                        const steps = 10;
                        let path = `M ${x1},${y1}`;
                        for(let k=1; k<steps; k++) {
                            const t = k/steps;
                            const px = x1 + (x2 - x1) * t;
                            const py = y1 + (y2 - y1) * t;
                            const offset = Math.sin(t * Math.PI * 4 + time * 0.01) * 5; 
                            path += ` L ${px + nx * offset},${py + ny * offset}`;
                        }
                        path += ` L ${x2},${y2}`;
                        return path;
                    }
                    return `M ${x1},${y1} L ${x2},${y2}`;
                })
                .attr("fill", "none")
                .attr("stroke", (d: any) => {
                    if (isSchematic) return "#00f3ff";
                    return "#ff4d00";
                })
                .attr("stroke-width", isSchematic ? 1 : 1.5)
                .attr("stroke-opacity", isSchematic ? 0.3 : 0.4);
             
             selection.selectAll("line").remove();
        };

        drawLinks(linksGroupBack, projectedNodes, data.links);

        // --- RENDER TEMP LINK ---
        if (tempLinkRef.current) {
            const sourceNode = projectedNodes.find(n => n.id === tempLinkRef.current!.source.id);
            if (sourceNode) {
                tempLinkGroup.selectAll("line").data([tempLinkRef.current]).join("line")
                    .attr("x1", sourceNode.screenX)
                    .attr("y1", sourceNode.screenY)
                    .attr("x2", d => d.screenX)
                    .attr("y2", d => d.screenY)
                    .attr("stroke", "#ff00ff")
                    .attr("stroke-width", 2)
                    .attr("stroke-dasharray", "5,5");
            }
        } else {
            tempLinkGroup.selectAll("line").remove();
        }

        // --- RENDER NODES ---
        const groups = nodesGroupFront.selectAll("g.node-group").data(projectedNodes, (d: any) => d.id);
        groups.exit().remove();
        const enter = groups.enter().append("g")
            .attr("class", "node-group")
            .attr("cursor", "pointer")
            .on("mousedown", (e, d) => onNodeMouseDown(e, d))
            .on("mouseenter", (e, d) => { hoveredNodeRef.current = d; })
            .on("mouseleave", (e, d) => { if(hoveredNodeRef.current?.id === d.id) hoveredNodeRef.current = null; })
            .on("click", (e, d) => { 
                e.stopPropagation(); 
                if (isLinkingMode) {
                    if (!tempLinkRef.current) {
                        const rect = svgRef.current?.getBoundingClientRect();
                        tempLinkRef.current = { 
                            source: d, 
                            screenX: e.clientX - (rect?.left || 0), 
                            screenY: e.clientY - (rect?.top || 0) 
                        };
                        onNodeClick(d);
                    } else {
                        if (tempLinkRef.current.source.id !== d.id && onLinkConnect) {
                            onLinkConnect(tempLinkRef.current.source, d);
                        }
                        tempLinkRef.current = null;
                    }
                } else {
                    onNodeClick(d); 
                }
            });
        
        enter.append("path").attr("class", "cube-shape");
        enter.append("path").attr("class", "icon-shape");
        enter.append("path").attr("class", "mini-chart"); // NEW
        enter.append("circle").attr("class", "node-dot");
        enter.append("text").attr("class", "node-label");
        enter.append("text").attr("class", "tech-readout"); // For Blueprint stats

        const merge = groups.merge(enter as any);
        merge.attr("transform", (d: any) => `translate(${d.screenX}, ${d.screenY}) scale(${d.scale})`);

        merge.each(function(d: any) {
             const g = d3.select(this);
             const isSelected = d.isSelected;
             
             if (isInventory) {
                 // --- INVENTORY SPIRAL STYLE ---
                 g.select(".node-dot").attr("opacity", 0);
                 g.select(".tech-readout").attr("opacity", 0);
                 
                 // Wireframe Cube removed as per user request - using a subtle ring instead
                 g.select(".cube-shape")
                  .attr("d", d3.arc()({innerRadius: 18, outerRadius: 20, startAngle: 0, endAngle: Math.PI * 2}))
                  .attr("fill", (d.index % 2 === 0) ? "#ff00ff" : "#00f3ff")
                  .attr("stroke", "none")
                  .attr("opacity", isSelected ? 0.8 : 0.3);
                 
                 // Chart Integration
                 const chartW = 20;
                 const chartH = 15;
                 g.select(".mini-chart")
                  .attr("d", getMiniChartPath(d.id, chartW, chartH, time))
                  .attr("fill", (d.index % 2 === 0) ? "rgba(255, 0, 255, 0.5)" : "rgba(0, 243, 255, 0.5)")
                  .attr("stroke", "none")
                  .attr("transform", `translate(0, 5)`) // Position below icon area
                  .attr("opacity", 0.8);
                 
                 // Icon inside (Shifted Up)
                 g.select(".icon-shape")
                  .attr("d", getIconPath(d.type, 15)) // Smaller Icon
                  .attr("transform", `translate(0, -10)`) // Move up
                  .attr("fill", isSelected ? "#fff" : "none")
                  .attr("stroke", (d.index % 2 === 0) ? "#ff00ff" : "#00f3ff")
                  .attr("stroke-width", 1)
                  .attr("opacity", 1);
                 
                 g.select(".node-label")
                  .text(d?.name ? d.name.substring(0, 8) : "")
                  .attr("y", 25)
                  .attr("text-anchor", "middle")
                  .attr("fill", "#fff")
                  .attr("font-size", "6px")
                  .attr("font-family", "Rajdhani");

             } else if (isSchematic) {
                 // --- WEAPON BLUEPRINT STYLE ---
                 g.select(".node-dot").attr("opacity", 0);
                 g.select(".cube-shape").attr("opacity", 0);
                 g.select(".icon-shape").attr("opacity", 0);
                 g.select(".mini-chart").attr("opacity", 0);

                 // Tech Brackets & Crosshair
                 const w = 25;
                 const h = 10;
                 const bracketPath = `
                    M ${-w},${-h} L ${-w},${h} 
                    M ${w},${-h} L ${w},${h}
                    M ${-5},${0} L ${5},${0} M ${0},${-5} L ${0},${5} 
                 `; // Brackets + Crosshair
                 
                 g.select(".cube-shape") // Reusing element for brackets
                  .attr("d", bracketPath)
                  .attr("stroke", isSelected ? "#ff00ff" : "#00f3ff")
                  .attr("stroke-width", 1.5)
                  .attr("fill", "none")
                  .attr("opacity", 1);
                 
                 g.select(".node-label")
                  .text(d?.name ? d.name.toUpperCase() : "")
                  .attr("y", -15)
                  .attr("x", 0)
                  .attr("text-anchor", "middle")
                  .attr("fill", isSelected ? "#ff00ff" : "#00f3ff")
                  .attr("font-size", "8px")
                  .attr("font-family", "Orbitron");
                  
                 // Data Readout
                 g.select(".tech-readout")
                  .text(`ID: ${d.id.substring(0,4)} | VAL: ${d.val}`)
                  .attr("y", 20)
                  .attr("x", 0)
                  .attr("text-anchor", "middle")
                  .attr("fill", "#00f3ff")
                  .attr("font-size", "4px")
                  .attr("font-family", "monospace")
                  .attr("opacity", 0.7);

             } else {
                 // --- STANDARD STYLE ---
                 g.select(".cube-shape").attr("opacity", 0);
                 g.select(".icon-shape").attr("opacity", 0);
                 g.select(".tech-readout").attr("opacity", 0);
                 g.select(".mini-chart").attr("opacity", 0);
                 
                 g.select(".node-dot")
                  .attr("r", d.type === 'root' ? 10 : 5)
                  .attr("fill", d.type === 'root' ? "#00f3ff" : "#fff")
                  .attr("stroke", "#00f3ff")
                  .attr("stroke-width", isSelected ? 2 : 0)
                  .attr("opacity", 1);
                 
                 if (!d.isSelected) {
                     g.select(".node-label")
                      .text(d?.name && d.scale > 0.6 ? d.name : "")
                      .attr("y", -15)
                      .attr("text-anchor", "middle")
                      .attr("fill", "#00f3ff")
                      .attr("font-size", "8px");
                 } else {
                     g.select(".node-label").text(""); 
                 }
             }
        });

        if (animationRef.current) animationRef.current = requestAnimationFrame(tick);
    };
    
    animationRef.current = requestAnimationFrame(tick);

    return () => {
        if (animationRef.current) cancelAnimationFrame(animationRef.current);
        svgRef.current?.removeEventListener('mousedown', onMouseDownGlobal);
        svgRef.current?.removeEventListener('wheel', onWheel);
        svgRef.current?.removeEventListener('touchstart', onTouchStart);
        svgRef.current?.removeEventListener('touchmove', onTouchMove);
        svgRef.current?.removeEventListener('touchend', onTouchEnd);
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', onMouseUp);
    };
  }, [data, mode, dimensions, isLinkingMode, onLinkConnect]); 

  return (
    <div ref={containerRef} className="w-full h-full bg-transparent relative">
      <svg ref={svgRef} className={`w-full h-full ${isLinkingMode ? 'cursor-crosshair' : 'cursor-crosshair'}`}>
        <defs>
            <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="28" refY="3.5" orient="auto">
                <polygon points="0 0, 10 3.5, 0 7" fill="#00f3ff" />
            </marker>
        </defs>
      </svg>
      {contextMenu && (
        <div 
          className="absolute z-50 bg-black/90 border border-neon-blue p-2 rounded shadow-[0_0_15px_#00f3ff] flex flex-col gap-1 backdrop-blur"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          <button onClick={() => handleCenterView(contextMenu.node!)} className="px-3 py-1 text-xs text-neon-blue hover:bg-neon-blue/20 text-left uppercase tracking-wider">Focus Node</button>
          {onExpand && <button onClick={() => { onExpand(contextMenu.node!); setContextMenu(null); }} className="px-3 py-1 text-xs text-white hover:bg-white/20 text-left uppercase tracking-wider">Deep Analyze</button>}
          {onDelete && <button onClick={() => { onDelete(contextMenu.node!); setContextMenu(null); }} className="px-3 py-1 text-xs text-red-500 hover:bg-red-500/20 text-left uppercase tracking-wider">Terminate</button>}
        </div>
      )}
    </div>
  );
};