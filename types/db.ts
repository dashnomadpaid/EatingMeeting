export interface DBProfile {
  id: string;
  display_name: string;
  bio: string;
  diet_tags: string[];
  budget_range: string;
  time_slots: string[];
  approx_lat: number | null;
  approx_lng: number | null;
  push_token: string | null;
  created_at: string;
  updated_at: string;
}

export interface DBPhoto {
  id: string;
  user_id: string;
  url: string;
  is_primary: boolean;
  created_at: string;
}

export interface DBBlock {
  id: string;
  blocker_id: string;
  blocked_id: string;
  created_at: string;
}

export interface DBReport {
  id: string;
  reporter_id: string;
  target_user_id: string;
  reason: string;
  details: string;
  status: string;
  created_at: string;
}

export interface DBThread {
  id: string;
  is_group: boolean;
  created_at: string;
  updated_at: string;
}

export interface DBMember {
  id: string;
  thread_id: string;
  user_id: string;
  role: string;
  last_read: string;
  created_at: string;
}

export interface DBMessage {
  id: string;
  thread_id: string;
  sender_id: string;
  text: string | null;
  image_url: string | null;
  message_type: 'user' | 'system' | 'proposal';
  created_at: string;
}

export interface DBSlot {
  id: string;
  thread_id: string;
  place_name: string;
  place_category: string | null;
  place_address: string | null;
  proposer_id: string;
  starts_at: string;
  notes: string;
  status: 'proposed' | 'accepted' | 'declined' | 'canceled';
  created_at: string;
}
