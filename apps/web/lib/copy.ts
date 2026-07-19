// 댕로드 한국어 UI 카피 단일 소스 (해요체 · DESIGN_SYSTEM §6 보이스).
// 구조적 데이터(내비/도시/요일/제한)는 lib/constants.ts, 여기엔 "표시 텍스트"만 둔다.
// 동적 문구는 함수로 제공해 호출부에서 값만 주입한다.

export const COPY = {
  // ───────── 메타 / 브랜드 ─────────
  meta: {
    titleDefault: '댕로드 — 퇴근 후 한적한 펫 외출',
    titleTemplate: '%s · 댕로드',
    description: '퇴근 18:12, 시간 슬라이더 3시간 → 한적도 87점·펫동반 검증된 충남 근교 즉시 추천',
    appName: '댕로드',
    siteName: '댕로드',
    author: 'Hun',
  },
  brand: {
    name: '댕로드',
    taglineShort: '퇴근 후 한적한 펫 외출',
    tagline: '퇴근 후, 가장 한적한 길로.',
  },
  header: {
    login: '로그인',
    logout: '로그아웃',
    themeToLight: '라이트 모드로 전환',
    themeToDark: '다크 모드로 전환',
    openMenu: '메뉴 열기',
    closeMenu: '메뉴 닫기',
    mobileMenu: '모바일 메뉴',
  },

  // ───────── 홈 ─────────
  home: {
    hero: {
      eyebrow: '충남 · 공주 · 천안 · 아산 · 서산',
      titleLead: '퇴근 후,',
      titleMid: '가장',
      titleEmph: '한적한',
      titleTail: '길로.',
      lede: '시간 슬라이더 하나면 충분해요. 데이터로 검증한 한적도와 펫 동반 코스 3곳을, 퇴근 5초 안에.',
      imageAlt: '해질 무렵 한적한 충남 근교 길',
    },
    errors: {
      rateLimit: '잠시 후 다시 시도해 주세요 (요청이 많습니다)',
      apiFail: (status: number) => `추천 API 실패 (${status})`,
      unknown: '알 수 없는 오류',
    },
    console: {
      timeLabel: '외출 가능 시간',
      hourUnit: '시간',
      radiusPre: '반경 약 ',
      radiusPost: 'km 안에서 찾고 있어요',
      departure: '출발지',
      pet: '반려견',
      startAt: '출발 시각',
      currentLocation: '현 위치',
      citySuffix: ' (충남)',
      submit: '지금 추천받기',
      submitting: '추천 계산 중…',
      registerPet: '펫 등록하기 →',
      needPet: '펫 등록 후 추천을 받을 수 있어요',
      startNowPlain: '지금', // 하이드레이션 안전 초기 라벨(시간 없음). 마운트 후 startNow 로 교체
      startNow: (hhmm: string) => `지금 · ${hhmm}`,
      startPlus: (min: number, hhmm: string) => `+${min}분 · ${hhmm}`,
    },
    results: {
      eyebrow: '오늘의 추천',
      headHours: (h: number) => `${h}시간`,
      headMid: ' 안에 다녀올 수 있는',
      head2: '가장 한적한 곳',
      placeUnit: '곳',
      metaSuffix: ' 기준',
    },
    card: {
      rankLabel: '한적',
      quietness: '한적도',
      distance: '거리',
      verify: '검증',
      per100: '/100',
      visitUnit: '명 방문',
      sampleShort: '표본 부족',
      distUnit: (eta: number) => `km · ${eta}분`,
      forecastPre: '내일 같은 시간',
      forecastMid: '이번 주 평균',
      kakao: '카카오 길찾기',
      detail: '상세 보기',
      save: '저장',
    },
    band: {
      eyebrow: '매일 저녁 6시',
      titleLead: '오늘의 ',
      titleEmph: '한적한 길',
      titleTail: '을',
      title2: '메일로 받아보세요',
      placeholder: '이메일 주소',
      submit: '구독',
      note: '시간·요일 자율 설정 · 1탭 수신거부',
      imageAlt: '반려견과의 산책',
    },
    floatingBadge: '검증 배지',
    floatingBadgeAria: '검증 배지 안내',
    empty: {
      title: '조건에 맞는 한적한 곳을 찾지 못했어요',
      desc: '시간을 늘리거나 다른 출발지로 시도해 보세요',
      relax: '시간 +1시간 늘려서 다시',
    },
  },

  // ───────── 로그인 ─────────
  login: {
    tagline: '퇴근 후 한적한 펫 외출',
    google: '구글로 시작하기',
    kakao: '카카오로 시작하기',
    naver: '네이버로 시작하기',
    errorPrefix: '로그인 실패: ',
    consentPre: '로그인 시 ',
    consentMid: ' 및 ',
    consentPost: '에 동의하게 됩니다.',
  },

  // ───────── 공용 ─────────
  common: {
    terms: '이용약관',
    privacy: '개인정보처리방침',
    home: '홈으로',
    login: '로그인',
    save: '저장',
    saving: '저장 중…',
    close: '닫기',
  },

  // ───────── 마이펫타임 ─────────
  me: {
    loginTitle: '로그인이 필요해요',
    loginDesc: '로그인하면 펫 프로필·추천 이력·알림 설정을 볼 수 있어요.',
    loginCta: '로그인 / 회원가입',
    loginFooter: '카카오 · 네이버로 5초 안에 시작',
    displayNameFallback: '댕로드 친구',
    logout: '로그아웃',
    statVisited: '다녀온 곳',
    statReviews: '작성한 후기',
    statVerified: '받은 검증',
    petsTitle: '내 반려견',
    petsAdd: '추가',
    petsEmptyTitle: '첫 반려견을 등록해보세요',
    petsEmptyDesc: '한 마리 등록하면 맞춤 추천이 시작돼요',
    petMeta: (breed: string, weightKg: number | string, ageYears: number) =>
      `${breed} · ${weightKg}kg · ${ageYears}살`,
    menuNotify: '이메일 알림 설정',
    menuNotifySub: '시간·요일 자율 설정 · 1탭 수신거부',
    menuHistory: '최근 추천 이력',
    menuHistorySub: '최근 받은 추천 다시 보기',
    menuReviews: '내가 쓴 후기',
    menuReviewsSub: '작성한 후기 관리',
    menuSaved: '저장한 장소',
    menuSavedSub: '북마크한 펫 외출 코스',
  },

  // ───────── 알림 설정 ─────────
  settings: {
    title: '이메일 알림 설정',
    desc: '설정하신 시간·요일에 한적한 펫 외출 코스 추천을 메일로 보내드려요. (주중 최대 5회)',
    enable: '이메일 알림 받기',
    time: '발송 시각',
    days: '발송 요일',
    saved: '저장되었어요',
  },

  // ───────── 펫 등록 ─────────
  pets: {
    title: '반려견 등록',
    desc: '체중과 이동제한 정보를 정확히 입력하면 더 알맞은 코스를 추천해드릴 수 있어요.',
    name: '이름',
    namePlaceholder: '다람이',
    breed: '견종',
    breedPlaceholder: '비숑 / 푸들 / 믹스 등',
    weight: '체중 (kg)',
    age: '나이 (살)',
    restrictions: '이동 제한 (해당되는 것)',
    submit: '등록',
    submitting: '등록 중…',
    backToMe: '마이펫타임',
    notFound: '반려견을 찾을 수 없어요',
  },

  // ───────── 펫 민감 건강정보 (PRD §14) ─────────
  petSensitive: {
    title: '민감 건강정보',
    desc: '알러지·만성질환은 별도 동의 후 분리 보관돼요. 본인만 볼 수 있어요.',
    allergies: '알러지',
    allergiesPlaceholder: '예: 닭고기',
    conditions: '만성질환',
    conditionsPlaceholder: '예: 슬개골 탈구',
    add: '추가',
    removeTag: (label: string) => `${label} 삭제`,
    consentLabel: '위 민감정보의 수집·분리보관에 동의합니다',
    consentHint: '동의해야 저장할 수 있어요',
    submit: '동의하고 저장',
    submitting: '저장 중…',
    saved: '저장되었어요',
    forbidden: '본인 반려견만 수정할 수 있어요',
  },

  // ───────── 장소 상세 ─────────
  poi: {
    petAllowed: '펫 동반',
    wellness: '웰니스',
    eco: '생태',
    durunubi: '두루누비',
    petPolicy: '펫 정책',
    hourlyTitle: '시간대별 한적도 (오늘)',
    hourlyEmpty: '표본 부족 — 데이터 수집 중이에요.',
    hourTooltip: (h: number, score: number) => `${h}시 · ${score}점`,
    hourTooltipEmpty: (h: number) => `${h}시 · 데이터 없음`,
    verifyTitle: '펫동반 검증 진행도',
    verifyProgress: (n: number) => `방문 검증 ${n}/3명`,
    kakao: '카카오 길찾기',
    reviewsTitle: '방문 후기',
    reviewsEmpty: '아직 후기가 없어요',
    reviewReply: '사장님 답변',
    ratingAria: (n: number) => `별점 ${n}점`,
    anonymous: '익명',
    report: '신고',
    reporting: '신고 중…',
    reported: '신고됨',
    reportAuth: '로그인 후 신고할 수 있어요',
    reportFail: '신고 실패',
  },

  // ───────── 추천 이력 ─────────
  recs: {
    loginTitle: '로그인하면 추천 이력을 볼 수 있어요',
    loginDesc: '한적도가 매시간 갱신돼 같은 곳도 시점에 따라 결과가 달라져요.',
    headTitle: '최근 추천 이력',
    headDesc: '한적도가 매시간 갱신되어 같은 곳도 시점에 따라 결과가 달라져요.',
    emptyTitle: '아직 추천 이력이 없어요',
    emptyDesc: '메인에서 시간 슬라이더로 첫 추천을 받아보세요',
    emptyCta: '지금 추천받기',
    courseLabel: (h: number) => `${h}시간 코스`,
    notFound: '조건에 맞는 한적한 곳을 찾지 못했어요',
    distChip: (km: number, eta: number | undefined) => `${km}km · ${eta}분`,
    quietChip: (n: number) => `한적도 ${n}`,
    verifyChip: (n: number) => `검증 ${n}명`,
  },

  // ───────── 시스템 상태 ─────────
  notFound: {
    title: '길을 잃었어요',
    desc: '찾으시는 페이지가 없거나 이동되었어요.',
  },
  error: {
    title: '잠시 문제가 생겼어요',
    desc: '다시 시도해 주세요. 계속되면 메일로 알려주세요.',
    retry: '다시 시도',
    codePrefix: 'code: ',
  },
  unsubscribe: {
    metaTitle: '이메일 수신 거부',
    badLinkTitle: '잘못된 링크입니다',
    badLinkMsg: '이메일에 포함된 정상 링크로 다시 시도해주세요.',
    failTitle: '수신 거부 처리 실패',
    failMsg: (reason: string) =>
      `사유: ${reason}. 마이페이지 → 이메일 알림 설정에서 직접 OFF 가능합니다.`,
    doneTitle: '수신 거부 완료',
    doneMsg:
      '더 이상 댕로드 추천 이메일을 받지 않으세요. 다시 받고 싶으시면 마이페이지에서 설정할 수 있어요.',
  },
} as const;
