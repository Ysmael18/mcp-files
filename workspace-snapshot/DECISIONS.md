# DECISIONS
- Node + TypeScript SDK: official SDK, type safety, zod validation on every tool input.
- Streamable HTTP: works through a tunnel; stdio is local only.
- ngrok static domain: stable URL so client config does not change.
- pm2: simple restart and boot persistence.
- Bearer token, fail closed: the tunnel is public, so no token means no access.
- Stateless transport: a new server per request, no session state to leak.
- Protected files: handoff files cannot be deleted by an agent.
