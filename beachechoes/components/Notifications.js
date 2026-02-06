import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// 1. Setup the handler. This MUST be outside any function.
// This tells the app: "If a notification comes in while the app is open, show it!"
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function requestPermissions() {
  if (Platform.OS === 'web') return false; // Web doesn't support this library the same way

  // REQUIRED: Android 8.0+ needs a notification channel
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

  // 2. Check existing permissions
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  // 3. If not granted, ask for them (Required for Android 13+)
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    alert('Permission not granted!');
    return false;
  }
  return true;
}

export async function sendLocalNotification() {
  if (Platform.OS === 'web') {
    alert("Test Notification (Web): Beep Boop!");
    return;
  }

  // 4. Schedule the local notification
  await Notifications.scheduleNotificationAsync({
    content: {
      title: "BeachEchoes",
      body: "It works! This is a local notification.",
      sound: true,
    },
    trigger: null, // null = fire immediately
  });
}