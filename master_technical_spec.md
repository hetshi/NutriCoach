# NutriCoach: Master Technical Specification

This document provides a complete inventory of every technology used in the NutriCoach ecosystem (Web & Desktop).

---

## 🎨 1. Frontend Ecosystem (The "Look & Feel")

The web interface is designed to be premium, responsive, and high-performance.

*   **Framework**: **Next.js 16 (App Router)** — The backbone of the web app, handling routing, SSR, and static generation.
*   **Core Library**: **React 19** — Used for building the component-based user interface.
*   **Styling Engine**: **Tailwind CSS 4** — Utilized for rapid UI development and layout management.
*   **Custom UI Styling**: **Vanilla CSS (Glassmorphism)** — Used specifically for the frosted-glass effects and custom gradients.
*   **Animation Engine**: **Framer Motion 12** — Powers the smooth transitions, modal entries, and interactive hovers.
*   **Iconography**: **Lucide React** — Provides the consistent, modern SVG icon set used throughout the dashboard.

---

## 🧠 2. AI & Machine Learning (The "Brain")

We use a high-speed AI stack to ensure instantaneous health analysis and scan results.

*   **Inference Provider**: **Groq Cloud API** — A specialized AI cloud that uses **LPU (Language Processing Unit)** technology for near-instant responses.
*   **Large Language Models (LLMs)**:
    *   **Llama 3.3 70B Versatile**: Used for complex nutrition planning and high-level health reasoning.
    *   **Llama 3.2 90B Vision Preview**: A specialized multimodal model used for reading and analyzing medical reports and grocery bills.
*   **PDF Intelligence**: **`pdf-parse` (Node.js)** — Extracts text from complex multi-page medical PDF documents before passing them to the AI.

---

## 🖥️ 3. Backend & API Layer (The "Engine")

Next.js handles the backend logic without requiring a separate dedicated server (Serverless architecture).

*   **Runtime**: **Node.js 20+ (V8 Engine)**.
*   **API Architecture**: **Next.js API Routes** — Server-side functions that securely connect the web app to the Groq AI without exposing your API keys to the browser.
*   **Utility Library**: **Groq SDK** — The official Node.js library for managing AI chat completions and vision analysis.

---

## 🗄️ 4. Data & Storage (The "Memory")

The project uses a split storage strategy to balance performance and user privacy.

*   **Web Persistence**: **Browser `localStorage`** — Stores your diet goals, user profile, and session history directly on your computer (Privacy-First).
*   **Legacy Desktop Storage**: **SQLite3** — A lightweight, file-based database for the Python version (`nutricoach.db`).

---

## 🐍 5. Legacy Desktop Engine (Original App)

The original NutriCoach software was built to run locally on Windows/OSX.

*   **Language**: **Python 3.10+**.
*   **GUI Framework**: **PyQt6** — Used for creating the native desktop windows and interactive widgets.
*   **Voice Integration**:
    *   **`SpeechRecognition` (Google Web API)**: Converts your spoken voice to text.
    *   **`pyttsx3`**: A text-to-speech engine that allows the AI to "speak" back to you.
*   **Environment Management**: **`python-dotenv`** — Handles configuration and secret keys.

---

## 🌐 6. DevOps & Infrastructure

*   **Hosting Platform**: **Render** — Used for hosting both the web frontend and the server-side API routes.
*   **Version Control**: **Git & GitHub** — Manages the codebase and triggers automatic deployments.
*   **Build Optimization**: **Next.js Turbopack** — Ensures the fastest possible local development and production build times.
*   **Secret Management**: Environment variables (Render Dashboard & `.env.local`) for securing API keys.
