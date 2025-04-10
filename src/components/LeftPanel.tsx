import { useState } from 'react';
import { PlusIcon, PencilIcon, DownloadIcon, X } from 'lucide-react';
import { useDesignStore, FloorPlan } from '../store/designStore';

interface LeftPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const LeftPanel = ({ isOpen, onClose }: LeftPanelProps) => {
  const [isCreatingFloorPlan, setIsCreatingFloorPlan] = useState(false);
  const [newFloorPlanName, setNewFloorPlanName] = useState('');
  const [isEditingName, setIsEditingName] = useState<string | null>(null);
  const [editedName, setEditedName] = useState('');
  
  const floorPlans = useDesignStore((state) => state.floorPlans);
  const activeFloorPlanId = useDesignStore((state) => state.activeFloorPlanId);
  const addFloorPlan = useDesignStore((state) => state.addFloorPlan);
  const setActiveFloorPlan = useDesignStore((state) => state.setActiveFloorPlan);
  const updateFloorPlan = useDesignStore((state) => state.updateFloorPlan);
  const exportFloorPlan = useDesignStore((state) => state.exportFloorPlan);
  
  const handleAddFloorPlan = () => {
    if (newFloorPlanName.trim()) {
      addFloorPlan(newFloorPlanName);
      setNewFloorPlanName('');
      setIsCreatingFloorPlan(false);
    }
  };
  
  const startEditingName = (plan: FloorPlan) => {
    setIsEditingName(plan.id);
    setEditedName(plan.name);
  };
  
  const handleNameEdit = (id: string) => {
    if (editedName.trim()) {
      updateFloorPlan(id, { name: editedName });
      setIsEditingName(null);
      setEditedName('');
    }
  };
  
  const handleExport = (id: string) => {
    const jsonData = exportFloorPlan(id);
    
    // Create a blob and trigger download
    const blob = new Blob([jsonData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `floorplan-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    
    // Clean up
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
  
  return (
    <div 
      className={`fixed top-0 left-0 h-full bg-gray-800 text-white shadow-lg transition-transform duration-300 transform z-10 
                 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}
      style={{ width: '300px' }}
    >
      <div className="p-4">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold">Floor Plans</h2>
          <button 
            onClick={onClose}
            className="p-1 rounded-full hover:bg-gray-700"
          >
            <X size={20} />
          </button>
        </div>
        
        {/* Add floor plan button */}
        <button
          onClick={() => setIsCreatingFloorPlan(true)}
          className="w-full flex items-center justify-center py-2 px-4 mb-4 bg-gray-600 hover:bg-gray-700 rounded"
        >
          <PlusIcon size={18} className="mr-2" />
          New Floor Plan
        </button>
        
        {/* Create floor plan form */}
        {isCreatingFloorPlan && (
          <div className="mb-4 p-3 bg-gray-700 rounded">
            <input
              type="text"
              placeholder="Floor Plan Name"
              value={newFloorPlanName}
              onChange={(e) => setNewFloorPlanName(e.target.value)}
              className="w-full p-2 mb-2 bg-gray-900 border border-gray-600 rounded"
              autoFocus
            />
            <div className="flex justify-end">
              <button
                onClick={() => setIsCreatingFloorPlan(false)}
                className="py-1 px-3 mr-2 bg-gray-600 hover:bg-gray-500 rounded"
              >
                Cancel
              </button>
              <button
                onClick={handleAddFloorPlan}
                className="py-1 px-3 bg-gray-600 hover:bg-gray-500 rounded"
              >
                Create
              </button>
            </div>
          </div>
        )}
        
        {/* Floor plans list */}
        <div className="space-y-2 mt-4">
          {floorPlans.length === 0 && (
            <p className="text-gray-400 text-center">No floor plans yet</p>
          )}
          
          {floorPlans.map((plan) => (
            <div 
              key={plan.id}
              className={`p-3 rounded flex items-center justify-between ${
                activeFloorPlanId === plan.id ? 'bg-gray-900' : 'bg-gray-700 hover:bg-gray-600'
              }`}
              onClick={() => setActiveFloorPlan(plan.id)}
            >
              {isEditingName === plan.id ? (
                <input
                  type="text"
                  value={editedName}
                  onChange={(e) => setEditedName(e.target.value)}
                  onBlur={() => handleNameEdit(plan.id)}
                  onKeyDown={(e) => e.key === 'Enter' && handleNameEdit(plan.id)}
                  className="flex-1 p-1 bg-gray-800 border border-gray-600 rounded"
                  autoFocus
                />
              ) : (
                <span className="flex-1 truncate">{plan.name}</span>
              )}
              
              <div className="flex space-x-1 ml-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    startEditingName(plan);
                  }}
                  className="p-1 rounded hover:bg-gray-600"
                  title="Rename"
                >
                  <PencilIcon size={16} />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleExport(plan.id);
                  }}
                  className="p-1 rounded hover:bg-gray-600"
                  title="Export"
                >
                  <DownloadIcon size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default LeftPanel; 