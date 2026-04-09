import os
import json
import time
import requests
from typing import Dict, List
from fastapi import HTTPException

from datetime import datetime, timedelta, timezone


# ----------------------------------------------------
# CONFIG
# ----------------------------------------------------

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"

MODEL = "llama-3.1-8b-instant"


# ----------------------------------------------------
# LLM CALLER
# ----------------------------------------------------

def call_llm(prompt: str) -> Dict:

    payload = {
        "model": MODEL,
        "messages": [
            {
                "role": "system",
                "content": """
You are a STRICT JSON API.

Rules:
- Return ONLY JSON
- No markdown
- No explanation
- Follow schema exactly
"""
            },
            {
                "role": "user",
                "content": prompt
            }
        ],
        "temperature": 0.2,
        "max_tokens": 1500
    }

    headers = {
        "Authorization": f"Bearer {GROQ_API_KEY}",
        "Content-Type": "application/json",
    }

    response = None

    for attempt in range(3):
        response = requests.post(
            GROQ_URL,
            headers=headers,
            json=payload,
            timeout=40
        )

        if response.status_code != 429:
            break

        time.sleep(2 ** attempt)

    if response and response.status_code != 200:
        raise HTTPException(
            status_code=500,
            detail=f"LLM error: {response.text}"
        )

    if response:
        content = response.json()["choices"][0]["message"]["content"]

    try:
        return json.loads(content)
    except Exception:
        raise HTTPException(
            status_code=500,
            detail="LLM returned invalid JSON"
        )


# ----------------------------------------------------
# QUESTION GENERATION
# ----------------------------------------------------

def generate_section_questions(
    job_title: str,
    job_level: str,
    skills: str,
    section_type: str,
    no_of_questions: int,
    custom_questions: List[str] | None = None
) -> Dict:

    custom_questions = custom_questions or []

    prompt = f"""
Generate professional interview questions.

Job Title:
{job_title}

Experience Level:
{job_level}

Key Skills:
{skills}

Section Type:
{section_type}

Rules:

Generate exactly {no_of_questions} questions.

Guidelines:

If type is "introduction":
- Just return "Tell me about yourself?" in output json

If type is "technical":
- ask technical questions only related to that job title
- focus on the provided skills
- include situation based technical questions

If type is "behavioral":
- ask about experience
- teamwork
- problem solving
- leadership

Difficulty Rules (VERY IMPORTANT):
- If Experience Level is "junior": ask basic to intermediate questions, focus on fundamentals and understanding
- If Experience Level is "mid": ask moderate difficulty questions, include practical scenarios and real-world usage
- If Experience Level is "senior": ask advanced and challenging questions, include system design, edge cases, and deep problem solving

General Rules:
- Questions must match the required skills
- Difficulty must strictly align with experience level
- Avoid generic or vague questions

Return JSON:

{{
 "questions":[
  "question1",
  "question2"
 ]
}}
"""

    result = call_llm(prompt)
    ai_questions = result.get("questions", [])[:no_of_questions]

    final_questions = ai_questions + custom_questions

    return {
        "type": section_type,
        "questions": final_questions
    }


# ----------------------------------------------------
# FOLLOW UP QUESTION
# ----------------------------------------------------

def generate_follow_up_question(
    job_title: str,
    job_level: str,
    skills: str,
    question: str,
    answer: str
) -> str:

    prompt = f"""
Generate ONE follow-up interview question.

Job Title:
{job_title}

Experience Level:
{job_level}

Key Skills:
{skills}

Original Question:
{question}

Candidate Answer:
{answer}

Rules:

- Ask deeper clarification based on skill relevance
- Match difficulty with experience level:
  - junior → basic clarification
  - mid → practical scenario
  - senior → edge cases / deeper reasoning
- Keep it strictly related to the job skills
- Only ONE question

Return JSON:

{{
 "follow_up":"question"
}}
"""

    result = call_llm(prompt)

    return result["follow_up"]


# ----------------------------------------------------
# EVALUATION RUBRICS
# ----------------------------------------------------

TECHNICAL_RUBRIC = """
technical_accuracy (0-100)
problem_solving (0-100)
clarity (0-100)
depth (0-100)
"""

BEHAVIORAL_RUBRIC = """
relevance (0-100)
communication (0-100)
experience_evidence (0-100)
clarity (0-100)
"""

UNIVERSAL_RUBRIC = """
knowledge_accuracy (0-25)
practical_application (0-25)
problem_solving_thinking (0-25)
communication_clarity (0-25)
"""

# ----------------------------------------------------
# SECTION EVALUATION (UPDATED)
# ----------------------------------------------------

def evaluate_section_answers(
    job_title: str,
    job_level: str,
    skills: str,
    section_type: str,
    qa: List[Dict]
) -> Dict:

    rubric = TECHNICAL_RUBRIC if section_type.lower() == "technical" else BEHAVIORAL_RUBRIC

    prompt = f"""
Evaluate interview answers.

Job Title:
{job_title}

Experience Level:
{job_level}

Key Skills:
{skills}

Section Type:
{section_type}

Evaluation Rubric:
knowledge_accuracy (0-25)
practical_application (0-25)
problem_solving_thinking (0-25)
communication_clarity (0-25)

SCORING GUIDELINES:

0–5   → Completely wrong / irrelevant
6–10  → Weak understanding, major gaps
11–15 → Basic understanding, lacks depth
16–20 → Good, minor gaps
21–25 → Excellent, strong depth and clarity

CRITICAL RULES:

- Be strict and realistic
- Penalize vague, generic, or memorized answers
- Reward real-world thinking and clarity
- Adjust expectations based on experience level:
  - junior → fundamentals matter more
  - mid → practical usage required
  - senior → depth, tradeoffs, and system thinking required

FOR EACH QUESTION RETURN:

- dimension_scores (each out of 25)
- total score (sum of dimensions → out of 100)
- short summary (2–3 lines explaining WHY score was given)

SUMMARY GENERATION RULES (MANDATORY):

You MUST generate a detailed structured summary.

1. overall_assessment:
   - 3–5 sentences
   - Evaluate overall performance

2. strengths:
   - Minimum 3 points

3. weaknesses:
   - Minimum 3 points
   - Be critical

4. improvement_suggestions:
   - Minimum 3 actionable points

5. final_verdict:
   - Must align with score:
     <50 → Weak candidate
     50–70 → Average candidate
     >70 → Strong candidate

Return JSON:

{{
 "question_results":[
  {{
   "question":"string",
   "score":number,
   "dimension_scores":{{
      "knowledge_accuracy":number,
      "practical_application":number,
      "problem_solving_thinking":number,
      "communication_clarity":number
   }},
   "summary":"string"
  }}
 ],
 "section_summary": {{
    "overall_assessment": "string",
    "strengths": ["point1","point2","point3"],
    "weaknesses": ["point1","point2","point3"],
    "improvement_suggestions": ["point1","point2","point3"],
    "final_verdict": "string"
 }}
}}

Questions and Answers:
{json.dumps(qa, indent=2)}
"""

    result = call_llm(prompt)

    question_results = result["question_results"]

    for q in question_results:
        dims = q["dimension_scores"]
        q["score"] = sum(dims.values())

    scores = [q["score"] for q in question_results]
    final_score = int(sum(scores) / len(scores))

    return {
        "score": final_score,
        "details": question_results,
        "summary": result["section_summary"]
    }


# ----------------------------------------------------
# INTERVIEW TIME VALIDATION
# ----------------------------------------------------

def validate_interview_time(db_interview):

    if not db_interview.date or not db_interview.time:
        raise ValueError("Interview schedule invalid")

    now = datetime.now(timezone.utc)

    interview_start = datetime.combine(
        db_interview.date,
        db_interview.time
    ).replace(tzinfo=timezone.utc)

    interview_end = interview_start + timedelta(hours=24)

    if now < interview_start:
        raise ValueError("Interview not started")

    if now > interview_end:
        raise ValueError("Interview expired")

    return True





# import os
# import json
# import time
# import requests
# from typing import Dict
# from fastapi import HTTPException

# from datetime import datetime, timedelta, date, timezone

# api_key = os.getenv("GROQ_API_KEY")
# api_url = "https://api.groq.com/openai/v1/chat/completions"


# def generate_questions(job_title: str) -> Dict:
#     prompt = f"""
# You are an interview assistant.

# Generate exactly three technical interview questions for the job title below and append from question 2.
# STRICT : TOTALLY RETURN 4 QUESTIONS IN RESPONSE, MUST USE DEFAULT QUESTION GIVEN IN JSON OBJECT FOR QUESTION 1

# IMPORTANT: Any response that includes objects inside "questions" is INVALID.

# STRICT RULES:
# - Return ONLY valid JSON
# - No markdown
# - No explanation
# - No extra text
# - questions MUST be an array of STRINGS
# - DO NOT return objects
# - DO NOT include difficulty
# - DO NOT use keys like "question" or "difficulty"

# If you violate the format, the response is invalid.

# Return format (EXACT):
# {{
#   "job_title": "{job_title}",
#   "questions": [
#     "Question 1",  # USE "Give a brief introduction about yourself?" as Question 1 always
#     "Question 2",
#     "Question 3",
#     "Question 4"
#   ]
# }}

# Job Title:
# {job_title}
# """

#     return call_llm(prompt)


# def evaluate_answers(job_title: str, qa: list[Dict]) -> Dict:
#     prompt = f"""
# You are an interview evaluator.

# IMPORTANT: Give summary little larger like more than 20 words for every summary.

# STRICT RULES:
# - Return ONLY valid JSON
# - No markdown
# - No explanation
# - No extra text

# Scoring:
# - Score between 0 and 100
# - Partial credit allowed

# Return format (EXACT):
# {{
#   "score": number,
#   "ai_summary": {{
#     "overall_summary": "string",
#     "question_wise": [
#       {{
#         "question": "string",
#         "summary": "string"
#       }}
#     ]
#   }}
# }}

# Job Title:
# {job_title}

# Questions and Answers:
# {json.dumps(qa, indent=2)}
# """
#     return call_llm(prompt)



# def call_llm(prompt: str) -> Dict:
#     payload = {
#         "model": "llama-3.1-8b-instant",
#         "messages": [
#             {
#               "role": "system",
#               "content": "You are a strict JSON-only API. You MUST follow the user's JSON schema exactly. Do not infer or extend schemas."
#               "Take your time, read thoroughly and give response."
#             },

#             {"role": "user", "content": prompt},
#         ],
#         "temperature": 0.3,
#         "max_tokens": 800,
#     }

#     headers = {
#         "Authorization": f"Bearer {api_key}",
#         "Content-Type": "application/json",
#     }

#     for attempt in range(3):
#         response = requests.post(api_url, headers=headers, json=payload, timeout=30)
#         if response.status_code != 429:
#             break
#         time.sleep(2 ** attempt)

#     if response.status_code != 200:
#         raise HTTPException(
#             status_code=500,
#             detail=f"LLM error: {response.text}",
#         )

#     content = response.json()["choices"][0]["message"]["content"]

#     try:
#         return json.loads(content)
#     except json.JSONDecodeError:
#         raise HTTPException(
#             status_code=500,
#             detail="LLM returned invalid JSON",
#         )






# def validate_interview_time(db_interview):
#     if not db_interview.date or not db_interview.time:
#         raise ValueError("Interview schedule is invalid")

#     now = datetime.now(timezone.utc)

#     interview_start = datetime.combine(
#         db_interview.date,
#         db_interview.time
#     ).replace(tzinfo=timezone.utc)
#     interview_end = interview_start + timedelta(minutes=30)

#     if now < interview_start or now > interview_end:
#         raise ValueError("Interview expired or not yet started")

#     # If you reach here, access is allowed
#     return True