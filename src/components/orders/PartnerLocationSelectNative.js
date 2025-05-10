import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal, Platform, Image, ActivityIndicator } from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import MapView, { Marker } from 'react-native-maps';

// This file will only be imported on native platforms

export const PartnerLocationSelect = ({ label, onSelect, selectedPartner, type = 'pickup' }) => {
    // Same implementation as the original component but with direct imports of MapView
    // ...
};

const styles = StyleSheet.create({
    // Same styles as the original component
    // ...
});