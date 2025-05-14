import React from 'react'; // Add this import for React
import { supabase } from './supabase';

// Function to fetch partner locations
export const fetchPartnerLocations = async () => {
  try {
    const { data: partners, error } = await supabase
      .from('partner_locations')
      .select(`
        id,
        business_name,
        address,
        coordinates,
        working_hours,
        is_facility,
        is_active,
        verification_status
      `)
      .eq('is_active', true);

    if (error) {
      console.error('Error fetching partner locations:', error);
      return [];
    }

    return partners || [];
  } catch (error) {
    console.error('Error in fetchPartnerLocations:', error);
    return [];
  }
};