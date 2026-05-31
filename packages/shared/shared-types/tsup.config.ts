import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts', 'src/industries.ts', 'src/data/currencies.ts', 'src/data/timezones.ts'],
  format: ['cjs', 'esm'],
  dts: true,
  clean: true,
  external: [],
});
