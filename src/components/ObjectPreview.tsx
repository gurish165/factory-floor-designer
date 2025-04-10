import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { FactoryObject } from '../store/designStore';

interface ObjectPreviewProps {
  object: FactoryObject;
}

const ObjectPreview = ({ object }: ObjectPreviewProps) => {
  const mountRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (!mountRef.current) return;
    
    // Setup scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x222222);
    
    // Setup camera
    const width = mountRef.current.clientWidth;
    const height = mountRef.current.clientHeight;
    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 1000);
    
    // Position camera based on object size for best view
    const maxDim = Math.max(object.dimensions.x, object.dimensions.y, object.dimensions.z);
    const distance = maxDim * 1.5;
    camera.position.set(distance, distance, distance);
    camera.lookAt(0, 0, 0);
    
    // Setup renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    mountRef.current.appendChild(renderer.domElement);
    
    // Add lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.6);
    directionalLight.position.set(5, 10, 7.5);
    scene.add(directionalLight);
    
    // Create object model as per PRD
    const { x, y, z } = object.dimensions;
    
    // Base with 0.5 units thickness
    const baseGeometry = new THREE.BoxGeometry(x, 0.5, y);
    const baseMaterial = new THREE.MeshStandardMaterial({ 
      color: object.color,
      roughness: 0.7
    });
    const base = new THREE.Mesh(baseGeometry, baseMaterial);
    base.position.y = 0.25; // Half of base height
    scene.add(base);
    
    // Top block 0.2 units smaller on each side
    const topWidth = Math.max(x - 0.2, 0.1);
    const topDepth = Math.max(y - 0.2, 0.1);
    const topHeight = Math.max(z - 0.5, 0.1); // Remaining height
    
    const topGeometry = new THREE.BoxGeometry(topWidth, topHeight, topDepth);
    const topMaterial = new THREE.MeshStandardMaterial({ 
      color: object.color,
      roughness: 0.5
    });
    const top = new THREE.Mesh(topGeometry, topMaterial);
    top.position.y = 0.5 + topHeight / 2; // Base + half of top height
    scene.add(top);
    
    // Center object at origin
    const group = new THREE.Group();
    group.add(base);
    group.add(top);
    scene.add(group);
    
    // Reposition to center
    group.position.set(0, 0, 0);
    
    // Add controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableZoom = false; // Disable zoom in preview
    controls.autoRotate = true; // Auto-rotate for nice effect
    controls.autoRotateSpeed = 3; // Rotation speed
    
    // Render loop
    const animate = () => {
      requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();
    
    // Handle resize
    const handleResize = () => {
      if (!mountRef.current) return;
      const width = mountRef.current.clientWidth;
      const height = mountRef.current.clientHeight;
      
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };
    window.addEventListener('resize', handleResize);
    
    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      mountRef.current?.removeChild(renderer.domElement);
      renderer.dispose();
    };
  }, [object]); // Re-initialize when object changes
  
  return <div ref={mountRef} className="w-full h-full" />;
};

export default ObjectPreview; 