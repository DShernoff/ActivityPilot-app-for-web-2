# Task Scheduler Application

## Overview
This intelligent task scheduling application helps users achieve a high quality of life by aligning their daily activities with their values, goals, and preferences. It's designed as a personal companion to balance productivity with well-being, work with leisure, and obligations with values-driven pursuits. The application allows users to create and manage one-time tasks, fixed events, and recurring routines, then generates optimized schedules. It provides a multi-day timeline visualization and a unique "Watch View" for real-time activity suggestions, embodying a philosophy focused on user well-being over mere productivity metrics.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
**Technology Stack**: React 18 with TypeScript, Vite, Shadcn/ui (built on Radix UI and Tailwind CSS).
**Design System**: Linear/Notion-inspired, utility-first design with dark/light theme support and a custom color palette for task priority visualization.
**State Management**: TanStack Query for server state, local React state for UI interactions.
**Key Components**: Dashboard (with AI insights), TaskForm, EventForm (with all-day event support, location field, and conditional time fields), TaskList/EventList, ScheduleTimeline (date-grouped visualization with "Why this now?" and "Complete" buttons, displays all-day events with large 80x80 calendar icon showing month and date number, location badges with MapPin icon), ScheduleForm, WatchView (minimal watch interface for current activity), and Progress & Reflection view (completed tasks visualization with AI-powered reflection).
**Key Design Decisions**: Component-based, responsive, path aliases for clean imports, conditional form fields (time fields hide when all-day checkbox is checked), supportive UX with warm AI-generated insights, distinctive all-day event rendering with calendar date tiles (no time display), location field support with visual indicators.

### Backend Architecture
**Runtime**: Node.js with Express.js REST API, TypeScript.
**API Design**: RESTful endpoints for CRUD operations on tasks, events, and schedules (`/api/tasks`, `/api/events`, `/api/schedule`, `/api/suggest-now`, `/api/daily-forecast`, `/api/magic-wand`, `/api/why-now`, `/api/reflection`, `/api/tasks/:id/complete`, `/api/tasks/:id/uncomplete`, `/api/tasks/completed`, `/api/clear`).
**State Management**: PostgreSQL database using Drizzle ORM for persistent storage.
**Scheduling Algorithm**: TypeScript-based optimization engine featuring:
- Priority-based task scoring (urgency, importance, enjoyment, deadlines, Flow Mode boost).
- Fixed event blocking and recurring pattern expansion (daily, weekly, monthly, annually) with DST-aware time preservation.
- All-day event handling (visual notes only - included in schedule display but do NOT block scheduling time slots).
- Location field preservation through scheduling pipeline.
- Available slot detection and optimal task placement.
- Exclusion of "waiting_on_others" and completed tasks from scheduling.
- Recurring instances generation (limited to 10 per item within schedule window).
- Timezone-aware recurring task expansion: preserves local times (e.g., "6 PM daily") across daylight saving transitions.

**AI-Powered Features**:
- Daily Forecast: Gemini-generated insights about the user's day, balancing work and values-driven activities.
- Magic Wand: Personalized activity suggestions based on hobbies and work-life balance.
- Why This Now?: Context-aware rationales explaining scheduling decisions (primary feature from prototype).
- Progress Reflection: AI-powered insights celebrating accomplishments and highlighting patterns in work-life balance and enjoyment levels.

### Data Models
**Task Schema**: `id`, `name`, `duration_minutes`, `category`, `urgency`, `importance`, `enjoyment`, `earliest_start?`, `latest_finish?`, `repeat?`, `activity_type?`, `flow_mode?`, `completed`, `completed_at?`.
**Event Schema**: `id`, `name`, `start`, `end`, `category`, `description?`, `location?`, `all_day`, `repeat?`.
**ScheduledEvent Schema**: `task_id?`, `event_id?`, `task_name`, `start`, `end`, `duration_minutes`, `is_event?`, `all_day?`, `location?`.

### Data Storage Solutions
**Current Implementation**: PostgreSQL database (Neon-backed) using Drizzle ORM.
**Schema Definition**: Drizzle ORM schema with Zod validation for `tasks`, `events`, `settings`, and `scheduled_items` tables.
**Storage Operations**: All CRUD operations use async/await with Drizzle ORM.

### Authentication and Authorization
Authentication infrastructure is scaffolded (user schema exists) but not actively enforced, allowing focus on core scheduling functionality.

## External Dependencies

**UI Component Libraries**:
- Radix UI
- Tailwind CSS
- Shadcn/ui
- Lucide React

**State and Data Management**:
- TanStack Query v5
- React Hook Form
- Zod
- Drizzle ORM

**Development Tools**:
- Vite
- TypeScript
- ESBuild

**Backend Services**:
- Express.js
- Neon Serverless (PostgreSQL)
- Google Gemini AI (gemini-2.5-flash for AI-powered features)

**Date/Time Handling**:
- date-fns

**Routing**:
- Wouter