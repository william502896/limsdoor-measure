-- Add notes column to sc_schedules if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'sc_schedules'
        AND column_name = 'notes'
    ) THEN
        ALTER TABLE public.sc_schedules ADD COLUMN notes TEXT;
    END IF;
END $$;

-- Reload schema cache ensuring Supabase API picks up the change
NOTIFY pgrst, 'reload schema';
