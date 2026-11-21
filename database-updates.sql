-- CareerConnect additions
-- Run this against the internship_portal database if you prefer a manual migration.
-- The backend also creates this table automatically at startup.

CREATE TABLE IF NOT EXISTS saved_internships (
    saved_id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT NOT NULL,
    internship_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_student_saved_internship (student_id, internship_id),
    INDEX idx_saved_student (student_id),
    CONSTRAINT fk_saved_student FOREIGN KEY (student_id) REFERENCES users(user_id) ON DELETE CASCADE,
    CONSTRAINT fk_saved_internship FOREIGN KEY (internship_id) REFERENCES internships(internship_id) ON DELETE CASCADE
);

-- To promote an existing account to administrator, first ensure the role
-- column accepts the value, then run the UPDATE for your own account:
-- ALTER TABLE users MODIFY role VARCHAR(20) NOT NULL;
-- UPDATE users SET role = 'admin' WHERE email = 'your-admin-email@example.com';
-- Never expose an administrator registration option on the public website.
