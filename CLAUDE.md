# East Node

East Node provides Node.js platform integration for the East language.

## Purpose

East Node enables East programs to run in Node.js environments by providing:

- **Platform Functions**: Node.js implementations of East platform functions
- **Runtime Support**: Utilities for executing compiled East IR in Node.js
- **Testing Infrastructure**: Test runners and assertion libraries for East programs
- **I/O Operations**: File system, network, and process interaction capabilities

## Structure

East Node is a TypeScript package that depends on the East language package.

- `/src` - source code for Node.js platform integration
- `/test` - test suite
- `/examples` - example usage

## Development

When making changes to the East Node codebase always run:

- `npm run build` - compile TypeScript to JavaScript
- `npm run test` - run the test suite (runs the compiled .js - requires build first)
- `npm run lint` - check code quality with ESLint (must pass before committing)

ESLint is configured to be compiler-friendly: `any` types are allowed due to type erasure needs and TypeScript's recursive type limitations.
Avoid `any` as much as possible.

## Documentation Standards

All public APIs must include TypeDoc comments. Follow these rules:

### Functions

- Start with a verb describing what the function does
- Document type parameters with `@typeParam Name - description` for generics
- Document all parameters with `@param name - description` (omit types, TypeScript infers them)
- Document return value with `@returns description` (omit type, TypeScript infers it)
- Use `@throws {ErrorType}` for documented error conditions
- Include `@example` for complex functions

```typescript
/**
 * Executes an East function in the Node.js runtime.
 *
 * @param fn - The compiled East function to execute
 * @param args - Arguments to pass to the function
 * @returns The result of executing the function
 *
 * @example
 * ```ts
 * const result = execute(compiledFn, [arg1, arg2]);
 * ```
 */
export function execute(fn: Function, args: any[]): any {
  return fn(...args);
}
```

### Platform Functions

Platform functions are East functions that are implemented by the runtime (in this case, Node.js). They bridge East code to native capabilities like I/O, crypto, networking, etc.

All **exported** platform function definitions must include comprehensive TypeDoc comments:

- Start with a clear description of what the platform function does
- Explain the purpose and use case in the East ecosystem
- Document the behavior in the Node.js runtime context
- Document all parameters with `@param name - description`
- Use `@returns` to describe the return value
- Include `@throws` for error conditions with specific error messages
- Add `@example` showing typical usage in East code (using the fluent API)
- Use `@remarks` for important implementation notes or platform-specific behavior

```typescript
/**
 * Parses CSV data from a binary blob into structured row data.
 *
 * Converts CSV-formatted binary data into an array of row dictionaries,
 * where each dictionary maps column names to optional string values.
 * Supports configurable delimiters, quote characters, and header handling.
 *
 * This is a platform function for the East language, enabling CSV parsing
 * in East programs running on Node.js.
 *
 * @param blob - The CSV data as a binary blob (UTF-8 encoded)
 * @param config - Parsing configuration (delimiter, quote chars, header options)
 * @returns An array of row dictionaries, each mapping column names to optional values
 *
 * @throws {EastError} When CSV is malformed (unclosed quotes, mismatched columns, invalid config)
 *
 * @example
 * ```ts
 * import { csv_parse } from "@elaraai/east-node";
 *
 * const csvData = East.value("name,age\nAlice,30\nBob,25");
 * const blob = csvData.encodeUtf8();
 * const config = East.value({
 *   delimiter: variant('some', ','),
 *   hasHeader: true,
 *   skipEmptyLines: true,
 *   trimFields: false,
 * });
 *
 * const rows = csv_parse(blob, config);
 * // Returns: [
 * //   {"name": some("Alice"), "age": some("30")},
 * //   {"name": some("Bob"), "age": some("25")}
 * // ]
 * ```
 *
 * @remarks
 * - Handles quoted fields with embedded delimiters and newlines
 * - Supports both quote-as-escape ("") and backslash-escape (\") modes
 * - Auto-detects newline format (CRLF, LF, or CR) when not specified
 * - Validates column counts when hasHeader is true
 */
export const csv_parse: PlatformFunctionDef<
    [typeof BlobType, typeof CsvParseConfig],
    typeof CsvDataType
> = East.platform("csv_parse", [BlobType, CsvParseConfig], CsvDataType);
```

**Key principles for platform function documentation:**

1. **Purpose First**: Start with what the function does and why it exists
2. **East Context**: Explain how it fits into East programs (not just the Node.js implementation)
3. **Type Information**: The type signature is already in the code, focus on *behavior*
4. **Examples**: Show real East code using the fluent API (not implementation code)
5. **Error Cases**: Document all error conditions with specific messages users will see
6. **Platform Notes**: Call out Node.js-specific behavior or limitations

### General Rules

- Write in present tense ("Parses CSV data" not "Will parse CSV data")
- Be concise but complete - avoid redundant information
- Use proper markdown formatting for code references: `Type`, `null`, etc.
- Use `{@link SymbolName}` to create links to other documented types, functions, or classes
- Include `@internal` for implementation details not part of public API
