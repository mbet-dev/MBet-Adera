import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  Alert,
  Modal,
  RefreshControl,
  ActivityIndicator,
  Dimensions,
  Animated,
  Pressable,
  StatusBar,
  SafeAreaView,
  Linking,
  PanResponder,
  LayoutAnimation,
  UIManager,
  Easing,
  Image
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Parcel } from '../../types';
import { supabase } from '../../services/supabase';
import { OpenStreetMap } from '../../components/OpenStreetMap';
import * as Location from 'expo-location';
import { MaterialIcons, Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { parcelService } from '../../services/parcelService';
import { router } from 'expo-router';
import { Colors } from '../../constants/Colors';

// Get screen dimensions for responsive design
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Constants for map heights in the different states
const MAP_HEIGHT_EXPANDED = SCREEN_HEIGHT * 0.75;
const MAP_HEIGHT_DEFAULT = SCREEN_HEIGHT * 0.4;
const MAP_HEIGHT_COLLAPSED = SCREEN_HEIGHT * 0.25;

// Enable LayoutAnimation for Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface PartnerLocation {
  id: string;
  latitude: number;
  longitude: number;
  title: string;
  color: string;
  businessName: string;
  workingHours?: string;
  phoneNumber?: string;
  address: string;
  description?: string;
  isFacility: boolean;
  icon?: string;
  size?: number;
  businessType?: string;
  contactPerson?: string;
  email?: string;
}

interface Marker {
  id: string;
  latitude: number;
  longitude: number;
  title: string;
  color: string;
  size?: number;
  zIndex?: number;
  description?: string;
  icon?: string;
}

const HomeScreen = ({ navigation: navigationProp }: any) => {
  // Get navigation from hooks for compatibility with both approaches
  const hookNavigation = useNavigation();
  // Use navigationProp if provided, otherwise use the hook
  const navigation = navigationProp || hookNavigation;
  
  // State variables
  const [activeDeliveries, setActiveDeliveries] = useState<Parcel[]>([]);
  const [partnerLocations, setPartnerLocations] = useState<PartnerLocation[]>([]);
  const [userLocation, setUserLocation] = useState({
    latitude: 9.0222,  // Addis Ababa coordinates
    longitude: 38.7468,
  });
  const [selectedPartner, setSelectedPartner] = useState<PartnerLocation | null>(null);
  const [showPartnerDetails, setShowPartnerDetails] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [locationPermissionGranted, setLocationPermissionGranted] = useState(false);
  const [userName, setUserName] = useState<string>('');
  const [userId, setUserId] = useState<string | null>(null);
  
  // Enhanced UI state variables
  const [mapViewState, setMapViewState] = useState('default'); // 'expanded', 'default', 'collapsed'
  const mapHeightAnimation = useRef(new Animated.Value(MAP_HEIGHT_DEFAULT)).current;
  const mapRef = useRef<{ centerOnLocation: (location: { latitude: number; longitude: number }) => void }>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  
  // Tooltip visibility state
  const [showTooltip, setShowTooltip] = useState(true);
  
  // Scroll position tracking
  const [scrollPosition, setScrollPosition] = useState(0);
  
  // Add a state variable to track modal position for component rendering decisions
  const [modalPositionValue, setModalPositionValue] = useState(SCREEN_HEIGHT);
  
  // Add new animated values for modal position
  const modalPosition = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const modalOpacity = useRef(new Animated.Value(0)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const modalContentHeight = useRef(0);
  const startDragY = useRef(0);
  
  // Add a new state for delivery loading separate from overall loading
  const [isDeliveriesLoading, setIsDeliveriesLoading] = useState(false);
  const [deliveriesError, setDeliveriesError] = useState<string | null>(null);
  
  // Add new state for parcel statistics
  const [parcelStats, setParcelStats] = useState({
    total: 0,
    active: 0,
    delivered: 0,
    cancelled: 0
  });
  
  // Listen for changes to the modal position
  useEffect(() => {
    const id = modalPosition.addListener(({value}) => {
      setModalPositionValue(value);
    });
    
    return () => {
      modalPosition.removeListener(id);
    };
  }, []);
  
  // Create PanResponder for modal dragging
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // Only respond to vertical gestures
        return Math.abs(gestureState.dy) > Math.abs(gestureState.dx * 2);
      },
      onPanResponderGrant: (_, gestureState) => {
        // Save initial position
        startDragY.current = gestureState.y0;
      },
      onPanResponderMove: (_, gestureState) => {
        // Calculate drag distance
        const dragDistance = gestureState.moveY - startDragY.current;
        
        // Don't allow dragging up beyond the top of the modal content
        if (dragDistance < 0) {
          // Resist upward movement with diminishing effect
          const resistance = 5; // Higher value means more resistance
          const resistedDistance = dragDistance / resistance;
          modalPosition.setValue(Math.max(SCREEN_HEIGHT - modalContentHeight.current + resistedDistance, SCREEN_HEIGHT * 0.15));
        } else {
          // Allow normal dragging down
          modalPosition.setValue(Math.min(SCREEN_HEIGHT - modalContentHeight.current + dragDistance, SCREEN_HEIGHT));
        }
        
        // Adjust backdrop opacity based on modal position
        const newOpacity = 1 - (dragDistance / (modalContentHeight.current * 0.5));
        backdropOpacity.setValue(Math.max(0, Math.min(0.5, newOpacity)));
      },
      onPanResponderRelease: (_, gestureState) => {
        // Decide whether to dismiss or snap back based on velocity and position
        const dragDistance = gestureState.moveY - startDragY.current;
        const dragPercentage = dragDistance / modalContentHeight.current;
        
        if (gestureState.vy > 0.5 || dragPercentage > 0.25) {
          // Close the modal if dragged down quickly or far enough
          hidePartnerDetails();
        } else {
          // Otherwise snap back to open position
          snapModalOpen();
        }
      }
    })
  ).current;
  
  // Function to show partner details with animation
  const showPartnerDetailsWithAnimation = (partnerLocation: PartnerLocation) => {
    setSelectedPartner(partnerLocation);
    setShowPartnerDetails(true);
    
    // Reset position before animation starts
    modalPosition.setValue(SCREEN_HEIGHT);
    backdropOpacity.setValue(0);
    modalOpacity.setValue(0);
    
    // Animate the modal sliding up and fading in
    Animated.parallel([
      Animated.timing(modalPosition, {
        toValue: SCREEN_HEIGHT * 0.25, // Initially show 75% of the screen
        duration: 300,
        useNativeDriver: false,
        easing: Easing.out(Easing.cubic)
      }),
      Animated.timing(backdropOpacity, {
        toValue: 0.5,
        duration: 300,
        useNativeDriver: false
      }),
      Animated.timing(modalOpacity, {
        toValue: 1,
        duration: 250,
        useNativeDriver: false
      })
    ]).start();
  };
  
  // Function to hide partner details with animation
  const hidePartnerDetails = () => {
    Animated.parallel([
      Animated.timing(modalPosition, {
        toValue: SCREEN_HEIGHT,
        duration: 250,
        useNativeDriver: false,
        easing: Easing.in(Easing.cubic)
      }),
      Animated.timing(backdropOpacity, {
        toValue: 0,
        duration: 250,
        useNativeDriver: false
      }),
      Animated.timing(modalOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: false
      })
    ]).start(() => {
      // Only hide modal after animation completes
      setShowPartnerDetails(false);
    });
  };
  
  // Function to snap modal open
  const snapModalOpen = () => {
    Animated.spring(modalPosition, {
      toValue: SCREEN_HEIGHT * 0.25,
      damping: 20,
      stiffness: 90,
      mass: 1,
      useNativeDriver: false
    }).start();
    
    Animated.timing(backdropOpacity, {
      toValue: 0.5,
      duration: 200,
      useNativeDriver: false
    }).start();
  };
  
  // Function to expand modal to full view
  const expandModalFull = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    Animated.spring(modalPosition, {
      toValue: SCREEN_HEIGHT * 0.15,
      damping: 15,
      stiffness: 90,
      mass: 1,
      useNativeDriver: false
    }).start();
  };
  
  // Add a function to fetch parcel statistics
  const fetchParcelStats = async (userId: string | null) => {
    if (!userId) return;
    
    try {
      const stats = await parcelService.getParcelStatistics(userId);
      setParcelStats(stats);
    } catch (error) {
      console.error('Error fetching parcel statistics:', error);
    }
  };

  // Update onRefresh to also refresh statistics
  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    setDeliveriesError(null);
    try {
      await Promise.all([fetchPartnerLocations(), fetchActiveDeliveries(), fetchParcelStats(userId)]);
    } catch (error) {
      console.error('Error refreshing data:', error);
      setDeliveriesError('Failed to refresh. Please try again.');
    } finally {
      setIsRefreshing(false);
    }
  }, [userId]);

  // Focus effect to refresh data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      onRefresh();
      return () => {}; // Clean up function
    }, [onRefresh])
  );

  // Initialize data on component mount with better error handling
  useEffect(() => {
    const initializeData = async () => {
      setIsLoading(true);
      try {
        await requestLocationPermission();
        await Promise.all([fetchPartnerLocations(), fetchActiveDeliveries()]);
      } catch (error) {
        console.error('Error initializing data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    initializeData();
  }, []);

  // Update the useEffect that fetches user data to also get statistics
  useEffect(() => {
    const getUserData = async () => {
      try {
        // First check AsyncStorage since it's more reliable across app restarts
        const hasActiveSession = await AsyncStorage.getItem('hasActiveSession');
        const storedUserJson = await AsyncStorage.getItem('mbet.user');
        
        // If we have stored user data, use it first
        if (hasActiveSession === 'true' && storedUserJson) {
          try {
            const storedUser = JSON.parse(storedUserJson);
            console.log('Found stored user data:', storedUser.id);
            
            if (storedUser.id) {
              setUserId(storedUser.id);
            }
            
            if (storedUser.full_name) {
              setUserName(storedUser.full_name);
            } else {
              // Fallback to email or username
              setUserName(storedUser.email?.split('@')[0] || 'User');
            }
          } catch (parseError) {
            console.error('Error parsing stored user data:', parseError);
          }
        }
        
        // Then try to get user from Supabase Auth to ensure we have the latest data
        try {
          const { data: { user } } = await supabase.auth.getUser();
          
          if (user) {
            console.log('Found authenticated user:', user.id);
            setUserId(user.id);
            
            // Fetch parcel statistics after setting user ID
            fetchParcelStats(user.id);
            
            const { data: profileData } = await supabase
              .from('profiles')
              .select('full_name')
              .eq('id', user.id)
              .single();
              
            if (profileData && profileData.full_name) {
              setUserName(profileData.full_name);
            } else if (user.user_metadata?.full_name) {
              setUserName(user.user_metadata.full_name);
            }
          } else if (!storedUserJson) {
            // Only reset to default if we didn't find stored user data
            setUserName('User');
            setUserId(null);
          }
        } catch (authError) {
          console.error('Supabase auth error:', authError);
          // Keep the data from AsyncStorage if auth fails
        }
      } catch (error) {
        console.error('Error in getUserData:', error);
        setUserName('User');
      }
    };
    
    getUserData();
  }, []);

  // Request location permission and center map
  const requestLocationPermission = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        setLocationPermissionGranted(true);
        // Get current position with high accuracy
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Highest,
        });
        
        // Update state with new location
        const newLocation = {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        };
        
        // Update state with the new location
        setUserLocation(newLocation);
        
        // Directly recenter the map if we have a reference
        if (mapRef.current) {
          // @ts-ignore - Method exists on the component instance but TypeScript doesn't know about it
          mapRef.current.centerOnLocation?.(newLocation);
        }
        
        return newLocation;
      } else {
        Alert.alert(
          "Permission Required",
          "Location permission is needed to show your position on the map",
          [{ text: "OK", onPress: () => {} }],
          { cancelable: true }
        );
      }
    } catch (error) {
      console.error('Error getting location:', error);
      
      // Notify user if there's a problem
      Alert.alert(
        "Location Error",
        "Could not get your current location. Please check your device settings.",
        [{ text: "OK", onPress: () => {} }],
        { cancelable: true }
      );
    }
    
    return null;
  };

  // Fetch active deliveries for the current user
  const fetchActiveDeliveries = async () => {
    try {
      // Get the current authenticated user
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        console.log('No authenticated user found');
        setActiveDeliveries([]);
        setDeliveriesError("Please sign in to view your deliveries");
        return;
      }

      setIsDeliveriesLoading(true);
      setDeliveriesError(null);

      console.log('Fetching deliveries for user ID:', user.id);
      
      // Fetch deliveries from the parcels_with_addresses view to get pickup/dropoff point information
      const { data: deliveries, error } = await supabase
        .from('parcels_with_addresses')
        .select('*')
        .in('status', ['pending', 'accepted', 'picked_up', 'in_transit'])
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`);

      if (error) {
        console.error('Error loading deliveries from view:', JSON.stringify(error));
        
        // Fallback to fetching from the parcels table directly
        console.log('Falling back to fetching from parcels table');
        
        try {
          const { data: basicDeliveries, error: basicError } = await supabase
            .from('parcels')
            .select(`
              id, tracking_code, package_size, weight, is_fragile, status, 
              created_at, updated_at, sender_id, receiver_id,
              pickup_address_id, dropoff_address_id, pickup_point_id, dropoff_point_id,
              estimated_price
            `)
            .in('status', ['pending', 'accepted', 'picked_up', 'in_transit'])
            .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`);
          
          if (basicError || !basicDeliveries || basicDeliveries.length === 0) {
            console.error('Basic query also failed:', basicError);
            setActiveDeliveries([]);
            setDeliveriesError('No active deliveries found');
            setIsDeliveriesLoading(false);
            return;
          }
          
          // Sort deliveries by created_at or updated_at (most recent first)
          const sortedDeliveries = basicDeliveries.sort((a, b) => {
            const dateA = new Date(a.updated_at || a.created_at || '');
            const dateB = new Date(b.updated_at || b.created_at || '');
            return dateB.getTime() - dateA.getTime();
          });
          
          // Cast the deliveries to the expected type - this is safe because we'll 
          // handle missing fields in the rendering code
          setActiveDeliveries(sortedDeliveries as unknown as Parcel[]);
          setDeliveriesError(null);
          setIsDeliveriesLoading(false);
          return;
        } catch (fallbackError) {
          console.error('Fallback query failed:', fallbackError);
          setActiveDeliveries([]);
          setDeliveriesError(`Error loading deliveries: ${error.message || 'Unknown error'}`);
          setIsDeliveriesLoading(false);
          return;
        }
      }
      
      if (!deliveries || deliveries.length === 0) {
        console.log('No deliveries found for user:', user.id);
        setActiveDeliveries([]);
        setDeliveriesError('No active deliveries found');
        setIsDeliveriesLoading(false);
        return;
      }
      
      // Sort deliveries by created_at or updated_at (most recent first)
      const sortedDeliveries = deliveries.sort((a, b) => {
        const dateA = new Date(a.updated_at || a.updatedAt || a.created_at || a.createdAt);
        const dateB = new Date(b.updated_at || b.updatedAt || b.created_at || b.createdAt);
        return dateB.getTime() - dateA.getTime();
      });
      
      setActiveDeliveries(sortedDeliveries);
      setDeliveriesError(null);
      setIsDeliveriesLoading(false);
    } catch (error) {
      console.error('Error fetching deliveries:', error);
      setActiveDeliveries([]);
      setDeliveriesError("Failed to load deliveries. Please try again.");
      setIsDeliveriesLoading(false);
    }
  };

  // Fetch partner locations
  const fetchPartnerLocations = async () => {
    try {
      // Use the partner_locations view for more complete data in a single query
      const { data: partnerLocations, error } = await supabase
        .from('partner_locations')
        .select(`
          id,
          business_name,
          contact_person,
          phone_number,
          email,
          business_type,
          description,
          working_hours,
          color,
          is_facility,
          is_active,
          address_line,
          city,
          latitude,
          longitude
        `)
        .eq('is_active', true);

      if (error) throw error;
      
      if (!partnerLocations || partnerLocations.length === 0) {
        console.warn('No partner locations found');
        return;
      }
      
      // Format working hours helper function
      const formatWorkingHours = (workingHours: any): string => {
        if (!workingHours) return 'Not specified';
        
        if (typeof workingHours === 'string') {
          try {
            workingHours = JSON.parse(workingHours);
          } catch (e) {
            return workingHours;
          }
        }
        
        try {
          // Avoid deep cloning to prevent performance issues
          const hours = workingHours;
          
          // Get current day and time - optimized
          const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
          const today = new Date();
          const currentDay = days[today.getDay()];
          const currentHour = today.getHours();
          const currentMinute = today.getMinutes();
          
          // Days of the week in order
          const daysOfWeek = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
          
          // Format each day with minimal processing
          const formattedDays = daysOfWeek.map(day => {
            const dayData = hours[day];
            if (!dayData) return `${capitalizeFirstLetter(day)}: Closed`;
            
            const open = dayData.open;
            const close = dayData.close;
            
            if (!open || !close) return `${capitalizeFirstLetter(day)}: Closed`;
            
            // Only add status tag for today to reduce calculations
            let statusTag = '';
            if (day === currentDay) {
              // Simple time check
              const [openHour, openMinute] = open.split(':').map(Number);
              const [closeHour, closeMinute] = close.split(':').map(Number);
              
              const isOpen = 
                (currentHour > openHour || (currentHour === openHour && currentMinute >= openMinute)) && 
                (currentHour < closeHour || (currentHour === closeHour && currentMinute <= closeMinute));
                
              statusTag = isOpen ? ' (Open now)' : ' (Closed now)';
            }
            
            return `${capitalizeFirstLetter(day)}: ${open} - ${close}${statusTag}`;
          });
          
          return formattedDays.join('\n');
        } catch (e) {
          console.error('Error formatting working hours:', e);
          return 'Hours not available';
        }
      };
      
      // Helper function to capitalize first letter
      const capitalizeFirstLetter = (string: string): string => {
        return string.charAt(0).toUpperCase() + string.slice(1);
      };

      // Transform partner location data to the format expected by the UI
      const locations = partnerLocations.map(partner => {
        // Special icon and size for sorting facility
        let icon = undefined;
        let size = undefined;
        
        // Determine if this is a sorting facility
        const isFacility = partner.is_facility === true;
        
        // Set icon and size based on business type and facility status
        if (isFacility) {
          icon = 'local-shipping';
          size = 40; // Larger marker for the facility
        } else if (partner.business_type === 'pickup_point') {
          icon = 'add-location';
          size = 35;
        } else if (partner.business_type === 'dropoff_point') {
          icon = 'flag';
          size = 35;
        } else if (partner.business_type === 'both') {
          icon = 'store';
          size = 35;
        }
        
        // Create a formatted partner location object
        return {
          id: partner.id,
          latitude: partner.latitude,
          longitude: partner.longitude,
          title: partner.business_name?.substring(0, 2) || 'MP',
          color: partner.color || '#4CAF50', // Default to green if no color specified
          businessName: partner.business_name || 'MBet Partner',
          workingHours: formatWorkingHours(partner.working_hours),
          phoneNumber: partner.phone_number || 'Not available',
          contactPerson: partner.contact_person || 'Not specified',
          email: partner.email || 'Not available',
          address: partner.address_line || 'Address not available',
          description: partner.description || `${partner.business_name} - ${partner.address_line}`,
          isFacility: isFacility,
          icon: icon,
          size: size,
          businessType: partner.business_type
        };
      });

      setPartnerLocations(locations);
    } catch (error) {
      console.error('Error fetching partner locations:', error);
    }
  };

  // Override the original handleMarkerPress to use our animated version
  const handleMarkerPress = (marker: Marker) => {
    const partnerLocation = partnerLocations.find(loc => loc.id === marker.id);
    if (partnerLocation) {
      showPartnerDetailsWithAnimation(partnerLocation);
    }
  };

  // Enhanced toggle function with improved animations
  const toggleMapView = (newState: 'expanded' | 'default' | 'collapsed') => {
    if (newState === mapViewState) return;
    
    let targetHeight;
    
    switch(newState) {
      case 'expanded':
        targetHeight = MAP_HEIGHT_EXPANDED;
        // Scroll to top when expanding
        scrollViewRef.current?.scrollTo({ y: 0, animated: true });
        break;
      case 'collapsed':
        targetHeight = MAP_HEIGHT_COLLAPSED;
        // Scroll down to show content when collapsing
        setTimeout(() => {
          scrollViewRef.current?.scrollTo({ y: MAP_HEIGHT_COLLAPSED + 20, animated: true });
        }, 100);
        break;
      case 'default':
      default:
        targetHeight = MAP_HEIGHT_DEFAULT;
        break;
    }
    
    // Update state with layout animation for smoother transitions
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setMapViewState(newState);
    
    // Hide tooltip after first interaction
    if (showTooltip) {
      setShowTooltip(false);
    }
    
    // Run map height animation
    Animated.timing(mapHeightAnimation, {
      toValue: targetHeight,
      duration: 300,
      useNativeDriver: false,
      easing: Easing.out(Easing.cubic)
    }).start();
  };
  
  // Compatibility function for existing code
  const toggleMapExpansion = () => {
    const newState = mapViewState === 'expanded' ? 'default' : 'expanded';
    toggleMapView(newState);
  };

  // Transform markers for the map with unique styling per partner
  const transformedMarkers = useMemo(() => 
    partnerLocations.map((location, index) => ({
      id: location.id,
      latitude: location.latitude,
      longitude: location.longitude,
      title: location.title,
      color: location.color,
      size: location.size || (30 + (index % 3) * 5), // Use specified size or default with variation
      zIndex: location.isFacility ? 1000 : (index + 1), // Ensure facility is on top
      description: location.description,
      icon: location.isFacility ? 'local-shipping' : location.icon,
      iconColor: location.isFacility ? '#000' : undefined
    })),
  [partnerLocations]);

  // Get status style for delivery cards
  const getStatusStyle = (status: string) => {
    switch(status) {
      case 'pending': 
        return styles.statusPending;
      case 'picked_up':
      case 'in_transit':
        return styles.statusInTransit;
      case 'delivered':
        return styles.statusDelivered;
      case 'cancelled':
        return styles.statusCancelled;
      default:
        return {};
    }
  };

  // Get icon for delivery status
  const getStatusIcon = (status: string) => {
    switch(status) {
      case 'pending': 
        return <MaterialIcons name="hourglass-bottom" size={16} color="#fff" />;
      case 'picked_up':
      case 'in_transit':
        return <MaterialCommunityIcons name="truck-fast" size={16} color="#fff" />;
      case 'delivered':
        return <MaterialIcons name="check-circle" size={16} color="#fff" />;
      case 'cancelled':
        return <MaterialIcons name="cancel" size={16} color="#fff" />;
      default:
        return null;
    }
  };

  // Format price for display
  const formatPrice = (price: number) => {
    return `ETB ${price.toFixed(2)}`;
  };

  // Handle Profile navigation - check for route availability first
  const navigateToProfile = () => {
    try {
      // Try multiple navigation patterns to ensure cross-platform compatibility
      const state = navigation.getState?.();
      
      // Attempt different navigation patterns based on structure
      if (!state) {
        // Simple push if getState is not available
        // @ts-ignore - handle different navigation versions
        navigation.navigate('profile');
        return;
      }
      
      const routeNames = state.routeNames || [];
      
      // Check for different route patterns in order of likelihood
      if (routeNames.includes('profile')) {
        navigation.navigate('profile');
      } else if (routeNames.includes('Profile')) {
        navigation.navigate('Profile');
      } else if (routeNames.includes('(tabs)')) {
        // Expo Router structure
        navigation.navigate('(tabs)', { screen: 'profile' });
      } else if (routeNames.some((r: string) => r.toLowerCase().includes('profile'))) {
        // Find any route that includes 'profile'
        const profileRoute = routeNames.find((r: string) => r.toLowerCase().includes('profile'));
        if (profileRoute) navigation.navigate(profileRoute);
      } else {
        console.log('Profile route not available');
        // Add a fallback action if needed, like showing profile info directly
      }
    } catch (error) {
      // Silent fail - don't show errors to user
      console.log('Navigation to profile failed silently');
    }
  };

  // Handle scroll events to dynamically adjust the UI
  const handleScroll = (event: { nativeEvent: { contentOffset: { y: number } } }) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    setScrollPosition(offsetY);
    
    // Auto-collapse map when scrolling down significantly
    if (offsetY > 100 && mapViewState === 'default') {
      toggleMapView('collapsed');
    }
    
    // Auto-expand map when scrolling to top
    if (offsetY < 10 && mapViewState === 'collapsed') {
      toggleMapView('default');
    }
    
    // Hide tooltip on scroll
    if (showTooltip && offsetY > 20) {
      setShowTooltip(false);
    }
  };

  // Render the screen
  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={styles.loadingText}>Loading MBet-Adera Services...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      
      {/* Fixed Header */}
      <View style={styles.header}>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>MBet-Adera</Text>
          <Text style={styles.headerSubtitle}>Parcel Delivery Tracking System</Text>
        </View>
        
        <TouchableOpacity 
          style={styles.profileButton}
          onPress={navigateToProfile}
        >
          <View style={styles.profileContainer}>
            <Image 
              source={require('../../../assets/images/avatar 9.jpg')}
              style={styles.profileAvatar}
            />
            <Text style={styles.profileName}>{userName}</Text>
          </View>
        </TouchableOpacity>
      </View>
      
      {/* Main Scrollable Content */}
      <ScrollView 
        ref={scrollViewRef}
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={true}
        scrollEventThrottle={16}
        onScroll={handleScroll}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            colors={['#4CAF50']}
            tintColor="#4CAF50"
          />
        }
      >
        {/* Map Section with Dynamic Height */}
        <View style={styles.mapWrapper}>
          <Animated.View style={[styles.mapContainer, { height: mapHeightAnimation }]}>
            <View style={styles.mapHeader}>
              <Text style={styles.mapTitle}>Pickup & Dropoff Locations</Text>
              
              <View style={styles.mapControls}>
                {/* Map collapse/expand button with tooltip */}
                <View style={styles.controlContainer}>
                  <TouchableOpacity 
                    style={styles.mapControlButton}
                    onPress={() => toggleMapView(mapViewState === 'default' ? 'collapsed' : 'default')}
                  >
                    <MaterialIcons 
                      name={mapViewState === 'default' ? "keyboard-arrow-up" : "keyboard-arrow-down"} 
                      size={28} 
                      color="#4CAF50" 
                    />
                  </TouchableOpacity>
                  
                  {/* Tooltip for new users */}
                  {showTooltip && (
                    <View style={styles.tooltip}>
                      <Text style={styles.tooltipText}>
                        {mapViewState === 'default' ? 'Tap to see more content below' : 'Tap to show more map'}
                      </Text>
                      <View style={styles.tooltipArrow} />
                    </View>
                  )}
                </View>
                
                {/* Full-screen toggle button */}
                <TouchableOpacity 
                  style={styles.mapControlButton}
                  onPress={toggleMapExpansion}
                >
                  <MaterialIcons 
                    name={mapViewState === 'expanded' ? "fullscreen-exit" : "fullscreen"} 
                    size={24} 
                    color="#4CAF50" 
                  />
                </TouchableOpacity>
              </View>
            </View>
            
            <OpenStreetMap
              ref={mapRef}
              markers={transformedMarkers}
              initialLocation={userLocation}
              onMarkerPress={handleMarkerPress}
              style={styles.map}
              showCurrentLocation={true}
              zoomLevel={13}
              showZoomControls={true}
              hideIndicator={false}
            />
            
            {/* Content Indicator - Shown on both platforms */}
            <View style={[styles.contentIndicator, mapViewState === 'expanded' && styles.hidden]}>
              <View style={styles.contentIndicatorBar} />
              <Text style={styles.contentIndicatorText}>
                Scroll for deliveries & others view
              </Text>
            </View>

            {/* My location button */}
            {Platform.OS !== 'web' && (
              <TouchableOpacity 
                style={styles.locationButton}
                onPress={requestLocationPermission}
              >
                <MaterialIcons name="my-location" size={24} color="#4CAF50" />
              </TouchableOpacity>
            )}
          </Animated.View>
        </View>
        
        {/* Content Cards Section */}
        <View style={styles.contentCardsSection}>
          {/* Quick Actions Card - NEW COMPONENT */}
          <View style={styles.quickActionsCard}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Quick Actions</Text>
            </View>
            
            <View style={styles.quickActionsContent}>
              <TouchableOpacity 
                style={styles.actionButton}
                onPress={() => router.push('/(tabs)/create-order')}
              >
                <View style={[styles.actionIconCircle, {backgroundColor: '#E8F5E9'}]}>
                  <MaterialIcons name="add-box" size={24} color="#4CAF50" />
                </View>
                <Text style={styles.actionText}>Send Order</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.actionButton}
                onPress={() => {
                  try {
                    // Check if barcode scanner module is available
                    const hasBarcodeScanner = (() => {
                      try {
                        return !!require('expo-barcode-scanner');
                      } catch (err) {
                        return false;
                      }
                    })();
                    
                    if (!hasBarcodeScanner) {
                      Alert.alert(
                        "Scanner Not Available in Expo Go",
                        "QR scanner requires a development build to access your device's camera. This limitation is due to how native modules work with Expo.",
                        [
                          { 
                            text: "Learn About Dev Builds", 
                            onPress: () => Linking.openURL('https://docs.expo.dev/develop/development-builds/create-a-build/') 
                          },
                          { text: "OK" }
                        ]
                      );
                      return;
                    }
                    
                    // Navigate to the scan modal
                    router.push('/scan?navigateOnScan=true');
                  } catch (err) {
                    console.error('Error navigating to scanner:', err);
                    Alert.alert('Error', 'Could not open the scanner. Please try again.');
                  }
                }}
              >
                <View style={[styles.actionIconCircle, {backgroundColor: '#E3F2FD'}]}>
                  <MaterialIcons name="qr-code-scanner" size={24} color="#2196F3" />
                </View>
                <Text style={styles.actionText}>Scan QR</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.actionButton}
                onPress={() => navigation.navigate('TrackDelivery')}
              >
                <View style={[styles.actionIconCircle, {backgroundColor: '#FFF3E0'}]}>
                  <MaterialIcons name="search" size={24} color="#FF9800" />
                </View>
                <Text style={styles.actionText}>Track</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.actionButton}
                onPress={() => navigation.navigate('Support')}
              >
                <View style={[styles.actionIconCircle, {backgroundColor: '#F3E5F5'}]}>
                  <MaterialIcons name="headset-mic" size={24} color="#9C27B0" />
                </View>
                <Text style={styles.actionText}>Support</Text>
              </TouchableOpacity>
            </View>
          </View>
          
          {/* Parcel Stats Summary Card */}
          <View style={styles.statsCard}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Your Parcels Summary</Text>
              <TouchableOpacity 
                onPress={onRefresh}
                disabled={isRefreshing}
                style={styles.refreshButton}
              >
                <Ionicons 
                  name="refresh" 
                  size={18} 
                  color="#4CAF50" 
                  style={isRefreshing ? styles.refreshingIcon : undefined}
                />
              </TouchableOpacity>
            </View>
            
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <View style={[styles.statIconCircle, {backgroundColor: '#E3F2FD'}]}>
                  <MaterialCommunityIcons name="package-variant" size={22} color="#2196F3" />
                </View>
                <Text style={styles.statValue}>{parcelStats.total}</Text>
                <Text style={styles.statLabel}>Total</Text>
              </View>
              
              <View style={styles.statDivider} />
              
              <View style={styles.statItem}>
                <View style={[styles.statIconCircle, {backgroundColor: '#FFF8E1'}]}>
                  <MaterialCommunityIcons name="truck-fast-outline" size={22} color="#FFA000" />
                </View>
                <Text style={styles.statValue}>{parcelStats.active}</Text>
                <Text style={styles.statLabel}>Active</Text>
              </View>
              
              <View style={styles.statDivider} />
              
              <View style={styles.statItem}>
                <View style={[styles.statIconCircle, {backgroundColor: '#E8F5E9'}]}>
                  <MaterialIcons name="check-circle-outline" size={22} color="#4CAF50" />
                </View>
                <Text style={styles.statValue}>{parcelStats.delivered}</Text>
                <Text style={styles.statLabel}>Delivered</Text>
              </View>
              
              <View style={styles.statDivider} />
              
              <View style={styles.statItem}>
                <View style={[styles.statIconCircle, {backgroundColor: '#FFEBEE'}]}>
                  <MaterialIcons name="cancel" size={22} color="#F44336" />
                </View>
                <Text style={styles.statValue}>{parcelStats.cancelled}</Text>
                <Text style={styles.statLabel}>Cancelled</Text>
              </View>
            </View>
          </View>
          
          {/* Active Deliveries Card */}
          <View style={styles.deliveriesCard}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Active Deliveries</Text>
              <TouchableOpacity 
                style={styles.refreshButton}
                onPress={onRefresh}
                disabled={isRefreshing}
              >
                <Ionicons 
                  name="refresh" 
                  size={20} 
                  color="#4CAF50" 
                  style={isRefreshing ? styles.refreshingIcon : null}
                />
              </TouchableOpacity>
            </View>
            
            <View style={styles.deliveriesContentContainer}>
              {activeDeliveries.length === 0 ? (
                <View style={styles.emptyStateContainer}>
                  {isDeliveriesLoading ? (
                    <>
                      <ActivityIndicator size="large" color="#4CAF50" style={{ marginBottom: 20 }} />
                      <Text style={styles.emptyText}>Loading your deliveries...</Text>
                    </>
                  ) : deliveriesError ? (
                    <>
                      <MaterialIcons name="error-outline" size={80} color="#F44336" />
                      <Text style={styles.emptyText}>{deliveriesError}</Text>
                      <TouchableOpacity 
                        style={styles.retryButton}
                        onPress={() => fetchActiveDeliveries()}
                      >
                        <Text style={styles.retryButtonText}>Retry</Text>
                      </TouchableOpacity>
                    </>
                  ) : (
                    <>
                      <MaterialIcons name="inventory" size={80} color="#CCCCCC" />
                      <Text style={styles.emptyText}>No active deliveries</Text>
                      <Text style={styles.emptySubtext}>
                        {userId ? 'Create a new delivery to get started' : 'Sign in to view your deliveries'}
                      </Text>
                    </>
                  )}
                </View>
              ) : (
                activeDeliveries.map((delivery) => (
                  <TouchableOpacity
                    key={delivery.id}
                    style={styles.deliveryCard}
                    onPress={() => router.push(`/orders-screen/${delivery.id}`)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.deliveryHeader}>
                      <Text style={styles.deliveryId}>#{delivery.tracking_code}</Text>
                      <View style={[styles.statusBadge, getStatusStyle(delivery.status)]}>
                        {getStatusIcon(delivery.status)}
                        <Text style={styles.statusText}>{delivery.status_display || delivery.status}</Text>
                      </View>
                    </View>
                    
                    <View style={styles.deliveryDetails}>
                      {delivery.package_size && (
                        <View style={styles.packageInfo}>
                          <Text style={styles.packageSize}>
                            {delivery.package_size.charAt(0).toUpperCase() + delivery.package_size.slice(1)} package
                          </Text>
                          {delivery.is_fragile && (
                            <View style={styles.fragileTag}>
                              <FontAwesome5 name="glass-whiskey" size={10} color="#fff" style={{marginRight: 4}} />
                              <Text style={styles.fragileText}>Fragile</Text>
                            </View>
                          )}
                        </View>
                      )}
                      
                      {delivery.package_description && (
                        <Text style={styles.packageDescription} numberOfLines={1} ellipsizeMode="tail">
                          {delivery.package_description}
                        </Text>
                      )}
                      
                      <View style={styles.userRoleContainer}>
                        <Text style={styles.userRoleText}>
                          {(() => {
                            try {
                              // Check both camelCase and snake_case properties
                              const isSender = 
                                (delivery.sender_id && delivery.sender_id === userId) || 
                                (delivery.senderId && delivery.senderId === userId);
                              
                              return isSender ? 'You are the sender' : 'You are the recipient';
                            } catch (e) {
                              // Fallback in case of any errors
                              return 'Your delivery';
                            }
                          })()}
                        </Text>
                      </View>
                      
                      {delivery.estimated_price && (
                        <Text style={styles.priceText}>
                          {delivery.formatted_price || formatPrice(delivery.estimated_price)}
                          {delivery.formatted_distance && ` • ${delivery.formatted_distance}`}
                        </Text>
                      )}
                    </View>
                    
                    <View style={styles.addressContainer}>
                      <View style={styles.addressItem}>
                        <View style={styles.addressHeader}>
                          <MaterialIcons name="location-on" size={16} color="#4CAF50" style={styles.addressIcon} />
                          <Text style={styles.addressLabel}>From:</Text>
                          {delivery.pickup_business_name && (
                            <View style={[styles.partnerTag, {backgroundColor: delivery.pickup_partner_color || '#4CAF50'}]}>
                              <Text style={styles.partnerText}>{delivery.pickup_business_name}</Text>
                            </View>
                          )}
                        </View>
                        <Text style={styles.addressText}>{delivery.pickup_address || 'N/A'}</Text>
                      </View>
                      
                      <View style={styles.routeContainer}>
                        <View style={styles.routeLine} />
                        <MaterialIcons name="arrow-downward" size={16} color="#999" />
                      </View>
                      
                      <View style={styles.addressItem}>
                        <View style={styles.addressHeader}>
                          <MaterialIcons name="flag" size={16} color="#F44336" style={styles.addressIcon} />
                          <Text style={styles.addressLabel}>To:</Text>
                          {delivery.dropoff_business_name && (
                            <View style={[styles.partnerTag, {backgroundColor: delivery.dropoff_partner_color || '#2196F3'}]}>
                              <Text style={styles.partnerText}>{delivery.dropoff_business_name}</Text>
                            </View>
                          )}
                        </View>
                        <Text style={styles.addressText}>{delivery.dropoff_address || 'N/A'}</Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                ))
              )}
            </View>
          </View>
        </View>
      </ScrollView>
      
      {/* Partner details modal - replace the existing Modal component with this animated version */}
      {showPartnerDetails && (
        <View style={StyleSheet.absoluteFill}>
          <Animated.View 
            style={[
              styles.modalBackdrop,
              { opacity: backdropOpacity }
            ]}
            onTouchEnd={hidePartnerDetails}
          />
          
          <Animated.View 
            style={[
              styles.modalContainer,
              {
                transform: [{ translateY: modalPosition }],
                opacity: modalOpacity
              }
            ]}
            onLayout={(e) => {
              // Save content height for calculations
              modalContentHeight.current = e.nativeEvent.layout.height;
            }}
          >
            {/* Handle for dragging - this is the part users can drag */}
            <View 
              style={styles.modalDragHandle}
              {...panResponder.panHandlers}
            >
              <View style={styles.dragIndicator} />
            </View>
            
            {selectedPartner && (
              <>
                <LinearGradient
                  colors={[selectedPartner.color, `${selectedPartner.color}CC`]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.partnerHeader}
                >
                  <View style={styles.partnerHeaderContent}>
                    <Text style={styles.modalTitle}>{selectedPartner.businessName}</Text>
                    
                    <View style={styles.badgeContainer}>
                      {selectedPartner.businessType && (
                        <View style={[styles.badge, { backgroundColor: 'rgba(255,255,255,0.3)' }]}>
                          <Text style={styles.badgeText}>
                            {selectedPartner.businessType === 'sorting_facility' ? 'Sorting Facility' : 
                             selectedPartner.businessType === 'pickup_point' ? 'Pickup Point' :
                             selectedPartner.businessType === 'dropoff_point' ? 'Dropoff Point' : 'Pickup & Dropoff'}
                          </Text>
                        </View>
                      )}
                      
                      {selectedPartner.isFacility && (
                        <View style={[styles.badge, { backgroundColor: 'rgba(0,0,0,0.3)' }]}>
                          <MaterialIcons name="local-shipping" size={14} color="#fff" style={{marginRight: 4}} />
                          <Text style={styles.badgeText}>Facility</Text>
                        </View>
                      )}
                    </View>
                  </View>
                  
                  <View style={styles.partnerInitialsCircle}>
                    <Text style={styles.partnerInitialsText}>{selectedPartner.title}</Text>
                  </View>
                  
                  <TouchableOpacity
                    style={styles.closeButton}
                    onPress={hidePartnerDetails}
                  >
                    <MaterialIcons name="close" size={24} color="#fff" />
                  </TouchableOpacity>
                </LinearGradient>
                
                <ScrollView 
                  style={styles.partnerDetailsScrollView}
                  onScroll={(e) => {
                    // When user scrolls down in the content, expand the modal to full view
                    if (e.nativeEvent.contentOffset.y > 10) {
                      expandModalFull();
                    }
                  }}
                  scrollEventThrottle={16}
                >
                  <View style={styles.partnerDetailsContainer}>
                    {/* Expand button for easier interaction */}
                    <TouchableOpacity 
                      style={styles.expandDetailButton}
                      onPress={expandModalFull}
                    >
                      <MaterialIcons name="expand-less" size={24} color="#666" />
                      <Text style={styles.expandDetailText}>View full details</Text>
                    </TouchableOpacity>
                    
                    {/* Existing details content */}
                    {selectedPartner.description && (
                      <View style={styles.descriptionContainer}>
                        <Text style={styles.descriptionText}>{selectedPartner.description}</Text>
                      </View>
                    )}
                    
                    <View style={styles.partnerInfoItem}>
                      <MaterialIcons name="location-on" size={22} color="#4CAF50" style={styles.infoIcon} />
                      <View style={styles.infoTextContainer}>
                        <Text style={styles.partnerInfoLabel}>Location</Text>
                        <Text style={styles.partnerInfoValue}>{selectedPartner.address || 'Location not specified'}</Text>
                      </View>
                    </View>
                    
                    <View style={styles.partnerInfoItem}>
                      <MaterialIcons name="phone" size={22} color="#2196F3" style={styles.infoIcon} />
                      <View style={styles.infoTextContainer}>
                        <Text style={styles.partnerInfoLabel}>Contact</Text>
                        <TouchableOpacity 
                          onPress={() => {
                            const phoneNumber = selectedPartner.phoneNumber;
                            if (phoneNumber) {
                              Linking.openURL(`tel:${phoneNumber}`);
                            }
                          }}
                        >
                          <Text style={[styles.partnerInfoValue, styles.linkText]}>
                            {selectedPartner.phoneNumber || 'Not specified'}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                    
                    <View style={styles.partnerInfoItem}>
                      <MaterialIcons name="person" size={22} color="#FF9800" style={styles.infoIcon} />
                      <View style={styles.infoTextContainer}>
                        <Text style={styles.partnerInfoLabel}>Contact Person</Text>
                        <Text style={styles.partnerInfoValue}>{selectedPartner.contactPerson || 'Not specified'}</Text>
                      </View>
                    </View>
                    
                    <View style={styles.partnerInfoItem}>
                      <MaterialIcons name="email" size={22} color="#9C27B0" style={styles.infoIcon} />
                      <View style={styles.infoTextContainer}>
                        <Text style={styles.partnerInfoLabel}>Email</Text>
                        <TouchableOpacity 
                          onPress={() => {
                            const email = selectedPartner.email;
                            if (email) {
                              Linking.openURL(`mailto:${email}`);
                            }
                          }}
                        >
                          <Text style={[styles.partnerInfoValue, styles.linkText]}>
                            {selectedPartner.email || 'Not specified'}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>

                    {selectedPartner.workingHours && (
                      <TouchableOpacity 
                        style={styles.hoursContainer}
                        onPress={() => {
                          // Expand to see fuller details
                          LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                          expandModalFull();
                        }}
                        activeOpacity={0.7}
                      >
                        <View style={styles.hoursTitleContainer}>
                          <MaterialIcons name="access-time" size={22} color="#F44336" style={{marginRight: 8}} />
                          <Text style={styles.hoursTitle}>Working Hours</Text>
                          <MaterialIcons 
                            name={modalPositionValue < SCREEN_HEIGHT * 0.2 ? "expand-more" : "expand-less"} 
                            size={16} 
                            color="#666" 
                            style={{marginLeft: 'auto'}} 
                          />
                        </View>
                        
                        {selectedPartner.workingHours.split('\n').map((dayHours, index) => {
                          const isToday = dayHours.includes('(Open now)') || dayHours.includes('(Closed now)');
                          const isOpen = dayHours.includes('(Open now)');
                          const isClosed = dayHours.includes('Closed');
                          
                          // Always show all days of the week, removing the filtering condition
                          
                          // Extract day name and hours more cleanly
                          const [dayName, ...hoursParts] = dayHours.split(':');
                          const hoursText = hoursParts.join(':').trim();
                          
                          return (
                            <Animated.View 
                              key={index} 
                              style={[
                                styles.dayHoursRow,
                                isToday && styles.todayHoursRow
                              ]}
                            >
                              <View style={styles.dayNameContainer}>
                                {isToday && (
                                  <View style={styles.todayIndicator} />
                                )}
                                <Text style={[
                                  styles.dayName,
                                  isToday && styles.todayText
                                ]}>
                                  {dayName}
                                </Text>
                              </View>
                              
                              <View style={styles.hoursTextContainer}>
                                <View 
                                  style={[
                                    styles.statusDot, 
                                    isClosed ? styles.closedDot : styles.openDot
                                  ]} 
                                />
                                <Text style={[
                                  styles.hoursValue,
                                  isClosed && styles.closedHours,
                                  isOpen && styles.openNowText
                                ]}>
                                  {hoursText}
                                </Text>
                                
                                {isOpen && (
                                  <View style={styles.openNowBadge}>
                                    <Text style={styles.openNowBadgeText}>OPEN NOW</Text>
                                  </View>
                                )}
                                
                                {isToday && isClosed && (
                                  <View style={[styles.openNowBadge, styles.closedNowBadge]}>
                                    <Text style={[styles.openNowBadgeText, styles.closedNowBadgeText]}>CLOSED</Text>
                                  </View>
                                )}
                              </View>
                            </Animated.View>
                          );
                        })}
                      </TouchableOpacity>
                    )}
                    
                    {selectedPartner.isFacility && (
                      <View style={styles.facilityNoticeContainer}>
                        <View style={styles.facilityNotice}>
                          <MaterialIcons name="info" size={20} color="#FFA000" style={{marginRight: 8}} />
                          <Text style={styles.facilityNoticeText}>
                            This is a sorting facility for internal operations.
                          </Text>
                        </View>
                        <Text style={styles.facilityExplanation}>
                          MBet-Adera uses sorting facilities to efficiently route and process parcels. Please select a regular partner location for your pickup or dropoff needs.
                        </Text>
                      </View>
                    )}
                  </View>
                </ScrollView>
                
                <View style={styles.modalButtons}>
                  {!selectedPartner.isFacility && (
                    <>
                      <TouchableOpacity
                        style={[styles.modalButton, styles.pickupButton]}
                        onPress={() => {
                          hidePartnerDetails();
                          navigation.navigate('NewDelivery', { pickupLocation: selectedPartner });
                        }}
                      >
                        <MaterialIcons name="add-location" size={18} color="#fff" style={{marginRight: 8}} />
                        <Text style={styles.buttonText}>Use as Pickup</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.modalButton, styles.dropoffButton]}
                        onPress={() => {
                          hidePartnerDetails();
                          navigation.navigate('NewDelivery', { dropoffLocation: selectedPartner });
                        }}
                      >
                        <MaterialIcons name="flag" size={18} color="#fff" style={{marginRight: 8}} />
                        <Text style={styles.buttonText}>Use as Dropoff</Text>
                      </TouchableOpacity>
                    </>
                  )}
                </View>
              </>
            )}
          </Animated.View>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
    zIndex: 10,
  },
  headerTitleContainer: {
    flexDirection: 'column',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#212121',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#4CAF50',
  },
  profileButton: {
    padding: 5,
  },
  profileContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#4CAF50',
  },
  profileName: {
    fontSize: 12,
    marginTop: 4,
    color: '#666',
    textAlign: 'center',
    maxWidth: 80,
  },
  mapWrapper: {
    width: '100%',
  },
  mapContainer: {
    width: '100%',
    position: 'relative',
    backgroundColor: '#eee',
    overflow: 'hidden',
  },
  mapHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'rgba(255,255,255,0.9)',
  },
  mapTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#212121',
  },
  mapControls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  controlContainer: {
    position: 'relative',
  },
  mapControlButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
  tooltip: {
    position: 'absolute',
    top: -40,
    left: -70,
    width: 180,
    backgroundColor: 'rgba(0,0,0,0.75)',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 6,
  },
  tooltipText: {
    color: 'white',
    fontSize: 12,
    textAlign: 'center',
  },
  tooltipArrow: {
    position: 'absolute',
    bottom: -8,
    right: 20,
    width: 0,
    height: 0,
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderTopWidth: 8,
    borderStyle: 'solid',
    backgroundColor: 'transparent',
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: 'rgba(0,0,0,0.75)',
  },
  map: {
    flex: 1,
  },
  locationButton: {
    position: 'absolute',
    right: 16,
    bottom: 70,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 4,
  },
  contentIndicator: {
    position: 'absolute',
    bottom: 10,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingBottom: 8,
    backgroundColor: 'rgba(255,255,255,0.8)',
    zIndex: 100,
  },
  contentIndicatorBar: {
    width: 40,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#4CAF50',
    marginBottom: 4,
  },
  contentIndicatorText: {
    fontSize: 12,
    color: '#666',
  },
  contentCardsSection: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  // Quick Actions Card
  quickActionsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginTop: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212121',
  },
  quickActionsContent: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    padding: 16,
  },
  actionButton: {
    width: Platform.OS === 'web' ? '23%' : '25%',
    alignItems: 'center',
    marginBottom: 12,
  },
  actionIconCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  actionText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  // Stats Card
  statsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
    overflow: 'hidden',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  statItem: {
    flexDirection: 'column',
    alignItems: 'center',
    flex: 1,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#e0e0e0',
  },
  statIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#212121',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
  },
  // Deliveries Card
  deliveriesCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
    overflow: 'hidden',
  },
  deliveriesContentContainer: {
    padding: 16,
  },
  refreshButton: {
    padding: 5,
  },
  refreshingIcon: {
    transform: [{ rotate: '45deg' }],
  },
  // Empty state
  emptyStateContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '500',
    color: '#757575',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9E9E9E',
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#4CAF50',
    borderRadius: 20,
  },
  retryButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  // Delivery Card
  deliveryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  deliveryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  deliveryId: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#212121',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 30,
    backgroundColor: '#e0e0e0',
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: 'white',
    marginLeft: 4,
  },
  statusPending: {
    backgroundColor: '#FF9800',
  },
  statusInTransit: {
    backgroundColor: '#2196F3',
  },
  statusDelivered: {
    backgroundColor: '#4CAF50',
  },
  statusCancelled: {
    backgroundColor: '#F44336',
  },
  deliveryDetails: {
    marginBottom: 12,
  },
  packageInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  packageSize: {
    fontSize: 14,
    color: '#616161',
  },
  fragileTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF9800',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    marginLeft: 8,
  },
  fragileText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  packageDescription: {
    fontSize: 14,
    color: '#616161',
    marginBottom: 6,
  },
  priceText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#4CAF50',
  },
  addressContainer: {
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    paddingTop: 12,
  },
  addressItem: {
    marginBottom: 8,
  },
  addressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  addressIcon: {
    marginRight: 6,
  },
  addressLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#616161',
    marginRight: 6,
  },
  addressText: {
    fontSize: 14,
    color: '#212121',
    paddingLeft: 22, // Align with icon
  },
  routeContainer: {
    alignItems: 'center',
    paddingLeft: 8,
    marginVertical: 4,
  },
  routeLine: {
    width: 1,
    height: 16,
    backgroundColor: '#BDBDBD',
    marginBottom: 2,
  },
  partnerTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  partnerText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  modalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    maxHeight: '85%',
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -3,
    },
    shadowOpacity: 0.27,
    shadowRadius: 4.65,
    elevation: 6,
  },
  modalDragHandle: {
    height: 32,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  dragIndicator: {
    width: 40,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#e0e0e0',
  },
  expandDetailButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    marginBottom: 16,
  },
  expandDetailText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
  modalBlurContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    maxWidth: 400,
    maxHeight: '80%',
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  partnerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  partnerHeaderContent: {
    flex: 1,
  },
  partnerInitialsCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 16,
  },
  partnerInitialsText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  closeButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    zIndex: 10,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  partnerDetailsScrollView: {
    maxHeight: 350,
  },
  partnerDetailsContainer: {
    padding: 16,
    paddingBottom: 24,
  },
  descriptionContainer: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  descriptionText: {
    fontSize: 14,
    color: '#555',
    lineHeight: 20,
  },
  partnerInfoItem: {
    flexDirection: 'row',
    marginBottom: 16,
    alignItems: 'flex-start',
  },
  infoIcon: {
    marginRight: 12,
    marginTop: 2,
  },
  infoTextContainer: {
    flex: 1,
  },
  partnerInfoLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  partnerInfoValue: {
    fontSize: 15,
    color: '#333',
  },
  hoursContainer: {
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  hoursTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eaeaea',
  },
  hoursTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  dayHoursRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    minHeight: 44,
  },
  todayHoursRow: {
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    borderRadius: 8,
    paddingHorizontal: 12,
    marginHorizontal: -8,
    marginVertical: 6,
    paddingVertical: 14,
    borderBottomWidth: 0,
    borderWidth: 1,
    borderColor: 'rgba(76, 175, 80, 0.2)',
  },
  dayNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 110,
    paddingRight: 8,
  },
  todayIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4CAF50',
    marginRight: 8,
  },
  dayName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#555',
  },
  todayText: {
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  hoursTextContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    flexWrap: 'wrap',
    paddingLeft: 4,
  },
  hoursValue: {
    fontSize: 14,
    color: '#444',
    textAlign: 'right',
    flexShrink: 1,
  },
  openNowText: {
    color: '#4CAF50',
    fontWeight: 'bold',
  },
  closedHours: {
    color: '#999',
  },
  openNowBadge: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 8,
    marginTop: 2,
  },
  openNowBadgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  closedNowBadge: {
    backgroundColor: '#F44336',
  },
  closedNowBadgeText: {
    color: 'white',
  },
  
  // Enhanced modal button styles
  modalButtons: {
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#eaeaea',
    backgroundColor: '#fff',
  },
  modalButton: {
    flex: 1,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
    elevation: 2,
  },
  pickupButton: {
    backgroundColor: '#4CAF50',
  },
  dropoffButton: {
    backgroundColor: '#2196F3',
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  facilityNoticeContainer: {
    marginTop: 20,
    marginBottom: 16,
    padding: 16,
    backgroundColor: '#FFF9C4',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#FFA000',
  },
  facilityNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  facilityNoticeText: {
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  facilityExplanation: {
    color: '#666',
    fontSize: 13,
  },
  linkText: {
    color: '#2196F3',
    textDecorationLine: 'underline',
  },
  badgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    flexWrap: 'wrap',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 4,
    flexDirection: 'row',
    alignItems: 'center',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  // Loading state
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#555',
  },
  userRoleContainer: {
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  userRoleText: {
    fontSize: 12,
    color: '#1976D2',
    fontWeight: '500',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 5,
  },
  openDot: {
    backgroundColor: '#4CAF50',
  },
  closedDot: {
    backgroundColor: '#F44336',
  },
  hidden: {
    display: 'none',
  },
} as const);

export default HomeScreen; 