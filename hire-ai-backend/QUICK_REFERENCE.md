# Quick Reference Guide - HireAI Backend

## Common Operations

### Create Candidate (User + Profile)

```bash
curl -X POST "http://localhost:8000/api/v1/candidates" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "username": "johndoe",
    "password": "SecurePass123",
    "first_name": "John",
    "last_name": "Doe",
    "title": "Software Engineer",
    "skills": "Python,FastAPI,SQL",
    "profile_summary": "5 years experience in full-stack development",
    "total_years_experience": "5",
    "notice_period": "2 weeks",
    "expected_salary": "120000-150000",
    "preferred_mode": "Remote"
  }'
```

### Create Job Description

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
    "skills": "Python,FastAPI,SQL,Docker",
    "responsibilities": "Design and develop scalable systems"
  }'
```

### Create Recruiter

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

### Add Education Record

```bash
curl -X POST "http://localhost:8000/api/v1/candidates/1/education" \
  -H "Content-Type: application/json" \
  -d '{
    "institution_name": "Stanford University",
    "degree": "Bachelor of Science",
    "field_of_study": "Computer Science",
    "start_year": 2016,
    "end_year": 2020,
    "gpa": "3.85",
    "honors": "Summa Cum Laude"
  }'
```

### Add Work Experience

```bash
curl -X POST "http://localhost:8000/api/v1/candidates/1/work-experience" \
  -H "Content-Type: application/json" \
  -d '{
    "company_name": "Tech Corporation",
    "job_title": "Senior Software Engineer",
    "start_date": "2020-06-01T00:00:00Z",
    "end_date": "2023-12-31T00:00:00Z",
    "location": "San Francisco, CA",
    "description": "Led development of microservices architecture"
  }'
```

### Get Candidate with All Details

```bash
curl -X GET "http://localhost:8000/api/v1/candidates/1" \
  -H "Content-Type: application/json"
```

Response:
```json
{
  "id": 1,
  "user_id": 1,
  "first_name": "John",
  "last_name": "Doe",
  "title": "Software Engineer",
  "image_url": null,
  "phone": null,
  "location": null,
  "skills": "Python,FastAPI,SQL",
  "profile_summary": "5 years experience in full-stack development",
  "total_years_experience": "5",
  "notice_period": "2 weeks",
  "expected_salary": "120000-150000",
  "preferred_mode": "Remote",
  "profiles": null,
  "languages": null,
  "created_at": "2024-01-01T10:00:00Z",
  "updated_at": "2024-01-01T10:00:00Z",
  "education_records": [
    {
      "id": 1,
      "candidate_profile_id": 1,
      "institution_name": "Stanford University",
      "degree": "Bachelor of Science",
      "field_of_study": "Computer Science",
      "start_year": 2016,
      "end_year": 2020,
      "gpa": "3.85",
      "honors": "Summa Cum Laude",
      "created_at": "2024-01-01T10:00:00Z",
      "updated_at": "2024-01-01T10:00:00Z"
    }
  ],
  "work_experiences": [
    {
      "id": 1,
      "candidate_profile_id": 1,
      "company_name": "Tech Corporation",
      "job_title": "Senior Software Engineer",
      "start_date": "2020-06-01T00:00:00Z",
      "end_date": "2023-12-31T00:00:00Z",
      "location": "San Francisco, CA",
      "description": "Led development of microservices architecture",
      "created_at": "2024-01-01T10:00:00Z",
      "updated_at": "2024-01-01T10:00:00Z"
    }
  ]
}
```

### Update Candidate Profile

```bash
curl -X PUT "http://localhost:8000/api/v1/candidates/1" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Staff Software Engineer",
    "expected_salary": "150000-180000"
  }'
```

### List All Jobs (Paginated)

```bash
curl -X GET "http://localhost:8000/api/v1/jobs?skip=0&limit=10"
```

### List All Candidates (Paginated)

```bash
curl -X GET "http://localhost:8000/api/v1/candidates?skip=0&limit=20"
```

### Get Candidate's Education Records

```bash
curl -X GET "http://localhost:8000/api/v1/candidates/1/education"
```

### Get Candidate's Work Experience

```bash
curl -X GET "http://localhost:8000/api/v1/candidates/1/work-experience"
```

### Update Education Record

```bash
curl -X PUT "http://localhost:8000/api/v1/candidates/1/education/1" \
  -H "Content-Type: application/json" \
  -d '{
    "gpa": "3.9"
  }'
```

### Update Work Experience Record

```bash
curl -X PUT "http://localhost:8000/api/v1/candidates/1/work-experience/1" \
  -H "Content-Type: application/json" \
  -d '{
    "description": "Led development of microservices and mentored team"
  }'
```

### Delete Candidate (Soft Delete User)

```bash
curl -X DELETE "http://localhost:8000/api/v1/candidates/1"
```

### Delete Education Record

```bash
curl -X DELETE "http://localhost:8000/api/v1/candidates/1/education/1"
```

### Delete Work Experience Record

```bash
curl -X DELETE "http://localhost:8000/api/v1/candidates/1/work-experience/1"
```

### Delete Job Description

```bash
curl -X DELETE "http://localhost:8000/api/v1/jobs/1"
```

### Delete Recruiter

```bash
curl -X DELETE "http://localhost:8000/api/v1/recruiters/1"
```

## Using Python Client

### FastAPI TestClient

```python
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

# Create candidate
response = client.post(
    "/api/v1/candidates",
    json={
        "email": "test@example.com",
        "username": "testuser",
        "password": "SecurePass123",
        "first_name": "Test",
        "last_name": "User",
        "title": "Engineer"
    }
)
assert response.status_code == 201
candidate = response.json()

# Get candidate details
response = client.get(f"/api/v1/candidates/{candidate['profile']['id']}")
assert response.status_code == 200

# Update candidate
response = client.put(
    f"/api/v1/candidates/{candidate['profile']['id']}",
    json={"title": "Senior Engineer"}
)
assert response.status_code == 200

# Add education
response = client.post(
    f"/api/v1/candidates/{candidate['profile']['id']}/education",
    json={
        "institution_name": "MIT",
        "degree": "BS",
        "field_of_study": "Computer Science",
        "start_year": 2018,
        "end_year": 2022,
        "gpa": "3.9"
    }
)
assert response.status_code == 201
```

## Database Direct Access

```python
from sqlalchemy.orm import Session
from app.db.base import SessionLocal
from app.db.crud import CandidateProfileCRUD, EducationCRUD
from app.db.models import CandidateProfile

# Get session
db = SessionLocal()

# Get candidate with eager loading
candidate = db.query(CandidateProfile)\
    .filter(CandidateProfile.id == 1)\
    .first()

# Access relationships
print(candidate.user.email)
print(candidate.education_records)

# Close session
db.close()
```

## Error Handling Examples

### Missing Resource (404)
```bash
curl -X GET "http://localhost:8000/api/v1/candidates/9999"
```
Response:
```json
{
  "detail": "Candidate with ID 9999 not found"
}
```

### Invalid Input (422)
```bash
curl -X POST "http://localhost:8000/api/v1/candidates" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "invalid-email",
    "username": "ab",
    "password": "short"
  }'
```
Response:
```json
{
  "detail": [
    {
      "type": "value_error",
      "loc": ["body", "email"],
      "msg": "invalid email format"
    }
  ]
}
```

### Duplicate Email (422)
```bash
curl -X POST "http://localhost:8000/api/v1/candidates" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "username": "newuser",
    "password": "SecurePass123"
  }'
```
Response:
```json
{
  "detail": "Email john@example.com already registered"
}
```

## Status Codes Reference

| Code | Meaning | Example |
|------|---------|---------|
| 200 | OK | Successful GET, PUT |
| 201 | Created | Successful POST |
| 204 | No Content | Successful DELETE |
| 400 | Bad Request | Malformed JSON |
| 404 | Not Found | Resource doesn't exist |
| 422 | Unprocessable Entity | Validation or business logic error |
| 500 | Server Error | Database or other server error |

## Pagination Example

```bash
# Get first 10 candidates
curl "http://localhost:8000/api/v1/candidates?skip=0&limit=10"

# Get next 10 candidates
curl "http://localhost:8000/api/v1/candidates?skip=10&limit=10"

# Get first 5 jobs
curl "http://localhost:8000/api/v1/jobs?skip=0&limit=5"
```

## Environment Setup

```bash
# Create .env file
DB_USER=root
DB_PASSWORD=your_password
DB_HOST=localhost
DB_PORT=3306
DB_NAME=hireai
SECRET_KEY=your-secret-key-change-in-production

# Install dependencies
pip install -r requirements.txt

# Run application
python app/main.py
```

## Testing Tools

- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc
- **Postman**: Import from OpenAPI spec at `/openapi.json`

## Common Issues & Solutions

### Issue: "Table already exists"
**Solution**: Database tables are created automatically on startup. If re-running, drop tables or use a fresh database.

### Issue: Foreign key constraint error
**Solution**: Ensure parent record exists before creating child record. Example: Create CandidateProfile only after creating User with that ID.

### Issue: Duplicate entry error
**Solution**: Email and username must be unique. Check if user already exists.

### Issue: 422 validation error
**Solution**: Check request body format, field types, and required fields. Use Swagger UI for validation hints.

---

For detailed documentation, see:
- [API_DOCUMENTATION.md](API_DOCUMENTATION.md)
- [DATABASE_SETUP.md](DATABASE_SETUP.md)
- [IMPLEMENTATION_SUMMARY.md](IMPLEMENTATION_SUMMARY.md)
