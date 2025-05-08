module.exports = {
  expo: {
    name: "MBet-Adera",
    slug: "mbet-adera",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/images/icon_mbet_adera1.png",
    scheme: "mbetsupachapa",
    userInterfaceStyle: "automatic",
    splash: {
      image: "./assets/images/splash-mbetadera.jpg",
      resizeMode: "contain",
      backgroundColor: "#ffffff"
    },
    assetBundlePatterns: [
      "**/*"
    ],
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.ermax7.mbetaderav2x"
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/images/icon_mbet_adera1.png",
        backgroundColor: "#ffffff"
      },
      package: "com.ermax7.mbetaderav2x",
      permissions: [
        "ACCESS_FINE_LOCATION",
        "ACCESS_COARSE_LOCATION"
      ]
    },
    web: {
      bundler: "metro",
      favicon: "./assets/images/icon_mbet_adera1.png"
    },
    plugins: [
      "expo-router",
      [
        "expo-location",
        {
          locationAlwaysAndWhenInUsePermission: "Allow MBet-Adera to use your location to show nearby delivery points and track deliveries."
        }
      ]
    ],
    extra: {
      eas: {
        projectId: "880e35c2-c8c0-4d8f-96f7-5bcf13981557"
      }
    }
  }
}; 