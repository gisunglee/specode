/**
 * ddlParser.ts — DDL에서 컬럼명 추출 유틸
 *
 * 지원 패턴:
 *   - 일반 컬럼 정의: `  col_name TYPE ...`
 *   - CONSTRAINT / INDEX / PRIMARY KEY / FOREIGN KEY 행은 제외
 *   - 주석(--) 행 제거
 */

/**
 * DDL 스크립트에서 컬럼명 배열을 추출합니다.
 * 파싱 실패 시 빈 배열을 반환합니다.
 */
export function parseDdlColumns(ddl: string): string[] {
  try {
    const lines = ddl.split("\n");
    const columns: string[] = [];

    // CREATE TABLE ... ( 이후 ) 전까지의 행만 처리
    let inside = false;
    for (const rawLine of lines) {
      const line = rawLine.trim();

      if (!inside) {
        if (/CREATE\s+TABLE/i.test(line)) inside = true;
        continue;
      }

      // 닫는 괄호 → 종료
      if (/^\)/.test(line)) break;

      // 빈 줄 / 주석 제외
      if (!line || line.startsWith("--")) continue;

      // CONSTRAINT, PRIMARY KEY, UNIQUE, INDEX, FOREIGN KEY, CHECK 행 제외
      if (/^(CONSTRAINT|PRIMARY\s+KEY|UNIQUE|INDEX|FOREIGN\s+KEY|CHECK)\b/i.test(line)) continue;

      // 첫 토큰이 컬럼명 (따옴표 지원)
      const match = line.match(/^["`]?([a-zA-Z_][a-zA-Z0-9_]*)["`]?\s+\S+/);
      if (match) {
        columns.push(match[1]);
      }
    }

    return columns;
  } catch {
    return [];
  }
}

/** RelationItem 타입 */
export interface RelationItem {
  from_col: string;
  to_tbl: string;
  to_col: string;
  cardinality: "1:1" | "1:N" | "N:M";
  identifying: boolean;
}

/**
 * DDL에서 FK 관계를 자동 추출합니다.
 *
 * 지원 패턴:
 *   1. REFERENCES tb_xxx(col) — SQL FK 구문
 *   2. -- FK: tb_xxx.col     — 주석 힌트
 *   3. -- ref: col → tb_xxx.col — 주석 힌트 (확장)
 */
export function parseDdlRelations(ddl: string): RelationItem[] {
  const relations: RelationItem[] = [];
  const lines = ddl.split("\n");

  // 현재 처리 중인 컬럼명을 추적
  let lastCol = "";

  for (const rawLine of lines) {
    const line = rawLine.trim();

    // 컬럼 정의 행에서 컬럼명 추출 (CONSTRAINT 등 제외)
    if (!/^(CONSTRAINT|PRIMARY|UNIQUE|INDEX|CHECK)/i.test(line)) {
      const colMatch = line.match(/^["`]?([a-zA-Z_][a-zA-Z0-9_]*)["`]?\s+\S+/);
      if (colMatch) lastCol = colMatch[1];
    }

    // 패턴 1: REFERENCES tb_xxx(col_name) — 물리 FK
    const refMatch = line.match(/REFERENCES\s+["`]?(\w+)["`]?\s*\(\s*["`]?(\w+)["`]?\s*\)/i);
    if (refMatch && lastCol) {
      relations.push({
        from_col: lastCol,
        to_tbl: refMatch[1],
        to_col: refMatch[2],
        cardinality: "1:N",
        identifying: false,
      });
      continue;
    }

    // 패턴 2: -- FK: tb_xxx.col_name
    const fkCommentMatch = line.match(/--\s*FK:\s*(\w+)\.(\w+)/i);
    if (fkCommentMatch && lastCol) {
      relations.push({
        from_col: lastCol,
        to_tbl: fkCommentMatch[1],
        to_col: fkCommentMatch[2],
        cardinality: "1:N",
        identifying: false,
      });
      continue;
    }

    // 패턴 3: -- ref: from_col → tb_xxx.col
    const refCommentMatch = line.match(/--\s*ref:\s*(\w+)\s*[→>-]+\s*(\w+)\.(\w+)/i);
    if (refCommentMatch) {
      relations.push({
        from_col: refCommentMatch[1],
        to_tbl: refCommentMatch[2],
        to_col: refCommentMatch[3],
        cardinality: "1:N",
        identifying: false,
      });
    }
  }

  return relations;
}
