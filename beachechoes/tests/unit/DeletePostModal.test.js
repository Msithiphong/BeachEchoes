import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import DeletePostModal from '../../components/DeletePostModal';
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

// Mock Alert
jest.spyOn(Alert, 'alert');

// Mock fetch
global.fetch = jest.fn();

describe('DeletePostModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    auth.currentUser.getIdToken.mockResolvedValue('mock-token');
  });

  it('renders modal when visible', () => {
    const { getByText } = render(
      <DeletePostModal visible={true} postId={1} onClose={jest.fn()} />
    );
    expect(getByText('Delete post?')).toBeTruthy();
    expect(getByText('This cannot be undone.')).toBeTruthy();
    expect(getByText('Cancel')).toBeTruthy();
    expect(getByText('Delete')).toBeTruthy();
  });

  it('does not render when not visible', () => {
    const { queryByText } = render(
      <DeletePostModal visible={false} postId={1} onClose={jest.fn()} />
    );
    expect(queryByText('Delete post?')).toBeNull();
  });

  it('calls API when delete is confirmed', async () => {
    global.fetch.mockResolvedValueOnce({
      json: async () => ({ success: true }),
    });

    const onClose = jest.fn();
    const onDeleted = jest.fn();
    const { getByText } = render(
      <DeletePostModal
        visible={true}
        postId={456}
        onClose={onClose}
        onDeleted={onDeleted}
      />
    );
    
    const deleteBtn = getByText('Delete');
    fireEvent.press(deleteBtn);
    
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:3000/posts/456',
        expect.objectContaining({
          method: 'DELETE',
          headers: { Authorization: 'Bearer mock-token' },
        })
      );
    });

    await waitFor(() => {
      expect(onDeleted).toHaveBeenCalled();
      expect(onClose).toHaveBeenCalled();
    });
  });

  it('shows error alert when API fails', async () => {
    global.fetch.mockResolvedValueOnce({
      json: async () => ({ success: false, error: 'Not authorized' }),
    });

    const { getByText } = render(
      <DeletePostModal visible={true} postId={1} onClose={jest.fn()} />
    );
    
    const deleteBtn = getByText('Delete');
    fireEvent.press(deleteBtn);
    
    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith('Error', 'Not authorized');
    });
  });

  it('handles network errors gracefully', async () => {
    global.fetch.mockRejectedValueOnce(new Error('Network error'));

    const { getByText } = render(
      <DeletePostModal visible={true} postId={1} onClose={jest.fn()} />
    );
    
    const deleteBtn = getByText('Delete');
    fireEvent.press(deleteBtn);
    
    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        'Error',
        'Could not delete post. Please try again.'
      );
    });
  });

  it('closes modal when cancel is pressed', () => {
    const onClose = jest.fn();
    const { getByText } = render(
      <DeletePostModal visible={true} postId={1} onClose={onClose} />
    );
    
    const cancelBtn = getByText('Cancel');
    fireEvent.press(cancelBtn);
    
    expect(onClose).toHaveBeenCalled();
  });

  it('disables buttons while loading', async () => {
    global.fetch.mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve({ json: async () => ({ success: true }) }), 100))
    );

    const { getByText } = render(
      <DeletePostModal visible={true} postId={1} onClose={jest.fn()} />
    );
    
    const deleteBtn = getByText('Delete');
    const cancelBtn = getByText('Cancel');
    
    fireEvent.press(deleteBtn);
    
    // Try pressing again while loading
    fireEvent.press(deleteBtn);
    fireEvent.press(cancelBtn);
    
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(1); // Only called once
    });
  });
});
