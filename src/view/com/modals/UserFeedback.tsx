import {useState} from 'react'
import {
  ActivityIndicator,
  SafeAreaView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native'
import {msg, Trans} from '@lingui/macro'
import {useLingui} from '@lingui/react'

import {FEEDBACK_POST_TOKEN, FEEDBACK_POST_URL} from '#/lib/constants'
import {usePalette} from '#/lib/hooks/usePalette'
import {useTheme} from '#/lib/ThemeContext'
import {isAndroid} from '#/platform/detection'
import {useModalControls} from '#/state/modals'
import {useSession} from '#/state/session'
import {ErrorMessage} from '../util/error/ErrorMessage'
import {Text} from '../util/text/Text'
import * as Toast from '../util/Toast'
import {ScrollView, TextInput} from './util'

export const snapPoints = isAndroid ? ['90%'] : ['70%']

export function Component() {
  console.log('Loading UserFeedback component')
  const pal = usePalette('default')
  const theme = useTheme()
  const {currentAccount} = useSession()
  const {_} = useLingui()
  const {closeModal} = useModalControls()

  const [rating, setRating] = useState<number>(0)
  const [comment, setComment] = useState<string>('')
  const [anonymous, setAnonymous] = useState<boolean>(false)
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)
  const [error, setError] = useState<string>('')

  const onStarPress = (starRating: number) => {
    setRating(rating === starRating ? 0 : starRating)
  }

  const isFormValid = rating > 0 || comment.trim().length > 0

  const onSubmit = async () => {
    if (!isFormValid) return

    setError('')
    setIsSubmitting(true)

    try {
      const submitUrl = FEEDBACK_POST_URL
      const bearerToken = FEEDBACK_POST_TOKEN

      const data = {
        satisfaction: rating > 0 ? rating.toString() : '',
        comment: comment.trim(),
        anonymous: anonymous ? 'true' : '',
        handle: anonymous ? '' : currentAccount?.handle || '',
        email: anonymous ? '' : currentAccount?.email || '',
      }

      const urlWithToken = `${submitUrl}?bearerToken=${encodeURIComponent(bearerToken)}`

      const response = await fetch(urlWithToken, {
        method: 'POST',
        mode: 'cors',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      let responseData
      try {
        responseData = await response.json()
      } catch {
        responseData = null
      }

      if (
        response.ok &&
        ((responseData && responseData.status === 'success') || !responseData)
      ) {
        Toast.show(
          _(msg`Feedback submitted successfully! Thank you for your input.`),
        )
        closeModal()
      } else {
        throw new Error('Failed to submit feedback')
      }
    } catch (e: any) {
      setError(_(msg`Failed to submit feedback. Please try again.`))
    } finally {
      setIsSubmitting(false)
    }
  }

  const onCancel = () => {
    closeModal()
  }

  return (
    <SafeAreaView style={[styles.container]}>
      <ScrollView style={[pal.view]} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text type="title-xl" style={[styles.title, pal.text]}>
            <Trans>How was Foodios today?</Trans>
          </Text>
        </View>

        <View style={styles.section}>
          <Text type="lg" style={[styles.label, pal.text]}>
            <Trans>Overall Enjoyment (optional)</Trans>
          </Text>
          <View style={styles.starContainer}>
            {[1, 2, 3, 4, 5].map(star => (
              <TouchableOpacity
                key={star}
                onPress={() => onStarPress(star)}
                style={styles.starButton}
                accessibilityRole="button"
                accessibilityLabel={_(msg`${star} stars`)}
                accessibilityHint={_(
                  msg`Rates the application with ${star} stars`,
                )}>
                <Text
                  style={[
                    styles.star,
                    star <= rating ? styles.starActive : styles.starInactive,
                  ]}>
                  ★
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text type="lg" style={[styles.label, pal.text]}>
            <Trans>Comments (optional)</Trans>
          </Text>
          <TextInput
            style={[styles.textArea, pal.borderDark, pal.text]}
            placeholder={_(msg`Please share your feedback...`)}
            placeholderTextColor={pal.textLight.color}
            keyboardAppearance={theme.colorScheme}
            multiline
            numberOfLines={4}
            value={comment}
            onChangeText={setComment}
            accessibilityLabel={_(msg`Feedback comments`)}
            accessibilityHint={_(msg`For entering comments on the app`)}
          />
        </View>

        <View style={styles.section}>
          <TouchableOpacity
            style={styles.checkboxRow}
            onPress={() => setAnonymous(!anonymous)}
            accessibilityRole="button"
            accessibilityLabel={_(msg`Keep feedback anonymous`)}
            accessibilityHint={_(
              msg`Doesn't include your account data with the feedback`,
            )}>
            <View style={[styles.checkbox, pal.border]}>
              {anonymous && <Text style={styles.checkmark}>✓</Text>}
            </View>
            <Text type="md" style={[styles.checkboxLabel, pal.text]}>
              <Trans>Keep feedback anonymous</Trans>
            </Text>
          </TouchableOpacity>
        </View>

        {error ? (
          <View style={styles.section}>
            <ErrorMessage message={error} />
          </View>
        ) : null}

        <View style={styles.buttonContainer}>
          {isSubmitting ? (
            <View style={[styles.button, styles.submitButton]}>
              <ActivityIndicator color="white" />
            </View>
          ) : (
            <TouchableOpacity
              style={[
                styles.button,
                styles.submitButton,
                !isFormValid && styles.buttonDisabled,
              ]}
              onPress={onSubmit}
              disabled={!isFormValid}
              accessibilityRole="button"
              accessibilityLabel={_(msg`Submit feedback`)}
              accessibilityHint={_(
                msg`Sends the feedback about the application`,
              )}>
              <Text
                type="button-lg"
                style={[styles.buttonText, styles.submitButtonText]}>
                <Trans>Submit Feedback</Trans>
              </Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.button, styles.cancelButton]}
            onPress={onCancel}
            accessibilityRole="button"
            accessibilityLabel={_(msg`Cancel`)}
            accessibilityHint={_(msg`Exits the feedback form`)}>
            <Text type="button-lg" style={[styles.buttonText, pal.textLight]}>
              <Trans>Cancel</Trans>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 20,
  },
  title: {
    textAlign: 'center',
    fontWeight: 'bold',
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  label: {
    marginBottom: 8,
    fontWeight: '600',
  },
  starContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
  },
  starButton: {
    padding: 4,
  },
  star: {
    fontSize: 32,
  },
  starActive: {
    color: '#ffc107',
  },
  starInactive: {
    color: '#ddd',
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmark: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#007bff',
  },
  checkboxLabel: {
    flex: 1,
  },
  buttonContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    gap: 12,
  },
  button: {
    borderRadius: 24,
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  submitButton: {
    backgroundColor: '#007bff',
  },
  buttonDisabled: {
    backgroundColor: '#6c757d',
    opacity: 0.6,
  },
  cancelButton: {
    backgroundColor: 'transparent',
  },
  buttonText: {
    fontWeight: '600',
  },
  submitButtonText: {
    color: 'white',
  },
})
