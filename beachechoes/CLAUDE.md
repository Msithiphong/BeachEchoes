# BeachEchoes AR Anchoring Implementation Guide for Claude

## Purpose
This file is the working engineering brief for implementing the **AprilTag-based AR anchoring feature** in BeachEchoes.

Claude must use this file as the source of truth when planning and implementing the feature.

**Primary instruction:** implement **one small milestone at a time**, not the entire system in one pass.

---

## Project Context
BeachEchoes is a CSU Long Beach–exclusive mobile AR social app. Students discover and place short location-based “echoes” on campus.

For this feature, the team has decided:
- Use **AprilTags** for deterministic shared anchoring.
- Each user **will scan the AprilTag** when entering a zone.
- Render **2D floating cards** first.
- Defer 3D objects/effects until later.
- Use **React Native + Expo development builds** instead of Expo Go.
- Use **custom native code** for AR.
- Use **Neon (Postgres)** for canonical relational data.
- Use **Firebase** for non-relational / mobile support concerns, but **not as the source of truth for core echo placement records**.

---

## Final Architecture Decision

### Client
- **React Native (Expo)**
- **TypeScript**
- **Expo development build**, not Expo Go
- **Custom Expo native module** using:
  - **Swift + ARKit** on iOS
  - **Kotlin + ARCore** on Android

### Native AR responsibilities
- Start and stop AR sessions
- Read camera/device pose
- Detect horizontal planes / floor
- Run AprilTag detection on camera frames
- Resolve tag pose into world space
- Convert saved local echo offsets into world positions
- Return anchor / tracking / plane events to JS

### Backend responsibilities
#### Neon (canonical relational system of record)
Use Neon for:
- users
- profiles
- campus zones
- AprilTag metadata
- echoes
- reactions
- moderation metadata
- expiration metadata
- audit/accountability records

#### Firebase (non-relational / mobile-adjacent)
Use Firebase selectively for:
- optional Firestore-based ephemeral mobile state
- optional presence / short-lived session status
- optional remote config / feature flags
- optional Crashlytics / analytics
- optional Firebase Storage if the project chooses Firebase for media instead of S3

### Important backend rule
**Do not dual-write core business entities into both Neon and Firebase.**

Canonical records for this AR feature must live in **Neon**.
Firebase can hold auxiliary or ephemeral data, but not the authoritative echo anchor state.

---

## Why This Architecture
This architecture is intentionally optimized for:
- deterministic shared anchoring in known campus zones
- a capstone-friendly implementation scope
- strong engineering justification
- future extensibility to 3D and richer AR later

### Rationale
- AprilTags are a practical way to get repeatable alignment for multiple users in the same physical area.
- ARKit and ARCore are the right layers for plane detection and tracking.
- Expo development builds allow custom native modules while keeping a productive React Native workflow.
- Bare React Native is not required unless native complexity grows significantly beyond this feature.
- Since every user will scan the AprilTag, we do **not** need to start with cloud-shared anchors.

---

## Non-Negotiable Constraints
Claude must follow all of these constraints.

### Scope constraints
1. Do **not** implement everything at once.
2. Do **not** skip ahead to later milestones until the current milestone is stable.
3. Do **not** introduce Unity.
4. Do **not** introduce Viro, 8th Wall, or another AR engine unless explicitly approved.
5. Do **not** replace native ARKit/ARCore with a generic camera library.
6. Do **not** build 3D object rendering in the initial milestone set.
7. Do **not** place canonical echo or anchor data in Firebase.
8. Do **not** over-engineer collaboration features that are out of MVP scope.

### Implementation constraints
1. Prefer **small, reversible changes**.
2. One milestone per implementation cycle.
3. One new subsystem at a time.
4. Do not refactor unrelated files.
5. Do not change backend data ownership rules without explicit approval.
6. Keep TypeScript, Swift, and Kotlin boundaries clean.
7. Keep public JS APIs minimal and stable.
8. Keep React Native UI simple until the native bridge is proven.
9. Use development builds, not Expo Go, for native functionality.
10. Assume the app must continue to support a map/list fallback even when AR is unavailable.

### Safety / reliability constraints
1. Never assume AprilTag detection is stable after a single frame.
2. Never persist anchor state without a known `zoneId` and `tagId`.
3. Never place content in world space without a valid floor/plane result or explicit fallback behavior.
4. Never hide native errors—surface them to logs.
5. Never repeat the same failed experiment without recording why it failed.

---

## Golden Rules for Claude During Implementation
1. **Implement one milestone at a time.**
2. Before coding, state which milestone is being implemented.
3. Before coding, list the exact files that will be changed.
4. After coding, summarize what changed.
5. After coding, summarize what remains deliberately unfinished.
6. When something fails, add it to the **Mistake Log** before trying a second approach.
7. Prefer a minimal working version first, then iterate.
8. If a dependency is uncertain, stub the integration point instead of inventing a fake implementation.
9. Do not fabricate AR APIs or Expo APIs.
10. If native linking details are missing, insert a clear TODO instead of guessing.

---

## Required Working Sequence
Claude should implement the feature in this order.
Do not jump ahead unless explicitly told to.

### Milestone 0 — Baseline audit
Goal:
- inspect the existing Expo/React Native project structure
- identify whether it already uses Expo Router, navigation, TypeScript, Firebase, and Neon backend client layers
- identify whether a custom module folder already exists

Deliverables:
- short architecture audit
- list of required setup changes
- no major feature code yet

### Milestone 1 — Development build + native module scaffolding
Goal:
- ensure the project can run as an Expo development build
- scaffold a custom native module
- expose no-op methods from native to JS

Deliverables:
- module folder created
- iOS Swift module skeleton
- Android Kotlin module skeleton
- TypeScript wrapper
- methods such as `startARSession()` and `stopARSession()` returning placeholder success

### Milestone 2 — Native AR session lifecycle
Goal:
- start/stop AR session successfully on each platform
- emit tracking state events to JS

Deliverables:
- iOS ARKit session manager
- Android ARCore session manager
- JS hook to subscribe to tracking state
- no AprilTag logic yet

### Milestone 3 — Plane detection / floor detection
Goal:
- detect horizontal planes
- expose floor or best-available horizontal surface state to JS

Deliverables:
- plane events
- status UI like “Searching for floor” / “Floor detected”
- no persistent placement yet

### Milestone 4 — AprilTag detection integration
Goal:
- integrate official AprilTag native library
- detect tag ID and pose from frames
- smooth pose across multiple frames

Deliverables:
- stable detection event containing `tagId`, transform, and confidence/stability metadata
- duplicate suppression for repeated same-tag detections

### Milestone 5 — Anchor resolution + local coordinate model
Goal:
- resolve the tag as the local zone anchor
- define conversions between local offsets and world pose

Deliverables:
- anchor manager
- local-to-world transform helper
- no backend persistence yet

### Milestone 6 — Floor-snapped echo placement
Goal:
- place 2D cards relative to tag anchor
- snap Y to floor plane

Deliverables:
- `placeEcho(...)` API
- world position result
- 2D AR card prototype on screen

### Milestone 7 — Neon persistence for anchor-relative echo data
Goal:
- persist anchor-relative echo coordinates in Neon
- fetch and render saved echoes after rescanning the same tag

Deliverables:
- schema and API contract for anchor-relative coordinates
- save / fetch flow
- explicit relational ownership

### Milestone 8 — Firebase auxiliary integration
Goal:
- add only the Firebase features that are actually needed
- keep Firebase non-canonical

Possible deliverables:
- ephemeral session presence
- remote config flags
- crash logging
- optional media/storage support

### Milestone 9 — Recalibration and fallback UX
Goal:
- handle tag lost / tracking degraded / floor unavailable states
- preserve map/list fallback

Deliverables:
- scan-again flow
- degraded tracking banner
- graceful fallback behavior

### Milestone 10 — Hardening
Goal:
- tighten errors, logging, tests, and edge-case handling

Deliverables:
- build checks
- logging cleanup
- mistake log review
- implementation notes for future 3D expansion

---

## File / Module Layout
Use this as the preferred target structure unless the existing codebase already has a better established pattern.

```text
beachechoes/
  app/
    ar/
      index.tsx
      components/
        EchoCardAR.tsx
        ScanPrompt.tsx
        TrackingBanner.tsx
      hooks/
        useARSession.ts
      state/
        anchorStore.ts
        placementStore.ts
      services/
        echoPlacementService.ts
        arSyncService.ts

  modules/
    beachechoes-ar/
      src/
        BeachEchoesAR.ts
        BeachEchoesAR.types.ts
      ios/
        BeachEchoesARModule.swift
        ARSessionManager.swift
        AprilTagBridge.mm
      android/
        BeachEchoesARModule.kt
        ARSessionManager.kt
        AprilTagBridge.cpp

  backend/
    neon/
    firebase/
```

---

## Recommended Public JS API
Keep the JS/native bridge intentionally small.

```ts
startARSession(zoneId: string): Promise<void>
stopARSession(): Promise<void>

onTrackingStateChanged(listener)
onPlaneStateChanged(listener)
onAprilTagDetected(listener)
onAnchorResolved(listener)

placeEcho(input: {
  tagId: number
  localOffset: { x: number; z: number }
  rotationY?: number
}): Promise<{
  worldPosition: { x: number; y: number; z: number }
  localPosition: { x: number; y: number; z: number }
  floorLocked: boolean
}>
```

Do not expand this API until the basic lifecycle is proven.

---

## Data Ownership Rules

### Neon owns
- `users`
- `profiles`
- `zones`
- `zone_apriltags`
- `echoes`
- `echo_reactions`
- `echo_reports`
- `echo_expirations`
- moderation metadata
- audit/accountability records

### Firebase may own
- session presence
- short-lived calibration telemetry
- optional document-style operational state
- analytics / crash reporting
- optional media metadata if needed by Firebase-side workflows

### Forbidden pattern
Do not store the same canonical echo position record in both Neon and Firestore.

---

## Suggested Relational Model for This Feature
Use Neon/Postgres as the source of truth.

```sql
zones (
  id uuid pk,
  name text not null,
  campus_area text,
  created_at timestamptz not null
)

zone_apriltags (
  id uuid pk,
  zone_id uuid not null references zones(id),
  tag_id integer not null unique,
  tag_size_meters numeric not null,
  description text,
  created_at timestamptz not null
)

echoes (
  id uuid pk,
  zone_id uuid not null references zones(id),
  apriltag_id integer not null,
  author_user_id uuid not null,
  text text not null,
  local_x numeric not null,
  local_y numeric not null,
  local_z numeric not null,
  rotation_y numeric,
  status text not null,
  expires_at timestamptz,
  created_at timestamptz not null
)
```

### Important note
Persist **local coordinates relative to the AprilTag anchor**, not absolute world coordinates and not raw GPS for precise placement.

---

## Placement Model

### Reference frame
Each zone has one or more AprilTags.
When a user scans a tag:
1. native layer detects the tag
2. native layer computes tag pose in AR world coordinates
3. the tag becomes the local spatial reference
4. floor plane is detected
5. the echo card is placed using local offset from the tag and floor-snapped Y

### Placement formula
Conceptually:

```text
worldPose = tagAnchorPose × localOffset
worldY = floorPlaneY + localYOffset
```

### Initial simplification
For MVP:
- allow placement on floor only
- local X/Z are user-facing placement controls
- Y should be floor-snapped unless there is a strong reason not to

---

## React Native vs Native Responsibilities

### React Native / TypeScript
Use for:
- screens
- prompts
- state management
- backend calls
- rendering 2D cards from resolved pose data
- non-AR fallback UI

### Swift / Kotlin
Use for:
- AR session lifecycle
- frame access
- plane detection
- AprilTag detection integration
- pose smoothing
- anchor resolution
- world/local transform helpers if native timing requires it

### Shared C/C++ layer
Use for:
- AprilTag detector integration where practical

Do not move unrelated business logic into native code.

---

## What Not To Build Yet
Do not implement these in the early milestones:
- full 3D echo meshes
- particle effects / ghost mode visuals
- cloud-shared anchors
- multi-user collaborative AR sessions
- advanced recommendation systems
- heavy moderation workflows tied directly into the AR pipeline
- polished campus-wide content discovery optimization

These are later features.

---

## Error Prevention Rules
Claude must actively avoid these common mistakes:

1. **Do not assume Expo Go can run custom native AR code.**
2. **Do not use a generic camera module as a replacement for ARKit/ARCore.**
3. **Do not store unstable one-frame tag detections as resolved anchors.**
4. **Do not persist absolute AR world coordinates as the canonical database record.**
5. **Do not put core echo placement state in Firebase.**
6. **Do not create a giant bridge API before the session lifecycle works.**
7. **Do not build visual polish before proving tracking, plane detection, and placement.**
8. **Do not change multiple architecture layers in one implementation pass unless absolutely necessary.**
9. **Do not hide TODOs for native linking or platform-specific unknowns.**
10. **Do not repeat a failed approach without first writing it into the Mistake Log.**

---

## Mistake Log Protocol
Claude must maintain a running mistake log during implementation.
The point is to capture failed assumptions and avoid repeating them.

### Rules
- Every failed build, failed integration, bad assumption, or reverted approach must be logged.
- Before retrying a failed approach, Claude must check the mistake log.
- If the same mistake would be repeated, Claude must choose a different approach.

### Template
Use this exact structure:

```md
## Mistake Log

### [Date] Mistake Title
- Milestone:
- Files involved:
- What was attempted:
- What failed:
- Root cause:
- Fix applied:
- Rule to avoid repetition:
```

### Example
```md
### 2026-03-21 ARCore session started before permission flow completed
- Milestone: 2
- Files involved: ARSessionManager.kt, useARSession.ts
- What was attempted: Start native AR session immediately on screen mount.
- What failed: Session init failed on first launch when camera permission was unresolved.
- Root cause: Permission state was not guaranteed before AR session creation.
- Fix applied: Gate session startup behind confirmed permission result.
- Rule to avoid repetition: Never initialize native AR session until permission state is confirmed.
```

---

## Implementation Output Format Claude Must Follow
For every implementation cycle, Claude should respond using this structure:

```md
### Current milestone

### Goal of this step

### Files to change
- ...

### Planned changes
- ...

### Constraints checked
- ...

### After implementation
- What changed
- What is still intentionally not implemented
- New TODOs
- Mistake log additions (if any)
```

This keeps work incremental and auditable.

---

## Testing Priorities
Prioritize tests and checks in this order:

1. project still builds after module scaffolding
2. native methods are callable from JS
3. AR session starts and stops without crashing
4. plane/floor detection event reaches JS
5. tag detection event reaches JS
6. anchor becomes stable only after repeated frames
7. placed card stays stable enough for MVP
8. stored local offset reloads correctly after rescanning same tag

---

## Product Guardrails
BeachEchoes is a campus social AR app, not a general AR engine.
Implementation decisions should optimize for:
- campus zone reliability
- understandable user flow
- stable demos
- capstone feasibility
- future maintainability

If a design is technically impressive but makes the MVP harder to finish, do not choose it.

---

## Current Recommended Starting Point
**Start with Milestone 0, then Milestone 1.**

Do not start with AprilTag math.
Do not start with 2D card rendering.
Do not start with backend persistence.

The first job is to confirm the app can support a custom native AR module cleanly.

---

## Official Reference Snapshot
These references informed the architecture and should be re-checked during implementation if needed.

- Expo development builds: Expo documents development builds as the path for production-grade Expo apps with custom native code.
- Expo Modules API: Expo documents custom native modules in Swift and Kotlin.
- React Native without a framework: React Native documents the bare workflow separately from framework-based setups.
- ARKit `ARWorldTrackingConfiguration`: Apple documents world tracking and plane detection support.
- ARKit plane tracking: Apple documents plane detection / plane anchor updates.
- ARCore anchors and planes: Google documents anchors created from trackables such as planes and exposes session/frame/anchor APIs.
- Official AprilTag library: AprilRobotics maintains the official AprilTag detector and pose estimation support.
- Neon docs: Neon documents direct and pooled Postgres connections and branching.
- Firebase Firestore docs: Firebase documents Firestore as a scalable NoSQL document database.

### Source links
- https://docs.expo.dev/develop/development-builds/introduction/
- https://docs.expo.dev/workflow/customizing/
- https://docs.expo.dev/modules/overview/
- https://docs.expo.dev/modules/get-started/
- https://reactnative.dev/docs/getting-started-without-a-framework
- https://reactnative.dev/docs/getting-started
- https://developer.apple.com/documentation/arkit/arworldtrackingconfiguration
- https://developer.apple.com/documentation/arkit/tracking-and-visualizing-planes
- https://developers.google.com/ar/develop/anchors
- https://developers.google.com/ar/reference/java/com/google/ar/core/session
- https://developers.google.com/ar/reference/java/com/google/ar/core/anchor
- https://github.com/AprilRobotics/apriltag
- https://neon.com/docs/get-started/connect-neon
- https://neon.com/docs/introduction/branching
- https://firebase.google.com/docs/firestore
- https://firebase.google.com/docs/firestore/data-model

---

## Final Instruction to Claude
Do not try to be clever by generating the full feature in one pass.
Be disciplined.
Be incremental.
Use the mistake log.
Preserve architecture boundaries.
Get the native module foundation working first.

---

## Mistake Log

### 2026-03-22 AnchorManager.swift not found by Xcode after creation
- Milestone: 5
- Files involved: modules/beachechoes-ar/ios/AnchorManager.swift, BeachEchoesAR.podspec
- What was attempted: Created AnchorManager.swift and ran `xcodebuild` without `pod install`.
- What failed: BUILD FAILED — Xcode could not find AnchorManager.swift because CocoaPods had cached the old file list.
- Root cause: CocoaPods resolves source file globs at `pod install` time. New .swift files are invisible to the Xcode project until pods are reinstalled.
- Fix applied: Ran `cd ios && pod install` to regenerate the Pods project, then build succeeded.
- Rule to avoid repetition: Always run `pod install` after adding or removing files in the native module's iOS directory.

### 2026-03-25 Local native validation assumed full toolchain availability
- Milestone: 2B
- Files involved: ios/beachechoes.xcworkspace, ios/beachechoes.xcodeproj, android/gradlew
- What was attempted: Ran local native build commands to validate Camera.js AR startup in dev-client conditions.
- What failed: Android validation stopped immediately because no Java runtime is installed in this shell. iOS project-level validation reached app compilation but did not provide end-to-end AR startup validation in this environment.
- Root cause: The local shell does not currently provide the full Android/Simulator toolchain needed for complete native runtime validation.
- Fix applied: Limited code changes to safe startup hardening and documented that final iOS/Android confirmation still requires a real dev client.
- Rule to avoid repetition: Confirm Java and simulator services are available before treating shell-native builds as full AR runtime validation.

---

## Implementation Notes for Future 3D Expansion

### Current state (Milestones 0–10 complete)
The AR feature renders **2D floating cards** (`EchoCardAR.tsx`) positioned via React Native absolute styling using projected screen coordinates. All placement math uses **local offsets** relative to the AprilTag anchor, persisted in Neon as `(local_x, local_y, local_z, rotation_y)`.

### What would change for 3D

1. **Rendering pipeline**: Replace the 2D `<View>`-based `EchoCardAR` with a native 3D rendering layer. Options:
   - **SceneKit** (iOS) / **Sceneform or Filament** (Android) — add SCNNode/Renderable placement inside the native AR session manager.
   - **react-native-filament** — cross-platform option if it matures; would sit alongside the existing native module.
   - The native module would need a new `addEchoToScene(echoId, localX, localY, localZ, rotationY, model)` function instead of returning world coordinates to JS for overlay positioning.

2. **Data model**: No schema changes needed. `local_x/y/z` and `rotation_y` already describe the placement. Add optional columns for `model_type`, `scale`, or `animation` if echo types diversify.

3. **Coordinate transforms**: `AnchorManager.localToWorld()` already produces correct 4×4 world-space transforms. The same math feeds a SceneKit/Sceneform node transform.

4. **Floor snapping**: `floorPlaneY` is already tracked. For 3D objects that need ground contact, snap the world Y the same way `placeEcho()` does today.

5. **Occlusion / depth**: ARKit supports `ARWorldTrackingConfiguration().frameSemantics = .sceneDepth` (LiDAR devices). ARCore supports Depth API. These are additive config changes in `ARSessionManager`.

6. **Performance budget**: AprilTag detection already runs every 3rd frame on a background pixel buffer. 3D rendering adds GPU load. Consider reducing detection frequency or disabling it after anchor resolution.

7. **Module API expansion**: Keep the JS bridge minimal. Batch 3D scene updates natively rather than sending per-frame transforms through the bridge.

### Files to modify
- `ARSessionManager.swift` / `.kt` — add SceneKit/Sceneform scene setup
- `BeachEchoesARModule.swift` / `.kt` — expose `addEchoToScene`, `removeEchoFromScene`
- `BeachEchoesARModule.ts` — add corresponding TS wrappers
- `EchoCardAR.tsx` — retire or keep as fallback for non-3D devices



You are implementing the next BeachEchoes AR milestone.

## Current milestone
Milestone 2A — Camera.js AR session startup screen

## Goal of this step
Implement the `Camera.js` screen in the Expo development-build app so that navigating to this screen starts the AR session through the existing public JS bridge API:

`startARSession(zoneId: string): Promise<void>`

This step is only about AR session startup UX and lifecycle handling on the React Native side.
Do not implement any later AR features.

---

## Source of truth
Follow the architecture and implementation discipline defined in `CLAUDE.md`.

In particular:
- implement only this milestone
- keep changes small and reversible
- do not refactor unrelated files
- do not invent APIs that are not already present
- if something fails and you try another approach, add a Mistake Log entry first

---

## Required behavior
The `Camera.js` screen must:

1. Start the AR session when the screen becomes active.
2. Call the public JS API only:
   - `startARSession(zoneId: string)`
3. Handle and surface all startup failure modes, including:
   - camera permission denied
   - native bridge/module unavailable
   - native startup failure
   - unexpected JS exceptions
4. Display clear UI states for:
   - idle/initializing
   - loading / starting AR session
   - success / AR session active
   - failure / visible error message
5. Log all failures to the console with:
   - full error object
   - stack trace if available
   - useful context such as `zoneId`, screen name, and lifecycle stage
6. Use React hooks correctly:
   - hooks only at the top level
   - no conditional hook calls
7. Keep business logic out of this milestone.
8. Be safe on remount/unmount:
   - avoid duplicate startup calls from rerenders
   - prevent state updates after unmount
   - add TODOs rather than guessing if stop/cleanup API details are missing

---

## Hard constraints
Do **not** do any of the following in this milestone:

- do not implement echo placement
- do not implement AprilTag detection
- do not implement plane detection UI beyond simple AR startup state
- do not persist anchor data
- do not persist echo data
- do not add backend calls
- do not add Firebase or Neon logic
- do not refactor unrelated files
- do not expand the public bridge API unless absolutely necessary
- do not introduce new dependencies unless required for AR session startup
- do not assume Expo Go support; this runs in an Expo development build with the native AR module available

---

## Error logging protocol
Every failure must be handled in **all three** places:

### 1. User-visible UI
Show a visible, human-readable error state on screen.

### 2. Console logging
Log the failure with rich context. Use a structured log shape like:

```ts
console.error("[CameraScreen] Failed to start AR session", {
  zoneId,
  stage: "startARSession",
  error,
  stack: error instanceof Error ? error.stack : undefined,
});

You are implementing the next BeachEchoes AR milestone.

## Current milestone
Milestone 2B — Native dev-client validation for Camera.js AR session startup

## Goal of this step
Validate that the existing `Camera.js` AR startup flow works in an Expo development build on iOS and Android, and make only the smallest fixes required to get AR session startup working reliably in native runtime conditions.

This milestone is **not** about adding new AR features. It is only about verifying and stabilizing the already-implemented startup path in a real dev client.

---

## Current known state
Already completed:
- `Camera.js` starts the AR session through the public JS API
- loading, success, and error UI states exist
- error logging is implemented
- `eslint` passed for:
  - `app/(tabs)/Camera.js`
  - `modules/beachechoes-ar/src/BeachEchoesARModule.ts`

Current limitation:
- the flow has **not** yet been validated on-device in a development build
- native AR startup still needs confirmation on iOS and Android

Deliberately unfinished and **out of scope** for this milestone:
- real zone selection instead of the temporary fallback `zoneId`
- any AR camera/rendering surface
- tracking UI
- plane detection UI
- AprilTag detection
- anchor persistence
- echo placement
- backend calls

---

## Source of truth
Follow the architecture and implementation discipline defined in `CLAUDE.md`.

In particular:
- work incrementally
- do not drift into later milestones
- do not refactor unrelated files
- if an attempted fix fails and you try another approach, add a Mistake Log entry first

---

## Required objectives
This milestone must:

1. Validate AR session startup in a real Expo development build.
2. Confirm whether the public JS bridge call succeeds on:
   - iOS dev client
   - Android dev client, if supported by the native module
3. Identify and fix only startup-related issues discovered during validation.
4. Preserve clear UI feedback for:
   - starting
   - success
   - failure
5. Preserve full error logging with stack trace and startup context.
6. Document exactly what was verified, what worked, and what remains unverified.

---

## Hard constraints
Do **not** do any of the following in this milestone:

- do not implement real zone selection
- do not add AR rendering or camera overlays beyond what is required for startup validation
- do not add plane detection or tracking UX
- do not add AprilTag logic
- do not add anchor saving
- do not add echo placement
- do not add backend persistence
- do not refactor unrelated screens or modules
- do not expand the feature beyond startup validation and startup bug fixes
- do not silently change public APIs unless absolutely required

---

## Allowed scope of code changes
You may only change the minimum files needed to validate and stabilize startup, such as:

- `app/(tabs)/Camera.js`
- `modules/beachechoes-ar/src/BeachEchoesARModule.ts`
- direct native module files only if required to fix AR startup in dev-client runtime
- `CLAUDE.md` for TODO / Mistake Log / milestone notes

Do not change unrelated navigation, backend, persistence, or future AR feature files.

---

## Validation expectations
Perform grounded validation steps for the current implementation.

Expected checks include:
- app launches in Expo development build
- navigating to `Camera.js` triggers AR session startup once
- permission behavior is correct
- native module is present and callable
- startup success and failure paths behave as expected
- logs are useful when startup fails
- no duplicate startup from rerenders/focus issues

If platform support differs:
- document the difference clearly
- keep fixes scoped to startup compatibility only

If native runtime testing cannot be fully executed in the current environment:
- inspect the code path carefully
- make only safe startup-related fixes
- clearly report what still requires physical simulator/device validation

---

## Error logging protocol
Every failure must still be handled in all three places:

### 1. User-visible UI
Show a visible error message.

### 2. Console logging
Log full context, including:
- platform
- `zoneId`
- lifecycle stage
- raw error
- stack trace if available

Use a structured shape like:

```ts
console.error("[CameraScreen] Failed to start AR session", {
  platform: Platform.OS,
  zoneId,
  stage: "startARSession",
  error,
  stack: error instanceof Error ? error.stack : undefined,
});


Absolutely — here’s the **next prompt** that continues cleanly from your 2B result.

This one is for the **actual runtime validation milestone**, where the agent should use a real Expo dev client / simulator / hardware and only fix **startup-path issues** discovered during live validation.

````md
You are implementing the next BeachEchoes AR milestone.

## Current milestone
Milestone 2C — Real dev-client runtime validation for Camera.js AR session startup

## Goal of this step
Run the already-implemented `Camera.js` AR session startup flow in a real Expo development build and validate the behavior end-to-end on supported runtime targets.

This milestone is only for **real runtime validation and minimal startup-only fixes**.

Do not add new AR features.

---

## Current known state
Already completed:
- `Camera.js` starts the AR session through the public JS API
- loading / success / error UI states exist
- startup failures are logged with structured context
- platform is included in startup failure logs
- Android startup messaging was hardened for ARCore-related failure modes
- a Mistake Log entry already documents that shell-only validation was incomplete

Verified so far:
- `npx eslint 'app/(tabs)/Camera.js' 'modules/beachechoes-ar/src/BeachEchoesARModule.ts'` passed
- iOS native compilation progressed far enough that no AR module compile error was surfaced before unrelated app-level build failure

Not yet verified:
- real iOS dev-client runtime startup
- real Android dev-client runtime startup
- permission flow in runtime
- single startup behavior on screen focus
- native success/failure behavior end-to-end

Still intentionally deferred:
- real zone selection instead of fallback `zoneId`
- AR rendering / camera overlay
- tracking UI
- plane detection UI
- AprilTag detection
- anchors
- persistence
- echo placement
- backend flows

---

## Source of truth
Follow `CLAUDE.md` exactly.

In particular:
- stay incremental
- do not drift into later milestones
- do not refactor unrelated files
- if a fix fails and you try another approach, add a Mistake Log entry first

---

## Primary objective
Validate the `Camera.js` startup path on actual runtime targets and make only the smallest fixes needed for reliable startup.

This includes:
1. launching the app in a real Expo development build
2. navigating to `Camera.js`
3. confirming the AR startup attempt occurs once per screen entry
4. observing loading, success, and failure states
5. validating permission handling
6. validating native module availability
7. capturing logs for both success and failure behavior
8. applying only startup-path fixes if runtime issues are discovered

---

## Runtime validation targets
Test as many of these as are actually available:

### iOS
- iOS simulator if supported by the native setup
- physical iPhone preferred if AR support requires hardware

### Android
- Android physical device preferred for ARCore validation
- emulator only if it is already configured and useful for startup-path checks

If a target is unavailable, say so explicitly and do not fake validation.

---

## Validation checklist
Use this checklist and report each item as:
- Verified
- Failed
- Blocked
- Not applicable

### Navigation / lifecycle
- App launches in Expo dev client
- Navigating to `Camera.js` triggers startup
- Startup happens once per screen entry
- Rerenders do not cause duplicate startup attempts
- Leaving and re-entering the screen behaves predictably

### Permission behavior
- Camera permission prompt appears when needed
- Permission denial produces visible error UI
- Permission denial is logged with structured context
- Granting permission allows startup to continue

### Native module behavior
- JS bridge is available in runtime
- `startARSession(zoneId)` is callable
- Startup success state appears when native startup succeeds
- Failure state appears when native startup fails
- Native failure messages are understandable and specific

### Platform-specific behavior
- iOS behavior documented clearly
- Android behavior documented clearly
- ARCore-specific failures documented clearly if they occur

### Logging / diagnostics
- Structured console error logs include platform
- Logs include `zoneId`, lifecycle stage, raw error, and stack when available
- Runtime findings are documented without guessing

---

## Allowed scope of code changes
Only change the minimum required files if runtime findings justify it.

Expected allowed files:
- `app/(tabs)/Camera.js`
- `modules/beachechoes-ar/src/BeachEchoesARModule.ts`
- Android/iOS native AR startup files only if required to fix startup-path issues
- `CLAUDE.md` for TODO / Mistake Log / validation notes

Do not change unrelated screens, navigation, backend files, persistence, or future AR feature files.

---

## Hard constraints
Do **not** do any of the following in this milestone:

- do not implement real zone selection
- do not add AR rendering or camera overlay
- do not add tracking UI
- do not add plane detection UI
- do not add AprilTag logic
- do not add anchor logic
- do not add persistence
- do not add echo placement
- do not add backend calls
- do not broaden the public bridge API unless absolutely required for startup correctness
- do not refactor unrelated files
- do not solve general environment/toolchain setup beyond what is necessary to run this milestone

---

## Startup-fix rules
Only make fixes that are directly tied to runtime startup validation.

Examples of acceptable fixes:
- duplicate startup prevention
- permission-state handling
- clearer user-visible startup errors
- native startup failure mapping
- bridge availability checks
- focus/remount safety
- platform guard corrections

Examples of unacceptable drift:
- adding an AR camera view
- adding rendering surfaces
- adding session interaction UI
- adding tag detection
- adding zone selection UX
- reorganizing app architecture

---

## Error logging protocol
Every runtime failure must still be handled in all three places:

### 1. User-visible UI
Show a clear visible failure message.

### 2. Console logging
Preserve structured logs like:

```ts
console.error("[CameraScreen] Failed to start AR session", {
  platform: Platform.OS,
  zoneId,
  stage: "startARSession",
  error,
  stack: error instanceof Error ? error.stack : undefined,
});
````

### 3. Mistake Log

If a failed fix is retried with a different approach, add a Mistake Log entry first.

---

## Before coding: required response format

Respond in exactly this structure before making changes:

### Current milestone

Milestone 2C — Real dev-client runtime validation for Camera.js AR session startup

### Goal of this step

[brief statement]

### Runtime targets available

* ...
* ...

### Files to inspect

* ...
* ...

### Files to change

* ...
  or
* None yet; validating first

### Planned validation steps

* ...
* ...
* ...

### Constraints checked

* ...
* ...
* ...

If a target is unavailable, state that clearly up front.

---

## After coding: required response format

After validation and any startup-only fixes, respond in exactly this structure:

### After implementation

#### What changed

* ...

#### Runtime validation results

##### iOS

* [Verified / Failed / Blocked / Not applicable] ...
* ...

##### Android

* [Verified / Failed / Blocked / Not applicable] ...
* ...

#### Startup checklist results

* ...
* ...

#### What is still unverified

* ...
* ...

#### What is intentionally not implemented

* ...
* ...
* ...

#### New TODOs

* ...

#### Mistake log additions

* None
  or
* [entry summary]

#### Notes

* clearly distinguish real runtime validation from shell/static validation
* list any platform-specific findings
* list any assumptions made
* be honest about blockers
* state whether startup is now considered validated on iOS, Android, both, or neither

---

## Success criteria

This milestone is successful if:

1. the AR startup path is validated on at least one real runtime target
2. any fixes made are limited strictly to startup-path issues
3. permission and failure behavior are observed and documented
4. structured logging remains intact
5. no later AR features are added
6. the result clearly distinguishes:

   * verified
   * failed
   * blocked
   * deferred

Implement this milestone only.

```

If you want, I can also make the **next prompt after this** for **Milestone 3A — real zoneId selection instead of the fallback zoneId**, so the sequence stays clean.
```
