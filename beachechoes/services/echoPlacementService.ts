import { API_BASE } from '../config/api';
import { getAuth } from 'firebase/auth';

type AREcho = {
  id: string;
  zone_id: string;
  apriltag_id: number;
  text: string;
  local_x: number;
  local_y: number;
  local_z: number;
  rotation_y: number;
  status: string;
  created_at: string;
  author_name?: string;
  author_avatar?: string;
};

type ZoneInfo = {
  id: string;
  name: string;
  campus_area: string;
  tag_id: number;
  tag_size_meters: number;
};

async function getAuthHeaders(): Promise<Record<string, string>> {
  const user = getAuth().currentUser;
  if (!user) throw new Error('Not authenticated');
  const token = await user.getIdToken();
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
}

/** Look up a zone by its AprilTag ID */
export async function fetchZoneByTag(tagId: number): Promise<ZoneInfo | null> {
  try {
    const res = await fetch(`${API_BASE}/zones/by-tag/${tagId}`);
    const data = await res.json();
    if (!data.success) return null;
    return data.zone;
  } catch (err) {
    console.error('[AR] fetchZoneByTag failed:', err);
    return null;
  }
}

/** Fetch all active AR echoes for a given tag */
export async function fetchEchoesByTag(tagId: number): Promise<AREcho[]> {
  try {
    const res = await fetch(`${API_BASE}/ar-echoes/by-tag/${tagId}`);
    const data = await res.json();
    if (!data.success) return [];
    return data.echoes;
  } catch (err) {
    console.error('[AR] fetchEchoesByTag failed:', err);
    return [];
  }
}

/** Save a new AR echo to the backend */
export async function saveEcho(params: {
  zoneId: string;
  apriltagId: number;
  text: string;
  localX: number;
  localY: number;
  localZ: number;
  rotationY: number;
}): Promise<AREcho | null> {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE}/ar-echoes`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        zone_id: params.zoneId,
        apriltag_id: params.apriltagId,
        text: params.text,
        local_x: params.localX,
        local_y: params.localY,
        local_z: params.localZ,
        rotation_y: params.rotationY,
      }),
    });
    const data = await res.json();
    if (!data.success) return null;
    return data.echo;
  } catch (err) {
    console.error('[AR] saveEcho failed:', err);
    return null;
  }
}

/** Soft-delete an AR echo */
export async function deleteEcho(echoId: string): Promise<boolean> {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE}/ar-echoes/${encodeURIComponent(echoId)}`, {
      method: 'DELETE',
      headers,
    });
    const data = await res.json();
    return data.success === true;
  } catch (err) {
    console.error('[AR] deleteEcho failed:', err);
    return false;
  }
}

export type { AREcho, ZoneInfo };
