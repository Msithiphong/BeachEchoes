import { Stack } from "expo-router";
import { PaperProvider } from 'react-native-paper'
import { AuthProvider } from '../context/AuthContext'
import { AutocompleteDropdownContextProvider } from 'react-native-autocomplete-dropdown'
import { DraftPostProvider } from '../context/DraftPostContext'
import { NotificationPollerProvider } from '../context/NotificationPollerContext'
import { AppThemeProvider } from '../context/AppThemeContext'

export default function RootLayout() {
  return (
    <AutocompleteDropdownContextProvider>
      <AppThemeProvider>
        <PaperProvider>
          <AuthProvider>
            <NotificationPollerProvider>
              <DraftPostProvider>
                <Stack />
              </DraftPostProvider>
            </NotificationPollerProvider>
          </AuthProvider>
        </PaperProvider>
      </AppThemeProvider>
    </AutocompleteDropdownContextProvider>
  )
}
