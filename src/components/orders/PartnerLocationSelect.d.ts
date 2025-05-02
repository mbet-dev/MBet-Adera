import { ReactNode } from 'react';

export interface PartnerLocation {
  id: string;
  name?: string;
  businessName?: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
  [key: string]: any;
}

export interface PartnerLocationSelectProps {
  label: string;
  onSelect: (partner: PartnerLocation | null) => void;
  selectedPartner: PartnerLocation | null;
  type?: 'pickup' | 'dropoff';
}

export const PartnerLocationSelect: React.FC<PartnerLocationSelectProps>; 