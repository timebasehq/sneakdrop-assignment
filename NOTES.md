# Sneakdrop Setup Instructions

This file contains the complete instructions for running the frontend, backend, database, environment variables, and other project requirements.

## Prerequisites

- **Node.js**: v20 or higher recommended.
- **Package Managers**: `npm` (for the backend) and `pnpm` (for the frontend).
- **Database**: PostgreSQL (local installation, Docker, or a service like Supabase).

## 1. Database Setup

1. Make sure you have a PostgreSQL server running.
2. Create a database for the project (e.g., `sneakdrop`).
3. Obtain your PostgreSQL connection string.

## 2. Backend Setup

The backend uses Node.js, Express, TypeScript, Prisma, and Socket.IO.

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Configure Environment Variables:
   Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
   Update `.env` with your details (ensure `DATABASE_URL` is correct):
   ```env
   PORT=4000
   NODE_ENV=development
   DATABASE_URL="postgresql://user:password@localhost:5432/sneakdrop"
   JWT_SECRET="your_secret_key"
   FRONTEND_URL="http://localhost:3000"
   COOKIE_NAME="sneakdrop_session"
   RESERVATION_DURATION_MINUTES=5
   INITIAL_ADMIN_USERNAME="admin"
   ```
4. Setup Database and Prisma:
   ```bash
   npm run prisma:generate
   npm run prisma:migrate
   npm run prisma:seed    # Optional: If you want to seed initial data
   ```
5. Start the backend development server:
   ```bash
   npm run dev
   ```
   The backend will run on `http://localhost:4000`.

6. Run Tests (Optional):
   ```bash
   npm run test
   ```

## 3. Frontend Setup

The frontend uses Next.js, React, Tailwind CSS, and HeroUI.

1. Open a new terminal and navigate to the frontend directory:
   ```bash
   cd sneakdrop-ps-frontend
   ```
2. Install dependencies using `pnpm`:
   ```bash
   pnpm install
   ```
3. Configure Environment Variables:
   Create a `.env.local` file:
   ```bash
   cp .env.local .env.local # Or create it manually
   ```
   Ensure it contains the API URL pointing to the backend:
   ```env
   NEXT_PUBLIC_API_URL=http://localhost:4000
   ```
4. Start the frontend development server:
   ```bash
   pnpm dev
   ```
   The frontend will run on `http://localhost:3000`.

## 4. Usage

1. Open your browser and go to `http://localhost:3000` and `http://localhost:3000/admin` username: admin passowrd: admin123 .
2. Create an account or use the admin account (credentials configured in backend `.env`).
3. Start exploring the limited-edition sneaker reservations!
