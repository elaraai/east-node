# East Node CLI

> Command-line interface for running East IR programs with Node.js

[![License](https://img.shields.io/badge/license-AGPL--3.0-blue.svg)](LICENSE.md)
[![Node Version](https://img.shields.io/badge/node-%3E%3D22.0.0-brightgreen.svg)](https://nodejs.org)

**East Node CLI** provides a command-line interface for executing compiled [East](https://github.com/elaraai/East) IR programs using Node.js platform implementations.

## Installation

```bash
# Install the CLI
npm install -g @elaraai/east-node-cli

# Install platform packages (required)
npm install @elaraai/east-node-std
npm install @elaraai/east-node-io  # if using I/O functions
```

## Usage

### Running Programs

```bash
# Run with standard platform
east-node run ./program.beast2 -p @elaraai/east-node-std

# Run with multiple platforms
east-node run ./db-query.beast2 \
    -p @elaraai/east-node-std \
    -p @elaraai/east-node-io

# Run with input files
east-node run ./transform.beast2 \
    -p @elaraai/east-node-std \
    -i input.json \
    -i config.east

# Run with output file
east-node run ./process.beast2 \
    -p @elaraai/east-node-std \
    -i input.beast2 \
    -o result.json

# Verbose mode
east-node run ./program.beast2 -p @elaraai/east-node-std -v
```

### Version Information

```bash
# Show CLI version
east-node version

# Show CLI and platform versions
east-node version -p @elaraai/east-node-std -p @elaraai/east-node-io
```

## CLI Reference

### `east-node run`

Execute an East IR program.

```
east-node run <ir_file> [options]

Arguments:
  ir_file                    Path to IR file (.beast2, .beast, .east, or .json)

Options:
  -p, --package <package>    Platform package to load (can be repeated)
  -i, --input <file>         Input data file (can be repeated)
  -o, --output <file>        Output file path for result
  -v, --verbose              Enable verbose output
  -h, --help                 Display help
```

### `east-node version`

Show version information.

```
east-node version [options]

Options:
  -p, --package <package>    Platform package to check (can be repeated)
```

## Supported File Formats

| Extension | Format |
|-----------|--------|
| `.beast2`, `.beast` | Binary East format |
| `.east` | Text East format |
| `.json` | JSON format |

## Platform Packages

Platform packages provide the runtime implementations for East platform functions:

- **[@elaraai/east-node-std](https://www.npmjs.com/package/@elaraai/east-node-std)** - Standard platform (console, filesystem, crypto, time, etc.)
- **[@elaraai/east-node-io](https://www.npmjs.com/package/@elaraai/east-node-io)** - I/O platform (SQL, S3, FTP, Redis, MongoDB, etc.)

## Creating Platform Packages

Any npm package can provide platform functions by following this convention:

1. Export a `./platform` subpath that default-exports `PlatformFunction[]`
2. Export `./package.json` for version discovery

See the [design document](../../docs/east-node-cli-design.md) for details.

## License

Dual-licensed:
- **Open Source**: [AGPL-3.0](LICENSE.md) - Free for open source use
- **Commercial**: Available for proprietary use - contact support@elara.ai

## Links

- **Website**: [https://elaraai.com/](https://elaraai.com/)
- **East Repository**: [https://github.com/elaraai/East](https://github.com/elaraai/East)
- **Issues**: [https://github.com/elaraai/East/issues](https://github.com/elaraai/East/issues)
- **Email**: support@elara.ai

---

*Developed by [Elara AI Pty Ltd](https://elaraai.com/) - Powering the computational layer of AI-driven business optimization.*
