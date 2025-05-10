import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  FlatList,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons, FontAwesome } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { decode } from 'base64-arraybuffer';

import Colors from '../../constants/Colors';
import { supabase } from '../../src/services/supabase';

// Define COLORS constant using the imported Colors
const COLORS = Colors.light;

type MessageType = 'text' | 'image' | 'location' | 'system' | 'parcel';

type Message = {
  id: string;
  content: string;
  sender_id: string;
  receiver_id: string;
  type: MessageType;
  created_at: string;
  is_read: boolean;
  image_url?: string;
  parcel_id?: string;
  location_data?: {
    latitude: number;
    longitude: number;
    address: string;
  };
};

type Contact = {
  id: string;
  name: string;
  avatar_url: string | null;
  last_message: string;
  last_message_time: string;
  unread_count: number;
  is_online: boolean;
  user_type: 'sender' | 'receiver' | 'support' | 'driver';
  related_parcels?: string[];
};

type Parcel = {
  id: string;
  tracking_id: string;
  sender_id: string;
  receiver_id: string;
  status: 'pending' | 'picked_up' | 'in_transit' | 'delivered' | 'cancelled';
  pickup_location: string;
  delivery_location: string;
  created_at: string;
  updated_at: string;
  description: string;
  weight: number;
  dimensions: string;
};

export default function ChatScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'chats' | 'support'>('chats');
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [showAIOptions, setShowAIOptions] = useState(false);
  const [showImagePicker, setShowImagePicker] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [parcels, setParcels] = useState<Parcel[]>([]);
  const [showParcelSelector, setShowParcelSelector] = useState(false);
  const [selectedParcel, setSelectedParcel] = useState<Parcel | null>(null);
  
  const flatListRef = useRef<FlatList>(null);
  
  useEffect(() => {
    fetchContacts();
    fetchParcels();
  }, []);
  
  const fetchParcels = async () => {
    try {
      // This would be a real API call to fetch parcels
      // For now, we'll use mock data
      const mockParcels: Parcel[] = [
        {
          id: 'p1',
          tracking_id: 'TRK12345',
          sender_id: 'current_user',
          receiver_id: '2',
          status: 'in_transit',
          pickup_location: 'Addis Ababa, Ethiopia',
          delivery_location: 'Bahir Dar, Ethiopia',
          created_at: '2025-04-05T10:00:00Z',
          updated_at: '2025-04-08T16:45:00Z',
          description: 'Electronics package',
          weight: 2.5,
          dimensions: '30x20x15 cm',
        },
        {
          id: 'p2',
          tracking_id: 'TRK67890',
          sender_id: '3',
          receiver_id: 'current_user',
          status: 'pending',
          pickup_location: 'Hawassa, Ethiopia',
          delivery_location: 'Addis Ababa, Ethiopia',
          created_at: '2025-04-07T14:20:00Z',
          updated_at: '2025-04-07T14:20:00Z',
          description: 'Documents',
          weight: 0.5,
          dimensions: '25x15x2 cm',
        },
      ];
      
      setParcels(mockParcels);
    } catch (error) {
      console.error('Error fetching parcels:', error);
    }
  };
  
  const fetchContacts = async () => {
    try {
      setLoading(true);
      // This would be a real API call to fetch contacts
      // For now, we'll use mock data
      setTimeout(() => {
        setContacts([
          {
            id: '1',
            name: 'Delivery Support',
            avatar_url: null,
            last_message: 'How can I help you today?',
            last_message_time: '2025-04-09T09:30:00Z',
            unread_count: 0,
            is_online: true,
            user_type: 'support',
          },
          {
            id: '2',
            name: 'Abebe Kebede',
            avatar_url: null,
            last_message: 'Your package has been picked up',
            last_message_time: '2025-04-08T16:45:00Z',
            unread_count: 2,
            is_online: false,
            user_type: 'receiver',
            related_parcels: ['p1'],
          },
          {
            id: '3',
            name: 'Tigist Haile',
            avatar_url: null,
            last_message: 'I will be at the location in 10 minutes',
            last_message_time: '2025-04-07T14:20:00Z',
            unread_count: 0,
            is_online: true,
            user_type: 'sender',
            related_parcels: ['p2'],
          },
          {
            id: '4',
            name: 'Dawit Mekonnen',
            avatar_url: null,
            last_message: 'I will deliver your package tomorrow',
            last_message_time: '2025-04-08T18:30:00Z',
            unread_count: 1,
            is_online: true,
            user_type: 'driver',
            related_parcels: ['p1', 'p2'],
          },
        ]);
        setLoading(false);
      }, 1000);
    } catch (error) {
      console.error('Error fetching contacts:', error);
      setLoading(false);
    }
  };
  
  const fetchMessages = async (contactId: string) => {
    try {
      // This would be a real API call to fetch messages
      // For now, we'll use mock data
      let mockMessages: Message[] = [
        {
          id: '1',
          content: 'Hello, I have a question about my delivery',
          sender_id: 'current_user',
          receiver_id: contactId,
          type: 'text',
          created_at: '2025-04-09T09:25:00Z',
          is_read: true,
        },
        {
          id: '2',
          content: 'How can I help you today?',
          sender_id: contactId,
          receiver_id: 'current_user',
          type: 'text',
          created_at: '2025-04-09T09:30:00Z',
          is_read: true,
        },
      ];
      
      // Add parcel-specific messages for contacts with related parcels
      const contact = contacts.find(c => c.id === contactId);
      if (contact?.related_parcels?.length) {
        const parcelId = contact.related_parcels[0];
        const parcel = parcels.find(p => p.id === parcelId);
        
        if (parcel) {
          if (contact.user_type === 'receiver' && parcel.sender_id === 'current_user') {
            mockMessages = [
              ...mockMessages,
              {
                id: '3',
                content: "I have sent you a package with tracking ID " + parcel.tracking_id,
                sender_id: 'current_user',
                receiver_id: contactId,
                type: 'parcel',
                created_at: '2025-04-08T15:45:00Z',
                is_read: true,
                parcel_id: parcel.id,
              },
              {
                id: '4',
                content: "Thanks, I will keep an eye out for it",
                sender_id: contactId,
                receiver_id: 'current_user',
                type: 'text',
                created_at: '2025-04-08T16:00:00Z',
                is_read: true,
              },
            ];
          } else if (contact.user_type === 'driver') {
            mockMessages = [
              ...mockMessages,
              {
                id: '5',
                content: "I have been assigned to deliver your package",
                sender_id: contactId,
                receiver_id: 'current_user',
                type: 'text',
                created_at: '2025-04-08T17:30:00Z',
                is_read: true,
              },
              {
                id: '6',
                content: "Here is a photo of the package",
                sender_id: contactId,
                receiver_id: 'current_user',
                type: 'image',
                created_at: '2025-04-08T17:32:00Z',
                is_read: true,
                image_url: 'https://images.unsplash.com/photo-1565791380713-1756b9a05343',
              },
            ];
          }
        }
      }
      
      setMessages(mockMessages);
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };
  
  const pickImage = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (!permissionResult.granted) {
        Alert.alert('Permission required', 'You need to allow access to your photos to send images.');
        return;
      }
      
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
        base64: true,
      });
      
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        if (asset.base64) {
          await sendImageMessage(asset.base64, asset.uri);
        }
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    }
  };
  
  const sendImageMessage = async (base64Image: string, localUri: string) => {
    if (!selectedContact) return;
    
    try {
      setUploadingImage(true);
      
      // In a real app, we would upload the image to Supabase Storage
      // For this demo, we'll just simulate the upload with a timeout
      // const { data, error } = await supabase.storage
      //   .from('chat-images')
      //   .upload(`${Date.now()}.jpg`, decode(base64Image), {
      //     contentType: 'image/jpeg',
      //   });
      
      // if (error) throw error;
      
      // Simulate upload delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Use the local URI for demo purposes
      // In a real app, we would use the Supabase URL
      const newMessage: Message = {
        id: Date.now().toString(),
        content: 'Image',
        sender_id: 'current_user',
        receiver_id: selectedContact.id,
        type: 'image',
        created_at: new Date().toISOString(),
        is_read: false,
        image_url: localUri,
      };
      
      setMessages([...messages, newMessage]);
      setUploadingImage(false);
      setShowImagePicker(false);
      
    } catch (error) {
      console.error('Error sending image message:', error);
      Alert.alert('Error', 'Failed to send image. Please try again.');
      setUploadingImage(false);
    }
  };
  
  const shareParcel = (parcel: Parcel) => {
    if (!selectedContact) return;
    
    const newMessage: Message = {
      id: Date.now().toString(),
      content: `Parcel: ${parcel.tracking_id}\nFrom: ${parcel.pickup_location}\nTo: ${parcel.delivery_location}\nStatus: ${parcel.status}`,
      sender_id: 'current_user',
      receiver_id: selectedContact.id,
      type: 'parcel',
      created_at: new Date().toISOString(),
      is_read: false,
      parcel_id: parcel.id,
    };
    
    setMessages([...messages, newMessage]);
    setShowParcelSelector(false);
    setSelectedParcel(null);
  };
  
  const sendMessage = async () => {
    if (!inputText.trim() || !selectedContact) return;
    
    try {
      const newMessage: Message = {
        id: Date.now().toString(),
        content: inputText,
        sender_id: 'current_user',
        receiver_id: selectedContact.id,
        type: 'text',
        created_at: new Date().toISOString(),
        is_read: false,
      };
      
      setMessages([...messages, newMessage]);
      setInputText('');
      
      // Simulate AI response if it's the support chat
      if (selectedContact.id === '1') {
        setTimeout(() => {
          const aiResponse: Message = {
            id: Date.now().toString(),
            content: 'Thank you for your message. Our team will assist you shortly.',
            sender_id: selectedContact.id,
            receiver_id: 'current_user',
            type: 'text',
            created_at: new Date().toISOString(),
            is_read: true,
          };
          
          setMessages(prevMessages => [...prevMessages, aiResponse]);
        }, 1000);
      }
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };
  
  const handleContactSelect = (contact: Contact) => {
    setSelectedContact(contact);
    fetchMessages(contact.id);
  };
  
  const handleBackToContacts = () => {
    setSelectedContact(null);
    setMessages([]);
  };
  
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };
  
  const renderContactItem = ({ item }: { item: Contact }) => (
    <TouchableOpacity 
      style={styles.contactItem} 
      onPress={() => handleContactSelect(item)}
    >
      <View style={styles.contactAvatar}>
        {item.avatar_url ? (
          <Image source={{ uri: item.avatar_url }} style={styles.avatarImage} />
        ) : (
          <Text style={styles.avatarText}>{item.name.charAt(0)}</Text>
        )}
        {item.is_online && <View style={styles.onlineIndicator} />}
      </View>
      
      <View style={styles.contactInfo}>
        <View style={styles.contactHeader}>
          <Text style={styles.contactName}>{item.name}</Text>
          <Text style={styles.messageTime}>{formatTime(item.last_message_time)}</Text>
        </View>
        
        <View style={styles.contactFooter}>
          <Text 
            style={styles.lastMessage} 
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {item.last_message}
          </Text>
          
          {item.unread_count > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadCount}>{item.unread_count}</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
  
  const renderMessage = (message: Message) => {
    const isCurrentUser = message.sender_id === 'current_user';
    
    return (
      <View 
        key={message.id} 
        style={[
          styles.messageContainer,
          isCurrentUser ? styles.currentUserMessage : styles.otherUserMessage
        ]}
      >
        <View style={[
          styles.messageBubble,
          isCurrentUser ? styles.currentUserBubble : styles.otherUserBubble,
        ]}>
          {message.type === 'text' && (
            <Text style={isCurrentUser ? styles.messageText : styles.otherUserMessageText}>{message.content}</Text>
          )}
          
          {message.type === 'image' && message.image_url && (
            <View style={styles.imageContainer}>
              <Image 
                source={{ uri: message.image_url }} 
                style={styles.messageImage} 
                resizeMode="cover"
              />
            </View>
          )}
          
          {message.type === 'parcel' && (
            <View style={styles.parcelContainer}>
              <View style={styles.parcelHeader}>
                <FontAwesome name="cube" size={16} color={COLORS.primary} />
                <Text style={styles.parcelTitle}>Parcel Information</Text>
              </View>
              <Text style={styles.parcelContent}>{message.content}</Text>
              {message.parcel_id && (
                <TouchableOpacity 
                  style={styles.parcelButton}
                  onPress={() => {
                    // Navigate to parcel tracking screen
                    // This would be implemented in a real app
                    Alert.alert('View Parcel', `Viewing parcel ${message.parcel_id}`);
                  }}
                >
                  <Text style={styles.parcelButtonText}>Track Parcel</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
        <Text style={styles.messageTime}>
          {formatTime(message.created_at)}
        </Text>
      </View>
    );
  };
  
  const renderMessageItem = ({ item }: { item: Message }) => {
    return renderMessage(item);
  };
  
  const renderChatList = () => (
    <View style={styles.chatListContainer}>
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading chats...</Text>
        </View>
      ) : (
        <FlatList
          data={contacts}
          renderItem={renderContactItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.contactsList}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
  
  const renderChatRoom = () => (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.chatRoomContainer}
    >
      <View style={styles.chatHeader}>
        <TouchableOpacity onPress={handleBackToContacts}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        
        <View style={styles.chatHeaderInfo}>
          <Text style={styles.chatHeaderName}>{selectedContact?.name}</Text>
          <Text style={styles.chatHeaderStatus}>
            {selectedContact?.is_online ? 'Online' : 'Offline'}
          </Text>
        </View>
        
        <TouchableOpacity>
          <Ionicons name="call-outline" size={24} color={COLORS.primary} />
        </TouchableOpacity>
      </View>
      
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessageItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.messagesList}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
      />
      
      {renderChatInput()}
      {renderImagePicker()}
      {renderParcelSelector()}
    </KeyboardAvoidingView>
  );
  
  const renderChatInput = () => {
    if (!selectedContact) return null;
    
    return (
      <View style={styles.inputContainer}>
        <View style={styles.inputActions}>
          <TouchableOpacity 
            style={styles.actionButton} 
            onPress={() => setShowImagePicker(true)}
          >
            <Ionicons name="image-outline" size={24} color={COLORS.primary} />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.actionButton} 
            onPress={() => setShowParcelSelector(true)}
          >
            <FontAwesome name="cube" size={22} color={COLORS.primary} />
          </TouchableOpacity>
        </View>
        
        <TextInput
          style={styles.input}
          placeholder="Type a message..."
          value={inputText}
          onChangeText={setInputText}
          multiline
        />
        
        <TouchableOpacity 
          style={[styles.sendButton, !inputText.trim() && styles.sendButtonDisabled]} 
          onPress={sendMessage}
          disabled={!inputText.trim()}
        >
          <Ionicons name="send" size={24} color="white" />
        </TouchableOpacity>
      </View>
    );
  };
  
  const renderImagePicker = () => {
    if (!showImagePicker) return null;
    
    return (
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Send Image</Text>
            <TouchableOpacity onPress={() => setShowImagePicker(false)}>
              <Ionicons name="close" size={24} color={COLORS.text} />
            </TouchableOpacity>
          </View>
          
          <View style={styles.modalBody}>
            {uploadingImage ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={COLORS.primary} />
                <Text style={styles.loadingText}>Uploading image...</Text>
              </View>
            ) : (
              <TouchableOpacity style={styles.imagePickerButton} onPress={pickImage}>
                <Ionicons name="image" size={48} color={COLORS.primary} />
                <Text style={styles.imagePickerText}>Select from gallery</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    );
  };
  
  const renderParcelSelector = () => {
    if (!showParcelSelector) return null;
    
    return (
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Share Parcel</Text>
            <TouchableOpacity onPress={() => setShowParcelSelector(false)}>
              <Ionicons name="close" size={24} color={COLORS.text} />
            </TouchableOpacity>
          </View>
          
          <View style={styles.modalBody}>
            {parcels.length === 0 ? (
              <Text style={styles.noParcelText}>You don't have any parcels to share</Text>
            ) : (
              <FlatList
                data={parcels}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <TouchableOpacity 
                    style={[styles.parcelItem, selectedParcel?.id === item.id && styles.selectedParcelItem]} 
                    onPress={() => setSelectedParcel(item)}
                  >
                    <View style={styles.parcelItemContent}>
                      <FontAwesome name="cube" size={20} color={COLORS.primary} />
                      <View style={styles.parcelItemDetails}>
                        <Text style={styles.parcelItemId}>{item.tracking_id}</Text>
                        <Text style={styles.parcelItemStatus}>{item.status}</Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                )}
              />
            )}
          </View>
          
          <View style={styles.modalFooter}>
            <TouchableOpacity 
              style={[styles.shareButton, !selectedParcel && styles.shareButtonDisabled]}
              onPress={() => selectedParcel && shareParcel(selectedParcel)}
              disabled={!selectedParcel}
            >
              <Text style={styles.shareButtonText}>Share</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };
  
  const renderAISupport = () => (
    <View style={styles.aiSupportContainer}>
      <View style={styles.aiHeader}>
        <Text style={styles.aiTitle}>AI Assistant</Text>
        <Text style={styles.aiSubtitle}>How can I help you today?</Text>
      </View>
      
      <View style={styles.aiOptionsContainer}>
        <TouchableOpacity 
          style={styles.aiOption}
          onPress={() => {
            setSelectedContact(contacts[0]);
            fetchMessages(contacts[0].id);
            setInputText("I need help tracking my package");
          }}
        >
          <Ionicons name="cube-outline" size={24} color={COLORS.primary} />
          <Text style={styles.aiOptionText}>Track my package</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.aiOption}
          onPress={() => {
            setSelectedContact(contacts[0]);
            fetchMessages(contacts[0].id);
            setInputText("I want to report a delivery issue");
          }}
        >
          <Ionicons name="alert-circle-outline" size={24} color={COLORS.primary} />
          <Text style={styles.aiOptionText}>Report an issue</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.aiOption}
          onPress={() => {
            setSelectedContact(contacts[0]);
            fetchMessages(contacts[0].id);
            setInputText("I need to change my delivery address");
          }}
        >
          <Ionicons name="location-outline" size={24} color={COLORS.primary} />
          <Text style={styles.aiOptionText}>Change delivery address</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.aiOption}
          onPress={() => {
            setSelectedContact(contacts[0]);
            fetchMessages(contacts[0].id);
            setInputText("I have a question about payment");
          }}
        >
          <Ionicons name="card-outline" size={24} color={COLORS.primary} />
          <Text style={styles.aiOptionText}>Payment questions</Text>
        </TouchableOpacity>
      </View>
      
      <TouchableOpacity 
        style={styles.chatWithHumanButton}
        onPress={() => {
          setSelectedContact(contacts[0]);
          fetchMessages(contacts[0].id);
        }}
      >
        <Text style={styles.chatWithHumanText}>Chat with a human agent</Text>
      </TouchableOpacity>
    </View>
  );
  
  return (
    <>
      <View style={styles.container}>
        {!selectedContact ? (
          <>
            <View style={styles.header}>
              <Text style={styles.title}>Messages</Text>
              <TouchableOpacity>
                <Ionicons name="search" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.tabContainer}>
              <TouchableOpacity
                style={[styles.tab, activeTab === 'chats' && styles.activeTab]}
                onPress={() => setActiveTab('chats')}
              >
                <Text style={[styles.tabText, activeTab === 'chats' && styles.activeTabText]}>
                  Chats
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.tab, activeTab === 'support' && styles.activeTab]}
                onPress={() => setActiveTab('support')}
              >
                <Text style={[styles.tabText, activeTab === 'support' && styles.activeTabText]}>
                  AI Support
                </Text>
              </TouchableOpacity>
            </View>
            
            {activeTab === 'chats' ? renderChatList() : renderAISupport()}
          </>
        ) : (
          renderChatRoom()
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({  
  // Message styles
  imageContainer: {
    width: '100%',
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 4,
  },
  messageImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
  },
  parcelContainer: {
    backgroundColor: '#f0f8ff',
    borderRadius: 8,
    padding: 10,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.primary,
  },
  parcelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  parcelTitle: {
    fontWeight: 'bold',
    color: COLORS.primary,
    marginLeft: 6,
  },
  parcelContent: {
    fontSize: 14,
    marginBottom: 8,
  },
  parcelButton: {
    backgroundColor: COLORS.primary,
    padding: 6,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  parcelButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  
  // Input actions styles
  inputActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8,
  },
  actionButton: {
    padding: 8,
    marginRight: 4,
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  
  // Modal styles
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 12,
    width: '90%',
    maxHeight: '80%',
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  modalBody: {
    flex: 1,
    marginBottom: 16,
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.divider,
  },
  
  // Image picker styles
  imagePickerButton: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    borderWidth: 2,
    borderColor: COLORS.divider,
    borderStyle: 'dashed',
    borderRadius: 8,
  },
  imagePickerText: {
    marginTop: 8,
    color: COLORS.text,
    fontSize: 16,
  },
  
  // Parcel selector styles
  noParcelText: {
    textAlign: 'center',
    fontSize: 16,
    color: COLORS.textLight,
    padding: 20,
  },
  parcelItem: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: COLORS.divider,
  },
  selectedParcelItem: {
    borderColor: COLORS.primary,
    backgroundColor: '#f0f7ff',
  },
  parcelItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  parcelItemDetails: {
    marginLeft: 12,
    flex: 1,
  },
  parcelItemId: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  parcelItemStatus: {
    fontSize: 14,
    color: COLORS.textLight,
    marginTop: 4,
    textTransform: 'capitalize',
  },
  shareButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 4,
  },
  shareButtonDisabled: {
    opacity: 0.5,
  },
  shareButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  tab: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    marginRight: 16,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: COLORS.primary,
  },
  tabText: {
    fontSize: 16,
    color: COLORS.textLight,
  },
  activeTabText: {
    color: COLORS.primary,
    fontWeight: 'bold',
  },
  chatListContainer: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: COLORS.textLight,
  },
  contactsList: {
    padding: 16,
  },
  contactItem: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  contactAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: COLORS.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    position: 'relative',
  },
  avatarImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  avatarText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  onlineIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#4CAF50',
    position: 'absolute',
    bottom: 0,
    right: 0,
    borderWidth: 2,
    borderColor: '#fff',
  },
  contactInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  contactHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  contactName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  contactFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  lastMessage: {
    fontSize: 14,
    color: COLORS.textLight,
    flex: 1,
    marginRight: 8,
  },
  messageTime: {
    fontSize: 12,
    color: COLORS.textLight,
  },
  unreadBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  unreadCount: {
    fontSize: 12,
    color: '#fff',
    fontWeight: 'bold',
  },
  chatRoomContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  chatHeaderInfo: {
    flex: 1,
    marginLeft: 16,
  },
  chatHeaderName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  chatHeaderStatus: {
    fontSize: 14,
    color: COLORS.textLight,
  },
  messagesList: {
    padding: 16,
    paddingBottom: 16,
  },
  messageContainer: {
    marginBottom: 16,
    maxWidth: '80%',
    alignItems: 'flex-end',
  },
  currentUserMessage: {
    alignSelf: 'flex-end',
  },
  otherUserMessage: {
    alignSelf: 'flex-start',
  },
  messageBubble: {
    padding: 12,
    borderRadius: 16,
    marginBottom: 4,
  },
  currentUserBubble: {
    backgroundColor: COLORS.primary,
    borderBottomRightRadius: 4,
  },
  otherUserBubble: {
    backgroundColor: '#2c3e50',
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 16,
    color: '#fff',
  },
  otherUserMessageText: {
    fontSize: 16,
    color: '#fff',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    backgroundColor: '#fff',
  },
  attachButton: {
    padding: 8,
  },
  input: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginHorizontal: 8,
    fontSize: 16,
    maxHeight: 100,
  },
  sendButton: {
    padding: 8,
  },
  aiSupportContainer: {
    flex: 1,
    padding: 16,
  },
  aiHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  aiTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 8,
  },
  aiSubtitle: {
    fontSize: 16,
    color: COLORS.textLight,
    textAlign: 'center',
  },
  aiOptionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  aiOption: {
    width: '48%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  aiOptionText: {
    marginTop: 8,
    fontSize: 14,
    color: COLORS.text,
    textAlign: 'center',
  },
  chatWithHumanButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  chatWithHumanText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
