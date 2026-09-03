# Pure Max Factory Management System - Local Setup Guide

This guide provides step-by-step instructions to set up, run, and develop the Pure Max Factory Management System on your local machine using Visual Studio Code (VS Code).

## Prerequisites
Before you begin, ensure you have the following installed on your local machine:
1. **Node.js** (v18.0.0 or higher) - [Download here](https://nodejs.org/)
2. **PostgreSQL** (v14 or higher) - [Download here](https://www.postgresql.org/download/)
3. **Visual Studio Code (VS Code)** - [Download here](https://code.visualstudio.com/)
4. **Git** - [Download here](https://git-scm.com/)

---

## Step 1: Extract or Clone the Source Code
1. Open **VS Code**.
2. Go to `File > Open Folder...` and select the folder containing the downloaded source code.
3. Open the VS Code integrated terminal by pressing `` Ctrl + ` `` (Windows) or `` Cmd + ` `` (Mac), or by going to `Terminal > New Terminal` in the top menu.

---

## Step 2: Install Dependencies
In the VS Code terminal, run the following command to download and install all required Node.js packages:
```bash
npm install
```
*(This may take a few minutes depending on your internet connection. It installs React, Express, Drizzle ORM, Socket.io, and all other system dependencies).*

---

## Step 3: Set Up the PostgreSQL Database
1. Open your PostgreSQL administration tool (e.g., pgAdmin, DBeaver, or psql command line).
2. Create a new, empty database named `puremax_db`.
   ```sql
   CREATE DATABASE puremax_db;
   ```
3. Make sure you remember your PostgreSQL username (usually `postgres`) and password.

---

## Step 4: Configure Environment Variables
1. In the root of your project inside VS Code, create a new file named `.env`.
2. Add the following environment variables to the `.env` file, replacing the database credentials with your local PostgreSQL details:

```env
# Database Connection (Format: postgres://USER:PASSWORD@HOST:PORT/DATABASE_NAME)
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/puremax_db

# Port for the local server
PORT=3000

# Environment Mode
NODE_ENV=development
```

---

## Step 5: Initialize the Database (Migrations)
The system uses Drizzle ORM to manage database tables. Run the database push command to automatically create all the required tables (users, sales, production, attendance, expenses, etc.):
```bash
npx drizzle-kit push
```
*Note: If the project uses a specific migration script in `package.json`, you can alternatively run `npm run db:push` if configured.*

---

## Step 6: Start the Development Server
With the database configured and dependencies installed, you can now start the full-stack system:

```bash
npm run dev
```

If successful, the terminal will show that the server is running.
1. Open your web browser (Google Chrome recommended).
2. Navigate to: `http://localhost:3000`
3. You should see the Pure Max Login screen.

---

## Step 7: Initial System Login
Since the database is empty, the system will allow you to register the first **Developer** or **Manager** account. Follow the on-screen prompts to set up your primary administrative account, which you can then use to create other staff accounts.

---

## Step 8: Build for Production (Optional)
When you are ready to deploy the system to a live server (like VPS, Heroku, Render, etc.), you need to compile the code.

1. Clean and build the project:
   ```bash
   npm run build
   ```
2. Start the production server:
   ```bash
   npm start
   ```

## Troubleshooting
- **Port in Use (`EADDRINUSE`)**: If port 3000 is already taken by another app, you can change the `PORT` variable in your `.env` file to `3001` or another open port.
- **Database Connection Error**: Double-check your `DATABASE_URL` in `.env`. Ensure PostgreSQL is actively running on your machine via Windows Services or Mac Activity Monitor.
- **Missing Packages**: If you see "Module not found" errors, run `npm install` again or clear the cache using `npm cache clean --force`.
