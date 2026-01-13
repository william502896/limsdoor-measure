-- Add scheduled_date and scheduled_time columns to sc_schedules if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'sc_schedules'
        AND column_name = 'scheduled_date'
    ) THEN
        ALTER TABLE public.sc_schedules ADD COLUMN scheduled_date DATE;
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'sc_schedules'
        AND column_name = 'scheduled_time'
    ) THEN
        ALTER TABLE public.sc_schedules ADD COLUMN scheduled_time TIME;
    END IF;
END $$;

-- Reload schema cache ensuring Supabase API picks up the change
NOTIFY pgrst, 'reload schema';
