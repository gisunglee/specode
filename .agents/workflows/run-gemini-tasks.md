---
description: 대기 중인 AI 태스크를 가져와서 분석 후 결과를 SPECODE 서버에 등록합니다.
---
# SPECODE 제미나이(Gemini) 워크로더 실행 가이드

이 워크플로우는 SPECODE 시스템에서 처리할 "대기 중"인 태스크를 나열하고 하나씩 분석하여, 그 피드백을 시스템으로 되돌려주는 역할을 합니다. 다음 단계들을 **순차적으로** 수행하세요.

## 1단계: 대기 중인 태스크 조회
`http://localhost:3000/api/ai/tasks?limit=5` 에 GET 요청을 보냅니다. (curl, fetch 등 사용)
- Header에는 반드시 `-H "X-API-Key: openclaw-api-key-here"` 를 포함해야 합니다.
- 응답받은 JSON의 `data` 속성 배열을 확인합니다. 비어있다면 "현재 대기 중인 태스크가 없습니다."라고 출력하고 종료하세요.
// turbo

## 2단계: 태스크 처리 루프
가져온 `data` 배열 안의 **모든 항목**에 대해 다음을 반복 수행합니다.

### 2-A: 태스크 시작 (RUNNING)
각 태스크의 `{aiTaskId}`를 URL에 넣어 다음 PATCH API를 던집니다. (상태를 RUNNING으로 바꿈)
- URL: `http://localhost:3000/api/ai/tasks/{aiTaskId}/start`
- 결과 확인 불필요, 바로 다음으로 넘어갑니다.
// turbo

### 2-B: 내용 분석 및 피드백 작성
태스크 객체의 `taskType`, `spec`, `comment`를 확인하고 자신의 AI 지식을 바탕으로 마크다운 포맷의 피드백 문자열을 작성하세요.
- **INSPECT (점검)**: 스펙 내용을 점검하고 완성도·명확성·일관성·실용성 관점에서 피드백을 마크다운으로 작성
- **DESIGN (상세설계)**: 기능 명세(`spec`)를 보고 데이터 흐름, 처리 로직, 예외처리 등 상세설계 도출
- **IMPLEMENT (구현)**: 기능 명세를 바탕으로 구현 진행
- 작성한 결과를 `feedback` 변수에 마크다운 텍스트로 저장하세요. (`comment`가 있다면 추가 요청으로 반영)

### 2-C: 결과 전달 (SUCCESS) 
작성한 피드백을 서버로 POST 전송합니다. 
- URL: `http://localhost:3000/api/ai/tasks/{aiTaskId}/complete`
- 본문(JSON Body): `{"taskStatus": "SUCCESS", "feedback": "내가 작성한 마크다운 내용..."}`
- `curl -X POST` 를 쓸 때 JSON 형식을 지키도록 주의하세요 (`-d '{"taskStatus":"..."}'`). JSON 텍스트 내의 쌍따옴표 이스케이프가 엉키기 쉽다면, 간단한 Python 스크립트를 작성하여 requests 라이브러리로 POST 요청을 보내는 방법을 추천합니다. (한글 깨짐 문제 방지에 뛰어납니다.)
// turbo

## 3단계: 요약 응답
성공적으로 처리한 태스크 수와 실패한 태스크 수를 사용자에게 보기 쉽게 마크다운 표나 리스트로 출력해줍니다.
