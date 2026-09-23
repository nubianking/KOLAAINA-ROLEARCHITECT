# RoleArchitect | Intelligent Resume Tailoring Engine

RoleArchitect is a sophisticated web application designed to engineer high-impact resumes for Cloud, Security, and DevOps professionals. It leverages the **Google Gemini 2.0 Flash** model to semantically analyze Job Descriptions (JDs) and rewrite a candidate's experience to perfectly align with specific target roles.

## Core Capabilities

1.  **Semantic Resume Tailoring**: Reconstructs bullet points to match the terminology, tone, and technical depth of a specific Job Description.
2.  **Role Intelligence**: Pre-configured prompting strategies for key roles (Cloud Security, DevSecOps, IAM, Solution Architecture).
3.  **Application Q&A Assistant**: Generates plain-text answers for application portal questions (e.g., "Why do you want this job?").
4.  **Cover Letter Architect**: Drafts executive-level cover letters connecting the candidate's history to the company's specific needs.
5.  **Multi-Format Ingestion & Export**:
    *   **Input**: PDF, DOCX, JSON, or Manual Entry.
    *   **Output**: PDF, ATS-Optimized Text, or Direct-to-Google Docs.

## Technical Architecture

*   **Frontend**: React 19, TypeScript, Tailwind CSS.
*   **AI Engine**: Google Gemini Free Tier models (`gemini-3.8-flash`, `gemini-flash-latest`, `gemini-2.5-flash`) via `@google/genai` SDK.
*   **Document Processing**: `pdf.js` for PDF extraction, `mammoth.js` for DOCX extraction.
*   **PDF Generation**: `html2pdf.js`.
*   **Storage**: LocalStorage for session persistence (History & Base Profile).

## Usage Workflow

1.  **Base Profile**: Configure your "Master Resume" in the profile editor. This is the source of truth.
2.  **Target Selection**: Choose your target vector (e.g., "Cloud Security Engineer").
3.  **Context Injection**: Paste the Job Description into the text area.
4.  **Generation**: Click "Generate Tailored Resume". The AI will rewrite your experience.
5.  **Refinement**: Use the visual preview to check the output.
6.  **Export**: Download as PDF or copy to Google Docs for final formatting.

## Setup & Configuration

This project requires a Google Gemini API Key.

1.  Clone the repository.
2.  Install dependencies (if running locally with a build step).
3.  Ensure `process.env.API_KEY` is configured with a valid Gemini API key.
4.  Run the application.

---
*Built with precision for the modern Role Architect.*