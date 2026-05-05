import React, { createContext, useContext, useState } from 'react';
import { DEFAULT_POST_CATEGORY } from '../config/postCategories';

const DraftPostContext = createContext(null);

export function DraftPostProvider({ children }) {
  const [localImageUri, setLocalImageUri] = useState(null);
  const [overlayText, setOverlayText] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [mapX, setMapX] = useState(null);
  const [mapY, setMapY] = useState(null);
  const [capturedAt, setCapturedAt] = useState(null);
  const [category, setCategory] = useState(DEFAULT_POST_CATEGORY);
  
  // Location fields for "You Are Here" feature
  const [userLat, setUserLat] = useState(null);
  const [userLng, setUserLng] = useState(null);
  const [userMapX, setUserMapX] = useState(null);
  const [userMapY, setUserMapY] = useState(null);
  const [locationPermissionGranted, setLocationPermissionGranted] = useState(false);

  function clearDraft() {
    setLocalImageUri(null);
    setOverlayText('');
    setIsAnonymous(false);
    setMapX(null);
    setMapY(null);
    setCapturedAt(null);
    setCategory(DEFAULT_POST_CATEGORY);
    setUserLat(null);
    setUserLng(null);
    setUserMapX(null);
    setUserMapY(null);
    // Note: Don't clear locationPermissionGranted as it persists across posts
  }

  return (
    <DraftPostContext.Provider
      value={{
        localImageUri,
        setLocalImageUri,
        overlayText,
        setOverlayText,
        isAnonymous,
        setIsAnonymous,
        mapX,
        setMapX,
        mapY,
        setMapY,
        capturedAt,
        setCapturedAt,
        category,
        setCategory,
        userLat,
        setUserLat,
        userLng,
        setUserLng,
        userMapX,
        setUserMapX,
        userMapY,
        setUserMapY,
        locationPermissionGranted,
        setLocationPermissionGranted,
        clearDraft,
      }}
    >
      {children}
    </DraftPostContext.Provider>
  );
}

export function useDraftPost() {
  const ctx = useContext(DraftPostContext);
  if (!ctx) {
    throw new Error('useDraftPost must be used inside DraftPostProvider');
  }
  return ctx;
}
