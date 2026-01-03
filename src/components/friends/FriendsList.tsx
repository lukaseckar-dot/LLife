import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { GlassCard } from '@/components/ui/GlassCard';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { UserPlus, Check, X, MessageCircle, Search, Users } from 'lucide-react';

interface Friend {
  id: string;
  username: string;
  email: string;
  avatar_url: string | null;
  friendshipId: string;
  status: string;
  isRequester: boolean;
}

interface FriendsListProps {
  onStartChat: (friendId: string) => void;
}

export const FriendsList: React.FC<FriendsListProps> = ({ onStartChat }) => {
  const { profile } = useAuth();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [pendingRequests, setPendingRequests] = useState<Friend[]>([]);
  const [searchUsername, setSearchUsername] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (profile) {
      loadFriends();
    }
  }, [profile]);

  const loadFriends = async () => {
    if (!profile) return;

    // Get friendships where user is requester
    const { data: requesterData } = await supabase
      .from('friendships')
      .select(`
        id,
        status,
        addressee:profiles!friendships_addressee_id_fkey (id, username, email, avatar_url)
      `)
      .eq('requester_id', profile.id);

    // Get friendships where user is addressee
    const { data: addresseeData } = await supabase
      .from('friendships')
      .select(`
        id,
        status,
        requester:profiles!friendships_requester_id_fkey (id, username, email, avatar_url)
      `)
      .eq('addressee_id', profile.id);

    const allFriends: Friend[] = [];
    const pending: Friend[] = [];

    requesterData?.forEach((f: { id: string; status: string; addressee: { id: string; username: string; email: string; avatar_url: string | null } }) => {
      const friend = {
        id: f.addressee.id,
        username: f.addressee.username,
        email: f.addressee.email,
        avatar_url: f.addressee.avatar_url,
        friendshipId: f.id,
        status: f.status,
        isRequester: true,
      };
      if (f.status === 'accepted') {
        allFriends.push(friend);
      } else if (f.status === 'pending') {
        pending.push(friend);
      }
    });

    addresseeData?.forEach((f: { id: string; status: string; requester: { id: string; username: string; email: string; avatar_url: string | null } }) => {
      const friend = {
        id: f.requester.id,
        username: f.requester.username,
        email: f.requester.email,
        avatar_url: f.requester.avatar_url,
        friendshipId: f.id,
        status: f.status,
        isRequester: false,
      };
      if (f.status === 'accepted') {
        allFriends.push(friend);
      } else if (f.status === 'pending') {
        pending.push(friend);
      }
    });

    setFriends(allFriends);
    setPendingRequests(pending);
  };

  const searchAndAddFriend = async () => {
    if (!profile || !searchUsername.trim()) return;
    setIsSearching(true);

    const { data: foundUser, error } = await supabase
      .from('profiles')
      .select('*')
      .ilike('username', searchUsername.trim())
      .neq('id', profile.id)
      .maybeSingle();

    if (error || !foundUser) {
      toast({
        title: 'User not found',
        description: 'No user found with that username.',
        variant: 'destructive',
      });
      setIsSearching(false);
      return;
    }

    // Check if friendship already exists
    const { data: existing } = await supabase
      .from('friendships')
      .select('*')
      .or(`requester_id.eq.${profile.id},addressee_id.eq.${profile.id}`)
      .or(`requester_id.eq.${foundUser.id},addressee_id.eq.${foundUser.id}`)
      .maybeSingle();

    if (existing) {
      toast({
        title: 'Already connected',
        description: 'You already have a connection with this user.',
        variant: 'destructive',
      });
      setIsSearching(false);
      return;
    }

    const { error: insertError } = await supabase
      .from('friendships')
      .insert({
        requester_id: profile.id,
        addressee_id: foundUser.id,
      });

    if (insertError) {
      toast({
        title: 'Error',
        description: 'Could not send friend request.',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Request sent!',
        description: `Friend request sent to ${foundUser.username}.`,
      });
      setSearchUsername('');
      loadFriends();
    }

    setIsSearching(false);
  };

  const acceptRequest = async (friendshipId: string) => {
    await supabase
      .from('friendships')
      .update({ status: 'accepted' })
      .eq('id', friendshipId);
    
    toast({
      title: 'Friend added!',
      description: 'You can now start chatting.',
    });
    loadFriends();
  };

  const rejectRequest = async (friendshipId: string) => {
    await supabase
      .from('friendships')
      .delete()
      .eq('id', friendshipId);
    
    loadFriends();
  };

  return (
    <div className="flex flex-col h-full">
      <GlassCard variant="subtle" className="rounded-none border-x-0 border-t-0">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-primary" />
          <h2 className="font-semibold text-foreground">Friends</h2>
        </div>
      </GlassCard>

      <div className="p-4 space-y-4 flex-1 overflow-y-auto">
        {/* Add Friend Section */}
        <GlassCard variant="subtle">
          <h3 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
            <UserPlus className="w-4 h-4" />
            Add Friend
          </h3>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by username..."
                value={searchUsername}
                onChange={(e) => setSearchUsername(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && searchAndAddFriend()}
                className="pl-9 bg-card/50 border-border/50"
              />
            </div>
            <Button
              onClick={searchAndAddFriend}
              disabled={isSearching || !searchUsername.trim()}
              className="bg-primary hover:bg-primary/90"
            >
              Add
            </Button>
          </div>
        </GlassCard>

        {/* Pending Requests */}
        {pendingRequests.filter(r => !r.isRequester).length > 0 && (
          <GlassCard variant="subtle">
            <h3 className="text-sm font-medium text-foreground mb-3">
              Pending Requests
            </h3>
            <div className="space-y-2">
              {pendingRequests.filter(r => !r.isRequester).map((request) => (
                <div key={request.friendshipId} className="flex items-center gap-3 p-2 rounded-lg bg-card/30">
                  <Avatar className="w-10 h-10">
                    <AvatarImage src={request.avatar_url || undefined} />
                    <AvatarFallback className="bg-primary/20 text-primary">
                      {request.username.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="font-medium text-foreground">{request.username}</p>
                    <p className="text-xs text-muted-foreground">Wants to be your friend</p>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => acceptRequest(request.friendshipId)}
                    className="text-primary hover:text-primary/80"
                  >
                    <Check className="w-5 h-5" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => rejectRequest(request.friendshipId)}
                    className="text-destructive hover:text-destructive/80"
                  >
                    <X className="w-5 h-5" />
                  </Button>
                </div>
              ))}
            </div>
          </GlassCard>
        )}

        {/* Sent Requests */}
        {pendingRequests.filter(r => r.isRequester).length > 0 && (
          <GlassCard variant="subtle">
            <h3 className="text-sm font-medium text-foreground mb-3">
              Sent Requests
            </h3>
            <div className="space-y-2">
              {pendingRequests.filter(r => r.isRequester).map((request) => (
                <div key={request.friendshipId} className="flex items-center gap-3 p-2 rounded-lg bg-card/30">
                  <Avatar className="w-10 h-10">
                    <AvatarImage src={request.avatar_url || undefined} />
                    <AvatarFallback className="bg-primary/20 text-primary">
                      {request.username.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="font-medium text-foreground">{request.username}</p>
                    <p className="text-xs text-muted-foreground">Pending...</p>
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>
        )}

        {/* Friends List */}
        <GlassCard variant="subtle">
          <h3 className="text-sm font-medium text-foreground mb-3">
            Your Friends ({friends.length})
          </h3>
          {friends.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-4">
              No friends yet. Add someone above!
            </p>
          ) : (
            <div className="space-y-2">
              {friends.map((friend) => (
                <div
                  key={friend.id}
                  className="flex items-center gap-3 p-2 rounded-lg bg-card/30 hover:bg-card/50 transition-colors"
                >
                  <Avatar className="w-10 h-10">
                    <AvatarImage src={friend.avatar_url || undefined} />
                    <AvatarFallback className="bg-primary/20 text-primary">
                      {friend.username.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="font-medium text-foreground">{friend.username}</p>
                    <p className="text-xs text-muted-foreground">{friend.email}</p>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => onStartChat(friend.id)}
                    className="text-primary hover:text-primary/80"
                  >
                    <MessageCircle className="w-5 h-5" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </GlassCard>
      </div>
    </div>
  );
};
