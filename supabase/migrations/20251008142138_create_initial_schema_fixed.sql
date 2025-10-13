/*
  # EatingMeeting Initial Schema

  1. New Tables
    - `profiles` - User profile information
    - `photos` - User profile photos
    - `blocks` - User blocking relationships
    - `reports` - User reports for moderation
    - `threads` - Chat conversations
    - `members` - Thread participants
    - `messages` - Chat messages
    - `slots` - Meal proposals

  2. Security
    - Enable RLS on all tables
    - Users can read public profiles, write own profile only
    - Messages and threads visible only to thread members
    - Blocks enforce filtering in queries
*/

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text NOT NULL,
  bio text DEFAULT '',
  diet_tags jsonb DEFAULT '[]'::jsonb,
  budget_range text DEFAULT 'medium',
  time_slots jsonb DEFAULT '[]'::jsonb,
  approx_lat numeric,
  approx_lng numeric,
  push_token text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create photos table
CREATE TABLE IF NOT EXISTS photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  url text NOT NULL,
  is_primary boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Create blocks table
CREATE TABLE IF NOT EXISTS blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  blocked_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(blocker_id, blocked_id)
);

-- Create reports table
CREATE TABLE IF NOT EXISTS reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  target_user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  reason text NOT NULL,
  details text DEFAULT '',
  status text DEFAULT 'pending',
  created_at timestamptz DEFAULT now()
);

-- Create threads table
CREATE TABLE IF NOT EXISTS threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  is_group boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create members table
CREATE TABLE IF NOT EXISTS members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid REFERENCES threads(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  role text DEFAULT 'member',
  last_read timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  UNIQUE(thread_id, user_id)
);

-- Create messages table
CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid REFERENCES threads(id) ON DELETE CASCADE NOT NULL,
  sender_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  text text,
  image_url text,
  message_type text DEFAULT 'user',
  created_at timestamptz DEFAULT now()
);

-- Create slots table (meal proposals)
CREATE TABLE IF NOT EXISTS slots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid REFERENCES threads(id) ON DELETE CASCADE NOT NULL,
  place_name text NOT NULL,
  place_category text,
  place_address text,
  proposer_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  starts_at timestamptz NOT NULL,
  notes text DEFAULT '',
  status text DEFAULT 'proposed',
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE slots ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can read all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Photos policies
CREATE POLICY "Users can read all photos"
  ON photos FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can manage own photos"
  ON photos FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Blocks policies
CREATE POLICY "Users can read own blocks"
  ON blocks FOR SELECT
  TO authenticated
  USING (auth.uid() = blocker_id);

CREATE POLICY "Users can manage own blocks"
  ON blocks FOR ALL
  TO authenticated
  USING (auth.uid() = blocker_id)
  WITH CHECK (auth.uid() = blocker_id);

-- Reports policies
CREATE POLICY "Users can create reports"
  ON reports FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = reporter_id);

CREATE POLICY "Users can read own reports"
  ON reports FOR SELECT
  TO authenticated
  USING (auth.uid() = reporter_id);

-- Threads policies
CREATE POLICY "Users can read threads they are members of"
  ON threads FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.thread_id = threads.id
      AND members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create threads"
  ON threads FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Members policies
CREATE POLICY "Users can read members of their threads"
  ON members FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM members m
      WHERE m.thread_id = members.thread_id
      AND m.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert members when creating threads"
  ON members FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update own member record"
  ON members FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Messages policies
CREATE POLICY "Users can read messages in their threads"
  ON messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.thread_id = messages.thread_id
      AND members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can send messages to their threads"
  ON messages FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.thread_id = messages.thread_id
      AND members.user_id = auth.uid()
    )
    AND auth.uid() = sender_id
  );

-- Slots policies
CREATE POLICY "Users can read slots in their threads"
  ON slots FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.thread_id = slots.thread_id
      AND members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create slots in their threads"
  ON slots FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.thread_id = slots.thread_id
      AND members.user_id = auth.uid()
    )
    AND auth.uid() = proposer_id
  );

CREATE POLICY "Users can update slots in their threads"
  ON slots FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.thread_id = slots.thread_id
      AND members.user_id = auth.uid()
    )
  );

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS profiles_location_idx ON profiles(approx_lat, approx_lng);
CREATE INDEX IF NOT EXISTS messages_thread_created_idx ON messages(thread_id, created_at DESC);
CREATE INDEX IF NOT EXISTS members_user_idx ON members(user_id);
CREATE INDEX IF NOT EXISTS members_thread_idx ON members(thread_id);
CREATE INDEX IF NOT EXISTS slots_thread_idx ON slots(thread_id);
CREATE INDEX IF NOT EXISTS threads_updated_idx ON threads(updated_at DESC);

-- Create function to update thread updated_at timestamp
CREATE OR REPLACE FUNCTION update_thread_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE threads
  SET updated_at = now()
  WHERE id = NEW.thread_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update thread timestamp on new messages
DROP TRIGGER IF EXISTS update_thread_on_message ON messages;
CREATE TRIGGER update_thread_on_message
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION update_thread_timestamp();