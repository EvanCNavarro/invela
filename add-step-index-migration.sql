-- Add step_index column to kyb_fields if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'kyb_fields' AND column_name = 'step_index'
    ) THEN
        ALTER TABLE kyb_fields ADD COLUMN step_index INTEGER NOT NULL DEFAULT 0;
    END IF;
END $$;

-- Add step_index column to card_fields if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'card_fields' AND column_name = 'step_index'
    ) THEN
        ALTER TABLE card_fields ADD COLUMN step_index INTEGER NOT NULL DEFAULT 0;
    END IF;
END $$;

-- Add step_index column to security_fields if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'security_fields' AND column_name = 'step_index'
    ) THEN
        ALTER TABLE security_fields ADD COLUMN step_index INTEGER NOT NULL DEFAULT 0;
    END IF;
END $$;