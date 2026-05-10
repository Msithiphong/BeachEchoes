import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import Notifications from '../../app/Notifications';
import { AuthContext } from '../../context/AuthContext';
import { auth } from '../../config/firebase';

// Mock expo-router
jest.mock('expo-router', () => ({
  useRouter: jest.fn(() => ({
    push: jest.fn(),
    back: jest.fn(),
  })),
  Stack: {
    Screen: () => null,
  },
}));

// Mock Firebase
jest.mock('../../config/firebase', () => ({
  auth: {
    currentUser: {
      getIdToken: jest.fn(),
    },
  },
}));

// Mock API config
jest.mock('../../config/api', () => ({
  API_BASE: 'http://localhost:3000',
}));

// Mock expo-notifications
jest.mock('expo-notifications', () => ({
  requestPermissionsAsync: jest.fn(),
  setNotificationHandler: jest.fn(),
}));

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

// Mock components
jest.mock('../../components/Background', () => {
  const React = require('react');
  const { View } = require('react-native');
  return ({ children }) => <View testID="background">{children}</View>;
});

jest.mock('../../components/BackButton', () => {
  const React = require('react');
  const { TouchableOpacity } = require('react-native');
  return ({ onPress }) => <TouchableOpacity testID="back-button" onPress={onPress} />;
});

jest.mock('../../components/Header', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return ({ children }) => <Text testID="header">{children}</Text>;
});

jest.mock('../../components/LocalNotifications', () => ({
  requestPermissions: jest.fn(),
  scheduleCustomNotification: jest.fn(),
}));

jest.mock('../../context/AppThemeContext', () => ({
  useAppTheme: jest.fn(() => ({
    isDark: false,
    toggleTheme: jest.fn(),
  })),
}));

// Mock fetch
global.fetch = jest.fn();

describe('Notifications (Module Level)', () => {
  const mockUser = {
    uid: 'user123',
    email: 'test@example.com',
    name: 'Test User',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    auth.currentUser.getIdToken.mockResolvedValue('mock-token');
    global.fetch = jest.fn();
  });

  const renderWithContext = (component) => {
    return render(
      <AuthContext.Provider value={{ user: mockUser, loading: false }}>
        {component}
      </AuthContext.Provider>
    );
  };

  it('fetches notifications with auth token on mount', async () => {
    const mockNotifications = {
      success: true,
      notifications: [],
    };

    global.fetch.mockResolvedValueOnce({
      json: async () => mockNotifications,
    });

    renderWithContext(<Notifications />);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:3000/notifications',
        expect.objectContaining({
          headers: { Authorization: 'Bearer mock-token' },
        })
      );
    });
  });

  it('renders new_follower notifications correctly', async () => {
    const mockNotifications = {
      success: true,
      notifications: [
        {
          id: 1,
          type: 'new_follower',
          data: {
            from_user_id: 2,
            from_firebase_uid: 'user456',
            from_name: 'Alice',
            from_avatar_url: 'https://example.com/alice.jpg',
          },
          created_at: '2026-05-09T10:00:00Z',
          read: false,
        },
      ],
    };

    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => mockNotifications,
    });

    const { getByText } = renderWithContext(<Notifications />);

    await waitFor(() => {
      expect(getByText('Alice')).toBeTruthy();
      expect(getByText(/started following you/i)).toBeTruthy();
    });
  });

  it('renders post_liked notifications with liker name and post reference', async () => {
    const mockNotifications = {
      success: true,
      notifications: [
        {
          id: 2,
          type: 'post_liked',
          data: {
            liker_name: 'Bob',
            liker_avatar_url: 'https://example.com/bob.jpg',
            post_id: 123,
            overlay_text: 'Beautiful sunset',
          },
          created_at: '2026-05-09T11:00:00Z',
          read: false,
        },
      ],
    };

    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => mockNotifications,
    });

    const { getByText } = renderWithContext(<Notifications />);

    await waitFor(() => {
      expect(getByText('Bob')).toBeTruthy();
      expect(getByText(/liked your post/i)).toBeTruthy();
    });
  });

  it('renders new_follower notifications with follower info', async () => {
    const mockNotifications = {
      success: true,
      notifications: [
        {
          id: 3,
          type: 'new_follower',
          data: {
            from_name: 'Charlie',
            from_firebase_uid: 'user789',
            from_avatar_url: 'https://example.com/charlie.jpg',
          },
          created_at: '2026-05-09T12:00:00Z',
          read: false,
        },
      ],
    };

    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => mockNotifications,
    });

    const { getByText } = renderWithContext(<Notifications />);

    await waitFor(() => {
      expect(getByText('Charlie')).toBeTruthy();
      expect(getByText(/started following you/i)).toBeTruthy();
    });
  });

  it('displays empty state when no notifications exist', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, notifications: [] }),
    });

    const { getByText } = renderWithContext(<Notifications />);

    await waitFor(() => {
      expect(getByText(/no unread notifications/i)).toBeTruthy();
    });
  });

  it('handles API errors gracefully', async () => {
    global.fetch.mockRejectedValueOnce(new Error('Network error'));

    const { queryByTestId } = renderWithContext(<Notifications />);

    await waitFor(() => {
      // Should not crash, verify component is still rendered
      expect(queryByTestId('background')).toBeTruthy();
    });
  });
});
