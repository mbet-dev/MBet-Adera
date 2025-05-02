import { supabase } from './supabase';
import { Address, NewDeliveryFormData, Parcel, ParcelStatus, Transaction, TransactionStatus, PaymentMethod } from '@/types/parcel';
import { generateTrackingCode } from '@/utils/helpers';
import { Alert } from 'react-native';

// Function to handle address creation
async function getOrCreateAddress(addressData: Omit<Address, 'id' | 'created_at'>, userId: string): Promise<string> {
  const now = new Date().toISOString();
  // Placeholder for partner_id - needs logic
  const partnerId = userId; 
  
  const { data, error } = await supabase
    .from('addresses')
    // Include all required fields from Address type
    .insert({ 
      ...addressData, 
      user_id: userId, // Assuming Address type has user_id
      partner_id: partnerId, // Added
      updated_at: now // Added
     })
    .select('id')
    .single();

  if (error) {
    console.error('Error inserting address:', error);
    throw new Error(`Failed to create address: ${error.message}`);
  }
  if (!data) {
    throw new Error('Failed to create address, no ID returned.');
  }
  return data.id;
}

/**
 * Service for handling parcel-related operations with Supabase
 */
export const parcelService = {
  /**
   * Create a new delivery with associated addresses and transaction
   */
  async createDelivery(formData: NewDeliveryFormData, userId: string): Promise<Parcel | null> {
    try {
      // 1. Create or get addresses using fields from NewDeliveryFormData
      const pickupAddressData = {
        address_line: formData.pickupLocation, // Use correct field
        city: 'Addis Ababa', // Hardcoded in original logic
        // postal_code: formData.pickupPostalCode, // Not in NewDeliveryFormData
        latitude: formData.pickupLatitude,
        longitude: formData.pickupLongitude,
      };
      const dropoffAddressData = {
        address_line: formData.dropoffLocation, // Use correct field
        city: 'Addis Ababa', // Hardcoded in original logic
        // postal_code: formData.dropoffPostalCode, // Not in NewDeliveryFormData
        latitude: formData.dropoffLatitude,
        longitude: formData.dropoffLongitude,
      };

      const pickupAddressId = await getOrCreateAddress(pickupAddressData as Omit<Address, 'id' | 'created_at'>, userId);
      const dropoffAddressId = await getOrCreateAddress(dropoffAddressData as Omit<Address, 'id' | 'created_at'>, userId);

      // 2. Generate tracking code
      const trackingCode = generateTrackingCode();

      // 3. Prepare parcel data using fields from NewDeliveryFormData
      const parcelData = {
        sender_id: userId,
        tracking_code: trackingCode,
        status: 'pending' as ParcelStatus,
        pickup_address_id: pickupAddressId,
        dropoff_address_id: dropoffAddressId,
        package_description: formData.packageDescription,
        package_size: formData.packageSize, // Use correct field
        is_fragile: formData.isFragile, // Use correct field
        pickup_contact: formData.pickupContact, // Use correct field
        dropoff_contact: formData.dropoffContact, // Use correct field
        // weight: parseFloat(formData.packageWeight) || null, // Not in NewDeliveryFormData
      };

      // 4. Insert parcel
      const { data: newParcel, error: parcelError } = await supabase
        .from('parcels')
        .insert(parcelData)
        .select('*')
        .single();

      if (parcelError) {
        console.error('Error creating parcel:', parcelError);
        Alert.alert('Error', `Failed to create parcel: ${parcelError.message}`);
        throw parcelError;
      }
      
      if (!newParcel) {
        throw new Error('Parcel creation did not return data.');
      }

      // 5. Create Transaction (Re-added from original logic)
      const transactionData = {
        parcel_id: newParcel.id, 
        amount: formData.deliveryFee, // Use correct field
        status: 'pending' as TransactionStatus,
        payment_method: formData.paymentMethod as PaymentMethod, // Use correct field
      };

      const { error: transactionError } = await supabase
        .from('transactions')
        .insert(transactionData);

      if (transactionError) {
        // Should we rollback parcel creation here? Or just log the error?
        console.error('Error creating transaction:', transactionError);
        Alert.alert('Error', `Delivery created, but failed to record transaction: ${transactionError.message}`);
        // Potentially return the parcel anyway, or throw to indicate partial failure
      }

      console.log('Delivery and transaction created successfully:', newParcel);
      return newParcel as Parcel;

    } catch (error) {
      console.error('Error in createDelivery process:', error);
      return null;
    }
  },

  /**
   * Get all parcels for the current user
   */
  async getParcels(userId: string): Promise<Parcel[]> {
    const { data, error } = await supabase
      .rpc('get_paginated_parcels', {
        user_id: userId,
        p_status: 'all',
        p_limit: 100,
        p_offset: 0,
        p_sort_by: 'created_at',
        p_sort_direction: 'desc'
      });

    if (error) {
      console.error('Error fetching parcels:', error);
      throw error;
    }

    return (data?.parcels || []) as Parcel[];
  },

  /**
   * Get a single parcel by ID
   */
  async getParcelById(parcelId: string, userId: string): Promise<Parcel | null> {
    const { data, error } = await supabase
      .from('parcels')
      .select(`
        *,
        pickup_address:pickup_address_id(
          id,
          address_line,
          city,
          latitude,
          longitude
        ),
        dropoff_address:dropoff_address_id(
          id,
          address_line,
          city,
          latitude,
          longitude
        )
      `)
      .eq('id', parcelId)
      .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        console.log('Parcel not found or access denied');
        return null;
      }
      console.error('Error fetching parcel by ID:', error);
      throw error;
    }

    if (!data) return null;

    return data as Parcel;
  },

  /**
   * Update a parcel's status
   */
  async updateParcelStatus(parcelId: string, status: ParcelStatus): Promise<Parcel | null> {
    const { data, error } = await supabase
      .from('parcels')
      .update({ status: status, updated_at: new Date().toISOString() })
      .eq('id', parcelId)
      .select()
      .single();

    if (error) {
      console.error('Error updating parcel status:', error);
      throw error;
    }
    return data as Parcel | null;
  },

  /**
   * Cancel a parcel
   */
  async cancelParcel(parcelId: string, userId: string): Promise<Parcel | null> { 
    const currentParcel = await this.getParcelById(parcelId, userId); 
    if (currentParcel && (currentParcel.status === 'pending' || currentParcel.status === 'confirmed')) {
       return this.updateParcelStatus(parcelId, 'cancelled');
    } else {
      console.warn(`Parcel ${parcelId} cannot be cancelled in status: ${currentParcel?.status}`);
      // Optionally throw an error or return the current parcel without change
      // throw new Error('Parcel cannot be cancelled in its current state.');
      return currentParcel;
    }
  },

  /**
   * Get active deliveries for the current user
   */
  async getActiveDeliveries(userId: string): Promise<Parcel[]> {
    const { data, error } = await supabase
      .rpc('get_active_deliveries', {
        user_id: userId
      });

    if (error) {
      console.error('Error fetching active deliveries:', error);
      throw error;
    }

    // Process data to include estimated delivery time
    const processedData = (data || []).map((parcel: Parcel) => {
      // Calculate estimated delivery time based on status
      let estimatedDelivery = '';
      const now = new Date();
      
      if (parcel.status === 'pending') {
        estimatedDelivery = 'Awaiting confirmation';
      } else if (parcel.status === 'confirmed') {
        const pickupTime = new Date(now);
        pickupTime.setHours(pickupTime.getHours() + 2);
        estimatedDelivery = `Pickup by ${pickupTime.getHours()}:${String(pickupTime.getMinutes()).padStart(2, '0')}`;
      } else if (parcel.status === 'picked_up' || parcel.status === 'in_transit') {
        const deliveryTime = new Date(now);
        deliveryTime.setHours(deliveryTime.getHours() + 5);
        estimatedDelivery = `Delivery by ${deliveryTime.getHours()}:${String(deliveryTime.getMinutes()).padStart(2, '0')}`;
      }
      
      return {
        ...parcel,
        estimated_delivery: estimatedDelivery
      };
    });

    return processedData as Parcel[];
  },

  /**
   * Calculate delivery fee based on package size and distance
   */
  calculateDeliveryFee(packageSize: Parcel['package_size'], distance: number = 5): number {
    // Base fee by package size
    const baseFees = {
      document: 80,
      small: 120,
      medium: 180,
      large: 250,
    };
    
    // Calculate fee based on distance (ETB per km)
    const distanceFee = distance * 10;
    
    return baseFees[packageSize] + distanceFee;
  },

  /**
   * Get paginated parcels with total count for the current user
   */
  async getPaginatedParcels(
    userId: string, 
    options: {
      status?: ParcelStatus | string | null,
      limit?: number,
      page?: number,
      sortBy?: string,
      sortDirection?: string
    } = {}
  ): Promise<{ parcels: Parcel[], totalCount: number }> {
    const { 
      status = null, 
      limit = 10, 
      page = 0,
      sortBy = 'created_at',
      sortDirection = 'desc' 
    } = options;
    const offset = page * limit;

    try {
      // Handle 'active' status filter specially
      let statusFilter = status;
      let statusArray: string[] | null = null;
      
      if (status === 'active') {
        // If status is 'active', we need to search for multiple status values
        statusFilter = null;
        statusArray = ['confirmed', 'picked_up', 'in_transit'];
      }

      // Build the query
      let query = supabase
        .from('parcels')
        .select(`
          *,
          pickup_address:pickup_address_id(*),
          dropoff_address:dropoff_address_id(*)
        `, { count: 'exact' })
        .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`);
      
      // Apply status filtering
      if (statusFilter && statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      } else if (statusArray) {
        query = query.in('status', statusArray);
      }
      
      // Apply sorting
      let sortField = sortBy;
      if (sortBy === 'price') {
        sortField = 'estimated_price';
      } else if (sortBy === 'created') {
        sortField = 'created_at';
      }
      
      // Apply ordering
      query = query.order(sortField, { 
        ascending: sortDirection === 'asc'
      });
      
      // Apply pagination
      query = query.range(offset, offset + limit - 1);
      
      // Execute query
      const { data, error, count } = await query;

      if (error) {
        console.error('Error fetching paginated parcels:', error);
        throw error;
      }

      return { 
        parcels: (data || []) as Parcel[], 
        totalCount: count || 0 
      };
      
    } catch (error) {
      console.error('Error in getPaginatedParcels:', error);
      return { parcels: [], totalCount: 0 };
    }
  },

  /**
   * Get statistics about user's parcels
   */
  async getParcelStatistics(userId: string): Promise<{
    active: number;
    delivered: number;
    cancelled: number;
    total: number;
  }> {
    const { data, error } = await supabase
      .rpc('get_parcel_statistics', {
        user_id: userId
      });

    if (error) {
      console.error('Error fetching parcel statistics:', error);
      throw error;
    }

    return data || {
      active: 0,
      delivered: 0,
      cancelled: 0,
      total: 0
    };
  },
};
