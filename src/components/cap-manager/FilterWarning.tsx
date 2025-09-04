import React from 'react';
import styles from './FilterWarning.module.css';

interface FilterWarningProps {
  onProceed: () => void;
  onGoBack: () => void;
}

const FilterWarning: React.FC<FilterWarningProps> = ({ onProceed, onGoBack }) => {
  return (
    <div className={styles.overlay}>
      <div className={styles.warningBox}>
        <h2>Active Filters</h2>
        <p>Filters will not be applied to this screen<br></br><br></br>Would you like to proceed?</p>
        <div className={styles.buttonContainer}>
          <button onClick={onProceed} className={styles.proceedButton}>Proceed</button>
          <button onClick={onGoBack} className={styles.backButton}>Go to Positional Ranking</button>
        </div>
      </div>
    </div>
  );
};

export default FilterWarning;