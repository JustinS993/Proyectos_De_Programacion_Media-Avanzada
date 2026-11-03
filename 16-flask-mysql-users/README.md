# Flask + MySQL Users CRUD

This project is a simple Flask web app for managing users with a basic CRUD flow connected to MySQL. It is designed for a class project and keeps the structure small and easy to follow.

## Features

- Add a new user through a form
- View all users in a list
- Update an existing user
- Delete a user
- MySQL database connection using PyMySQL
- Flask route handling with clean HTML templates

## Project structure

- `app.py` — Flask app and database logic
- `templates/` — HTML pages for the form and user list
- `static/` — CSS styling
- `requirements.txt` — Python dependencies
- `.env.example` — example environment variables

## Requirements

- Python 3.10+
- MySQL Server running locally or in a container

## Setup

1. Open a terminal in this folder.
2. Create and activate a virtual environment:

```bash
python -m venv .venv
```

Windows:

```powershell
.venv\Scripts\Activate.ps1
```

Linux/macOS:

```bash
source .venv/bin/activate
```

3. Install dependencies:

```bash
pip install -r requirements.txt
```

4. Copy the environment example and update the MySQL settings if needed:

```bash
copy .env.example .env
```

Or on Linux/macOS:

```bash
cp .env.example .env
```

5. Make sure MySQL is running and reachable on the configured host/port.

## Run the app

```bash
python app.py
```

Then open:

```text
http://127.0.0.1:5000/users
```

## MySQL setup

The app uses this default database configuration:

- Host: `127.0.0.1`
- Port: `3306`
- User: `root`
- Password: empty by default
- Database: `flask_users_db`

If your MySQL instance uses a different user or password, update the values in `.env`.

## Database behavior

On startup, the app tries to create the database and `users` table automatically. If MySQL is unavailable, the app will still start the Flask development server and display a warning banner instead of crashing.

## Notes for class use

This is intentionally simple and production-appropriate for a learning project:

- environment-based configuration
- validation for required fields
- safe SQL parameterization
- separation between app logic and templates
- clear route structure for CRUD operations
