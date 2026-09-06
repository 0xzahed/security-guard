import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts', 'src/detectors/index.ts', 'src/scoring.ts'],
  format: ['esm', 'cjs'],
  target: 'es2022',
  platform: 'browser',
  dts: true,
  sourcemap: true,
  clean: true,
  splitting: true,
  treeshake: true,
});
