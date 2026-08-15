-- ═══════════════════════════════════════════════════════════════════════════
-- SEH Hub — Row Level Security
--
-- Enforces multi-tenant isolation at the database, so a missing
-- `WHERE school_id = …` in application code cannot leak across schools.
--
-- Depends on two transaction-local settings applied by withTenant()
-- (src/lib/db-session.ts):
--     app.current_user_id
--     app.current_school_id
--
-- PREREQUISITE: the application must NOT connect as a role with BYPASSRLS,
-- and must not own these tables. Postgres skips row security for both. Run
-- scripts/create-app-role.mjs first — it provisions the restricted seh_app
-- role that the app is expected to use.
--
-- Idempotent: safe to re-run.
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── Helper functions ──────────────────────────────────────────────────────
-- app_role() is SECURITY DEFINER on purpose. A policy on `users` that itself
-- selects from `users` makes Postgres raise "infinite recursion detected in
-- policy for relation users". Running the lookup as the definer sidesteps the
-- policy entirely. It is deliberately narrow: it returns one role string for
-- the already-authenticated caller and nothing else.
-- search_path is pinned so the body cannot be hijacked by a caller's path.

CREATE OR REPLACE FUNCTION app_uid() RETURNS uuid
  LANGUAGE sql STABLE
  SET search_path = public, pg_temp
AS $$ SELECT NULLIF(current_setting('app.current_user_id', true), '')::uuid $$;

CREATE OR REPLACE FUNCTION app_sid() RETURNS uuid
  LANGUAGE sql STABLE
  SET search_path = public, pg_temp
AS $$ SELECT NULLIF(current_setting('app.current_school_id', true), '')::uuid $$;

CREATE OR REPLACE FUNCTION app_role() RETURNS text
  LANGUAGE sql STABLE SECURITY DEFINER
  SET search_path = public, pg_temp
AS $$ SELECT role::text FROM users WHERE id = app_uid() $$;

CREATE OR REPLACE FUNCTION app_is_system() RETURNS boolean
  LANGUAGE sql STABLE
  SET search_path = public, pg_temp
AS $$ SELECT current_setting('app.system_context', true) = 'on' $$;

-- Credential lookup for sign-in.
--
-- Authentication is a chicken-and-egg case: the policies need a current user,
-- but establishing who the user is REQUIRES reading the users table first. So
-- this one lookup runs SECURITY DEFINER.
--
-- It is deliberately the narrowest possible hole:
--   * matches exactly one (school slug, email) pair, LIMIT 1
--   * takes no user-controlled SQL, only two scalar parameters
--   * returns no data about any other account, and cannot enumerate
-- The password hash is returned because bcrypt comparison happens in the
-- application. Nothing here reveals rows the caller could not already probe
-- one-at-a-time via a login attempt.
CREATE OR REPLACE FUNCTION app_login_lookup(p_school_slug text, p_email text)
RETURNS TABLE (
  user_id uuid,
  password_hash text,
  full_name text,
  user_role text,
  avatar_url text,
  is_active boolean,
  school_id uuid,
  school_slug text
)
  LANGUAGE sql STABLE SECURITY DEFINER
  SET search_path = public, pg_temp
AS $$
  SELECT u.id, u.password_hash, u.full_name, u.role::text, u.avatar_url,
         COALESCE(u.is_active, true), s.id, s.slug
  FROM users u
  JOIN schools s ON s.id = u.school_id
  WHERE s.slug = p_school_slug
    AND lower(u.email) = lower(p_email)
  LIMIT 1
$$;

-- ─── Enable + FORCE ────────────────────────────────────────────────────────
-- ENABLE alone still exempts the table owner. FORCE closes that, so the
-- policies hold even if the app is later pointed at an owning role.
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'schools','users','cohorts','teacher_cohorts','student_cohorts',
    'parent_student_links','announcements','direct_messages',
    'notifications','automation_jobs'
  ] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', t);
  END LOOP;
END $$;

-- ─── Drop existing policies so this script is re-runnable ──────────────────
DO $$
DECLARE p record;
BEGIN
  FOR p IN SELECT policyname, tablename FROM pg_policies WHERE schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', p.policyname, p.tablename);
  END LOOP;
END $$;


-- ═══ 1. schools ════════════════════════════════════════════════════════════
CREATE POLICY schools_select ON schools FOR SELECT
  USING (id = app_sid());

CREATE POLICY schools_update ON schools FOR UPDATE
  USING (id = app_sid() AND app_role() = 'admin')
  WITH CHECK (id = app_sid() AND app_role() = 'admin');


-- ═══ 2. users ══════════════════════════════════════════════════════════════
CREATE POLICY users_select ON users FOR SELECT
  USING (school_id = app_sid());

CREATE POLICY users_insert ON users FOR INSERT
  WITH CHECK (school_id = app_sid() AND app_role() = 'admin');

CREATE POLICY users_update ON users FOR UPDATE
  USING (school_id = app_sid() AND app_role() = 'admin')
  WITH CHECK (school_id = app_sid() AND app_role() = 'admin');

CREATE POLICY users_delete ON users FOR DELETE
  USING (school_id = app_sid() AND app_role() = 'admin');


-- ═══ 3. cohorts ════════════════════════════════════════════════════════════
CREATE POLICY cohorts_select ON cohorts FOR SELECT
  USING (school_id = app_sid());

CREATE POLICY cohorts_write ON cohorts FOR ALL
  USING (school_id = app_sid() AND app_role() = 'admin')
  WITH CHECK (school_id = app_sid() AND app_role() = 'admin');


-- ═══ 4-6. Join tables ══════════════════════════════════════════════════════
-- Membership rows are visible when the referenced person is in the caller's
-- school; only admins may change them.

CREATE POLICY teacher_cohorts_select ON teacher_cohorts FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM users u WHERE u.id = teacher_cohorts.teacher_id AND u.school_id = app_sid()
  ));

CREATE POLICY teacher_cohorts_write ON teacher_cohorts FOR ALL
  USING (app_role() = 'admin' AND EXISTS (
    SELECT 1 FROM users u WHERE u.id = teacher_cohorts.teacher_id AND u.school_id = app_sid()
  ))
  WITH CHECK (app_role() = 'admin' AND EXISTS (
    SELECT 1 FROM users u WHERE u.id = teacher_cohorts.teacher_id AND u.school_id = app_sid()
  ));

CREATE POLICY student_cohorts_select ON student_cohorts FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM users u WHERE u.id = student_cohorts.student_id AND u.school_id = app_sid()
  ));

CREATE POLICY student_cohorts_write ON student_cohorts FOR ALL
  USING (app_role() = 'admin' AND EXISTS (
    SELECT 1 FROM users u WHERE u.id = student_cohorts.student_id AND u.school_id = app_sid()
  ))
  WITH CHECK (app_role() = 'admin' AND EXISTS (
    SELECT 1 FROM users u WHERE u.id = student_cohorts.student_id AND u.school_id = app_sid()
  ));

CREATE POLICY parent_student_links_select ON parent_student_links FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM users u WHERE u.id = parent_student_links.parent_id AND u.school_id = app_sid()
  ));

CREATE POLICY parent_student_links_write ON parent_student_links FOR ALL
  USING (app_role() = 'admin' AND EXISTS (
    SELECT 1 FROM users u WHERE u.id = parent_student_links.parent_id AND u.school_id = app_sid()
  ))
  WITH CHECK (app_role() = 'admin' AND EXISTS (
    SELECT 1 FROM users u WHERE u.id = parent_student_links.parent_id AND u.school_id = app_sid()
  ));


-- ═══ 7. announcements ══════════════════════════════════════════════════════
-- Staff see everything in their school. Students see school-wide notices plus
-- their own class. Parents see school-wide notices plus their children's classes.
CREATE POLICY announcements_select ON announcements FOR SELECT
  USING (
    school_id = app_sid()
    AND (
      app_role() IN ('admin', 'teacher')
      OR cohort_id IS NULL
      OR (
        app_role() = 'student'
        AND EXISTS (
          SELECT 1 FROM student_cohorts sc
          WHERE sc.student_id = app_uid() AND sc.cohort_id = announcements.cohort_id
        )
      )
      OR (
        app_role() = 'parent'
        AND EXISTS (
          SELECT 1 FROM parent_student_links psl
          JOIN student_cohorts sc ON psl.student_id = sc.student_id
          WHERE psl.parent_id = app_uid() AND sc.cohort_id = announcements.cohort_id
        )
      )
    )
  );

CREATE POLICY announcements_insert ON announcements FOR INSERT
  WITH CHECK (
    school_id = app_sid()
    AND author_id = app_uid()
    AND app_role() IN ('admin', 'teacher')
  );

-- Admins may amend any notice in their school; teachers only their own.
CREATE POLICY announcements_update ON announcements FOR UPDATE
  USING (
    school_id = app_sid()
    AND (app_role() = 'admin' OR (app_role() = 'teacher' AND author_id = app_uid()))
  )
  WITH CHECK (
    school_id = app_sid()
    AND (app_role() = 'admin' OR (app_role() = 'teacher' AND author_id = app_uid()))
  );

CREATE POLICY announcements_delete ON announcements FOR DELETE
  USING (
    school_id = app_sid()
    AND (app_role() = 'admin' OR (app_role() = 'teacher' AND author_id = app_uid()))
  );


-- ═══ 8. direct_messages ════════════════════════════════════════════════════
CREATE POLICY direct_messages_select ON direct_messages FOR SELECT
  USING (
    school_id = app_sid()
    AND (app_role() = 'admin' OR app_uid() IN (sender_id, receiver_id))
  );

-- Parents may only open a thread with a teacher, never another parent.
CREATE POLICY direct_messages_insert ON direct_messages FOR INSERT
  WITH CHECK (
    school_id = app_sid()
    AND sender_id = app_uid()
    AND EXISTS (SELECT 1 FROM users u WHERE u.id = receiver_id AND u.school_id = app_sid())
    AND (
      app_role() <> 'parent'
      OR (SELECT u.role::text FROM users u WHERE u.id = receiver_id) = 'teacher'
    )
  );

-- Needed for marking a thread read. Without this the PATCH on
-- /api/messages/[threadId] fails once RLS is enforced.
CREATE POLICY direct_messages_update ON direct_messages FOR UPDATE
  USING (
    school_id = app_sid()
    AND (app_role() = 'admin' OR receiver_id = app_uid())
  )
  WITH CHECK (
    school_id = app_sid()
    AND (app_role() = 'admin' OR receiver_id = app_uid())
  );

CREATE POLICY direct_messages_delete ON direct_messages FOR DELETE
  USING (school_id = app_sid() AND app_role() = 'admin');


-- ═══ 9. notifications ══════════════════════════════════════════════════════
CREATE POLICY notifications_select ON notifications FOR SELECT
  USING (
    school_id = app_sid()
    AND (app_role() = 'admin' OR user_id = app_uid())
  );

-- Staff fan notifications OUT to other people, so the check is on the school,
-- not on user_id. Without this, posting an announcement fails at the point
-- routeAnnouncement() inserts recipient rows.
CREATE POLICY notifications_insert ON notifications FOR INSERT
  WITH CHECK (
    school_id = app_sid()
    AND app_role() IN ('admin', 'teacher')
    AND EXISTS (SELECT 1 FROM users u WHERE u.id = user_id AND u.school_id = app_sid())
  );

CREATE POLICY notifications_update ON notifications FOR UPDATE
  USING (school_id = app_sid() AND (app_role() = 'admin' OR user_id = app_uid()))
  WITH CHECK (school_id = app_sid() AND (app_role() = 'admin' OR user_id = app_uid()));

CREATE POLICY notifications_delete ON notifications FOR DELETE
  USING (school_id = app_sid() AND (app_role() = 'admin' OR user_id = app_uid()));


-- ═══ 10. automation_jobs ═══════════════════════════════════════════════════
-- The cron processor belongs to no user and no school, so it runs under
-- withSystemContext(). That grant is scoped to this table only — system
-- context gives no access to any tenant data.
CREATE POLICY automation_jobs_system ON automation_jobs FOR ALL
  USING (app_is_system())
  WITH CHECK (app_is_system());

CREATE POLICY automation_jobs_select ON automation_jobs FOR SELECT
  USING (school_id = app_sid() AND app_role() = 'admin');

-- Queued by routeAnnouncement() when staff post an emergency notice.
CREATE POLICY automation_jobs_insert ON automation_jobs FOR INSERT
  WITH CHECK (school_id = app_sid() AND app_role() IN ('admin', 'teacher'));
