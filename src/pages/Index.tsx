import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { GlassCard } from '@/components/ui/GlassCard';
import { ChatList } from '@/components/chat/ChatList';
import { ChatView } from '@/components/chat/ChatView';
import { FriendsList } from '@/components/friends/FriendsList';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MessageCircle, Users, LogOut, Settings } from 'lucide-react';

interface Conversation {
  id: string;
  participant: {
    id: string;
    username: string;
    avatar_url: string | null;
  };
  lastMessage?: {
    content: string;
    created_at: string;
    message_type: string;
  };
}

type Tab = 'chats' | 'friends';

const Index: React.FC = () => {
  const { user, profile, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>('chats');
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [selectedParticipant, setSelectedParticipant] = useState<Conversation['participant'] | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (profile) {
      loadConversations();
    }
  }, [profile]);

  const loadConversations = async () => {
    if (!profile) return;

    const { data: participations } = await supabase
      .from('conversation_participants')
      .select('conversation_id')
      .eq('profile_id', profile.id);

    if (!participations) return;

    const convIds = participations.map(p => p.conversation_id);
    
    const convList: Conversation[] = [];

    for (const convId of convIds) {
      // Get other participant
      const { data: otherParticipant } = await supabase
        .from('conversation_participants')
        .select(`
          profile:profiles (id, username, avatar_url)
        `)
        .eq('conversation_id', convId)
        .neq('profile_id', profile.id)
        .maybeSingle();

      if (!otherParticipant?.profile) continue;

      // Get last message
      const { data: lastMsg } = await supabase
        .from('messages')
        .select('content, created_at, message_type')
        .eq('conversation_id', convId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      const participantData = otherParticipant.profile as { id: string; username: string; avatar_url: string | null };

      convList.push({
        id: convId,
        participant: {
          id: participantData.id,
          username: participantData.username,
          avatar_url: participantData.avatar_url,
        },
        lastMessage: lastMsg ? {
          content: lastMsg.content || '',
          created_at: lastMsg.created_at,
          message_type: lastMsg.message_type,
        } : undefined,
      });
    }

    // Sort by last message time
    convList.sort((a, b) => {
      const aTime = a.lastMessage?.created_at || '';
      const bTime = b.lastMessage?.created_at || '';
      return bTime.localeCompare(aTime);
    });

    setConversations(convList);
  };

  const startChat = async (friendId: string) => {
    if (!profile) return;

    // Check if conversation already exists
    const { data: existingParticipation } = await supabase
      .from('conversation_participants')
      .select('conversation_id')
      .eq('profile_id', profile.id);

    if (existingParticipation) {
      for (const p of existingParticipation) {
        const { data: otherParticipant } = await supabase
          .from('conversation_participants')
          .select('profile_id')
          .eq('conversation_id', p.conversation_id)
          .eq('profile_id', friendId)
          .maybeSingle();

        if (otherParticipant) {
          // Conversation exists, select it
          const conv = conversations.find(c => c.id === p.conversation_id);
          if (conv) {
            setSelectedConversation(conv.id);
            setSelectedParticipant(conv.participant);
          }
          setActiveTab('chats');
          return;
        }
      }
    }

    // Create new conversation
    const { data: newConv, error: convError } = await supabase
      .from('conversations')
      .insert({})
      .select()
      .single();

    if (convError || !newConv) return;

    // Add participants
    await supabase.from('conversation_participants').insert([
      { conversation_id: newConv.id, profile_id: profile.id },
      { conversation_id: newConv.id, profile_id: friendId },
    ]);

    // Get friend info
    const { data: friendData } = await supabase
      .from('profiles')
      .select('id, username, avatar_url')
      .eq('id', friendId)
      .single();

    if (friendData) {
      const newConversation: Conversation = {
        id: newConv.id,
        participant: {
          id: friendData.id,
          username: friendData.username,
          avatar_url: friendData.avatar_url,
        },
      };
      setConversations([newConversation, ...conversations]);
      setSelectedConversation(newConv.id);
      setSelectedParticipant(newConversation.participant);
    }

    setActiveTab('chats');
  };

  const handleSelectConversation = (id: string) => {
    const conv = conversations.find(c => c.id === id);
    if (conv) {
      setSelectedConversation(id);
      setSelectedParticipant(conv.participant);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user || !profile) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row">
      {/* Sidebar */}
      <div className={`w-full md:w-80 lg:w-96 flex flex-col border-r border-border/30 ${
        selectedConversation ? 'hidden md:flex' : 'flex'
      }`}>
        {/* Header */}
        <GlassCard variant="subtle" className="rounded-none border-x-0 border-t-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/20 backdrop-blur-sm flex items-center justify-center">
                <MessageCircle className="w-5 h-5 text-primary" />
              </div>
              <h1 className="text-xl font-bold text-foreground">LLife</h1>
            </div>
            <div className="flex items-center gap-2">
              <Avatar className="w-8 h-8">
                <AvatarImage src={profile.avatar_url || undefined} />
                <AvatarFallback className="bg-primary/20 text-primary text-xs">
                  {profile.username.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <Button
                size="icon"
                variant="ghost"
                onClick={signOut}
                className="text-muted-foreground hover:text-foreground"
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </GlassCard>

        {/* Tabs */}
        <div className="flex border-b border-border/30">
          <button
            onClick={() => setActiveTab('chats')}
            className={`flex-1 py-3 flex items-center justify-center gap-2 transition-colors ${
              activeTab === 'chats'
                ? 'text-primary border-b-2 border-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <MessageCircle className="w-4 h-4" />
            Chats
          </button>
          <button
            onClick={() => setActiveTab('friends')}
            className={`flex-1 py-3 flex items-center justify-center gap-2 transition-colors ${
              activeTab === 'friends'
                ? 'text-primary border-b-2 border-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Users className="w-4 h-4" />
            Friends
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {activeTab === 'chats' ? (
            <ChatList
              conversations={conversations}
              selectedId={selectedConversation || undefined}
              onSelect={handleSelectConversation}
            />
          ) : (
            <FriendsList onStartChat={startChat} />
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className={`flex-1 flex flex-col ${
        !selectedConversation ? 'hidden md:flex' : 'flex'
      }`}>
        {selectedConversation && selectedParticipant ? (
          <ChatView
            conversationId={selectedConversation}
            participant={selectedParticipant}
            onBack={() => {
              setSelectedConversation(null);
              setSelectedParticipant(null);
            }}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <GlassCard variant="subtle" className="text-center max-w-sm">
              <div className="w-16 h-16 rounded-2xl bg-primary/20 backdrop-blur-sm flex items-center justify-center mx-auto mb-4">
                <MessageCircle className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-xl font-semibold text-foreground mb-2">Welcome to LLife</h2>
              <p className="text-muted-foreground">
                Select a conversation to start messaging or add friends to begin chatting.
              </p>
            </GlassCard>
          </div>
        )}
      </div>
    </div>
  );
};

export default Index;
