import { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
// import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'; // Remove OrbitControls
import { Eye, Home } from 'lucide-react';

// Constants for grid and view
const TOTAL_GRID_SIZE = 5000; // Total size of the grid (5000x5000)
const MIN_ZOOM = 0.1; // Minimum zoom adjusted for better default view
const MAX_ZOOM = 20; // Maximum zoom for 1-unit grid lines
const DEFAULT_ZOOM = 1.0; // Default zoom level - 1.0 is "natural" size
const DIAGONAL_GRID_SIZE = TOTAL_GRID_SIZE * Math.SQRT2; // For proper frustum calculation
const PAN_SPEED_FACTOR = 1;
const ZOOM_SENSITIVITY = 0.001;
// Isometric view constants
const ISO_ANGLE = Math.PI / 4; // 45 degrees for isometric angle
const ISO_DISTANCE_FACTOR = 1.2; // Distance factor for isometric view
// Grid levels for different zoom factors - all divisible by 20
const GRID_LEVELS = [
  { zoom: 0.15, interval: 1000, subdivisions: 2 }, // Very far (1000 unit spacing)
  { zoom: 0.3, interval: 500, subdivisions: 5 },   // Far (500 unit spacing)
  { zoom: 0.6, interval: 250, subdivisions: 5 },   // Medium-far (250 unit spacing)
  { zoom: 1.2, interval: 100, subdivisions: 5 },   // Medium (100 unit spacing)
  { zoom: 2.4, interval: 50, subdivisions: 5 },    // Medium-close (50 unit spacing)
  { zoom: 4.8, interval: 20, subdivisions: 2 },    // Close (20 unit spacing)
  { zoom: 9.6, interval: 10, subdivisions: 2 },    // Very close (10 unit spacing)
  { zoom: 14, interval: 5, subdivisions: 5 },      // Ultra close (5 unit spacing)
  { zoom: 18, interval: 1, subdivisions: 1 }       // Maximum detail (1 unit spacing)
];

const Canvas = () => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [isIsometric, setIsIsometric] = useState(true);

  // References to three.js objects
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.OrthographicCamera | null>(null); // Changed to Orthographic explicitly
  const gridRef = useRef<THREE.Object3D | null>(null);
  const animationFrameId = useRef<number | null>(null); // Ref to store animation frame ID
  
  // References for grid labels
  const labelGroupRef = useRef<THREE.Group | null>(null);
  const lastZoomLevelForGridRef = useRef<number>(0); // Track last zoom level that triggered grid update
  const currentGridLevelRef = useRef<typeof GRID_LEVELS[0] | null>(null); // Track current grid level
  
  // State for manual controls
  const isDraggingRef = useRef(false);
  const lastMousePositionRef = useRef({ x: 0, y: 0 });

  // Store view-specific camera states to preserve position when switching views
  const isometricViewStateRef = useRef({
    position: new THREE.Vector3(TOTAL_GRID_SIZE / 2, TOTAL_GRID_SIZE / 2, TOTAL_GRID_SIZE / 4),
    zoom: DEFAULT_ZOOM // Initial zoom level - more reasonable default
  });
  
  const birdsEyeViewStateRef = useRef({
    position: new THREE.Vector3(TOTAL_GRID_SIZE / 2, TOTAL_GRID_SIZE / 2, TOTAL_GRID_SIZE / 4),
    zoom: DEFAULT_ZOOM // Initial zoom level - more reasonable default
  });
  
  // Current camera offset - will be synced with the appropriate view state
  const cameraOffsetRef = useRef(new THREE.Vector3(TOTAL_GRID_SIZE / 2, TOTAL_GRID_SIZE / 2, TOTAL_GRID_SIZE / 4));
  const zoomLevelRef = useRef(DEFAULT_ZOOM); // Initial zoom level for Orthographic camera

  // State refs for manual controls (updated by events, applied in animation loop)
  const panDeltaRef = useRef({ x: 0, y: 0 }); // Accumulated screen pan delta since last frame
  const zoomDeltaRef = useRef(0); // Accumulated wheel delta since last frame
  const mousePosForZoomRef = useRef({ x: 0, y: 0 }); // Screen position where zoom occurred

  // Helper function to calculate isometric camera position based on a target XY position
  const calculateIsometricPosition = useCallback((targetX: number, targetY: number) => {
    // For isometric view, we position the camera at an angle to the target
    // Distance is based purely on the angle we want to view from, not on zoom
    const distanceFromCenter = TOTAL_GRID_SIZE / 2;
    
    // Calculate position offsets for proper isometric angle
    const horizontalDist = distanceFromCenter * Math.cos(ISO_ANGLE);
    const verticalDist = distanceFromCenter * Math.sin(ISO_ANGLE);
    
    // Return position that creates proper isometric view angle
    return new THREE.Vector3(
      targetX - horizontalDist,
      targetY - horizontalDist,
      verticalDist
    );
  }, []);

  // Helper function to set camera orientation
  const setCameraOrientation = useCallback((camera: THREE.OrthographicCamera, isometricView: boolean) => {
    console.log(`[DEBUG] Setting camera orientation for ${isometricView ? 'isometric' : 'birds-eye'} view`);
    
    if (isometricView) {
      // For isometric view, maintain the 45-degree angle
      camera.up.set(0, 0, 1); // Z-up
      
      // Calculate target point in front of camera for proper angle
      const horizontalDist = TOTAL_GRID_SIZE / 4; // Fixed distance for lookAt
      const targetPoint = new THREE.Vector3(
        camera.position.x + horizontalDist,
        camera.position.y + horizontalDist,
        0
      );
      camera.lookAt(targetPoint);
    } else {
      // Top-down view
      camera.up.set(0, 1, 0); // Y-up for screen space
      camera.lookAt(new THREE.Vector3(camera.position.x, camera.position.y, 0));
    }
    
    camera.updateMatrixWorld(true);
    console.log(`[DEBUG] Orientation Set: View=${isometricView?'Iso':'Top'}, Up=(${camera.up.x},${camera.up.y},${camera.up.z})`);
  }, []);

  // Helper to convert screen coordinates to world coordinates (relative to center)
  const screenToWorld = useCallback((screenX: number, screenY: number) => {
    if (!rendererRef.current || !cameraRef.current || !mountRef.current) return new THREE.Vector3();

    const rect = mountRef.current.getBoundingClientRect();
    const x = ((screenX - rect.left) / rect.width) * 2 - 1;
    const y = -((screenY - rect.top) / rect.height) * 2 + 1;

    const vec = new THREE.Vector3(x, y, 0.5); // Use 0.5 for Z, projecting onto a plane
    vec.unproject(cameraRef.current);

    return new THREE.Vector3(screenX, screenY, 0); // Return screen coords for now, delta calc is key
  }, []);

  // Helper function to get current grid level based on zoom
  const getCurrentGridLevel = useCallback((zoom: number) => {
    // Find the most detailed grid level appropriate for current zoom
    for (let i = GRID_LEVELS.length - 1; i >= 0; i--) {
      if (zoom >= GRID_LEVELS[i].zoom) {
        return GRID_LEVELS[i];
      }
    }
    // Default to the least detailed grid level if zoom is very small
    return GRID_LEVELS[0];
  }, []);

  // Helper to create text label
  const createTextLabel = useCallback((text: string, position: THREE.Vector3, color: number = 0xffffff, size: number = 14) => {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) return null;
    
    canvas.width = 128;
    canvas.height = 64;
    
    // Set text properties
    context.fillStyle = '#000000';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.font = `${size}px Arial`;
    context.fillStyle = `#${color.toString(16).padStart(6, '0')}`;
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(text, canvas.width / 2, canvas.height / 2);
    
    // Create texture and sprite
    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({ map: texture, transparent: true });
    const sprite = new THREE.Sprite(material);
    sprite.position.copy(position);
    sprite.scale.set(4, 2, 1); // Adjust scale as needed
    
    return sprite;
  }, []);

  // Function to update grid based on zoom level
  const updateGridWithLabels = useCallback(() => {
    if (!sceneRef.current || !cameraRef.current) return;
    
    const scene = sceneRef.current;
    const camera = cameraRef.current;
    const zoom = camera.zoom;
    
    // Check if we need to update grid based on zoom threshold changes
    const currentGridLevel = getCurrentGridLevel(zoom);
    
    // If the grid needs to be updated (significant zoom change or view mode change)
    if (
      !gridRef.current || 
      (gridRef.current && !scene.children.includes(gridRef.current)) ||
      Math.abs(lastZoomLevelForGridRef.current - zoom) / zoom > 0.1 || // Reduced threshold to 10% for more responsive updates
      !currentGridLevelRef.current ||
      currentGridLevel.interval !== currentGridLevelRef.current.interval ||
      lastZoomLevelForGridRef.current === 0
    ) {
      console.log(`[DEBUG] Updating grid for zoom: ${zoom.toFixed(2)}, grid interval: ${currentGridLevel.interval}`);
      
      // Remove existing grid
      if (gridRef.current) {
        scene.remove(gridRef.current);
        gridRef.current = null;
      }
      
      // Remove existing labels
      if (labelGroupRef.current) {
        scene.remove(labelGroupRef.current);
        labelGroupRef.current = null;
      }
      
      // Create new label group
      const labelGroup = new THREE.Group();
      
      // Create new grid based on zoom level
      const gridSize = TOTAL_GRID_SIZE;
      const interval = currentGridLevel.interval;
      const subdivisions = currentGridLevel.subdivisions;
      
      // Calculate number of cells based on interval
      const cells = Math.floor(gridSize / interval);
      
      // Create new grid
      const grid = new THREE.GridHelper(
        gridSize, 
        cells * subdivisions, 
        0x444444, // Major grid lines (lighter)
        0x222222  // Minor grid lines (darker)
      );
      grid.rotation.x = Math.PI / 2; // Rotate grid to be on XY plane

      // Shift the whole helper so that the lower‑left corner starts at (0,0) – this matches the logical
      // coordinate space we use elsewhere (labels, collision, etc.). The helper by default is centred at
      // the origin, so we translate by half the grid size on X & Y.
      grid.position.set(gridSize / 2, gridSize / 2, 0);
      scene.add(grid);
      gridRef.current = grid;
      
      // Calculate visible area based on camera frustum
      const aspect = camera.right / camera.top;
      const frustumHeight = (camera.top - camera.bottom) / camera.zoom;
      const frustumWidth = frustumHeight * aspect;
      
      // Get camera position to determine visible range
      const camX = camera.position.x;
      const camY = camera.position.y;
      
      // Calculate visible grid bounds (add some padding)
      const padding = 1.2; // 20% padding beyond visible area
      const visibleMinX = Math.max(0, camX - (frustumWidth * padding / 2));
      const visibleMaxX = Math.min(gridSize, camX + (frustumWidth * padding / 2));
      const visibleMinY = Math.max(0, camY - (frustumHeight * padding / 2));
      const visibleMaxY = Math.min(gridSize, camY + (frustumHeight * padding / 2));
      
      // Calculate label placement intervals based on current interval
      // For lower zooms use larger intervals, for higher zooms use the grid interval
      const labelInterval = Math.max(interval, Math.max(20, Math.floor(interval * Math.max(1, 5000 / frustumWidth))));
      
      // Create X-axis labels (along the edge closest to camera in isometric view)
      for (let x = Math.floor(visibleMinX / labelInterval) * labelInterval; x <= visibleMaxX; x += labelInterval) {
        if (x >= 0 && x <= gridSize) {
          const labelTextX = x.toString();
          let labelPosX: THREE.Vector3;
          
          if (isIsometric) {
            // For isometric, place labels along front edge
            labelPosX = new THREE.Vector3(x, 0, 0.5); // Slightly raised
          } else {
            // For birds-eye view, place labels along bottom edge
            labelPosX = new THREE.Vector3(x, 0, 0.5);
          }
          
          const labelX = createTextLabel(labelTextX, labelPosX, 0xffffff);
          if (labelX) labelGroup.add(labelX);
        }
      }
      
      // Create Y-axis labels (along the other edge)
      for (let y = Math.floor(visibleMinY / labelInterval) * labelInterval; y <= visibleMaxY; y += labelInterval) {
        if (y >= 0 && y <= gridSize) {
          const labelTextY = y.toString();
          let labelPosY: THREE.Vector3;
          
          if (isIsometric) {
            // For isometric, place labels along side edge
            labelPosY = new THREE.Vector3(0, y, 0.5); // Slightly raised
          } else {
            // For birds-eye view, place labels along left edge
            labelPosY = new THREE.Vector3(0, y, 0.5);
          }
          
          const labelY = createTextLabel(labelTextY, labelPosY, 0xffffff);
          if (labelY) labelGroup.add(labelY);
        }
      }
      
      // Translate labels by the same offset so that they sit flush with the new grid position.
      labelGroup.position.set(gridSize / 2, gridSize / 2, 0);
      
      // Add label group to scene
      scene.add(labelGroup);
      labelGroupRef.current = labelGroup;
      
      // Update last zoom level that triggered a grid update
      lastZoomLevelForGridRef.current = zoom;
      currentGridLevelRef.current = currentGridLevel;

      console.log('[DEBUG] Grid helper & labels added to scene', {
        interval,
        subdivisions,
        cells,
        gridPosition: grid.position.toArray(),
        cameraPosition: camera.position.toArray(),
        cameraZoom: zoom,
      });
    }
  }, [isIsometric, getCurrentGridLevel, createTextLabel]);

  // Unified camera frustum adjustment that properly handles both views
  const adjustCameraFrustum = useCallback((camera: THREE.OrthographicCamera, zoom: number) => {
    if (!mountRef.current) return;
    
    const width = mountRef.current.clientWidth;
    const height = mountRef.current.clientHeight;
    const aspect = width / height;
    
    // Base size calculation that ensures full grid visibility in both views
    // For isometric, we need to fit the diagonal. For top-down, we need to fit the width/height
    const baseViewSize = (isIsometric ? DIAGONAL_GRID_SIZE : TOTAL_GRID_SIZE) / 2;
    const viewHeight = baseViewSize / zoom;
    const viewWidth = viewHeight * aspect;
    
    camera.left = -viewWidth;
    camera.right = viewWidth;
    camera.top = viewHeight;
    camera.bottom = -viewHeight;
    camera.near = -10000;
    camera.far = 10000;
    camera.updateProjectionMatrix();
    
    console.log(`[DEBUG] Adjusted frustum: zoom=${zoom.toFixed(2)}, viewHeight=${viewHeight.toFixed(2)}, viewWidth=${viewWidth.toFixed(2)}`);
  }, [isIsometric]);

  // Handle window resize - moved before renderer initialization
  const handleResize = useCallback(() => {
    if (!mountRef.current || !rendererRef.current || !cameraRef.current) return;
    
    const width = mountRef.current.clientWidth;
    const height = mountRef.current.clientHeight;
    rendererRef.current.setSize(width, height);
    
    adjustCameraFrustum(cameraRef.current, cameraRef.current.zoom);
    updateGridWithLabels();
  }, [adjustCameraFrustum, updateGridWithLabels]);

  // Create scene, renderer, lights, and setup animation loop (run once on mount)
  useEffect(() => {
    if (!mountRef.current) return;
    console.log("[INFO] Setting up scene and renderer");

    // Create scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);
    sceneRef.current = scene;

    // Create renderer with proper sizing
    const mount = mountRef.current;
    const renderer = new THREE.WebGLRenderer({ 
      antialias: true,
      alpha: true 
    });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(mount.clientWidth, mount.clientHeight, false);
    renderer.setClearColor(0x000000, 1);
    mount.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Add ambient light for consistent illumination
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambientLight);

    // Add directional light for shadows and depth
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
    directionalLight.position.set(1, 1, 1);
    scene.add(directionalLight);

    // --- Event Listeners for Manual Controls ---
    const handleMouseDown = (event: MouseEvent) => {
      isDraggingRef.current = true;
      lastMousePositionRef.current = { x: event.clientX, y: event.clientY };
      panDeltaRef.current = { x: 0, y: 0 }; // Reset pan delta on new drag start
      mount.style.cursor = 'grabbing';
    };

    const handleMouseMove = (event: MouseEvent) => {
      if (!isDraggingRef.current || !cameraRef.current) return;

      const currentMousePosition = { x: event.clientX, y: event.clientY };
      panDeltaRef.current.x += currentMousePosition.x - lastMousePositionRef.current.x;
      panDeltaRef.current.y += currentMousePosition.y - lastMousePositionRef.current.y;
      lastMousePositionRef.current = currentMousePosition;
    };

    const handleMouseUpOrLeave = () => {
      if (isDraggingRef.current) {
        isDraggingRef.current = false;
        mount.style.cursor = 'grab';
      }
    };

    const handleWheel = (event: WheelEvent) => {
      event.preventDefault();
      if (!cameraRef.current) return;
      
      zoomDeltaRef.current += event.deltaY;
      mousePosForZoomRef.current = { x: event.clientX, y: event.clientY };
    };

    // Attach event listeners
    mount.addEventListener('mousedown', handleMouseDown);
    mount.addEventListener('mousemove', handleMouseMove);
    mount.addEventListener('mouseup', handleMouseUpOrLeave);
    mount.addEventListener('mouseleave', handleMouseUpOrLeave);
    mount.addEventListener('wheel', handleWheel, { passive: false });

    // Set initial cursor
    mount.style.cursor = 'grab';

    // Animation loop
    const animate = () => {
      animationFrameId.current = requestAnimationFrame(animate);

      const camera = cameraRef.current;
      if (!camera || !renderer || !scene) return;

      // Ensure the grid is present. This guarantees the helper is built even if the initial
      // set‑up order meant it hadn't been created yet (e.g. after a hard refresh or view toggle).
      if (!gridRef.current) {
        console.log('[DEBUG] Grid missing inside animation loop – regenerating');
        updateGridWithLabels();
      }

      // Convert the screen‑space drag (pixels) into world‑space units so that panning feels identical at
      // every zoom level.
      const viewportWidth = camera.right - camera.left;
      const viewportHeight = camera.top - camera.bottom;
      const unitsPerPixelX = viewportWidth / renderer.domElement.clientWidth;
      const unitsPerPixelY = viewportHeight / renderer.domElement.clientHeight;

      // Scale the movement so that finer zoom levels don't feel overly sensitive.
      const zoomScale = 1 / Math.sqrt(camera.zoom); // dampens panning sensitivity as you zoom in

      const deltaX = panDeltaRef.current.x * unitsPerPixelX * PAN_SPEED_FACTOR * zoomScale;
      const deltaY = panDeltaRef.current.y * unitsPerPixelY * PAN_SPEED_FACTOR * zoomScale;

      // Get camera's right and up vectors
      const cameraRight = new THREE.Vector3();
      const cameraUp = new THREE.Vector3();
      camera.getWorldDirection(new THREE.Vector3());
      cameraRight.setFromMatrixColumn(camera.matrixWorld, 0);
      cameraUp.setFromMatrixColumn(camera.matrixWorld, 1);

      // Calculate world space movement
      const moveX = cameraRight.multiplyScalar(-deltaX);
      const moveY = cameraUp.multiplyScalar(deltaY);
      const moveVector = moveX.add(moveY);

      // Apply movement
      camera.position.add(moveVector);
      camera.updateMatrixWorld();

      // Update view state
      if (isIsometric) {
        isometricViewStateRef.current.position.copy(camera.position);
      } else {
        birdsEyeViewStateRef.current.position.copy(camera.position);
      }

      // Reset pan delta
      panDeltaRef.current = { x: 0, y: 0 };
      updateGridWithLabels();

      // Apply accumulated zoom delta
      if (zoomDeltaRef.current !== 0) {
        const zoomFactor = Math.pow(0.95, zoomDeltaRef.current * ZOOM_SENSITIVITY);
        const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, camera.zoom * zoomFactor));

        if (newZoom !== camera.zoom) {
          camera.zoom = newZoom;
          adjustCameraFrustum(camera, newZoom);
          updateGridWithLabels();

          // Update view state
          if (isIsometric) {
            isometricViewStateRef.current.zoom = newZoom;
          } else {
            birdsEyeViewStateRef.current.zoom = newZoom;
          }
        }

        zoomDeltaRef.current = 0;
      }

      renderer.render(scene, camera);

      if (animationFrameId.current === null) {
        console.log('[DEBUG] First animation frame – renderer size', {
          width: renderer.domElement.clientWidth,
          height: renderer.domElement.clientHeight,
          zoom: camera.zoom,
          left: camera.left,
          right: camera.right,
          top: camera.top,
          bottom: camera.bottom,
        });
      }
    };

    // Start animation loop
    animate();

    // Attach window resize handler
    window.addEventListener('resize', handleResize);

    // Cleanup function
    return () => {
      console.log("[INFO] Cleaning up scene and renderer");
      
      // Remove event listeners
      mount.removeEventListener('mousedown', handleMouseDown);
      mount.removeEventListener('mousemove', handleMouseMove);
      mount.removeEventListener('mouseup', handleMouseUpOrLeave);
      mount.removeEventListener('mouseleave', handleMouseUpOrLeave);
      mount.removeEventListener('wheel', handleWheel);
      window.removeEventListener('resize', handleResize);
      
      if (animationFrameId.current !== null) {
        cancelAnimationFrame(animationFrameId.current);
      }
      
      if (renderer && mount) {
        mount.removeChild(renderer.domElement);
        renderer.dispose();
      }
      
      // Clean up any remaining Three.js objects
      if (scene) {
        scene.traverse((object) => {
          if (object instanceof THREE.Mesh) {
            object.geometry.dispose();
            if (object.material instanceof THREE.Material) {
              object.material.dispose();
            } else if (Array.isArray(object.material)) {
              object.material.forEach(material => material.dispose());
            }
          }
        });
      }
    };
  }, []);

  // Helper to calculate the visual distance for isometric view
  const calculateIsometricVisualDistance = useCallback((zoom: number) => {
    // Calculate base distance and adjust by zoom
    const distanceFromCenter = TOTAL_GRID_SIZE * ISO_DISTANCE_FACTOR / zoom;
    
    // Calculate horizontal and vertical offsets for the proper angle
    const horizontalDist = distanceFromCenter * Math.cos(ISO_ANGLE) * 1.5;
    
    return horizontalDist;
  }, []);

  // Handle camera orientation changes
  useEffect(() => {
    if (!cameraRef.current) {
        console.warn("[WARN] Skipping camera orientation update: Camera not ready.");
        return;
    }
    const camera = cameraRef.current;
    console.log(`[DEBUG] Updating camera orientation for ${isIsometric ? 'isometric' : 'birds-eye'} view`);

    if (isIsometric) {
        // Ensure Z-up for isometric view
        camera.up.set(0, 0, 1);
        
        // Calculate horizontal distance for target based on current zoom
        const horizontalDist = calculateIsometricVisualDistance(camera.zoom);
        
        // Create a target point that maintains the proper isometric angle
        const targetPoint = new THREE.Vector3(
            camera.position.x + horizontalDist, // Look forward in X (adjusted based on zoom)
            camera.position.y + horizontalDist, // Look forward in Y (adjusted based on zoom)
            0                                   // Look down to the grid (Z=0)
        );
        
        // Apply lookAt to maintain isometric angle
        camera.lookAt(targetPoint);
    } else { // Top-Down
        // Ensure Y-up (for screen space)
        camera.up.set(0, 1, 0);
        
        // Target directly below camera for birds-eye view
        const targetPoint = new THREE.Vector3(camera.position.x, camera.position.y, 0);
        camera.lookAt(targetPoint);
    }

    // Force update matrix world 
    camera.updateMatrixWorld(true); 
    
    // Adjust frustum for new orientation
    adjustCameraFrustum(camera, camera.zoom);
    
    // Update grid after orientation change
    updateGridWithLabels();

    console.log(`[DEBUG] Camera Orientation Updated: View=${isIsometric?'Iso':'Top'}, Pos=(${camera.position.x.toFixed(1)}, ${camera.position.y.toFixed(1)}, ${camera.position.z.toFixed(1)}), Up=(${camera.up.x},${camera.up.y},${camera.up.z})`);

  // Dependencies include both the isometric flag and the grid update function
  }, [isIsometric, calculateIsometricVisualDistance, updateGridWithLabels, adjustCameraFrustum]); 

  // Toggle view function - now preserves state when switching
  const toggleView = useCallback(() => {
    if (!cameraRef.current) return;
    console.log(`[INFO] Toggling view from ${isIsometric ? 'isometric' : 'birds-eye'} to ${!isIsometric ? 'isometric' : 'birds-eye'}`);
    
    const camera = cameraRef.current;
    
    // Save current view state before switching
    if (isIsometric) {
      isometricViewStateRef.current.position.copy(camera.position);
      isometricViewStateRef.current.zoom = camera.zoom;
    } else {
      birdsEyeViewStateRef.current.position.copy(camera.position);
      birdsEyeViewStateRef.current.zoom = camera.zoom;
    }
    
    // Toggle the view mode
    setIsIsometric(prev => !prev);
    
    // Get the target state for the new view
    const targetState = !isIsometric ? isometricViewStateRef.current : birdsEyeViewStateRef.current;
    
    // Update camera position and zoom
    camera.position.copy(targetState.position);
    camera.zoom = targetState.zoom;
    
    // Update orientation and frustum for new view
    setCameraOrientation(camera, !isIsometric);
    adjustCameraFrustum(camera, camera.zoom);
    updateGridWithLabels();
  }, [isIsometric, setCameraOrientation, adjustCameraFrustum, updateGridWithLabels]);

  // Initial camera setup effect
  useEffect(() => {
    if (!mountRef.current) return;
    console.log("[INFO] Setting up initial camera");
    
    const width = mountRef.current.clientWidth;
    const height = mountRef.current.clientHeight;
    const aspect = width / height;
    
    // Create camera with initial frustum
    const camera = new THREE.OrthographicCamera(
      -width / 2, width / 2,
      height / 2, -height / 2,
      -10000, 10000
    );
    
    // Set initial position at grid center
    const gridCenter = new THREE.Vector3(TOTAL_GRID_SIZE / 2, TOTAL_GRID_SIZE / 2, 0);
    const initialPosition = isIsometric
      ? calculateIsometricPosition(gridCenter.x, gridCenter.y)
      : new THREE.Vector3(gridCenter.x, gridCenter.y, TOTAL_GRID_SIZE / 2);
    
    camera.position.copy(initialPosition);
    camera.zoom = DEFAULT_ZOOM;
    
    // Set initial orientation
    setCameraOrientation(camera, isIsometric);
    
    // Update frustum for initial zoom
    adjustCameraFrustum(camera, DEFAULT_ZOOM);
    
    // Store camera reference
    cameraRef.current = camera;
    
    // Initialize view states
    isometricViewStateRef.current.position.copy(initialPosition);
    isometricViewStateRef.current.zoom = DEFAULT_ZOOM;
    birdsEyeViewStateRef.current.position.copy(initialPosition);
    birdsEyeViewStateRef.current.zoom = DEFAULT_ZOOM;
    
    // Update refs
    cameraOffsetRef.current.copy(initialPosition);
    zoomLevelRef.current = DEFAULT_ZOOM;
    
    // Ensure renderer dimensions are in sync with the now‑ready camera & DOM.
    handleResize();

    // Build the initial grid so that the user doesn't have to interact first for it to appear.
    updateGridWithLabels();
    
    console.log("[INFO] Initial camera setup complete");
  }, [isIsometric, calculateIsometricPosition, setCameraOrientation, adjustCameraFrustum]);

  // Recenter view function - resets both view states
  const handleRecenter = useCallback(() => {
    if (!cameraRef.current) return;
    console.log("[INFO] Recentering camera");

    const camera = cameraRef.current;
    const gridCenter = new THREE.Vector3(TOTAL_GRID_SIZE / 2, TOTAL_GRID_SIZE / 2, 0);
    
    // Calculate new camera position based on view mode
    const newPosition = isIsometric
      ? calculateIsometricPosition(gridCenter.x, gridCenter.y)
      : new THREE.Vector3(gridCenter.x, gridCenter.y, TOTAL_GRID_SIZE / 2);

    // Set camera position and zoom
    camera.position.copy(newPosition);
    camera.zoom = DEFAULT_ZOOM;
    
    // Update camera orientation for the current view mode
    setCameraOrientation(camera, isIsometric);
    
    // Update frustum and grid
    adjustCameraFrustum(camera, DEFAULT_ZOOM);
    updateGridWithLabels();
    
    // Update view state
    if (isIsometric) {
      isometricViewStateRef.current.position.copy(newPosition);
      isometricViewStateRef.current.zoom = DEFAULT_ZOOM;
    } else {
      birdsEyeViewStateRef.current.position.copy(newPosition);
      birdsEyeViewStateRef.current.zoom = DEFAULT_ZOOM;
    }

    // Update refs
    cameraOffsetRef.current.copy(newPosition);
    zoomLevelRef.current = DEFAULT_ZOOM;

    console.log("[INFO] Camera recentered to view entire grid.");
  }, [isIsometric, calculateIsometricPosition, setCameraOrientation, adjustCameraFrustum, updateGridWithLabels]);

  return (
    <div className="relative w-full h-full overflow-hidden">
      <div 
        ref={mountRef} 
        className="absolute inset-0 w-full h-full" 
      />
      
      <div className="absolute top-4 right-4 flex flex-col space-y-2">
          <button
            onClick={toggleView}
            className="bg-gray-800 text-white p-2 rounded-full shadow-lg hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
            title={isIsometric ? "Switch to Birds-eye View" : "Switch to Isometric View"}
          >
            <Eye size={24} />
          </button>
          <button
            onClick={handleRecenter}
            className="bg-gray-800 text-white p-2 rounded-full shadow-lg hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
            title="Recenter View"
          >
            <Home size={24} />
          </button>
      </div>
    </div>
  );
};

export default Canvas; 