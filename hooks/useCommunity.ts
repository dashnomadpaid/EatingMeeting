import { useEffect } from 'react';
import { useCommunityStore } from '@/state/community.store';
import { useMapStore } from '@/state/map.store';
import { useAuthStore } from '@/state/auth.store';
import { supabase } from '@/lib/supabase';
import { Profile } from '@/types/models';
import { calculateDistance } from '@/lib/geo';

// ⚠️ 개발용 목업 플래그 (나중에 false로 변경)
export const USE_MOCK_DATA = true;

// 🎭 목업 데이터 (8명의 페르소나)
const MOCK_USERS: Profile[] = [
  {
    id: 'mock-1',
    display_name: '김철수',
    bio: '맛집 탐방을 좋아하는 직장인입니다. 주말에 새로운 곳 가보실 분 구합니다!',
    diet_tags: ['한식', '분식', '중식'],
    budget_range: '1만원-2만원',
    time_slots: ['평일 저녁', '주말 점심'],
    approx_lat: 37.5665,
    approx_lng: 126.9780,
    push_token: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    distance: 0.5,
    primaryPhoto: {
      id: 'mock-1-photo',
      user_id: 'mock-1',
      url: 'https://api.dicebear.com/7.x/avataaars/png?seed=Kim-Chulsoo&backgroundColor=b6e3f4',
      is_primary: true,
      created_at: new Date().toISOString(),
    },
  },
  {
    id: 'mock-2',
    display_name: '이영희',
    bio: '비건 식단 선호합니다. 건강한 식사 같이 해요!',
    diet_tags: ['채식', '샐러드', '비건'],
    budget_range: '2만원-3만원',
    time_slots: ['평일 점심', '주말 저녁'],
    approx_lat: 37.5700,
    approx_lng: 126.9800,
    push_token: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    distance: 1.2,
    primaryPhoto: {
      id: 'mock-2-photo',
      user_id: 'mock-2',
      url: 'https://api.dicebear.com/7.x/avataaars/png?seed=Lee-Younghee&backgroundColor=c0aede',
      is_primary: true,
      created_at: new Date().toISOString(),
    },
  },
  {
    id: 'mock-3',
    display_name: '박민수',
    bio: '야식 좋아합니다. 저녁 늦게 치맥 하실 분!',
    diet_tags: ['치킨', '한식', '야식'],
    budget_range: '2만원-3만원',
    time_slots: ['평일 야식', '주말 야식'],
    approx_lat: 37.5650,
    approx_lng: 126.9750,
    push_token: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    distance: 0.8,
    primaryPhoto: {
      id: 'mock-3-photo',
      user_id: 'mock-3',
      url: require('@/assets/images/mockup/박민수.png'),
      is_primary: true,
      created_at: new Date().toISOString(),
    },
  },
  {
    id: 'mock-4',
    display_name: '최지훈',
    bio: '일식러버입니다. 스시 오마카세 좋아하시는 분 환영!',
    diet_tags: ['일식', '회', '초밥'],
    budget_range: '3만원 이상',
    time_slots: ['주말 저녁', '특별한 날'],
    approx_lat: 37.5680,
    approx_lng: 126.9820,
    push_token: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    distance: 1.5,
    primaryPhoto: {
      id: 'mock-4-photo',
      user_id: 'mock-4',
      url: require('@/assets/images/mockup/최지훈.png'),
      is_primary: true,
      created_at: new Date().toISOString(),
    },
  },
  {
    id: 'mock-5',
    display_name: '정수연',
    bio: '카페 투어 좋아합니다. 브런치 같이 하실 분!',
    diet_tags: ['양식', '브런치', '디저트'],
    budget_range: '1만원-2만원',
    time_slots: ['주말 브런치', '평일 저녁'],
    approx_lat: 37.5690,
    approx_lng: 126.9760,
    push_token: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    distance: 0.3,
    primaryPhoto: {
      id: 'mock-5-photo',
      user_id: 'mock-5',
      url: 'https://api.dicebear.com/7.x/avataaars/png?seed=Jung-Sooyeon&backgroundColor=ffdfbf',
      is_primary: true,
      created_at: new Date().toISOString(),
    },
  },
  {
    id: 'mock-6',
    display_name: '강태호',
    bio: '중화요리 마니아! 짬뽕 짜장 탕수육 좋아하시는 분!',
    diet_tags: ['중식', '중화요리', '아시안'],
    budget_range: '1만원-2만원',
    time_slots: ['평일 점심', '평일 저녁'],
    approx_lat: 37.5720,
    approx_lng: 126.9740,
    push_token: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    distance: 1.8,
    primaryPhoto: {
      id: 'mock-6-photo',
      user_id: 'mock-6',
      url: 'https://images.unsplash.com/photo-1574158622682-e40e69881006?w=400&h=400&fit=crop&crop=faces',
      is_primary: true,
      created_at: new Date().toISOString(),
    },
  },
  {
    id: 'mock-7',
    display_name: '윤서아',
    bio: '분식 좋아해요. 떡볶이 순대 튀김 최고!',
    diet_tags: ['분식', '한식', '길거리음식'],
    budget_range: '1만원 이하',
    time_slots: ['평일 점심', '평일 저녁', '주말 언제나'],
    approx_lat: 37.5640,
    approx_lng: 126.9770,
    push_token: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    distance: 0.6,
    primaryPhoto: {
      id: 'mock-7-photo',
      user_id: 'mock-7',
      url: require('@/assets/images/mockup/윤서아.png'),
      is_primary: true,
      created_at: new Date().toISOString(),
    },
  },
  {
    id: 'mock-8',
    display_name: '장민호',
    bio: '디저트 카페 투어 중! 케이크 마카롱 좋아하시는 분!',
    diet_tags: ['디저트', '베이커리', '카페'],
    budget_range: '2만원-3만원',
    time_slots: ['주말 오후', '평일 저녁'],
    approx_lat: 37.5630,
    approx_lng: 126.9810,
    push_token: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    distance: 2.0,
    primaryPhoto: {
      id: 'mock-8-photo',
      user_id: 'mock-8',
      url: require('@/assets/images/mockup/장민호.png'),
      is_primary: true,
      created_at: new Date().toISOString(),
    },
  },
];

export function useUserCards() {
  const { users, filters, loading, setUsers, setLoading } = useCommunityStore();
  const { currentLocation } = useMapStore();
  const { session } = useAuthStore();

  useEffect(() => {
    // 🎭 목업 모드
    if (USE_MOCK_DATA) {
      setLoading(true);

      // 실제처럼 약간의 딜레이 추가
      setTimeout(() => {
        let filtered = [...MOCK_USERS];

        // 거리 필터 적용
        filtered = filtered.filter((user) => user.distance! <= filters.maxDistance);

        // 예산 필터 적용
        if (filters.budget.length > 0) {
          filtered = filtered.filter((user) =>
            filters.budget.includes(user.budget_range as any)
          );
        }

        // 식단 태그 필터 적용
        if (filters.dietTags.length > 0) {
          filtered = filtered.filter((user) =>
            filters.dietTags.some((tag) => user.diet_tags.includes(tag))
          );
        }

        setUsers(filtered);
        setLoading(false);
      }, 500);

      return;
    }

    // 🔴 실제 DB 쿼리 (기존 코드)
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
