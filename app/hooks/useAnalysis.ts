"use client";

import { useEffect, useRef, useState } from "react";
import type { FileInfo } from "@/app/types/file";
import type {
  AnalyzeRequest,
  AnalyzeResponse,
} from "@/app/types/analysis";

interface UseAnalysisResult {
  narration: string | null;
  isAnalyzing: boolean;
  error: string | null;
}

export function useAnalysis(
  folderName: string | null,
  recentFiles: FileInfo[],
): UseAnalysisResult {
  const [narration, setNarration] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // folderName + 첫 파일 경로 조합으로 중복 호출 방지.
  // 같은 폴더를 다시 선택하거나 page 재렌더만으로 재호출되지 않도록.
  const lastKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (!folderName) {
      lastKeyRef.current = null;
      setNarration(null);
      setError(null);
      setIsAnalyzing(false);
      return;
    }

    if (recentFiles.length === 0) {
      // 스캔은 끝났지만 파일이 없는 경우 — 호출하지 않음
      return;
    }

    const key = `${folderName}::${recentFiles.map((f) => f.path).join("|")}`;
    if (lastKeyRef.current === key) return;
    lastKeyRef.current = key;

    const controller = new AbortController();
    setIsAnalyzing(true);
    setError(null);
    setNarration(null);

    const payload: AnalyzeRequest = {
      folderName,
      recentFiles: recentFiles.map((f) => ({
        name: f.name,
        path: f.path,
        lastModified: f.lastModified.toISOString(),
      })),
    };

    fetch("/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
    })
      .then(async (res) => {
        const data = (await res.json()) as AnalyzeResponse;
        if (!res.ok || "error" in data) {
          throw new Error(
            "error" in data ? data.error : `HTTP ${res.status}`,
          );
        }
        setNarration(data.narration);
      })
      .catch((e: unknown) => {
        if (e instanceof DOMException && e.name === "AbortError") return;
        setError(e instanceof Error ? e.message : "해설을 불러오지 못했어요.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsAnalyzing(false);
      });

    return () => controller.abort();
  }, [folderName, recentFiles]);

  return { narration, isAnalyzing, error };
}
