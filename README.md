# 💼 Job Tracker — Full-Stack Portfolio Application

A modern, full-stack application designed to organize and track job applications, pipeline statuses, and interview dates in a calm, structured, and professional interface.

Built with **Angular 19 (Standalone Components & Signals)** on the frontend and **FastAPI + SQLAlchemy + SQLite** on the backend.

---

## 🌟 Key Features

- **Split-Screen Landing Page**: Professional hero page highlighting product utility, pipeline features, and a realistic dashboard UI preview.
- **Full JWT Authentication**: User registration, login, token storage in `localStorage`, and an Angular functional `HttpInterceptor` auto-attaching bearer tokens to outgoing requests.
- **Application CRUD Pipeline**: Create, read, update, and delete job applications with fields for company, role, application status, applied date, interview date, job URL, and notes.
- **Application Favoriting (Starring)**: Quick-toggle star action to highlight high-priority target applications.
- **Real-Time Filtering & Search**: Instant client-side search by company/role/notes and status filter pills (`All`, `Starred`, `Applied`, `Interviewing`, `Offered`, `Rejected`, `Bookmarked`).
- **Summary Statistics Bar**: Real-time counters calculating application distribution across all pipeline stages.
- **Form Validation & Safe Deletion**: Interactive modal forms with validation error feedback and modal confirmation dialogs for safe deletion.

---

## 🛠️ Tech Stack & Architecture

### Frontend (`job-tracker/`)
- **Framework**: Angular 19 (Standalone Architecture — no NgModules)
- **Reactivity Engine**: **Zoneless Angular Setup** using **Angular Signals** (`signal()`, `computed()`, `.set()`, `.update()`) for reliable async UI state updates without Zone.js overhead
- **Styling**: Modular SCSS with custom design tokens (Off-white `#FAFAFA`, Forest Green `#15803D`, Near-black `#18181B`)
- **Routing & Guards**: Functional `CanActivateFn` Auth Guard for route protection (`/dashboard`)

### Backend (`job-tracker-api/`)
- **Framework**: FastAPI (Python)
- **Database & ORM**: SQLite + SQLAlchemy ORM
- **Security & Auth**: OAuth2 Password Bearer with JWT tokens, Bcrypt password hashing (`passlib`), user ownership validation on all mutate endpoints
- **Data Validation**: Pydantic v2 schemas (`ApplicationCreate`, `ApplicationResponse`, `UserCreate`, `UserLogin`)
- **CORS Middleware**: Explicit CORS configuration allowing `http://localhost:4200`

---

## 📐 Project Architecture & Directory Layout

```
Angular project/
├── README.md                      # Primary project documentation
├── .gitignore                     # Root git ignore rules
│
├── job-tracker/                   # Frontend Angular Application
│   ├── src/
│   │   ├── app/
│   │   │   ├── home/              # Hero / Landing Page component
│   │   │   ├── login/             # Sign In page component
│   │   │   ├── register/          # Sign Up page component
│   │   │   ├── dashboard/         # Main Application Dashboard
│   │   │   ├── application-form/  # Add/Edit Application Modal
│   │   │   ├── glowing-card/      # Card wrapper component
│   │   │   ├── applications.ts    # Application API Service
│   │   │   ├── job-application.ts # TypeScript Interfaces
│   │   │   ├── auth.ts            # Authentication Service
│   │   │   ├── auth-guard.ts      # Route Guard
│   │   │   ├── auth-interceptor.ts# HTTP Bearer Token Interceptor
│   │   │   └── app.routes.ts      # Application Route Definitions
│   │   └── styles.scss            # Global SCSS Design Tokens
│   └── angular.json
│
└── job-tracker-api/               # Backend FastAPI Application
    ├── main.py                    # FastAPI application routes & endpoints
    ├── models.py                  # SQLAlchemy Database Models (User, Application)
    ├── schemas.py                 # Pydantic Schemas
    ├── database.py                # Engine, Session, Base & Auto-Migration
    └── auth_utils.py              # JWT generation & Bcrypt hashing helpers
```

---

## 🔌 API Endpoint Specifications

| Method | Endpoint | Auth Required | Description |
| :--- | :--- | :---: | :--- |
| `POST` | `/auth/register/` | ❌ No | Register a new user account |
| `POST` | `/auth/login` | ❌ No | Authenticate user credentials & return JWT access token |
| `GET` | `/applications` | 🔒 Yes | Fetch current user's job applications |
| `POST` | `/applications` | 🔒 Yes | Create a new job application for authenticated user |
| `PUT` | `/applications/{id}` | 🔒 Yes | Update an existing job application (Ownership validated) |
| `PATCH`| `/applications/{id}/star` | 🔒 Yes | Toggle starred status of an application (Ownership validated) |
| `DELETE`| `/applications/{id}` | 🔒 Yes | Delete an application (Ownership validated) |

---

## ⚡ Getting Started (Local Development)

### 1. Prerequisites
- **Node.js** (v18+) and **npm**
- **Python** (v3.10+)

### 2. Backend Setup (`job-tracker-api`)

```bash
# Navigate to API directory
cd job-tracker-api

# Create & activate virtual environment (Windows)
python -m venv venv
.\venv\Scripts\activate

# Install dependencies (FastAPI, uvicorn, SQLAlchemy, PyJWT, passlib)
pip install fastapi uvicorn sqlalchemy pydantic passlib bcrypt pyjwt

# Run the FastAPI backend server
python -m uvicorn main:app --reload --port 8000
```
*Backend runs live at `http://localhost:8000` (Swagger API docs at `http://localhost:8000/docs`).*

### 3. Frontend Setup (`job-tracker`)

```bash
# Navigate to Angular app directory
cd job-tracker

# Install Node dependencies
npm install

# Start Angular development server
npx ng serve --port 4200
```
*Frontend runs live at `http://localhost:4200`.*

---

## 🛡️ Technical Highlights & Portfolio Engineering Decisions

1. **Zoneless Angular Reactivity Engine**:
   In Angular applications configured without Zone.js change detection, standard property assignments inside HTTP callbacks do not trigger view updates. Every piece of asynchronous dynamic state (`applications`, `loading`, `errorMessage`, `searchQuery`, `stats`, `filteredApplications`) relies on **Angular Signals** (`signal()`, `computed()`), providing efficient, predictable, and fine-grained reactive template rendering.

2. **Backend Security & Multi-Tenant Data Isolation**:
   All CRUD endpoints (`GET`, `POST`, `PUT`, `PATCH`, `DELETE`) decode the JWT token via FastAPI's `get_current_user` dependency. Mutation endpoints (`PUT`, `DELETE`, `PATCH`) explicitly verify `db_application.user_id == current_user.id`, preventing horizontal privilege escalation attacks.

3. **Curated Portfolio Design System**:
   Designed specifically to project structure, clarity, and trustworthiness for portfolio presentation:
   - **Background**: Soft off-white (`#FAFAFA`)
   - **Primary CTA Accent**: Forest Green (`#15803D`)
   - **Status Badges**: Small rounded `999px` pills with distinct light-background/dark-text pairings (`Applied`, `Interviewing`, `Offered`, `Rejected`, `Bookmarked`)
