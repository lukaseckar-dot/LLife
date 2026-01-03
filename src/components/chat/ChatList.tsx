import React from 'react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { formatDistanceToNow } from 'date-fns';

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

interface ChatListProps {
  conversations: Conversation[];
  selectedId?: string;
  onSelect: (id: string) => void;
}

export const ChatList: React.FC<ChatListProps> = ({
  conversations,
  selectedId,
  onSelect,
}) => {
  const getMessagePreview = (message?: Conversation['lastMessage']) => {
    if (!message) return 'No messages yet';
    switch (message.message_type) {
      case 'image':
        return '📷 Image';
      case 'voice':
        return '🎤 Voice note';
      case 'file':
        return '📎 File';
      default:
        return message.content || 'No messages yet';
    }
  };

  if (conversations.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <p className="text-muted-foreground text-center">
          No conversations yet.<br />Add friends to start chatting!
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto space-y-2 p-2">
      {conversations.map((conv) => (
        <GlassCard
          key={conv.id}
          variant={selectedId === conv.id ? 'default' : 'subtle'}
          className={`cursor-pointer hover:scale-[1.02] transition-all duration-200 ${
            selectedId === conv.id ? 'ring-2 ring-primary/50' : ''
          }`}
          onClick={() => onSelect(conv.id)}
        >
          <div className="flex items-center gap-3">
            <Avatar className="w-12 h-12">
              <AvatarImage src={conv.participant.avatar_url || undefined} />
              <AvatarFallback className="bg-primary/20 text-primary">
                {conv.participant.username.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-foreground truncate">
                  {conv.participant.username}
                </h3>
                {conv.lastMessage && (
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(conv.lastMessage.created_at), { addSuffix: true })}
                  </span>
                )}
              </div>
              <p className="text-sm text-muted-foreground truncate">
                {getMessagePreview(conv.lastMessage)}
              </p>
            </div>
          </div>
        </GlassCard>
      ))}
    </div>
  );
};
