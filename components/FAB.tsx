import { Text, Pressable, StyleSheet, StyleProp, ViewStyle } from 'react-native' 
import React from 'react' 

interface Props { 
    label: string; 
    position?: "left" | "right"; 
    color?: string;
    style?: StyleProp<ViewStyle>;
    // Actions 
    onPress?: () => void; 
    onLongPress?: () => void; 
} 

export default function FAB({ 
    label, 
    position = "right", 
    color = "#007AFF",
    style,
    onPress, 
    onLongPress, 
}: Props) { 
    return ( 
        <Pressable 
            style={({ pressed }) => [ 
                styles.floattingButton, 
                { backgroundColor: color },
                position === "right" ? styles.positionRight : styles.positionLeft, 
                style,
                pressed ? { opacity: 0.7 } : { opacity: 1 }, 
            ]} 
            onPress={onPress} 
            onLongPress={onLongPress} 
        > 
            <Text style={{ color: "white", fontSize: 20 }}>{label}</Text> 
        </Pressable> 
    ) 
} 

const styles = StyleSheet.create({ 
    floattingButton: { 
        position: "absolute", 
        bottom: 20, 
        borderRadius: 15, 
        padding: 10, 
        shadowColor: "#000", 
        shadowOffset: { 
            width: 0, 
            height: 4, 
        }, 
        elevation: 3, 
    }, 
    positionRight: { 
        right: 20, 
    }, 
    positionLeft: { 
        left: 20, 
    }, 
});