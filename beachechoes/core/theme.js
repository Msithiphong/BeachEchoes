import { DefaultTheme } from 'react-native-paper'

// Paper theme overrides keep legacy components readable on the app's dark backgrounds.
export const theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    text: '#ffffff',
    primary: '#000000',
    secondary: '#414757',
    error: '#f13a59',
  },
}
