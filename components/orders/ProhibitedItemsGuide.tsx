import React from 'react';
import { View, ScrollView, StyleSheet, Dimensions, Modal, TouchableOpacity, Animated } from 'react-native';
import { Text, List, Divider, IconButton, Surface } from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';

interface ProhibitedItemsGuideProps {
  visible: boolean;
  onClose: () => void;
}

type IconName = 'warning' | 'gavel' | 'block';

export const ProhibitedItemsGuide: React.FC<ProhibitedItemsGuideProps> = ({ visible, onClose }) => {
  const [animation] = React.useState(new Animated.Value(0));
  const windowHeight = Dimensions.get('window').height;

  React.useEffect(() => {
    if (visible) {
      Animated.spring(animation, {
        toValue: 1,
        useNativeDriver: true,
        tension: 50,
        friction: 7,
      }).start();
    } else {
      Animated.timing(animation, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  const prohibitedItems = [
    {
      category: 'Dangerous Goods',
      icon: 'warning' as IconName,
      color: '#FF5252',
      items: [
        'Explosives and fireworks',
        'Flammable liquids and gases',
        'Toxic and infectious substances',
        'Radioactive materials',
        'Corrosive substances'
      ]
    },
    {
      category: 'Illegal Items',
      icon: 'gavel' as IconName,
      color: '#F44336',
      items: [
        'Drugs and narcotics',
        'Counterfeit goods',
        'Pirated materials',
        'Stolen items',
        'Weapons and ammunition'
      ]
    },
    {
      category: 'Restricted Items',
      icon: 'block' as IconName,
      color: '#FF9800',
      items: [
        'Perishable goods without proper packaging',
        'Live animals without proper documentation',
        'Currency and valuable items',
        'Hazardous materials',
        'Items requiring special permits'
      ]
    }
  ];

  const translateY = animation.interpolate({
    inputRange: [0, 1],
    outputRange: [windowHeight, 0],
  });

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <BlurView intensity={20} style={styles.modalContainer}>
        <Animated.View
          style={[
            styles.modalContent,
            {
              transform: [{ translateY }],
            },
          ]}
        >
          <Surface style={styles.surface}>
            <View style={styles.header}>
              <Text variant="headlineSmall" style={styles.title}>
                Prohibited Items Guide
              </Text>
              <IconButton
                icon="close"
                size={24}
                onPress={onClose}
                style={styles.closeButton}
              />
            </View>

            <ScrollView style={styles.scrollView}>
              <Text variant="bodyMedium" style={styles.description}>
                For the safety of our couriers and customers, the following items are prohibited from delivery:
              </Text>

              {prohibitedItems.map((section, index) => (
                <View key={index} style={styles.section}>
                  <View style={styles.categoryHeader}>
                    <MaterialIcons name={section.icon} size={24} color={section.color} />
                    <Text variant="titleMedium" style={[styles.categoryTitle, { color: section.color }]}>
                      {section.category}
                    </Text>
                  </View>
                  <List.Section>
                    {section.items.map((item, itemIndex) => (
                      <React.Fragment key={itemIndex}>
                        <List.Item
                          title={item}
                          left={props => (
                            <List.Icon
                              {...props}
                              icon="alert-circle"
                              color={section.color}
                            />
                          )}
                          style={styles.listItem}
                        />
                        {itemIndex < section.items.length - 1 && (
                          <Divider style={styles.divider} />
                        )}
                      </React.Fragment>
                    ))}
                  </List.Section>
                </View>
              ))}

              <Text variant="bodySmall" style={styles.note}>
                Note: This list is not exhaustive. We reserve the right to refuse delivery of any item that may pose a risk to our couriers or customers.
              </Text>
            </ScrollView>
          </Surface>
        </Animated.View>
      </BlurView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContent: {
    height: '80%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
  },
  surface: {
    flex: 1,
    elevation: 4,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  title: {
    flex: 1,
    textAlign: 'center',
    fontWeight: 'bold',
  },
  closeButton: {
    margin: 0,
  },
  scrollView: {
    flex: 1,
  },
  description: {
    padding: 16,
    textAlign: 'center',
    color: '#666666',
  },
  section: {
    marginBottom: 16,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#F5F5F5',
  },
  categoryTitle: {
    marginLeft: 8,
    fontWeight: 'bold',
  },
  listItem: {
    paddingVertical: 8,
  },
  divider: {
    marginLeft: 48,
  },
  note: {
    margin: 16,
    fontStyle: 'italic',
    textAlign: 'center',
    color: '#666666',
  },
}); 