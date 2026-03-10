import { Stack } from "expo-router";
import { PaperProvider } from 'react-native-paper'
import { AuthProvider } from '../context/AuthContext'
import { AutocompleteDropdownContextProvider } from 'react-native-autocomplete-dropdown'

export default function RootLayout() {
  return (
    <AutocompleteDropdownContextProvider>
      <PaperProvider>
        <AuthProvider>
          <Stack />
        </AuthProvider>
      </PaperProvider>
    </AutocompleteDropdownContextProvider>
  )
}
