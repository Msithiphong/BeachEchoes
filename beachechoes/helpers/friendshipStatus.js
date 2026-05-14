export function resolveFriendshipStatus({ outgoingStatus, incomingStatus } = {}) {
  if (incomingStatus === 'pending') return 'incoming_request'
  if (outgoingStatus === 'accepted') return 'following'
  if (outgoingStatus === 'pending') return 'requested'
  if (outgoingStatus === 'declined') return 'declined'
  return 'none'
}
