# CareerConnect – Full-Stack Internship Management Platform

CareerConnect is a full-stack web application designed to connect students seeking internship opportunities with companies offering internships.

The platform provides separate workspaces for students and companies, making internship discovery, applications, and recruitment management easier.

## 🚀 Key Features

### 👨‍🎓 Student Features
- Student registration and login
- Browse and search internship opportunities
- Filter internships
- View internship details
- Apply for internships
- Upload and manage CVs
- Upload profile photos
- Track submitted applications
- Receive notifications

### 🏢 Company Features
- Company registration and login
- Create and manage internship postings
- View received applications
- Download student CVs
- Review applicant information
- Receive application notifications
- Manage company profiles and logos

### 🔐 Additional Features
- Role-based authentication
- Protected dashboard routes
- Application management
- MySQL database integration
- Responsive user interface

## 🛠️ Technologies Used

**Frontend**
- React.js
- Vite
- JavaScript
- HTML5
- CSS3

**Backend**
- Node.js
- Express.js
- REST API

**Database**
- MySQL

**Development Tools**
- Visual Studio Code
- Git
- GitHub

## 📁 Project Structure

```text
CareerConnect/
│
├── backend/
│   ├── server.js
│   ├── package.json
│   └── .env.example
│
├── public/
├── src/
│   ├── assets/
│   ├── App.jsx
│   ├── App.css
│   ├── index.css
│   └── main.jsx
│
├── index.html
├── package.json
├── vite.config.js
└── README.md
```

## ⚙️ Installation and Setup

### 1. Clone the Repository

```bash
git clone https://github.com/jayalathsammanee-star/Career-Connect.git
```

### 2. Install Frontend Dependencies

```bash
npm install
```

### 3. Install Backend Dependencies

```bash
cd backend
npm install
```

### 4. Configure Environment Variables

Inside the `backend` folder, create a `.env` file using `.env.example` as a reference.

Configure the required database connection settings and authentication secret.

Do not upload your actual `.env` file to GitHub.

### 5. Configure MySQL Database

Create the required MySQL database and import the project's database SQL files.

Update the database connection settings in the backend environment file.

### 6. Run the Backend

From the `backend` folder:

```bash
node server.js
```

### 7. Run the Frontend

Open another terminal at the project root:

```bash
npm run dev
```

Open the local URL displayed by Vite in your browser.

## 🎯 Project Objective

The main objective of CareerConnect is to provide a centralized platform where students can discover internship opportunities and companies can manage their recruitment process efficiently.

## 👨‍💻 Developer

**Sammani Jayalath**

BSc (Hons) Computer Science Undergraduate

South Eastern University of Sri Lanka

GitHub: [jayalathsammanee-star](https://github.com/jayalathsammanee-star)

---

*CareerConnect – Connecting Students with Opportunities.*