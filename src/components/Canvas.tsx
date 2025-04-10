import { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
// import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'; // Remove OrbitControls
import { Eye, Home } from 'lucide-react';

// Constants - made smaller for better visibility
const GRID_SIZE = 100;
const GRID_DIVISIONS = 20;
const MIN_ZOOM = 0.5; // Example minimum zoom
const MAX_ZOOM = 10; // Example maximum zoom
const PAN_SPEED_FACTOR = 0.05; // Adjust sensitivity
const ZOOM_SENSITIVITY = 0.001; // Adjust sensitivity
// Isometric view constants
const ISO_ANGLE = Math.PI / 4; // 45 degrees for isometric angle
const ISO_DISTANCE_FACTOR = 1.2; // Distance factor for isometric view

const Canvas = () => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [isIsometric, setIsIsometric] = useState(true);

  // References to three.js objects
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.OrthographicCamera | null>(null); // Changed to Orthographic explicitly
  // const controlsRef = useRef<OrbitControls | null>(null); // Remove controlsRef
  const gridRef = useRef<THREE.GridHelper | null>(null);
  const animationFrameId = useRef<number | null>(null); // Ref to store animation frame ID

  // State for manual controls
  const isDraggingRef = useRef(false);
  const lastMousePositionRef = useRef({ x: 0, y: 0 });

  // Store view-specific camera states to preserve position when switching views
  const isometricViewStateRef = useRef({
    position: new THREE.Vector3(GRID_SIZE / 2, GRID_SIZE / 2, GRID_SIZE),
    zoom: 1
  });
  
  const birdsEyeViewStateRef = useRef({
    position: new THREE.Vector3(GRID_SIZE / 2, GRID_SIZE / 2, GRID_SIZE),
    zoom: 1
  });
  
  // Current camera offset - will be synced with the appropriate view state
  const cameraOffsetRef = useRef(new THREE.Vector3(GRID_SIZE / 2, GRID_SIZE / 2, GRID_SIZE));
  const zoomLevelRef = useRef(1); // Initial zoom level for Orthographic camera

  // State refs for manual controls (updated by events, applied in animation loop)
  const panDeltaRef = useRef({ x: 0, y: 0 }); // Accumulated screen pan delta since last frame
  const zoomDeltaRef = useRef(0); // Accumulated wheel delta since last frame
  const mousePosForZoomRef = useRef({ x: 0, y: 0 }); // Screen position where zoom occurred

  // Helper function to calculate isometric camera position based on a target XY position
  const calculateIsometricPosition = useCallback((targetX: number, targetY: number, zoom: number) => {
    // For isometric view, we position the camera at an angle to the target
    const distanceFromCenter = GRID_SIZE * ISO_DISTANCE_FACTOR / zoom;
    
    // Calculate position offsets for proper isometric angle
    const horizontalDist = distanceFromCenter * Math.cos(ISO_ANGLE) * 1.5;
    const verticalDist = distanceFromCenter * Math.sin(ISO_ANGLE) * 1.5;
    
    // Return position that creates proper isometric view angle
    return new THREE.Vector3(
      targetX - horizontalDist, // Move back to look forward at target
      targetY - horizontalDist, // Move back to look forward at target
      verticalDist              // Height for proper angle
    );
  }, []);

  // Helper function to set camera orientation
  const setCameraOrientation = useCallback((camera: THREE.OrthographicCamera, isometricView: boolean) => {
    console.log(`[DEBUG] Setting camera orientation for ${isometricView ? 'isometric' : 'birds-eye'} view`);
    
    if (isometricView) {
        // For isometric view, we want to maintain the 45-degree angle
        camera.up.set(0, 0, 1); // Z-up
        
        // Calculate the appropriate distance based on zoom
        const distanceFromCenter = GRID_SIZE * ISO_DISTANCE_FACTOR / camera.zoom;
        const horizontalDist = distanceFromCenter * Math.cos(ISO_ANGLE) * 1.5;
        
        // Create a target point below the camera's XY position
        const targetPoint = new THREE.Vector3(
            camera.position.x + horizontalDist, // Look forward in X
            camera.position.y + horizontalDist, // Look forward in Y
            0                                   // Look down to the grid (Z=0)
        );
        
        camera.lookAt(targetPoint);
    } else { // Top-Down
        camera.up.set(0, 1, 0); // Y-up (screen)
        const targetPoint = new THREE.Vector3(camera.position.x, camera.position.y, 0);
        camera.lookAt(targetPoint);
    }
    
    camera.updateMatrixWorld(true); // Update matrix immediately after orientation change
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

    // Adjust based on camera position and target (offset)
    // For orthographic, this needs careful adjustment based on view plane
    // This simple unproject might not be sufficient for panning world origin directly
    // Let's refine panning logic within the event handler first.

    // Temporary simplified conversion for panning delta (needs refinement)
    const worldVec = new THREE.Vector3(x, y, 0);
    // This needs to be scaled by the camera's view size / zoom
    const currentZoom = cameraRef.current.zoom;
    const viewHeight = (cameraRef.current.top - cameraRef.current.bottom) / currentZoom;
    const viewWidth = (cameraRef.current.right - cameraRef.current.left) / currentZoom;
    
    // THIS IS LIKELY INCORRECT - Needs rethinking for Orthographic panning delta
    // Panning should move the *camera*, not calculate a world point directly this way.
    // The delta calculation in onMouseMove will handle this better.
    // Let's remove this complex part for now and focus on screen delta.
    // return worldVec;
    return new THREE.Vector3(screenX, screenY, 0); // Return screen coords for now, delta calc is key

  }, []);


  // Create scene, renderer, lights, and setup animation loop only once on component mount
  useEffect(() => {
    console.log("[INFO] Initializing scene and renderer");
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

    // --- Event Listeners for Manual Controls ---
    const handleMouseDown = (event: MouseEvent) => {
      isDraggingRef.current = true;
      lastMousePositionRef.current = { x: event.clientX, y: event.clientY };
      panDeltaRef.current = { x: 0, y: 0 }; // Reset pan delta on new drag start
      mount.style.cursor = 'grabbing'; // Change cursor
    };

    const handleMouseMove = (event: MouseEvent) => {
      if (!isDraggingRef.current || !cameraRef.current) return;

      const currentMousePosition = { x: event.clientX, y: event.clientY };
      // Accumulate delta since last mouse move event
      panDeltaRef.current.x += currentMousePosition.x - lastMousePositionRef.current.x;
      panDeltaRef.current.y += currentMousePosition.y - lastMousePositionRef.current.y;
      lastMousePositionRef.current = currentMousePosition;

      // Calculate pan delta based on camera's current view size and zoom
      // Orthographic camera panning moves the camera position relative to its viewing plane
      const camera = cameraRef.current;
      const element = rendererRef.current?.domElement;
      if (!element) return;

      // Convert screen pixel delta to world units based on camera's view size
      // Factors derived from how OrthographicCamera frustum relates to screen pixels
      const viewportHeight = element.clientHeight;
      const viewportWidth = element.clientWidth;
      const worldUnitsPerPixelY = (camera.top - camera.bottom) / viewportHeight / camera.zoom;
      const worldUnitsPerPixelX = (camera.right - camera.left) / viewportWidth / camera.zoom;

      // Get camera's right and up vectors (local axes)
      const cameraRight = new THREE.Vector3();
      const cameraUp = new THREE.Vector3();
      camera.getWorldDirection(new THREE.Vector3()); // Ensure matrixWorld is updated
      cameraRight.setFromMatrixColumn(camera.matrixWorld, 0); // X column
      cameraUp.setFromMatrixColumn(camera.matrixWorld, 1); // Y column

      // Calculate movement vector in world space based on camera orientation
      const moveX = cameraRight.multiplyScalar(-panDeltaRef.current.x * worldUnitsPerPixelX);
      const moveY = cameraUp.multiplyScalar(panDeltaRef.current.y * worldUnitsPerPixelY);
      const moveVector = moveX.add(moveY);

      // Apply the movement to the camera's position AND the offset ref
      cameraOffsetRef.current.add(moveVector);
      camera.position.add(moveVector); // Directly move the camera
      camera.updateMatrixWorld(); // Important after manual position change
      camera.updateProjectionMatrix(); // Update projection if needed (though position change doesn't require it)

       // Log camera position for debugging pan
       console.log(`[DEBUG] Panning: Delta(${panDeltaRef.current.x}, ${panDeltaRef.current.y}), New Offset: ${cameraOffsetRef.current.x.toFixed(2)}, ${cameraOffsetRef.current.y.toFixed(2)}, ${cameraOffsetRef.current.z.toFixed(2)}, Cam Pos: ${camera.position.x.toFixed(2)}, ${camera.position.y.toFixed(2)}, ${camera.position.z.toFixed(2)}`);
       
       // Update the appropriate view state ref when panning
       if (isIsometric) {
         isometricViewStateRef.current.position.copy(camera.position);
       } else {
         birdsEyeViewStateRef.current.position.copy(camera.position);
       }
    };

    const handleMouseUpOrLeave = () => { // Combined handler
      if (isDraggingRef.current) {
        isDraggingRef.current = false;
        mount.style.cursor = 'grab'; // Restore cursor
        console.log("[DEBUG] Drag End");
      }
    };

    const handleWheel = (event: WheelEvent) => {
        if (!cameraRef.current) return;
        event.preventDefault(); // Prevent default scroll behavior
        zoomDeltaRef.current += event.deltaY; // Accumulate wheel delta
        // Store mouse position at the time of the wheel event for targeted zoom
        mousePosForZoomRef.current = { x: event.clientX, y: event.clientY };
    };

    // Attach event listeners
    mount.addEventListener('mousedown', handleMouseDown);
    mount.addEventListener('mousemove', handleMouseMove);
    mount.addEventListener('mouseup', handleMouseUpOrLeave);
    mount.addEventListener('mouseleave', handleMouseUpOrLeave); // Stop dragging if mouse leaves canvas
    mount.addEventListener('wheel', handleWheel, { passive: false }); // Need passive: false to preventDefault

    // Set initial cursor
    mount.style.cursor = 'grab';

    // Handle window resize
    const handleResize = () => {
      if (!mount || !rendererRef.current || !cameraRef.current) return;
      const currentWidth = mount.clientWidth;
      const currentHeight = mount.clientHeight;
      rendererRef.current.setSize(currentWidth, currentHeight);
      
      if (cameraRef.current instanceof THREE.OrthographicCamera) {
        const aspectRatio = currentWidth / currentHeight;
        // Adjust frustum based on aspect ratio AND current zoom
        const currentZoom = cameraRef.current.zoom;
        const baseViewSize = GRID_SIZE / 2; // Base size, adjust as needed
        const viewHeight = baseViewSize / currentZoom;
        const viewWidth = viewHeight * aspectRatio;

        cameraRef.current.left = -viewWidth;
        cameraRef.current.right = viewWidth;
        cameraRef.current.top = viewHeight;
        cameraRef.current.bottom = -viewHeight;
        cameraRef.current.updateProjectionMatrix();
      }
    };
    window.addEventListener('resize', handleResize);

    // --- Animation Loop ---
    const animate = () => {
      animationFrameId.current = requestAnimationFrame(animate);

      const camera = cameraRef.current;
      const renderer = rendererRef.current;
      const scene = sceneRef.current;
      const mount = mountRef.current;

      if (!camera || !renderer || !scene || !mount) return;

      let positionChanged = false;
      let zoomChanged = false;

      // --- Apply Accumulated Pan Delta ---
      if (panDeltaRef.current.x !== 0 || panDeltaRef.current.y !== 0) {
        const deltaX = panDeltaRef.current.x;
        const deltaY = panDeltaRef.current.y;

        // Calculate world delta on the XY plane using raycasting difference
        const getIntersectionWithXYPlane = (screenX: number, screenY: number): THREE.Vector3 | null => {
            const rect = mount.getBoundingClientRect();
            const mouseNDC = new THREE.Vector2(
                ((screenX - rect.left) / rect.width) * 2 - 1,
                -((screenY - rect.top) / rect.height) * 2 + 1
            );
            const raycaster = new THREE.Raycaster();
            // Ensure camera matrices are up-to-date for raycasting
            camera.updateMatrixWorld(); 
            raycaster.setFromCamera(mouseNDC, camera);
            const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0); // XY plane at z=0
            const intersection = new THREE.Vector3();
            if (raycaster.ray.intersectPlane(plane, intersection)) {
                return intersection;
            }
            return null;
        };

        const prevScreenX = lastMousePositionRef.current.x - deltaX;
        const prevScreenY = lastMousePositionRef.current.y - deltaY;
        const startWorldPoint = getIntersectionWithXYPlane(prevScreenX, prevScreenY);
        const endWorldPoint = getIntersectionWithXYPlane(lastMousePositionRef.current.x, lastMousePositionRef.current.y);

        if (startWorldPoint && endWorldPoint) {
          const worldDelta = startWorldPoint.sub(endWorldPoint);
          camera.position.add(worldDelta);
          positionChanged = true;
          // console.log(`[DEBUG] Applied Pan: WorldDelta(${worldDelta.x.toFixed(2)}, ${worldDelta.y.toFixed(2)})`);
          
          // Update the appropriate view state ref when panning
          if (isIsometric) {
            isometricViewStateRef.current.position.copy(camera.position);
          } else {
            birdsEyeViewStateRef.current.position.copy(camera.position);
          }
        } else {
          // console.warn("[WARN] Panning failed - raycaster did not intersect XY plane.");
        }

        panDeltaRef.current = { x: 0, y: 0 }; // Reset delta
      }

      // --- Apply Accumulated Zoom Delta ---
      if (zoomDeltaRef.current !== 0) {
        const deltaY = zoomDeltaRef.current;
        const zoomFactor = Math.pow(0.95, deltaY * ZOOM_SENSITIVITY * 5);

        const currentZoom = camera.zoom;
        const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, currentZoom * zoomFactor));

        if (newZoom !== currentZoom) {
          const rect = mount.getBoundingClientRect();
          const mouseX = ((mousePosForZoomRef.current.x - rect.left) / rect.width) * 2 - 1;
          const mouseY = -((mousePosForZoomRef.current.y - rect.top) / rect.height) * 2 + 1;

          const pointer = new THREE.Vector2(mouseX, mouseY);
          const raycaster = new THREE.Raycaster();
          // Ensure camera matrices are up-to-date for raycasting
          camera.updateMatrixWorld();
          raycaster.setFromCamera(pointer, camera);

          const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
          const intersectionPoint = new THREE.Vector3();
          const didIntersect = raycaster.ray.intersectPlane(plane, intersectionPoint);

          if (didIntersect) {
            const worldPointBeforeZoom = intersectionPoint.clone();
            const camToPoint = worldPointBeforeZoom.clone().sub(camera.position);
            const scaleFactor = currentZoom / newZoom;
            const newCamToPoint = camToPoint.multiplyScalar(scaleFactor);
            const newCamPos = worldPointBeforeZoom.sub(newCamToPoint);

            camera.position.copy(newCamPos);
            positionChanged = true;
          } else {
             // console.warn("[WARN] Zoom raycaster miss, zooming from center.");
          }

          camera.zoom = newZoom;
          zoomChanged = true;
          handleResize(); // Update frustum bounds based on new zoom

          // Store the zoom level in the appropriate view state
          if (isIsometric) {
            isometricViewStateRef.current.zoom = newZoom;
            isometricViewStateRef.current.position.copy(camera.position);
          } else {
            birdsEyeViewStateRef.current.zoom = newZoom;
            birdsEyeViewStateRef.current.position.copy(camera.position);
          }
          
          zoomLevelRef.current = newZoom;
          // console.log(`[DEBUG] Applied Zoom: Level=${newZoom.toFixed(2)}`);
        }

        zoomDeltaRef.current = 0; // Reset delta
      }

      // --- Update Camera Matrices (Only if needed) ---
      if (zoomChanged) {
         camera.updateProjectionMatrix();
      }
      // If position changed, the view matrix is dirty. updateMatrixWorld() updates it.
      // It will be called implicitly by render, but we might need it sooner if other logic depends on it.
      // For now, let render handle it.
      // if (positionChanged) {
      //    camera.updateMatrixWorld(true);
      // }

      // --- Render ---
      // Render every frame if interaction might be happening, or simplify logic
      // Let's render unconditionally for now to ensure updates are shown
      renderer.render(scene, camera);
      // console.log("[DEBUG] Frame Rendered");
    };

    animate(); // Start the loop

    // Cleanup on unmount
    return () => {
      console.log("[INFO] Cleaning up scene and renderer");
      window.removeEventListener('resize', handleResize);
      // Remove manual control listeners
      mount.removeEventListener('mousedown', handleMouseDown);
      mount.removeEventListener('mousemove', handleMouseMove);
      mount.removeEventListener('mouseup', handleMouseUpOrLeave);
      mount.removeEventListener('mouseleave', handleMouseUpOrLeave);
      mount.removeEventListener('wheel', handleWheel);

      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current); // Stop the animation loop
      }
      if (rendererRef.current) {
        rendererRef.current.dispose();
      }
      if (mount && rendererRef.current?.domElement) {
        try {
           mount.removeChild(rendererRef.current.domElement);
        } catch (error) {
           console.log("[WARN] Error removing renderer DOM element during cleanup:", error);
        }
      }
    };
  }, []); // Empty dependency array, runs only once on mount

  // Helper to calculate the visual distance for isometric view
  const calculateIsometricVisualDistance = useCallback((zoom: number) => {
    // Calculate base distance and adjust by zoom
    const distanceFromCenter = GRID_SIZE * ISO_DISTANCE_FACTOR / zoom;
    
    // Calculate horizontal and vertical offsets for the proper angle
    const horizontalDist = distanceFromCenter * Math.cos(ISO_ANGLE) * 1.5;
    
    return horizontalDist;
  }, []);

  // Handle camera and grid changes based on view type - REMOVE OrbitControls setup
  useEffect(() => {
    // Remove OrbitControls event handlers
    // const handleControlStart = () => console.log("[DEBUG] OrbitControls: start event");
    // const handleControlEnd = () => console.log("[DEBUG] OrbitControls: end event");

    // Simplify this effect - it now only needs to manage the grid based on view type
    if (!sceneRef.current || !mountRef.current || !rendererRef.current || !cameraRef.current) {
       console.log("[WARN] Skipping grid setup: Refs not ready");
       return;
    }
    console.log(`[INFO] Setting up grid for ${isIsometric ? 'isometric' : 'birds-eye'} view`);

    // --- Cleanup previous grid ---
    if (gridRef.current) {
      console.log("[DEBUG] Removing previous grid");
      sceneRef.current.remove(gridRef.current);
      gridRef.current = null;
    }

    // --- Setup new grid ---
    const scene = sceneRef.current;
    console.log("[DEBUG] Creating new grid");
    const grid = new THREE.GridHelper(GRID_SIZE, GRID_DIVISIONS, 0xffffff, 0xaaaaaa);
    grid.rotation.x = Math.PI / 2; // Rotate grid to be on the XY plane (Z=0)
    scene.add(grid);
    gridRef.current = grid;

    // Remove ALL OrbitControls creation logic
    // console.log("[DEBUG] Creating OrbitControls");
    // ... (removed controls setup) ...
    // controlsRef.current = controls;
    // controls.update();

    // No cleanup needed for controls listeners here anymore
    // return () => {
    //    console.log("[DEBUG] Cleaning up controls listeners");
    // };

  }, [isIsometric, cameraRef.current]); // Depend on cameraRef existence

  // Separate useEffect for camera creation/update based on isIsometric
  useEffect(() => {
    if (!mountRef.current || !rendererRef.current) { // Don't need cameraRef here, we might be creating it
        console.log("[WARN] Skipping camera setup: Mount or Renderer not ready");
        return;
    }
    console.log(`[DEBUG] Updating camera for ${isIsometric ? 'isometric' : 'birds-eye'} view`);

    const width = mountRef.current.clientWidth;
    const height = mountRef.current.clientHeight;
    const aspect = width / height;
    
    // Get the appropriate view state based on the current view mode
    const currentViewState = isIsometric ? isometricViewStateRef.current : birdsEyeViewStateRef.current;
    
    // Use the stored zoom level from the current view state
    const currentZoom = currentViewState.zoom;
    zoomLevelRef.current = currentZoom;
    
    const baseViewSize = GRID_SIZE / 2 ; // Base frustum size (adjust if needed)
    const viewHeight = baseViewSize / currentZoom;
    const viewWidth = viewHeight * aspect;

    let camera = cameraRef.current; // Get existing camera

    // Create camera only if it doesn't exist yet
    if (!camera) {
        console.log("[DEBUG] Creating initial OrthographicCamera");
        camera = new THREE.OrthographicCamera(-viewWidth, viewWidth, viewHeight, -viewHeight, 0.1, 2000); // Increased far plane
        cameraRef.current = camera; // Assign to ref
        
        // For initial camera setup, always use the default proper positions
        if (isIsometric) {
            // Set initial isometric position with the proper angle
            const gridCenter = new THREE.Vector3(GRID_SIZE / 2, GRID_SIZE / 2, 0);
            const distanceFromCenter = GRID_SIZE * ISO_DISTANCE_FACTOR;
            const horizontalDist = distanceFromCenter * Math.cos(ISO_ANGLE) * 1.5;
            const verticalDist = distanceFromCenter * Math.sin(ISO_ANGLE) * 1.5;
            
            camera.position.set(
                gridCenter.x - horizontalDist,
                gridCenter.y - horizontalDist,
                verticalDist
            );
            
            // Save this initial position
            isometricViewStateRef.current.position.copy(camera.position);
        } else {
            // Set initial birds-eye position
            const topDownHeight = GRID_SIZE * 1.2;
            camera.position.set(GRID_SIZE / 2, GRID_SIZE / 2, topDownHeight);
            
            // Save this initial position
            birdsEyeViewStateRef.current.position.copy(camera.position);
        }
    } else {
        console.log("[DEBUG] Updating existing OrthographicCamera frustum");
        // Update frustum bounds on existing camera
        camera.left = -viewWidth;
        camera.right = viewWidth;
        camera.top = viewHeight;
        camera.bottom = -viewHeight;
        
        // Use stored position from the appropriate view state
        camera.position.copy(currentViewState.position);
    }

    // Apply the stored zoom level for this view
    camera.zoom = currentZoom;
    
    // Update the camera offset ref to match the current view position
    cameraOffsetRef.current.copy(camera.position);

    // Set camera orientation based on view type
    if (isIsometric) {
        console.log("[DEBUG] Configuring Isometric view orientation (Z-Up)");
        camera.up.set(0, 0, 1); // Z axis is 'up' for isometric looking at XY plane
        
        // Calculate horizontal distance for target based on current zoom
        const horizontalDist = calculateIsometricVisualDistance(currentZoom);
        
        // Create a target point that's in front of the camera horizontally for isometric angle
        const targetPoint = new THREE.Vector3(
            camera.position.x + horizontalDist, // Look forward in X
            camera.position.y + horizontalDist, // Look forward in Y
            0                                   // Look down to the grid (Z=0)
        );
        
        camera.lookAt(targetPoint); // Look towards the target at isometric angle
    } else {
        console.log("[DEBUG] Configuring Top-Down view orientation (Y-Up Screen)");
        camera.up.set(0, 1, 0); // Y axis is 'up' on the screen for top-down
        
        // Target directly below camera for birds-eye view
        const targetPoint = new THREE.Vector3(camera.position.x, camera.position.y, 0);
        camera.lookAt(targetPoint); // Look straight down at the target XY point
    }

    camera.updateProjectionMatrix(); // Apply zoom and frustum changes
    camera.updateMatrixWorld(true); // Update world matrix after position/target changes

    console.log(`[DEBUG] Camera Updated: Pos=(${camera.position.x.toFixed(1)}, ${camera.position.y.toFixed(1)}, ${camera.position.z.toFixed(1)}), Zoom=${camera.zoom.toFixed(2)}`);

  }, [isIsometric, calculateIsometricVisualDistance]); // Re-run when view type changes

  // Effect to Adjust Camera Orientation on View Toggle or Position Change
  // Separated from the main animation loop
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

    console.log(`[DEBUG] Camera Orientation Updated: View=${isIsometric?'Iso':'Top'}, Pos=(${camera.position.x.toFixed(1)}, ${camera.position.y.toFixed(1)}, ${camera.position.z.toFixed(1)}), Up=(${camera.up.x},${camera.up.y},${camera.up.z})`);

  // Rerun this effect only when the view type changes.
  // Position changes are handled in the animation loop, and lookAt uses the updated position.  
  }, [isIsometric, calculateIsometricVisualDistance]); 

  // Toggle view function - now preserves state when switching
  const toggleView = useCallback(() => {
    console.log(`[INFO] Toggling view from ${isIsometric ? 'isometric' : 'birds-eye'} to ${!isIsometric ? 'isometric' : 'birds-eye'}`);
    
    // Save current view state before switching
    if (cameraRef.current) {
      if (isIsometric) {
        // We're currently in isometric view, save its state before switching to birds-eye
        isometricViewStateRef.current.position.copy(cameraRef.current.position);
        isometricViewStateRef.current.zoom = cameraRef.current.zoom;
        console.log(`[DEBUG] Saved isometric view state: pos(${isometricViewStateRef.current.position.x.toFixed(2)}, ${isometricViewStateRef.current.position.y.toFixed(2)}, ${isometricViewStateRef.current.position.z.toFixed(2)}), zoom: ${isometricViewStateRef.current.zoom.toFixed(2)}`);
      } else {
        // We're currently in birds-eye view, save its state before switching to isometric
        birdsEyeViewStateRef.current.position.copy(cameraRef.current.position);
        birdsEyeViewStateRef.current.zoom = cameraRef.current.zoom;
        console.log(`[DEBUG] Saved birds-eye view state: pos(${birdsEyeViewStateRef.current.position.x.toFixed(2)}, ${birdsEyeViewStateRef.current.position.y.toFixed(2)}, ${birdsEyeViewStateRef.current.position.z.toFixed(2)}), zoom: ${birdsEyeViewStateRef.current.zoom.toFixed(2)}`);
      }
    }
    
    setIsIsometric(prev => !prev); // Toggle the view
  }, [isIsometric]); // Dependencies ensure function identity changes with state

  // Recenter view function - resets both view states
  const handleRecenter = useCallback(() => {
    if (!cameraRef.current || !rendererRef.current) return;
    console.log("[INFO] Recentering camera");

    const camera = cameraRef.current;
    let defaultPosition;
    
    // Calculate grid center - this should be the target for both views
    const gridCenter = new THREE.Vector3(GRID_SIZE / 2, GRID_SIZE / 2, 0);
    
    if (isIsometric) {
      // For isometric view, we want to position the camera to look at the grid center
      // with a 30-degree angle, but from a position that shows the whole grid
      const distanceFromCenter = GRID_SIZE * ISO_DISTANCE_FACTOR; // Use consistent distance factor
      
      // Calculate camera offsets to position it properly relative to grid center
      const horizontalDist = distanceFromCenter * Math.cos(ISO_ANGLE) * 1.5;
      const verticalDist = distanceFromCenter * Math.sin(ISO_ANGLE) * 1.5;
      
      // Position camera to look at the grid center from the proper angle
      defaultPosition = new THREE.Vector3(
        gridCenter.x - horizontalDist, // Move back to look forward at grid center
        gridCenter.y - horizontalDist, // Move back to look forward at grid center
        verticalDist                   // Height for proper angle
      );
    } else {
      // For birds-eye view, position camera directly above the grid center
      // at a height that ensures the entire grid is visible
      const topDownHeight = GRID_SIZE * 1.2; // Slightly higher than grid size to see it all
      defaultPosition = new THREE.Vector3(gridCenter.x, gridCenter.y, topDownHeight);
    }
    
    const defaultZoom = 1;

    // Set camera position and zoom
    camera.position.copy(defaultPosition);
    camera.zoom = defaultZoom;
    
    // Update camera offset reference to match new position
    cameraOffsetRef.current.copy(defaultPosition);
    zoomLevelRef.current = defaultZoom;
    
    // Update the appropriate view state
    if (isIsometric) {
      isometricViewStateRef.current.position.copy(defaultPosition);
      isometricViewStateRef.current.zoom = defaultZoom;
    } else {
      birdsEyeViewStateRef.current.position.copy(defaultPosition);
      birdsEyeViewStateRef.current.zoom = defaultZoom;
    }

    // Apply the correct orientation based on view mode
    if (isIsometric) {
      // Look at the grid center from the isometric position
      camera.up.set(0, 0, 1); // Z-up
      
      // Calculate horizontal distance for lookAt target
      const horizontalDist = calculateIsometricVisualDistance(defaultZoom);
      const targetPoint = new THREE.Vector3(
        camera.position.x + horizontalDist,
        camera.position.y + horizontalDist,
        0
      );
      
      camera.lookAt(targetPoint);
    } else {
      // Look straight down at grid center
      camera.up.set(0, 1, 0); // Y-up
      camera.lookAt(gridCenter);
    }

    // Update projection matrix for zoom change and frustum
    camera.updateProjectionMatrix();
    
    // Update frustum bounds based on new zoom
    const mount = mountRef.current;
    if(mount) {
        const aspect = mount.clientWidth / mount.clientHeight;
        const baseViewSize = GRID_SIZE / 2;
        const viewHeight = baseViewSize / defaultZoom;
        const viewWidth = viewHeight * aspect;
        camera.left = -viewWidth;
        camera.right = viewWidth;
        camera.top = viewHeight;
        camera.bottom = -viewHeight;
        camera.updateProjectionMatrix();
    }

    console.log("[INFO] Camera recentered to view entire grid.");

  }, [isIsometric, calculateIsometricVisualDistance]); // Dependencies include the helper function

  return (
    <div className="relative w-full h-full">
      <div 
        ref={mountRef} 
        className="w-full h-full" 
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