import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { Eye } from 'lucide-react';

// Constants according to PRD
const GRID_SIZE = 5000;
const GRID_DIVISIONS = 20;

const Canvas = () => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [isIsometric, setIsIsometric] = useState(true);
  // References to scene elements for view toggling
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | THREE.OrthographicCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const gridHelperRef = useRef<THREE.GridHelper | null>(null);
  const axisHelperRef = useRef<THREE.AxesHelper | null>(null);
  const labelsRef = useRef<THREE.Sprite[]>([]);

  useEffect(() => {
    if (!mountRef.current) return;

    // Setup scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x111111);
    sceneRef.current = scene;

    // Setup renderer
    const width = mountRef.current.clientWidth;
    const height = mountRef.current.clientHeight;
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    mountRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Add ambient light for better visibility
    const light = new THREE.AmbientLight(0xffffff, 1);
    scene.add(light);

    // Create both cameras
    setupView(isIsometric, width, height);

    // Prevent default scroll behavior
    const preventScroll = (e: WheelEvent) => {
      e.preventDefault();
    };
    mountRef.current.addEventListener('wheel', preventScroll, { passive: false });

    // Animation loop
    const animate = () => {
      requestAnimationFrame(animate);
      if (controlsRef.current) {
        controlsRef.current.update();
      }
      if (rendererRef.current && cameraRef.current && sceneRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
    };
    animate();

    // Handle window resize
    const handleResize = () => {
      if (!mountRef.current || !rendererRef.current || !cameraRef.current) return;
      
      const width = mountRef.current.clientWidth;
      const height = mountRef.current.clientHeight;
      
      rendererRef.current.setSize(width, height);
      
      // Update camera based on type
      if (cameraRef.current instanceof THREE.PerspectiveCamera) {
        cameraRef.current.aspect = width / height;
      } else if (cameraRef.current instanceof THREE.OrthographicCamera) {
        const aspectRatio = width / height;
        const viewSize = GRID_SIZE / 2;
        cameraRef.current.left = -viewSize * aspectRatio;
        cameraRef.current.right = viewSize * aspectRatio;
        cameraRef.current.top = viewSize;
        cameraRef.current.bottom = -viewSize;
      }
      
      cameraRef.current.updateProjectionMatrix();
    };
    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      if (mountRef.current && rendererRef.current?.domElement) {
        mountRef.current.removeEventListener('wheel', preventScroll);
        mountRef.current.removeChild(rendererRef.current.domElement);
      }
      window.removeEventListener('resize', handleResize);
      
      // Clear labels
      if (sceneRef.current && labelsRef.current.length > 0) {
        labelsRef.current.forEach(label => sceneRef.current?.remove(label));
      }
      
      if (rendererRef.current) {
        rendererRef.current.dispose();
      }
    };
  }, []);

  // Function to setup either isometric or birds-eye view
  const setupView = (isIso: boolean, width: number, height: number) => {
    const scene = sceneRef.current;
    if (!scene) return;

    // Clear previous elements
    if (gridHelperRef.current) {
      scene.remove(gridHelperRef.current);
    }
    if (axisHelperRef.current) {
      scene.remove(axisHelperRef.current);
    }
    if (labelsRef.current.length > 0) {
      labelsRef.current.forEach(label => scene.remove(label));
      labelsRef.current = [];
    }

    // Setup camera based on view
    if (isIso) {
      // Isometric view (60-degree angle as per PRD)
      const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 10000);
      // Position for 60-degree isometric view
      camera.position.set(GRID_SIZE/2, GRID_SIZE/2 * 1.155, GRID_SIZE/2); // Using sqrt(3)/3 * GRID_SIZE for height
      camera.lookAt(GRID_SIZE/2, 0, GRID_SIZE/2);
      cameraRef.current = camera;
      
    } else {
      // Birds-eye view (top-down)
      const aspectRatio = width / height;
      const viewSize = GRID_SIZE / 2;
      const camera = new THREE.OrthographicCamera(
        -viewSize * aspectRatio, // Left
        viewSize * aspectRatio,  // Right
        viewSize,                // Top
        -viewSize,               // Bottom
        0.1,                     // Near
        10000                    // Far
      );
      camera.position.set(GRID_SIZE/2, GRID_SIZE, GRID_SIZE/2);
      camera.lookAt(GRID_SIZE/2, 0, GRID_SIZE/2);
      cameraRef.current = camera;
    }

    // Add grid with coordinate labels
    addGridWithLabels(scene);
    
    // Setup controls - pan only, no rotation
    if (rendererRef.current && cameraRef.current) {
      const controls = new OrbitControls(cameraRef.current, rendererRef.current.domElement);
      controls.enableRotate = false; // Disable rotation per PRD
      controls.enablePan = true;
      controls.enableZoom = true;
      controls.enableDamping = true;
      controls.dampingFactor = 0.25;
      controls.screenSpacePanning = true;
      controlsRef.current = controls;
    }
  };

  // Function to add grid with coordinate labels
  const addGridWithLabels = (scene: THREE.Scene) => {
    // Create grid
    const grid = new THREE.GridHelper(GRID_SIZE, GRID_DIVISIONS, 0xaaaaaa, 0x666666);
    grid.position.set(GRID_SIZE/2, 0, GRID_SIZE/2); // Center the grid
    scene.add(grid);
    gridHelperRef.current = grid;

    // Create coordinate labels
    const labels: THREE.Sprite[] = [];
    const step = GRID_SIZE / GRID_DIVISIONS;

    // Helper to create a text sprite
    const createTextSprite = (text: string, position: THREE.Vector3) => {
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      if (!context) return null;
      
      canvas.width = 128;
      canvas.height = 64;
      
      context.fillStyle = 'rgba(0, 0, 0, 0)';
      context.fillRect(0, 0, canvas.width, canvas.height);
      
      context.font = '48px Arial';
      context.fillStyle = 'white';
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      context.fillText(text, canvas.width / 2, canvas.height / 2);
      
      const texture = new THREE.CanvasTexture(canvas);
      const material = new THREE.SpriteMaterial({ map: texture });
      const sprite = new THREE.Sprite(material);
      
      sprite.position.copy(position);
      sprite.scale.set(200, 100, 1);
      
      return sprite;
    };

    // X-axis labels (every grid division)
    for (let i = 0; i <= GRID_DIVISIONS; i++) {
      const x = i * step;
      const labelValue = Math.floor(x);
      const position = new THREE.Vector3(x, 5, -100);
      
      const sprite = createTextSprite(labelValue.toString(), position);
      if (sprite) {
        scene.add(sprite);
        labels.push(sprite);
      }
    }

    // Z-axis labels (every grid division)
    for (let i = 0; i <= GRID_DIVISIONS; i++) {
      const z = i * step;
      const labelValue = Math.floor(z);
      const position = new THREE.Vector3(-100, 5, z);
      
      const sprite = createTextSprite(labelValue.toString(), position);
      if (sprite) {
        scene.add(sprite);
        labels.push(sprite);
      }
    }

    labelsRef.current = labels;
  };

  // Toggle between isometric and birds-eye views
  const toggleView = () => {
    const newIsIsometric = !isIsometric;
    setIsIsometric(newIsIsometric);
    
    if (mountRef.current && rendererRef.current) {
      setupView(
        newIsIsometric,
        mountRef.current.clientWidth,
        mountRef.current.clientHeight
      );
    }
  };

  return (
    <div className="relative w-full h-full">
      <div ref={mountRef} className="w-full h-full" />
      
      {/* View toggle button */}
      <button
        onClick={toggleView}
        className="absolute top-4 right-4 bg-gray-800 text-white p-2 rounded-full shadow-lg"
        title={isIsometric ? "Switch to Birds-eye View" : "Switch to Isometric View"}
      >
        <Eye size={24} />
      </button>
    </div>
  );
};

export default Canvas; 