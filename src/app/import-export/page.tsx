"use client";

import { useState } from "react";
import { Upload, Download, FileSpreadsheet, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ImportExportPage() {
  const [dragOver, setDragOver] = useState(false);

  const handleExportFunctions = async () => {
    // Placeholder for export functionality
    alert("엑셀 익스포트 기능은 SheetJS 라이브러리 설치 후 사용 가능합니다.");
  };

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">엑셀 임포트 / 익스포트</h1>

      {/* Import Section */}
      <div className="rounded-lg border border-border bg-card p-6 space-y-4">
        <h2 className="font-semibold flex items-center gap-2">
          <Upload className="h-5 w-5" />
          임포트
        </h2>

        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            // Handle file drop
            alert("엑셀 임포트 기능은 SheetJS 라이브러리 설치 후 사용 가능합니다.");
          }}
          className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors cursor-pointer ${
            dragOver
              ? "border-primary bg-primary/5"
              : "border-border hover:border-muted-foreground"
          }`}
        >
          <FileSpreadsheet className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            엑셀 파일을 드래그하거나 클릭하여 업로드
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            .xlsx, .xls 파일 지원
          </p>
        </div>

        <Button variant="outline" size="sm">
          <Download className="h-4 w-4 mr-1" />
          양식 다운로드
        </Button>

        {/* Preview area placeholder */}
        <div className="rounded-md border border-border bg-muted/20 p-8 text-center text-sm text-muted-foreground">
          파일을 업로드하면 미리보기가 여기에 표시됩니다.
        </div>
      </div>

      {/* Export Section */}
      <div className="rounded-lg border border-border bg-card p-6 space-y-4">
        <h2 className="font-semibold flex items-center gap-2">
          <Download className="h-5 w-5" />
          익스포트
        </h2>

        <div className="flex flex-wrap gap-3">
          <Button variant="outline" onClick={handleExportFunctions}>
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            기능 목록 다운로드
          </Button>
          <Button variant="outline" onClick={handleExportFunctions}>
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            요구사항 추적표 다운로드
          </Button>
        </div>
      </div>
    </div>
  );
}
