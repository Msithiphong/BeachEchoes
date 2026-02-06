import React, { useEffect } from 'react';
import { StyleSheet, View, Text, Alert } from 'react-native';
import { requestPermissions, sendLocalNotification } from '../components/Notifications';
import Button from '../components/Button';

export default function ButtonTests() {
  useEffect(() => {
    // Request permissions when the component mounts
    requestPermissions();
  }, []);

  const handlePress = async () => {
    try {
      await sendLocalNotification();
    } catch (error) {
      Alert.alert("Error", "Could not send notification.");
      console.error(error);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Notification Test</Text>
      <Button mode="contained" onPress={handlePress}>
        Send Notification
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 20,
    marginBottom: 20,
    fontWeight: 'bold',
  },
});