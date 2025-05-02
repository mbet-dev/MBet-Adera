import React from 'react';

// Web fallback for Map component
export function Map() {
  return (
    <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
      <p>Map is not supported on web</p>
    </div>
  );
}
