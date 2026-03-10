import React, { useRef } from 'react'
import { StyleSheet } from 'react-native'
import { AutocompleteDropdown } from 'react-native-autocomplete-dropdown'
import useUserSearch from '../hooks/useUserSearch'
import { theme } from '../core/theme'

/**
 * Reusable username autocomplete dropdown.
 *
 * Uses react-native-autocomplete-dropdown + the useUserSearch hook.
 * The parent provides an `onSelectUser` callback that receives
 * { id: firebase_uid, title: name } when a suggestion is tapped.
 *
 * @param {object}   props
 * @param {function} props.onSelectUser - Called with the selected item ({ id, title })
 * @param {number}   [props.debounceMs=300] - Debounce delay in ms
 * @param {string}   [props.placeholder='Search users...']
 */
export default function UserAutocomplete({
  onSelectUser,
  debounceMs = 300,
  placeholder = 'Search users...',
}) {
  const dropdownRef = useRef(null)
  const { suggestions, loading, onChangeText, clearSuggestions } =
    useUserSearch(debounceMs)

  const handleSelect = (item) => {
    if (!item) return
    onSelectUser?.(item)
  }

  const handleClear = () => {
    clearSuggestions()
  }

  return (
    <AutocompleteDropdown
      ref={dropdownRef}
      dataSet={suggestions}
      onChangeText={onChangeText}
      onSelectItem={handleSelect}
      onClear={handleClear}
      loading={loading}
      debounce={0} // we handle debounce ourselves in the hook
      useFilter={false} // server-side filtering
      clearOnFocus={false}
      closeOnBlur={true}
      showChevron={false}
      textInputProps={{
        placeholder,
        autoCorrect: false,
        autoCapitalize: 'none',
        style: styles.input,
      }}
      inputContainerStyle={styles.inputContainer}
      suggestionsListContainerStyle={styles.suggestionsList}
      suggestionsListTextStyle={styles.suggestionText}
      emptyResultText="No users found"
    />
  )
}

const styles = StyleSheet.create({
  inputContainer: {
    backgroundColor: theme.colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ccc',
  },
  input: {
    color: theme.colors.secondary,
    fontSize: 16,
    paddingLeft: 12,
  },
  suggestionsList: {
    backgroundColor: '#fff',
    borderRadius: 8,
  },
  suggestionText: {
    color: theme.colors.secondary,
    fontSize: 15,
  },
})
