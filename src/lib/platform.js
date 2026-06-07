import { Capacitor } from '@capacitor/core';

/**
 * Returns true if the app is running inside a native Capacitor shell (iOS/Android).
 */
export const isNative = () => Capacitor.isNativePlatform();

/**
 * Returns the current platform: 'ios', 'android', or 'web'.
 */
export const getPlatform = () => Capacitor.getPlatform();

/**
 * Returns true if running on iOS.
 */
export const isIOS = () => Capacitor.getPlatform() === 'ios';
