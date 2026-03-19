Samadhan AI — Tech Stack & System Architecture
Core Architecture

Frontend + Backend Framework: Next.js

Backend Runtime: Node.js

AI Agent Service: Python (separate microservice)

Architecture Style:

Fullstack monorepo using Next.js (API routes)

Microservice-based AI agent (Python)

Real-time + telephony integrations

Frontend

Framework: Next.js (App Router)

UI Library: React 19

Styling: Tailwind CSS

Icons: Lucide React

Validation: Zod

Features:

Dynamic dashboards

Complaint tracking UI

Admin panel & role-based UI

Backend

Runtime: Node.js

Framework: Next.js API routes

Database ORM: Mongoose

Authentication: JWT

Password Hashing: bcryptjs

Features:

Role-based access control (Admin / Department / User)

Rate limiting & login protection

Secure API handling

Database

Database: MongoDB

Schema-based models using Mongoose

AI Layer

LLM Integration: Gemini API

Agent Service: Python-based intelligent agent

Responsibilities:

Complaint understanding

Language processing

Decision routing

Automation triggers

Communication & Calling Stack
Telephony

Provider: Twilio

SIP trunk + programmable voice

Real-Time Audio / Streaming

Platform: LiveKit

Used for:

AI voice interaction

Low-latency communication

Email Service

Provider: Brevo

Used for:

Notifications

OTP / alerts

System communication

Storage & Media

Cloud Storage: Cloudinary

File uploads & media handling

Caching & Rate Limiting

Service: Upstash Redis

Used for:

Rate limiting

Request throttling

API protection

Security Features

JWT-based authentication (Access + Refresh tokens)

Rate limiting (global + login-specific)

Account lockout mechanism

CORS protection

Environment-based configs

Dev & Testing Tools

Testing: Vitest + Testing Library

Type Safety: TypeScript

Linting: ESLint

Build Tooling: TSX scripts

DevOps & Environment

Environment-based config (.env)

Separate dev/prod modes

Seed scripts for:

Admin

Departments

Roles

System Capabilities

AI-powered grievance handling system

Multi-language voice interaction (via AI + telephony)

Automated complaint routing

Real-time communication with users

Admin + department-level workflow management