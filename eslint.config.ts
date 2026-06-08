import { defineConfig } from 'eslint/config';
import { createBaseConfig } from '@wattry/tsconfig/eslint';

const files = ['**/*.ts'];
const ignores = ['dist/**/*', 'node_modules/**/*'];

/**
 * You can override the base config like so
 * const customConfig = <your custom config>;
 * export default defineConfig(
 *   [createBaseConfig(import.meta, { files, ignores }), customConfig]
 * );
 */

export default defineConfig(
  createBaseConfig(import.meta, { files, ignores })
);
