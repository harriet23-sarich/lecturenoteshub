REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.owns_course(uuid, uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.is_enrolled_approved(uuid, uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, public, authenticated;