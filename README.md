# MCP File-Server Connector

A sandboxed MCP (Model Context Protocol) server that lets an AI agent
read, write, and search files inside one restricted folder, with git
tracking and a handoff protocol so work can continue across separate
agent sessions.

## Setup

```bash
npm install
cp .env.example .env   # fill in MCP_TOKEN
npx tsc
node dist/index.js
```

## Tools

| Tool | Description |
|---|---|
| `list_files` | List files/folders in the workspace |
| `read_file` | Read a file's full contents |
| `write_file` | Create or overwrite a file (max 1MB) |
| `str_replace` | Replace one exact text match in a file |
| `delete_file` | Delete a file (handoff files are protected) |
| `git_status` | Show workspace git status |
| `git_commit` | Stage and commit all changes |
| `search_files` | Search text across all workspace files |

## Security

All paths are resolved against `./workspace` as the sandbox root.
`../` escapes, absolute paths, and symlink escapes are rejected. See
`REPORT.md` for full details.

## Handoff protocol

Every agent session should, in order:
1. Read `workspace/PROJECT_STATE.md` and `workspace/PLAN_LOG.md`
2. Do the work
3. Append to `PLAN_LOG.md`
4. Write a new `workspace/CHECKPOINTS/session-N.md`
5. Update `PROJECT_STATE.md`
6. Commit with `git_commit`

## Deployment

Exposed via an ngrok static domain, kept alive with pm2
(`pm2 startup systemd` so it survives reboots). Requests require a
Bearer token (`MCP_TOKEN` in `.env`); the server fails closed if the
token is unset.

## Testing

```bash
npx vitest run
```

Covers: path-escape rejection, absolute-path rejection, symlink-escape
rejection, and normal access still working.
