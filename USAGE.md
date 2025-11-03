# East Node Developer Guide

Comprehensive guide for using Node.js platform functions with the East language.

This guide covers all platform functions available in the East Node package. For the East language core documentation, see **[@elaraai/east USAGE.md](https://github.com/elaraai/East/blob/main/USAGE.md)**.

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
  - [Data Formats (CSV, XML)](#data-formats-csv-xml)
- [Testing](#testing)
- [Error Handling](#error-handling)
- [Advanced Usage](#advanced-usage)

---

## Quick Start

East Node provides platform functions that enable East programs to interact with the Node.js runtime. You can use the complete `NodePlatform` with all functions, or import individual modules for more control.

### Basic Workflow

1. **Import platform functions** from `@elaraai/east-node`
2. **Use platform functions** in your East code
3. **Compile with platform** using `compile()` or `compileAsync()`
4. **Execute** the compiled function with JavaScript values

### Complete Platform Example

```typescript
import { East, NullType, StringType } from "@elaraai/east";
import { NodePlatform, Console, FileSystem } from "@elaraai/east-node";

const processFile = East.function(
    [StringType],
    NullType,
    ($, filePath) => {
        // Read file
        const content = $.let(FileSystem.readFile(filePath));

        // Log content
        $(Console.log(content));

        // Write to new file
        $(FileSystem.writeFile("output.txt", content));
    }
);

// Compile with all Node.js platform functions
const compiled = processFile.toIR().compile(NodePlatform);
compiled("input.txt");
```

### Individual Module Example

```typescript
import { East, NullType, IntegerType } from "@elaraai/east";
import { Console, ConsoleImpl, Time, TimeImpl } from "@elaraai/east-node";

const timedGreeting = East.function([], NullType, $ => {
    const start = $.let(Time.now());
    $(Console.log("Hello from East!"));
    const end = $.let(Time.now());

    const elapsed = $.let(end.subtract(start));
    $(Console.log(East.str`Took ${elapsed}ms`));
});

// Compile with only console and time platform functions
const compiled = timedGreeting.toIR().compileAsync([...ConsoleImpl, ...TimeImpl]);
await compiled();
```

---

## Platform Functions

East Node provides six platform function modules. Each module exports:
- **Platform function definitions** (e.g., `Console.log`) - for use in East code
- **Implementation array** (e.g., `ConsoleImpl`) - for passing to `compile()`

### Console I/O

Console operations for reading from stdin and writing to stdout/stderr.

**Import:**
```typescript
import { Console, ConsoleImpl } from "@elaraai/east-node";
```

**Available Functions:**

| Function | Signature | Description |
|----------|-----------|-------------|
| `Console.log` | `(message: String) -> Null` | Write message to stdout with newline |
| `Console.error` | `(message: String) -> Null` | Write message to stderr with newline |
| `Console.write` | `(message: String) -> Null` | Write message to stdout without newline |
| `Console.readLine` | `() -> String` | Read line from stdin (async) |

**Example:**

```typescript
import { East, NullType, StringType } from "@elaraai/east";
import { Console, ConsoleImpl } from "@elaraai/east-node";

const interactiveGreeting = East.function([], NullType, $ => {
    $(Console.log("What's your name?"));
    const name = $.let(Console.readLine());
    $(Console.log(East.str`Hello, ${name}!`));
});

const compiled = interactiveGreeting.toIR().compileAsync(ConsoleImpl);
await compiled();
```

**Notes:**
- `readLine()` is async and requires `compileAsync()`
- All write operations are synchronous
- Errors are thrown as `EastError` if I/O operations fail

---

### File System

File system operations for reading/writing files and managing directories.

**Import:**
```typescript
import { FileSystem, FileSystemImpl } from "@elaraai/east-node";
```

**Available Functions:**

| Function | Signature | Description |
|----------|-----------|-------------|
| **File Operations** |
| `FileSystem.readFile` | `(path: String) -> String` | Read file as UTF-8 string |
| `FileSystem.writeFile` | `(path: String, content: String) -> Null` | Write string to file (overwrites) |
| `FileSystem.appendFile` | `(path: String, content: String) -> Null` | Append string to file |
| `FileSystem.deleteFile` | `(path: String) -> Null` | Delete a file |
| **Directory Operations** |
| `FileSystem.createDirectory` | `(path: String) -> Null` | Create directory (recursive) |
| `FileSystem.readDirectory` | `(path: String) -> Array<String>` | List directory contents |
| **File Metadata** |
| `FileSystem.exists` | `(path: String) -> Boolean` | Check if path exists |
| `FileSystem.isFile` | `(path: String) -> Boolean` | Check if path is a file |
| `FileSystem.isDirectory` | `(path: String) -> Boolean` | Check if path is a directory |
| **Binary Operations** |
| `FileSystem.readFileBytes` | `(path: String) -> Blob` | Read file as binary data |
| `FileSystem.writeFileBytes` | `(path: String, content: Blob) -> Null` | Write binary data to file |

**Example - Text Files:**

```typescript
import { East, NullType, StringType, ArrayType } from "@elaraai/east";
import { FileSystem, FileSystemImpl } from "@elaraai/east-node";

const processLogFile = East.function([StringType], NullType, ($, logPath) => {
    // Read log file
    const content = $.let(FileSystem.readFile(logPath));

    // Split into lines
    const lines = $.let(content.split("\n"));

    // Filter for errors
    const errors = $.let(lines.filter(($, line, _) =>
        line.contains("ERROR")
    ));

    // Write errors to separate file
    const errorContent = $.let(errors.join("\n"));
    $(FileSystem.writeFile("errors.log", errorContent));
});

const compiled = processLogFile.toIR().compile(FileSystemImpl);
compiled("application.log");
```

**Example - Directory Operations:**

```typescript
const backupFiles = East.function([StringType, StringType], NullType, ($, sourceDir, backupDir) => {
    // Create backup directory if it doesn't exist
    $.if(FileSystem.exists(backupDir).not(), $ => {
        $(FileSystem.createDirectory(backupDir));
    });

    // List files in source directory
    const files = $.let(FileSystem.readDirectory(sourceDir));

    // Copy each file
    $.for(files, ($, filename, _) => {
        const sourcePath = $.let(East.str`${sourceDir}/${filename}`);
        const backupPath = $.let(East.str`${backupDir}/${filename}`);

        const content = $.let(FileSystem.readFile(sourcePath));
        $(FileSystem.writeFile(backupPath, content));
    });
});
```

**Example - Binary Files:**

```typescript
const copyBinaryFile = East.function([StringType, StringType], NullType, ($, source, dest) => {
    const data = $.let(FileSystem.readFileBytes(source));
    $(FileSystem.writeFileBytes(dest, data));
});
```

**Notes:**
- All operations are synchronous
- Paths are relative to current working directory
- `createDirectory` creates parent directories automatically
- `isFile` and `isDirectory` return `false` for non-existent paths (don't throw)
- All other operations throw `EastError` on failure

---

### HTTP Client (Fetch)

HTTP client using the modern Fetch API (available in Node.js 18+).

**Import:**
```typescript
import { Fetch, FetchImpl, FetchMethod, FetchRequestConfig, FetchResponse } from "@elaraai/east-node";
```

**Available Functions:**

| Function | Signature | Description |
|----------|-----------|-------------|
| `Fetch.get` | `(url: String) -> String` | GET request, returns body as string |
| `Fetch.post` | `(url: String, body: String) -> String` | POST request with body, returns response |
| `Fetch.request` | `(config: FetchRequestConfig) -> FetchResponse` | Full control over HTTP request |

**Types:**

```typescript
// HTTP method (variant type)
FetchMethod = GET | POST | PUT | DELETE | PATCH | HEAD | OPTIONS

// Request configuration (struct type)
FetchRequestConfig = {
    url: String,
    method: FetchMethod,
    headers: Dict<String, String>,
    body: Option<String>
}

// Response (struct type)
FetchResponse = {
    status: Integer,
    statusText: String,
    headers: Dict<String, String>,
    body: String,
    ok: Boolean
}
```

**Example - Simple GET:**

```typescript
import { East, NullType, StringType } from "@elaraai/east";
import { Fetch, FetchImpl, Console, ConsoleImpl } from "@elaraai/east-node";

const fetchData = East.function([StringType], NullType, ($, url) => {
    const html = $.let(Fetch.get(url));
    $(Console.log(East.str`Fetched ${html.length()} bytes`));
});

const compiled = fetchData.toIR().compileAsync([...FetchImpl, ...ConsoleImpl]);
await compiled("https://example.com");
```

**Example - POST with JSON:**

```typescript
const postData = East.function([StringType, StringType], NullType, ($, url, jsonData) => {
    const response = $.let(Fetch.post(url, jsonData));
    $(Console.log(response));
});

const compiled = postData.toIR().compileAsync([...FetchImpl, ...ConsoleImpl]);
await compiled("https://api.example.com/data", '{"name": "John"}');
```

**Example - Advanced Request:**

```typescript
import { variant } from "@elaraai/east";

const apiRequest = East.function([StringType], NullType, ($, apiUrl) => {
    // Build request config
    const headers = $.let(new Map([
        ["Content-Type", "application/json"],
        ["Authorization", "Bearer token123"]
    ]));

    const config = $.let({
        url: apiUrl,
        method: variant("POST", null),
        headers: headers,
        body: variant("some", '{"query": "data"}')
    }, FetchRequestConfig);

    // Make request
    const response = $.let(Fetch.request(config));

    // Check response
    $.if(response.ok, $ => {
        $(Console.log(East.str`Success: ${response.body}`));
    }).else($ => {
        $(Console.error(East.str`Error ${response.status}: ${response.statusText}`));
    });
});
```

**Notes:**
- All fetch operations are async and require `compileAsync()`
- `get()` and `post()` throw `EastError` on HTTP errors (non-2xx status)
- `request()` returns full response object including status - doesn't throw on HTTP errors
- Response headers are returned as a `Dict<String, String>` (Map)

---

### Cryptography

Cryptographic operations using Node.js crypto module.

**Import:**
```typescript
import { Crypto, CryptoImpl } from "@elaraai/east-node";
```

**Available Functions:**

| Function | Signature | Description |
|----------|-----------|-------------|
| `Crypto.randomBytes` | `(length: Integer) -> Blob` | Generate cryptographically secure random bytes |
| `Crypto.hashSha256` | `(data: String) -> String` | SHA-256 hash of string (hex output) |
| `Crypto.hashSha256Bytes` | `(data: Blob) -> Blob` | SHA-256 hash of binary data (binary output) |
| `Crypto.uuid` | `() -> String` | Generate UUID v4 |

**Example - Generate Random Token:**

```typescript
import { East, NullType, StringType } from "@elaraai/east";
import { Crypto, CryptoImpl } from "@elaraai/east-node";

const generateToken = East.function([], StringType, $ => {
    const bytes = $.let(Crypto.randomBytes(32n));
    const hex = $.let(bytes.toHexString());
    $.return(hex);
});

const compiled = generateToken.toIR().compile(CryptoImpl);
const token = compiled();  // Returns 64-character hex string
```

**Example - Hash Password:**

```typescript
const hashPassword = East.function([StringType], StringType, ($, password) => {
    const hash = $.let(Crypto.hashSha256(password));
    $.return(hash);
});

const compiled = hashPassword.toIR().compile(CryptoImpl);
const hashed = compiled("mypassword");
// Returns: "89e01536ac207279409d4de1e5253e01f4a1769e696db0d6062ca9b8f56767c8"
```

**Example - Generate Unique IDs:**

```typescript
import { ArrayType } from "@elaraai/east";

const generateIds = East.function([IntegerType], ArrayType(StringType), ($, count) => {
    const ids = $.let([], ArrayType(StringType));

    $.for(East.range(0n, count), ($, i, _) => {
        const id = $.let(Crypto.uuid());
        $(ids.push(id));
    });

    $.return(ids);
});

const compiled = generateIds.toIR().compile(CryptoImpl);
const ids = compiled(5n);
// Returns array of 5 UUIDs like ["550e8400-e29b-41d4-a716-446655440000", ...]
```

**Notes:**
- All operations are synchronous
- `randomBytes` uses cryptographically secure random number generator
- SHA-256 always produces 32-byte (256-bit) output
- UUID v4 uses random data (not MAC address based)

---

### Time Operations

Time-related operations for timestamps and delays.

**Import:**
```typescript
import { Time, TimeImpl } from "@elaraai/east-node";
```

**Available Functions:**

| Function | Signature | Description |
|----------|-----------|-------------|
| `Time.now` | `() -> Integer` | Current Unix timestamp in milliseconds |
| `Time.sleep` | `(ms: Integer) -> Null` | Sleep for specified milliseconds (async) |

**Example - Measure Execution Time:**

```typescript
import { East, NullType } from "@elaraai/east";
import { Time, TimeImpl, Console, ConsoleImpl } from "@elaraai/east-node";

const timedOperation = East.function([], NullType, $ => {
    const start = $.let(Time.now());

    // Do some work
    $(Console.log("Working..."));
    $(Time.sleep(1000n));  // Sleep for 1 second

    const end = $.let(Time.now());
    const elapsed = $.let(end.subtract(start));

    $(Console.log(East.str`Took ${elapsed}ms`));
});

const compiled = timedOperation.toIR().compileAsync([...TimeImpl, ...ConsoleImpl]);
await compiled();  // Logs: "Working..." then "Took 1000ms" (approximately)
```

**Example - Polling Loop:**

```typescript
const pollUntilReady = East.function([IntegerType], NullType, ($, maxAttempts) => {
    const attempts = $.let(0n);

    $.while(attempts.less(maxAttempts), $ => {
        $(Console.log(East.str`Attempt ${attempts.add(1n)}...`));

        // Check if ready (placeholder)
        const ready = $.let(false);  // Replace with actual check

        $.if(ready, $ => {
            $(Console.log("Ready!"));
            $.break();
        }).else($ => {
            $(Time.sleep(500n));  // Wait 500ms before retry
            $.assign(attempts, attempts.add(1n));
        });
    });
});
```

**Notes:**
- `now()` returns milliseconds since Unix epoch (January 1, 1970 UTC)
- `now()` is synchronous
- `sleep()` is async and requires `compileAsync()`
- `sleep()` pauses execution - doesn't block the event loop

---

### Path Manipulation

Cross-platform path manipulation utilities.

**Import:**
```typescript
import { Path, PathImpl } from "@elaraai/east-node";
```

**Available Functions:**

| Function | Signature | Description |
|----------|-----------|-------------|
| `Path.join` | `(segments: Array<String>) -> String` | Join path segments |
| `Path.resolve` | `(path: String) -> String` | Resolve to absolute path |
| `Path.dirname` | `(path: String) -> String` | Get directory name |
| `Path.basename` | `(path: String) -> String` | Get file name |
| `Path.extname` | `(path: String) -> String` | Get file extension (includes dot) |

**Example - Build File Paths:**

```typescript
import { East, StringType, ArrayType } from "@elaraai/east";
import { Path, PathImpl } from "@elaraai/east-node";

const buildPath = East.function([ArrayType(StringType)], StringType, ($, segments) => {
    const joined = $.let(Path.join(segments));
    const absolute = $.let(Path.resolve(joined));
    $.return(absolute);
});

const compiled = buildPath.toIR().compile(PathImpl);
const path = compiled(["data", "files", "config.json"]);
// Returns: "/absolute/path/to/data/files/config.json"
```

**Example - Parse File Path:**

```typescript
const parseFilePath = East.function([StringType], NullType, ($, filePath) => {
    const dir = $.let(Path.dirname(filePath));
    const name = $.let(Path.basename(filePath));
    const ext = $.let(Path.extname(filePath));

    $(Console.log(East.str`Directory: ${dir}`));
    $(Console.log(East.str`Filename: ${name}`));
    $(Console.log(East.str`Extension: ${ext}`));
});

const compiled = parseFilePath.toIR().compile([...PathImpl, ...ConsoleImpl]);
compiled("/home/user/documents/report.pdf");
// Logs:
// Directory: /home/user/documents
// Filename: report.pdf
// Extension: .pdf
```

**Example - Change File Extension:**

```typescript
const changeExtension = East.function([StringType, StringType], StringType, ($, filePath, newExt) => {
    const dir = $.let(Path.dirname(filePath));
    const base = $.let(Path.basename(filePath));
    const oldExt = $.let(Path.extname(filePath));

    // Remove old extension from basename
    const nameOnly = $.let(base.slice(0n, base.length().subtract(oldExt.length())));

    // Build new path
    const newName = $.let(nameOnly.concat(newExt));
    const newPath = $.let(Path.join([dir, newName]));

    $.return(newPath);
});

const compiled = changeExtension.toIR().compile(PathImpl);
const result = compiled("/data/file.txt", ".json");
// Returns: "/data/file.json"
```

**Notes:**
- All operations are synchronous
- Path operations are cross-platform (work on Windows, Linux, macOS)
- `join()` uses platform-specific separator (/ or \)
- `resolve()` resolves relative to current working directory
- `extname()` returns empty string if no extension

---

### Data Formats (CSV, XML)

Parse and serialize structured data formats including CSV and XML.

**Import:**
```typescript
import { Format, FormatImpl } from "@elaraai/east-node";
// Or import specific formats:
import { csv_parse, csv_serialize, CsvImpl } from "@elaraai/east-node";
import { xml_parse, xml_serialize, XmlImpl, XmlNode } from "@elaraai/east-node";
```

#### CSV Functions

Parse and serialize CSV (Comma-Separated Values) data with full configurability.

**Available Functions:**

| Function | Signature | Description |
|----------|-----------|-------------|
| `csv_parse` | `(blob: Blob, config: CsvParseConfig) -> CsvData` | Parse CSV blob into row dictionaries |
| `csv_serialize` | `(data: CsvData, config: CsvSerializeConfig) -> Blob` | Serialize row dictionaries to CSV blob |

**Types:**
```typescript
// Row: dictionary mapping column names to optional string values
CsvRowType = Dict<String, Option<String>>

// Data: array of rows
CsvDataType = Array<CsvRowType>

// Parse configuration
CsvParseConfig = {
    delimiter: Option<String>,        // Default: none (auto-detect)
    quoteChar: Option<String>,        // Default: none (use ")
    escapeChar: Option<String>,       // Default: none (use ")
    newline: Option<String>,          // Default: none (auto-detect)
    hasHeader: Boolean,               // Use first row as column names
    nullString: Option<String>,       // String to treat as null
    skipEmptyLines: Boolean,          // Skip empty lines
    trimFields: Boolean              // Trim whitespace from fields
}

// Serialize configuration
CsvSerializeConfig = {
    delimiter: String,                // Field delimiter
    quoteChar: String,                // Quote character
    escapeChar: String,               // Escape character
    newline: String,                  // Line terminator
    includeHeader: Boolean,           // Include header row
    nullString: String,               // String for null values
    alwaysQuote: Boolean             // Quote all fields
}
```

**Example - Parse CSV:**

```typescript
import { East, NullType, variant } from "@elaraai/east";
import { csv_parse, CsvParseConfig, FormatImpl } from "@elaraai/east-node";

const parseCSV = East.function([], NullType, $ => {
    const csvData = $.let(East.value("name,age\nAlice,30\nBob,25"));
    const blob = $.let(csvData.encodeUtf8());

    const config = $.let(East.value({
        delimiter: variant('some', ','),
        quoteChar: variant('some', '"'),
        escapeChar: variant('some', '"'),
        newline: variant('none', null),
        hasHeader: true,
        nullString: variant('some', ''),
        skipEmptyLines: true,
        trimFields: false,
    }, CsvParseConfig));

    const rows = $.let(csv_parse(blob, config));

    // Access first row
    const firstRow = $.let(rows.get(0n));
    const name = $.let(firstRow.get("name"));
    // name is variant: some("Alice") or none

    $.return(null);
});
```

**Example - Serialize CSV:**

```typescript
const serializeCSV = East.function([], NullType, $ => {
    // Build data manually
    const rows = $.let(East.value([
        new Map([["name", variant('some', "Alice")], ["age", variant('some', "30")]]),
        new Map([["name", variant('some', "Bob")], ["age", variant('some', "25")]]),
    ], CsvDataType));

    const config = $.let(East.value({
        delimiter: ',',
        quoteChar: '"',
        escapeChar: '"',
        newline: '\n',
        includeHeader: true,
        nullString: '',
        alwaysQuote: false,
    }, CsvSerializeConfig));

    const blob = $.let(csv_serialize(rows, config));
    const text = $.let(blob.decodeUtf8());
    // text contains: "name,age\nAlice,30\nBob,25"

    $.return(null);
});
```

#### XML Functions

Parse and serialize XML data with support for elements, attributes, CDATA, and entities.

**Available Functions:**

| Function | Signature | Description |
|----------|-----------|-------------|
| `xml_parse` | `(blob: Blob, config: XmlParseConfig) -> XmlNode` | Parse XML blob into tree structure |
| `xml_serialize` | `(node: XmlNode, config: XmlSerializeConfig) -> Blob` | Serialize XML tree to blob |

**Types:**
```typescript
// Recursive XML node structure
XmlNode = {
    tag: String,
    attributes: Dict<String, String>,
    children: Array<Variant<TEXT: String | ELEMENT: XmlNode>>
}

// Parse configuration
XmlParseConfig = {
    preserveWhitespace: Boolean,      // Keep whitespace in text
    decodeEntities: Boolean          // Decode &lt;, &#65;, etc.
}

// Serialize configuration
XmlSerializeConfig = {
    indent: Option<String>,           // Indentation string (e.g., "  ")
    includeXmlDeclaration: Boolean,   // Add <?xml version="1.0"?>
    encodeEntities: Boolean,          // Encode <, >, &, ", '
    selfClosingTags: Boolean         // Use <br/> vs <br></br>
}
```

**Example - Parse XML:**

```typescript
import { xml_parse, XmlParseConfig, XmlNode, FormatImpl } from "@elaraai/east-node";

const parseXML = East.function([], NullType, $ => {
    const xmlData = $.let(East.value('<book id="123"><title>East Guide</title></book>'));
    const blob = $.let(xmlData.encodeUtf8());

    const config = $.let(East.value({
        preserveWhitespace: false,
        decodeEntities: true,
    }, XmlParseConfig));

    const doc = $.let(xml_parse(blob, config));

    // Access root element
    const tag = $.let(doc.tag);                    // "book"
    const id = $.let(doc.attributes.get("id"));    // "123"

    // Access children
    const children = $.let(doc.children);
    const firstChild = $.let(children.get(0n));

    // Unwrap ELEMENT variant
    const titleElement = $.let(firstChild.unwrap("ELEMENT"));
    const titleTag = $.let(titleElement.tag);      // "title"

    // Get text content
    const titleChildren = $.let(titleElement.children);
    const titleText = $.let(titleChildren.get(0n).unwrap("TEXT")); // "East Guide"

    $.return(null);
});
```

**Example - Serialize XML:**

```typescript
const serializeXML = East.function([], NullType, $ => {
    const doc = $.let(East.value({
        tag: "book",
        attributes: new Map([["id", "123"]]),
        children: [
            variant("ELEMENT", {
                tag: "title",
                attributes: new Map(),
                children: [variant("TEXT", "East Guide")]
            })
        ]
    }, XmlNode));

    const config = $.let(East.value({
        indent: variant('some', "  "),
        includeXmlDeclaration: true,
        encodeEntities: true,
        selfClosingTags: true,
    }, XmlSerializeConfig));

    const blob = $.let(xml_serialize(doc, config));
    const text = $.let(blob.decodeUtf8());
    $(Console.log(text));
    // Outputs:
    // <?xml version="1.0" encoding="UTF-8"?>
    // <book id="123">
    //   <title>East Guide</title>
    // </book>

    $.return(null);
});
```

**Notes:**
- CSV: Handles quoted fields, escape sequences, auto-detects delimiters and newlines
- CSV: Validates column counts when hasHeader is true
- XML: Supports CDATA sections, comments (ignored), processing instructions (ignored)
- XML: Decodes predefined entities (`&lt;`, `&gt;`, `&amp;`, `&quot;`, `&apos;`)
- XML: Decodes numeric entities (decimal `&#65;` and hex `&#x41;`)
- XML: Namespaces treated as regular attributes, preserves prefixes in tag names
- Both formats skip UTF-8 BOM if present
- Full API documentation available in TypeDoc comments

---

## Testing

East Node includes a testing framework for writing tests in East code.

### Test Framework

**Import:**
```typescript
import { describeEast, assertEast } from "@elaraai/east-node";
```

**Basic Structure:**

```typescript
await describeEast("Test suite name", (test) => {
    test("test case 1", $ => {
        // Your test logic
        $(assertEast.equal(actualValue, expectedValue));
    });

    test("test case 2", $ => {
        // Another test
    });
}, PlatformImpl);  // Optional: provide platform functions needed by tests
```

### Available Assertions

| Assertion | Description | Example |
|-----------|-------------|---------|
| `assertEast.equal(actual, expected)` | Assert deep equality | `$(assertEast.equal(result, 42n))` |
| `assertEast.notEqual(actual, expected)` | Assert deep inequality | `$(assertEast.notEqual(x, 0n))` |
| `assertEast.greater(actual, expected)` | Assert actual > expected | `$(assertEast.greater(score, 50n))` |
| `assertEast.greaterEqual(actual, expected)` | Assert actual ≥ expected | `$(assertEast.greaterEqual(age, 18n))` |
| `assertEast.less(actual, expected)` | Assert actual < expected | `$(assertEast.less(count, 100n))` |
| `assertEast.lessEqual(actual, expected)` | Assert actual ≤ expected | `$(assertEast.lessEqual(value, max))` |
| `assertEast.throws(expr)` | Assert expression throws error | `$(assertEast.throws(divide(1n, 0n)))` |

### Example - Testing File Operations

```typescript
import { describeEast, assertEast } from "@elaraai/east-node";
import { FileSystem, FileSystemImpl } from "@elaraai/east-node";
import { East, StringType } from "@elaraai/east";

await describeEast("File operations", (test) => {
    test("write and read file", $ => {
        const content = $.let("Hello, World!");
        $(FileSystem.writeFile("test.txt", content));

        const read = $.let(FileSystem.readFile("test.txt"));
        $(assertEast.equal(read, content));

        $(FileSystem.deleteFile("test.txt"));
    });

    test("file exists after write", $ => {
        $(FileSystem.writeFile("temp.txt", "data"));
        const exists = $.let(FileSystem.exists("temp.txt"));
        $(assertEast.equal(exists, true));
        $(FileSystem.deleteFile("temp.txt"));
    });

    test("reading non-existent file throws", $ => {
        $(assertEast.throws(FileSystem.readFile("/nonexistent/file.txt")));
    });
}, FileSystemImpl);
```

### Example - Testing Crypto

```typescript
await describeEast("Crypto operations", (test) => {
    test("UUID generates valid format", $ => {
        const uuid = $.let(Crypto.uuid());
        const len = $.let(uuid.length());

        // UUID v4 is 36 characters (32 hex + 4 hyphens)
        $(assertEast.equal(len, 36n));

        // Should contain hyphens
        $(assertEast.equal(uuid.contains("-"), true));
    });

    test("SHA-256 produces consistent output", $ => {
        const hash1 = $.let(Crypto.hashSha256("test"));
        const hash2 = $.let(Crypto.hashSha256("test"));

        $(assertEast.equal(hash1, hash2));

        // SHA-256 hex is 64 characters
        $(assertEast.equal(hash1.length(), 64n));
    });
}, CryptoImpl);
```

---

## Error Handling

All platform functions throw `EastError` when operations fail.

### Catching Errors from Compiled Functions

When you call a compiled East function from TypeScript, errors propagate as `EastError`:

```typescript
import { EastError } from "@elaraai/east/internal";

const readFile = East.function([StringType], StringType, ($, path) => {
    const content = $.let(FileSystem.readFile(path));
    $.return(content);
});

const compiled = readFile.toIR().compile(FileSystemImpl);

// Calling the compiled function in TypeScript - errors propagate
try {
    const content = compiled("/nonexistent/file.txt");
} catch (err) {
    if (err instanceof EastError) {
        console.log(err.message);
        // "Failed to read file /nonexistent/file.txt: ENOENT: no such file or directory"

        console.log(err.location);
        // [{ filename: "fs_read_file", line: 0n, column: 0n }]

        console.log(err.cause);
        // Original Node.js error object
    }
}
```

### Handling Errors in East Code

Use East's `try-catch` blocks to handle errors within East code:

```typescript
const safeReadFile = East.function([StringType], StringType, ($, path) => {
    $.try($ => {
        const content = $.let(FileSystem.readFile(path));
        $.return(content);
    }).catch(($, message, stack) => {
        $(Console.error(East.str`Failed to read file: ${message}`));
        $.return("");  // Return empty string on error
    });
});

// This function won't throw - it catches errors internally
const compiled = safeReadFile.toIR().compile([...FileSystemImpl, ...ConsoleImpl]);
const result = compiled("/nonexistent/file.txt");  // Returns "" and logs error
```

---

## Advanced Usage

### Combining Multiple Platforms

```typescript
import { NodePlatform, Console, FileSystem, Crypto } from "@elaraai/east-node";

// Use complete platform
const compiled1 = myFunction.toIR().compile(NodePlatform);

// Or combine specific modules
const customPlatform = [...ConsoleImpl, ...FileSystemImpl, ...CryptoImpl];
const compiled2 = myFunction.toIR().compile(customPlatform);
```

### Sync vs Async

Some platform functions require `compileAsync()`:

**Async functions:**
- `Console.readLine()`
- `Time.sleep()`
- All `Fetch.*` functions

**All other functions are synchronous.**

```typescript
// Use NodePlatformSync for synchronous-only
import { NodePlatformSync } from "@elaraai/east-node";
const compiled = myFunction.toIR().compile(NodePlatformSync);
compiled();  // No await needed

// Use NodePlatform or individual async platforms
import { NodePlatform } from "@elaraai/east-node";
const compiled = myFunction.toIR().compileAsync(NodePlatform);
await compiled();  // Requires await
```

### Serializing Functions with Platform Functions

```typescript
// Define function using platform functions
const myFunction = East.function([StringType], NullType, ($, filename) => {
    const content = $.let(FileSystem.readFile(filename));
    $(Console.log(content));
});

// Convert to IR (portable representation)
const ir = myFunction.toIR();

// Serialize to JSON
const jsonData = ir.toJSON();
const jsonString = JSON.stringify(jsonData);

// Send over network, save to file, etc.
// ...

// Deserialize
const receivedData = JSON.parse(jsonString);
const receivedIR = EastIR.fromJSON(receivedData);

// Compile with platform on receiving end
import { NodePlatform } from "@elaraai/east-node";
const compiled = receivedIR.compile(NodePlatform);
compiled("data.txt");
```

---

## License

This project is dual-licensed:

- **Open Source**: [AGPL-3.0](LICENSE.md) - Free for open source use
- **Commercial**: Available for proprietary use - contact support@elara.ai

---
