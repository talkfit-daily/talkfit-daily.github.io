/**
 * TalkFit — "오늘의 나" 정적 상황 풀
 *
 * 핵심 철학: 쉬운 동사(get/take/give/put/go/come/make/keep/look…)로
 *   한국인의 진짜 하루를 영어로 말하게 한다. 어려운 단어 0개.
 *
 * 비용: 이 풀은 앱에 내장되어 API를 부르지 않는다 → 무료 유저 원가 ₩0.
 *   매일 여기서 5개를 뽑아 쓰고, Gemini 호출은 "내 말 바꾸기"(유저 실입력)에만 아껴 쓴다.
 *
 * 데이터 구조:
 *   cat   분류(내부용)
 *   tag   화면에 뜨는 상황 라벨
 *   ko    상황 (한국어) — 유저가 "이걸 영어로 어떻게 말하지?" 하는 순간
 *   en    쉬운 동사 정답 (자연스러운 미국식)
 *   enko  정답의 한국어 뜻
 *   key   핵심 동사/구동사 (칩에서 강조 + "이 단어 하나면 돼")
 *   why   왜 이게 쉬운지 (한 줄)
 */
window.TALKFIT_SITUATIONS = [
  // ── 카톡·메신저 ─────────────────────────────────────────────
  { cat:"text", tag:"카톡 답장", ko:"친구가 “조금 늦어”라고 카톡했어. 뭐라고 답하지?",
    en:"No worries. Take your time.", enko:"괜찮아, 천천히 와.", key:"take",
    why:"‘take your time’ = 천천히 해. take 하나로 끝." },
  { cat:"text", tag:"약속 미루기", ko:"급한 일이 생겨서 약속을 미루고 싶어.",
    en:"Something came up. Can we do it another time?", enko:"일이 좀 생겼어. 다음에 해도 될까?", key:"come up",
    why:"‘come up’ = (일이) 생기다. 어려운 단어 없이 상황 설명 끝." },
  { cat:"text", tag:"통화 되나", ko:"지금 전화 통화 가능한지 물어보고 싶어.",
    en:"Is now a good time to talk?", enko:"지금 통화 괜찮아?", key:"talk",
    why:"be동사 + talk. 딱 이거면 원어민도 똑같이 말해요." },
  { cat:"text", tag:"확인 완료", ko:"“확인했고 내가 처리할게” 하고 답장하고 싶어.",
    en:"Got it. I'll take care of it.", enko:"알겠어. 내가 처리할게.", key:"take care of",
    why:"‘take care of’ = 처리하다. handle 몰라도 됨." },
  { cat:"text", tag:"고마움", ko:"도와준 친구한테 진짜 고맙다고 하고 싶어.",
    en:"Thanks so much. You really helped me out.", enko:"진짜 고마워. 덕분에 살았어.", key:"help out",
    why:"‘help out’ = 도와주다. help에 out만 붙이면 자연스러워요." },
  { cat:"text", tag:"잘 자", ko:"자기 전에 “푹 쉬어” 하고 인사하고 싶어.",
    en:"Get some rest. Talk tomorrow.", enko:"푹 쉬어. 내일 얘기하자.", key:"get",
    why:"‘get some rest’ = 좀 쉬어. rest 앞에 get이면 자연스러운 인사." },

  // ── 카페·식당 ───────────────────────────────────────────────
  { cat:"food", tag:"카페", ko:"옆자리 비었는지 물어보고 싶어.",
    en:"Is anyone sitting here?", enko:"여기 누구 있어요?", key:"sit",
    why:"be동사 + sit. 이게 전부예요." },
  { cat:"food", tag:"포장", ko:"이거 포장해 가고 싶어.",
    en:"Can I get this to go?", enko:"이거 포장돼요?", key:"get … to go",
    why:"‘to go’ = 포장. get에 to go만 붙이면 끝." },
  { cat:"food", tag:"물 요청", ko:"물 좀 더 달라고 하고 싶어.",
    en:"Could I get some more water?", enko:"물 좀 더 주세요.", key:"get",
    why:"주문·요청은 다 ‘get’으로 됩니다. want/order 안 써도 돼요." },
  { cat:"food", tag:"계산", ko:"계산서 달라고 하고 싶어.",
    en:"Can I get the check?", enko:"계산할게요.", key:"get",
    why:"‘get the check’ = 계산. 식당에서 이 한마디면 끝." },
  { cat:"food", tag:"주문 요청", ko:"안 맵게 해달라고 하고 싶어.",
    en:"Can you make it less spicy?", enko:"덜 맵게 해주세요.", key:"make",
    why:"‘make it + 상태’ = ~하게 해줘. make로 다 됩니다." },
  { cat:"food", tag:"자리 잡기", ko:"두 명 자리 있냐고 물어보고 싶어.",
    en:"Do you have a table for two?", enko:"두 명 자리 있어요?", key:"have",
    why:"‘have a table’ = 자리 있다. reservation 몰라도 돼요." },

  // ── 길·이동 ─────────────────────────────────────────────────
  { cat:"move", tag:"길 묻기", ko:"지하철역까지 어떻게 가는지 묻고 싶어.",
    en:"How do I get to the station?", enko:"역까지 어떻게 가요?", key:"get to",
    why:"‘get to’ = ~에 가다. go 대신 get이면 더 자연스러워요." },
  { cat:"move", tag:"거리 확인", ko:"여기서 먼지 물어보고 싶어.",
    en:"Is it far from here?", enko:"여기서 멀어요?", key:"be",
    why:"be동사 하나. far만 알면 끝." },
  { cat:"move", tag:"버스 확인", ko:"이 버스가 시청 가는지 묻고 싶어.",
    en:"Does this bus go to City Hall?", enko:"이 버스 시청 가요?", key:"go to",
    why:"‘go to’ = ~에 가다. 교통수단엔 go면 충분." },
  { cat:"move", tag:"택시", ko:"택시에서 “여기 세워주세요” 하고 싶어.",
    en:"You can drop me off here.", enko:"여기서 내려주세요.", key:"drop off",
    why:"‘drop off’ = 내려주다. stop 말고 drop off가 자연스러워요." },
  { cat:"move", tag:"길 잃음", ko:"길을 잃어서 도움을 청하고 싶어.",
    en:"I think I'm lost. Can you help me out?", enko:"길을 잃은 것 같아요. 도와줄래요?", key:"help out",
    why:"‘be lost’ + ‘help out’. 두 쉬운 표현이면 위기 탈출." },
  { cat:"move", tag:"소요 시간", ko:"거기까지 얼마나 걸리는지 묻고 싶어.",
    en:"How long does it take?", enko:"얼마나 걸려요?", key:"take",
    why:"‘take’ = (시간이) 걸리다. spend 아니고 take예요." },

  // ── 부탁·도움 ───────────────────────────────────────────────
  { cat:"ask", tag:"부탁", ko:"“이것 좀 도와줄래?” 하고 싶어.",
    en:"Can you give me a hand?", enko:"이것 좀 도와줄래?", key:"give",
    why:"‘give a hand’ = 도와주다. help 안 떠올라도 give로 말해요." },
  { cat:"ask", tag:"짐 부탁", ko:"잠깐 내 짐 좀 봐달라고 하고 싶어.",
    en:"Can you keep an eye on my stuff?", enko:"내 짐 좀 봐줄래?", key:"keep an eye on",
    why:"‘keep an eye on’ = 봐주다/지켜보다. watch 대신 이 표현이 자연스러워요." },
  { cat:"ask", tag:"빌리기", ko:"펜 좀 빌려달라고 하고 싶어.",
    en:"Can I borrow a pen?", enko:"펜 좀 빌릴 수 있을까요?", key:"borrow",
    why:"‘borrow’ = 빌리다. lend와 헷갈리지 말고, 내가 빌릴 땐 borrow." },
  { cat:"ask", tag:"천천히", ko:"상대가 너무 빨라서 천천히 말해달라고 하고 싶어.",
    en:"Could you slow down a bit?", enko:"조금만 천천히 말해줄래요?", key:"slow down",
    why:"‘slow down’ = 천천히. speak slowly보다 이게 더 원어민 같아요." },
  { cat:"ask", tag:"다시 말해줘", ko:"못 들어서 다시 말해달라고 하고 싶어.",
    en:"Sorry, can you say that again?", enko:"죄송해요, 다시 말해줄래요?", key:"say",
    why:"‘say that again’ = 다시 말해줘. repeat 몰라도 say로 됩니다." },
  { cat:"ask", tag:"방법 묻기", ko:"이거 어떻게 하는지 알려달라고 하고 싶어.",
    en:"Can you show me how to do this?", enko:"이거 어떻게 하는지 보여줄래요?", key:"show",
    why:"‘show me how’ = 방법을 알려줘. explain 대신 show면 충분." },

  // ── 직장 ────────────────────────────────────────────────────
  { cat:"work", tag:"마감 확인", ko:"이거 언제까지 필요한지 묻고 싶어.",
    en:"When do you need this by?", enko:"이거 언제까지예요?", key:"need … by",
    why:"‘by’ = ~까지. deadline 안 써도 need … by면 끝." },
  { cat:"work", tag:"잠깐 시간", ko:"잠깐 얘기할 시간 있는지 묻고 싶어.",
    en:"Do you have a minute?", enko:"잠깐 시간 돼요?", key:"have",
    why:"‘have a minute’ = 잠깐 시간 있다. 직장 필수 한마디." },
  { cat:"work", tag:"내가 할게", ko:"“제가 처리하겠습니다” 하고 싶어.",
    en:"I'll take care of it.", enko:"제가 처리할게요.", key:"take care of",
    why:"‘take care of’ = 처리하다. 회의·업무 어디서나 통해요." },
  { cat:"work", tag:"일정 조정", ko:"회의를 다른 시간으로 옮기고 싶어.",
    en:"Can we move the meeting?", enko:"회의 시간 옮겨도 될까요?", key:"move",
    why:"‘move’ = 옮기다. reschedule 몰라도 move면 통해요." },
  { cat:"work", tag:"확인 후 회신", ko:"확인하고 다시 알려주겠다고 하고 싶어.",
    en:"Let me check and get back to you.", enko:"확인하고 다시 연락드릴게요.", key:"get back to",
    why:"‘get back to’ = 다시 연락하다. reply보다 자연스러워요." },
  { cat:"work", tag:"의견 묻기", ko:"“이거 어떻게 생각해요?” 하고 싶어.",
    en:"What do you think about this?", enko:"이거 어떻게 생각해요?", key:"think about",
    why:"‘think about’ = ~에 대해 생각하다. opinion 안 써도 돼요." },

  // ── 쇼핑 ────────────────────────────────────────────────────
  { cat:"shop", tag:"입어보기", ko:"이 옷 입어봐도 되는지 묻고 싶어.",
    en:"Can I try this on?", enko:"이거 입어봐도 돼요?", key:"try on",
    why:"‘try on’ = 입어보다. wear 아니고 try on이에요." },
  { cat:"shop", tag:"다른 색", ko:"다른 색이 있는지 묻고 싶어.",
    en:"Do you have this in another color?", enko:"이거 다른 색 있어요?", key:"have",
    why:"‘have … in ~’ = ~로 있다. 색·사이즈 다 이 틀로 물어봐요." },
  { cat:"shop", tag:"구경 중", ko:"점원한테 “그냥 구경 중이에요” 하고 싶어.",
    en:"I'm just looking, thanks.", enko:"그냥 둘러보는 거예요, 감사해요.", key:"look",
    why:"‘just looking’ = 그냥 구경. 부담 없이 넘기는 한마디." },
  { cat:"shop", tag:"환불", ko:"이거 환불 되는지 묻고 싶어.",
    en:"Can I get a refund?", enko:"환불 되나요?", key:"get",
    why:"‘get a refund’ = 환불받다. return과 함께 알아두면 끝." },
  { cat:"shop", tag:"이거 살게요", ko:"“이걸로 할게요” 하고 싶어.",
    en:"I'll take this one.", enko:"이걸로 할게요.", key:"take",
    why:"‘take’ = (사기로) 하다. buy 말고 take가 매장에선 자연스러워요." },
  { cat:"shop", tag:"가격", ko:"이거 얼마인지 묻고 싶어.",
    en:"How much is this?", enko:"이거 얼마예요?", key:"be",
    why:"‘how much is’ = 얼마예요. 제일 많이 쓰는 한마디." },

  // ── 친구·약속 ───────────────────────────────────────────────
  { cat:"friend", tag:"안부", ko:"오랜만에 만난 친구한테 “요즘 뭐하고 지내?” 하고 싶어.",
    en:"What have you been up to?", enko:"요즘 뭐하고 지내?", key:"be up to",
    why:"‘be up to’ = 뭐하고 지내다. do 대신 이 표현이 원어민 같아요." },
  { cat:"friend", tag:"나중에 보자", ko:"“언제 한번 보자” 하고 싶어.",
    en:"Let's catch up sometime.", enko:"언제 한번 보자.", key:"catch up",
    why:"‘catch up’ = (밀린 얘기하러) 만나다. meet보다 자연스러워요." },
  { cat:"friend", tag:"준비 됐어?", ko:"“나갈 준비 됐어?” 하고 싶어.",
    en:"Are you ready to go?", enko:"나갈 준비 됐어?", key:"go",
    why:"‘ready to go’ = 갈 준비. leave 안 써도 go면 돼요." },
  { cat:"friend", tag:"거의 도착", ko:"“나 거의 다 왔어” 하고 싶어.",
    en:"I'm almost there.", enko:"거의 다 왔어.", key:"be",
    why:"‘almost there’ = 거의 다 옴. arrive 몰라도 되는 한마디." },
  { cat:"friend", tag:"먼저 가", ko:"“먼저 가 있어, 금방 따라갈게” 하고 싶어.",
    en:"Go ahead, I'll catch up.", enko:"먼저 가, 따라갈게.", key:"catch up",
    why:"‘go ahead’ + ‘catch up’. 두 쉬운 구동사로 상황 끝." },
  { cat:"friend", tag:"마무리", ko:"즐거운 만남 끝에 “또 보자” 하고 싶어.",
    en:"I had a great time. Let's do this again.", enko:"진짜 재밌었어. 또 보자.", key:"do",
    why:"‘do this again’ = 또 하자. 헤어질 때 딱." },

  // ── 감정·리액션 ─────────────────────────────────────────────
  { cat:"react", tag:"놀람", ko:"놀라운 소식에 “대박, 진짜?” 반응하고 싶어.",
    en:"No way! That's crazy.", enko:"말도 안 돼! 대박이다.", key:"be",
    why:"‘No way’ + ‘That's crazy’. 리액션은 짧고 쉬운 게 진짜예요." },
  { cat:"react", tag:"위로", ko:"실수한 친구한테 “괜찮아, 신경 쓰지 마” 하고 싶어.",
    en:"It's okay. Don't worry about it.", enko:"괜찮아. 신경 쓰지 마.", key:"worry about",
    why:"‘worry about’ = 신경 쓰다. 위로 한마디는 이걸로 끝." },
  { cat:"react", tag:"축하", ko:"잘된 친구한테 “잘됐다! 축하해” 하고 싶어.",
    en:"That's great! Good for you.", enko:"잘됐다! 축하해.", key:"be",
    why:"‘Good for you’ = 잘됐다. congratulations 안 써도 돼요." },
  { cat:"react", tag:"응원", ko:"힘든 친구한테 “조금만 버텨” 하고 싶어.",
    en:"Hang in there.", enko:"조금만 버텨.", key:"hang in",
    why:"‘hang in there’ = 버텨. 응원 한마디의 정석." },
  { cat:"react", tag:"알아볼게", ko:"“내가 한번 알아볼게” 하고 싶어.",
    en:"I'll look into it.", enko:"내가 알아볼게.", key:"look into",
    why:"‘look into’ = 알아보다/조사하다. research 대신 이거면 충분." },
  { cat:"react", tag:"공감", ko:"“그럴 수 있지, 이해해” 하고 공감하고 싶어.",
    en:"I get it. It happens.", enko:"이해해. 그럴 수 있지.", key:"get",
    why:"‘I get it’ = 이해해. understand 대신 get이 대화체예요." },
];
