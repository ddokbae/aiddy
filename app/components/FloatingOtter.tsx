"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import type { FileInfo } from "@/app/types/file";
import { saveSnapshot } from "@/app/lib/snapshots";

interface FloatingOtterProps {
  /** 현재 앱 상태에 따라 말풍선 내용 바뀜 */
  state: "landing" | "folder-selected";
  /** 연결된 폴더 이름 */
  folderName?: string;
  /** 전체 파일 수 (저장에 사용) */
  totalCount?: number;
  /** 최근 수정 파일 목록 (저장에 사용) */
  recentFiles?: FileInfo[];
  /** Gemini가 생성한 동적 해설 (folder-selected 상태일 때만 사용) */
  narration?: string | null;
  /** 해설 생성 중 여부 (folder-selected 상태일 때만 사용) */
  isAnalyzing?: boolean;
}

type SaveStatus =
  | { kind: "idle" }
  | { kind: "saving" }
  | { kind: "saved" }
  | { kind: "error"; message: string };

export default function FloatingOtter({
  state,
  folderName,
  totalCount,
  recentFiles,
  narration,
  isAnalyzing,
}: FloatingOtterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>({ kind: "idle" });
  // 같은 narration 이미 저장 됐으면 버튼 비활성화 — 중복 저장 방지
  const [savedKey, setSavedKey] = useState<string | null>(null);

  const currentKey =
    folderName && narration ? `${folderName}::${narration}` : null;

  // narration / folder 바뀌면 저장 상태 리셋
  useEffect(() => {
    setSaveStatus({ kind: "idle" });
  }, [currentKey]);

  // "저장됐어요!" 피드백 2초 유지 후 idle 로
  useEffect(() => {
    if (saveStatus.kind !== "saved") return;
    const t = setTimeout(() => setSaveStatus({ kind: "idle" }), 2000);
    return () => clearTimeout(t);
  }, [saveStatus]);

  const isAlreadySaved = currentKey !== null && savedKey === currentKey;
  const canSave =
    state === "folder-selected" &&
    !!folderName &&
    !!narration &&
    !!recentFiles &&
    !isAlreadySaved &&
    saveStatus.kind !== "saving";

  async function handleSave() {
    if (!canSave || !folderName || !narration || !recentFiles) return;
    setSaveStatus({ kind: "saving" });
    try {
      await saveSnapshot({
        folder_name: folderName,
        total_count: totalCount ?? 0,
        narration,
        recent_files: recentFiles.map((f) => ({
          name: f.name,
          kind: f.kind,
          path: f.path,
          lastModified: f.lastModified.toISOString(),
        })),
      });
      setSavedKey(currentKey);
      setSaveStatus({ kind: "saved" });
    } catch (e) {
      const message =
        e instanceof Error
          ? e.message
          : "저장소랑 연결이 잠깐 끊어졌어요. 다시 시도해주세요 🦦";
      setSaveStatus({ kind: "error", message });
    }
  }

  return (
    <>
      {/* 플로팅 아이콘 — 우측 상단 고정 */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed top-6 right-6 z-50
                   w-14 h-14 rounded-full overflow-hidden
                   bg-transparent shadow-lg border border-[#9ED8D4]/40
                   flex items-center justify-center
                   hover:scale-110 hover:shadow-xl
                   transition-all duration-300
                   animate-float"
        aria-label="Aiddy 해달 — 클릭해서 도움말 보기"
      >
        <Image
          src="/otter-main.png"
          alt="Aiddy 해달"
          width={56}
          height={56}
          className="w-full h-full object-cover rounded-full"
        />
      </button>

      {/* 말풍선 — 클릭 시에만 보임 */}
      {isOpen && (
        <div
          className="fixed top-24 right-6 z-40
                     max-w-[480px] w-[90vw]
                     max-h-[70vh] md:max-h-[85vh]
                     bg-white rounded-2xl shadow-2xl
                     border border-[#9ED8D4]/40
                     flex flex-col
                     animate-slide-in"
        >
          {/* 말풍선 꼬리 */}
          <div className="absolute -top-2 right-8 w-4 h-4
                          bg-white border-t border-l border-[#9ED8D4]/40
                          rotate-45" />

          {/* 본문 — 길면 스크롤. min-h-0 으로 flex-col 안에서 정상 축소 */}
          <div className="scrollbar-aiddy overflow-y-auto min-h-0 max-h-[420px] px-6 pt-5 pb-4">
            {state === "landing" ? (
              <LandingBody />
            ) : (
              <FolderSelectedBody
                folderName={folderName}
                narration={narration}
                isAnalyzing={isAnalyzing}
              />
            )}
            {saveStatus.kind === "error" && (
              <p className="mt-3 text-xs text-red-500">
                {saveStatus.message}
              </p>
            )}
          </div>

          {/* Footer — 본문이 스크롤 돼도 버튼은 항상 보임 */}
          <div className="flex-shrink-0 px-5 py-3 border-t border-[#EDF4F2] flex items-center justify-between gap-2">
            <div className="min-w-0 flex-1">
              {state === "folder-selected" && narration && (
                <SaveButton
                  status={saveStatus}
                  isAlreadySaved={isAlreadySaved}
                  canSave={canSave}
                  onClick={handleSave}
                />
              )}
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-xs text-[#7BA5A3] hover:text-[#3D5A58] flex-shrink-0"
            >
              닫기
            </button>
          </div>
        </div>
      )}
    </>
  );
}

function SaveButton({
  status,
  isAlreadySaved,
  canSave,
  onClick,
}: {
  status: SaveStatus;
  isAlreadySaved: boolean;
  canSave: boolean;
  onClick: () => void;
}) {
  if (status.kind === "saved") {
    return (
      <span className="text-sm text-[#7BA5A3]">저장됐어요! ✓</span>
    );
  }
  if (isAlreadySaved) {
    return (
      <span className="text-sm text-[#7BA5A3]/70">저장됨</span>
    );
  }
  if (status.kind === "saving") {
    return (
      <span className="text-sm text-[#7BA5A3] flex items-center gap-2">
        <span className="inline-block w-3 h-3 border-2 border-[#9ED8D4] border-t-transparent rounded-full animate-spin" />
        저장 중...
      </span>
    );
  }
  return (
    <button
      onClick={onClick}
      disabled={!canSave}
      className="text-sm text-[#7BA5A3] hover:text-[#3D5A58] disabled:opacity-40 disabled:cursor-not-allowed"
    >
      💾 이 순간 저장
    </button>
  );
}

function LandingBody() {
  return (
    <>
      <h3 className="text-[#3D5A58] font-semibold mb-2">
        안녕, 나는 Aiddy야 🦦
      </h3>
      <p className="text-sm text-[#3D5A58]/80 leading-relaxed">
        폴더를 선택하면 네가 AI와 함께 만드는 모든 순간을 내가 옆에서 기록하고
        설명해줄게.
      </p>
    </>
  );
}

function FolderSelectedBody({
  folderName,
  narration,
  isAnalyzing,
}: {
  folderName?: string;
  narration?: string | null;
  isAnalyzing?: boolean;
}) {
  return (
    <>
      <h3 className="text-[#3D5A58] font-semibold mb-2">
        📁 {folderName ?? "프로젝트"} 감지 중
      </h3>
      {isAnalyzing ? (
        <p className="text-sm text-[#3D5A58]/80 leading-relaxed flex items-center gap-2">
          <span>🦦 지금 뭐 하는지 보는 중</span>
          <PulseDots />
        </p>
      ) : narration ? (
        <p className="text-[15px] text-[#3D5A58]/90 leading-[1.75] whitespace-pre-wrap">
          {narration}
        </p>
      ) : (
        <p className="text-sm text-[#3D5A58]/80 leading-relaxed">
          이 폴더 안에서 파일이 생기거나 바뀌면 바로 알려줄게. 뭘 만들고 있는지
          궁금하면 언제든 나 눌러!
        </p>
      )}
    </>
  );
}

function PulseDots() {
  return (
    <span className="inline-flex gap-1">
      <span className="w-1.5 h-1.5 rounded-full bg-[#7BA5A3] animate-pulse [animation-delay:0ms]" />
      <span className="w-1.5 h-1.5 rounded-full bg-[#7BA5A3] animate-pulse [animation-delay:150ms]" />
      <span className="w-1.5 h-1.5 rounded-full bg-[#7BA5A3] animate-pulse [animation-delay:300ms]" />
    </span>
  );
}
