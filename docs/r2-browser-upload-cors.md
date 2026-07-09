# Cloudflare R2 Browser Upload CORS

Recording upload intents return a presigned R2 `PUT` URL when
`AUDIO_STORAGE_DRIVER=r2`. Browser clients still need a bucket-level CORS policy
on the R2 bucket, otherwise the browser blocks the preflight request before the
presigned URL can be used.

## Dashboard Policy

Cloudflare Dashboard -> R2 -> `talkto-personaai-audio` -> Settings -> CORS
Policy -> Add CORS policy -> JSON:

```json
[
  {
    "AllowedOrigins": [
      "http://localhost:3000",
      "http://localhost:5173",
      "http://localhost:8080",
      "https://YOUR_APP_DOMAIN"
    ],
    "AllowedMethods": ["PUT", "GET", "HEAD"],
    "AllowedHeaders": ["Content-Type"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600
  }
]
```

Replace `https://YOUR_APP_DOMAIN` with the real production app origin. Origins
must match the browser `Origin` exactly, including the port. If Flutter Web uses
a different local port, either run it with a fixed port or add that exact origin.

`OPTIONS` is the browser preflight. R2 answers it from the CORS rule when the
actual method (`PUT` for uploads) and request headers are allowed.

## Wrangler Policy

Wrangler uses a different JSON shape:

```json
{
  "rules": [
    {
      "allowed": {
        "origins": [
          "http://localhost:3000",
          "http://localhost:5173",
          "http://localhost:8080",
          "https://YOUR_APP_DOMAIN"
        ],
        "methods": ["PUT", "GET", "HEAD"],
        "headers": ["Content-Type"]
      },
      "exposeHeaders": ["ETag"],
      "maxAgeSeconds": 3600
    }
  ]
}
```

Apply and verify:

```bash
CLOUDFLARE_API_TOKEN=... npx wrangler r2 bucket cors set talkto-personaai-audio --file cors.json
CLOUDFLARE_API_TOKEN=... npx wrangler r2 bucket cors list talkto-personaai-audio
```

## Client Requirements

The backend signs upload URLs with the `ContentType` from the upload-intent
request. The Flutter `PUT` request must include the same `Content-Type` value:

```dart
await http.put(
  Uri.parse(uploadUrl),
  headers: {'Content-Type': mimeTypeFromUploadIntent},
  body: bytes,
);
```

If CORS is configured correctly but the content type differs, R2 can return a
signature error instead of a CORS error.
