-- ==============================================================================
-- MIGRATION: Add 'email' to profiles and sync with auth.users
-- ==============================================================================

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email TEXT;

UPDATE public.profiles
SET email = auth.users.email
FROM auth.users
WHERE public.profiles.id = auth.users.id;

CREATE OR REPLACE FUNCTION public.handle_user_email_sync()
RETURNS TRIGGER AS c:\pos html\v3
BEGIN
  UPDATE public.profiles
  SET email = NEW.email
  WHERE id = NEW.id;
  RETURN NEW;
END;
c:\pos html\v3 LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_email_sync ON auth.users;
CREATE TRIGGER on_auth_user_email_sync
AFTER UPDATE ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_user_email_sync();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS c:\pos html\v3
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
c:\pos html\v3 LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();

