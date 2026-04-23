"use client";

import { useState } from "react";
import Image from "next/image";

interface FloatingOtterProps {
  /** 현재 앱 상태에 따라 말풍선 내용 바뀜 */
  state: "landing" | "folder-selected";
  /** 연결된 폴더 이름 */
  folderName?: string;
  /** Claude가 생성한 동적 해설 (folder-selected 상태일 때만 사용) */
  narration?: string | null;
  /** 해설 생성 중 여부 (folder-selected 상태일 때만 사용) */
  isAnalyzing?: boolean;
}

export default function FloatingOtter({
  state,
  folderName,
  narration,
  isAnalyzing,
}: FloatingOtterProps) {
  const [isOpen, setIsOpen] = useState(false);

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
                     max-w-[420px] w-[90vw] max-h-[80vh]
                     bg-white rounded-2xl shadow-2xl
                     border border-[#9ED8D4]/40
                     flex flex-col
                     animate-slide-in"
        >
          {/* 말풍선 꼬리 */}
          <div className="absolute -top-2 right-8 w-4 h-4
                          bg-white border-t border-l border-[#9ED8D4]/40
                          rotate-45" />

          {/* 본문 — 길면 스크롤 */}
          <div className="scrollbar-aiddy overflow-y-auto max-h-[300px] px-5 pt-5 pb-3">
            {state === "landing" ? (
              <LandingBody />
            ) : (
              <FolderSelectedBody
                folderName={folderName}
                narration={narration}
                isAnalyzing={isAnalyzing}
              />
            )}
          </div>

          {/* Footer — 본문이 스크롤 돼도 닫기 버튼은 항상 보임 */}
          <div className="flex-shrink-0 px-5 py-3 border-t border-[#EDF4F2]">
            <button
              onClick={() => setIsOpen(false)}
              className="text-xs text-[#7BA5A3] hover:text-[#3D5A58]"
            >
              닫기
            </button>
          </div>
        </div>
      )}
    </>
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
        <p className="text-sm text-[#3D5A58]/90 leading-relaxed whitespace-pre-wrap">
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
