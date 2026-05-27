import { View } from 'react-native';
import { Slot } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React from 'react';

const RootLayout = () => {
  return (
    <View>
      <Slot />
      <StatusBar style="light" />
    </View>
  );
};

export default RootLayout;
