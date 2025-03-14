// utils/deviceUtils.ts

/**
 * Check if the current device is a mobile device
 */
export const isMobileDevice = (): boolean => {
  return /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
};

/**
 * Get the appropriate scale factor based on device type
 */
export const getScale = (): number => {
  return isMobileDevice() ? 0.7 : 1.0;
};

/**
 * Get segment counts based on device type
 */
export const getSegmentCounts = () => {
  return {
    segments1: isMobileDevice() ? 90 : 140,
    segments2: isMobileDevice() ? 18 : 32,
  };
};

/**
 * Get default bloom settings based on device type
 */
export const getBloomDefaults = () => {
  return {
    strength: 0.5,
    radius: isMobileDevice() ? 0.1 : 0.25,
    threshold: 0.2,
  };
};

/**
 * Get default camera position based on device type
 */
export const getDefaultCameraPosition = () => {
  return isMobileDevice() ? [0, 8, 18] : [0, 1, 14];
};

/**
 * Get base particle size based on device type
 */
export const getParticleBaseSize = () => {
  return isMobileDevice() ? 40 : 80;
};

/**
 * Get animation speed factor based on device type
 */
export const getAnimationSpeedFactor = () => {
  return isMobileDevice() ? 0.12 : 0.08;
};
