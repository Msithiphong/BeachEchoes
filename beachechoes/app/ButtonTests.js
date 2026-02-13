import { useEffect } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
// Import custom notification helper functions
import { requestPermissions, sendLocalNotification } from '../components/Notifications';
// Import custom Button component
import Button from '../components/Button';

/**
 * ButtonTests Component
 * * This component serves as a test screen to verify local notification functionality.
 * It handles permission requests on mount and provides a UI to trigger a notification.
 */
export default function ButtonTests() {
  
  // useEffect hook to handle component lifecycle side effects
  useEffect(() => {
    // Request notification permissions from the user as soon as the component mounts
    requestPermissions();
  }, []); // Empty dependency array ensures this runs only once

  /**
   * Handles the button press event.
   * Attempts to send a local notification and manages potential errors.
   */
  const handlePress = async () => {
    try {
      // Asynchronously trigger the local notification
      await sendLocalNotification();
    } catch (error) {
      // If notification fails (e.g., permissions denied), show an alert to the user
      Alert.alert("Error", "Could not send notification.");
      // Log the error details to the console for debugging
      console.error(error);
    }
  };

  return (
    // Main container view
    <View style={styles.container}>
      {/* Title text for the test screen */}
      <Text style={styles.title}>Notification Test</Text>
      
      {/* Custom Button component configured to trigger the handlePress function */}
      <Button mode="contained" onPress={handlePress}>
        Send Notification
      </Button>
    </View>
  );
}

// Styling definitions for the component
const styles = StyleSheet.create({
  container: {
    flex: 1, // Take up full available screen space
    backgroundColor: '#fff',
    alignItems: 'center', // Center children horizontally
    justifyContent: 'center', // Center children vertically
    padding: 20,
  },
  title: {
    fontSize: 20,
    marginBottom: 20, // Add spacing between title and button
    fontWeight: 'bold',
  },
});