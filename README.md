# MBet-Adera Delivery Management System

A modern delivery management system built with React Native and Supabase, designed to streamline parcel delivery operations in Addis Ababa.

## 🚀 Features

- **Real-time Parcel Tracking**: Track parcels from pickup to delivery
- **Multi-platform Support**: Works on iOS, Android, and Web
- **User Authentication**: Secure login and registration system
- **Parcel Management**: Create, track, and manage deliveries
- **Location Services**: Integration with maps for real-time location tracking
- **Partner Management**: Manage delivery partners and facilities
- **Payment Integration**: Handle delivery fees and payments
- **Chat System**: Communication between users and delivery partners

## 🛠 Tech Stack

- **Frontend**: React Native with Expo
- **Backend**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Real-time Updates**: Supabase Realtime
- **Maps**: OpenStreetMap
- **State Management**: React Context
- **UI Components**: React Native Paper
- **Navigation**: Expo Router

## 📁 Project Structure

```
MBet-Adera/
├── app/                    # Expo Router app directory
│   ├── (tabs)/            # Tab-based navigation
│   └── orders/            # Order-related screens
├── src/
│   ├── components/        # Reusable components
│   ├── services/          # API and service functions
│   ├── types/            # TypeScript type definitions
│   ├── utils/            # Utility functions
│   ├── context/          # React Context providers
│   └── constants/        # App constants
├── db/                    # Database scripts and migrations
│   ├── modDB1/           # Database modifications
│   └── CurrentSampleDataSeeded/  # Sample data
└── assets/               # Static assets
```

## 🚀 Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Expo CLI
- Supabase account

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/MBet-Adera.git
   cd MBet-Adera
   ```

2. Install dependencies:
   ```bash
   npm install
   # or
   yarn install
   ```

3. Set up environment variables:
   Create a `.env` file in the root directory with:
   ```
   EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. Start the development server:
   ```bash
   npm start
   # or
   yarn start
   ```

## 📱 App Screens

- **Home**: Dashboard with active deliveries and statistics
- **Orders**: List of all parcels and their status
- **Create Order**: Form to create new deliveries
- **Order Details**: Detailed view of a specific parcel
- **Profile**: User profile and settings
- **Chat**: Communication interface

## 🗄️ Database Schema

### Main Tables

- **parcels**: Stores parcel information
- **addresses**: Stores pickup and delivery locations
- **partners**: Stores delivery partner information
- **profiles**: User profiles
- **transactions**: Payment transactions
- **wallets**: User wallets

## 🔄 Development Workflow

1. Create a new branch for features:
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. Make your changes and commit:
   ```bash
   git add .
   git commit -m "Description of changes"
   ```

3. Push to GitHub:
   ```bash
   git push origin feature/your-feature-name
   ```

4. Create a Pull Request on GitHub

## 📝 Version History

### v1.0.0 (Current)
- Initial release
- Basic parcel tracking functionality
- User authentication
- Real-time updates
- Location services integration

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👥 Authors

- Your Name - Initial work

## 🙏 Acknowledgments

- Supabase team for the amazing backend service
- Expo team for the React Native framework
- All contributors who have helped shape this project
