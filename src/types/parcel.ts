export interface Address {
  id: string;
  partner_id: string;
  address_line: string;
  city: string;
  created_at: string;
  updated_at: string;
  latitude?: number;
  longitude?: number;
}

export interface Parcel {
  id: string;
  tracking_code: string;
  status: string;
  pickup_address_id: string;
  dropoff_address_id: string;
  sender_id: string;
  receiver_id: string;
  created_at: string;
  updated_at: string;
  package_size?: string;
  package_description?: string;
  is_fragile?: boolean;
  estimated_price?: number;
  pickup_address?: {
    id: string;
    address_line: string;
    city: string;
    latitude: number;
    longitude: number;
    business_name?: string;
    partner_color?: string;
  };
  dropoff_address?: {
    id: string;
    address_line: string;
    city: string;
    latitude: number;
    longitude: number;
    business_name?: string;
    partner_color?: string;
  };
  estimated_delivery?: string;
  sender?: {
    id: string;
    first_name: string;
    last_name: string;
    full_name: string;
    phone_number: string;
    avatar_url: string;
  };
  recipient?: {
    id: string;
    first_name: string;
    last_name: string;
    full_name: string;
    phone_number: string;
    avatar_url: string;
  };
}

export interface Transaction {
  id?: string;
  parcel_id: string;
  amount: number;
  status: TransactionStatus;
  payment_method: PaymentMethod;
  created_at?: string;
  updated_at?: string;
}

export type ParcelStatus = 'pending' | 'confirmed' | 'picked_up' | 'in_transit' | 'delivered' | 'cancelled';
export type PackageSize = 'document' | 'small' | 'medium' | 'large';
export type PaymentMethod = 'wallet' | 'cash' | 'yenepay' | 'telebirr';
export type TransactionStatus = 'pending' | 'completed' | 'failed' | 'refunded';

export interface NewDeliveryFormData {
  // Sender details (populated from authenticated user)
  sender_id: string;

  // Package details
  packageSize: PackageSize;
  packageDescription: string;
  isFragile: boolean;
  
  // Location details
  pickupLocation: string;
  dropoffLocation: string;
  pickupContact: string;
  dropoffContact: string;
  pickupLatitude?: number;
  pickupLongitude?: number;
  dropoffLatitude?: number;
  dropoffLongitude?: number;
  pickupAddressId?: string;
  dropoffAddressId?: string;
  
  // Payment details
  paymentMethod: PaymentMethod;
  deliveryFee: number;
}

export interface Partner {
  id: string;
  business_name: string;
  contact_person: string;
  phone: string;
  email: string;
  color?: string;
  logo_url?: string;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  full_name?: string;
  phone_number?: string;
  avatar_url?: string;
  email?: string;
  created_at?: string;
  updated_at?: string;
}
