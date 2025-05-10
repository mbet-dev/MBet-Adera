export interface User {
  id: string;
  email: string;
  fullName: string;
  phoneNumber: string;
  role: 'sender' | 'courier' | 'admin';
  avatar?: string;
}

export interface Parcel {
  id: string;
  senderId: string;
  recipientId: string;
  status: 'pending' | 'picked_up' | 'in_transit' | 'delivered' | 'cancelled';
  pickupLocation: Location;
  dropoffLocation: Location;
  size: 'small' | 'medium' | 'large';
  weight: number;
  description: string;
  specialInstructions?: string;
  trackingCode: string;
  createdAt: string;
  updatedAt: string;
  pickup_address?: string;
  dropoff_address?: string;
  pickup_latitude?: number;
  pickup_longitude?: number;
  dropoff_latitude?: number;
  dropoff_longitude?: number;
  tracking_code?: string;
  package_size?: 'document' | 'small' | 'medium' | 'large';
  package_description?: string;
  is_fragile?: boolean;
  pickup_contact?: string;
  dropoff_contact?: string;
  estimated_price?: number;
  formatted_price?: string;
  distance?: number;
  formatted_distance?: string;
  payment_status?: string;
  notes?: string;
  status_display?: string;
  pickup_business_name?: string;
  pickup_working_hours?: string;
  pickup_partner_phone?: string;
  pickup_partner_email?: string;
  pickup_partner_color?: string;
  dropoff_business_name?: string;
  dropoff_working_hours?: string;
  dropoff_partner_phone?: string;
  dropoff_partner_email?: string;
  dropoff_partner_color?: string;
  fragile_tag?: string;
}

export interface Location {
  latitude: number;
  longitude: number;
  address: string;
  name?: string;
}

export interface PaymentMethod {
  id: string;
  type: 'wallet' | 'yenepay' | 'telebirr' | 'cash';
  status: 'active' | 'inactive';
}

export interface Transaction {
  id: string;
  userId: string;
  amount: number;
  type: 'credit' | 'debit';
  status: 'pending' | 'completed' | 'failed';
  paymentMethod: PaymentMethod;
  createdAt: string;
}
