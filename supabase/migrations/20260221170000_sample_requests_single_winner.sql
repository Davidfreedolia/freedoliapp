-- Enforce single WINNER per project for supplier_sample_requests

-- 1) Function
CREATE OR REPLACE FUNCTION public.enforce_single_sample_winner()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Only act when setting WINNER
  IF NEW.choice_status = 'WINNER' THEN
    UPDATE public.supplier_sample_requests
    SET choice_status = 'NONE'
    WHERE project_id = NEW.project_id
      AND id <> NEW.id
      AND choice_status = 'WINNER';
  END IF;

  RETURN NEW;
END;
$$;

-- 2) Trigger (drop + recreate)
DROP TRIGGER IF EXISTS trg_single_sample_winner ON public.supplier_sample_requests;

CREATE TRIGGER trg_single_sample_winner
AFTER UPDATE OF choice_status ON public.supplier_sample_requests
FOR EACH ROW
WHEN (NEW.choice_status = 'WINNER')
EXECUTE FUNCTION public.enforce_single_sample_winner();
