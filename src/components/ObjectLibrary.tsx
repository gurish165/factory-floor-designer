import { useState } from 'react';
import { X, Plus, Copy, Trash } from 'lucide-react';
import { useDesignStore, FactoryObject } from '../store/designStore';
import ObjectPreview from './ObjectPreview';
import CreateObjectModal from './CreateObjectModal';

interface ObjectLibraryProps {
  isOpen: boolean;
  onClose: () => void;
  onImportObject: (objectId: string) => void;
}

const ObjectLibrary = ({ isOpen, onClose, onImportObject }: ObjectLibraryProps) => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  
  const objectLibrary = useDesignStore((state) => state.objectLibrary);
  const duplicateObject = useDesignStore((state) => state.duplicateObject);
  const deleteObject = useDesignStore((state) => state.deleteObject);
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-90 z-20 overflow-y-auto">
      <div className="container mx-auto px-4 py-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-white">Object Library</h2>
          <button 
            onClick={onClose}
            className="p-2 rounded-full bg-gray-800 hover:bg-gray-700 text-white"
          >
            <X size={24} />
          </button>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {/* Create new object card */}
          <div 
            className="bg-gray-800 rounded-lg p-4 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-700 transition-colors h-64"
            onClick={() => setShowCreateModal(true)}
          >
            <Plus size={48} className="text-gray-400 mb-4" />
            <span className="text-white text-lg">Create New Object</span>
          </div>
          
          {/* Object cards */}
          {objectLibrary.map((object) => (
            <div key={object.id} className="bg-gray-800 rounded-lg p-4 flex flex-col h-64">
              <div className="text-white font-bold mb-1 truncate">{object.name}</div>
              <div className="text-gray-400 text-sm mb-2">
                {object.dimensions.x} x {object.dimensions.y} x {object.dimensions.z}
              </div>
              
              <div className="flex-1 relative mb-3">
                <ObjectPreview object={object} />
              </div>
              
              <div className="flex justify-between space-x-2">
                <button
                  className="flex-1 py-1 px-2 bg-gray-700 hover:bg-gray-600 rounded text-white text-sm"
                  onClick={() => onImportObject(object.id)}
                >
                  Import
                </button>
                <button
                  className="py-1 px-2 bg-gray-700 hover:bg-gray-600 rounded text-white text-sm"
                  onClick={() => duplicateObject(object.id)}
                >
                  <Copy size={16} />
                </button>
                <button
                  className="py-1 px-2 bg-gray-700 hover:bg-gray-600 rounded text-white text-sm"
                  onClick={() => deleteObject(object.id)}
                >
                  <Trash size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* Create object modal */}
      {showCreateModal && (
        <CreateObjectModal 
          onClose={() => setShowCreateModal(false)} 
        />
      )}
    </div>
  );
};

export default ObjectLibrary; 