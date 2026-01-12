ALTER TABLE public.measurements
ADD COLUMN IF NOT EXISTS trust_check jsonb;

-- 선택(권장): updated_at 자동 갱신 트리거가 없다면 추가
-- (이미 있으면 생략)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'set_measurements_updated_at'
  ) THEN
    ALTER TABLE public.measurements
    ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

    CREATE OR REPLACE FUNCTION public.set_updated_at()
    RETURNS trigger AS $f$
    BEGIN
      NEW.updated_at = now();
      RETURN NEW;
    END;
    $f$ LANGUAGE plpgsql;

    CREATE TRIGGER set_measurements_updated_at
    BEFORE UPDATE ON public.measurements
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;
