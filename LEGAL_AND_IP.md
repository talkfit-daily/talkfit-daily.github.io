# TALKFIT LEGAL & IP PROTECTION (V2.0)

> 본 문서는 TalkFit의 저작권, 특허 명세서, 영업 비밀, 법적 방어 전략을 통합 관리합니다.
> **최종 업데이트: 2026-04-23**

---

## 1. 저작권 고지 (Copyright Notice)

**발효일: 2026-04-22 | 저작권자: Yoonsoo Choi (최윤수)**

### 보호 대상:
- **Software**:
  - `talkfit-app/` 전체 프론트엔드 소스코드 (HTML/CSS/JS, React 컴포넌트)
  - `talkfit-app/api/` Vercel Serverless Functions (claude.js, transcribe.js, youtube.js, ytchannel.js, tts.js)
  - `talkfit-functions/` Firebase Cloud Functions (youtube/ytQueue/ytStatus 큐 시스템)
- **Branding**:
  - "TalkFit" 명칭, 로고 (말풍선 + T + 노란 점)
  - 브랜드 컬러: 메인 #7ee8a2 (초록), 서브 #fbbf24 (노랑), 강조 #60a5fa (파랑), 배경 #08090d
  - 슬로건: "쉬운 동사로 다 말한다", "내 일상이 교재"
- **UI/UX**:
  - 4탭 네비게이션 (홈/회화/복습/기록)
  - 동사/구동사 색상 코딩 시스템 (기본=노랑, 구동사=초록)
  - 3단 표시 구조 (원문 → 쉬운 영어 → 한국어 번역)
  - 플래시카드 복습 인터페이스
  - 빈칸 채우기 + 단어 순서 맞추기 연습 UI
  - YouTube 구간별 학습 (3분 단위 + 백그라운드 자동 로드)
- **Algorithms**:
  - 한국어 → 미국식 영어 변환 파이프라인 (쉬운 동사 우선)
  - 동사/구동사 자동 분류 및 색상 매칭 (`type: basic|phrasal`)
  - 영상 구간 균등 분할 알고리즘 (3분 단위, 마지막 1.5분 미만 합치기)
  - 백그라운드 병렬 처리 시스템 (3개 동시)
  - 사용자 만남 동사 → AI 자동 레슨 생성 → 개인 풀 확장
  - 회화 빈도 기반 우선 학습 알고리즘
  - 99레벨 RPG 시스템 (XP 곡선 + 콤보 + 마일스톤)
- **Content**:
  - 24+ 동사 정식 레슨 데이터 (LESSON_POOL)
  - 헷갈리는 동사 비교 데이터셋 (get/take, make/do, go/come, look/see/watch, give/tell, take/bring, put/place 등)
  - 화자 자동 구별 + 이름 변경 시스템
  - Coach's Tip 시스템

---

## 2. 특허 청구 범위 (Patent Specification Draft)

**일상 대화 기반 개인화 영어 학습 시스템 및 사용자 패턴 분석을 통한 적응형 동사 풀 자동 생성 방법**

### 핵심 특허 요소 (Claims):

#### Claim 1: 한국어 대화 → 쉬운 동사 영어 변환 파이프라인
사용자의 실제 한국어 대화(카카오톡, 음성 녹음, YouTube 자막)를 입력받아, 미국인이 실제 사용하는 쉬운 기본동사(get, put, take, make, have, give, go, come, keep, look, run, turn, work, set, feel, check, find, pick, let, leave, hold, call 등) 및 구동사(give up, take out, get over 등)만을 활용한 자연스러운 영어로 변환하는 AI 파이프라인.

#### Claim 2: 기본동사 + 구동사 쌍 학습 구조 (Verb Pair System)
하나의 기본동사와 그로부터 파생된 구동사를 세트로 묶어 학습하는 커리큘럼 구조. 동일 루트 동사의 기본 용법과 확장 용법을 병행 학습하여 활용도를 극대화하는 교육 방법론. 색상 코딩 시스템(기본=노랑/구동사=초록)으로 시각적 구별.

#### Claim 3: AI 자동 레슨 풀 확장 시스템 (특허성 ★)
사용자가 회화/녹음/유튜브에서 실제 만난 동사 중 기존 레슨 풀에 없는 동사를 식별하고, AI(Gemini)를 통해 백그라운드에서 해당 동사의 정식 레슨(예문 3개, 잘못된 사용 예, 자연스러운 사용 예, 헷갈리는 동사 비교)을 자동 생성하여 사용자별 개인 학습 풀(`my_lesson_pool`)에 누적하는 방법. 이를 통해 무한히 확장 가능한 개인화 커리큘럼 구축.

#### Claim 4: 회화 빈도 기반 적응형 학습 (특허성 ★)
사용자가 회화에서 만난 동사의 발생 빈도(`my_encountered_verbs`의 count)를 추적하고, 다음 동사 레슨 선택 시 해당 빈도가 높은 동사를 우선 순위로 선택하는 알고리즘. 모든 풀 학습 완료 후에는 빈도 기반 약점 동사 우선 복습 모드로 전환.

#### Claim 5: YouTube 영상 구간 분할 + 백그라운드 큐 처리
긴 YouTube 영상(50분+)을 3분 단위로 자동 분할하고, 첫 구간은 즉시 사용자에게 제공한 후 나머지 구간을 Firebase Functions 큐 시스템을 통해 백그라운드에서 병렬(3개 동시) 처리. Firestore 캐싱으로 동일 영상 재요청 시 즉시 응답. 마지막 구간이 1.5분 미만이면 이전 구간에 합치는 균등 분할 알고리즘.

#### Claim 6: 다중 입력 통합 학습 시스템
음성 녹음(SpeechRecognition + 화자 구별), 텍스트 직접 입력, 오디오 파일 업로드(자동 음성 인식 + 화자 구별), YouTube 영상 자막(자체 자막 또는 Gemini 음성 인식)을 단일 분석 파이프라인으로 통합 처리하는 시스템.

#### Claim 7: 화자 자동 구별 + 사용자 정의 이름 매핑
Gemini 음성 인식으로 화자(화자1, 화자2, 화자3, 화자4)를 자동 식별하고, 사용자가 각 화자를 본인의 이름(예: "나", "친구", "동료")으로 매핑하여 학습 결과에 반영하는 시스템.

#### Claim 8: AI 기반 헷갈리는 동사 비교 자동 생성
회화에서 등장한 동사 중 한국인이 자주 헷갈려하는 유사 동사 그룹(say/tell/talk, look/see/watch 등)을 AI가 동적으로 식별하여 차이점과 예문을 함께 제공하는 시스템.

#### Claim 9: 99레벨 게임화 시스템 (특허성 ★)
- 지수 곡선 XP 시스템 (Lv1=0, Lv99=수백만 XP)
- 콤보 보너스 (5분 내 연속 정답: x1.2/x1.5/x2)
- 주말 더블 XP (토/일 자동 x1.5)
- 고레벨 페널티 (Lv20+ 85%, Lv80+ 25% — 실제 영어 실력 향상 곡선 시뮬레이션)
- 연속 출석 보너스 + 마일스톤 (7/30/100/365일)
- 퍼펙트 보너스 + 빠른 응답 보너스
- AI 사용 횟수 레벨 차등 (Lv1=6회/일, Lv99=무제한)

#### Claim 10: 시간 슬라이싱 영상 음성 인식
YouTube 영상에 대해 Gemini Vision API의 `fileData`로 영상 URI를 전달하고 시스템 프롬프트로 "minute X to minute Y" 구간만 받아적게 하는 방법. 자막이 없는 영상도 학습 가능.

---

## 3. 영업 비밀 고지 (Trade Secret Declaration)

본 항목에 명시된 기술 및 데이터는 TalkFit의 독점적 **영업 비밀**입니다.

### Tier 1: 핵심 영업 비밀 (절대 비공개)
1. **쉬운 동사 변환 프롬프트**: Gemini에게 한국어를 미국식 구어체로 변환하기 위한 시스템 프롬프트 구조 (`analyze` 함수 내 `system` 변수)
2. **동사 풀 데이터셋**: 24+ 동사의 의미, 예문, 잘못된 사용 예, 자연스러운 사용 예, 헷갈리는 동사 비교 데이터 (`LESSON_POOL` 배열)
3. **AI 레슨 자동 생성 프롬프트**: 새 동사에 대해 정식 레슨을 만들어내는 메타 프롬프트
4. **YouTube 시간 슬라이싱 프롬프트**: `transcribeChunk` 함수 내 시스템 프롬프트
5. **레벨 시스템 곡선 공식**: `xpForLevel(lv) = 50*lv*(lv-1) + 50*pow(lv-1, 1.5)` 및 페널티 함수

### Tier 2: 운영 비밀
1. Firebase Firestore `youtube_cache` 컬렉션 구조 및 캐싱 전략
2. 백그라운드 큐 처리 동시성 (3개 병렬)
3. 화자 구별 프롬프트 엔지니어링
4. 콤보 + 주말 + 마일스톤 조합 보너스 알고리즘

---

## 4. 기술 아키텍처 (Technical Stack — 보호 대상)

### Frontend
- React 18 (UMD CDN) + Babel Standalone
- Single HTML File (1,997+ lines)
- LocalStorage + Firebase Firestore 동기화

### Backend
- **Vercel Serverless Functions**: 짧은 처리 (Gemini 텍스트, TTS)
- **Firebase Cloud Functions** (Blaze 플랜): 긴 처리 (YouTube 영상 분석, 큐 시스템)

### AI APIs
- Google Gemini 2.5 Flash (텍스트, 음성 인식, 영상 분석, TTS)
- 구글 YouTube Data API v3 (영상 정보, 채널 검색)
- Firebase Auth (Google 로그인)

### 데이터베이스
- LocalStorage (게스트 사용자)
- Firebase Firestore (로그인 사용자 동기화)
- Firestore `youtube_cache` 컬렉션 (영상 자막 영구 캐시)

### 배포
- Frontend: Vercel (talkfit-daily-github-io.vercel.app)
- Functions: Firebase (us-central1-talkfit-dbacd.cloudfunctions.net)
- Source: GitHub (talkfit-daily/talkfit-daily.github.io)

---

## 5. 금지 행위 및 대응 (Enforcement)

### 금지 행위:
- 소스코드 복제, 클론, 또는 재배포
- 동사 풀 데이터셋 무단 사용
- AI 프롬프트 (시스템 메시지) 도용
- "TalkFit" 브랜드 사칭 또는 유사 서비스 운영
- 99레벨 시스템 + 콤보/마일스톤 조합 모방
- 무단 스크래핑 및 리버스 엔지니어링
- AI 자동 레슨 생성 시스템의 모방

### 법적 대응:
- **저작권법 제136조**: 5년 이하 징역 또는 5천만 원 이하 벌금
- **부정경쟁방지법**: 영업 비밀 침해에 대한 민형사 소송
- **특허법**: 특허 출원 후 침해 시 손해배상
- **민사 손해배상 및 가처분 신청**

---

## 6. 상표 등록 계획 (Trademark Registration)

### 한국 (KIPO) - 우선
- **명칭**: TalkFit
- **분류**:
  - 제9류: 모바일 응용 프로그램
  - 제41류: 교육 서비스 (어학 교육)
  - 제42류: 클라우드 컴퓨팅 (SaaS)
- **출원 비용**: 약 ₩56,000/류 (3류 = 약 17만원)
- **심사 기간**: 약 12개월

### 국제 출원 (Madrid Protocol) - 사용자 1만+ 시
- 미국, 일본, 중국 우선
- 비용: 약 $1,000~

### 도메인 보호
- 현재: talkfit-daily-github-io.vercel.app
- 추가 확보 권장:
  - talkfit.io
  - talkfit.kr
  - talkfit.co.kr
  - talkfit.app

---

## 7. 사용 증거 (Use Evidence — 분쟁 대비)

### 디지털 증거:
- GitHub 커밋 히스토리: 2026-04-22 ~ 현재 (`github.com/talkfit-daily/talkfit-daily.github.io`)
- Vercel 배포 로그
- Firebase 프로젝트 생성일 (`talkfit-dbacd`)
- 이 문서 (`LEGAL_AND_IP.md`) 자체

### 권장 추가 증거:
- 첫 사용자 회원가입 스크린샷
- 앱 로고/UI 디자인 파일 원본
- 도메인 등록 영수증
- AppStore Connect 등록 이력

---

## 8. 대표자 정보 (Official Representative)

- **성명**: Yoonsoo Choi (최윤수)
- **직책**: Founder
- **문의**: krave.official.team@gmail.com
- **GitHub**: dbstn1369
- **저작권 등록**: 2026-04-22 (자체 발효)

---

## 9. 향후 계획 (Future IP Strategy)

1. **2026 Q2**: 한국 KIPO 상표 출원 (TalkFit)
2. **2026 Q2**: 한국 특허 출원 (Claim 3, 4, 9 핵심)
3. **2026 Q3**: iOS/Android 앱 출시 + 상표 권리 활성화
4. **2026 Q4**: 사용자 1,000명 도달 시 미국 USPTO 출원 검토
5. **2027 Q1**: PCT 국제 특허 출원 (PCT 12개월 우선권 활용)

---

**© 2026 TalkFit / Yoonsoo Choi. All rights reserved worldwide.**
**Proprietary Legal Content. Unauthorized reproduction or distribution is strictly prohibited.**
