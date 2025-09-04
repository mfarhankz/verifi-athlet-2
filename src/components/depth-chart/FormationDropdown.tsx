import React from 'react';
import { DepthChartFormation } from '@/types/depthChart';

interface FormationDropdownProps {
  formations: DepthChartFormation[];
  selectedFormationId: string | null;
  onFormationChange: (formationId: string) => void;
  onAddFormation: () => void;
  onDeleteFormation: (formationId: string) => void;
  onMoveFormation: (formationId: string, direction: 'up' | 'down') => void;
  onCopyFormation: (formationId: string) => void;
  isOpen: boolean;
  onToggle: () => void;
}

const FormationDropdown: React.FC<FormationDropdownProps> = ({
  formations,
  selectedFormationId,
  onFormationChange,
  onAddFormation,
  onDeleteFormation,
  onMoveFormation,
  onCopyFormation,
  isOpen,
  onToggle
}) => {
  const selectedFormation = formations.find(f => f.id === selectedFormationId);

  return (
    <div className="relative">
      <button
        onClick={onToggle}
        className="flex items-center justify-between w-64 px-4 py-2 text-left bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
      >
        <span className="block truncate">
          {selectedFormation ? selectedFormation.name : 'Select Formation'}
        </span>
        <svg
          className={`w-5 h-5 ml-2 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path fillRule="evenodd" d="M7 10l5 5 5-5z" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-80 overflow-y-auto">
          {formations.map((formation, index) => (
            <div
              key={formation.id}
              className={`relative ${
                formation.id === selectedFormationId ? 'bg-blue-50' : 'hover:bg-gray-50'
              }`}
            >
              <div
                className="flex items-center justify-between px-4 py-3 cursor-pointer"
                onClick={() => {
                  onFormationChange(formation.id);
                  onToggle();
                }}
              >
                <span className={`font-medium ${
                  formation.id === selectedFormationId ? 'text-blue-600' : 'text-gray-900'
                }`}>
                  {formation.name}
                </span>
                
                <div className="flex items-center space-x-1" onClick={(e) => e.stopPropagation()}>
                  {/* Move Up */}
                  <button
                    onClick={() => onMoveFormation(formation.id, 'up')}
                    disabled={index === 0}
                    className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
                    title="Move Up"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" />
                    </svg>
                  </button>
                  
                  {/* Move Down */}
                  <button
                    onClick={() => onMoveFormation(formation.id, 'down')}
                    disabled={index === formations.length - 1}
                    className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
                    title="Move Down"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                    </svg>
                  </button>
                  
                  {/* Copy */}
                  <button
                    onClick={() => onCopyFormation(formation.id)}
                    className="p-1 text-gray-400 hover:text-blue-600"
                    title="Copy Formation"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
                      <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" />
                    </svg>
                  </button>
                  
                  {/* Delete */}
                  <button
                    onClick={() => onDeleteFormation(formation.id)}
                    disabled={formations.length <= 1}
                    className="p-1 text-gray-400 hover:text-red-600 disabled:opacity-30 disabled:cursor-not-allowed"
                    title="Delete Formation"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          ))}
          
          {/* Add Formation Button */}
          <div className="border-t border-gray-200">
            <button
              onClick={() => {
                onAddFormation();
                onToggle();
              }}
              className="w-full px-4 py-3 text-left text-blue-600 hover:bg-blue-50 font-medium"
            >
              + Add New Formation
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default FormationDropdown;
