import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Platform, Alert, ActivityIndicator, Modal } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { supabase } from '../src/services/supabase'; 
import { WebView, WebViewNavigation } from 'react-native-webview'; 

const CHAPA_RETURN_URL_SCHEME = 'mbetsupachapa://payment/complete';
const TELEBIRR_RETURN_URL_SCHEME = 'mbetsupachapa://payment/complete'; 

export default function DepositScreen() {
  const [amount, setAmount] = useState('');
  const [selectedMethod, setSelectedMethod] = useState<'chapa' | 'telebirr'>('chapa');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [webViewUrl, setWebViewUrl] = useState<string | null>(null);
  const [showWebView, setShowWebView] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null); 

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError) throw userError;
        if (!user) throw new Error('User not authenticated');

        const userData = {
            id: user.id,
            email: user.email,
            first_name: user.user_metadata?.first_name || 'FirstName', 
            last_name: user.user_metadata?.last_name || 'LastName',
        };
        setCurrentUser(userData);
      } catch (fetchError: any) {
        setError(`Failed to fetch user data: ${fetchError.message}`);
        console.error('User fetch error:', fetchError);
      }
    };
    fetchUser();
  }, []);

  const handleDeposit = async () => {
    setError(null);
    const depositAmount = parseFloat(amount);
    if (isNaN(depositAmount) || depositAmount <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid positive amount.');
      return;
    }
    if (!currentUser) {
      Alert.alert('Error', 'User data not loaded. Please try again.');
      return;
    }

    setLoading(true);
    try {
      console.log(`Initiating ${selectedMethod} deposit for ${depositAmount} ETB`);
      console.log('User details:', currentUser);

      const { data, error: functionError } = await supabase.functions.invoke('initiate-payment', {
        body: {
          amount: depositAmount,
          method: selectedMethod,
          user: currentUser, 
        },
      });

      if (functionError) {
        throw new Error(`Function Error: ${functionError.message}`);
      }

      console.log('Function response:', data);

      if (data?.error) {
         throw new Error(`Payment Initiation Failed: ${data.error}`);
      }

      if (data?.checkout_url) {
        console.log('Received checkout URL:', data.checkout_url);
        setWebViewUrl(data.checkout_url); 
        setShowWebView(true); 
      } else {
        throw new Error('No checkout URL received from the payment function.');
      }

    } catch (initError: any) {
      console.error('Deposit initiation error:', initError);
      setError(`Error initiating deposit: ${initError.message}`);
      Alert.alert('Deposit Error', `Failed to initiate payment: ${initError.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleWebViewNavigation = (navState: WebViewNavigation) => {
    const { url } = navState;
    console.log('WebView Navigating To:', url);

    const returnUrlScheme = selectedMethod === 'chapa' ? CHAPA_RETURN_URL_SCHEME : TELEBIRR_RETURN_URL_SCHEME;
    if (url.startsWith(returnUrlScheme)) {
      console.log('Detected return URL scheme. Closing WebView.');
      setShowWebView(false); 
      setWebViewUrl(null); 
      
      Alert.alert('Payment Initiated', 'Your payment is processing. Please check your balance shortly.');
    }
  };

  const handleWebViewClose = () => {
      setShowWebView(false);
      setWebViewUrl(null);
      Alert.alert('Payment Cancelled', 'The payment process was cancelled.');
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Deposit Funds</Text>

      {error && <Text style={styles.errorText}>{error}</Text>}

      <TextInput
        style={styles.input}
        placeholder="Amount (ETB)"
        keyboardType="numeric"
        value={amount}
        onChangeText={setAmount}
        editable={!loading}
      />

      <Text style={styles.label}>Select Payment Method:</Text>
      <Picker
        selectedValue={selectedMethod}
        onValueChange={(itemValue) => setSelectedMethod(itemValue)}
        style={styles.picker}
        enabled={!loading}
      >
        <Picker.Item label="Chapa" value="chapa" />
        <Picker.Item label="TeleBirr" value="telebirr" />
      </Picker>

      {loading ? (
        <ActivityIndicator size="large" color="#0000ff" />
      ) : (
        <Button title="Proceed to Deposit" onPress={handleDeposit} disabled={!currentUser} />
      )}

      <Modal
        visible={showWebView}
        onRequestClose={handleWebViewClose} 
        animationType="slide"
      >
          <WebView
            source={{ uri: webViewUrl || '' }} 
            style={{ flex: 1 }}
            onNavigationStateChange={handleWebViewNavigation}
            onError={(syntheticEvent) => {
                const { nativeEvent } = syntheticEvent;
                console.warn('WebView error: ', nativeEvent);
                setError(`WebView Error: ${nativeEvent.description}`);
            }}
            onLoadStart={() => console.log('WebView Loading Started...')}
            onLoadEnd={() => console.log('WebView Loading Finished.')}
            startInLoadingState={true} 
            renderLoading={() => (
                <ActivityIndicator
                    color="#009688"
                    size="large"
                    style={styles.webViewLoading}
                />
            )}
          />
           <Button title="Cancel Payment" onPress={handleWebViewClose} />
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 10,
    marginBottom: 15,
    borderRadius: 5,
  },
  label: {
    fontSize: 16,
    marginBottom: 5,
  },
  picker: {
    borderWidth: 1,
    borderColor: '#ccc',
    marginBottom: 20,
    borderRadius: 5,
  },
  errorText: {
    color: 'red',
    marginBottom: 10,
    textAlign: 'center',
  },
  webViewLoading: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
