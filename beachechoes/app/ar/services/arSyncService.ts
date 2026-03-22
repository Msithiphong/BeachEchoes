import {
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  collection,
  query,
  where,
  serverTimestamp,
  Unsubscribe,
} from 'firebase/firestore';
import { db } from '../../../config/firebase';

type ActiveUser = {
  uid: string;
  name: string;
  zoneId: string;
  tagId: number;
  joinedAt: unknown;
};

/**
 * Set the current user as present in a zone.
 * Creates/updates a Firestore doc at ar_sessions/{uid}.
 * This is ephemeral data — not canonical.
 */
export async function joinZonePresence(
  uid: string,
  name: string,
  zoneId: string,
  tagId: number
): Promise<void> {
  try {
    await setDoc(doc(db, 'ar_sessions', uid), {
      uid,
      name,
      zoneId,
      tagId,
      joinedAt: serverTimestamp(),
    });
  } catch (err) {
    console.error('[AR] joinZonePresence failed:', err);
  }
}

/**
 * Remove the current user's presence when leaving a zone or stopping AR.
 */
export async function leaveZonePresence(uid: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'ar_sessions', uid));
  } catch (err) {
    console.error('[AR] leaveZonePresence failed:', err);
  }
}

/**
 * Subscribe to active users in a specific zone.
 * Returns an unsubscribe function.
 */
export function onZonePresenceChanged(
  zoneId: string,
  callback: (users: ActiveUser[]) => void
): Unsubscribe {
  const q = query(
    collection(db, 'ar_sessions'),
    where('zoneId', '==', zoneId)
  );

  return onSnapshot(q, (snapshot) => {
    const users: ActiveUser[] = snapshot.docs.map((d) => d.data() as ActiveUser);
    callback(users);
  });
}

export type { ActiveUser };
