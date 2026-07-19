// 댕로드 API 명세 (OpenAPI 3.1) — HTTP 엔드포인트 단일 소스 오브 트루스
// 프론트엔드 협업용. /api-docs 라우트(Scalar)와 /api-docs/openapi.json 이 이 객체를 렌더/서빙한다.
//
// ⚠️ 범위: 이 문서는 "HTTP로 호출 가능한" 표면만 담는다.
//   - 브라우저가 직접 호출: POST /api/recommend, Auth.js /api/auth/*
//   - 내부(서버/크론) 전용: Supabase Edge Functions 3종 (참고용으로만 기재)
// 앱 API의 대부분인 Server Actions(RPC)는 URL로 호출하는 방식이 아니라서 여기 없다.
//   → Server Actions 계약은 /api-docs 허브 페이지(lib/api-docs/server-actions.ts)에서 문서화한다.

const DESCRIPTION = `
**댕로드(DaengRoad)** — "퇴근 후 한적한 펫 외출". 2026 관광데이터 활용 공모전 출품작.

이 문서는 **HTTP로 직접 호출 가능한 엔드포인트**만 다룹니다. 이 앱은 두 가지 API 스타일을 씁니다:

### 1) HTTP 엔드포인트 (이 Swagger 문서)
- \`POST /api/recommend\` — 시간 슬라이더 추천 BFF (브라우저가 호출하는 유일한 추천 진입점)
- \`/api/auth/*\` — Auth.js v5 (Kakao·Naver·Google 로그인, 세션/CSRF)
- Supabase Edge Functions — **브라우저 직접 호출 금지**, 서버/크론 전용 (참고용)

### 2) Server Actions (RPC) — 이 문서에 없음
\`createReview\`, \`createPet\`, \`checkIn\`, \`getPoiDetail\` 등 대부분의 기능은 **Server Actions**입니다.
URL로 fetch하는 게 아니라 \`@/lib/actions/*\` 에서 **함수를 import해서 호출**하거나 \`<form action>\`으로 부릅니다.
→ 전체 목록·입력(zod)·반환형·예제는 **[/api-docs 허브 페이지](/api-docs)** 참고.

---

### 인증 요약 (중요)
- 세션: **Auth.js v5, JWT 전략** (DB 어댑터 없음). 로그인은 \`/login\` 또는 \`/api/auth/signin/{provider}\`.
- \`POST /api/recommend\`는 **Auth.js 세션 쿠키**로 인증합니다. 브라우저에서 호출하면 쿠키가 자동 첨부됩니다.
- 서버는 세션에서 **Supabase 호환 JWT**(\`session.supabaseAccessToken\`, HS256, \`SB_JWT_SECRET\` 서명)를 꺼내
  Edge Function에 \`Authorization: Bearer\`로 전달합니다. 이 토큰은 **서버 전용**이며 브라우저에 노출되지 않습니다.
- \`<SessionProvider>\`가 마운트돼 있어 클라이언트에서 \`useSession()\`으로 세션을 읽을 수 있습니다(예: 헤더 로그인/로그아웃 토글).
  서버 컴포넌트에선 \`auth()\`로 읽어 props로 내려주거나 \`GET /api/auth/session\`으로도 조회 가능합니다.

### 프론트가 쓰는 환경변수
\`NEXT_PUBLIC_SUPABASE_URL\`, \`NEXT_PUBLIC_SUPABASE_ANON_KEY\`, \`NEXT_PUBLIC_KAKAO_JS_KEY\`,
\`NEXT_PUBLIC_TURNSTILE_SITE_KEY\`(선택), \`NEXT_PUBLIC_GA_ID\`(선택), \`NEXT_PUBLIC_SENTRY_DSN\`(선택).
🚫 \`SUPABASE_SERVICE_ROLE_KEY\`, \`SB_JWT_SECRET\`, \`AUTH_*\`, \`KAKAO_REST_API_KEY\`는 프론트에 절대 노출 금지.
`.trim();

const ERROR_SCHEMA = {
  type: 'object',
  properties: { error: { type: 'string', example: 'Unauthorized' } },
  required: ['error'],
} as const;

/**
 * 댕로드 OpenAPI 3.1 문서. Scalar / Postman / Swagger Editor 어디서든 import 가능.
 */
export const openApiDocument = {
  openapi: '3.1.0',
  info: {
    title: '댕로드 API',
    version: '0.1.0',
    summary: '퇴근 후 한적한 펫 외출 — HTTP API 명세 (프론트엔드 협업용)',
    description: DESCRIPTION,
    contact: { name: '댕로드 백엔드', url: 'https://daengroad.app' },
  },
  servers: [
    { url: 'http://localhost:3000', description: '로컬 개발 (next dev)' },
    { url: 'https://daengroad.app', description: '프로덕션' },
  ],
  tags: [
    {
      name: '추천 (Recommend)',
      description:
        '시간 슬라이더 추천. 브라우저 → /api/recommend(BFF) → Edge Function 경로만 사용.',
    },
    {
      name: '인증 (Auth.js)',
      description: 'Auth.js v5 카카오/네이버/구글 OAuth. 세션·CSRF·로그인/로그아웃.',
    },
    {
      name: 'Edge Functions (내부)',
      description:
        '⚠️ 브라우저 직접 호출 대상 아님. 서버 BFF 또는 pg_cron이 호출. 계약 참고용으로만 기재.',
    },
    {
      name: 'TourAPI (외부 데이터소스)',
      description:
        '한국관광공사 OpenAPI(data.go.kr B551011). 서버(tour-api-etl / seed:tourapi)만 호출하는 원천 데이터 — 충남 4개 시 POI·펫동반 정보의 출처. 프론트 직접 호출 대상 아님(참고용).',
    },
  ],
  paths: {
    '/api/recommend': {
      post: {
        tags: ['추천 (Recommend)'],
        summary: '시간 슬라이더 추천 (BFF)',
        operationId: 'postRecommend',
        description: [
          '**무엇**: 출발지 + 가용 시간(1~6h)을 받아 한적하고 펫동반 가능한 충남 근교 POI 상위 3곳을 추천한다.',
          '',
          '**사용처**: 메인 추천 화면의 시간 슬라이더 → "추천 받기". 브라우저가 추천을 얻는 유일한 진입점이다',
          '(Edge Function을 브라우저가 직접 호출하지 않는다).',
          '',
          '**동작**: Auth.js 세션을 확인(없으면 401) → 요청 본문을 그대로 Supabase Edge Function',
          '`time-slider-recommender`로 프록시(서버가 `session.supabaseAccessToken`을 Bearer로 첨부)',
          '→ Edge 응답을 status/body 그대로 반환.',
          '',
          '**Server Action 대안**: `import { searchRecommendations } from "@/lib/actions/recommendations"`',
          '로도 동일 기능 호출 가능(반환형은 `{ ok, data }` envelope). 클라이언트 컴포넌트에선 이 쪽이 편하다.',
        ].join('\n'),
        security: [{ authjsSession: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/RecommendInput' },
              examples: {
                coords: {
                  summary: '좌표 출발 (권장)',
                  value: {
                    timeHours: 3,
                    petId: '7b2c...uuid',
                    startAt: '2026-07-19T18:00:00.000Z',
                    departure: { lat: 36.815, lng: 127.114 },
                  },
                },
                address: {
                  summary: '주소 출발',
                  value: {
                    timeHours: 2,
                    departure: { address: '충남 천안시 서북구 불당동' },
                  },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: '추천 결과 (후보 없으면 recommendations는 빈 배열, 여전히 200)',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/RecommendResult' },
              },
            },
          },
          '400': {
            description:
              '입력 검증 실패(Edge에서 패스스루). error ∈ "Invalid JSON" | "departure required" | "timeHours must be 1~6" | "invalid coords" | "address or coords required"',
            content: { 'application/json': { schema: ERROR_SCHEMA } },
          },
          '401': {
            description: 'Auth.js 세션 없음',
            content: {
              'application/json': {
                schema: ERROR_SCHEMA,
                example: { error: 'Unauthorized' },
              },
            },
          },
          '429': {
            description: '레이트리밋 초과 (사용자당 30req/60s, Edge에서 패스스루)',
            content: {
              'application/json': {
                schema: ERROR_SCHEMA,
                example: { error: 'Too many requests' },
              },
            },
          },
          '500': {
            description: 'Edge 내부 오류 (Kakao 지오코딩/모빌리티 실패 등)',
            content: {
              'application/json': {
                schema: ERROR_SCHEMA,
                example: { error: 'Internal error' },
              },
            },
          },
        },
      },
    },

    '/api/auth/session': {
      get: {
        tags: ['인증 (Auth.js)'],
        summary: '현재 세션 조회',
        operationId: 'getAuthSession',
        description:
          '**무엇**: 로그인 상태면 세션 JSON, 아니면 `{}`.\n\n**사용처**: 헤더의 로그인 상태 표시, 로그인 가드 등 **클라이언트에서 세션을 읽어야 할 때**. `<SessionProvider>`가 마운트돼 있어 `useSession()`으로 조회하거나(이 엔드포인트를 내부적으로 fetch), 서버에서 `auth()`로 읽어 props로 내려준다.',
        responses: {
          '200': {
            description: '세션(로그인 시) 또는 빈 객체',
            content: {
              'application/json': {
                schema: {
                  oneOf: [
                    { $ref: '#/components/schemas/Session' },
                    { type: 'object', additionalProperties: false },
                  ],
                },
              },
            },
          },
        },
      },
    },

    '/api/auth/csrf': {
      get: {
        tags: ['인증 (Auth.js)'],
        summary: 'CSRF 토큰 발급',
        operationId: 'getAuthCsrf',
        description:
          'signin/signout POST에 필요한 CSRF 토큰. `signIn()`/`signOut()`가 내부적으로 사용.',
        responses: {
          '200': {
            description: 'CSRF 토큰',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: { csrfToken: { type: 'string' } },
                  required: ['csrfToken'],
                },
              },
            },
          },
        },
      },
    },

    '/api/auth/providers': {
      get: {
        tags: ['인증 (Auth.js)'],
        summary: '설정된 OAuth 프로바이더 목록',
        operationId: 'getAuthProviders',
        description: '구성된 프로바이더(kakao, naver, google)와 각 signin/callback URL.',
        responses: {
          '200': {
            description: 'provider id → 메타 맵',
            content: {
              'application/json': {
                schema: { type: 'object', additionalProperties: true },
                example: {
                  kakao: {
                    id: 'kakao',
                    name: 'Kakao',
                    type: 'oauth',
                    signinUrl: '/api/auth/signin/kakao',
                    callbackUrl: '/api/auth/callback/kakao',
                  },
                },
              },
            },
          },
        },
      },
    },

    '/api/auth/signin/{provider}': {
      post: {
        tags: ['인증 (Auth.js)'],
        summary: 'OAuth 로그인 시작',
        operationId: 'postAuthSignin',
        description:
          '**무엇**: 해당 프로바이더 동의화면으로 302 리다이렉트.\n\n**사용처**: 로그인 화면(`/login`)의 카카오·네이버·구글 버튼. 실무에선 이 URL을 직접 치기보다 `signIn("kakao")`(next-auth/react) 또는 `/login`의 폼으로 트리거한다.',
        parameters: [
          {
            name: 'provider',
            in: 'path',
            required: true,
            schema: { type: 'string', enum: ['kakao', 'naver', 'google'] },
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/x-www-form-urlencoded': {
              schema: {
                type: 'object',
                properties: {
                  csrfToken: { type: 'string', description: '/api/auth/csrf 에서 발급' },
                  callbackUrl: { type: 'string', example: '/' },
                },
                required: ['csrfToken'],
              },
            },
          },
        },
        responses: {
          '302': { description: '프로바이더 authorize URL로 리다이렉트' },
        },
      },
    },

    '/api/auth/signout': {
      post: {
        tags: ['인증 (Auth.js)'],
        summary: '로그아웃',
        operationId: 'postAuthSignout',
        description: '세션 쿠키를 제거. 보통 `signOut()`로 호출.',
        security: [{ authjsSession: [] }],
        requestBody: {
          required: true,
          content: {
            'application/x-www-form-urlencoded': {
              schema: {
                type: 'object',
                properties: {
                  csrfToken: { type: 'string' },
                  callbackUrl: { type: 'string', example: '/' },
                },
                required: ['csrfToken'],
              },
            },
          },
        },
        responses: { '302': { description: '세션 쿠키 삭제 후 callbackUrl로 리다이렉트' } },
      },
    },

    '/api/auth/callback/{provider}': {
      get: {
        tags: ['인증 (Auth.js)'],
        summary: 'OAuth 콜백 (프로바이더 → 앱)',
        operationId: 'getAuthCallback',
        description:
          '⚠️ 프론트가 직접 부르지 않음. 프로바이더가 리다이렉트하는 redirect_uri. code 교환 → public.users upsert → 세션 쿠키 발급. 각 프로바이더 콘솔에 이 URL 등록 필요.',
        parameters: [
          {
            name: 'provider',
            in: 'path',
            required: true,
            schema: { type: 'string', enum: ['kakao', 'naver', 'google'] },
          },
          { name: 'code', in: 'query', required: true, schema: { type: 'string' } },
          { name: 'state', in: 'query', required: true, schema: { type: 'string' } },
        ],
        responses: {
          '302': { description: 'callbackUrl(기본 "/")로 리다이렉트, Set-Cookie 세션 토큰' },
        },
      },
    },

    // --- Supabase Edge Functions (내부 전용, 참고용) ---
    '/time-slider-recommender': {
      servers: [
        {
          url: '{supabaseUrl}/functions/v1',
          variables: {
            supabaseUrl: {
              default: 'https://YOUR-PROJECT-REF.supabase.co',
              description: 'NEXT_PUBLIC_SUPABASE_URL',
            },
          },
        },
      ],
      post: {
        tags: ['Edge Functions (내부)'],
        summary: 'F1 추천 코어 (Deno)',
        operationId: 'postTimeSliderRecommender',
        description: [
          '⚠️ **브라우저 직접 호출 금지**. `/api/recommend` BFF 또는 `searchRecommendations` 액션이 서버에서 호출한다.',
          '',
          '`Authorization: Bearer <Supabase 호환 JWT>` + `apikey: <anon key>` 필요. JWT는 `role==="authenticated"` 여야 하며,',
          'anon/service_role 키는 401로 거부된다(로컬 jose 검증, GoTrue getUser 미사용).',
          '',
          '입력/출력은 `/api/recommend`와 동일(RecommendInput → RecommendResult). 검증은 hand-rolled(zod 아님).',
        ].join('\n'),
        security: [{ supabaseBearer: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/RecommendInput' } },
          },
        },
        responses: {
          '200': {
            description: '추천 결과',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/RecommendResult' } },
            },
          },
          '401': {
            description: 'JWT 없음/무효/role 불일치',
            content: { 'application/json': { schema: ERROR_SCHEMA } },
          },
          '405': {
            description: 'POST/OPTIONS 이외',
            content: { 'application/json': { schema: ERROR_SCHEMA } },
          },
          '429': {
            description: '레이트리밋(30/60s per user)',
            content: { 'application/json': { schema: ERROR_SCHEMA } },
          },
          '400': {
            description: '입력 검증 실패',
            content: { 'application/json': { schema: ERROR_SCHEMA } },
          },
          '500': {
            description: '내부 오류',
            content: { 'application/json': { schema: ERROR_SCHEMA } },
          },
        },
      },
    },

    '/daily-recommend-email': {
      servers: [
        {
          url: '{supabaseUrl}/functions/v1',
          variables: {
            supabaseUrl: { default: 'https://YOUR-PROJECT-REF.supabase.co' },
          },
        },
      ],
      post: {
        tags: ['Edge Functions (내부)'],
        summary: '일일 추천 이메일 발송 (크론)',
        operationId: 'postDailyRecommendEmail',
        description:
          '⚠️ pg_cron이 매분 호출(service_role). 요청 본문 무시. 알림 시각·요일이 일치하는 사용자에게 상위 3 POI 이메일 발송(Resend). 주간 5회 상한.',
        responses: {
          '200': {
            description: '집계 결과',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    ok: { type: 'boolean' },
                    time: { type: 'string', example: '18:00' },
                    day: { type: 'string', example: 'TUE' },
                    candidates: { type: 'integer' },
                    sent: { type: 'integer' },
                    skipped: { type: 'integer' },
                    failed: { type: 'integer' },
                  },
                },
              },
            },
          },
          '500': {
            description: 'users 조회 실패',
            content: { 'application/json': { schema: ERROR_SCHEMA } },
          },
        },
      },
    },

    '/tour-api-etl': {
      servers: [
        {
          url: '{supabaseUrl}/functions/v1',
          variables: {
            supabaseUrl: { default: 'https://YOUR-PROJECT-REF.supabase.co' },
          },
        },
      ],
      post: {
        tags: ['Edge Functions (내부)'],
        summary: 'TourAPI 증분 ETL (크론)',
        operationId: 'postTourApiEtl',
        description:
          '⚠️ pg_cron이 매일 02:00 KST 호출(service_role). 충남 4개 시를 법정동코드(시도 44 + 시군구 150/131·133/200/210)로 KorService2/areaBasedList2 조회 + detailPetTour2 펫 오버레이하여 pois upsert (저장 sigunguCode 는 33020/33040/33050/33150).',
        requestBody: {
          required: false,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  areaCode: { type: 'integer', default: 33, description: '기본 33(충남)' },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: '동기화 결과',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    ok: { type: 'boolean' },
                    added: { type: 'integer' },
                    updated: { type: 'integer' },
                    failed: { type: 'integer' },
                  },
                },
              },
            },
          },
          '405': {
            description: 'POST 이외',
            content: { 'application/json': { schema: ERROR_SCHEMA } },
          },
          '500': {
            description: 'ETL 실패',
            content: { 'application/json': { schema: ERROR_SCHEMA } },
          },
        },
      },
    },

    // ─── 외부 데이터소스: 한국관광공사 TourAPI (data.go.kr B551011) ───
    '/KorService2/areaBasedList2': {
      servers: [
        { url: 'https://apis.data.go.kr/B551011', description: '공공데이터포탈 (data.go.kr)' },
      ],
      get: {
        tags: ['TourAPI (외부 데이터소스)'],
        summary: '지역기반 관광정보 조회 (POI 목록)',
        operationId: 'tourAreaBasedList2',
        description: [
          '충남 4개 시의 POI 목록을 **법정동코드**로 조회. `tour-api-etl` / `seed:tourapi` 가 호출한다.',
          '',
          '⚠️ `areaCode`/`sigunguCode` 는 **폐기(삭제예정)** — 사용 시 403. **`lDongRegnCd`(시도) + `lDongSignguCd`(시군구 3자리)** 사용.',
          '충남: `lDongRegnCd=44`, 시군구 = 공주 150 / 천안 131·133(동남·서북구) / 아산 200 / 서산 210.',
          '`serviceKey` 는 data.go.kr **Decoding** 키. 일일 호출한도 1000/오퍼레이션.',
        ].join('\n'),
        parameters: [
          {
            name: 'serviceKey',
            in: 'query',
            required: true,
            schema: { type: 'string' },
            description: 'data.go.kr 인증키(Decoding)',
          },
          {
            name: 'MobileOS',
            in: 'query',
            required: true,
            schema: { type: 'string', example: 'ETC' },
          },
          {
            name: 'MobileApp',
            in: 'query',
            required: true,
            schema: { type: 'string', example: 'daengroad' },
          },
          {
            name: '_type',
            in: 'query',
            required: true,
            schema: { type: 'string', enum: ['json', 'xml'], example: 'json' },
          },
          {
            name: 'lDongRegnCd',
            in: 'query',
            required: true,
            schema: { type: 'integer', example: 44 },
            description: '법정동 시도코드 (충남 44)',
          },
          {
            name: 'lDongSignguCd',
            in: 'query',
            required: true,
            schema: { type: 'integer', example: 150 },
            description: '법정동 시군구 3자리 (공주 150 / 천안 131·133 / 아산 200 / 서산 210)',
          },
          { name: 'numOfRows', in: 'query', schema: { type: 'integer', example: 100 } },
          { name: 'pageNo', in: 'query', schema: { type: 'integer', example: 1 } },
          {
            name: 'arrange',
            in: 'query',
            schema: { type: 'string', example: 'C' },
            description: 'C=수정일순',
          },
        ],
        responses: {
          '200': {
            description: 'POI 목록 (response.body.items.item[])',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/TourAreaItem' } },
            },
          },
        },
      },
    },

    '/KorService2/detailPetTour2': {
      servers: [
        { url: 'https://apis.data.go.kr/B551011', description: '공공데이터포탈 (data.go.kr)' },
      ],
      get: {
        tags: ['TourAPI (외부 데이터소스)'],
        summary: '반려동물 동반여행 상세 (펫 오버레이)',
        operationId: 'tourDetailPetTour2',
        description: [
          '`contentId` 로 반려동물 동반 정보를 조회. 데이터가 있으면 그 POI 는 **펫동반 가능**(`pois.petAllowed=true`).',
          '',
          '⚠️ 예전 경로 `KorPetTourService/detailPetTour` 는 **404** — **`KorService2/detailPetTour2`** 가 정답.',
          '충남 4개 시 펫등록률 ≈ 8%. 일일 호출한도 1000.',
        ].join('\n'),
        parameters: [
          { name: 'serviceKey', in: 'query', required: true, schema: { type: 'string' } },
          {
            name: 'MobileOS',
            in: 'query',
            required: true,
            schema: { type: 'string', example: 'ETC' },
          },
          {
            name: 'MobileApp',
            in: 'query',
            required: true,
            schema: { type: 'string', example: 'daengroad' },
          },
          {
            name: '_type',
            in: 'query',
            required: true,
            schema: { type: 'string', example: 'json' },
          },
          {
            name: 'contentId',
            in: 'query',
            required: true,
            schema: { type: 'string', example: '2736822' },
          },
        ],
        responses: {
          '200': {
            description:
              '펫 상세(없으면 items 빈값) → pois.petIndoor/petOutdoor/petPolicyText 로 매핑',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/TourPetDetail' } },
            },
          },
        },
      },
    },
  },

  components: {
    securitySchemes: {
      authjsSession: {
        type: 'apiKey',
        in: 'cookie',
        name: 'authjs.session-token',
        description:
          'Auth.js 세션 쿠키(dev: `authjs.session-token`, prod: `__Secure-authjs.session-token`). 브라우저에서 호출 시 자동 첨부됨 — 이 문서의 Try it도 로그인 상태면 동작.',
      },
      supabaseBearer: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description:
          'Supabase 호환 JWT(HS256, SB_JWT_SECRET 서명, role="authenticated"). 서버 전용 — 세션 콜백이 발급. 브라우저에 노출 금지.',
      },
    },
    schemas: {
      // ---- 추천 도메인 ----
      RecommendInput: {
        type: 'object',
        required: ['timeHours', 'departure'],
        properties: {
          timeHours: {
            type: 'number',
            minimum: 1,
            maximum: 6,
            description: '가용 외출 시간(시간). 1~6.',
          },
          petId: {
            type: 'string',
            format: 'uuid',
            nullable: true,
            description: '대상 반려동물(선택)',
          },
          startAt: {
            type: 'string',
            format: 'date-time',
            description: '외출 시작 시각(ISO). 생략 시 현재.',
          },
          departure: {
            description: '출발지. 좌표 또는 주소 중 하나(필수).',
            oneOf: [
              {
                type: 'object',
                required: ['lat', 'lng'],
                properties: {
                  lat: { type: 'number', example: 36.815 },
                  lng: { type: 'number', example: 127.114 },
                },
              },
              {
                type: 'object',
                required: ['address'],
                properties: { address: { type: 'string', example: '충남 천안시 서북구 불당동' } },
              },
            ],
          },
        },
      },
      RecommendResult: {
        type: 'object',
        required: ['recommendations'],
        properties: {
          recommendations: {
            type: 'array',
            items: { $ref: '#/components/schemas/Recommendation' },
          },
        },
      },
      Recommendation: {
        type: 'object',
        description: '추천된 POI 1건 (알고리즘 결과, DB Recommendation과 다름)',
        properties: {
          poiId: { type: 'string', format: 'uuid' },
          name: { type: 'string', example: '천안 호수공원' },
          address: { type: 'string' },
          lat: { type: 'number' },
          lng: { type: 'number' },
          sourceLabel: {
            type: 'string',
            example: '펫 동반 가능',
            description: "'펫 동반 가능' | '한적한 산책지' | '두루누비 코스'",
          },
          type: { $ref: '#/components/schemas/PoiType' },
          imageUrl: { type: 'string', nullable: true },
          badges: { type: 'array', items: { $ref: '#/components/schemas/BadgeType' } },
          petAllowed: {
            type: 'boolean',
            description:
              '펫 동반 가능(TourAPI detailPetTour2 등록). FE "펫 동반 가능" 뱃지. PET_VERIFIED(사용자 검증 뱃지)와 별개.',
          },
          reason: { $ref: '#/components/schemas/RecommendReason' },
          sampleSufficient: { type: 'boolean', description: '한적도 표본이 충분한지' },
        },
      },
      RecommendReason: {
        type: 'object',
        description: '추천 근거 칩 데이터',
        properties: {
          distanceKm: { type: 'number', example: 8.4 },
          etaMin: { type: 'integer', example: 14 },
          quietnessNow: {
            type: 'integer',
            description: '현재 한적도 0~100(웰니스/에코 보너스 반영)',
          },
          quietnessForecast: { type: 'integer', description: '예측 한적도 0~100' },
          quietnessWeekAvg: { type: 'integer', description: '주간 평균 한적도 0~100' },
          verifiedCount: { type: 'integer', description: '최근 6개월 유효 검증 수' },
        },
      },
      Session: {
        type: 'object',
        description: 'Auth.js 세션(GET /api/auth/session). supabaseAccessToken은 서버 전용 값.',
        properties: {
          user: {
            type: 'object',
            properties: {
              id: { type: 'string', format: 'uuid', description: 'public.users.id' },
              name: { type: 'string', nullable: true },
              email: { type: 'string', nullable: true },
              image: { type: 'string', nullable: true },
              role: { type: 'string', enum: ['user', 'admin'] },
            },
          },
          expires: { type: 'string', format: 'date-time' },
          supabaseAccessToken: { type: 'string', description: 'HS256 JWT (서버에서만 접근)' },
        },
      },

      // ---- 프론트가 소비하는 DB DTO ----
      Poi: {
        type: 'object',
        description: '장소(POI). 지도/목록/상세 화면의 코어 카탈로그. (public read)',
        properties: {
          id: { type: 'string', format: 'uuid' },
          source: { $ref: '#/components/schemas/SyncSource' },
          sourceId: { type: 'string' },
          contentTypeId: { type: 'integer', nullable: true },
          name: { type: 'string' },
          type: { $ref: '#/components/schemas/PoiType' },
          category1: { type: 'string', nullable: true },
          category2: { type: 'string', nullable: true },
          category3: { type: 'string', nullable: true },
          sigunguCode: {
            type: 'integer',
            nullable: true,
            description: '충남 33020/33040/33050/33150. 조회는 법정동, 저장은 구 코드 33xxx',
          },
          ldongCode: { type: 'string', nullable: true },
          address: { type: 'string', nullable: true },
          lat: { type: 'number' },
          lng: { type: 'number' },
          geohash7: { type: 'string' },
          imageUrls: { type: 'array', items: { type: 'string' } },
          intro: { type: 'string', nullable: true },
          homepage: { type: 'string', nullable: true },
          phone: { type: 'string', nullable: true },
          petAllowed: { type: 'boolean', description: 'TourAPI detailPetTour2 등록 여부' },
          petSizeMaxKg: { type: 'integer', nullable: true },
          petIndoor: { type: 'boolean', nullable: true },
          petOutdoor: { type: 'boolean', nullable: true },
          petPolicyText: { type: 'string', nullable: true },
          isWellness: { type: 'boolean' },
          isEco: { type: 'boolean' },
          lastSyncedAt: { type: 'string', format: 'date-time' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      Pet: {
        type: 'object',
        description: '반려견 프로필 (owner-only RLS)',
        properties: {
          id: { type: 'string', format: 'uuid' },
          userId: { type: 'string', format: 'uuid' },
          name: { type: 'string' },
          breed: { type: 'string' },
          weightKg: { type: 'string', description: 'Decimal(4,2) — JSON에선 문자열' },
          ageYears: { type: 'integer' },
          restrictions: {
            type: 'array',
            items: { type: 'string', enum: ['CAR_SICK', 'HEAT_SENSITIVE', 'NOISE_SENSITIVE'] },
          },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      Review: {
        type: 'object',
        description: 'POI 리뷰. status=PUBLIC이거나 본인 것만 조회 가능(RLS).',
        properties: {
          id: { type: 'string', format: 'uuid' },
          userId: { type: 'string', format: 'uuid' },
          poiId: { type: 'string', format: 'uuid' },
          rating: { type: 'integer', minimum: 1, maximum: 5 },
          body: { type: 'string', nullable: true },
          photos: { type: 'array', items: { type: 'string', format: 'uri' } },
          status: { $ref: '#/components/schemas/ReviewStatus' },
          reportCount: { type: 'integer' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      Verification: {
        type: 'object',
        description: '방문 인증(체크인). photo+EXIF GPS로 isValid 판정. public read / owner write.',
        properties: {
          id: { type: 'string', format: 'uuid' },
          poiId: { type: 'string', format: 'uuid' },
          userId: { type: 'string', format: 'uuid' },
          visitedAt: { type: 'string', format: 'date-time' },
          photoUrl: { type: 'string', nullable: true },
          evaluation: { $ref: '#/components/schemas/VisitEvaluation' },
          exifLat: { type: 'number', nullable: true, description: '위치 PII' },
          exifLng: { type: 'number', nullable: true, description: '위치 PII' },
          exifAt: { type: 'string', format: 'date-time', nullable: true },
          isValid: { type: 'boolean', description: 'GPS 1km 이내 + 7일 이내 촬영 시 true' },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      QuietnessScore: {
        type: 'object',
        description: '한적도(0~100) — POI/시군구 × 요일 × 시간대',
        properties: {
          id: { type: 'string', format: 'uuid' },
          poiId: {
            type: 'string',
            format: 'uuid',
            nullable: true,
            description: 'null이면 시군구 레벨',
          },
          sigunguCode: { type: 'integer' },
          weekday: { type: 'integer', minimum: 0, maximum: 6, description: '0=일 ~ 6=토' },
          hourSlot: { type: 'integer', minimum: 0, maximum: 23 },
          score: { type: 'integer', minimum: 0, maximum: 100 },
          source: { $ref: '#/components/schemas/QuietnessSource' },
          sampleSize: { type: 'integer', nullable: true },
          computedAt: { type: 'string', format: 'date-time' },
        },
      },
      PoiForecast: {
        type: 'object',
        description: 'POI 일별 혼잡/한적 예측',
        properties: {
          id: { type: 'string', format: 'uuid' },
          poiId: { type: 'string', format: 'uuid' },
          forecastDate: { type: 'string', format: 'date' },
          expectedScore: { type: 'integer', minimum: 0, maximum: 100 },
          expectedVisitors: { type: 'integer', nullable: true },
          confidence: { type: 'string', nullable: true, description: 'Decimal(3,2) 0.00~1.00' },
          computedAt: { type: 'string', format: 'date-time' },
        },
      },
      DurunubiCourse: {
        type: 'object',
        description: '두루누비 산책/트레일 코스 (POI 1:1 연결 가능)',
        properties: {
          id: { type: 'string', format: 'uuid' },
          poiId: { type: 'string', format: 'uuid', nullable: true },
          routeIdx: { type: 'string' },
          routeName: { type: 'string' },
          themeName: { type: 'string', nullable: true },
          totalDistanceKm: { type: 'string', description: 'Decimal(6,2)' },
          totalElevationM: { type: 'integer', nullable: true },
          estimatedMin: { type: 'integer', nullable: true },
          difficultyLevel: { type: 'integer', nullable: true },
          pathGeoJson: { type: 'object', nullable: true, description: 'GeoJSON' },
          imageUrls: { type: 'array', items: { type: 'string' } },
          description: { type: 'string', nullable: true },
          lastSyncedAt: { type: 'string', format: 'date-time' },
        },
      },
      Badge: {
        type: 'object',
        description: 'POI 신뢰/품질 배지 (6개월 신선도). POI 카드 칩.',
        properties: {
          id: { type: 'string', format: 'uuid' },
          poiId: { type: 'string', format: 'uuid' },
          badgeType: { $ref: '#/components/schemas/BadgeType' },
          grantedAt: { type: 'string', format: 'date-time' },
          expiresAt: { type: 'string', format: 'date-time', nullable: true },
          metadata: { type: 'object', nullable: true },
        },
      },

      // ---- Enums ----
      PoiType: {
        type: 'string',
        enum: ['CAFE', 'RESTAURANT', 'TRAIL', 'PARK', 'ATTRACTION', 'ACCOMMODATION', 'REST_AREA'],
      },
      BadgeType: {
        type: 'string',
        enum: ['PET_VERIFIED', 'WELLNESS', 'ECO', 'TRAIL_OFFICIAL'],
      },
      VisitEvaluation: { type: 'string', enum: ['QUIET', 'OK', 'CROWDED'] },
      ReviewStatus: { type: 'string', enum: ['PUBLIC', 'HIDDEN_REPORTED', 'REMOVED'] },
      RecommendStatus: { type: 'string', enum: ['PENDING', 'COMPLETED', 'FAILED'] },
      QuietnessSource: {
        type: 'string',
        enum: ['DATABANK_VISITOR', 'DATABANK_NAVI', 'FORECAST_30D', 'UGC'],
      },
      SyncSource: {
        type: 'string',
        enum: [
          'TOUR_API_KOR',
          'TOUR_API_PET',
          'DATALAB_VISITOR',
          'DATALAB_NAVI',
          'DATALAB_FORECAST',
          'DATALAB_DEMAND',
          'DURUNUBI',
          'WELLNESS',
          'ECO',
          'GO_CAMPING',
          'USER_UGC',
        ],
      },

      // ─── TourAPI(외부 데이터소스) 응답 참조 스키마 ───
      TourAreaItem: {
        type: 'object',
        description:
          'areaBasedList2 응답 item (response.body.items.item[]). mapx=경도(lng), mapy=위도(lat).',
        properties: {
          contentid: { type: 'string', example: '2736822' },
          contenttypeid: {
            type: 'string',
            description: '12관광지·14문화·15축제·25여행코스·28레포츠·32숙박·38쇼핑·39음식점',
          },
          title: { type: 'string', example: '유구색동수국정원' },
          addr1: { type: 'string', nullable: true },
          mapx: { type: 'string', description: '경도(lng)' },
          mapy: { type: 'string', description: '위도(lat)' },
          firstimage: { type: 'string', nullable: true },
          tel: { type: 'string', nullable: true },
        },
      },
      TourPetDetail: {
        type: 'object',
        description: 'detailPetTour2 응답 item. 존재하면 펫동반 가능 → pois 펫 필드로 매핑.',
        properties: {
          acmpyTypeCd: {
            type: 'string',
            example: '전구역 동반가능',
            description: '동반 구역 → petIndoor/petOutdoor',
          },
          acmpyPsblCpam: {
            type: 'string',
            example: '전 견종 동반 가능',
            description: '동반 가능 견종',
          },
          acmpyNeedMtr: { type: 'string', example: '목줄 착용', description: '필요 준비물' },
          etcAcmpyInfo: { type: 'string', description: '기타 동반 정보 → petPolicyText' },
          relaAcdntRiskMtr: { type: 'string', description: '관련 위험/견종' },
        },
      },
    },
  },
} as const;

export type OpenApiDocument = typeof openApiDocument;
