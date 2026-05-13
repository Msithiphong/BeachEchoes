// Regression coverage for the shared gradient shell now that it depends on safe-area and route hooks.
import React from 'react';
import { Text } from 'react-native';
import { render } from '@testing-library/react-native';
import CoastalGradient from '../../components/CoastalGradient';

let mockPathname = '/StartScreen';

jest.mock('expo-router', () => ({
  usePathname: jest.fn(() => mockPathname),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: jest.fn(() => ({
    top: 24,
    right: 0,
    bottom: 16,
    left: 0,
  })),
}));

describe('CoastalGradient', () => {
  beforeEach(() => {
    mockPathname = '/StartScreen';
  });

  it('renders children on non-tab routes', () => {
    const { getByText } = render(
      <CoastalGradient>
        <Text>Standalone screen</Text>
      </CoastalGradient>
    );

    expect(getByText('Standalone screen')).toBeTruthy();
  });

  it('renders children on tab routes with safe-area insets available', () => {
    mockPathname = '/(tabs)/Dashboard';

    const { getByText } = render(
      <CoastalGradient>
        <Text>Tab screen</Text>
      </CoastalGradient>
    );

    expect(getByText('Tab screen')).toBeTruthy();
  });
});
