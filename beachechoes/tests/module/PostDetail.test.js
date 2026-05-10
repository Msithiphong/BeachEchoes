import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import PostDetail from '../../app/PostDetail';
import { AuthContext } from '../../context/AuthContext';
import { auth } from '../../config/firebase';

const mockPush = jest.fn();
const mockBack = jest.fn();
let mockSearchParams = { ids: '1' };

jest.mock('expo-router', () => ({
  useRouter: jest.fn(() => ({
    push: mockPush,
    back: mockBack,
    replace: jest.fn(),
  })),
  useLocalSearchParams: jest.fn(() => mockSearchParams),
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

jest.mock('../../components/PostImageWithOverlay', () => {
  const React = require('react');
  const { View, Text } = require('react-native');
  return ({ overlayText }) => (
    <View testID="post-image">
      <Text>{overlayText}</Text>
    </View>
  );
});

jest.mock('../../components/LikeButton', () => {
  const React = require('react');
  const { View } = require('react-native');
  return () => <View testID="like-button" />;
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
  return ({ children }) => <View testID="gradient">{children}</View>;
});

global.fetch = jest.fn();

describe('PostDetail (Module Level)', () => {
  const mockUser = {
    uid: 'user123',
    email: 'test@example.com',
    name: 'Test User',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    auth.currentUser.getIdToken.mockResolvedValue('mock-token');
    global.fetch = jest.fn();
    mockSearchParams = { ids: '1' };
  });

  const renderWithContext = (component) =>
    render(
      <AuthContext.Provider value={{ user: mockUser, loading: false }}>
        {component}
      </AuthContext.Provider>
    );

  it('renders a hide action and removes the post after hiding it', async () => {
    global.fetch
      .mockResolvedValueOnce({
        json: async () => ({
          success: true,
          posts: [
            {
              id: 1,
              image_url: 'https://example.com/post.jpg',
              overlay_text: 'Visible post',
              like_count: 4,
              comment_count: 0,
              username: 'Alice',
              owner_firebase_uid: 'user456',
            },
          ],
        }),
      })
      .mockResolvedValueOnce({
        json: async () => ({ success: true, hidden: true }),
      });

    const { getByText } = renderWithContext(<PostDetail />);

    await waitFor(() => {
      expect(getByText('Hide')).toBeTruthy();
    });

    fireEvent.press(getByText('Hide'));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/posts/1/hide',
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify({ hidden: true }),
        })
      );
      expect(getByText('No posts found.')).toBeTruthy();
    });
  });

  it('renders an unhide action in hidden mode and removes the post after unhiding it', async () => {
    mockSearchParams = { ids: '1', includeHidden: '1' };

    global.fetch
      .mockResolvedValueOnce({
        json: async () => ({
          success: true,
          posts: [
            {
              id: 1,
              image_url: 'https://example.com/post.jpg',
              overlay_text: 'Hidden post',
              like_count: 4,
              comment_count: 0,
              username: 'Alice',
              owner_firebase_uid: 'user456',
              hidden: true,
            },
          ],
        }),
      })
      .mockResolvedValueOnce({
        json: async () => ({ success: true, hidden: false }),
      });

    const { getByText } = renderWithContext(<PostDetail />);

    await waitFor(() => {
      expect(getByText('Unhide')).toBeTruthy();
    });

    fireEvent.press(getByText('Unhide'));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/posts/1/hide',
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify({ hidden: false }),
        })
      );
      expect(getByText('No posts found.')).toBeTruthy();
    });
  });

  it('forwards includeHidden when opening comments from a hidden post list', async () => {
    mockSearchParams = { ids: '1', includeHidden: '1' };

    global.fetch.mockResolvedValueOnce({
      json: async () => ({
        success: true,
        posts: [
          {
            id: 1,
            image_url: 'https://example.com/post.jpg',
            overlay_text: 'Hidden post',
            like_count: 4,
            comment_count: 2,
            username: 'Alice',
            owner_firebase_uid: 'user456',
            hidden: true,
          },
        ],
      }),
    });

    const { getByLabelText } = renderWithContext(<PostDetail />);

    await waitFor(() => {
      expect(getByLabelText('Open comments')).toBeTruthy();
    });

    fireEvent.press(getByLabelText('Open comments'));

    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/PostWithComments',
      params: {
        postId: '1',
        includeHidden: '1',
      },
    });
  });
});
