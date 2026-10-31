// A light lint: it catches the mistakes that break the app (undefined or unused names, bad Vue templates) and leaves
// style alone, the code here is written by hand and has its own voice.
import js from '@eslint/js';
import vue from 'eslint-plugin-vue';
import globals from 'globals';

export default [
    { ignores: ['dist/**', 'public/**', 'node_modules/**', 'art/**', '.claude/**'] },
    js.configs.recommended,
    ...vue.configs['flat/essential'],
    {
        files: ['src/**/*.{js,vue}'],
        languageOptions: { globals: { ...globals.browser } },
    },
    {
        files: ['scripts/**', 'vite.config.js', 'eslint.config.js'],
        languageOptions: { globals: { ...globals.node } },
    },
    {
        rules: {
            'no-unused-vars': ['warn', { args: 'none', caughtErrors: 'none' }],   // old code has leftovers: a warning, not a blocker
            'vue/multi-word-component-names': 'off',
        },
    },
];
