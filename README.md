# bot-gwd-scraper

Node.js Puppeteer service that scrapes daily trivia data from [Thrice by Geeks Who Drink](https://thrice.geekswhodrink.com) and writes it to a MySQL database.

## What it does

Navigates the Thrice game, plays through all 5 rounds automatically, captures each round's category, 3 questions, and answer, then inserts the results into the database. Runs daily via Cloud Scheduler as a Cloud Run job.

## Repo structure

bot-gwd-scraper/
  app.js                    # Main scraper — runs daily in production
  db.js                     # DB connection helper (local TCP or Cloud SQL socket)
  game.js                   # Answer and DailyGame classes
  Dockerfile                # Puppeteer base image with Chrome dependencies
  one-time-scripts/         # Scripts run manually as needed, never in CI
  .env.example              # Template for required env vars
  .env.local                # Local dev credentials (gitignored)
  .env.prod                 # Prod credentials via Cloud SQL proxy (gitignored)

## Environment variables

| Variable | Description |
|----------|-------------|
| `DB_HOST` | DB hostname. Set to `db` in Docker Compose, `127.0.0.1` when running locally with proxy. Omit for Cloud Run (uses socket). |
| `DB_PORT` | DB port. `3307` for local Docker, `3308` for prod proxy. |
| `DB_USER` | MySQL username |
| `DB_PASSWORD` | MySQL password |
| `DB_NAME` | Database name |

Copy `.env.example` to `.env.local` and fill in your local values to get started.

## Local development

Requires Docker and Docker Compose running from the `gwd-project` repo.

**Start the local database:**

```bash
cd ../gwd-project
docker compose up -d db
```

**Run the daily scraper against the local DB:**

```bash
cd ../gwd-project
docker compose up --build scraper
```

**Connect to the local DB:**

```bash
npm run access-dev-db
```

**Run a one-time script against the local DB:**

```bash
npm run one-time:dev -- one-time-scripts/your-script.js
```

## Running against production

Production uses the Cloud SQL proxy to connect from your local machine to the Cloud SQL instance. The proxy must be running before executing any prod scripts.

**Start the Cloud SQL proxy (runs in background):**

```bash
cloud-sql-proxy quizgame-491018:us-west1:quizgame --port=3308 &
```

**Run a one-time script against prod:**

```bash
npm run one-time:prod -- one-time-scripts/your-script.js
```

**Stop the proxy when done:**

```bash
pkill cloud-sql-proxy
```

## npm scripts

| Script | Description |
|--------|-------------|
| `npm run access dev db` | Opens a MySQL shell connected to the local Docker DB |
| `npm run one-time:dev -- <script>` | Runs a one-time script against the local DB |
| `npm run one-time:prod -- <script>` | Runs a one-time script against prod via Cloud SQL proxy |

## CI/CD

On push to `main`, GitHub Actions:

1. Builds the Docker image
2. Pushes it to Google Artifact Registry (`us-west1-docker.pkg.dev/quizgame-491018/gwd/scraper:latest`)
3. Updates the Cloud Run job to use the new image

The Cloud Run job (`scraper`) is triggered daily at 4:01am UTC (9:01pm PDT) by Cloud Scheduler.

## Cloud Run job commands

**Manually trigger the scraper in production:**

```bash
gcloud run jobs execute scraper --region=us-west1 --wait
```

**Check recent execution logs:**

```bash
gcloud logging read "resource.type=cloud_run_job AND resource.labels.job_name=scraper" \
  --limit=50 \
  --format="value(textPayload)" \
  --project=quizgame-491018
```

**Update the job to use a new image (done automatically by CI):**

```bash
gcloud run jobs update scraper \
  --image=us-west1-docker.pkg.dev/quizgame-491018/gwd/scraper:latest \
  --region=us-west1
```

## Database connection logic

`db.js` determines the connection method based on environment:

- **`DB_HOST` is set** → connects via TCP (used in Docker Compose and via proxy locally)
- **`DB_HOST` is not set** → connects via Unix socket at `/cloudsql/quizgame-491018:us-west1:quizgame` (used in Cloud Run)

## Writing one-time scripts

Add new scripts to `one-time-scripts/` with a numeric prefix for ordering (e.g. `03-yourScript.js`). Import `db.js` and `game.js` using relative paths (`../db.js`). Test against local DB first, then run against prod once verified.
