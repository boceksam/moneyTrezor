# Monetra Backend

Zaklad backendu pro:

- `Node.js + Express`
- `Prisma`
- `MySQL`
- `Docker Compose`
- `Nginx` proxy pro frontend a API

## Start

1. Zkopiruj `.env.example` do `.env`
2. Uprav hesla a `JWT_SECRET`
3. Spust:

```bash
docker compose up --build
```

## URL

- Frontend: `http://localhost:8080`
- API health: `http://localhost:8080/api/health`
- API direct: `http://localhost:3000`

## Hlavni endpointy

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `GET/POST/PUT/DELETE /api/transactions`
- `GET/PUT/DELETE /api/budgets`
- `GET/POST/PUT/DELETE /api/goals`
- `GET/POST/PUT/DELETE /api/recurring-plans`
- `GET/POST/DELETE /api/custom-categories`

## Poznamka

Frontend je zatim porad na `localStorage`. Dalsi krok je vymenit lokalni auth a storage za volani techto endpointu.
