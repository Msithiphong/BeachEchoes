const { rest } = require('msw');

const API_BASE = 'http://localhost:3000';

/**
 * MSW Request Handlers for BeachEchoes Integration Tests
 * 
 * These handlers mock backend API responses for integration testing.
 * Override specific handlers in individual tests using server.use().
 */
const handlers = [
  // Auth endpoints
  rest.post(`${API_BASE}/api/users/sync`, (req, res, ctx) => {
    return res(ctx.json({
      success: true,
      user: {
        user_id: 1,
        firebase_uid: 'test-user-123',
        email: 'test@example.com',
        name: 'Test User',
        avatar_url: null,
      },
    }));
  }),

  // Posts endpoints
  rest.get(`${API_BASE}/api/posts/feed`, (req, res, ctx) => {
    return res(ctx.json({
      success: true,
      posts: [],
    }));
  }),

  rest.get(`${API_BASE}/api/posts/map`, (req, res, ctx) => {
    return res(ctx.json({
      success: true,
      posts: [],
    }));
  }),

  rest.get(`${API_BASE}/api/posts/detail`, (req, res, ctx) => {
    return res(ctx.json({
      success: true,
      posts: [],
    }));
  }),

  rest.get(`${API_BASE}/api/posts/user/:userId`, (req, res, ctx) => {
    return res(ctx.json({
      success: true,
      posts: [],
    }));
  }),

  rest.post(`${API_BASE}/api/posts`, (req, res, ctx) => {
    return res(ctx.json({
      success: true,
      post: {
        id: 1,
        image_url: 'https://example.com/image.jpg',
        overlay_text: 'Test post',
        map_x: 0.5,
        map_y: 0.5,
        like_count: 0,
        liked: false,
      },
    }));
  }),

  rest.post(`${API_BASE}/api/posts/:id/like`, (req, res, ctx) => {
    return res(ctx.json({
      success: true,
      liked: true,
      likeCount: 1,
    }));
  }),

  rest.post(`${API_BASE}/api/posts/:id/report`, (req, res, ctx) => {
    return res(ctx.json({
      success: true,
    }));
  }),

  rest.delete(`${API_BASE}/api/posts/:id`, (req, res, ctx) => {
    return res(ctx.json({
      success: true,
    }));
  }),

  // Comments endpoints
  rest.get(`${API_BASE}/api/posts/:id/comments`, (req, res, ctx) => {
    return res(ctx.json({
      success: true,
      comments: [],
    }));
  }),

  rest.post(`${API_BASE}/api/posts/:id/comments`, (req, res, ctx) => {
    return res(ctx.json({
      success: true,
      comment: {
        id: 1,
        post_id: 1,
        user_id: 1,
        username: 'Test User',
        content: 'Test comment',
        created_at: new Date().toISOString(),
        replies: [],
      },
    }));
  }),

  rest.put(`${API_BASE}/api/comments/:id`, (req, res, ctx) => {
    return res(ctx.json({
      success: true,
    }));
  }),

  rest.delete(`${API_BASE}/api/comments/:id`, (req, res, ctx) => {
    return res(ctx.json({
      success: true,
    }));
  }),

  // Friendships endpoints
  rest.get(`${API_BASE}/api/friendships/status/:friendUid`, (req, res, ctx) => {
    return res(ctx.json({
      success: true,
      status: 'none',
    }));
  }),

  rest.post(`${API_BASE}/api/friendships/follow`, (req, res, ctx) => {
    return res(ctx.json({
      success: true,
      status: 'following',
    }));
  }),

  rest.delete(`${API_BASE}/api/friendships/unfollow`, (req, res, ctx) => {
    return res(ctx.json({
      success: true,
    }));
  }),

  rest.put(`${API_BASE}/api/friendships/accept`, (req, res, ctx) => {
    return res(ctx.json({
      success: true,
    }));
  }),

  rest.put(`${API_BASE}/api/friendships/decline`, (req, res, ctx) => {
    return res(ctx.json({
      success: true,
    }));
  }),

  rest.get(`${API_BASE}/api/friendships/following/:firebaseUid`, (req, res, ctx) => {
    return res(ctx.json({
      success: true,
      following: [],
    }));
  }),

  rest.get(`${API_BASE}/api/friendships/followers/:firebaseUid`, (req, res, ctx) => {
    return res(ctx.json({
      success: true,
      followers: [],
    }));
  }),

  // Notifications endpoints
  rest.get(`${API_BASE}/api/notifications`, (req, res, ctx) => {
    return res(ctx.json({
      success: true,
      notifications: [],
    }));
  }),

  rest.post(`${API_BASE}/api/notifications/read`, (req, res, ctx) => {
    return res(ctx.json({
      success: true,
    }));
  }),

  // Profile endpoints
  rest.get(`${API_BASE}/profile/:firebaseUid`, (req, res, ctx) => {
    return res(ctx.json({
      success: true,
      profile: {
        id: 1,
        name: 'Test User',
        bio: '',
        avatar_url: null,
        echoes_count: 0,
        following_count: 0,
        followers_count: 0,
        profile_visibility: 'public',
      },
    }));
  }),

  rest.put(`${API_BASE}/api/profile/:userId`, (req, res, ctx) => {
    return res(ctx.json({
      success: true,
    }));
  }),

  rest.post(`${API_BASE}/api/profile/:userId/avatar`, (req, res, ctx) => {
    return res(ctx.json({
      success: true,
      avatar_url: 'https://example.com/avatar.jpg',
    }));
  }),

  // Leaderboard endpoint
  rest.get(`${API_BASE}/api/leaderboard`, (req, res, ctx) => {
    return res(ctx.json({
      success: true,
      data: [],
    }));
  }),

  // User search endpoint
  rest.get(`${API_BASE}/api/users/search`, (req, res, ctx) => {
    return res(ctx.json({
      success: true,
      users: [],
    }));
  }),
];

module.exports = { handlers };
