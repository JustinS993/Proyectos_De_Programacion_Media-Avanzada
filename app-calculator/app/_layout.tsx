import { Fonts } from "@/constants/theme"; 
import { globalStyles } from "@/styles/globalStyles"; 
import { Slot } from "expo-router"; 
import { StatusBar } from "expo-status-bar"; 
import React from "react"; 
import { Text, View } from "react-native"; 

const RootLayout = () => { 
  return ( 
    <View> 
      <View 

        style={[{ position: "absolute", width: '100%', display: "flex", alignItems: "center" }, globalStyles.background]}> 
        <Text 
          style={{ 
            marginTop: 20, 
            fontSize: 40, 
            fontFamily: Fonts.serif, 
            color: "white", 
            paddingBottom: 10 
          }} 
        > 
          Calculator App 
        </Text> 
      </View> 
      <Slot /> 
      <StatusBar style="light" /> 
    </View> 
  ); 
}; 

export default RootLayout; 
