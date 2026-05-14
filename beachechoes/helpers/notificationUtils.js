export function isPendingFriendRequestNotification(type, data = {}, fromUserId = null) {
  return (
    type === 'friend_request' &&
    fromUserId !== null &&
    fromUserId !== undefined &&
    data?.accepted !== true
  )
}
