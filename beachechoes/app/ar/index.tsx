// app/ar/index.tsx
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView } from 'react-native';
import ScanPrompt from '../../src/ar/components/ScanPrompt';
import TrackingBanner from '../../src/ar/components/TrackingBanner';

export default function ARNavigationShell() {
  // Navigation State
  const [activeTab, setActiveTab] = useState<'ar' | 'fallback'>('ar');

  // Mock AR Session State (Searching for floor vs. Detected)
  const [arStatus, setArStatus] = useState<'searching' | 'detected' | 'degraded'>('searching');

  return (
    <SafeAreaView style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>BeachEchoes</Text>
        {/* Hidden debug button to toggle states for screen recording */}
        {activeTab === 'ar' && (
          <TouchableOpacity
            style={styles.debugButton}
            onPress={() => setArStatus(prev => prev === 'searching' ? 'detected' : 'searching')}
          >
            <Text style={styles.debugText}>Toggle State</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* MAIN CONTENT AREA */}
      <View style={styles.content}>
        {activeTab === 'ar' ? (
          <View style={styles.mockCameraView}>
            {/* Displaying your UI components over the "Camera" */}
            <ScanPrompt status={arStatus} />
            {arStatus === 'degraded' && <TrackingBanner />}
            <Text style={styles.cameraPlaceholderText}>[ Mock Camera Feed ]</Text>
          </View>
        ) : (
          <View style={styles.mockFallbackView}>
            <Text style={styles.fallbackTitle}>Echoes Nearby (Map/List)</Text>
            <View style={styles.mockListItem}><Text>Echo from CSULB Library...</Text></View>
            <View style={styles.mockListItem}><Text>Echo near the Pyramid...</Text></View>
          </View>
        )}
      </View>

      {/* BOTTOM NAVIGATION */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'ar' && styles.activeTab]}
          onPress={() => setActiveTab('ar')}
        >
          <Text style={[styles.tabText, activeTab === 'ar' && styles.activeTabText]}>AR View</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'fallback' && styles.activeTab]}
          onPress={() => setActiveTab('fallback')}
        >
          <Text style={[styles.tabText, activeTab === 'fallback' && styles.activeTabText]}>List View</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f0f0' },
  header: { padding: 16, backgroundColor: '#ffffff', borderBottomWidth: 1, borderColor: '#e0e0e0', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#ffb71b' }, // CSULB Gold
  debugButton: { padding: 8, backgroundColor: '#eee', borderRadius: 4 },
  debugText: { fontSize: 12, color: '#666' },
  content: { flex: 1 },
  mockCameraView: { flex: 1, backgroundColor: '#333', justifyContent: 'center', alignItems: 'center' },
  cameraPlaceholderText: { color: '#666', marginTop: 100 },
  mockFallbackView: { flex: 1, padding: 20, backgroundColor: '#fff' },
  fallbackTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 16 },
  mockListItem: { padding: 16, backgroundColor: '#f9f9f9', borderRadius: 8, marginBottom: 12, borderWidth: 1, borderColor: '#eee' },
  tabBar: { flexDirection: 'row', backgroundColor: '#fff', borderTopWidth: 1, borderColor: '#e0e0e0', paddingBottom: 20 },
  tab: { flex: 1, paddingVertical: 16, alignItems: 'center' },
  activeTab: { borderTopWidth: 3, borderColor: '#ffb71b' },
  tabText: { fontSize: 16, color: '#666' },
  activeTabText: { color: '#000', fontWeight: 'bold' }
});