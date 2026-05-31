import { defineConfig } from 'tsup';

export default defineConfig({
  entry: [
    'src/index.ts',
    'src/defaults/working-hours.ts',
    'src/defaults/services.ts',
    'src/defaults/team-members.ts',
    'src/defaults/landing-page.ts'
  ],
  format: ['cjs', 'esm'],
  dts: true,
  clean: true,
  external: ['@saas/shared-types'],
});
