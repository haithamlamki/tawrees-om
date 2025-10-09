import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Send, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface ChatMessage {
  id: string;
  room_id: string;
  sender_id: string;
  sender_name: string;
  content: string;
  is_admin: boolean;
  created_at: string;
}

interface ChatRoom {
  room_id: string;
  customer_name: string;
  last_message: string;
  last_message_time: string;
  unread_count: number;
}

interface CustomerProfile {
  full_name: string;
  email: string;
  phone?: string;
  company_name?: string;
}

export default function WMSSupport() {
  const { t } = useTranslation();
  const [chatRooms, setChatRooms] = useState<ChatRoom[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [selectedCustomerProfile, setSelectedCustomerProfile] = useState<CustomerProfile | null>(null);

  useEffect(() => {
    loadCurrentUser();
    loadChatRooms();
  }, []);

  useEffect(() => {
    if (selectedRoom) {
      loadMessages(selectedRoom);
      loadCustomerProfile(selectedRoom);
      
      // Subscribe to real-time updates for the selected room
      const channel = supabase
        .channel(`chat-room-${selectedRoom}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'chat_messages',
            filter: `room_id=eq.${selectedRoom}`
          },
          (payload) => {
            setMessages((current) => [...current, payload.new as ChatMessage]);
            scrollToBottom();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [selectedRoom]);

  const loadCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .single();
      
      setCurrentUser({ ...user, full_name: profile?.full_name || 'Admin' });
    }
  };

  const loadChatRooms = async () => {
    // Load all system users from profiles
    const { data: profilesData, error: profilesError } = await supabase
      .from('profiles')
      .select('id, full_name, email, company_name')
      .order('full_name', { ascending: true });

    console.log('Profiles query result:', { profilesData, profilesError });

    if (profilesError) {
      console.error('Error loading profiles:', profilesError);
      toast.error('Failed to load users. Please check your admin permissions.');
      return;
    }

    if (!profilesData || profilesData.length === 0) {
      console.warn('No profiles found in the database');
      setChatRooms([]);
      return;
    }

    // Load all messages to get last message and unread count per user
    const { data: messagesData, error: messagesError } = await supabase
      .from('chat_messages')
      .select('room_id, sender_name, content, created_at, is_admin')
      .order('created_at', { ascending: false });

    if (messagesError) {
      console.error('Error loading messages:', messagesError);
    }

    // Group messages by room_id to find the last message and count unread
    const lastMessageMap = new Map<string, any>();
    const unreadCountMap = new Map<string, number>();
    
    messagesData?.forEach((message) => {
      if (!lastMessageMap.has(message.room_id)) {
        lastMessageMap.set(message.room_id, message);
      }
      // Count unread messages (customer messages only)
      if (!message.is_admin) {
        unreadCountMap.set(message.room_id, (unreadCountMap.get(message.room_id) || 0) + 1);
      }
    });

    // Create chat rooms from all system users
    const rooms: ChatRoom[] = profilesData.map((profile) => {
      const lastMessage = lastMessageMap.get(profile.id);
      return {
        room_id: profile.id,
        customer_name: profile.full_name || profile.email || 'Unknown User',
        last_message: lastMessage?.content || 'No messages yet',
        last_message_time: lastMessage?.created_at || new Date().toISOString(),
        unread_count: unreadCountMap.get(profile.id) || 0,
      };
    });

    setChatRooms(rooms);
  };

  const loadCustomerProfile = async (userId: string) => {
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('full_name, email, phone, company_name')
      .eq('id', userId)
      .single();

    if (profileError) {
      console.error('Error loading customer profile:', profileError);
      setSelectedCustomerProfile(null);
      return;
    }

    setSelectedCustomerProfile(profile);
  };

  const loadMessages = async (roomId: string) => {
    const { data, error } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('room_id', roomId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error loading messages:', error);
      toast.error('Failed to load messages');
      return;
    }

    setMessages(data || []);
    setTimeout(scrollToBottom, 100);
  };

  const scrollToBottom = () => {
    const scrollArea = document.getElementById('messages-scroll-area');
    if (scrollArea) {
      scrollArea.scrollTop = scrollArea.scrollHeight;
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedRoom || !currentUser) return;

    const { error } = await supabase
      .from('chat_messages')
      .insert({
        room_id: selectedRoom,
        sender_id: currentUser.id,
        sender_name: currentUser.full_name,
        content: newMessage.trim(),
        is_admin: true
      });

    if (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
      return;
    }

    setNewMessage('');
    loadChatRooms(); // Refresh the room list
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const selectedRoomData = chatRooms.find(room => room.room_id === selectedRoom);

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Live Support Messages</h1>
        <p className="text-muted-foreground mt-2">
          View and respond to customer support messages
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-[calc(100vh-200px)]">
        {/* Chat Rooms List */}
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Conversations ({chatRooms.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[calc(100vh-320px)]">
              {chatRooms.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground">
                  No conversations yet
                </div>
              ) : (
                <div className="space-y-1 p-2">
                  {chatRooms.map((room) => (
                    <button
                      key={room.room_id}
                      onClick={() => setSelectedRoom(room.room_id)}
                      className={`w-full text-left p-3 rounded-lg transition-colors ${
                        selectedRoom === room.room_id
                          ? 'bg-primary text-primary-foreground'
                          : 'hover:bg-muted'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-1">
                        <span className="font-medium">{room.customer_name}</span>
                        {room.unread_count > 0 && (
                          <Badge variant="destructive" className="ml-2">
                            {room.unread_count}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm opacity-80 truncate">
                        {room.last_message}
                      </p>
                      <p className="text-xs opacity-60 mt-1">
                        {format(new Date(room.last_message_time), 'MMM d, HH:mm')}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Chat Messages */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>
              {selectedRoomData ? (
                <div>
                  <div className="font-medium text-lg">{selectedCustomerProfile?.full_name || selectedRoomData.customer_name}</div>
                  {selectedCustomerProfile && (
                    <div className="space-y-1 mt-2">
                      {selectedCustomerProfile.email && (
                        <div className="text-sm text-muted-foreground font-normal flex items-center gap-2">
                          <span className="font-medium">Email:</span>
                          <span>{selectedCustomerProfile.email}</span>
                        </div>
                      )}
                      {selectedCustomerProfile.phone && (
                        <div className="text-sm text-muted-foreground font-normal flex items-center gap-2">
                          <span className="font-medium">Phone:</span>
                          <span>{selectedCustomerProfile.phone}</span>
                        </div>
                      )}
                      {selectedCustomerProfile.company_name && (
                        <div className="text-sm text-muted-foreground font-normal flex items-center gap-2">
                          <span className="font-medium">Company:</span>
                          <span>{selectedCustomerProfile.company_name}</span>
                        </div>
                      )}
                    </div>
                  )}
                  {!selectedCustomerProfile && (
                    <div className="text-sm text-muted-foreground font-normal">
                      Customer Support Chat
                    </div>
                  )}
                </div>
              ) : (
                'Select a conversation'
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {selectedRoom ? (
              <>
                <ScrollArea 
                  id="messages-scroll-area"
                  className="h-[calc(100vh-440px)] pr-4"
                >
                  <div className="space-y-4">
                    {messages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex ${
                          message.is_admin ? 'justify-end' : 'justify-start'
                        }`}
                      >
                        <div
                          className={`max-w-[70%] rounded-lg p-3 ${
                            message.is_admin
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted'
                          }`}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-medium">
                              {message.sender_name}
                            </span>
                            {message.is_admin && (
                              <Badge variant="secondary" className="text-xs">
                                Admin
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm">{message.content}</p>
                          <p className="text-xs opacity-70 mt-1">
                            {format(new Date(message.created_at), 'HH:mm')}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>

                <div className="flex gap-2">
                  <Input
                    placeholder="Type your message..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                  />
                  <Button onClick={sendMessage} size="icon">
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </>
            ) : (
              <div className="h-[calc(100vh-440px)] flex items-center justify-center text-muted-foreground">
                Select a conversation to view messages
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
