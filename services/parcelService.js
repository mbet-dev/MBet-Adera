/**
 * Parcel Service - Functions for handling parcel data and operations
 * NOTE: This service uses the Supabase client to communicate with the database
 */

import { supabase } from '@/lib/supabase';

export const parcelService = {
  /**
   * Get all parcels for the current user - Minimal version to avoid type issues
   */
  async getParcels(userId) {
    console.log(`[parcelService.getParcels] Fetching parcels for user: ${userId}`);
    
    try {
      // Use a minimal query that just gets IDs first to avoid type mismatches
      const { data: parcelIds, error: idError } = await supabase
        .from('parcels')
        .select('id')
        .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
        .order('created_at', { ascending: false });

      if (idError) {
        console.error('Error fetching parcel IDs:', idError);
        return [];
      }

      if (!parcelIds || parcelIds.length === 0) {
        console.log('No parcel IDs found for this user');
        return [];
      }

      console.log(`Found ${parcelIds?.length || 0} parcel IDs`);
      
      // Build array of parcels by fetching each one individually to avoid joined query issues
      const parcelsWithAddresses = await Promise.all(parcelIds.map(async ({ id }) => {
        try {
          // Get basic parcel data
          const { data: parcel, error: parcelError } = await supabase
            .from('parcels')
            .select('id, tracking_code, package_size, status, is_fragile, weight, price, package_description, pickup_address_id, dropoff_address_id, sender_id, receiver_id, created_at, updated_at')
            .eq('id', id)
            .single();
          
          if (parcelError || !parcel) {
            console.warn(`Error or no data fetching parcel ${id}:`, parcelError);
            return null;
          }
          
          // Fetch pickup address if present
          let pickupAddress = null;
          if (parcel.pickup_address_id) {
            try {
              const { data: pickupData } = await supabase
                .from('addresses')
                .select('id, address_line, city, latitude, longitude, created_at, updated_at')
                .eq('id', parcel.pickup_address_id)
                .single();
              
              if (pickupData) {
                pickupAddress = {
                  ...pickupData,
                  partner_id: userId // Use user ID as default partner_id
                };
              }
            } catch (addrError) {
              console.warn(`Error fetching pickup address ${parcel.pickup_address_id}:`, addrError);
            }
          }
          
          // Fetch dropoff address if present
          let dropoffAddress = null;
          if (parcel.dropoff_address_id) {
            try {
              const { data: dropoffData } = await supabase
                .from('addresses')
                .select('id, address_line, city, latitude, longitude, created_at, updated_at')
                .eq('id', parcel.dropoff_address_id)
                .single();
              
              if (dropoffData) {
                dropoffAddress = {
                  ...dropoffData,
                  partner_id: userId // Use user ID as default partner_id
                };
              }
            } catch (addrError) {
              console.warn(`Error fetching dropoff address ${parcel.dropoff_address_id}:`, addrError);
            }
          }
          
          return {
            ...parcel,
            pickup_address: pickupAddress,
            dropoff_address: dropoffAddress,
            // Ensure consistent types for these fields
            tracking_code: parcel.tracking_code || '',
            status: parcel.status || 'pending',
            package_size: parcel.package_size || ''
          };
        } catch (error) {
          console.warn(`Error processing parcel ${id}:`, error);
          return null;
        }
      }));

      // Filter out any null parcels from failed fetches
      const validParcels = parcelsWithAddresses.filter(p => p !== null);
      console.log(`Successfully processed ${validParcels.length} parcels`);
      
      return validParcels;
    } catch (error) {
      console.error('Error in getParcels:', error);
      // Return empty array instead of throwing to prevent fatal errors
      return [];
    }
  },

  /**
   * Get a single parcel by ID with all associated data
   */
  async getParcelById(parcelId, userId) {
    console.log(`[parcelService.getParcelById] Fetching parcel ${parcelId} for user: ${userId}`);
    
    try {
      if (!parcelId || !userId) {
        console.log("Missing parcelId or userId parameter");
        return null;
      }
      
      // First verify the user has access to this parcel
      const { data: accessCheck, error: accessError } = await supabase
        .from('parcels')
        .select('id')
        .eq('id', parcelId)
        .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
        .maybeSingle();
      
      if (accessError) {
        console.error('Error checking parcel access:', accessError);
        return null;
      }
      
      if (!accessCheck) {
        console.log(`Access denied: User ${userId} does not have access to parcel ${parcelId}`);
        return null;
      }
      
      console.log(`Access verified for parcel ${parcelId}`);
      
      // Now fetch all the required parcel data
      const { data, error } = await supabase
        .from('parcels')
        .select(`
          id, tracking_code, package_size, status, is_fragile, weight,
          price, package_description, pickup_address_id, dropoff_address_id,
          sender_id, receiver_id, created_at, updated_at
        `)
        .eq('id', parcelId)
        .single();

      if (error) {
        console.error('Error fetching parcel by ID:', error);
        return null;
      }
      
      if (!data) {
        console.log(`No parcel found with ID: ${parcelId}`);
        return null;
      }
      
      // Safely handle null/undefined values
      const parcel = {
        ...data,
        tracking_code: data.tracking_code || '',
        status: data.status || 'pending',
        package_size: data.package_size || '',
        package_description: data.package_description || '',
        is_fragile: !!data.is_fragile,
        weight: data.weight || 0,
        price: data.price || 0
      };
      
      // Fetch pickup address if present
      let pickupAddress = null;
      if (parcel.pickup_address_id) {
        try {
          const { data: pickupData, error: pickupError } = await supabase
            .from('addresses')
            .select('id, address_line, city, latitude, longitude, created_at, updated_at')
            .eq('id', parcel.pickup_address_id)
            .single();
          
          if (pickupError) {
            console.warn(`Error fetching pickup address ${parcel.pickup_address_id}:`, pickupError);
          } else if (pickupData) {
            pickupAddress = {
              ...pickupData,
              partner_id: userId, // Add required partner_id field
              address_line: pickupData.address_line || 'Unknown address',
              city: pickupData.city || 'Unknown city',
              latitude: pickupData.latitude || 0,
              longitude: pickupData.longitude || 0
            };
          }
        } catch (addrError) {
          console.warn(`Exception fetching pickup address ${parcel.pickup_address_id}:`, addrError);
        }
      }
      
      // Fetch dropoff address if present
      let dropoffAddress = null;
      if (parcel.dropoff_address_id) {
        try {
          const { data: dropoffData, error: dropoffError } = await supabase
            .from('addresses')
            .select('id, address_line, city, latitude, longitude, created_at, updated_at')
            .eq('id', parcel.dropoff_address_id)
            .single();
          
          if (dropoffError) {
            console.warn(`Error fetching dropoff address ${parcel.dropoff_address_id}:`, dropoffError);
          } else if (dropoffData) {
            dropoffAddress = {
              ...dropoffData,
              partner_id: userId, // Add required partner_id field
              address_line: dropoffData.address_line || 'Unknown address',
              city: dropoffData.city || 'Unknown city',
              latitude: dropoffData.latitude || 0,
              longitude: dropoffData.longitude || 0
            };
          }
        } catch (addrError) {
          console.warn(`Exception fetching dropoff address ${parcel.dropoff_address_id}:`, addrError);
        }
      }
      
      // Create complete parcel object with addresses
      const completeParcel = {
        ...parcel,
        pickup_address: pickupAddress,
        dropoff_address: dropoffAddress
      };
      
      console.log(`Successfully fetched complete parcel: ${parcelId}`);
      return completeParcel;
    } catch (error) {
      console.error('Error in getParcelById:', error);
      return null;
    }
  },

  /**
   * Get paginated parcels with filtering options - Reliable basic version
   */
  async getPaginatedParcels(userId, options = {}) {
    const { status = 'all', limit = 20, page = 1, sortBy = 'created_at', sortDirection = 'desc' } = options;
    console.log(`[parcelService.getPaginatedParcels] Fetching parcels for user: ${userId} with options:`, options);
    
    try {
      // Special case for active filter - use the specialized function that's known to work
      if (status === 'active') {
        console.log('[parcelService.getPaginatedParcels] Using getActiveDeliveries for active filter');
        const activeParcels = await this.getActiveDeliveries(userId);
        
        // Handle pagination in memory
        const totalCount = activeParcels.length;
        const startIndex = Math.min((page - 1) * limit, Math.max(0, totalCount - 1));
        const endIndex = Math.min(startIndex + limit, totalCount);
        
        // If there are parcels but the requested page is beyond available data
        if (totalCount > 0 && startIndex >= totalCount) {
          // Return the last page instead
          const lastPageStart = Math.max(0, Math.floor((totalCount - 1) / limit) * limit);
          const paginatedParcels = activeParcels.slice(lastPageStart, totalCount);
          console.log(`Returning last page with ${paginatedParcels.length} active parcels`);
          return {
            parcels: paginatedParcels,
            totalCount
          };
        }
        
        // Normal case - return the requested page
        const paginatedParcels = activeParcels.slice(startIndex, endIndex);
        console.log(`Returning page ${page} with ${paginatedParcels.length} active parcels`);
        return {
          parcels: paginatedParcels,
          totalCount
        };
      }
      
      // For delivered or cancelled filters, use normal IDs approach
      // First get matching IDs to avoid type mismatches
      let query = supabase
        .from('parcels')
        .select('id')
        .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`);
      
      // Apply status filter if needed
      if (status !== 'all') {
        query = query.eq('status', status);
      }
      
      // Apply sorting
      query = query.order(sortBy, { ascending: sortDirection === 'asc' });
      
      // Get all IDs (we'll handle pagination in memory to avoid pagination errors)
      const { data: allIds, error: idsError } = await query;
      
      if (idsError) {
        console.error('Error fetching parcel IDs:', idsError);
        return { parcels: [], totalCount: 0 };
      }
      
      const totalCount = allIds?.length || 0;
      console.log(`Found ${totalCount} total parcel IDs matching criteria for ${status} filter`);
      
      if (totalCount === 0) {
        return { parcels: [], totalCount: 0 };
      }
      
      // Calculate pagination in memory
      const startIndex = Math.min((page - 1) * limit, Math.max(0, totalCount - 1));
      const endIndex = Math.min(startIndex + limit, totalCount);
      
      // Safety check to ensure valid indices
      if (startIndex >= totalCount) {
        console.log(`Requested page ${page} exceeds available data (${totalCount} items)`);
        // Return last page instead of empty result
        const lastPageStart = Math.max(0, Math.floor((totalCount - 1) / limit) * limit);
        const paginatedIds = allIds.slice(lastPageStart, totalCount);
        const parcels = await this._fetchParcelsById(paginatedIds, userId);
        return { parcels, totalCount };
      }
      
      // Get the paginated subset of IDs
      const paginatedIds = allIds.slice(startIndex, endIndex);
      console.log(`Paginated to ${paginatedIds.length} IDs from index ${startIndex} to ${endIndex-1}`);
      
      // Fetch the parcels with these IDs
      const validParcels = await this._fetchParcelsById(paginatedIds, userId);
      console.log(`Successfully processed ${validParcels.length} paginated parcels for ${status} filter`);
      
      return {
        parcels: validParcels,
        totalCount
      };
    } catch (error) {
      console.error('Error in getPaginatedParcels:', error);
      return {
        parcels: [],
        totalCount: 0
      };
    }
  },

  /**
   * Helper method to fetch parcels by ID array
   * Used by multiple methods to avoid code duplication
   * @private
   */
  async _fetchParcelsById(parcelIds, userId) {
    try {
      // Fetch parcels in parallel with a concurrency limit to avoid overloading the server
      const BATCH_SIZE = 5; // Process 5 parcels at a time
      let validParcels = [];
      
      for (let i = 0; i < parcelIds.length; i += BATCH_SIZE) {
        const batch = parcelIds.slice(i, i + BATCH_SIZE);
        const batchResults = await Promise.all(batch.map(async ({ id }) => {
          try {
            // Get basic parcel data
            const { data: parcel, error: parcelError } = await supabase
              .from('parcels')
              .select('id, tracking_code, package_size, status, is_fragile, weight, price, package_description, pickup_address_id, dropoff_address_id, sender_id, receiver_id, created_at, updated_at')
              .eq('id', id)
              .single();
            
            if (parcelError || !parcel) {
              console.warn(`Error or no data fetching parcel ${id}:`, parcelError);
              return null;
            }
            
            // Fetch pickup address if present
            let pickupAddress = null;
            if (parcel.pickup_address_id) {
              try {
                const { data: pickupData } = await supabase
                  .from('addresses')
                  .select('id, address_line, city, latitude, longitude, created_at, updated_at')
                  .eq('id', parcel.pickup_address_id)
                  .single();
                
                if (pickupData) {
                  pickupAddress = {
                    ...pickupData,
                    partner_id: userId // Use user ID as default partner_id
                  };
                }
              } catch (addrError) {
                console.warn(`Error fetching pickup address ${parcel.pickup_address_id}:`, addrError);
              }
            }
            
            // Fetch dropoff address if present
            let dropoffAddress = null;
            if (parcel.dropoff_address_id) {
              try {
                const { data: dropoffData } = await supabase
                  .from('addresses')
                  .select('id, address_line, city, latitude, longitude, created_at, updated_at')
                  .eq('id', parcel.dropoff_address_id)
                  .single();
                
                if (dropoffData) {
                  dropoffAddress = {
                    ...dropoffData,
                    partner_id: userId // Use user ID as default partner_id
                  };
                }
              } catch (addrError) {
                console.warn(`Error fetching dropoff address ${parcel.dropoff_address_id}:`, addrError);
              }
            }
            
            return {
              ...parcel,
              pickup_address: pickupAddress,
              dropoff_address: dropoffAddress,
              // Ensure consistent types for these fields
              tracking_code: parcel.tracking_code || '',
              status: parcel.status || 'pending',
              package_size: parcel.package_size || ''
            };
          } catch (error) {
            console.warn(`Error processing parcel ${id}:`, error);
            return null;
          }
        }));
        
        // Add valid parcels from this batch to our results
        validParcels = [...validParcels, ...batchResults.filter(p => p !== null)];
      }
      
      return validParcels;
    } catch (error) {
      console.error('Error in _fetchParcelsById:', error);
      return [];
    }
  },

  /**
   * Search parcels by tracking code or description
   */
  async searchParcels(userId, query) {
    console.log(`[parcelService.searchParcels] Searching parcels for user: ${userId} with query: ${query}`);
    
    try {
      if (!query.trim()) return [];
      
      // Use ILIKE for case-insensitive search
      const { data, error } = await supabase
        .from('parcels')
        .select(`
          *,
          pickup_address:pickup_address_id(
            id, address_line, city, latitude, longitude, created_at, updated_at
          ),
          dropoff_address:dropoff_address_id(
            id, address_line, city, latitude, longitude, created_at, updated_at
          )
        `)
        .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
        .or(`tracking_code.ilike.%${query}%,package_description.ilike.%${query}%`);
      
      if (error) {
        console.error('Error searching parcels:', error);
        throw error;
      }
      
      // Process the result to add missing fields needed by the Parcel type
      const processedParcels = (data || []).map(p => {
        // Add partner_id to addresses
        if (p.pickup_address) {
          p.pickup_address.partner_id = p.pickup_address.partner_id || userId;
        }
        if (p.dropoff_address) {
          p.dropoff_address.partner_id = p.dropoff_address.partner_id || userId;
        }
        return p;
      });
      
      console.log(`Found ${processedParcels.length} parcels matching query: ${query}`);
      return processedParcels;
    } catch (error) {
      console.error('Error in searchParcels:', error);
      throw error;
    }
  },

  /**
   * Get parcel statistics
   */
  async getParcelStatistics(userId) {
    console.log(`[parcelService.getParcelStatistics] Fetching statistics for user: ${userId}`);
    
    try {
      // First get stats for active parcels which is a reliable request
      const activeDeliveriesPromise = this.getActiveDeliveries(userId)
        .then(parcels => parcels.length)
        .catch(() => 0);
      
      // Then get counts for delivered parcels
      const deliveredCountPromise = supabase
        .from('parcels')
        .select('id', { count: 'exact' })
        .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
        .eq('status', 'delivered')
        .then(({ count }) => count || 0)
        .catch(() => 0);
      
      // Then get counts for cancelled parcels
      const cancelledCountPromise = supabase
        .from('parcels')
        .select('id', { count: 'exact' })
        .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
        .eq('status', 'cancelled')
        .then(({ count }) => count || 0)
        .catch(() => 0);
      
      // Wait for all counts in parallel for better performance
      const [active, delivered, cancelled] = await Promise.all([
        activeDeliveriesPromise,
        deliveredCountPromise,
        cancelledCountPromise
      ]);
      
      // Calculate total from the individual counts
      const total = active + delivered + cancelled;
      
      const stats = {
        total,
        active,
        delivered,
        cancelled
      };
      
      console.log('Parcel statistics:', stats);
      return stats;
    } catch (error) {
      console.error('Error in getParcelStatistics:', error);
      // Return default values instead of throwing
      return {
        total: 0,
        active: 0,
        delivered: 0,
        cancelled: 0
      };
    }
  },

  /**
   * Get active deliveries for display on home screen - Reliable fallback for most views
   */
  async getActiveDeliveries(userId) {
    console.log(`[parcelService.getActiveDeliveries] Fetching active deliveries for user: ${userId}`);
    
    try {
      // Get active deliveries directly from parcels_with_addresses view
      const { data: activeDeliveries, error } = await supabase
        .from('parcels_with_addresses')
        .select('*')
        .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
        .in('status', ['pending', 'accepted', 'picked_up', 'in_transit'])
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching active deliveries from view:', error);
        
        // Fallback to separate queries if the view failed
        console.log('Falling back to separate queries for active deliveries');
        
        // Just get the basic parcel info
        const { data: basicParcels, error: basicError } = await supabase
          .from('parcels')
          .select('*')
          .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
          .in('status', ['pending', 'accepted', 'picked_up', 'in_transit'])
          .order('created_at', { ascending: false });
          
        if (basicError || !basicParcels) {
          console.error('Fallback also failed:', basicError);
          return [];
        }
        
        return basicParcels;
      }
      
      if (!activeDeliveries || activeDeliveries.length === 0) {
        console.log('No active deliveries found');
        return [];
      }
      
      console.log(`Found ${activeDeliveries.length} active deliveries`);
      return activeDeliveries;
    } catch (error) {
      console.error('Error in getActiveDeliveries:', error);
      return [];
    }
  },

  /**
   * Update the status of a parcel
   */
  async updateParcelStatus(parcelId, status) {
    console.log(`[parcelService.updateParcelStatus] Updating parcel ${parcelId} to status: ${status}`);
    
    try {
      const { data, error } = await supabase
        .from('parcels')
        .update({ status })
        .eq('id', parcelId)
        .select('*')
        .single();
      
      if (error) {
        console.error('Error updating parcel status:', error);
        throw error;
      }
      
      console.log(`Successfully updated parcel ${parcelId} status to: ${status}`);
      return data;
    } catch (error) {
      console.error('Error in updateParcelStatus:', error);
      throw error;
    }
  }
}; 