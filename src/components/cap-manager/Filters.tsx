import React, { useState, useEffect } from 'react';
import styles from './Filters.module.css';
import { fetchPositionOrder } from "../../utils/utils";

interface FiltersProps {
  isOpen: boolean;
  onClose: () => void;
  teamId: string;
  selectedYear: number;
  onFilterChange: (filters: { [key: string]: string[] | string }) => void;
}

const Filters: React.FC<FiltersProps> = ({ isOpen, onClose, teamId, selectedYear, onFilterChange }) => {
  const [activeFilters, setActiveFilters] = useState<{ [key: string]: string[] | string }>({});
  const [positions, setPositions] = useState<{ [category: string]: string[] }>({});

  useEffect(() => {
    const loadPositions = async () => {
      const positionsData = await fetchPositionOrder(teamId, selectedYear);
      // console.log('positionsData', positionsData);
      
      if (Array.isArray(positionsData)) {
        const groupedPositions = positionsData.reduce((acc, { position, category }) => {
          if (!acc[category]) {
            acc[category] = [];
          }
          acc[category].push(position);
          return acc;
        }, {} as { [category: string]: string[] });
        
        setPositions(groupedPositions);
      } else {
        console.error('Unexpected positionsData format:', positionsData);
        setPositions({});
      }
    };

    loadPositions();
  }, [teamId, selectedYear]);

  const toggleFilter = (category: string, value: string) => {
    setActiveFilters(prev => {
      const newFilters = { ...prev };
      if (!newFilters[category]) {
        newFilters[category] = [];
      }
      const index = newFilters[category].indexOf(value);
      if (index > -1) {
        (newFilters[category] as string[]).splice(index, 1);
      } else {
        (newFilters[category] as string[]).push(value);
      }
      if (newFilters[category].length === 0) {
        delete newFilters[category];
      }
      onFilterChange(newFilters);
      return newFilters;
    });
  };

  const toggleCategory = (category: string) => {
    setActiveFilters(prev => {
      const newFilters = { ...prev };
      if (!newFilters['position']) {
        newFilters['position'] = [];
      }
      const categoryPositions = positions[category] || [];
      const allSelected = categoryPositions.every(pos => newFilters['position'].includes(pos));
      
      if (allSelected) {
        (newFilters['position'] as string[]).filter(pos => !categoryPositions.includes(pos));
      } else {
        categoryPositions.forEach(pos => {
          if (!newFilters['position'].includes(pos)) {
            (newFilters['position'] as string[]).push(pos);
          }
        });
      }
      
      if (newFilters['position'].length === 0) {
        delete newFilters['position'];
      }
      onFilterChange(newFilters);
      return newFilters;
    });
  };

  const removeFilter = (category: string, value?: string) => {
    setActiveFilters(prev => {
      const newFilters = { ...prev };
      if (value) {
        (newFilters[category] as string[]).filter((v: string) => v !== value);
      } else {
        delete newFilters[category];
      }
      if (newFilters[category]?.length === 0) {
        delete newFilters[category];
      }
      onFilterChange(newFilters);
      return newFilters;
    });
  };

  const isActive = (category: string, position?: string) => {
    if (position) {
      return activeFilters['position']?.includes(position) || false;
    }
    const categoryPositions = positions[category] || [];
    return categoryPositions.every(pos => activeFilters['position']?.includes(pos)) || false;
  };

  const toggleRecruitFilter = (value: string) => {
    setActiveFilters(prev => {
      const newFilters = { ...prev };
      if (newFilters.recruit === value) {
        delete newFilters.recruit;  // This will make it default to "on"
      } else {
        newFilters.recruit = value;
      }
      onFilterChange(newFilters);
      return newFilters;
    });
  };

  return (
    <div className={`${styles.filterMenu} ${isOpen ? styles.open : ''}`}>
      <div className={styles.header}>
        <h2>Filters</h2>
        <button onClick={onClose} className={styles.closeButton} aria-label="Hide filters">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={styles.chevronIcon}>
            <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z"/>
          </svg>
        </button>
      </div>
      
      <div className={styles.activeFilters}>
        {activeFilters['position'] && activeFilters['position'].length > 0 && (
          <div className={styles.filterCategory}>
            <span className={styles.categoryName}>Position:</span>
            {(activeFilters['position'] as string[]).map(value => (
              <span key={value} className={styles.filterTag}>
                {value}
                <button onClick={() => removeFilter('position', value)}>×</button>
              </span>
            ))}
          </div>
        )}
        {activeFilters.recruit && (
          <div className={styles.filterCategory}>
            <span className={styles.categoryName}>Recruit:</span>
            <span className={styles.filterTag}>
              {activeFilters.recruit}
              <button onClick={() => removeFilter('recruit')}>×</button>
            </span>
          </div>
        )}
      </div>

      <div className={styles.filterOptions}>
        <div className={styles.filterCategory}>
          <h3>Positions</h3>
          {Object.entries(positions).map(([category, positionList]) => (
            <div key={category} className={styles.categoryGroup}>
              <div 
                className={`${styles.rectangle} ${styles.category} ${isActive(category) ? styles.active : ''}`}
                onClick={() => toggleCategory(category)}
              >
                {category}
              </div>
              <div className={styles.positionGroup}>
                {Array.isArray(positionList) ? (
                  positionList.map(position => (
                    <div 
                      key={position} 
                      className={`${styles.rectangle} ${styles.position} ${isActive('position', position) ? styles.active : ''}`}
                      onClick={() => toggleFilter('position', position)}
                    >
                      {position}
                    </div>
                  ))
                ) : (
                  <p>No positions available for this category</p>
                )}
              </div>
            </div>
          ))}
        </div>
        
        <div className={styles.filterCategory}>
          <h3>Recruit Status</h3>
          <div className={styles.categoryGroup}>
            {['off', 'only'].map(option => (
              <div
                key={option}
                className={`${styles.rectangle} ${activeFilters.recruit === option ? styles.active : ''}`}
                onClick={() => toggleRecruitFilter(option)}
              >
                {option.charAt(0).toUpperCase() + option.slice(1)}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Filters;
