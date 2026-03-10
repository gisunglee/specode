# PRD: 영역(Area) 기능 도입

> 작성일: 2026-03-10
> 상태: 개발 예정

---

## 1. 개요

**화면 → 영역 → 기능** 3단 계층 구조 도입.
기존 `화면 → 기능` 2단 구조에서, 화면 내 `영역(Area)`을 중간 레이어로 추가한다.

```
Requirement
  └── Screen (화면)
        └── Area (영역)    ← 신규
              └── Function (기능)
```

---

## 2. 범위

### 신규 개발
| 항목 | 내용 |
|------|------|
| DB 테이블 | `tb_area` 신규 생성 |
| Prisma 모델 | `Area` 모델 추가, `Function` 모델 수정 |
| API | `/api/areas`, `/api/areas/[id]` |
| UI | `/areas` (목록), `/areas/[id]` (상세) |
| 시퀀스 | `AR` prefix 시퀀스 추가 (AR-00001) |

### 변경 개발
| 항목 | 변경 내용 |
|------|-----------|
| `tb_function.screen_id` | `area_id`로 컬럼 변경 |
| `/api/screens/[id]` GET | 화면 상세에 areas + 그 안의 functions 포함 |
| `/api/screens/[id]` DELETE | cascade 시 areas + functions 삭제, detach 시 areas.screen_id=null |
| `/api/screens` GET | 기능 수 집계를 areas 경유로 변경 |
| `onTaskComplete.ts` | `DESIGN` + `tb_area` 케이스 추가 → `ai_detail_design` 업데이트 |
| 화면 상세 페이지 (`/screens/[id]`) | 하단 기능 목록 → 영역 그룹 + 기능 표시 |
| 화면 목록 페이지 (`/screens`) | 기능 수 컬럼 → 영역+기능 수 표시 |
| 화면 삭제 다이얼로그 | 옵션 변경: 전체삭제 / 화면만삭제(영역·기능 유지) |
| 기능 상세 (`/functions/[id]`) | 소속 화면 Select → 소속 영역 Select로 교체 |

---

## 3. 스키마 정의

### 3-1. 신규: tb_area (Prisma 모델)

```prisma
model Area {
  areaId         Int      @id @default(autoincrement()) @map("area_id")
  areaCode       String   @unique @map("area_code")       // AR-00001
  screenId       Int      @map("screen_id")
  name           String   @map("name")
  sortOrder      Int      @default(1) @map("sort_order")
  areaType       String   @map("area_type")               // GRID|FORM|INFO_CARD|TAB|FULL_SCREEN
  spec           String?  @map("spec")                    // 영역 명세 (마크다운)
  imageUrl       String?  @map("image_url")
  displayFields  String?  @map("display_fields")
  status         String   @default("NONE") @map("status") // NONE|DESIGN_REQ|DESIGN_DONE
  reqComment     String?  @map("req_comment")             // AI 요청 코멘트
  aiFeedback     String?  @map("ai_feedback")             // AI 피드백 (조회전용)
  aiDetailDesign String?  @map("ai_detail_design")        // AI 상세설계
  useYn          String   @default("Y") @map("use_yn")
  createdBy      String?  @map("created_by")
  createdAt      DateTime @default(now()) @map("created_at")
  updatedBy      String?  @map("updated_by")
  updatedAt      DateTime @updatedAt @map("updated_at")

  screen    Screen     @relation(fields: [screenId], references: [screenId])
  functions Function[]

  @@index([screenId])
  @@index([status])
  @@map("tb_area")
}
```

### 3-2. 변경: Function 모델

```diff
- screenId    Int?     @map("screen_id")
+ areaId      Int?     @map("area_id")

- screen Screen? @relation(fields: [screenId], references: [screenId])
+ area   Area?   @relation(fields: [areaId], references: [areaId])

- @@index([screenId])
+ @@index([areaId])
```

### 3-3. 변경: Screen 모델

```diff
+ areas     Area[]
- functions Function[]    ← 직접 relation 제거 (Area를 통해 접근)
```

---

## 4. 시퀀스

`tb_sequence`에 `AR` prefix 시드 추가:
```sql
INSERT INTO tb_sequence (prefix, last_value) VALUES ('AR', 0);
```

영역 생성 시 `generateSystemId("AR")` 호출 → `AR-00001` 형식 areaCode 생성.

---

## 5. API 명세

### 5-1. 신규 API: /api/areas

#### GET /api/areas
- Query: `page`, `pageSize`, `search`, `screenId`, `status`
- Response: `{ data: Area[], pagination: {...} }`
- Area에 `functions` count 포함

#### POST /api/areas
- Body: `{ screenId, name, areaType, sortOrder?, spec?, displayFields? }`
- areaCode 자동 생성 (AR-XXXXX)

#### GET /api/areas/[id]
- Response: Area + functions 목록 + attachments

#### PUT /api/areas/[id]
- Body: `{ name?, areaType?, sortOrder?, screenId?, spec?, displayFields?, reqComment?, aiDetailDesign? }`

#### PATCH /api/areas/[id]
- Body: `{ status, comment? }`
- `DESIGN_REQ` 전환 시 → AiTask(`DESIGN`) 자동 생성 (ref_table_name=`tb_area`)

#### DELETE /api/areas/[id]?mode=cascade|detach
- `cascade`: 연결된 functions 삭제 후 area 삭제
- `detach`: functions.area_id = null 처리 후 area 삭제
- mode 없음 + functions 있음 → 409 반환

### 5-2. 변경 API

#### GET /api/screens/[id]
```diff
- include: { functions: {...} }
+ include: {
+   areas: {
+     include: { functions: { orderBy: { createdAt: 'asc' } } },
+     orderBy: { sortOrder: 'asc' }
+   }
+ }
```

#### DELETE /api/screens/[id]
```
mode=cascade → areas 모두 삭제 + 각 area의 functions 삭제 → screen 삭제
mode=detach  → areas.screen_id = null → screen 삭제
mode 없음    → areaCount 조회 후 0이면 삭제, 아니면 409
```

#### GET /api/screens (목록)
- `_count` 변경: `functions` → `areas` (영역 수 표시) 또는 area 경유한 functions 총합

#### PUT /api/functions/[id]
- `screenId` 파라미터 → `areaId`로 변경

### 5-3. onTaskComplete.ts 변경

```typescript
case "DESIGN":
  if (refTableName === "tb_function") {
    // tb_function.ai_design_content 업데이트
  } else if (refTableName === "tb_area") {
    // tb_area.ai_detail_design 업데이트
    // tb_area.status = "DESIGN_DONE"
  }
```

---

## 6. UI 명세

### 6-1. 신규: /areas (영역 목록)

**레이아웃**
```
[영역 관리]                           [영역 등록]
──────────────────────────────────────────────────
[검색...] [화면: 전체 ▼] [상태: 전체 ▼]
┌──────────────────────────────────────────────────┐
│ ID │ 영역코드 │ 영역명 │ 유형 │ 화면 │ 상태 │ 기능수 │ 수정일 │ 액션 │
└──────────────────────────────────────────────────┘
[페이지네이션]
```

**컬럼**: systemId(areaCode), name, areaType, 소속 화면명, status 뱃지, 기능 수, updatedAt, 수정/삭제 버튼

**상태 뱃지**:
- NONE: 기본(회색)
- DESIGN_REQ: 파란색 "설계요청"
- DESIGN_DONE: 초록색 "설계완료"

### 6-2. 신규: /areas/[id] (영역 상세)

**레이아웃**
```
[←] AR-00001 — 영역명                         [저장]
┌──────────────────────────────────────────────────┐
│ [기본정보 탭] [명세 탭] [AI설계 탭] [피드백 탭]    │
├──────────────────────────────────────────────────┤
│  탭 컨텐츠 영역                                   │
└──────────────────────────────────────────────────┘

하위 기능 목록 (DataGrid)
```

**기본정보 탭**:
- areaCode (읽기전용)
- name (입력)
- areaType (Select: GRID/FORM/INFO_CARD/TAB/FULL_SCREEN)
- sortOrder (숫자 입력)
- screenId (화면 Select)
- status (Select: NONE/DESIGN_REQ/DESIGN_DONE)
- reqComment (textarea, AI에게 전달할 코멘트)
- displayFields (textarea)
- 저장 버튼

**명세 탭**: `spec` 마크다운 에디터

**AI설계 탭**: `aiDetailDesign` 마크다운 에디터 (수정 가능)

**피드백 탭**: `aiFeedback` 마크다운 (읽기전용)

**삭제 버튼**: 헤더 우측, 기능 있을 시 2-옵션 다이얼로그 (cascade / detach)

### 6-3. 변경: /screens/[id] (화면 상세)

하단 "하위 기능 목록" 섹션 변경:
- 기존: FunctionRow[] flat 목록
- 변경: Area 그룹별로 표시
  ```
  ▼ AR-00001 — 헤더영역 (GRID)        [2개 기능]
    FID-00001 | 기능명 | 상태 | ...
    FID-00002 | 기능명 | 상태 | ...
  ▼ AR-00002 — 검색필터 (FORM)        [1개 기능]
    FID-00003 | 기능명 | 상태 | ...
  ```

### 6-4. 변경: /screens/[id] 삭제 다이얼로그

기존 2-옵션 → 새 2-옵션:
- **전체 삭제**: 화면 + 모든 영역 + 모든 기능 삭제
- **화면만 삭제**: 화면 삭제, 영역의 screen_id를 null 처리 (영역·기능 유지)

### 6-5. 변경: /screens (화면 목록)

- 기능 수 컬럼 → 영역 수 + 기능 수 (예: `영역 3 / 기능 12`)
- 또는 단순히 영역 수 표시로 변경

### 6-6. 변경: /functions/[id] (기능 상세, BasicInfoTab)

- `소속 화면` Select 제거
- `소속 영역` Select 추가 (영역 목록 API: `/api/areas?pageSize=200`)
- PUT API 호출 시 `areaId` 전송

---

## 7. 구현 순서 (Phase)

### Phase 1: DB/스키마
1. `prisma/schema.prisma` — Area 모델 추가, Function screenId→areaId 변경, Screen에 areas relation 추가
2. `prisma/seed.ts` — AR 시퀀스 시드 추가
3. `npx prisma db push`

### Phase 2: API 신규
4. `src/app/api/areas/route.ts` — GET(목록), POST
5. `src/app/api/areas/[id]/route.ts` — GET, PUT, PATCH, DELETE

### Phase 3: API 변경
6. `src/app/api/screens/[id]/route.ts` — GET(areas include), DELETE(cascade/detach 로직)
7. `src/app/api/screens/route.ts` — _count 변경
8. `src/app/api/functions/[id]/route.ts` — screenId→areaId
9. `src/app/api/ai/_lib/onTaskComplete.ts` — DESIGN+tb_area 케이스 추가

### Phase 4: 타입 정의
10. `src/types/index.ts` — Area 타입, FunctionItem.screenId→areaId 변경

### Phase 5: UI 신규
11. `src/app/areas/page.tsx` — 영역 목록
12. `src/app/areas/[id]/page.tsx` — 영역 상세
13. 사이드바 네비게이션에 "영역 관리" 메뉴 추가

### Phase 6: UI 변경
14. `src/components/functions/BasicInfoTab.tsx` — screen Select → area Select
15. `src/app/screens/[id]/page.tsx` — 하위 목록을 area 그룹으로 변경, 삭제 다이얼로그 변경
16. `src/app/screens/page.tsx` — 기능 수 표시 변경

---

## 8. 영역 유형 (areaType) 상수

| 값 | 라벨 |
|----|------|
| GRID | 그리드 |
| FORM | 폼 |
| INFO_CARD | 정보카드 |
| TAB | 탭 |
| FULL_SCREEN | 전체화면 |

---

## 9. 주요 고려사항

- **기존 데이터 마이그레이션**: `tb_function.screen_id` 데이터 → `area_id`로 마이그레이션 불필요 (개발 DB, 새로 구성)
- **Screen→Function 직접 relation 제거**: 기능은 Area를 통해서만 Screen에 연결됨
- **AiTask 생성**: Area의 `DESIGN_REQ` 전환 시 → `refTableName: "tb_area"`, `taskType: "DESIGN"` 으로 생성
- **영역 목록 API**: BasicInfoTab의 영역 Select에서 사용 (pageSize=200)
