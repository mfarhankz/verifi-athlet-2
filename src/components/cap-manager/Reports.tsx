import React, { useState } from 'react';
import { PositionComparison, ScenarioCompare } from './reports/index';

interface ReportsProps {
  selectedYear?: number;
  selectedMonth?: string;
  selectedScenario?: string;
  activeFilters?: { [key: string]: string[] | string };
}

const Reports: React.FC<ReportsProps> = ({
  selectedYear = 2025,
  selectedMonth = 'Jan',
  selectedScenario = '',
  activeFilters = {}
}) => {
  const [selectedReport, setSelectedReport] = useState('position-comparison');

  return (
    <div style={{ padding: '2rem', width: '100%', height: '100vh', textAlign: 'center', display: 'flex', flexDirection: 'column' }}>
      {/* Report selection dropdown */}
      <div style={{ marginBottom: '2rem' }}>
        <label htmlFor="report-select" style={{ fontWeight: 500, marginRight: 8 }}>Report:</label>
        <select
          id="report-select"
          value={selectedReport}
          onChange={e => setSelectedReport(e.target.value)}
          style={{ padding: '0.5rem 1rem', fontSize: '1rem', borderRadius: 4 }}
        >
          <option value="position-comparison">Position Comparison</option>
          <option value="scenario-compare">Scenario Compare</option>
        </select>
      </div>
      
      {/* Render the selected report */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {selectedReport === 'scenario-compare' ? (
          <ScenarioCompare
            selectedYear={selectedYear}
            selectedMonth={selectedMonth}
            selectedScenario={selectedScenario}
            activeFilters={activeFilters}
          />
        ) : (
          <PositionComparison
            selectedYear={selectedYear}
            selectedMonth={selectedMonth}
            selectedScenario={selectedScenario}
            activeFilters={activeFilters}
          />
        )}
      </div>
    </div>
  );
};

export default Reports; 