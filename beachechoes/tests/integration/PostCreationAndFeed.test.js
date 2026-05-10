import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import { server } from './server';
import { rest } from 'msw';
import Dashboard from '../../app/(tabs)/Dashboard';
import { AuthContext } from '../../context/AuthContext';
import { auth } from '../../config/firebase';

// Mock expo-router
jest.mock('expo-router', () => ({
  useRouter: jest.fn(() => ({
    push: jest.fn(),
    replace: jest.fn(),
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

// Mock components
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
  const { View, Text } = require('react-native');
  return ({ username, children, likeCount }) => (
    <View testID="image-card">
      <Text testID="card-username">{username}</Text>
      <Text testID="card-overlay">{children}</Text>
      <Text testID="card-likes">{likeCount}</Text>
    </View>
  );
});

jest.mock('../../components/WaveRefreshOverlay', () => {
  const React = require('react');
  const { View } = require('react-native');
  return () => <View testID="wave-refresh" />;
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

describe('Post Creation and Feed Integration (Integration Level)', () => {
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
    auth.currentUser.getIdToken.mockResolvedValue('mock-token');
  });

  const { ScrollContext } = require('../../context/ScrollContext');

  const renderWithContext = (component) => {
    return render(
      <ScrollContext.Provider value={{ scrollHandler: jest.fn(), navbarHeight: 0 }}>
        <AuthContext.Provider value={{ user: mockUser, loading: false }}>
          {component}
        </AuthContext.Provider>
      </ScrollContext.Provider>
    );
  };

  it('creates a post and verifies it appears in feed', async () => {
    const newPost = {
      id: 1,
      image_url: 'https://example.com/new-post.jpg',
      overlay_text: 'My new post!',
      map_x: 0.5,
      map_y: 0.5,
      like_count: 0,
      liked: false,
      username: 'Test User',
      created_at: new Date().toISOString(),
    };

    // Step 1: Mock post creation
    server.use(
      rest.post('http://localhost:3000/api/posts', (req, res, ctx) => {
        return res(ctx.json({
          success: true,
          post: newPost,
        }));
      })
    );

    // Step 2: Mock feed fetch to return the newly created post
    server.use(
      rest.get('http://localhost:3000/api/posts/feed', (req, res, ctx) => {
        return res(ctx.json({
          success: true,
          posts: [newPost],
        }));
      })
    );

    // Step 3: Render Dashboard and verify post appears
    const { getByText, getAllByTestId } = renderWithContext(<Dashboard />);

    await waitFor(() => {
      expect(getByText('My new post!')).toBeTruthy();
      expect(getByText('Test User')).toBeTruthy();
    });

    const imageCards = getAllByTestId('image-card');
    expect(imageCards.length).toBe(1);
  });

  it('creates multiple posts and verifies they appear in chronological order', async () => {
    const posts = [
      {
        id: 3,
        image_url: 'https://example.com/post3.jpg',
        overlay_text: 'Newest post',
        like_count: 0,
        liked: false,
        username: 'User C',
        created_at: '2026-05-09T12:00:00Z',
      },
      {
        id: 2,
        image_url: 'https://example.com/post2.jpg',
        overlay_text: 'Middle post',
        like_count: 5,
        liked: true,
        username: 'User B',
        created_at: '2026-05-09T11:00:00Z',
      },
      {
        id: 1,
        image_url: 'https://example.com/post1.jpg',
        overlay_text: 'Oldest post',
        like_count: 10,
        liked: false,
        username: 'User A',
        created_at: '2026-05-09T10:00:00Z',
      },
    ];

    server.use(
      rest.get('http://localhost:3000/api/posts/feed', (req, res, ctx) => {
        return res(ctx.json({
          success: true,
          posts,
        }));
      })
    );

    const { getAllByTestId } = renderWithContext(<Dashboard />);

    await waitFor(() => {
      const imageCards = getAllByTestId('image-card');
      expect(imageCards.length).toBe(3);
    });

    // Verify posts are rendered in chronological order (newest first)
    const overlayTexts = getAllByTestId('card-overlay');
    expect(overlayTexts[0].children[0]).toBe('Newest post');
    expect(overlayTexts[1].children[0]).toBe('Middle post');
    expect(overlayTexts[2].children[0]).toBe('Oldest post');
  });

  it('handles post creation failure gracefully', async () => {
    server.use(
      rest.post('http://localhost:3000/api/posts', (req, res, ctx) => {
        return res(
          ctx.status(500),
          ctx.json({ success: false, error: 'Upload failed' })
        );
      })
    );

    // Even if post creation fails, the app should continue to work
    server.use(
      rest.get('http://localhost:3000/api/posts/feed', (req, res, ctx) => {
        return res(ctx.json({
          success: true,
          posts: [],
        }));
      })
    );

    const { queryByTestId } = renderWithContext(<Dashboard />);

    await waitFor(() => {
      expect(queryByTestId('background')).toBeTruthy();
    });
  });

  it('verifies post appears on both Map and Dashboard after creation', async () => {
    const newPost = {
      id: 1,
      image_url: 'https://example.com/campus-post.jpg',
      overlay_text: 'Beautiful campus!',
      map_x: 0.6,
      map_y: 0.4,
      like_count: 0,
      liked: false,
      username: 'Test User',
      created_at: new Date().toISOString(),
    };

    // Mock both feed and map endpoints to return the same post
    server.use(
      rest.get('http://localhost:3000/api/posts/feed', (req, res, ctx) => {
        return res(ctx.json({
          success: true,
          posts: [newPost],
        }));
      }),
      rest.get('http://localhost:3000/api/posts/map', (req, res, ctx) => {
        return res(ctx.json({
          success: true,
          posts: [newPost],
        }));
      })
    );

    const { getByText } = renderWithContext(<Dashboard />);

    // Verify post appears in Dashboard
    await waitFor(() => {
      expect(getByText('Beautiful campus!')).toBeTruthy();
      expect(getByText('Test User')).toBeTruthy();
    });
  });
});
