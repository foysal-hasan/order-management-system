# Order Management System (NestJS + Prisma)

This project is a backend API for an order management system, built with NestJS, Prisma, and PostgreSQL.

This guide is written for beginners so you can install, run, migrate, seed, and test the project from scratch.

## Tech Stack

- Node.js + Yarn
- NestJS
- Prisma ORM
- PostgreSQL

## Prerequisites

Make sure these are installed first:

- Node.js 20+ (recommended)
- Yarn 1.x
- PostgreSQL (local or remote)

## 1) Install Dependencies

```bash
yarn install
```

## 2) Environment Setup

Copy the example environment file:

```bash
cp .env.example .env
```

If you are on Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

Update all environment variables in `.env`.

Recommended starter values for local development:

```env
APP_NAME=Order Management System
APP_KEY=replace-with-random-key
PORT=4000
APP_URL=http://localhost:4000
NODE_ENV=development
CLIENT_APP_URL=http://localhost:3001

FILESYSTEM_DRIVER=local
CROSS_ORIGINS=http://localhost:3000,http://localhost:3001

JWT_ACCESS_TOKEN_SECRET=replace-with-access-secret
JWT_REFRESH_TOKEN_SECRET=replace-with-refresh-secret
JWT_ACCESS_TOKEN_EXPIRY=1h
JWT_REFRESH_TOKEN_EXPIRY=7d

DATABASE_URL=postgresql://postgres:postgres@localhost:5432/order_management_system?schema=public

REDIS_HOST=127.0.0.1
REDIS_PORT=6379
REDIS_PASSWORD=

MAIL_HOST=smtp.gmail.com
MAIL_USERNAME=
MAIL_PASSWORD=
MAIL_FROM_ADDRESS=
MAIL_FROM_NAME=

AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_DEFAULT_REGION=
AWS_BUCKET=
AWS_URL=
AWS_ENDPOINT=

SYSTEM_EMAIL=admin@email.com
SYSTEM_PASSWORD=Admin@123!
```

Environment variable checklist (from `.env.example`):

- `APP_NAME`
- `APP_KEY`
- `PORT`
- `APP_URL`
- `NODE_ENV`
- `CLIENT_APP_URL`
- `FILESYSTEM_DRIVER`
- `CROSS_ORIGINS`
- `JWT_ACCESS_TOKEN_SECRET`
- `JWT_REFRESH_TOKEN_SECRET`
- `JWT_ACCESS_TOKEN_EXPIRY`
- `JWT_REFRESH_TOKEN_EXPIRY`
- `DATABASE_URL`
- `REDIS_HOST`
- `REDIS_PORT`
- `REDIS_PASSWORD`
- `MAIL_HOST`
- `MAIL_USERNAME`
- `MAIL_PASSWORD`
- `MAIL_FROM_ADDRESS`
- `MAIL_FROM_NAME`
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `AWS_DEFAULT_REGION`
- `AWS_BUCKET`
- `AWS_URL`
- `AWS_ENDPOINT`
- `SYSTEM_EMAIL`
- `SYSTEM_PASSWORD`

## 3) Prisma Generate

Generate Prisma client after pulling new changes or after editing schema:

```bash
yarn prisma generate
```

## 4) Prisma Migrate

Apply migrations to your database:

```bash
yarn prisma migrate dev
```

If your database is out of sync during local development, you can reset and re-apply everything:

```bash
yarn prisma migrate reset
```

## 5) Seed Database

Run seed data using the project command:

```bash
yarn db:seed
```

This command runs `prisma db seed`, which is configured to execute `prisma/seed.ts`.

Current seed users (exact list from `prisma/seed.ts`):

- User 1 (ADMIN)
   - Name: `admin user`
   - Email: from `SYSTEM_EMAIL` (fallback: `admin@email.com`)
   - Password: from `SYSTEM_PASSWORD` (fallback: `Admin@123!`)
- User 2 (CUSTOMER)
   - Name: `customer 001`
   - Email: `c1@email.com`
   - Password: `12345678`
- User 3 (CUSTOMER)
   - Name: `customer 002`
   - Email: `c2@email.com`
   - Password: `12345678`

## 6) Run Project

Development (watch):

```bash
yarn start:dev
```

Development with SWC (faster compile/watch):

```bash
yarn start:dev-swc
```

Production:

```bash
yarn build
yarn start:prod
```

## URL and Docs URL

By default, if `PORT=4000`:

- App URL: `http://localhost:4000`
- Health Check: `http://localhost:4000/health`
- API Base Prefix: `http://localhost:4000/api`
- Swagger Docs: `http://localhost:4000/api/docs`

If you change `PORT` in `.env`, update the URL accordingly.

## Order ID Generation Algorithm (Explanation)

Order IDs are generated inside the application order service and follow this format:

```text
[CAT]-[PROD]-[YYMMDD]-[RANDOM_HEX]
```

Example:

```text
ELE-MEC-260704-4B9F
```

How each part is created:

- `CAT`: first 3 characters of the first product's category name, uppercased.
   - If category name has fewer than 3 characters, it is padded with `X`.
- `PROD`: first 3 characters of the first product name, uppercased.
   - If product name has fewer than 3 characters, it is padded with `X`.
- `YYMMDD`: current date at generation time.
- `RANDOM_HEX`: 4-character uppercase hex from cryptographic random bytes.

Uniqueness strategy:

- The system checks whether generated `order_id` already exists in the database.
- If it exists, it generates a new random hex and retries in a loop.
- It only returns when a unique `order_id` is found.

Why this is reliable:

- Date segmentation reduces same-key pressure by day.
- Prefixes improve readability for support and ops teams.
- Random hex adds 65,536 combinations per date and prefix pair.
- DB existence check prevents collisions from being saved.

## How To Start Testing Quickly

If you are new to the project, use this order:

1. Install dependencies
2. Configure `.env`
3. Run Prisma generate
4. Run Prisma migrate
5. Run seed with `yarn db:seed`
6. Start app in dev mode
7. Open Swagger docs and test endpoints

## Note About Test Seed

At the moment, this repository has one main seed file: `prisma/seed.ts`.

There is no separate dedicated test seed file yet (for example `seed.test.ts`).

So for local testing and manual API testing, start from the existing seed command:

```bash
yarn db:seed
```

If you need a separate test-only dataset later, you can add a second seed flow for your test environment.

## Useful Commands

```bash
# Install
yarn install

# Prisma
yarn prisma generate
yarn prisma migrate dev
yarn db:seed

# Run
yarn start:dev
yarn start:dev-swc
yarn build
yarn start:prod

# Tests
yarn test
yarn test:e2e
```

## Common Issues

1. Prisma cannot connect to DB
   - Check `DATABASE_URL` and make sure PostgreSQL is running.

2. Prisma client out of date
   - Run `yarn prisma generate` again.

3. Tables not found
   - Run `yarn prisma migrate dev` and then `yarn db:seed`.

## Project Docs

- NestJS docs: https://docs.nestjs.com
- Prisma docs: https://www.prisma.io/docs