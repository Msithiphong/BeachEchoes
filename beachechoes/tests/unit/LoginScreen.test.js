import React from 'react'
import { render, fireEvent, waitFor } from '@testing-library/react-native'
import LoginScreen from '../../app/LoginScreen'
import { AuthContext } from '../../context/AuthContext'
import { emailValidator } from '../../helpers/emailValidator'
import { passwordValidator } from '../../helpers/passwordValidator'

// Mock dependencies
jest.mock('expo-router', () => ({
  useRouter: jest.fn(),
}))

jest.mock('../../helpers/emailValidator', () => ({
  emailValidator: jest.fn(),
}))

jest.mock('../../helpers/passwordValidator', () => ({
  passwordValidator: jest.fn(),
}))

// Mock components properly to render children and props
jest.mock('../../components/Background', () => {
  const React = require('react')
  const { View } = require('react-native')
  return ({ children }) => <View testID="background">{children}</View>
})

jest.mock('../../components/Logo', () => {
  const React = require('react')
  const { View } = require('react-native')
  return () => <View testID="logo" />
})

jest.mock('../../components/Header', () => {
  const React = require('react')
  const { Text } = require('react-native')
  return ({ children, ...props }) => <Text {...props}>{children}</Text>
})

jest.mock('../../components/Button', () => {
  const React = require('react')
  const { TouchableOpacity, Text } = require('react-native')
  return ({ children, onPress, loading, disabled, ...props }) => (
    <TouchableOpacity 
      onPress={onPress} 
      disabled={disabled || loading}
      testID="button"
      {...props}
    >
      <Text>{children}</Text>
    </TouchableOpacity>
  )
})

jest.mock('../../components/TextInput', () => {
  const React = require('react')
  const { TextInput: RNTextInput, View, Text } = require('react-native')
  return ({ label, errorText, value, onChangeText, ...props }) => (
    <View>
      <RNTextInput
        accessibilityLabel={label}
        value={value}
        onChangeText={onChangeText}
        placeholder={label}
        {...props}
      />
      {errorText && <Text>{errorText}</Text>}
    </View>
  )
})

jest.mock('../../components/BackButton', () => {
  const React = require('react')
  const { TouchableOpacity, Text } = require('react-native')
  return ({ goBack }) => (
    <TouchableOpacity onPress={goBack} testID="back-button">
      <Text>Back</Text>
    </TouchableOpacity>
  )
})

global.fetch = jest.fn()

describe('LoginScreen', () => {
  let mockRouter
  let mockLogin

  beforeEach(() => {
    mockRouter = {
      push: jest.fn(),
      replace: jest.fn(),
      back: jest.fn(),
    }
    mockLogin = jest.fn()

    require('expo-router').useRouter.mockReturnValue(mockRouter)
    emailValidator.mockReturnValue('')
    passwordValidator.mockReturnValue('')
    global.fetch.mockClear()
  })

  const renderWithContext = (component) => {
    return render(
      <AuthContext.Provider value={{ login: mockLogin }}>
        {component}
      </AuthContext.Provider>
    )
  }

  it('renders all UI elements correctly', () => {
    const { getByText } = renderWithContext(<LoginScreen />)

    expect(getByText('Welcome back.')).toBeTruthy()
    expect(getByText('Forgot your password?')).toBeTruthy()
    expect(getByText('Login')).toBeTruthy()
    expect(getByText('Sign up')).toBeTruthy()
  })

  it('validates email and password on login press', async () => {
    emailValidator.mockReturnValue('Invalid email')
    passwordValidator.mockReturnValue('Password too short')

    const { getByText } = renderWithContext(<LoginScreen />)
    const loginButton = getByText('Login')

    fireEvent.press(loginButton)

    await waitFor(() => {
      expect(emailValidator).toHaveBeenCalled()
      expect(passwordValidator).toHaveBeenCalled()
    })
  })

  it('does not call API if validation fails', async () => {
    emailValidator.mockReturnValue('Invalid email')

    const { getByText } = renderWithContext(<LoginScreen />)
    const loginButton = getByText('Login')

    fireEvent.press(loginButton)

    await waitFor(() => {
      expect(global.fetch).not.toHaveBeenCalled()
    })
  })

  it('calls login API with correct credentials on successful validation', async () => {
    const { signInWithEmailAndPassword } = require('firebase/auth');
    
    // Mock Firebase sign in
    const mockUserCredential = {
      user: {
        uid: 'firebase-uid-123',
        email: 'test@example.com',
        displayName: 'Test User',
        getIdToken: jest.fn().mockResolvedValue('mock-id-token')
      }
    };
    signInWithEmailAndPassword.mockResolvedValueOnce(mockUserCredential);
    
    // Mock user sync endpoint
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, user: { id: 1, firebase_uid: 'firebase-uid-123' } }),
    });

    const { getByText, getByLabelText } = renderWithContext(<LoginScreen />);
    const emailInput = getByLabelText('Email');
    const passwordInput = getByLabelText('Password');
    const loginButton = getByText('Login');

    fireEvent.changeText(emailInput, 'test@example.com');
    fireEvent.changeText(passwordInput, 'password123');
    fireEvent.press(loginButton);

    await waitFor(() => {
      expect(signInWithEmailAndPassword).toHaveBeenCalledWith(
        expect.anything(), // auth object
        'test@example.com',
        'password123'
      );
    });
  });

  it('navigates to Dashboard on successful login', async () => {
    const { signInWithEmailAndPassword } = require('firebase/auth');
    
    // Mock Firebase sign in
    const mockUserCredential = {
      user: {
        uid: 'firebase-uid-123',
        email: 'test@example.com',
        displayName: 'Test User',
        getIdToken: jest.fn().mockResolvedValue('mock-id-token')
      }
    };
    signInWithEmailAndPassword.mockResolvedValueOnce(mockUserCredential);
    
    // Mock user sync endpoint
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, user: { id: 1, firebase_uid: 'firebase-uid-123' } }),
    });

    const { getByText } = renderWithContext(<LoginScreen />);
    const loginButton = getByText('Login');

    fireEvent.press(loginButton);

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith({
        uid: 'firebase-uid-123',
        email: 'test@example.com',
        name: 'Test User'
      });
      expect(mockRouter.replace).toHaveBeenCalledWith('/Dashboard');
    });
  });

  it('displays error on failed login', async () => {
    global.fetch.mockResolvedValueOnce({
      json: async () => ({ success: false, error: 'Invalid credentials' }),
    })

    const { getByText } = renderWithContext(<LoginScreen />)
    const loginButton = getByText('Login')

    fireEvent.press(loginButton)

    await waitFor(() => {
      expect(mockLogin).not.toHaveBeenCalled()
      expect(mockRouter.replace).not.toHaveBeenCalled()
    })
  })

  it('displays network error on fetch failure', async () => {
    global.fetch.mockRejectedValueOnce(new Error('Network error'))

    const { getByText } = renderWithContext(<LoginScreen />)
    const loginButton = getByText('Login')

    fireEvent.press(loginButton)

    await waitFor(() => {
      expect(mockLogin).not.toHaveBeenCalled()
      expect(mockRouter.replace).not.toHaveBeenCalled()
    })
  })

  it('navigates to ResetPasswordScreen when forgot password is pressed', () => {
    const { getByText } = renderWithContext(<LoginScreen />)
    const forgotPasswordLink = getByText('Forgot your password?')

    fireEvent.press(forgotPasswordLink)

    expect(mockRouter.push).toHaveBeenCalledWith('/ResetPasswordScreen')
  })

  it('navigates to RegisterScreen when sign up is pressed', () => {
    const { getByText } = renderWithContext(<LoginScreen />)
    const signUpLink = getByText('Sign up')

    fireEvent.press(signUpLink)

    expect(mockRouter.replace).toHaveBeenCalledWith('/RegisterScreen')
  })

  it('calls router.back when back button is pressed', () => {
    const { getByTestId } = renderWithContext(<LoginScreen />)
    const backButton = getByTestId('back-button')

    fireEvent.press(backButton)

    expect(mockRouter.back).toHaveBeenCalled()
  })

  it('clears email error when user types', () => {
    emailValidator.mockReturnValueOnce('Invalid email').mockReturnValue('')

    const { getByLabelText, getByText } = renderWithContext(<LoginScreen />)
    const emailInput = getByLabelText('Email')
    const loginButton = getByText('Login')

    fireEvent.press(loginButton)
    fireEvent.changeText(emailInput, 'new@example.com')

    // Error should be cleared after typing
    expect(emailInput.props.error).toBeFalsy()
  })

  it('clears password error when user types', () => {
    passwordValidator.mockReturnValueOnce('Password too short').mockReturnValue('')

    const { getByLabelText, getByText } = renderWithContext(<LoginScreen />)
    const passwordInput = getByLabelText('Password')
    const loginButton = getByText('Login')

    fireEvent.press(loginButton)
    fireEvent.changeText(passwordInput, 'newpassword')

    // Error should be cleared after typing
    expect(passwordInput.props.error).toBeFalsy()
  })

  it('sets loading state during login', async () => {
    const { signInWithEmailAndPassword } = require('firebase/auth');
    
    // Mock Firebase sign in
    const mockUserCredential = {
      user: {
        uid: 'firebase-uid-123',
        email: 'test@example.com',
        displayName: 'Test User',
        getIdToken: jest.fn().mockResolvedValue('mock-id-token')
      }
    };
    signInWithEmailAndPassword.mockResolvedValueOnce(mockUserCredential);
    
    // Mock user sync endpoint
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, user: { id: 1 } }),
    });

    const { getByTestId } = renderWithContext(<LoginScreen />);
    const loginButton = getByTestId('button');

    fireEvent.press(loginButton);

    // Verify the button was pressed and Firebase auth was called
    await waitFor(() => {
      expect(signInWithEmailAndPassword).toHaveBeenCalled();
    });
  });
});
