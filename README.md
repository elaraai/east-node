# East Node

> Node.js platform integration for the East language

[![License](https://img.shields.io/badge/license-AGPL--3.0-blue.svg)](LICENSE.md)
[![Node Version](https://img.shields.io/badge/node-%3E%3D22.0.0-brightgreen.svg)](https://nodejs.org)

**East Node** provides Node.js platform functions for the [East language](https://github.com/elaraai/East). It enables East programs to interact with the filesystem, network, databases, and other I/O operations in Node.js environments.

## Packages

| Package | Description | npm |
|---------|-------------|-----|
| [@elaraai/east-node-std](./packages/east-node-std) | Core platform functions (filesystem, console, fetch, crypto, etc.) | [![npm](https://img.shields.io/npm/v/@elaraai/east-node-std)](https://www.npmjs.com/package/@elaraai/east-node-std) |
| [@elaraai/east-node-io](./packages/east-node-io) | I/O platform functions (SQL, NoSQL, S3, FTP, etc.) | [![npm](https://img.shields.io/npm/v/@elaraai/east-node-io)](https://www.npmjs.com/package/@elaraai/east-node-io) |

## Features

**east-node-std:**
- **FileSystem** - Read/write files, manage directories
- **Console** - stdout/stderr output, stdin input
- **Fetch** - HTTP requests with modern Fetch API
- **Crypto** - Random bytes, SHA-256, UUID generation
- **Random** - 14 statistical distributions (uniform, normal, poisson, etc.)
- **Time** - Timestamps and sleep
- **Path** - Cross-platform path manipulation
- **Test** - Built-in testing utilities

**east-node-io:**
- **SQL** - SQLite, PostgreSQL, MySQL
- **NoSQL** - MongoDB, Redis
- **Storage** - S3 and S3-compatible object storage
- **Transfer** - FTP and SFTP file transfers
- **Formats** - CSV, XML, XLSX parsing

## Quick Start

```bash
npm install @elaraai/east-node-std @elaraai/east
```

```typescript
import { East } from "@elaraai/east";
import { Console, FileSystem, NodePlatform } from "@elaraai/east-node-std";

const MyProgram = East.function([], NullType, ($) => {
    // Write to console
    $(Console.log("Hello from East!"));

    // Read a file
    const content = $.let(FileSystem.readFile("./data.txt"));
    $(Console.log(content));
});

// Execute the program
await NodePlatform(MyProgram, []);
```

## Development

```bash
npm install        # Install all workspace dependencies
npm run build      # Build all packages
npm run test       # Run tests for all packages
npm run lint       # Lint all packages
```

## License

Dual-licensed:
- **Open Source**: [AGPL-3.0](LICENSE.md) - Free for open source use
- **Commercial**: Available for proprietary use - contact support@elara.ai

## Links

- **Website**: [https://elaraai.com/](https://elaraai.com/)
- **East Repository**: [https://github.com/elaraai/East](https://github.com/elaraai/East)
- **Issues**: [https://github.com/elaraai/east-node/issues](https://github.com/elaraai/east-node/issues)
- **Email**: support@elara.ai

---

*Developed by [Elara AI Pty Ltd](https://elaraai.com/) - Powering the computational layer of AI-driven business optimization.*
