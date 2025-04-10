import { useState } from 'react';
import { Menu, Upload, PackageOpen } from 'lucide-react';
import Canvas from './Canvas';
import LeftPanel from './LeftPanel';
import ImportModal from './ImportModal';
import ObjectLibrary from './ObjectLibrary';
import ObjectPlacement from './ObjectPlacement';
import { useDesignStore } from '../store/designStore';

const FactoryDesigner = () => {
  const [leftPanelOpen, setLeftPanelOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [objectLibraryOpen, setObjectLibraryOpen] = useState(false);
  const [placingObjectId, setPlacingObjectId] = useState<string | null>(null);
  
  const activeFloorPlanId = useDesignStore((state) => state.activeFloorPlanId);
  const floorPlans = useDesignStore((state) => state.floorPlans);
  
  // Find the active floor plan
  const activeFloorPlan = floorPlans.find(plan => plan.id === activeFloorPlanId);
  
  // Handle importing an object from the library
  const handleImportObject = (objectId: string) => {
    setPlacingObjectId(objectId);
    setObjectLibraryOpen(false);
  };
  
  // Handle canceling object placement
  const handleCancelPlacement = () => {
    setPlacingObjectId(null);
  };
  
  // Handle completing object placement
  const handleCompletePlacement = (position: { x: number; y: number; z: number }, rotation: number) => {
    if (placingObjectId) {
      const importObject = useDesignStore.getState().importObject;
      importObject(placingObjectId, position, rotation);
      setPlacingObjectId(null);
    }
  };
  
  return (
    <div className="w-full h-screen flex flex-col bg-gray-900 text-white">
      <header className="bg-gray-800 p-4 shadow-md flex justify-between items-center">
        <div className="flex items-center">
          <button
            onClick={() => setLeftPanelOpen(true)}
            className="p-2 mr-4 rounded-full hover:bg-gray-700"
            title="Open Floor Plans"
          >
            <Menu size={20} />
          </button>
          <h1 className="text-xl font-bold">Factory Floor Designer</h1>
        </div>
        
        <div className="flex items-center">
          <span className="mr-4">
            {activeFloorPlan ? activeFloorPlan.name : 'No Floor Plan Selected'}
          </span>
          <button
            onClick={() => setImportModalOpen(true)}
            className="p-2 rounded-full hover:bg-gray-700 mr-2"
            title="Import Floor Plan"
          >
            <Upload size={20} />
          </button>
        </div>
      </header>
      
      <main className="flex-1 relative overflow-hidden">
        <Canvas />
        
        {/* Object placement overlay */}
        {placingObjectId && (
          <ObjectPlacement 
            objectId={placingObjectId}
            onCancel={handleCancelPlacement}
            onComplete={handleCompletePlacement}
          />
        )}
        
        {/* Object library button (bottom right) */}
        <button
          onClick={() => setObjectLibraryOpen(true)}
          className="absolute bottom-4 right-4 p-3 bg-gray-800 text-white rounded-full shadow-lg"
          title="Object Library"
        >
          <PackageOpen size={24} />
        </button>
      </main>
      
      {/* Left panel for floor plan management */}
      <LeftPanel 
        isOpen={leftPanelOpen} 
        onClose={() => setLeftPanelOpen(false)} 
      />
      
      {/* Import modal */}
      <ImportModal 
        isOpen={importModalOpen} 
        onClose={() => setImportModalOpen(false)} 
      />
      
      {/* Object library */}
      <ObjectLibrary
        isOpen={objectLibraryOpen}
        onClose={() => setObjectLibraryOpen(false)}
        onImportObject={handleImportObject}
      />
    </div>
  );
};

export default FactoryDesigner; 