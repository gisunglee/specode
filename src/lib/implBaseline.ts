/**
 * implBaseline.ts — 구현 기준선(Impl Baseline) 유틸리티
 *
 * 역할:
 *   - 기능의 마지막 구현/설계 요청 시점 스냅샷을 조회
 *   - 현재 상태와 스냅샷 비교 → 변경된 섹션 목록 반환
 *   - 변경사항 메모 자동 draft 생성 (before/after 내용 포함)
 */

export interface ContextSnapshot {
  spec: string;
  aiDesignContent: string;
  refContent: string;
}

/** 섹션 단위 변경 내용 (이름 + before/after 실제 텍스트) */
export interface SectionChange {
  name: string;
  before: string; // 추가된 섹션이면 ""
  after: string;  // 삭제된 섹션이면 ""
}

export interface SectionDiff {
  field: "spec" | "aiDesignContent" | "refContent";
  label: string;
  added: SectionChange[];
  modified: SectionChange[];
  removed: SectionChange[];
}

export interface BaselineInfo {
  aiTaskId: number;
  systemId: string;
  taskType: string;
  requestedAt: string;
  snapshot: ContextSnapshot;
}

/**
 * 마크다운 텍스트에서 ## 헤더 기준 섹션 목록을 추출한다.
 * Returns: { "## 섹션명": "섹션 내용 전체" }
 */
function parseSections(text: string): Record<string, string> {
  const sections: Record<string, string> = {};
  if (!text?.trim()) return sections;

  const lines = text.split("\n");
  let currentHeader = "__root__";
  let currentLines: string[] = [];

  for (const line of lines) {
    if (line.startsWith("## ")) {
      if (currentLines.length > 0) {
        sections[currentHeader] = currentLines.join("\n").trim();
      }
      currentHeader = line.trim();
      currentLines = [];
    } else {
      currentLines.push(line);
    }
  }
  if (currentLines.length > 0) {
    sections[currentHeader] = currentLines.join("\n").trim();
  }

  return sections;
}

/**
 * 두 마크다운 텍스트의 섹션 단위 diff를 반환한다.
 * modified에는 before/after 실제 내용도 포함.
 */
function diffMarkdown(
  before: string,
  after: string
): { added: SectionChange[]; modified: SectionChange[]; removed: SectionChange[] } {
  const beforeSections = parseSections(before);
  const afterSections = parseSections(after);

  const added: SectionChange[] = [];
  const modified: SectionChange[] = [];
  const removed: SectionChange[] = [];

  for (const key of Object.keys(afterSections)) {
    if (key === "__root__") continue;
    if (!(key in beforeSections)) {
      added.push({ name: key, before: "", after: afterSections[key] });
    } else if (beforeSections[key] !== afterSections[key]) {
      modified.push({ name: key, before: beforeSections[key], after: afterSections[key] });
    }
  }

  for (const key of Object.keys(beforeSections)) {
    if (key === "__root__") continue;
    if (!(key in afterSections)) {
      removed.push({ name: key, before: beforeSections[key], after: "" });
    }
  }

  return { added, modified, removed };
}

/**
 * 현재 기능 상태와 baseline 스냅샷을 비교하여 변경된 필드/섹션 목록을 반환한다.
 */
export function diffFromBaseline(
  baseline: ContextSnapshot,
  current: { spec: string | null; aiDesignContent: string | null; refContent: string | null }
): SectionDiff[] {
  const fields: Array<{ field: "spec" | "aiDesignContent" | "refContent"; label: string }> = [
    { field: "spec", label: "기본 설계 내용" },
    { field: "aiDesignContent", label: "상세설계" },
    { field: "refContent", label: "참고 프로그램" },
  ];

  const result: SectionDiff[] = [];

  for (const { field, label } of fields) {
    const before = baseline[field] || "";
    const after = current[field] || "";
    if (before === after) continue;

    const { added, modified, removed } = diffMarkdown(before, after);
    if (added.length > 0 || modified.length > 0 || removed.length > 0) {
      result.push({ field, label, added, modified, removed });
    } else if (before !== after) {
      // 섹션 헤더 없는 단순 텍스트 변경 — before/after 전체 포함
      result.push({
        field,
        label,
        added: [],
        modified: [{ name: "(전체 내용)", before, after }],
        removed: [],
      });
    }
  }

  return result;
}

/**
 * 변경사항 diff로부터 changeNote 초안 텍스트를 생성한다.
 * AI가 "기존에 이거였는데 이걸로 바뀌었다"를 바로 알 수 있도록 before/after 내용 포함.
 */
export function buildChangeNoteDraft(diffs: SectionDiff[]): string {
  if (diffs.length === 0) return "";

  const lines: string[] = ["## 이전 구현 이후 변경사항"];

  for (const d of diffs) {
    lines.push(`\n### ${d.label}`);

    for (const s of d.modified) {
      lines.push(`\n#### [변경] ${s.name}`);
      lines.push(`**기존:**\n${s.before || "(없음)"}`);
      lines.push(`\n**변경:**\n${s.after || "(없음)"}`);
    }

    for (const s of d.added) {
      lines.push(`\n#### [추가] ${s.name}`);
      lines.push(s.after || "(내용 없음)");
    }

    for (const s of d.removed) {
      lines.push(`\n#### [삭제] ${s.name}`);
      lines.push(`**기존:**\n${s.before || "(없음)"}`);
    }
  }

  return lines.join("\n");
}

/* ─────────────────────────────────────────────────────────
 * 영역(Area) 단위 Baseline
 * ───────────────────────────────────────────────────────── */

export interface AreaFunctionSnapshot {
  functionId: number;
  name: string;
  spec: string;
  aiDesignContent?: string;
  refContent: string;
}

export interface AreaSnapshot {
  area: { spec: string };
  functions: AreaFunctionSnapshot[];
}

export interface FunctionChange {
  functionId: number;
  name: string;
  diffs: SectionDiff[];
}

export interface AreaBaselineDiff {
  areaSpecDiffs: SectionDiff[];
  addedFunctions: { functionId: number; name: string }[];
  removedFunctions: { functionId: number; name: string }[];
  modifiedFunctions: FunctionChange[];
}

/**
 * 영역 단위 baseline diff:
 *   - 영역 spec 변경
 *   - 기능 추가/삭제
 *   - 기존 기능의 spec/aiDesignContent/refContent 변경
 */
export function diffFromAreaBaseline(
  baseline: AreaSnapshot,
  current: AreaSnapshot
): AreaBaselineDiff {
  // 영역 spec diff
  const areaSpecDiffs = diffFromBaseline(
    { spec: baseline.area.spec, aiDesignContent: "", refContent: "" },
    { spec: current.area.spec, aiDesignContent: null, refContent: null }
  ).filter((d) => d.field === "spec");

  // 기능 목록 비교
  const baselineIds = new Map(baseline.functions.map((f) => [f.functionId, f]));
  const currentIds = new Map(current.functions.map((f) => [f.functionId, f]));

  const addedFunctions = current.functions
    .filter((f) => !baselineIds.has(f.functionId))
    .map((f) => ({ functionId: f.functionId, name: f.name }));

  const removedFunctions = baseline.functions
    .filter((f) => !currentIds.has(f.functionId))
    .map((f) => ({ functionId: f.functionId, name: f.name }));

  const modifiedFunctions: FunctionChange[] = [];
  for (const cur of current.functions) {
    const base = baselineIds.get(cur.functionId);
    if (!base) continue;
    const diffs = diffFromBaseline(
      { spec: base.spec, aiDesignContent: "", refContent: base.refContent },
      { spec: cur.spec, aiDesignContent: "", refContent: cur.refContent }
    );
    if (diffs.length > 0) {
      modifiedFunctions.push({ functionId: cur.functionId, name: cur.name, diffs });
    }
  }

  return { areaSpecDiffs, addedFunctions, removedFunctions, modifiedFunctions };
}

export function buildAreaChangeNoteDraft(diff: AreaBaselineDiff): string {
  const hasChanges =
    diff.areaSpecDiffs.length > 0 ||
    diff.addedFunctions.length > 0 ||
    diff.removedFunctions.length > 0 ||
    diff.modifiedFunctions.length > 0;

  if (!hasChanges) return "";

  const lines: string[] = ["## 이전 구현 이후 변경사항"];

  if (diff.areaSpecDiffs.length > 0) {
    lines.push("\n### 영역 설명 변경");
    lines.push(buildChangeNoteDraft(diff.areaSpecDiffs).replace("## 이전 구현 이후 변경사항\n", ""));
  }

  if (diff.addedFunctions.length > 0) {
    lines.push("\n### 기능 추가");
    diff.addedFunctions.forEach((f) => lines.push(`- ${f.name} (FID: ${f.functionId})`));
  }

  if (diff.removedFunctions.length > 0) {
    lines.push("\n### 기능 삭제");
    diff.removedFunctions.forEach((f) => lines.push(`- ${f.name} (FID: ${f.functionId})`));
  }

  for (const fc of diff.modifiedFunctions) {
    lines.push(`\n### 기능 변경: ${fc.name}`);
    lines.push(buildChangeNoteDraft(fc.diffs).replace("## 이전 구현 이후 변경사항\n", ""));
  }

  return lines.join("\n");
}

/* ─────────────────────────────────────────────────────────
 * 화면(Screen) 단위 Baseline
 * ───────────────────────────────────────────────────────── */

export interface ScreenAreaSnapshot {
  areaId: number;
  name: string;
  spec: string;
  functions: AreaFunctionSnapshot[];
}

export interface ScreenSnapshot {
  screen: { spec: string };
  areas: ScreenAreaSnapshot[];
}

export interface ScreenBaselineDiff {
  screenSpecDiffs: SectionDiff[];
  addedFunctions: { functionId: number; name: string; areaName: string }[];
  removedFunctions: { functionId: number; name: string; areaName: string }[];
  modifiedFunctions: FunctionChange[];
}

/**
 * 화면 단위 baseline diff:
 *   - 화면 spec 변경
 *   - 전체 기능 추가/삭제 (영역 정보 포함)
 *   - 기존 기능의 spec/aiDesignContent/refContent 변경
 */
export function diffFromScreenBaseline(
  baseline: ScreenSnapshot,
  current: ScreenSnapshot
): ScreenBaselineDiff {
  // 화면 spec diff
  const screenSpecDiffs = diffFromBaseline(
    { spec: baseline.screen.spec, aiDesignContent: "", refContent: "" },
    { spec: current.screen.spec, aiDesignContent: null, refContent: null }
  ).filter((d) => d.field === "spec");

  // 전체 기능 평탄화
  const flatBaseline = new Map<number, { func: AreaFunctionSnapshot; areaName: string }>();
  const flatCurrent = new Map<number, { func: AreaFunctionSnapshot; areaName: string }>();
  baseline.areas.forEach((a) => a.functions.forEach((f) => flatBaseline.set(f.functionId, { func: f, areaName: a.name })));
  current.areas.forEach((a) => a.functions.forEach((f) => flatCurrent.set(f.functionId, { func: f, areaName: a.name })));

  const addedFunctions = [...flatCurrent.values()]
    .filter(({ func }) => !flatBaseline.has(func.functionId))
    .map(({ func, areaName }) => ({ functionId: func.functionId, name: func.name, areaName }));

  const removedFunctions = [...flatBaseline.values()]
    .filter(({ func }) => !flatCurrent.has(func.functionId))
    .map(({ func, areaName }) => ({ functionId: func.functionId, name: func.name, areaName }));

  const modifiedFunctions: FunctionChange[] = [];
  for (const { func: cur } of flatCurrent.values()) {
    const base = flatBaseline.get(cur.functionId);
    if (!base) continue;
    const diffs = diffFromBaseline(
      { spec: base.func.spec, aiDesignContent: "", refContent: base.func.refContent },
      { spec: cur.spec, aiDesignContent: "", refContent: cur.refContent }
    );
    if (diffs.length > 0) {
      modifiedFunctions.push({ functionId: cur.functionId, name: cur.name, diffs });
    }
  }

  return { screenSpecDiffs, addedFunctions, removedFunctions, modifiedFunctions };
}

export function buildScreenChangeNoteDraft(diff: ScreenBaselineDiff): string {
  const hasChanges =
    diff.screenSpecDiffs.length > 0 ||
    diff.addedFunctions.length > 0 ||
    diff.removedFunctions.length > 0 ||
    diff.modifiedFunctions.length > 0;

  if (!hasChanges) return "";

  const lines: string[] = ["## 이전 구현 이후 변경사항"];

  if (diff.screenSpecDiffs.length > 0) {
    lines.push("\n### 화면 설명 변경");
    lines.push(buildChangeNoteDraft(diff.screenSpecDiffs).replace("## 이전 구현 이후 변경사항\n", ""));
  }

  if (diff.addedFunctions.length > 0) {
    lines.push("\n### 기능 추가");
    diff.addedFunctions.forEach((f) => lines.push(`- [${f.areaName}] ${f.name}`));
  }

  if (diff.removedFunctions.length > 0) {
    lines.push("\n### 기능 삭제");
    diff.removedFunctions.forEach((f) => lines.push(`- [${f.areaName}] ${f.name}`));
  }

  for (const fc of diff.modifiedFunctions) {
    lines.push(`\n### 기능 변경: ${fc.name}`);
    lines.push(buildChangeNoteDraft(fc.diffs).replace("## 이전 구현 이후 변경사항\n", ""));
  }

  return lines.join("\n");
}
