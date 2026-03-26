# A. Next.js 16 App Router 기술 규칙
> 어떤 프로젝트에도 동일하게 적용되는 **범용 기술 규칙**
> 프로젝트별 규약(URL 포맷, 응답 구조 등)은 `B-프로젝트-규약.md` 참조

---

## 0. 개발 우선순위 (이 순서를 절대로 바꾸지 말 것)

```
1순위 — 유지보수
  소스가 길어도 괜찮다. 읽기 쉽고, 수정하기 쉽고, 변화에 강해야 한다.
  3개월 후의 내가, 처음 보는 동료가 이해할 수 있는가? 그게 기준이다.

2순위 — 보안
  입력은 항상 의심하라. 인증은 API 레이어에서 처리하라.
  보안 구멍은 유지보수보다 먼저 막아야 할 때가 있다.

3순위 — Next.js 베스트 프랙티스
  프레임워크가 권장하는 패턴을 따른다.
  단, 읽기 어렵게 만드는 "똑똑한 코드"는 거부한다.

주석 — 우선순위 밖의 의무
  뻔해 보여도 달아라. "왜"를 설명하라. 미래의 나를 위해 달아라.
```

---

## 1. 프로젝트 구조 원칙

```
src/
├── app/
│   ├── api/                    # ← 서버 전용. DB 접근, 비즈니스 로직 여기서만
│   │   ├── [entity]/
│   │   │   ├── route.ts        # GET(목록), POST(생성)
│   │   │   └── [id]/
│   │   │       └── route.ts    # GET(단건), PUT(수정), DELETE(삭제)
│   └── [entity]/               # ← 클라이언트. UI 렌더링만
│       ├── page.tsx            # 목록 페이지
│       └── [id]/
│           └── page.tsx        # 상세 페이지
├── components/
│   ├── ui/                     # 원자 UI (Button, Input, Dialog 등)
│   └── common/                 # 공통 비즈니스 컴포넌트 (DataGrid, ConfirmDialog 등)
└── lib/
    └── utils.ts                # 공통 유틸 함수
```

**핵심 원칙**
- `app/api/` = 서버. `app/[page]/` = 클라이언트. **절대 혼용하지 않는다.**
- API route 파일에 UI 코드 넣지 말 것. 페이지 파일에 DB 코드 넣지 말 것.
- 파일 하나가 하나의 책임만 갖는다. 커지면 쪼개라.

---

## 2. 주석 규칙 (의무)

### 파일 상단 — 역할 주석 (모든 파일 필수)
```ts
/**
 * UserListPage — 사용자 목록 페이지 (/users)
 *
 * 역할:
 *   - 사용자 목록 조회 (검색, 상태 필터, 페이지네이션)
 *   - 사용자 등록/수정 모달 제어
 *   - 선택 삭제 (ConfirmDialog 필수)
 *
 * 주요 기술:
 *   - TanStack Query: 목록 조회 및 캐시 무효화
 *   - TanStack Table: 컬럼 정의 및 렌더링
 */
```

### 함수 — "왜"를 설명하는 주석
```ts
// ✅ 좋은 주석 — 이유를 설명
// useYn = 'N'인 데이터는 논리삭제 처리된 것 → 목록에서 제외해야 함
const where = { useYn: "Y" };

// ❌ 나쁜 주석 — 코드를 그대로 반복
// where에 useYn Y를 설정한다
const where = { useYn: "Y" };
```

### 복잡한 조건 — 반드시 이유 명시
```ts
// params가 Next.js 16부터 Promise 타입으로 변경됨
// await 없이 사용하면 런타임 에러 발생 (빌드 에러로 잡히지 않음)
const { id } = await params;

// useSearchParams()는 클라이언트 컴포넌트에서만 동작
// 그리고 반드시 <Suspense> 경계 안에 있어야 함 (Next.js 제약)
// 없으면 hydration 에러 발생
```

---

## 3. Next.js 16 필수 패턴 (버전 종속 — 틀리면 런타임 에러)

### ① Route Params — await 필수
```ts
// app/api/[entity]/[id]/route.ts

// 타입 선언: params가 Promise임을 명시
type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: RouteParams) {
  // Next.js 16부터 params는 Promise — await 없으면 undefined
  const { id } = await params;
  const numId = parseInt(id);

  // id가 숫자가 아닌 경우 방어 처리 (보안: 비정상 입력 차단)
  if (isNaN(numId)) {
    return apiError("VALIDATION_ERROR", "유효하지 않은 ID입니다.", 400);
  }
  // ...
}
```

### ② useSearchParams — Suspense 래핑 필수
```tsx
// app/[entity]/page.tsx

"use client";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";

// useSearchParams를 직접 export default에서 쓰면 빌드/런타임 에러 발생
// 반드시 Suspense로 감싸진 내부 컴포넌트에서 사용해야 함
export default function EntityPage() {
  return (
    <Suspense fallback={null}>
      <EntityPageInner />
    </Suspense>
  );
}

function EntityPageInner() {
  // 이 컴포넌트는 Suspense 안에 있으므로 안전하게 사용 가능
  const searchParams = useSearchParams();
  const filter = searchParams.get("filter") ?? "";
  // ...
}
```

### ③ "use client" 선언
```tsx
// 파일 최상단 첫 줄에 위치해야 함 (주석보다 앞에 와야 함)
"use client";

// ✅ 올바른 위치
```

```tsx
// ❌ 잘못된 위치 (주석 아래에 오면 서버 컴포넌트로 인식될 수 있음)
// 이 파일은 클라이언트 컴포넌트
"use client";
```

---

## 4. 데이터 페칭 — TanStack Query 패턴

```tsx
// ─── 목록 조회 ────────────────────────────────────────────────
const { data, isLoading, error } = useQuery({
  // queryKey에 필터 값을 모두 포함해야 함
  // 하나라도 빠지면 필터 변경 시 캐시가 갱신되지 않음
  queryKey: ["entity", page, search, statusFilter],

  queryFn: () =>
    apiFetch<{ data: Row[]; pagination: Pagination }>(
      `/api/entity?page=${page}&pageSize=20&search=${search}&status=${statusFilter}`
    ),
});

// ─── 생성/수정 뮤테이션 ────────────────────────────────────────
const mutation = useMutation({
  mutationFn: (body: CreateEntityBody) =>
    apiFetch<Entity>("/api/entity", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),

  onSuccess: () => {
    // 목록 캐시 전체 무효화 — 다음 렌더링 시 자동 재조회
    queryClient.invalidateQueries({ queryKey: ["entity"] });
    toast.success("저장되었습니다.");
    setDialogOpen(false);
  },

  // 에러는 반드시 사용자에게 표시
  onError: (err: Error) => toast.error(err.message),
});
```

---

## 5. 성능 — 병렬 처리

```ts
// ❌ 순차 실행 — 느림 (A 완료 후 B 시작)
const screens = await fetchScreens();
const areas   = await fetchAreas();

// ✅ 병렬 실행 — 빠름 (A, B 동시 시작)
// 의존 관계가 없는 API 호출은 항상 Promise.all로 묶는다
const [screens, areas] = await Promise.all([
  fetchScreens(),
  fetchAreas(),
]);
```

### Prisma 싱글톤 패턴 (dev 환경 연결 폭발 방지)
```ts
// lib/prisma.ts
// Next.js dev 서버는 hot reload 시마다 모듈을 재실행함
// new PrismaClient()를 매번 호출하면 연결이 계속 쌓여 DB가 뻗음
// globalThis에 인스턴스를 보관해서 재사용

import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

// production에서는 globalThis 캐싱 불필요 (재시작 없음)
if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
```

---

## 6. 보안 체크리스트

### API Route 기본 보안
```ts
export async function POST(request: NextRequest) {
  // ① 인증 확인 (프로젝트 규약에 따라 방식 결정)
  // const session = await getSession(request);
  // if (!session) return apiError("UNAUTHORIZED", "로그인이 필요합니다.", 401);

  // ② 입력값 파싱 — JSON 파싱 실패 방어
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError("VALIDATION_ERROR", "올바른 JSON 형식이 아닙니다.", 400);
  }

  // ③ 입력값 검증 — Zod 등으로 타입+값 동시 검증
  // Prisma는 parameterized query를 사용하므로 SQL injection은 방어되지만
  // 비즈니스 규칙 검증은 직접 해야 함
  if (!body || typeof body !== "object") {
    return apiError("VALIDATION_ERROR", "요청 본문이 올바르지 않습니다.", 400);
  }

  // ④ 처리
  // ...
}
```

### ID 파라미터 검증
```ts
// 외부에서 받는 모든 ID는 숫자 검증 필수
// 문자열 "abc"나 음수가 들어왔을 때 DB 에러 대신 명확한 메시지 반환
const numId = parseInt(id);
if (isNaN(numId) || numId <= 0) {
  return apiError("VALIDATION_ERROR", "유효하지 않은 ID입니다.", 400);
}
```

### 환경변수
```ts
// 민감한 값은 절대 하드코딩 금지
// process.env.SOME_SECRET 형태로만 사용
// .env.local은 .gitignore에 포함 (절대 커밋 금지)
const apiKey = process.env.API_KEY;
if (!apiKey) {
  throw new Error("API_KEY 환경변수가 설정되지 않았습니다.");
}
```

---

## 7. 유지보수 원칙

### ① 명시적 코드 — 똑똑한 코드보다 읽기 쉬운 코드
```ts
// ❌ 똑똑한 코드 — 의도를 파악하기 어려움
const result = data?.items?.filter(Boolean)?.map(({ id, name }) => ({ id, label: name })) ?? [];

// ✅ 명시적 코드 — 각 단계의 의도가 분명함
// null/undefined 아이템 제거
const validItems = data?.items?.filter(Boolean) ?? [];

// 드롭다운 옵션 형식으로 변환 (id + 표시 레이블)
const options = validItems.map((item) => ({
  id:    item.id,
  label: item.name,
}));
```

### ② 마법 숫자/문자열 금지
```ts
// ❌ 마법 숫자 — 10이 왜 10인지 알 수 없음
if (failCount >= 10) lockAccount();

// ✅ 이름 있는 상수 — 의도가 명확
// 5회 연속 실패 시 계정 잠금 (보안 정책)
const MAX_LOGIN_FAIL_COUNT = 5;
if (failCount >= MAX_LOGIN_FAIL_COUNT) lockAccount();
```

### ③ 변경 범위를 좁혀라
```ts
// 상수, 타입, 설정값은 한 곳에서 관리
// 나중에 바꿀 때 한 파일만 수정하면 되도록

// lib/constants.ts
export const PAGE_SIZE_DEFAULT = 20;
export const STATUS_LABELS: Record<string, string> = {
  DRAFT:   "초안",
  REVIEW:  "검토중",
  DONE:    "완료",
};
```

### ④ 에러는 명확하게
```ts
// ❌ 정보 없는 에러
throw new Error("error");

// ✅ 맥락 있는 에러
throw new Error(`사용자(id=${userId})를 찾을 수 없습니다. DB 응답: ${JSON.stringify(dbResult)}`);
```

### ⑤ 컴포넌트 분리 기준
```
- 같은 JSX 블록이 2곳 이상 → 컴포넌트 추출
- 파일이 300줄 초과 → 분리 검토
- 상태가 5개 초과 → 커스텀 훅 분리 검토
- 단, 억지로 쪼개서 오히려 추적이 어려워지면 그냥 둔다
```

---

## 8. 유지보수 안티패턴 (하지 말 것)

| 안티패턴 | 이유 |
|---------|------|
| `any` 타입 남발 | 타입 에러를 런타임까지 미룸 → 디버깅 지옥 |
| 인라인 API 호출 (`fetch()` 직접) | apiFetch 래퍼 없으면 에러 처리 제각각 |
| `window.confirm()` 으로 삭제 확인 | 브라우저마다 다르고 UX 최악. ConfirmDialog 사용 |
| 하드코딩된 URL 문자열 | `/api/users` 대신 상수나 유틸 함수 |
| 컴포넌트 내 비즈니스 로직 | 테스트 불가, 재사용 불가 → lib/이나 hooks/로 분리 |
| 에러 무시 (`catch {}`) | 반드시 로깅 또는 사용자 알림 처리 |
| 조건 없는 목록 조회 | 논리삭제 필터(`useYn: "Y"` 등) 항상 포함 |
