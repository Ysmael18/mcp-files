import "dotenv/config";
import express from "express";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";
import fs from "node:fs/promises";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const run = promisify(execFile);

// ---------- THE SANDBOX GUARD ----------
const ROOT = path.resolve("./workspace");
const PROTECTED_FILES = ["PROJECT_STATE.md", "PLAN_LOG.md", "DECISIONS.md", "CHECKPOINTS.md"];
const MAX_FILE_SIZE = 1_000_000; // 1MB

export async function safePath(
  userPath: string,
  opts: { forWrite?: boolean; forDelete?: boolean } = {}
): Promise<string> {
  const full = path.resolve(ROOT, userPath);
  const rel = path.relative(ROOT, full);

  if (rel.startsWith("..") || path.isAbsolute(rel)) {
    throw new Error("Path escapes the workspace");
  }

  if ((opts.forWrite || opts.forDelete) && (rel === ".git" || rel.startsWith(".git" + path.sep))) {
    throw new Error("Cannot write to .git directly — use the git_status/git_commit tools instead");
  }

  if (opts.forDelete && PROTECTED_FILES.includes(rel)) {
    throw new Error(`Cannot delete protected handoff file: ${rel}`);
  }

  let probe = full;
  while (true) {
    try {
      const real = await fs.realpath(probe);
      const realRel = path.relative(await fs.realpath(ROOT), real);
      if (realRel.startsWith("..") || path.isAbsolute(realRel)) {
        throw new Error("Symlink escapes the workspace");
      }
      break;
    } catch (e: any) {
      if (e.code !== "ENOENT") throw e;
      const parent = path.dirname(probe);
      if (parent === probe) break;
      probe = parent;
    }
  }

  return full;
}

// ---------- THE SERVER AND ITS TOOLS ----------
function buildServer() {
  const server = new McpServer({ name: "file-server", version: "1.0.0" });

  server.registerTool(
    "list_files",
    {
      description: "List files and folders inside a directory of the workspace.",
      inputSchema: { path: z.string().default(".") },
    },
    async ({ path: userPath }) => {
      const full = await safePath(userPath);
      const entries = await fs.readdir(full);
      return { content: [{ type: "text", text: entries.join("\n") }] };
    }
  );

  server.registerTool(
    "read_file",
    {
      description: "Read the full text contents of a file in the workspace.",
      inputSchema: { path: z.string() },
    },
    async ({ path: userPath }) => {
      const full = await safePath(userPath);
      const text = await fs.readFile(full, "utf-8");
      return { content: [{ type: "text", text }] };
    }
  );

  server.registerTool(
    "write_file",
    {
      description: "Create a new file or overwrite an existing file with new text. Max 1MB.",
      inputSchema: { path: z.string(), content: z.string() },
    },
    async ({ path: userPath, content }) => {
      if (Buffer.byteLength(content) > MAX_FILE_SIZE) {
        throw new Error("File too large (limit: 1MB)");
      }
      const full = await safePath(userPath, { forWrite: true });
      await fs.mkdir(path.dirname(full), { recursive: true });
      await fs.writeFile(full, content, "utf-8");
      return { content: [{ type: "text", text: `Wrote ${content.length} bytes to ${userPath}` }] };
    }
  );

  server.registerTool(
    "str_replace",
    {
      description: "Replace one exact occurrence of text inside a file.",
      inputSchema: { path: z.string(), old_text: z.string(), new_text: z.string() },
    },
    async ({ path: userPath, old_text, new_text }) => {
      const full = await safePath(userPath, { forWrite: true });
      const text = await fs.readFile(full, "utf-8");
      const count = text.split(old_text).length - 1;
      if (count !== 1) {
        throw new Error(`Expected exactly 1 match, found ${count}`);
      }
      const updated = text.replace(old_text, new_text);
      if (updated.length > MAX_FILE_SIZE) {
        throw new Error("Resulting file too large (limit: 1MB)");
      }
      await fs.writeFile(full, updated, "utf-8");
      return { content: [{ type: "text", text: `Replaced text in ${userPath}` }] };
    }
  );

  server.registerTool(
    "delete_file",
    {
      description: "Delete a file from the workspace. Cannot delete protected handoff files.",
      inputSchema: { path: z.string() },
    },
    async ({ path: userPath }) => {
      const full = await safePath(userPath, { forDelete: true });
      await fs.unlink(full);
      return { content: [{ type: "text", text: `Deleted ${userPath}` }] };
    }
  );

  server.registerTool(
    "git_status",
    { description: "Show the current git status of the workspace.", inputSchema: {} },
    async () => {
      const { stdout } = await run("git", ["status", "--short"], { cwd: ROOT });
      return { content: [{ type: "text", text: stdout || "Clean — no changes" }] };
    }
  );

  server.registerTool(
    "git_commit",
    {
      description: "Stage all changes and commit them with a message.",
      inputSchema: { message: z.string() },
    },
    async ({ message }) => {
      await run("git", ["add", "-A"], { cwd: ROOT });
      const { stdout } = await run("git", ["commit", "-m", message], { cwd: ROOT });
      return { content: [{ type: "text", text: stdout }] };
    }
  );

  server.registerTool(
    "search_files",
    {
      description: "Search for a text string across all files in the workspace.",
      inputSchema: { query: z.string() },
    },
    async ({ query }) => {
      const result = await run("grep", ["-rnI", "--exclude-dir=.git", "-e", query, "--", ROOT]).catch((e: any) => e);
      return { content: [{ type: "text", text: result.stdout || "No matches" }] };
    }
  );

  return server;
}

// ---------- THE WEB SERVER ----------
const app = express();
app.use(express.json());

app.use((req, res, next) => {
  const auth = req.headers.authorization;
  if (!process.env.MCP_TOKEN || auth !== `Bearer ${process.env.MCP_TOKEN}`) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
});

app.post("/mcp", async (req, res) => {
  const server = buildServer();
  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
  res.on("close", () => { transport.close(); server.close(); });
  await server.connect(transport);
  await transport.handleRequest(req, res, req.body);
});

if (!process.env.VITEST) {
  app.listen(3000, () => console.log("MCP server on :3000"));
}
