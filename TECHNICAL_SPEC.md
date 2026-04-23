# TalkFit Technical Specification (V1.0)

> **CONFIDENTIAL** — 본 문서는 TalkFit의 핵심 기술 사양입니다.
> 외부 공유 시 NDA 필수.
>
> **Last Updated**: 2026-04-23

---

## 1. 시스템 개요

TalkFit은 **사용자의 실제 한국어 일상 대화**를 미국인이 쓰는 쉬운 동사 영어로 변환하고, 개인화된 학습 풀을 자동 생성하는 AI 기반 영어 학습 플랫폼입니다.

### 차별화 포인트
1. **개인화**: 사용자별 동사 풀 자동 확장
2. **실생활 기반**: 카톡/녹음/유튜브 등 실제 콘텐츠로 학습
3. **AI 자동 생성**: Gemini가 사용자 패턴 분석해 레슨 만듦
4. **게임화**: 99레벨 RPG 스타일

---

## 2. 핵심 기능 명세

### 2.1 입력 방식 (4가지)
| 모드 | 처리 방식 | API |
|------|----------|-----|
| 녹음 | Web Speech API (브라우저) | - |
| 입력 | 직접 타이핑 | - |
| 파일 | 오디오 → Gemini 음성 인식 + 화자 구별 | `/api/transcribe` |
| YouTube | 자막 자동 추출 또는 영상 음성 인식 | Firebase `youtube` |

### 2.2 분석 결과 데이터 구조
```json
{
  "scenario": "상황 한줄 요약 (한국어)",
  "speakers": 1-4,
  "turns": [{
    "speaker": "화자1",
    "original": "원래 입력 문장",
    "english": "I **got** your text and **gave up** waiting.",
    "korean": "네 문자 **받고** 기다리는 거 **포기했어**",
    "verbs_used": [{"verb": "get", "type": "basic", "usage": "받다"}]
  }],
  "key_verbs": [{"verb":"get", "type":"basic", "meaning":"받다", "example":"..."}],
  "key_nouns": [{"noun":"deadline", "meaning_ko":"마감 기한", "example":"..."}],
  "verb_compare": [{"verbs":["say","tell"], "diff_ko":"...", "examples":[...]}],
  "coach_tip": "핵심 포인트 한국어 2문장"
}
```

### 2.3 동사 색상 코딩
- **기본동사** (basic): 노란색 #fbbf24
- **구동사** (phrasal): 초록색 #7ee8a2
- **명사**: 파란색 #60a5fa
- **나머지**: 흰색

### 2.4 3단 표시 구조
1. **원문** (italic, 회색, 작게) — 입력 그대로
2. **쉬운 영어** (흰색, 굵게, 동사 하이라이트) — 변환 결과
3. **한국어 번역** (회색, 작게, 동사 매칭 색상) — 학습용

---

## 3. AI 통합 (Gemini 2.5 Flash)

### 3.1 사용처
| 기능 | 모델 | 엔드포인트 |
|------|------|-----------|
| 대화 분석 | gemini-2.5-flash | Vercel `/api/claude` |
| 음성 인식 | gemini-2.5-flash | Vercel `/api/transcribe` |
| 영상 분석 | gemini-2.5-flash + fileData | Firebase `youtube` |
| TTS (자연스러운 발음) | gemini-2.5-flash-preview-tts | Vercel `/api/tts` |
| AI 자동 레슨 생성 | gemini-2.5-flash | Vercel `/api/claude` |

### 3.2 프롬프트 구조 (영업 비밀)
- `analyze` system 프롬프트: 1500+ 자, 동사 분류/한국어 번역 매칭/명사 추출/동사 비교 전부 한 번에
- `transcribeChunk` 프롬프트: 시간 슬라이싱 명시
- `LESSON_AUTOGEN` 프롬프트: 새 동사 → 정식 레슨 (예문, 잘못된 사용, 헷갈리는 동사 비교까지)

### 3.3 토큰 최적화
- `thinkingBudget: 0` — 응답 속도 향상
- `maxOutputTokens: 8192` — 잘림 방지
- 입력 자동 1500자 자르기 (문장 끝 기준)

---

## 4. YouTube 학습 시스템 (특허 핵심)

### 4.1 처리 흐름
```
사용자 클릭 → 영상 정보 조회 (YouTube Data API)
           ↓
첫 3분 Gemini 음성 인식 (즉시 응답, 1~2분 소요)
           ↓
프론트엔드 표시 + 백그라운드 폴링 시작
           ↓
나머지 구간 병렬 처리 (3개 동시) → Firestore 캐시
           ↓
ytStatus 폴링으로 segments 자동 업데이트
```

### 4.2 구간 분할 알고리즘
```javascript
const CHUNK_MIN = 3; // 3분 단위
function calcChunks(durationSec) {
  var n = Math.ceil(durationSec / 180);
  var lastLen = durationSec - (n-1)*180;
  if (n > 1 && lastLen < 90) n--; // 마지막 1.5분 미만이면 합침
  return Math.max(1, n);
}
```

### 4.3 Firestore 캐싱
```
/youtube_cache/{videoId}
  - title: string
  - durationSec: number
  - chunks: { "min_0": "...", "min_3": "...", ... }
  - createdAt: timestamp
```

---

## 5. 개인화 학습 시스템 (특허 핵심)

### 5.1 데이터 구조
```javascript
// 회화에서 만난 동사 (LocalStorage)
my_encountered_verbs: [{
  verb: "give up",
  type: "phrasal",
  meaning: "포기하다",
  example: "I gave up.",
  count: 5,           // 누적 빈도
  firstSeen: "2026-04-23",
  lastSeen: "2026-04-25",
  source: "회화"
}]

// AI가 자동 생성한 개인 레슨 풀
my_lesson_pool: [{
  basic: {...},
  phrasal: {...},
  aiGenerated: true,
  sourceVerb: "give up",
  createdAt: "2026-04-23"
}]

// 일일 레슨 인덱스 (재방문 시 동일)
learned_lesson_dates: {
  "2026-04-23": [3, 7],
  "2026-04-24": [12, 18]
}
```

### 5.2 동사 선택 알고리즘
1. 오늘 정해진 레슨 있으면 그대로 (`learned_lesson_dates[today]`)
2. 회화에서 만난 동사 중 풀에 있는 것 우선
3. 없으면 dayIndex 기반 순환
4. 모든 풀 학습 후 → 빈도 기반 약점 동사 복습

### 5.3 AI 자동 레슨 확장 (로그인 사용자만)
```
회화 분석 → 새 동사 감지 → 풀에 없음 확인
        ↓
백그라운드 Gemini 호출 (2초 후)
        ↓
정식 레슨 생성 (basic + phrasal + 헷갈리는 동사)
        ↓
my_lesson_pool에 자동 추가
        ↓
다음 동사 레슨에서 사용 가능
```

---

## 6. 게임화 시스템 (99레벨 RPG)

### 6.1 레벨 곡선
```javascript
xpForLevel(lv) = 50 * lv * (lv-1) + 50 * pow(lv-1, 1.5)
// Lv1=0, Lv5=950, Lv10=4,650, Lv20=21,000, Lv50=128,000, Lv99=515,000+
```

### 6.2 칭호
| Lv | 칭호 |
|----|------|
| 1-5 | Beginner |
| 6-10 | Starter |
| 11-20 | Learner |
| 21-30 | Speaker |
| 31-45 | Talker |
| 46-60 | Fluent |
| 61-80 | Native-like |
| 81-98 | Expert |
| **99** | **Master** |

### 6.3 XP 획득 규칙
| 행동 | XP |
|------|-----|
| 단순 단계 진행 | 0 |
| 객관식 정답 | +5 |
| 문장 배열 정답 | +15 |
| 빠른 응답 (3초 내) | +2 |
| 퍼펙트 (5문제 이상 100%) | 문제수 × 5 |
| 출석 1일 | +5 |
| 출석 3일 | +10 |
| 출석 7일 | +25 |
| 출석 14일 | +40 |
| 출석 30일 | +70 |
| 출석 100일 | +150 |
| 출석 365일 | +500 |

### 6.4 마일스톤 보너스 (1회성)
- 7일 달성 → +50 🥉
- 30일 달성 → +200 🥈
- 100일 달성 → +500 🥇
- 365일 달성 → +2,000 🏆
- 누적 50일 → +100
- 누적 200일 → +500

### 6.5 배수 보너스
- **콤보** (5분 내 연속 정답): 3연속 ×1.2 / 5연속 ×1.5 / 10연속 ×2.0
- **주말** (토/일): ×1.5
- **고레벨 페널티**: Lv20+ ×0.85 / Lv40+ ×0.65 / Lv60+ ×0.45 / Lv80+ ×0.25

### 6.6 AI 사용 한도 (레벨 차등)
```javascript
function getDailyLimit(level) {
  if (lv <= 3) return 5 + lv;       // Lv1=6, Lv3=8
  if (lv <= 10) return 8 + (lv-3)*2; // Lv10=22
  if (lv <= 20) return 22 + (lv-10)*2; // Lv20=42
  if (lv <= 30) return 42 + (lv-20)*2;
  if (lv <= 50) return 62 + (lv-30)*2;
  if (lv <= 80) return 102 + (lv-50)*2;
  if (lv <= 98) return 162 + (lv-80)*2;
  return 9999; // Lv99 무제한
}
```

---

## 7. 화자 구별 시스템

### 7.1 동작
1. Gemini가 음성에서 화자별 음색 식별
2. "화자1: ~~", "화자2: ~~" 형식으로 출력
3. 사용자가 각 화자명을 본인 이름으로 매핑 ("나", "친구")
4. 분석 결과에서 본인 이름으로 표시

### 7.2 데이터 구조
```javascript
speakerNames: {
  "화자1": "나",
  "화자2": "친구",
  "화자3": "동료"
}
```

---

## 8. 게스트 vs 로그인 차별화

| 기능 | 게스트 | 로그인 |
|------|-------|--------|
| 기본 풀 (24개 동사) | ✅ | ✅ |
| 회화 분석 | ✅ | ✅ |
| 회화 동사 빈도 추적 | ❌ | ✅ |
| AI 자동 레슨 생성 | ❌ | ✅ |
| 개인 동사 풀 | ❌ | ✅ |
| 클라우드 동기화 | ❌ | ✅ |
| 기기 변경 시 데이터 유지 | ❌ | ✅ |

---

## 9. 보안 및 IP 보호

### 9.1 적용된 보호
- LICENSE 파일 (소유권 명시)
- robots.txt (`/api/` 크롤링 차단)
- Copyright 주석 (HTML 상단)
- LEGAL_AND_IP.md (저작권 + 특허 명세)
- API Origin 검증 (CORS)
- Admin Key 변경 (강력한 키)

### 9.2 추가 권장
- KIPO 상표 등록 (TalkFit)
- 한국 특허 출원 (Claim 3, 4, 9)
- 도메인 확보 (talkfit.io, talkfit.kr 등)

---

## 10. 향후 로드맵

### Phase 1 (현재 ~ 1개월)
- 웹앱 안정화
- 인스타 릴스 마케팅
- 사용자 100명 확보

### Phase 2 (1~3개월)
- iOS/Android 앱 출시 (Capacitor)
- KIPO 상표 출원
- 한국 특허 출원

### Phase 3 (3~6개월)
- 친구 초대 시스템
- 리더보드
- 푸시 알림
- 사용자 1,000명 확보

### Phase 4 (6~12개월)
- USPTO 미국 특허 출원
- 영어권 시장 진출
- 유료 플랜 (Pro)

---

**© 2026 TalkFit / Yoonsoo Choi. CONFIDENTIAL.**
