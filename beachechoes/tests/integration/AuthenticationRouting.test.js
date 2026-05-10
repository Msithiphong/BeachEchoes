import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import { PaperProvider } from 'react-native-paper';
import { server } from './server';
import { rest } from 'msw';
import Dashboard from '../../app/(tabs)/Dashboard';
import Profile from '../../app/(tabs)/Profile';
import Map from '../../app/(tabs)/Map';
import Notifications from '../../app/Notifications';
import { AuthContext } from '../../context/AuthContext';
import { auth } from '../../config/firebase';
import { useRouter } from 'expo-router';

// Mock expo-router
const mockPush = jest.fn();
const mockReplace = jest.fn();

jest.mock('expo-router', () => ({
  useFocusEffect: jest.fn((callback) => {
    const React = require('react');
    React.useEffect(() => callback(), [callback]);
  }),
  useRouter: jest.fn(() => ({
    push: mockPush,
    replace: mockReplace,
    back: jest.fn(),
  })),
  useLocalSearchParams: jest.fn(() => ({})),
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

// Mock all necessary components
jest.mock('../../components/Background', () => {
  const React = require('react');
  const { View } = require('react-native');
  return ({ children }) => <View testID="background">{children}</View>;
});

jest.mock('../../components/Logo', () => {
  const React = require('react');
  const { View } = require('react-native');
  return () => <View testID="logo" />;
});

jest.mock('../../components/Header', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return ({ children }) => <Text testID="header">{children}</Text>;
});

jest.mock('../../components/Paragraph', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return ({ children }) => <Text testID="paragraph">{children}</Text>;
});

jest.mock('../../components/ImageCard', () => {
  const React = require('react');
  const { View } = require('react-native');
  return () => <View testID="image-card" />;
});

jest.mock('../../components/WaveRefreshOverlay', () => {
  const React = require('react');
  const { View } = require('react-native');
  return () => <View testID="wave-refresh" />;
});

jest.mock('../../components/CoastalGradient', () => {
  const React = require('react');
  const { View } = require('react-native');
  return ({ children, style }) => <View testID="background" style={style}>{children}</View>;
});

jest.mock('../../components/BackButton', () => {
  const React = require('react');
  const { TouchableOpacity } = require('react-native');
  return ({ onPress }) => <TouchableOpacity testID="back-button" onPress={onPress} />;
});

jest.mock('../../components/Button', () => {
  const React = require('react');
  const { TouchableOpacity, Text } = require('react-native');
  return ({ children, onPress }) => (
    <TouchableOpacity onPress={onPress} testID="button">
      <Text>{children}</Text>
    </TouchableOpacity>
  );
});

jest.mock('../../components/UserAutocomplete', () => {
  const React = require('react');
  const { View } = require('react-native');
  return () => <View testID="user-autocomplete" />;
});

jest.mock('../../components/CampusMap', () => {
  const React = require('react');
  const { View } = require('react-native');
  return () => <View testID="campus-map" />;
});

jest.mock('../../context/ScrollContext', () => ({
  useScrollContext: jest.fn(() => ({
    scrollY: { value: 0 },
    handleScroll: jest.fn(),
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

jest.mock('../../context/AppThemeContext', () => ({
  useAppTheme: jest.fn(() => ({
    isDark: false,
    toggleTheme: jest.fn(),
  })),
}));

jest.mock('../../helpers/avatarUpload', () => ({
  uploadAvatar: jest.fn(),
}));

jest.mock('expo-image-picker', () => ({
  requestMediaLibraryPermissionsAsync: jest.fn(),
  launchImageLibraryAsync: jest.fn(),
}));

jest.mock('expo-notifications', () => ({
  requestPermissionsAsync: jest.fn(),
  setNotificationHandler: jest.fn(),
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

jest.mock('../../components/LocalNotifications', () => ({
  requestPermissions: jest.fn(),
  scheduleCustomNotification: jest.fn(),
}));

describe('Authentication and Protected Route Enforcement (Integration Level)', () => {
  // MSW Server Lifecycle (integration tests only)
  beforeAll(() => server.listen({ onUnhandledRequest: 'warn' }));
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());

  const mockUser = {
    uid: 'user123',
    email: 'test@example.com',
    name: 'Test User',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockPush.mockClear();
    mockReplace.mockClear();
    auth.currentUser.getIdToken.mockResolvedValue('mock-token');
  });

  const { ScrollContext } = require('../../context/ScrollContext');

  const wrapWithProviders = (component, user = null, loading = false) => (
    <PaperProvider>
      <ScrollContext.Provider value={{ scrollHandler: jest.fn(), navbarHeight: 0 }}>
        <AuthContext.Provider value={{ user, loading, logout: jest.fn() }}>
          {component}
        </AuthContext.Provider>
      </ScrollContext.Provider>
    </PaperProvider>
  );

  const renderWithAuth = (component, user = null, loading = false) => {
    return render(wrapWithProviders(component, user, loading));
  };

  it('redirects unauthenticated user from Dashboard to StartScreen', async () => {
    server.use(
      rest.get('http://localhost:3000/api/posts/feed', (req, res, ctx) => {
        return res(ctx.json({
          success: true,
          posts: [],
        }));
      })
    );

    renderWithAuth(<Dashboard />, null, false);

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/StartScreen');
    });
  });

  it('redirects unauthenticated user from Profile to StartScreen', async () => {
    server.use(
      rest.get('http://localhost:3000/profile/user123', (req, res, ctx) => {
        return res(ctx.json({
          success: true,
          profile: {},
        }));
      })
    );

    renderWithAuth(<Profile />, null, false);

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/StartScreen');
    });
  });

  it('redirects unauthenticated user from Map to StartScreen', async () => {
    server.use(
      rest.get('http://localhost:3000/api/posts/map', (req, res, ctx) => {
        return res(ctx.json({
          success: true,
          posts: [],
        }));
      })
    );

    renderWithAuth(<Map />, null, false);

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/StartScreen');
    });
  });

  it('allows authenticated user to access Dashboard', async () => {
    server.use(
      rest.get('http://localhost:3000/api/posts/feed', (req, res, ctx) => {
        return res(ctx.json({
          success: true,
          posts: [],
        }));
      })
    );

    const { queryByTestId } = renderWithAuth(<Dashboard />, mockUser, false);

    await waitFor(() => {
      expect(queryByTestId('background')).toBeTruthy();
      expect(mockReplace).not.toHaveBeenCalled();
    });
  });

  it('allows authenticated user to access Profile', async () => {
    server.use(
      rest.get('http://localhost:3000/profile/user123', (req, res, ctx) => {
        return res(ctx.json({
          success: true,
          profile: {
            id: 1,
            name: 'Test User',
            bio: '',
            avatar_url: null,
            echoes_count: 0,
            following_count: 0,
            followers_count: 0,
          },
        }));
      }),
      rest.get('http://localhost:3000/api/posts/user/1', (req, res, ctx) => {
        return res(ctx.json({
          success: true,
          posts: [],
        }));
      })
    );

    const { queryByTestId } = renderWithAuth(<Profile />, mockUser, false);

    await waitFor(() => {
      expect(queryByTestId('background')).toBeTruthy();
      expect(mockReplace).not.toHaveBeenCalled();
    });
  });

  it('allows authenticated user to access Map', async () => {
    server.use(
      rest.get('http://localhost:3000/api/posts/map', (req, res, ctx) => {
        return res(ctx.json({
          success: true,
          posts: [],
        }));
      })
    );

    const { queryByTestId } = renderWithAuth(<Map />, mockUser, false);

    await waitFor(() => {
      expect(queryByTestId('background')).toBeTruthy();
      expect(mockReplace).not.toHaveBeenCalled();
    });
  });

  it('allows authenticated user to access Notifications', async () => {
    server.use(
      rest.get('http://localhost:3000/api/notifications', (req, res, ctx) => {
        return res(ctx.json({
          success: true,
          notifications: [],
        }));
      })
    );

    const { queryByTestId } = renderWithAuth(<Notifications />, mockUser, false);

    await waitFor(() => {
      expect(queryByTestId('background')).toBeTruthy();
    });
  });

  it('maintains user session across multiple protected routes', async () => {
    // Set up mocks for all endpoints
    server.use(
      rest.get('http://localhost:3000/api/posts/feed', (req, res, ctx) => {
        return res(ctx.json({ success: true, posts: [] }));
      }),
      rest.get('http://localhost:3000/profile/user123', (req, res, ctx) => {
        return res(ctx.json({
          success: true,
          profile: {
            id: 1,
            name: 'Test User',
            bio: '',
            avatar_url: null,
            echoes_count: 0,
            following_count: 0,
            followers_count: 0,
          },
        }));
      }),
      rest.get('http://localhost:3000/api/posts/user/1', (req, res, ctx) => {
        return res(ctx.json({ success: true, posts: [] }));
      }),
      rest.get('http://localhost:3000/api/posts/map', (req, res, ctx) => {
        return res(ctx.json({ success: true, posts: [] }));
      }),
      rest.get('http://localhost:3000/api/notifications', (req, res, ctx) => {
        return res(ctx.json({ success: true, notifications: [] }));
      })
    );

    // Test Dashboard
    const { rerender: rerenderDashboard } = renderWithAuth(
      <Dashboard />,
      mockUser,
      false
    );

    await waitFor(() => {
      expect(mockReplace).not.toHaveBeenCalled();
    });

    // Test Profile
    rerenderDashboard(
      wrapWithProviders(<Profile />, mockUser, false)
    );

    await waitFor(() => {
      expect(mockReplace).not.toHaveBeenCalled();
    });

    // Test Map
    rerenderDashboard(
      wrapWithProviders(<Map />, mockUser, false)
    );

    await waitFor(() => {
      expect(mockReplace).not.toHaveBeenCalled();
    });

    // User should be able to access all protected routes without being redirected
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('shows loading state during authentication check', async () => {
    const { queryByTestId } = renderWithAuth(<Dashboard />, null, true);

    // During loading, should not redirect yet
    expect(mockReplace).not.toHaveBeenCalled();
    expect(queryByTestId('background')).toBeTruthy();
  });
});
