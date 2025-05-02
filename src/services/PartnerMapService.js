import React from 'react'; // Add this import for React

// Mock data for partner locations
const partnerLocations = [
  {
    id: '1',
    name: 'Adera Express - Bole',
    address: 'Bole Road, Addis Ababa',
    coordinates: [38.7895, 9.0105], // [longitude, latitude]
  },
  {
    id: '2',
    name: 'Adera Express - Piassa',
    address: 'Piassa, Addis Ababa',
    coordinates: [38.7468, 9.0342],
  },
  {
    id: '3',
    name: 'Adera Express - Megenagna',
    address: 'Megenagna, Addis Ababa',
    coordinates: [38.8013, 9.0205],
  },
  // Add more partner locations as needed
];

// Function to fetch partner locations
export const fetchPartnerLocations = async () => {
  // In a real app, this would be an API call
  // For now, we'll just return the mock data
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(partnerLocations);
    }, 500);
  });
};