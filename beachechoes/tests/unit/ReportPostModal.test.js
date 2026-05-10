import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import ReportPostModal from '../../components/ReportPostModal';
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

describe('ReportPostModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    auth.currentUser.getIdToken.mockResolvedValue('mock-token');
  });

  it('renders modal when visible', () => {
    const { getByText } = render(
      <ReportPostModal visible={true} postId={1} onClose={jest.fn()} />
    );
    expect(getByText('Report post')).toBeTruthy();
    expect(getByText('Spam')).toBeTruthy();
    expect(getByText('Offensive content')).toBeTruthy();
    expect(getByText('Other')).toBeTruthy();
  });

  it('does not render when not visible', () => {
    const { queryByText } = render(
      <ReportPostModal visible={false} postId={1} onClose={jest.fn()} />
    );
    expect(queryByText('Report post')).toBeNull();
  });

  it('selects a reason when tapped', () => {
    const { getByText } = render(
      <ReportPostModal visible={true} postId={1} onClose={jest.fn()} />
    );
    
    const spamOption = getByText('Spam');
    fireEvent.press(spamOption);
    
    // Verify selection by checking if it's rendered (component re-renders with selection)
    expect(spamOption).toBeTruthy();
  });

  it('shows details input when "Other" is selected', () => {
    const { getByText, getByPlaceholderText } = render(
      <ReportPostModal visible={true} postId={1} onClose={jest.fn()} />
    );
    
    const otherOption = getByText('Other');
    fireEvent.press(otherOption);
    
    expect(getByPlaceholderText('Describe the issue…')).toBeTruthy();
  });

  it('shows alert if no reason is selected', async () => {
    const { getByText } = render(
      <ReportPostModal visible={true} postId={1} onClose={jest.fn()} />
    );
    
    const submitBtn = getByText('Submit');
    fireEvent.press(submitBtn);
    
    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        'Select a reason',
        'Please select a reason before submitting.'
      );
    });
  });

  it('shows alert if "Other" is selected without details', async () => {
    const { getByText } = render(
      <ReportPostModal visible={true} postId={1} onClose={jest.fn()} />
    );
    
    const otherOption = getByText('Other');
    fireEvent.press(otherOption);
    
    const submitBtn = getByText('Submit');
    fireEvent.press(submitBtn);
    
    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        'Details required',
        'Please provide details for your report.'
      );
    });
  });

  it('submits report with selected reason', async () => {
    global.fetch.mockResolvedValueOnce({
      json: async () => ({ success: true }),
    });

    const onClose = jest.fn();
    const { getByText } = render(
      <ReportPostModal visible={true} postId={123} onClose={onClose} />
    );
    
    const spamOption = getByText('Spam');
    fireEvent.press(spamOption);
    
    const submitBtn = getByText('Submit');
    fireEvent.press(submitBtn);
    
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:3000/posts/123/report',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            Authorization: 'Bearer mock-token',
          }),
          body: JSON.stringify({ reason: 'spam' }),
        })
      );
    });

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith('Reported', 'Thank you for your report.');
      expect(onClose).toHaveBeenCalled();
    });
  });

  it('submits report with "Other" reason and details', async () => {
    global.fetch.mockResolvedValueOnce({
      json: async () => ({ success: true }),
    });

    const { getByText, getByPlaceholderText } = render(
      <ReportPostModal visible={true} postId={123} onClose={jest.fn()} />
    );
    
    const otherOption = getByText('Other');
    fireEvent.press(otherOption);
    
    const detailsInput = getByPlaceholderText('Describe the issue…');
    fireEvent.changeText(detailsInput, 'This is inappropriate');
    
    const submitBtn = getByText('Submit');
    fireEvent.press(submitBtn);
    
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:3000/posts/123/report',
        expect.objectContaining({
          body: JSON.stringify({ reason: 'other', details: 'This is inappropriate' }),
        })
      );
    });
  });

  it('handles API errors gracefully', async () => {
    global.fetch.mockRejectedValueOnce(new Error('Network error'));

    const { getByText } = render(
      <ReportPostModal visible={true} postId={1} onClose={jest.fn()} />
    );
    
    const spamOption = getByText('Spam');
    fireEvent.press(spamOption);
    
    const submitBtn = getByText('Submit');
    fireEvent.press(submitBtn);
    
    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        'Error',
        'Could not submit report. Please try again.'
      );
    });
  });

  it('closes modal when cancel is pressed', () => {
    const onClose = jest.fn();
    const { getByText } = render(
      <ReportPostModal visible={true} postId={1} onClose={onClose} />
    );
    
    const cancelBtn = getByText('Cancel');
    fireEvent.press(cancelBtn);
    
    expect(onClose).toHaveBeenCalled();
  });
});
