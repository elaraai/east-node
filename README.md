# East Node Monorepo

> Node.js platform integration for the East language

[![License](https://img.shields.io/badge/license-AGPL--3.0-blue.svg)](LICENSE.md)
[![Node Version](https://img.shields.io/badge/node-%3E%3D22.0.0-brightgreen.svg)](https://nodejs.org)

This monorepo contains Node.js platform packages for the [East language](https://github.com/elaraai/East).

## Packages

| Package | Description |
|---------|-------------|
| [@elaraai/east-node](./packages/east-node) | Core Node.js platform functions (filesystem, console, fetch, crypto, etc.) |
| [@elaraai/east-node-io](./packages/east-node-io) | I/O platform functions (SQL, database connectors, etc.) |

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

---

*Developed by [Elara AI Pty Ltd](https://elaraai.com/) - Powering the computational layer of AI-driven business optimization.*
