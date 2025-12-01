# East Node IO Usage Guide

Usage guide for East Node.js I/O platform functions.

---

## Table of Contents

- [Quick Start](#quick-start)
- [Accessing Types](#accessing-types)
- [Platform Functions](#platform-functions)
  - [SQL Databases](#sql-databases)
    - [SQLite](#sqlite)
    - [PostgreSQL](#postgresql)
    - [MySQL](#mysql)
  - [Storage (S3)](#storage-s3)
  - [File Transfer](#file-transfer)
    - [FTP](#ftp)
    - [SFTP](#sftp)
  - [NoSQL Databases](#nosql-databases)
    - [Redis](#redis)
    - [MongoDB](#mongodb)
  - [File Formats](#file-formats)
    - [XLSX (Excel)](#xlsx-excel)
    - [CSV](#csv)
    - [XML](#xml)
  - [Compression](#compression)
    - [Gzip](#gzip)
    - [Zip](#zip)
    - [Tar](#tar)
- [Error Handling](#error-handling)

---

## Quick Start

```typescript
import { East, StringType, NullType } from "@elaraai/east";
import { SQL, Storage } from "@elaraai/east-node-io";

// Define East function using SQL platform functions
const queryDatabase = East.function([StringType], NullType, ($, userId) => {
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
        "SELECT * FROM users WHERE id = $1",
        [East.variant("Integer", 42n)]
    ));
    $(SQL.Postgres.close(conn));
    return $.return(null);
});

// Compile with specific module Implementation
const compiled = East.compileAsync(queryDatabase.toIR(), SQL.Postgres.Implementation);
await compiled("user123");

// Or combine multiple implementations
const multiFunction = East.function([StringType], NullType, ($, key) => {
    // Use both SQL and Storage
    const s3Config = $.let({
        region: "us-east-1",
        bucket: "my-bucket",
        accessKeyId: East.variant('none', null),
        secretAccessKey: East.variant('none', null),
        endpoint: East.variant('none', null),
    });

    const data = $.let(Storage.S3.getObject(s3Config, key));
    // ... process data
    return $.return(null);
});

const compiled2 = East.compileAsync(
    multiFunction.toIR(),
    [...SQL.Postgres.Implementation, ...Storage.S3.Implementation]
);
```

---

## Accessing Types

All module types are accessible via a nested `Types` property:

```typescript
import { SQL, Storage, NoSQL, Format } from "@elaraai/east-node-io";

// Access SQL types
const postgresConfig = SQL.Postgres.Types.Config;
const sqlResult = SQL.Postgres.Types.Result;

// Access Storage types
const s3Config = Storage.S3.Types.Config;
const metadata = Storage.S3.Types.ObjectMetadata;

// Access NoSQL types
const redisConfig = NoSQL.Redis.Types.Config;

// Access Format types
const xlsxSheet = Format.XLSX.Types.Sheet;
const csvRow = Format.CSV.Types.Row;
```

**Pattern:**
- `Module.SubModule.Types.TypeName` - Access types through the module namespace
- All configuration and result types are organized under `Types`

---

## Platform Functions

### SQL Databases

#### SQLite

**Import:**
```typescript
import { SQL } from "@elaraai/east-node-io";
```

**Functions:**
| Signature | Description | Placeholder | Example |
|-----------|-------------|-------------|---------|
| `connect(config: Expr<SqliteConfigType>): StringExpr` | Open SQLite database connection | - | `SQL.SQLite.connect(config)` |
| `query(handle: StringExpr, sql: StringExpr, params: Expr<SqlParametersType>): Expr<SqlResultType>` | Execute SQL query | `?` | `SQL.SQLite.query(conn, "SELECT * FROM users WHERE id = ?", [id])` |
| `close(handle: StringExpr): NullExpr` | Close database connection | - | `SQL.SQLite.close(conn)` |

**Types:**

Access types via `SQL.SQLite.Types`:
```typescript
SQL.SQLite.Types.Config        // StructType({ path, readOnly?, memory? })
SQL.SQLite.Types.Parameter     // LiteralValueType (String, Integer, Float, Boolean, Null, Blob)
SQL.SQLite.Types.Parameters    // ArrayType(SqlParameterType)
SQL.SQLite.Types.Row           // DictType(String -> SqlParameterType)
SQL.SQLite.Types.Result        // VariantType({ select, insert, update, delete })
```

**Example:**
```typescript
import { East, NullType } from "@elaraai/east";
import { SQL } from "@elaraai/east-node-io";

const createAndInsertUser = East.function([], NullType, $ => {
    const config = $.let({
        path: ":memory:",
        readOnly: East.variant('none', null),
        memory: East.variant('some', true),
    });

    const conn = $.let(SQL.SQLite.connect(config));

    // Create table
    $(SQL.SQLite.query(conn, "CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT)", []));

    // Insert a user
    $(SQL.SQLite.query(
        conn,
        "INSERT INTO users (name) VALUES (?)",
        [East.variant("String", "Alice")]
    ));

    $(SQL.SQLite.close(conn));

    return $.return(null);
});

const compiled = East.compileAsync(createAndInsertUser.toIR(), SQL.SQLite.Implementation);
await compiled();
```

---

#### PostgreSQL

**Import:**
```typescript
import { SQL } from "@elaraai/east-node-io";
```

**Functions:**
| Signature | Description | Placeholder | Example |
|-----------|-------------|-------------|---------|
| `connect(config: Expr<PostgresConfigType>): StringExpr` | Create PostgreSQL connection pool | - | `SQL.Postgres.connect(config)` |
| `query(handle: StringExpr, sql: StringExpr, params: Expr<SqlParametersType>): Expr<SqlResultType>` | Execute SQL query | `$1`, `$2`, etc. | `SQL.Postgres.query(conn, "SELECT * FROM users WHERE id = $1", [id])` |
| `close(handle: StringExpr): NullExpr` | Close connection pool | - | `SQL.Postgres.close(conn)` |

**Types:**

Access types via `SQL.Postgres.Types`:
```typescript
SQL.Postgres.Types.Config      // StructType({ host, port, database, user, password, ssl?, maxConnections? })
SQL.Postgres.Types.Parameter   // LiteralValueType
SQL.Postgres.Types.Parameters  // ArrayType(SqlParameterType)
SQL.Postgres.Types.Row         // DictType(String -> SqlParameterType)
SQL.Postgres.Types.Result      // VariantType({ select, insert, update, delete })
```

**Example:**
```typescript
import { East, IntegerType, NullType } from "@elaraai/east";
import { SQL } from "@elaraai/east-node-io";

const insertUser = East.function([IntegerType], NullType, ($, userId) => {
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
    const result = $.let(SQL.Postgres.query(
        conn,
        "INSERT INTO users (id, name) VALUES ($1, $2)",
        [East.variant("Integer", userId), East.variant("String", "Alice")]
    ));
    $(SQL.Postgres.close(conn));

    return $.return(null);
});

const compiled = East.compileAsync(insertUser.toIR(), SQL.Postgres.Implementation);
await compiled(123n);
```

---

#### MySQL

**Import:**
```typescript
import { SQL } from "@elaraai/east-node-io";
```

**Functions:**
| Signature | Description | Placeholder | Example |
|-----------|-------------|-------------|---------|
| `connect(config: Expr<MySqlConfigType>): StringExpr` | Create MySQL connection pool | - | `SQL.MySQL.connect(config)` |
| `query(handle: StringExpr, sql: StringExpr, params: Expr<SqlParametersType>): Expr<SqlResultType>` | Execute SQL query | `?` | `SQL.MySQL.query(conn, "SELECT * FROM users WHERE id = ?", [id])` |
| `close(handle: StringExpr): NullExpr` | Close connection pool | - | `SQL.MySQL.close(conn)` |

**Types:**

Access types via `SQL.MySQL.Types`:
```typescript
SQL.MySQL.Types.Config         // StructType({ host, port, database, user, password, ssl?, maxConnections? })
SQL.MySQL.Types.Parameter      // LiteralValueType
SQL.MySQL.Types.Parameters     // ArrayType(SqlParameterType)
SQL.MySQL.Types.Row            // DictType(String -> SqlParameterType)
SQL.MySQL.Types.Result         // VariantType({ select, insert, update, delete })
```

**Example:**
```typescript
import { East, IntegerType, NullType } from "@elaraai/east";
import { SQL } from "@elaraai/east-node-io";

const updateUser = East.function([IntegerType], NullType, ($, userId) => {
    const config = $.let({
        host: "localhost",
        port: 3306n,
        database: "myapp",
        user: "root",
        password: "secret",
        ssl: East.variant('none', null),
        maxConnections: East.variant('none', null),
    });

    const conn = $.let(SQL.MySQL.connect(config));
    $(SQL.MySQL.query(
        conn,
        "UPDATE users SET last_login = NOW() WHERE id = ?",
        [East.variant("Integer", userId)]
    ));
    $(SQL.MySQL.close(conn));

    return $.return(null);
});

const compiled = East.compileAsync(updateUser.toIR(), SQL.MySQL.Implementation);
await compiled(456n);
```

---

### Storage (S3)

**Import:**
```typescript
import { Storage } from "@elaraai/east-node-io";
```

**Functions:**
| Signature | Description | Example |
|-----------|-------------|---------|
| `putObject(config: Expr<S3ConfigType>, key: StringExpr, data: BlobExpr): NullExpr` | Upload object to S3 | `Storage.S3.putObject(config, "file.txt", data)` |
| `getObject(config: Expr<S3ConfigType>, key: StringExpr): BlobExpr` | Download object from S3 | `Storage.S3.getObject(config, "file.txt")` |
| `deleteObject(config: Expr<S3ConfigType>, key: StringExpr): NullExpr` | Delete object from S3 | `Storage.S3.deleteObject(config, "file.txt")` |
| `headObject(config: Expr<S3ConfigType>, key: StringExpr): Expr<S3ObjectMetadataType>` | Get object metadata | `Storage.S3.headObject(config, "file.txt")` |
| `listObjects(config: Expr<S3ConfigType>, prefix: StringExpr, maxKeys: IntegerExpr): Expr<S3ListResultType>` | List objects in bucket | `Storage.S3.listObjects(config, "uploads/", 100n)` |
| `presignUrl(config: Expr<S3ConfigType>, key: StringExpr, expiresIn: IntegerExpr): StringExpr` | Generate pre-signed URL | `Storage.S3.presignUrl(config, "file.txt", 3600n)` |

**Types:**

Access types via `Storage.S3.Types`:
```typescript
Storage.S3.Types.Config           // StructType({ region, bucket, accessKeyId?, secretAccessKey?, endpoint? })
Storage.S3.Types.ObjectMetadata   // StructType({ key, size, lastModified, contentType?, etag? })
Storage.S3.Types.ListResult       // StructType({ objects, isTruncated, continuationToken? })
```

**Example:**
```typescript
import { East, StringType, BlobType, NullType } from "@elaraai/east";
import { Storage } from "@elaraai/east-node-io";

const uploadAndShare = East.function([StringType, BlobType], StringType, ($, filename, data) => {
    const config = $.let({
        region: "us-east-1",
        bucket: "my-bucket",
        accessKeyId: East.variant('none', null),
        secretAccessKey: East.variant('none', null),
        endpoint: East.variant('none', null),
    });

    // Upload file
    $(Storage.S3.putObject(config, filename, data));

    // Generate pre-signed URL valid for 1 hour
    const url = $.let(Storage.S3.presignUrl(config, filename, 3600n));

    return $.return(url);
});

const compiled = East.compileAsync(uploadAndShare.toIR(), Storage.S3.Implementation);
const shareUrl = await compiled("report.pdf", pdfData);
```

---

### File Transfer

#### FTP

**Import:**
```typescript
import { Transfer } from "@elaraai/east-node-io";
```

**Functions:**
| Signature | Description | Example |
|-----------|-------------|---------|
| `connect(config: Expr<FtpConfigType>): StringExpr` | Connect to FTP server | `Transfer.FTP.connect(config)` |
| `put(handle: StringExpr, localPath: StringExpr, remotePath: StringExpr): NullExpr` | Upload file to FTP | `Transfer.FTP.put(conn, "./local.txt", "/remote.txt")` |
| `get(handle: StringExpr, remotePath: StringExpr, localPath: StringExpr): NullExpr` | Download file from FTP | `Transfer.FTP.get(conn, "/remote.txt", "./local.txt")` |
| `list(handle: StringExpr, remotePath: StringExpr): ArrayExpr<StringType>` | List directory contents | `Transfer.FTP.list(conn, "/uploads")` |
| `delete(handle: StringExpr, remotePath: StringExpr): NullExpr` | Delete file from FTP | `Transfer.FTP.delete(conn, "/old.txt")` |
| `close(handle: StringExpr): NullExpr` | Close FTP connection | `Transfer.FTP.close(conn)` |

**Types:**

Access types via `Transfer.FTP.Types`:
```typescript
Transfer.FTP.Types.Config     // StructType({ host, port?, user?, password?, secure? })
```

**Example:**
```typescript
import { East, StringType, NullType } from "@elaraai/east";
import { Transfer } from "@elaraai/east-node-io";

const uploadToFTP = East.function([StringType], NullType, ($, filename) => {
    const config = $.let({
        host: "ftp.example.com",
        port: East.variant('none', null),
        user: East.variant('some', "ftpuser"),
        password: East.variant('some', "secret"),
        secure: false,
    });

    const conn = $.let(Transfer.FTP.connect(config));
    $(Transfer.FTP.put(conn, filename, East.str`/uploads/${filename}`));
    $(Transfer.FTP.close(conn));

    return $.return(null);
});

const compiled = East.compileAsync(uploadToFTP.toIR(), Transfer.FTP.Implementation);
await compiled("data.csv");
```

---

#### SFTP

**Import:**
```typescript
import { Transfer } from "@elaraai/east-node-io";
```

**Functions:**
| Signature | Description | Example |
|-----------|-------------|---------|
| `connect(config: Expr<SftpConfigType>): StringExpr` | Connect to SFTP server | `Transfer.SFTP.connect(config)` |
| `put(handle: StringExpr, localPath: StringExpr, remotePath: StringExpr): NullExpr` | Upload file to SFTP | `Transfer.SFTP.put(conn, "./local.txt", "/remote.txt")` |
| `get(handle: StringExpr, remotePath: StringExpr, localPath: StringExpr): NullExpr` | Download file from SFTP | `Transfer.SFTP.get(conn, "/remote.txt", "./local.txt")` |
| `list(handle: StringExpr, remotePath: StringExpr): ArrayExpr<StringType>` | List directory contents | `Transfer.SFTP.list(conn, "/uploads")` |
| `delete(handle: StringExpr, remotePath: StringExpr): NullExpr` | Delete file from SFTP | `Transfer.SFTP.delete(conn, "/old.txt")` |
| `close(handle: StringExpr): NullExpr` | Close SFTP connection | `Transfer.SFTP.close(conn)` |

**Types:**

Access types via `Transfer.SFTP.Types`:
```typescript
Transfer.SFTP.Types.Config    // StructType({ host, port?, username, password?, privateKey? })
```

**Example:**
```typescript
import { East, StringType, NullType } from "@elaraai/east";
import { Transfer } from "@elaraai/east-node-io";

const downloadFromSFTP = East.function([StringType, StringType], NullType, ($, remotePath, localPath) => {
    const config = $.let({
        host: "sftp.example.com",
        port: East.variant('none', null),
        username: "sftpuser",
        password: East.variant('some', "secret"),
        privateKey: East.variant('none', null),
    });

    const conn = $.let(Transfer.SFTP.connect(config));
    $(Transfer.SFTP.get(conn, remotePath, localPath));
    $(Transfer.SFTP.close(conn));

    return $.return(null);
});

const compiled = East.compileAsync(downloadFromSFTP.toIR(), Transfer.SFTP.Implementation);
await compiled("/remote/data.csv", "./local/data.csv");
```

---

### NoSQL Databases

#### Redis

**Import:**
```typescript
import { NoSQL } from "@elaraai/east-node-io";
```

**Functions:**
| Signature | Description | Example |
|-----------|-------------|---------|
| `connect(config: Expr<RedisConfigType>): StringExpr` | Connect to Redis server | `NoSQL.Redis.connect(config)` |
| `get(handle: StringExpr, key: StringExpr): Expr<OptionType(StringType)>` | Get value by key | `NoSQL.Redis.get(conn, "user:123")` |
| `set(handle: StringExpr, key: StringExpr, value: StringExpr): NullExpr` | Set key to value | `NoSQL.Redis.set(conn, "user:123", data)` |
| `setex(handle: StringExpr, key: StringExpr, seconds: IntegerExpr, value: StringExpr): NullExpr` | Set key with expiration | `NoSQL.Redis.setex(conn, "session:abc", 3600n, token)` |
| `del(handle: StringExpr, key: StringExpr): NullExpr` | Delete key | `NoSQL.Redis.del(conn, "user:123")` |
| `close(handle: StringExpr): NullExpr` | Close Redis connection | `NoSQL.Redis.close(conn)` |

**Types:**

Access types via `NoSQL.Redis.Types`:
```typescript
NoSQL.Redis.Types.Config      // StructType({ host, port, password?, db?, keyPrefix? })
```

**Example:**
```typescript
import { East, StringType, OptionType, NullType } from "@elaraai/east";
import { NoSQL } from "@elaraai/east-node-io";

const cacheUserData = East.function([StringType, StringType], NullType, ($, userId, data) => {
    const config = $.let({
        host: "localhost",
        port: 6379n,
        password: East.variant('none', null),
        db: East.variant('none', null),
        keyPrefix: East.variant('some', "user:"),
    });

    const conn = $.let(NoSQL.Redis.connect(config));

    // Cache data with 1 hour expiration
    $(NoSQL.Redis.setex(conn, userId, 3600n, data));

    $(NoSQL.Redis.close(conn));
    return $.return(null);
});

const compiled = East.compileAsync(cacheUserData.toIR(), NoSQL.Redis.Implementation);
await compiled("123", JSON.stringify({ name: "Alice", email: "alice@example.com" }));
```

---

#### MongoDB

**Import:**
```typescript
import { NoSQL } from "@elaraai/east-node-io";
```

**Functions:**
| Signature | Description | Example |
|-----------|-------------|---------|
| `connect(config: Expr<MongoConfigType>): StringExpr` | Connect to MongoDB | `NoSQL.MongoDB.connect(config)` |
| `insertOne(handle: StringExpr, collection: StringExpr, document: StringExpr): StringExpr` | Insert document | `NoSQL.MongoDB.insertOne(conn, "users", jsonDoc)` |
| `findOne(handle: StringExpr, collection: StringExpr, filter: StringExpr): Expr<OptionType(StringType)>` | Find one document | `NoSQL.MongoDB.findOne(conn, "users", '{"id": 123}')` |
| `find(handle: StringExpr, collection: StringExpr, filter: StringExpr, limit: IntegerExpr): ArrayExpr<StringType>` | Find documents | `NoSQL.MongoDB.find(conn, "users", '{}', 10n)` |
| `updateOne(handle: StringExpr, collection: StringExpr, filter: StringExpr, update: StringExpr): BooleanExpr` | Update document | `NoSQL.MongoDB.updateOne(conn, "users", filter, update)` |
| `deleteOne(handle: StringExpr, collection: StringExpr, filter: StringExpr): BooleanExpr` | Delete document | `NoSQL.MongoDB.deleteOne(conn, "users", '{"id": 123}')` |
| `close(handle: StringExpr): NullExpr` | Close MongoDB connection | `NoSQL.MongoDB.close(conn)` |

**Types:**

Access types via `NoSQL.MongoDB.Types`:
```typescript
NoSQL.MongoDB.Types.Config        // StructType({ uri, database, collection })
NoSQL.MongoDB.Types.BsonDocument  // DictType(String -> BsonValueType)
```

**Example:**
```typescript
import { East, StringType, NullType } from "@elaraai/east";
import { NoSQL } from "@elaraai/east-node-io";

const storeUser = East.function([StringType, StringType], StringType, ($, username, email) => {
    const config = $.let({
        uri: "mongodb://localhost:27017",
        database: "myapp",
        collection: "users",
    });

    const conn = $.let(NoSQL.MongoDB.connect(config));

    // Create BSON document
    const document = $.let(new Map([
        ["username", East.variant('String', username)],
        ["email", East.variant('String', email)],
    ]), NoSQL.MongoDB.Types.BsonDocument);

    // Insert user document and get ID
    const insertedId = $.let(NoSQL.MongoDB.insertOne(conn, document));

    $(NoSQL.MongoDB.close(conn));
    return $.return(insertedId);
});

const compiled = East.compileAsync(storeUser.toIR(), NoSQL.MongoDB.Implementation);
const id = await compiled("alice", "alice@example.com");  // "507f1f77bcf86cd799439011"
```

---

### File Formats

#### XLSX (Excel)

**Import:**
```typescript
import { Format } from "@elaraai/east-node-io";
```

**Functions:**
| Signature | Description | Example |
|-----------|-------------|---------|
| `read(blob: BlobExpr, options: Expr<XlsxReadOptionsType>): Expr<XlsxSheetType>` | Read XLSX file | `Format.XLSX.read(xlsxBlob, options)` |
| `write(data: Expr<XlsxSheetType>, options: Expr<XlsxWriteOptionsType>): BlobExpr` | Write XLSX file | `Format.XLSX.write(sheetData, options)` |
| `info(blob: BlobExpr): Expr<XlsxInfoType>` | Get XLSX metadata | `Format.XLSX.info(xlsxBlob)` |

**Types:**

Access types via `Format.XLSX.Types`:
```typescript
Format.XLSX.Types.Cell          // LiteralValueType
Format.XLSX.Types.Row           // ArrayType(XlsxCellType)
Format.XLSX.Types.Sheet         // ArrayType(XlsxRowType)
Format.XLSX.Types.ReadOptions   // StructType({ sheetName? })
Format.XLSX.Types.WriteOptions  // StructType({ sheetName? })
Format.XLSX.Types.SheetInfo     // StructType({ name, rowCount, columnCount })
Format.XLSX.Types.Info          // StructType({ sheets })
```

**Example:**
```typescript
import { East, BlobType, IntegerType } from "@elaraai/east";
import { Format } from "@elaraai/east-node-io";

const countRowsInExcel = East.function([BlobType], IntegerType, ($, xlsxBlob) => {
    const options = $.let({
        sheetName: East.variant('none', null),
    });

    const sheet = $.let(Format.XLSX.read(xlsxBlob, options));
    return $.return(sheet.size());
});

const compiled = East.compile(countRowsInExcel.toIR(), Format.XLSX.Implementation);
const rowCount = compiled(xlsxBlob);  // e.g., 100n
```

---

#### CSV

**Import:**
```typescript
import { Format } from "@elaraai/east-node-io";
```

**Functions:**
| Signature | Description | Example |
|-----------|-------------|---------|
| `parse(blob: BlobExpr, config: Expr<CsvParseConfigType>): Expr<CsvDataType>` | Parse CSV to array of rows | `Format.CSV.parse(csvBlob, config)` |
| `serialize(data: Expr<CsvDataType>, config: Expr<CsvSerializeConfigType>): BlobExpr` | Serialize rows to CSV | `Format.CSV.serialize(rows, config)` |

**Types:**

Access types via `Format.CSV.Types`:
```typescript
Format.CSV.Types.Row             // DictType(String -> OptionType(StringType))
Format.CSV.Types.Data            // ArrayType(CsvRowType)
Format.CSV.Types.ParseConfig     // StructType({ delimiter?, quoteChar?, escapeChar?, newline?, hasHeader, nullString?, skipEmptyLines, trimFields })
Format.CSV.Types.SerializeConfig // StructType({ delimiter, quoteChar, escapeChar, newline, includeHeader, nullString, alwaysQuote })
```

**Example:**
```typescript
import { East, BlobType, IntegerType } from "@elaraai/east";
import { Format } from "@elaraai/east-node-io";

const countCSVRows = East.function([BlobType], IntegerType, ($, csvBlob) => {
    const config = $.let({
        delimiter: East.variant('none', null),
        quoteChar: East.variant('none', null),
        escapeChar: East.variant('none', null),
        newline: East.variant('none', null),
        hasHeader: true,
        nullString: East.variant('none', null),
        skipEmptyLines: true,
        trimFields: false,
    });

    const data = $.let(Format.CSV.parse(csvBlob, config));
    return $.return(data.size());
});

const compiled = East.compile(countCSVRows.toIR(), Format.CSV.Implementation);
const rowCount = compiled(csvBlob);  // e.g., 50n
```

---

#### XML

**Import:**
```typescript
import { Format } from "@elaraai/east-node-io";
```

**Functions:**
| Signature | Description | Example |
|-----------|-------------|---------|
| `parse(blob: BlobExpr, config: Expr<XmlParseConfigType>): Expr<XmlNodeType>` | Parse XML to tree structure | `Format.XML.parse(xmlBlob, config)` |
| `serialize(node: Expr<XmlNodeType>, config: Expr<XmlSerializeConfigType>): BlobExpr` | Serialize tree to XML | `Format.XML.serialize(xmlNode, config)` |

**Types:**

Access types via `Format.XML.Types`:
```typescript
Format.XML.Types.Node              // RecursiveType StructType({ tag, attributes, children })
Format.XML.Types.ParseConfig       // StructType({ preserveWhitespace, decodeEntities })
Format.XML.Types.SerializeConfig   // StructType({ indent?, includeXmlDeclaration, encodeEntities, selfClosingTags })
```

**Example:**
```typescript
import { East, BlobType, StringType } from "@elaraai/east";
import { Format } from "@elaraai/east-node-io";

const extractXMLTag = East.function([BlobType], StringType, ($, xmlBlob) => {
    const config = $.let({
        preserveWhitespace: false,
        decodeEntities: true,
    });

    const doc = $.let(Format.XML.parse(xmlBlob, config));
    return $.return(doc.tag);
});

const compiled = East.compile(extractXMLTag.toIR(), Format.XML.Implementation);
const tagName = compiled(xmlBlob);  // e.g., "book"
```

---

### Compression

#### Gzip

**Import:**
```typescript
import { Compression } from "@elaraai/east-node-io";
```

**Functions:**
| Signature | Description | Example |
|-----------|-------------|---------|
| `compress(data: BlobExpr, options: Expr<GzipOptionsType>): BlobExpr` | Compress data using gzip | `Compression.Gzip.compress(data, options)` |
| `decompress(data: BlobExpr): BlobExpr` | Decompress gzip data | `Compression.Gzip.decompress(compressed)` |

**Types:**

Access types via `Compression.Gzip.Types`:
```typescript
Compression.Gzip.Types.Level      // IntegerType (0-9)
Compression.Gzip.Types.Options    // StructType({ level? })
```

**Example:**
```typescript
import { East, BlobType, StringType } from "@elaraai/east";
import { Compression } from "@elaraai/east-node-io";

const compressAndDecompress = East.function([StringType], StringType, ($, text) => {
    const data = $.let(text.encodeUtf8());
    const options = $.let({
        level: East.variant('some', 9n),
    });

    // Compress the data
    const compressed = $.let(Compression.Gzip.compress(data, options));

    // Decompress it back
    const decompressed = $.let(Compression.Gzip.decompress(compressed));
    const result = $.let(decompressed.decodeUtf8());

    return $.return(result);
});

const compiled = East.compileAsync(compressAndDecompress.toIR(), Compression.Gzip.Implementation);
await compiled("Hello, World!");  // "Hello, World!"
```

---

#### Zip

**Import:**
```typescript
import { Compression } from "@elaraai/east-node-io";
```

**Functions:**
| Signature | Description | Example |
|-----------|-------------|---------|
| `compress(entries: Expr<ZipEntriesType>, options: Expr<ZipOptionsType>): BlobExpr` | Create ZIP archive | `Compression.Zip.compress(entries, options)` |
| `decompress(data: BlobExpr): Expr<ZipExtractedType>` | Extract ZIP archive | `Compression.Zip.decompress(zipBlob)` |

**Types:**

Access types via `Compression.Zip.Types`:
```typescript
Compression.Zip.Types.Level       // IntegerType (0-9)
Compression.Zip.Types.Options     // StructType({ level? })
Compression.Zip.Types.Entry       // StructType({ name, data })
Compression.Zip.Types.Entries     // ArrayType(ZipEntryType)
Compression.Zip.Types.Extracted   // DictType(String -> Blob)
```

**Example:**
```typescript
import { East, BlobType, StringType, DictType } from "@elaraai/east";
import { Compression } from "@elaraai/east-node-io";

const createAndExtractZip = East.function([StringType, StringType], DictType(StringType, BlobType), ($, file1, file2) => {
    // Create entries array
    const entries = $.let([
        { name: "file1.txt", data: file1.encodeUtf8() },
        { name: "file2.txt", data: file2.encodeUtf8() },
    ]);

    const options = $.let({
        level: East.variant('some', 9n),
    });

    // Create ZIP archive
    const zipBlob = $.let(Compression.Zip.compress(entries, options));

    // Extract ZIP archive
    const files = $.let(Compression.Zip.decompress(zipBlob));

    return $.return(files);
});

const compiled = East.compileAsync(createAndExtractZip.toIR(), Compression.Zip.Implementation);
const extracted = await compiled("Hello", "World");  // {"file1.txt": <Blob>, "file2.txt": <Blob>}
```

---

#### Tar

**Import:**
```typescript
import { Compression } from "@elaraai/east-node-io";
```

**Functions:**
| Signature | Description | Example |
|-----------|-------------|---------|
| `create(entries: Expr<TarEntriesType>): BlobExpr` | Create TAR archive | `Compression.Tar.create(entries)` |
| `extract(data: BlobExpr): Expr<TarExtractedType>` | Extract TAR archive | `Compression.Tar.extract(tarBlob)` |

**Types:**

Access types via `Compression.Tar.Types`:
```typescript
Compression.Tar.Types.Entry       // StructType({ name, data })
Compression.Tar.Types.Entries     // ArrayType(TarEntryType)
Compression.Tar.Types.Extracted   // DictType(String -> Blob)
```

**Example:**
```typescript
import { East, BlobType, StringType, DictType } from "@elaraai/east";
import { Compression } from "@elaraai/east-node-io";

const createAndExtractTar = East.function([StringType, StringType], DictType(StringType, BlobType), ($, file1, file2) => {
    // Create entries array
    const entries = $.let([
        { name: "file1.txt", data: file1.encodeUtf8() },
        { name: "file2.txt", data: file2.encodeUtf8() },
    ]);

    // Create TAR archive
    const tarBlob = $.let(Compression.Tar.create(entries));

    // Extract TAR archive
    const files = $.let(Compression.Tar.extract(tarBlob));

    return $.return(files);
});

const compiled = East.compileAsync(createAndExtractTar.toIR(), Compression.Tar.Implementation);
const extracted = await compiled("Hello", "World");  // {"file1.txt": <Blob>, "file2.txt": <Blob>}
```

---

