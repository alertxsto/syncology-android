/**
 * Syncology Android — Root Entry
 */

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
