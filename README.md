# TypeScript Project Template

A modern TypeScript project template with comprehensive development tooling and best practices for building robust applications.

## Features

### Development Tooling

- **TypeScript** - Latest TypeScript configuration with strict settings
- **ESLint** - Code linting with TypeScript support and recommended rules
- **Prettier** - Code formatting with import organization
- **Husky** - Git hooks for pre-commit checks
- **lint-staged** - Run linters on staged files only
- **Commitlint** - Conventional commit message validation

### Project Structure

```
ts-template/
├── src/
│   └── example.ts          # Example TypeScript file
├── eslint.config.ts        # ESLint configuration
├── tsconfig.json          # TypeScript configuration
├── package.json           # Project dependencies and scripts
└── README.md              # Project documentation
```

### Configuration Highlights

#### TypeScript (`tsconfig.json`)

- **ES2022 target** with CommonJS modules
- **Strict type checking** enabled
- **Source maps** and declaration files
- **Unused locals** detection
- **Node.js** environment support

#### ESLint (`eslint.config.ts`)

- **Flat config** format (ESLint 9+)
- **TypeScript** integration
- **Recommended** rules for JavaScript and TypeScript
- **Browser globals** support

#### Prettier

- **Tab indentation** (4 spaces)
- **Double quotes** for strings
- **Trailing commas** everywhere
- **120 character** line width
- **Import organization** plugin

## Getting Started

1. **Clone the template**

    ```bash
    git clone <repository-url> my-project
    cd my-project
    ```

2. **Install dependencies**

    ```bash
    yarn install
    # or
    npm install
    ```

3. **Start developing**

    ```bash
    # Type checking
    yarn check-types

    # Linting
    yarn lint

    # Formatting
    yarn format
    ```

## Available Scripts

- `yarn check-types` - Run TypeScript compiler without emitting files
- `yarn lint` - Run ESLint on all files
- `yarn format` - Format code with Prettier
- `yarn test` - Placeholder for test framework (not implemented)

## Git Hooks

The template includes pre-commit hooks that automatically:

- **Lint** staged JavaScript/TypeScript files
- **Format** staged files with Prettier
- **Validate** commit messages follow conventional format

## Customization

### Adding Dependencies

```bash
# Runtime dependencies
yarn add <package-name>

# Development dependencies
yarn add -D <package-name>
```

### Extending ESLint Rules

Edit `eslint.config.ts` to add custom rules or plugins:

```typescript
export default defineConfig([
	// ... existing config
	{
		rules: {
			// Add custom rules here
		},
	},
])
```

### TypeScript Configuration

Modify `tsconfig.json` to adjust compiler options:

```json
{
	"compilerOptions": {
		"target": "es2022",
		"module": "commonjs"
		// ... other options
	}
}
```

## Best Practices

This template enforces several best practices:

- **Conventional Commits** - Standardized commit message format
- **Code Quality** - Automated linting and formatting
- **Type Safety** - Strict TypeScript configuration
- **Import Organization** - Automatic import sorting
- **Git Hooks** - Pre-commit validation

## License

MIT License - feel free to use this template for your projects.
