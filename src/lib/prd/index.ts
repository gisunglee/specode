/**
 * prd/index.ts — PRD 생성기 버전 포인터
 *
 * 버전을 올릴 때 이 파일의 import 경로만 바꾼다.
 * 이전 버전 파일(v1.ts, v2.ts 등)은 절대 삭제하지 않는다.
 *
 * ─── 현재 활성 버전 ───────────────────────────────────────────
 *   화면(screen)   : v1
 *   영역(area)     : v1
 *   기능(function) : v1
 * ──────────────────────────────────────────────────────────────
 *
 * ─── 버전 업그레이드 예시 ──────────────────────────────────────
 *   1. src/lib/prd/screen/v2.ts 생성
 *   2. 아래 screen import 를 "./screen/v2" 로 변경
 *   3. PRD_VERSIONS.screen 을 "v2" 로 변경
 *   4. v1.ts 는 그대로 유지 (히스토리 보존)
 * ──────────────────────────────────────────────────────────────
 */

export type { ScreenForPrd, AreaForPrd, FunctionForPrd } from "./types";

// ── 화면 PRD ─────────────────────────────────────────────────────────────
export { generateScreenPrd } from "./screen/v1";    // ← 버전업 시 여기만 수정

// ── 영역 PRD ─────────────────────────────────────────────────────────────
export { generateAreaPrd } from "./area/v1";         // ← 버전업 시 여기만 수정

// ── 기능 PRD ─────────────────────────────────────────────────────────────
export { generateFunctionPrd } from "./function/v1"; // ← 버전업 시 여기만 수정

/** 현재 활성 버전 메타데이터 */
export const PRD_VERSIONS = {
  screen:   "v1",
  area:     "v1",
  function: "v1",
} as const;
