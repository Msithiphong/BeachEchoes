// Module-level coverage for thread fetching, nested comments, and comment submission flows.
import React from 'react';
import { Alert } from 'react-native';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import PostWithComments from '../../app/PostWithComments';
import { AuthContext } from '../../context/AuthContext';
import { auth } from '../../config/firebase';

// Mock expo-router
const mockPush = jest.fn();
const mockBack = jest.fn();
let mockSearchParams = { postId: '123' };

jest.mock('expo-router', () => ({
  useRouter: jest.fn(() => ({
    push: mockPush,
    back: mockBack,
  })),
  useLocalSearchParams: jest.fn(() => mockSearchParams),
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

// Mock expo-image-picker
jest.mock('expo-image-picker', () => ({
  requestMediaLibraryPermissionsAsync: jest.fn(),
  launchImageLibraryAsync: jest.fn(),
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

jest.mock('../../components/ReportPostModal', () => {
  const React = require('react');
  const { View } = require('react-native');
  return () => <View testID="report-modal" />;
});

jest.mock('../../components/DeletePostModal', () => {
  const React = require('react');
  const { View } = require('react-native');
  return () => <View testID="delete-modal" />;
});

jest.mock('../../components/CoastalGradient', () => {
  const React = require('react');
  const { View } = require('react-native');
  return ({ children, style }) => (
    <View testID="coastal-gradient" style={style}>
      {children}
    </View>
  );
});

jest.mock('../../context/AppThemeContext', () => ({
  useAppTheme: jest.fn(() => ({
    isDark: false,
    toggleTheme: jest.fn(),
  })),
}));

// Mock fetch
global.fetch = jest.fn();

describe('PostWithComments (Module Level)', () => {
  const mockUser = {
    uid: 'user123',
    email: 'test@example.com',
    name: 'Test User',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    auth.currentUser.getIdToken.mockResolvedValue('mock-token');
    global.fetch = jest.fn();
    mockSearchParams = { postId: '123' };
    jest.spyOn(Alert, 'alert').mockImplementation((title, message, buttons) => {
      if (Array.isArray(buttons) && buttons[0]?.onPress) {
        buttons[0].onPress();
      }
    });
  });

  const renderWithContext = (component) => {
    return render(
      <AuthContext.Provider value={{ user: mockUser, loading: false }}>
        {component}
      </AuthContext.Provider>
    );
  };

  it('fetches post data and comments from multiple endpoints', async () => {
    const mockPost = {
      success: true,
      posts: [
        {
          id: 123,
          image_url: 'https://example.com/image.jpg',
          overlay_text: 'Test post',
          like_count: 10,
          liked: false,
          comment_count: 2,
          username: 'Alice',
          owner_firebase_uid: 'user456',
        },
      ],
    };

    const mockComments = {
      success: true,
      comments: [
        {
          id: 1,
          user_id: 1,
          username: 'Bob',
          avatar_url: 'https://example.com/bob.jpg',
          content: 'Great post!',
          created_at: '2026-05-09T10:00:00Z',
          replies: [],
        },
        {
          id: 2,
          user_id: 2,
          username: 'Charlie',
          avatar_url: 'https://example.com/charlie.jpg',
          content: 'Nice!',
          created_at: '2026-05-09T11:00:00Z',
          replies: [],
        },
      ],
    };

    global.fetch
      .mockResolvedValueOnce({ ok: true, json: async () => mockPost })
      .mockResolvedValueOnce({ ok: true, json: async () => mockComments });

    renderWithContext(<PostWithComments />);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/posts/detail?ids=123',
        expect.objectContaining({
          headers: { Authorization: 'Bearer mock-token' },
        })
      );
    }, { timeout: 3000 });

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/posts/123/comments'),
        expect.objectContaining({
          headers: { Authorization: 'Bearer mock-token' },
        })
      );
    });

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    const requestedUrls = global.fetch.mock.calls.map(([url]) => String(url));
    expect(
      requestedUrls.filter((url) => url === 'http://localhost:3000/api/posts/detail?ids=123')
    ).toHaveLength(1);
    expect(
      requestedUrls.filter((url) => url.includes('/api/posts/123/comments'))
    ).toHaveLength(1);
  });

  it('displays post data with image, overlay text, and like count', async () => {
    const mockPost = {
      success: true,
      posts: [
        {
          id: 123,
          image_url: 'https://example.com/image.jpg',
          overlay_text: 'Beautiful sunset',
          like_count: 25,
          liked: true,
          username: 'Alice',
          owner_firebase_uid: 'user456',
        },
      ],
    };

    global.fetch
      .mockResolvedValueOnce({ ok: true, json: async () => mockPost })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ success: true, comments: [] }) });

    const { getByText } = renderWithContext(<PostWithComments />);

    await waitFor(() => {
      expect(getByText('Beautiful sunset')).toBeTruthy();
    }, { timeout: 3000 });
  });

  it('renders comments with user info and content', async () => {
    const mockPost = {
      success: true,
      posts: [
        {
          id: 123,
          image_url: 'https://example.com/image.jpg',
          overlay_text: 'Test post',
          like_count: 10,
          username: 'Alice',
          owner_firebase_uid: 'user456',
        },
      ],
    };

    const mockComments = {
      success: true,
      comments: [
        {
          id: 1,
          username: 'Bob',
          content: 'Amazing shot!',
          created_at: '2026-05-09T10:00:00Z',
          replies: [],
        },
      ],
    };

    global.fetch
      .mockResolvedValueOnce({ ok: true, json: async () => mockPost })
      .mockResolvedValueOnce({ ok: true, json: async () => mockComments });

    const { getByText } = renderWithContext(<PostWithComments />);

    await waitFor(() => {
      expect(getByText('Bob')).toBeTruthy();
      expect(getByText('Amazing shot!')).toBeTruthy();
    }, { timeout: 3000 });
  });

  it('displays nested replies under parent comments', async () => {
    const mockPost = {
      success: true,
      posts: [
        {
          id: 123,
          image_url: 'https://example.com/image.jpg',
          overlay_text: 'Test post',
          like_count: 10,
          username: 'Alice',
          owner_firebase_uid: 'user456',
        },
      ],
    };

    const mockComments = {
      success: true,
      comments: [
        {
          id: 1,
          username: 'Bob',
          content: 'Great post!',
          created_at: '2026-05-09T10:00:00Z',
          replies: [
            {
              id: 2,
              username: 'Charlie',
              content: 'I agree!',
              parent_comment_id: 1,
              created_at: '2026-05-09T11:00:00Z',
            },
          ],
        },
      ],
    };

    global.fetch
      .mockResolvedValueOnce({ ok: true, json: async () => mockPost })
      .mockResolvedValueOnce({ ok: true, json: async () => mockComments });

    const { getByText } = renderWithContext(<PostWithComments />);

    await waitFor(() => {
      expect(getByText('Great post!')).toBeTruthy();
    }, { timeout: 3000 });

    // Replies are collapsed by default, check for the "View reply" button
    await waitFor(() => {
      expect(getByText('View 1 reply')).toBeTruthy();
    }, { timeout: 3000 });
  });

  it('dedupes duplicate replies from fetched comment data', async () => {
    const mockPost = {
      success: true,
      posts: [
        {
          id: 123,
          image_url: 'https://example.com/image.jpg',
          overlay_text: 'Test post',
          like_count: 10,
          username: 'Alice',
          owner_firebase_uid: 'user456',
        },
      ],
    };

    const duplicateReply = {
      id: 2,
      username: 'Charlie',
      content: 'Duplicate reply should appear once',
      parent_comment_id: 1,
      created_at: '2026-05-09T11:00:00Z',
    };

    const mockComments = {
      success: true,
      comments: [
        {
          id: 1,
          username: 'Bob',
          content: 'Great post!',
          created_at: '2026-05-09T10:00:00Z',
          replies: [duplicateReply, duplicateReply],
        },
      ],
    };

    global.fetch
      .mockResolvedValueOnce({ ok: true, json: async () => mockPost })
      .mockResolvedValueOnce({ ok: true, json: async () => mockComments });

    const { getByText, queryAllByText } = renderWithContext(<PostWithComments />);

    await waitFor(() => {
      expect(getByText('View 1 reply')).toBeTruthy();
    }, { timeout: 3000 });

    fireEvent.press(getByText('View 1 reply'));

    await waitFor(() => {
      expect(queryAllByText('Duplicate reply should appear once')).toHaveLength(1);
    }, { timeout: 3000 });
  });

  it('renders a hide action and navigates back after hiding a post', async () => {
    const mockPost = {
      success: true,
      posts: [
        {
          id: 123,
          image_url: 'https://example.com/image.jpg',
          overlay_text: 'Hide me',
          like_count: 10,
          username: 'Alice',
          owner_firebase_uid: 'user456',
          hidden: false,
        },
      ],
    };

    global.fetch
      .mockResolvedValueOnce({ ok: true, json: async () => mockPost })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ success: true, comments: [] }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ success: true, hidden: true }) });

    const { getByText } = renderWithContext(<PostWithComments />);

    await waitFor(() => {
      expect(getByText('Hide')).toBeTruthy();
    }, { timeout: 3000 });

    fireEvent.press(getByText('Hide'));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/posts/123/hide',
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify({ hidden: true }),
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            Authorization: 'Bearer mock-token',
          }),
        })
      );
      expect(Alert.alert).toHaveBeenCalledWith(
        'Post Hidden',
        'This post is now in your Hidden posts.',
        expect.any(Array)
      );
      expect(mockBack).toHaveBeenCalled();
    }, { timeout: 3000 });
  });

  it('keeps hidden posts visible in hidden mode and switches the action to Unhide', async () => {
    mockSearchParams = { postId: '123', includeHidden: '1' };

    const mockPost = {
      success: true,
      posts: [
        {
          id: 123,
          image_url: 'https://example.com/image.jpg',
          overlay_text: 'Still visible while hidden',
          like_count: 10,
          username: 'Alice',
          owner_firebase_uid: 'user456',
          hidden: true,
        },
      ],
    };

    global.fetch
      .mockResolvedValueOnce({ ok: true, json: async () => mockPost })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ success: true, comments: [] }) });

    const { getByText } = renderWithContext(<PostWithComments />);

    await waitFor(() => {
      expect(getByText('Still visible while hidden')).toBeTruthy();
      expect(getByText('Unhide')).toBeTruthy();
    }, { timeout: 3000 });

    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:3000/api/posts/detail?ids=123&includeHidden=1',
      expect.objectContaining({
        headers: { Authorization: 'Bearer mock-token' },
      })
    );
  });

  it('handles API errors gracefully', async () => {
    global.fetch.mockRejectedValue(new Error('Network error'));

    // Should not throw an error during render
    const result = renderWithContext(<PostWithComments />);
    
    // Component should render without crashing
    expect(result).toBeTruthy();
    
    // Wait a bit to ensure async error handling completes
    await new Promise(resolve => setTimeout(resolve, 100));
  });
});
