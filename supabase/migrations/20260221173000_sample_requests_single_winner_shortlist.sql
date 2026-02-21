-- PAS M3.1: When setting WINNER, demote other WINNER to SHORTLIST (not NONE)

CREATE OR REPLACE FUNCTION public.enforce_single_sample_winner()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.choice_status = 'WINNER' THEN
    UPDATE public.supplier_sample_requests
    SET choice_status = 'SHORTLIST'
    WHERE project_id = NEW.project_id
      AND id <> NEW.id
      AND choice_status = 'WINNER';
  END IF;

  RETURN NEW;
END;
$$;

-- Keep trigger as-is (it already calls this function)
