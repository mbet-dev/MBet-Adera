import { NavigatorScreenParams } from '@react-navigation/native';

export type RootStackParamList = {
  '(tabs)': NavigatorScreenParams<TabParamList>;
  '(auth)': NavigatorScreenParams<AuthStackParamList>;
  '(modals)': NavigatorScreenParams<ModalStackParamList>;
};

export type TabParamList = {
  index: undefined;
  orders: undefined;
  'new-delivery': undefined;
  chat: undefined;
  profile: undefined;
};

export type AuthStackParamList = {
  login: undefined;
  register: undefined;
  'forgot-password': undefined;
  'verify-otp': undefined;
  'reset-password': undefined;
};

export type ModalStackParamList = {
  'parcel-details': { id: string };
  'payment-details': { id: string };
  'delivery-status': { id: string };
}; 