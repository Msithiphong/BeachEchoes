/**
 * StartScreen Unit Tests
 * 
 * Regression tests for environment variable-controlled button visibility.
 * Tests verify that Dashboard and Admin Dashboard buttons can be enabled/disabled
 * via ENABLE_DASHBOARD_BUTTON and ENABLE_ADMIN_DASHBOARD_BUTTON env variables.
 * 
 * Expected behavior:
 * - When env variable is 'true', corresponding button should be rendered
 * - When env variable is 'false' or undefined, button should not be rendered
 * - Login and Sign Up buttons should always be rendered
 */

import React from 'react'
import { render, fireEvent } from '@testing-library/react-native'
import StartScreen from '../../app/StartScreen'

// Mock expo-router
jest.mock('expo-router', () => ({
  useRouter: jest.fn(),
}))

// Mock components to render children and props
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
  return ({ children, ...props }) => <Text testID="header" {...props}>{children}</Text>
})

jest.mock('../../components/Paragraph', () => {
  const React = require('react')
  const { Text } = require('react-native')
  return ({ children, ...props }) => <Text testID="paragraph" {...props}>{children}</Text>
})

jest.mock('../../components/Button', () => {
  const React = require('react')
  const { TouchableOpacity, Text } = require('react-native')
  return ({ children, onPress, mode, ...props }) => (
    <TouchableOpacity 
      onPress={onPress} 
      testID={`button-${children}`}
      accessibilityLabel={children}
      {...props}
    >
      <Text>{children}</Text>
    </TouchableOpacity>
  )
})

jest.mock('../../components/LocalNotifications', () => {
  const React = require('react')
  const { View } = require('react-native')
  return () => <View testID="local-notifications" />
})

describe('StartScreen', () => {
  let mockRouter

  beforeEach(() => {
    // Reset router mock
    mockRouter = {
      push: jest.fn(),
      replace: jest.fn(),
      back: jest.fn(),
    }
    require('expo-router').useRouter.mockReturnValue(mockRouter)
    
    // Clear any existing env variable mocks
    delete process.env.EXPO_PUBLIC_ENABLE_DASHBOARD_BUTTON
    delete process.env.EXPO_PUBLIC_ENABLE_ADMIN_DASHBOARD_BUTTON
  })

  describe('Core Functionality', () => {
    it('should render app branding (logo, header, tagline)', () => {
      const { getByTestId, getByText } = render(<StartScreen />)
      
      expect(getByTestId('logo')).toBeTruthy()
      expect(getByText('Beach Echoes')).toBeTruthy()
      expect(getByText('Connect with your fellow CSULB peers')).toBeTruthy()
    })

    it('should always render Login button', () => {
      const { getByLabelText } = render(<StartScreen />)
      expect(getByLabelText('Login')).toBeTruthy()
    })

    it('should always render Sign Up button', () => {
      const { getByLabelText } = render(<StartScreen />)
      expect(getByLabelText('Sign Up')).toBeTruthy()
    })

    it('should navigate to LoginScreen when Login button is pressed', () => {
      const { getByLabelText } = render(<StartScreen />)
      const loginButton = getByLabelText('Login')
      
      fireEvent.press(loginButton)
      
      expect(mockRouter.push).toHaveBeenCalledWith('/LoginScreen')
    })

    it('should navigate to RegisterScreen when Sign Up button is pressed', () => {
      const { getByLabelText } = render(<StartScreen />)
      const signUpButton = getByLabelText('Sign Up')
      
      fireEvent.press(signUpButton)
      
      expect(mockRouter.push).toHaveBeenCalledWith('/RegisterScreen')
    })
  })

  describe('Dashboard Button - Environment Variable Control', () => {
    it('should render Dashboard button when ENABLE_DASHBOARD_BUTTON is "true"', () => {
      process.env.EXPO_PUBLIC_ENABLE_DASHBOARD_BUTTON = 'true'
      
      const { getByLabelText } = render(<StartScreen />)
      
      expect(getByLabelText('Dashboard')).toBeTruthy()
    })

    it('should NOT render Dashboard button when ENABLE_DASHBOARD_BUTTON is "false"', () => {
      process.env.EXPO_PUBLIC_ENABLE_DASHBOARD_BUTTON = 'false'
      
      const { queryByLabelText } = render(<StartScreen />)
      
      expect(queryByLabelText('Dashboard')).toBeNull()
    })

    it('should NOT render Dashboard button when ENABLE_DASHBOARD_BUTTON is undefined', () => {
      // Don't set the env variable
      
      const { queryByLabelText } = render(<StartScreen />)
      
      expect(queryByLabelText('Dashboard')).toBeNull()
    })

    it('should NOT render Dashboard button when ENABLE_DASHBOARD_BUTTON is empty string', () => {
      process.env.EXPO_PUBLIC_ENABLE_DASHBOARD_BUTTON = ''
      
      const { queryByLabelText } = render(<StartScreen />)
      
      expect(queryByLabelText('Dashboard')).toBeNull()
    })

    it('should navigate to Dashboard when Dashboard button is pressed (when enabled)', () => {
      process.env.EXPO_PUBLIC_ENABLE_DASHBOARD_BUTTON = 'true'
      
      const { getByLabelText } = render(<StartScreen />)
      const dashboardButton = getByLabelText('Dashboard')
      
      fireEvent.press(dashboardButton)
      
      expect(mockRouter.push).toHaveBeenCalledWith('/Dashboard')
    })

    it('should treat "TRUE", "True", and "1" as truthy values', () => {
      // Test uppercase TRUE
      process.env.EXPO_PUBLIC_ENABLE_DASHBOARD_BUTTON = 'TRUE'
      let { getByLabelText: getByLabel1 } = render(<StartScreen />)
      expect(getByLabel1('Dashboard')).toBeTruthy()

      // Test mixed case True
      process.env.EXPO_PUBLIC_ENABLE_DASHBOARD_BUTTON = 'True'
      let { getByLabelText: getByLabel2 } = render(<StartScreen />)
      expect(getByLabel2('Dashboard')).toBeTruthy()

      // Test numeric 1
      process.env.EXPO_PUBLIC_ENABLE_DASHBOARD_BUTTON = '1'
      let { getByLabelText: getByLabel3 } = render(<StartScreen />)
      expect(getByLabel3('Dashboard')).toBeTruthy()
    })
  })

  describe('Admin Dashboard Button - Environment Variable Control', () => {
    it('should render Admin Dashboard button when ENABLE_ADMIN_DASHBOARD_BUTTON is "true"', () => {
      process.env.EXPO_PUBLIC_ENABLE_ADMIN_DASHBOARD_BUTTON = 'true'
      
      const { getByLabelText } = render(<StartScreen />)
      
      expect(getByLabelText('Admin Dashboard')).toBeTruthy()
    })

    it('should NOT render Admin Dashboard button when ENABLE_ADMIN_DASHBOARD_BUTTON is "false"', () => {
      process.env.EXPO_PUBLIC_ENABLE_ADMIN_DASHBOARD_BUTTON = 'false'
      
      const { queryByLabelText } = render(<StartScreen />)
      
      expect(queryByLabelText('Admin Dashboard')).toBeNull()
    })

    it('should NOT render Admin Dashboard button when ENABLE_ADMIN_DASHBOARD_BUTTON is undefined', () => {
      // Don't set the env variable
      
      const { queryByLabelText } = render(<StartScreen />)
      
      expect(queryByLabelText('Admin Dashboard')).toBeNull()
    })

    it('should NOT render Admin Dashboard button when ENABLE_ADMIN_DASHBOARD_BUTTON is empty string', () => {
      process.env.EXPO_PUBLIC_ENABLE_ADMIN_DASHBOARD_BUTTON = ''
      
      const { queryByLabelText } = render(<StartScreen />)
      
      expect(queryByLabelText('Admin Dashboard')).toBeNull()
    })

    it('should navigate to AdminDashboard when Admin Dashboard button is pressed (when enabled)', () => {
      process.env.EXPO_PUBLIC_ENABLE_ADMIN_DASHBOARD_BUTTON = 'true'
      
      const { getByLabelText } = render(<StartScreen />)
      const adminButton = getByLabelText('Admin Dashboard')
      
      fireEvent.press(adminButton)
      
      expect(mockRouter.push).toHaveBeenCalledWith('/AdminDashboard')
    })

    it('should treat "TRUE", "True", and "1" as truthy values', () => {
      // Test uppercase TRUE
      process.env.EXPO_PUBLIC_ENABLE_ADMIN_DASHBOARD_BUTTON = 'TRUE'
      let { getByLabelText: getByLabel1 } = render(<StartScreen />)
      expect(getByLabel1('Admin Dashboard')).toBeTruthy()

      // Test mixed case True
      process.env.EXPO_PUBLIC_ENABLE_ADMIN_DASHBOARD_BUTTON = 'True'
      let { getByLabelText: getByLabel2 } = render(<StartScreen />)
      expect(getByLabel2('Admin Dashboard')).toBeTruthy()

      // Test numeric 1
      process.env.EXPO_PUBLIC_ENABLE_ADMIN_DASHBOARD_BUTTON = '1'
      let { getByLabelText: getByLabel3 } = render(<StartScreen />)
      expect(getByLabel3('Admin Dashboard')).toBeTruthy()
    })
  })

  describe('Combined Environment Variable Scenarios', () => {
    it('should render both buttons when both env variables are "true"', () => {
      process.env.EXPO_PUBLIC_ENABLE_DASHBOARD_BUTTON = 'true'
      process.env.EXPO_PUBLIC_ENABLE_ADMIN_DASHBOARD_BUTTON = 'true'
      
      const { getByLabelText } = render(<StartScreen />)
      
      expect(getByLabelText('Dashboard')).toBeTruthy()
      expect(getByLabelText('Admin Dashboard')).toBeTruthy()
    })

    it('should render only Dashboard button when only ENABLE_DASHBOARD_BUTTON is "true"', () => {
      process.env.EXPO_PUBLIC_ENABLE_DASHBOARD_BUTTON = 'true'
      process.env.EXPO_PUBLIC_ENABLE_ADMIN_DASHBOARD_BUTTON = 'false'
      
      const { getByLabelText, queryByLabelText } = render(<StartScreen />)
      
      expect(getByLabelText('Dashboard')).toBeTruthy()
      expect(queryByLabelText('Admin Dashboard')).toBeNull()
    })

    it('should render only Admin Dashboard button when only ENABLE_ADMIN_DASHBOARD_BUTTON is "true"', () => {
      process.env.EXPO_PUBLIC_ENABLE_DASHBOARD_BUTTON = 'false'
      process.env.EXPO_PUBLIC_ENABLE_ADMIN_DASHBOARD_BUTTON = 'true'
      
      const { getByLabelText, queryByLabelText } = render(<StartScreen />)
      
      expect(queryByLabelText('Dashboard')).toBeNull()
      expect(getByLabelText('Admin Dashboard')).toBeTruthy()
    })

    it('should render neither button when both env variables are "false"', () => {
      process.env.EXPO_PUBLIC_ENABLE_DASHBOARD_BUTTON = 'false'
      process.env.EXPO_PUBLIC_ENABLE_ADMIN_DASHBOARD_BUTTON = 'false'
      
      const { queryByLabelText } = render(<StartScreen />)
      
      expect(queryByLabelText('Dashboard')).toBeNull()
      expect(queryByLabelText('Admin Dashboard')).toBeNull()
    })

    it('should render neither button when both env variables are undefined', () => {
      // Don't set either env variable
      
      const { queryByLabelText } = render(<StartScreen />)
      
      expect(queryByLabelText('Dashboard')).toBeNull()
      expect(queryByLabelText('Admin Dashboard')).toBeNull()
    })

    it('should always render Login and Sign Up buttons regardless of env variables', () => {
      // Test with both dev buttons disabled
      process.env.EXPO_PUBLIC_ENABLE_DASHBOARD_BUTTON = 'false'
      process.env.EXPO_PUBLIC_ENABLE_ADMIN_DASHBOARD_BUTTON = 'false'
      
      const { getByLabelText } = render(<StartScreen />)
      
      expect(getByLabelText('Login')).toBeTruthy()
      expect(getByLabelText('Sign Up')).toBeTruthy()
    })
  })

  describe('Button Order and Layout', () => {
    it('should maintain correct button order when both dev buttons are enabled', () => {
      process.env.EXPO_PUBLIC_ENABLE_DASHBOARD_BUTTON = 'true'
      process.env.EXPO_PUBLIC_ENABLE_ADMIN_DASHBOARD_BUTTON = 'true'
      
      const { getAllByTestId } = render(<StartScreen />)
      const buttons = getAllByTestId(/^button-/)
      
      // Expected order: Login, Sign Up, Dashboard, Admin Dashboard
      expect(buttons[0].props.accessibilityLabel).toBe('Login')
      expect(buttons[1].props.accessibilityLabel).toBe('Sign Up')
      expect(buttons[2].props.accessibilityLabel).toBe('Dashboard')
      expect(buttons[3].props.accessibilityLabel).toBe('Admin Dashboard')
    })

    it('should maintain correct button order when only one dev button is enabled', () => {
      process.env.EXPO_PUBLIC_ENABLE_DASHBOARD_BUTTON = 'false'
      process.env.EXPO_PUBLIC_ENABLE_ADMIN_DASHBOARD_BUTTON = 'true'
      
      const { getAllByTestId } = render(<StartScreen />)
      const buttons = getAllByTestId(/^button-/)
      
      // Expected order: Login, Sign Up, Admin Dashboard
      expect(buttons.length).toBe(3)
      expect(buttons[0].props.accessibilityLabel).toBe('Login')
      expect(buttons[1].props.accessibilityLabel).toBe('Sign Up')
      expect(buttons[2].props.accessibilityLabel).toBe('Admin Dashboard')
    })

    it('should only show core buttons when all dev buttons are disabled', () => {
      process.env.EXPO_PUBLIC_ENABLE_DASHBOARD_BUTTON = 'false'
      process.env.EXPO_PUBLIC_ENABLE_ADMIN_DASHBOARD_BUTTON = 'false'
      
      const { getAllByTestId } = render(<StartScreen />)
      const buttons = getAllByTestId(/^button-/)
      
      // Expected order: Login, Sign Up only
      expect(buttons.length).toBe(2)
      expect(buttons[0].props.accessibilityLabel).toBe('Login')
      expect(buttons[1].props.accessibilityLabel).toBe('Sign Up')
    })
  })

  describe('Edge Cases and Error Handling', () => {
    it('should handle malformed env variable values gracefully', () => {
      process.env.EXPO_PUBLIC_ENABLE_DASHBOARD_BUTTON = 'yes'
      process.env.EXPO_PUBLIC_ENABLE_ADMIN_DASHBOARD_BUTTON = 'no'
      
      // Should not crash, treating non-standard values as falsy
      const { queryByLabelText } = render(<StartScreen />)
      expect(queryByLabelText('Dashboard')).toBeNull()
      expect(queryByLabelText('Admin Dashboard')).toBeNull()
    })

    it('should handle numeric values correctly', () => {
      process.env.EXPO_PUBLIC_ENABLE_DASHBOARD_BUTTON = '0'
      process.env.EXPO_PUBLIC_ENABLE_ADMIN_DASHBOARD_BUTTON = '1'
      
      const { queryByLabelText, getByLabelText } = render(<StartScreen />)
      
      // '0' should be falsy, '1' should be truthy
      expect(queryByLabelText('Dashboard')).toBeNull()
      expect(getByLabelText('Admin Dashboard')).toBeTruthy()
    })

    it('should handle whitespace in env variable values', () => {
      process.env.EXPO_PUBLIC_ENABLE_DASHBOARD_BUTTON = ' true '
      process.env.EXPO_PUBLIC_ENABLE_ADMIN_DASHBOARD_BUTTON = 'true '
      
      const { getByLabelText } = render(<StartScreen />)
      
      // Implementation should trim whitespace
      expect(getByLabelText('Dashboard')).toBeTruthy()
      expect(getByLabelText('Admin Dashboard')).toBeTruthy()
    })
  })

  describe('Regression: Previous Behavior Preservation', () => {
    it('should not affect other screen elements when buttons are toggled', () => {
      process.env.EXPO_PUBLIC_ENABLE_DASHBOARD_BUTTON = 'false'
      process.env.EXPO_PUBLIC_ENABLE_ADMIN_DASHBOARD_BUTTON = 'false'
      
      const { getByTestId, getByText } = render(<StartScreen />)
      
      // Verify all other elements still render correctly
      expect(getByTestId('logo')).toBeTruthy()
      expect(getByText('Beach Echoes')).toBeTruthy()
      expect(getByText('Connect with your fellow CSULB peers')).toBeTruthy()
    })

    it('should not break router navigation for core buttons when dev buttons are disabled', () => {
      process.env.EXPO_PUBLIC_ENABLE_DASHBOARD_BUTTON = 'false'
      process.env.EXPO_PUBLIC_ENABLE_ADMIN_DASHBOARD_BUTTON = 'false'
      
      const { getByLabelText } = render(<StartScreen />)
      
      fireEvent.press(getByLabelText('Login'))
      expect(mockRouter.push).toHaveBeenCalledWith('/LoginScreen')
      
      fireEvent.press(getByLabelText('Sign Up'))
      expect(mockRouter.push).toHaveBeenCalledWith('/RegisterScreen')
    })
  })
})
