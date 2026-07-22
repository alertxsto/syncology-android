/**
 * Syncology Android — Root Entry
 */

import 'react-native-url-polyfill/auto';
import React from 'react';
import {AuthProvider} from './src/store/auth';
import AppNavigator from './src/navigation/AppNavigator';

export default function App() {
  return (
    <AuthProvider>
      <AppNavigator />
    </AuthProvider>
  );
}
