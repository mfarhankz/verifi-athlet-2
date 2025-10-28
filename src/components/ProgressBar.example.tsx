/**
 * ProgressBar Component Usage Examples
 * 
 * This file demonstrates how to use the ProgressBar component in various scenarios.
 */

import ProgressBar from './ProgressBar';

export const ProgressBarExamples = () => {
  return (
    <div style={{ padding: '20px', maxWidth: '600px', margin: '0 auto' }}>
      <h2>ProgressBar Component Examples</h2>

      {/* Basic Usage */}
      <div style={{ marginBottom: '30px' }}>
        <h3>Basic Usage (Default)</h3>
        <ProgressBar value={75} />
      </div>

      {/* With Labels */}
      <div style={{ marginBottom: '30px' }}>
        <h3>With Labels (Right-Aligned)</h3>
        <div style={{ marginBottom: '10px' }}>
          <ProgressBar value={75} label="Team Performance" />
        </div>
        <div style={{ marginBottom: '10px' }}>
          <ProgressBar value={60} label="Budget Usage" labelSize="12" labelWeight={400} />
        </div>
        <div style={{ marginBottom: '10px' }}>
          <ProgressBar value={85} label="Recruitment Progress" labelSize="14" labelWeight={500} />
        </div>
      </div>

      {/* With Custom Label Width */}
      <div style={{ marginBottom: '30px' }}>
        <h3>With Custom Label Width</h3>
        <div style={{ marginBottom: '10px' }}>
          <ProgressBar value={75} label="Skill" labelWidth={80} />
        </div>
        <div style={{ marginBottom: '10px' }}>
          <ProgressBar value={60} label="Performance" labelWidth={120} labelSize="12" />
        </div>
        <div style={{ marginBottom: '10px' }}>
          <ProgressBar value={90} label="Rating" labelWidth={100} labelSize="14" labelWeight={500} />
        </div>
      </div>

      {/* Custom Colors */}
      <div style={{ marginBottom: '30px' }}>
        <h3>Custom Colors</h3>
        <div style={{ marginBottom: '10px' }}>
          <ProgressBar value={60} color="#4CAF50" />
        </div>
        <div style={{ marginBottom: '10px' }}>
          <ProgressBar value={40} color="#FF5722" />
        </div>
        <div style={{ marginBottom: '10px' }}>
          <ProgressBar value={80} color="#2196F3" />
        </div>
      </div>

      {/* Different Heights */}
      <div style={{ marginBottom: '30px' }}>
        <h3>Different Heights</h3>
        <div style={{ marginBottom: '10px' }}>
          <ProgressBar value={70} height={10} />
        </div>
        <div style={{ marginBottom: '10px' }}>
          <ProgressBar value={70} height={20} />
        </div>
        <div style={{ marginBottom: '10px' }}>
          <ProgressBar value={70} height={30} />
        </div>
        <div style={{ marginBottom: '10px' }}>
          <ProgressBar value={70} height={40} />
        </div>
      </div>

      {/* Without Text */}
      <div style={{ marginBottom: '30px' }}>
        <h3>Without Percentage Text</h3>
        <ProgressBar value={65} showText={false} />
      </div>

      {/* Low Percentage Values */}
      <div style={{ marginBottom: '30px' }}>
        <h3>Low Percentage Values (Text Outside)</h3>
        <div style={{ marginBottom: '10px' }}>
          <ProgressBar value={5} />
        </div>
        <div style={{ marginBottom: '10px' }}>
          <ProgressBar value={15} />
        </div>
        <div style={{ marginBottom: '10px' }}>
          <ProgressBar value={25} />
        </div>
      </div>

      {/* Custom Background */}
      <div style={{ marginBottom: '30px' }}>
        <h3>Custom Background Color</h3>
        <ProgressBar value={55} backgroundColor="#F5F5F5" color="#9C27B0" />
      </div>

      {/* With Custom Styling */}
      <div style={{ marginBottom: '30px' }}>
        <h3>With Additional Styling</h3>
        <ProgressBar 
          value={85} 
          height={25} 
          color="#FF6F00" 
          className="shadow-md"
          style={{ 
            border: '1px solid #ddd',
            marginTop: '5px'
          }}
        />
      </div>

      {/* Real-world Examples */}
      <div style={{ marginBottom: '30px' }}>
        <h3>Real-world Examples</h3>
        
        <div style={{ marginBottom: '15px' }}>
          <strong>Team Performance</strong>
          <ProgressBar value={87} height={24} color="#4CAF50" backgroundColor="#E8F5E9" />
        </div>

        <div style={{ marginBottom: '15px' }}>
          <strong>Budget Usage</strong>
          <ProgressBar value={65} height={24} color="#FF9800" backgroundColor="#FFF3E0" />
        </div>

        <div style={{ marginBottom: '15px' }}>
          <strong>Recruitment Progress</strong>
          <ProgressBar value={45} height={24} color="#2196F3" backgroundColor="#E3F2FD" />
        </div>

        <div style={{ marginBottom: '15px' }}>
          <strong>Skill Rating</strong>
          <ProgressBar value={92} height={24} color="#9C27B0" backgroundColor="#F3E5F5" />
        </div>
      </div>
    </div>
  );
};

export default ProgressBarExamples;

