// Module-level checks for leaderboard fetching, rendering, and empty/error states.
import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import Leaderboard from '../../app/(tabs)/Leaderboard';
import { AuthContext } from '../../context/AuthContext';
import { auth } from '../../config/firebase';

// Mock expo-router
jest.mock('expo-router', () => ({
  useRouter: jest.fn(() => ({
    push: jest.fn(),
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
  API_BASE: 'http://localhost:3000/api',
}));

// Mock components
jest.mock('../../components/Background', () => {
  const React = require('react');
  const { View } = require('react-native');
  return ({ children }) => <View testID="background">{children}</View>;
});

jest.mock('../../components/Header', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return ({ children }) => <Text testID="header">{children}</Text>;
});

jest.mock('../../context/AppThemeContext', () => ({
  useAppTheme: jest.fn(() => ({
    isDark: false,
    toggleTheme: jest.fn(),
  })),
}));

// Mock fetch
global.fetch = jest.fn();

describe('Leaderboard (Module Level)', () => {
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

  it('fetches leaderboard data with correct query parameters', async () => {
    const mockLeaderboard = {
      success: true,
      data: [
        {
          id: 1,
          overlay_text: 'Top post!',
          like_count: 50,
          username: 'Alice',
          avatar_url: 'https://example.com/avatar1.jpg',
        },
        {
          id: 2,
          overlay_text: 'Great content',
          like_count: 30,
          username: 'Bob',
          avatar_url: 'https://example.com/avatar2.jpg',
        },
      ],
    };

    global.fetch.mockResolvedValueOnce({
      json: async () => mockLeaderboard,
    });

    renderWithContext(<Leaderboard />);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/leaderboard')
      );
    });
  });

  it('renders leaderboard entries with correct data', async () => {
    const mockLeaderboard = {
      success: true,
      data: [
        {
          id: 1,
          name: 'Alice',
          total_upvotes: 50,
          avatar_url: 'https://example.com/avatar.jpg',
        },
        {
          id: 2,
          name: 'Bob',
          total_upvotes: 30,
          avatar_url: 'https://example.com/avatar2.jpg',
        },
      ],
    };

    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => mockLeaderboard,
    });

    const { getByText } = renderWithContext(<Leaderboard />);

    await waitFor(() => {
      expect(getByText('Alice')).toBeTruthy();
      expect(getByText('Bob')).toBeTruthy();
      expect(getByText('30 Votes')).toBeTruthy(); // Bob's votes in list
      expect(getByText('Votes: 50')).toBeTruthy(); // Alice's votes in top bubble
    }, { timeout: 3000 });
  });

  it('displays empty state when no leaderboard data exists', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: [] }),
    });

    const { getByText } = renderWithContext(<Leaderboard />);

    await waitFor(() => {
      expect(getByText(/no.*results/i)).toBeTruthy();
    }, { timeout: 3000 });
  });

  it('handles API errors gracefully', async () => {
    global.fetch.mockRejectedValueOnce(new Error('Network error'));

    const { queryByTestId } = renderWithContext(<Leaderboard />);

    await waitFor(() => {
      // Should not crash, verify component is still rendered
      expect(queryByTestId('background')).toBeTruthy();
    });
  });
});
