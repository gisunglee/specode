"""
run_ai_tasks.py — SPECODE AI 태스크 범용 처리 스크립트

흐름:
  1. GET  /api/ai/tasks          → 대기(NONE) 태스크 목록 조회
  2. for each task:
       a. PATCH /api/ai/tasks/{id}/start   → RUNNING
       b. claude CLI 호출 (Pro 구독)        → 결과 생성
       c. POST  /api/ai/tasks/{id}/complete → 결과 전달

환경변수 (.env):
  API_SECRET_KEY  — SPECODE X-API-Key  (기본: openclaw-api-key-here)
  SPECODE_URL     — 서버 URL           (기본: http://localhost:3000)
  TASK_LIMIT      — 처리 건수 제한      (기본: 10)
  TASK_TYPE       — taskType 필터       (선택: DESIGN|REVIEW|IMPLEMENT|IMPACT|INSPECT)
"""

import os
import sys
import shutil
import subprocess
import requests
from dotenv import load_dotenv

# Windows 콘솔 UTF-8 설정
if sys.stdout.encoding != "utf-8":
    sys.stdout.reconfigure(encoding="utf-8")
if sys.stderr.encoding != "utf-8":
    sys.stderr.reconfigure(encoding="utf-8")

load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), "..", ".env"))

BASE_URL  = os.getenv("SPECODE_URL", "http://localhost:3000")
API_KEY   = os.getenv("API_SECRET_KEY", "")
LIMIT     = int(os.getenv("TASK_LIMIT", "10"))
TASK_TYPE = os.getenv("TASK_TYPE", "")  # 빈 문자열 = 전체

HEADERS = {
    "X-API-Key": API_KEY,
    "Content-Type": "application/json",
}


# ────────────────────────────────────────────────────────────
# SPECODE API
# ────────────────────────────────────────────────────────────

def fetch_pending_tasks() -> list:
    params = {"limit": LIMIT}
    if TASK_TYPE:
        params["taskType"] = TASK_TYPE

    r = requests.get(f"{BASE_URL}/api/ai/tasks", params=params, headers=HEADERS, timeout=10)
    r.raise_for_status()
    return r.json().get("data", [])


def start_task(task_id: int):
    r = requests.patch(f"{BASE_URL}/api/ai/tasks/{task_id}/start", headers=HEADERS, timeout=10)
    r.raise_for_status()


def complete_task(task_id: int, status: str, feedback: str):
    r = requests.post(
        f"{BASE_URL}/api/ai/tasks/{task_id}/complete",
        json={"taskStatus": status, "feedback": feedback},
        headers=HEADERS,
        timeout=30,
    )
    r.raise_for_status()


# ────────────────────────────────────────────────────────────
# AI 호출
# ────────────────────────────────────────────────────────────

PROMPTS = {
    "INSPECT": """\
당신은 SI 개발 프로젝트의 요구사항분석, 기능 및 설계를 검토하는 시니어 개발자입니다.
아래 스펙 내용을 점검하고 완성도·명확성·일관성·실용성 관점에서 피드백을 마크다운으로 작성하세요.

{spec}
{comment}""",

    "DESIGN": """\
당신은 SI 개발 프로젝트의 상세설계 전문가입니다.
아래 기능 명세를 바탕으로 AI 상세설계 문서를 마크다운으로 작성하세요.
(데이터 흐름, 처리 로직, 예외 처리, 관련 테이블/API 포함)

{spec}
{comment}""",

    "IMPLEMENT": """\
당신은 SI 개발 프로젝트의 시니어 개발자입니다.
아래 기능 명세를 바탕으로 구현을 진행 하세요.

{spec}
{comment}""",

    "_DEFAULT": """\
당신은 SI 개발 프로젝트 전문가입니다.
아래 내용을 분석하고 결과를 마크다운으로 작성하세요.

{spec}
{comment}""",
}


def call_ai(task: dict) -> str:
    """claude CLI 서브프로세스로 AI 호출 (Pro 구독 사용, API 키 불필요)"""
    template = PROMPTS.get(task.get("taskType", ""), PROMPTS["_DEFAULT"])

    spec          = task.get("spec") or "(내용 없음)"
    comment       = task.get("comment") or ""
    comment_block = f"\n## 추가 요청사항\n{comment}" if comment else ""

    prompt = template.format(spec=spec, comment=comment_block)

    # claude 실행 파일 경로 탐색 (Windows: claude.cmd)
    claude_bin = shutil.which("claude")
    if not claude_bin:
        raise RuntimeError("claude CLI를 찾을 수 없습니다. Claude Code가 설치되어 있는지 확인하세요.")

    # CLAUDECODE 제거: 중첩 실행 방지 오류 우회
    env = os.environ.copy()
    env.pop("CLAUDECODE", None)

    result = subprocess.run(
        [claude_bin, "-p", prompt, "--output-format", "text"],
        capture_output=True,
        text=True,
        encoding="utf-8",
        timeout=120,
        env=env,
    )

    if result.returncode != 0:
        raise RuntimeError(result.stderr.strip() or "claude CLI 오류")

    return result.stdout.strip()


# ────────────────────────────────────────────────────────────
# 메인
# ────────────────────────────────────────────────────────────

def main():
    print("=" * 50)
    print("  SPECODE — AI 태스크 처리")
    print(f"  서버  : {BASE_URL}")
    print(f"  AI    : claude CLI (Pro 구독)")
    print(f"  필터  : taskType={TASK_TYPE or '전체'}, limit={LIMIT}")
    print("=" * 50)

    # 1. 태스크 조회
    print("\n[1] 대기 태스크 조회...")
    try:
        tasks = fetch_pending_tasks()
    except Exception as e:
        print(f"❌ 조회 실패: {e}")
        sys.exit(1)

    if not tasks:
        print("  처리할 태스크가 없습니다.")
        return

    print(f"  → {len(tasks)}건")

    # 2. for 루프
    success, failed = 0, 0

    for i, task in enumerate(tasks, 1):
        tid  = task["aiTaskId"]
        sid  = task["systemId"]
        ttype = task.get("taskType", "?")
        print(f"\n[{i}/{len(tasks)}] {sid} | {ttype}")

        try:
            start_task(tid)
            print("  → RUNNING")

            print("  → AI 처리 중...")
            feedback = call_ai(task)

            complete_task(tid, "SUCCESS", feedback)
            print("  ✅ SUCCESS")
            success += 1

        except Exception as e:
            print(f"  ❌ 실패: {e}")
            try:
                complete_task(tid, "FAILED", str(e))
            except Exception:
                pass
            failed += 1

    # 3. 요약
    print("\n" + "=" * 50)
    print(f"  결과: 성공 {success}건 / 실패 {failed}건")
    print("=" * 50)


if __name__ == "__main__":
    main()
