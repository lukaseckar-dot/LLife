import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { MessageBubble } from './MessageBubble';
import { MessageInput } from './MessageInput';
import { GlassCard } from '@/components/ui/GlassCard';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

interface Message {
  id: string;
  content: string | null;
  message_type: string;
  file_url: string | null;
  file_name: string | null;
  created_at: string;
  sender_id: string;
}

interface Participant {
  id: string;
  username: string;
  avatar_url: string | null;
}

interface ChatViewProps {
  conversationId: string;
  participant: Participant;
  onBack: () => void;
}

export const ChatView: React.FC<ChatViewProps> = ({
  conversationId,
  participant,
  onBack,
}) => {
  const { profile } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    loadMessages();

    const channel = supabase
      .channel(`messages-${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as Message]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadMessages = async () => {
    const { data } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (data) {
      setMessages(data as Message[]);
    }
  };

  const sendMessage = async (content: string) => {
    if (!profile) return;

    await supabase.from('messages').insert({
      conversation_id: conversationId,
      sender_id: profile.id,
      content,
      message_type: 'text',
    });
  };

  const sendFile = async (file: File, type: 'image' | 'voice' | 'file') => {
    if (!profile) return;

    const fileName = `${Date.now()}-${file.name}`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('attachments')
      .upload(fileName, file);

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return;
    }

    const { data: urlData } = supabase.storage
      .from('attachments')
      .getPublicUrl(uploadData.path);

    await supabase.from('messages').insert({
      conversation_id: conversationId,
      sender_id: profile.id,
      message_type: type,
      file_url: urlData.publicUrl,
      file_name: file.name,
    });
  };

  const playVoice = (messageId: string, url: string) => {
    if (playingId === messageId) {
      audioRef.current?.pause();
      setPlayingId(null);
    } else {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      audioRef.current = new Audio(url);
      audioRef.current.play();
      audioRef.current.onended = () => setPlayingId(null);
      setPlayingId(messageId);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <GlassCard variant="subtle" className="rounded-none border-x-0 border-t-0">
        <div className="flex items-center gap-3">
          <Button
            size="icon"
            variant="ghost"
            onClick={onBack}
            className="md:hidden"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <Avatar className="w-10 h-10">
            <AvatarImage src={participant.avatar_url || undefined} />
            <AvatarFallback className="bg-primary/20 text-primary">
              {participant.username.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <h2 className="font-semibold text-foreground">{participant.username}</h2>
            <p className="text-xs text-muted-foreground">Online</p>
          </div>
        </div>
      </GlassCard>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 ? (
          <div className="flex-1 flex items-center justify-center h-full">
            <p className="text-muted-foreground text-center">
              No messages yet. Say hello! 👋
            </p>
          </div>
        ) : (
          messages.map((msg) => (
            <MessageBubble
              key={msg.id}
              message={msg}
              isMine={msg.sender_id === profile?.id}
              isPlaying={playingId === msg.id}
              onPlayVoice={() => msg.file_url && playVoice(msg.id, msg.file_url)}
            />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      <MessageInput
        onSendMessage={sendMessage}
        onSendFile={sendFile}
        disabled={!profile}
      />
    </div>
  );
};
