import React from 'react';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import MapScreen from '../../app/(tabs)/Map';
import { AuthContext } from '../../context/AuthContext';
import { auth } from '../../config/firebase';

const mockPush = jest.fn();
const mockReplace = jest.fn();
let latestFocusCallback = null;

jest.mock('expo-router', () => {
  const React = require('react');
  return {
    useRouter: jest.fn(() => ({
      push: mockPush,
      replace: mockReplace,
      back: jest.fn(),
    })),
    useFocusEffect: jest.fn((callback) => {
      latestFocusCallback = callback;
      React.useEffect(() => callback(), [callback]);
    }),
    Stack: {
      Screen: () => null,
    },
  };
});

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

jest.mock('../../context/AppThemeContext', () => ({
  useAppTheme: jest.fn(() => ({
    isDark: false,
    toggleTheme: jest.fn(),
  })),
}));

jest.mock('../../helpers/clusterUtils', () => ({
  clusterPosts: jest.fn((posts) =>
    posts.map((post) => ({
      ids: [post.id],
      centroid: { x: Number(post.map_x) || 0.5, y: Number(post.map_y) || 0.5 },
    }))
  ),
}));

jest.mock('../../components/CoastalGradient', () => {
  const React = require('react');
  const { View } = require('react-native');
  return ({ children, style }) => (
    <View testID="coastal-gradient" style={style}>
      {children}
    </View>
  );
});

jest.mock('../../components/CampusMap', () => {
  const React = require('react');
  const { View } = require('react-native');
  return ({ children }) => <View testID="campus-map">{children}</View>;
});

jest.mock('../../components/ClusteredPin', () => {
  const React = require('react');
  const { TouchableOpacity } = require('react-native');
  return ({ ids, onPress }) => (
    <TouchableOpacity
      testID={`cluster-pin-${ids.join('-')}`}
      onPress={() => onPress(ids)}
    />
  );
});

jest.mock('../../components/WaveRefreshOverlay', () => {
  const React = require('react');
  const { View } = require('react-native');
  return React.forwardRef((props, ref) => {
    React.useImperativeHandle(ref, () => ({
      trigger: jest.fn(),
    }));
    return <View testID="wave-refresh" />;
  });
});

global.fetch = jest.fn();

describe('MapScreen (Module Level)', () => {
  const mockUser = {
    uid: 'user123',
    email: 'test@example.com',
    name: 'Test User',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    auth.currentUser.getIdToken.mockResolvedValue('mock-token');
    global.fetch = jest.fn();
    latestFocusCallback = null;
  });

  const renderWithContext = (component, user = mockUser, loading = false) =>
    render(
      <AuthContext.Provider value={{ user, loading, logout: jest.fn() }}>
        {component}
      </AuthContext.Provider>
    );

  it('renders the Hidden count alongside the Muted count', async () => {
    global.fetch.mockImplementation((url) => {
      const requestUrl = String(url);
      if (requestUrl.includes('/posts/muted')) {
        return Promise.resolve({ json: async () => ({ success: true, posts: [{ id: 2 }] }) });
      }
      if (requestUrl.includes('/posts/hidden')) {
        return Promise.resolve({ json: async () => ({ success: true, posts: [{ id: 3 }, { id: 4 }] }) });
      }
      return Promise.resolve({ json: async () => ({ success: true, posts: [] }) });
    });

    const { getByText } = renderWithContext(<MapScreen />);

    await waitFor(() => {
      expect(getByText('Muted (1)')).toBeTruthy();
      expect(getByText('Hidden (2)')).toBeTruthy();
    });
  });

  it('uses the hidden endpoint for the Hidden chip and passes includeHidden to PostDetail', async () => {
    global.fetch.mockImplementation((url) => {
      const requestUrl = String(url);
      if (requestUrl.includes('/posts/hidden')) {
        return Promise.resolve({
          json: async () => ({
            success: true,
            posts: [{ id: 42, map_x: 0.4, map_y: 0.6 }],
          }),
        });
      }
      if (requestUrl.includes('/posts/muted')) {
        return Promise.resolve({ json: async () => ({ success: true, posts: [] }) });
      }
      return Promise.resolve({ json: async () => ({ success: true, posts: [] }) });
    });

    const { getByText, getByTestId } = renderWithContext(<MapScreen />);

    await waitFor(() => {
      expect(getByText('Hidden (1)')).toBeTruthy();
    });

    const initialMapCallCount = global.fetch.mock.calls.filter(([url]) =>
      String(url).includes('/posts/map')
    ).length;
    const initialHiddenCallCount = global.fetch.mock.calls.filter(([url]) =>
      String(url).includes('/posts/hidden')
    ).length;

    fireEvent.press(getByText('Hidden (1)'));

    await waitFor(() => {
      const hiddenCallCount = global.fetch.mock.calls.filter(([url]) =>
        String(url).includes('/posts/hidden')
      ).length;
      const mapCallCount = global.fetch.mock.calls.filter(([url]) =>
        String(url).includes('/posts/map')
      ).length;

      expect(hiddenCallCount).toBeGreaterThan(initialHiddenCallCount);
      expect(mapCallCount).toBe(initialMapCallCount);
      expect(getByTestId('cluster-pin-42')).toBeTruthy();
    });

    fireEvent.press(getByTestId('cluster-pin-42'));

    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/PostDetail',
      params: {
        ids: '42',
        includeMuted: '0',
        includeHidden: '1',
      },
    });
  });

  it('refetches posts when the screen regains focus', async () => {
    global.fetch.mockImplementation((url) => {
      const requestUrl = String(url);
      if (requestUrl.includes('/posts/muted')) {
        return Promise.resolve({ json: async () => ({ success: true, posts: [] }) });
      }
      if (requestUrl.includes('/posts/hidden')) {
        return Promise.resolve({ json: async () => ({ success: true, posts: [] }) });
      }
      return Promise.resolve({ json: async () => ({ success: true, posts: [] }) });
    });

    renderWithContext(<MapScreen />);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(3);
    });

    await act(async () => {
      latestFocusCallback?.();
    });

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(6);
    });
  });
});
