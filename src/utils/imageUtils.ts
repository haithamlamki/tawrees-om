/**
 * Image utility functions for handling base64 images
 */

/**
 * Validates if a string is a valid base64 image
 */
export const isValidBase64Image = (str: string): boolean => {
  if (!str) return false;
  
  // Check if it's a data URL format
  const base64Regex = /^data:image\/(png|jpeg|jpg|gif|webp|svg\+xml);base64,/;
  return base64Regex.test(str);
};

/**
 * Gets a placeholder image URL for missing images
 */
export const getPlaceholderImage = (): string => {
  return "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'%3E%3Crect fill='%23f0f0f0' width='100' height='100'/%3E%3Ctext fill='%23999' font-family='sans-serif' font-size='14' x='50%25' y='50%25' text-anchor='middle' dy='.3em'%3ENo Image%3C/text%3E%3C/svg%3E";
};

/**
 * Extracts dimensions from base64 image (returns estimated size)
 */
export const getBase64ImageSize = (base64: string): { width: number; height: number } | null => {
  try {
    const base64Data = base64.split(',')[1];
    if (!base64Data) return null;
    
    // Estimate size based on base64 length (rough approximation)
    const sizeInBytes = Math.ceil((base64Data.length * 3) / 4);
    
    // Assume square image, estimate dimensions
    const estimatedPixels = Math.sqrt(sizeInBytes / 3); // 3 bytes per pixel (RGB)
    const dimension = Math.floor(estimatedPixels);
    
    return { width: dimension, height: dimension };
  } catch {
    return null;
  }
};

/**
 * Compresses a base64 image by reducing quality
 * Note: This is client-side compression for display purposes
 */
export const compressBase64Image = (
  base64: string,
  maxWidth: number = 800,
  quality: number = 0.8
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;

      // Calculate new dimensions
      if (width > maxWidth) {
        height = (height * maxWidth) / width;
        width = maxWidth;
      }

      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);

      try {
        const compressed = canvas.toDataURL('image/jpeg', quality);
        resolve(compressed);
      } catch (error) {
        reject(error);
      }
    };

    img.onerror = () => {
      reject(new Error('Failed to load image'));
    };

    img.src = base64;
  });
};

/**
 * Opens image in a lightbox/modal for full-size viewing
 */
export const openImageLightbox = (base64: string, productName?: string) => {
  // Create overlay
  const overlay = document.createElement('div');
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.9);
    z-index: 9999;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    padding: 2rem;
  `;

  // Create image
  const img = document.createElement('img');
  img.src = base64;
  img.alt = productName || 'Product Image';
  img.style.cssText = `
    max-width: 90%;
    max-height: 90%;
    object-fit: contain;
    border-radius: 8px;
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
  `;

  // Create close text
  const closeText = document.createElement('div');
  closeText.textContent = 'Click anywhere to close';
  closeText.style.cssText = `
    position: absolute;
    top: 2rem;
    right: 2rem;
    color: white;
    font-size: 14px;
    background: rgba(0, 0, 0, 0.5);
    padding: 0.5rem 1rem;
    border-radius: 4px;
  `;

  overlay.appendChild(img);
  overlay.appendChild(closeText);
  document.body.appendChild(overlay);

  // Close on click
  overlay.addEventListener('click', () => {
    document.body.removeChild(overlay);
  });

  // Close on escape key
  const handleEscape = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      if (document.body.contains(overlay)) {
        document.body.removeChild(overlay);
      }
      document.removeEventListener('keydown', handleEscape);
    }
  };
  document.addEventListener('keydown', handleEscape);
};
