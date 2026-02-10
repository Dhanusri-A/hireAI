# HireAI Backend API Documentation

## Database Schema Overview

### 1. Users Table (Existing)
User authentication table with support for recruiters and candidates.

**Fields:**
- `id` (PK): Auto-incrementing integer
- `email`: Unique email address
- `username`: Unique username
- `full_name`: Optional full name
- `hashed_password`: Bcrypt hashed password
- `role`: Enum (recruiter | candidate)
- `is_active`: Boolean flag for soft delete
- `created_at`: Timestamp
- `updated_at`: Timestamp

**Relationships:**
- One-to-One with `CandidateProfile` (nullable, only for candidates)

---

### 2. JobDescription Table
Stores job postings created by recruiters.

**Fields:**
- `id` (PK): Auto-incrementing integer
- `job_title`: Job title (required)
- `company_name`: Company name (required)
- `department`: Department name (optional)
- `location`: Job location (optional)
- `level`: Experience level (optional)
- `tone_style`: Writing style preference (optional)
- `skills`: Comma-separated skills required (optional)
- `responsibilities`: Job responsibilities (optional, text)
- `additional_data`: Additional information (optional, text)
- `input_description`: Original input description (optional, text)
- `created_at`: Timestamp
- `updated_at`: Timestamp

---

### 3. CandidateProfile Table
Extended profile information for candidates.

**Fields:**
- `id` (PK): Auto-incrementing integer
- `user_id` (FK): Reference to users table (unique)
- `first_name`: First name (optional, max 155)
- `last_name`: Last name (optional, max 155)
- `title`: Job title/designation (optional)
- `image_url`: Profile picture URL (optional)
- `phone`: Contact phone number (optional)
- `location`: Current location (optional)
- `skills`: Comma-separated skills (optional, text)
- `profile_summary`: Professional summary (optional, text)
- `total_years_experience`: Years of experience (optional)
- `notice_period`: Notice period (optional)
- `expected_salary`: Salary expectations (optional)
- `preferred_mode`: Work mode preference (optional)
- `profiles`: Additional profiles as JSON (optional)
- `languages`: Languages known as JSON (optional)
- `created_at`: Timestamp
- `updated_at`: Timestamp

**Relationships:**
- One-to-One with `User`
- One-to-Many with `Education`
- One-to-Many with `WorkExperience`

---

### 4. Education Table
Candidate education records.

**Fields:**
- `id` (PK): Auto-incrementing integer
- `candidate_profile_id` (FK): Reference to candidate_profiles
- `institution_name`: School/University name (optional)
- `degree`: Degree type (optional)
- `field_of_study`: Major/Field (optional)
- `start_year`: Starting year (optional)
- `end_year`: Ending year (optional)
- `gpa`: GPA score (optional)
- `honors`: Academic honors (optional)
- `created_at`: Timestamp
- `updated_at`: Timestamp

**Relationships:**
- Many-to-One with `CandidateProfile`

---

### 5. WorkExperience Table
Candidate work experience records.

**Fields:**
- `id` (PK): Auto-incrementing integer
- `candidate_profile_id` (FK): Reference to candidate_profiles
- `company_name`: Company name (optional)
- `job_title`: Job title (optional)
- `start_date`: Start date (optional, datetime)
- `end_date`: End date (optional, datetime)
- `location`: Work location (optional)
- `description`: Job description (optional, text)
- `created_at`: Timestamp
- `updated_at`: Timestamp

**Relationships:**
- Many-to-One with `CandidateProfile`

---

## API Endpoints

### Base URL
`http://localhost:8000/api/v1`

### Authentication Endpoints
(Existing routes in `auth_routes.py`)

---

## Job Management Endpoints

### Create Job
```http
POST /jobs
Content-Type: application/json

{
  "job_title": "Senior Software Engineer",
  "company_name": "Tech Corp",
  "department": "Engineering",
  "location": "San Francisco, CA",
  "level": "Senior",
  "tone_style": "Professional",
  "skills": "Python, FastAPI, SQL",
  "responsibilities": "Design and develop scalable systems.",
  "additional_data": null,
  "input_description": "Raw input description"
}
```

**Response:** 
```json
{
  "id": 1,
  "job_title": "Senior Software Engineer",
  "company_name": "Tech Corp",
  "department": "Engineering",
  "location": "San Francisco, CA",
  "level": "Senior",
  "tone_style": "Professional",
  "skills": "Python, FastAPI, SQL",
  "responsibilities": "Design and develop scalable systems.",
  "additional_data": null,
  "input_description": "Raw input description",
  "created_at": "2024-01-01T10:00:00Z",
  "updated_at": "2024-01-01T10:00:00Z"
}
```

### Get All Jobs
```http
GET /jobs?skip=0&limit=100
```

### Get Job by ID
```http
GET /jobs/{job_id}
```

### Update Job
```http
PUT /jobs/{job_id}
Content-Type: application/json

{
  "job_title": "Updated Title"
}
```

### Delete Job
```http
DELETE /jobs/{job_id}
```

---

## Recruiter Management Endpoints

### Create Recruiter
```http
POST /recruiters
Content-Type: application/json

{
  "email": "recruiter@company.com",
  "username": "recruiter_user",
  "password": "securepassword123",
  "full_name": "John Recruiter"
}
```

### Get All Recruiters
```http
GET /recruiters?skip=0&limit=100
```

### Get Recruiter by ID
```http
GET /recruiters/{recruiter_id}
```

### Update Recruiter
```http
PUT /recruiters/{recruiter_id}
Content-Type: application/json

{
  "full_name": "Updated Name",
  "password": "newpassword123",
  "is_active": true
}
```

### Delete Recruiter
```http
DELETE /recruiters/{recruiter_id}
```

---

## Candidate Management Endpoints

### Create Candidate
```http
POST /candidates
Content-Type: application/json

{
  "email": "candidate@email.com",
  "username": "candidate_user",
  "password": "securepassword123",
  "first_name": "John",
  "last_name": "Doe",
  "title": "Software Engineer",
  "phone": "+1-555-0100",
  "location": "San Francisco, CA",
  "skills": "Python, JavaScript, SQL",
  "profile_summary": "Experienced software engineer with 5 years in full-stack development.",
  "total_years_experience": "5",
  "notice_period": "2 weeks",
  "expected_salary": "120000-150000",
  "preferred_mode": "Remote"
}
```

### Get All Candidates
```http
GET /candidates?skip=0&limit=100
```

### Get Candidate by ID (with Education & Experience)
```http
GET /candidates/{candidate_id}
```

### Update Candidate Profile
```http
PUT /candidates/{candidate_id}
Content-Type: application/json

{
  "title": "Updated Title",
  "location": "New City, ST"
}
```

### Delete Candidate
```http
DELETE /candidates/{candidate_id}
```

---

## Education Endpoints

### Add Education Record
```http
POST /candidates/{candidate_id}/education
Content-Type: application/json

{
  "institution_name": "Stanford University",
  "degree": "Bachelor of Science",
  "field_of_study": "Computer Science",
  "start_year": 2016,
  "end_year": 2020,
  "gpa": "3.85",
  "honors": "Summa Cum Laude"
}
```

### Get Candidate Education
```http
GET /candidates/{candidate_id}/education?skip=0&limit=100
```

### Update Education Record
```http
PUT /candidates/{candidate_id}/education/{education_id}
Content-Type: application/json

{
  "gpa": "3.9",
  "honors": "Updated Honors"
}
```

### Delete Education Record
```http
DELETE /candidates/{candidate_id}/education/{education_id}
```

---

## Work Experience Endpoints

### Add Work Experience Record
```http
POST /candidates/{candidate_id}/work-experience
Content-Type: application/json

{
  "company_name": "Tech Corporation",
  "job_title": "Senior Software Engineer",
  "start_date": "2020-06-01T00:00:00Z",
  "end_date": "2023-12-31T00:00:00Z",
  "location": "San Francisco, CA",
  "description": "Led development of microservices architecture and mentored junior developers."
}
```

### Get Candidate Work Experience
```http
GET /candidates/{candidate_id}/work-experience?skip=0&limit=100
```

### Update Work Experience Record
```http
PUT /candidates/{candidate_id}/work-experience/{experience_id}
Content-Type: application/json

{
  "description": "Updated description"
}
```

### Delete Work Experience Record
```http
DELETE /candidates/{candidate_id}/work-experience/{experience_id}
```

---

## Error Responses

### 404 Not Found
```json
{
  "detail": "Resource with ID not found"
}
```

### 422 Unprocessable Entity
```json
{
  "detail": "Failed to create resource: error message"
}
```

### 403 Forbidden
```json
{
  "detail": "Not authorized to access this resource"
}
```

---

## CRUD Service Classes

### UserCRUD
- `create_user()` - Create new user
- `get_user_by_id()` - Fetch user by ID
- `get_user_by_email()` - Fetch user by email
- `get_user_by_username()` - Fetch user by username
- `get_all_users()` - List all users with pagination
- `update_user()` - Update user details
- `delete_user()` - Soft delete user
- `authenticate_user()` - Authenticate user credentials
- `get_users_by_role()` - Get users by role

### JobDescriptionCRUD
- `create_job()` - Create new job posting
- `get_job_by_id()` - Fetch job by ID
- `get_all_jobs()` - List all jobs with pagination
- `update_job()` - Update job details
- `delete_job()` - Delete job posting

### CandidateProfileCRUD
- `create_candidate_profile()` - Create candidate profile
- `get_profile_by_id()` - Fetch profile by ID
- `get_profile_by_user_id()` - Fetch profile by user ID
- `get_all_profiles()` - List all profiles with pagination
- `update_profile()` - Update profile details
- `delete_profile()` - Delete candidate profile

### EducationCRUD
- `create_education()` - Add education record
- `get_education_by_id()` - Fetch education by ID
- `get_educations_by_candidate()` - List education records with pagination
- `update_education()` - Update education details
- `delete_education()` - Delete education record

### WorkExperienceCRUD
- `create_work_experience()` - Add work experience
- `get_work_experience_by_id()` - Fetch experience by ID
- `get_work_experiences_by_candidate()` - List experiences with pagination
- `update_work_experience()` - Update experience details
- `delete_work_experience()` - Delete experience record

---

## File Structure

```
app/
├── api/
│   └── v1/
│       ├── auth_routes.py
│       ├── user_routes.py
│       ├── jobs_routes.py
│       ├── recruiters_routes.py
│       ├── candidates_routes.py
│       └── __init__.py
├── core/
│   ├── config.py
│   └── security.py
├── db/
│   ├── base.py
│   ├── models.py
│   ├── crud.py
│   └── __pycache__/
├── schemas/
│   ├── user.py
│   ├── job.py
│   ├── candidate.py
│   ├── recruiter.py
│   └── __pycache__/
├── services/
│   └── auth_services.py
├── main.py
└── __init__.py
```

---

## Key Features

1. **SQLAlchemy ORM with Mapped**: Uses modern SQLAlchemy 2.0+ syntax with `Mapped` types
2. **Relationship Cascade**: Delete operations cascade appropriately (e.g., deleting candidate deletes profile, education, and experience)
3. **Transaction Safety**: All CRUD operations use SQLAlchemy transactions
4. **Input Validation**: Pydantic schemas validate all inputs with proper constraints
5. **Error Handling**: Comprehensive error responses with appropriate HTTP status codes
6. **Soft Delete**: User deletion is soft (is_active flag) for audit trails
7. **Pagination**: List endpoints support `skip` and `limit` parameters
8. **Timestamps**: All records include `created_at` and `updated_at` fields
9. **Foreign Keys**: Proper database relationships with integrity constraints

---

## Notes

- All timestamps use UTC timezone
- Passwords are hashed using bcrypt
- Educational and work experience records are automatically deleted when candidate profile is deleted
- Job descriptions are independent and not deleted with user deletion
- Role-based access control can be added to routes via dependency injection
