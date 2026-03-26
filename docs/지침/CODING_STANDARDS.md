# SPECODE 개발 표준 가이드

> **이 문서의 목적**: 새 기능을 만들거나 기존 코드를 수정할 때 반드시 지켜야 할 규칙들.
> "왜 이렇게 해야 해?"를 설명하는 게 아니라, "이렇게 해"를 알려주는 문서.

---

## 0. 우리가 선택한 구현 스타일

SPECODE는 **Style 2 — App Router + "use client" 페이지 + Route Handlers** 방식으로 일관되게 간다.

```
app/
  functions/
    page.tsx         ← "use client" + TanStack Query
  api/
    functions/
      route.ts       ← Route Handler (DB 직접 접근)
```

- 서버 컴포넌트(RSC)를 억지로 쓰지 않는다 — 관리 도구 특성상 클라이언트 상태가 복잡하다
- Server Actions도 새 기능에서 실험적으로 쓸 수 있지만, 기존 패턴 깨지 않는 선에서

---

## 1. API 라우트 작성 규칙

### 1-1. 응답은 무조건 apiSuccess / apiError

```ts
import { apiSuccess, apiError } from "@/lib/utils";

// ✅ 올바른 방법
return apiSuccess(data);
return apiError("NOT_FOUND", "기능을 찾을 수 없습니다.", 404);

// ❌ 이렇게 하지 말 것
return NextResponse.json({ data });
return NextResponse.json({ error: "not found" }, { status: 404 });
```

에러 코드 컨벤션:
| 코드 | 상황 |
|------|------|
| `VALIDATION_ERROR` | 입력값이 잘못됨 |
| `NOT_FOUND` | 리소스 없음 |
| `SERVER_ERROR` | 예상치 못한 서버 오류 |

---

### 1-2. 모든 POST / PUT 라우트에 Zod 검증 적용

```ts
import { z } from "zod";
import { apiError, apiSuccess } from "@/lib/utils";

const schema = z.object({
  name: z.string().min(1, "이름은 필수입니다."),
  priority: z.enum(["HIGH", "MEDIUM", "LOW"]).optional(),
});

export async function POST(request: NextRequest) {
  const body = await request.json();
  const result = schema.safeParse(body);

  // ✅ safeParse → 첫 번째 에러 메시지 반환
  if (!result.success) {
    return apiError("VALIDATION_ERROR", result.error.issues[0].message, 400);
  }

  const data = result.data; // 여기서부터 타입 안전
  // ...
}
```

자주 쓰는 스키마는 `src/lib/validators.ts`에 추가해서 재사용한다.

**GET에는 Zod 불필요** — 쿼리 파라미터는 문자열 타입 변환 정도만.

---

### 1-3. 모든 라우트에 try-catch

GET이든 POST든 DB 오류는 어디서나 날 수 있다.

```ts
// ✅ 공통 패턴
export async function GET(request: NextRequest) {
  try {
    const data = await prisma.function.findMany({ where });
    return apiSuccess(data);
  } catch (error) {
    console.error("[GET /api/functions]", error);
    return apiError("SERVER_ERROR", "조회 중 오류가 발생했습니다.", 500);
  }
}
```

---

### 1-4. Route Params — await 필수 (Next.js 16)

```ts
// ✅ 올바른 방법
type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: RouteParams) {
  const { id } = await params;  // await 없으면 타입 에러
  const numId = parseInt(id);
  // ...
}

// ❌ 이렇게 하면 Next.js 16에서 오류
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const { id } = params;  // Promise를 await 없이 사용
}
```

---

### 1-5. Prisma where 조건은 명시적 타입 사용

```ts
import { Prisma } from "@prisma/client";

// ✅ 올바른 방법
const where: Prisma.AiTaskWhereInput = {};
if (taskStatus) where.taskStatus = taskStatus as AiTaskStatus;
if (taskType)   where.taskType = taskType;

// ❌ 타입 우회하지 말 것 — 필드명 오타를 컴파일 타임에 못 잡음
const where: Record<string, unknown> = {};
```

---

### 1-6. Raw SQL 금지 — 스키마를 먼저 정리할 것

```ts
// ❌ 이렇게 하지 말 것
await prisma.$executeRaw`
  UPDATE tb_function SET ai_design_content = ${content} WHERE function_id = ${id}
`;

// ✅ 먼저 schema.prisma에 필드 추가 후
await prisma.function.update({
  where: { functionId: id },
  data: { aiDesignContent: content },
});
```

스키마에 없는 필드가 필요하면 `$executeRaw` 대신 마이그레이션을 먼저 돌린다:
```bash
npx prisma migrate dev --name "add_ai_design_content"
```

---

### 1-7. System ID 생성

```ts
import { generateSystemId } from "@/lib/sequence";

// 접두사 규칙 — 새 엔티티 추가 시 여기에 등록
// T     → 과업 (Task)
// RQ    → 요구사항 (Requirement)
// US    → 사용자 스토리 (UserStory)
// FID   → 기능 (Function)
// AR    → 영역 (Area)
// ATK   → AI 태스크 (AiTask)
// SG    → 표준 가이드 (StandardGuide)
// UW    → 단위업무 (UnitWork)

const systemId = await generateSystemId("RQ");  // → "RQ-00001"
```

DB PK(숫자)를 외부에 노출하지 않는다. API 응답과 로그에는 항상 systemId를 쓴다.

---

## 2. 컴포넌트 작성 규칙

### 2-1. 페이지 파일 분리 기준

한 파일이 **300줄을 넘으면** 분리를 고려한다. 분리 순서:

1. **컬럼 정의** → `columns.ts` (또는 같은 폴더의 별도 파일)
2. **다이얼로그** → `XxxDialog.tsx`
3. **폼** → `XxxForm.tsx`

```
app/functions/
  page.tsx             ← state, query, 레이아웃 (200~300줄 목표)
  columns.tsx          ← TanStack Table 컬럼 정의
  FunctionDialog.tsx   ← 등록/수정 다이얼로그
```

---

### 2-2. 무거운 라이브러리는 dynamic import 필수

아래 라이브러리는 반드시 lazy load:

```ts
// ✅ 필수 적용
const Excalidraw = dynamic(
  () => import("@excalidraw/excalidraw").then((m) => ({ default: m.Excalidraw })),
  { ssr: false, loading: () => <div>로딩 중...</div> }
);

const MermaidRenderer = dynamic(
  () => import("@/components/common/MermaidRenderer"),
  { ssr: false }
);
```

대상 라이브러리: `@excalidraw/excalidraw`, `mermaid`, `reactflow`, `mammoth`

---

### 2-3. 공통 로딩 / 에러 컴포넌트 사용

```tsx
// 페이지 전환 로딩 — app/loading.tsx 자동 적용됨
// 컴포넌트 내 로딩은 공통 Skeleton 또는 텍스트 사용
if (isLoading) return <div className="p-8 text-center text-muted-foreground">로딩 중...</div>;
if (isError)   return <div className="p-8 text-center text-destructive">데이터를 불러오지 못했습니다.</div>;
```

---

## 3. 타입 & TypeScript 규칙

### 3-1. any, unknown으로 타입 우회 금지

```ts
// ❌ 이렇게 하지 말 것
const body: any = await request.json();
const where: Record<string, unknown> = {};

// ✅ 명시적으로 타입 정의
interface UpdateBody { name: string; priority?: "HIGH" | "MEDIUM" | "LOW"; }
const body: UpdateBody = await request.json();
```

---

### 3-2. Prisma 생성 타입 적극 활용

```ts
import type { Prisma, AiTask } from "@prisma/client";

// where 조건
const where: Prisma.AiTaskWhereInput = { taskStatus: "NONE" };

// include 포함 결과 타입
type TaskWithRequirements = Prisma.TaskGetPayload<{
  include: { requirements: { include: { userStories: true } } }
}>;
```

---

## 4. 상수 & 상태 관리 규칙

### 4-1. 도메인 상수는 constants.ts에만

상태 레이블, 색상, 변환 로직은 `src/lib/constants.ts`에서만 관리한다.

```ts
// ✅ constants.ts에서 가져다 씀
import { FUNCTION_STATUS_LABELS, phaseToStatus } from "@/lib/constants";

// ❌ 로컬에서 재정의하지 말 것
const STATUS_LABELS = { DRAFT: "초안", REVIEW_REQ: "검토 요청" }; // 중복!
```

---

### 4-2. TanStack Query 키 규칙

```ts
// queryKey는 [리소스명, 필터 객체] 형식
useQuery({ queryKey: ["functions", { areaId }], queryFn: () => fetchFunctions(areaId) });
useQuery({ queryKey: ["ai-tasks", { taskStatus: "NONE" }], ... });

// invalidation
queryClient.invalidateQueries({ queryKey: ["functions"] }); // 리소스 전체 무효화
```

---

## 5. 환경변수 규칙

### 5-1. .env.local에만 실제 값 — .env에는 예시만

```bash
# .env (커밋 가능 — 키 이름만, 값 없음)
DATABASE_URL=
AI_API_KEY=
ANTHROPIC_API_KEY=

# .env.local (커밋 불가 — .gitignore에 포함됨, 실제 값)
DATABASE_URL=file:./dev.db
AI_API_KEY=your-actual-key-here
ANTHROPIC_API_KEY=sk-ant-...
```

`.env.local`에서만 실제 값을 관리하고, `.env`는 키 목록으로만 사용한다.

---

### 5-2. 서버 전용 변수 vs 클라이언트 노출 변수

```ts
// 서버에서만 사용 (API Route, Server Component)
process.env.AI_API_KEY          // ✅ 서버 전용

// 클라이언트에 노출 가능한 변수만 NEXT_PUBLIC_ 접두사
process.env.NEXT_PUBLIC_API_URL // ✅ 클라이언트도 사용 가능

// ❌ 절대 클라이언트에 노출하면 안 되는 것들
// AI_API_KEY, DATABASE_URL, ANTHROPIC_API_KEY
```

---

## 6. 보안 규칙

### 6-1. API 인증 (정식 버전 기준)

```
일반 API (/api/functions, /api/areas, ...)  → 세션 토큰 검증
AI 워커 API (/api/ai/*)                     → X-API-Key 검증 (현행 유지)
```

미들웨어에서 경로별 분기 처리. 현재 개발 중이라면 최소한 `/api/` 경로는 내부 IP 또는 기본 인증으로 막아두길 권장.

### 6-2. 사용자 입력 직접 SQL 삽입 금지

```ts
// ❌ 절대 하지 말 것
await prisma.$queryRaw`SELECT * FROM tb_function WHERE name = '${userInput}'`;

// ✅ Prisma 파라미터 바인딩 사용
await prisma.$queryRaw`SELECT * FROM tb_function WHERE name = ${userInput}`;
// 또는
await prisma.function.findMany({ where: { name: userInput } });
```

---

## 7. 테스트 규칙

### 7-1. 순수 함수는 반드시 테스트

DB, 네트워크 없이 실행되는 순수 함수는 테스트를 작성한다:

```ts
// src/lib/__tests__/constants.test.ts
import { phaseToStatus, statusToPhase } from "@/lib/constants";

test("REVIEW_REQ → phase/phaseStatus 변환", () => {
  const result = statusToPhase("REVIEW_REQ");
  expect(result.phase).toBe("REVIEW");
  expect(result.phaseStatus).toBe("REQUESTED");
});

test("역변환: phase + phaseStatus → REVIEW_REQ", () => {
  expect(phaseToStatus("REVIEW", "REQUESTED", false)).toBe("REVIEW_REQ");
});
```

대상: `phaseToStatus`, `statusToPhase`, `generateSystemId` (mock), 날짜 포맷 유틸 등

### 7-2. 테스트 실행

```bash
npx vitest run          # 전체 실행
npx vitest watch        # 변경 감지 모드
npx vitest run --coverage  # 커버리지 포함
```

---

## 8. 자주 쓰는 개발 명령

```bash
npm run dev                                   # 개발 서버 (http://localhost:3000)
npx prisma studio                             # DB GUI
npx prisma migrate dev --name "변경명"         # 스키마 변경 적용
npx prisma generate                           # Prisma 클라이언트 재생성
npx tsc --noEmit                              # 타입 에러만 확인 (빌드 없이)
npx vitest run                                # 테스트 실행
```

---

## 9. 체크리스트 — PR 올리기 전

- [ ] `npx tsc --noEmit` 에러 없음
- [ ] 새 API 라우트에 try-catch + Zod 검증 적용
- [ ] `apiSuccess` / `apiError`로 응답 반환
- [ ] Prisma where 조건에 `Record<string, unknown>` 미사용
- [ ] 새 `$executeRaw` 추가하지 않음
- [ ] 무거운 라이브러리는 `dynamic()` 사용
- [ ] `.env.local`에 실제 값 넣고 `.env`에는 키만

---

## 10. 알려진 기술 부채 (건드리기 전에 확인)

| 항목 | 상태 | 건드릴 때 주의 |
|------|------|----------------|
| `phaseToStatus` / `statusToPhase` 이중 변환 | 의도적 유지 중 (DB 마이그레이션 완료 후 제거 예정) | 클라이언트는 여전히 `REVIEW_REQ` 형식 기대 |
| `$executeRaw` (ai_design_content) | 제거 예정 | schema.prisma 정리 후 Prisma 쿼리로 교체 |
| `/api/functions` 등 인증 없음 | 내부 도구 단계 | 정식 버전 전환 시 미들웨어 인증 추가 필수 |
| 테스트 0개 | 순수 함수부터 순차 추가 예정 | 기존 로직 변경 시 테스트 먼저 작성 후 수정 |

---

*최종 수정: 2026-03-20 | 기반: IMPLEMENTATION_REVIEW_0319.md*
