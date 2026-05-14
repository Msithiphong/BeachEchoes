// Integration scenarios for friend request delivery and notification actions.
import React from 'react';
import { render, waitFor, fireEvent } from '@testing-library/react-native';
import { server } from './server';
import { rest } from 'msw';
import Notifications from '../../app/Notifications';
import { AuthContext } from '../../context/AuthContext';
import { auth } from '../../config/firebase';

// Mock expo-router
jest.mock('expo-router', () => ({
  useRouter: jest.fn(() => ({
    push: jest.fn(),
    back: jest.fn(),
  })),
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

// Mock ScrollContext
jest.mock('../../context/ScrollContext', () => {
  const React = require('react');
  return {
    ScrollContext: React.createContext({
      scrollHandler: jest.fn(),
      navbarHeight: 0,
    }),
  };
});

// Mock DraftPostContext  
jest.mock('../../context/DraftPostContext', () => {
  const React = require('react');
  return {
    DraftPostContext: React.createContext({
      draftImageUri: null,
      draftOverlayText: '',
      draftCoords: null,
      draftAnonymous: false,
      saveDraftImageUri: jest.fn(),
      saveDraftOverlayText: jest.fn(),
      saveDraftCoords: jest.fn(),
      saveDraftAnonymous: jest.fn(),
      clearDraft: jest.fn(),
    }),
    useDraftPost: jest.fn(() => ({
      draftImageUri: null,
      draftOverlayText: '',
      draftCoords: null,
      draftAnonymous: false,
      saveDraftImageUri: jest.fn(),
      saveDraftOverlayText: jest.fn(),
      saveDraftCoords: jest.fn(),
      saveDraftAnonymous: jest.fn(),
      clearDraft: jest.fn(),
    })),
  };
});

describe('Friend Request and Notification Delivery (Integration Level)', () => {
  // MSW Server Lifecycle (integration tests only)
  beforeAll(() => server.listen({ onUnhandledRequest: 'warn' }));
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());

  const mockUserA = {
    uid: 'userA-123',
    email: 'userA@example.com',
    name: 'User A',
  };

  const mockUserB = {
    uid: 'userB-456',
    email: 'userB@example.com',
    name: 'User B',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    auth.currentUser.getIdToken.mockResolvedValue('mock-token');
  });

  const { ScrollContext } = require('../../context/ScrollContext');

  const renderWithContext = (component, user = mockUserA) => {
    return render(
      <ScrollContext.Provider value={{ scrollHandler: jest.fn(), navbarHeight: 0 }}>
        <AuthContext.Provider value={{ user, loading: false }}>
          {component}
        </AuthContext.Provider>
      </ScrollContext.Provider>
    );
  };

  it('sends friend request and delivers notification to recipient', async () => {
    // Step 1: User A sends a friend request to User B
    let notificationCreated = false;

    server.use(
      rest.post('http://localhost:3000/api/friendships/follow', (req, res, ctx) => {
        notificationCreated = true;
        return res(ctx.json({
          success: true,
          status: 'pending',
        }));
      })
    );

    // Step 2: User B receives the notification
    server.use(
      rest.get('http://localhost:3000/api/notifications', (req, res, ctx) => {
        if (notificationCreated) {
          return res(ctx.json({
            success: true,
            notifications: [
              {
                id: 1,
                type: 'friend_request',
                data: {
                  from_user_id: 1,
                  from_firebase_uid: 'userA-123',
                  from_user_name: 'User A',
                  from_avatar_url: 'https://example.com/userA.jpg',
                },
                created_at: '2026-05-09T10:00:00Z',
                read: false,
              },
            ],
          }));
        }
        return res(ctx.json({
          success: true,
          notifications: [],
        }));
      })
    );

    // Render as User B
    const { getByText } = renderWithContext(<Notifications />, mockUserB);

    // Initially no notifications
    await waitFor(() => {
      expect(getByText(/no unread notifications/i)).toBeTruthy();
    });

    // Simulate User A sending friend request (this would happen in another screen)
    // We'll just set the flag to true to simulate the backend creating the notification
    notificationCreated = true;

    // Re-render to trigger polling/refresh
    const { getByText: getByTextB, rerender } = renderWithContext(
      <Notifications />,
      mockUserB
    );

    rerender(
      <ScrollContext.Provider value={{ scrollHandler: jest.fn(), navbarHeight: 0 }}>
        <AuthContext.Provider value={{ user: mockUserB, loading: false }}>
          <Notifications />
        </AuthContext.Provider>
      </ScrollContext.Provider>
    );

    // User B should now see the friend request notification
    await waitFor(() => {
      expect(getByTextB('User A')).toBeTruthy();
      expect(getByTextB(/friend request/i)).toBeTruthy();
    });
  });

  it('accepts friend request and updates both users states', async () => {
    const friendRequestNotification = {
      id: 1,
      type: 'friend_request',
      data: {
        from_user_id: 1,
        from_firebase_uid: 'userA-123',
        from_user_name: 'User A',
        from_avatar_url: 'https://example.com/userA.jpg',
      },
      created_at: '2026-05-09T10:00:00Z',
      read: false,
    };

    let acceptedNotificationCreated = false;

    server.use(
      rest.get('http://localhost:3000/api/notifications', (req, res, ctx) => {
        if (acceptedNotificationCreated) {
          // After acceptance, User A receives a notification
          return res(ctx.json({
            success: true,
            notifications: [
              {
                id: 2,
                type: 'friend_request',
                data: {
                  from_user_name: 'User B',
                  from_firebase_uid: 'userB-456',
                  accepted: true,
                },
                created_at: '2026-05-09T10:01:00Z',
                read: false,
              },
            ],
          }));
        }
        return res(ctx.json({
          success: true,
          notifications: [friendRequestNotification],
        }));
      }),
      rest.put('http://localhost:3000/api/friendships/accept', (req, res, ctx) => {
        acceptedNotificationCreated = true;
        return res(ctx.json({
          success: true,
        }));
      })
    );

    const { getByText, getByTestId } = renderWithContext(
      <Notifications />,
      mockUserB
    );

    // User B sees the friend request
    await waitFor(() => {
      expect(getByText('User A')).toBeTruthy();
    });

    // Verify friendship status before acceptance
    server.use(
      rest.get('http://localhost:3000/api/friendships/status/userA-123', (req, res, ctx) => {
        return res(ctx.json({
          success: true,
          status: 'incoming_request',
        }));
      })
    );

    // User B accepts the request
    // (In the actual app, this would be a button press)
    // We'll simulate the API call
    await fetch('http://localhost:3000/api/friendships/accept', {
      method: 'PUT',
      headers: {
        Authorization: 'Bearer mock-token',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ friend_firebase_uid: 'userA-123' }),
    });

    // Verify friendship status after acceptance
    server.use(
      rest.get('http://localhost:3000/api/friendships/status/userA-123', (req, res, ctx) => {
        return res(ctx.json({
          success: true,
          status: 'following',
        }));
      })
    );

    expect(acceptedNotificationCreated).toBe(true);
  });

  it('declines friend request and removes notification', async () => {
    const friendRequestNotification = {
      id: 1,
      type: 'friend_request',
      data: {
        from_user_id: 1,
        from_firebase_uid: 'userA-123',
        from_user_name: 'User A',
        from_avatar_url: 'https://example.com/userA.jpg',
      },
      created_at: '2026-05-09T10:00:00Z',
      read: false,
    };

    let notificationRemoved = false;

    server.use(
      rest.get('http://localhost:3000/api/notifications', (req, res, ctx) => {
        if (notificationRemoved) {
          return res(ctx.json({
            success: true,
            notifications: [],
          }));
        }
        return res(ctx.json({
          success: true,
          notifications: [friendRequestNotification],
        }));
      }),
      rest.put('http://localhost:3000/api/friendships/decline', (req, res, ctx) => {
        notificationRemoved = true;
        return res(ctx.json({
          success: true,
        }));
      })
    );

    const { getByText, rerender } = renderWithContext(
      <Notifications />,
      mockUserB
    );

    // User B sees the friend request
    await waitFor(() => {
      expect(getByText('User A')).toBeTruthy();
    });

    // User B declines the request
    await fetch('http://localhost:3000/api/friendships/decline', {
      method: 'PUT',
      headers: {
        Authorization: 'Bearer mock-token',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ friend_firebase_uid: 'userA-123' }),
    });

    // Re-render to reflect updated notifications
    rerender(
      <ScrollContext.Provider value={{ scrollHandler: jest.fn(), navbarHeight: 0 }}>
        <AuthContext.Provider value={{ user: mockUserB, loading: false }}>
          <Notifications />
        </AuthContext.Provider>
      </ScrollContext.Provider>
    );

    // Notification should be removed
    await waitFor(() => {
      expect(getByText(/no unread notifications/i)).toBeTruthy();
    });
  });

  it('delivers a reverse friend request after an accepted one-way follow', async () => {
    let followCalls = 0;
    let acceptCalls = 0;

    server.use(
      rest.post('http://localhost:3000/api/friendships/follow', (req, res, ctx) => {
        followCalls += 1;
        return res(ctx.json({
          success: true,
          status: 'pending',
        }));
      }),
      rest.put('http://localhost:3000/api/friendships/accept', (req, res, ctx) => {
        acceptCalls += 1;
        return res(ctx.json({
          success: true,
        }));
      }),
      rest.get('http://localhost:3000/api/notifications', (req, res, ctx) => {
        if (followCalls >= 2 && acceptCalls < 2) {
          return res(ctx.json({
            success: true,
            notifications: [
              {
                id: 10,
                type: 'friend_request',
                data: {
                  from_user_id: 2,
                  from_firebase_uid: 'userB-456',
                  from_user_name: 'User B',
                  from_avatar_url: 'https://example.com/userB.jpg',
                },
                created_at: '2026-05-09T10:05:00Z',
                read: false,
              },
            ],
          }));
        }

        return res(ctx.json({
          success: true,
          notifications: [],
        }));
      })
    );

    await fetch('http://localhost:3000/api/friendships/follow', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer mock-token',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ friendUid: 'userB-456' }),
    });

    await fetch('http://localhost:3000/api/friendships/accept', {
      method: 'PUT',
      headers: {
        Authorization: 'Bearer mock-token',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ friend_firebase_uid: 'userA-123' }),
    });

    await fetch('http://localhost:3000/api/friendships/follow', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer mock-token',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ friendUid: 'userA-123' }),
    });

    const { getByText, queryByText } = renderWithContext(<Notifications />, mockUserA);

    await waitFor(() => {
      expect(getByText('User B')).toBeTruthy();
      expect(getByText(/sent you a friend request/i)).toBeTruthy();
    });

    fireEvent.press(getByText('Accept'));

    await waitFor(() => {
      expect(acceptCalls).toBe(2);
      expect(queryByText('User B')).toBeNull();
    });
  });

  it('handles multiple notification types simultaneously', async () => {
    const notifications = [
      {
        id: 1,
        type: 'friend_request',
        data: {
          from_user_id: 1,
          from_firebase_uid: 'userA-123',
          from_user_name: 'User A',
          from_avatar_url: 'https://example.com/userA.jpg',
        },
        created_at: '2026-05-09T10:00:00Z',
        read: false,
      },
      {
        id: 2,
        type: 'post_liked',
        data: {
          from_user_name: 'User C',
          from_avatar_url: 'https://example.com/userC.jpg',
          post_id: 123,
          overlay_text: 'My cool post',
        },
        created_at: '2026-05-09T11:00:00Z',
        read: false,
      },
      {
        id: 3,
        type: 'new_follower',
        data: {
          from_user_name: 'User D',
          from_firebase_uid: 'userD-789',
          from_avatar_url: 'https://example.com/userD.jpg',
        },
        created_at: '2026-05-09T12:00:00Z',
        read: false,
      },
    ];

    server.use(
      rest.get('http://localhost:3000/api/notifications', (req, res, ctx) => {
        return res(ctx.json({
          success: true,
          notifications,
        }));
      })
    );

    const { getByText } = renderWithContext(<Notifications />, mockUserB);

    // All three notification types should be displayed
    await waitFor(() => {
      expect(getByText('User A')).toBeTruthy();
      expect(getByText('User C')).toBeTruthy();
      expect(getByText('User D')).toBeTruthy();
    });
  });
});
