import { useState, useEffect } from 'react';
import { RotateCw, Check, X } from 'lucide-react';
import { useDesignStore } from '../store/designStore';

interface ObjectPlacementProps {
  objectId: string;
  onCancel: () => void;
  onComplete: (position: { x: number; y: number; z: number }, rotation: number) => void;
}

const ObjectPlacement = ({ objectId, onCancel, onComplete }: ObjectPlacementProps) => {
  const [position, setPosition] = useState({ x: 0, y: 0, z: 0 });
  const [rotation, setRotation] = useState(0);
  const [isValidPlacement, setIsValidPlacement] = useState(true);
  
  const objectLibrary = useDesignStore((state) => state.objectLibrary);
  const activeFloorPlan = useDesignStore((state) => {
    const activeId = state.activeFloorPlanId;
    return activeId ? state.floorPlans.find(plan => plan.id === activeId) : null;
  });
  
  // Find the object from library
  const object = objectLibrary.find(obj => obj.id === objectId);
  
  // Listen for mouse/touch movements to position the object
  useEffect(() => {
    if (!object) return;
    
    // Initialize at grid center
    setPosition({ x: Math.floor(2500), y: 0, z: Math.floor(2500) });
    
    const handleMouseMove = (e: MouseEvent) => {
      // In a real implementation, this would convert screen coordinates to grid coordinates
      // For now we'll just use a simplified approach
      const gridX = Math.floor(e.clientX / 20) * 20; // Snap to grid
      const gridZ = Math.floor(e.clientY / 20) * 20; // Snap to grid
      
      setPosition({ x: gridX, y: 0, z: gridZ });
      
      // Check for collisions with existing objects
      // This is a simplified check - real implementation would be more complex
      const hasCollision = checkCollision(gridX, 0, gridZ, object, rotation);
      setIsValidPlacement(!hasCollision);
    };
    
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [object, rotation]);
  
  // Function to check if placement is valid (no collisions)
  const checkCollision = (x: number, y: number, z: number, object: any, rotation: number) => {
    if (!activeFloorPlan || !object) return false;
    
    // This is a placeholder - real implementation would do actual collision detection
    // based on object dimensions and rotation
    return false; // For now, always allow placement
  };
  
  // Rotate the object 90 degrees
  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };
  
  // Complete placement
  const handleComplete = () => {
    if (isValidPlacement && object) {
      onComplete(position, rotation);
    }
  };
  
  if (!object) return null;
  
  return (
    <div className="absolute inset-0 pointer-events-none">
      {/* Overlay showing object position */}
      <div 
        className={`absolute transition-colors duration-200 ${
          isValidPlacement ? 'bg-green-500 bg-opacity-30' : 'bg-red-500 bg-opacity-30'
        }`}
        style={{
          width: `${object.dimensions.x * 20}px`,
          height: `${object.dimensions.y * 20}px`,
          left: `${position.x}px`,
          top: `${position.z}px`,
          transform: `rotate(${rotation}deg)`,
          transformOrigin: 'center',
        }}
      >
        {/* Object visualization here */}
      </div>
      
      {/* Controls - these should have pointer-events-auto to be clickable */}
      <div 
        className="fixed bottom-4 left-1/2 transform -translate-x-1/2 flex items-center space-x-4 pointer-events-auto"
      >
        <button
          onClick={handleRotate}
          className="p-3 bg-gray-800 text-white rounded-full shadow-lg"
          title="Rotate Object"
        >
          <RotateCw size={24} />
        </button>
        
        <button
          onClick={onCancel}
          className="p-3 bg-red-600 text-white rounded-full shadow-lg"
          title="Cancel Placement"
        >
          <X size={24} />
        </button>
        
        <button
          onClick={handleComplete}
          className={`p-3 text-white rounded-full shadow-lg ${
            isValidPlacement ? 'bg-green-600' : 'bg-gray-600 cursor-not-allowed'
          }`}
          disabled={!isValidPlacement}
          title="Confirm Placement"
        >
          <Check size={24} />
        </button>
      </div>
    </div>
  );
};

export default ObjectPlacement; 