# Arbetsdagar

Swedish work-day calendar.

**Live page:** https://kalender.beardedsoftware.se/

## JSON API

Static JSON is pre-rendered at deploy time (see `scripts/generate-api.js`,
run by `.github/workflows/deploy.yml`) for years 1990–2100:

- `GET /work-days/<year>.json` — full year: totals plus a per-month breakdown.
- `GET /work-days/<year>/<month>.json` — a single month (`month` is 1–12).

Example: https://kalender.beardedsoftware.se/work-days/2026.json and
https://kalender.beardedsoftware.se/work-days/2026/5.json

Both return work days, work hours (8h/day), weekend days, public holidays,
and days off. Field reference is documented in the (currently hidden)
API/JSON tab in `arbetsdagar.html`.
