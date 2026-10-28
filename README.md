# Guest attendance

A small Next.js attendance app with a static roster and durable check-ins. On Vercel, it stores one private Blob record per guest; locally, it falls back to a JSON attendance file for simple development.

## Configure

1. Replace the synthetic entries in `data/guests.json` with objects shaped as `{ "id": "unique-id", "name": "Guest name", "batch": "Batch name" }`.
2. Copy `.env.example` to `.env.local`.
3. Generate a salt and a hash for the shared staff code:

   ```sh
   node -e 'const c=require("crypto"); const salt=c.randomBytes(16).toString("base64url"); const code="replace-with-your-code"; console.log(`STAFF_ACCESS_CODE_HASH=${salt}:${c.scryptSync(code,salt,64).toString("base64")}`); console.log(`STAFF_SESSION_SECRET=${c.randomBytes(32).toString("base64url")}`)'
   ```

4. Paste the output into `.env.local`, then run `npm install` and `npm run dev`.

## Deploy to Vercel

1. Create a **private** Vercel Blob store and connect it to this project. Vercel adds `BLOB_READ_WRITE_TOKEN` automatically.
2. Add `STAFF_ACCESS_CODE_HASH` and `STAFF_SESSION_SECRET` as encrypted environment variables for Production and Preview.
3. Deploy the repository with Vercel. Each guest check-in is written as a separate private Blob object, so multiple Vercel instances can safely accept arrivals.

Do not use a Vercel deployment without the Blob token: the filesystem fallback is only for local development and is not durable in serverless functions.

## Data

- `data/guests.json` is the editable static roster.
- Production check-ins live in private Vercel Blob storage, one immutable record per guest.
- `attendance.json` is created inside `ATTENDANCE_DATA_DIR` (or `data/` locally) only when no Blob token is set; it is intentionally ignored by Git.
- Names must be unique within a batch, since guests verify themselves by name and batch only.
