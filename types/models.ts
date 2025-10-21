import { DBProfile, DBMessage, DBSlot, DBGathering, DBGatheringParticipant } from './db';

export interface Profile extends DBProfile {
  photos?: Photo[];
  primaryPhoto?: Photo;
  distance?: number;
}

export interface Photo {
  id: string;
  user_id: string;
  url: string | number;  // string (URL) 또는 number (require()로 불러온 로컬 이미지)
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

export interface Gathering extends DBGathering {
  host?: Profile;
  participants?: GatheringParticipant[];
  participantProfiles?: Profile[];
  thread?: Thread;
}

export interface GatheringParticipant extends DBGatheringParticipant {
  user?: Profile;
}

export type GatheringStatus = 'open' | 'closed' | 'completed' | 'cancelled';

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
