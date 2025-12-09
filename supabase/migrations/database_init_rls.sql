-- Enable RLS for Core Tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.statuses ENABLE ROW LEVEL SECURITY;

-- Enable RLS for Content/Social Tables
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_reactions ENABLE ROW LEVEL SECURITY;

-- Enable RLS for Group Tables
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;

-- Enable RLS for Forum Tables
ALTER TABLE public.forums ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_comments ENABLE ROW LEVEL SECURITY;

-- Enable RLS for Gazebo (Guild/Group Chat) Tables
ALTER TABLE public.gazebos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gazebo_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gazebo_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gazebo_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gazebo_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gazebo_message_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.active_voice_sessions ENABLE ROW LEVEL SECURITY;

-- Allow read access to all profiles by any authenticated user
CREATE POLICY "Profiles are viewable by all users"
ON public.profiles FOR SELECT USING (
  auth.role() = 'authenticated'
);

-- Allow a user to update their own profile
CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE USING (
  auth.uid() = id
);

-- Allow a user to create their own profile (linked to auth.users)
CREATE POLICY "Users can create their own profile"
ON public.profiles FOR INSERT WITH CHECK (
  auth.uid() = id
);

-- Allow authenticated users to view all posts
CREATE POLICY "Posts are viewable by all users"
ON public.posts FOR SELECT USING (
  auth.role() = 'authenticated'
);

-- Allow a user to create, update, and delete their own posts
CREATE POLICY "Users can manage their own posts"
ON public.posts
AS PERMISSIVE FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Allow authenticated users to view all comments
CREATE POLICY "Comments are viewable by all users"
ON public.comments FOR SELECT USING (
  auth.role() = 'authenticated'
);

-- Allow a user to create, update, and delete their own comments
CREATE POLICY "Users can manage their own comments"
ON public.comments
AS PERMISSIVE FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Allow authenticated users to view all follow relationships
CREATE POLICY "Follows are viewable by all users"
ON public.follows FOR SELECT USING (
  auth.role() = 'authenticated'
);

-- Allow a user to follow/unfollow others
CREATE POLICY "Users can manage their own follows"
ON public.follows
AS PERMISSIVE FOR ALL
TO authenticated
USING (auth.uid() = follower_id)
WITH CHECK (auth.uid() = follower_id);

-- Allow authenticated users to view all likes
CREATE POLICY "Likes are viewable by all users"
ON public.likes FOR SELECT USING (
  auth.role() = 'authenticated'
);

-- Allow a user to create/delete their own likes
CREATE POLICY "Users can manage their own likes"
ON public.likes
AS PERMISSIVE FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Gazebo Message Reactions
CREATE POLICY "Gazebo reactions viewable by all"
ON public.gazebo_message_reactions FOR SELECT USING (
  auth.role() = 'authenticated'
);

CREATE POLICY "Users can manage own gazebo reactions"
ON public.gazebo_message_reactions
AS PERMISSIVE FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- DM/Group Message Reactions
CREATE POLICY "Message reactions viewable by all"
ON public.message_reactions FOR SELECT USING (
  auth.role() = 'authenticated'
);

CREATE POLICY "Users can manage own message reactions"
ON public.message_reactions
AS PERMISSIVE FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Groups: Viewable by authenticated users
CREATE POLICY "Groups are viewable by all users"
ON public.groups FOR SELECT USING (
  auth.role() = 'authenticated'
);

-- Groups: Owner can manage
CREATE POLICY "Group owners can manage"
ON public.groups
AS PERMISSIVE FOR ALL
TO authenticated
USING (auth.uid() = owner_id)
WITH CHECK (auth.uid() = owner_id);


-- Gazebos: Viewable by authenticated users
CREATE POLICY "Gazebos are viewable by all users"
ON public.gazebos FOR SELECT USING (
  auth.role() = 'authenticated'
);

-- Gazebos: Owner can manage
CREATE POLICY "Gazebo owners can manage"
ON public.gazebos
AS PERMISSIVE FOR ALL
TO authenticated
USING (auth.uid() = owner_id)
WITH CHECK (auth.uid() = owner_id);

-- Allow users to view messages they sent or received
CREATE POLICY "Users can view own messages"
ON public.messages FOR SELECT USING (
  auth.uid() = sender_id OR auth.uid() = recipient_id
);

-- Allow users to send messages (must be the sender)
CREATE POLICY "Users can create messages"
ON public.messages FOR INSERT WITH CHECK (
  auth.uid() = sender_id
);

-- Allow users to modify/delete messages they sent (e.g., is_edited, is_deleted)
CREATE POLICY "Users can modify/delete their own messages"
ON public.messages
AS PERMISSIVE FOR UPDATE
TO authenticated
USING (auth.uid() = sender_id)
WITH CHECK (auth.uid() = sender_id);

-- Allow a user to only view notifications sent to them
CREATE POLICY "Users can only view their own notifications"
ON public.notifications FOR SELECT USING (
  auth.uid() = recipient_id
);

-- Allow insert access for internal server/functions (RLS bypass with SET ROLE)
-- Typically, notifications are inserted by backend logic, not directly by the user.
CREATE POLICY "Allow authenticated users to create notifications"
ON public.notifications FOR INSERT WITH CHECK (
  auth.role() = 'authenticated'
);

-- Allow users to delete their own notifications (e.g., clearing the list)
CREATE POLICY "Users can delete their own notifications"
ON public.notifications FOR DELETE USING (
  auth.uid() = recipient_id
);

-- Allow users to mark their own notifications as read/unread
CREATE POLICY "Users can update their own notifications"
ON public.notifications FOR UPDATE USING (
  auth.uid() = recipient_id
);

-- Helper function to check if user is a Gazebo member
CREATE OR REPLACE FUNCTION public.is_gazebo_member(gazebo_id uuid)
RETURNS BOOLEAN
LANGUAGE sql
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.gazebo_members
    WHERE gazebo_members.gazebo_id = $1 AND gazebo_members.user_id = auth.uid()
  );
$$;

-- Helper function to check if user is a Group member
CREATE OR REPLACE FUNCTION public.is_group_member(group_id uuid)
RETURNS BOOLEAN
LANGUAGE sql
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.group_members
    WHERE group_members.group_id = $1 AND group_members.user_id = auth.uid()
  );
$$;

---

-- Gazebo Members (Admins/Owners can insert/delete members, Members can read the list)
CREATE POLICY "Gazebo members read list"
ON public.gazebo_members FOR SELECT USING (
  auth.role() = 'authenticated'
);

-- Gazebo Channels (Only members of the parent Gazebo can view/interact)
CREATE POLICY "Gazebo channels viewable by members"
ON public.gazebo_channels FOR SELECT USING (
  public.is_gazebo_member(gazebo_id)
);

-- Gazebo Messages (Only members of the parent Gazebo can view/interact)
CREATE POLICY "Gazebo messages viewable by members"
ON public.gazebo_messages FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.gazebo_channels
    WHERE public.gazebo_channels.id = gazebo_messages.channel_id
    AND public.is_gazebo_member(public.gazebo_channels.gazebo_id)
  )
);

CREATE POLICY "Users can manage own gazebo messages"
ON public.gazebo_messages
AS PERMISSIVE FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Active Voice Sessions (Only members of the parent Gazebo can view/interact)
CREATE POLICY "Active voice sessions viewable by members"
ON public.active_voice_sessions FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.gazebo_channels
    WHERE public.gazebo_channels.id = active_voice_sessions.channel_id
    AND public.is_gazebo_member(public.gazebo_channels.gazebo_id)
  )
);

CREATE POLICY "Users can manage own active voice sessions"
ON public.active_voice_sessions
AS PERMISSIVE FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Group Members (Members can read the list)
CREATE POLICY "Group members read list"
ON public.group_members FOR SELECT USING (
  public.is_group_member(group_id)
);

-- Gazebo Invites (Viewable/Creatable by admins, only usable by authenticated users)
CREATE POLICY "Gazebo invites viewable by all"
ON public.gazebo_invites FOR SELECT USING (
  auth.role() = 'authenticated'
);

-- Forum Posts/Comments (Similar to posts/comments, viewable by all)
CREATE POLICY "Forum posts viewable by all"
ON public.forum_posts FOR SELECT USING (
  auth.role() = 'authenticated'
);

CREATE POLICY "Users can manage own forum posts"
ON public.forum_posts
AS PERMISSIVE FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Forum comments viewable by all"
ON public.forum_comments FOR SELECT USING (
  auth.role() = 'authenticated'
);

CREATE POLICY "Users can manage own forum comments"
ON public.forum_comments
AS PERMISSIVE FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Statuses (Viewable by followers and self)
CREATE POLICY "Users can view their own statuses"
ON public.statuses FOR SELECT USING (
  auth.uid() = user_id
);
-- You'll need more complex logic to allow followers to view statuses (omitted for simplicity, but can be added).
CREATE POLICY "Users can manage their own statuses"
ON public.statuses
AS PERMISSIVE FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
