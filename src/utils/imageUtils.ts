// src/utils/imageUtils.ts
import axios from 'axios';

const REMOVE_BG_API_KEY = 'DRB1YD5Pnvn4JWNmMSQtT5nd';

export const isValidImageUrl = (url: string | null | undefined): boolean => {
  if (!url) return false;
  
  // Check if it's a relative path starting with "/"
  if (url.startsWith('/')) {
    return true;
  }

  // Check if it's an HTTP(S) URL
  if (url.startsWith('http://') || url.startsWith('https://')) {
    // Validate it's a proper URL
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  return false;
};
const MAX_MEGAPIXELS = 25; // Set to your desired limit (25 for paid remove.bg, 0.25 for free)

const calculateImageMegapixels = (file: File): Promise<number> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const megapixels = (img.width * img.height) / 1000000; // Convert to megapixels
      URL.revokeObjectURL(img.src); // Clean up
      resolve(megapixels);
    };
    img.src = URL.createObjectURL(file);
  });
};

const compressImage = (file: File, targetMegapixels: number): Promise<File> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      // Calculate scale factor to reach target megapixels
      const currentMegapixels = (img.width * img.height) / 1000000;
      const scaleFactor = Math.sqrt(targetMegapixels / currentMegapixels);
      
      // Calculate new dimensions
      const newWidth = Math.floor(img.width * scaleFactor);
      const newHeight = Math.floor(img.height * scaleFactor);
      
      // Create canvas and resize
      const canvas = document.createElement('canvas');
      canvas.width = newWidth;
      canvas.height = newHeight;
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }
      
      ctx.drawImage(img, 0, 0, newWidth, newHeight);
      
      // Convert back to file
      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error('Could not create blob'));
          return;
        }
        const newFile = new File([blob], file.name, {
          type: 'image/jpeg',
          lastModified: Date.now(),
        });
        
        URL.revokeObjectURL(img.src); // Clean up
        resolve(newFile);
      }, 'image/jpeg', 0.9); // 0.9 quality to maintain good image quality
    };
    
    img.onerror = () => {
      reject(new Error('Failed to load image'));
    };
    
    img.src = URL.createObjectURL(file);
  });
};

export const removeImageBackground = async (file: File): Promise<string | null> => {
  try {
    const megapixels = await calculateImageMegapixels(file);
    // console.log(`Original image size: ${megapixels.toFixed(2)} megapixels`);
    
    // Compress if larger than MAX_MEGAPIXELS
    let processedFile = file;
    if (megapixels > MAX_MEGAPIXELS) {
      processedFile = await compressImage(file, MAX_MEGAPIXELS);
      const newMegapixels = await calculateImageMegapixels(processedFile);
      // console.log(`Compressed image size: ${newMegapixels.toFixed(2)} megapixels`);
    }
    
    const formData = new FormData();
    formData.append('image_file', processedFile);
    formData.append('size', 'preview');
    
    const response = await axios.post('https://api.remove.bg/v1.0/removebg', formData, {
      headers: {
        'X-Api-Key': REMOVE_BG_API_KEY,
      },
      responseType: 'blob',
    });

    return URL.createObjectURL(response.data);
  } catch (error) {
    console.error('Error removing background:', error);
    return null;
  }
};