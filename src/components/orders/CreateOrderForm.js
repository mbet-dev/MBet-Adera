import React, { useState, useEffect } from 'react';
import { router } from 'expo-router';
import { parcelService } from '../../services/parcelService';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Platform,
  Switch,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
// Change this import to use the platform-specific version
import { PartnerLocationSelect } from './index';

export const CreateOrderForm = () => {
    const { user } = useAuth();
    const [packageDetails, setPackageDetails] = useState({
        description: '',
        size: 'medium',
        isFragile: false
    });
    const [pickupLocation, setPickupLocation] = useState(null);
    const [dropoffLocation, setDropoffLocation] = useState(null);
    const [paymentMethod, setPaymentMethod] = useState('wallet');
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);

    const validateForm = () => {
        return (
            pickupLocation?.id &&
            dropoffLocation?.id &&
            packageDetails.description &&
            packageDetails.size &&
            paymentMethod
        );
    };

    const handleSubmit = async () => {
        if (!validateForm()) {
            setError('Please fill all required fields');
            return;
        }

        setLoading(true);
        try {
            const orderData = {
                userId: user.id,
                pickupPartnerId: pickupLocation.id,
                dropoffPartnerId: dropoffLocation.id,
                packageDetails,
                paymentMethod,
                coordinates: {
                    pickup: pickupLocation.coordinates,
                    dropoff: dropoffLocation.coordinates
                }
            };

            const result = await parcelService.createOrder(orderData);
            if (result.error) throw result.error;
            
            RNAlert.alert('Success', 'Order created successfully! Tracking ID: ' + result.trackingCode);
            // Reset form
            setPackageDetails({ description: '', size: 'medium', isFragile: false });
            setPickupLocation(null);
            setDropoffLocation(null);
        } catch (err) {
            setError(err.message || 'Failed to create order');
        } finally {
            setLoading(false);
        }
    };

    return (
        <ScrollView style={styles.container}>
            <Text style={styles.title}>New Delivery Order</Text>
            
            {error && <Text style={styles.error}>{error}</Text>}

            <View style={styles.inputGroup}>
                <Text style={styles.label}>Package Description *</Text>
                <TextInput
                    style={styles.textInput}
                    value={packageDetails.description}
                    onChangeText={(text) => setPackageDetails({...packageDetails, description: text})}
                    multiline
                />
            </View>

            <View style={styles.inputGroup}>
                <Text style={styles.label}>Package Size *</Text>
                <View style={styles.buttonGroup}>
                    {['small', 'medium', 'large'].map(size => (
                        <TouchableOpacity
                            key={size}
                            style={[
                                styles.sizeButton,
                                packageDetails.size === size && styles.selectedButton
                            ]}
                            onPress={() => setPackageDetails({...packageDetails, size})}
                        >
                            <Text style={packageDetails.size === size ? styles.selectedButtonText : styles.buttonText}>
                                {size.charAt(0).toUpperCase() + size.slice(1)}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>

            <View style={styles.inputGroup}>
                <View style={styles.switchRow}>
                    <Text style={styles.label}>Fragile Package</Text>
                    <Switch
                        value={packageDetails.isFragile}
                        onValueChange={(value) => setPackageDetails({...packageDetails, isFragile: value})}
                    />
                </View>
            </View>

            <PartnerLocationSelect
                label="Pickup Partner Location *"
                onSelect={setPickupLocation}
                selectedPartner={pickupLocation}
            />

            <PartnerLocationSelect
                label="Dropoff Partner Location *"
                onSelect={setDropoffLocation}
                selectedPartner={dropoffLocation}
            />

            <View style={styles.inputGroup}>
                <Text style={styles.label}>Payment Method *</Text>
                <View style={styles.buttonGroup}>
                    {['wallet', 'cash', 'yenepay', 'telebirr'].map(method => (
                        <TouchableOpacity
                            key={method}
                            style={[
                                styles.paymentButton,
                                paymentMethod === method && styles.selectedButton
                            ]}
                            onPress={() => setPaymentMethod(method)}
                        >
                            <Text style={paymentMethod === method ? styles.selectedButtonText : styles.buttonText}>
                                {method.charAt(0).toUpperCase() + method.slice(1)}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>

            <TouchableOpacity 
                style={[styles.submitButton, (!validateForm() || loading) && styles.disabledButton]}
                onPress={handleSubmit}
                disabled={loading || !validateForm()}
            >
                <Text style={styles.submitButtonText}>
                    {loading ? 'Creating Order...' : 'Create Delivery Order'}
                </Text>
            </TouchableOpacity>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        padding: 16,
        backgroundColor: '#fff'
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 20
    },
    inputGroup: {
        marginBottom: 16
    },
    label: {
        fontSize: 16,
        marginBottom: 8
    },
    textInput: {
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 4,
        padding: 8,
        minHeight: 100
    },
    buttonGroup: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8
    },
    sizeButton: {
        padding: 12,
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        minWidth: 80,
        alignItems: 'center'
    },
    paymentButton: {
        padding: 12,
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        minWidth: 100,
        alignItems: 'center'
    },
    selectedButton: {
        backgroundColor: '#4CAF50',
        borderColor: '#4CAF50'
    },
    buttonText: {
        color: '#333'
    },
    selectedButtonText: {
        color: '#fff'
    },
    error: {
        color: 'red',
        marginBottom: 16
    },
    switchRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center'
    },
    submitButton: {
        backgroundColor: '#4CAF50',
        padding: 16,
        borderRadius: 8,
        alignItems: 'center',
        marginTop: 20,
        marginBottom: 40
    },
    disabledButton: {
        backgroundColor: '#cccccc',
        opacity: 0.7
    },
    submitButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold'
    }
});