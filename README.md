# CareerConnect – Updated Workspace Build

## What's included
- Existing Student and Company workspaces retained.
- Student saved internships persisted in MySQL.
- Student and Company notification center support.
- Company receives a notification when a student submits an application.
- Admin overview with student, company, internship and application totals, plus recent accounts.
- Signed 8-hour login tokens for private API requests.
- API role and account-ownership checks for student/company workspace routes.
- Basic security headers, request JSON size limit, and configurable CORS origins.
- Existing search filters, application workflow, profile/photo/logo uploads, CV handling and dashboard styling retained.

## Frontend
From the project root:
1. `npm install`
2. `npm run dev`

## Backend
From the `backend` folder:
1. Copy `.env.example` to `.env`.
2. Set `DB_HOST`, `DB_USER`, `DB_PASSWORD`, and `DB_NAME`.
3. Set `AUTH_SECRET` to a long, random secret (do not use the example value in production).
4. Set `CLIENT_ORIGIN` to the exact frontend origin(s).
5. `npm install`
6. `node server.js`

The backend creates the `saved_internships` table automatically. The SQL is also supplied in `database-updates.sql`.

## Administrator account
Public registration intentionally only allows Student and Company accounts.
To grant admin access to an existing account, run this manually in MySQL after replacing the email:
`ALTER TABLE users MODIFY role VARCHAR(20) NOT NULL;`\n`UPDATE users SET role = 'admin' WHERE email = 'your-admin-email@example.com';`
Then log out and log back in. Admin dashboard appears for that account.

## Important security note
This update adds signed bearer tokens and API role/ownership checks. Before deploying publicly, use a unique strong `AUTH_SECRET`, HTTPS, production CORS origins, database least-privilege credentials, regular backups, and test all access-control paths. A full production security review (including rate limiting, password-reset flows, email verification, audit logging, and file malware scanning) is still recommended.

## Data and privacy
The supplied ZIP is built from the uploaded project. It deliberately excludes the private `.env` file and private CV documents. Keep your original `.env` and `backend/private-cvs` folder in a safe backup; do not share them publicly. Publicly served uploaded logos/profile photos remain in `backend/uploads`.
