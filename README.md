# SmartSchool – School Management System

A full-stack School Management System built to simplify and manage everyday school activities through a centralized web application.

SmartSchool provides separate login access for Admin, Teachers, and Students, with features for student management, attendance tracking, marks management, and academic activities.

## 🚀 Project Overview

SmartSchool is designed to connect school administrators, teachers, and students through a simple and user-friendly interface.

The application uses Next.js for the frontend, Node.js and Express.js for the backend, and MongoDB for database management.

## ✨ Features

### 1. Authentication and User Management
- User registration and login.
- Separate roles for Admin, Teacher, and Student.
- JWT-based authentication.
- Password hashing using bcrypt.
- Role-based dashboard redirection.
- Protected backend routes.
- Remember username option.
- Password visibility toggle.

### 2. Admin Dashboard
- Admin login.
- Centralized school management interface.
- Role-based access to administrative features.

### 3. Teacher Dashboard
- Teacher login.
- Student management.
- Add and view student records.
- Registered student information.
- Attendance management.
- Homework management.
- To-do list.

### 4. Student Dashboard
- Student login.
- Student-specific dashboard.
- Attendance and academic information access.

### 5. Student Management
- Student name.
- Admission number.
- Class and section.
- Email address.
- Mobile number.
- Student record management.

### 6. Attendance Management
- Select students.
- Mark students as Present or Absent.
- Save attendance records.
- View attendance information.

### 7. Marks Management
- Manage student marks.
- Store academic marks information.
- Retrieve marks through backend APIs.

## 🛠️ Technologies Used

### Frontend
- Next.js
- React.js
- TypeScript
- Tailwind CSS
- HTML
- CSS
- JavaScript

### Backend
- Node.js
- Express.js
- REST API
- JSON Web Token (JWT)
- bcryptjs

### Database
- MongoDB
- Mongoose

### Development Tools
- Visual Studio Code
- Postman
- MongoDB
- Git

## 📂 Project Structure

```text
SmartSchool/
│
├── frontend/
│   ├── app/
│   │   ├── login/
│   │   │   └── page.tsx
│   │   ├── register/
│   │   ├── admin/
│   │   ├── teacher/
│   │   │   └── page.tsx
│   │   └── student/
│   │       └── page.tsx
│   │
│   ├── lib/
│   │   └── api.js
│   │
│   ├── public/
│   ├── package.json
│   └── .env.local
│
├── backend/
│   ├── src/
│   │   ├── config/
│   │   ├── controllers/
│   │   ├── middleware/
│   │   │   └── auth.js
│   │   ├── models/
│   │   ├── routes/
│   │   │   ├── authRoutes.js
│   │   │   ├── attendanceRoutes.js
│   │   │   ├── contentRoutes.js
│   │   │   ├── markRoutes.js
│   │   │   ├── studentRoutes.js
│   │   │   └── teacherRoutes.js
│   │   └── app.js
│   │
│   ├── server.js
│   ├── .env
│   └── package.json
│
└── README.md
```

*Note: This structure represents the project layout; actual files may vary depending on the latest project changes.*

## ⚙️ Installation and Setup

### Prerequisites

Install the following software:

- Node.js
- npm
- MongoDB
- Visual Studio Code

### Step 1: Clone the Repository

```bash
git clone YOUR_GITHUB_REPOSITORY_URL
cd SmartSchool
```

Replace `YOUR_GITHUB_REPOSITORY_URL` with your actual repository URL.

### Step 2: Install Frontend Dependencies

```bash
cd frontend
npm install
```

### Step 3: Configure Frontend Environment

Create a `.env.local` file inside the frontend folder.

```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

### Step 4: Start Frontend

```bash
npm run dev
```

Frontend URL:

http://localhost:3000

### Step 5: Install Backend Dependencies

Open another terminal.

```bash
cd backend
npm install
```

### Step 6: Configure Backend Environment

Create a `.env` file inside the backend folder.

```env
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/smart_school
JWT_SECRET=YOUR_STRONG_SECRET_KEY
```

Replace `YOUR_STRONG_SECRET_KEY` with a secure secret value.

### Step 7: Start Backend

From the backend folder:

```bash
node src/server.js
```

Backend URL:

http://localhost:5000

Expected terminal output:

```text
MongoDB connected successfully!
Backend running at http://localhost:5000
```

## 🔐 Authentication and Security

SmartSchool uses:

- JWT for user authentication.
- bcryptjs for password hashing.
- Role-based authorization middleware.
- Protected API routes.
- Password validation.
- Duplicate email validation.
- Separate dashboards based on user roles.

Passwords are stored as hashed values rather than plain text.

## 🔗 API Endpoints

The backend API uses the base URL:

```text
http://localhost:5000/api
```

### Authentication APIs

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/auth/register` | Register a new user |
| POST | `/auth/login` | User login |
| GET | `/auth/student-names` | Retrieve registered student names |
| GET | `/auth/registered-students` | Retrieve registered students for teachers |

### Student APIs

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/students` | Retrieve student records |
| POST | `/students` | Add a student |
| PUT | `/students/:id` | Update a student |
| DELETE | `/students/:id` | Delete a student |

### Attendance APIs

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/attendance` | Retrieve attendance records |
| POST | `/attendance` | Save attendance records |

### Marks APIs

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/marks` | Retrieve marks |
| POST | `/marks` | Save marks |

*Note: Endpoint availability and HTTP methods should be verified against the current backend route files.*

## 🗄️ Database

Database: MongoDB

Database name:

```text
smart_school
```

The application uses Mongoose models to manage database records.

Main data collections include:
- Users
- Students
- Teachers
- Attendance
- Marks

## ▶️ How to Run the Project

Run the frontend and backend in two separate terminals.

**Terminal 1 – Frontend**

```bash
cd frontend
npm run dev
```

**Terminal 2 – Backend**

```bash
cd backend
node src/server.js
```

Open the application:

http://localhost:3000

## 🔮 Future Enhancements

- Advanced admin management.
- Automatic student admission number generation.
- Improved student registration integration.
- Fee management.
- Examination and report card management.
- Parent portal.
- Email and notification integration.
- Improved analytics and reporting.
- Deployment to cloud hosting.

## 👨‍💻 Developer

**Project Name:** SmartSchool – School Management System

**Project Type:** Full Stack Web Application

**Domain:** Education Technology

**Frontend:** Next.js, React.js, TypeScript

**Backend:** Node.js, Express.js

**Database:** MongoDB

## 📄 License

This project is developed for educational and learning purposes. Add an appropriate open-source license if you plan to distribute it publicly.

---

**SmartSchool – Simplifying School Management Through Technology.**
