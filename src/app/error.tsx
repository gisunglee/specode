"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center px-4">
      <h2 className="text-xl font-semibold">오류가 발생했습니다</h2>
      <p className="text-muted-foreground text-sm max-w-md">
        {error.message || "예기치 않은 오류가 발생했습니다. 잠시 후 다시 시도해 주세요."}
      </p>
      <Button onClick={reset}>다시 시도</Button>
    </div>
  );
}
