<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Fechô — notes for AI agents

- Code comments and user-facing copy are in **Brazilian Portuguese**. Keep it
  that way, and match the surrounding tone.
- Next 16 specifics: `middleware.ts` is `proxy.ts` (the function is `proxy()`),
  `cookies()` is async, and Tailwind v4 uses `@import "tailwindcss"`.
- Never commit a real `.env` — only the `*.example` files, with placeholders.
- The public group page must not list members or offer search. Access is by the
  member's unique token only. This is a privacy/LGPD decision, not an oversight.
- Proof files are private: streamed by the app with an ownership check, never
  exposed through a public URL.
- Secret-protected routes (`/api/cron/generate-charges`, the Mercado Pago
  webhook) are fail-closed by design. Keep them that way.
