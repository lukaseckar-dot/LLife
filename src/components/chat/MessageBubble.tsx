import React from 'react';
import { cn } from '@/lib/utils';
import { FileText, Play, Pause } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Message {
  id: string;
  content: string | null;
  message_type: string;
  file_url: string | null;
  file_name: string | null;
  created_at: string;
  sender_id: string;
}

interface MessageBubbleProps {
  message: Message;
  isMine: boolean;
  isPlaying?: boolean;
  onPlayVoice?: () => void;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  isMine,
  isPlaying,
  onPlayVoice,
}) => {
  const renderContent = () => {
    switch (message.message_type) {
      case 'image':
        return (
          <img
            src={message.file_url || ''}
            alt="Shared image"
            className="max-w-[250px] rounded-lg"
          />
        );
      case 'voice':
        return (
          <div className="flex items-center gap-2">
            <Button
              size="icon"
              variant="ghost"
              className={cn(
                'w-10 h-10 rounded-full',
                isMine ? 'hover:bg-primary-foreground/20' : 'hover:bg-foreground/10'
              )}
              onClick={onPlayVoice}
            >
              {isPlaying ? (
                <Pause className="w-5 h-5" />
              ) : (
                <Play className="w-5 h-5" />
              )}
            </Button>
            <div className="flex-1">
              <div className="h-1 bg-current/30 rounded-full w-24">
                <div
                  className={cn(
                    'h-full rounded-full bg-current transition-all',
                    isPlaying ? 'animate-pulse' : ''
                  )}
                  style={{ width: isPlaying ? '60%' : '0%' }}
                />
              </div>
            </div>
            <span className="text-xs opacity-70">0:15</span>
          </div>
        );
      case 'file':
        return (
          <a
            href={message.file_url || '#'}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
          >
            <div className={cn(
              'w-10 h-10 rounded-lg flex items-center justify-center',
              isMine ? 'bg-primary-foreground/20' : 'bg-foreground/10'
            )}>
              <FileText className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{message.file_name}</p>
              <p className="text-xs opacity-70">Click to download</p>
            </div>
          </a>
        );
      default:
        return <p className="text-sm leading-relaxed">{message.content}</p>;
    }
  };

  return (
    <div
      className={cn(
        'flex animate-slide-up',
        isMine ? 'justify-end' : 'justify-start'
      )}
    >
      <div
        className={cn(
          'max-w-[80%] rounded-2xl px-4 py-2',
          isMine
            ? 'glass-message rounded-br-md'
            : 'glass-message-other rounded-bl-md'
        )}
      >
        {renderContent()}
        <p className={cn(
          'text-[10px] mt-1 opacity-60',
          isMine ? 'text-right' : 'text-left'
        )}>
          {new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
    </div>
  );
};
