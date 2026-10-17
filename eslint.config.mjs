import { FlatCompat } from '@eslint/eslintrc';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const compat = new FlatCompat({
  baseDirectory: dirname(fileURLToPath(import.meta.url)),
});

/**
 * eslint-config-next 15.x still ships legacy (eslintrc) configs, so they are
 * bridged into ESLint 9's flat config with FlatCompat.
 */
const eslintConfig = [
  ...compat.extends('next/core-web-vitals', 'next/typescript'),
  {
    ignores: [
      '.next/**',
      'out/**',
      'build/**',
      'node_modules/**',
      'next-env.d.ts',
      'supabase/.temp/**',
    ],
  },
];

export default eslintConfig;
