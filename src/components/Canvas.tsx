import { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { Eye } from 'lucide-react';
import log from 'loglevel';

// Configure logging
log.setLevel(log.levels.INFO);

// Constants - made smaller for better visibility
const GRID_SIZE = 100;
const GRID_DIVISIONS = 20;

const Canvas = () => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [isIsometric, setIsIsometric] = useState(true);
  const [isPanning, setIsPanning] = useState(false);
  
  // References to three.js objects
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | THREE.OrthographicCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const gridRef = useRef<THREE.GridHelper | null>(null);
  const animationFrameId = useRef<number | null>(null); // Ref to store animation frame ID
  
  // Create scene, renderer, lights, and setup animation loop only once on component mount
  useEffect(() => {
    log.info("Initializing scene and renderer");
    if (!mountRef.current) return;

    const mount = mountRef.current; // Capture mountRef.current

    // Create scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x111111);
    sceneRef.current = scene;

    // Setup renderer
    const width = mount.clientWidth;
    const height = mount.clientHeight;
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    mount.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Add lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
    directionalLight.position.set(1, 1, 1);
    scene.add(directionalLight);

    // Create axes helper for debug
    const axesHelper = new THREE.AxesHelper(10);
    scene.add(axesHelper); // X=Red, Y=Green, Z=Blue (Will be UP)
    
    // Handle window resize
    const handleResize = () => {
      if (!mount || !rendererRef.current || !cameraRef.current) return;
      const currentWidth = mount.clientWidth;
      const currentHeight = mount.clientHeight;
      rendererRef.current.setSize(currentWidth, currentHeight);
      
      if (cameraRef.current instanceof THREE.PerspectiveCamera) {
        cameraRef.current.aspect = currentWidth / currentHeight;
        cameraRef.current.updateProjectionMatrix();
      } else if (cameraRef.current instanceof THREE.OrthographicCamera) {
        const aspectRatio = currentWidth / currentHeight;
        const viewSize = 50; // Consider making this dynamic based on zoom?
        cameraRef.current.left = -viewSize * aspectRatio;
        cameraRef.current.right = viewSize * aspectRatio;
        cameraRef.current.top = viewSize;
        cameraRef.current.bottom = -viewSize;
        cameraRef.current.updateProjectionMatrix();
      }
    };
    window.addEventListener('resize', handleResize);

    // Mouse events for cursor state
    const handleMouseDown = () => setIsPanning(true);
    const handleMouseUp = () => setIsPanning(false);
    const handleMouseLeave = () => setIsPanning(false); // Also reset on leave
    mount.addEventListener('mousedown', handleMouseDown);
    mount.addEventListener('mouseup', handleMouseUp);
    mount.addEventListener('mouseleave', handleMouseLeave);

    // Start animation loop
    const animate = () => {
      animationFrameId.current = requestAnimationFrame(animate); // Store the frame ID
      
      if (controlsRef.current) {
        controlsRef.current.update(); // Update controls (needed for damping)
      }
      
      if (rendererRef.current && cameraRef.current && sceneRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
    };
    animate(); // Start the loop

    // Cleanup on unmount
    return () => {
      log.info("Cleaning up scene and renderer");
      window.removeEventListener('resize', handleResize);
      mount.removeEventListener('mousedown', handleMouseDown);
      mount.removeEventListener('mouseup', handleMouseUp);
      mount.removeEventListener('mouseleave', handleMouseLeave);

      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current); // Stop the animation loop
      }
      if (controlsRef.current) {
        controlsRef.current.dispose();
      }
      if (rendererRef.current) {
        rendererRef.current.dispose();
      }
      if (mount && rendererRef.current?.domElement) {
        // Check if rendererRef.current exists before accessing domElement
        try {
           mount.removeChild(rendererRef.current.domElement);
        } catch (error) {
           log.warn("Error removing renderer DOM element during cleanup:", error);
        }
      }
      // Dispose scene resources if necessary (geometry, materials)
      // sceneRef.current?.traverse(...) -> dispose geometry/material
    };
  }, []); // Empty dependency array ensures this runs only once
  
  // Handle camera, controls, and grid changes based on view type
  useEffect(() => {
    if (!sceneRef.current || !mountRef.current || !rendererRef.current) {
       log.warn("Skipping view setup: Refs not ready");
       return;
    }

    log.info(`Setting up ${isIsometric ? 'isometric (Orthographic)' : 'birds-eye (Orthographic)'} view`);

    // --- Cleanup previous objects ---
    // Dispose previous controls FIRST
    if (controlsRef.current) {
      log.debug("Disposing previous controls");
      controlsRef.current.dispose();
      controlsRef.current = null;
    }
    // Remove previous grid
    if (gridRef.current) {
      log.debug("Removing previous grid");
      sceneRef.current.remove(gridRef.current);
      // Consider disposing grid geometry/material if needed
      gridRef.current = null;
    }
    // No need to remove the previous camera from the scene explicitly

    // --- Setup new objects ---
    const width = mountRef.current.clientWidth;
    const height = mountRef.current.clientHeight;
    const scene = sceneRef.current;
    const rendererElement = rendererRef.current.domElement;

    // Create grid - use bright white for better visibility
    log.debug("Creating new grid");
    const grid = new THREE.GridHelper(GRID_SIZE, GRID_DIVISIONS, 0xffffff, 0xaaaaaa);
    grid.rotation.x = Math.PI / 2; // Rotate grid to be on the XY plane (Z=0)
    scene.add(grid);
    gridRef.current = grid;

    let camera: THREE.PerspectiveCamera | THREE.OrthographicCamera;

    if (isIsometric) {
      // Isometric view (Perspective) - Adjust position for better view
      log.debug("Creating PerspectiveCamera");
      // const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
      // camera.position.set(30, 30, 30); // Original position
      // camera.lookAt(0, 0, 0);
      // cameraRef.current = camera;
      // --- Orthographic Isometric ---
      log.debug("Creating OrthographicCamera (Isometric Z-Up)");
      const aspect = width / height;
      const d = 80; // Distance factor for frustum size
      camera = new THREE.OrthographicCamera(-d * aspect, d * aspect, d, -d, 1, 1000);
      // Position for isometric view
      camera.position.set(50, 50, 50); // Adjust as needed
      camera.up.set(0, 0, 1); // Z axis is 'up' as per PRD
      camera.lookAt(0, 0, 0); // Look at the center of the XY plane
      camera.updateProjectionMatrix();

    } else {
      // Birds-eye view (Orthographic)
      log.debug("Creating OrthographicCamera (Top-Down Z-Up)");
      const aspectRatio = width / height;
      const viewSize = GRID_SIZE; // Adjust as needed
      camera = new THREE.OrthographicCamera(
        -viewSize * aspectRatio / 2, viewSize * aspectRatio / 2,
        viewSize / 2, -viewSize / 2,
        0.1, 1000 // Adjust near/far planes if needed
      );
      // Position directly above the center along the Z axis
      camera.position.set(0, 0, 100); // Adjust Z distance as needed
      camera.up.set(0, 1, 0); // Y axis is 'up' on the screen
      camera.lookAt(0, 0, 0); // Look at the center of the XY plane
      camera.updateProjectionMatrix(); // Ensure projection matrix is updated after setting up
    }
    cameraRef.current = camera;


    // Create controls AFTER camera is created
    log.debug("Creating OrbitControls");
    const controls = new OrbitControls(camera, rendererElement);
    controls.enableRotate = false; // Disable rotation as per PRD
    controls.enablePan = true;
    controls.enableZoom = true;
    controls.enableDamping = true;
    controls.dampingFactor = 0.1; // Smoother damping
    controls.panSpeed = 2.0; // Increased pan speed further
    controls.zoomSpeed = 1.0;
    controls.target.set(0, 0, 0); // Explicitly set target to origin

    if (!isIsometric) {
        // For top-down view, constrain panning if needed (optional)
        controls.target.set(0, 0, 0); // Ensure target is center initially
    }

    controlsRef.current = controls;
    // Ensure controls know the target
    controls.target.set(0, 0, 0);
    controls.update(); // Initial update after setting target

    // No return cleanup needed here for controls/grid as they are handled
    // at the beginning of this useEffect run.

  }, [isIsometric]); // Re-run only when view type changes
  
  // Toggle view function
  const toggleView = useCallback(() => {
    log.info(`Toggling view from ${isIsometric ? 'isometric' : 'birds-eye'} to ${!isIsometric ? 'isometric' : 'birds-eye'}`);
    setIsIsometric(prev => !prev); // Use functional update
  }, [isIsometric]); // Dependency ensures function identity changes with state

  return (
    <div className="relative w-full h-full">
      <div 
        ref={mountRef} 
        className="w-full h-full" 
        style={{ cursor: isPanning ? 'grabbing' : 'grab' }}
      />
      
      <button
        onClick={toggleView}
        className="absolute top-4 right-4 bg-gray-800 text-white p-2 rounded-full shadow-lg hover:bg-gray-700"
        title={isIsometric ? "Switch to Birds-eye View" : "Switch to Isometric View"}
      >
        <Eye size={24} />
      </button>
    </div>
  );
};

export default Canvas; 