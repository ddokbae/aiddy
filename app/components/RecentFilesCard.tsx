import type { FileInfo } from "@/app/types/file";
import { formatRelativeTime } from "@/app/lib/formatTime";

interface RecentFilesCardProps {
  folderName: string;
  totalCount: number;
  recentFiles: FileInfo[];
  isScanning: boolean;
}

export default function RecentFilesCard({
  folderName,
  totalCount,
  recentFiles,
  isScanning,
}: RecentFilesCardProps) {
  return (
    <div
      className="max-w-xl mx-auto mt-8 p-6
                 bg-white rounded-2xl shadow-sm
                 border border-[#9ED8D4]/40
                 text-left"
    >
      <div className="mb-4">
        {isScanning ? (
          <p className="text-sm text-[#7BA5A3] flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-[#9ED8D4] animate-pulse" />
            🦦 이 폴더에 뭐가 있나 볼게...
          </p>
        ) : (
          <p className="text-sm text-[#7BA5A3]">
            🦦 이 폴더에 뭐가 있나 볼게...
          </p>
        )}
      </div>

      <div className="mb-5 pb-5 border-b border-[#EDF4F2]">
        <p className="text-lg font-semibold text-[#3D5A58]">
          📂 {folderName}
        </p>
        <p className="text-sm text-[#7BA5A3] mt-1">
          총 {totalCount}개 파일
        </p>
      </div>

      <div>
        <p className="text-sm font-medium text-[#3D5A58] mb-3">
          최근에 수정한 파일:
        </p>

        {isScanning && recentFiles.length === 0 ? (
          <p className="text-sm text-[#7BA5A3]/70">스캔하는 중...</p>
        ) : recentFiles.length === 0 ? (
          <p className="text-sm text-[#7BA5A3]/70">
            아직 수정된 파일이 없어요.
          </p>
        ) : (
          <ul className="space-y-2">
            {recentFiles.map((file) => (
              <li
                key={file.path}
                className="flex items-center justify-between gap-3 text-sm"
              >
                <span className="flex items-center gap-2 min-w-0">
                  <span>📄</span>
                  <span className="text-[#3D5A58] truncate" title={file.path}>
                    {file.name}
                  </span>
                </span>
                <span className="text-xs text-[#7BA5A3] flex-shrink-0">
                  {formatRelativeTime(file.lastModified)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
