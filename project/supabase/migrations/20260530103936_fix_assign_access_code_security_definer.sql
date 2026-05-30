
/*
  # Fix assign_access_code trigger function - add SECURITY DEFINER

  ## Problem
  The trg_assign_access_code trigger on public.profiles calls assign_access_code(),
  which performs a SELECT on the profiles table to check for duplicate access codes.
  Without SECURITY DEFINER, this SELECT runs as the newly-created user who has no
  RLS access yet, causing "Database error saving new user" on registration.

  ## Fix
  Recreate assign_access_code() and generate_access_code() with SECURITY DEFINER
  so they run as the postgres owner and bypass RLS during the trigger execution.

  ## Also fixes
  The handle_new_user trigger search_path is set to public for safety.
*/

-- Recreate generate_access_code with SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.generate_access_code()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result text := '';
  i integer;
BEGIN
  FOR i IN 1..6 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  END LOOP;
  RETURN result;
END;
$$;

-- Recreate assign_access_code with SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.assign_access_code()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_code text;
  attempts integer := 0;
BEGIN
  IF NEW.access_code IS NULL THEN
    LOOP
      new_code := generate_access_code();
      EXIT WHEN NOT EXISTS (SELECT 1 FROM profiles WHERE access_code = new_code);
      attempts := attempts + 1;
      IF attempts > 100 THEN
        new_code := generate_access_code() || to_char(floor(random()*100)::int, 'FM00');
        EXIT;
      END IF;
    END LOOP;
    NEW.access_code := new_code;
  END IF;
  RETURN NEW;
END;
$$;

-- Also ensure handle_new_user has safe search_path
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;
