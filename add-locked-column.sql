-- Add locked column to tasks table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tasks' AND column_name = 'locked') THEN
        ALTER TABLE tasks ADD COLUMN locked BOOLEAN DEFAULT FALSE;
    END IF;
END
$$;