import { prisma } from '@/lib/prisma';
import type { Prisma } from '@prisma/client';

// PRD §10.1 / §11.3 — OAuth 로그인 시 유저 정본을 public.users 에 upsert (Node Runtime 전용)
// 어댑터 미사용: provider id(kakao/naver/google) 기준 조회 → 동일 email 이면 계정 연결 → 없으면 생성.
// 반환 id 는 public.users.id (세션·Supabase JWT 의 sub 가 된다)

type OAuthProvider = 'kakao' | 'naver' | 'google';

function isOAuthProvider(p: string): p is OAuthProvider {
  return p === 'kakao' || p === 'naver' || p === 'google';
}

function providerWhere(provider: OAuthProvider, id: string): Prisma.UserWhereUniqueInput {
  switch (provider) {
    case 'kakao':
      return { kakaoId: id };
    case 'naver':
      return { naverId: id };
    case 'google':
      return { googleId: id };
  }
}

function providerIdData(provider: OAuthProvider, id: string): Prisma.UserUpdateInput {
  switch (provider) {
    case 'kakao':
      return { kakaoId: id };
    case 'naver':
      return { naverId: id };
    case 'google':
      return { googleId: id };
  }
}

export async function upsertOAuthUser(params: {
  provider: string;
  providerAccountId: string;
  email?: string | null;
  nickname?: string | null;
}): Promise<{ id: string; role: string }> {
  if (!isOAuthProvider(params.provider)) {
    throw new Error(`지원하지 않는 provider: ${params.provider}`);
  }
  const provider = params.provider;
  const email = params.email?.toLowerCase() ?? null;

  // 1) provider id 로 기존 유저
  let user = await prisma.user.findUnique({
    where: providerWhere(provider, params.providerAccountId),
  });

  // 2) 동일 email 의 다른 provider 가입자면 계정 연결 (email unique 충돌 방지 겸)
  if (!user && email) {
    const byEmail = await prisma.user.findUnique({ where: { email } });
    if (byEmail) {
      user = await prisma.user.update({
        where: { id: byEmail.id },
        data: providerIdData(provider, params.providerAccountId),
      });
    }
  }

  // 3) 신규 생성
  if (!user) {
    user = await prisma.user.create({
      data: {
        ...providerIdData(provider, params.providerAccountId),
        email,
        nickname: params.nickname ?? null,
      } as Prisma.UserCreateInput,
    });
  }

  return { id: user.id, role: user.role };
}
