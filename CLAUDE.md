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
 * Reads the contents of a file as a UTF-8 encoded string.
 *
 * Reads the entire file at the specified path and returns its contents
 * as a UTF-8 decoded string. The path can be relative or absolute.
 *
 * This is a platform function for the East language, enabling file system
 * operations in East programs running on Node.js.
 *
 * @param path - The file path (relative or absolute)
 * @returns The file contents as a UTF-8 string
 *
 * @throws {EastError} When file does not exist (ENOENT), permission denied (EACCES), or path is a directory (EISDIR)
 *
 * @example
 * ```ts
 * import { East, StringType, NullType } from "@elaraai/east";
 * import { FileSystem } from "@elaraai/east-node";
 *
 * const processFile = East.function([StringType], NullType, ($, path) => {
 *     const content = $.let(FileSystem.readFile(path));
 *     $(Console.log(content));
 * });
 *
 * const compiled = East.compile(processFile.toIR(), FileSystem.Implementation);
 * compiled("data.txt");  // Reads and logs the contents of data.txt
 * ```
 *
 * @remarks
 * - Reads the entire file into memory - not suitable for very large files
 * - Assumes UTF-8 encoding - use readFileBytes() for binary data
 * - Follows symbolic links
 * - Blocks until the read operation completes
 */
export const fs_read_file: PlatformFunctionDef<
    [typeof StringType],
    typeof StringType
> = East.platform("fs_read_file", [StringType], StringType);
```

**Key principles for platform function documentation:**

1. **Purpose First**: Start with what the function does and why it exists
2. **East Context**: Explain how it fits into East programs (not just the Node.js implementation)
3. **Type Information**: The type signature is already in the code, focus on *behavior*
4. **Examples**: Show real East code using the fluent API (not implementation code)
5. **Error Cases**: Document all error conditions with specific messages users will see
6. **Platform Notes**: Call out Node.js-specific behavior or limitations

### Grouped Export Objects

Grouped exports (like `export const Crypto = { ... }`) provide organized namespaces for related platform functions.
Each property in the exported object must have complete TypeDoc documentation.

**Pattern**:

```typescript
/**
 * Grouped cryptographic platform functions.
 *
 * Provides cryptographic operations for East programs.
 *
 * @example
 * ```ts
 * import { East, StringType } from "@elaraai/east";
 * import { Crypto } from "@elaraai/east-node";
 *
 * const generateId = East.function([], StringType, $ => {
 *     return Crypto.uuid();
 * });
 *
 * // Use East.compile() for synchronous implementations
 * const compiled = East.compile(generateId.toIR(), Crypto.Implementation);
 * compiled();  // "550e8400-e29b-41d4-a716-446655440000"
 * ```
 *
 * @example
 * ```ts
 * // For async implementations (like Fetch), use East.compileAsync()
 * import { Fetch } from "@elaraai/east-node";
 *
 * const fetchData = East.function([StringType], StringType, ($, url) => {
 *     return Fetch.get(url);
 * });
 *
 * const compiled = East.compileAsync(fetchData.toIR(), Fetch.Implementation);
 * await compiled("https://api.example.com/data");
 * ```
 */
export const Crypto = {
    /**
     * Generates a random UUID v4.
     *
     * Creates a version 4 UUID using cryptographically secure random numbers.
     * Returns a 36-character string in standard format.
     *
     * @returns A UUID v4 string in standard format (8-4-4-4-12 hex digits)
     *
     * @example
     * ```ts
     * const createRecord = East.function([], StringType, $ => {
     *     return Crypto.uuid();
     * });
     *
     * const compiled = East.compile(createRecord.toIR(), Crypto.Implementation);
     * compiled();  // "550e8400-e29b-41d4-a716-446655440000"
     * ```
     */
    uuid: crypto_uuid,

    /**
     * Computes SHA-256 hash of a string.
     *
     * Calculates the SHA-256 cryptographic hash of a UTF-8 encoded string and returns
     * the result as a lowercase hexadecimal string (64 characters).
     *
     * @param data - The string to hash (will be UTF-8 encoded)
     * @returns The SHA-256 hash as a lowercase hexadecimal string (64 characters)
     *
     * @example
     * ```ts
     * const hashPassword = East.function([StringType], StringType, ($, password) => {
     *     return Crypto.hashSha256(password);
     * });
     *
     * const compiled = East.compile(hashPassword.toIR(), Crypto.Implementation);
     * compiled("secret");  // "2bb80d537b1da3e38bd30361aa855686bde0eacd7162fef6a25fe97bf527a25b"
     * ```
     */
    hashSha256: crypto_hash_sha256,

    /**
     * Node.js implementation of cryptographic platform functions.
     *
     * Pass this to {@link East.compile} to enable crypto operations.
     */
    Implementation: CryptoImpl,
} as const;

// Also export the implementation separately for backwards compatibility
export { CryptoImpl };
```

**Rules for export object properties:**

1. **Full description** - Start with a summary sentence, then add detailed explanation
2. **Parameter documentation** - Document all parameters with `@param`, include constraints
3. **Return documentation** - Use `@returns` to describe what's returned
4. **Throws documentation** - Use `@throws {EastError}` if applicable
5. **Complete example** - Show `East.function()` → `East.compile()` or `East.compileAsync()` with platform implementation → execution
6. **Include platform impl** - Show compilation using `ModuleName.Implementation` (e.g., `Crypto.Implementation`)
7. **Nest implementation** - Include `Implementation` property in the export object for single-import convenience
8. **Async vs Sync** - Use `East.compileAsync()` if ANY function in the Implementation uses `implementAsync`, otherwise use `East.compile()`

### General Rules

- Write in present tense ("Parses CSV data" not "Will parse CSV data")
- Be concise but complete - avoid redundant information
- Use proper markdown formatting for code references: `Type`, `null`, etc.
- Use `{@link SymbolName}` to create links to other documented types, functions, or classes
- Include `@internal` for implementation details not part of public API
