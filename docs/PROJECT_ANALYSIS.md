# SPECODE (AI Dev Hub) 프로젝트 분석 보고서

> 작성일: 2026-03-07
> 대상: Next.js 16.1.6 기반 AI 주도 SI 개발 자동화 시스템

---

## 목차

1. [프로젝트 개요](#1-프로젝트-개요)
2. [아키텍처 구조](#2-아키텍처-구조)
3. [잘된 점 (Strengths)](#3-잘된-점-strengths)
4. [아쉬운 점 (Weaknesses)](#4-아쉬운-점-weaknesses)
5. [개선 우선순위](#5-개선-우선순위)
6. [세부 개선 항목](#6-세부-개선-항목)

---

## 1. 프로젝트 개요

| 항목 | 내용 |
|------|------|
| 목적 | AI 주도 SI 개발 자동화 (요구사항 → 화면 → 기능 → AI 설계/구현) |
| 스택 | Next.js 16 · React 19 · TypeScript 5 · Tailwind v4 · Prisma 6 · PostgreSQL |
| DB | Supabase (PostgreSQL), 로컬 SQLite 대체 가능 |
| AI 연동 | OpenClaw 폴링 모델 (30초 간격, X-API-Key 인증) |
| 언어 | 한국어 우선 (ko-KR) |

### 전체 아키텍처 흐름

```
Browser (React 19 + TanStack Query)
    ↓ HTTP/REST
Next.js 16 API Routes (서버 컴포넌트 없음, 모두 "use client")
    ↓ Prisma ORM
PostgreSQL (Supabase)
    ↑ (polling)
OpenClaw AI Service (30초마다 GET /api/ai/tasks → POST /api/ai/tasks/[id]/complete)
```

---

## 2. 아키텍처 구조

### 디렉토리 구조 요약

```
src/
├── app/
│   ├── layout.tsx              # Root: Providers + AppShell
│   ├── page.tsx                # Dashboard (상태 카드 + AI 활동 피드)
│   ├── functions/              # 기능 목록 + 상세 (가장 복잡)
│   ├── screens/                # 화면 목록 + 레이아웃 에디터
│   ├── requirements/           # 요구사항 목록/상세
│   ├── ai-tasks/               # AI 작업 모니터링
│   ├── tree/                   # 계층 트리 뷰
│   ├── standard-guides/        # 코딩/설계 표준
│   └── api/
│       ├── functions/          # REST CRUD + 배치 상태변경
│       ├── ai/tasks/           # AI 폴링 + 완료 콜백
│       ├── dashboard/          # 현황 요약
│       └── ...
├── components/
│   ├── layout/                 # AppShell, Sidebar, Header
│   ├── common/                 # DataGrid, MarkdownEditor, FileUpload 등
│   ├── functions/              # 기능 상세 탭 컴포넌트
│   └── ui/                     # 기본 UI (Button, Dialog, Select 등)
├── lib/
│   ├── prisma.ts               # Prisma 싱글톤
│   ├── sequence.ts             # 자동 ID 생성 (RQ-00001, FID-00001)
│   ├── validators.ts           # Zod 스키마
│   ├── constants.ts            # 상태 Enum, 라벨, 색상, 네비게이션
│   └── utils.ts                # API 응답 헬퍼, cn()
└── types/index.ts              # 전체 TypeScript 인터페이스
```

### 핵심 데이터 모델

```
Requirement (요구사항)
    └── Screen (화면) 1:N
            └── Function (기능) 1:N
                    └── AiTask (AI 작업) 1:N  ← 폴리모픽
                    └── Attachment (첨부) N   ← 폴리모픽
StandardGuide (표준가이드)
    └── AiTask (AI 작업) 1:N  ← 폴리모픽 (동일 AiTask 모델)
```

### 기능 상태 흐름 (10단계)

```
DRAFT → REVIEW_REQ → AI_REVIEWING → REVIEW_DONE
      → DESIGN_REQ → DESIGN_DONE
      → CONFIRM_Y
      → IMPL_REQ → AI_IMPLEMENTING → IMPL_DONE
```

---

## 3. 잘된 점 (Strengths)

### ✅ 3.1 타입 안전성 (TypeScript)

- `tsconfig.json` strict 모드 전부 활성화 (`noImplicitAny`, `strictNullChecks` 등)
- `src/types/index.ts`에 모든 엔티티 인터페이스 정의, API 응답 타입도 일치
- Zod 스키마로 요청 바디 런타임 검증까지 처리
- Next.js 16의 Route Params Promise 패턴도 제대로 적용

```typescript
// ✅ 올바른 Next.js 16 패턴
const { id } = await params;  // Promise를 await
```

### ✅ 3.2 컴포넌트 설계

- **관심사 분리 명확**: `common/`, `functions/`, `ui/` 계층 구분
- `DataGrid.tsx`: TanStack Table 래퍼로 정렬/페이지네이션을 재사용 가능하게 추상화
- `MarkdownEditor`, `RichTextEditor` 분리 (읽기 전용 vs 편집 필요 시)
- `ConfirmDialog` 재사용 가능한 확인 모달
- Radix UI 기반 `ui/` 컴포넌트로 접근성(a11y) 기본 확보

### ✅ 3.3 API 설계

- REST 원칙 준수 (GET/POST/PUT/PATCH/DELETE 명시적 사용)
- 도메인별 라우트 그룹화 (`/api/functions`, `/api/screens`)
- `utils.ts`의 `apiSuccess`, `apiError` 헬퍼로 응답 포맷 통일
- 에러 코드 + 메시지 구조화 (`{ code: "NOT_FOUND", message: "..." }`)
- 미들웨어로 개발 시 요청 로깅

### ✅ 3.4 UI/UX 품질

- Tailwind v4 `@theme`으로 oklch 색상 시스템 구축 (지각적으로 균일한 색상)
- 상태별 뱃지 색상 일관성 (`constants.ts`에 색상 맵 중앙화)
- Framer Motion으로 페이지 진입 애니메이션
- AI 실행 중 pulse-glow 애니메이션
- 반응형 레이아웃 (mobile → md → lg 그리드 단계)
- 사이드바 접기/펼치기 + 로컬 상태 유지

### ✅ 3.5 AI 연동 설계

- 폴링 방식으로 AI 서비스 의존성 분리 (AI가 PULL하므로 방화벽 친화적)
- 폴리모픽 AiTask로 다양한 엔티티(Function, StandardGuide)를 단일 모델로 처리
- AI 작업 완료 시 기능 상태 자동 전이 (REVIEW_REQ → REVIEW_DONE 등)
- X-API-Key 헤더 인증으로 AI 엔드포인트 보호

### ✅ 3.6 개발 편의성

- Prisma 싱글톤 패턴으로 연결 풀 낭비 방지
- 개발 환경 Prisma 쿼리 로깅 (`log: ["query", "warn", "error"]`)
- 시퀀스 기반 가독성 높은 ID (RQ-00001, FID-00001)
- `.env` 구성이 Supabase Pooler + Direct URL 패턴 준수

### ✅ 3.7 코드 문서화

- 복잡한 컴포넌트(functions/page.tsx)에 Suspense 패턴, queryKey 패턴 설명 주석
- 타입에 JSDoc 수준의 설명 포함
- `constants.ts`에 레이블/색상/상태 맵 중앙화로 변경 시 단일 수정 지점

---

## 4. 아쉬운 점 (Weaknesses)

### ❌ 4.1 스키마와 코드 불일치 (Critical)

**Prisma 스키마에서 삭제된 모델이 코드에 남아있음**

```typescript
// prisma/schema.prisma에 FuncReference, FuncRelation 모델이 없음
// 그러나 seed.ts와 API 핸들러에서 여전히 references, relations 필드 사용
// → 빌드 시 Prisma 타입 오류 발생 가능
```

**폴리모픽 관계에 DB 레벨 FK 없음**

```sql
-- refTableName + refPkId 조합이지만 DB 외래키 없음
-- 참조 무결성을 애플리케이션 레이어에서만 보장
-- → 고아 레코드(orphan records) 발생 위험
```

### ❌ 4.2 테스트 코드 전무 (Critical)

- 단위 테스트 0개
- 통합 테스트 0개
- E2E 테스트 0개
- Zod 스키마 검증 외에 비즈니스 로직 검증 수단 없음
- 특히 AI 작업 완료 로직(`onTaskComplete.ts`)은 상태 전이가 많아 테스트 필수

### ❌ 4.3 에러 처리 불완전 (High)

**클라이언트 측**
```typescript
// ❌ 현재: useMutation onError가 없거나 최소화
const mutation = useMutation({
  mutationFn: async () => { ... },
  onSuccess: () => { ... },
  // onError 없음 → 실패 시 사용자에게 피드백 없음
});
```

- 에러 바운더리(Error Boundary) 없음
- 네트워크 오류 시 일반적 메시지만 표시
- 낙관적 업데이트(Optimistic Update) 없어 UX 지연 발생
- 배치 작업 중 로딩 스피너 없음

**서버 측**
- API 요청 타임아웃 처리 없음
- AI 완료 콜백 엔드포인트에 속도 제한(Rate Limiting) 없음
- DB 트랜잭션 롤백 처리 일부 누락

### ❌ 4.4 "use client" 남용 (High)

```typescript
// ❌ 모든 페이지가 "use client"
// Next.js의 Server Components 장점을 전혀 활용하지 않음
// → SEO 불이, 초기 번들 크기 증가, 서버 데이터 패칭 기회 손실
```

- 정적 콘텐츠나 초기 데이터 패칭은 Server Component로 처리 가능
- 특히 요구사항/화면 목록처럼 초기 SSR이 유리한 페이지들

### ❌ 4.5 무한 데이터 로드 위험 (High)

```typescript
// ❌ AiTask 히스토리 페이지네이션 없음
const tasks = await prisma.aiTask.findMany({
  where: { refTableName: "tb_function", refPkId: id },
  // take / skip 없음 → 데이터 증가 시 전체 로드
});

// ❌ 기능 상세의 첨부파일도 동일 문제
```

- AI 피드백이 대형 마크다운인 경우 TEXT 컬럼에 무제한 저장
- 대시보드 30초 폴링이 상태 카운트 계산을 매번 전체 조회

### ❌ 4.6 미완성 기능 (Medium)

| 기능 | 현재 상태 |
|------|-----------|
| `HistoryTab` | 완전 Stub, 실제 히스토리 없음 |
| `import-export/` 페이지 | UI만 존재, 실제 Excel 파싱 없음 |
| `api-docs/` 페이지 | OpenAPI 스펙 자동화 미완성 |
| FuncReference/FuncRelation | 모델 삭제됨, UI도 미반영 |

### ❌ 4.7 보안 취약점 (Medium)

```typescript
// ❌ API 엔드포인트에 인증/인가 없음
// /api/functions, /api/screens 등은 인증 없이 접근 가능
// AI 엔드포인트만 X-API-Key 인증

// ❌ SQL Injection 위험은 Prisma가 막지만
// 파일 업로드에 파일 타입/크기 제한 검증 불명확
```

- 세션/JWT 기반 사용자 인증 없음
- 역할 기반 접근 제어(RBAC) 없음
- CORS 설정 없음 (기본값 사용)

### ❌ 4.8 상수 중복 및 타입 불일치 (Low~Medium)

```typescript
// ❌ 동일한 상태 값이 세 곳에 정의됨
// 1. prisma/schema.prisma (enum)
// 2. src/lib/constants.ts (FUNCTION_STATUS 객체)
// 3. src/types/index.ts (TypeScript 타입)
// → 변경 시 세 곳을 모두 수정해야 함

// ❌ 일부 컴포넌트에서 인터페이스 대신 any 사용
const [data, setData] = useState<any>(null);
```

### ❌ 4.9 환경변수 타입 안전성 (Low)

```typescript
// ❌ 환경변수 접근에 타입 보장 없음
const apiKey = process.env.AI_SECRET_KEY;  // string | undefined
// → undefined일 때 런타임 오류
```

- `@t3-oss/env-nextjs` 등 환경변수 검증 라이브러리 미사용

---

## 5. 개선 우선순위

### 🔴 즉시 해결 (Critical)

| # | 항목 | 이유 |
|---|------|------|
| 1 | **스키마-코드 동기화** | 빌드/런타임 오류 위험, FuncReference/FuncRelation 처리 결정 |
| 2 | **핵심 로직 테스트 추가** | AI 작업 완료 로직, 상태 전이, Zod 검증 최소 테스트 |
| 3 | **에러 바운더리 추가** | 전체 앱 크래시 방지 |

### 🟠 단기 개선 (High Priority)

| # | 항목 | 이유 |
|---|------|------|
| 4 | **onError 핸들러 추가** | 사용자에게 실패 피드백 필수 |
| 5 | **페이지네이션 보완** | AiTask 히스토리, 첨부파일 목록 |
| 6 | **API Rate Limiting** | AI 콜백 엔드포인트 보호 |
| 7 | **일부 Server Component 전환** | 번들 크기, 초기 로드 개선 |

### 🟡 중기 개선 (Medium Priority)

| # | 항목 | 이유 |
|---|------|------|
| 8 | **사용자 인증 추가** | NextAuth.js 또는 Supabase Auth |
| 9 | **HistoryTab 구현** | 현재 완전 Stub |
| 10 | **Excel Import/Export 구현** | 현재 UI만 존재 |
| 11 | **낙관적 업데이트** | UX 반응성 개선 |
| 12 | **환경변수 타입 안전성** | `@t3-oss/env-nextjs` 도입 |

### 🟢 장기 개선 (Nice to Have)

| # | 항목 | 이유 |
|---|------|------|
| 13 | **상태 타입 단일 소스화** | Prisma enum → TypeScript 자동 생성 |
| 14 | **OpenAPI 자동화 완성** | API 문서화 |
| 15 | **WebSocket/SSE 전환** | 폴링 대신 실시간 AI 상태 업데이트 |
| 16 | **모노레포 고려** | AI 서비스와 공유 타입 분리 시 |

---

## 6. 세부 개선 항목

### 6.1 스키마-코드 동기화

**옵션 A**: FuncReference, FuncRelation 모델 복원

```prisma
model FuncReference {
  id          Int      @id @default(autoincrement())
  funcId      Int
  refTable    String
  refCode     String?
  func        Function @relation(fields: [funcId], references: [id])

  @@map("tb_func_reference")
}
```

**옵션 B**: 코드에서 완전 제거 (현재 UI 미반영이므로 깔끔)

---

### 6.2 에러 처리 개선

```typescript
// ✅ 개선 패턴
const mutation = useMutation({
  mutationFn: updateFunction,
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ["functions"] });
    toast.success("저장되었습니다.");
  },
  onError: (error) => {
    toast.error(`저장 실패: ${error.message}`);
  },
});

// ✅ 에러 바운더리 추가
// src/app/error.tsx
export default function Error({ error, reset }) {
  return (
    <div>
      <h2>오류가 발생했습니다</h2>
      <button onClick={reset}>다시 시도</button>
    </div>
  );
}
```

---

### 6.3 Server Component 전환 가이드

```typescript
// ✅ 변환 가능한 페이지: 요구사항 목록 (정적 초기 데이터)
// Before: "use client" + useQuery
// After:
export default async function RequirementsPage() {
  const requirements = await prisma.requirement.findMany(); // 서버에서 직접 조회
  return <RequirementsList initialData={requirements} />;
}
```

**Server Component 전환 대상:**
- `requirements/page.tsx` — 목록 초기 데이터
- `screens/page.tsx` — 목록 초기 데이터
- `tree/page.tsx` — 정적 계층 구조
- Dashboard 상태 카드 초기값

---

### 6.4 테스트 추가 방향

```typescript
// 최소 테스트 대상 (우선순위 순)

// 1. onTaskComplete.ts — AI 작업 완료 상태 전이 로직
describe('onTaskComplete', () => {
  it('REVIEW 완료 시 기능 상태를 REVIEW_DONE으로 변경', async () => { ... });
  it('IMPLEMENT 완료 시 기능 상태를 IMPL_DONE으로 변경', async () => { ... });
  it('FAILED 시 이전 상태로 롤백', async () => { ... });
});

// 2. sequence.ts — ID 생성 로직
// 3. Zod 스키마 검증

// 도구: vitest + @testing-library/react + prisma mock
```

---

### 6.5 페이지네이션 추가

```typescript
// ✅ AiTask 히스토리 페이지네이션
const tasks = await prisma.aiTask.findMany({
  where: { refTableName: "tb_function", refPkId: id },
  orderBy: { createdAt: "desc" },
  take: 10,         // 추가
  skip: (page - 1) * 10,  // 추가
});
```

---

### 6.6 환경변수 타입 안전성

```typescript
// src/env.ts
import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  server: {
    DATABASE_URL: z.string().url(),
    AI_SECRET_KEY: z.string().min(1),
  },
  client: {
    NEXT_PUBLIC_APP_NAME: z.string().default("AI Dev Hub"),
  },
  runtimeEnv: {
    DATABASE_URL: process.env.DATABASE_URL,
    AI_SECRET_KEY: process.env.AI_SECRET_KEY,
    NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME,
  },
});
```

---

## 요약 평가

| 영역 | 점수 | 평가 |
|------|------|------|
| 타입 안전성 | ⭐⭐⭐⭐⭐ | TypeScript strict + Zod 검증 우수 |
| 컴포넌트 설계 | ⭐⭐⭐⭐ | 관심사 분리 잘됨, Server Component 미활용 |
| API 설계 | ⭐⭐⭐⭐ | REST 원칙 준수, 인증 없음 |
| UI/UX | ⭐⭐⭐⭐ | 디자인 일관성 높음, 에러 피드백 부족 |
| AI 연동 | ⭐⭐⭐⭐ | 폴링 설계 안정적, Rate Limiting 필요 |
| 에러 처리 | ⭐⭐ | 서버 측 양호, 클라이언트 측 미흡 |
| 테스트 | ⭐ | 전무, 핵심 로직만이라도 시급 |
| 보안 | ⭐⭐ | AI 엔드포인트만 인증, 나머지 오픈 |
| 성능 | ⭐⭐⭐ | 페이지네이션 누락, SSR 미활용 |
| 완성도 | ⭐⭐⭐ | 핵심 기능 동작, 일부 stub 기능 남음 |

**전체 평가**: 기반 설계는 탄탄하고 코드 품질은 전반적으로 양호합니다. 즉각적인 비즈니스 위험은 **테스트 없음**과 **에러 처리 미흡**입니다. 핵심 비즈니스 로직(AI 작업 완료 → 상태 전이)에 최소한의 테스트를 추가하고, 사용자 경험의 onError 핸들러를 보완하는 것이 최우선입니다.
