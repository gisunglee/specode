/**
 * prd/types.ts — PRD 생성기 공통 인터페이스
 *
 * 모든 레벨(screen / area / function)의 PRD 생성기가 공유하는 타입 정의.
 * 새 버전에서 필드가 추가될 경우 기존 버전 타입은 그대로 두고
 * 새 버전 파일(v2.ts)에서 확장한다.
 */

export interface FunctionForPrd {
  systemId: string;
  displayCode: string | null;
  name: string;
  status: string;
  priority: string;
  spec: string | null;
  aiDesignContent: string | null;
  aiInspFeedback: string | null;
}

export interface AreaForPrd {
  areaCode: string;
  name: string;
  areaType: string;
  spec: string | null;
  designData: string | null;
  functions: FunctionForPrd[];
}

export interface ScreenForPrd {
  systemId: string;
  displayCode: string | null;
  name: string;
  screenType: string | null;
  spec: string | null;
  categoryL: string | null;
  categoryM: string | null;
  categoryS: string | null;
  requirement: { systemId: string; name: string } | null;
  areas: AreaForPrd[];
}
