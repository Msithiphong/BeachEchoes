import { resolveFriendshipStatus } from '../../helpers/friendshipStatus';

describe('resolveFriendshipStatus', () => {
  it('surfaces incoming pending requests before outgoing accepted relationships', () => {
    expect(resolveFriendshipStatus({
      outgoingStatus: 'accepted',
      incomingStatus: 'pending',
    })).toBe('incoming_request');
  });

  it('surfaces incoming pending requests before outgoing pending relationships', () => {
    expect(resolveFriendshipStatus({
      outgoingStatus: 'pending',
      incomingStatus: 'pending',
    })).toBe('incoming_request');
  });

  it('maps outgoing accepted relationships to following', () => {
    expect(resolveFriendshipStatus({
      outgoingStatus: 'accepted',
      incomingStatus: null,
    })).toBe('following');
  });

  it('maps outgoing pending relationships to requested', () => {
    expect(resolveFriendshipStatus({
      outgoingStatus: 'pending',
      incomingStatus: null,
    })).toBe('requested');
  });

  it('maps outgoing declined relationships to declined', () => {
    expect(resolveFriendshipStatus({
      outgoingStatus: 'declined',
      incomingStatus: null,
    })).toBe('declined');
  });

  it('returns none when neither direction is actionable', () => {
    expect(resolveFriendshipStatus({
      outgoingStatus: null,
      incomingStatus: 'accepted',
    })).toBe('none');
  });
});
