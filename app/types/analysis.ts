export interface AnalyzeRequestFile {
  name: string;
  path: string;
  lastModified: string;
}

export interface AnalyzeRequest {
  folderName: string;
  recentFiles: AnalyzeRequestFile[];
}

export interface AnalyzeSuccess {
  narration: string;
}

export interface AnalyzeError {
  error: string;
}

export type AnalyzeResponse = AnalyzeSuccess | AnalyzeError;
