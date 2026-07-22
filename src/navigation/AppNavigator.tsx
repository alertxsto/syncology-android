/**
 * AppNavigator — root navigator.
 *
 * Menampilkan LoginScreen kalau user belum login,
 * MainNavigator kalau sudah login.
 */

import React from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {ActivityIndicator, View} from 'react-native';
import {useAuthContext} from '../store/auth';
import {Colors} from '../theme/colors';
import LoginScreen from '../screens/LoginScreen';
import MainNavigator from './MainNavigator';

export type RootStackParamList = {
  Login: undefined;
  Main: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function AppNavigator() {
  const {user, loading} = useAuthContext();

  if (loading) {
    return (
      <View style={{flex: 1, backgroundColor: Colors.bg0, justifyContent: 'center', alignItems: 'center'}}>
        <ActivityIndicator color={Colors.blue} size="large" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{headerShown: false, animation: 'fade'}}>
        {user ? (
          <Stack.Screen name="Main" component={MainNavigator} />
        ) : (
          <Stack.Screen name="Login" component={LoginScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
