import React, { createContext, useContext, useState } from 'react';

const DraftPostContext = createContext(null);

export function DraftPostProvider({ children }) {
  const [localImageUri, setLocalImageUri] = useState(null);
  const [overlayText, setOverlayText] = useState('');
  const [mapX, setMapX] = useState(null);
  const [mapY, setMapY] = useState(null);

  function clearDraft() {
    setLocalImageUri(null);
    setOverlayText('');
    setMapX(null);
    setMapY(null);
  }

  return (
    <DraftPostContext.Provider
      value={{
        localImageUri,
        setLocalImageUri,
        overlayText,
        setOverlayText,
        mapX,
        setMapX,
        mapY,
        setMapY,
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
