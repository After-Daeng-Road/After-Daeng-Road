import { NextResponse } from 'next/server';
import { openApiDocument } from '@/lib/api-docs/openapi';

// GET /api-docs/openapi.json
// 댕로드 HTTP API의 OpenAPI 3.1 스펙(JSON). Scalar가 렌더 소스로 fetch하고,
// 프론트는 이 URL을 Postman / Swagger Editor / VS Code 확장에 바로 import할 수 있다.
export const dynamic = 'force-static';

export function GET() {
  return NextResponse.json(openApiDocument);
}
