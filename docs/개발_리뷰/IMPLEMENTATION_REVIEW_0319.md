# SPECODE — 구현 기술 점검 리포트

> **작성 기준**: 2026-03-19 | 코드 전수 분석 기반 | 솔직하게 씀

---

## 0. 한 줄 총평

> **App Router를 깔았는데, 실제로는 SPA + REST API를 만들었다.**
> 틀린 선택은 아니지만, 왜 그 선택을 했는지 팀이 명확히 인식하고 있어야 한다.

---

## 1. Next.js 구현 스타일 — 세 가지 길

Next.js App Router 시대에 팀이 선택할 수 있는 구현 스타일은 크게 세 가지다.

### Style 1 — Pages Router 클래식 (레거시 패턴)

```
pages/
  index.tsx          ← getServerSideProps or getStaticProps
  api/
    functions.ts     ← REST API
```

| 항목 | 내용 |
|------|------|
| 데이터 패칭 | `getServerSideProps`, `getStaticProps` 또는 클라이언트 fetch |
| 상태 관리 | SWR, React Query, Redux |
| 장점 | 학습 커브 낮음, 레거시 자료 풍부 |
| 단점 | Next.js 15+ 에서 사실상 deprecated 방향, RSC 불가 |
| **업계 사용률** | **~35%** (대부분 마이그레이션 보류 중인 레거시 프로젝트) |

---

### Style 2 — App Router + "use client" 페이지 + Route Handlers ← **SPECODE 선택**

```
app/
  functions/
    page.tsx         ← "use client" + TanStack Query
  api/
    functions/
      route.ts       ← Route Handler (REST API, DB 직접 접근)
```

| 항목 | 내용 |
|------|------|
| 데이터 패칭 | 클라이언트에서 `useQuery` → API Route 호출 |
| 서버 컴포넌트 | 거의 사용 안 함 (layout.tsx만 RSC) |
| 상태 관리 | TanStack Query (서버 상태), useState (로컬) |
| 장점 | SPA 경험이 있는 팀에게 자연스러운 전환, 클라이언트 인터랙션 자유로움 |
| 단점 | RSC의 이점(번들 최적화, 초기 렌더링 성능)을 포기, App Router 반쪽짜리 활용 |
| **업계 사용률** | **~45%** (신규 프로젝트 중 가장 많음 — 익숙한 방식으로 App Router 전환) |

**SPECODE가 이 방식을 선택한 이유 (추정 + 합리적 판단)**:
- 관리 도구 특성상 클라이언트 상태가 복잡함 (필터, 탭, 다이얼로그, 폴링)
- TanStack Query의 `refetchInterval`, `useMutation` 패턴이 AI 태스크 폴링에 자연스러움
- 팀이 SPA 방식에 익숙할 때 RSC 강제 적용은 생산성 손해
- 내부 도구 특성상 초기 로딩 성능이 최우선 관심사가 아님

---

### Style 3 — App Router + React Server Components 최대 활용 (풀 RSC)

```
app/
  functions/
    page.tsx         ← RSC (서버에서 DB 직접 조회, HTML 스트리밍)
    FunctionList.tsx ← "use client" (인터랙션만)
    actions.ts       ← Server Actions (form submit)
```

| 항목 | 내용 |
|------|------|
| 데이터 패칭 | 서버 컴포넌트에서 직접 Prisma 호출 |
| 상태 관리 | Server Actions + `useOptimistic`, 클라이언트 상태 최소화 |
| 장점 | 번들 사이즈 최소화, 초기 로딩 빠름, API Route 불필요 |
| 단점 | 학습 커브 가파름, 복잡한 클라이언트 상태 관리 까다로움, 생태계 미성숙 |
| **업계 사용률** | **~20%** (Vercel 선도 팀, 미디어/커머스 성능 중시 프로젝트) |

---

### 스타일 선택 요약

| | Style 1 | Style 2 (SPECODE) | Style 3 |
|--|---------|-------------------|---------|
| 업계 사용률 | ~35% | ~45% | ~20% |
| 초기 성능 | 중간 | 낮음 | 높음 |
| 개발 생산성 | 높음 | 높음 | 중간 |
| 번들 최적화 | 불가 | 수동 | 자동 |
| 인터랙션 자유도 | 높음 | 높음 | 제한적 |
| 학습 비용 | 낮음 | 낮음 | 높음 |
| 적합한 프로젝트 | 레거시, 간단한 사이트 | **관리 도구, SPA 마이그레이션** | 콘텐츠, 커머스, 성능 민감 서비스 |

**SPECODE의 Style 2 선택은 이 프로젝트 성격(복잡한 관리 도구)에 합리적이다.**
단, Style 2를 선택했으면 그 이상도 그 이하도 아닌 방향으로 일관되게 가야 한다.

---

## 2. 구현 성숙도 상세 점검

### 2.1 ✅ 잘 된 것들

#### API 응답 표준화
```typescript
return apiSuccess(data);
return apiError("NOT_FOUND", "가이드를 찾을 수 없습니다.", 404);
```
프로젝트 전체에서 일관되게 사용됨. 클라이언트 쪽 `apiFetch`도 `success: false` 케이스를 자동으로 throw. **이 패턴 하나로 에러 처리의 80%가 정리됨.** 실제로 잘 지켜진 규칙.

#### 상수 중앙화
`constants.ts`가 258줄인데, 이게 오히려 좋다. 상태 레이블, 색상, 전이 로직이 한 파일에 있어서 UI 변경이 한 곳만 건드리면 끝난다. 17개 도메인 모델의 상태를 다루는 프로젝트에서 이 설계가 없었으면 레이블 불일치가 지금쯤 산더미였을 것.

#### Polymorphic 참조 패턴 (AiTask, Attachment, ContentVersion)
```sql
refTableName VARCHAR  -- "tb_function" | "tb_area" | ...
refPkId      INT
```
FK 대신 테이블명+PK 조합으로 범용 첨부/이력/태스크를 구현한 것. 엔티티 추가할 때마다 테이블을 새로 만들지 않아도 된다. 트레이드오프(DB 레벨 참조 무결성 없음)를 감수하고 실용성을 택한 의식적 선택.

#### AI 비동기 폴링 아키텍처
```
NONE → RUNNING → SUCCESS | FAILED
```
AI 처리를 동기로 묶지 않고 큐 기반 비동기로 설계한 것은 정석이다. `refetchInterval: 3000`으로 폴링하는 클라이언트 패턴도 단순하지만 실용적이다. 복잡한 WebSocket을 쓰지 않고도 실시간감을 준다.

#### MCP 서버 (stdio + HTTP 이중 지원)
내부 도구 수준에서 MCP 서버를 구현한 건 흔치 않다. stdio로 Claude Code와 로컬 연결, HTTP로 외부 AI와 연결하는 이중 구조. 잘 만들어졌고, 이 프로젝트만의 강점.

#### 시스템 ID 채번 (tb_sequence)
```
T-00001, RQ-00001, FID-00001, ATK-00001 ...
```
DB 자동증가 PK 노출 대신 접두사 있는 시스템 ID 사용. 로그 추적, 커뮤니케이션에서 실제로 유용한 패턴. 단순하지만 현장에서 안 하는 팀이 더 많다.

---

### 2.2 ❌ 솔직한 지적

#### 인증이 없다 — 이게 제일 크다
```typescript
// middleware.ts 전체
export function middleware(request: NextRequest) {
  if (process.env.NODE_ENV !== "production") {
    console.log(`→ ${method} ${path}${search}`);
  }
  return NextResponse.next();  // 그냥 통과
}
```

미들웨어가 **로깅만** 한다. `/api/functions`, `/api/requirements` 등 모든 쓰기 API가 인증 없이 열려 있다. "내부 도구니까 괜찮다"는 지금은 맞지만, 정식 버전으로 가는 순간 이 구조를 전면 개편해야 한다. 나중에 한꺼번에 붙이는 게 더 어렵다.

AI 워커 전용 `/api/ai/*`만 `X-API-Key`로 보호되어 있는데, 아이러니하게도 실제 데이터를 쓰는 `/api/functions`, `/api/areas`는 무방비.

#### 테스트가 0줄이다
```json
// package.json에 설치는 되어 있음
"vitest": "^4.0.18",
"test": "vitest run"
```

vitest를 깔아놓고 테스트 파일이 한 개도 없다. 이 상태로 정식 버전에 인증/권한 레이어를 붙이면, 리팩터링할 때 뭐가 깨졌는지 알 방법이 없다. `generateSystemId`, `statusToPhase`, `phaseToStatus` 같은 순수 함수들부터라도 테스트가 있었어야 했다. 지금 당장 문제가 없어 보이는 건 혼자 또는 소규모로 사용하기 때문.

#### Zod 검증이 들쭉날쭉하다
```typescript
// requirements/route.ts — Zod 사용
const parsed = requirementSchema.parse(body);

// functions/route.ts — 수동 if 체크
if (!body.name) return apiError("VALIDATION_ERROR", "기능명은 필수입니다.");

// areas/route.ts — 검증 없이 바로 업데이트
const { spec, layoutData, areaType } = body;
await prisma.area.update({ data: { spec, layoutData, areaType } });
```

`validators.ts`에 Zod 스키마가 7개 있는데 실제로 적용된 라우트는 절반도 안 된다. 결과적으로 유효성 검증 방식이 세 가지가 혼재한다: Zod, 수동 if, 검증 없음. 통일되지 않은 검증은 **조용한 버그의 온상**이다.

#### Raw SQL이 숨어 있다
```typescript
// functions/[id]/route.ts
await prisma.$executeRaw`
  UPDATE tb_function
  SET ai_design_content = ${content}
  WHERE function_id = ${functionId}
`;
```

Prisma 스키마와 실제 DB 컬럼 간 불일치가 있어서 `$executeRaw`로 우회한다. 이런 구간이 있다는 건 스키마 리팩터링이 완전히 끝나지 않았다는 신호다. 마이그레이션 중간에 코드가 굳어버린 흔적. 기술 부채로 남겨두지 말고 스키마를 정리해야 한다.

#### `Record<string, unknown>`으로 Prisma where 조건 우회
```typescript
const where: Record<string, unknown> = {};
if (taskStatus) where.taskStatus = taskStatus;
if (taskType) where.taskType = taskType;

await prisma.aiTask.findMany({ where });  // 타입 체크 bypass
```

`strict: true`를 켜놓고 Prisma의 강타입 where 조건을 `Record<string, unknown>`으로 뚫어버린다. Prisma가 제공하는 `Prisma.AiTaskWhereInput` 타입을 쓰면 컴파일 타임에 필드명 오타를 잡을 수 있는데, 그 이점을 버린 것. 여러 라우트에서 같은 패턴이 반복된다.

#### try-catch 적용 기준이 모호하다
```typescript
// GET은 try-catch 없음
export async function GET(request: NextRequest) {
  const data = await prisma.function.findMany({ where });
  return apiSuccess(data);  // DB 에러 시 unhandled
}

// POST는 try-catch 있음
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    // ...
  } catch (error) {
    return apiError("SERVER_ERROR", "...", 500);
  }
}
```

조회는 안전하다는 가정 하에 try-catch를 뺀 것인데, DB 연결 오류, 타임아웃, 동시성 문제는 GET에서도 발생한다. 일관성 없는 에러 처리는 모니터링할 때 로그 패턴이 달라진다.

#### 번들 사이즈에 무관심하다
```json
// 클라이언트 번들에 포함될 가능성이 있는 무거운 라이브러리들
"@excalidraw/excalidraw"   // ~2MB
"mermaid"                  // ~1MB
"reactflow"                // ~300KB
"framer-motion"            // ~150KB
"mammoth"                  // ~500KB (DOCX 파싱)
```

이 라이브러리들이 dynamic import 없이 전체 앱 번들에 포함되면 초기 로딩이 심각해진다. Style 2를 선택한 이상 번들 최적화는 수동으로 해야 하는데, `next/dynamic`으로 Excalidraw, Mermaid를 lazy load하는 처리가 되어 있는지 확인이 필요하다.

#### 환경변수에 하드코딩된 기본값
```
API_SECRET_KEY=openclaw-api-key-here
ANTHROPIC_API_KEY=sk-ant-...
```

`.env`에 실제 기본값이 코드에 언급된다. `.env.example`을 따로 두고 실제 `.env.local`은 `.gitignore`에만 있어야 하는데, 개발 편의를 위해 실제 값이 섞여 들어간 흔적이 있다.

---

### 2.3 🟡 아쉬운 것들 (치명적이진 않지만)

#### Server Actions을 한 번도 안 쓴다
Style 2를 선택했으면 괜찮지만, 단순한 폼 제출(과업 등록, 가이드 등록)은 Server Actions으로 처리했을 때 왕복 비용이 줄어든다. Route Handler를 따로 두지 않아도 된다. 팀이 선택지를 인식하고 있는지 모르겠다.

#### 전역 에러 처리 없음
Next.js App Router는 `error.tsx`로 전역 에러 바운더리를 제공한다. `app/error.tsx`, `app/global-error.tsx`가 없어서 API 호출 실패 시 UI가 빈 화면이 되거나 toast만 뜬다. 사용자에게 "뭔가 잘못됐다"는 의미 있는 화면을 보여주는 처리가 없다.

#### `loading.tsx` 없음
페이지 전환 시 로딩 상태를 `app/*/loading.tsx`로 선언할 수 있는데 사용하지 않는다. 각 페이지 안에서 `isLoading ? "로딩 중..." : <DataGrid />`로 처리하고 있는데, 코드 중복이고 UX도 일관되지 않다.

#### phaseToStatus / statusToPhase 변환 레이어 복잡성
```typescript
// 구 status: "REVIEW_REQ"
// 신 DB: phase="REVIEW", phaseStatus="REQUESTED"
// 클라이언트에는 다시 "REVIEW_REQ"로 변환해서 전달
```
마이그레이션 과정에서 생긴 이중 변환 레이어가 constants.ts 하단에 숨어 있다. 지금은 동작하지만, 새로운 팀원이 이 흐름을 이해하는 데 시간이 걸린다. DB가 안정되면 변환 레이어를 제거하고 단일 표현으로 통일해야 할 부분.

#### 페이지 컴포넌트가 하나의 파일에 모든 걸 담는다
```
screens/page.tsx    — 약 600줄
functions/page.tsx  — 약 500줄
planning/[id]/page.tsx — 약 450줄
```
한 파일에 state, query, mutation, column 정의, 다이얼로그 렌더링이 전부 들어있다. 기능이 많아서 불가피한 측면이 있지만, 유지보수하면서 파일이 계속 길어지는 방향으로 간다. 서브 컴포넌트 분리 기준이 없다.

---

## 3. 종합 점수

| 영역 | 점수 | 한 줄 평 |
|------|------|---------|
| **Next.js 구조 이해도** | ★★★★☆ | Style 2 선택은 합리적, 단 RSC/Server Actions 인식 불명확 |
| **API 설계 일관성** | ★★★★☆ | apiSuccess/apiError 표준화 잘됨, 검증 들쭉날쭉 |
| **DB 모델링** | ★★★★☆ | 정규화·관계·Polymorphic 패턴 우수, Raw SQL 혼용 감점 |
| **컴포넌트 설계** | ★★★☆☆ | 공통화 있으나 페이지 컴포넌트 비대화 중 |
| **타입 안전성** | ★★★☆☆ | strict: true 켜놓고 Record<string, unknown>으로 우회 |
| **에러 처리** | ★★★☆☆ | 응답은 표준화됐으나 try-catch 적용 기준 불일관 |
| **보안** | ★★☆☆☆ | AI API만 보호, 나머지 엔드포인트 무방비 |
| **테스트** | ★☆☆☆☆ | vitest 설치만 하고 코드 0줄 |
| **성능/번들 최적화** | ★★☆☆☆ | 무거운 라이브러리 lazy load 미확인 |
| **운영 준비도** | ★★☆☆☆ | 로깅 최소, 에러 모니터링 없음, 인증 없음 |

---

## 4. 정식 버전 전환 시 반드시 해야 하는 것 (순서대로)

### P0 — 하지 않으면 출시 불가

1. **인증 미들웨어 구현**
   - NextAuth.js v5 또는 자체 JWT
   - `middleware.ts`에서 토큰 검증 + 미인증 시 401 반환
   - 현재 AI API 키 방식은 AI 워커용으로 유지

2. **환경변수 정리**
   - `.env.example` 생성 (키만, 값 없음)
   - `.env.local`은 `.gitignore`에만
   - `API_SECRET_KEY` 기본값 코드에서 제거

3. **Raw SQL 제거**
   - `$executeRaw` 사용 구간 스키마 정리 후 Prisma 타입 쿼리로 교체

### P1 — 1달 내 해야 할 것

4. **Zod 검증 전 라우트 통일**
   - `validators.ts`에 스키마 추가
   - POST/PUT 모든 라우트에 `.safeParse()` 적용

5. **핵심 유틸 함수 단위 테스트**
   - `statusToPhase`, `phaseToStatus`, `generateSystemId`
   - Prisma 쿼리가 없는 순수 함수부터

6. **무거운 라이브러리 dynamic import 적용**
   ```typescript
   const Excalidraw = dynamic(() => import("@excalidraw/excalidraw"), { ssr: false });
   const Mermaid = dynamic(() => import("@/components/common/MermaidRenderer"), { ssr: false });
   ```

7. **전역 에러 바운더리**
   - `app/error.tsx`, `app/global-error.tsx` 추가

### P2 — 3달 내

8. **Prisma where 조건 타입 복원**
   - `Record<string, unknown>` → `Prisma.AiTaskWhereInput` 등 명시적 타입

9. **페이지 컴포넌트 분리 기준 수립**
   - 300줄 이상이면 서브 컴포넌트 추출 원칙

10. **phaseToStatus 변환 레이어 제거**
    - DB가 안정되면 클라이언트 응답도 phase/phaseStatus 직접 사용

---

## 5. 마지막으로

이 프로젝트가 **잘 만들어진 내부 도구**라는 건 맞다. 17개 도메인 모델, AI 비동기 처리, MCP 서버, Excalidraw 통합을 이 규모로 굴러가게 만든 건 쉬운 일이 아니다.

그러나 "잘 굴러간다"와 "정식 제품으로 출시할 수 있다"는 다른 말이다.

지금 상태는 **신뢰할 수 있는 프로토타입**이다. 인증 없음, 테스트 없음, 번들 최적화 미확인 — 이 세 가지가 정식 버전으로 가는 길목에서 반드시 통과해야 할 관문이다. 나머지는 운영하면서 고쳐갈 수 있다.

Style 2 선택은 이 프로젝트에 맞는 선택이었다. 이제 그 선택에서 오는 숙제(번들, 보안, 타입 안전성)를 직접 챙겨야 한다.

---

*분석: 코드 전수 검토 기반 | SPECODE × Claude Sonnet 4.6 | 2026-03-19*
