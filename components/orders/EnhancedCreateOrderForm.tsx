import React, { useState, useEffect, useCallback } from 'react';
import { router } from 'expo-router';
import { parcelService } from '../../services/parcelService';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Switch,
  Alert as RNAlert,
  Dimensions,
  ScrollView,
} from 'react-native';
import { useAuth } from '../../src/context/AuthContext';
import { MaterialIcons, FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons';
// @ts-ignore - Let TypeScript ignore the import error
import { PartnerLocationSelect } from './index';
import Colors from '../../constants/Colors';
import { ProhibitedItemsGuide } from './ProhibitedItemsGuide';
import { PackageSize, PaymentMethod, NewDeliveryFormData } from '../../types/parcel';

// Size descriptions for the tooltip
const SIZE_DESCRIPTIONS: Record<PackageSize, string> = {
  document: 'Letters, documents up to A5 size',
  small: 'Up to 5kg, max 30x20x15cm',
  medium: 'Up to 10kg, max 50x30x20cm',
  large: 'Up to 20kg, max 70x50x30cm'
};

// Icons for payment methods
const PAYMENT_ICONS: Record<PaymentMethod, string> = {
  wallet: 'wallet',
  cash: 'money-bill-wave',
  yenepay: 'credit-card',
  telebirr: 'mobile-alt'
};

// Icons for package sizes
const SIZE_ICONS: Record<PackageSize, keyof typeof MaterialCommunityIcons.glyphMap> = {
  document: 'file-document-outline',
  small: 'package-variant-closed',
  medium: 'package-variant',
  large: 'package'
};

const { width } = Dimensions.get('window');
const CARD_WIDTH = Math.min(width - 40, 400);

type FA5IconName = 'wallet' | 'money-bill-wave' | 'credit-card' | 'mobile-alt';

// Add a type for MaterialCommunityIcons
type MCIconName = 'file-document-outline' | 'package-variant-closed' | 'package-variant' | 'package';

// Define the User interface based on AuthContext
interface User {
  id: string;
  email: string;
  phone: string;
  full_name: string;
}

// Define the auth context type
interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<any>;
  signOut: () => Promise<any>;
}

interface PartnerLocation {
  id: string;
  name?: string;
  businessName?: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
  address_id?: string;
  [key: string]: any;
}

export const EnhancedCreateOrderForm = () => {
  const { user } = useAuth() as AuthContextType;
  const [packageDetails, setPackageDetails] = useState({
    description: '',
    size: 'medium' as PackageSize,
    isFragile: false
  });
  const [pickupLocation, setPickupLocation] = useState<PartnerLocation | null>(null);
  const [dropoffLocation, setDropoffLocation] = useState<PartnerLocation | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('wallet');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [showSizeInfo, setShowSizeInfo] = useState(false);
  const [showProhibitedItems, setShowProhibitedItems] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [isFormValid, setIsFormValid] = useState(false);

  // Memoize the validation function to prevent unnecessary re-renders
  const validateForm = useCallback(() => {
    const newErrors: Record<string, string> = {};
    let isValid = true;

    if (!packageDetails.description.trim()) {
      newErrors.description = 'Package description is required';
      isValid = false;
    }

    if (!pickupLocation?.id) {
      newErrors.pickupLocation = 'Pickup location is required';
      isValid = false;
    }

    if (!dropoffLocation?.id) {
      newErrors.dropoffLocation = 'Dropoff location is required';
      isValid = false;
    }

    if (!termsAccepted) {
      newErrors.terms = 'You must accept the terms and conditions';
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  }, [packageDetails.description, pickupLocation?.id, dropoffLocation?.id, termsAccepted]);

  // Update form validity when dependencies change
  useEffect(() => {
    const isValid = validateForm();
    setIsFormValid(isValid);
  }, [validateForm]);

  const handleSubmit = async () => {
    if (!isFormValid || !user || !pickupLocation || !dropoffLocation) {
      return;
    }

    setLoading(true);
    try {
      // Create delivery form data
      const deliveryFormData: NewDeliveryFormData = {
        // Required by NewDeliveryFormData
        sender_id: user.id,
        packageSize: packageDetails.size,
        packageDescription: packageDetails.description,
        isFragile: packageDetails.isFragile,
        pickupLocation: pickupLocation.name || pickupLocation.businessName || '',
        dropoffLocation: dropoffLocation.name || dropoffLocation.businessName || '',
        pickupContact: user.phone || '',
        dropoffContact: user.phone || '',
        paymentMethod: paymentMethod,
        deliveryFee: 150, // Default fee, could be calculated based on distance
        // Optional coordinates
        pickupLatitude: pickupLocation.coordinates?.latitude,
        pickupLongitude: pickupLocation.coordinates?.longitude,
        dropoffLatitude: dropoffLocation.coordinates?.latitude,
        dropoffLongitude: dropoffLocation.coordinates?.longitude,
        pickupAddressId: pickupLocation.address_id,
        dropoffAddressId: dropoffLocation.address_id,
      };

      const result = await parcelService.createOrder(deliveryFormData);
      if (!result) throw new Error('Failed to create delivery');
      
      RNAlert.alert(
        'Success!', 
        `Your delivery order has been created successfully!\n\nTracking ID: ${result.tracking_code}`,
        [
          {
            text: 'View My Orders',
            onPress: () => router.push('/orders-screen'),
          },
          { 
            text: 'Create Another', 
            onPress: () => {
              // Reset form
              setPackageDetails({ description: '', size: 'medium', isFragile: false });
              setPickupLocation(null);
              setDropoffLocation(null);
              setTermsAccepted(false);
            },
            style: 'cancel'
          },
        ]
      );
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to create order';
      setErrors({ form: errorMessage });
      
      RNAlert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const renderSizeOption = (size: PackageSize) => {
    const isSelected = packageDetails.size === size;

    return (
      <TouchableOpacity
        key={size}
        style={[
          styles.sizeCard,
          isSelected && styles.selectedSizeCard
        ]}
        onPress={() => setPackageDetails({...packageDetails, size})}
      >
        <MaterialCommunityIcons 
          name={SIZE_ICONS[size]} 
          size={32} 
          color={isSelected ? '#FFFFFF' : '#4CAF50'} 
        />
        <Text style={[styles.sizeText, isSelected && styles.selectedSizeText]}>
          {size.charAt(0).toUpperCase() + size.slice(1)}
        </Text>
        <Text style={[styles.sizeDescription, isSelected && styles.selectedSizeDescription]}>
          {SIZE_DESCRIPTIONS[size]}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderPaymentOption = (method: PaymentMethod) => {
    const isSelected = paymentMethod === method;
    
    return (
      <TouchableOpacity
        key={method}
        style={[
          styles.paymentOption,
          isSelected && styles.selectedPaymentOption
        ]}
        onPress={() => setPaymentMethod(method)}
      >
        <FontAwesome5 
          name={PAYMENT_ICONS[method]} 
          size={20} 
          color={isSelected ? '#FFFFFF' : '#555555'} 
        />
        <Text style={[styles.paymentText, isSelected && styles.selectedPaymentText]}>
          {method.charAt(0).toUpperCase() + method.slice(1)}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Form header with illustration */}
      <View style={styles.header}>
        <View style={styles.illustrationContainer}>
          <MaterialIcons 
            name="local-shipping" 
            size={80} 
            color="#4CAF50" 
          />
        </View>
        <Text style={styles.title}>Create New Parcel Delivery Order</Text>
        <Text style={styles.subtitle}>
          Fill in the details below to create a new parcel delivery order
        </Text>
      </View>

      {/* Global form error */}
      {errors.form && (
        <View style={styles.errorCard}>
          <MaterialIcons name="error" size={20} color="#FFFFFF" />
          <Text style={styles.errorText}>{errors.form}</Text>
        </View>
      )}

      {/* Terms & Conditions Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <MaterialIcons name="description" size={20} color="#4CAF50" />
          <Text style={styles.sectionTitle}>Terms & Conditions</Text>
        </View>

        <View style={styles.formGroup}>
          <TouchableOpacity
            style={styles.termsButton}
            onPress={() => router.push('/(modals)/terms')}
          >
            <View style={styles.buttonContent}>
              <MaterialIcons name="description" size={20} color="#4CAF50" />
              <Text style={styles.termsButtonText}>
                Review Terms & Conditions
              </Text>
            </View>
            <MaterialIcons name="chevron-right" size={20} color="#4CAF50" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.prohibitedItemsButton}
            onPress={() => setShowProhibitedItems(true)}
          >
            <View style={styles.buttonContent}>
              <MaterialIcons name="warning" size={20} color="#FF9800" />
              <Text style={styles.prohibitedItemsButtonText}>
                View Prohibited Items List
              </Text>
            </View>
            <MaterialIcons name="chevron-right" size={20} color="#FF9800" />
          </TouchableOpacity>

          <View style={styles.termsCheckbox}>
            <TouchableOpacity
              style={[styles.checkbox, termsAccepted && styles.checkboxChecked]}
              onPress={() => setTermsAccepted(!termsAccepted)}
            >
              {termsAccepted && (
                <MaterialIcons name="check" size={20} color="#FFFFFF" />
              )}
            </TouchableOpacity>
            <Text style={styles.termsText}>
              I have read and agree to the Terms & Conditions and Prohibited Items List
            </Text>
          </View>
          {errors.terms && (
            <Text style={styles.errorText}>{errors.terms}</Text>
          )}
        </View>
      </View>

      {/* Section: Package Details */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <MaterialIcons name="inventory" size={20} color="#4CAF50" />
          <Text style={styles.sectionTitle}>Package Details</Text>
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Package Description <Text style={styles.required}>*</Text></Text>
          <TextInput
            style={[styles.textInput, errors.description && styles.inputError]}
            placeholder="What are you sending? Put a name that can help you remember or use it in Search Key indexes.."
            value={packageDetails.description}
            onChangeText={(text) => setPackageDetails({...packageDetails, description: text})}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
          {errors.description && <Text style={styles.errorText}>{errors.description}</Text>}
        </View>

        <View style={styles.formGroup}>
          <View style={styles.labelRow}>
            <Text style={styles.label}>Package Size <Text style={styles.required}>*</Text></Text>
            <TouchableOpacity onPress={() => setShowSizeInfo(!showSizeInfo)}>
              <MaterialIcons name="info-outline" size={18} color="#666666" />
            </TouchableOpacity>
          </View>
          <View style={styles.sizeGridContainer}>
            {['document', 'small', 'medium', 'large'].map(size => renderSizeOption(size as PackageSize))}
          </View>
        </View>

        <View style={styles.formGroup}>
          <View style={styles.switchRow}>
            <View style={styles.switchLabel}>
              <MaterialIcons name="warning" size={18} color="#FF9800" style={styles.switchIcon} />
              <Text style={styles.label}>Fragile Package</Text>
            </View>
            <Switch
              value={packageDetails.isFragile}
              onValueChange={(value) => setPackageDetails({...packageDetails, isFragile: value})}
              trackColor={{ false: '#E0E0E0', true: '#A5D6A7' }}
              thumbColor={packageDetails.isFragile ? '#4CAF50' : '#FFFFFF'}
              ios_backgroundColor="#E0E0E0"
            />
          </View>
          <Text style={styles.helperText}>
            Mark as fragile for special handling
          </Text>
        </View>
      </View>

      {/* Section: Pickup Location */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <MaterialIcons name="flight-takeoff" size={20} color="#4CAF50" />
          <Text style={styles.sectionTitle}>Pickup Location</Text>
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.locationSelectionInfo}>
            Select from available partner locations using the dropdown or map view
          </Text>
          {/* @ts-ignore - Type checking for the component */}
          <PartnerLocationSelect
            label="Pickup Partner Location"
            onSelect={setPickupLocation}
            selectedPartner={pickupLocation}
            type="pickup"
            defaultViewMode="dropdown"
          />
          {errors.pickupLocation && <Text style={styles.errorText}>{errors.pickupLocation}</Text>}
        </View>
      </View>

      {/* Section: Dropoff Location */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <MaterialIcons name="flight-land" size={20} color="#4CAF50" />
          <Text style={styles.sectionTitle}>Dropoff Location</Text>
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.locationSelectionInfo}>
            Select from available partner locations using the dropdown or map view
          </Text>
          {/* @ts-ignore - Type checking for the component */}
          <PartnerLocationSelect
            label="Dropoff Partner Location"
            onSelect={setDropoffLocation}
            selectedPartner={dropoffLocation}
            type="dropoff"
            defaultViewMode="dropdown"
          />
          {errors.dropoffLocation && <Text style={styles.errorText}>{errors.dropoffLocation}</Text>}
        </View>
      </View>

      {/* Section: Payment Method */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <MaterialIcons name="payment" size={20} color="#4CAF50" />
          <Text style={styles.sectionTitle}>Payment Method</Text>
        </View>

        <View style={styles.paymentMethods}>
          {['wallet', 'cash', 'yenepay', 'telebirr'].map(method => (
            renderPaymentOption(method as PaymentMethod)
          ))}
        </View>
      </View>

      {/* Submit Button */}
      <TouchableOpacity
        style={[
          styles.submitButton, 
          (!isFormValid || loading) && styles.disabledButton
        ]}
        onPress={handleSubmit}
        disabled={loading || !isFormValid}
      >
        {loading ? (
          <ActivityIndicator color="#FFFFFF" size="small" />
        ) : (
          <>
            <MaterialIcons name="local-shipping" size={20} color="#FFFFFF" style={styles.buttonIcon} />
            <Text style={styles.submitButtonText}>Create Parcel Delivery Order</Text>
          </>
        )}
      </TouchableOpacity>

      <ProhibitedItemsGuide
        visible={showProhibitedItems}
        onClose={() => setShowProhibitedItems(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  illustrationContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
      web: {
        boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.1)'
      } as any
    }),
  },
  illustration: {
    width: 120,
    height: 120,
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
    maxWidth: '80%',
  },
  section: {
    marginBottom: 24,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
      web: {
        boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.1)'
      } as any
    }),
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333333',
    marginLeft: 8,
  },
  formGroup: {
    marginBottom: 16,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  label: {
    fontSize: 14,
    color: '#333333',
    fontWeight: '500',
    marginBottom: 8,
  },
  required: {
    color: '#F44336',
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    backgroundColor: '#F9F9F9',
    minHeight: 100,
  },
  inputError: {
    borderColor: '#F44336',
    backgroundColor: 'rgba(244, 67, 54, 0.05)',
  },
  errorText: {
    color: '#F44336',
    fontSize: 12,
    marginTop: 4,
  },
  errorCard: {
    backgroundColor: '#F44336',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  switchLabel: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  switchIcon: {
    marginRight: 8,
  },
  helperText: {
    fontSize: 12,
    color: '#666666',
    marginTop: 4,
  },
  sizeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
  },
  sizeGridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  sizeCard: {
    width: '48%',
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    marginBottom: 10,
  },
  selectedSizeCard: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  sizeText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333333',
    marginTop: 8,
  },
  selectedSizeText: {
    color: '#FFFFFF',
  },
  sizeDescription: {
    fontSize: 10,
    color: '#666666',
    textAlign: 'center',
    marginTop: 4,
  },
  selectedSizeDescription: {
    color: '#E8F5E9',
  },
  paymentMethods: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  paymentOption: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '48%',
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  selectedPaymentOption: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  paymentText: {
    marginLeft: 10,
    fontSize: 14,
    color: '#333333',
  },
  selectedPaymentText: {
    color: '#FFFFFF',
    fontWeight: '500',
  },
  locationSelectionInfo: {
    fontSize: 12,
    color: '#666666',
    marginBottom: 12,
    fontStyle: 'italic',
  },
  submitButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 24,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  disabledButton: {
    backgroundColor: '#A5D6A7',
    opacity: 0.7,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  buttonIcon: {
    marginRight: 8,
  },
  termsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F5F5F5',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  prohibitedItemsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFF3F3',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  termsButtonText: {
    marginLeft: 12,
    color: '#4CAF50',
    fontWeight: '500',
    fontSize: 16,
  },
  prohibitedItemsButtonText: {
    marginLeft: 12,
    color: '#FF9800',
    fontWeight: '500',
    fontSize: 16,
  },
  termsCheckbox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#4CAF50',
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#4CAF50',
  },
  termsText: {
    flex: 1,
    fontSize: 14,
    color: '#666666',
  },
});

 