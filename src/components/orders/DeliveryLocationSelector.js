import React from 'react';
import { View, StyleSheet } from 'react-native';
import { PartnerLocationSelect } from './PartnerLocationSelect';
// In any file that uses PartnerLocationSelect
import { PartnerLocationSelect } from '../../components/orders';

export const DeliveryLocationSelector = ({ 
    pickupLocation, 
    dropoffLocation, 
    onPickupChange, 
    onDropoffChange 
}) => {
    return (
        <View style={styles.container}>
            <PartnerLocationSelect
                label="Pickup Location"
                selectedPartner={pickupLocation}
                onSelect={onPickupChange}
                type="pickup"
            />
            
            <PartnerLocationSelect
                label="Delivery Location"
                selectedPartner={dropoffLocation}
                onSelect={onDropoffChange}
                type="dropoff"
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginBottom: 16,
    },
});