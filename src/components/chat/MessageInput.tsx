import React, { useState, useRef } from 'react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send, Image, Mic, Paperclip, X, Square } from 'lucide-react';

interface MessageInputProps {
  onSendMessage: (content: string) => void;
  onSendFile: (file: File, type: 'image' | 'voice' | 'file') => void;
  disabled?: boolean;
}

export const MessageInput: React.FC<MessageInputProps> = ({
  onSendMessage,
  onSendFile,
  disabled,
}) => {
  const [message, setMessage] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedFileType, setSelectedFileType] = useState<'image' | 'file' | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const handleSend = () => {
    if (selectedFile && selectedFileType) {
      onSendFile(selectedFile, selectedFileType);
      setSelectedFile(null);
      setSelectedFileType(null);
    } else if (message.trim()) {
      onSendMessage(message.trim());
      setMessage('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setSelectedFileType('image');
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setSelectedFileType('file');
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const audioFile = new File([audioBlob], 'voice-note.webm', { type: 'audio/webm' });
        onSendFile(audioFile, 'voice');
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch {
      console.error('Error accessing microphone');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const clearSelection = () => {
    setSelectedFile(null);
    setSelectedFileType(null);
  };

  return (
    <GlassCard variant="subtle" className="m-2">
      {selectedFile && (
        <div className="flex items-center gap-2 mb-2 p-2 bg-card/50 rounded-lg">
          <span className="text-sm text-foreground truncate flex-1">
            {selectedFile.name}
          </span>
          <Button size="icon" variant="ghost" onClick={clearSelection} className="w-6 h-6">
            <X className="w-4 h-4" />
          </Button>
        </div>
      )}
      
      <div className="flex items-center gap-2">
        <input
          ref={imageInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleImageSelect}
        />
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt"
          className="hidden"
          onChange={handleFileSelect}
        />

        <Button
          size="icon"
          variant="ghost"
          onClick={() => imageInputRef.current?.click()}
          disabled={disabled || isRecording}
          className="text-muted-foreground hover:text-foreground"
        >
          <Image className="w-5 h-5" />
        </Button>

        <Button
          size="icon"
          variant="ghost"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || isRecording}
          className="text-muted-foreground hover:text-foreground"
        >
          <Paperclip className="w-5 h-5" />
        </Button>

        <Input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={isRecording ? 'Recording...' : 'Type a message...'}
          disabled={disabled || isRecording}
          className="flex-1 bg-transparent border-none focus-visible:ring-0 focus-visible:ring-offset-0"
        />

        {isRecording ? (
          <Button
            size="icon"
            variant="ghost"
            onClick={stopRecording}
            className="text-destructive hover:text-destructive/80"
          >
            <Square className="w-5 h-5" />
          </Button>
        ) : message.trim() || selectedFile ? (
          <Button
            size="icon"
            onClick={handleSend}
            disabled={disabled}
            className="bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            <Send className="w-5 h-5" />
          </Button>
        ) : (
          <Button
            size="icon"
            variant="ghost"
            onClick={startRecording}
            disabled={disabled}
            className="text-muted-foreground hover:text-foreground"
          >
            <Mic className="w-5 h-5" />
          </Button>
        )}
      </div>
    </GlassCard>
  );
};
