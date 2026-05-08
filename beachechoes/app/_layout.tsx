import { Stack } from "expo-router";
import { PaperProvider } from 'react-native-paper'
import { AuthProvider } from '../context/AuthContext'
import { AutocompleteDropdownContextProvider } from 'react-native-autocomplete-dropdown'
import { DraftPostProvider } from '../context/DraftPostContext'
import { NotificationPollerProvider } from '../context/NotificationPollerContext'

export default function RootLayout() {
  return (
    <AutocompleteDropdownContextProvider>
      <PaperProvider>
        <AuthProvider>
          <NotificationPollerProvider>
            <DraftPostProvider>
              <Stack />
            </DraftPostProvider>
          </NotificationPollerProvider>
        </AuthProvider>
      </PaperProvider>
    </AutocompleteDropdownContextProvider>
  )
}
