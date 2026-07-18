-- Enable RLS on all tables
ALTER TABLE schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE cohorts ENABLE ROW LEVEL SECURITY;
ALTER TABLE teacher_cohorts ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_cohorts ENABLE ROW LEVEL SECURITY;
ALTER TABLE parent_student_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE direct_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;


-- 1. schools
-- The schools table is readable by authenticated users for their own school only.
CREATE POLICY schools_select_policy ON schools FOR SELECT
USING (id = NULLIF(current_setting('app.current_school_id', true), '')::uuid);

CREATE POLICY schools_admin_all_policy ON schools FOR ALL
USING (
  id = NULLIF(current_setting('app.current_school_id', true), '')::uuid
  AND (SELECT role FROM users WHERE id = NULLIF(current_setting('app.current_user_id', true), '')::uuid) = 'admin'
);


-- 2. users
-- Users can only read rows belonging to their own school_id
-- Admins have full access within their school only
CREATE POLICY users_select_policy ON users FOR SELECT
USING (school_id = NULLIF(current_setting('app.current_school_id', true), '')::uuid);

CREATE POLICY users_admin_all_policy ON users FOR ALL
USING (
  school_id = NULLIF(current_setting('app.current_school_id', true), '')::uuid
  AND (SELECT role FROM users WHERE id = NULLIF(current_setting('app.current_user_id', true), '')::uuid) = 'admin'
);


-- 3. cohorts
CREATE POLICY cohorts_select_policy ON cohorts FOR SELECT
USING (school_id = NULLIF(current_setting('app.current_school_id', true), '')::uuid);

CREATE POLICY cohorts_admin_all_policy ON cohorts FOR ALL
USING (
  school_id = NULLIF(current_setting('app.current_school_id', true), '')::uuid
  AND (SELECT role FROM users WHERE id = NULLIF(current_setting('app.current_user_id', true), '')::uuid) = 'admin'
);


-- 4. teacher_cohorts
CREATE POLICY teacher_cohorts_select_policy ON teacher_cohorts FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = teacher_cohorts.teacher_id
    AND users.school_id = NULLIF(current_setting('app.current_school_id', true), '')::uuid
  )
);

CREATE POLICY teacher_cohorts_admin_all_policy ON teacher_cohorts FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = teacher_cohorts.teacher_id
    AND users.school_id = NULLIF(current_setting('app.current_school_id', true), '')::uuid
  )
  AND (SELECT role FROM users WHERE id = NULLIF(current_setting('app.current_user_id', true), '')::uuid) = 'admin'
);


-- 5. student_cohorts
CREATE POLICY student_cohorts_select_policy ON student_cohorts FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = student_cohorts.student_id
    AND users.school_id = NULLIF(current_setting('app.current_school_id', true), '')::uuid
  )
);

CREATE POLICY student_cohorts_admin_all_policy ON student_cohorts FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = student_cohorts.student_id
    AND users.school_id = NULLIF(current_setting('app.current_school_id', true), '')::uuid
  )
  AND (SELECT role FROM users WHERE id = NULLIF(current_setting('app.current_user_id', true), '')::uuid) = 'admin'
);


-- 6. parent_student_links
CREATE POLICY parent_student_links_select_policy ON parent_student_links FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = parent_student_links.parent_id
    AND users.school_id = NULLIF(current_setting('app.current_school_id', true), '')::uuid
  )
);

CREATE POLICY parent_student_links_admin_all_policy ON parent_student_links FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = parent_student_links.parent_id
    AND users.school_id = NULLIF(current_setting('app.current_school_id', true), '')::uuid
  )
  AND (SELECT role FROM users WHERE id = NULLIF(current_setting('app.current_user_id', true), '')::uuid) = 'admin'
);


-- 7. announcements
-- Parents can only read announcements for cohorts their linked students belong to (or school-wide)
-- Students can only read announcements for their own cohort (or school-wide)
-- Admins/Teachers can read all in their school
CREATE POLICY announcements_select_policy ON announcements FOR SELECT
USING (
  school_id = NULLIF(current_setting('app.current_school_id', true), '')::uuid
  AND (
    (SELECT role FROM users WHERE id = NULLIF(current_setting('app.current_user_id', true), '')::uuid) IN ('admin', 'teacher')
    OR cohort_id IS NULL
    OR (
      (SELECT role FROM users WHERE id = NULLIF(current_setting('app.current_user_id', true), '')::uuid) = 'student'
      AND EXISTS (
        SELECT 1 FROM student_cohorts
        WHERE student_cohorts.student_id = NULLIF(current_setting('app.current_user_id', true), '')::uuid
        AND student_cohorts.cohort_id = announcements.cohort_id
      )
    )
    OR (
      (SELECT role FROM users WHERE id = NULLIF(current_setting('app.current_user_id', true), '')::uuid) = 'parent'
      AND EXISTS (
        SELECT 1 FROM parent_student_links psl
        JOIN student_cohorts sc ON psl.student_id = sc.student_id
        WHERE psl.parent_id = NULLIF(current_setting('app.current_user_id', true), '')::uuid
        AND sc.cohort_id = announcements.cohort_id
      )
    )
  )
);

CREATE POLICY announcements_admin_all_policy ON announcements FOR ALL
USING (
  school_id = NULLIF(current_setting('app.current_school_id', true), '')::uuid
  AND (SELECT role FROM users WHERE id = NULLIF(current_setting('app.current_user_id', true), '')::uuid) = 'admin'
);

CREATE POLICY announcements_teacher_all_policy ON announcements FOR ALL
USING (
  school_id = NULLIF(current_setting('app.current_school_id', true), '')::uuid
  AND (SELECT role FROM users WHERE id = NULLIF(current_setting('app.current_user_id', true), '')::uuid) = 'teacher'
  AND author_id = NULLIF(current_setting('app.current_user_id', true), '')::uuid
);


-- 8. direct_messages
-- Parents can only send direct messages to teachers — never to other parents
-- Anyone can read messages where they are sender or receiver
-- Admins have full access within their school
CREATE POLICY direct_messages_select_policy ON direct_messages FOR SELECT
USING (
  school_id = NULLIF(current_setting('app.current_school_id', true), '')::uuid
  AND (
    (SELECT role FROM users WHERE id = NULLIF(current_setting('app.current_user_id', true), '')::uuid) = 'admin'
    OR NULLIF(current_setting('app.current_user_id', true), '')::uuid IN (sender_id, receiver_id)
  )
);

CREATE POLICY direct_messages_insert_policy ON direct_messages FOR INSERT
WITH CHECK (
  school_id = NULLIF(current_setting('app.current_school_id', true), '')::uuid
  AND sender_id = NULLIF(current_setting('app.current_user_id', true), '')::uuid
  AND (
    (SELECT role FROM users WHERE id = NULLIF(current_setting('app.current_user_id', true), '')::uuid) != 'parent'
    OR (SELECT role FROM users WHERE id = receiver_id) = 'teacher'
  )
);

CREATE POLICY direct_messages_admin_all_policy ON direct_messages FOR ALL
USING (
  school_id = NULLIF(current_setting('app.current_school_id', true), '')::uuid
  AND (SELECT role FROM users WHERE id = NULLIF(current_setting('app.current_user_id', true), '')::uuid) = 'admin'
);


-- 9. notifications
-- users can read their own
CREATE POLICY notifications_select_policy ON notifications FOR SELECT
USING (
  school_id = NULLIF(current_setting('app.current_school_id', true), '')::uuid
  AND (
    (SELECT role FROM users WHERE id = NULLIF(current_setting('app.current_user_id', true), '')::uuid) = 'admin'
    OR user_id = NULLIF(current_setting('app.current_user_id', true), '')::uuid
  )
);

CREATE POLICY notifications_admin_all_policy ON notifications FOR ALL
USING (
  school_id = NULLIF(current_setting('app.current_school_id', true), '')::uuid
  AND (SELECT role FROM users WHERE id = NULLIF(current_setting('app.current_user_id', true), '')::uuid) = 'admin'
);
