import {StyleSheet, TextStyle} from 'react-native';
import {Colors} from './colors';

export const Typography = {
  // Font sizes
  xs: 11,
  sm: 12,
  base: 14,
  md: 15,
  lg: 17,
  xl: 20,
  '2xl': 24,
  '3xl': 28,
  '4xl': 34,

  // Font weights (RN uses string values)
  regular: '400' as TextStyle['fontWeight'],
  medium: '500' as TextStyle['fontWeight'],
  semibold: '600' as TextStyle['fontWeight'],
  bold: '700' as TextStyle['fontWeight'],
  extrabold: '800' as TextStyle['fontWeight'],

  // Letter spacing
  tightTracking: -0.5,
  normalTracking: 0,
  wideTracking: 0.3,
} as const;

export const baseText = StyleSheet.create({
  h1: {
    fontSize: Typography['3xl'],
    fontWeight: Typography.extrabold,
    color: Colors.text1,
    letterSpacing: Typography.tightTracking,
  },
  h2: {
    fontSize: Typography['2xl'],
    fontWeight: Typography.bold,
    color: Colors.text1,
    letterSpacing: Typography.tightTracking,
  },
  h3: {
    fontSize: Typography.xl,
    fontWeight: Typography.semibold,
    color: Colors.text1,
  },
  body: {
    fontSize: Typography.base,
    fontWeight: Typography.regular,
    color: Colors.text2,
    lineHeight: 22,
  },
  caption: {
    fontSize: Typography.sm,
    fontWeight: Typography.regular,
    color: Colors.text3,
    lineHeight: 18,
  },
  mono: {
    fontFamily: 'monospace',
    fontSize: Typography.sm,
    color: Colors.text2,
  },
});
