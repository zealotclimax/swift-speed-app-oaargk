
import { StyleSheet, ViewStyle, TextStyle } from 'react-native';

export const colors = {
  // Speed tracker theme - dynamic blue/green gradient
  background: '#0A0E27',
  text: '#FFFFFF',
  textSecondary: '#8B9DC3',
  primary: '#00D9FF',
  secondary: '#00FF88',
  accent: '#FF6B6B',
  card: '#1A1F3A',
  highlight: '#2D3561',
  speedometerGlow: '#00D9FF',
  speedometerTrack: '#1A1F3A',
};

export const commonStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  text: {
    color: colors.text,
  },
  textSecondary: {
    color: colors.textSecondary,
  },
});
