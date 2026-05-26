/**
 * Embedded admin backend.
 *
 * Mounts the Express `app` from `@incloser/admin-backend` as a Next.js
 * catch-all Node.js API route. Requests arrive at `/api/admin-backend/<path>`;
 * we rewrite the URL prefix to `/api/admin/<path>` (which is where the Express
 * routes are mounted) before invoking the Express handler.
 *
 * Why pages-router (not app-router): pages-router API routes give us native
 * Node.js (req, res) — which is exactly what Express expects. App-router
 * Route Handlers use Web Request/Response and would need a non-trivial bridge.
 */
import type { NextApiRequest, NextApiResponse } from "next";
import type { RequestHandler } from "express";
import { app } from "@incloser/admin-backend";

const handler = app as unknown as RequestHandler;

export const config = {
  api: {
    // Express has its own body parser (express.json()); let it consume the
    // raw stream.
    bodyParser: false,
    // Multer needs streaming uploads; disable Next's response size cap.
    responseLimit: false,
  },
};

export default function expressBridge(req: NextApiRequest, res: NextApiResponse) {
  if (typeof req.url === "string") {
    // /api/admin-backend/auth/login  ->  /api/admin/auth/login
    req.url = req.url.replace(/^\/api\/admin-backend(?=\/|$)/, "/api/admin");
  }
  // Express signature is compatible with Node's IncomingMessage/ServerResponse.
  handler(
    req as unknown as Parameters<RequestHandler>[0],
    res as unknown as Parameters<RequestHandler>[1],
    () => undefined
  );
}
