// highlight-utils.jsx
import React from 'react';

export const HighlightMatch = (text, query) => {
  if (!query || !text) return text;
  
  try {
    const escapedQuery = query?.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${escapedQuery})`, 'gi');
    const parts = text.split(regex);
    
    return parts.map((part, i) =>
      part.toLowerCase() === query.toLowerCase() ? (
        <span key={i} className="bg-yellow-200 text-black">
          {part}
        </span>
      ) : (
        part
      )
    );
  } catch (error) {
    console.error('Error highlighting match:', error);
    return text;
  }
};