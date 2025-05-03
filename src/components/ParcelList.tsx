import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SectionList,
  Animated,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { Parcel, ParcelStatus } from '@/types/parcel';
import { ParcelCard } from './ParcelCard';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface ParcelListProps {
  parcels: Parcel[];
  onParcelPress: (parcel: Parcel) => void;
  refreshing: boolean;
  onRefresh: () => void;
}

interface Section {
  title: string;
  icon: string;
  data: Parcel[];
}

export const ParcelList: React.FC<ParcelListProps> = ({
  parcels,
  onParcelPress,
  refreshing,
  onRefresh,
}) => {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['active']));

  // Organize parcels into sections
  const sections: Section[] = [
    {
      title: 'Active Deliveries',
      icon: 'truck-delivery',
      data: parcels.filter(p => ['pending', 'confirmed', 'picked_up', 'in_transit'].includes(p.status)),
    },
    {
      title: 'Completed Deliveries',
      icon: 'check-circle',
      data: parcels.filter(p => p.status === 'delivered'),
    },
    {
      title: 'Cancelled',
      icon: 'cancel',
      data: parcels.filter(p => p.status === 'cancelled'),
    },
  ];

  const toggleSection = (title: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(title)) {
        next.delete(title);
      } else {
        next.add(title);
      }
      return next;
    });
  };

  const renderSectionHeader = ({ section }: { section: Section }) => {
    const isExpanded = expandedSections.has(section.title);
    const itemCount = section.data.length;

    return (
      <TouchableOpacity
        style={styles.sectionHeader}
        onPress={() => toggleSection(section.title)}
        activeOpacity={0.7}
      >
        <View style={styles.sectionHeaderLeft}>
          <MaterialCommunityIcons
            name={section.icon as any}
            size={24}
            color="#1976D2"
          />
          <Text style={styles.sectionTitle}>{section.title}</Text>
          <View style={styles.countBadge}>
            <Text style={styles.countText}>{itemCount}</Text>
          </View>
        </View>
        <MaterialCommunityIcons
          name={isExpanded ? 'chevron-up' : 'chevron-down'}
          size={24}
          color="#666"
        />
      </TouchableOpacity>
    );
  };

  const renderItem = ({ item }: { item: Parcel }) => (
    <ParcelCard
      parcel={item}
      onPress={() => onParcelPress(item)}
      showStatus={true}
    />
  );

  return (
    <SectionList
      sections={sections}
      keyExtractor={(item) => item.id}
      renderItem={renderItem}
      renderSectionHeader={renderSectionHeader}
      stickySectionHeadersEnabled={true}
      refreshing={refreshing}
      onRefresh={onRefresh}
      contentContainerStyle={styles.listContainer}
      renderSectionFooter={({ section }) => (
        expandedSections.has(section.title) && section.data.length === 0 ? (
          <View style={styles.emptySection}>
            <Text style={styles.emptyText}>No parcels in this category</Text>
          </View>
        ) : null
      )}
    />
  );
};

const styles = StyleSheet.create({
  listContainer: {
    padding: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    padding: 16,
    marginBottom: 8,
    borderRadius: 8,
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
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginLeft: 8,
  },
  countBadge: {
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
  },
  countText: {
    color: '#1976D2',
    fontSize: 12,
    fontWeight: '500',
  },
  emptySection: {
    padding: 24,
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    marginBottom: 16,
  },
  emptyText: {
    color: '#666',
    fontSize: 14,
  },
});
