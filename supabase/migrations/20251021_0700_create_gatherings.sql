/*
  # Gatherings Feature

  1. New Tables
    - `gatherings` - Restaurant-based meal gatherings
    - `gathering_participants` - Participants in each gathering

  2. Changes
    - Add `gathering_id` to `threads` table (link thread to gathering)

  3. Security
    - Enable RLS on new tables
    - Gatherings visible to all authenticated users
    - Participants can join/leave freely
*/

-- Create gatherings table
CREATE TABLE IF NOT EXISTS gatherings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Place information (from Google Places)
  place_id TEXT NOT NULL,
  place_name TEXT NOT NULL,
  place_address TEXT,
  place_photo_url TEXT,
  place_lat NUMERIC,
  place_lng NUMERIC,
  
  -- Gathering details
  host_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  
  -- Scheduling
  scheduled_at TIMESTAMPTZ NOT NULL,
  max_participants INT DEFAULT 4 CHECK (max_participants >= 2 AND max_participants <= 10),
  current_count INT DEFAULT 0 CHECK (current_count >= 0),
  
  -- Status
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'closed', 'completed', 'cancelled')),
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create gathering_participants table
CREATE TABLE IF NOT EXISTS gathering_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gathering_id UUID REFERENCES gatherings(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  
  status TEXT DEFAULT 'joined' CHECK (status IN ('joined', 'left')),
  is_host BOOLEAN DEFAULT FALSE,
  
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Unique constraint: one user can only have one active participation per gathering
  UNIQUE(gathering_id, user_id)
);

-- Add gathering_id to threads table
ALTER TABLE threads ADD COLUMN IF NOT EXISTS gathering_id UUID REFERENCES gatherings(id) ON DELETE SET NULL;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS gatherings_place_id_idx ON gatherings(place_id);
CREATE INDEX IF NOT EXISTS gatherings_status_idx ON gatherings(status);
CREATE INDEX IF NOT EXISTS gatherings_scheduled_at_idx ON gatherings(scheduled_at);
CREATE INDEX IF NOT EXISTS gatherings_host_id_idx ON gatherings(host_id);
CREATE INDEX IF NOT EXISTS gathering_participants_gathering_idx ON gathering_participants(gathering_id);
CREATE INDEX IF NOT EXISTS gathering_participants_user_idx ON gathering_participants(user_id);
CREATE INDEX IF NOT EXISTS threads_gathering_id_idx ON threads(gathering_id);

-- Enable RLS on new tables
ALTER TABLE gatherings ENABLE ROW LEVEL SECURITY;
ALTER TABLE gathering_participants ENABLE ROW LEVEL SECURITY;

-- Gatherings policies
CREATE POLICY "Anyone can read open gatherings"
  ON gatherings FOR SELECT
  TO authenticated
  USING (status = 'open' OR status = 'closed');

CREATE POLICY "Users can create gatherings"
  ON gatherings FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = host_id);

CREATE POLICY "Hosts can update own gatherings"
  ON gatherings FOR UPDATE
  TO authenticated
  USING (auth.uid() = host_id)
  WITH CHECK (auth.uid() = host_id);

CREATE POLICY "Hosts can delete own gatherings"
  ON gatherings FOR DELETE
  TO authenticated
  USING (auth.uid() = host_id);

-- Gathering participants policies
CREATE POLICY "Anyone can read participants"
  ON gathering_participants FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can join gatherings"
  ON gathering_participants FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own participation"
  ON gathering_participants FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove own participation"
  ON gathering_participants FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Function to update gathering current_count
CREATE OR REPLACE FUNCTION update_gathering_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.status = 'joined' THEN
    UPDATE gatherings
    SET current_count = current_count + 1
    WHERE id = NEW.gathering_id;
  ELSIF TG_OP = 'UPDATE' AND OLD.status = 'left' AND NEW.status = 'joined' THEN
    UPDATE gatherings
    SET current_count = current_count + 1
    WHERE id = NEW.gathering_id;
  ELSIF TG_OP = 'UPDATE' AND OLD.status = 'joined' AND NEW.status = 'left' THEN
    UPDATE gatherings
    SET current_count = current_count - 1
    WHERE id = NEW.gathering_id;
  ELSIF TG_OP = 'DELETE' AND OLD.status = 'joined' THEN
    UPDATE gatherings
    SET current_count = current_count - 1
    WHERE id = OLD.gathering_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update gathering count
DROP TRIGGER IF EXISTS update_gathering_count_trigger ON gathering_participants;
CREATE TRIGGER update_gathering_count_trigger
  AFTER INSERT OR UPDATE OR DELETE ON gathering_participants
  FOR EACH ROW
  EXECUTE FUNCTION update_gathering_count();

-- Function to auto-close full gatherings
CREATE OR REPLACE FUNCTION check_gathering_full()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.current_count >= NEW.max_participants AND NEW.status = 'open' THEN
    NEW.status = 'closed';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-close full gatherings
DROP TRIGGER IF EXISTS check_gathering_full_trigger ON gatherings;
CREATE TRIGGER check_gathering_full_trigger
  BEFORE UPDATE ON gatherings
  FOR EACH ROW
  EXECUTE FUNCTION check_gathering_full();

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON gatherings TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON gathering_participants TO authenticated;
