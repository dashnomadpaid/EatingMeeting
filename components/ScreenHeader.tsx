import { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Href } from 'expo-router';
import { BackButton } from './BackButton';

type ScreenHeaderProps = {
  mode?: 'default' | 'overlay';
  title?: string;
  subtitle?: string;
  rightAccessory?: ReactNode;
  backLabel?: string;
  backAlwaysVisible?: boolean;
  backFallbackHref?: Href;
  onBackPress?: () => void;
};

export function ScreenHeader({
  mode = 'default',
  title,
  subtitle,
  rightAccessory,
  backLabel,
  backAlwaysVisible,
  backFallbackHref,
  onBackPress,
}: ScreenHeaderProps) {
  const isOverlay = mode === 'overlay';

  return (
    <SafeAreaView
      edges={['top']}
      style={[styles.safeArea, isOverlay && styles.overlaySafeArea]}
      pointerEvents={isOverlay ? 'box-none' : 'auto'}
    >
      <View
        style={[styles.container, isOverlay && styles.overlayContainer]}
        pointerEvents={isOverlay ? 'box-none' : 'auto'}
      >
        <BackButton
          label={backLabel}
          alwaysShow={backAlwaysVisible}
          fallbackHref={backFallbackHref}
          onPress={onBackPress}
          style={isOverlay ? styles.overlayBackButton : undefined}
        />
        {!isOverlay ? (
          <>
            <View style={styles.titleWrapper}>
              {title ? <Text style={styles.title}>{title}</Text> : null}
              {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
            </View>
            <View style={styles.right}>{rightAccessory}</View>
          </>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: '#FFFFFF',
  },
  overlaySafeArea: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: 'transparent',
    zIndex: 10,
  },
  container: {
    minHeight: 56,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#F0F0F0',
    backgroundColor: '#FFFFFF',
  },
  overlayContainer: {
    minHeight: 0,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 0,
    backgroundColor: 'transparent',
    justifyContent: 'flex-start',
  },
  titleWrapper: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111',
  },
  subtitle: {
    marginTop: 2,
    fontSize: 13,
    color: '#666',
  },
  right: {
    minWidth: 48,
    alignItems: 'flex-end',
  },
  overlayBackButton: {
    backgroundColor: 'rgba(0, 122, 255, 0.12)',
  },
});
