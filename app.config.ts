import { ConfigContext, ExpoConfig } from 'expo/config';

const DEFAULT_PLUGINS: ExpoConfig['plugins'] = [
  'expo-router',
  'expo-font',
  'expo-web-browser',
  [
    'expo-location',
    {
      locationWhenInUsePermission:
        'We need your location to show nearby restaurants and meal buddies',
    },
  ],
  ['expo-notifications', { icon: './assets/images/icon.png' }],
  [
    'expo-image-picker',
    {
      photosPermission: 'We need access to your photos to let you add profile pictures',
    },
  ],
];

export default ({ config }: ConfigContext): ExpoConfig => {
  const googleMapsKey =
    process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ??
    process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY ??
    '';

  const merged: ExpoConfig = {
    ...config,
    name: 'EatingMeeting',
    slug: 'eating-meeting',
    orientation: config.orientation ?? 'portrait',
    icon: config.icon ?? './assets/images/icon.png',
    scheme: config.scheme ?? 'eatingmeeting',
    userInterfaceStyle: config.userInterfaceStyle ?? 'automatic',
    ios: {
      ...(config.ios ?? {}),
      supportsTablet: true,
      infoPlist: {
        ...config.ios?.infoPlist,
        NSLocationWhenInUseUsageDescription:
          '주변 식당과 카페를 보여주기 위해 위치 권한이 필요합니다.',
        NSPhotoLibraryUsageDescription:
          'We need access to your photo library to let you add profile photos',
        NSCameraUsageDescription:
          'We need camera access to let you take photos for your profile',
      },
    },
    android: {
      ...(config.android ?? {}),
      softwareKeyboardLayoutMode: config.android?.softwareKeyboardLayoutMode ?? 'pan',
      permissions:
        config.android?.permissions ??
        [
          'ACCESS_COARSE_LOCATION',
          'ACCESS_FINE_LOCATION',
          'CAMERA',
          'READ_EXTERNAL_STORAGE',
          'WRITE_EXTERNAL_STORAGE',
        ],
    },
    web: {
      ...(config.web ?? {}),
      bundler: config.web?.bundler ?? 'metro',
      output: config.web?.output ?? 'single',
      favicon: config.web?.favicon ?? './assets/images/favicon.png',
    },
    plugins: config.plugins ?? DEFAULT_PLUGINS,
    experiments: {
      ...(config.experiments ?? {}),
      typedRoutes: true,
    },
    extra: {
      ...(config.extra ?? {}),
      googleMapsKey,
    },
  };

  if (googleMapsKey) {
    merged.ios = {
      ...merged.ios,
      config: {
        ...(merged.ios?.config ?? {}),
        googleMapsApiKey: googleMapsKey,
      },
    };
    merged.android = {
      ...merged.android,
      config: {
        ...(merged.android?.config ?? {}),
        googleMaps: {
          ...(merged.android?.config?.googleMaps ?? {}),
          apiKey: googleMapsKey,
        },
      },
    };
  }

  return merged;
};
