import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist/**', 'demo-dist/**', 'node_modules/**', 'validation/**', 'examples/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  { files: ['src/detectors/debugger.ts'], rules: { 'no-debugger': 'off' } },
);
