# Ecommerce--2K23-CSM-61-
## Sprint 2: Catalog Data Foundation — Local Setup

### Prerequisites
- Node.js 18 or newer
- PostgreSQL 14 or newer

### Environment variables
Create a `.env` file inside the `backend/` folder. Keep this file on your machine only.

| Variable | Meaning | Example |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string | `postgres://postgres:mypassword@localhost:5432/techbazar` |
| `JWT_SECRET` | Secret used to sign admin JWT tokens | any long random string |
| `PORT` | Port for the API server | `5000` |

### Database setup (migrations + seed)
```bash
createdb techbazar
psql -d techbazar -f migrations/002_catalog_foundation.sql
psql -d techbazar -f seeds/02_catalog_seed.sql
```

### Run the admin API
```bash
cd backend
npm install express cors jsonwebtoken pg
node server.js
```
The API starts on `http://localhost:5000`. Admin routes live under `/api/v1/admin` and require a Bearer JWT token with `role: admin`.

### Run the automated tests
```bash
node --test backend/tests/admin.test.js
```
Expected result: 6 passing tests covering admin authorization (401/403), negative-stock rejection, and duplicate SKU rejection.

### Secrets hygiene
- No passwords, tokens, or private URLs are committed to the repository.
- The `.env` file stays local and is never pushed.
