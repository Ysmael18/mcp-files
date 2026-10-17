import { describe, it, expect } from "vitest";
import fs from "node:fs/promises";
import path from "node:path";
import { safePath } from "./index.js";

describe("safePath", () => {
  it("rejects ../ escapes", async () => {
    await expect(safePath("../../etc/passwd")).rejects.toThrow();
  });
  it("rejects absolute paths", async () => {
    await expect(safePath("/etc/passwd")).rejects.toThrow();
  });
  it("allows normal paths", async () => {
    await expect(safePath("test.txt")).resolves.toBeTruthy();
  });
  it("rejects writes through a symlink pointing outside the workspace", async () => {
    const link = path.resolve("./workspace/evil-link");
    await fs.rm(link, { force: true });
    await fs.symlink("/tmp", link);
    try {
      await expect(safePath("evil-link/newfile.txt", { forWrite: true }))
        .rejects.toThrow(/Symlink escapes/);
    } finally {
      await fs.rm(link, { force: true });
    }
  });
});
