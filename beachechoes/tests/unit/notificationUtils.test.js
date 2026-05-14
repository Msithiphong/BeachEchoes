import { isPendingFriendRequestNotification } from '../../helpers/notificationUtils';

describe('notificationUtils', () => {
  describe('isPendingFriendRequestNotification', () => {
    it('returns true for active pending friend request notifications', () => {
      expect(isPendingFriendRequestNotification(
        'friend_request',
        { from_firebase_uid: 'user-1' },
        1
      )).toBe(true);
    });

    it('returns false for accepted friend request info notifications', () => {
      expect(isPendingFriendRequestNotification(
        'friend_request',
        { from_firebase_uid: 'user-1', accepted: true },
        1
      )).toBe(false);
    });

    it('returns false for friend request notifications without a sender id', () => {
      expect(isPendingFriendRequestNotification(
        'friend_request',
        { from_firebase_uid: 'user-1' },
        null
      )).toBe(false);
    });

    it('returns false for other notification types', () => {
      expect(isPendingFriendRequestNotification(
        'new_follower',
        { from_firebase_uid: 'user-1' },
        1
      )).toBe(false);
    });
  });
});
