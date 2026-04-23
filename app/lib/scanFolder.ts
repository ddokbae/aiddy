import type { FileInfo } from "@/app/types/file";

const SKIP_DIRS = new Set(["node_modules", ".next", ".git", "dist", "build"]);
const MAX_FILES = 500;

export async function scanFolder(
  handle: FileSystemDirectoryHandle,
): Promise<FileInfo[]> {
  const files: FileInfo[] = [];

  async function walk(
    dir: FileSystemDirectoryHandle,
    prefix: string,
  ): Promise<void> {
    for await (const entry of dir.values()) {
      if (files.length >= MAX_FILES) return;

      const path = prefix ? `${prefix}/${entry.name}` : entry.name;

      if (entry.kind === "directory") {
        if (SKIP_DIRS.has(entry.name)) continue;
        files.push({
          name: entry.name,
          kind: "directory",
          lastModified: new Date(0),
          path,
        });
        await walk(entry, path);
      } else {
        const file = await entry.getFile();
        files.push({
          name: entry.name,
          kind: "file",
          lastModified: new Date(file.lastModified),
          path,
        });
      }
    }
  }

  await walk(handle, "");
  return files;
}
