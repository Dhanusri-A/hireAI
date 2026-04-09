import os
import json
import time
import re
import requests
from fastapi import HTTPException, UploadFile
from typing import List, Dict

from app.services.resume_assist import process_uploaded_file as resume_text_extract

api_key = os.getenv("GROQ_API_KEY")
api_url = "https://api.groq.com/openai/v1/chat/completions"

EMAIL_PATTERN = re.compile(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}")


# ----------------------------------------------------
# HELPERS
# ----------------------------------------------------

def extract_email_from_text(text: str) -> str | None:
    if not text:
        return None
    match = EMAIL_PATTERN.search(text)
    return match.group(0).strip() if match else None


# ----------------------------------------------------
# PROMPT (STRICT + CONTROLLED)
# ----------------------------------------------------

def build_prompt(resume: str, jd: dict) -> str:
    jd_skills = jd.get("skills", [])

    return f"""
You are an ATS resume evaluation engine.

Return ONLY valid JSON.
No markdown.
No explanation.
No extra text.

-----------------------------------
OUTPUT FORMAT
-----------------------------------

{{
  "name": "string",
  "email": "string",
  "role_company": "string",
  "years_of_experience": number,
  "work_type": "full-time | contract | intern | unknown",

  "overall_match": number,

  "ai_insight": "1. ... 2. ... 3. ...",

  "match_split": {{
    "skills": number,
    "experience": number,
    "qualification": number
  }},

  "skill_breakdown": {{
    "matched": number,
    "partial": number,
    "missing": number
  }},

  "skills": {{
    "<JD_SKILL>": "matched | partial | missing"
  }}
}}

-----------------------------------
INPUT
-----------------------------------

Job Description:
{json.dumps(jd, indent=2)}

Job Description Skills (SOURCE OF TRUTH):
{json.dumps(jd_skills, indent=2)}

Resume:
{resume}

-----------------------------------
STRICT RULES (READ CAREFULLY)
-----------------------------------

1) SKILL MATCHING (MOST IMPORTANT)

- ONLY evaluate Job Description Skills
- Ignore ALL extra resume skills
- DO NOT add/remove skills

For EACH JD skill:
- exact match → "matched"
- related → "partial"
- not found → "missing"

-----------------------------------
2) SKILL SCORING (DOMINANT FACTOR)

- All skills matched → 85–100
- 70–90% matched → 70–85
- 40–70% matched → 50–70
- Less than 40% matched → 0–50

CRITICAL:
- Missing IMPORTANT skill (like AWS) → reduce heavily
- If >50% skills missing → overall_match MUST be ≤ 40
- Extra skills MUST NOT increase score

-----------------------------------
3) EXPERIENCE (REALISTIC)

- Internship / <1 year → 50–70
- 1–3 years → 60–80
- Strong experience → 75–90

IMPORTANT:
- DO NOT give 0 if any relevant experience exists

-----------------------------------
4) QUALIFICATION (FAIR)

- B.E/B.Tech CSE → 85–100
- IT/ECE → 70–85
- Related → 50–70
- Unrelated → 0–50

IMPORTANT:
- DO NOT give 0 for engineering degrees

-----------------------------------
5) FINAL SCORING

- overall_match MUST be based mostly on skills
- Skills ≈ 70% weight
- Experience ≈ 20%
- Qualification ≈ 10%

MANDATORY CAPS:

- If key skill missing → overall_match ≤ 60
- If most skills missing → overall_match ≤ 40

-----------------------------------
6) STRICT BEHAVIOR

- DO NOT inflate scores
- DO NOT reward unrelated skills
- Be realistic like a strict recruiter

-----------------------------------
VALIDATION

- matched + partial + missing MUST equal total JD skills
- Return ALL JD skills in output
"""


# ----------------------------------------------------
# MAIN MATCH FUNCTION
# ----------------------------------------------------

def match_resumes(
    resumes: List[UploadFile],
    job_description: Dict,
) -> List[Dict]:

    results = []

    for resume in resumes:
        parsed_resume_text = resume_text_extract(resume)
        extracted_email = extract_email_from_text(parsed_resume_text)

        prompt = build_prompt(parsed_resume_text, job_description)

        payload = {
            "model": "llama-3.1-8b-instant",
            "messages": [
                {
                    "role": "system",
                    "content": "You are a strict ATS resume evaluator. Return only JSON."
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            "temperature": 0.2,
            "max_tokens": 1400,
        }

        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        }

        for attempt in range(3):
            response = requests.post(
                api_url,
                headers=headers,
                json=payload,
                timeout=30
            )

            if response.status_code != 429:
                break

            time.sleep(2 ** attempt)

        if response.status_code != 200:
            raise HTTPException(
                status_code=response.status_code,
                detail=f"Groq API error: {response.text}",
            )

        content = response.json()["choices"][0]["message"]["content"]

        try:
            parsed_result = json.loads(content)

            if isinstance(parsed_result, dict):
                llm_email = str(parsed_result.get("email") or "").strip() or None
                parsed_result["email"] = llm_email or extracted_email

            results.append(parsed_result)

        except json.JSONDecodeError:
            raise HTTPException(
                status_code=500,
                detail="LLM returned invalid JSON",
            )

    return results






# import os
# import json
# import time
# import re
# import requests
# from fastapi import HTTPException, UploadFile
# from typing import List, Dict
# # from app.services.resume_parser import parse_resume
# from app.services.resume_assist import process_uploaded_file as resume_text_extract

# api_key = os.getenv("GROQ_API_KEY")
# api_url = "https://api.groq.com/openai/v1/chat/completions"


# EMAIL_PATTERN = re.compile(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}")


# def extract_email_from_text(text: str) -> str | None:
#     if not text:
#         return None
#     match = EMAIL_PATTERN.search(text)
#     return match.group(0).strip() if match else None


# def build_prompt(resume: str, jd: dict) -> str:
#     jd_skills = jd.get("skills", [])

#     return f"""
# You are an ATS engine.

# You MUST return ONLY valid JSON.
# NO markdown.
# NO explanation.
# NO extra text.
# Return strictly parsable JSON.

# VERY IMPORTANT RULE:
# - The "skills" object MUST contain ONLY the skills listed in "Job Description Skills".
# - DO NOT add resume skills.
# - DO NOT rename skills.
# - DO NOT remove skills.
# - Use EXACT skill names from Job Description Skills.
# - If skill keyword appears exactly in resume → "matched"
# - If related but not exact → "partial"
# - If not present → "missing"

# Skill matching rules:
# - Case-insensitive
# - Exact keyword match priority
# - Do NOT infer extra technologies
# - Do NOT assume equivalents unless explicitly mentioned

# Return JSON in EXACT format:

# {{
#   "name": "string",
#     "email": "string",
#   "role_company": "string",
#   "years_of_experience": number,
#   "work_type": "full-time | contract | intern | unknown",
#   "overall_match": number,
#   "ai_insight": "1. ... 2. ... 3. ...",
#   "match_split": {{
#     "skills": number,
#     "experience": number,
#     "qualification": number
#   }},
#   "skills": {{
#     "<JD_SKILL_1>": "matched | partial | missing"
#   }}
# }}

# Job Description:
# {json.dumps(jd, indent=2)}

# Job Description Skills (SOURCE OF TRUTH — USE ONLY THESE):
# {json.dumps(jd_skills, indent=2)}

# Resume:
# {resume}

# STRICT SCORING RULES (MANDATORY):

# 1) SKILLS PRIORITY:
# - Skills score MUST have minimum 60% weight in overall_match.
# - Experience and qualification together MUST NOT exceed 40% weight.

# 2) SKILL DOMINANCE RULE:
# - If skills score < 50 → overall_match MUST NOT exceed 55.
# - If more than 50% of JD skills are "missing" → overall_match MUST NOT exceed 40.
# - Experience can NEVER compensate for missing required skills.

# 3) EXPERIENCE RULE:
# - Experience score is capped at 100.
# - Even if candidate has very high years_of_experience, it MUST NOT increase overall_match if skills score is weak.

# 4) FINAL CALCULATION:
# - overall_match = weighted average respecting above constraints.
# - Scores must be between 0 and 100.
# - All fields must be filled.
# - Think carefully before scoring.

# Be strict. Prioritize required skills over years of experience.
# """


# def match_resumes(
#     resumes: List[UploadFile],
#     job_description: Dict,
# ) -> List[Dict]:
#     results = []

#     for resume in resumes:
#         parsed_resume_text = resume_text_extract(resume)
#         extracted_email = extract_email_from_text(parsed_resume_text)
#         prompt = build_prompt(parsed_resume_text, job_description)

#         payload = {
#             "model": "llama-3.1-8b-instant",
#             "messages": [
#                 {
#                     "role": "system",
#                     "content": (
#                         "You are an ATS resume matching engine. "
#                         "Analyze resumes strictly and objectively."
#                     ),
#                 },
#                 {"role": "user", "content": prompt},
#             ],
#             "temperature": 0.3,
#             "max_tokens": 1200,
#         }

#         headers = {
#             "Authorization": f"Bearer {api_key}",
#             "Content-Type": "application/json",
#         }

#         for attempt in range(3):       # in case of rate limit, retry with exponential backoff
#             response = requests.post(
#                 api_url, headers=headers, json=payload, timeout=30
#             )
#             if response.status_code != 429:  # 429 => rate limit exceeded
#                 break
#             time.sleep(2 ** attempt)  # 2s, 4s, 8s

#         if response.status_code != 200:
#             raise HTTPException(
#                 status_code=response.status_code,
#                 detail=f"Groq API error: {response.text}",
#             )

#         content = response.json()["choices"][0]["message"]["content"]

#         try:
#             parsed_result = json.loads(content)
#             if isinstance(parsed_result, dict):
#                 llm_email = str(parsed_result.get("email") or "").strip() or None
#                 parsed_result["email"] = llm_email or extracted_email
#             results.append(parsed_result)
#         except json.JSONDecodeError:
#             raise HTTPException(
#                 status_code=500,
#                 detail="LLM returned invalid JSON",
#             )

#     return results

