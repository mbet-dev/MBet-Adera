import React from 'react';
import QRCode from 'react-native-qrcode-svg';
import { Image, View, StyleSheet } from 'react-native';

// Assuming the logo is correctly found by the bundler.
// The path might need adjustment based on your project's asset handling.
const logoImage = require('../../../assets/images/new-mbetadera-icon-1.png'); 

interface LogoQRCodeProps {
  value: string;
  size?: number;
  logoSize?: number;
  logoBackgroundColor?: string;
  qrCodeColor?: string;
  qrCodeBackgroundColor?: string;
}

const LogoQRCode: React.FC<LogoQRCodeProps> = ({
  value,
  size = 150,
  logoSize = 30,
  logoBackgroundColor = 'transparent',
  qrCodeColor = 'black',
  qrCodeBackgroundColor = 'white',
}) => {
  return (
    <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
      <QRCode
        value={value}
        size={size}
        color={qrCodeColor}
        backgroundColor={qrCodeBackgroundColor}
        logo={logoImage}
        logoSize={logoSize}
        logoBackgroundColor={logoBackgroundColor}
        logoMargin={2}
        logoBorderRadius={5}
      />
    </View>
  );
};

export default LogoQRCode; 