import js from '@eslint/js';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist', 'node_modules', 'out'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
      // 核心要求：限制文件行数
      'max-lines': [
        'warn', 
        { 
          max: 400, 
          skipBlankLines: true, // 忽略空行
          skipComments: true    // 忽略注释
        }
      ],      
      // 可以在这里添加其他你喜欢的规则
      '@typescript-eslint/no-explicit-any': 'warn', // 尽量少用 any
    },
  }
);
