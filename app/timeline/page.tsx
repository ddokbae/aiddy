"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { getSnapshots } from "@/app/lib/snapshots";
import { formatRelativeTime } from "@/app/lib/formatTime";
import type { Snapshot, SnapshotFile } from "@/app/types/snapshot";

export default function TimelinePage() {
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getSnapshots(20)
      .then((data) => {
        if (!cancelled) setSnapshots(data);
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setError(
          e instanceof Error
            ? e.message
            : "저장소랑 연결이 잠깐 끊어졌어요. 다시 시도해주세요 🦦",
        );
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="min-h-screen bg-[#EDF4F2] px-6 py-12">
      <div className="max-w-2xl mx-auto">
        {/* 헤더: 해달 로고 → 홈 + 페이지 타이틀 */}
        <header className="flex items-center gap-4 mb-10">
          <Link
            href="/"
            aria-label="홈으로"
            className="flex-shrink-0 hover:scale-105 transition-transform"
          >
            <Image
              src="/otter-main.png"
              alt="Aiddy 해달"
              width={56}
              height={56}
              className="rounded-full border border-[#9ED8D4]/40 shadow-sm"
            />
          </Link>
          <h1 className="text-3xl font-semibold text-[#3D5A58]">
            📖 내 학습 일기
          </h1>
        </header>

        {isLoading ? (
          <p className="text-center text-[#7BA5A3]">불러오는 중...</p>
        ) : error ? (
          <p className="text-center text-red-500 bg-red-50 px-4 py-3 rounded-lg">
            {error}
          </p>
        ) : snapshots.length === 0 ? (
          <EmptyState />
        ) : (
          <ul className="space-y-5">
            {snapshots.map((s) => (
              <SnapshotCard key={s.id} snapshot={s} />
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}

function EmptyState() {
  return (
    <div className="text-center py-16">
      <div className="text-5xl mb-4">🦦</div>
      <p className="text-[#3D5A58]/80 mb-6 leading-relaxed">
        아직 저장된 순간이 없어요. 첫 폴더를 선택해보세요!
      </p>
      <Link
        href="/"
        className="inline-block px-6 py-3 rounded-xl bg-[#7BA5A3] text-white font-medium hover:bg-[#3D5A58] transition-colors"
      >
        홈으로 가기
      </Link>
    </div>
  );
}

function SnapshotCard({ snapshot }: { snapshot: Snapshot }) {
  const [expanded, setExpanded] = useState(false);
  const fileCount = snapshot.recent_files?.length ?? 0;

  return (
    <li className="bg-white rounded-2xl p-6 shadow-sm border border-[#9ED8D4]/30">
      <div className="flex items-baseline justify-between gap-3 mb-4">
        <p className="text-lg font-semibold text-[#3D5A58] truncate">
          📂 {snapshot.folder_name}
        </p>
        <span className="text-xs text-[#7BA5A3] flex-shrink-0">
          {formatRelativeTime(new Date(snapshot.created_at))}
        </span>
      </div>

      <div className="bg-[#EDF4F2] rounded-xl p-4 text-sm text-[#3D5A58] leading-relaxed whitespace-pre-wrap">
        {snapshot.narration}
      </div>

      {fileCount > 0 && (
        <div className="mt-4">
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-xs text-[#7BA5A3] hover:text-[#3D5A58]"
          >
            {expanded ? "▼" : "▶"} 최근 수정 파일 {fileCount}개
          </button>
          {expanded && (
            <ul className="mt-2 space-y-1.5">
              {snapshot.recent_files.map((f) => (
                <FileRow key={f.path} file={f} />
              ))}
            </ul>
          )}
        </div>
      )}

      <p className="mt-4 text-xs text-[#7BA5A3]/70">
        총 {snapshot.total_count}개 파일 · 저장 시점 기준
      </p>
    </li>
  );
}

function FileRow({ file }: { file: SnapshotFile }) {
  return (
    <li className="flex items-center justify-between gap-3 text-xs">
      <span className="flex items-center gap-2 min-w-0">
        <span>📄</span>
        <span className="text-[#3D5A58]/80 truncate" title={file.path}>
          {file.name}
        </span>
      </span>
      <span className="text-[#7BA5A3]/80 flex-shrink-0">
        {formatRelativeTime(new Date(file.lastModified))}
      </span>
    </li>
  );
}
