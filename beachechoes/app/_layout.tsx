import { Stack } from "expo-router";
import { PaperProvider } from 'react-native-paper'
import { AuthProvider } from '../context/AuthContext'
import { AutocompleteDropdownContextProvider } from 'react-native-autocomplete-dropdown'
import { DraftPostProvider } from '../context/DraftPostContext'

export default function RootLayout() {
  return (
    <AutocompleteDropdownContextProvider>
      <PaperProvider>
        <AuthProvider>
          <DraftPostProvider>
            <Stack />
          </DraftPostProvider>
        </AuthProvider>
      </PaperProvider>
    </AutocompleteDropdownContextProvider>
  )
}
