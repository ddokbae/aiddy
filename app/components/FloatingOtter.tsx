"use client";

import { useState } from "react";

interface FloatingOtterProps {
  /** 현재 앱 상태에 따라 말풍선 내용 바뀜 */
  state: "landing" | "folder-selected";
  /** 연결된 폴더 이름 */
  folderName?: string;
}

export default function FloatingOtter({ state, folderName }: FloatingOtterProps) {
  const [isOpen, setIsOpen] = useState(false);

  // 상태별 말풍선 메시지
  const getMessage = () => {
    if (state === "landing") {
      return {
        title: "안녕, 나는 Aiddy야 🦦",
        body: "폴더를 선택하면 네가 AI와 함께 만드는 모든 순간을 내가 옆에서 기록하고 설명해줄게.",
      };
    }
    return {
      title: `📁 ${folderName} 감지 중`,
      body: "이 폴더 안에서 파일이 생기거나 바뀌면 바로 알려줄게. 뭘 만들고 있는지 궁금하면 언제든 나 눌러!",
    };
  };

  const message = getMessage();

  return (
    <>
      {/* 플로팅 아이콘 — 우측 상단 고정 */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed top-6 right-6 z-50 
                   w-14 h-14 rounded-full 
                   bg-white shadow-lg border border-[#9ED8D4]/40
                   flex items-center justify-center
                   text-3xl
                   hover:scale-110 hover:shadow-xl
                   transition-all duration-300
                   animate-float"
        aria-label="Aiddy 해달 — 클릭해서 도움말 보기"
      >
        🦦
      </button>

      {/* 말풍선 — 클릭 시에만 보임 */}
      {isOpen && (
        <div
          className="fixed top-24 right-6 z-40
                     w-80 bg-white rounded-2xl shadow-2xl
                     border border-[#9ED8D4]/40
                     p-5
                     animate-slide-in"
        >
          {/* 말풍선 꼬리 */}
          <div className="absolute -top-2 right-8 w-4 h-4 
                          bg-white border-t border-l border-[#9ED8D4]/40
                          rotate-45" />

          <h3 className="text-[#3D5A58] font-semibold mb-2">
            {message.title}
          </h3>
          <p className="text-sm text-[#3D5A58]/80 leading-relaxed">
            {message.body}
          </p>

          <button
            onClick={() => setIsOpen(false)}
            className="mt-4 text-xs text-[#7BA5A3] hover:text-[#3D5A58]"
          >
            닫기
          </button>
        </div>
      )}
    </>
  );
}