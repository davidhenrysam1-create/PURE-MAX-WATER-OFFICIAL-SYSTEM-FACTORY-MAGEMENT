/**
 * Automatic Canvas Image Compressor for Pure Max Factory OS
 * Automatically downscales images (max 800px width/height, 0.7 JPEG quality)
 * to prevent QuotaExceededError and browser memory overflow.
 */

export interface CompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  mimeType?: string;
}

const DEFAULT_OPTIONS: Required<CompressionOptions> = {
  maxWidth: 800,
  maxHeight: 800,
  quality: 0.7,
  mimeType: 'image/jpeg',
};

/**
 * Compresses an image File, Blob, or base64 Data URL using HTML5 Canvas.
 * Returns a compressed base64 JPEG data URL.
 */
export async function compressImage(
  input: File | Blob | string,
  options?: CompressionOptions
): Promise<string> {
  const opts: Required<CompressionOptions> = { ...DEFAULT_OPTIONS, ...options };

  return new Promise((resolve) => {
    try {
      // If input is SVG or already small data, return as-is or handle safely
      if (typeof input === 'string' && input.startsWith('data:image/svg+xml')) {
        return resolve(input);
      }
      if (input instanceof File && input.type === 'image/svg+xml') {
        const reader = new FileReader();
        reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '');
        reader.onerror = () => resolve('');
        reader.readAsDataURL(input);
        return;
      }

      // Convert File/Blob to Object URL or use data URL string
      let src = '';
      let isBlobUrl = false;

      if (typeof input === 'string') {
        src = input;
      } else if (input && typeof input === 'object' && ('size' in input || 'type' in input)) {
        src = URL.createObjectURL(input as Blob);
        isBlobUrl = true;
      } else {
        return resolve('');
      }

      const img = new Image();
      img.crossOrigin = 'anonymous';

      const cleanup = () => {
        if (isBlobUrl && src) {
          URL.revokeObjectURL(src);
        }
      };

      img.onload = () => {
        try {
          let { width, height } = img;
          const { maxWidth, maxHeight, quality, mimeType } = opts;

          // Maintain aspect ratio while bounding within maxWidth & maxHeight
          if (width > maxWidth || height > maxHeight) {
            if (width / height > maxWidth / maxHeight) {
              height = Math.round((height * maxWidth) / width);
              width = maxWidth;
            } else {
              width = Math.round((width * maxHeight) / height);
              height = maxHeight;
            }
          }

          // Ensure minimum valid dimensions
          width = Math.max(1, width);
          height = Math.max(1, height);

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            cleanup();
            return resolve(src);
          }

          // Clear and draw image with smoothing
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, width, height);

          const compressedDataUrl = canvas.toDataURL(mimeType, quality);
          cleanup();
          resolve(compressedDataUrl);
        } catch (err) {
          console.warn('Canvas image compression failed, falling back safely:', err);
          cleanup();
          resolve(typeof input === 'string' ? input : src);
        }
      };

      img.onerror = (err) => {
        console.warn('Image load error during compression:', err);
        cleanup();
        resolve(typeof input === 'string' ? input : '');
      };

      img.src = src;
    } catch (e) {
      console.warn('compressImage caught exception:', e);
      resolve(typeof input === 'string' ? input : '');
    }
  });
}

/**
 * Helper to validate file type and trigger gentle compression notice.
 */
export function isImageFile(file: File): boolean {
  return file.type.startsWith('image/') || /\.(jpg|jpeg|png|webp|gif|svg)$/i.test(file.name);
}
