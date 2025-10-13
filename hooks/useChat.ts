import { useEffect } from 'react';
import { useChatStore } from '@/state/chat.store';
import { useAuthStore } from '@/state/auth.store';
import { supabase } from '@/lib/supabase';
import { Thread, Message, Slot } from '@/types/models';

export function useThreads() {
  const { threads, setThreads } = useChatStore();
  const { session } = useAuthStore();

  useEffect(() => {
    if (!session) return;

    const loadThreads = async () => {
      const { data: memberData } = await supabase
        .from('members')
        .select('thread_id')
        .eq('user_id', session.user.id);

      if (!memberData) return;

      const threadIds = memberData.map((m) => m.thread_id);
      const { data: threadsData } = await supabase
        .from('threads')
        .select('*')
        .in('id', threadIds)
        .order('updated_at', { ascending: false });

      if (threadsData) {
        const threadsWithParticipants = await Promise.all(
          threadsData.map(async (thread) => {
            const { data: members } = await supabase
              .from('members')
              .select('user_id')
              .eq('thread_id', thread.id);

            const userIds = members?.map((m) => m.user_id) || [];
            const { data: profiles } = await supabase
              .from('profiles')
              .select('*')
              .in('id', userIds);

            return {
              ...thread,
              participants: profiles || [],
            };
          })
        );

        setThreads(threadsWithParticipants);
      }
    };

    loadThreads();
  }, [session]);

  return { threads };
}

export function useMessages(threadId: string) {
  const { messages, setMessages, subscribeToThread, unsubscribeFromThread } = useChatStore();

  useEffect(() => {
    const loadMessages = async () => {
      const { data } = await supabase
        .from('messages')
        .select('*')
        .eq('thread_id', threadId)
        .order('created_at', { ascending: true });

      if (data) {
        setMessages(threadId, data);
      }
    };

    loadMessages();
    subscribeToThread(threadId);

    return () => {
      unsubscribeFromThread(threadId);
    };
  }, [threadId]);

  return { messages: messages[threadId] || [] };
}

export async function sendMessage(
  threadId: string,
  text: string,
  imageUrl?: string
): Promise<{ error: Error | null }> {
  try {
    const { session } = useAuthStore.getState();
    if (!session) throw new Error('로그인이 필요합니다.');

    const { error } = await supabase.from('messages').insert({
      thread_id: threadId,
      sender_id: session.user.id,
      text,
      image_url: imageUrl,
      message_type: 'user',
    });

    if (error) throw error;
    return { error: null };
  } catch (error) {
    return { error: error as Error };
  }
}

export function useProposals(threadId: string) {
  const { proposals, setProposals } = useChatStore();

  useEffect(() => {
    const loadProposals = async () => {
      const { data } = await supabase
        .from('slots')
        .select('*')
        .eq('thread_id', threadId);

      if (data) {
        setProposals(threadId, data);
      }
    };

    loadProposals();
  }, [threadId]);

  return { proposals: proposals[threadId] || [] };
}

export async function createProposal(
  threadId: string,
  placeName: string,
  placeCategory: string,
  placeAddress: string,
  startsAt: Date,
  notes: string
): Promise<{ error: Error | null }> {
  try {
    const { session } = useAuthStore.getState();
    if (!session) throw new Error('로그인이 필요합니다.');

    const { data: slot, error: slotError } = await supabase
      .from('slots')
      .insert({
        thread_id: threadId,
        place_name: placeName,
        place_category: placeCategory,
        place_address: placeAddress,
        proposer_id: session.user.id,
        starts_at: startsAt.toISOString(),
        notes,
        status: 'proposed',
      })
      .select()
      .single();

    if (slotError) throw slotError;

    await supabase.from('messages').insert({
      thread_id: threadId,
      sender_id: session.user.id,
      text: `${placeName}에서 식사를 제안했습니다.`,
      message_type: 'system',
    });

    return { error: null };
  } catch (error) {
    return { error: error as Error };
  }
}

export async function respondToProposal(
  proposalId: string,
  threadId: string,
  status: 'accepted' | 'declined'
): Promise<{ error: Error | null }> {
  try {
    const { session } = useAuthStore.getState();
    if (!session) throw new Error('로그인이 필요합니다.');

    const { error: updateError } = await supabase
      .from('slots')
      .update({ status })
      .eq('id', proposalId);

    if (updateError) throw updateError;

    const statusMessage =
      status === 'accepted'
        ? '식사 제안을 수락했습니다.'
        : '식사 제안을 거절했습니다.';

    await supabase.from('messages').insert({
      thread_id: threadId,
      sender_id: session.user.id,
      text: statusMessage,
      message_type: 'system',
    });

    return { error: null };
  } catch (error) {
    return { error: error as Error };
  }
}

export async function cancelProposal(
  proposalId: string,
  threadId: string
): Promise<{ error: Error | null }> {
  try {
    const { session } = useAuthStore.getState();
    if (!session) throw new Error('로그인이 필요합니다.');

    const { error: updateError } = await supabase
      .from('slots')
      .update({ status: 'canceled' })
      .eq('id', proposalId);

    if (updateError) throw updateError;

    await supabase.from('messages').insert({
      thread_id: threadId,
      sender_id: session.user.id,
      text: '식사 제안을 취소했습니다.',
      message_type: 'system',
    });

    return { error: null };
  } catch (error) {
    return { error: error as Error };
  }
}
