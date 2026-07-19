import Link from 'next/link';
import type { Metadata } from 'next';
import { openApiDocument } from '@/lib/api-docs/openapi';
import {
  serverActions,
  serverActionGroups,
  type ServerActionDoc,
} from '@/lib/api-docs/server-actions';

export const metadata: Metadata = {
  title: 'API 문서',
  description:
    '댕로드 프론트엔드 연동 가이드 — HTTP 엔드포인트(Swagger) + Server Actions + 데이터 모델',
};

// ---------------------------------------------------------------------------
// OpenAPI paths → 요약 행 추출
// ---------------------------------------------------------------------------
interface EndpointRow {
  method: string;
  path: string;
  summary: string;
  internal: boolean;
  auth: boolean;
}

function collectEndpoints(): EndpointRow[] {
  const rows: EndpointRow[] = [];
  const paths = openApiDocument.paths as Record<string, Record<string, unknown>>;
  const methods = ['get', 'post', 'put', 'patch', 'delete'] as const;
  for (const [path, item] of Object.entries(paths)) {
    for (const method of methods) {
      const op = item[method] as
        | { summary?: string; tags?: string[]; security?: unknown[] }
        | undefined;
      if (!op) continue;
      const tags = op.tags ?? [];
      rows.push({
        method: method.toUpperCase(),
        path,
        summary: op.summary ?? '',
        internal: tags.some((t) => t.includes('내부')),
        auth: Array.isArray(op.security) && op.security.length > 0,
      });
    }
  }
  return rows;
}

// ---------------------------------------------------------------------------
// 프레젠테이션 헬퍼
// ---------------------------------------------------------------------------
function MethodBadge({ method, internal }: { method: string; internal?: boolean }) {
  const color = internal
    ? 'bg-gray-100 text-gray-500 ring-gray-200'
    : method === 'GET'
      ? 'bg-green-50 text-green-700 ring-green-200'
      : method === 'POST'
        ? 'bg-orange-50 text-brand ring-orange-200'
        : 'bg-blue-50 text-blue-700 ring-blue-200';
  return (
    <span
      className={`inline-flex min-w-[3.4rem] justify-center rounded-md px-2 py-0.5 font-mono text-[11px] font-bold ring-1 ring-inset ${color}`}
    >
      {method}
    </span>
  );
}

function AuthChip({ required }: { required: boolean }) {
  return required ? (
    <span className="inline-flex items-center rounded-full bg-pink-100 px-2 py-0.5 text-[11px] font-medium text-pink-700">
      🔒 로그인 필요
    </span>
  ) : (
    <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-600">
      공개
    </span>
  );
}

function SectionTitle({ n, title, desc }: { n: string; title: string; desc: string }) {
  return (
    <div className="mb-4 flex items-baseline gap-3">
      <span className="font-mono text-sm font-bold text-brand">{n}</span>
      <div>
        <h2 className="text-lg font-bold text-gray-900">{title}</h2>
        <p className="mt-0.5 text-sm text-gray-500">{desc}</p>
      </div>
    </div>
  );
}

function Code({ children }: { children: React.ReactNode }) {
  return (
    <code className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-[12px] text-gray-800">
      {children}
    </code>
  );
}

function Pre({ children }: { children: string }) {
  return (
    <pre className="overflow-x-auto rounded-lg bg-gray-900 p-3 text-[12px] leading-relaxed text-gray-100">
      <code className="font-mono">{children}</code>
    </pre>
  );
}

// ---------------------------------------------------------------------------
// Server Action 카드 (native <details> — 클라이언트 JS 없이 접기)
// ---------------------------------------------------------------------------
function ActionCard({ a }: { a: ServerActionDoc }) {
  return (
    <details className="group rounded-2xl border border-gray-200 bg-white shadow-sm">
      <summary className="flex cursor-pointer list-none flex-col gap-2 p-4 [&::-webkit-details-marker]:hidden">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-sm font-semibold text-gray-900">{a.name}</span>
          <AuthChip required={a.authRequired} />
          {a.importPath === null && (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-700">
              인라인 폼 액션
            </span>
          )}
          <span className="ml-auto text-[11px] text-gray-400 group-open:hidden">펼치기 ▾</span>
          <span className="ml-auto hidden text-[11px] text-gray-400 group-open:inline">접기 ▴</span>
        </div>
        <p className="text-sm text-gray-700">{a.what}</p>
        <p className="text-[13px] text-gray-500">
          <span className="font-semibold text-brand">사용처</span> · {a.usedIn}
        </p>
      </summary>

      <div className="space-y-3 border-t border-gray-100 p-4 pt-3">
        {a.importPath ? (
          <p className="text-[13px] text-gray-600">
            <span className="font-semibold">import</span> ·{' '}
            <Code>{`import { ${a.name.split(' ')[0]} } from '${a.importPath}'`}</Code>
          </p>
        ) : (
          <p className="text-[13px] text-gray-600">
            <span className="font-semibold">호출</span> · import 불가(익명 클로저). {a.file} 의{' '}
            <Code>&lt;form action&gt;</Code> 으로 submit.
          </p>
        )}

        <dl className="grid gap-3 sm:grid-cols-2">
          <div>
            <dt className="text-[12px] font-semibold uppercase tracking-wide text-gray-400">
              입력
            </dt>
            <dd className="mt-1 break-words font-mono text-[12px] text-gray-700">
              {a.input ?? '없음 (인자 X)'}
            </dd>
          </div>
          <div>
            <dt className="text-[12px] font-semibold uppercase tracking-wide text-gray-400">
              반환
            </dt>
            <dd className="mt-1 break-words font-mono text-[12px] text-gray-700">{a.returns}</dd>
          </div>
        </dl>

        <div className="flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-gray-500">
          <span>
            <span className="font-semibold text-gray-600">revalidate</span> · {a.revalidates}
          </span>
          <span>
            <span className="font-semibold text-gray-600">부수효과</span> · {a.sideEffects}
          </span>
        </div>

        <div>
          <p className="mb-1 text-[12px] font-semibold uppercase tracking-wide text-gray-400">
            사용 예제
          </p>
          <Pre>{a.example}</Pre>
        </div>

        {a.gotcha && (
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[13px] text-amber-800">
            <span className="font-semibold">⚠️ 주의</span> · {a.gotcha}
          </p>
        )}
      </div>
    </details>
  );
}

// ---------------------------------------------------------------------------
// 페이지
// ---------------------------------------------------------------------------
export default function ApiDocsPage() {
  const endpoints = collectEndpoints();
  const feEndpoints = endpoints.filter((e) => !e.internal);
  const internalEndpoints = endpoints.filter((e) => e.internal);
  const schemaNames = Object.keys(
    (openApiDocument.components as { schemas: Record<string, unknown> }).schemas,
  ).filter((n) => !['RecommendInput', 'RecommendResult', 'RecommendReason', 'Session'].includes(n));

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      {/* ---------------- Header ---------------- */}
      <header className="mb-8">
        <p className="mb-2 text-sm font-semibold text-brand">댕로드 · 프론트엔드 연동 가이드</p>
        <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">API 문서</h1>
        <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-gray-600">
          "퇴근 후 한적한 펫 외출". 이 앱은 <b>HTTP 엔드포인트</b>와 <b>Server Actions(RPC)</b> 두
          가지 방식을 씁니다. HTTP는 아래 인터랙티브 Swagger에서 직접 호출해볼 수 있고, Server
          Actions는 함수를 import해서 씁니다.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link
            href="/api-docs/reference"
            className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-hover"
          >
            🧪 인터랙티브 Swagger 열기
          </Link>
          <a
            href="/api-docs/openapi.json"
            className="inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
          >
            ⬇️ openapi.json (Postman import)
          </a>
        </div>
      </header>

      {/* ---------------- 두 가지 API 스타일 ---------------- */}
      <section className="mb-10">
        <SectionTitle
          n="00"
          title="두 가지 API 스타일 — 헷갈리지 마세요"
          desc="URL로 fetch할 것 vs import해서 호출할 것"
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="mb-2 flex items-center gap-2">
              <MethodBadge method="POST" />
              <h3 className="font-semibold text-gray-900">HTTP 엔드포인트</h3>
            </div>
            <p className="text-sm leading-relaxed text-gray-600">
              <Code>fetch(&apos;/api/recommend&apos;)</Code> 처럼 URL로 호출. 추천 BFF와 Auth.js
              라우트가 여기 해당. Edge Functions는 서버/크론 전용이라 브라우저가 직접 부르지
              않습니다.
              <br />→ 아래 <b>①</b> 및 인터랙티브 Swagger 참고.
            </p>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="mb-2 flex items-center gap-2">
              <span className="inline-flex min-w-[3.4rem] justify-center rounded-md bg-orange-50 px-2 py-0.5 font-mono text-[11px] font-bold text-brand ring-1 ring-inset ring-orange-200">
                RPC
              </span>
              <h3 className="font-semibold text-gray-900">Server Actions</h3>
            </div>
            <p className="text-sm leading-relaxed text-gray-600">
              <Code>{`import { createReview } from '@/lib/actions/reviews'`}</Code> 처럼 함수로
              호출. URL/안정 엔드포인트가 없고 Next.js가 같은 오리진으로 인자를 POST합니다. 앱 기능
              대부분이 이 방식.
              <br />→ 아래 <b>②</b> 참고.
            </p>
          </div>
        </div>
      </section>

      {/* ---------------- 인증 ---------------- */}
      <section className="mb-10">
        <SectionTitle
          n="＊"
          title="인증 — Auth.js v5 + Supabase JWT 브리지"
          desc="세션을 어떻게 얻고, 어떻게 API에 전달되는지"
        />
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <ol className="space-y-2.5 text-sm leading-relaxed text-gray-700">
            <li>
              <b>1. 로그인</b> — <Code>/login</Code> 의 카카오·네이버·구글 버튼(또는{' '}
              <Code>signIn(&apos;kakao&apos;)</Code>). JWT 세션 전략(DB 어댑터 없음), 세션 1시간.
            </li>
            <li>
              <b>2. 세션 읽기</b> — 서버에서 <Code>const session = await auth()</Code>. 여기서{' '}
              <Code>session.user.id</Code>(=public.users.id), <Code>session.user.role</Code> 사용.
            </li>
            <li>
              <b>3. Supabase 토큰</b> — 세션 콜백이 <Code>session.supabaseAccessToken</Code>(HS256
              JWT, <Code>role=&quot;authenticated&quot;</Code>, 1h)를 발급. <b>서버 전용</b> —
              브라우저 노출 X.
            </li>
            <li>
              <b>4. API 인증</b> — <Code>POST /api/recommend</Code> /{' '}
              <Code>searchRecommendations</Code> 가 이 토큰을 Edge Function에{' '}
              <Code>Authorization: Bearer</Code> 로 전달(RLS 통과).
            </li>
          </ol>
          <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-[13px] leading-relaxed text-amber-800">
            <p>
              <b>⚠️ 프론트 주의</b>
            </p>
            <ul className="mt-1 list-disc space-y-1 pl-5">
              <li>
                현재 <Code>&lt;SessionProvider&gt;</Code> 가 없어 <Code>useSession()</Code> 은
                동작하지 않습니다. 세션은 서버 <Code>auth()</Code> → props, 또는{' '}
                <Code>GET /api/auth/session</Code> 으로 읽으세요.
              </li>
              <li>
                프론트가 쓰는 env: <Code>NEXT_PUBLIC_SUPABASE_URL</Code>,{' '}
                <Code>NEXT_PUBLIC_SUPABASE_ANON_KEY</Code>, <Code>NEXT_PUBLIC_KAKAO_JS_KEY</Code>{' '}
                (그 외 선택). 🚫 <Code>SUPABASE_SERVICE_ROLE_KEY</Code>·<Code>SB_JWT_SECRET</Code>{' '}
                등 서버 시크릿은 절대 프론트로 내리지 마세요.
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* ---------------- ① HTTP 엔드포인트 ---------------- */}
      <section className="mb-10">
        <SectionTitle
          n="①"
          title="HTTP 엔드포인트 (Swagger)"
          desc="URL로 직접 호출. 인터랙티브 Try it은 상단 버튼에서."
        />

        <h3 className="mb-2 text-sm font-semibold text-gray-700">브라우저가 호출하는 엔드포인트</h3>
        <div className="mb-6 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <tbody className="divide-y divide-gray-100">
              {feEndpoints.map((e) => (
                <tr key={`${e.method}-${e.path}`} className="align-top">
                  <td className="whitespace-nowrap px-4 py-3">
                    <MethodBadge method={e.method} />
                  </td>
                  <td className="px-2 py-3 font-mono text-[12px] text-gray-800">{e.path}</td>
                  <td className="px-2 py-3 text-gray-600">{e.summary}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-right">
                    <AuthChip required={e.auth} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <h3 className="mb-2 text-sm font-semibold text-gray-700">
          Edge Functions — 내부/크론 전용 (브라우저 직접 호출 ✗, 참고용)
        </h3>
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-gray-50 shadow-sm">
          <table className="w-full text-left text-sm">
            <tbody className="divide-y divide-gray-100">
              {internalEndpoints.map((e) => (
                <tr key={`${e.method}-${e.path}`} className="align-top">
                  <td className="whitespace-nowrap px-4 py-3">
                    <MethodBadge method={e.method} internal />
                  </td>
                  <td className="px-2 py-3 font-mono text-[12px] text-gray-600">{e.path}</td>
                  <td className="px-2 py-3 text-gray-500">{e.summary}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ---------------- ② Server Actions ---------------- */}
      <section className="mb-10">
        <SectionTitle
          n="②"
          title="Server Actions (RPC)"
          desc="import해서 호출. 각 항목을 펼치면 입력·반환·예제가 나옵니다."
        />
        <div className="space-y-6">
          {serverActionGroups.map((group) => {
            const items = serverActions.filter((a) => a.group === group);
            if (items.length === 0) return null;
            return (
              <div key={group}>
                <h3 className="mb-2 text-sm font-semibold text-gray-500">{group}</h3>
                <div className="space-y-2.5">
                  {items.map((a) => (
                    <ActionCard key={a.name} a={a} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ---------------- ③ 데이터 모델 ---------------- */}
      <section className="mb-10">
        <SectionTitle
          n="③"
          title="데이터 모델 (DTO)"
          desc="응답에 등장하는 주요 엔티티. 전체 필드는 Swagger의 Models에서."
        />
        <div className="flex flex-wrap gap-2">
          {schemaNames.map((name) => (
            <span
              key={name}
              className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 font-mono text-[13px] text-gray-700 shadow-sm"
            >
              {name}
            </span>
          ))}
        </div>
        <p className="mt-3 text-sm text-gray-500">
          각 모델의 전체 필드·타입·enum은{' '}
          <Link href="/api-docs/reference" className="font-medium text-brand hover:underline">
            인터랙티브 Swagger
          </Link>{' '}
          의 <b>Models</b> 섹션에서 확인하세요. (RLS·PII·암호화 필드는 백엔드 스키마 문서 참고.)
        </p>
      </section>

      {/* ---------------- Footer ---------------- */}
      <footer className="mt-12 border-t border-gray-200 pt-6 text-sm text-gray-500">
        <p className="mb-1 font-semibold text-gray-700">참고</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            인터랙티브 Swagger: <Code>/api-docs/reference</Code>
          </li>
          <li>
            OpenAPI 스펙(JSON): <Code>/api-docs/openapi.json</Code> — Postman / Swagger Editor / VS
            Code 확장에 import
          </li>
          <li>
            이 문서는 <Code>apps/web/lib/api-docs/</Code> 의 소스에서 생성됩니다. 백엔드 변경 시
            함께 갱신하세요.
          </li>
        </ul>
      </footer>
    </main>
  );
}
