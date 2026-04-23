import type { FileInfo } from "@/app/types/file";

export function getRecentFiles(
  files: FileInfo[],
  limit: number = 5,
): FileInfo[] {
  return files
    .filter((f) => f.kind === "file")
    .sort((a, b) => b.lastModified.getTime() - a.lastModified.getTime())
    .slice(0, limit);
}
