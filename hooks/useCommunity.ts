import { useEffect } from 'react';
import { useCommunityStore } from '@/state/community.store';
import { useMapStore } from '@/state/map.store';
import { useAuthStore } from '@/state/auth.store';
import { supabase } from '@/lib/supabase';
import { Profile } from '@/types/models';
import { calculateDistance } from '@/lib/geo';

export function useUserCards() {
  const { users, filters, loading, setUsers, setLoading } = useCommunityStore();
  const { currentLocation } = useMapStore();
  const { session } = useAuthStore();

  useEffect(() => {
    if (!session || !currentLocation) return;

    const loadUsers = async () => {
      setLoading(true);
      try {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('*')
          .neq('id', session.user.id)
          .not('approx_lat', 'is', null)
          .not('approx_lng', 'is', null)
          .limit(50);

        if (!profiles) return;

        const { data: blockedUsers } = await supabase
          .from('blocks')
          .select('blocked_id')
          .eq('blocker_id', session.user.id);

        const blockedIds = blockedUsers?.map((b) => b.blocked_id) || [];

        let filteredUsers = profiles.filter(
          (p) => !blockedIds.includes(p.id) && p.approx_lat && p.approx_lng
        );

        filteredUsers = filteredUsers.map((user) => {
          const distance = calculateDistance(currentLocation, {
            latitude: user.approx_lat!,
            longitude: user.approx_lng!,
          });
          return { ...user, distance };
        });

        filteredUsers = filteredUsers.filter(
          (user) => user.distance! <= filters.maxDistance
        );

        if (filters.budget.length > 0) {
          filteredUsers = filteredUsers.filter((user) =>
            filters.budget.includes(user.budget_range as any)
          );
        }

        if (filters.dietTags.length > 0) {
          filteredUsers = filteredUsers.filter((user) =>
            filters.dietTags.some((tag) => user.diet_tags.includes(tag))
          );
        }

        setUsers(filteredUsers as Profile[]);
      } finally {
        setLoading(false);
      }
    };

    loadUsers();
  }, [session, currentLocation, filters]);

  return { users, loading };
}

export async function createOrOpenDM(otherUserId: string): Promise<string | null> {
  try {
    const { session } = useAuthStore.getState();
    if (!session) return null;

    const { data: existingMemberships } = await supabase
      .from('members')
      .select('thread_id')
      .eq('user_id', session.user.id);

    if (existingMemberships) {
      for (const membership of existingMemberships) {
        const { data: otherMember } = await supabase
          .from('members')
          .select('*')
          .eq('thread_id', membership.thread_id)
          .eq('user_id', otherUserId)
          .single();

        if (otherMember) {
          const { count } = await supabase
            .from('members')
            .select('*', { count: 'exact', head: true })
            .eq('thread_id', membership.thread_id);

          if (count === 2) {
            return membership.thread_id;
          }
        }
      }
    }

    const { data: newThread } = await supabase
      .from('threads')
      .insert({ is_group: false })
      .select()
      .single();

    if (!newThread) return null;

    await supabase.from('members').insert([
      { thread_id: newThread.id, user_id: session.user.id },
      { thread_id: newThread.id, user_id: otherUserId },
    ]);

    return newThread.id;
  } catch (error) {
    console.error('DM 생성 중 오류가 발생했습니다:', error);
    return null;
  }
}
