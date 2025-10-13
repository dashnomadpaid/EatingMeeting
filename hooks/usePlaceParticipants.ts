import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Profile, Slot, Photo } from '@/types/models';
import { useAuthStore } from '@/state/auth.store';

const STATUS_PRIORITY: Record<Slot['status'], number> = {
  accepted: 0,
  proposed: 1,
  declined: 2,
  canceled: 3,
};

export interface PlaceParticipant {
  profile: Profile;
  status: Slot['status'];
  threadId: string;
}

interface SupabaseSlot {
  id: string;
  thread_id: string;
  status: Slot['status'];
  place_name: string;
}

interface SupabaseMember {
  thread_id: string;
  user_id: string;
}

export function usePlaceParticipants(placeName?: string | null) {
  const session = useAuthStore((state) => state.session);
  const [participants, setParticipants] = useState<PlaceParticipant[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!placeName) {
      setParticipants([]);
      setError(null);
      return;
    }

    let disposed = false;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data: slotsData, error: slotsError } = await supabase
          .from('slots')
          .select('id, thread_id, status, place_name')
          .eq('place_name', placeName)
          .neq('status', 'canceled');

        if (slotsError) throw slotsError;
        if (!slotsData || slotsData.length === 0) {
          if (!disposed) {
            setParticipants([]);
          }
          return;
        }

        const threadIds = Array.from(new Set(slotsData.map((slot) => slot.thread_id)));
        if (!threadIds.length) {
          if (!disposed) setParticipants([]);
          return;
        }

        const { data: membersData, error: membersError } = await supabase
          .from('members')
          .select('thread_id, user_id')
          .in('thread_id', threadIds);

        if (membersError) throw membersError;
        if (!membersData || membersData.length === 0) {
          if (!disposed) setParticipants([]);
          return;
        }

        const currentUserId = session?.user?.id;
        const uniqueUserIds = Array.from(
          new Set(
            membersData
              .map((member) => member.user_id)
              .filter((userId) => userId && userId !== currentUserId),
          ),
        );

        if (!uniqueUserIds.length) {
          if (!disposed) setParticipants([]);
          return;
        }

        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('*')
          .in('id', uniqueUserIds);

        if (profilesError) throw profilesError;

        const { data: photosData, error: photosError } = await supabase
          .from('photos')
          .select('*')
          .in('user_id', uniqueUserIds);

        if (photosError) throw photosError;

        const photosByUser = new Map<string, Photo[]>();
        (photosData ?? []).forEach((photo) => {
          const bucket = photosByUser.get(photo.user_id);
          if (bucket) {
            bucket.push(photo as Photo);
          } else {
            photosByUser.set(photo.user_id, [photo as Photo]);
          }
        });

        const profileById = new Map<string, Profile>();
        (profilesData ?? []).forEach((profile) => {
          const photoList = photosByUser.get(profile.id) ?? [];
          profileById.set(profile.id, {
            ...(profile as Profile),
            photos: photoList,
            primaryPhoto: photoList.find((p) => p.is_primary) || photoList[0],
          });
        });

        const slotByThread = new Map<string, SupabaseSlot>();
        (slotsData as SupabaseSlot[]).forEach((slot) => {
          const existing = slotByThread.get(slot.thread_id);
          if (!existing || STATUS_PRIORITY[slot.status] < STATUS_PRIORITY[existing.status]) {
            slotByThread.set(slot.thread_id, slot);
          }
        });

        const participantMap = new Map<string, PlaceParticipant>();
        (membersData as SupabaseMember[]).forEach((member) => {
          if (currentUserId && member.user_id === currentUserId) return;
          const profile = profileById.get(member.user_id);
          if (!profile) return;
          const slot = slotByThread.get(member.thread_id);
          if (!slot) return;
          const existing = participantMap.get(profile.id);
          if (!existing || STATUS_PRIORITY[slot.status] < STATUS_PRIORITY[existing.status]) {
            participantMap.set(profile.id, {
              profile,
              status: slot.status,
              threadId: member.thread_id,
            });
          }
        });

        if (!disposed) {
          setParticipants(
            Array.from(participantMap.values()).sort(
              (a, b) => STATUS_PRIORITY[a.status] - STATUS_PRIORITY[b.status],
            ),
          );
        }
      } catch (err) {
        if (!disposed) {
          setError((err as Error)?.message ?? '알 수 없는 오류가 발생했습니다.');
          setParticipants([]);
        }
      } finally {
        if (!disposed) {
          setLoading(false);
        }
      }
    };

    load();

    return () => {
      disposed = true;
    };
  }, [placeName, session?.user?.id]);

  return { participants, loading, error };
}
