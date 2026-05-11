// Verifies optimistic like toggling behavior at the small component level.
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import LikeButton from '../../components/LikeButton';
import { auth } from '../../config/firebase';

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

// Mock fetch
global.fetch = jest.fn();

describe('LikeButton', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    auth.currentUser.getIdToken.mockResolvedValue('mock-token');
  });

  it('renders with initial like count and unliked state', () => {
    const { getByText } = render(
      <LikeButton postId={1} initialCount={5} initialLiked={false} />
    );
    expect(getByText('5')).toBeTruthy();
  });

  it('renders with liked state when initialLiked is true', () => {
    const { getByText } = render(
      <LikeButton postId={1} initialCount={10} initialLiked={true} />
    );
    expect(getByText('10')).toBeTruthy();
  });

  it('calls API and updates state when pressed', async () => {
    global.fetch.mockResolvedValueOnce({
      json: async () => ({ success: true, liked: true }),
    });

    const onUpdate = jest.fn();
    const { getByText } = render(
      <LikeButton postId={1} initialCount={5} initialLiked={false} onUpdate={onUpdate} />
    );

    const button = getByText('5').parent;
    fireEvent.press(button);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:3000/posts/1/like',
        expect.objectContaining({
          method: 'POST',
          headers: { Authorization: 'Bearer mock-token' },
        })
      );
    });

    await waitFor(() => {
      expect(getByText('6')).toBeTruthy(); // Count increased
      expect(onUpdate).toHaveBeenCalledWith({ liked: true, count: 6 });
    });
  });

  it('decreases count when unliking', async () => {
    global.fetch.mockResolvedValueOnce({
      json: async () => ({ success: true, liked: false }),
    });

    const onUpdate = jest.fn();
    const { getByText } = render(
      <LikeButton postId={1} initialCount={10} initialLiked={true} onUpdate={onUpdate} />
    );

    const button = getByText('10').parent;
    fireEvent.press(button);

    await waitFor(() => {
      expect(getByText('9')).toBeTruthy(); // Count decreased
      expect(onUpdate).toHaveBeenCalledWith({ liked: false, count: 9 });
    });
  });

  it('does not call API when loading', async () => {
    global.fetch.mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve({ json: async () => ({ success: true, liked: true }) }), 100))
    );

    const { getByText } = render(
      <LikeButton postId={1} initialCount={5} initialLiked={false} />
    );

    const button = getByText('5').parent;
    fireEvent.press(button);
    fireEvent.press(button); // Second press while loading

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(1); // Only called once
    });
  });

  it('handles API errors gracefully', async () => {
    global.fetch.mockRejectedValueOnce(new Error('Network error'));

    const { getByText } = render(
      <LikeButton postId={1} initialCount={5} initialLiked={false} />
    );

    const button = getByText('5').parent;
    fireEvent.press(button);

    await waitFor(() => {
      expect(getByText('5')).toBeTruthy(); // Count unchanged
    });
  });

  it('does not call API when user is not authenticated', async () => {
    auth.currentUser.getIdToken.mockResolvedValue(null);

    const { getByText } = render(
      <LikeButton postId={1} initialCount={5} initialLiked={false} />
    );

    const button = getByText('5').parent;
    fireEvent.press(button);

    await waitFor(() => {
      expect(global.fetch).not.toHaveBeenCalled();
    });
  });
});
