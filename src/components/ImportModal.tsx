import { useState, useRef } from 'react';
import { X, Upload } from 'lucide-react';
import { useDesignStore } from '../store/designStore';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ImportModal = ({ isOpen, onClose }: ImportModalProps) => {
  const [dragActive, setDragActive] = useState(false);
  const [fileName, setFileName] = useState('');
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const importFloorPlanFromJSON = useDesignStore((state) => state.importFloorPlanFromJSON);
  
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };
  
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  };
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files);
    }
  };
  
  const handleFiles = (files: FileList) => {
    setError('');
    const file = files[0];
    
    if (file.type !== 'application/json') {
      setError('Please upload a JSON file');
      return;
    }
    
    setFileName(file.name);
    
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        if (event.target?.result) {
          const jsonContent = event.target.result.toString();
          importFloorPlanFromJSON(jsonContent);
          onClose();
        }
      } catch (err) {
        setError('Failed to import floor plan. Invalid JSON format.');
      }
    };
    
    reader.readAsText(file);
  };
  
  const openFileSelector = () => {
    fileInputRef.current?.click();
  };
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-white">Import Floor Plan</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white"
          >
            <X size={20} />
          </button>
        </div>
        
        <div 
          className={`border-2 border-dashed rounded-lg p-8 text-center mb-4
                      ${dragActive ? 'border-gray-500 bg-gray-900 bg-opacity-20' : 'border-gray-600'}`}
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
        >
          <Upload className="mx-auto text-gray-400 mb-2" size={32} />
          <p className="text-gray-300 mb-2">
            {fileName ? fileName : 'Drag and drop your JSON file here'}
          </p>
          <p className="text-gray-400 text-sm mb-4">or</p>
          <button
            onClick={openFileSelector}
            className="py-2 px-4 bg-gray-600 hover:bg-gray-500 rounded text-white"
          >
            Browse Files
          </button>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept=".json"
            onChange={handleChange}
          />
        </div>
        
        {error && (
          <p className="text-red-500 text-sm mb-4">{error}</p>
        )}
        
        <div className="flex justify-end">
          <button
            onClick={onClose}
            className="py-2 px-4 bg-gray-700 hover:bg-gray-600 rounded text-white mr-2"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default ImportModal; 