# East Node IO

> I/O platform functions for the East language on Node.js

[![License](https://img.shields.io/badge/license-AGPL--3.0-blue.svg)](LICENSE.md)
[![Node Version](https://img.shields.io/badge/node-%3E%3D22.0.0-brightgreen.svg)](https://nodejs.org)

East Node IO provides type-safe I/O platform functions for [East](https://github.com/elaraai/east) programs running on Node.js, enabling database operations, cloud storage, file transfer, NoSQL operations, file format processing, and compression.

## Features

- **SQL Databases**: SQLite, PostgreSQL, MySQL with connection pooling
- **Cloud Storage**: S3 and S3-compatible object storage (MinIO, etc.)
- **File Transfer**: FTP and SFTP for legacy system integration
- **NoSQL**: Redis caching and MongoDB document storage
- **File Formats**: XLSX (Excel), CSV, and XML parsing and serialization
- **Compression**: Gzip, Zip, and Tar compression and decompression
- **Type Safety**: Full East type system integration
- **Async I/O**: All operations use `implementAsync` for non-blocking I/O

## Installation

```bash
npm install @elaraai/east-node-io
```

## Quick Start

### SQL Database Query

```typescript
import { East, StringType, IntegerType, NullType } from "@elaraai/east";
import { SQL } from "@elaraai/east-node-io";

const getUserById = East.function([IntegerType], NullType, ($, userId) => {
    const config = $.let({
        host: "localhost",
        port: 5432n,
        database: "myapp",
        user: "postgres",
        password: "secret",
        ssl: East.variant('none', null),
        maxConnections: East.variant('none', null),
    });

    const conn = $.let(SQL.Postgres.connect(config));
    $(SQL.Postgres.query(
        conn,
        "SELECT name FROM users WHERE id = $1",
        [East.variant("Integer", userId)]
    ));
    $(SQL.Postgres.close(conn));

    return $.return(null);
});

const compiled = East.compileAsync(getUserById.toIR(), SQL.Postgres.Implementation);
await compiled(42n);
```

### S3 File Upload/Download

```typescript
import { Storage } from "@elaraai/east-node-io";
import { East, StringType, BlobType } from "@elaraai/east";

const uploadFile = East.function([StringType, BlobType], StringType, ($, filename, data) => {
    const config = $.let({
        region: "us-east-1",
        bucket: "my-bucket",
        accessKeyId: East.variant('none', null),
        secretAccessKey: East.variant('none', null),
        endpoint: East.variant('none', null),
    });

    $(Storage.S3.putObject(config, filename, data));
    return Storage.S3.presignUrl(config, filename, 3600n);
});

const compiled = East.compileAsync(uploadFile.toIR(), Storage.S3.Implementation);
const url = await compiled("report.pdf", pdfBlob);
```

### Redis Caching

```typescript
import { East, StringType, OptionType } from "@elaraai/east";
import { NoSQL } from "@elaraai/east-node-io";

const cacheGet = East.function([StringType], OptionType(StringType), ($, key) => {
    const config = $.let({
        host: "localhost",
        port: 6379n,
        password: East.variant('none', null),
        db: East.variant('none', null),
        keyPrefix: East.variant('none', null),
    });

    const conn = $.let(NoSQL.Redis.connect(config));
    const value = $.let(NoSQL.Redis.get(conn, key));
    $(NoSQL.Redis.close(conn));

    return $.return(value);
});

const compiled = East.compileAsync(cacheGet.toIR(), NoSQL.Redis.Implementation);
const cached = await compiled("user:42");  // some("...") or none
```

### File Format Processing

```typescript
import { Format } from "@elaraai/east-node-io";
import { East, BlobType, IntegerType } from "@elaraai/east";

// Read Excel files
const countRows = East.function([BlobType], IntegerType, ($, xlsxBlob) => {
    const options = $.let({
        sheetName: East.variant('none', null),
    });

    const sheet = $.let(Format.XLSX.read(xlsxBlob, options));
    return $.return(sheet.size());
});

const compiled = East.compile(countRows.toIR(), Format.XLSX.Implementation);
const rowCount = compiled(xlsxBlob);  // 100n
```

## Platform Functions

### SQL

- **SQLite**: `connect`, `query`, `close`
- **PostgreSQL**: `connect`, `query`, `close`
- **MySQL**: `connect`, `query`, `close`

### Storage

- **S3**: `putObject`, `getObject`, `deleteObject`, `listObjects`, `presignUrl`

### Transfer

- **FTP**: `connect`, `put`, `get`, `list`, `delete`, `close`
- **SFTP**: `connect`, `put`, `get`, `list`, `delete`, `close`

### NoSQL

- **Redis**: `connect`, `get`, `set`, `setex`, `del`, `close`
- **MongoDB**: `connect`, `insertOne`, `findOne`, `find`, `updateOne`, `deleteOne`, `close`

### Format

- **XLSX**: `read`, `write`, `info` - Excel spreadsheet processing
- **CSV**: `parse`, `serialize` - Comma-separated values with header support
- **XML**: `parse`, `serialize` - XML document tree processing

### Compression

- **Gzip**: `compress`, `decompress` - Gzip compression (RFC 1952)
- **Zip**: `compress`, `decompress` - ZIP archive creation and extraction
- **Tar**: `create`, `extract` - TAR archive creation and extraction

## Development

```bash
# Install dependencies
npm install

# Build TypeScript
npm run build

# Run tests (requires Docker)
npm run test:integration

# Start Docker services for development
npm run dev:services

# Stop Docker services
npm run dev:services:down

# Lint code
npm run lint
```

## Testing

Integration tests require Docker for running real databases and services:

```bash
# Start all services (PostgreSQL, MySQL, MongoDB, Redis, MinIO, FTP, SFTP)
npm run dev:services

# Run full integration test suite
npm run test:integration

# Stop all services
npm run dev:services:down
```

## Documentation

- [Usage Guide](USAGE.md)
- [Development Standards](STANDARDS.md)
- [Contributing Guidelines](CONTRIBUTING.md)
- [License](LICENSE.md)

## License

Copyright (c) 2025 Elara AI Pty Ltd

This project is licensed under the GNU Affero General Public License v3.0 - see the [LICENSE.md](LICENSE.md) file for details.

## Dependencies

- **SQL**: `better-sqlite3`, `pg`, `mysql2`
- **Storage**: `@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner`
- **Transfer**: `basic-ftp`, `ssh2-sftp-client`
- **NoSQL**: `ioredis`, `mongodb`
- **Format**: `xlsx` for Excel file processing
