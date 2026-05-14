import React from 'react'
import { View, StyleSheet, Text } from 'react-native'
import { TextInput as Input } from 'react-native-paper'
import { theme } from '../core/theme'

// Standardize helper text and error text around Paper's outlined text inputs.
export default function TextInput({ errorText, description, textColor, placeholderTextColor, ...props }) {
  // Create a custom theme override for this input if custom colors are provided
  const customTheme = (textColor || placeholderTextColor) ? {
    ...theme,
    colors: {
      ...theme.colors,
      ...(placeholderTextColor && { onSurfaceVariant: placeholderTextColor }),
      ...(placeholderTextColor && { placeholder: placeholderTextColor }),
    }
  } : theme;

  return (
    <View style={styles.container}>
      <Input
        style={styles.input}
        contentStyle={textColor ? { color: textColor } : undefined}
        selectionColor={theme.colors.primary}
        underlineColor="transparent"
        mode="outlined"
        theme={customTheme}
        {...props}
      />
      {description && !errorText ? (
        <Text style={styles.description}>{description}</Text>
      ) : null}
      {errorText ? <Text style={styles.error}>{errorText}</Text> : null}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginVertical: 12,
  },
  input: {
    backgroundColor: theme.colors.surface,
  },
  description: {
    fontSize: 13,
    color: theme.colors.secondary,
    paddingTop: 8,
  },
  error: {
    fontSize: 13,
    color: theme.colors.error,
    paddingTop: 8,
  },
})
