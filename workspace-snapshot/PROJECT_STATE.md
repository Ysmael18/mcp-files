# Project State

## Goal
MCP file-server connector for CS3A/CS3B elective (midterm project).
Sandboxed file operations + git-lite tools, exposed via HTTPS tunnel,
tested with a real MCP client across multiple sessions.

## Status
- Server built, 8 tools working (list_files, read_file, write_file,
  str_replace, delete_file, git_status, git_commit, search_files)
- Sandbox: path-escape and symlink protection, protected handoff files,
  1MB write limit, .git/ writes blocked
- Deployed via ngrok static domain + pm2
- Token auth active, fails closed
- Handoff files created and committed (M4)
- Session 1 completed (M5): Connected MCP client, created command-line todo application in `todo/` with add, list, and done commands stored in JSON, documented in `CHECKPOINTS/session-1.md`.

## Next steps
- Write the short report (stack, tool design, security tradeoffs)
- Write README for the repo

