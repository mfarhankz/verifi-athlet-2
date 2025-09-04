import React, { useEffect, useRef, useState } from 'react';
import styles from './AddPlayer.module.css';
import { supabase } from '../../lib/supabaseClient';
import { useEffectiveCompAccess } from '../../utils/compAccessUtils';
import { fetchPositionOrder, getYearOptions } from '../../utils/utils';
import { removeImageBackground } from '../../utils/imageUtils';

interface UserDetails {
  id: string;
  compensation_access: boolean;
}

interface ModalProps {
  show: boolean;
  onClose: () => void;
  onSubmit: (player: { name__first: string; name__last: string; position: string; image_url: string; elig_remaining: number; year: string; scholarship_perc: number; compensation?: number; redshirt_status: string; is_committed: boolean; is_placeholder: boolean; starting_season: number, scenario: string, is_injured: boolean }) => Promise<void>;
  teamId: string;
  selectedYear: number;
  selectedScenario: string;
}

const Modal: React.FC<ModalProps> = ({ show, onClose, onSubmit, teamId, selectedYear, selectedScenario }) => {
  // console.log("Selected Scenario:", selectedScenario);
  const modalRef = useRef<HTMLDivElement>(null);
  const [isRecruit, setIsRecruit] = useState(false);
  const [formData, setFormData] = useState({
    name__first: '',
    name__last: '',
    position: '',
    image_url: '',
    elig_remaining: 1,
    year: 'FR',
    scholarship_perc: 1,
    compensation: 0,
    month: '00',
    redshirt_status: 'has',
    is_committed: 0,
    is_injured: 0,
    is_placeholder: false,
    starting_season: selectedYear,
    scenario: selectedScenario,
  });
  
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [positions, setPositions] = useState<string[]>([]);
  const { effectiveCompAccess } = useEffectiveCompAccess();
  const [processedImageUrl, setProcessedImageUrl] = useState<string | null>(null);

  useEffect(() => {
    const fetchPositions = async () => {
      if (teamId) {
        const positionOrderData = await fetchPositionOrder(teamId, selectedYear);
        const positionList = positionOrderData.map(item => item.position);
        setPositions(positionList);
      }
    };

    fetchPositions();
  }, [teamId, selectedYear]);

  useEffect(() => {
    if (show) {
      const findScrollableContainer = (): HTMLElement | null => {
        const container = document.querySelector('[class^="__className_"]');
        if (container && (container.scrollHeight > container.clientHeight || container.scrollWidth > container.clientWidth)) {
          return container as HTMLElement;
        }
        return null;
      };

      const getZoomLevel = (): number => {
        const zoomContainer = document.querySelector('.kanban-board-container') as HTMLElement;
        if (zoomContainer) {
          const transform = window.getComputedStyle(zoomContainer).transform;
          const matrix = new DOMMatrix(transform);
          return matrix.a;
        }
        return 1;
      };

      const positionModal = () => {
        const modal = modalRef.current;
        if (modal) {
          const viewportWidth = window.innerWidth;
          const viewportHeight = window.innerHeight;
          const modalWidth = modal.offsetWidth;
          const modalHeight = modal.offsetHeight;

          const scrollContainer = findScrollableContainer();

          let scrollLeft = 0;
          let scrollTop = 0;
          if (scrollContainer) {
            scrollLeft = scrollContainer.scrollLeft;
            scrollTop = scrollContainer.scrollTop;
          } else {
            scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
            scrollTop = window.pageYOffset || document.documentElement.scrollTop;
          }

          const zoomLevel = getZoomLevel();

          // Adjust scroll values for zoom
          scrollLeft /= zoomLevel;
          scrollTop /= zoomLevel;

          // Center the modal horizontally and vertically
          const left = scrollLeft + (viewportWidth - modalWidth) / (2 * zoomLevel);
          const top = scrollTop;

          modal.style.position = 'absolute';
          modal.style.left = `${left}px`;
          modal.style.top = `${top}px`;
          modal.style.transform = `scale(${1 / zoomLevel})`;
          modal.style.transformOrigin = 'top left';
        }
      };

      positionModal();
      
      const scrollContainer = findScrollableContainer();
      if (scrollContainer) {
        scrollContainer.addEventListener('scroll', positionModal);
      } else {
        window.addEventListener('scroll', positionModal);
      }
      window.addEventListener('resize', positionModal);

      return () => {
        if (scrollContainer) {
          scrollContainer.removeEventListener('scroll', positionModal);
        } else {
          window.removeEventListener('scroll', positionModal);
        }
        window.removeEventListener('resize', positionModal);
      };
    }
  }, [show]);

  if (!show) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name === 'compensation') {
      // Remove non-numeric characters and parse as a number
      const numericValue = parseFloat(value.replace(/[^0-9.]/g, ''));
      setFormData(prevState => ({
        ...prevState,
        [name]: isNaN(numericValue) ? 0 : numericValue,
      }));
    } else if (name === 'is_committed') {
      setFormData(prevState => ({
        ...prevState,
        [name]: value === 'yes' ? 1 : 0,
      }));
    } else {
      setFormData(prevState => ({
        ...prevState,
        [name]: value,
      }));
    }
  };

  const formatCurrency = (value: number) => {
    return value.toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const file = e.target.files[0];
      setUploading(true);
      try {
        const imageUrl = await removeImageBackground(file);
        if (imageUrl) {
          setFile(file);
          setProcessedImageUrl(imageUrl);
          setFormData(prevState => ({ ...prevState, image_url: imageUrl }));
        } else {
          console.error('Failed to remove background from image');
        }
      } catch (error) {
        console.error('Error processing image:', error);
      } finally {
        setUploading(false);
      }
    }
  };

  const handleRecruitToggle = () => {
    setIsRecruit(!isRecruit);
    setFormData(prevState => ({
      ...prevState,
      is_committed: 0,
      is_placeholder: false,
      starting_season: selectedYear,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    let image_url = processedImageUrl || formData.image_url;
    if (file && processedImageUrl) {
      setUploading(true);
      const randomHex = Math.random().toString(16).substring(2, 8);
      const fileNameParts = file.name.split('.');
      const fileExtension = fileNameParts.pop();
      const baseFileName = fileNameParts.join('.');
      const uniqueFileName = `${baseFileName}-${randomHex}.${fileExtension}`;

      // Convert the processed image URL to a blob
      const response = await fetch(processedImageUrl);
      const blob = await response.blob();

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('player_images')
        .upload(`public/${uniqueFileName}`, blob);

      if (uploadError) {
        console.error('Error uploading file:', uploadError);
        setUploading(false);
        return;
      }

      const filePath = (uploadData as { path?: string; Key?: string })?.path || (uploadData as { path?: string; Key?: string })?.Key;
      if (!filePath) {
        console.error('File path is missing');
        setUploading(false);
        return;
      }

      const { data: publicUrlData, error: publicUrlError } = supabase.storage
        .from('player_images')
        .getPublicUrl(filePath);

      if (publicUrlError) {
        console.error('Error getting public URL:', publicUrlError);
        setUploading(false);
        return;
      }

      image_url = publicUrlData.publicUrl;
      setUploading(false);
    }

    try {
      const playerData = {
        ...formData,
        image_url: image_url,
        name__first: formData.is_placeholder ? 'TBD' : formData.name__first,
        name__last: formData.is_placeholder ? '' : formData.name__last,
        redshirt_status: formData.redshirt_status,
        year: formData.year,
        starting_season: isRecruit ? formData.starting_season : selectedYear,
        is_committed: Boolean(formData.is_committed),
        is_injured: Boolean(formData.is_injured),
        scenario: selectedScenario,
        compensation: formData.compensation,
      };
      console.log('Submitting player data:', playerData);

      await onSubmit(playerData);
      
      // Reset form data to initial state
      setFormData({
        name__first: '',
        name__last: '',
        position: '',
        image_url: '',
        elig_remaining: 1,
        year: 'FR',
        scholarship_perc: 1,
        compensation: 0,
        month: '00',
        redshirt_status: 'has',
        is_committed: 0,
        is_injured: 0,
        is_placeholder: false,
        starting_season: selectedYear,
        scenario: selectedScenario,
      });
      
      // Reset file-related states
      setFile(null);
      setProcessedImageUrl(null);
      
      onClose();
    } catch (error) {
      console.error('Unexpected error:', error);
    }
  };

  const years = getYearOptions();

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
     <div ref={modalRef} className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <button 
            onClick={handleRecruitToggle} 
            className={`${styles.recruitToggle} ${isRecruit ? styles.activeRecruit : ''}`}
          >
            {isRecruit ? 'Switch to Current Player' : 'Switch to Recruit'}
          </button>
          <button className={styles.closeButton} onClick={onClose}>&times;</button>
        </div>
        <div className={styles.modalBody}>
          <form onSubmit={handleSubmit}>
            {isRecruit && (
              <>
                <div className={styles.formRow}>
                  <div className={styles.formField}>
                    <label>Starting Season</label>
                    <select
                      name="starting_season"
                      value={formData.starting_season}
                      onChange={handleChange}
                      required
                    >
                      {years.map((year) => (
                        <option key={year} value={year}>
                          {year}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className={styles.formField}>
                    <label htmlFor="is_committed">Committed</label>
                    <select
                      id="is_committed"
                      name="is_committed"
                      value={formData.is_committed ? 'yes' : 'no'}
                      onChange={handleChange}
                    >
                      <option value="no">No</option>
                      <option value="yes">Yes</option>
                    </select>
                  </div>
                </div>
                <div className={styles.formRow}>
                  <div className={styles.formField}>
                    <label className={styles.inlineLabel}>
                      Assign Placeholder
                      <input
                        type="checkbox"
                        name="is_placeholder"
                        checked={formData.is_placeholder}
                        onChange={(e) => setFormData({ ...formData, is_placeholder: e.target.checked })}
                        style={{ marginLeft: '10px' }}
                      />
                    </label>
                  </div>
                </div>
              </>
            )}
            {!formData.is_placeholder && (
              <div className={styles.formRow}>
                <div className={styles.formField}>
                  <label>First Name</label>
                  <input type="text" name="name__first" value={formData.name__first} onChange={handleChange} required />
                </div>
                <div className={styles.formField}>
                  <label>Last Name</label>
                  <input type="text" name="name__last" value={formData.name__last} onChange={handleChange} required />
                </div>
              </div>
            )}
            <div className={styles.formRow}>
              <div className={styles.formField}>
                <label>Position</label>
                <select name="position" value={formData.position} onChange={handleChange} required>
                  <option value="">Select a position</option>
                  {positions.map((position) => (
                    <option key={position} value={position}>
                      {position}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className={styles.formRow}>
              <div className={styles.formField}>
                <label>{isRecruit ? 'Elig. Left on Arrival' : 'Eligibility Remaining'}</label>
                <select name="elig_remaining" value={formData.elig_remaining} onChange={handleChange} required>
                  {[1, 2, 3, 4, 5].map((value) => (
                    <option key={value} value={value}>{value}</option>
                  ))}
                </select>
              </div>
              <div className={styles.formField}>
                <label>{isRecruit ? 'Year on Arrival' : 'Year'}</label>
                <select name="year" value={formData.year} onChange={handleChange} required>
                  {['FR', 'SO', 'JR', 'SR', 'GR'].map((year) => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className={styles.formRow}>
            <div className={styles.formField}>
  <label>Scholarship %</label>
  <input
    type="text"
    name="scholarship_perc"
    value={((formData.scholarship_perc || 0) * 100).toFixed(0)}
    onChange={(e) => {
      const inputValue = e.target.value;
      if (inputValue === '' || /^\d{1,3}(\.\d*)?$/.test(inputValue)) {
        const value = Math.min(100, Math.max(0, parseFloat(inputValue) || 0));
        setFormData(prev => ({
          ...prev,
          scholarship_perc: value / 100
        }));
      }
    }}
    required
  />
</div>
              <div className={styles.formField}>
                <label>Redshirt Status</label>
                <select name="redshirt_status" value={formData.redshirt_status} onChange={handleChange} required>
                  <option value="has">Has Not Used</option>
                  <option value="used">Has Used</option>
                </select>
              </div>
            </div>
            <div className={styles.formRow}>
              <div className={styles.formField}>
                <label>Image</label>
                <input type="file" accept="image/*" onChange={handleFileChange} />
              </div>
            </div>
            {effectiveCompAccess && (
              <div className={styles.formRow}>
                <div className={styles.formField}>
                  <label>{isRecruit ? 'Compensation on Arrival' : 'Compensation'}</label>
                  <input
                    type="text"
                    name="compensation"
                    value={formatCurrency(formData.compensation)}
                    onChange={handleChange}
                  />
                </div>
              </div>
            )}
            <button type="submit" className={styles.submitButton} disabled={uploading}>
              {uploading ? 'Uploading...' : `Add ${isRecruit ? 'Recruit' : 'Player'}`}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Modal;
