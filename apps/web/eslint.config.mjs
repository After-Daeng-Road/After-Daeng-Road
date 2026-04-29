import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { FlatCompat } from '@eslint/eslintrc';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({ baseDirectory: __dirname });

export default [
  ...compat.extends('next/core-web-vitals', 'next/typescript'),
  {
    rules: {
      // PRD §16: 후기/UGC 관련 인풋 검증을 zod로 강제하므로 any 약간 허용
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },
];
