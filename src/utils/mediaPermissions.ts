/**
 * Device Media Permissions Utility
 * Handles Web API Camera & Microphone access requests (navigator.mediaDevices.getUserMedia)
 * Supports live camera capture for profile pictures & chat attachments, and audio for voice notes & WebRTC calls.
 */

export interface PermissionStatusResult {
  camera: 'granted' | 'denied' | 'prompt' | 'unsupported';
  microphone: 'granted' | 'denied' | 'prompt' | 'unsupported';
}

/**
 * Check existing browser permission status for camera and microphone
 */
export async function checkMediaPermissions(): Promise<PermissionStatusResult> {
  const result: PermissionStatusResult = {
    camera: 'unsupported',
    microphone: 'unsupported',
  };

  if (typeof navigator === 'undefined' || !navigator.mediaDevices) {
    return result;
  }

  if (typeof navigator.permissions !== 'undefined' && navigator.permissions.query) {
    try {
      const camStatus = await navigator.permissions.query({ name: 'camera' as any });
      result.camera = camStatus.state;
      camStatus.onchange = () => {
        result.camera = camStatus.state;
      };
    } catch {
      result.camera = 'prompt';
    }

    try {
      const micStatus = await navigator.permissions.query({ name: 'microphone' as any });
      result.microphone = micStatus.state;
      micStatus.onchange = () => {
        result.microphone = micStatus.state;
      };
    } catch {
      result.microphone = 'prompt';
    }
  } else {
    result.camera = 'prompt';
    result.microphone = 'prompt';
  }

  return result;
}

/**
 * Explicitly prompt user for Camera access and return the active MediaStream
 */
export async function requestCameraAccess(constraints?: MediaStreamConstraints): Promise<{ stream: MediaStream | null; error: string | null }> {
  if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
    return { stream: null, error: 'Camera access is not supported by your browser or environment.' };
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia(
      constraints || {
        video: {
          facingMode: 'user',
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      }
    );
    return { stream, error: null };
  } catch (err: any) {
    console.warn('Camera permission request denied/failed:', err);
    let msg = 'Camera permission was denied. Please allow camera access in your browser settings.';
    if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
      msg = 'No camera hardware found on this device.';
    } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
      msg = 'Camera is already in use by another application.';
    }
    return { stream: null, error: msg };
  }
}

/**
 * Explicitly prompt user for Microphone access and return the active MediaStream
 */
export async function requestMicrophoneAccess(constraints?: MediaStreamConstraints): Promise<{ stream: MediaStream | null; error: string | null }> {
  if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
    return { stream: null, error: 'Microphone access is not supported by your browser or environment.' };
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia(
      constraints || {
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      }
    );
    return { stream, error: null };
  } catch (err: any) {
    console.warn('Microphone permission request denied/failed:', err);
    let msg = 'Microphone permission was denied. Please allow microphone access in your browser settings.';
    if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
      msg = 'No microphone hardware found on this device.';
    } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
      msg = 'Microphone is already in use by another application.';
    }
    return { stream: null, error: msg };
  }
}

/**
 * Capture a photo frame from a video element to a base64 Data URL
 */
export function captureFrameFromVideo(videoElement: HTMLVideoElement, mimeType: string = 'image/jpeg'): string | null {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = videoElement.videoWidth || 640;
    canvas.height = videoElement.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL(mimeType, 0.88);
  } catch (e) {
    console.error('Frame capture error:', e);
    return null;
  }
}
