# East Node IO - Design & Requirements Document

## Overview

**east-node-io** extends the East language ecosystem with platform functions for I/O operations, including databases, cloud storage, and file transfer protocols. This package follows the same patterns as **east-node** but focuses specifically on external data sources and persistence.

## Goals

1. **Database Access**: Provide East platform functions for SQL databases (SQLite, PostgreSQL, MySQL)
2. **Cloud Storage**: Enable S3 and compatible object storage operations
3. **File Transfer**: Support FTP/SFTP for legacy system integration
4. **NoSQL Support**: Include common NoSQL databases (Redis, MongoDB)
5. **Type Safety**: Maintain East's type safety guarantees across I/O boundaries
6. **Connection Management**: Handle connection pooling and lifecycle management
7. **Async Operations**: All I/O operations are asynchronous using `implementAsync`

## Architecture

### Module Structure

```
east-node-io/
├── src/
│   ├── index.ts              # Main exports
│   ├── sql/
│   │   ├── index.ts          # SQL module exports
│   │   ├── sqlite.ts         # SQLite implementation
│   │   ├── postgres.ts       # PostgreSQL implementation
│   │   ├── mysql.ts          # MySQL implementation
│   │   └── types.ts          # Shared SQL types
│   ├── storage/
│   │   ├── index.ts          # Storage module exports
│   │   ├── s3.ts             # S3 implementation
│   │   └── types.ts          # Storage types
│   ├── transfer/
│   │   ├── index.ts          # Transfer module exports
│   │   ├── ftp.ts            # FTP implementation
│   │   ├── sftp.ts           # SFTP implementation
│   │   └── types.ts          # Transfer types
│   ├── nosql/
│   │   ├── index.ts          # NoSQL module exports
│   │   ├── redis.ts          # Redis implementation
│   │   ├── mongodb.ts        # MongoDB implementation
│   │   └── types.ts          # NoSQL types
│   └── connection/
│       ├── index.ts          # Connection utilities
│       ├── pool.ts           # Connection pooling
│       └── config.ts         # Configuration types
├── test/
├── examples/
└── package.json
```

## Dependencies

### Core Dependencies

```json
{
  "dependencies": {
    "@elaraai/east": "^0.1.0",

    "@comment": "SQL Databases",
    "better-sqlite3": "^11.0.0",
    "pg": "^8.13.1",
    "mysql2": "^3.11.5",

    "@comment": "Cloud Storage",
    "@aws-sdk/client-s3": "^3.713.0",
    "@aws-sdk/s3-request-presigner": "^3.713.0",

    "@comment": "File Transfer",
    "basic-ftp": "^5.0.5",
    "ssh2-sftp-client": "^11.0.0",

    "@comment": "NoSQL",
    "ioredis": "^5.4.2",
    "mongodb": "^6.11.0"
  },
  "devDependencies": {
    "@types/better-sqlite3": "^7.6.12",
    "@types/pg": "^8.11.10",
    "typescript": "^5.0.0",
    "eslint": "^8.0.0",
    "@typescript-eslint/parser": "^7.0.0",
    "@typescript-eslint/eslint-plugin": "^7.0.0"
  },
  "peerDependencies": {
    "@elaraai/east": "^0.1.0"
  }
}
```

### NPM Package Links

| Package | NPM Link | Purpose |
|---------|----------|---------|
| **better-sqlite3** | https://www.npmjs.com/package/better-sqlite3 | Fastest SQLite3 binding for Node.js |
| **pg** | https://www.npmjs.com/package/pg | PostgreSQL client for Node.js |
| **mysql2** | https://www.npmjs.com/package/mysql2 | MySQL client with prepared statements |
| **@aws-sdk/client-s3** | https://www.npmjs.com/package/@aws-sdk/client-s3 | AWS SDK v3 S3 client |
| **@aws-sdk/s3-request-presigner** | https://www.npmjs.com/package/@aws-sdk/s3-request-presigner | S3 presigned URL generator |
| **basic-ftp** | https://www.npmjs.com/package/basic-ftp | Modern FTP client for Node.js |
| **ssh2-sftp-client** | https://www.npmjs.com/package/ssh2-sftp-client | SFTP client wrapper around ssh2 |
| **ioredis** | https://www.npmjs.com/package/ioredis | Redis client with clustering support |
| **mongodb** | https://www.npmjs.com/package/mongodb | Official MongoDB driver for Node.js |

## East Type Definitions

### SQL Types

```typescript
import {
    East,
    StructType,
    VariantType,
    OptionType,
    ArrayType,
    DictType,
    StringType,
    IntegerType,
    BooleanType,
    BlobType,
    NullType
} from "@elaraai/east";

// Connection configuration
export const SqliteConfigType = StructType({
    path: StringType,                      // Database file path
    readOnly: OptionType(BooleanType),     // Open in read-only mode
    memory: OptionType(BooleanType),       // Use in-memory database
});

export const PostgresConfigType = StructType({
    host: StringType,
    port: IntegerType,
    database: StringType,
    user: StringType,
    password: StringType,
    ssl: OptionType(BooleanType),
    maxConnections: OptionType(IntegerType),
});

export const MySqlConfigType = StructType({
    host: StringType,
    port: IntegerType,
    database: StringType,
    user: StringType,
    password: StringType,
    ssl: OptionType(BooleanType),
    maxConnections: OptionType(IntegerType),
});

// Query parameters (typed values for prepared statements)
export const SqlParameterType = VariantType({
    string: StringType,
    int: IntegerType,
    float: IntegerType,  // FloatType for floating point
    bool: BooleanType,
    null: NullType,
    blob: BlobType,
});

export const SqlParametersType = ArrayType(SqlParameterType);

// Query results (rows as dictionaries)
export const SqlRowType = DictType(StringType, SqlParameterType);
export const SqlResultType = StructType({
    rows: ArrayType(SqlRowType),
    rowsAffected: IntegerType,
    lastInsertId: OptionType(IntegerType),
});
```

### Storage Types (S3)

```typescript
export const S3ConfigType = StructType({
    region: StringType,
    bucket: StringType,
    accessKeyId: OptionType(StringType),
    secretAccessKey: OptionType(StringType),
    endpoint: OptionType(StringType),  // For S3-compatible services
});

export const S3ObjectMetadataType = StructType({
    key: StringType,
    size: IntegerType,
    lastModified: StringType,  // ISO 8601 timestamp
    contentType: OptionType(StringType),
    etag: OptionType(StringType),
});

export const S3ListResultType = StructType({
    objects: ArrayType(S3ObjectMetadataType),
    isTruncated: BooleanType,
    continuationToken: OptionType(StringType),
});
```

### Transfer Types (FTP/SFTP)

```typescript
export const FtpConfigType = StructType({
    host: StringType,
    port: IntegerType,
    user: StringType,
    password: StringType,
    secure: BooleanType,  // true for FTPS
});

export const SftpConfigType = StructType({
    host: StringType,
    port: IntegerType,
    username: StringType,
    password: OptionType(StringType),
    privateKey: OptionType(StringType),  // SSH private key
});

export const FileInfoType = StructType({
    name: StringType,
    path: StringType,
    size: IntegerType,
    isDirectory: BooleanType,
    modifiedTime: StringType,  // ISO 8601
});
```

### NoSQL Types

```typescript
import { RecursiveType } from "@elaraai/east";

// Redis
export const RedisConfigType = StructType({
    host: StringType,
    port: IntegerType,
    password: OptionType(StringType),
    db: OptionType(IntegerType),
    keyPrefix: OptionType(StringType),
});

// MongoDB
export const MongoConfigType = StructType({
    uri: StringType,  // Connection string
    database: StringType,
    collection: StringType,
});

// BSON-compatible value type (recursive)
export const BsonValueType: ReturnType<typeof RecursiveType> = RecursiveType(() =>
    VariantType({
        string: StringType,
        int: IntegerType,
        float: IntegerType,  // FloatType for actual floats
        bool: BooleanType,
        null: NullType,
        array: ArrayType(BsonValueType),
        object: DictType(StringType, BsonValueType),
    })
);
```

## Platform Function Definitions

All platform functions defined using `East.platform()` with proper type signatures:

### SQL Platform Functions

```typescript
import { East, StringType, IntegerType, NullType } from "@elaraai/east";
import type { PlatformFunctionDef } from "@elaraai/east/internal";

// Connection handle type (opaque string)
const ConnectionHandleType = StringType;

// SQLite
export const sqlite_connect: PlatformFunctionDef<
    [typeof SqliteConfigType],
    typeof ConnectionHandleType
> = East.platform("sqlite_connect", [SqliteConfigType], ConnectionHandleType);

export const sqlite_query: PlatformFunctionDef<
    [typeof ConnectionHandleType, typeof StringType, typeof SqlParametersType],
    typeof SqlResultType
> = East.platform("sqlite_query", [ConnectionHandleType, StringType, SqlParametersType], SqlResultType);

export const sqlite_close: PlatformFunctionDef<
    [typeof ConnectionHandleType],
    typeof NullType
> = East.platform("sqlite_close", [ConnectionHandleType], NullType);

// PostgreSQL
export const postgres_connect: PlatformFunctionDef<
    [typeof PostgresConfigType],
    typeof ConnectionHandleType
> = East.platform("postgres_connect", [PostgresConfigType], ConnectionHandleType);

export const postgres_query: PlatformFunctionDef<
    [typeof ConnectionHandleType, typeof StringType, typeof SqlParametersType],
    typeof SqlResultType
> = East.platform("postgres_query", [ConnectionHandleType, StringType, SqlParametersType], SqlResultType);

export const postgres_close: PlatformFunctionDef<
    [typeof ConnectionHandleType],
    typeof NullType
> = East.platform("postgres_close", [ConnectionHandleType], NullType);

// MySQL
export const mysql_connect: PlatformFunctionDef<
    [typeof MySqlConfigType],
    typeof ConnectionHandleType
> = East.platform("mysql_connect", [MySqlConfigType], ConnectionHandleType);

export const mysql_query: PlatformFunctionDef<
    [typeof ConnectionHandleType, typeof StringType, typeof SqlParametersType],
    typeof SqlResultType
> = East.platform("mysql_query", [ConnectionHandleType, StringType, SqlParametersType], SqlResultType);

export const mysql_close: PlatformFunctionDef<
    [typeof ConnectionHandleType],
    typeof NullType
> = East.platform("mysql_close", [ConnectionHandleType], NullType);
```

### Storage Platform Functions (S3)

```typescript
import { BlobType } from "@elaraai/east";

export const s3_put_object: PlatformFunctionDef<
    [typeof S3ConfigType, typeof StringType, typeof BlobType],
    typeof NullType
> = East.platform("s3_put_object", [S3ConfigType, StringType, BlobType], NullType);

export const s3_get_object: PlatformFunctionDef<
    [typeof S3ConfigType, typeof StringType],
    typeof BlobType
> = East.platform("s3_get_object", [S3ConfigType, StringType], BlobType);

export const s3_delete_object: PlatformFunctionDef<
    [typeof S3ConfigType, typeof StringType],
    typeof NullType
> = East.platform("s3_delete_object", [S3ConfigType, StringType], NullType);

export const s3_list_objects: PlatformFunctionDef<
    [typeof S3ConfigType, typeof StringType, typeof IntegerType],
    typeof S3ListResultType
> = East.platform("s3_list_objects", [S3ConfigType, StringType, IntegerType], S3ListResultType);

export const s3_presign_url: PlatformFunctionDef<
    [typeof S3ConfigType, typeof StringType, typeof IntegerType],
    typeof StringType
> = East.platform("s3_presign_url", [S3ConfigType, StringType, IntegerType], StringType);
```

### Transfer Platform Functions (FTP/SFTP)

```typescript
// FTP
export const ftp_connect: PlatformFunctionDef<
    [typeof FtpConfigType],
    typeof ConnectionHandleType
> = East.platform("ftp_connect", [FtpConfigType], ConnectionHandleType);

export const ftp_put: PlatformFunctionDef<
    [typeof ConnectionHandleType, typeof StringType, typeof BlobType],
    typeof NullType
> = East.platform("ftp_put", [ConnectionHandleType, StringType, BlobType], NullType);

export const ftp_get: PlatformFunctionDef<
    [typeof ConnectionHandleType, typeof StringType],
    typeof BlobType
> = East.platform("ftp_get", [ConnectionHandleType, StringType], BlobType);

export const ftp_list: PlatformFunctionDef<
    [typeof ConnectionHandleType, typeof StringType],
    typeof ArrayType<typeof FileInfoType>
> = East.platform("ftp_list", [ConnectionHandleType, StringType], ArrayType(FileInfoType));

export const ftp_delete: PlatformFunctionDef<
    [typeof ConnectionHandleType, typeof StringType],
    typeof NullType
> = East.platform("ftp_delete", [ConnectionHandleType, StringType], NullType);

export const ftp_close: PlatformFunctionDef<
    [typeof ConnectionHandleType],
    typeof NullType
> = East.platform("ftp_close", [ConnectionHandleType], NullType);

// SFTP
export const sftp_connect: PlatformFunctionDef<
    [typeof SftpConfigType],
    typeof ConnectionHandleType
> = East.platform("sftp_connect", [SftpConfigType], ConnectionHandleType);

export const sftp_put: PlatformFunctionDef<
    [typeof ConnectionHandleType, typeof StringType, typeof BlobType],
    typeof NullType
> = East.platform("sftp_put", [ConnectionHandleType, StringType, BlobType], NullType);

export const sftp_get: PlatformFunctionDef<
    [typeof ConnectionHandleType, typeof StringType],
    typeof BlobType
> = East.platform("sftp_get", [ConnectionHandleType, StringType], BlobType);

export const sftp_list: PlatformFunctionDef<
    [typeof ConnectionHandleType, typeof StringType],
    typeof ArrayType<typeof FileInfoType>
> = East.platform("sftp_list", [ConnectionHandleType, StringType], ArrayType(FileInfoType));

export const sftp_delete: PlatformFunctionDef<
    [typeof ConnectionHandleType, typeof StringType],
    typeof NullType
> = East.platform("sftp_delete", [ConnectionHandleType, StringType], NullType);

export const sftp_close: PlatformFunctionDef<
    [typeof ConnectionHandleType],
    typeof NullType
> = East.platform("sftp_close", [ConnectionHandleType], NullType);
```

### NoSQL Platform Functions

```typescript
// Redis
export const redis_connect: PlatformFunctionDef<
    [typeof RedisConfigType],
    typeof ConnectionHandleType
> = East.platform("redis_connect", [RedisConfigType], ConnectionHandleType);

export const redis_get: PlatformFunctionDef<
    [typeof ConnectionHandleType, typeof StringType],
    typeof OptionType<typeof StringType>
> = East.platform("redis_get", [ConnectionHandleType, StringType], OptionType(StringType));

export const redis_set: PlatformFunctionDef<
    [typeof ConnectionHandleType, typeof StringType, typeof StringType],
    typeof NullType
> = East.platform("redis_set", [ConnectionHandleType, StringType, StringType], NullType);

export const redis_setex: PlatformFunctionDef<
    [typeof ConnectionHandleType, typeof StringType, typeof StringType, typeof IntegerType],
    typeof NullType
> = East.platform("redis_setex", [ConnectionHandleType, StringType, StringType, IntegerType], NullType);

export const redis_del: PlatformFunctionDef<
    [typeof ConnectionHandleType, typeof StringType],
    typeof IntegerType
> = East.platform("redis_del", [ConnectionHandleType, StringType], IntegerType);

export const redis_close: PlatformFunctionDef<
    [typeof ConnectionHandleType],
    typeof NullType
> = East.platform("redis_close", [ConnectionHandleType], NullType);

// MongoDB
export const mongo_connect: PlatformFunctionDef<
    [typeof MongoConfigType],
    typeof ConnectionHandleType
> = East.platform("mongo_connect", [MongoConfigType], ConnectionHandleType);

export const mongo_insert_one: PlatformFunctionDef<
    [typeof ConnectionHandleType, typeof BsonValueType],
    typeof StringType  // Returns inserted document ID
> = East.platform("mongo_insert_one", [ConnectionHandleType, BsonValueType], StringType);

export const mongo_find_one: PlatformFunctionDef<
    [typeof ConnectionHandleType, typeof BsonValueType],
    typeof OptionType<typeof BsonValueType>
> = East.platform("mongo_find_one", [ConnectionHandleType, BsonValueType], OptionType(BsonValueType));

export const mongo_update_one: PlatformFunctionDef<
    [typeof ConnectionHandleType, typeof BsonValueType, typeof BsonValueType],
    typeof IntegerType  // Returns modified count
> = East.platform("mongo_update_one", [ConnectionHandleType, BsonValueType, BsonValueType], IntegerType);

export const mongo_delete_one: PlatformFunctionDef<
    [typeof ConnectionHandleType, typeof BsonValueType],
    typeof IntegerType  // Returns deleted count
> = East.platform("mongo_delete_one", [ConnectionHandleType, BsonValueType], IntegerType);

// MongoDB find (multiple results)
const MongoFindOptionsType = StructType({
    limit: OptionType(IntegerType),
    skip: OptionType(IntegerType),
});

export const mongo_find: PlatformFunctionDef<
    [typeof ConnectionHandleType, typeof BsonValueType, typeof MongoFindOptionsType],
    typeof ArrayType<typeof BsonValueType>
> = East.platform("mongo_find", [ConnectionHandleType, BsonValueType, MongoFindOptionsType], ArrayType(BsonValueType));

export const mongo_close: PlatformFunctionDef<
    [typeof ConnectionHandleType],
    typeof NullType
> = East.platform("mongo_close", [ConnectionHandleType], NullType);
```

### Platform Function Summary

| Category | Function | Input Types | Output Type |
|----------|----------|-------------|-------------|
| **SQL (SQLite/Postgres/MySQL)** |
| Connection | `*_connect` | `ConfigType` | `ConnectionHandleType` (string) |
| Query | `*_query` | `handle, sql: string, params: SqlParametersType` | `SqlResultType` |
| Close | `*_close` | `handle` | `NullType` |
| **Storage (S3)** |
| Upload | `s3_put_object` | `config, key: string, data: BlobType` | `NullType` |
| Download | `s3_get_object` | `config, key: string` | `BlobType` |
| Delete | `s3_delete_object` | `config, key: string` | `NullType` |
| List | `s3_list_objects` | `config, prefix: string, maxKeys: int` | `S3ListResultType` |
| Presign | `s3_presign_url` | `config, key: string, expiresIn: int` | `StringType` |
| **Transfer (FTP/SFTP)** |
| Connection | `ftp/sftp_connect` | `ConfigType` | `ConnectionHandleType` (string) |
| Upload | `ftp/sftp_put` | `handle, path: string, data: BlobType` | `NullType` |
| Download | `ftp/sftp_get` | `handle, path: string` | `BlobType` |
| List | `ftp/sftp_list` | `handle, path: string` | `ArrayType<FileInfoType>` |
| Delete | `ftp/sftp_delete` | `handle, path: string` | `NullType` |
| Close | `ftp/sftp_close` | `handle` | `NullType` |
| **NoSQL (Redis)** |
| Connection | `redis_connect` | `RedisConfigType` | `ConnectionHandleType` (string) |
| Get | `redis_get` | `handle, key: string` | `OptionType(StringType)` |
| Set | `redis_set` | `handle, key: string, value: string` | `NullType` |
| Set+TTL | `redis_setex` | `handle, key: string, value: string, ttl: int` | `NullType` |
| Delete | `redis_del` | `handle, key: string` | `IntegerType` (count) |
| Close | `redis_close` | `handle` | `NullType` |
| **NoSQL (MongoDB)** |
| Connection | `mongo_connect` | `MongoConfigType` | `ConnectionHandleType` (string) |
| Insert | `mongo_insert_one` | `handle, doc: BsonValueType` | `StringType` (id) |
| Find One | `mongo_find_one` | `handle, query: BsonValueType` | `OptionType(BsonValueType)` |
| Find Many | `mongo_find` | `handle, query: BsonValueType, options` | `ArrayType(BsonValueType)` |
| Update | `mongo_update_one` | `handle, query: BsonValueType, update: BsonValueType` | `IntegerType` (count) |
| Delete | `mongo_delete_one` | `handle, query: BsonValueType` | `IntegerType` (count) |
| Close | `mongo_close` | `handle` | `NullType` |

**Total: 35 platform functions** across 5 I/O categories (SQL, S3, FTP, SFTP, Redis, MongoDB)

## Platform Functions (Grouped Exports)

```typescript
export const SQL = {
    // SQLite
    SQLite: {
        /**
         * Opens a SQLite database connection.
         */
        connect: sqlite_connect,  // (config: SqliteConfigType) => ConnectionHandle

        /**
         * Executes a SQL query with parameters.
         */
        query: sqlite_query,  // (handle, sql: string, params: SqlParametersType) => SqlResultType

        /**
         * Closes the database connection.
         */
        close: sqlite_close,  // (handle) => unit

        Implementation: SqliteImpl,
    },

    // PostgreSQL
    Postgres: {
        connect: postgres_connect,
        query: postgres_query,
        close: postgres_close,
        Implementation: PostgresImpl,
    },

    // MySQL
    MySQL: {
        connect: mysql_connect,
        query: mysql_query,
        close: mysql_close,
        Implementation: MySqlImpl,
    },
} as const;
```

### Storage Module

```typescript
export const Storage = {
    S3: {
        /**
         * Uploads a blob to S3.
         */
        putObject: s3_put_object,  // (config, key: string, data: Blob) => unit

        /**
         * Downloads an object from S3.
         */
        getObject: s3_get_object,  // (config, key: string) => Blob

        /**
         * Deletes an object from S3.
         */
        deleteObject: s3_delete_object,  // (config, key: string) => unit

        /**
         * Lists objects with a prefix.
         */
        listObjects: s3_list_objects,  // (config, prefix: string, maxKeys: int) => S3ListResultType

        /**
         * Generates a presigned URL for temporary access.
         */
        presignUrl: s3_presign_url,  // (config, key: string, expiresIn: int) => string

        Implementation: S3Impl,
    },
} as const;
```

### Transfer Module

```typescript
export const Transfer = {
    FTP: {
        /**
         * Connects to an FTP server.
         */
        connect: ftp_connect,  // (config: FtpConfigType) => ConnectionHandle

        /**
         * Uploads a file to FTP server.
         */
        put: ftp_put,  // (handle, remotePath: string, data: Blob) => unit

        /**
         * Downloads a file from FTP server.
         */
        get: ftp_get,  // (handle, remotePath: string) => Blob

        /**
         * Lists files in a directory.
         */
        list: ftp_list,  // (handle, path: string) => array<FileInfoType>

        /**
         * Deletes a file.
         */
        delete: ftp_delete,  // (handle, path: string) => unit

        /**
         * Closes the FTP connection.
         */
        close: ftp_close,  // (handle) => unit

        Implementation: FtpImpl,
    },

    SFTP: {
        connect: sftp_connect,
        put: sftp_put,
        get: sftp_get,
        list: sftp_list,
        delete: sftp_delete,
        close: sftp_close,
        Implementation: SftpImpl,
    },
} as const;
```

### NoSQL Module

```typescript
export const NoSQL = {
    Redis: {
        /**
         * Connects to a Redis server.
         */
        connect: redis_connect,  // (config: RedisConfigType) => ConnectionHandle

        /**
         * Gets a value by key.
         */
        get: redis_get,  // (handle, key: string) => option<string>

        /**
         * Sets a key-value pair.
         */
        set: redis_set,  // (handle, key: string, value: string) => unit

        /**
         * Sets a key with expiration (seconds).
         */
        setex: redis_setex,  // (handle, key: string, value: string, ttl: int) => unit

        /**
         * Deletes a key.
         */
        del: redis_del,  // (handle, key: string) => int

        /**
         * Closes the Redis connection.
         */
        close: redis_close,  // (handle) => unit

        Implementation: RedisImpl,
    },

    MongoDB: {
        connect: mongo_connect,
        insertOne: mongo_insert_one,
        findOne: mongo_find_one,
        updateOne: mongo_update_one,
        deleteOne: mongo_delete_one,
        find: mongo_find,  // With limit/skip
        close: mongo_close,
        Implementation: MongoImpl,
    },
} as const;
```

## Connection Management

### Handle System

Use opaque handles for connection management:

```typescript
import { randomUUID } from 'node:crypto';
import { EastError } from "@elaraai/east/internal";

// Internal handle tracking
const connectionHandles = new Map<string, any>();

function createHandle(connection: any): string {
    const handle = randomUUID();
    connectionHandles.set(handle, connection);
    return handle;
}

function getConnection<T>(handle: string): T {
    const conn = connectionHandles.get(handle);
    if (!conn) {
        throw new EastError(`Invalid connection handle: ${handle}`, {
            location: { filename: "connection_handle", line: 0n, column: 0n }
        });
    }
    return conn as T;
}

function closeHandle(handle: string): void {
    const conn = connectionHandles.get(handle);
    if (!conn) {
        throw new EastError(`Cannot close invalid handle: ${handle}`, {
            location: { filename: "connection_close", line: 0n, column: 0n }
        });
    }
    connectionHandles.delete(handle);
}
```

### Connection Pooling

- PostgreSQL and MySQL use built-in connection pooling
- SQLite uses single connection per handle (file-based locking)
- Redis uses ioredis built-in connection pooling
- MongoDB uses driver's connection pool
- FTP/SFTP create single connections per handle

## Error Handling

All I/O operations can fail. Always throw `EastError` with proper location information:

```typescript
import { EastError } from "@elaraai/east/internal";

// Correct error handling pattern (following east-node conventions)
try {
    const result = await pool.query(sql, params);
    return convertResult(result);
} catch (err: any) {
    throw new EastError(`SQL query failed: ${err.message}`, {
        location: { filename: "postgres_query", line: 0n, column: 0n },
        cause: err
    });
}
```

**Key points:**
- Import `EastError` from `@elaraai/east/internal`
- Always include `location` object with:
  - `filename`: The platform function name (e.g., "postgres_query", "s3_get_object")
  - `line`: Always `0n` (BigInt zero)
  - `column`: Always `0n` (BigInt zero)
- Include `cause`: The original error for stack trace preservation
- Use descriptive error messages that help users understand what went wrong

Common error categories:
- **Connection errors**: Network, authentication, configuration
- **Query errors**: SQL syntax, constraint violations, type mismatches
- **Storage errors**: Bucket not found, permission denied, quota exceeded
- **Transfer errors**: File not found, permission denied, connection timeout

## Usage Examples

### SQL Query Example

```typescript
import { East, StringType, Int32Type } from "@elaraai/east";
import { SQL } from "@elaraai/east-node-io";

const getUserById = East.function([Int32Type], StringType, ($, userId) => {
    const config = $.let({
        host: "localhost",
        port: 5432,
        database: "myapp",
        user: "postgres",
        password: "secret",
    });

    // connect() returns a handle, use $.let()
    const conn = $.let(SQL.Postgres.connect(config));

    // query() returns SqlResultType, use $.let()
    const result = $.let(SQL.Postgres.query(
        conn,
        "SELECT name FROM users WHERE id = $1",
        [East.variant("int", userId)]
    ));

    // close() returns void, use $()
    $(SQL.Postgres.close(conn));

    // Return the name from the first row
    return result.rows.at(0).get("name").match({
        string: (name) => name,
        _: () => "Unknown",
    });
});

const compiled = East.compileAsync(getUserById.toIR(), SQL.Postgres.Implementation);
await compiled(42);  // "Alice"
```

### S3 Binary File Example

S3 operations work with **BlobType** - you can upload/download any binary data:

```typescript
import { Storage } from "@elaraai/east-node-io";
import { East, StringType, BlobType } from "@elaraai/east";

// Upload binary data (PDF, images, etc.)
const uploadFile = East.function([StringType, BlobType], StringType, ($, filename, data) => {
    const config = $.let({
        region: "us-east-1",
        bucket: "my-bucket",
    });

    // putObject() accepts BlobType - any binary data
    $(Storage.S3.putObject(config, filename, data));

    // presignUrl() returns string
    return Storage.S3.presignUrl(config, filename, 3600);
});

const compiled = East.compileAsync(uploadFile.toIR(), Storage.S3.Implementation);
const url = await compiled("report.pdf", pdfBlob);

// Download binary data
const downloadFile = East.function([StringType], BlobType, ($, filename) => {
    const config = $.let({
        region: "us-east-1",
        bucket: "my-bucket",
    });

    // getObject() returns BlobType - raw binary data
    return Storage.S3.getObject(config, filename);
});

const downloadCompiled = East.compileAsync(downloadFile.toIR(), Storage.S3.Implementation);
const pdfData = await downloadCompiled("report.pdf");  // Returns Uint8Array (Blob)

// For text files, you can encode/decode:
const uploadText = East.function([StringType, StringType], StringType, ($, filename, text) => {
    const config = $.let({
        region: "us-east-1",
        bucket: "my-bucket",
    });

    // Convert string to Blob using encodeUtf8()
    const blob = $.let(text.encodeUtf8());
    $(Storage.S3.putObject(config, filename, blob));

    return Storage.S3.presignUrl(config, filename, 3600);
});

const downloadText = East.function([StringType], StringType, ($, filename) => {
    const config = $.let({
        region: "us-east-1",
        bucket: "my-bucket",
    });

    const blob = $.let(Storage.S3.getObject(config, filename));

    // Convert Blob back to string using decodeUtf8()
    return blob.decodeUtf8();
});
```

### FTP/SFTP Binary File Transfer Example

FTP and SFTP operations also work with **BlobType** for transferring any file type:

```typescript
import { Transfer } from "@elaraai/east-node-io";
import { East, StringType, BlobType } from "@elaraai/east";

// Upload binary file via SFTP
const uploadViaSftp = East.function([StringType, BlobType], NullType, ($, remotePath, fileData) => {
    const config = $.let({
        host: "sftp.example.com",
        port: 22,
        username: "user",
        password: some("pass"),
        privateKey: none,
    });

    const conn = $.let(Transfer.SFTP.connect(config));

    // put() accepts BlobType - works with any binary data
    $(Transfer.SFTP.put(conn, remotePath, fileData));

    $(Transfer.SFTP.close(conn));
});

const sftpUpload = East.compileAsync(uploadViaSftp.toIR(), Transfer.SFTP.Implementation);
await sftpUpload("/remote/data.bin", binaryData);

// Download binary file via SFTP
const downloadViaSftp = East.function([StringType], BlobType, ($, remotePath) => {
    const config = $.let({
        host: "sftp.example.com",
        port: 22,
        username: "user",
        password: some("pass"),
        privateKey: none,
    });

    const conn = $.let(Transfer.SFTP.connect(config));

    // get() returns BlobType - raw binary data
    const data = $.let(Transfer.SFTP.get(conn, remotePath));

    $(Transfer.SFTP.close(conn));

    return data;
});

const sftpDownload = East.compileAsync(downloadViaSftp.toIR(), Transfer.SFTP.Implementation);
const fileData = await sftpDownload("/remote/data.bin");  // Returns Uint8Array (Blob)

// Transfer text files (with encoding/decoding)
const uploadTextViaFtp = East.function([StringType, StringType], NullType, ($, remotePath, textContent) => {
    const config = $.let({
        host: "ftp.example.com",
        port: 21,
        user: "user",
        password: "pass",
        secure: false,
    });

    const conn = $.let(Transfer.FTP.connect(config));

    // Convert text to Blob
    const blob = $.let(textContent.encodeUtf8());
    $(Transfer.FTP.put(conn, remotePath, blob));

    $(Transfer.FTP.close(conn));
});
```

### Redis Cache Example

Redis works with **strings** (not Blobs), suitable for caching text data:

```typescript
import { NoSQL } from "@elaraai/east-node-io";
import { East, StringType, OptionType } from "@elaraai/east";

const cacheGet = East.function([StringType], OptionType(StringType), ($, key) => {
    const config = $.let({
        host: "localhost",
        port: 6379,
        password: none,
        db: none,
        keyPrefix: some("cache:"),
    });

    // connect() returns handle, use $.let()
    const conn = $.let(NoSQL.Redis.connect(config));

    // get() returns option<string>, use $.let()
    const value = $.let(NoSQL.Redis.get(conn, key));

    // close() returns void, use $()
    $(NoSQL.Redis.close(conn));

    return value;
});

const compiled = East.compileAsync(cacheGet.toIR(), NoSQL.Redis.Implementation);
await compiled("user:42");  // some("...") or none

// For binary data in Redis, you could encode as base64 string or use a separate blob store
```

## Implementation Notes

### Async Considerations

All I/O operations use `implementAsync` with proper error handling:

```typescript
import { East } from "@elaraai/east";
import { EastError } from "@elaraai/east/internal";
import type { PlatformFunction } from "@elaraai/east/internal";

const postgres_query = East.platform("postgres_query", [
    ConnectionHandleType,
    StringType,
    SqlParametersType,
], SqlResultType);

export const PostgresImpl: PlatformFunction[] = [
    postgres_query.implementAsync(async (handle, sql, params) => {
        try {
            const pool = getConnection<pg.Pool>(handle);
            const result = await pool.query(sql, convertParams(params));
            return convertResult(result);
        } catch (err: any) {
            throw new EastError(`SQL query failed: ${err.message}`, {
                location: { filename: "postgres_query", line: 0n, column: 0n },
                cause: err
            });
        }
    }),
];
```

**Error handling in every platform function:**
- Wrap implementation in try-catch
- Throw `EastError` with location information
- Include original error as `cause` for debugging

### Type Conversion

Careful conversion between East types and native types:

- **SQL NULL** → `{tag: "null", value: {}}`
- **JavaScript Date** → ISO 8601 string
- **Buffer** → Blob type
- **BigInt** → Int64Type (using East.bigIntToI64)

### Security

- **SQL Injection**: Always use parameterized queries, never string concatenation
- **Credentials**: Support environment variables and AWS credential providers
- **Connection Strings**: Validate and sanitize URIs
- **File Paths**: Validate paths to prevent directory traversal

### Testing

- **Unit tests**: Use `describeEast` and `Test` following east-node patterns (Node.js test runner)
- **Integration tests**: Use Docker containers for real databases
- **Test files**: Co-located `.spec.ts` files alongside implementation
- **CI/CD**: GitHub Actions with service containers

## Testing Infrastructure

### Docker Configuration

#### docker-compose.yml (Local Development)

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: testuser
      POSTGRES_PASSWORD: testpass
      POSTGRES_DB: testdb
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U testuser"]
      interval: 5s
      timeout: 5s
      retries: 5

  mysql:
    image: mysql:8.0
    environment:
      MYSQL_ROOT_PASSWORD: rootpass
      MYSQL_DATABASE: testdb
      MYSQL_USER: testuser
      MYSQL_PASSWORD: testpass
    ports:
      - "3306:3306"
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost"]
      interval: 5s
      timeout: 5s
      retries: 5

  mongodb:
    image: mongo:7
    environment:
      MONGO_INITDB_ROOT_USERNAME: testuser
      MONGO_INITDB_ROOT_PASSWORD: testpass
    ports:
      - "27017:27017"
    healthcheck:
      test: ["CMD", "mongosh", "--eval", "db.adminCommand('ping')"]
      interval: 5s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 5s
      retries: 5

  minio:
    image: minio/minio:latest
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: minioadmin
      MINIO_ROOT_PASSWORD: minioadmin
    ports:
      - "9000:9000"
      - "9001:9001"
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:9000/minio/health/live"]
      interval: 5s
      timeout: 5s
      retries: 5

  ftp:
    image: delfer/alpine-ftp-server:latest
    environment:
      USERS: "testuser|testpass|/home/testuser|10000"
      ADDRESS: "localhost"
    ports:
      - "21:21"
      - "21000-21010:21000-21010"

  sftp:
    image: atmoz/sftp:latest
    command: testuser:testpass:1001
    ports:
      - "2222:22"
    volumes:
      - sftp-data:/home/testuser/upload

volumes:
  sftp-data:
```

#### docker-compose.test.yml (CI/CD)

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: testuser
      POSTGRES_PASSWORD: testpass
      POSTGRES_DB: testdb
    tmpfs:
      - /var/lib/postgresql/data

  mysql:
    image: mysql:8.0
    environment:
      MYSQL_ROOT_PASSWORD: rootpass
      MYSQL_DATABASE: testdb
      MYSQL_USER: testuser
      MYSQL_PASSWORD: testpass
    tmpfs:
      - /var/lib/mysql

  mongodb:
    image: mongo:7
    environment:
      MONGO_INITDB_ROOT_USERNAME: testuser
      MONGO_INITDB_ROOT_PASSWORD: testpass
    tmpfs:
      - /data/db

  redis:
    image: redis:7-alpine
    tmpfs:
      - /data

  minio:
    image: minio/minio:latest
    command: server /data
    environment:
      MINIO_ROOT_USER: minioadmin
      MINIO_ROOT_PASSWORD: minioadmin
    tmpfs:
      - /data
```

### Test Scripts

#### package.json scripts

Following **east-node** conventions with Node.js built-in test runner:

```json
{
  "scripts": {
    "build": "tsc",
    "test": "npm run build && npm run lint && node --enable-source-maps --test 'dist/**/*.spec.js'",
    "test:coverage": "npm run build && npm run lint && node --enable-source-maps --test --experimental-test-coverage 'dist/**/*.spec.js'",
    "test:integration": "npm run test:docker:up && npm test && npm run test:docker:down",
    "test:docker:up": "docker-compose -f docker-compose.test.yml up -d && npm run test:wait",
    "test:docker:down": "docker-compose -f docker-compose.test.yml down -v",
    "test:wait": "node scripts/wait-for-services.js",
    "dev:services": "docker-compose up -d",
    "dev:services:down": "docker-compose down -v",
    "lint": "eslint .",
    "lint:fix": "eslint . --fix"
  }
}
```

**Key points:**
- Uses `node --test` (Node.js built-in test runner, not Jest)
- Tests are `.spec.ts` files co-located with source
- Compiled to `.spec.js` in `dist/` directory before running
- `--enable-source-maps` for proper stack traces

#### scripts/wait-for-services.js

```javascript
const { execSync } = require('child_process');

const services = [
  { name: 'PostgreSQL', command: 'docker-compose -f docker-compose.test.yml exec -T postgres pg_isready -U testuser' },
  { name: 'MySQL', command: 'docker-compose -f docker-compose.test.yml exec -T mysql mysqladmin ping -h localhost -u root -prootpass' },
  { name: 'MongoDB', command: 'docker-compose -f docker-compose.test.yml exec -T mongodb mongosh --eval "db.adminCommand(\'ping\')" --quiet' },
  { name: 'Redis', command: 'docker-compose -f docker-compose.test.yml exec -T redis redis-cli ping' },
  { name: 'MinIO', command: 'curl -f http://localhost:9000/minio/health/live' },
];

async function waitForService(service, maxAttempts = 30) {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      execSync(service.command, { stdio: 'ignore', timeout: 5000 });
      console.log(`✓ ${service.name} is ready`);
      return true;
    } catch (error) {
      process.stdout.write(`⏳ Waiting for ${service.name}... (${i + 1}/${maxAttempts})\r`);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  throw new Error(`${service.name} failed to start after ${maxAttempts} attempts`);
}

async function main() {
  console.log('Waiting for services to be ready...\n');

  for (const service of services) {
    await waitForService(service);
  }

  console.log('\n✓ All services are ready!\n');
}

main().catch(error => {
  console.error(`\n✗ ${error.message}`);
  process.exit(1);
});
```

### Test Environment Configuration

#### test/setup.ts

```typescript
import { S3Client, CreateBucketCommand } from '@aws-sdk/client-s3';

export const TEST_CONFIG = {
  postgres: {
    host: process.env.POSTGRES_HOST || 'localhost',
    port: parseInt(process.env.POSTGRES_PORT || '5432'),
    database: 'testdb',
    user: 'testuser',
    password: 'testpass',
  },
  mysql: {
    host: process.env.MYSQL_HOST || 'localhost',
    port: parseInt(process.env.MYSQL_PORT || '3306'),
    database: 'testdb',
    user: 'testuser',
    password: 'testpass',
  },
  mongodb: {
    uri: process.env.MONGODB_URI || 'mongodb://testuser:testpass@localhost:27017',
    database: 'testdb',
  },
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
  },
  minio: {
    endpoint: process.env.MINIO_ENDPOINT || 'http://localhost:9000',
    region: 'us-east-1',
    bucket: 'test-bucket',
    accessKeyId: 'minioadmin',
    secretAccessKey: 'minioadmin',
  },
  ftp: {
    host: process.env.FTP_HOST || 'localhost',
    port: parseInt(process.env.FTP_PORT || '21'),
    user: 'testuser',
    password: 'testpass',
  },
  sftp: {
    host: process.env.SFTP_HOST || 'localhost',
    port: parseInt(process.env.SFTP_PORT || '2222'),
    username: 'testuser',
    password: 'testpass',
  },
};

// Global setup for integration tests
export async function globalSetup() {
  // Create S3 test bucket
  const s3Client = new S3Client({
    endpoint: TEST_CONFIG.minio.endpoint,
    region: TEST_CONFIG.minio.region,
    credentials: {
      accessKeyId: TEST_CONFIG.minio.accessKeyId,
      secretAccessKey: TEST_CONFIG.minio.secretAccessKey,
    },
    forcePathStyle: true,
  });

  try {
    await s3Client.send(new CreateBucketCommand({
      Bucket: TEST_CONFIG.minio.bucket,
    }));
    console.log('✓ Created test S3 bucket');
  } catch (error: any) {
    if (error.name !== 'BucketAlreadyOwnedByYou') {
      throw error;
    }
  }
}

// Global teardown
export async function globalTeardown() {
  // Cleanup if needed
}
```

#### test/test-helpers.ts

```typescript
/**
 * Shared test utilities for east-node-io
 */
import { describeEast, Test } from './test.js';

export { describeEast, Test };

export const TEST_CONFIG = {
  postgres: {
    host: process.env.POSTGRES_HOST || 'localhost',
    port: parseInt(process.env.POSTGRES_PORT || '5432'),
    database: 'testdb',
    user: 'testuser',
    password: 'testpass',
  },
  mysql: {
    host: process.env.MYSQL_HOST || 'localhost',
    port: parseInt(process.env.MYSQL_PORT || '3306'),
    database: 'testdb',
    user: 'testuser',
    password: 'testpass',
  },
  mongodb: {
    uri: process.env.MONGODB_URI || 'mongodb://testuser:testpass@localhost:27017',
    database: 'testdb',
  },
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
  },
  minio: {
    endpoint: process.env.MINIO_ENDPOINT || 'http://localhost:9000',
    region: 'us-east-1',
    bucket: 'test-bucket',
    accessKeyId: 'minioadmin',
    secretAccessKey: 'minioadmin',
  },
};
```

### GitHub Actions Workflow

#### .github/workflows/test.yml

```yaml
name: Test

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main, develop ]

jobs:
  test:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_USER: testuser
          POSTGRES_PASSWORD: testpass
          POSTGRES_DB: testdb
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432

      mysql:
        image: mysql:8.0
        env:
          MYSQL_ROOT_PASSWORD: rootpass
          MYSQL_DATABASE: testdb
          MYSQL_USER: testuser
          MYSQL_PASSWORD: testpass
        options: >-
          --health-cmd "mysqladmin ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 3306:3306

      mongodb:
        image: mongo:7
        env:
          MONGO_INITDB_ROOT_USERNAME: testuser
          MONGO_INITDB_ROOT_PASSWORD: testpass
        options: >-
          --health-cmd "mongosh --eval 'db.adminCommand(\"ping\")'"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 27017:27017

      redis:
        image: redis:7-alpine
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 6379:6379

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Start MinIO
        run: |
          docker run -d -p 9000:9000 \
            -e MINIO_ROOT_USER=minioadmin \
            -e MINIO_ROOT_PASSWORD=minioadmin \
            minio/minio server /data

      - name: Wait for MinIO
        run: |
          timeout 30 bash -c 'until curl -f http://localhost:9000/minio/health/live; do sleep 1; done'

      - name: Build
        run: npm run build

      - name: Run unit tests
        run: npm run test:unit

      - name: Run integration tests
        run: npm run test:integration
        env:
          POSTGRES_HOST: localhost
          MYSQL_HOST: localhost
          MONGODB_URI: mongodb://testuser:testpass@localhost:27017
          REDIS_HOST: localhost
          MINIO_ENDPOINT: http://localhost:9000

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info

  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run lint
```

### Test Structure

Following east-node conventions, tests are co-located with source files:

```
src/
├── sql/
│   ├── sqlite.ts
│   ├── sqlite.spec.ts          # Unit tests using describeEast
│   ├── postgres.ts
│   ├── postgres.spec.ts
│   ├── mysql.ts
│   └── mysql.spec.ts
├── storage/
│   ├── s3.ts
│   └── s3.spec.ts
├── transfer/
│   ├── ftp.ts
│   ├── ftp.spec.ts
│   ├── sftp.ts
│   └── sftp.spec.ts
├── nosql/
│   ├── redis.ts
│   ├── redis.spec.ts
│   ├── mongodb.ts
│   └── mongodb.spec.ts
├── test.ts                     # Test utilities (describeEast, Test)
└── index.ts

test/
├── fixtures/
│   ├── test-data.sql
│   ├── test-files/
│   └── schemas/
└── setup.ts                    # Docker setup utilities
```

### Example Unit Tests with describeEast

**Important**: In East function bodies (`$ => { ... }`), you must use:
- `$(expr)` - Execute expressions with side effects (void/unit return, like assertions or close operations)
- `$.let(expr)` - Bind expressions that return values to variables
- Without `$()` or `$.let()`, the expression is NOT executed

#### src/sql/postgres.spec.ts

```typescript
/**
 * PostgreSQL platform function tests
 *
 * These tests use describeEast following east-node conventions.
 * Tests compile East functions and run them to validate platform function behavior.
 */
import { describeEast, Test } from '../test.js';
import { SQL, PostgresImpl } from './postgres.js';

await describeEast("PostgreSQL platform functions", (test) => {
    // Note: For actual database integration tests, Docker containers would be running
    // These examples show the proper describeEast pattern

    test("query with parameters works correctly", $ => {
        const config = $.let({
            host: "localhost",
            port: 5432,
            database: "testdb",
            user: "testuser",
            password: "testpass",
        });

        const conn = $.let(SQL.Postgres.connect(config));

        // Execute a simple query
        const result = $.let(SQL.Postgres.query(
            conn,
            "SELECT 1 AS value",
            []
        ));

        // Verify result structure
        $(Test.greater(result.rows.length(), 0n));

        // Close connection (returns void, so use $())
        $(SQL.Postgres.close(conn));
    });

    test("SqlParameterType handles all SQL types", $ => {
        // Test parameter type creation
        const stringParam = $.let(East.variant("string", "test"));
        const intParam = $.let(East.variant("int", 42n));
        const floatParam = $.let(East.variant("float", 3.14));
        const boolParam = $.let(East.variant("bool", true));
        const nullParam = $.let(East.variant("null", {}));

        // Verify correct tagging
        $(Test.equal(stringParam.tag(), "string"));
        $(Test.equal(intParam.tag(), "int"));
        $(Test.equal(floatParam.tag(), "float"));
        $(Test.equal(boolParam.tag(), "bool"));
        $(Test.equal(nullParam.tag(), "null"));
    });

    test("connection handle is valid string", $ => {
        const config = $.let({
            host: "localhost",
            port: 5432,
            database: "testdb",
            user: "testuser",
            password: "testpass",
        });

        const handle = $.let(SQL.Postgres.connect(config));

        // Handle should be non-empty
        $(Test.greater(handle.length(), 0n));

        // Close returns void, use $()
        $(SQL.Postgres.close(handle));
    });
}, PostgresImpl);
```

#### src/nosql/redis.spec.ts

```typescript
/**
 * Redis platform function tests
 */
import { describeEast, Test } from '../test.js';
import { NoSQL, RedisImpl } from './redis.js';

await describeEast("Redis platform functions", (test) => {
    test("set and get string values", $ => {
        const config = $.let({
            host: "localhost",
            port: 6379,
            password: none,
            db: none,
            keyPrefix: none,
        });

        const conn = $.let(NoSQL.Redis.connect(config));

        // Set a value (returns void, use $())
        $(NoSQL.Redis.set(conn, "test:key", "test-value"));

        // Get the value back (returns option<string>, use $.let())
        const value = $.let(NoSQL.Redis.get(conn, "test:key"));

        // Verify it matches - match returns void, so each branch uses $()
        $(value.match({
            some: (v) => Test.equal(v, "test-value"),
            none: () => testFail("Expected value to exist"),
        }));

        // Close returns void, use $()
        $(NoSQL.Redis.close(conn));
    });

    test("setex sets value with TTL", $ => {
        const config = $.let({
            host: "localhost",
            port: 6379,
        });

        const conn = $.let(NoSQL.Redis.connect(config));

        // Set value with 60 second TTL (returns void)
        $(NoSQL.Redis.setex(conn, "test:ttl", "value", 60));

        // Value should exist immediately
        const value = $.let(NoSQL.Redis.get(conn, "test:ttl"));
        $(Test.equal(value.isSome(), true));

        $(NoSQL.Redis.close(conn));
    });

    test("del removes key", $ => {
        const config = $.let({
            host: "localhost",
            port: 6379,
        });

        const conn = $.let(NoSQL.Redis.connect(config));

        // Set then delete (set returns void)
        $(NoSQL.Redis.set(conn, "test:delete", "value"));

        // del returns int (number of keys deleted)
        const deleted = $.let(NoSQL.Redis.del(conn, "test:delete"));

        // Should have deleted 1 key
        $(Test.equal(deleted, 1n));

        $(NoSQL.Redis.close(conn));
    });
}, RedisImpl);
```

### Database Initialization Scripts

#### test/fixtures/init-postgres.sql

```sql
-- PostgreSQL test data initialization
CREATE TABLE IF NOT EXISTS test_users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) NOT NULL,
    email VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO test_users (username, email) VALUES
    ('alice', 'alice@test.com'),
    ('bob', 'bob@test.com'),
    ('charlie', 'charlie@test.com');
```

#### test/fixtures/init-mysql.sql

```sql
-- MySQL test data initialization
CREATE TABLE IF NOT EXISTS test_users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL,
    email VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO test_users (username, email) VALUES
    ('alice', 'alice@test.com'),
    ('bob', 'bob@test.com'),
    ('charlie', 'charlie@test.com');
```

## Future Extensions

### Phase 2 Features

- **Transactions**: Begin/commit/rollback for SQL databases
- **Streaming**: Large file uploads/downloads with progress
- **Batch Operations**: Bulk inserts and updates
- **Schema Migrations**: Database schema versioning
- **GraphQL**: GraphQL client for API integration
- **Message Queues**: RabbitMQ, SQS, Kafka support

### Phase 3 Features

- **ORMs**: Higher-level data modeling abstractions
- **Caching**: Multi-layer caching strategies
- **Monitoring**: Built-in metrics and tracing
- **Connection Management**: Advanced pooling and failover

## Development Workflow

1. **Setup**: `npm install`
2. **Build**: `npm run build`
3. **Test**: `npm run test` (requires Docker for integration tests)
4. **Lint**: `npm run lint` (must pass before commit)
5. **Docs**: `npm run docs` (generate TypeDoc documentation)

## Documentation Standards

Follow the same TypeDoc standards as **east-node**:

- All exported functions have comprehensive TypeDoc comments
- Examples show East fluent API usage, not implementation code
- Use `@remarks` for platform-specific behavior
- Include `@throws {EastError}` for all error conditions with specific error messages
- Document the location.filename used in error handling
- Group related functions into exported objects (SQL, Storage, etc.)

### Error Handling in Documentation

Platform functions should document all error conditions:

```typescript
/**
 * Executes a SQL query with parameters.
 *
 * @param handle - Connection handle from connect()
 * @param sql - SQL query string with $1, $2, etc. placeholders
 * @param params - Query parameters
 * @returns Query results with rows and metadata
 *
 * @throws {EastError} When query fails due to:
 * - Invalid connection handle (location: "postgres_query")
 * - SQL syntax errors (location: "postgres_query")
 * - Connection timeout (location: "postgres_query")
 * - Parameter type mismatch (location: "postgres_query")
 *
 * @example
 * ```ts
 * const result = SQL.Postgres.query(
 *   conn,
 *   "SELECT * FROM users WHERE id = $1",
 *   [East.variant("int", 42n)]
 * );
 * ```
 */
```

## Summary

**east-node-io** provides comprehensive I/O capabilities for East programs:

✅ **SQL databases** (SQLite, PostgreSQL, MySQL with connection pooling)
✅ **Cloud storage** (S3 with presigned URLs)
✅ **File transfer** (FTP/SFTP for legacy systems)
✅ **NoSQL** (Redis, MongoDB)
✅ **Type-safe** (East type system throughout)
✅ **Async-first** (All operations use `implementAsync`)
✅ **Well-documented** (TypeDoc comments on all public APIs)

This design enables East programs to integrate with virtually any external data source while maintaining type safety and the functional programming model.

## Package Metadata

### package.json

```json
{
  "name": "@elaraai/east-node-io",
  "version": "0.1.0",
  "description": "I/O platform functions for the East language on Node.js",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "test": "jest",
    "lint": "eslint src --ext .ts",
    "docs": "typedoc src/index.ts"
  },
  "repository": {
    "type": "git",
    "url": "https://github.com/elaraai/east-node-io.git"
  },
  "keywords": [
    "east",
    "functional",
    "io",
    "database",
    "sql",
    "nosql",
    "s3",
    "ftp",
    "sftp"
  ],
  "author": "Elara AI",
  "license": "MIT"
}
```

### tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "declaration": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "moduleResolution": "node",
    "resolveJsonModule": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "test"]
}
```

### .eslintrc.json

```json
{
  "parser": "@typescript-eslint/parser",
  "extends": [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended"
  ],
  "parserOptions": {
    "ecmaVersion": 2020,
    "sourceType": "module"
  },
  "rules": {
    "@typescript-eslint/no-explicit-any": "off"
  }
}
```
