-- 1. Restrict profile visibility
DROP POLICY IF EXISTS "Profiles are viewable by authenticated users" ON public.profiles;

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
    )
$function$;

CREATE POLICY "Users view own profile or enrolled students"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (public.can_view_profile(id));

-- 2. Explicitly deny role self-management for signed-in users
CREATE POLICY "No self insert of roles"
  ON public.user_roles FOR INSERT
  TO authenticated
  WITH CHECK (false);

CREATE POLICY "No self update of roles"
  ON public.user_roles FOR UPDATE
  TO authenticated
  USING (false)
  WITH CHECK (false);

CREATE POLICY "No self delete of roles"
  ON public.user_roles FOR DELETE
  TO authenticated
  USING (false);