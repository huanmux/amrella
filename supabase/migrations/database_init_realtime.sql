-- Grant SELECT permission on all tables to the supabase_realtime role
GRANT SELECT ON ALL TABLES IN SCHEMA public TO supabase_realtime;

-- Optionally, grant USAGE on the schema and sequences
GRANT USAGE ON SCHEMA public TO supabase_realtime;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO supabase_realtime;

-- Optional: If you ever create new tables, you'll want these grants applied automatically.
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
GRANT SELECT ON TABLES TO supabase_realtime;

-- Alter the existing 'supabase_realtime' publication to include all necessary tables.
-- The IF EXISTS clause ensures this doesn't error if the publication name is different
-- or if you're running this on an instance where it was manually deleted.
-- 2. Configure Replication Publication (CORRECTED)
-- Remove the 'WITH (wait_for_sync = false)' clause which was causing the syntax error.

ALTER PUBLICATION supabase_realtime ADD TABLE
    public.profiles,
    public.groups,
    public.forums,
    public.gazebos,
    public.gazebo_channels,
    public.group_members,
    public.gazebo_members,
    public.gazebo_invites,
    public.posts,
    public.comments,
    public.forum_posts,
    public.forum_comments,
    public.gazebo_messages,
    public.messages,
    public.active_voice_sessions,
    public.follows,
    public.likes,
    public.message_reactions,
    public.gazebo_message_reactions,
    public.notifications,
    public.statuses; -- Note the semicolon is now right after the last table
