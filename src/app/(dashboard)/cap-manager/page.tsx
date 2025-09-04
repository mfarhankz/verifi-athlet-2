"use client";

import { useState, useRef, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import KanbanBoard from "@/components/cap-manager/KanbanBoard";
import YearView from "@/components/cap-manager/YearView";
import ListView from "@/components/cap-manager/ListView";
import Budget from "@/components/cap-manager/Budget";
import YearSelector from "@/components/cap-manager/YearSelector";
import { supabase } from "@/lib/supabaseClient";
import { CURRENT_YEAR } from "@/utils/utils";
import { useEffectiveCompAccess } from '@/utils/compAccessUtils';
import Filters from "@/components/cap-manager/Filters";
import Login from "@/components/login";
import { fetchUserDetails } from "@/utils/utils";
import Reports from '@/components/cap-manager/Reports';
import EnhancedDepthChart from '@/components/depth-chart/EnhancedDepthChart';
import { useZoom } from '@/contexts/ZoomContext';

interface ScenarioWithPriority {
  name: string;
  priority: number;
  isTarget?: boolean;
}

// Inner component that uses the useSearchParams hook
function CapManagerContent() {
  const searchParams = useSearchParams();
  const viewParam = searchParams?.get('view');
  
  // Determine active option based on URL parameter
  const getInitialActiveOption = () => {
    switch (viewParam) {
      case 'positional-ranking': return 'Positional Ranking';
      case 'by-year': return 'By Year';
      case 'list': return 'List';
      case 'budget': return 'Budget';
      case 'reports': return 'Reports';
      case 'depth-chart': return 'Depth Chart';
      default: return 'Positional Ranking';
    }
  };

  const [activeOption, setActiveOption] = useState<'Positional Ranking' | 'By Year' | 'List' | 'Budget' | 'Reports' | 'Depth Chart'>(getInitialActiveOption());
  const [session, setSession] = useState<any>(null);
  const [selectedYear, setSelectedYear] = useState<number>(CURRENT_YEAR);
  const [selectedMonth, setSelectedMonth] = useState<string>('Jan');
  const { zoom } = useZoom();
  const { 
    effectiveCompAccess, 
    compDisplayMode, 
    toggleCompAccess, 
    setCompDisplayMode,
    hasCompensationAccess
  } = useEffectiveCompAccess();
  const [showDetails, setShowDetails] = useState(false);
  const lastScrollY = useRef(0);
  const [isHeaderVisible, setIsHeaderVisible] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const [bannerVisible, setBannerVisible] = useState(false);
  const [scenarios, setScenarios] = useState<string[]>([]);
  const [activeScenarios, setActiveScenarios] = useState<ScenarioWithPriority[]>([]);
  const [targetScenario, setTargetScenario] = useState<string>('');
  const [isScenarioMode, setIsScenarioMode] = useState(false);
  const [teamId, setTeamId] = useState<string | null>(null);
  const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);
  const [activeFilters, setActiveFilters] = useState<{ [key: string]: string | string[] }>({});
  const [showScenarioMenu, setShowScenarioMenu] = useState(false);
  const [scenarioToDelete, setScenarioToDelete] = useState<string | null>(null);
  const scenarioMenuRef = useRef<HTMLDivElement>(null);

  // Update activeOption when URL parameter changes
  useEffect(() => {
    const newActiveOption = getInitialActiveOption();
    setActiveOption(newActiveOption);
  }, [viewParam]);

  const handlePrint = () => {
    window.print();
  };

  const closeBanner = () => {
    setBannerVisible(false);
  };

  const hasActiveFilters = (filters: { [key: string]: string | string[] }): boolean => {
    return Object.values(filters).some(filterArray => 
      Array.isArray(filterArray) ? filterArray.length > 0 : !!filterArray
    );
  };

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const controlHeader = () => {
      const currentScrollY = container.scrollTop;
      if (currentScrollY > lastScrollY.current && currentScrollY > 100) {
        // Scrolling down and past the header height
        setIsHeaderVisible(false);
      } else {
        // Scrolling up
        setIsHeaderVisible(true);
      }
      lastScrollY.current = currentScrollY;
    };

    container.addEventListener('scroll', controlHeader);
    return () => container.removeEventListener('scroll', controlHeader);
  }, []);

  useEffect(() => {
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      if (session) {
        const data = await fetchUserDetails();
        setTeamId(data.customer_id);
        fetchScenarios(data.customer_id);
      }
    };

    getSession();
  }, []); // Add empty dependency array

  const selectOption = (option: 'Positional Ranking' | 'By Year' | 'List' | 'Budget' | 'Reports' | 'Depth Chart') => {
    setActiveOption(option);
  };
    
  const fetchScenarios = async (teamId: string) => {
    const { data, error } = await supabase
      .from('scenario')
      .select('name')
      .eq('customer_id', teamId);
    if (error) {
      console.error('Error fetching scenarios:', error);
    } else if (data) {
      setScenarios(data.map((scenario: { name: any; }) => scenario.name));
    }
  };



  const handleNewScenario = async () => {
    const scenarioName = prompt("Enter a name for the new scenario:");
    if (scenarioName && !scenarios.includes(scenarioName) && teamId) {
      const { data, error } = await supabase
        .from('scenario')
        .insert({ customer_id: teamId, name: scenarioName });

      if (error) {
        console.error('Error adding new scenario:', error);
      } else {
        setScenarios([...scenarios, scenarioName]);
        // Add new scenario as active with lowest priority
        const newScenario: ScenarioWithPriority = {
          name: scenarioName,
          priority: activeScenarios.length,
          isTarget: activeScenarios.length === 0 // Make it target if it's the first scenario
        };
        setActiveScenarios([...activeScenarios, newScenario]);
        if (activeScenarios.length === 0) {
          setTargetScenario(scenarioName);
        }
        setIsScenarioMode(true);
      }
    }
  };

  const toggleScenario = (scenarioName: string) => {
    setActiveScenarios(prev => {
      const isActive = prev.some(s => s.name === scenarioName);
      if (isActive) {
        // Remove scenario
        const updated = prev.filter(s => s.name !== scenarioName);
        
        if (updated.length === 0) {
          // If no scenarios remain active, turn off scenario mode and reset target
          setIsScenarioMode(false);
          setTargetScenario('');
          return [];
        }
        
        // If we're removing the target scenario and there are other scenarios, set the first remaining scenario as target
        if (targetScenario === scenarioName && updated.length > 0) {
          const newTarget = updated[0].name;
          setTargetScenario(newTarget);
          return updated.map((s, idx) => ({
            ...s,
            priority: idx,
            isTarget: s.name === newTarget
          }));
        }
        // Adjust priorities
        return updated.map((s, idx) => ({ ...s, priority: idx }));
      } else {
        // Add scenario with lowest priority
        const newScenario = { 
          name: scenarioName, 
          priority: prev.length,
          isTarget: prev.length === 0 // Make it target if it's the first scenario
        };
        if (prev.length === 0) {
          setTargetScenario(scenarioName);
        }
        return [...prev, newScenario];
      }
    });
  };

  const moveScenarioPriority = (scenarioName: string, direction: 'up' | 'down') => {
    setActiveScenarios(prev => {
      const index = prev.findIndex(s => s.name === scenarioName);
      if (index === -1) return prev;
      
      const newIndex = direction === 'up' ? Math.max(0, index - 1) : Math.min(prev.length - 1, index + 1);
      if (newIndex === index) return prev;
      
      const updated = [...prev];
      const temp = updated[index];
      updated[index] = updated[newIndex];
      updated[newIndex] = temp;
      
      return updated.map((s, idx) => ({ ...s, priority: idx }));
    });
  };

  const setScenarioAsTarget = (scenarioName: string) => {
    setTargetScenario(scenarioName);
    setActiveScenarios(prev => 
      prev.map(s => ({
        ...s,
        isTarget: s.name === scenarioName
      }))
    );
  };

  // Update the derived state for scenarios
  const scenariosForComponents = isScenarioMode ? activeScenarios.map(s => ({
    name: s.name,
    priority: s.priority
  })) : [];

  const toggleFilterMenu = () => {
    setIsFilterMenuOpen(!isFilterMenuOpen);
  };

  const handleFilterChange = (filters: { [key: string]: string | string[] }) => {
    setActiveFilters(filters);
  };

  const handleDeleteScenario = async (scenarioName: string) => {
    if (scenarioToDelete === scenarioName) {
      // Actually delete the scenario
      if (teamId) {
        const { error } = await supabase
          .from('scenario')
          .delete()
          .eq('customer_id', teamId)
          .eq('name', scenarioName);

        if (error) {
          console.error('Error deleting scenario:', error);
          return;
        }

        // Remove from local state
        setScenarios(prev => prev.filter(s => s !== scenarioName));
        setActiveScenarios(prev => {
          const updated = prev.filter(s => s.name !== scenarioName);
          // If we're deleting the target scenario, set the first remaining scenario as target
          if (targetScenario === scenarioName && updated.length > 0) {
            const newTarget = updated[0].name;
            setTargetScenario(newTarget);
            return updated.map((s, idx) => ({
              ...s,
              priority: idx,
              isTarget: s.name === newTarget
            }));
          }
          return updated.map((s, idx) => ({ ...s, priority: idx }));
        });
      }
      setScenarioToDelete(null);
    } else {
      // Set as scenario to be deleted (warning state)
      setScenarioToDelete(scenarioName);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (scenarioMenuRef.current && !scenarioMenuRef.current.contains(event.target as Node)) {
        setShowScenarioMenu(false);
        setScenarioToDelete(null);
      }
    };

    if (showScenarioMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showScenarioMenu]);

  // Helper function to get the display text for the current comp mode
  const getCompModeText = (): string => {
    switch (compDisplayMode) {
      case 'on': return 'Comp On';
      case 'off': return 'Comp Off';
      case 'oneLine': return '1 Line';
      default: return 'Comp';
    }
  };

  // Return the UI
  return (
    <div className="h-full w-full flex flex-col">
      {/* Cap Manager Controls - Fixed Header */}
      <div className="w-full bg-white border-b border-gray-200 px-4 py-3 flex justify-between items-center shadow-sm flex-shrink-0">
        {bannerVisible && (
          <div className="banner absolute top-0 left-0 right-0 bg-yellow-100 p-2 text-sm text-center">
            Updates are being made, some features might not be working properly, and not all changes will be saved.
            <button onClick={closeBanner} className="ml-2 text-gray-600 hover:text-gray-800">×</button>
          </div>
        )}
        
        <div className="flex items-center space-x-4">
          <YearSelector selectedYear={selectedYear} onYearChange={setSelectedYear} />
          
          <div className="relative inline-block">
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium text-gray-600">FY:</span>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="appearance-none bg-white border border-gray-300 rounded-md py-2 pl-3 pr-8 leading-tight focus:outline-none focus:border-blue-500 focus:ring focus:ring-blue-200 text-sm"
              >
                <option value="Jan">Jan</option>
                <option value="Feb">Feb</option>
                <option value="Mar">Mar</option>
                <option value="Apr">Apr</option>
                <option value="May">May</option>
                <option value="Jun">Jun</option>
                <option value="Jul">Jul</option>
                <option value="Aug">Aug</option>
                <option value="Sep">Sep</option>
                <option value="Oct">Oct</option>
                <option value="Nov">Nov</option>
                <option value="Dec">Dec</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700" style={{ right: "0.5rem" }}>
                <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                  <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/>
                </svg>
              </div>
            </div>
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          <button 
            className="p-1 hover:bg-gray-100 rounded" 
            onClick={handlePrint}
            title="Print View"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
          </button>
          
          <div className="scenario-controls flex items-center mr-4">
            <button 
              className={`py-1 px-3 rounded text-sm ${isScenarioMode ? 'bg-blue-500 text-white' : 'bg-gray-300 text-gray-700'}`}
              onClick={() => {
                const newMode = !isScenarioMode;
                setIsScenarioMode(newMode);
                if (!newMode) {
                  // Reset scenarios when turning off scenario mode
                  setActiveScenarios([]);
                  setTargetScenario('');
                }
              }}
            >
              Scenarios {isScenarioMode ? 'On' : 'Off'}
            </button>
            {isScenarioMode && (
              <div className="relative ml-2">
                <button 
                  className="py-1 px-3 bg-blue-500 text-white rounded text-sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (showScenarioMenu) {
                      setScenarioToDelete(null);
                    }
                    setShowScenarioMenu(!showScenarioMenu);
                  }}
                >
                  Manage
                </button>
                {showScenarioMenu && (
                  <div ref={scenarioMenuRef} className="absolute right-0 mt-1 bg-white rounded shadow-lg p-2 z-50" style={{ minWidth: '250px' }}>
                    <div className="flex justify-between items-center mb-2 pb-2 border-b border-gray-200">
                      <button 
                        className="text-left py-1 px-2 hover:bg-gray-100 text-sm"
                        onClick={handleNewScenario}
                      >
                        + New Scenario
                      </button>
                      <div className="text-xs text-gray-500">
                        ● = Save Target
                      </div>
                    </div>
                    <div className="max-h-48 overflow-y-auto">
                      {scenarios
                        .sort((a, b) => {
                          const scenarioA = activeScenarios.find(s => s.name === a);
                          const scenarioB = activeScenarios.find(s => s.name === b);
                          if (scenarioA && scenarioB) {
                            return scenarioA.priority - scenarioB.priority;
                          }
                          if (scenarioA) return -1;
                          if (scenarioB) return 1;
                          return 0;
                        })
                        .map((scenarioName) => {
                        const activeScenario = activeScenarios.find(s => s.name === scenarioName);
                        const isActive = !!activeScenario;
                        return (
                          <div key={scenarioName} className="flex items-center mb-1 p-1 hover:bg-gray-50">
                            <input
                              type="checkbox"
                              checked={isActive}
                              onChange={() => toggleScenario(scenarioName)}
                              className="mr-2"
                            />
                            <span className="flex-grow text-sm">{scenarioName}</span>
                            <div className="flex items-center space-x-1">
                              <button
                                onClick={() => handleDeleteScenario(scenarioName)}
                                className={`px-2 py-1 text-xs rounded ${
                                  scenarioToDelete === scenarioName
                                    ? 'bg-red-500 text-white'
                                    : 'text-red-500 hover:bg-red-50'
                                }`}
                                title={scenarioToDelete === scenarioName ? 'Click again to confirm delete' : 'Delete scenario'}
                              >
                                {scenarioToDelete === scenarioName ? 'Confirm?' : '×'}
                              </button>
                              {isActive && (
                                <>
                                  <button
                                    onClick={() => moveScenarioPriority(scenarioName, 'up')}
                                    className="px-1 text-gray-600 hover:text-gray-800 disabled:opacity-30"
                                    disabled={activeScenario.priority === 0}
                                    title="Move Up Priority"
                                  >
                                    ↑
                                  </button>
                                  <button
                                    onClick={() => moveScenarioPriority(scenarioName, 'down')}
                                    className="px-1 text-gray-600 hover:text-gray-800 disabled:opacity-30"
                                    disabled={activeScenario.priority === activeScenarios.length - 1}
                                    title="Move Down Priority"
                                  >
                                    ↓
                                  </button>
                                  <div className="flex items-center ml-2" title="Select as Save Target">
                                    <input
                                      type="radio"
                                      name="targetScenario"
                                      checked={activeScenario.isTarget}
                                      onChange={() => setScenarioAsTarget(scenarioName)}
                                      className="hidden"
                                      id={`target-${scenarioName}`}
                                    />
                                    <label 
                                      htmlFor={`target-${scenarioName}`}
                                      className={`cursor-pointer text-lg ${activeScenario.isTarget ? 'text-blue-500' : 'text-gray-300'}`}
                                      onClick={() => setScenarioAsTarget(scenarioName)}
                                    >
                                      ●
                                    </label>
                                  </div>
                                </>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
          
          <button
            className={`filter-button px-3 py-1 rounded border ${hasActiveFilters(activeFilters) ? 'bg-blue-500 text-white border-blue-500' : 'border-gray-300 hover:bg-gray-100'}`}
            onClick={toggleFilterMenu}
          >
            Filters
          </button>
          
          <div className="comp-toggle flex items-center space-x-2">
            <div className="relative">
              <button 
                onClick={() => {
                  const dropdown = document.getElementById('comp-mode-dropdown');
                  if (dropdown) {
                    dropdown.classList.toggle('hidden');
                  }
                }}
                className={`px-3 py-1 rounded-md text-sm font-medium flex items-center ${
                  compDisplayMode === 'on' 
                    ? 'bg-blue-500 text-white' 
                    : compDisplayMode === 'off'
                      ? 'bg-gray-300 text-gray-700'
                      : 'bg-green-500 text-white'
                }`}
              >
                {getCompModeText()}
                <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              <div 
                id="comp-mode-dropdown" 
                className="absolute right-0 mt-1 w-32 bg-white rounded-md shadow-lg hidden z-10"
              >
                {hasCompensationAccess && (
                  <button 
                    onClick={() => {
                      setCompDisplayMode('on');
                      document.getElementById('comp-mode-dropdown')?.classList.add('hidden');
                    }}
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    Comp On
                  </button>
                )}
                <button 
                  onClick={() => {
                    setCompDisplayMode('off');
                    document.getElementById('comp-mode-dropdown')?.classList.add('hidden');
                  }}
                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  Comp Off
                </button>
                <button 
                  onClick={() => {
                    setCompDisplayMode('oneLine');
                    document.getElementById('comp-mode-dropdown')?.classList.add('hidden');
                  }}
                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  1 Line
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Scrollable Content Area */}
      <div 
        ref={containerRef}
        className="flex-grow relative overflow-auto"
        style={{ 
          height: "calc(100vh - 60px)",
          width: "100%",
          overflowX: "auto", 
          overflowY: "auto"
        }}
      >
        <div className="kanban-board-container" style={{ 
          position: 'relative',
          transform: `scale(${zoom / 100})`,
          transformOrigin: 'top left',
          paddingBottom: '2rem',
          paddingRight: zoom > 100 ? '5%' : '1rem',
          minHeight: zoom > 100 ? `${zoom}vh` : 'auto', 
          width: zoom > 100 ? `${Math.max(zoom, 120)}%` : '100%',
          height: 'fit-content',
          marginBottom: zoom > 100 ? '4rem' : '1rem',
          boxShadow: zoom > 100 ? '10px 0 15px -5px rgba(0, 0, 0, 0.1)' : 'none'
        }}>
          {activeOption === 'Positional Ranking' && <KanbanBoard selectedYear={selectedYear} selectedMonth={selectedMonth} selectedScenario={scenariosForComponents.map(s => s.name).join(', ')} zoom={zoom} activeFilters ={activeFilters as { [key: string]: string[] }} selectOption={selectOption} targetScenario={targetScenario} />}
          {activeOption === 'By Year' && <YearView selectedYear={selectedYear} selectedMonth={selectedMonth} selectedScenario={scenariosForComponents.map(s => s.name).join(', ')} activeFilters={activeFilters as { [key: string]: string[] }} targetScenario={targetScenario}/>}
          {activeOption === 'List' && <ListView selectedYear={selectedYear} selectedMonth={selectedMonth} selectedScenario={scenariosForComponents.map(s => s.name).join(', ')} activeFilters={activeFilters as { [key: string]: string[] }} targetScenario={targetScenario}/>}
          {activeOption === 'Budget' && (
            <Budget 
              selectedYear={selectedYear}
              selectedMonth={selectedMonth}
              selectedScenario={scenariosForComponents.map(s => s.name).join(', ')} 
              activeFilters={activeFilters as { [key: string]: string[] }}
              selectOption={selectOption}
              targetScenario={targetScenario}
            />
          )}
          {activeOption === 'Reports' && (
            <Reports 
              selectedYear={selectedYear}
              selectedMonth={selectedMonth}
              selectedScenario={scenariosForComponents.map(s => s.name).join(', ')}
              activeFilters={activeFilters}
            />
          )}
          {activeOption === 'Depth Chart' && (
            <EnhancedDepthChart 
              selectedYear={selectedYear}
              selectedMonth={typeof selectedMonth === 'string' ? 
                ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].indexOf(selectedMonth) + 1 : 
                selectedMonth}
              selectedScenario={scenariosForComponents.map(s => s.name).join(', ')}
              activeFilters={activeFilters}
            />
          )}
        </div>
        {teamId && (
          <Filters
            isOpen={isFilterMenuOpen}
            onClose={() => setIsFilterMenuOpen(false)}
            teamId={teamId}
            selectedYear={selectedYear}
            onFilterChange={handleFilterChange as (filters: { [key: string]: string | string[] }) => void}
          />
        )}
      </div>
    </div>
  );
}

// Main component wrapped in Suspense
export default function CapManager() {
  return (
    <Suspense fallback={<div className="loading">Loading cap manager...</div>}>
      <CapManagerContent />
    </Suspense>
  );
} 