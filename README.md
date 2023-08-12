# workers-almaviva
Workers.dev script to check free visa slots for Almaviva site. 1 person, KRD.

## Quick start
Fill wrangler.toml and fill ENV block with auth data, KV binding and url for notifications.

[Wrangler start](https://developers.cloudflare.com/workers/get-started/guide/)

## Process
Every site visit or cron trigger create request to the target site. The response is a list of disabled dates. Generate a list of all dates and overwrite with disabled. The leftover is send as notification to pushurl.
Auth cookie, last auth date and status are cached in key-value storage.
