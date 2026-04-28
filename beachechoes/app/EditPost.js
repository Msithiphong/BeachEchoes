import React, { useState } from 'react'
import {
  View,
  TextInput,
  TouchableOpacity,
  Text,
  Switch,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native'
import { useRouter } from 'expo-router'
import { LinearGradient } from 'expo-linear-gradient'
import { useDraftPost } from '../context/DraftPostContext'
import PostImageWithOverlay from '../components/PostImageWithOverlay'
import { DEFAULT_POST_CATEGORY, POST_CATEGORIES } from '../config/postCategories'

const MAX_OVERLAY_LENGTH = 2000

export default function EditPost() {
  const router = useRouter()

  const {
    localImageUri,
    overlayText,
    setOverlayText,
    category,
    setCategory,
    isAnonymous,
    setIsAnonymous,
    capturedAt,
    latitude,
    longitude,
    clearDraft,
  } = useDraftPost()

  const [text, setText] = useState(overlayText)
  const [selectedCategory, setSelectedCategory] = useState(
    category || DEFAULT_POST_CATEGORY
  )
  const [categoryOpen, setCategoryOpen] = useState(false)

  if (!localImageUri) {
    router.replace('/(tabs)/Camera')
    return null
  }

  function handleRetake() {
    clearDraft()
    router.replace('/(tabs)/Camera')
  }

  function handleContinue() {
    setOverlayText(text.trim())
    setCategory(selectedCategory)
    router.push('/MapPlacement')
  }

  function handleTextChange(value) {
    if (value.length <= MAX_OVERLAY_LENGTH) {
      setText(value)
    }
  }

  const capturedLabel = capturedAt
    ? new Date(capturedAt).toLocaleString()
    : 'Capture time unavailable'

  const locationLabel =
    latitude != null && longitude != null
      ? `Location captured: ${Number(latitude).toFixed(5)}, ${Number(longitude).toFixed(5)}`
      : 'Location unavailable'

  return (
    <LinearGradient colors={['#9ed4df', '#ffe000']} style={styles.flex}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.container}>
          <View style={styles.headerCard}>
            <Text style={styles.title}>Craft Your Echo</Text>
            <Text style={styles.subtitle}>
              Add a vibe, pick a tag, then confirm where it should appear on the map.
            </Text>

            <View style={styles.metaPill}>
              <Text style={styles.metaPillText}>Taken: {capturedLabel}</Text>
            </View>

            <View style={styles.metaPill}>
              <Text style={styles.metaPillText}>{locationLabel}</Text>
            </View>
          </View>

          <View style={styles.previewCard}>
            <PostImageWithOverlay
              imageUri={localImageUri}
              overlayText={text}
              style={styles.preview}
            />
          </View>

          <View style={styles.formCard}>
            <View style={styles.categoryRow}>
              <Text style={styles.categoryLabel}>Category</Text>

              <TouchableOpacity
                style={styles.categoryTrigger}
                onPress={() => setCategoryOpen((prev) => !prev)}
              >
                <Text style={styles.categoryValue}>{selectedCategory}</Text>
                <Text style={styles.categoryChevron}>
                  {categoryOpen ? '▲' : '▼'}
                </Text>
              </TouchableOpacity>

              {categoryOpen && (
                <View style={styles.categoryMenu}>
                  {POST_CATEGORIES.map((item) => {
                    const active = item === selectedCategory

                    return (
                      <TouchableOpacity
                        key={item}
                        style={[
                          styles.categoryOption,
                          active && styles.categoryOptionActive,
                        ]}
                        onPress={() => {
                          setSelectedCategory(item)
                          setCategoryOpen(false)
                        }}
                      >
                        <Text
                          style={[
                            styles.categoryOptionText,
                            active && styles.categoryOptionTextActive,
                          ]}
                        >
                          {item}
                        </Text>
                      </TouchableOpacity>
                    )
                  })}
                </View>
              )}
            </View>

            <View style={styles.inputRow}>
              <View style={styles.inputTopRow}>
                <Text style={styles.inputLabel}>Caption</Text>
                <Text style={styles.charCount}>
                  {text.length}/{MAX_OVERLAY_LENGTH}
                </Text>
              </View>

              <TextInput
                value={text}
                onChangeText={handleTextChange}
                placeholder="Write your echo..."
                multiline
                style={styles.input}
              />
            </View>

            <View style={styles.toggleRow}>
              <View style={styles.toggleTextWrap}>
                <Text style={styles.toggleTitle}>Post anonymously</Text>
                <Text style={styles.toggleSubtitle}>
                  Show this echo as posted by Anonymous.
                </Text>
              </View>

              <Switch value={isAnonymous} onValueChange={setIsAnonymous} />
            </View>
          </View>

          <View style={styles.actions}>
            <TouchableOpacity style={styles.secondaryBtn} onPress={handleRetake}>
              <Text style={styles.secondaryText}>Retake</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.primaryBtn} onPress={handleContinue}>
              <LinearGradient
                colors={['#1e293b', '#0f172a']}
                style={styles.primaryBtnGradient}
              >
                <Text style={styles.primaryText}>Continue</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  )
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  container: {
    padding: 16,
    paddingBottom: 40,
    gap: 14,
  },
  headerCard: {
    backgroundColor: 'rgba(255,255,255,0.82)',
    borderRadius: 20,
    padding: 16,
    shadowColor: '#1a1a1a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 3,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0f172a',
  },
  subtitle: {
    marginTop: 6,
    fontSize: 14,
    color: '#334155',
  },
  metaPill: {
    marginTop: 12,
    alignSelf: 'flex-start',
    backgroundColor: '#e2e8f0',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  metaPillText: {
    fontSize: 12,
    color: '#1e293b',
    fontWeight: '600',
  },
  previewCard: {
    backgroundColor: 'rgba(255,255,255,0.8)',
    borderRadius: 20,
    padding: 8,
    shadowColor: '#111827',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  preview: {
    borderRadius: 14,
  },
  formCard: {
    backgroundColor: 'rgba(255,255,255,0.88)',
    borderRadius: 20,
    padding: 14,
  },
  categoryRow: {
    marginBottom: 14,
  },
  categoryLabel: {
    fontSize: 13,
    color: '#334155',
    marginBottom: 6,
    fontWeight: '700',
  },
  categoryTrigger: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f8fafc',
  },
  categoryValue: {
    fontSize: 15,
    color: '#0f172a',
    fontWeight: '600',
  },
  categoryChevron: {
    color: '#888',
    fontSize: 12,
  },
  categoryMenu: {
    borderWidth: 1,
    borderColor: '#dbe1ea',
    borderRadius: 12,
    marginTop: 8,
    overflow: 'hidden',
    backgroundColor: '#f8fafc',
  },
  categoryOption: {
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  categoryOptionActive: {
    backgroundColor: '#e8f2ff',
  },
  categoryOptionText: {
    fontSize: 15,
    color: '#0f172a',
  },
  categoryOptionTextActive: {
    color: '#145ea8',
    fontWeight: '700',
  },
  inputRow: {
    marginBottom: 2,
  },
  inputTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
  },
  input: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 12,
    padding: 12,
    fontSize: 15,
    color: '#111827',
    minHeight: 110,
    textAlignVertical: 'top',
    backgroundColor: '#fff',
  },
  charCount: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
  },
  toggleRow: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  toggleTextWrap: {
    flex: 1,
  },
  toggleTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1e293b',
  },
  toggleSubtitle: {
    marginTop: 2,
    fontSize: 12,
    color: '#64748b',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  secondaryBtn: {
    flex: 1,
    paddingVertical: 15,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#1e293b',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.75)',
  },
  secondaryText: {
    color: '#111827',
    fontWeight: '700',
    fontSize: 15,
  },
  primaryBtn: {
    flex: 1,
    borderRadius: 14,
    overflow: 'hidden',
  },
  primaryBtnGradient: {
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
  },
})