import js from "@eslint/js"
import { defineConfig } from "eslint/config"
import globals from "globals"
import tseslint from "typescript-eslint"

export default defineConfig([
	{
		files: ["src/**/*.{js,mjs,cjs,ts,mts,cts}"],
		plugins: { js },
		extends: ["js/recommended"],
		languageOptions: {
			globals: {
				...globals.browser,
				...globals.node,
			},
		},
	},
	{
		...tseslint.configs.recommended[0],
		files: ["src/**/*.{js,mjs,cjs,ts,mts,cts}"],
		rules: {
			"no-unused-vars": "off",
			"@typescript-eslint/no-unused-vars": "off",
		},
	},
	{
		ignores: ["dist/**/*", "node_modules/**/*"],
	},
])
