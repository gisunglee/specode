# Claude Code 심화 가이드
### "도대체 어떻게 PPT, 엑셀, 영상까지 만드는 거야?"

> 기초 가이드를 읽었다면 이제 이걸 읽으세요.
> "그냥 채팅인데 왜 이렇게 많은 걸 할 수 있지?" 의 답이 여기 있습니다.

---

## 목차

1. [핵심 비밀: Claude는 "코드 실행 기계"다](#1-핵심-비밀)
2. [Claude가 가진 도구들 (Tool)](#2-claude가-가진-도구들)
3. [스킬의 실제 작동 원리](#3-스킬의-실제-작동-원리)
4. [MCP — 외부 서비스와 연결하기](#4-mcp--외부-서비스와-연결하기)
5. [실전: PPT 만들기 전 과정 해부](#5-실전-ppt-만들기-전-과정-해부)
6. [실전: 엑셀 만들기 전 과정 해부](#6-실전-엑셀-만들기-전-과정-해부)
7. [실전: 영상 자르기/합치기/TTS](#7-실전-영상-자르기합치기tts)
8. [나만의 "파일 생성" 커맨드 만들기](#8-나만의-파일-생성-커맨드-만들기)
9. [자동화 파이프라인 설계하기](#9-자동화-파이프라인-설계하기)

---

## 1. 핵심 비밀

### "도대체 어떻게 PPT를 만드는 거야?"

많은 사람들이 이렇게 생각합니다:

> "Claude는 그냥 텍스트를 생성하는 AI잖아?
> 근데 어떻게 PPT 파일, 엑셀 파일, 영상을 처리하지?
> 마법인가?"

**마법이 아닙니다.** 아주 단순한 원리예요.

```
Claude가 하는 것:
  1. 사용자 요청을 이해함
  2. 파이썬 코드를 머릿속에서 만듦
  3. 그 코드를 컴퓨터에서 실행시킴
  4. 결과 파일을 사용자에게 전달함
```

쉽게 말하면, **Claude = 코드를 대신 짜주는 + 실행해주는 AI** 입니다.

PPT를 만들 때 Claude가 실제로 하는 일:

```python
# Claude가 뒤에서 조용히 이 코드를 짜고 실행합니다
from pptx import Presentation
from pptx.util import Inches, Pt

prs = Presentation()
slide = prs.slides.add_slide(prs.slide_layouts[0])
title = slide.shapes.title
title.text = "사용자가 요청한 제목"

prs.save('결과물.pptx')
```

사용자는 그냥 "PPT 만들어줘"라고 말했는데, 뒤에서 Claude가 파이썬 코드를 실행하는 것입니다.

**이게 바로 핵심입니다.**

---

## 2. Claude가 가진 도구들

### 도구(Tool)란?

Claude는 그냥 텍스트만 생성하는 게 아니에요. 실제로 컴퓨터를 제어할 수 있는 **도구(Tool)** 를 가지고 있습니다.

| 도구 이름 | 하는 일 | 예시 |
|----------|---------|------|
| **Bash** | 터미널 명령어 실행 | `python 파일.py` 실행, npm install 등 |
| **Write** | 파일을 새로 만들거나 덮어씀 | 코드 파일, 텍스트 파일 생성 |
| **Read** | 파일 내용 읽기 | 코드 읽기, 설정 파일 확인 |
| **Edit** | 파일 일부 수정 | 특정 줄만 바꾸기 |
| **Glob** | 파일 찾기 | `*.ts` 파일 전부 찾기 |
| **Grep** | 파일 내용 검색 | 특정 코드 있는 파일 찾기 |
| **WebFetch** | 웹 페이지 가져오기 | API 문서 읽기 |
| **WebSearch** | 인터넷 검색 | 최신 정보 찾기 |

### Bash 도구가 핵심이에요

**Bash 도구** 하나만 있으면 사실상 모든 게 가능합니다.

```
Claude가 할 수 있는 것 = 터미널에서 할 수 있는 것
```

터미널에서 할 수 있는 것들:

```bash
# 파이썬 실행 → PPT, 엑셀, PDF 생성 가능
python make_ppt.py

# ffmpeg 실행 → 영상 자르기, 합치기 가능
ffmpeg -i 입력.mp4 -t 10 출력.mp4

# Node.js 실행 → 웹 스크래핑, API 호출 가능
node fetch_data.js

# curl 실행 → HTTP API 호출 가능
curl https://api.example.com/data
```

**결론**: Claude Code는 결국 "Claude가 코드를 짜서 터미널로 실행하는 것"입니다.

---

## 3. 스킬의 실제 작동 원리

### 스킬 = "이 도구로 이렇게 써라"는 정교한 지시서

`/document-skills:pptx` 같은 스킬을 실행하면 내부적으로 이런 지시서가 활성화됩니다:

```
"너는 PowerPoint 전문가야.
사용자가 PPT를 요청하면:
1. python-pptx 라이브러리를 써서 파이썬 코드를 작성해
2. 그 코드를 Bash 도구로 실행해
3. 결과 .pptx 파일을 사용자에게 전달해
4. 오류 나면 이렇게 처리해..."
```

스킬은 **Claude가 어떤 도구를, 어떤 순서로, 어떻게 써야 하는지 알려주는 가이드**입니다.

### 스킬 실행 흐름 — pptx 예시

```
사용자: "월간 보고서 PPT 만들어줘"
    ↓
스킬 지시서 활성화: "python-pptx로 만들어야 함"
    ↓
Claude가 파이썬 코드 작성:
    ┌─────────────────────────────────┐
    │ from pptx import Presentation   │
    │ prs = Presentation()            │
    │ slide = prs.slides.add_slide()  │
    │ title.text = "월간 보고서"       │
    │ prs.save('월간보고서.pptx')      │
    └─────────────────────────────────┘
    ↓
Bash 도구로 실행: python make_ppt.py
    ↓
파일 생성됨: 월간보고서.pptx
    ↓
사용자에게 파일 경로 전달
```

사용자 입장에선 그냥 말했는데 파일이 뚝 생기는 것처럼 보이는 이유가 이겁니다.

### 스킬별 사용하는 기술 정리

| 스킬 | 실제로 쓰는 기술 | 설치 필요한 것 |
|------|----------------|--------------|
| `/pptx` | Python `python-pptx` 라이브러리 | `pip install python-pptx` |
| `/xlsx` | Python `openpyxl` 라이브러리 | `pip install openpyxl` |
| `/pdf` | Python `pypdf2`, `reportlab` 등 | `pip install pypdf2` |
| `/canvas-design` | Python `Pillow` (이미지 처리) | `pip install Pillow` |
| `/webapp-testing` | `playwright` (브라우저 자동화) | `npm install playwright` |
| `/docx` | Python `python-docx` 라이브러리 | `pip install python-docx` |

**핵심 패턴**: 거의 모든 스킬이 **파이썬 라이브러리**를 씁니다.
파이썬이 컴퓨터에 설치되어 있고, 해당 라이브러리가 설치되어 있으면 됩니다.

---

## 4. MCP — 외부 서비스와 연결하기

### MCP가 뭔가요?

MCP(Model Context Protocol)는 **Claude와 외부 서비스를 연결하는 다리**입니다.

```
[Claude] ←── MCP 다리 ──→ [외부 서비스]

예시:
[Claude] ←── MCP ──→ [구글 드라이브]
[Claude] ←── MCP ──→ [노션]
[Claude] ←── MCP ──→ [슬랙]
[Claude] ←── MCP ──→ [브라우저 (Playwright)]
[Claude] ←── MCP ──→ [데이터베이스]
```

### MCP 없을 때 vs 있을 때

**MCP 없을 때:**
```
사용자: "구글 드라이브에서 파일 가져다가 분석해줘"
Claude: "저는 구글 드라이브에 접근할 수 없어요..."
```

**MCP 있을 때:**
```
사용자: "구글 드라이브에서 파일 가져다가 분석해줘"
Claude: [MCP로 구글 드라이브 연결] → 파일 가져옴 → 분석 → 결과 전달
```

### 현재 SPECODE에서 쓸 수 있는 MCP

| MCP 이름 | 하는 일 |
|---------|---------|
| **Context7** | 라이브러리 공식 문서를 실시간으로 가져옴 |
| **Sequential** | 복잡한 논리를 단계별로 분석 |
| **Magic** | 21st.dev에서 UI 컴포넌트 검색/생성 |
| **Playwright** | 브라우저를 직접 조종 (클릭, 입력 등) |

### MCP 설정은 어디서?

`C:\Users\USER\.claude\settings.json` (또는 프로젝트 `.claude/settings.json`)에서 설정합니다.

```json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": ["@playwright/mcp@latest"]
    },
    "구글드라이브": {
      "command": "npx",
      "args": ["@google-drive-mcp/server"],
      "env": {
        "GOOGLE_API_KEY": "여기에_API_키"
      }
    }
  }
}
```

이 설정 파일에 추가만 하면 Claude가 해당 서비스를 바로 쓸 수 있게 됩니다!

---

## 5. 실전: PPT 만들기 전 과정 해부

### 준비물 확인

```bash
# 파이썬 설치 확인
python --version

# python-pptx 설치
pip install python-pptx
```

### 방법 A: 그냥 말로 요청 (스킬 없이)

```
나: 다음 내용으로 PPT 만들어줘:
    - 제목: 2024 연간 사업계획
    - 슬라이드 1: 현황 분석 (bullet 3개)
    - 슬라이드 2: 목표 및 전략
    - 슬라이드 3: 일정표
    - 파일명: 사업계획.pptx
    - 저장 위치: d:/source/specode/
```

Claude가 알아서 파이썬 코드를 작성하고 실행합니다.

### 방법 B: 스킬 사용

```
나: /document-skills:pptx
    다음 내용으로 PPT 만들어줘: ...
```

스킬을 쓰면 Claude가 더 정확한 방법으로 PPT를 만듭니다 (슬라이드 디자인, 색상, 폰트 등).

### 실제 생성되는 코드 예시

Claude가 뒤에서 이런 코드를 짭니다:

```python
# Claude가 자동으로 작성하는 코드 (이걸 직접 짤 필요 없음!)
from pptx import Presentation
from pptx.util import Inches, Pt, Emu
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN

prs = Presentation()
prs.slide_width = Inches(13.33)
prs.slide_height = Inches(7.5)

# 슬라이드 1: 제목 슬라이드
slide_layout = prs.slide_layouts[0]
slide = prs.slides.add_slide(slide_layout)
title = slide.shapes.title
subtitle = slide.placeholders[1]

title.text = "2024 연간 사업계획"
title.text_frame.paragraphs[0].font.size = Pt(40)
title.text_frame.paragraphs[0].font.bold = True
title.text_frame.paragraphs[0].font.color.rgb = RGBColor(0x1F, 0x49, 0x7D)

# 슬라이드 2: 현황 분석
slide = prs.slides.add_slide(prs.slide_layouts[1])
title = slide.shapes.title
title.text = "현황 분석"

body = slide.placeholders[1]
tf = body.text_frame
tf.text = "• 시장 점유율 15% 달성"
p = tf.add_paragraph()
p.text = "• 전년 대비 매출 20% 증가"
p = tf.add_paragraph()
p.text = "• 신규 고객 500개사 확보"

prs.save('d:/source/specode/사업계획.pptx')
print("PPT 생성 완료!")
```

### 커맨드로 만들어서 반복 사용하기

자주 PPT를 만든다면 커맨드를 만들어두세요:

**`.claude/commands/make-report-ppt.md`**

```markdown
# make-report-ppt — 월간 보고서 PPT 자동 생성

SPECODE 월간 AI 태스크 보고서를 PPT로 만든다.

## 1단계: 데이터 수집
GET http://localhost:3000/api/ai-tasks?page=1&pageSize=100 에서 데이터 가져오기

## 2단계: 통계 계산
- 전체 건수, 성공/실패 수, 평균 처리시간 계산

## 3단계: PPT 생성
python-pptx를 사용하여 다음 슬라이드 구성으로 PPT 만들기:
- 슬라이드 1: 제목 (이번달 AI 태스크 현황)
- 슬라이드 2: 요약 통계 (차트 포함)
- 슬라이드 3: 상세 목록 (표 형식)
- 슬라이드 4: 다음달 계획

저장 위치: d:/source/specode/reports/월간보고서-{YYYY-MM}.pptx

$ARGUMENTS가 있으면 그 내용을 제목에 추가한다.
```

이제 그냥:
```
/make-report-ppt 2024년 3월
```
하면 자동으로 PPT가 뚝딱 생깁니다!

---

## 6. 실전: 엑셀 만들기 전 과정 해부

### 준비물 확인

```bash
pip install openpyxl
```

### 기본 요청

```
나: AI 태스크 결과 데이터를 엑셀로 뽑아줘.
    - 헤더: 태스크ID, 유형, 상태, 요청시각, 완료시각, 소요시간
    - 완료된 것만
    - 날짜별로 정렬
    - 파일명: ai_tasks.xlsx
```

### 더 정교하게: 조건부 서식, 차트 포함

```
나: AI 태스크 엑셀 파일 만들어줘.
    - 상태가 FAILED인 행은 빨간색 배경
    - SUCCESS인 행은 초록색 배경
    - 마지막 행에 합계/통계 추가
    - Sheet2에 상태별 파이 차트 추가
```

Claude가 뒤에서 이런 코드를 실행합니다:

```python
import openpyxl
from openpyxl.styles import PatternFill, Font
from openpyxl.chart import PieChart, Reference

wb = openpyxl.Workbook()
ws = wb.active
ws.title = "태스크 목록"

# 헤더
headers = ["태스크ID", "유형", "상태", "요청시각", "완료시각", "소요시간"]
for col, header in enumerate(headers, 1):
    cell = ws.cell(row=1, column=col, value=header)
    cell.font = Font(bold=True)

# 데이터 + 조건부 색상
green_fill = PatternFill(start_color="90EE90", fill_type="solid")
red_fill = PatternFill(start_color="FFB6C1", fill_type="solid")

for row_idx, task in enumerate(tasks, 2):
    ws.cell(row=row_idx, column=1, value=task['aiTaskId'])
    ws.cell(row=row_idx, column=3, value=task['taskStatus'])

    # 조건부 서식
    fill = green_fill if task['taskStatus'] == 'SUCCESS' else red_fill
    for col in range(1, 7):
        ws.cell(row=row_idx, column=col).fill = fill

wb.save('ai_tasks.xlsx')
```

---

## 7. 실전: 영상 자르기/합치기/TTS

### 준비물 확인

```bash
# ffmpeg 설치 (영상 처리)
# Windows: https://ffmpeg.org/download.html 에서 다운로드

# 설치 확인
ffmpeg -version

# TTS용 파이썬 패키지
pip install gTTS          # 구글 무료 TTS
pip install pyttsx3       # 오프라인 TTS
```

### 영상 자르기

```
나: input.mp4 영상에서 10초~30초 구간만 잘라줘.
    output.mp4로 저장해줘.
```

Claude가 실행하는 것:
```bash
ffmpeg -i input.mp4 -ss 00:00:10 -to 00:00:30 -c copy output.mp4
```

### 영상 여러 개 합치기

```
나: 폴더 안에 있는 part1.mp4, part2.mp4, part3.mp4를
    순서대로 합쳐서 final.mp4로 만들어줘.
```

Claude가 실행하는 것:
```bash
# 파일 목록 만들기
echo "file 'part1.mp4'" > filelist.txt
echo "file 'part2.mp4'" >> filelist.txt
echo "file 'part3.mp4'" >> filelist.txt

# 합치기
ffmpeg -f concat -safe 0 -i filelist.txt -c copy final.mp4
```

### TTS (텍스트 → 음성)

```
나: "안녕하세요, 이 영상은 AI가 만들었습니다."
    이 문장을 mp3 파일로 만들어줘.
```

Claude가 실행하는 코드:
```python
from gtts import gTTS

text = "안녕하세요, 이 영상은 AI가 만들었습니다."
tts = gTTS(text=text, lang='ko')
tts.save('narration.mp3')
print("음성 파일 생성 완료!")
```

### 영상 + TTS 합치기 (자막 있는 영상 만들기)

```
나: 다음 순서로 영상을 만들어줘:
    1. video.mp4 영상에 narration.mp3 오디오를 붙여줘
    2. 볼륨은 원본 영상 50%, 나레이션 100%로 믹싱
    3. 결과 파일: final_with_audio.mp4
```

Claude가 실행:
```bash
ffmpeg -i video.mp4 -i narration.mp3 \
  -filter_complex "[0:a]volume=0.5[a0];[1:a]volume=1.0[a1];[a0][a1]amix=inputs=2" \
  -c:v copy final_with_audio.mp4
```

### 영상 처리 커맨드 만들기

**`.claude/commands/video-cut.md`**

```markdown
# video-cut — 영상 구간 자르기

ffmpeg을 사용하여 영상의 특정 구간을 잘라낸다.

## 사용법
$ARGUMENTS 형식: {입력파일} {시작시간} {끝시간} {출력파일}
예: video.mp4 00:00:10 00:00:30 clip.mp4

## 실행
다음 명령어를 실행한다:
ffmpeg -i {입력파일} -ss {시작시간} -to {끝시간} -c copy {출력파일}

## 확인
성공하면 출력 파일 크기와 길이를 알려준다.
실패하면 오류 내용과 해결 방법을 안내한다.
```

---

## 8. 나만의 "파일 생성" 커맨드 만들기

### 템플릿: 파일 생성 커맨드 구조

어떤 파일이든 만들 수 있는 커맨드의 기본 구조입니다:

```markdown
# 커맨드-이름 — 한 줄 설명

{무엇을 만드는지, 언제 쓰는지 설명}

## 준비 확인 (선택사항)
다음이 설치되어 있는지 확인한다:
- python 버전 3.8 이상
- {라이브러리명} (pip install {라이브러리명})

## 1단계: 데이터 수집
{어디서 데이터를 가져올지}
- API 호출: curl http://...
- 파일 읽기: 특정 파일 경로
- 사용자 입력: $ARGUMENTS 사용

## 2단계: 파이썬 파일 작성 및 실행
다음 내용으로 tmp_generate.py 파일을 만든다:
```python
{파이썬 코드 템플릿}
```
작성 후 python tmp_generate.py 를 실행한다.

## 3단계: 결과 확인 및 정리
- 생성된 파일이 존재하는지 확인
- tmp_generate.py 삭제
- 파일 경로를 사용자에게 알려준다

## 오류 처리
- 라이브러리 없으면: pip install 명령어 안내
- 파일 경로 오류: 경로 다시 확인 요청
```

### 실전 예시: SPECODE AI 리포트 엑셀 커맨드

**`.claude/commands/export-ai-report.md`** 실제 만들어 보기:

```markdown
# export-ai-report — AI 태스크 결과를 엑셀로 내보내기

SPECODE 서버에서 AI 태스크 목록을 가져와 엑셀 파일로 만든다.

## 준비 확인
openpyxl이 설치되어 있는지 확인:
python -c "import openpyxl" 실행, 오류 나면 pip install openpyxl 실행

## 1단계: 데이터 가져오기
curl -s "http://localhost:3000/api/ai-tasks?page=1&pageSize=200" 실행
JSON 응답의 data 배열을 사용한다.

## 2단계: 엑셀 생성
tmp_excel.py 파일을 생성한 후 실행한다.
파일 내용:
- import json, openpyxl 등 필요 라이브러리 import
- API에서 받은 데이터로 워크시트 작성
- 헤더: 태스크ID, 시스템ID, 유형, 상태, 요청시각, 완료시각, 소요시간(분)
- SUCCESS는 연두색, FAILED는 분홍색, NONE/RUNNING은 기본색
- 마지막 행에 합계 통계 (전체 N건, 성공 N건, 실패 N건)
- 저장 경로: d:/source/specode/reports/ai-tasks-{오늘날짜}.xlsx

## 3단계: 정리
tmp_excel.py 삭제 후 생성된 파일 경로 안내

## 주의
$ARGUMENTS가 있으면 그 값으로 파일명에 추가한다.
예: /export-ai-report 3월 → ai-tasks-2024-03.xlsx
```

---

## 9. 자동화 파이프라인 설계하기

### "여러 단계를 이어서 자동으로"

복잡한 자동화는 여러 도구를 파이프처럼 이어서 사용합니다.

```
입력 → [1단계 처리] → [2단계 처리] → [3단계 처리] → 출력
```

### 예시: "AI 태스크 처리 + 보고서 자동 생성"

```
1단계: AI 태스크 처리 (/run-claude-tasks)
    ↓ (모든 대기 태스크 처리 완료)
2단계: 결과 수집 (API 호출)
    ↓ (오늘의 처리 데이터)
3단계: 엑셀 생성 (/export-ai-report)
    ↓ (엑셀 파일)
4단계: PPT 생성 (/make-report-ppt)
    ↓ (PPT 파일)
5단계: 완료 알림 (슬랙 메시지 or 콘솔 출력)
```

이 전체를 하나의 커맨드로 만들 수도 있습니다!

**`.claude/commands/daily-workflow.md`**

```markdown
# daily-workflow — 일일 자동화 전체 실행

매일 하는 작업을 순서대로 자동 실행한다.

## 실행 순서

### 1단계: AI 태스크 처리
/run-claude-tasks 커맨드와 동일한 방식으로 대기 태스크 모두 처리

### 2단계: 결과 통계 수집
API에서 오늘 처리된 태스크 통계 수집

### 3단계: 엑셀 보고서 생성
/export-ai-report 커맨드와 동일한 방식으로 엑셀 생성

### 4단계: 완료 요약 출력
처리 결과를 마크다운 표로 깔끔하게 출력:
- 오늘 처리한 태스크 수
- 성공/실패 수
- 생성된 파일 경로
```

### 자동화 수준별 정리

```
Level 1: 그냥 채팅 (지금 대부분의 사람들)
  → Claude에게 말로 설명 → Claude가 실행
  → 매번 같은 말을 반복해야 함

Level 2: 커맨드 사용
  → /커맨드이름 한 번만 입력
  → 반복 작업에 시간 절약

Level 3: 커맨드 + 파이프라인
  → 여러 커맨드를 하나로 묶어서
  → 아침에 /daily-workflow 한 번으로 모든 작업 완료

Level 4: API 연동 (고급)
  → Claude API를 내 프로그램에서 직접 호출
  → 사람이 채팅 안 해도 자동으로 실행
  → 스케줄러(cron)로 새벽 2시에 자동 실행 등
```

---

## 핵심 요약

### 3가지 질문에 대한 답

**Q: PPT, 엑셀 등을 어떻게 만드나요?**
```
A: Claude가 파이썬 코드를 자동으로 짜서 실행합니다.
   python-pptx, openpyxl 등 라이브러리를 이용해요.
   사용자는 "만들어줘"만 말하면 됩니다.
```

**Q: 영상 처리는 어떻게 하나요?**
```
A: ffmpeg 이라는 프로그램을 Bash 도구로 실행합니다.
   설치만 되어 있으면 Claude가 알아서 명령어를 만들어 실행해요.
```

**Q: 다른 서비스(슬랙, 구글, 노션 등)와 연동은 어떻게?**
```
A: MCP 설정 파일에 한 줄 추가하면 됩니다.
   MCP가 Claude와 외부 서비스 사이의 다리 역할을 해줘요.
```

### 지금 당장 해볼 수 있는 것

```bash
# 1. 파이썬 라이브러리 미리 설치해두기
pip install python-pptx openpyxl python-docx Pillow gtts pypdf2

# 2. ffmpeg 설치 (영상 처리용)
# https://ffmpeg.org 에서 다운로드

# 3. Claude에게 바로 요청하기
# "test.pptx 파일 만들어줘. 슬라이드 3개. 각 슬라이드에 Hello 1, 2, 3"
```

```
파이썬 라이브러리만 설치되어 있으면
Claude에게 말로 요청하는 것만으로
PPT, 엑셀, PDF, 이미지, 영상까지 모두 만들 수 있습니다.

별도 스크립트를 직접 짤 필요 없어요.
Claude가 짜줍니다. 💡
```

---

> 이 문서 1편: [claude-활용가이드.md](./claude-활용가이드.md) — 커맨드/스킬/에이전트 기초
> 이 문서 2편: [claude-심화가이드.md](./claude-심화가이드.md) — 실전 파일 생성/자동화
