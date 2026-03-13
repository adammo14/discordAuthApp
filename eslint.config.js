import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

const tabIndent = {
	'indent': ['error', 'tab'],
	'no-tabs': 'off',
}

export default defineConfig([
	globalIgnores(['dist']),
	// Node.js backend
	{
		files: ['server/**/*.js'],
		extends: [js.configs.recommended],
		languageOptions: {
			ecmaVersion: 2022,
			globals: globals.node,
			sourceType: 'module',
		},
		rules: {
			...tabIndent,
		},
	},
	// React frontend
	{
		files: ['src/**/*.{js,jsx}'],
		extends: [
			js.configs.recommended,
			reactHooks.configs.flat.recommended,
			reactRefresh.configs.vite,
		],
		languageOptions: {
			ecmaVersion: 2020,
			globals: globals.browser,
			parserOptions: {
				ecmaVersion: 'latest',
				ecmaFeatures: { jsx: true },
				sourceType: 'module',
			},
		},
		rules: {
			'no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z_]' }],
			...tabIndent,
		},
	},
])
