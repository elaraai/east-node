# East Node

> Node platform functions for the East language

[![License](https://img.shields.io/badge/license-AGPL--3.0-blue.svg)](LICENSE.md)
[![Node Version](https://img.shields.io/badge/node-%3E%3D22.0.0-brightgreen.svg)](https://nodejs.org)

**East Node** provides Node.js platform integration for the [East language](https://github.com/elaraai/East). It enables East programs to interact with the Node.js runtime through platform functions for file system operations, console I/O, HTTP requests, cryptography, and more.

## Features

- **📁 File System** - Read/write files, manage directories
- **🖥️ Console I/O** - stdout/stderr output, stdin input
- **🌐 HTTP Client** - Modern Fetch API for HTTP requests
- **🔐 Cryptography** - Random bytes, SHA-256, UUID generation
- **🎲 Random** - Random number generation with 14 statistical distributions
- **⏱️ Time Operations** - Timestamps and sleep
- **🛤️ Path Utilities** - Cross-platform path manipulation
- **🧪 Test Framework** - Built-in testing utilities
- **🛡️ Type-Safe** - Full TypeScript support with EastError handling

## Installation

```bash
npm install @elaraai/east-node-std @elaraai/east
```

## Quick Start

```typescript
import { East, NullType, StringType } from "@elaraai/east";
import { NodePlatform, Console, FileSystem } from "@elaraai/east-node-std";

// Define an East function using platform functions
const processFile = East.function(
    [StringType],  // Input: file path
    NullType,      // Output: null
    ($, inputPath) => {
        const content = $.let(FileSystem.readFile(inputPath));
        $(Console.log(content));
        $(FileSystem.writeFile("output.txt", content));
    }
);

// Compile with Node.js platform and execute
const compiled = East.compile(processFile.toIR(), NodePlatform);
compiled("/path/to/input.txt");
```

## Platform Functions

East Node provides seven platform modules:

| Module | Functions | Description |
|--------|-----------|-------------|
| **Console** | `log`, `error`, `write` | Console I/O operations |
| **FileSystem** | `readFile`, `writeFile`, `exists`, `createDirectory`, etc. | File system operations (11 functions) |
| **Fetch** | `get`, `post`, `request` | HTTP client using Fetch API |
| **Crypto** | `randomBytes`, `hashSha256`, `uuid` | Cryptographic operations |
| **Time** | `now`, `sleep` | Time and delay operations |
| **Path** | `join`, `resolve`, `dirname`, `basename`, `extname` | Path manipulation |
| **Random** | `uniform`, `normal`, `range`, `exponential`, `bernoulli`, etc. | Random number generation with 14 distributions |

**Complete platform:**
```typescript
import { NodePlatform } from "@elaraai/east-node-std";
const compiled = East.compile(myFunction.toIR(), NodePlatform);
```

**Individual modules:**
```typescript
import { Console, FileSystem } from "@elaraai/east-node-std";
const compiled = East.compile(myFunction.toIR(), [...Console.Implementation, ...FileSystem.Implementation]);
```

## Documentation

- **[USAGE.md](USAGE.md)** - Comprehensive guide with examples for all platform functions
- **[East Documentation](https://github.com/elaraai/East)** - Core East language documentation

## Testing

East Node includes a test framework for East code:

```typescript
import { describeEast, Test } from "@elaraai/east-node-std";
import { East } from "@elaraai/east";

await describeEast("Math operations", (test) => {
    test("addition works", $ => {
        const result = $.let(East.value(1n).add(2n));
        $(Test.equal(result, 3n));
    });
});
```

Run tests:
```bash
npm test          # Run all tests
make test         # Alternative via Makefile
```

## Development

```bash
npm run build     # Compile TypeScript
npm run test      # Run test suite (requires build)
npm run lint      # Check code quality
```

## Security

Platform functions are intentionally limited for sandbox security:

- ❌ No process access (exit, environment variables, command-line arguments)
- ❌ No arbitrary command execution
- ✅ Controlled I/O operations only
- ✅ All operations are type-checked

## License

Dual-licensed:
- **Open Source**: [AGPL-3.0](LICENSE.md) - Free for open source use
- **Commercial**: Available for proprietary use - contact support@elara.ai

## Links

- **Website**: [https://elaraai.com/](https://elaraai.com/)
- **East Repository**: [https://github.com/elaraai/East](https://github.com/elaraai/East)
- **Issues**: [https://github.com/elaraai/east-node/issues](https://github.com/elaraai/east-node/issues)
- **Email**: support@elara.ai

### Related Repositories

- **[east](https://github.com/elaraai/east)** - The East programming language
- **[east-py](https://github.com/elaraai/east-py)** - Python integration and data science platform functions
- **[e3](https://github.com/elaraai/e3)** - TypeScript SDK for authoring Elara solutions

## About Elara

East Node is developed by [Elara AI Pty Ltd](https://elaraai.com/), an AI-powered platform that creates economic digital twins of businesses that optimize performance. Elara combines business objectives, decisions and data to help organizations make data-driven decisions across work management, purchasing, customer engagement, and investment planning. East powers the computational layer of Elara solutions, enabling the expression of complex business logic and data in a simple, type-safe and portable language.

---
