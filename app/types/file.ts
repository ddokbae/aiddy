export interface FileInfo {
  name: string;
  kind: "file" | "directory";
  lastModified: Date;
  path: string;
}
