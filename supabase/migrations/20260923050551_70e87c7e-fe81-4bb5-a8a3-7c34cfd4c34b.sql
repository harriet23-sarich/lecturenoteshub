ALTER TABLE public.notes ADD COLUMN IF NOT EXISTS watermarked_at timestamptz;

COMMENT ON COLUMN public.notes.watermarked_at IS 'Time the permanent JULIUS SARICH watermark was embedded into the stored PDF';