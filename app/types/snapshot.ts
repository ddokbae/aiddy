// snapshots.recent_files 는 jsonb 로 저장되므로 FileInfo 의 Date 필드는
// ISO 문자열로 직렬화된 채로 DB 에 들어감. 별도 직렬화 타입으로 구분.
export interface SnapshotFile {
  name: string;
  kind: "file" | "directory";
  path: string;
  lastModified: string;
}

export interface Snapshot {
  id: string;
  folder_name: string;
  total_count: number;
  recent_files: SnapshotFile[];
  narration: string;
  created_at: string;
}

export type SnapshotInput = Omit<Snapshot, "id" | "created_at">;
