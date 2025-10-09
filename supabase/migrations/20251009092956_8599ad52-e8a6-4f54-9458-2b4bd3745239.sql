-- Create chat_messages table for live support chat
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sender_name TEXT NOT NULL,
  content TEXT NOT NULL,
  is_admin BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_chat_messages_room_id ON public.chat_messages(room_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON public.chat_messages(created_at);

-- Enable Row Level Security
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Allow users to view messages in their own room
CREATE POLICY "Users can view their own chat messages"
ON public.chat_messages
FOR SELECT
TO authenticated
USING (
  room_id = auth.uid() OR 
  is_admin = true OR
  sender_id = auth.uid()
);

-- Allow users to send messages in their own room
CREATE POLICY "Users can send messages in their own room"
ON public.chat_messages
FOR INSERT
TO authenticated
WITH CHECK (
  sender_id = auth.uid() AND
  room_id = auth.uid()
);

-- Allow admins to send messages to any room
CREATE POLICY "Admins can send messages to any room"
ON public.chat_messages
FOR INSERT
TO authenticated
WITH CHECK (
  is_admin = true AND
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
);

-- Allow admins to view all messages
CREATE POLICY "Admins can view all messages"
ON public.chat_messages
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
);

-- Enable realtime for chat messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;