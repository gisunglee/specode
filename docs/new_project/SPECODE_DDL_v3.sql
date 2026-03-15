-- ============================================================
-- SPECODE DDL v2 (PostgreSQL)
-- AI-Driven Dev Hub - 1차 사업
-- 생성일: 2026-03-14 (v2 수정)
-- ============================================================
-- 설계 원칙:
--   PK: BIGSERIAL 자동채번
--   논리삭제: del_yn = 'N'/'Y'
--   감사컬럼: reg_user_id, reg_dt, mod_user_id, mod_dt
--   텍스트: 내용/스펙은 TEXT (마크다운 입력, 미리보기 제공)
--   Prefix 2자리: cm(공통), rq(요구사항), pl(플래닝랩), ds(설계), ai(AI), an(분석)
--   FK 상속 시 컬럼명 동일
--   속성명 → 컬럼명 자연스러운 매핑 (과도한 축약 금지)
--   형식단어: _id(식별자), _nm(명), _cd(코드), _cn(내용), _dt(일시),
--             _yn(여부), _sn(순번), _cnt(건수), _val(값), _len(길이)
-- ============================================================

-- ============================================================
-- [cm] 공통 (Common)
-- ============================================================

-- cm-01. 프로젝트
CREATE TABLE tb_cm_project (
    project_id          BIGSERIAL       PRIMARY KEY,
    project_nm          VARCHAR(200)    NOT NULL,
    project_cn          TEXT,
    project_status_cd   VARCHAR(20)     NOT NULL DEFAULT 'ACTIVE',
    del_yn              CHAR(1)         NOT NULL DEFAULT 'N',
    reg_user_id         VARCHAR(50)     NOT NULL,
    reg_dt              TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    mod_user_id         VARCHAR(50),
    mod_dt              TIMESTAMP
);
COMMENT ON TABLE  tb_cm_project IS '프로젝트';
COMMENT ON COLUMN tb_cm_project.project_id IS '프로젝트 식별자';
COMMENT ON COLUMN tb_cm_project.project_nm IS '프로젝트명';
COMMENT ON COLUMN tb_cm_project.project_cn IS '프로젝트 내용';
COMMENT ON COLUMN tb_cm_project.project_status_cd IS '프로젝트 상태코드 (ACTIVE/CLOSED/HOLD)';
COMMENT ON COLUMN tb_cm_project.del_yn IS '삭제 여부';
COMMENT ON COLUMN tb_cm_project.reg_user_id IS '등록자 식별자';
COMMENT ON COLUMN tb_cm_project.reg_dt IS '등록 일시';
COMMENT ON COLUMN tb_cm_project.mod_user_id IS '수정자 식별자';
COMMENT ON COLUMN tb_cm_project.mod_dt IS '수정 일시';

-- cm-02. 첨부파일
CREATE TABLE tb_cm_attach_file (
    file_id             BIGSERIAL       PRIMARY KEY,
    ref_type_cd         VARCHAR(30)     NOT NULL,
    ref_id              BIGINT          NOT NULL,
    file_origin_nm      VARCHAR(500)    NOT NULL,
    file_stored_nm      VARCHAR(500)    NOT NULL,
    file_path           VARCHAR(1000)   NOT NULL,
    file_size           BIGINT,
    file_ext_nm         VARCHAR(20),
    del_yn              CHAR(1)         NOT NULL DEFAULT 'N',
    reg_user_id         VARCHAR(50)     NOT NULL,
    reg_dt              TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP
);
COMMENT ON TABLE  tb_cm_attach_file IS '첨부파일';
COMMENT ON COLUMN tb_cm_attach_file.file_id IS '파일 식별자';
COMMENT ON COLUMN tb_cm_attach_file.ref_type_cd IS '참조 유형코드 (TASK_RFP/REQ_ANALYSIS/LAB_MOCKUP/OUTPUT)';
COMMENT ON COLUMN tb_cm_attach_file.ref_id IS '참조 식별자';
COMMENT ON COLUMN tb_cm_attach_file.file_origin_nm IS '파일 원본명';
COMMENT ON COLUMN tb_cm_attach_file.file_stored_nm IS '파일 저장명';
COMMENT ON COLUMN tb_cm_attach_file.file_path IS '파일 경로';
COMMENT ON COLUMN tb_cm_attach_file.file_size IS '파일 크기';
COMMENT ON COLUMN tb_cm_attach_file.file_ext_nm IS '파일 확장자명';
COMMENT ON COLUMN tb_cm_attach_file.del_yn IS '삭제 여부';
COMMENT ON COLUMN tb_cm_attach_file.reg_user_id IS '등록자 식별자';
COMMENT ON COLUMN tb_cm_attach_file.reg_dt IS '등록 일시';

CREATE INDEX idx_cm_attach_ref ON tb_cm_attach_file(ref_type_cd, ref_id);

-- ============================================================
-- [rq] 요구사항 (Requirement) - 과업, 요구사항, 스토리, 인수조건
-- ============================================================

-- rq-01. 과업 (RFP 원문, 변경 불가)
CREATE TABLE tb_rq_task (
    task_id             BIGSERIAL       PRIMARY KEY,
    project_id          BIGINT          NOT NULL REFERENCES tb_cm_project(project_id),
    task_nm             VARCHAR(300)    NOT NULL,
    task_cn             TEXT,
    rfp_page_no         VARCHAR(50),
    rfp_class_nm        VARCHAR(200),
    req_nm              VARCHAR(300),
    req_define_cn       TEXT,
    output_info_cn      TEXT,
    rfp_file_id         BIGINT,
    sort_sn             INTEGER         NOT NULL DEFAULT 0,
    del_yn              CHAR(1)         NOT NULL DEFAULT 'N',
    reg_user_id         VARCHAR(50)     NOT NULL,
    reg_dt              TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    mod_user_id         VARCHAR(50),
    mod_dt              TIMESTAMP
);
COMMENT ON TABLE  tb_rq_task IS '과업';
COMMENT ON COLUMN tb_rq_task.task_id IS '과업 식별자';
COMMENT ON COLUMN tb_rq_task.project_id IS '프로젝트 식별자';
COMMENT ON COLUMN tb_rq_task.task_nm IS '과업명';
COMMENT ON COLUMN tb_rq_task.task_cn IS '과업 내용';
COMMENT ON COLUMN tb_rq_task.rfp_page_no IS '제안요청서 페이지번호';
COMMENT ON COLUMN tb_rq_task.rfp_class_nm IS '제안요청서 분류명';
COMMENT ON COLUMN tb_rq_task.req_nm IS '요구사항명 (RFP 원문)';
COMMENT ON COLUMN tb_rq_task.req_define_cn IS '요구사항 정의 내용 (RFP 원문)';
COMMENT ON COLUMN tb_rq_task.output_info_cn IS '산출정보 내용';
COMMENT ON COLUMN tb_rq_task.rfp_file_id IS 'RFP 파일 식별자';
COMMENT ON COLUMN tb_rq_task.sort_sn IS '정렬 순번';
COMMENT ON COLUMN tb_rq_task.del_yn IS '삭제 여부';
COMMENT ON COLUMN tb_rq_task.reg_user_id IS '등록자 식별자';
COMMENT ON COLUMN tb_rq_task.reg_dt IS '등록 일시';
COMMENT ON COLUMN tb_rq_task.mod_user_id IS '수정자 식별자';
COMMENT ON COLUMN tb_rq_task.mod_dt IS '수정 일시';

CREATE INDEX idx_rq_task_project ON tb_rq_task(project_id);

-- rq-02. 요구사항
CREATE TABLE tb_rq_req (
    req_id              BIGSERIAL       PRIMARY KEY,
    project_id          BIGINT          NOT NULL REFERENCES tb_cm_project(project_id),
    req_nm              VARCHAR(300)    NOT NULL,
    req_cn              TEXT,
    req_status_cd       VARCHAR(20)     NOT NULL DEFAULT 'ANALYZING',
    spec_cn             TEXT,
    spec_draft_cn       TEXT,
    sort_sn             INTEGER         NOT NULL DEFAULT 0,
    del_yn              CHAR(1)         NOT NULL DEFAULT 'N',
    reg_user_id         VARCHAR(50)     NOT NULL,
    reg_dt              TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    mod_user_id         VARCHAR(50),
    mod_dt              TIMESTAMP
);
COMMENT ON TABLE  tb_rq_req IS '요구사항';
COMMENT ON COLUMN tb_rq_req.req_id IS '요구사항 식별자';
COMMENT ON COLUMN tb_rq_req.project_id IS '프로젝트 식별자';
COMMENT ON COLUMN tb_rq_req.req_nm IS '요구사항명';
COMMENT ON COLUMN tb_rq_req.req_cn IS '요구사항 내용';
COMMENT ON COLUMN tb_rq_req.req_status_cd IS '요구사항 상태코드 (ANALYZING/CONFIRMED/CHANGING/CHANGE_CONFIRMED/DELETED)';
COMMENT ON COLUMN tb_rq_req.spec_cn IS '명세서 내용 (마크다운)';
COMMENT ON COLUMN tb_rq_req.spec_draft_cn IS '명세서 드래프트 내용 (자동저장)';
COMMENT ON COLUMN tb_rq_req.sort_sn IS '정렬 순번';
COMMENT ON COLUMN tb_rq_req.del_yn IS '삭제 여부';
COMMENT ON COLUMN tb_rq_req.reg_user_id IS '등록자 식별자';
COMMENT ON COLUMN tb_rq_req.reg_dt IS '등록 일시';
COMMENT ON COLUMN tb_rq_req.mod_user_id IS '수정자 식별자';
COMMENT ON COLUMN tb_rq_req.mod_dt IS '수정 일시';

CREATE INDEX idx_rq_req_project ON tb_rq_req(project_id);

-- rq-03. 요구사항 버전 이력
CREATE TABLE tb_rq_req_ver (
    req_ver_id          BIGSERIAL       PRIMARY KEY,
    req_id              BIGINT          NOT NULL REFERENCES tb_rq_req(req_id),
    ver_sn              INTEGER         NOT NULL,
    snapshot_cn         TEXT            NOT NULL,
    before_status_cd    VARCHAR(20),
    after_status_cd     VARCHAR(20),
    change_reason_cn    TEXT,
    reg_user_id         VARCHAR(50)     NOT NULL,
    reg_dt              TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP
);
COMMENT ON TABLE  tb_rq_req_ver IS '요구사항 버전 이력';
COMMENT ON COLUMN tb_rq_req_ver.req_ver_id IS '요구사항 버전 식별자';
COMMENT ON COLUMN tb_rq_req_ver.req_id IS '요구사항 식별자';
COMMENT ON COLUMN tb_rq_req_ver.ver_sn IS '버전 순번';
COMMENT ON COLUMN tb_rq_req_ver.snapshot_cn IS '스냅샷 내용 (JSON)';
COMMENT ON COLUMN tb_rq_req_ver.before_status_cd IS '변경전 상태코드';
COMMENT ON COLUMN tb_rq_req_ver.after_status_cd IS '변경후 상태코드';
COMMENT ON COLUMN tb_rq_req_ver.change_reason_cn IS '변경 사유 내용';
COMMENT ON COLUMN tb_rq_req_ver.reg_user_id IS '등록자 식별자';
COMMENT ON COLUMN tb_rq_req_ver.reg_dt IS '등록 일시';

CREATE INDEX idx_rq_req_ver_req ON tb_rq_req_ver(req_id);

-- rq-04. 과업-요구사항 매핑
CREATE TABLE tb_rq_task_req_map (
    task_req_map_id     BIGSERIAL       PRIMARY KEY,
    task_id             BIGINT          NOT NULL REFERENCES tb_rq_task(task_id),
    req_id              BIGINT          NOT NULL REFERENCES tb_rq_req(req_id),
    reg_user_id         VARCHAR(50)     NOT NULL,
    reg_dt              TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (task_id, req_id)
);
COMMENT ON TABLE  tb_rq_task_req_map IS '과업-요구사항 매핑';
COMMENT ON COLUMN tb_rq_task_req_map.task_req_map_id IS '과업요구사항매핑 식별자';
COMMENT ON COLUMN tb_rq_task_req_map.task_id IS '과업 식별자';
COMMENT ON COLUMN tb_rq_task_req_map.req_id IS '요구사항 식별자';
COMMENT ON COLUMN tb_rq_task_req_map.reg_user_id IS '등록자 식별자';
COMMENT ON COLUMN tb_rq_task_req_map.reg_dt IS '등록 일시';

-- rq-05. 사용자 스토리
CREATE TABLE tb_rq_story (
    story_id            BIGSERIAL       PRIMARY KEY,
    req_id              BIGINT          NOT NULL REFERENCES tb_rq_req(req_id),
    story_title_nm      VARCHAR(300),
    as_a_cn             VARCHAR(200),
    i_want_cn           TEXT,
    so_that_cn          TEXT,
    sort_sn             INTEGER         NOT NULL DEFAULT 0,
    del_yn              CHAR(1)         NOT NULL DEFAULT 'N',
    reg_user_id         VARCHAR(50)     NOT NULL,
    reg_dt              TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    mod_user_id         VARCHAR(50),
    mod_dt              TIMESTAMP
);
COMMENT ON TABLE  tb_rq_story IS '사용자 스토리';
COMMENT ON COLUMN tb_rq_story.story_id IS '스토리 식별자';
COMMENT ON COLUMN tb_rq_story.req_id IS '요구사항 식별자';
COMMENT ON COLUMN tb_rq_story.story_title_nm IS '스토리 제목명';
COMMENT ON COLUMN tb_rq_story.as_a_cn IS '역할 내용 (As a ~)';
COMMENT ON COLUMN tb_rq_story.i_want_cn IS '행동 내용 (I want ~)';
COMMENT ON COLUMN tb_rq_story.so_that_cn IS '목적 내용 (So that ~)';
COMMENT ON COLUMN tb_rq_story.sort_sn IS '정렬 순번';
COMMENT ON COLUMN tb_rq_story.del_yn IS '삭제 여부';
COMMENT ON COLUMN tb_rq_story.reg_user_id IS '등록자 식별자';
COMMENT ON COLUMN tb_rq_story.reg_dt IS '등록 일시';
COMMENT ON COLUMN tb_rq_story.mod_user_id IS '수정자 식별자';
COMMENT ON COLUMN tb_rq_story.mod_dt IS '수정 일시';

CREATE INDEX idx_rq_story_req ON tb_rq_story(req_id);

-- rq-06. 인수조건
CREATE TABLE tb_rq_accept_crit (
    accept_crit_id      BIGSERIAL       PRIMARY KEY,
    story_id            BIGINT          NOT NULL REFERENCES tb_rq_story(story_id),
    accept_crit_nm      VARCHAR(200)    NOT NULL,
    accept_crit_cn      TEXT,
    verify_base_cn      VARCHAR(500),
    sort_sn             INTEGER         NOT NULL DEFAULT 0,
    del_yn              CHAR(1)         NOT NULL DEFAULT 'N',
    reg_user_id         VARCHAR(50)     NOT NULL,
    reg_dt              TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    mod_user_id         VARCHAR(50),
    mod_dt              TIMESTAMP
);
COMMENT ON TABLE  tb_rq_accept_crit IS '인수조건';
COMMENT ON COLUMN tb_rq_accept_crit.accept_crit_id IS '인수조건 식별자';
COMMENT ON COLUMN tb_rq_accept_crit.story_id IS '스토리 식별자';
COMMENT ON COLUMN tb_rq_accept_crit.accept_crit_nm IS '인수조건명';
COMMENT ON COLUMN tb_rq_accept_crit.accept_crit_cn IS '인수조건 내용';
COMMENT ON COLUMN tb_rq_accept_crit.verify_base_cn IS '검증 기준 내용';
COMMENT ON COLUMN tb_rq_accept_crit.sort_sn IS '정렬 순번';
COMMENT ON COLUMN tb_rq_accept_crit.del_yn IS '삭제 여부';
COMMENT ON COLUMN tb_rq_accept_crit.reg_user_id IS '등록자 식별자';
COMMENT ON COLUMN tb_rq_accept_crit.reg_dt IS '등록 일시';
COMMENT ON COLUMN tb_rq_accept_crit.mod_user_id IS '수정자 식별자';
COMMENT ON COLUMN tb_rq_accept_crit.mod_dt IS '수정 일시';

CREATE INDEX idx_rq_accept_crit_story ON tb_rq_accept_crit(story_id);

-- ============================================================
-- [pl] 플래닝 랩 (Planning Lab)
-- ============================================================

-- pl-01. 플래닝 랩
CREATE TABLE tb_pl_lab (
    lab_id              BIGSERIAL       PRIMARY KEY,
    project_id          BIGINT          NOT NULL REFERENCES tb_cm_project(project_id),
    lab_type_cd         VARCHAR(30)     NOT NULL,
    lab_title_nm        VARCHAR(300),
    lab_status_cd       VARCHAR(20)     NOT NULL DEFAULT 'DRAFT',
    del_yn              CHAR(1)         NOT NULL DEFAULT 'N',
    reg_user_id         VARCHAR(50)     NOT NULL,
    reg_dt              TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    mod_user_id         VARCHAR(50),
    mod_dt              TIMESTAMP
);
COMMENT ON TABLE  tb_pl_lab IS '플래닝 랩';
COMMENT ON COLUMN tb_pl_lab.lab_id IS '플래닝랩 식별자';
COMMENT ON COLUMN tb_pl_lab.project_id IS '프로젝트 식별자';
COMMENT ON COLUMN tb_pl_lab.lab_type_cd IS '랩 유형코드 (MEGA_PROCESS/INFO_STRUCTURE/MOCKUP)';
COMMENT ON COLUMN tb_pl_lab.lab_title_nm IS '랩 제목명';
COMMENT ON COLUMN tb_pl_lab.lab_status_cd IS '랩 상태코드 (DRAFT/CONFIRMED)';
COMMENT ON COLUMN tb_pl_lab.del_yn IS '삭제 여부';
COMMENT ON COLUMN tb_pl_lab.reg_user_id IS '등록자 식별자';
COMMENT ON COLUMN tb_pl_lab.reg_dt IS '등록 일시';
COMMENT ON COLUMN tb_pl_lab.mod_user_id IS '수정자 식별자';
COMMENT ON COLUMN tb_pl_lab.mod_dt IS '수정 일시';

CREATE INDEX idx_pl_lab_project ON tb_pl_lab(project_id);

-- pl-02. 플래닝 랩 버전 (코멘트 통합)
CREATE TABLE tb_pl_lab_ver (
    lab_ver_id          BIGSERIAL       PRIMARY KEY,
    lab_id              BIGINT          NOT NULL REFERENCES tb_pl_lab(lab_id),
    ver_sn              INTEGER         NOT NULL DEFAULT 1,
    mermaid_cn          TEXT,
    content_cn          TEXT,
    prompt_input_cn     TEXT,
    ai_response_cn      TEXT,
    memo_cn             VARCHAR(500),
    confirm_yn          CHAR(1)         NOT NULL DEFAULT 'N',
    reg_user_id         VARCHAR(50)     NOT NULL,
    reg_dt              TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (lab_id, ver_sn)
);
COMMENT ON TABLE  tb_pl_lab_ver IS '플래닝 랩 버전';
COMMENT ON COLUMN tb_pl_lab_ver.lab_ver_id IS '랩버전 식별자';
COMMENT ON COLUMN tb_pl_lab_ver.lab_id IS '플래닝랩 식별자';
COMMENT ON COLUMN tb_pl_lab_ver.ver_sn IS '버전 순번';
COMMENT ON COLUMN tb_pl_lab_ver.mermaid_cn IS 'Mermaid 코드 내용';
COMMENT ON COLUMN tb_pl_lab_ver.content_cn IS '콘텐츠 내용 (목업 HTML 등)';
COMMENT ON COLUMN tb_pl_lab_ver.prompt_input_cn IS '프롬프트 입력 내용';
COMMENT ON COLUMN tb_pl_lab_ver.ai_response_cn IS 'AI 응답 내용';
COMMENT ON COLUMN tb_pl_lab_ver.memo_cn IS '메모 내용';
COMMENT ON COLUMN tb_pl_lab_ver.confirm_yn IS '확정 여부';
COMMENT ON COLUMN tb_pl_lab_ver.reg_user_id IS '등록자 식별자';
COMMENT ON COLUMN tb_pl_lab_ver.reg_dt IS '등록 일시';

-- ============================================================
-- [ds] 설계 (Design) - 화면, 영역, 항목, 기능, 스키마
-- ============================================================

-- ds-01. 화면
CREATE TABLE tb_ds_screen (
    screen_id           BIGSERIAL       PRIMARY KEY,
    project_id          BIGINT          NOT NULL REFERENCES tb_cm_project(project_id),
    screen_cd           VARCHAR(30)     NOT NULL,
    screen_nm           VARCHAR(300)    NOT NULL,
    screen_cn           TEXT,
    screen_type_cd      VARCHAR(30),
    layout_cn           TEXT,
    sort_sn             INTEGER         NOT NULL DEFAULT 0,
    del_yn              CHAR(1)         NOT NULL DEFAULT 'N',
    reg_user_id         VARCHAR(50)     NOT NULL,
    reg_dt              TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    mod_user_id         VARCHAR(50),
    mod_dt              TIMESTAMP,
    UNIQUE (project_id, screen_cd)
);
COMMENT ON TABLE  tb_ds_screen IS '화면';
COMMENT ON COLUMN tb_ds_screen.screen_id IS '화면 식별자';
COMMENT ON COLUMN tb_ds_screen.project_id IS '프로젝트 식별자';
COMMENT ON COLUMN tb_ds_screen.screen_cd IS '화면 코드 (예: SCR-0101)';
COMMENT ON COLUMN tb_ds_screen.screen_nm IS '화면명';
COMMENT ON COLUMN tb_ds_screen.screen_cn IS '화면 내용 (마크다운)';
COMMENT ON COLUMN tb_ds_screen.screen_type_cd IS '화면 유형코드 (LIST/DETAIL/EDIT/DASHBOARD/VIEWER)';
COMMENT ON COLUMN tb_ds_screen.layout_cn IS '레이아웃 내용 (JSON, 영역별 위치·크기 정의)';
COMMENT ON COLUMN tb_ds_screen.sort_sn IS '정렬 순번';
COMMENT ON COLUMN tb_ds_screen.del_yn IS '삭제 여부';
COMMENT ON COLUMN tb_ds_screen.reg_user_id IS '등록자 식별자';
COMMENT ON COLUMN tb_ds_screen.reg_dt IS '등록 일시';
COMMENT ON COLUMN tb_ds_screen.mod_user_id IS '수정자 식별자';
COMMENT ON COLUMN tb_ds_screen.mod_dt IS '수정 일시';

CREATE INDEX idx_ds_screen_project ON tb_ds_screen(project_id);

-- ds-02. 화면 버전 이력
CREATE TABLE tb_ds_screen_ver (
    screen_ver_id       BIGSERIAL       PRIMARY KEY,
    screen_id           BIGINT          NOT NULL REFERENCES tb_ds_screen(screen_id),
    ver_sn              INTEGER         NOT NULL,
    snapshot_cn         TEXT            NOT NULL,
    change_reason_cn    TEXT,
    reg_user_id         VARCHAR(50)     NOT NULL,
    reg_dt              TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP
);
COMMENT ON TABLE  tb_ds_screen_ver IS '화면 버전 이력';
COMMENT ON COLUMN tb_ds_screen_ver.screen_ver_id IS '화면버전 식별자';
COMMENT ON COLUMN tb_ds_screen_ver.screen_id IS '화면 식별자';
COMMENT ON COLUMN tb_ds_screen_ver.ver_sn IS '버전 순번';
COMMENT ON COLUMN tb_ds_screen_ver.snapshot_cn IS '스냅샷 내용 (JSON)';
COMMENT ON COLUMN tb_ds_screen_ver.change_reason_cn IS '변경 사유 내용';
COMMENT ON COLUMN tb_ds_screen_ver.reg_user_id IS '등록자 식별자';
COMMENT ON COLUMN tb_ds_screen_ver.reg_dt IS '등록 일시';

CREATE INDEX idx_ds_screen_ver_screen ON tb_ds_screen_ver(screen_id);

-- ds-03. 화면-요구사항 매핑
CREATE TABLE tb_ds_screen_req_map (
    screen_req_map_id   BIGSERIAL       PRIMARY KEY,
    screen_id           BIGINT          NOT NULL REFERENCES tb_ds_screen(screen_id),
    req_id              BIGINT          NOT NULL REFERENCES tb_rq_req(req_id),
    reg_user_id         VARCHAR(50)     NOT NULL,
    reg_dt              TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (screen_id, req_id)
);
COMMENT ON TABLE  tb_ds_screen_req_map IS '화면-요구사항 매핑';
COMMENT ON COLUMN tb_ds_screen_req_map.screen_req_map_id IS '화면요구사항매핑 식별자';
COMMENT ON COLUMN tb_ds_screen_req_map.screen_id IS '화면 식별자';
COMMENT ON COLUMN tb_ds_screen_req_map.req_id IS '요구사항 식별자';
COMMENT ON COLUMN tb_ds_screen_req_map.reg_user_id IS '등록자 식별자';
COMMENT ON COLUMN tb_ds_screen_req_map.reg_dt IS '등록 일시';

-- ds-04. 영역
CREATE TABLE tb_ds_area (
    area_id             BIGSERIAL       PRIMARY KEY,
    screen_id           BIGINT          NOT NULL REFERENCES tb_ds_screen(screen_id),
    area_nm             VARCHAR(200)    NOT NULL,
    area_type_cd        VARCHAR(30)     NOT NULL,
    area_cn             TEXT,
    raw_spec_cn         TEXT,
    sort_sn             INTEGER         NOT NULL DEFAULT 0,
    del_yn              CHAR(1)         NOT NULL DEFAULT 'N',
    reg_user_id         VARCHAR(50)     NOT NULL,
    reg_dt              TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    mod_user_id         VARCHAR(50),
    mod_dt              TIMESTAMP
);
COMMENT ON TABLE  tb_ds_area IS '영역';
COMMENT ON COLUMN tb_ds_area.area_id IS '영역 식별자';
COMMENT ON COLUMN tb_ds_area.screen_id IS '화면 식별자';
COMMENT ON COLUMN tb_ds_area.area_nm IS '영역명';
COMMENT ON COLUMN tb_ds_area.area_type_cd IS '영역 유형코드 (SEARCH_FORM/DATA_GRID/DETAIL_FORM/EDITABLE_GRID/BUTTON_GROUP 등)';
COMMENT ON COLUMN tb_ds_area.area_cn IS '업무설명 내용 (마크다운)';
COMMENT ON COLUMN tb_ds_area.raw_spec_cn IS '자유형식 스펙 내용 (마크다운, 텍스트 기반 설계 병행용)';
COMMENT ON COLUMN tb_ds_area.sort_sn IS '정렬 순번';
COMMENT ON COLUMN tb_ds_area.del_yn IS '삭제 여부';
COMMENT ON COLUMN tb_ds_area.reg_user_id IS '등록자 식별자';
COMMENT ON COLUMN tb_ds_area.reg_dt IS '등록 일시';
COMMENT ON COLUMN tb_ds_area.mod_user_id IS '수정자 식별자';
COMMENT ON COLUMN tb_ds_area.mod_dt IS '수정 일시';

CREATE INDEX idx_ds_area_screen ON tb_ds_area(screen_id);

-- ds-05. 영역 버전 이력
CREATE TABLE tb_ds_area_ver (
    area_ver_id         BIGSERIAL       PRIMARY KEY,
    area_id             BIGINT          NOT NULL REFERENCES tb_ds_area(area_id),
    ver_sn              INTEGER         NOT NULL,
    snapshot_cn         TEXT            NOT NULL,
    change_reason_cn    TEXT,
    reg_user_id         VARCHAR(50)     NOT NULL,
    reg_dt              TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP
);
COMMENT ON TABLE  tb_ds_area_ver IS '영역 버전 이력';
COMMENT ON COLUMN tb_ds_area_ver.area_ver_id IS '영역버전 식별자';
COMMENT ON COLUMN tb_ds_area_ver.area_id IS '영역 식별자';
COMMENT ON COLUMN tb_ds_area_ver.ver_sn IS '버전 순번';
COMMENT ON COLUMN tb_ds_area_ver.snapshot_cn IS '스냅샷 내용 (JSON)';
COMMENT ON COLUMN tb_ds_area_ver.change_reason_cn IS '변경 사유 내용';
COMMENT ON COLUMN tb_ds_area_ver.reg_user_id IS '등록자 식별자';
COMMENT ON COLUMN tb_ds_area_ver.reg_dt IS '등록 일시';

CREATE INDEX idx_ds_area_ver_area ON tb_ds_area_ver(area_id);

-- ds-06. 영역 항목
CREATE TABLE tb_ds_area_item (
    area_item_id        BIGSERIAL       PRIMARY KEY,
    area_id             BIGINT          NOT NULL REFERENCES tb_ds_area(area_id),
    item_nm             VARCHAR(200)    NOT NULL,
    item_cd             VARCHAR(100),
    data_type_cd        VARCHAR(50),
    data_len            INTEGER,
    required_yn         CHAR(1)         NOT NULL DEFAULT 'N',
    item_purpose_cd     VARCHAR(20),
    remark_cn           TEXT,
    sort_sn             INTEGER         NOT NULL DEFAULT 0,
    del_yn              CHAR(1)         NOT NULL DEFAULT 'N',
    reg_user_id         VARCHAR(50)     NOT NULL,
    reg_dt              TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    mod_user_id         VARCHAR(50),
    mod_dt              TIMESTAMP
);
COMMENT ON TABLE  tb_ds_area_item IS '영역 항목';
COMMENT ON COLUMN tb_ds_area_item.area_item_id IS '영역항목 식별자';
COMMENT ON COLUMN tb_ds_area_item.area_id IS '영역 식별자';
COMMENT ON COLUMN tb_ds_area_item.item_nm IS '항목명 (논리)';
COMMENT ON COLUMN tb_ds_area_item.item_cd IS '항목 코드 (물리)';
COMMENT ON COLUMN tb_ds_area_item.data_type_cd IS '데이터 유형코드';
COMMENT ON COLUMN tb_ds_area_item.data_len IS '데이터 길이';
COMMENT ON COLUMN tb_ds_area_item.required_yn IS '필수 여부';
COMMENT ON COLUMN tb_ds_area_item.item_purpose_cd IS '항목 용도코드 (SEARCH/DISPLAY/INPUT/BUTTON)';
COMMENT ON COLUMN tb_ds_area_item.remark_cn IS '비고 내용';
COMMENT ON COLUMN tb_ds_area_item.sort_sn IS '정렬 순번';
COMMENT ON COLUMN tb_ds_area_item.del_yn IS '삭제 여부';
COMMENT ON COLUMN tb_ds_area_item.reg_user_id IS '등록자 식별자';
COMMENT ON COLUMN tb_ds_area_item.reg_dt IS '등록 일시';
COMMENT ON COLUMN tb_ds_area_item.mod_user_id IS '수정자 식별자';
COMMENT ON COLUMN tb_ds_area_item.mod_dt IS '수정 일시';

CREATE INDEX idx_ds_area_item_area ON tb_ds_area_item(area_id);

-- ds-07. 항목-컬럼 매핑
CREATE TABLE tb_ds_item_col_map (
    item_col_map_id     BIGSERIAL       PRIMARY KEY,
    area_item_id        BIGINT          NOT NULL REFERENCES tb_ds_area_item(area_item_id),
    table_id            BIGINT,
    column_id           BIGINT,
    manual_table_nm     VARCHAR(100),
    manual_column_nm    VARCHAR(100),
    map_type_cd         VARCHAR(20)     NOT NULL DEFAULT 'DISPLAY',
    reg_user_id         VARCHAR(50)     NOT NULL,
    reg_dt              TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP
);
COMMENT ON TABLE  tb_ds_item_col_map IS '항목-컬럼 매핑';
COMMENT ON COLUMN tb_ds_item_col_map.item_col_map_id IS '항목컬럼매핑 식별자';
COMMENT ON COLUMN tb_ds_item_col_map.area_item_id IS '영역항목 식별자';
COMMENT ON COLUMN tb_ds_item_col_map.table_id IS 'DB테이블 식별자';
COMMENT ON COLUMN tb_ds_item_col_map.column_id IS 'DB컬럼 식별자';
COMMENT ON COLUMN tb_ds_item_col_map.manual_table_nm IS '수동입력 테이블명 (스키마 미등록 시)';
COMMENT ON COLUMN tb_ds_item_col_map.manual_column_nm IS '수동입력 컬럼명 (스키마 미등록 시)';
COMMENT ON COLUMN tb_ds_item_col_map.map_type_cd IS '매핑 유형코드 (DISPLAY/SAVE/CONDITION)';
COMMENT ON COLUMN tb_ds_item_col_map.reg_user_id IS '등록자 식별자';
COMMENT ON COLUMN tb_ds_item_col_map.reg_dt IS '등록 일시';

CREATE INDEX idx_ds_item_col_item ON tb_ds_item_col_map(area_item_id);
CREATE INDEX idx_ds_item_col_table ON tb_ds_item_col_map(table_id);

-- ds-08. 기능
CREATE TABLE tb_ds_func (
    func_id             BIGSERIAL       PRIMARY KEY,
    area_id             BIGINT          NOT NULL REFERENCES tb_ds_area(area_id),
    func_nm             VARCHAR(300)    NOT NULL,
    func_type_cd        VARCHAR(20)     NOT NULL,
    func_cn             TEXT,
    logic_cn            TEXT,
    sql_overview_cn     TEXT,
    biz_rule_cn         TEXT,
    raw_spec_cn         TEXT,
    sort_sn             INTEGER         NOT NULL DEFAULT 0,
    del_yn              CHAR(1)         NOT NULL DEFAULT 'N',
    reg_user_id         VARCHAR(50)     NOT NULL,
    reg_dt              TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    mod_user_id         VARCHAR(50),
    mod_dt              TIMESTAMP
);
COMMENT ON TABLE  tb_ds_func IS '기능';
COMMENT ON COLUMN tb_ds_func.func_id IS '기능 식별자';
COMMENT ON COLUMN tb_ds_func.area_id IS '영역 식별자';
COMMENT ON COLUMN tb_ds_func.func_nm IS '기능명';
COMMENT ON COLUMN tb_ds_func.func_type_cd IS '기능 유형코드 (SELECT/INSERT/UPDATE/DELETE/BUTTON/EVENT)';
COMMENT ON COLUMN tb_ds_func.func_cn IS '기능 내용 (마크다운)';
COMMENT ON COLUMN tb_ds_func.logic_cn IS '처리로직 내용 (마크다운)';
COMMENT ON COLUMN tb_ds_func.sql_overview_cn IS 'SQL개요 내용 (마크다운 코드블록)';
COMMENT ON COLUMN tb_ds_func.biz_rule_cn IS '업무규칙 내용 (마크다운)';
COMMENT ON COLUMN tb_ds_func.raw_spec_cn IS '자유형식 스펙 내용 (마크다운, 텍스트 기반 설계 병행용)';
COMMENT ON COLUMN tb_ds_func.sort_sn IS '정렬 순번';
COMMENT ON COLUMN tb_ds_func.del_yn IS '삭제 여부';
COMMENT ON COLUMN tb_ds_func.reg_user_id IS '등록자 식별자';
COMMENT ON COLUMN tb_ds_func.reg_dt IS '등록 일시';
COMMENT ON COLUMN tb_ds_func.mod_user_id IS '수정자 식별자';
COMMENT ON COLUMN tb_ds_func.mod_dt IS '수정 일시';

CREATE INDEX idx_ds_func_area ON tb_ds_func(area_id);

-- ds-09. 기능 버전 이력
CREATE TABLE tb_ds_func_ver (
    func_ver_id         BIGSERIAL       PRIMARY KEY,
    func_id             BIGINT          NOT NULL REFERENCES tb_ds_func(func_id),
    ver_sn              INTEGER         NOT NULL,
    snapshot_cn         TEXT            NOT NULL,
    change_reason_cn    TEXT,
    reg_user_id         VARCHAR(50)     NOT NULL,
    reg_dt              TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP
);
COMMENT ON TABLE  tb_ds_func_ver IS '기능 버전 이력';
COMMENT ON COLUMN tb_ds_func_ver.func_ver_id IS '기능버전 식별자';
COMMENT ON COLUMN tb_ds_func_ver.func_id IS '기능 식별자';
COMMENT ON COLUMN tb_ds_func_ver.ver_sn IS '버전 순번';
COMMENT ON COLUMN tb_ds_func_ver.snapshot_cn IS '스냅샷 내용 (JSON)';
COMMENT ON COLUMN tb_ds_func_ver.change_reason_cn IS '변경 사유 내용';
COMMENT ON COLUMN tb_ds_func_ver.reg_user_id IS '등록자 식별자';
COMMENT ON COLUMN tb_ds_func_ver.reg_dt IS '등록 일시';

CREATE INDEX idx_ds_func_ver_func ON tb_ds_func_ver(func_id);

-- ds-10. 기능 I/O 매핑
CREATE TABLE tb_ds_func_io (
    func_io_id          BIGSERIAL       PRIMARY KEY,
    func_id             BIGINT          NOT NULL REFERENCES tb_ds_func(func_id),
    io_type_cd          VARCHAR(10)     NOT NULL,
    item_nm             VARCHAR(200)    NOT NULL,
    table_id            BIGINT,
    column_id           BIGINT,
    manual_table_nm     VARCHAR(100),
    manual_column_nm    VARCHAR(100),
    data_type_cd        VARCHAR(50),
    required_yn         CHAR(1)         NOT NULL DEFAULT 'N',
    remark_cn           TEXT,
    sort_sn             INTEGER         NOT NULL DEFAULT 0,
    del_yn              CHAR(1)         NOT NULL DEFAULT 'N',
    reg_user_id         VARCHAR(50)     NOT NULL,
    reg_dt              TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    mod_user_id         VARCHAR(50),
    mod_dt              TIMESTAMP
);
COMMENT ON TABLE  tb_ds_func_io IS '기능 I/O 매핑';
COMMENT ON COLUMN tb_ds_func_io.func_io_id IS '기능IO 식별자';
COMMENT ON COLUMN tb_ds_func_io.func_id IS '기능 식별자';
COMMENT ON COLUMN tb_ds_func_io.io_type_cd IS 'IO 유형코드 (INPUT/OUTPUT)';
COMMENT ON COLUMN tb_ds_func_io.item_nm IS '항목명';
COMMENT ON COLUMN tb_ds_func_io.table_id IS 'DB테이블 식별자';
COMMENT ON COLUMN tb_ds_func_io.column_id IS 'DB컬럼 식별자';
COMMENT ON COLUMN tb_ds_func_io.manual_table_nm IS '수동입력 테이블명';
COMMENT ON COLUMN tb_ds_func_io.manual_column_nm IS '수동입력 컬럼명';
COMMENT ON COLUMN tb_ds_func_io.data_type_cd IS '데이터 유형코드';
COMMENT ON COLUMN tb_ds_func_io.required_yn IS '필수 여부';
COMMENT ON COLUMN tb_ds_func_io.remark_cn IS '비고 내용';
COMMENT ON COLUMN tb_ds_func_io.sort_sn IS '정렬 순번';
COMMENT ON COLUMN tb_ds_func_io.del_yn IS '삭제 여부';
COMMENT ON COLUMN tb_ds_func_io.reg_user_id IS '등록자 식별자';
COMMENT ON COLUMN tb_ds_func_io.reg_dt IS '등록 일시';
COMMENT ON COLUMN tb_ds_func_io.mod_user_id IS '수정자 식별자';
COMMENT ON COLUMN tb_ds_func_io.mod_dt IS '수정 일시';

CREATE INDEX idx_ds_func_io_func ON tb_ds_func_io(func_id);

-- ds-11. DB 테이블
CREATE TABLE tb_ds_db_table (
    table_id            BIGSERIAL       PRIMARY KEY,
    project_id          BIGINT          NOT NULL REFERENCES tb_cm_project(project_id),
    table_physical_nm   VARCHAR(100)    NOT NULL,
    table_logical_nm    VARCHAR(200)    NOT NULL,
    table_cn            TEXT,
    sort_sn             INTEGER         NOT NULL DEFAULT 0,
    del_yn              CHAR(1)         NOT NULL DEFAULT 'N',
    reg_user_id         VARCHAR(50)     NOT NULL,
    reg_dt              TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    mod_user_id         VARCHAR(50),
    mod_dt              TIMESTAMP,
    UNIQUE (project_id, table_physical_nm)
);
COMMENT ON TABLE  tb_ds_db_table IS 'DB 테이블';
COMMENT ON COLUMN tb_ds_db_table.table_id IS 'DB테이블 식별자';
COMMENT ON COLUMN tb_ds_db_table.project_id IS '프로젝트 식별자';
COMMENT ON COLUMN tb_ds_db_table.table_physical_nm IS '테이블 물리명';
COMMENT ON COLUMN tb_ds_db_table.table_logical_nm IS '테이블 논리명';
COMMENT ON COLUMN tb_ds_db_table.table_cn IS '테이블 내용';
COMMENT ON COLUMN tb_ds_db_table.sort_sn IS '정렬 순번';
COMMENT ON COLUMN tb_ds_db_table.del_yn IS '삭제 여부';
COMMENT ON COLUMN tb_ds_db_table.reg_user_id IS '등록자 식별자';
COMMENT ON COLUMN tb_ds_db_table.reg_dt IS '등록 일시';
COMMENT ON COLUMN tb_ds_db_table.mod_user_id IS '수정자 식별자';
COMMENT ON COLUMN tb_ds_db_table.mod_dt IS '수정 일시';

CREATE INDEX idx_ds_db_table_project ON tb_ds_db_table(project_id);

-- ds-12. DB 컬럼
CREATE TABLE tb_ds_db_column (
    column_id           BIGSERIAL       PRIMARY KEY,
    table_id            BIGINT          NOT NULL REFERENCES tb_ds_db_table(table_id),
    column_physical_nm  VARCHAR(100)    NOT NULL,
    column_logical_nm   VARCHAR(200)    NOT NULL,
    data_type_cd        VARCHAR(50)     NOT NULL,
    data_len            INTEGER,
    data_precision_len  INTEGER,
    not_null_yn         CHAR(1)         NOT NULL DEFAULT 'N',
    pk_yn               CHAR(1)         NOT NULL DEFAULT 'N',
    fk_ref_cn           VARCHAR(200),
    default_val         VARCHAR(200),
    remark_cn           TEXT,
    sort_sn             INTEGER         NOT NULL DEFAULT 0,
    del_yn              CHAR(1)         NOT NULL DEFAULT 'N',
    reg_user_id         VARCHAR(50)     NOT NULL,
    reg_dt              TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    mod_user_id         VARCHAR(50),
    mod_dt              TIMESTAMP
);
COMMENT ON TABLE  tb_ds_db_column IS 'DB 컬럼';
COMMENT ON COLUMN tb_ds_db_column.column_id IS 'DB컬럼 식별자';
COMMENT ON COLUMN tb_ds_db_column.table_id IS 'DB테이블 식별자';
COMMENT ON COLUMN tb_ds_db_column.column_physical_nm IS '컬럼 물리명';
COMMENT ON COLUMN tb_ds_db_column.column_logical_nm IS '컬럼 논리명';
COMMENT ON COLUMN tb_ds_db_column.data_type_cd IS '데이터 유형코드';
COMMENT ON COLUMN tb_ds_db_column.data_len IS '데이터 길이';
COMMENT ON COLUMN tb_ds_db_column.data_precision_len IS '소수점 길이';
COMMENT ON COLUMN tb_ds_db_column.not_null_yn IS 'NOT NULL 여부';
COMMENT ON COLUMN tb_ds_db_column.pk_yn IS 'PK 여부';
COMMENT ON COLUMN tb_ds_db_column.fk_ref_cn IS 'FK 참조 내용 (테이블.컬럼)';
COMMENT ON COLUMN tb_ds_db_column.default_val IS '기본 값';
COMMENT ON COLUMN tb_ds_db_column.remark_cn IS '비고 내용';
COMMENT ON COLUMN tb_ds_db_column.sort_sn IS '정렬 순번';
COMMENT ON COLUMN tb_ds_db_column.del_yn IS '삭제 여부';
COMMENT ON COLUMN tb_ds_db_column.reg_user_id IS '등록자 식별자';
COMMENT ON COLUMN tb_ds_db_column.reg_dt IS '등록 일시';
COMMENT ON COLUMN tb_ds_db_column.mod_user_id IS '수정자 식별자';
COMMENT ON COLUMN tb_ds_db_column.mod_dt IS '수정 일시';

CREATE INDEX idx_ds_db_column_table ON tb_ds_db_column(table_id);

-- ds-13. DB 인덱스
CREATE TABLE tb_ds_db_index (
    index_id            BIGSERIAL       PRIMARY KEY,
    table_id            BIGINT          NOT NULL REFERENCES tb_ds_db_table(table_id),
    index_nm            VARCHAR(100)    NOT NULL,
    index_type_cd       VARCHAR(20)     NOT NULL DEFAULT 'NON_UNIQUE',
    index_column_cn     TEXT            NOT NULL,
    reg_user_id         VARCHAR(50)     NOT NULL,
    reg_dt              TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP
);
COMMENT ON TABLE  tb_ds_db_index IS 'DB 인덱스';
COMMENT ON COLUMN tb_ds_db_index.index_id IS 'DB인덱스 식별자';
COMMENT ON COLUMN tb_ds_db_index.table_id IS 'DB테이블 식별자';
COMMENT ON COLUMN tb_ds_db_index.index_nm IS '인덱스명';
COMMENT ON COLUMN tb_ds_db_index.index_type_cd IS '인덱스 유형코드 (UNIQUE/NON_UNIQUE)';
COMMENT ON COLUMN tb_ds_db_index.index_column_cn IS '인덱스 구성컬럼 내용 (콤마 구분)';
COMMENT ON COLUMN tb_ds_db_index.reg_user_id IS '등록자 식별자';
COMMENT ON COLUMN tb_ds_db_index.reg_dt IS '등록 일시';

CREATE INDEX idx_ds_db_index_table ON tb_ds_db_index(table_id);

-- ============================================================
-- [ai] AI Task
-- ============================================================

-- ai-01. AI Task 큐
CREATE TABLE tb_ai_task (
    ai_task_id          BIGSERIAL       PRIMARY KEY,
    project_id          BIGINT          NOT NULL REFERENCES tb_cm_project(project_id),
    ref_type_cd         VARCHAR(30)     NOT NULL,
    ref_id              BIGINT          NOT NULL,
    task_type_cd        VARCHAR(30)     NOT NULL,
    task_status_cd      VARCHAR(30)     NOT NULL DEFAULT 'WAITING',
    result_grade_cd     VARCHAR(20),
    spec_prompt_cn      TEXT,
    user_prompt_cn      TEXT,
    ai_response_cn      TEXT,
    error_msg_cn        TEXT,
    request_dt          TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    start_dt            TIMESTAMP,
    end_dt              TIMESTAMP,
    elapsed_sec         INTEGER,
    retry_cnt           INTEGER         NOT NULL DEFAULT 0,
    del_yn              CHAR(1)         NOT NULL DEFAULT 'N',
    reg_user_id         VARCHAR(50)     NOT NULL,
    reg_dt              TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    mod_user_id         VARCHAR(50),
    mod_dt              TIMESTAMP
);
COMMENT ON TABLE  tb_ai_task IS 'AI Task 큐';
COMMENT ON COLUMN tb_ai_task.ai_task_id IS 'AI Task 식별자';
COMMENT ON COLUMN tb_ai_task.project_id IS '프로젝트 식별자';
COMMENT ON COLUMN tb_ai_task.ref_type_cd IS '참조 유형코드 (FUNCTION/PLAN_LAB/SCREEN/AREA 등)';
COMMENT ON COLUMN tb_ai_task.ref_id IS '참조 식별자';
COMMENT ON COLUMN tb_ai_task.task_type_cd IS 'Task 유형코드 (DESIGN/VERIFY/IMPLEMENT/ANALYSIS/BOARD)';
COMMENT ON COLUMN tb_ai_task.task_status_cd IS 'Task 상태코드 (WAITING/RUNNING/DONE_OK/DONE_REVIEW/FAILED)';
COMMENT ON COLUMN tb_ai_task.result_grade_cd IS '결과 등급코드 (OK/REVIEW_NEEDED)';
COMMENT ON COLUMN tb_ai_task.spec_prompt_cn IS '스펙 프롬프트 내용 (시스템 자동 조립)';
COMMENT ON COLUMN tb_ai_task.user_prompt_cn IS '사용자 프롬프트 내용 (직접 입력)';
COMMENT ON COLUMN tb_ai_task.ai_response_cn IS 'AI 응답 내용';
COMMENT ON COLUMN tb_ai_task.error_msg_cn IS '에러 메시지 내용';
COMMENT ON COLUMN tb_ai_task.request_dt IS '요청 일시';
COMMENT ON COLUMN tb_ai_task.start_dt IS '시작 일시';
COMMENT ON COLUMN tb_ai_task.end_dt IS '종료 일시';
COMMENT ON COLUMN tb_ai_task.elapsed_sec IS '소요 시간(초)';
COMMENT ON COLUMN tb_ai_task.retry_cnt IS '재시도 건수';
COMMENT ON COLUMN tb_ai_task.del_yn IS '삭제 여부';
COMMENT ON COLUMN tb_ai_task.reg_user_id IS '등록자 식별자';
COMMENT ON COLUMN tb_ai_task.reg_dt IS '등록 일시';
COMMENT ON COLUMN tb_ai_task.mod_user_id IS '수정자 식별자';
COMMENT ON COLUMN tb_ai_task.mod_dt IS '수정 일시';

CREATE INDEX idx_ai_task_project ON tb_ai_task(project_id);
CREATE INDEX idx_ai_task_ref ON tb_ai_task(ref_type_cd, ref_id);
CREATE INDEX idx_ai_task_status ON tb_ai_task(task_status_cd);

-- ai-02. AI Task 실행 로그
CREATE TABLE tb_ai_task_log (
    task_log_id         BIGSERIAL       PRIMARY KEY,
    ai_task_id          BIGINT          NOT NULL REFERENCES tb_ai_task(ai_task_id),
    log_sn              INTEGER         NOT NULL,
    log_event_cd        VARCHAR(50)     NOT NULL,
    log_detail_cn       TEXT,
    log_dt              TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP
);
COMMENT ON TABLE  tb_ai_task_log IS 'AI Task 실행 로그';
COMMENT ON COLUMN tb_ai_task_log.task_log_id IS 'Task로그 식별자';
COMMENT ON COLUMN tb_ai_task_log.ai_task_id IS 'AI Task 식별자';
COMMENT ON COLUMN tb_ai_task_log.log_sn IS '로그 순번';
COMMENT ON COLUMN tb_ai_task_log.log_event_cd IS '로그 이벤트코드 (START/PROMPT_SENT/RESPONSE_RECEIVED/ERROR/RETRY/COMPLETE)';
COMMENT ON COLUMN tb_ai_task_log.log_detail_cn IS '로그 상세 내용';
COMMENT ON COLUMN tb_ai_task_log.log_dt IS '로그 일시';

CREATE INDEX idx_ai_task_log_task ON tb_ai_task_log(ai_task_id);

-- ============================================================
-- [an] 분석 (Analysis) - 산출물, 프롬프트, 변경감지, 모순점, 영향도
-- ============================================================

-- an-01. 산출물 생성 이력
CREATE TABLE tb_an_output_hist (
    output_id           BIGSERIAL       PRIMARY KEY,
    project_id          BIGINT          NOT NULL REFERENCES tb_cm_project(project_id),
    output_type_cd      VARCHAR(30)     NOT NULL,
    output_format_cd    VARCHAR(10)     NOT NULL DEFAULT 'xlsx',
    output_scope_cn     VARCHAR(50),
    file_id             BIGINT          REFERENCES tb_cm_attach_file(file_id),
    gen_status_cd       VARCHAR(20)     NOT NULL DEFAULT 'GENERATING',
    reg_user_id         VARCHAR(50)     NOT NULL,
    reg_dt              TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP
);
COMMENT ON TABLE  tb_an_output_hist IS '산출물 생성 이력';
COMMENT ON COLUMN tb_an_output_hist.output_id IS '산출물 식별자';
COMMENT ON COLUMN tb_an_output_hist.project_id IS '프로젝트 식별자';
COMMENT ON COLUMN tb_an_output_hist.output_type_cd IS '산출물 유형코드 (TASK_COMPARE/REQ_DEF/REQ_TRACE/TASK_CHANGE)';
COMMENT ON COLUMN tb_an_output_hist.output_format_cd IS '출력 포맷코드 (xlsx/docx)';
COMMENT ON COLUMN tb_an_output_hist.output_scope_cn IS '출력 범위 내용';
COMMENT ON COLUMN tb_an_output_hist.file_id IS '파일 식별자';
COMMENT ON COLUMN tb_an_output_hist.gen_status_cd IS '생성 상태코드 (GENERATING/COMPLETED/FAILED)';
COMMENT ON COLUMN tb_an_output_hist.reg_user_id IS '등록자 식별자';
COMMENT ON COLUMN tb_an_output_hist.reg_dt IS '등록 일시';

CREATE INDEX idx_an_output_project ON tb_an_output_hist(project_id);

-- an-02. 프롬프트 템플릿
CREATE TABLE tb_an_prompt_tmpl (
    prompt_tmpl_id      BIGSERIAL       PRIMARY KEY,
    project_id          BIGINT          NOT NULL REFERENCES tb_cm_project(project_id),
    tmpl_nm             VARCHAR(200)    NOT NULL,
    tmpl_type_cd        VARCHAR(30)     NOT NULL,
    tmpl_cn             TEXT            NOT NULL,
    del_yn              CHAR(1)         NOT NULL DEFAULT 'N',
    reg_user_id         VARCHAR(50)     NOT NULL,
    reg_dt              TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    mod_user_id         VARCHAR(50),
    mod_dt              TIMESTAMP
);
COMMENT ON TABLE  tb_an_prompt_tmpl IS '프롬프트 템플릿';
COMMENT ON COLUMN tb_an_prompt_tmpl.prompt_tmpl_id IS '프롬프트템플릿 식별자';
COMMENT ON COLUMN tb_an_prompt_tmpl.project_id IS '프로젝트 식별자';
COMMENT ON COLUMN tb_an_prompt_tmpl.tmpl_nm IS '템플릿명';
COMMENT ON COLUMN tb_an_prompt_tmpl.tmpl_type_cd IS '템플릿 유형코드 (PLAN/PRD/CUSTOM)';
COMMENT ON COLUMN tb_an_prompt_tmpl.tmpl_cn IS '템플릿 내용 (마크다운)';
COMMENT ON COLUMN tb_an_prompt_tmpl.del_yn IS '삭제 여부';
COMMENT ON COLUMN tb_an_prompt_tmpl.reg_user_id IS '등록자 식별자';
COMMENT ON COLUMN tb_an_prompt_tmpl.reg_dt IS '등록 일시';
COMMENT ON COLUMN tb_an_prompt_tmpl.mod_user_id IS '수정자 식별자';
COMMENT ON COLUMN tb_an_prompt_tmpl.mod_dt IS '수정 일시';

-- an-03. 프롬프트 생성 이력
CREATE TABLE tb_an_prompt_hist (
    prompt_hist_id      BIGSERIAL       PRIMARY KEY,
    project_id          BIGINT          NOT NULL REFERENCES tb_cm_project(project_id),
    prompt_tmpl_id      BIGINT          REFERENCES tb_an_prompt_tmpl(prompt_tmpl_id),
    selected_scope_cn   TEXT,
    generated_cn        TEXT            NOT NULL,
    reg_user_id         VARCHAR(50)     NOT NULL,
    reg_dt              TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP
);
COMMENT ON TABLE  tb_an_prompt_hist IS '프롬프트 생성 이력';
COMMENT ON COLUMN tb_an_prompt_hist.prompt_hist_id IS '프롬프트이력 식별자';
COMMENT ON COLUMN tb_an_prompt_hist.project_id IS '프로젝트 식별자';
COMMENT ON COLUMN tb_an_prompt_hist.prompt_tmpl_id IS '프롬프트템플릿 식별자';
COMMENT ON COLUMN tb_an_prompt_hist.selected_scope_cn IS '선택 범위 내용 (JSON)';
COMMENT ON COLUMN tb_an_prompt_hist.generated_cn IS '생성 내용';
COMMENT ON COLUMN tb_an_prompt_hist.reg_user_id IS '등록자 식별자';
COMMENT ON COLUMN tb_an_prompt_hist.reg_dt IS '등록 일시';

-- an-04. 변경 감지 로그
CREATE TABLE tb_an_change_detect (
    detect_id           BIGSERIAL       PRIMARY KEY,
    project_id          BIGINT          NOT NULL REFERENCES tb_cm_project(project_id),
    change_target_cd    VARCHAR(30)     NOT NULL,
    change_ref_id       BIGINT          NOT NULL,
    change_item_nm      VARCHAR(200),
    change_summary_cn   TEXT,
    detect_dt           TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP
);
COMMENT ON TABLE  tb_an_change_detect IS '변경 감지 로그';
COMMENT ON COLUMN tb_an_change_detect.detect_id IS '변경감지 식별자';
COMMENT ON COLUMN tb_an_change_detect.project_id IS '프로젝트 식별자';
COMMENT ON COLUMN tb_an_change_detect.change_target_cd IS '변경 대상코드 (REQUIREMENT/SCREEN/AREA/FUNCTION/SCHEMA)';
COMMENT ON COLUMN tb_an_change_detect.change_ref_id IS '변경 참조 식별자';
COMMENT ON COLUMN tb_an_change_detect.change_item_nm IS '변경 항목명';
COMMENT ON COLUMN tb_an_change_detect.change_summary_cn IS '변경 요약 내용';
COMMENT ON COLUMN tb_an_change_detect.detect_dt IS '감지 일시';

CREATE INDEX idx_an_change_project ON tb_an_change_detect(project_id);

-- an-05. 모순점 리포트
CREATE TABLE tb_an_contradiction (
    contradiction_id    BIGSERIAL       PRIMARY KEY,
    project_id          BIGINT          NOT NULL REFERENCES tb_cm_project(project_id),
    detect_id           BIGINT          REFERENCES tb_an_change_detect(detect_id),
    contradiction_type_cd VARCHAR(50)   NOT NULL,
    related_a_type_cd   VARCHAR(30)     NOT NULL,
    related_a_id        BIGINT          NOT NULL,
    related_b_type_cd   VARCHAR(30)     NOT NULL,
    related_b_id        BIGINT          NOT NULL,
    contradiction_cn    TEXT            NOT NULL,
    severity_cd         VARCHAR(10)     NOT NULL DEFAULT 'MEDIUM',
    resolved_yn         CHAR(1)         NOT NULL DEFAULT 'N',
    reg_dt              TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP
);
COMMENT ON TABLE  tb_an_contradiction IS '모순점 리포트';
COMMENT ON COLUMN tb_an_contradiction.contradiction_id IS '모순점 식별자';
COMMENT ON COLUMN tb_an_contradiction.project_id IS '프로젝트 식별자';
COMMENT ON COLUMN tb_an_contradiction.detect_id IS '변경감지 식별자';
COMMENT ON COLUMN tb_an_contradiction.contradiction_type_cd IS '모순 유형코드 (LOGIC_CONFLICT/DATA_MISMATCH/MISSING_REF)';
COMMENT ON COLUMN tb_an_contradiction.related_a_type_cd IS '관련A 유형코드';
COMMENT ON COLUMN tb_an_contradiction.related_a_id IS '관련A 식별자';
COMMENT ON COLUMN tb_an_contradiction.related_b_type_cd IS '관련B 유형코드';
COMMENT ON COLUMN tb_an_contradiction.related_b_id IS '관련B 식별자';
COMMENT ON COLUMN tb_an_contradiction.contradiction_cn IS '모순 내용';
COMMENT ON COLUMN tb_an_contradiction.severity_cd IS '심각도 코드 (HIGH/MEDIUM/LOW)';
COMMENT ON COLUMN tb_an_contradiction.resolved_yn IS '해결 여부';
COMMENT ON COLUMN tb_an_contradiction.reg_dt IS '등록 일시';

CREATE INDEX idx_an_contradiction_project ON tb_an_contradiction(project_id);

-- an-06. 영향도 분석 결과
CREATE TABLE tb_an_impact (
    impact_id           BIGSERIAL       PRIMARY KEY,
    detect_id           BIGINT          NOT NULL REFERENCES tb_an_change_detect(detect_id),
    impact_target_cd    VARCHAR(30)     NOT NULL,
    impact_ref_id       BIGINT          NOT NULL,
    impact_cn           TEXT,
    reg_dt              TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP
);
COMMENT ON TABLE  tb_an_impact IS '영향도 분석 결과';
COMMENT ON COLUMN tb_an_impact.impact_id IS '영향도 식별자';
COMMENT ON COLUMN tb_an_impact.detect_id IS '변경감지 식별자';
COMMENT ON COLUMN tb_an_impact.impact_target_cd IS '영향 대상코드 (SCREEN/AREA/FUNCTION/SCHEMA)';
COMMENT ON COLUMN tb_an_impact.impact_ref_id IS '영향 참조 식별자';
COMMENT ON COLUMN tb_an_impact.impact_cn IS '영향 내용';
COMMENT ON COLUMN tb_an_impact.reg_dt IS '등록 일시';

CREATE INDEX idx_an_impact_detect ON tb_an_impact(detect_id);

-- ============================================================
-- FK 보완 (항목-컬럼 매핑, 기능 I/O → DB 테이블/컬럼)
-- ============================================================
ALTER TABLE tb_ds_item_col_map
    ADD CONSTRAINT fk_ds_item_col_table FOREIGN KEY (table_id) REFERENCES tb_ds_db_table(table_id),
    ADD CONSTRAINT fk_ds_item_col_column FOREIGN KEY (column_id) REFERENCES tb_ds_db_column(column_id);

ALTER TABLE tb_ds_func_io
    ADD CONSTRAINT fk_ds_func_io_table FOREIGN KEY (table_id) REFERENCES tb_ds_db_table(table_id),
    ADD CONSTRAINT fk_ds_func_io_column FOREIGN KEY (column_id) REFERENCES tb_ds_db_column(column_id);

-- ============================================================
-- END OF DDL v3 (31 tables)
-- ============================================================
