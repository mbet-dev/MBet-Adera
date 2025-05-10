# MBet-Adera: Modern Parcel Delivery System

## Project Overview
MBet-Adera is a comprehensive parcel delivery tracking system designed for Addis Ababa, Ethiopia. The platform offers a seamless experience across web and mobile platforms (Android & iOS), focusing on user-friendly interfaces and efficient delivery management.

## Core Features

### 1. User Management
- Multi-role system (Customers, Partners, Personnel)
- Social/Email/Phone authentication
- Profile management with delivery history
- Wallet system for in-app transactions

### 2. Parcel Management
- Real-time parcel tracking with live map view
- QR code-based parcel identification
- Smart route optimization
- Automated delivery status updates
- Proof of delivery system

### 3. Location Services
- Interactive map for pickup/dropoff selection
- Favorite locations saving
- Real-time courier tracking
- Geofencing for automated status updates

### 4. Payment Integration
- Multiple payment methods:
  - YenePay integration
  - Chapa Payment integration
  - TeleBirr support
  - In-app wallet
  - Cash on delivery
- Transaction history
- Automated receipts

### 5. Communication
- In-app messaging system
- Push notifications
- AI-powered chatbot support
- SMS/Email alerts
- Rating and feedback system

### 6. Security
- End-to-end encryption
- Secure OTP verification
- Role-based access control
- Transaction verification

### 7. Additional Features
- Multi-language support (English, Amharic, Oromiffa, Tigrigna)
- Dark/Light theme
- Offline capability
- Analytics dashboard
- Partner management portal

## Technical Stack

### Frontend
- React Native with Expo
- Material UI components
- Native Base for UI elements
- React Navigation
- Expo Location services

### Backend
- Supabase (PostgreSQL + Auth)
- Real-time subscriptions
- File storage
- Edge functions

### APIs & Services
- Maps: Native Maps and OpenStreetMap
- Payments: YenePay, Chapa Payment integration, TeleBirr
- Push Notifications: Expo
- SMS: Free tier services
- Email: Resend/Supabase

### Development Tools
- Git for version control
- GitHub Actions for CI/CD
- Expo EAS for builds
- Jest for testing

## Security & Compliance
- WCAG 2.1 accessibility standards
- GDPR-compliant data handling
- Regular security audits
- Encrypted data storage

## Deployment Strategy
- Progressive Web App (PWA)
- Native Android/iOS apps
- Web admin dashboard
- Partner portal access

This context serves as the foundation for developing MBet-Adera, ensuring a robust, scalable, and user-friendly delivery management system.

## Case Scenario: End-to-End Delivery Flow

### Sender Flow: Alex's Experience

1. **Authentication & Entry**
   - Alex opens MBet-Adera app and logs in using his/her credentials
   - App loads his saved preferences and delivery history or simply the Main Screen

2. **Creating New Delivery**
   - Taps "New Delivery" on the dashboard
   - Selects package size and type from predefined options,
   - Enters basic package details and special handling instructions

3. **Location Selection**
   - Opens interactive map interface
   - Selects nearest pickup point from verified MBet-Adera partners
   - Chooses dropoff location from Beza's saved addresses

4. **Payment Process**
   - Views calculated delivery fee based on distance and package details
   - Chooses to pay from MBet-Adera wallet balance (Options here for Alex include to pay from his MBet-Adera wallet balance, cash on pickup, YenePay, TeleBirr or waive the fee including his own set fee to be paid by Beza,)
   - Confirms payment with fingerprint authentication

### System Processing

1. **Order Creation**
   - System generates unique tracking ID and QR code
   - Creates database entry in Supabase
   - Triggers real-time notifications

2. **Notifications**
   - Alex receives confirmation via push notification
   - Beza (recipient) gets SMS and in-app notification
   - Selected pickup point receives new order alert

### Recipient Flow: Beza's Experience

1. **Order Tracking**
   - Beza receives delivery notification
   - Opens app to view real-time package location
   - Gets estimated delivery time updates

2. **Package Reception**
   - Receives arrival notification when package reaches dropoff point
   - Gets unique verification code via SMS
   - Shows code at pickup point for verification
   - Confirms receipt in app with digital signature

* Note here, the QR code that is generated upon parcel delivery order creation not only identifies the parcel details as equivalent to the parcel id but also serves as a digital signature of the parcel delivery; including at which state/phase the parcel is at depending on who scanned it (like the pickup point partner, delivery_personnel, staff, dropoff point partner, or recipient).

### Technical Implementation

```javascript
// Example: Real-time tracking subscription
const trackingSubscription = supabase
  .from(`parcels:id=eq.${trackingId}`)
  .on('UPDATE', payload => {
    updateParcelLocation(payload.new);
    sendPushNotification(payload.new.status);
  })
  .subscribe();

// Example: Verification code generation
const generateVerificationCode = async (parcelId) => {
  const code = crypto.randomBytes(3).toString('hex');
  await supabase
    .from('verification_codes')
    .insert({
      parcel_id: parcelId,
      code,
      expires_at: new Date(Date.now() + 24*60*60*1000)
    });
  return code;
};
```

This case scenario demonstrates the seamless integration of various features while maintaining a user-friendly experience throughout the delivery process.


For error resolution and better development, Refer to the documentations provided by :

expo : https://docs.expo.dev/

react-native : https://reactnative.dev/docs/getting-started

Yenepay : https://github.com/yenepay

TeleBirr : https://developer.ethiotelecom.et/docs/GettingStarted

Chapa Payment Integration : https://developer.chapa.co/



