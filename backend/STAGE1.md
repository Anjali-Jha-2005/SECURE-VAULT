# SecureVault backend, Stage 1 (core + authentication)

## Run it
```bash
cd backend
npm install
cp .env.example .env            # then edit: DB password, JWT_ACCESS_SECRET (openssl rand -base64 48)

# PostgreSQL (one option: Docker)
docker run -d --name sv-db -e POSTGRES_USER=securevault -e POSTGRES_PASSWORD=<your-db-password> \
  -e POSTGRES_DB=securevault -p 127.0.0.1:5432:5432 postgres:16-alpine
docker exec sv-db createdb -U securevault securevault_test

npx prisma migrate dev --name init   # generates + applies the first migration (commit the result)
SEED_ADMIN_EMAIL=you@example.com SEED_ADMIN_PASSWORD='<strong password>' npm run db:seed
npm run dev                          # http://localhost:4000/api/v1/health/ready
```

## Test it
```bash
# apply the schema to the TEST database once
DATABASE_URL="$DATABASE_URL_TEST" npx prisma migrate deploy
npm test
npm run lint
```

## Endpoints in this stage
POST /api/v1/auth/{register,login,refresh,logout,change-password}, GET /api/v1/auth/me,
GET /api/v1/health, GET /api/v1/health/ready
