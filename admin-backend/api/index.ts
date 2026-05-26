// Vercel serverless entry. The Express app is callable as `(req, res) => void`,
// which matches the @vercel/node handler signature — so we re-export it.
//
// IMPORTANT: import from the COMPILED output (`../dist/app.js`). The buildCommand
// in `vercel.json` runs `npm run build` (tsc) first, so dist/ exists by the time
// Vercel's runtime bundles this file.

// @ts-expect-error - resolved at runtime after `tsc` populates ../dist/
import { app } from "../dist/app.js";

export const config = {
  maxDuration: 30,
};

export default app;
