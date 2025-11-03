# East Node Usage Guide

Usage guide for East Node.js platform functions.

---

## Table of Contents

- [Quick Start](#quick-start)
- [Platform Functions](#platform-functions)
  - [Console I/O](#console-io)
  - [File System](#file-system)
  - [HTTP Client (Fetch)](#http-client-fetch)
  - [Cryptography](#cryptography)
  - [Time Operations](#time-operations)
  - [Path Manipulation](#path-manipulation)
  - [Data Formats](#data-formats)
- [Testing](#testing)
- [Error Handling](#error-handling)

---

## Quick Start

```typescript
import { East, StringType, NullType } from "@elaraai/east";
import { NodePlatform, Console, FileSystem } from "@elaraai/east-node";

// Define East function using platform functions
const processFile = East.function(
    [StringType],
    NullType,
    ($, path) => {
        const content = $.let(FileSystem.readFile(path));
        $(Console.log(content));
    }
);

// Compile with NodePlatform (includes all platform functions)
const compiled = processFile.toIR().compile(NodePlatform);
await compiled("input.txt");

// Or compile with specific modules only
import { ConsoleImpl, FileSystemImpl } from "@elaraai/east-node";
const compiled2 = processFile.toIR().compile([...ConsoleImpl, ...FileSystemImpl]);
```

---

## Platform Functions

### Console I/O

**Import:**
```typescript
import { Console, ConsoleImpl } from "@elaraai/east-node";
```

**Functions:**
| Signature | Description | Example |
|-----------|-------------|---------|
| `log(message: StringExpr \| string): NullExpr` | Write to stdout with newline | `Console.log("Hello")` |
| `error(message: StringExpr \| string): NullExpr` | Write to stderr with newline | `Console.error("Error!")` |
| `write(message: StringExpr \| string): NullExpr` | Write to stdout without newline | `Console.write("Loading...")` |

**Example:**
```typescript
const greet = East.function([StringType], NullType, ($, name) => {
    $(Console.log(East.str`Hello, ${name}!`));
});
```

---

### File System

**Import:**
```typescript
import { FileSystem, FileSystemImpl } from "@elaraai/east-node";
```

**Functions:**
| Signature | Description | Example |
|-----------|-------------|---------|
| `readFile(path: StringExpr \| string): StringExpr` | Read file as UTF-8 string | `FileSystem.readFile("data.txt")` |
| `writeFile(path: StringExpr \| string, content: StringExpr \| string): NullExpr` | Write string to file (overwrites) | `FileSystem.writeFile("out.txt", data)` |
| `appendFile(path: StringExpr \| string, content: StringExpr \| string): NullExpr` | Append string to file | `FileSystem.appendFile("log.txt", entry)` |
| `deleteFile(path: StringExpr \| string): NullExpr` | Delete a file | `FileSystem.deleteFile("temp.txt")` |
| `exists(path: StringExpr \| string): BooleanExpr` | Check if path exists | `FileSystem.exists("config.json")` |
| `isFile(path: StringExpr \| string): BooleanExpr` | Check if path is a file | `FileSystem.isFile("data.txt")` |
| `isDirectory(path: StringExpr \| string): BooleanExpr` | Check if path is a directory | `FileSystem.isDirectory("src")` |
| `createDirectory(path: StringExpr \| string): NullExpr` | Create directory (recursive) | `FileSystem.createDirectory("out/reports")` |
| `readDirectory(path: StringExpr \| string): ArrayExpr<StringType>` | List directory contents | `FileSystem.readDirectory("src")` |
| `readFileBytes(path: StringExpr \| string): BlobExpr` | Read file as binary data | `FileSystem.readFileBytes("image.png")` |
| `writeFileBytes(path: StringExpr \| string, content: BlobExpr \| Uint8Array): NullExpr` | Write binary data to file | `FileSystem.writeFileBytes("out.bin", data)` |

**Example:**
```typescript
const copyFile = East.function([StringType, StringType], NullType, ($, src, dest) => {
    const content = $.let(FileSystem.readFile(src));
    $(FileSystem.writeFile(dest, content));
    $(Console.log(East.str`Copied ${src} to ${dest}`));
});
```

---

### HTTP Client (Fetch)

**Import:**
```typescript
import { Fetch, FetchImpl, FetchRequestConfig, FetchMethod } from "@elaraai/east-node";
```

**Functions:**
| Signature | Description | Example |
|-----------|-------------|---------|
| `get(url: StringExpr \| string): StringExpr` | HTTP GET request, returns body | `Fetch.get("https://api.example.com/data")` |
| `post(url: StringExpr \| string, body: StringExpr \| string): StringExpr` | HTTP POST request, returns body | `Fetch.post(url, jsonData)` |
| `request(config: Expr<FetchRequestConfig>): Expr<FetchResponse>` | Custom HTTP request | `Fetch.request(config)` |

**Types:**
```typescript
FetchMethod = VariantType({ GET, POST, PUT, DELETE, PATCH, HEAD, OPTIONS })
FetchRequestConfig = StructType({ url, method, headers, body })
FetchResponse = StructType({ status, statusText, headers, body, ok })
```

**Example:**
```typescript
const fetchData = East.function([], StringType, $ => {
    const data = $.let(Fetch.get("https://api.example.com/users"));
    $(Console.log(East.str`Received: ${data}`));
    return data;
});
```

---

### Cryptography

**Import:**
```typescript
import { Crypto, CryptoImpl } from "@elaraai/east-node";
```

**Functions:**
| Signature | Description | Example |
|-----------|-------------|---------|
| `randomBytes(length: IntegerExpr \| bigint): BlobExpr` | Generate secure random bytes | `Crypto.randomBytes(32n)` |
| `hashSha256(data: StringExpr \| string): StringExpr` | SHA-256 hash (hex string) | `Crypto.hashSha256(password)` |
| `hashSha256Bytes(data: BlobExpr \| Uint8Array): BlobExpr` | SHA-256 hash (binary) | `Crypto.hashSha256Bytes(data)` |
| `uuid(): StringExpr` | Generate UUID v4 | `Crypto.uuid()` |

**Example:**
```typescript
const generateToken = East.function([], StringType, $ => {
    const id = $.let(Crypto.uuid());
    const random = $.let(Crypto.randomBytes(16n));
    const hash = $.let(Crypto.hashSha256(id));
    return hash;
});
```

---

### Time Operations

**Import:**
```typescript
import { Time, TimeImpl } from "@elaraai/east-node";
```

**Functions:**
| Signature | Description | Example |
|-----------|-------------|---------|
| `now(): IntegerExpr` | Get current timestamp (ms since epoch) | `Time.now()` |
| `sleep(ms: IntegerExpr \| bigint): NullExpr` | Sleep for milliseconds (async) | `Time.sleep(1000n)` |

**Example:**
```typescript
const measureTime = East.function([], IntegerType, $ => {
    const start = $.let(Time.now());
    $(Time.sleep(1000n));
    const end = $.let(Time.now());
    return end.subtract(start);
});
```

---

### Path Manipulation

**Import:**
```typescript
import { Path, PathImpl } from "@elaraai/east-node";
```

**Functions:**
| Signature | Description | Example |
|-----------|-------------|---------|
| `join(segments: ArrayExpr<StringType> \| string[]): StringExpr` | Join path segments | `Path.join(["dir", "file.txt"])` |
| `resolve(path: StringExpr \| string): StringExpr` | Resolve to absolute path | `Path.resolve("../data")` |
| `dirname(path: StringExpr \| string): StringExpr` | Get directory name | `Path.dirname("/home/user/file.txt")` |
| `basename(path: StringExpr \| string): StringExpr` | Get file name | `Path.basename("/home/user/file.txt")` |
| `extname(path: StringExpr \| string): StringExpr` | Get file extension | `Path.extname("file.txt")` |

**Example:**
```typescript
const processPath = East.function([StringType], StringType, ($, filepath) => {
    const dir = $.let(Path.dirname(filepath));
    const name = $.let(Path.basename(filepath));
    const ext = $.let(Path.extname(filepath));
    return East.str`Dir: ${dir}, Name: ${name}, Ext: ${ext}`;
});
```

---

### Data Formats

**Import:**
```typescript
import { Format, FormatImpl, csv_parse, csv_serialize, xml_parse, xml_serialize } from "@elaraai/east-node";
// Or individual: import { CsvParseConfig, CsvSerializeConfig, XmlNode, etc. } from "@elaraai/east-node";
```

#### CSV Functions

| Signature | Description | Example |
|-----------|-------------|---------|
| `csv_parse(blob: BlobExpr, config: Expr<CsvParseConfig>): Expr<CsvDataType>` | Parse CSV from binary data | `csv_parse(data, config)` |
| `csv_serialize(data: Expr<CsvDataType>, config: Expr<CsvSerializeConfig>): BlobExpr` | Serialize to CSV binary | `csv_serialize(rows, config)` |

**Types:**
```typescript
CsvParseConfig = StructType({ delimiter, quoteChar, escapeChar, newline, hasHeader, nullString, skipEmptyLines, trimFields })
CsvSerializeConfig = StructType({ delimiter, quoteChar, escapeChar, newline, nullString })
CsvRowType = DictType(StringType, OptionType(StringType))
CsvDataType = ArrayType(CsvRowType)
```

#### XML Functions

| Signature | Description | Example |
|-----------|-------------|---------|
| `xml_parse(blob: BlobExpr, config: Expr<XmlParseConfig>): Expr<XmlNode>` | Parse XML from binary data | `xml_parse(data, config)` |
| `xml_serialize(node: Expr<XmlNode>, config: Expr<XmlSerializeConfig>): BlobExpr` | Serialize to XML binary | `xml_serialize(tree, config)` |

**Types:**
```typescript
XmlParseConfig = StructType({ preserveWhitespace, decodeEntities })
XmlSerializeConfig = StructType({ indent, newline })
XmlChild = VariantType({ TEXT: StringType, ELEMENT: XmlNode })
XmlNode = RecursiveType(StructType({ tag, attributes, children: ArrayType(XmlChild) }))
```

**Example:**
```typescript
const parseCSV = East.function([BlobType], ArrayType(DictType(StringType, OptionType(StringType))), ($, csvData) => {
    const config = East.value({
        delimiter: variant("some", ","),
        quoteChar: variant("some", "\""),
        escapeChar: variant("some", "\""),
        newline: variant("none", null),
        hasHeader: true,
        nullString: variant("some", ""),
        skipEmptyLines: true,
        trimFields: false,
    }, CsvParseConfig);

    return csv_parse(csvData, config);
});
```

---

## Testing

**Import:**
```typescript
import { describeEast, assertEast } from "@elaraai/east-node";
```

**Test Framework:**
```typescript
await describeEast("Test Suite Name", (test) => {
    test("test case description", $ => {
        const result = $.let(someExpression);
        $(assertEast.equal(result, expectedValue));
    });
});
```

**Assertions:**
| Signature | Description |
|-----------|-------------|
| `equal<T>(actual: Expr<T>, expected: Expr<T> \| ValueTypeOf<T>): NullExpr` | Assert equality |
| `notEqual<T>(actual: Expr<T>, expected: Expr<T> \| ValueTypeOf<T>): NullExpr` | Assert inequality |
| `isTrue(value: BooleanExpr): NullExpr` | Assert true |
| `isFalse(value: BooleanExpr): NullExpr` | Assert false |

**Example:**
```typescript
await describeEast("File Operations", (test) => {
    test("read and write file", $ => {
        const testData = "Hello, World!";
        $(FileSystem.writeFile("test.txt", testData));
        const result = $.let(FileSystem.readFile("test.txt"));
        $(assertEast.equal(result, testData));
        $(FileSystem.deleteFile("test.txt"));
    });
});
```

---

## Error Handling

All platform functions throw `EastError` on failure:

```typescript
import { EastError } from "@elaraai/east/internal";

try {
    const compiled = myFunction.toIR().compile(NodePlatform);
    await compiled();
} catch (err) {
    if (err instanceof EastError) {
        console.error(`East error at ${err.location.filename}:${err.location.line}`);
        console.error(err.message);
    }
}
```

**Common error patterns:**
- File operations: `ENOENT`, `EACCES`, `EISDIR`
- HTTP requests: Network errors, non-2xx status codes
- Invalid input: Type mismatches, malformed data

---

## License

Dual-licensed under AGPL-3.0 (open source) and commercial license. See [LICENSE.md](LICENSE.md).
