import { useEffect } from 'react';
import { useGatheringStore } from '@/state/gathering.store';
import { useAuthStore } from '@/state/auth.store';
import { supabase } from '@/lib/supabase';
import { Gathering, GatheringParticipant, Profile } from '@/types/models';

/**
 * Fetch gatherings for a specific place
 */
export function usePlaceGatherings(placeId: string | null) {
  const { gatherings, setGatherings, setLoading, subscribeToGathering } = useGatheringStore();
  const { session } = useAuthStore();
  
  useEffect(() => {
    if (!placeId || !session) return;
    
    const loadGatherings = async () => {
      setLoading(true);
      try {
        const { data: gatheringsData, error } = await supabase
          .from('gatherings')
          .select('*')
          .eq('place_id', placeId)
          .eq('status', 'open')
          .order('scheduled_at', { ascending: true });
        
        if (error) throw error;
        
        if (gatheringsData) {
          // Enrich with host profile
          const hostIds = Array.from(new Set(gatheringsData.map((g) => g.host_id)));
          const { data: profiles } = await supabase
            .from('profiles')
            .select('*')
            .in('id', hostIds);
          
          const profileMap = new Map<string, Profile>();
          (profiles || []).forEach((p) => profileMap.set(p.id, p as Profile));
          
          const enriched = gatheringsData.map((g) => ({
            ...g,
            host: profileMap.get(g.host_id),
          })) as Gathering[];
          
          setGatherings(enriched);
          
          // Subscribe to realtime updates for each gathering
          enriched.forEach((g) => subscribeToGathering(g.id));
        }
      } catch (err) {
        console.error('Error loading gatherings:', err);
      } finally {
        setLoading(false);
      }
    };
    
    loadGatherings();
  }, [placeId, session]);
  
  return {
    gatherings: placeId ? gatherings.filter((g) => g.place_id === placeId) : [],
    loading: useGatheringStore((state) => state.loading),
  };
}

/**
 * Fetch participants for a specific gathering
 */
export function useGatheringParticipants(gatheringId: string | null) {
  const { participants, setParticipants, subscribeToGathering } = useGatheringStore();
  const { session } = useAuthStore();
  
  useEffect(() => {
    if (!gatheringId || !session) return;
    
    const loadParticipants = async () => {
      try {
        const { data: participantsData, error } = await supabase
          .from('gathering_participants')
          .select('*')
          .eq('gathering_id', gatheringId)
          .eq('status', 'joined');
        
        if (error) throw error;
        
        if (participantsData) {
          // Enrich with user profiles
          const userIds = participantsData.map((p) => p.user_id);
          const { data: profiles } = await supabase
            .from('profiles')
            .select('*')
            .in('id', userIds);
          
          const profileMap = new Map<string, Profile>();
          (profiles || []).forEach((p) => profileMap.set(p.id, p as Profile));
          
          const enriched = participantsData.map((p) => ({
            ...p,
            user: profileMap.get(p.user_id),
          })) as GatheringParticipant[];
          
          setParticipants(gatheringId, enriched);
          subscribeToGathering(gatheringId);
        }
      } catch (err) {
        console.error('Error loading participants:', err);
      }
    };
    
    loadParticipants();
  }, [gatheringId, session]);
  
  return {
    participants: gatheringId ? participants[gatheringId] || [] : [],
  };
}

/**
 * Fetch user's own gatherings (hosted or joined)
 */
export function useMyGatherings() {
  const { myGatherings, setMyGatherings, setLoading } = useGatheringStore();
  const { session } = useAuthStore();
  
  useEffect(() => {
    if (!session) return;
    
    const loadMyGatherings = async () => {
      setLoading(true);
      try {
        // Get gatherings I'm hosting
        const { data: hostedData } = await supabase
          .from('gatherings')
          .select('*')
          .eq('host_id', session.user.id)
          .neq('status', 'cancelled')
          .order('scheduled_at', { ascending: true });
        
        // Get gatherings I've joined
        const { data: participantsData } = await supabase
          .from('gathering_participants')
          .select('gathering_id')
          .eq('user_id', session.user.id)
          .eq('status', 'joined');
        
        const joinedIds = participantsData?.map((p) => p.gathering_id) || [];
        
        let joinedData: any[] = [];
        if (joinedIds.length > 0) {
          const { data } = await supabase
            .from('gatherings')
            .select('*')
            .in('id', joinedIds)
            .neq('status', 'cancelled')
            .order('scheduled_at', { ascending: true });
          joinedData = data || [];
        }
        
        // Merge and deduplicate
        const allGatherings = [...(hostedData || []), ...joinedData];
        const uniqueGatherings = Array.from(
          new Map(allGatherings.map((g) => [g.id, g])).values()
        );
        
        setMyGatherings(uniqueGatherings as Gathering[]);
      } catch (err) {
        console.error('Error loading my gatherings:', err);
      } finally {
        setLoading(false);
      }
    };
    
    loadMyGatherings();
  }, [session]);
  
  return { myGatherings, loading: useGatheringStore((state) => state.loading) };
}

/**
 * Create a new gathering
 */
export async function createGathering(data: {
  placeId: string;
  placeName: string;
  placeAddress?: string;
  placePhotoUrl?: string;
  placeLat?: number;
  placeLng?: number;
  title: string;
  description: string;
  scheduledAt: Date;
  maxParticipants: number;
}): Promise<{ gatheringId: string | null; error: Error | null }> {
  try {
    const { session } = useAuthStore.getState();
    if (!session) return { gatheringId: null, error: new Error('Not authenticated') };
    
    // 1. Create gathering
    const { data: gathering, error: gatheringError } = await supabase
      .from('gatherings')
      .insert({
        place_id: data.placeId,
        place_name: data.placeName,
        place_address: data.placeAddress,
        place_photo_url: data.placePhotoUrl,
        place_lat: data.placeLat,
        place_lng: data.placeLng,
        host_id: session.user.id,
        title: data.title,
        description: data.description,
        scheduled_at: data.scheduledAt.toISOString(),
        max_participants: data.maxParticipants,
        status: 'open',
      })
      .select()
      .single();
    
    if (gatheringError) throw gatheringError;
    if (!gathering) throw new Error('Failed to create gathering');
    
    // 2. Add host as first participant
    const { error: participantError } = await supabase
      .from('gathering_participants')
      .insert({
        gathering_id: gathering.id,
        user_id: session.user.id,
        status: 'joined',
        is_host: true,
      });
    
    if (participantError) throw participantError;
    
    // 3. Create group chat thread
    const { data: thread, error: threadError } = await supabase
      .from('threads')
      .insert({
        is_group: true,
        gathering_id: gathering.id,
      })
      .select()
      .single();
    
    if (threadError) throw threadError;
    if (!thread) throw new Error('Failed to create thread');
    
    // 4. Add host to thread members
    const { error: memberError } = await supabase
      .from('members')
      .insert({
        thread_id: thread.id,
        user_id: session.user.id,
        role: 'admin',
      });
    
    if (memberError) throw memberError;
    
    // 5. Send system message
    await supabase.from('messages').insert({
      thread_id: thread.id,
      sender_id: session.user.id,
      text: `${data.title} 모임이 시작되었습니다!`,
      message_type: 'system',
    });
    
    return { gatheringId: gathering.id, error: null };
  } catch (err) {
    console.error('Error creating gathering:', err);
    return { gatheringId: null, error: err as Error };
  }
}

/**
 * Join an existing gathering
 */
export async function joinGathering(
  gatheringId: string
): Promise<{ error: Error | null }> {
  try {
    const { session } = useAuthStore.getState();
    if (!session) return { error: new Error('Not authenticated') };
    
    // 1. Check if gathering is full
    const { data: gathering } = await supabase
      .from('gatherings')
      .select('current_count, max_participants, status')
      .eq('id', gatheringId)
      .single();
    
    if (!gathering) throw new Error('Gathering not found');
    if (gathering.status !== 'open') throw new Error('Gathering is not open');
    if (gathering.current_count >= gathering.max_participants) {
      throw new Error('Gathering is full');
    }
    
    // 2. Check if already joined
    const { data: existing } = await supabase
      .from('gathering_participants')
      .select('*')
      .eq('gathering_id', gatheringId)
      .eq('user_id', session.user.id)
      .single();
    
    if (existing && existing.status === 'joined') {
      return { error: new Error('Already joined') };
    }
    
    const isRejoin = !!existing && existing.status === 'left';
    const participantPayload: {
      id?: string;
      gathering_id: string;
      user_id: string;
      status: 'joined';
      is_host: boolean;
      joined_at?: string;
    } = {
      gathering_id: gatheringId,
      user_id: session.user.id,
      status: 'joined',
      is_host: existing?.is_host ?? false,
    };
    
    if (existing?.id) {
      participantPayload.id = existing.id;
    }
    
    if (isRejoin) {
      participantPayload.joined_at = new Date().toISOString();
    }
    
    const { error: participantError } = await supabase
      .from('gathering_participants')
      .upsert(participantPayload, {
        onConflict: 'gathering_id,user_id',
      });
    
    if (participantError) throw participantError;
    
    // 4. Get thread ID
    const { data: threadData } = await supabase
      .from('threads')
      .select('id')
      .eq('gathering_id', gatheringId)
      .single();
    
    if (threadData) {
      // 5. Add to thread members
      await supabase
        .from('members')
        .upsert(
          {
            thread_id: threadData.id,
            user_id: session.user.id,
            role: (existing?.is_host ?? false) ? 'admin' : 'member',
          },
          { onConflict: 'thread_id,user_id' }
        );
      
      if (!existing || isRejoin) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('display_name')
          .eq('id', session.user.id)
          .single();
        
        if (profile) {
          await supabase.from('messages').insert({
            thread_id: threadData.id,
            sender_id: session.user.id,
            text: `${profile.display_name}님이 참여했습니다.`,
            message_type: 'system',
          });
        }
      }
    }
    
    return { error: null };
  } catch (err) {
    console.error('Error joining gathering:', err);
    return { error: err as Error };
  }
}

/**
 * Leave a gathering
 */
export async function leaveGathering(
  gatheringId: string
): Promise<{ error: Error | null }> {
  try {
    const { session } = useAuthStore.getState();
    if (!session) return { error: new Error('Not authenticated') };
    
    // 1. Check if host
    const { data: gathering } = await supabase
      .from('gatherings')
      .select('host_id')
      .eq('id', gatheringId)
      .single();
    
    if (!gathering) throw new Error('Gathering not found');
    if (gathering.host_id === session.user.id) {
      return { error: new Error('Host cannot leave. Cancel the gathering instead.') };
    }
    
    const { data: participant } = await supabase
      .from('gathering_participants')
      .select('*')
      .eq('gathering_id', gatheringId)
      .eq('user_id', session.user.id)
      .single();
    
    if (!participant || participant.status !== 'joined') {
      return { error: new Error('Not currently participating in this gathering') };
    }
    
    const { error: participantError } = await supabase
      .from('gathering_participants')
      .upsert(
        {
          id: participant.id,
          gathering_id: gatheringId,
          user_id: session.user.id,
          status: 'left',
          is_host: participant.is_host,
        },
        { onConflict: 'gathering_id,user_id' }
      );
    
    if (participantError) throw participantError;
    
    // 3. Send system message
    const { data: threadData } = await supabase
      .from('threads')
      .select('id')
      .eq('gathering_id', gatheringId)
      .single();
    
    if (threadData) {
      const { error: memberDeleteError } = await supabase
        .from('members')
        .delete()
        .eq('thread_id', threadData.id)
        .eq('user_id', session.user.id);
      
      if (memberDeleteError) throw memberDeleteError;
      
      const { data: profile } = await supabase
        .from('profiles')
        .select('display_name')
        .eq('id', session.user.id)
        .single();
      
      if (profile) {
        await supabase.from('messages').insert({
          thread_id: threadData.id,
          sender_id: session.user.id,
          text: `${profile.display_name}님이 나갔습니다.`,
          message_type: 'system',
        });
      }
    }
    
    return { error: null };
  } catch (err) {
    console.error('Error leaving gathering:', err);
    return { error: err as Error };
  }
}

/**
 * Cancel a gathering (host only)
 */
export async function cancelGathering(
  gatheringId: string
): Promise<{ error: Error | null }> {
  try {
    const { session } = useAuthStore.getState();
    if (!session) return { error: new Error('Not authenticated') };
    
    // 1. Verify host
    const { data: gathering } = await supabase
      .from('gatherings')
      .select('host_id')
      .eq('id', gatheringId)
      .single();
    
    if (!gathering) throw new Error('Gathering not found');
    if (gathering.host_id !== session.user.id) {
      return { error: new Error('Only host can cancel') };
    }
    
    // 2. Update status
    const { error: updateError } = await supabase
      .from('gatherings')
      .update({ status: 'cancelled' })
      .eq('id', gatheringId);
    
    if (updateError) throw updateError;
    
    // 3. Send system message
    const { data: threadData } = await supabase
      .from('threads')
      .select('id')
      .eq('gathering_id', gatheringId)
      .single();
    
    if (threadData) {
      await supabase.from('messages').insert({
        thread_id: threadData.id,
        sender_id: session.user.id,
        text: '모임이 취소되었습니다.',
        message_type: 'system',
      });
    }
    
    return { error: null };
  } catch (err) {
    console.error('Error cancelling gathering:', err);
    return { error: err as Error };
  }
}
