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

// Nullable address for database responses that may return null
export type NullableAddress = Address | null;

export interface Parcel {
  id: string;
  created_at: string;
  updated_at: string;
  sender_id: string;
  receiver_id: string;
  tracking_code: string;
  status: ParcelStatus;
  pickup_address_id: string;
  dropoff_address_id: string;
  pickup_address: Address;
  dropoff_address: Address;
  pickup_contact?: string;
  dropoff_contact?: string;
  package_size: PackageSize;
  package_description?: string;
  is_fragile: boolean;
  // Additional fields for delivery details
  pickup_latitude?: number;
  pickup_longitude?: number;
  dropoff_latitude?: number;
  dropoff_longitude?: number;
  distance?: number;
  formatted_distance?: string;
  estimated_price?: number;
  formatted_price?: string;
  status_display?: string;
  pickup_business_name?: string;
  pickup_working_hours?: string;
  pickup_partner_color?: string;
  dropoff_business_name?: string;
  dropoff_working_hours?: string;
  dropoff_partner_color?: string;
  estimated_delivery?: string; // Estimated pickup or delivery time
  weight?: number;
  price?: number;
  notes?: string;
  sender?: Partner;
  receiver?: Partner;
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
  user_id?: string;
  full_name?: string;
  phone_number?: string;
  avatar_url?: string;
  email?: string;
  created_at?: string;
  updated_at?: string;
}

// Interface for the DB response types when they include nullable addresses
export interface DatabaseParcel {
  id: string;
  created_at: string;
  updated_at: string;
  sender_id: string;
  receiver_id: string;
  tracking_code: string;
  status: ParcelStatus;
  pickup_address_id: string;
  dropoff_address_id: string;
  pickup_address: NullableAddress;
  dropoff_address: NullableAddress;
  pickup_contact?: string;
  dropoff_contact?: string;
  package_size: PackageSize;
  package_description?: string;
  is_fragile: boolean;
  // Additional fields for delivery details (same as Parcel)
  [key: string]: any;
}

// ParcelService interface for type safety across the application
export interface ParcelService {
  getParcels(userId: string): Promise<DatabaseParcel[]>;
  getParcelById(parcelId: string, userId: string): Promise<Parcel | null>;
  createDelivery(formData: NewDeliveryFormData, userId: string): Promise<Parcel | null>;
  createOrder(formData: NewDeliveryFormData): Promise<Parcel | null>;
  updateParcelStatus(parcelId: string, status: ParcelStatus): Promise<Parcel | null>;
  cancelParcel(parcelId: string, userId: string, reason?: string): Promise<boolean>;
  getActiveDeliveries(userId: string): Promise<DatabaseParcel[]>;
  getPaginatedParcels(userId: string, options?: any): Promise<{ parcels: DatabaseParcel[], totalCount: number }>;
  getParcelStatistics(userId: string): Promise<{ active: number; delivered: number; cancelled: number; total: number; }>;
  searchParcels(userId: string, query: string): Promise<DatabaseParcel[]>;
  calculateDeliveryFee(packageSize: PackageSize, distance?: number): number;
}
