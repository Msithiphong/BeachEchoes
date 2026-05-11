# BeachEchoes

Canonical local setup guide for a new developer.

This README is the main onboarding document for getting the full local stack running:

- Redis
- `server.js` backend
- Expo frontend

All app commands below run from `beachechoes/`.

## Prerequisites

Install these before you start:

- Node.js and npm
- Redis
- Xcode and iOS Simulator for the default local mobile workflow

Important Node note:

- this repo has previously hit Expo and ESLint tooling issues on Node `v24.12.0`
- if local JS tooling fails inside dependency internals, switch to an Expo-supported LTS Node version first

## Secure Local Config

You need two local-only files that are intentionally gitignored:

- `beachechoes/.env`
- `beachechoes/serviceAccountKey.json`

Get both from your team or other approved secure source. Do not commit them.

Required environment variable names used by the app:

- `DATABASE_URL`
- `FIREBASE_STORAGE_BUCKET`
- `EXPO_PUBLIC_FIREBASE_API_KEY`
- `EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `EXPO_PUBLIC_FIREBASE_APP_ID`

Other env vars currently used in local development are optional, mostly for test accounts and debug flags:

- `EXPO_PUBLIC_TEST_USER_A_EMAIL`
- `EXPO_PUBLIC_TEST_USER_A_PASSWORD`
- `EXPO_PUBLIC_TEST_USER_B_EMAIL`
- `EXPO_PUBLIC_TEST_USER_B_PASSWORD`
- `EXPO_PUBLIC_SHOW_ADMIN_TEST_BUTTONS`
- `EXPO_PUBLIC_DEBUG_SHOW_CAMPUS_POLYGON`
- `EXPO_PUBLIC_DEBUG_SHOW_COORDINATES`
- `EXPO_PUBLIC_DEBUG_GPS`
- `EXPO_PUBLIC_DEBUG_IMAGECARD`

## Install Dependencies

From the repo root:

```bash
cd beachechoes
npm install
```

## Start Redis

Redis is part of the recommended full local stack.

The backend reads:

- `REDIS_URL`

If `REDIS_URL` is not set, it defaults to:

```txt
redis://localhost:6379
```

The backend is designed to continue running without Redis caching if Redis is unavailable, but a new developer should still start Redis so the local stack matches production behavior more closely.

### macOS / Homebrew

If Redis is already installed with Homebrew:

```bash
brew services start redis
```

To confirm it is up:

```bash
redis-cli ping
```

Expected output:

```txt
PONG
```

### Docker Alternative

If you do not want a local Homebrew install:

```bash
docker run --name beachechoes-redis -p 6379:6379 redis:7
```

If you already created the container earlier:

```bash
docker start beachechoes-redis
```

## Start the Backend

Open a terminal:

```bash
cd beachechoes
node server.js
```

Expected startup log includes:

```txt
Server running on http://localhost:3000
```

If Redis is healthy, you should also see logs like:

- `Redis client connected`
- `Redis initialized successfully`

If Redis is not available, the backend should still stay up and log a graceful fallback message such as:

- `Failed to initialize Redis: ...`
- `Server will continue without caching`

## Start the Frontend

Open a second terminal:

```bash
cd beachechoes
npm start
```

You can also use:

```bash
npx expo start
```

For the default iOS workflow:

- open iOS Simulator from the Expo CLI
- or press `i` in the Expo terminal if that option is available

## Recommended Local Startup Order

1. Start Redis.
2. Start the backend with `node server.js`.
3. Start the frontend with `npm start`.
4. Open the app in iOS Simulator.

## Verify Your Local Environment

### Backend Health

With the backend running, open:

```txt
http://localhost:3000/api/debug/db-status
```

You should get a JSON response showing database connection details and debug status instead of a crash or HTML error page.

### Frontend Health

Confirm the Expo app boots and the start/login flow renders in Simulator.

After login, confirm the app can load screens that depend on backend data, such as:

- Dashboard
- Profile
- Map

## Troubleshooting

### Redis Issues

If Redis is down:

- the backend should still start
- caching will be disabled
- check whether `REDIS_URL` is set incorrectly
- verify local Redis is listening on `localhost:6379`

### Firebase Admin Credential Issues

If uploads or Firebase-admin-backed backend features fail with credential errors such as invalid JWT signature:

- the likely cause is an invalid or expired `beachechoes/serviceAccountKey.json`
- replace it with a valid service account key from your secure team source
- restart `node server.js`

### Expo / Node Tooling Issues

If Expo, linting, or other JS tooling crashes inside dependencies before it reads project files:

- check `node -v`
- prefer an Expo-supported LTS Node release over Node `v24.12.0`

### Missing Local Secret Files

If the backend fails at startup or the app cannot talk to Firebase:

- confirm `beachechoes/.env` exists
- confirm `beachechoes/serviceAccountKey.json` exists
- confirm the required env variable names listed above are present

### Expo Go / Native Feature Caution

For general frontend work, Expo tooling is usually enough to get started quickly. If you run into native-runtime-specific behavior, prefer the iOS Simulator or a development build rather than assuming Expo Go will behave the same way in every case.
