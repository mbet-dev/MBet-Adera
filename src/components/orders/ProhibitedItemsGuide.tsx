import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  Platform,
  Dimensions,
} from 'react-native';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

interface ProhibitedItemsGuideProps {
  visible: boolean;
  onClose: () => void;
  onAccept: () => void;
}

const PROHIBITED_ITEMS = [
  {
    category: 'Dangerous Goods',
    items: [
      'Explosives and fireworks',
      'Flammable liquids and gases',
      'Toxic and infectious substances',
      'Radioactive materials',
    ],
    icon: 'warning',
    color: '#F44336',
  },
  {
    category: 'Illegal Items',
    items: [
      'Drugs and narcotics',
      'Counterfeit goods',
      'Pirated materials',
      'Stolen items',
    ],
    icon: 'gavel',
    color: '#9C27B0',
  },
  {
    category: 'Restricted Items',
    items: [
      'Perishable food items',
      'Live animals',
      'Currency and valuables',
      'Personal documents',
    ],
    icon: 'block',
    color: '#FF9800',
  },
  {
    category: 'Fragile Items',
    items: [
      'Glass items without proper packaging',
      'Electronics without original packaging',
      'Artwork without protection',
      'Musical instruments without cases',
    ],
    icon: 'fragile',
    color: '#2196F3',
  },
];

const TERMS_HIGHLIGHTS = [
  'All packages are subject to inspection',
  'We reserve the right to refuse service',
  'Sender is responsible for proper packaging',
  'Insurance coverage may be limited for certain items',
];

export const ProhibitedItemsGuide: React.FC<ProhibitedItemsGuideProps> = ({
  visible,
  onClose,
  onAccept,
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [accepted, setAccepted] = useState(false);

  const handleAccept = () => {
    setAccepted(true);
    onAccept();
  };

  const renderProhibitedItems = () => (
    <ScrollView style={styles.scrollView}>
      <View style={styles.header}>
        <MaterialIcons name="local-shipping" size={40} color="#4CAF50" />
        <Text style={styles.title}>What We Don't Ship</Text>
        <Text style={styles.subtitle}>
          For everyone's safety, please review our prohibited items list
        </Text>
      </View>

      {PROHIBITED_ITEMS.map((category, index) => (
        <View key={index} style={styles.categoryContainer}>
          <View style={[styles.categoryHeader, { backgroundColor: category.color + '20' }]}>
            <MaterialIcons name={category.icon as any} size={24} color={category.color} />
            <Text style={[styles.categoryTitle, { color: category.color }]}>
              {category.category}
            </Text>
          </View>
          <View style={styles.itemsList}>
            {category.items.map((item, itemIndex) => (
              <View key={itemIndex} style={styles.itemRow}>
                <Ionicons name="close-circle" size={20} color={category.color} />
                <Text style={styles.itemText}>{item}</Text>
              </View>
            ))}
          </View>
        </View>
      ))}

      <View style={styles.termsContainer}>
        <Text style={styles.termsTitle}>Important Terms</Text>
        {TERMS_HIGHLIGHTS.map((term, index) => (
          <View key={index} style={styles.termRow}>
            <MaterialIcons name="check-circle" size={20} color="#4CAF50" />
            <Text style={styles.termText}>{term}</Text>
          </View>
        ))}
      </View>

      <TouchableOpacity
        style={[styles.acceptButton, accepted && styles.acceptedButton]}
        onPress={handleAccept}
        disabled={accepted}
      >
        <Text style={styles.acceptButtonText}>
          {accepted ? 'Terms Accepted' : 'I Understand & Accept'}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Ionicons name="close" size={24} color="#666" />
          </TouchableOpacity>
          {renderProhibitedItems()}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: Math.min(width - 40, 500),
    maxHeight: '80%',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
      },
      android: {
        elevation: 5,
      },
    }),
  },
  closeButton: {
    position: 'absolute',
    right: 20,
    top: 20,
    zIndex: 1,
    padding: 8,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
    marginTop: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  categoryContainer: {
    marginBottom: 20,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#F8F9FA',
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  categoryTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  itemsList: {
    padding: 12,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  itemText: {
    fontSize: 14,
    color: '#333',
    marginLeft: 8,
  },
  termsContainer: {
    marginTop: 24,
    padding: 16,
    backgroundColor: '#E8F5E9',
    borderRadius: 12,
  },
  termsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2E7D32',
    marginBottom: 12,
  },
  termRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  termText: {
    fontSize: 14,
    color: '#333',
    marginLeft: 8,
  },
  acceptButton: {
    backgroundColor: '#4CAF50',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 16,
  },
  acceptedButton: {
    backgroundColor: '#81C784',
  },
  acceptButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
}); 