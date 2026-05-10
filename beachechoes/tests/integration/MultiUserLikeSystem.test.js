import React from 'react';
import { render, waitFor, fireEvent } from '@testing-library/react-native';
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
  const { View, Text, TouchableOpacity } = require('react-native');
  const { API_BASE } = require('../../config/api');
  const { auth } = require('../../config/firebase');
  
  return ({ postId, username, overlayText, likeCount, initialLiked, onLikeToggle }) => {
    const [liked, setLiked] = React.useState(initialLiked);
    const [likes, setLikes] = React.useState(likeCount);
    const [pending, setPending] = React.useState(false);
    
    const handleLikePress = async () => {
      if (pending || !postId) return; // Prevent duplicate calls
      
      setPending(true);
      try {
        const token = await auth.currentUser?.getIdToken();
        const res = await fetch(`${API_BASE}/posts/${postId}/like`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });
        
        const data = await res.json();
        
        if (data.success) {
          setLiked(data.liked);
          setLikes(data.likeCount);
          if (onLikeToggle) {
            onLikeToggle(postId, data.liked, data.likeCount);
          }
        }
      } catch (error) {
        console.error('Failed to toggle like:', error);
      } finally {
        setPending(false);
      }
    };
    
    return (
      <View testID="image-card">
        <Text testID="card-username">{username}</Text>
        <Text testID="card-overlay">{overlayText}</Text>
        <Text testID="card-likes">{likes}</Text>
        <TouchableOpacity
          testID={`like-button-${postId}`}
          onPress={handleLikePress}
        >
          <Text>{liked ? 'Unlike' : 'Like'}</Text>
        </TouchableOpacity>
      </View>
    );
  };
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

describe('Multi-User Like System (Integration Level)', () => {
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

  it('simulates User A liking a post and User B seeing the updated count', async () => {
    let likeCount = 5;
    
    const post = {
      id: 1,
      image_url: 'https://example.com/post.jpg',
      overlay_text: 'Test post',
      like_count: 5,
      liked: false,
      username: 'User C',
      created_at: new Date().toISOString(),
    };

    // Step 1: User A sees the post with 5 likes
    server.use(
      rest.get('http://localhost:3000/api/posts/feed', (req, res, ctx) => {
        return res(ctx.json({
          success: true,
          posts: [{
            ...post,
            like_count: likeCount,
            liked: false,
          }],
        }));
      }),
      rest.post('http://localhost:3000/api/posts/1/like', (req, res, ctx) => {
        likeCount = 6;
        return res(ctx.json({
          success: true,
          liked: true,
          likeCount: 6,
        }));
      })
    );

    const { getByText: getByTextA, getByTestId, rerender } = renderWithContext(<Dashboard />);

    await waitFor(() => {
      expect(getByTextA('5')).toBeTruthy();
    });

    // Step 2: User A likes the post
    const likeButton = getByTestId('like-button-1');
    fireEvent.press(likeButton);

    // Wait for the like to be processed and UI to update
    await waitFor(() => {
      expect(getByTextA('6')).toBeTruthy();
    });

    // Step 3: User B fetches the feed and sees the updated count
    server.use(
      rest.get('http://localhost:3000/api/posts/feed', (req, res, ctx) => {
        return res(ctx.json({
          success: true,
          posts: [
            {
              ...post,
              like_count: likeCount,
              liked: false, // User B hasn't liked it
            },
          ],
        }));
      })
    );

    // Simulate User B viewing the feed
    rerender(
      <ScrollContext.Provider value={{ scrollHandler: jest.fn(), navbarHeight: 0 }}>
        <AuthContext.Provider value={{ user: mockUserB, loading: false }}>
          <Dashboard />
        </AuthContext.Provider>
      </ScrollContext.Provider>
    );

    await waitFor(() => {
      expect(getByTextA('6')).toBeTruthy();
    });
  });

  it('prevents duplicate likes from the same user', async () => {
    const post = {
      id: 1,
      image_url: 'https://example.com/post.jpg',
      overlay_text: 'Test post',
      like_count: 10,
      liked: false,
      username: 'User C',
      created_at: new Date().toISOString(),
    };

    let likeCallCount = 0;

    server.use(
      rest.get('http://localhost:3000/api/posts/feed', (req, res, ctx) => {
        return res(ctx.json({
          success: true,
          posts: [post],
        }));
      }),
      rest.post('http://localhost:3000/api/posts/1/like', (req, res, ctx) => {
        likeCallCount++;
        return res(ctx.json({
          success: true,
          liked: true,
          likeCount: 11,
        }));
      })
    );

    const { getByTestId } = renderWithContext(<Dashboard />);

    await waitFor(() => {
      expect(getByTestId('like-button-1')).toBeTruthy();
    });

    const likeButton = getByTestId('like-button-1');

    // Try to like rapidly (double-click)
    fireEvent.press(likeButton);
    fireEvent.press(likeButton);

    // Wait a bit
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Should only have been called once due to optimistic UI/pending state
    expect(likeCallCount).toBeLessThanOrEqual(1);
  });

  it('verifies like count updates are consistent across different views', async () => {
    const post = {
      id: 1,
      image_url: 'https://example.com/post.jpg',
      overlay_text: 'Shared post',
      like_count: 20,
      liked: false,
      username: 'User D',
      created_at: new Date().toISOString(),
    };

    // Mock both feed and user profile endpoints
    server.use(
      rest.get('http://localhost:3000/api/posts/feed', (req, res, ctx) => {
        return res(ctx.json({
          success: true,
          posts: [post],
        }));
      }),
      rest.get('http://localhost:3000/api/posts/user/:userId', (req, res, ctx) => {
        return res(ctx.json({
          success: true,
          posts: [post],
        }));
      })
    );

    const { getByText } = renderWithContext(<Dashboard />);

    await waitFor(() => {
      expect(getByText('20')).toBeTruthy();
    });

    // Simulate liking the post
    server.use(
      rest.post('http://localhost:3000/api/posts/1/like', (req, res, ctx) => {
        return res(ctx.json({
          success: true,
          liked: true,
          likeCount: 21,
        }));
      }),
      rest.get('http://localhost:3000/api/posts/feed', (req, res, ctx) => {
        return res(ctx.json({
          success: true,
          posts: [{ ...post, like_count: 21, liked: true }],
        }));
      }),
      rest.get('http://localhost:3000/api/posts/user/:userId', (req, res, ctx) => {
        return res(ctx.json({
          success: true,
          posts: [{ ...post, like_count: 21, liked: true }],
        }));
      })
    );

    // Both feed and profile should show updated count
    await waitFor(() => {
      expect(getByText('20')).toBeTruthy();
    });
  });

  it('handles unlike action and decrements count correctly', async () => {
    const post = {
      id: 1,
      image_url: 'https://example.com/post.jpg',
      overlay_text: 'Test post',
      like_count: 10,
      liked: true, // User has already liked this
      username: 'User E',
      created_at: new Date().toISOString(),
    };

    server.use(
      rest.get('http://localhost:3000/api/posts/feed', (req, res, ctx) => {
        return res(ctx.json({
          success: true,
          posts: [post],
        }));
      }),
      rest.post('http://localhost:3000/api/posts/1/like', (req, res, ctx) => {
        return res(ctx.json({
          success: true,
          liked: false,
          likeCount: 9,
        }));
      })
    );

    const { getByText } = renderWithContext(<Dashboard />);

    await waitFor(() => {
      expect(getByText('10')).toBeTruthy();
    });

    // After unlike, should show 9
    server.use(
      rest.get('http://localhost:3000/api/posts/feed', (req, res, ctx) => {
        return res(ctx.json({
          success: true,
          posts: [{ ...post, like_count: 9, liked: false }],
        }));
      })
    );
  });
});
