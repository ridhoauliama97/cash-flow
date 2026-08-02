---
source: freecurrencyapi.com official docs + npm registry
library: freecurrencyapi
package: @everapi/freecurrencyapi-js
topic: latest-endpoint
fetched: 2026-08-02T00:00:00Z
official_docs: https://freecurrencyapi.com/docs/latest
---

# freecurrencyapi — Latest exchange rates endpoint

## Official JS package (npm)

Package name: **`@everapi/freecurrencyapi-js`** (the plain `freecurrencyapi` npm package does NOT exist — the JS wrapper is under the `@everapi` scope).

```bash
bun add @everapi/freecurrencyapi-js
```

Usage (promise-based wrapper):

```js
import Freecurrencyapi from '@everapi/freecurrencyapi-js'

const freecurrencyapi = new Freecurrencyapi('YOUR-API-KEY')

const response = await freecurrencyapi.latest({
  base_currency: 'USD',
  currencies: 'EUR,USD,CAD',
})
console.log(response)
```

Free-account endpoints: `status`, `currencies`, `latest`, `historical`.

## Direct REST call (recommended for Vite/React — tiny payload)

Base URL: `https://api.freecurrencyapi.com/v1/latest`

```ts
const API_KEY = import.meta.env.VITE_FREECURRENCYAPI_KEY

async function fetchRates() {
  const params = new URLSearchParams({
    apikey: API_KEY,
    base_currency: 'USD',            // optional, defaults to USD
    currencies: 'EUR,USD,CAD,GBP',   // optional, defaults to all (~150)
  })

  const res = await fetch(`https://api.freecurrencyapi.com/v1/latest?${params}`)
  if (!res.ok) {
    // 401 = bad key, 429 = rate limit exceeded
    throw new Error(`freecurrencyapi error: ${res.status}`)
  }
  return res.json()
}
```

## Response shape

JSON with a `data` key (and `meta` with `last_updated_at` in newer responses):

```json
{
  "data": {
    "AED": 3.67306,
    "AFN": 91.80254,
    "EUR": 0.9234,
    "USD": 1.0,
    "GBP": 0.7871
  }
}
```

- Keys are ISO 4217 currency codes; values are rates **relative to `base_currency`** (USD by default, so `USD: 1.0`).
- To convert: `amount_in_currency = usd_amount * rate[currency]`.

## Gotchas

- Request URL: `GET https://api.freecurrencyapi.com/v1/latest` with `apikey` query param (mandatory).
- **Rate limits**: exceeding monthly or per-minute quota returns HTTP **429** — wait until the minute/month resets. Headers report usage:
  - `X-RateLimit-Limit-Quota-Minute` / `X-RateLimit-Limit-Quota-Month`
  - `X-RateLimit-Remaining-Quota-Minute` / `X-RateLimit-Remaining-Quota-Month`
- Data updated with end-of-day data.
- Never expose the API key in client code beyond `VITE_` env vars if you can proxy it; the free key is meant for frontend use but quota is per-key.
