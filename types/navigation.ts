import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { CompositeScreenProps } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { NavigatorScreenParams } from '@react-navigation/native';

export type RootStackParamList = {
  auth: NavigatorScreenParams<AuthStackParamList>;
  tabs: NavigatorScreenParams<TabStackParamList>;
  'track-map': undefined;
  'create-delivery': undefined;
  deposit: undefined;
};

export type AuthStackParamList = {
  login: undefined;
  register: undefined;
};

export type TabStackParamList = {
  index: undefined;
  'create-order': undefined;
  orders: undefined;
  chat: undefined;
  profile: undefined;
};

export type RootStackScreenProps<T extends keyof RootStackParamList> = NativeStackScreenProps<
  RootStackParamList,
  T
>;

export type TabStackScreenProps<T extends keyof TabStackParamList> = CompositeScreenProps<
  BottomTabScreenProps<TabStackParamList, T>,
  RootStackScreenProps<keyof RootStackParamList>
>;

export type AuthStackScreenProps<T extends keyof AuthStackParamList> = CompositeScreenProps<
  NativeStackScreenProps<AuthStackParamList, T>,
  RootStackScreenProps<keyof RootStackParamList>
>;

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
} 