require("dotenv").config();
const express = require("express");
const cors = require("cors");
const mysql = require("mysql2");
const bcrypt = require("bcryptjs");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");

const app = express();

const AUTH_SECRET = process.env.AUTH_SECRET || "careerconnect-local-development-secret-change-before-deployment";
if (process.env.NODE_ENV === "production" && !process.env.AUTH_SECRET) {
    throw new Error("AUTH_SECRET must be configured before production startup.");
}
const createAuthToken = (user) => {
    const payload = Buffer.from(JSON.stringify({
        userId: Number(user.user_id),
        role: user.role,
        exp: Math.floor(Date.now() / 1000) + (8 * 60 * 60)
    })).toString("base64url");
    const signature = crypto.createHmac("sha256", AUTH_SECRET).update(payload).digest("base64url");
    return `${payload}.${signature}`;
};

const verifyAuthToken = (token) => {
    const [payload, signature] = String(token || "").split(".");
    if (!payload || !signature) return null;
    const expected = crypto.createHmac("sha256", AUTH_SECRET).update(payload).digest();
    let supplied;
    try { supplied = Buffer.from(signature, "base64url"); } catch { return null; }
    if (supplied.length !== expected.length || !crypto.timingSafeEqual(supplied, expected)) return null;
    try {
        const decoded = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
        if (!decoded.userId || !decoded.role || decoded.exp < Math.floor(Date.now() / 1000)) return null;
        return decoded;
    } catch { return null; }
};

// =====================================
// MIDDLEWARE
// =====================================

app.use((req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    next();
});
const allowedOrigins = (process.env.CLIENT_ORIGIN || "http://localhost:5173,http://localhost:5174").split(",");
app.use(cors({
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
        return callback(new Error("Origin not allowed by CORS"));
    }
}));
app.use(express.json({ limit: "1mb" }));

// Lightweight in-memory rate limit for authentication endpoints.
const authAttempts = new Map();
app.use(["/api/login", "/api/register"], (req, res, next) => {
    const key = req.ip || req.socket.remoteAddress || "unknown";
    const now = Date.now();
    const current = authAttempts.get(key);
    if (!current || now - current.startedAt > 15 * 60 * 1000) {
        authAttempts.set(key, { startedAt: now, count: 1 });
        return next();
    }
    if (current.count >= 12) {
        return res.status(429).json({ message: "Too many login attempts. Please wait 15 minutes and try again." });
    }
    current.count += 1;
    next();
});

// =====================================
// UPLOAD FOLDERS
// =====================================

const uploadDirectory = path.join(__dirname, "uploads");
const privateCVDirectory = path.join(__dirname, "private-cvs");

fs.mkdirSync(uploadDirectory, { recursive: true });
fs.mkdirSync(privateCVDirectory, { recursive: true });

// Public company logos only
app.use("/uploads", express.static(uploadDirectory));

// =====================================
// COMPANY LOGO UPLOAD
// =====================================

const logoStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDirectory);
    },

    filename: (req, file, cb) => {
        const uniqueName =
            Date.now() + "-" + Math.round(Math.random() * 1E9);

        cb(null, uniqueName + path.extname(file.originalname).toLowerCase());
    }
});

const logoFilter = (req, file, cb) => {
    const allowedTypes = [
        "image/jpeg",
        "image/png",
        "image/webp"
    ];

    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error("Only JPG, PNG and WEBP images are allowed."));
    }
};

const upload = multer({
    storage: logoStorage,
    fileFilter: logoFilter,
    limits: {
        fileSize: 2 * 1024 * 1024
    }
});

// =====================================
// STUDENT CV UPLOAD
// =====================================

const cvStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, privateCVDirectory);
    },

    filename: (req, file, cb) => {
        const uniqueName =
            Date.now() + "-" + Math.round(Math.random() * 1E9);

        cb(null, uniqueName + ".pdf");
    }
});

const cvFilter = (req, file, cb) => {
    const isPdf =
        file.mimetype === "application/pdf" &&
        path.extname(file.originalname).toLowerCase() === ".pdf";

    if (isPdf) {
        cb(null, true);
    } else {
        cb(new Error("Only PDF CV files are allowed."));
    }
};

const cvUpload = multer({
    storage: cvStorage,
    fileFilter: cvFilter,
    limits: {
        fileSize: 5 * 1024 * 1024
    }
});

// =====================================
// MYSQL DATABASE CONNECTION
// =====================================

const db = mysql.createConnection({
    host: process.env.DB_HOST || "localhost",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "internship_portal"
});

db.connect((err) => {
    if (err) {
        console.log("Database connection failed:", err.message);
    } else {
        console.log("MySQL Database Connected!");
    }
});

// Saved internships are stored per student account, not only in browser storage.
db.query(`
    CREATE TABLE IF NOT EXISTS saved_internships (
        saved_id INT AUTO_INCREMENT PRIMARY KEY,
        student_id INT NOT NULL,
        internship_id INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY unique_student_saved_internship (student_id, internship_id),
        INDEX idx_saved_student (student_id),
        CONSTRAINT fk_saved_student FOREIGN KEY (student_id) REFERENCES users(user_id) ON DELETE CASCADE,
        CONSTRAINT fk_saved_internship FOREIGN KEY (internship_id) REFERENCES internships(internship_id) ON DELETE CASCADE
    )
`, (err) => {
    if (err) console.log("Saved internships table initialization failed:", err.message);
});

// =====================================
// ENSURE EVERY COMPANY USER HAS A PROFILE
// =====================================
// Older company accounts may exist in `users` without a matching
// `companies` row. Create a basic profile automatically so those
// accounts can open My Profile and publish internships.
function ensureCompanyProfile(userId, callback) {
    const sql = `
        INSERT IGNORE INTO companies (user_id, company_name)
        SELECT u.user_id, u.full_name
        FROM users u
        WHERE u.user_id = ?
          AND u.role = 'company'
          AND NOT EXISTS (
              SELECT 1
              FROM companies c
              WHERE c.user_id = u.user_id
          )
    `;

    db.query(sql, [userId], (err) => {
        if (err) {
            console.log("Company profile initialization failed:", err.message);
            return callback(err);
        }
        callback(null);
    });
}

// =====================================
// TEST API
// =====================================

app.get("/", (req, res) => {
    res.send("CareerConnect Backend is Running!");
});

// =====================================
// GET ALL INTERNSHIPS
// =====================================

app.get("/api/internships", (req, res) => {

    const sql = `
        SELECT i.*, c.company_name
        FROM internships i
        JOIN companies c
        ON i.company_id = c.company_id
        ORDER BY i.created_at DESC
    `;

    db.query(sql, (err, results) => {

        if (err) {
            console.log(err.message);

            return res.status(500).json({
                message: "Failed to fetch internships"
            });
        }

        res.status(200).json(results);
    });
});

// =====================================
// USER REGISTRATION
// =====================================

app.post("/api/register", async (req, res) => {

    try {
        const {
            full_name,
            email,
            password,
            role
        } = req.body;

        if (!full_name || !email || !password || !role) {
            return res.status(400).json({
                message: "All fields are required"
            });
        }

        const allowedRoles = ["student", "company"];
        const normalizedRole = String(role).toLowerCase();

        if (!allowedRoles.includes(normalizedRole)) {
            return res.status(400).json({
                message: "Invalid user role"
            });
        }

        if (String(password).length < 8) {
            return res.status(400).json({
                message: "Password must be at least 8 characters"
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const sql = `
            INSERT INTO users
            (full_name, email, password, role)
            VALUES (?, ?, ?, ?)
        `;

        db.query(
            sql,
            [
                full_name.trim(),
                email.trim(),
                hashedPassword,
                normalizedRole
            ],
            (err, result) => {

                if (err) {
                    if (err.code === "ER_DUP_ENTRY") {
                        return res.status(409).json({
                            message: "Email already registered"
                        });
                    }

                    console.log(err.message);

                    return res.status(500).json({
                        message: "Registration failed"
                    });
                }

                const finishRegistration = () => {
                    res.status(201).json({
                        message: "Registration successful!",
                        user_id: result.insertId
                    });
                };

                // Create a matching company profile immediately for company accounts.
                if (normalizedRole === "company") {
                    ensureCompanyProfile(result.insertId, (profileError) => {
                        if (profileError) {
                            // Avoid leaving a newly-created account half registered.
                            return db.query(
                                "DELETE FROM users WHERE user_id = ?",
                                [result.insertId],
                                () => res.status(500).json({
                                    message: "Could not create the company profile. Please try again."
                                })
                            );
                        }
                        finishRegistration();
                    });
                } else {
                    finishRegistration();
                }
            }
        );

    } catch (error) {
        console.log(error.message);

        res.status(500).json({
            message: "Server error"
        });
    }
});

// =====================================
// USER LOGIN
// =====================================

app.post("/api/login", (req, res) => {

    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({
            message: "Email and password are required"
        });
    }

    const sql = `
        SELECT *
        FROM users
        WHERE email = ?
    `;

    db.query(sql, [email.trim()], async (err, results) => {

        if (err) {
            console.log(err.message);

            return res.status(500).json({
                message: "Database error"
            });
        }

        if (results.length === 0) {
            return res.status(401).json({
                message: "Invalid email or password"
            });
        }

        try {
            const user = results[0];

            const isMatch = await bcrypt.compare(
                password,
                user.password
            );

            if (!isMatch) {
                return res.status(401).json({
                    message: "Invalid email or password"
                });
            }

            const sendLoginResponse = () => {
                res.status(200).json({
                    message: "Login successful!",
                    token: createAuthToken(user),
                    user: {
                        user_id: user.user_id,
                        full_name: user.full_name,
                        email: user.email,
                        role: user.role
                    }
                });
            };

            // Repair older company accounts that were registered before
            // company-profile creation was added.
            if (user.role === "company") {
                ensureCompanyProfile(user.user_id, (profileError) => {
                    if (profileError) {
                        return res.status(500).json({
                            message: "Unable to prepare company profile. Please try again."
                        });
                    }
                    sendLoginResponse();
                });
            } else {
                sendLoginResponse();
            }

        } catch (error) {
            console.log(error.message);

            res.status(500).json({
                message: "Login error"
            });
        }
    });
});

// =====================================
// AUTHENTICATION AND ROLE / OWNERSHIP GUARDS
// =====================================
// Public routes (registration, login and internship discovery) are defined above.
// All account, application, profile, upload and admin APIs require a signed token.
app.use("/api", (req, res, next) => {
    const token = String(req.headers.authorization || "").replace(/^Bearer\s+/i, "");
    const auth = verifyAuthToken(token);
    if (!auth) return res.status(401).json({ message: "Please log in again to continue." });

    req.auth = auth;
    const userId = Number(auth.userId);
    const pathName = req.path;

    if (pathName.startsWith("/student/") && auth.role !== "student") {
        return res.status(403).json({ message: "Student account access required." });
    }
    if (pathName.startsWith("/company/") && auth.role !== "company") {
        return res.status(403).json({ message: "Company account access required." });
    }
    if (pathName.startsWith("/admin/") && auth.role !== "admin") {
        return res.status(403).json({ message: "Administrator access required." });
    }
    if (pathName.startsWith("/student/")) {
        const match = pathName.match(/^\/student\/(?:profile|saved)\/(\d+)/);
        if (match && Number(match[1]) !== userId) return res.status(403).json({ message: "You can only access your own student account." });
    }
    if (pathName.startsWith("/company/")) {
        const match = pathName.match(/^\/company\/profile\/(\d+)/)
            || (pathName.match(/^\/company\/internship-stats\/(\d+)$/))
            || (pathName.match(/^\/company\/internships\/(\d+)$/) && req.method === "GET" ? pathName.match(/^\/company\/internships\/(\d+)$/) : null)
            || (pathName.match(/^\/company\/applications\/(\d+)$/) && req.method === "GET" ? pathName.match(/^\/company\/applications\/(\d+)$/) : null);
        if (match && Number(match[1]) !== userId) return res.status(403).json({ message: "You can only access your own company account." });
        const bodyUserId = Number(req.body?.user_id ?? req.body?.userId);
        const queryUserId = Number(req.query?.user_id);
        if (bodyUserId && bodyUserId !== userId) return res.status(403).json({ message: "Company account mismatch." });
        if (queryUserId && queryUserId !== userId) return res.status(403).json({ message: "Company account mismatch." });
    }
    if (pathName.startsWith("/notifications/")) {
        const match = pathName.match(/^\/notifications\/(\d+)/);
        if (match && Number(match[1]) !== userId) {
            // Notification ID routes are checked against the authenticated owner in the SQL query.
            if (!pathName.match(/^\/notifications\/\d+\/read$/)) return res.status(403).json({ message: "Notification access denied." });
        }
        if (Number(req.body?.user_id) && Number(req.body.user_id) !== userId) return res.status(403).json({ message: "Notification account mismatch." });
    }
    if (pathName === "/applications" && req.method === "POST" && req.body?.student_id && Number(req.body.student_id) !== userId) {
        return res.status(403).json({ message: "You can only submit applications for your own account." });
    }
    if (pathName.startsWith("/applications/student/")) {
        const match = pathName.match(/^\/applications\/student\/(\d+)/);
        if (match && Number(match[1]) !== userId) return res.status(403).json({ message: "You can only view your own applications." });
    }
    if (pathName.startsWith("/admin/") && auth.role !== "admin") {
        return res.status(403).json({ message: "Administrator access required." });
    }
    next();
});

// =====================================
// APPLY FOR INTERNSHIP WITH CV
// =====================================

app.post("/api/applications", (req, res) => {

    cvUpload.single("cv")(req, res, (uploadError) => {

        if (uploadError) {
            return res.status(400).json({
                message: uploadError.message
            });
        }

        const {
            internship_id,
            student_id,
            cover_letter
        } = req.body;

        const internshipId = Number(internship_id);
        const studentId = Number(student_id);

        if (
            !Number.isInteger(internshipId) ||
            internshipId <= 0 ||
            !Number.isInteger(studentId) ||
            studentId <= 0
        ) {
            if (req.file) {
                fs.unlink(req.file.path, () => {});
            }

            return res.status(400).json({
                message: "Valid internship ID and student ID are required"
            });
        }

        if (req.auth && Number(req.auth.userId) !== studentId) {
            if (req.file) fs.unlink(req.file.path, () => {});
            return res.status(403).json({ message: "You can only submit applications for your own student account." });
        }

        if (!req.file) {
            return res.status(400).json({
                message: "Please upload your CV as a PDF file"
            });
        }

        const checkUserSql = `
            SELECT user_id
            FROM users
            WHERE user_id = ?
            AND role = 'student'
        `;

        db.query(checkUserSql, [studentId], (err, users) => {

            if (err) {
                fs.unlink(req.file.path, () => {});

                return res.status(500).json({
                    message: "Database error"
                });
            }

            if (users.length === 0) {
                fs.unlink(req.file.path, () => {});

                return res.status(403).json({
                    message: "Only students can apply"
                });
            }

            const checkApplicationSql = `
                SELECT application_id
                FROM applications
                WHERE internship_id = ?
                AND student_id = ?
            `;

            db.query(
                checkApplicationSql,
                [internshipId, studentId],
                (err, existing) => {

                    if (err) {
                        fs.unlink(req.file.path, () => {});

                        return res.status(500).json({
                            message: "Database error"
                        });
                    }

                    if (existing.length > 0) {
                        fs.unlink(req.file.path, () => {});

                        return res.status(409).json({
                            message: "You have already applied"
                        });
                    }

                    const cvPath = req.file.filename;

                    const insertSql = `
                        INSERT INTO applications
                        (
                            internship_id,
                            student_id,
                            cover_letter,
                            cv_path
                        )
                        VALUES (?, ?, ?, ?)
                    `;

                    db.query(
                        insertSql,
                        [
                            internshipId,
                            studentId,
                            cover_letter || null,
                            cvPath
                        ],
                        (err, result) => {

                            if (err) {
                                console.log(err.message);
                                fs.unlink(req.file.path, () => {});

                                return res.status(500).json({
                                    message: "Application failed"
                                });
                            }

                            // Notify the owning company when a new application arrives.
                            const companyNotificationSql = `
                                SELECT c.user_id, i.title
                                FROM internships i
                                JOIN companies c ON c.company_id = i.company_id
                                WHERE i.internship_id = ?
                                LIMIT 1
                            `;
                            db.query(companyNotificationSql, [internshipId], (notifyLookupError, companyRows) => {
                                if (!notifyLookupError && companyRows.length) {
                                    db.query(
                                        `INSERT INTO notifications (user_id, application_id, title, message)
                                         VALUES (?, ?, ?, ?)`,
                                        [
                                            companyRows[0].user_id,
                                            result.insertId,
                                            "New Internship Application",
                                            `A student has applied for ${companyRows[0].title}. Review the application in your company workspace.`
                                        ],
                                        (notifyError) => {
                                            if (notifyError) console.log("Company notification could not be saved:", notifyError.message);
                                        }
                                    );
                                }
                            });

                            res.status(201).json({
                                message: "Application submitted successfully!",
                                application_id: result.insertId
                            });
                        }
                    );
                }
            );
        });
    });
});

// =====================================
// GET STUDENT APPLICATIONS
// =====================================

app.get("/api/applications/student/:studentId", (req, res) => {

    const studentId = Number(req.params.studentId);

    if (!Number.isInteger(studentId) || studentId <= 0) {
        return res.status(400).json({
            message: "Invalid student ID"
        });
    }

    const sql = `
        SELECT
            a.application_id,
            a.internship_id,
            a.student_id,
            a.cover_letter,
            a.status,
            a.applied_at,
            i.title,
            i.location,
            i.internship_type,
            c.company_name

        FROM applications a

        JOIN internships i
        ON a.internship_id = i.internship_id

        JOIN companies c
        ON i.company_id = c.company_id

        WHERE a.student_id = ?

        ORDER BY a.applied_at DESC
    `;

    db.query(sql, [studentId], (err, results) => {

        if (err) {
            console.log(err.message);

            return res.status(500).json({
                message: "Failed to fetch applications"
            });
        }

        res.status(200).json(results);
    });
});

// =====================================
// GET COMPANY APPLICATIONS
// =====================================

app.get("/api/company/applications/:userId", (req, res) => {

    const userId = Number(req.params.userId);

    if (!Number.isInteger(userId) || userId <= 0) {
        return res.status(400).json({
            message: "Invalid company user ID"
        });
    }

    const sql = `
        SELECT
            a.application_id,
            a.internship_id,
            a.student_id,
            a.cover_letter,
            a.status,
            a.applied_at,
            a.cv_path,
            (a.cv_path IS NOT NULL) AS has_cv,
            i.title,
            i.location,
            i.internship_type,
            u.full_name AS student_name,
            u.email AS student_email

        FROM applications a

        JOIN internships i
        ON a.internship_id = i.internship_id

        JOIN companies c
        ON i.company_id = c.company_id

        JOIN users u
        ON a.student_id = u.user_id

        WHERE c.user_id = ?

        ORDER BY a.applied_at DESC
    `;

    db.query(sql, [userId], (err, results) => {

        if (err) {
            console.log(err.message);

            return res.status(500).json({
                message: "Failed to fetch company applications"
            });
        }

        res.status(200).json(results);
    });
});

// =====================================
// DOWNLOAD STUDENT CV
// =====================================

app.get(
    "/api/company/applications/:applicationId/cv",
    (req, res) => {

        const applicationId = Number(req.params.applicationId);
        const companyUserId = Number(req.query.user_id);

        if (
            !Number.isInteger(applicationId) ||
            applicationId <= 0 ||
            !Number.isInteger(companyUserId) ||
            companyUserId <= 0
        ) {
            return res.status(400).json({
                message: "Invalid application or company ID"
            });
        }

        const sql = `
            SELECT
                a.cv_path,
                u.full_name AS student_name

            FROM applications a

            JOIN internships i
            ON a.internship_id = i.internship_id

            JOIN companies c
            ON i.company_id = c.company_id

            JOIN users u
            ON a.student_id = u.user_id

            WHERE a.application_id = ?
            AND c.user_id = ?
        `;

        db.query(
            sql,
            [applicationId, companyUserId],
            (err, rows) => {

                if (err) {
                    console.log(err.message);

                    return res.status(500).json({
                        message: "Database error while finding CV"
                    });
                }

                if (rows.length === 0) {
                    return res.status(404).json({
                        message: "Application not found for this company"
                    });
                }

                if (!rows[0].cv_path) {
                    return res.status(404).json({
                        message: "No CV was uploaded for this application"
                    });
                }

                const safeFileName = path.basename(rows[0].cv_path);

                const filePath = path.join(
                    privateCVDirectory,
                    safeFileName
                );

                if (!fs.existsSync(filePath)) {
                    return res.status(404).json({
                        message: "CV file is missing from the server"
                    });
                }

                const studentName = String(
                    rows[0].student_name || "Student"
                ).replace(/[^a-z0-9-_]/gi, "_");

                res.download(
                    filePath,
                    `CV-${studentName}.pdf`
                );
            }
        );
    }
);

// =====================================
// ACCEPT / REJECT APPLICATION
// WITH STUDENT NOTIFICATIONS
// =====================================

app.patch(
    "/api/company/applications/:applicationId/status",
    (req, res) => {

        const applicationId = Number(req.params.applicationId);
        const companyUserId = Number(req.body.user_id);
        const { status } = req.body;

        if (
            !Number.isInteger(applicationId) ||
            applicationId <= 0 ||
            !Number.isInteger(companyUserId) ||
            companyUserId <= 0
        ) {
            return res.status(400).json({
                message: "Invalid application or company ID"
            });
        }

        const allowedStatuses = [
            "pending",
            "accepted",
            "rejected"
        ];

        if (!allowedStatuses.includes(status)) {
            return res.status(400).json({
                message: "Invalid application status"
            });
        }

        const detailsSql = `
            SELECT
                a.application_id,
                a.student_id,
                a.status,
                i.title

            FROM applications a

            JOIN internships i
            ON a.internship_id = i.internship_id

            JOIN companies c
            ON i.company_id = c.company_id

            WHERE a.application_id = ?
            AND c.user_id = ?
        `;

        db.query(
            detailsSql,
            [applicationId, companyUserId],
            (err, rows) => {

                if (err) {
                    console.log(err.message);

                    return res.status(500).json({
                        message: "Database error"
                    });
                }

                if (rows.length === 0) {
                    return res.status(404).json({
                        message: "Application not found for this company"
                    });
                }

                const application = rows[0];

                const updateSql = `
                    UPDATE applications
                    SET status = ?
                    WHERE application_id = ?
                `;

                db.query(
                    updateSql,
                    [status, applicationId],
                    (err) => {

                        if (err) {
                            console.log(err.message);

                            return res.status(500).json({
                                message: "Failed to update application status"
                            });
                        }

                        const notificationTitle =
                            status === "accepted"
                                ? "Application Accepted"
                                : status === "rejected"
                                    ? "Application Rejected"
                                    : "Application Status Updated";

                        const notificationMessage =
                            status === "accepted"
                                ? `Congratulations! Your application for ${application.title} has been accepted.`
                                : status === "rejected"
                                    ? `Your application for ${application.title} has been rejected.`
                                    : `Your application for ${application.title} is now pending.`;

                        const notificationSql = `
                            INSERT INTO notifications
                            (user_id, application_id, title, message)
                            VALUES (?, ?, ?, ?)
                        `;

                        db.query(
                            notificationSql,
                            [
                                application.student_id,
                                applicationId,
                                notificationTitle,
                                notificationMessage
                            ],
                            (err) => {

                                if (err) {
                                    console.log(err.message);

                                    return res.status(500).json({
                                        message: "Status updated, but notification could not be saved"
                                    });
                                }

                                res.status(200).json({
                                    message: `Application ${status} successfully!`,
                                    notification: "Student notification saved successfully"
                                });
                            }
                        );
                    }
                );
            }
        );
    }
);

// =====================================
// GET STUDENT NOTIFICATIONS
// =====================================

app.get("/api/notifications/:userId", (req, res) => {

    const userId = Number(req.params.userId);

    if (!Number.isInteger(userId) || userId <= 0) {
        return res.status(400).json({
            message: "Invalid user ID"
        });
    }

    const sql = `
        SELECT
            notification_id,
            application_id,
            title,
            message,
            is_read,
            created_at

        FROM notifications

        WHERE user_id = ?

        ORDER BY created_at DESC
    `;

    db.query(sql, [userId], (err, results) => {

        if (err) {
            console.log(err.message);

            return res.status(500).json({
                message: "Failed to fetch notifications"
            });
        }

        res.status(200).json(results);
    });
});

// =====================================
// MARK NOTIFICATION AS READ
// =====================================

app.patch(
    "/api/notifications/:notificationId/read",
    (req, res) => {

        const notificationId = Number(req.params.notificationId);
        const userId = Number(req.body.user_id);

        if (
            !Number.isInteger(notificationId) ||
            notificationId <= 0 ||
            !Number.isInteger(userId) ||
            userId <= 0
        ) {
            return res.status(400).json({
                message: "Invalid notification or user ID"
            });
        }

        const sql = `
            UPDATE notifications
            SET is_read = TRUE
            WHERE notification_id = ?
            AND user_id = ?
        `;

        db.query(
            sql,
            [notificationId, userId],
            (err, result) => {

                if (err) {
                    console.log(err.message);

                    return res.status(500).json({
                        message: "Failed to update notification"
                    });
                }

                if (result.affectedRows === 0) {
                    return res.status(404).json({
                        message: "Notification not found"
                    });
                }

                res.status(200).json({
                    message: "Notification marked as read"
                });
            }
        );
    }
);

// =====================================
// GET COMPANY PROFILE
// =====================================

app.get("/api/company/profile/:userId", (req, res) => {

    const userId = Number(req.params.userId);

    if (!Number.isInteger(userId) || userId <= 0) {
        return res.status(400).json({
            message: "Invalid user ID"
        });
    }

    const sql = `
        SELECT
            u.user_id,
            u.full_name,
            u.email,
            c.company_id,
            c.company_name,
            c.description,
            c.website,
            c.location,
            c.logo

        FROM users u

        JOIN companies c
        ON u.user_id = c.user_id

        WHERE u.user_id = ?
        AND u.role = 'company'
    `;

    ensureCompanyProfile(userId, (profileError) => {
        if (profileError) {
            return res.status(500).json({
                message: "Failed to prepare company profile"
            });
        }

        db.query(sql, [userId], (err, results) => {
            if (err) {
                console.log(err.message);
                return res.status(500).json({
                    message: "Failed to load company profile"
                });
            }

            if (results.length === 0) {
                return res.status(404).json({
                    message: "Company account not found"
                });
            }

            res.status(200).json(results[0]);
        });
    });
});

// =====================================
// UPDATE COMPANY PROFILE
// =====================================

app.put("/api/company/profile/:userId", (req, res) => {

    const userId = Number(req.params.userId);

    const {
        full_name,
        company_name,
        description,
        website,
        location
    } = req.body;

    if (!Number.isInteger(userId) || userId <= 0) {
        return res.status(400).json({
            message: "Invalid user ID"
        });
    }

    if (
        !full_name ||
        !company_name ||
        !String(full_name).trim() ||
        !String(company_name).trim()
    ) {
        return res.status(400).json({
            message: "Contact person name and company name are required"
        });
    }

    const checkSql = `
        SELECT company_id
        FROM companies
        WHERE user_id = ?
    `;

    db.query(checkSql, [userId], (err, companies) => {

        if (err) {
            console.log(err.message);

            return res.status(500).json({
                message: "Database error while checking company profile"
            });
        }

        if (companies.length === 0) {
            return res.status(404).json({
                message: "Company profile not found"
            });
        }

        const userSql = `
            UPDATE users
            SET full_name = ?
            WHERE user_id = ?
            AND role = 'company'
        `;

        db.query(
            userSql,
            [String(full_name).trim(), userId],
            (err, userResult) => {

                if (err) {
                    console.log(err.message);

                    return res.status(500).json({
                        message: "Failed to update contact person"
                    });
                }

                if (userResult.affectedRows === 0) {
                    return res.status(404).json({
                        message: "Company account not found"
                    });
                }

                const companySql = `
                    UPDATE companies
                    SET
                        company_name = ?,
                        description = ?,
                        website = ?,
                        location = ?
                    WHERE user_id = ?
                `;

                db.query(
                    companySql,
                    [
                        String(company_name).trim(),
                        description || null,
                        website || null,
                        location || null,
                        userId
                    ],
                    (err) => {

                        if (err) {
                            console.log(err.message);

                            return res.status(500).json({
                                message: "Failed to update company profile"
                            });
                        }

                        res.status(200).json({
                            message: "Company profile updated successfully!"
                        });
                    }
                );
            }
        );
    });
});

// =====================================
// UPLOAD COMPANY LOGO
// =====================================

app.post(
    "/api/company/profile/:userId/logo",
    (req, res) => {

        upload.single("logo")(req, res, (uploadError) => {

            if (uploadError) {
                return res.status(400).json({
                    message: uploadError.message
                });
            }

            const userId = Number(req.params.userId);

            if (!Number.isInteger(userId) || userId <= 0) {
                if (req.file) {
                    fs.unlink(req.file.path, () => {});
                }

                return res.status(400).json({
                    message: "Invalid user ID"
                });
            }

            if (!req.file) {
                return res.status(400).json({
                    message: "Please select a logo image"
                });
            }

            const logoPath = `/uploads/${req.file.filename}`;

            const sql = `
                UPDATE companies
                SET logo = ?
                WHERE user_id = ?
            `;

            db.query(sql, [logoPath, userId], (err, result) => {

                if (err) {
                    console.log(err.message);
                    fs.unlink(req.file.path, () => {});

                    return res.status(500).json({
                        message: "Failed to save company logo"
                    });
                }

                if (result.affectedRows === 0) {
                    fs.unlink(req.file.path, () => {});

                    return res.status(404).json({
                        message: "Company profile not found"
                    });
                }

                res.status(200).json({
                    message: "Company logo uploaded successfully!",
                    logo: logoPath
                });
            });
        });
    }
);
// =====================================
// ADD NEW INTERNSHIP
// =====================================

app.post("/api/company/internships", (req, res) => {

    const {
        title,
        description,
        requirements,
        location,
        internship_type,
        deadline
    } = req.body;

    // Accept both user_id and userId
    const userId = Number(req.body.user_id ?? req.body.userId);

    if (
        !Number.isInteger(userId) ||
        userId <= 0 ||
        !String(title || "").trim() ||
        !String(description || "").trim()
    ) {
        return res.status(400).json({
            message: "Please provide valid internship details"
        });
    }

    const companySql = `
        SELECT company_id
        FROM companies
        WHERE user_id = ?
    `;

    ensureCompanyProfile(userId, (profileError) => {
        if (profileError) {
            return res.status(500).json({
                message: "Unable to prepare company profile"
            });
        }

        db.query(companySql, [userId], (err, companies) => {
            if (err) {
                console.log(err.message);
                return res.status(500).json({
                    message: "Database error"
                });
            }

            if (companies.length === 0) {
                return res.status(404).json({
                    message: "Company account not found"
                });
            }

            const companyId = companies[0].company_id;

            const insertSql = `
            INSERT INTO internships
            (
                company_id,
                title,
                description,
                requirements,
                location,
                internship_type,
                deadline
            )
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `;

        db.query(
            insertSql,
            [
                companyId,
                String(title).trim(),
                String(description).trim(),
                requirements ? String(requirements).trim() : null,
                location ? String(location).trim() : null,
                internship_type || null,
                deadline || null
            ],
            (err, result) => {

                if (err) {
                    console.log(err.message);

                    return res.status(500).json({
                        message: "Failed to publish internship"
                    });
                }

                res.status(201).json({
                    message: "Internship published successfully!",
                    internship_id: result.insertId
                });
            }
            );
        });
    });
});
// =====================================
// COMPANY: LIST, UPDATE AND DELETE OWN INTERNSHIPS
// =====================================

app.get("/api/company/internships/:userId", (req, res) => {
    const userId = Number(req.params.userId);
    if (!Number.isInteger(userId) || userId <= 0) {
        return res.status(400).json({ message: "Invalid company user ID" });
    }
    const sql = `
        SELECT i.*, COUNT(a.application_id) AS application_count
        FROM internships i
        JOIN companies c ON i.company_id = c.company_id
        LEFT JOIN applications a ON a.internship_id = i.internship_id
        WHERE c.user_id = ?
        GROUP BY i.internship_id
        ORDER BY i.created_at DESC
    `;
    db.query(sql, [userId], (err, results) => {
        if (err) {
            console.log(err.message);
            return res.status(500).json({ message: "Failed to fetch company internships" });
        }
        res.status(200).json(results);
    });
});

app.put("/api/company/internships/:internshipId", (req, res) => {
    const internshipId = Number(req.params.internshipId);
    const userId = Number(req.body.userId ?? req.body.user_id);
    const { title, description, requirements, location, internship_type, deadline } = req.body;
    if (!Number.isInteger(internshipId) || internshipId <= 0 || !Number.isInteger(userId) || userId <= 0 || !String(title || "").trim() || !String(description || "").trim()) {
        return res.status(400).json({ message: "Please provide valid internship details" });
    }
    const sql = `
        UPDATE internships i
        JOIN companies c ON i.company_id = c.company_id
        SET i.title = ?, i.description = ?, i.requirements = ?, i.location = ?, i.internship_type = ?, i.deadline = ?
        WHERE i.internship_id = ? AND c.user_id = ?
    `;
    db.query(sql, [String(title).trim(), String(description).trim(), requirements ? String(requirements).trim() : null, location ? String(location).trim() : null, internship_type || null, deadline || null, internshipId, userId], (err, result) => {
        if (err) {
            console.log(err.message);
            return res.status(500).json({ message: "Failed to update internship" });
        }
        if (result.affectedRows === 0) {
            const checkSql = `SELECT internship_id FROM internships i JOIN companies c ON i.company_id = c.company_id WHERE i.internship_id = ? AND c.user_id = ?`;
            return db.query(checkSql, [internshipId, userId], (checkErr, rows) => {
                if (checkErr) return res.status(500).json({ message: "Unable to verify internship" });
                if (!rows.length) return res.status(404).json({ message: "Internship not found for this company" });
                return res.status(200).json({ message: "No changes were needed. Internship details are already up to date." });
            });
        }
        res.status(200).json({ message: "Internship updated successfully!" });
    });
});

app.delete("/api/company/internships/:internshipId", (req, res) => {
    const internshipId = Number(req.params.internshipId);
    const userId = Number(req.body.userId ?? req.body.user_id);
    if (!Number.isInteger(internshipId) || internshipId <= 0 || !Number.isInteger(userId) || userId <= 0) {
        return res.status(400).json({ message: "Invalid internship or company ID" });
    }
    const sql = `
        DELETE i FROM internships i
        JOIN companies c ON i.company_id = c.company_id
        WHERE i.internship_id = ? AND c.user_id = ?
        AND NOT EXISTS (SELECT 1 FROM applications a WHERE a.internship_id = i.internship_id)
    `;
    db.query(sql, [internshipId, userId], (err, result) => {
        if (err) {
            console.log(err.message);
            return res.status(500).json({ message: "Failed to delete internship" });
        }
        if (result.affectedRows === 0) {
            const checkSql = `SELECT i.internship_id, (SELECT COUNT(*) FROM applications a WHERE a.internship_id = i.internship_id) AS application_count FROM internships i JOIN companies c ON i.company_id = c.company_id WHERE i.internship_id = ? AND c.user_id = ?`;
            return db.query(checkSql, [internshipId, userId], (checkErr, rows) => {
                if (checkErr) return res.status(500).json({ message: "Unable to verify internship" });
                if (!rows.length) return res.status(404).json({ message: "Internship not found for this company" });
                return res.status(409).json({ message: "This internship has applications and cannot be deleted. You can edit its details instead." });
            });
        }
        res.status(200).json({ message: "Internship deleted successfully!" });
    });
});

// =====================================
// GET COMPANY INTERNSHIP STATISTICS
// =====================================

app.get("/api/company/internship-stats/:userId", (req, res) => {
    const userId = Number(req.params.userId);

    if (!Number.isInteger(userId) || userId <= 0) {
        return res.status(400).json({
            message: "Invalid company user ID"
        });
    }

    const sql = `
        SELECT
            COUNT(i.internship_id) AS total,
            COALESCE(SUM(
                CASE
                    WHEN i.deadline IS NULL OR DATE(i.deadline) >= CURDATE()
                    THEN 1
                    ELSE 0
                END
            ), 0) AS active
        FROM internships i
        JOIN companies c ON i.company_id = c.company_id
        WHERE c.user_id = ?
    `;

    db.query(sql, [userId], (err, results) => {
        if (err) {
            console.log(err.message);
            return res.status(500).json({
                message: "Failed to fetch company internship statistics"
            });
        }

        res.status(200).json({
            total: Number(results[0].total) || 0,
            active: Number(results[0].active) || 0
        });
    });
});

// =====================================
// STUDENT PROFILE MANAGEMENT
// =====================================

// Get or create the student's profile record
app.get("/api/student/profile/:userId", (req, res) => {
    const userId = Number(req.params.userId);
    if (!Number.isInteger(userId) || userId <= 0) {
        return res.status(400).json({ message: "Invalid student ID" });
    }

    const sql = `
        SELECT u.user_id, u.full_name, u.email, u.role,
               sp.phone, sp.university, sp.degree_program,
               sp.skills, sp.about_me, sp.cv_path, sp.profile_image
        FROM users u
        LEFT JOIN student_profiles sp ON sp.user_id = u.user_id
        WHERE u.user_id = ? AND u.role = 'student'
    `;
    db.query(sql, [userId], (err, rows) => {
        if (err) {
            console.log(err.message);
            return res.status(500).json({ message: "Failed to load student profile" });
        }
        if (rows.length === 0) {
            return res.status(404).json({ message: "Student account not found" });
        }
        res.status(200).json(rows[0]);
    });
});

// Update student details
app.put("/api/student/profile/:userId", (req, res) => {
    const userId = Number(req.params.userId);
    const { full_name, phone, university, degree_program, skills, about_me } = req.body;
    if (!Number.isInteger(userId) || userId <= 0 || !String(full_name || "").trim()) {
        return res.status(400).json({ message: "A valid student ID and full name are required" });
    }

    const checkSql = "SELECT user_id FROM users WHERE user_id = ? AND role = 'student'";
    db.query(checkSql, [userId], (err, rows) => {
        if (err) return res.status(500).json({ message: "Database error" });
        if (rows.length === 0) return res.status(404).json({ message: "Student account not found" });

        db.query("UPDATE users SET full_name = ? WHERE user_id = ?", [String(full_name).trim(), userId], (userErr) => {
            if (userErr) {
                console.log(userErr.message);
                return res.status(500).json({ message: "Failed to update student name" });
            }
            const profileSql = `
                INSERT INTO student_profiles (user_id, phone, university, degree_program, skills, about_me)
                VALUES (?, ?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE
                    phone = VALUES(phone), university = VALUES(university),
                    degree_program = VALUES(degree_program), skills = VALUES(skills),
                    about_me = VALUES(about_me)
            `;
            db.query(profileSql, [userId, phone || null, university || null, degree_program || null, skills || null, about_me || null], (profileErr) => {
                if (profileErr) {
                    console.log(profileErr.message);
                    return res.status(500).json({ message: "Failed to save student profile" });
                }
                res.status(200).json({ message: "Student profile updated successfully!" });
            });
        });
    });
});

// Upload, replace or remove a student's profile photo
app.post("/api/student/profile/:userId/photo", (req, res) => {
    upload.single("photo")(req, res, (uploadError) => {
        if (uploadError) return res.status(400).json({ message: uploadError.message });
        const userId = Number(req.params.userId);
        if (!Number.isInteger(userId) || userId <= 0) {
            if (req.file) fs.unlink(req.file.path, () => {});
            return res.status(400).json({ message: "Invalid student ID" });
        }
        if (!req.file) return res.status(400).json({ message: "Please select a profile photo" });
        db.query("SELECT user_id FROM users WHERE user_id = ? AND role = 'student'", [userId], (err, users) => {
            if (err || users.length === 0) {
                fs.unlink(req.file.path, () => {});
                return res.status(err ? 500 : 404).json({ message: err ? "Database error" : "Student account not found" });
            }
            db.query("SELECT profile_image FROM student_profiles WHERE user_id = ?", [userId], (profileErr, profiles) => {
                if (profileErr) {
                    fs.unlink(req.file.path, () => {});
                    return res.status(500).json({ message: "Could not check existing profile photo" });
                }
                const newImagePath = `/uploads/${req.file.filename}`;
                const saveSql = `INSERT INTO student_profiles (user_id, profile_image) VALUES (?, ?) ON DUPLICATE KEY UPDATE profile_image = VALUES(profile_image)`;
                db.query(saveSql, [userId, newImagePath], (saveErr) => {
                    if (saveErr) {
                        fs.unlink(req.file.path, () => {});
                        if (saveErr.code === "ER_BAD_FIELD_ERROR") return res.status(500).json({ message: "Database update required: run the supplied student_profile_photo.sql file in MySQL." });
                        return res.status(500).json({ message: "Failed to save profile photo" });
                    }
                    const oldImage = profiles[0]?.profile_image;
                    if (oldImage && oldImage.startsWith("/uploads/")) {
                        const oldPath = path.join(uploadDirectory, path.basename(oldImage));
                        if (fs.existsSync(oldPath)) fs.unlink(oldPath, () => {});
                    }
                    res.status(200).json({ message: "Profile photo uploaded successfully!", profile_image: newImagePath });
                });
            });
        });
    });
});

app.delete("/api/student/profile/:userId/photo", (req, res) => {
    const userId = Number(req.params.userId);
    if (!Number.isInteger(userId) || userId <= 0) return res.status(400).json({ message: "Invalid student ID" });
    db.query("SELECT profile_image FROM student_profiles WHERE user_id = ?", [userId], (err, rows) => {
        if (err) return res.status(500).json({ message: "Failed to check profile photo" });
        db.query("UPDATE student_profiles SET profile_image = NULL WHERE user_id = ?", [userId], (updateErr) => {
            if (updateErr) {
                if (updateErr.code === "ER_BAD_FIELD_ERROR") return res.status(500).json({ message: "Database update required: run the supplied student_profile_photo.sql file in MySQL." });
                return res.status(500).json({ message: "Failed to remove profile photo" });
            }
            const oldImage = rows[0]?.profile_image;
            if (oldImage && oldImage.startsWith("/uploads/")) {
                const oldPath = path.join(uploadDirectory, path.basename(oldImage));
                if (fs.existsSync(oldPath)) fs.unlink(oldPath, () => {});
            }
            res.status(200).json({ message: "Profile photo removed successfully!" });
        });
    });
});

// Upload or replace the student's private PDF CV
app.post("/api/student/profile/:userId/cv", (req, res) => {
    cvUpload.single("cv")(req, res, (uploadError) => {
        if (uploadError) return res.status(400).json({ message: uploadError.message });
        const userId = Number(req.params.userId);
        if (!Number.isInteger(userId) || userId <= 0) {
            if (req.file) fs.unlink(req.file.path, () => {});
            return res.status(400).json({ message: "Invalid student ID" });
        }
        if (!req.file) return res.status(400).json({ message: "Please select a PDF CV" });

        db.query("SELECT user_id FROM users WHERE user_id = ? AND role = 'student'", [userId], (err, users) => {
            if (err || users.length === 0) {
                fs.unlink(req.file.path, () => {});
                return res.status(err ? 500 : 404).json({ message: err ? "Database error" : "Student account not found" });
            }
            db.query("SELECT cv_path FROM student_profiles WHERE user_id = ?", [userId], (profileErr, profiles) => {
                if (profileErr) {
                    fs.unlink(req.file.path, () => {});
                    return res.status(500).json({ message: "Could not check existing CV" });
                }
                const newCvPath = req.file.filename;
                const saveSql = `
                    INSERT INTO student_profiles (user_id, cv_path) VALUES (?, ?)
                    ON DUPLICATE KEY UPDATE cv_path = VALUES(cv_path)
                `;
                db.query(saveSql, [userId, newCvPath], (saveErr) => {
                    if (saveErr) {
                        fs.unlink(req.file.path, () => {});
                        return res.status(500).json({ message: "Failed to save CV" });
                    }
                    const oldCv = profiles[0]?.cv_path;
                    if (oldCv && oldCv !== newCvPath) {
                        const oldPath = path.join(privateCVDirectory, path.basename(oldCv));
                        if (fs.existsSync(oldPath)) fs.unlink(oldPath, () => {});
                    }
                    res.status(200).json({ message: "CV uploaded successfully!", cv_path: newCvPath });
                });
            });
        });
    });
});

// =====================================
// START SERVER
// =====================================

const PORT = 5000;


// =====================================
// STUDENT SAVED INTERNSHIPS
// =====================================

app.get("/api/student/saved/:userId", (req, res) => {
    const userId = Number(req.params.userId);
    if (!Number.isInteger(userId) || userId <= 0) {
        return res.status(400).json({ message: "Invalid student ID" });
    }
    const sql = `
        SELECT i.*, c.company_name, s.created_at AS saved_at
        FROM saved_internships s
        JOIN users u ON u.user_id = s.student_id AND u.role = 'student'
        JOIN internships i ON i.internship_id = s.internship_id
        JOIN companies c ON c.company_id = i.company_id
        WHERE s.student_id = ?
        ORDER BY s.created_at DESC
    `;
    db.query(sql, [userId], (err, rows) => {
        if (err) return res.status(500).json({ message: "Unable to load saved internships" });
        res.json(rows);
    });
});

app.post("/api/student/saved/:userId/:internshipId", (req, res) => {
    const userId = Number(req.params.userId);
    const internshipId = Number(req.params.internshipId);
    if (!Number.isInteger(userId) || userId <= 0 || !Number.isInteger(internshipId) || internshipId <= 0) {
        return res.status(400).json({ message: "Valid student and internship IDs are required" });
    }
    const sql = `
        INSERT IGNORE INTO saved_internships (student_id, internship_id)
        SELECT u.user_id, i.internship_id
        FROM users u
        JOIN internships i ON i.internship_id = ?
        WHERE u.user_id = ? AND u.role = 'student'
    `;
    db.query(sql, [internshipId, userId], (err, result) => {
        if (err) return res.status(500).json({ message: "Unable to save internship" });
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Student account or internship was not found, or this internship is already saved" });
        }
        res.status(201).json({ message: "Internship saved successfully" });
    });
});

app.delete("/api/student/saved/:userId/:internshipId", (req, res) => {
    const userId = Number(req.params.userId);
    const internshipId = Number(req.params.internshipId);
    if (!Number.isInteger(userId) || userId <= 0 || !Number.isInteger(internshipId) || internshipId <= 0) {
        return res.status(400).json({ message: "Valid student and internship IDs are required" });
    }
    db.query(
        `DELETE s FROM saved_internships s
         JOIN users u ON u.user_id = s.student_id AND u.role = 'student'
         WHERE s.student_id = ? AND s.internship_id = ?`,
        [userId, internshipId],
        (err, result) => {
            if (err) return res.status(500).json({ message: "Unable to remove saved internship" });
            if (!result.affectedRows) return res.status(404).json({ message: "Saved internship was not found" });
            res.json({ message: "Internship removed from saved items" });
        }
    );
});

// =====================================
// ADMIN PLATFORM OVERVIEW
// =====================================
// Admin accounts must be assigned by an existing database administrator.
// Never expose admin as a public registration option.
app.get("/api/admin/overview/:userId", (req, res) => {
    const userId = Number(req.params.userId);
    if (!Number.isInteger(userId) || userId <= 0) {
        return res.status(400).json({ message: "Invalid administrator ID" });
    }
    db.query("SELECT role FROM users WHERE user_id = ?", [userId], (userErr, userRows) => {
        if (userErr) return res.status(500).json({ message: "Unable to verify administrator account" });
        if (!userRows.length || userRows[0].role !== "admin") {
            return res.status(403).json({ message: "Administrator access required" });
        }
        const statsSql = `
            SELECT
                (SELECT COUNT(*) FROM users WHERE role = 'student') AS students,
                (SELECT COUNT(*) FROM users WHERE role = 'company') AS companies,
                (SELECT COUNT(*) FROM internships) AS internships,
                (SELECT COUNT(*) FROM applications) AS applications
        `;
        db.query(statsSql, (statsErr, statsRows) => {
            if (statsErr) return res.status(500).json({ message: "Unable to load platform statistics" });
            db.query(
                "SELECT user_id, full_name, email, role FROM users ORDER BY user_id DESC LIMIT 8",
                (usersErr, recentUsers) => {
                    if (usersErr) return res.status(500).json({ message: "Unable to load recent accounts" });
                    res.json({ stats: statsRows[0], recentUsers });
                }
            );
        });
    });
});

app.listen(PORT, () => {
    console.log(`CareerConnect Server running on port ${PORT}`);
});