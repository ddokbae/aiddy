"use client";

import { useState } from "react";
import Image from "next/image";
import FloatingOtter from "./components/FloatingOtter";
import RecentFilesCard from "./components/RecentFilesCard";
import { scanFolder } from "./lib/scanFolder";
import { getRecentFiles } from "./lib/sortFiles";
import { useAnalysis } from "./hooks/useAnalysis";
import type { FileInfo } from "./types/file";

export default function Home() {
  const [folderName, setFolderName] = useState<string | null>(null);
  const [recentFiles, setRecentFiles] = useState<FileInfo[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSelectFolder() {
    setError(null);

    // File System Access API 지원 체크
    if (!("showDirectoryPicker" in window)) {
      setError("이 브라우저는 폴더 접근을 지원하지 않아요. Chrome 또는 Edge에서 열어주세요.");
      return;
    }

    let handle: FileSystemDirectoryHandle;
    try {
      handle = await window.showDirectoryPicker();
    } catch (e) {
      // 사용자가 취소 눌렀거나 권한 거부
      if ((e as Error).name !== "AbortError") {
        setError("폴더를 여는 중 문제가 생겼어요.");
      }
      return;
    }

    setFolderName(handle.name);
    setRecentFiles([]);
    setTotalCount(0);
    setIsScanning(true);

    try {
      const files = await scanFolder(handle);
      setTotalCount(files.length);
      setRecentFiles(getRecentFiles(files, 5));
    } catch (e) {
      setError(`폴더 스캔 중 문제가 생겼어요: ${(e as Error).message}`);
    } finally {
      setIsScanning(false);
    }
  }

  function handleResetFolder() {
    setFolderName(null);
    setRecentFiles([]);
    setTotalCount(0);
    setIsScanning(false);
  }

  const otterState = folderName ? "folder-selected" : "landing";

  const {
    narration,
    isAnalyzing,
    error: analysisError,
  } = useAnalysis(folderName, recentFiles);

  return (
    <>
      <FloatingOtter
        state={otterState}
        folderName={folderName ?? undefined}
        narration={narration}
        isAnalyzing={isAnalyzing}
      />

      <main className="min-h-screen flex flex-col items-center justify-center px-6 py-16 bg-[#EDF4F2]">
        <div className="max-w-2xl w-full text-center">
          <div className="mb-8 flex justify-center">
            <Image
              src="/otter-hero.png"
              alt="Aiddy 해달 마스코트"
              width={240}
              height={240}
              preload
              className="rounded-full"
            />
          </div>

          <h1 className="text-5xl font-semibold tracking-tight text-[#3D5A58] mb-4">
            Aiddy
          </h1>

          <p className="text-lg text-[#3D5A58]/80 mb-3">
            AI와 함께 배우는 모든 순간을 기록합니다.
          </p>
          <p className="text-base text-[#7BA5A3] mb-12">
            Your AI learning buddy · Never forget what you built today.
          </p>

          {!folderName ? (
            <>
              <button
                onClick={handleSelectFolder}
                className="px-8 py-4 rounded-xl bg-[#7BA5A3] text-white font-medium
                           hover:bg-[#3D5A58] transition-colors duration-300"
              >
                Select your project folder
              </button>
              <p className="mt-6 text-sm text-[#7BA5A3]/70">
                감지할 프로젝트 폴더를 선택해주세요 🐚
              </p>
            </>
          ) : (
            <>
              <RecentFilesCard
                folderName={folderName}
                totalCount={totalCount}
                recentFiles={recentFiles}
                isScanning={isScanning}
              />
              {analysisError && (
                <p className="mt-4 text-xs text-[#7BA5A3]/80">
                  🦦 해설을 못 가져왔어요: {analysisError}
                </p>
              )}
              <button
                onClick={handleResetFolder}
                className="mt-6 text-sm text-[#7BA5A3] hover:text-[#3D5A58] underline"
              >
                다른 폴더 선택
              </button>
            </>
          )}

          {error && (
            <p className="mt-6 text-sm text-red-500 bg-red-50 px-4 py-2 rounded-lg inline-block">
              {error}
            </p>
          )}
        </div>
      </main>

      {/* 스크롤해도 해달이 우측 상단에 떠 있는지 확인용 섹션 */}
      <section className="min-h-screen flex items-center justify-center px-6 py-24 bg-white">
        <div className="max-w-2xl w-full text-center">
          <p className="text-sm uppercase tracking-widest text-[#7BA5A3] mb-4">
            Scroll check
          </p>
          <h2 className="text-3xl font-semibold text-[#3D5A58] mb-4">
            해달은 계속 너를 따라다녀 🦦
          </h2>
          <p className="text-[#3D5A58]/70 leading-relaxed">
            이 섹션까지 스크롤해봐도 우측 상단의 해달은 자리를 지키고 있을 거야.
            언제든 클릭하면 지금 이 순간에 맞는 설명을 꺼내줄게.
          </p>
        </div>
      </section>
    </>
  );
}
