CREATE OR REPLACE FUNCTION public.can_view_profile(_profile_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT
    auth.uid() = _profile_id
    OR EXISTS (
      SELECT 1
      FROM public.enrollments e
      JOIN public.courses c ON c.id = e.course_id
      WHERE e.student_id = _profile_id
        AND c.lecturer_id = auth.uid()
        AND e.status = 'approved'
    )
$function$;

ALTER TABLE public.enrollments
  ADD CONSTRAINT enrollments_status_check
  CHECK (status IN ('pending', 'approved', 'rejected'));