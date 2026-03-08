/**
 * auth.ts — OpenClaw AI API 인증 헬퍼
 *
 * 환경변수 AI_API_KEY 와 요청 헤더 X-API-Key 를 비교합니다.
 * - AI_API_KEY 미설정 시: 개발 편의를 위해 인증 통과 (콘솔 경고)
 * - 불일치 시: 401 응답 반환
 *
 * 사용법:
 *   const authError = validateApiKey(request);
 *   if (authError) return authError;
 */
import { NextRequest } from "next/server";
import { apiError } from "@/lib/utils";

export function validateApiKey(request: NextRequest): Response | null {
  const expectedKey = process.env.AI_API_KEY;

  if (!expectedKey) {
    console.warn("[AI API] ⚠ AI_API_KEY 환경변수가 설정되지 않았습니다. 인증 없이 허용합니다.");
    return null;
  }

  const providedKey = request.headers.get("X-API-Key");

  if (!providedKey || providedKey !== expectedKey) {
    return apiError("UNAUTHORIZED", "유효하지 않은 API 키입니다.", 401);
  }

  return null; // null = 인증 통과
}
