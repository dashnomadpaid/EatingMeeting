import { DBProfile, DBMessage, DBSlot } from './db';

export interface Profile extends DBProfile {
  photos?: Photo[];
  primaryPhoto?: Photo;
  distance?: number;
}

export interface Photo {
  id: string;
  user_id: string;
  url: string;
  is_primary: boolean;
  created_at: string;
}

export interface Thread {
  id: string;
  is_group: boolean;
  created_at: string;
  updated_at: string;
  participants: Profile[];
  lastMessage?: Message;
  unreadCount?: number;
}

export interface Message extends DBMessage {
  sender?: Profile;
}

export interface Slot extends DBSlot {
  proposer?: Profile;
}

export type SlotStatus = 'proposed' | 'accepted' | 'declined' | 'canceled';

export interface CommunityFilters {
  maxDistance: number;
  budget: ('low' | 'medium' | 'high')[];
  headcount: '1on1' | 'group' | 'any';
  dietTags: string[];
}

export interface PlaceFilters {
  category: string | null;
  budget: 'low' | 'medium' | 'high' | null;
  maxDistance: number;
  searchQuery: string;
}
