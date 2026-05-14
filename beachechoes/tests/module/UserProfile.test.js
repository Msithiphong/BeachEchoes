// Module regression coverage for the public profile follow button state.
import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import UserProfile from '../../app/profile/[userId]';
import { AuthContext } from '../../context/AuthContext';
import { auth } from '../../config/firebase';

const mockPush = jest.fn();
const mockBack = jest.fn();
let mockSearchParams = { userId: 'target-user-456' };
let friendshipStatus = 'following';
let friendshipResponseExtras = {};
let followStatus = 'pending';
let acceptNextStatus = 'following';
let declineNextStatus = 'following';
let profileFollowingCount = 8;
let profileFollowersCount = 4;
const mockAlert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});

jest.mock('expo-router', () => ({
  useRouter: jest.fn(() => ({
    push: mockPush,
    back: mockBack,
  })),
  useLocalSearchParams: jest.fn(() => mockSearchParams),
  useFocusEffect: jest.fn((callback) => {
    const React = require('react');
    React.useEffect(() => callback(), [callback]);
  }),
  Stack: {
    Screen: () => null,
  },
}));

jest.mock('../../config/firebase', () => ({
  auth: {
    currentUser: {
      getIdToken: jest.fn(),
    },
  },
}));

jest.mock('../../config/api', () => ({
  API_BASE: 'http://localhost:3000/api',
}));

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

jest.mock('../../components/Button', () => {
  const React = require('react');
  const { TouchableOpacity, Text } = require('react-native');
  return ({ children, disabled, labelStyle, onPress }) => (
    <TouchableOpacity
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      testID={`button-${String(children)}`}
    >
      <Text style={labelStyle} testID={`button-${String(children)}-text`}>{children}</Text>
    </TouchableOpacity>
  );
});

jest.mock('../../components/ImageCard', () => {
  const React = require('react');
  const { View, Text } = require('react-native');
  return ({ children }) => (
    <View testID="image-card">
      <Text>{children}</Text>
    </View>
  );
});

global.fetch = jest.fn();

describe('UserProfile (Module Level)', () => {
  const mockCurrentUser = {
    uid: 'viewer-user-123',
    email: 'viewer@example.com',
    name: 'Viewer User',
  };

  const jsonResponse = (body) => Promise.resolve({
    ok: true,
    json: async () => body,
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockSearchParams = { userId: 'target-user-456' };
    friendshipStatus = 'following';
    friendshipResponseExtras = {};
    followStatus = 'pending';
    acceptNextStatus = 'following';
    declineNextStatus = 'following';
    profileFollowingCount = 8;
    profileFollowersCount = 4;
    mockAlert.mockImplementation(() => {});
    auth.currentUser.getIdToken.mockResolvedValue('mock-token');
    global.fetch = jest.fn((url, options = {}) => {
      const requestUrl = String(url);

      if (requestUrl === 'http://localhost:3000/api/profile/target-user-456') {
        return jsonResponse({
          success: true,
          profile: {
            id: 9,
            name: 'Target User',
            bio: 'Public profile',
            avatar_url: null,
            echoes_count: 1,
            following_count: profileFollowingCount,
            followers_count: profileFollowersCount,
          },
        });
      }

      if (requestUrl === 'http://localhost:3000/api/friendships/status/target-user-456') {
        return jsonResponse({
          success: true,
          status: friendshipStatus,
          ...friendshipResponseExtras,
        });
      }

      if (
        requestUrl === 'http://localhost:3000/api/friendships/follow' &&
        options.method === 'POST'
      ) {
        if (followStatus === 'accepted' || followStatus === 'following') {
          profileFollowersCount = 5;
        }
        return jsonResponse({
          success: true,
          status: followStatus,
        });
      }

      if (
        requestUrl === 'http://localhost:3000/api/friendships/unfollow' &&
        options.method === 'DELETE'
      ) {
        profileFollowersCount = 3;
        return jsonResponse({
          success: true,
        });
      }

      if (
        requestUrl === 'http://localhost:3000/api/friendships/accept' &&
        options.method === 'PUT'
      ) {
        friendshipStatus = acceptNextStatus;
        friendshipResponseExtras = {
          outgoing_status: acceptNextStatus === 'following' ? 'accepted' : null,
          incoming_status: 'accepted',
        };
        profileFollowingCount = 9;
        return jsonResponse({
          success: true,
        });
      }

      if (
        requestUrl === 'http://localhost:3000/api/friendships/decline' &&
        options.method === 'PUT'
      ) {
        friendshipStatus = declineNextStatus;
        friendshipResponseExtras = {
          outgoing_status: declineNextStatus === 'following' ? 'accepted' : null,
          incoming_status: null,
        };
        return jsonResponse({
          success: true,
        });
      }

      if (requestUrl === 'http://localhost:3000/api/users/target-user-456/mute-status') {
        return jsonResponse({
          success: true,
          muted: false,
        });
      }

      if (requestUrl === 'http://localhost:3000/api/posts/user/9') {
        return jsonResponse({
          success: true,
          posts: [],
        });
      }

      return jsonResponse({ success: true });
    });
  });

  const renderWithContext = (component, user = mockCurrentUser) =>
    render(
      <AuthContext.Provider value={{ user, loading: false, logout: jest.fn() }}>
        {component}
      </AuthContext.Provider>
    );

  it('shows Following when the friendship status endpoint returns following', async () => {
    const { getByTestId, getAllByText, queryByTestId } = renderWithContext(<UserProfile />);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/friendships/status/target-user-456',
        expect.objectContaining({
          headers: { Authorization: 'Bearer mock-token' },
        })
      );
    });

    await waitFor(() => {
      expect(getByTestId('button-Following')).toBeTruthy();
      expect(queryByTestId('button-Follow')).toBeNull();
      expect(getAllByText('Following')).toHaveLength(2);
    });
  });

  it('shows a disabled Requested button when the friendship status is requested', async () => {
    friendshipStatus = 'requested';

    const { getByTestId, queryByTestId } = renderWithContext(<UserProfile />);

    await waitFor(() => {
      expect(getByTestId('button-Requested')).toBeTruthy();
      expect(getByTestId('button-Requested').props.accessibilityState.disabled).toBe(true);
      expect(getByTestId('button-Requested-text').props.style).toEqual(
        expect.objectContaining({ color: '#ffffff' })
      );
      expect(queryByTestId('button-Follow')).toBeNull();
    });
  });

  it('shows accept and decline controls when an incoming request exists over an outgoing follow', async () => {
    friendshipStatus = 'incoming_request';
    friendshipResponseExtras = {
      outgoing_status: 'accepted',
      incoming_status: 'pending',
    };

    const { getByTestId, queryByTestId } = renderWithContext(<UserProfile />);

    await waitFor(() => {
      expect(getByTestId('button-Accept')).toBeTruthy();
      expect(getByTestId('button-Decline')).toBeTruthy();
      expect(queryByTestId('button-Following')).toBeNull();
      expect(queryByTestId('button-Follow')).toBeNull();
    });
  });

  it('accepts an incoming request from the profile fallback controls', async () => {
    friendshipStatus = 'incoming_request';
    friendshipResponseExtras = {
      outgoing_status: 'accepted',
      incoming_status: 'pending',
    };
    acceptNextStatus = 'following';

    const { getByTestId } = renderWithContext(<UserProfile />);

    await waitFor(() => {
      expect(getByTestId('button-Accept')).toBeTruthy();
    });

    fireEvent.press(getByTestId('button-Accept'));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/friendships/accept',
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify({ friend_firebase_uid: 'target-user-456' }),
        })
      );
      expect(getByTestId('button-Following')).toBeTruthy();
    });
  });

  it('declines an incoming request from the profile fallback controls', async () => {
    friendshipStatus = 'incoming_request';
    friendshipResponseExtras = {
      outgoing_status: 'accepted',
      incoming_status: 'pending',
    };
    declineNextStatus = 'following';

    const { getByTestId } = renderWithContext(<UserProfile />);

    await waitFor(() => {
      expect(getByTestId('button-Decline')).toBeTruthy();
    });

    fireEvent.press(getByTestId('button-Decline'));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/friendships/decline',
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify({ friend_firebase_uid: 'target-user-456' }),
        })
      );
      expect(getByTestId('button-Following')).toBeTruthy();
    });
  });

  it('changes Follow to Requested after a pending follow response', async () => {
    friendshipStatus = 'none';
    followStatus = 'pending';

    const { getByTestId, getByText, queryByTestId } = renderWithContext(<UserProfile />);

    await waitFor(() => {
      expect(getByTestId('button-Follow')).toBeTruthy();
    });

    fireEvent.press(getByTestId('button-Follow'));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/friendships/follow',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ friendUid: 'target-user-456' }),
        })
      );
      expect(getByTestId('button-Requested')).toBeTruthy();
      expect(getByTestId('button-Requested').props.accessibilityState.disabled).toBe(true);
      expect(getByTestId('button-Requested-text').props.style).toEqual(
        expect.objectContaining({ color: '#ffffff' })
      );
      expect(getByText('4')).toBeTruthy();
      expect(queryByTestId('button-Follow')).toBeNull();
    });
  });

  it('changes Follow to Following and increments followers after an accepted follow response', async () => {
    friendshipStatus = 'none';
    followStatus = 'following';

    const { getByTestId, getByText, queryByTestId } = renderWithContext(<UserProfile />);

    await waitFor(() => {
      expect(getByTestId('button-Follow')).toBeTruthy();
      expect(getByText('4')).toBeTruthy();
    });

    fireEvent.press(getByTestId('button-Follow'));

    await waitFor(() => {
      expect(getByTestId('button-Following')).toBeTruthy();
      expect(getByText('5')).toBeTruthy();
      expect(queryByTestId('button-Follow')).toBeNull();
    });
  });

  it('changes Following to Follow and decrements followers after unfollow', async () => {
    friendshipStatus = 'following';
    mockAlert.mockImplementationOnce((_title, _message, buttons) => {
      buttons.find((button) => button.text === 'Unfollow').onPress();
    });

    const { getByTestId, getByText, queryByTestId } = renderWithContext(<UserProfile />);

    await waitFor(() => {
      expect(getByTestId('button-Following')).toBeTruthy();
      expect(getByText('4')).toBeTruthy();
    });

    fireEvent.press(getByTestId('button-Following'));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/friendships/unfollow',
        expect.objectContaining({
          method: 'DELETE',
          body: JSON.stringify({ friendUid: 'target-user-456' }),
        })
      );
      expect(getByTestId('button-Follow')).toBeTruthy();
      expect(getByText('3')).toBeTruthy();
      expect(queryByTestId('button-Following')).toBeNull();
    });
  });
});
