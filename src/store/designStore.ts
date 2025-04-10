import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Types for our application
export interface ObjectDimensions {
  x: number;
  y: number;
  z: number;
}

export interface FactoryObject {
  id: string;
  name: string;
  dimensions: ObjectDimensions;
  color: string;
  position?: { x: number; y: number; z: number };
  rotation?: number;
}

export interface FloorPlan {
  id: string;
  name: string;
  objects: Array<{
    objectId: string;
    position: { x: number; y: number; z: number };
    rotation: number;
  }>;
}

interface DesignState {
  // Library of objects/machines
  objectLibrary: FactoryObject[];
  // Collection of floorplans
  floorPlans: FloorPlan[];
  // Currently active floorplan ID
  activeFloorPlanId: string | null;
  
  // Actions
  addObject: (object: Omit<FactoryObject, 'id'>) => void;
  updateObject: (id: string, updates: Partial<FactoryObject>) => void;
  deleteObject: (id: string) => void;
  duplicateObject: (id: string) => void;
  
  addFloorPlan: (name: string) => void;
  updateFloorPlan: (id: string, updates: Partial<FloorPlan>) => void;
  deleteFloorPlan: (id: string) => void;
  setActiveFloorPlan: (id: string) => void;
  
  importObject: (objectId: string, position: { x: number; y: number; z: number }, rotation: number) => void;
  removeObjectFromFloorPlan: (floorPlanId: string, placedObjectIndex: number) => void;
  
  exportFloorPlan: (id: string) => string;
  importFloorPlanFromJSON: (jsonData: string) => void;
}

// Create the zustand store with persistence
export const useDesignStore = create<DesignState>()(
  persist(
    (set, get) => ({
      // Initial state
      objectLibrary: [
        // Default objects as specified in PRD
        {
          id: 'default-mill',
          name: 'Mill',
          dimensions: { x: 4, y: 4, z: 8 },
          color: '#aaaaaa',
        },
        {
          id: 'default-wall',
          name: 'Wall',
          dimensions: { x: 2, y: 1, z: 1 },
          color: '#9b9b9b',
        },
      ],
      floorPlans: [],
      activeFloorPlanId: null,

      // Actions for objects
      addObject: (object) => set((state) => ({
        objectLibrary: [...state.objectLibrary, { 
          ...object, 
          id: `object-${Date.now()}-${Math.random().toString(36).substr(2, 9)}` 
        }]
      })),
      
      updateObject: (id, updates) => set((state) => ({
        objectLibrary: state.objectLibrary.map(obj => 
          obj.id === id ? { ...obj, ...updates } : obj
        )
      })),
      
      deleteObject: (id) => set((state) => ({
        objectLibrary: state.objectLibrary.filter(obj => obj.id !== id)
      })),
      
      duplicateObject: (id) => {
        const object = get().objectLibrary.find(obj => obj.id === id);
        if (object) {
          const duplicatedObject = { 
            ...object, 
            id: `object-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            name: `${object.name} (Copy)`
          };
          set((state) => ({
            objectLibrary: [...state.objectLibrary, duplicatedObject]
          }));
        }
      },

      // Actions for floor plans
      addFloorPlan: (name) => {
        const newFloorPlan = {
          id: `floorplan-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          name,
          objects: []
        };
        
        set((state) => ({
          floorPlans: [...state.floorPlans, newFloorPlan],
          activeFloorPlanId: newFloorPlan.id
        }));
        
        return newFloorPlan.id;
      },
      
      updateFloorPlan: (id, updates) => set((state) => ({
        floorPlans: state.floorPlans.map(plan => 
          plan.id === id ? { ...plan, ...updates } : plan
        )
      })),
      
      deleteFloorPlan: (id) => set((state) => {
        const newState: Partial<DesignState> = {
          floorPlans: state.floorPlans.filter(plan => plan.id !== id)
        };
        
        // If we're deleting the active floor plan, set active to null or another plan
        if (state.activeFloorPlanId === id) {
          newState.activeFloorPlanId = newState.floorPlans && newState.floorPlans.length > 0 
            ? newState.floorPlans[0].id 
            : null;
        }
        
        return newState;
      }),
      
      setActiveFloorPlan: (id) => set({ activeFloorPlanId: id }),

      // Actions for object placement
      importObject: (objectId, position, rotation) => {
        const { activeFloorPlanId } = get();
        
        if (!activeFloorPlanId) return;
        
        set((state) => ({
          floorPlans: state.floorPlans.map(plan => 
            plan.id === activeFloorPlanId
              ? {
                  ...plan,
                  objects: [
                    ...plan.objects,
                    { objectId, position, rotation }
                  ]
                }
              : plan
          )
        }));
      },
      
      removeObjectFromFloorPlan: (floorPlanId, placedObjectIndex) => set((state) => ({
        floorPlans: state.floorPlans.map(plan => 
          plan.id === floorPlanId
            ? {
                ...plan,
                objects: plan.objects.filter((_, index) => index !== placedObjectIndex)
              }
            : plan
        )
      })),

      // Import/Export
      exportFloorPlan: (id) => {
        const { floorPlans, objectLibrary } = get();
        const floorPlan = floorPlans.find(plan => plan.id === id);
        
        if (!floorPlan) return '';
        
        // Create a complete representation with all object details
        const exportData = {
          name: floorPlan.name,
          objects: floorPlan.objects.map(placedObj => {
            const objectDetails = objectLibrary.find(obj => obj.id === placedObj.objectId);
            return {
              ...objectDetails,
              position: placedObj.position,
              rotation: placedObj.rotation
            };
          })
        };
        
        return JSON.stringify(exportData, null, 2);
      },
      
      importFloorPlanFromJSON: (jsonData) => {
        try {
          const data = JSON.parse(jsonData);
          
          if (!data.name || !Array.isArray(data.objects)) {
            throw new Error('Invalid floor plan data format');
          }
          
          // Create a new floor plan
          const newFloorPlanId = get().addFloorPlan(data.name);
          
          // Process each object from the imported data
          data.objects.forEach((obj: any) => {
            // Check if the object exists in the library
            const existingObject = get().objectLibrary.find(
              libObj => libObj.name === obj.name && 
                       libObj.dimensions.x === obj.dimensions.x &&
                       libObj.dimensions.y === obj.dimensions.y &&
                       libObj.dimensions.z === obj.dimensions.z
            );
            
            let objectId;
            
            if (existingObject) {
              objectId = existingObject.id;
            } else {
              // Add it to the library
              const newObjectData = {
                name: obj.name,
                dimensions: obj.dimensions,
                color: obj.color || '#aaaaaa'
              };
              
              get().addObject(newObjectData);
              
              // Get the newly added object's ID
              const newObject = get().objectLibrary.find(
                libObj => libObj.name === obj.name &&
                         libObj.dimensions.x === obj.dimensions.x &&
                         libObj.dimensions.y === obj.dimensions.y &&
                         libObj.dimensions.z === obj.dimensions.z
              );
              
              objectId = newObject?.id;
            }
            
            if (objectId && obj.position) {
              // Place the object on the floor plan
              get().importObject(
                objectId,
                obj.position,
                obj.rotation || 0
              );
            }
          });
          
        } catch (error) {
          console.error('Error importing floor plan:', error);
        }
      }
    }),
    {
      name: 'factory-floor-designer-storage',
    }
  )
); 