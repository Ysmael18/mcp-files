# MCP File-Server Connector — Report

## Stack

- **Runtime/SDK:** Node.js with the official TypeScript MCP SDK. Chosen
  over Python/FastMCP for first-class type checking via TypeScript and
  tighter integration with `zod` for input validation.
- **Transport:** Streamable HTTP. Chosen over stdio so the server could
  be exposed publicly and connected to by a real remote client, not just
  tested locally.
- **Validation:** `zod` schemas on every tool's input, so malformed
  requests are rejected before any filesystem code runs.
- **Exposure:** ngrok with a static free-tier domain, so the public URL
  doesn't change between restarts.
- **Process manager:** pm2, running both the server and the ngrok
  tunnel as managed processes with `pm2 startup systemd`, so both
  survive a full reboot with zero manual steps.
- **Version control:** git, initialized inside the sandboxed
  `workspace/` folder itself, so an agent's own file changes are
  tracked independently of the server's source code.
- **Testing:** MCP Inspector for manual tool-by-tool verification during
  development, then `vitest` for an automated suite that proves the
  sandbox actually blocks escape attempts, plus a real MCP client
  (Gemini CLI) for the final end-to-end demo.

## Tool design

Eight tools are exposed: `list_files`, `read_file`, `write_file`,
`str_replace`, `delete_file`, `git_status`, `git_commit`, and
`search_files`.

`str_replace` was included alongside `write_file` specifically so an
agent editing an existing file doesn't have to read the whole file,
reconstruct it in full, and write it back — it can target one exact
piece of text instead. This keeps tool-call outputs small and reduces
the number of tokens/tool-calls needed for routine edits, which
matters directly for the "agent efficiency" grading criterion.

Every tool funnels its path argument through a single `safePath()`
function before touching the filesystem, rather than each tool
re-implementing its own path checks. This means a new tool only needs
one line to inherit the full sandbox guarantee, and there's exactly one
place to audit for correctness.

## Security tradeoffs

**What the sandbox blocks:**
- Any path containing `../` or an absolute path (`/etc/passwd`),
  verified by resolving the path and checking it stays inside the
  workspace root.
- Symlink escapes — a symlink inside the workspace pointing to a
  location outside it is detected via `fs.realpath()` and rejected,
  even though the symlink's *name* would look like a normal in-sandbox
  path.
- Writes or deletes directly inside `.git/`, forcing all git operations
  through the dedicated `git_status`/`git_commit` tools instead.
- Deletion of the three handoff files (`PROJECT_STATE.md`,
  `PLAN_LOG.md`, `DECISIONS.md`), so an agent can't accidentally erase
  its own memory of the project.
- Files over 1MB, to prevent a single tool call from writing something
  enormous into the sandbox.

**What's still a risk, and how it's reduced:**
- The server is reachable from the entire public internet via the
  ngrok URL. This is mitigated with a Bearer-token auth check that
  fails closed — if `MCP_TOKEN` isn't set for any reason, every request
  is rejected rather than silently allowed through.
- The token itself, if leaked, grants full access to the sandbox (not
  the whole machine). The token is stored in `.env`, excluded from git
  via `.gitignore`, and never logged or printed by the server.
- The sandbox limits an agent to `workspace/`, but it does not limit
  CPU, memory, or the *rate* of tool calls — a buggy or malicious agent
  could still spam requests. This wasn't addressed in this version and
  would be the next thing to add (simple rate-limiting middleware).
