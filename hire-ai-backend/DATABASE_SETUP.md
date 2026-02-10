# Database Setup & Migration Guide

## Overview
This guide walks through setting up the new database tables and testing the API endpoints.

## Database Tables

The following tables will be automatically created when the application starts:
1. `users` - User accounts (existing)
2. `job_descriptions` - Job postings
3. `candidate_profiles` - Candidate profile information
4. `education` - Candidate education records
5. `work_experience` - Candidate work experience records

## Automatic Table Creation

Tables are automatically created on application startup via the `create_tables()` function in `app/db/base.py`.

**Lifespan Event in `main.py`:**
```python
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Create tables
    print("Creating database tables...")
    create_tables()
    print("Database tables created successfully!")
    yield
    # Shutdown
    print("Application shutting down...")
```

## Relationships Overview

### User → CandidateProfile
- **Type**: One-to-One (optional)
- **Cascade**: Delete (candidate profile deleted when user deleted)
- **Only for**: Users with `role = 'candidate'`

### CandidateProfile → Education
- **Type**: One-to-Many
- **Cascade**: Delete (education records deleted when profile deleted)

### CandidateProfile → WorkExperience
- **Type**: One-to-Many
- **Cascade**: Delete (work experience deleted when profile deleted)

## Testing the API

### 1. Start the Server
```bash
cd c:\Users\gurum\Downloads\AMZ_AI\Hire_AI_Backend
python app/main.py
```

Server will be available at: `http://localhost:8000`
API Docs: `http://localhost:8000/docs`

### 2. Test Candidate Creation
```bash
curl -X POST "http://localhost:8000/api/v1/candidates" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john.doe@example.com",
    "username": "johndoe",
    "password": "SecurePass123",
    "first_name": "John",
    "last_name": "Doe",
    "title": "Software Engineer",
    "phone": "+1-555-0100",
    "location": "San Francisco, CA",
    "skills": "Python, FastAPI, SQL",
    "profile_summary": "5+ years of experience in full-stack development",
    "total_years_experience": "5",
    "notice_period": "2 weeks",
    "expected_salary": "120000-150000",
    "preferred_mode": "Remote"
  }'
```

### 3. Test Job Creation
```bash
curl -X POST "http://localhost:8000/api/v1/jobs" \
  -H "Content-Type: application/json" \
  -d '{
    "job_title": "Senior Software Engineer",
    "company_name": "Tech Corp",
    "department": "Engineering",
    "location": "San Francisco, CA",
    "level": "Senior",
    "tone_style": "Professional",
    "skills": "Python, FastAPI, SQL, Docker",
    "responsibilities": "Design and develop scalable systems"
  }'
```

### 4. Test Recruiter Creation
```bash
curl -X POST "http://localhost:8000/api/v1/recruiters" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "recruiter@company.com",
    "username": "recruiter_user",
    "password": "SecurePass123",
    "full_name": "Jane Recruiter"
  }'
```

### 5. Add Education Record
```bash
curl -X POST "http://localhost:8000/api/v1/candidates/1/education" \
  -H "Content-Type: application/json" \
  -d '{
    "institution_name": "Stanford University",
    "degree": "Bachelor of Science",
    "field_of_study": "Computer Science",
    "start_year": 2016,
    "end_year": 2020,
    "gpa": "3.85"
  }'
```

### 6. Add Work Experience Record
```bash
curl -X POST "http://localhost:8000/api/v1/candidates/1/work-experience" \
  -H "Content-Type: application/json" \
  -d '{
    "company_name": "Tech Corporation",
    "job_title": "Software Engineer",
    "start_date": "2020-06-01T00:00:00Z",
    "end_date": "2023-12-31T00:00:00Z",
    "location": "San Francisco, CA",
    "description": "Developed microservices and mentored junior developers"
  }'
```

### 7. Fetch Candidate with All Details
```bash
curl -X GET "http://localhost:8000/api/v1/candidates/1" \
  -H "Content-Type: application/json"
```

## Environment Variables

Required in `.env` file:
```env
# Database
DB_USER=root
DB_PASSWORD=your_password
DB_HOST=localhost
DB_PORT=3306
DB_NAME=hireai

# JWT
SECRET_KEY=your-secret-key-change-in-production
```

## Database Indexes

Created indexes for:
- `users.email` - Unique, indexed for faster lookups
- `users.username` - Unique, indexed for faster lookups
- `users.is_active` - Indexed for filtering active users
- `candidate_profiles.user_id` - Unique, indexed for user lookup
- `education.candidate_profile_id` - Indexed for candidate education lookup
- `work_experience.candidate_profile_id` - Indexed for candidate experience lookup
- `job_descriptions.id` - Primary key

## Constraints

### Foreign Key Constraints
- `candidate_profiles.user_id` → `users.id` (ON DELETE CASCADE)
- `education.candidate_profile_id` → `candidate_profiles.id` (ON DELETE CASCADE)
- `work_experience.candidate_profile_id` → `candidate_profiles.id` (ON DELETE CASCADE)

### Unique Constraints
- `users.email` (unique)
- `users.username` (unique)
- `candidate_profiles.user_id` (unique, one profile per candidate)

## Data Types

### String Fields
- Small strings (email, username, etc.): VARCHAR with max length constraints
- Large text (descriptions, skills): TEXT type
- JSON fields: JSON type (for `profiles` and `languages`)

### Timestamps
- `DateTime(timezone=True)` - All timestamps in UTC
- `server_default=func.now()` - Database-side defaults
- `onupdate=func.now()` - Auto-update on modification

### Enums
- `UserRole` - Enum type restricting to 'recruiter' or 'candidate'

## Soft Delete Strategy

**Users** are soft-deleted:
- `is_active` flag set to `False`
- Record remains in database for audit trail
- Candidate profiles cascade delete with user

**Other resources** are hard-deleted:
- Directly removed from database
- No audit trail maintained

## Adding Role-Based Access Control

Future middleware can be added to protect routes:

```python
from fastapi import Depends
from app.db.crud import UserCRUD
from app.db.models import UserRole, User

async def get_current_recruiter(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != UserRole.RECRUITER:
        raise HTTPException(status_code=403, detail="Access denied")
    return current_user

# Usage in routes:
@router.post("/jobs", dependencies=[Depends(get_current_recruiter)])
def create_job(...):
    ...
```

## Backup & Recovery

### Backup Database
```bash
mysqldump -u root -p hireai > backup.sql
```

### Restore Database
```bash
mysql -u root -p hireai < backup.sql
```

## Performance Considerations

1. **Pagination**: Always use `skip` and `limit` for list endpoints
2. **Connection Pooling**: Configured in `pool_pre_ping` and `pool_recycle`
3. **Indexes**: Foreign keys and unique constraints automatically indexed
4. **Query Optimization**: Use relationship loading strategies if needed

```python
# Example: Eager loading relationships
from sqlalchemy.orm import joinedload

profile = db.query(CandidateProfile)\
    .options(joinedload(CandidateProfile.education_records),
             joinedload(CandidateProfile.work_experiences))\
    .filter(CandidateProfile.id == candidate_id)\
    .first()
```

## Troubleshooting

### Table Already Exists Error
If tables already exist, either:
1. Use existing database (preferred)
2. Drop tables: Call `drop_tables()` from `app/db/base.py`

### Foreign Key Constraint Error
Ensure:
- Parent record exists before creating child record
- Correct IDs are used for foreign key references

### Duplicate Entry Error
Check:
- Email/username uniqueness for users
- User_id uniqueness for candidate profiles

---

For additional API documentation, see `API_DOCUMENTATION.md`.
