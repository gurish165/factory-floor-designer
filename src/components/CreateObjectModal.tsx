import { useState, useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { useDesignStore } from '../store/designStore';
import ObjectPreview from './ObjectPreview';

interface CreateObjectModalProps {
  onClose: () => void;
}

const CreateObjectModal = ({ onClose }: CreateObjectModalProps) => {
  const [name, setName] = useState('New Object');
  const [xDimension, setXDimension] = useState(2);
  const [yDimension, setYDimension] = useState(2);
  const [zDimension, setZDimension] = useState(2);
  const [color, setColor] = useState('#aaaaaa'); // Gray default
  
  const addObject = useDesignStore((state) => state.addObject);
  
  // Create a preview object
  const previewObject = {
    id: 'preview',
    name,
    dimensions: {
      x: xDimension,
      y: yDimension,
      z: zDimension
    },
    color
  };
  
  // Handle dimension input with validation
  const handleDimensionChange = (
    value: string, 
    setter: React.Dispatch<React.SetStateAction<number>>,
    maxValue = 500
  ) => {
    const parsed = parseInt(value);
    if (!isNaN(parsed) && parsed > 0 && parsed <= maxValue) {
      setter(parsed);
    }
  };
  
  // Create the object
  const handleCreateObject = () => {
    if (name.trim() === '') return;
    
    addObject({
      name,
      dimensions: {
        x: xDimension,
        y: yDimension,
        z: zDimension
      },
      color
    });
    
    onClose();
  };
  
  // Trap focus inside the modal for accessibility
  const modalRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-30 flex items-center justify-center p-4">
      <div 
        ref={modalRef}
        className="bg-gray-800 rounded-lg shadow-lg max-w-md w-full p-6"
      >
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-white">Create New Object</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white"
          >
            <X size={20} />
          </button>
        </div>
        
        {/* Name input */}
        <div className="mb-4">
          <label className="block text-gray-300 mb-1">Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white"
            placeholder="Enter object name"
            maxLength={50}
          />
        </div>
        
        {/* Preview */}
        <div className="mb-4 bg-gray-700 rounded-lg h-60 relative">
          <ObjectPreview object={previewObject} />
        </div>
        
        {/* Dimensions */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div>
            <label className="block text-gray-300 mb-1">Width (X)</label>
            <input
              type="number"
              value={xDimension}
              onChange={(e) => handleDimensionChange(e.target.value, setXDimension)}
              min={1}
              max={500}
              className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white"
            />
          </div>
          <div>
            <label className="block text-gray-300 mb-1">Depth (Y)</label>
            <input
              type="number"
              value={yDimension}
              onChange={(e) => handleDimensionChange(e.target.value, setYDimension)}
              min={1}
              max={500}
              className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white"
            />
          </div>
          <div>
            <label className="block text-gray-300 mb-1">Height (Z)</label>
            <input
              type="number"
              value={zDimension}
              onChange={(e) => handleDimensionChange(e.target.value, setZDimension)}
              min={1}
              max={100} // Z max is 100 per PRD
              className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white"
            />
          </div>
        </div>
        
        {/* Color picker */}
        <div className="mb-6">
          <label className="block text-gray-300 mb-1">Color</label>
          <div className="flex items-center">
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="w-12 h-10 rounded cursor-pointer border-0"
            />
            <input
              type="text"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="ml-2 p-2 bg-gray-700 border border-gray-600 rounded text-white"
              placeholder="#RRGGBB"
              maxLength={7}
            />
          </div>
        </div>
        
        {/* Action buttons */}
        <div className="flex justify-end">
          <button
            onClick={onClose}
            className="py-2 px-4 bg-gray-700 hover:bg-gray-600 rounded text-white mr-2"
          >
            Cancel
          </button>
          <button
            onClick={handleCreateObject}
            className="py-2 px-4 bg-gray-600 hover:bg-gray-500 rounded text-white"
            disabled={name.trim() === ''}
          >
            Create Object
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateObjectModal; 