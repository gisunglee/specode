# B. 프로젝트 규약 템플릿
> 프로젝트 시작 시 팀이 결정해서 채워야 하는 규칙들
> 빈칸(`___`)은 프로젝트 킥오프 때 결정 후 채울 것
> 기술 규칙은 `A-NEXTJS-기술규칙.md` 참조

---

## 0. 이 프로젝트 기본 정보

| 항목 | 결정값 |
|------|--------|
| 프로젝트명 | ___ |
| Next.js 버전 | ___ |
| DB | ___ |
| ORM | ___ |
| UI 라이브러리 | ___ |
| 인증 방식 | ___ |

---

## 1. URL 명명 규칙

### 페이지 URL
```
결정 필요:
- 엔티티 복수형 영문 사용 여부: 예(/users) vs 아니오(___)
- 한글 URL 허용 여부: ___
- 중첩 라우트 허용 여부: /screens/[id]/areas  vs  /areas?screenId=
```

**이 프로젝트 결정:**
```
/[엔티티복수]           목록
/[엔티티복수]/[id]      상세
/[엔티티복수]/new       신규 생성 (모달 방식이면 불필요)
```

### API URL
```
GET    /api/[entity]                목록 조회
POST   /api/[entity]                생성
GET    /api/[entity]/[id]           단건 조회
PUT    /api/[entity]/[id]           수정 (전체 또는 부분)
DELETE /api/[entity]/[id]           삭제
POST   /api/[entity]/[id]/[action]  서브액션 (상태변경 등)
```

### 쿼리파라미터 규칙
```
결정 필요:
- 검색어 파라미터명: search vs q vs keyword → 이 프로젝트: ___
- 페이지 파라미터명: page / pageSize vs offset / limit → 이 프로젝트: ___
- 정렬 파라미터명: sort / order vs sortBy / sortOrder → 이 프로젝트: ___
```

**이 프로젝트 결정:**
```
?search=검색어
?page=1&pageSize=20
?sort=createdAt&order=desc
?[parentEntity]Id=1          부모 엔티티 필터
```

---

## 2. API 응답 포맷

```
결정 필요:
- 응답 포맷 구조 결정 (한번 정하면 전체 일관성 필수)
```

**이 프로젝트 결정:**
```ts
// 성공 — 단건
{ success: true, data: T }

// 성공 — 목록
{ success: true, data: T[], pagination: { page, pageSize, total, totalPages } }

// 실패
{ success: false, error: { code: string, message: string } }
```

### 유틸 함수 (lib/utils.ts에 구현)
```ts
// 아래 두 함수 외에 다른 방식으로 응답 반환 금지
// 팀 전체가 이 함수만 사용해야 응답 포맷이 일관됨
return apiSuccess(data);
return apiSuccess(data, pagination);
return apiError("NOT_FOUND", "항목을 찾을 수 없습니다.", 404);
```

---

## 3. HTTP 에러 코드

**표준 코드 (변경 금지)**

| 코드 | HTTP 상태 | 사용 상황 |
|------|-----------|---------|
| `NOT_FOUND` | 404 | 조회 대상 없음 |
| `VALIDATION_ERROR` | 400 | 입력값 검증 실패 |
| `CONFLICT` | 409 | 하위 데이터 존재, 중복 등 |
| `UNAUTHORIZED` | 401 | 미인증 (로그인 필요) |
| `FORBIDDEN` | 403 | 권한 없음 |
| `INTERNAL_ERROR` | 500 | 서버 내부 오류 |

**프로젝트 커스텀 코드** (필요 시 추가)

| 코드 | HTTP 상태 | 사용 상황 |
|------|-----------|---------|
| ___ | ___ | ___ |

---

## 4. DB 네이밍 규칙

```
결정 필요:
- 테이블 prefix: tb_ 사용 여부 → 이 프로젝트: ___
- 컬럼 형식: snake_case vs camelCase → 이 프로젝트: ___
- Prisma 모델명: PascalCase (변경 불가)
```

**이 프로젝트 결정:**
```prisma
model EntityName {          // PascalCase (Prisma 표준)
  entityId  Int      @id @default(autoincrement()) @map("entity_id")
  //                                                ↑ DB 컬럼명: snake_case

  @@map("tb_entity_name")   // 테이블명: tb_ + snake_case
}
```

### 공통 필드 (모든 엔티티 동일하게 적용)
```prisma
// 아래 필드는 모든 테이블에 포함 — 빠뜨리면 나중에 마이그레이션 필요
createdAt DateTime @default(now()) @map("created_at")
updatedAt DateTime @updatedAt      @map("updated_at")
```

---

## 5. 논리삭제 방식

```
결정 필요:
- 논리삭제 사용 여부: 사용 vs 물리삭제만
- 논리삭제 방식 (하나만 선택):
  A. useYn String @default("Y")  → 조회 시 WHERE use_yn = 'Y'
  B. deletedAt DateTime?         → 조회 시 WHERE deleted_at IS NULL
  C. 물리삭제만 사용             → 이력 필요한 엔티티만 논리삭제

이 프로젝트 결정: ___
```

**결정 후 — 조회 시 반드시 필터 포함 (빠뜨리면 삭제 데이터 노출)**
```ts
// A안 선택 시
const where = { useYn: "Y" };

// B안 선택 시
const where = { deletedAt: null };
```

---

## 6. ID 채번 방식

```
결정 필요 (하나만 선택):
A. autoincrement + 사람이 읽는 systemId (예: RQ-00001)
   → sequence 테이블 관리 필요, 가독성 좋음
B. UUID v4
   → 충돌 없음, URL에 노출해도 안전, 순서 파악 어려움
C. autoincrement만 사용
   → 단순, URL에 노출 시 총 건수 추측 가능 (보안 고려)

이 프로젝트 결정: ___
```

**A안 선택 시 — 접두사 목록**

| 엔티티 | 접두사 | 예시 |
|--------|--------|------|
| ___ | ___ | ___-00001 |

```ts
// lib/sequence.ts
// 채번 시 반드시 트랜잭션으로 — 동시 요청 시 중복 방지
const systemId = await generateSystemId("XX"); // → XX-00001
```

---

## 7. UI 라이브러리 선택

```
결정 필요:
- 컴포넌트 라이브러리: Radix UI / shadcn/ui / MUI / Ant Design / ___
- CSS 프레임워크: Tailwind CSS v4 / v3 / ___
- 아이콘: lucide-react / heroicons / ___
- 토스트 알림: sonner / react-hot-toast / ___
- 테이블: TanStack Table / ___
- 상태관리(서버): TanStack Query / SWR / ___
```

**이 프로젝트 결정:**

| 역할 | 라이브러리 | 버전 |
|------|-----------|------|
| 컴포넌트 | ___ | ___ |
| CSS | ___ | ___ |
| 아이콘 | ___ | ___ |
| 토스트 | ___ | ___ |
| 테이블 | ___ | ___ |
| 서버 상태 | ___ | ___ |

---

## 8. 컴포넌트 규칙

### 삭제 확인
```
결정: window.confirm() 금지. 반드시 ConfirmDialog 컴포넌트 사용
이유: 브라우저 기본 confirm은 UX 최악, 커스텀 불가
```

### 모달 패턴
```
결정: 생성/수정은 Dialog(모달) vs 별도 페이지 vs ___
이 프로젝트: ___
```

### 폼 검증
```
결정: 클라이언트 검증 + 서버 검증 모두 필수
클라이언트: 즉각 피드백 (UX)
서버: 실제 데이터 보호 (보안) — 클라이언트 검증만 믿으면 안 됨
검증 라이브러리: Zod / ___ / 직접 구현
```

### 로딩/에러/빈 상태
```
결정: 세 가지 상태 모두 처리 필수
- isLoading → 스켈레톤 or 스피너
- error     → 에러 메시지 + 재시도 버튼
- 빈 목록   → "데이터가 없습니다" 안내
```

---

## 9. 환경변수 목록

> `.env.local` 파일에 설정. `.gitignore`에 반드시 포함. 절대 커밋 금지.

```env
# DB 연결
DATABASE_URL=___

# 인증
NEXTAUTH_SECRET=___
NEXTAUTH_URL=___

# AI 연동 (있는 경우)
AI_API_KEY=___

# 프로젝트 커스텀
___=___
```

---

## 10. Claude에게 줄 때 순서

```
1단계 — 기술 규칙 (항상 첫 번째로)
   A-NEXTJS-기술규칙.md

2단계 — 프로젝트 규약 (이 파일, 빈칸 채운 후)
   B-프로젝트-규약.md

3단계 — 도메인 모델 (엔티티 관계 정의 후)
   02-도메인-모델.md (또는 직접 작성)

4단계 — 구체적인 요청
   "[엔티티명] CRUD API(/api/xxx)와 목록 페이지(/xxx) 만들어줘.
    필드: id, name, description, status
    관계: [상위엔티티]에 N:1"
```

> **순서가 중요하다.** 규칙 없이 요청하면 매 파일마다 패턴이 달라진다.
