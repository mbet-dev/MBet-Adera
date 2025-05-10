import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Linking,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { ProhibitedItemsGuide } from '../../components/orders/ProhibitedItemsGuide';
import { Button } from 'react-native-paper';

export default function TermsModal() {
  const router = useRouter();
  const [showProhibitedItems, setShowProhibitedItems] = useState(false);

  const handleOpenTermsPDF = async () => {
    const url = 'https://drive.google.com/file/d/15G_zUgXuPjGqssps9xlJZu1QduP_s0jf/view?usp=sharing';
    try {
      await Linking.openURL(url);
    } catch (error) {
      console.error('Error opening URL:', error);
    }
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Terms & Conditions',
          headerStyle: {
            backgroundColor: '#4CAF50',
          },
          headerTintColor: '#fff',
          presentation: 'modal',
        }}
      />

      <ScrollView style={styles.container}>
        <View style={styles.section}>
          <Text style={styles.title}>Terms of Service</Text>
          <Text style={styles.text}>
            By using MBet-Adera's delivery services, you agree to comply with and be bound by the following terms and conditions.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>1. Service Usage</Text>
          <Text style={styles.text}>
            • You must be at least 18 years old to use our services{'\n'}
            • You must provide accurate and complete information{'\n'}
            • You are responsible for maintaining the security of your account{'\n'}
            • You agree to use the service only for lawful purposes
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>2. Delivery Terms</Text>
          <Text style={styles.text}>
            • We reserve the right to refuse service{'\n'}
            • All packages are subject to inspection{'\n'}
            • Sender is responsible for proper packaging{'\n'}
            • Insurance coverage may be limited for certain items
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>3. Prohibited Items</Text>
          <Text style={styles.text}>
            We maintain a strict policy against shipping prohibited items. These include but are not limited to:
          </Text>
          <TouchableOpacity
            style={styles.prohibitedItemsButton}
            onPress={() => setShowProhibitedItems(true)}
          >
            <MaterialIcons name="warning" size={24} color="#FF5252" />
            <Text variant="bodyLarge" style={styles.buttonText}>
              View Prohibited Items List
            </Text>
            <MaterialIcons name="chevron-right" size={24} color="#666666" />
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>4. Liability</Text>
          <Text style={styles.text}>
            • We are not liable for delays beyond our control{'\n'}
            • Claims must be filed within 30 days of delivery{'\n'}
            • Maximum liability is limited to the declared value{'\n'}
            • We are not responsible for indirect damages
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>5. Privacy Policy</Text>
          <Text style={styles.text}>
            • We collect and use your data as described in our Privacy Policy{'\n'}
            • We may share information with delivery partners{'\n'}
            • We implement security measures to protect your data{'\n'}
            • You can request data deletion at any time
          </Text>
        </View>

        <TouchableOpacity
          style={styles.pdfButton}
          onPress={handleOpenTermsPDF}
        >
          <MaterialIcons name="description" size={24} color="#4CAF50" />
          <Text style={styles.pdfButtonText}>View Full Terms & Conditions PDF</Text>
        </TouchableOpacity>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Last updated: {new Date().toLocaleDateString()}
          </Text>
        </View>
      </ScrollView>

      <ProhibitedItemsGuide
        visible={showProhibitedItems}
        onClose={() => setShowProhibitedItems(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  section: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    marginBottom: 8,
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
    }),
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#4CAF50',
    marginBottom: 12,
  },
  text: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  prohibitedItemsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3F3',
    padding: 16,
    borderRadius: 12,
    marginVertical: 16,
  },
  buttonText: {
    flex: 1,
    marginLeft: 12,
    color: '#FF5252',
    fontWeight: '500',
  },
  pdfButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E8F5E9',
    padding: 16,
    borderRadius: 8,
    margin: 20,
  },
  pdfButtonText: {
    color: '#4CAF50',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  footer: {
    padding: 20,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: '#999',
  },
}); 