import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Centralizes local notification behavior for polling-driven and manual test notifications.
// Configure the notification handler.
// This MUST be defined at the top level, outside of any component or function.
// It determines how the app handles notifications received while the app is currently open (foreground).
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    // Show the alert banner/pop-up at the top of the screen
    shouldShowBanner: true,
    // Show the notification in the device's notification center/list
    shouldShowList: true,
    // Play the default notification sound
    shouldPlaySound: true,
    // Do not modify the app icon badge count
    shouldSetBadge: false,
  }),
});

/**
 * Requests necessary permissions for notifications.
 * Handles platform-specific logic (Web vs Android vs iOS).
 */
export async function requestPermissions() {
  // Web browsers handle notifications differently; exit early if on web.
  if (Platform.OS === 'web') return false; 

  // Android 8.0 (Oreo) and above requires "Notification Channels" to be defined.
  // This groups notifications so users can manage them (e.g., turn off "Marketing" but keep "Messages").
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX, // High priority (heads-up notification)
      vibrationPattern: [0, 250, 250, 250], // Vibration pattern
      lightColor: '#FF231F7C', // LED color (if supported by device)
    });
  }

  // Check the current permission status
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  // If permissions are not already granted, ask the user for them.
  // This is particularly important for Android 13+ and all iOS versions.
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  // If the user still denied permission after the request, alert them and return failure.
  if (finalStatus !== 'granted') {
    alert('Permission not granted!');
    return false;
  }
  return true; // Permissions successfully granted
}

/**
 * Triggers an immediate local notification on the device.
 */
export async function sendLocalNotification() {
  // Simple fallback for web environments since local notifications work differently there
  if (Platform.OS === 'web') {
    alert("Test Notification (Web): Beep Boop!");
    return;
  }

  // Import the logo image
  const logo = require('../assets/images/logo.png');

  // Schedule the notification to appear using Expo's scheduler
  await Notifications.scheduleNotificationAsync({
    content: {
      title: "BeachEchoes",
      body: "It works! This is a local notification.",
      sound: true, // Enable sound
      icon: logo, // Set the notification icon
    },
    // The trigger determines *when* the notification fires.
    // setting trigger to 'null' causes it to fire immediately.
    trigger: null, 
  });
}

/**
 * Schedules a custom local notification with specified title, body, and optional data.
 * @param {string} title - Notification title
 * @param {string} body - Notification body text
 * @param {object} data - Optional data to include with the notification
 */
export async function scheduleCustomNotification(title, body, data = {}) {
  // Simple fallback for web environments
  if (Platform.OS === 'web') {
    alert(`${title}: ${body}`);
    return;
  }

  try {
    const logo = require('../assets/images/logo.png');
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: true,
        data,
        icon: logo, // Set the notification icon
      },
      trigger: null, // Send immediately
    });
  } catch (err) {
    console.error('Failed to schedule custom notification:', err);
    throw err;
  }
}
