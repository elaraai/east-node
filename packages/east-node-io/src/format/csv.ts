/**
 * Copyright (c) 2025 Elara AI Pty Ltd
 * Licensed under AGPL-3.0. See LICENSE file for details.
 */
import { East, BlobType, ArrayType, DictType, StringType, OptionType, BooleanType, StructType, variant, type ValueTypeOf, VariantType, NullType, match } from "@elaraai/east";
import type { PlatformFunction, PlatformFunctionDef } from "@elaraai/east/internal";
import { EastError, LiteralValueType } from "@elaraai/east/internal";

// CSV Configuration Types
export const CsvColumnType = VariantType({
    "Null": NullType,
    "Boolean": NullType,
    "Integer": NullType,
    "Float": NullType,
    "String": NullType,
    "DateTime": NullType,
    "Blob": NullType,
})

export const CsvParseConfig = StructType({
    columns: OptionType(DictType(StringType, CsvColumnType)),
    delimiter: OptionType(StringType),
    quoteChar: OptionType(StringType),
    escapeChar: OptionType(StringType),
    newline: OptionType(StringType),
    hasHeader: BooleanType,
    nullString: OptionType(StringType),
    skipEmptyLines: BooleanType,
    trimFields: BooleanType,
});

export const CsvSerializeConfig = StructType({
    delimiter: StringType,
    quoteChar: StringType,
    escapeChar: StringType,
    newline: StringType,
    includeHeader: BooleanType,
    nullString: StringType,
    alwaysQuote: BooleanType,
});

// CSV Platform Functions

/** Represents a single CSV row as a dictionary mapping column names to optional string values. */
export const CsvRowType = DictType(StringType, LiteralValueType);

/** Represents CSV data as an array of row dictionaries. */
export const CsvDataType = ArrayType(CsvRowType);

/**
 * Parses CSV data from a binary blob into structured row data.
 *
 * Converts CSV-formatted binary data into an array of row dictionaries,
 * where each dictionary maps column names to optional string values.
 * Supports configurable delimiters, quote characters, escape sequences,
 * and header handling.
 *
 * This is a platform function for the East language, enabling CSV parsing
 * in East programs running on Node.js.
 *
 * @param blob - The CSV data as a binary blob (UTF-8 encoded)
 * @param config - Parsing configuration including delimiter, quote characters, and header options
 * @returns An array of row dictionaries, each mapping column names to optional string values
 *
 * @throws {EastError} When CSV is malformed with specific error messages:
 * - "Unclosed quote in row N, column M" - Quote not properly closed
 * - "Too many fields in row N (expected X columns, found at least Y)" - More fields than header
 * - "Too few fields in row N (expected X columns, got Y)" - Fewer fields than header
 * - "Invalid escape sequence in row N, column M" - Invalid escape character usage
 * - "Expected delimiter or newline after closing quote in row N, column M" - Invalid data after quote
 * - "quoteChar must have length 1" - Invalid configuration
 * - "escapeChar must have length 1" - Invalid configuration
 * - "delimiter must not be empty" - Invalid configuration
 *
 * @example
 * ```ts
 * const parseCSV = East.function([BlobType], CsvDataType, ($, csvBlob) => {
 *     const config = $.const(East.value({
 *         delimiter: variant('some', ','),
 *         quoteChar: variant('some', '"'),
 *         escapeChar: variant('some', '"'),
 *         newline: variant('none', null),
 *         hasHeader: true,
 *         nullString: variant('some', ''),
 *         skipEmptyLines: true,
 *         trimFields: false,
 *     }, CsvParseConfig));
 *
 *     return csv_parse(csvBlob, config);
 *     // Returns: [{"name": some("Alice"), "age": some("30")}, ...]
 * });
 * ```
 *
 * @remarks
 * - Handles quoted fields with embedded delimiters and newlines
 * - Supports both quote-as-escape ("") and backslash-escape (\") modes
 * - Auto-detects newline format (CRLF, LF, or CR) when newline option is none
 * - Validates column counts when hasHeader is true
 * - Skips UTF-8 BOM (0xEF 0xBB 0xBF) if present at start
 * - When hasHeader is false, generates column names as "column_0", "column_1", etc.
 */
export const csv_parse: PlatformFunctionDef<
    [typeof BlobType, typeof CsvParseConfig],
    typeof CsvDataType
> = East.platform("csv_parse", [BlobType, CsvParseConfig], CsvDataType);

/**
 * Serializes structured row data into CSV-formatted binary data.
 *
 * Converts an array of row dictionaries into CSV-formatted binary data.
 * Supports configurable delimiters, quote characters, escape sequences,
 * and formatting options.
 *
 * This is a platform function for the East language, enabling CSV serialization
 * in East programs running on Node.js.
 *
 * @param data - An array of row dictionaries to serialize
 * @param config - Serialization configuration including delimiter, quote characters, and formatting options
 * @returns A binary blob containing the CSV-formatted data (UTF-8 encoded)
 *
 * @throws {EastError} When configuration is invalid:
 * - "quoteChar must have length 1" - Invalid configuration
 * - "escapeChar must have length 1" - Invalid configuration
 * - "delimiter must not be empty" - Invalid configuration
 *
 * @example
 * ```ts
 * const serializeCSV = East.function([CsvDataType], BlobType, ($, data) => {
 *     const config = $.const(East.value({
 *         delimiter: ',',
 *         quoteChar: '"',
 *         escapeChar: '"',
 *         newline: '\n',
 *         includeHeader: true,
 *         nullString: '',
 *         alwaysQuote: false,
 *     }, CsvSerializeConfig));
 *
 *     return csv_serialize(data, config);
 *     // Returns blob that decodes to: "name,age\nAlice,30\nBob,25"
 * });
 * ```
 *
 * @remarks
 * - Automatically quotes fields containing delimiter, quote char, newline, or null string
 * - Escapes quote characters within quoted fields using escapeChar
 * - Column order is determined by the first row's dictionary keys
 * - Null values are serialized as nullString
 * - Use alwaysQuote: true to force quoting of all fields
 */
export const csv_serialize: PlatformFunctionDef<
    [typeof CsvDataType, typeof CsvSerializeConfig],
    typeof BlobType
> = East.platform("csv_serialize", [CsvDataType, CsvSerializeConfig], BlobType);

/**
 * Node.js implementation of CSV platform functions.
 *
 * Pass this array to {@link East.compile} to enable CSV operations.
 */
export const CsvImpl: PlatformFunction[] = [
    csv_parse.implement((blob: Uint8Array, config: ValueTypeOf<typeof CsvParseConfig>) => {
        try {
            return parseCsv(blob, config);
        } catch (err: any) {
            if (err instanceof EastError) throw err;
            throw new EastError(`CSV parsing failed: ${err.message}`, {
                location: { filename: "csv_parse", line: 0n, column: 0n },
                cause: err
            });
        }
    }),

    csv_serialize.implement((data: ValueTypeOf<typeof CsvDataType>, config: ValueTypeOf<typeof CsvSerializeConfig>) => {
        try {
            return serializeCsv(data, config);
        } catch (err: any) {
            if (err instanceof EastError) throw err;
            throw new EastError(`CSV serialization failed: ${err.message}`, {
                location: { filename: "csv_serialize", line: 0n, column: 0n },
                cause: err
            });
        }
    }),
];


// Helper Functions

function parseCsv(
    blob: Uint8Array,
    config: ValueTypeOf<typeof CsvParseConfig>
): ValueTypeOf<typeof CsvDataType> {
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    // Extract config with defaults
    const delimiter = config.delimiter.type === 'some' ? config.delimiter.value : ',';
    const quoteChar = config.quoteChar.type === 'some' ? config.quoteChar.value : '"';
    const escapeChar = config.escapeChar.type === 'some' ? config.escapeChar.value : '"';
    const nullString = config.nullString.type === 'some' ? config.nullString.value : '';
    const hasHeader = config.hasHeader;
    const skipEmptyLines = config.skipEmptyLines;
    const trimFields = config.trimFields;


    const getColumnType = (col: string): ValueTypeOf<typeof CsvColumnType> => {
        if (config.columns.type === 'none') {
            return variant('String', null);
        } else if (!col) {
            return variant('String', null);
        } else if (config.columns.value?.has(col)) {
            return config.columns.value?.get(col) as ValueTypeOf<typeof CsvColumnType>;
        } else {
            return variant('String', null);
        }
    };




    // add the code to 

    // Auto-detect newline if not specified
    let newlines: string[];
    if (config.newline.type === 'some') {
        newlines = [config.newline.value];
    } else {
        // Auto-detect: check for \r\n, \n, or \r
        newlines = ['\r\n', '\n', '\r'];
    }

    // Validation
    if (quoteChar.length !== 1) {
        throw new EastError(`quoteChar must have length 1, got ${JSON.stringify(quoteChar)}`, {
            location: { filename: "csv_parse", line: 0n, column: 0n }
        });
    }
    if (escapeChar.length !== 1) {
        throw new EastError(`escapeChar must have length 1, got ${JSON.stringify(escapeChar)}`, {
            location: { filename: "csv_parse", line: 0n, column: 0n }
        });
    }
    if (delimiter.length === 0) {
        throw new EastError(`delimiter must not be empty`, {
            location: { filename: "csv_parse", line: 0n, column: 0n }
        });
    }

    const delimiterBuffer = encoder.encode(delimiter);
    const newlineBuffers = newlines.map(nl => encoder.encode(nl));
    const quoteCharBuffer = encoder.encode(quoteChar);
    const escapeCharBuffer = encoder.encode(escapeChar);

    // Skip UTF-8 BOM if present
    let offset = 0;
    if (blob.length >= 3 && blob[0] === 0xef && blob[1] === 0xbb && blob[2] === 0xbf) {
        offset = 3;
    }

    // Helper: match pattern at offset
    const match = (pattern: Uint8Array, pos: number): boolean => {
        if (pos + pattern.length > blob.length) return false;
        for (let i = 0; i < pattern.length; i++) {
            if (blob[pos + i] !== pattern[i]) return false;
        }
        return true;
    };

    // Helper: parse next field
    // Returns: [terminator, contentStart, contentEnd, nextOffset]
    // For quoted fields: contentStart is after opening quote, contentEnd is before closing quote
    // For unquoted fields: contentStart equals the input pos, contentEnd is before delimiter/newline
    const nextField = (pos: number, row: bigint, col: number): [terminator: 'field' | 'record' | 'eof', contentStart: number, contentEnd: number, newOffset: number] => {
        if (pos >= blob.length) {
            return ['eof', blob.length, blob.length, blob.length];
        }

        // Check if field is quoted
        if (match(quoteCharBuffer, pos)) {
            pos += quoteCharBuffer.length;
            const fieldStart = pos; // Content starts after opening quote

            while (pos < blob.length) {
                if (match(escapeCharBuffer, pos)) {
                    pos += escapeCharBuffer.length;
                    if (match(quoteCharBuffer, pos)) {
                        // Escaped quote
                        pos += quoteCharBuffer.length;
                    } else if (quoteChar === escapeChar) {
                        // Quote-as-escape: doubled quote means literal quote
                        // Single quote means end of field
                        // Check what follows
                        const fieldEnd = pos - escapeCharBuffer.length; // Before the closing quote
                        for (const newlineBuffer of newlineBuffers) {
                            if (match(newlineBuffer, pos)) {
                                return ['record', fieldStart, fieldEnd, pos + newlineBuffer.length];
                            }
                        }
                        if (match(delimiterBuffer, pos)) {
                            return ['field', fieldStart, fieldEnd, pos + delimiterBuffer.length];
                        }
                        if (pos >= blob.length) {
                            return ['eof', fieldStart, fieldEnd, blob.length];
                        }
                        // Single quote followed by something else = error
                        throw new EastError(`Expected delimiter or newline after closing quote in row ${row}, column ${col}`, {
                            location: { filename: "csv_parse", line: row, column: BigInt(col) }
                        });
                    } else if (match(escapeCharBuffer, pos)) {
                        // Escaped escape char
                        pos += escapeCharBuffer.length;
                    } else {
                        throw new EastError(`Invalid escape sequence in row ${row}, column ${col}`, {
                            location: { filename: "csv_parse", line: row, column: BigInt(col) }
                        });
                    }
                } else if (match(quoteCharBuffer, pos)) {
                    // End of quoted field
                    const fieldEnd = pos; // Before the closing quote
                    pos += quoteCharBuffer.length;

                    // Check what follows the closing quote
                    for (const newlineBuffer of newlineBuffers) {
                        if (match(newlineBuffer, pos)) {
                            return ['record', fieldStart, fieldEnd, pos + newlineBuffer.length];
                        }
                    }
                    if (match(delimiterBuffer, pos)) {
                        return ['field', fieldStart, fieldEnd, pos + delimiterBuffer.length];
                    }
                    if (pos >= blob.length) {
                        return ['eof', fieldStart, fieldEnd, blob.length];
                    }

                    throw new EastError(`Expected delimiter or newline after closing quote in row ${row}, column ${col}`, {
                        location: { filename: "csv_parse", line: row, column: BigInt(col) }
                    });
                } else {
                    // Advance one UTF-8 code point
                    const charByte = blob[pos] || 0;
                    if (charByte >= 240) {
                        pos += 4;
                    } else if (charByte >= 224) {
                        pos += 3;
                    } else if (charByte >= 192) {
                        pos += 2;
                    } else {
                        pos += 1;
                    }
                }
            }

            throw new EastError(`Unclosed quote in row ${row}, column ${col}`, {
                location: { filename: "csv_parse", line: row, column: BigInt(col) }
            });
        } else {
            // Unquoted field
            const fieldStart = pos;

            while (pos < blob.length) {
                for (const newlineBuffer of newlineBuffers) {
                    if (match(newlineBuffer, pos)) {
                        return ['record', fieldStart, pos, pos + newlineBuffer.length];
                    }
                }
                if (match(delimiterBuffer, pos)) {
                    return ['field', fieldStart, pos, pos + delimiterBuffer.length];
                }

                // Advance one UTF-8 code point
                const charByte = blob[pos] || 0;
                if (charByte >= 240) {
                    pos += 4;
                } else if (charByte >= 224) {
                    pos += 3;
                } else if (charByte >= 192) {
                    pos += 2;
                } else {
                    pos += 1;
                }
            }

            return ['eof', fieldStart, pos, blob.length];
        }
    };

    // Helper: parse field value
    // Note: start/end positions come from nextField, which already strips quotes for quoted fields
    const parseFieldValue = (start: number, end: number, allowNull: boolean = true): string | null => {
        let str = decoder.decode(blob.slice(start, end));

        // Unescape if needed (nextField doesn't unescape, just removes quotes)
        // Determine if this was a quoted field by checking if the byte before start is a quote
        const wasQuoted = start > 0 && match(quoteCharBuffer, start - quoteCharBuffer.length);

        if (wasQuoted) {
            // Unescape
            if (quoteChar === escapeChar) {
                str = str.replaceAll(quoteChar + quoteChar, quoteChar);
            } else {
                let result = '';
                let i = 0;
                while (i < str.length) {
                    if (str[i] === escapeChar && i + 1 < str.length) {
                        if (str[i + 1] === quoteChar || str[i + 1] === escapeChar) {
                            result += str[i + 1];
                            i += 2;
                        } else {
                            result += str[i];
                            i += 1;
                        }
                    } else {
                        result += str[i];
                        i += 1;
                    }
                }
                str = result;
            }
        }

        if (trimFields) {
            str = str.trim();
        }

        if (allowNull && str === nullString) {
            return null;
        }

        return str;
    };

    // Parse header
    let headers: string[] = [];
    
    let rowNumber = 0n;
    if (hasHeader) {
        rowNumber = 1n; // Header is row 1
        let headerEnd = false;
        let columnIndex = 0;
        while (!headerEnd && offset < blob.length) {
            const [terminator, start, end, newOffset] = nextField(offset, rowNumber, columnIndex + 1);
            const value = parseFieldValue(start, end, false); // Headers cannot be null
            if (value === null) {
                throw new EastError(`Header column name cannot be null (row 1, column ${columnIndex + 1})`, {
                    location: { filename: "csv_parse", line: 1n, column: BigInt(columnIndex + 1) }
                });
            }
            headers.push(value);
            offset = newOffset;
            columnIndex++;

            if (terminator === 'record' || terminator === 'eof') {
                headerEnd = true;
            }
        }
        rowNumber = 2n; // Data starts at row 2 after header
    } else {
        rowNumber = 1n; // No header, data starts at row 1
    }

    const columnTypes = headers.map(h => getColumnType(h));

    // Parse rows
    const rows: ValueTypeOf<typeof CsvDataType> = [];
    let fieldIndex = 0;
    let currentRow: ValueTypeOf<typeof CsvRowType> = new Map();

    while (offset < blob.length) {
        const [terminator, start, end, newOffset] = nextField(offset, rowNumber, fieldIndex + 1);

        // Skip empty lines if configured
        if (skipEmptyLines && start === end && terminator === 'record') {
            offset = newOffset;
            rowNumber++;
            continue;
        }

        const value = parseFieldValue(start, end);

        // Determine column name
        let columnName: string;
        if (hasHeader) {
            if (fieldIndex >= headers.length) {
                throw new EastError(`Too many fields in row ${rowNumber} (expected ${headers.length} columns, found at least ${fieldIndex + 1})`, {
                    location: { filename: "csv_parse", line: rowNumber, column: BigInt(fieldIndex + 1) }
                });
            }
            columnName = headers[fieldIndex]!;
        } else {
            columnName = `column_${fieldIndex}`;
        }

        // Add to current row
        if (value === null) {
            currentRow.set(columnName, variant('Null', null));
        } else {
            try {
                // Convert raw CSV value to East variant using convertNativeToCell
                // For headers, use the pre-computed columnTypes; for no-header, compute on-the-fly
                const colType = hasHeader ? columnTypes[fieldIndex]! : getColumnType(columnName);
                const cellValue = convertNativeToCell(value, colType);
                currentRow.set(columnName, cellValue);
            } catch (err: any) {
                throw new EastError(`Failed to parse value for header ${columnName} in row ${rowNumber}, column ${fieldIndex + 1}: ${err.message}`, {
                    location: { filename: "csv_parse", line: rowNumber, column: BigInt(fieldIndex + 1) }
                });
            }
        }

        fieldIndex++;
        offset = newOffset;

        if (terminator === 'record' || terminator === 'eof') {
            // Validate field count
            if (hasHeader && fieldIndex < headers.length) {
                throw new EastError(`Too few fields in row ${rowNumber} (expected ${headers.length} columns, got ${fieldIndex})`, {
                    location: { filename: "csv_parse", line: rowNumber, column: BigInt(fieldIndex + 1) }
                });
            }

            // Add row if not empty
            if (fieldIndex > 0) {
                rows.push(currentRow);
            }

            // Reset for next row
            currentRow = new Map();
            fieldIndex = 0;
            rowNumber++;
        }
    }

    return rows;
}

/**
 * Converts native CSV string to East LiteralValueType variant for parsing.
 *
 * @param value - Raw CSV string value
 * @param colType - Column type specification
 * @returns East variant value
 * @throws {Error} When value cannot be parsed as the specified type
 * @internal
 */
function convertNativeToCell(value: string, colType: ValueTypeOf<typeof CsvColumnType>): ValueTypeOf<typeof LiteralValueType> {
    const typeName = colType.type;

    if (typeName === 'Null') {
        return variant('Null', null);
    } else if (typeName === 'String') {
        return variant('String', value);
    } else if (typeName === 'Integer') {
        // Handle integer parsing with edge cases (matching East's parseInteger logic)
        const trimmed = value.trim();
        if (trimmed === '') {
            throw new Error(`Cannot parse empty string as Integer`);
        }
        try {
            const bigIntValue = BigInt(trimmed);
            // Check for 64-bit signed integer range: -2^63 to 2^63-1
            if (bigIntValue < -9223372036854775808n || bigIntValue > 9223372036854775807n) {
                throw new Error(`Integer out of range (must be 64-bit signed)`);
            }
            return variant('Integer', bigIntValue);
        } catch (err) {
            // If it's already our error, rethrow as-is
            if (err instanceof Error && err.message.includes('Integer out of range')) {
                throw err;
            }
            throw new Error(`Cannot parse "${value}" as Integer: ${err instanceof Error ? err.message : String(err)}`);
        }
    } else if (typeName === 'Float') {
        // Handle float parsing with edge cases (matching East's parseFloat logic)
        const trimmed = value.trim();
        if (trimmed === '') {
            throw new Error(`Cannot parse empty string as Float`);
        }
        // Handle special values
        if (trimmed === 'NaN') {
            return variant('Float', NaN);
        } else if (trimmed === 'Infinity') {
            return variant('Float', Infinity);
        } else if (trimmed === '-Infinity') {
            return variant('Float', -Infinity);
        }
        const floatValue = Number(trimmed);
        if (Number.isNaN(floatValue)) {
            throw new Error(`Cannot parse "${value}" as Float`);
        }
        return variant('Float', floatValue);
    } else if (typeName === 'Boolean') {
        // Handle boolean parsing (matching East's parseBoolean logic - only accept true/false)
        const trimmed = value.trim();
        if (trimmed === 'true') {
            return variant('Boolean', true);
        } else if (trimmed === 'false') {
            return variant('Boolean', false);
        } else {
            throw new Error(`Cannot parse "${value}" as Boolean (expected 'true' or 'false')`);
        }
    } else if (typeName === 'DateTime') {
        // Handle DateTime parsing with ISO format
        const trimmed = value.trim();
        if (trimmed === '') {
            throw new Error(`Cannot parse empty string as DateTime`);
        }
        const date = new Date(trimmed);
        if (Number.isNaN(date.getTime())) {
            throw new Error(`Cannot parse "${value}" as DateTime (expected ISO 8601 format)`);
        }
        return variant('DateTime', date);
    } else if (typeName === 'Blob') {
        // Handle Blob parsing from hex (0x-prefixed hex string, matching East format)
        const trimmed = value.trim();
        if (trimmed === '') {
            throw new Error(`Cannot parse empty string as Blob`);
        }

        // Check for 0x prefix
        if (!trimmed.startsWith('0x')) {
            throw new Error(`Cannot parse "${value}" as Blob (expected 0x-prefixed hex string)`);
        }

        const hexStr = trimmed.slice(2); // Remove 0x prefix

        // Check for odd length
        if (hexStr.length % 2 !== 0) {
            throw new Error(`Cannot parse "${value}" as Blob (odd length hex string)`);
        }

        // Validate hex characters and convert to bytes
        const bytes: number[] = [];
        for (let i = 0; i < hexStr.length; i += 2) {
            const hexByte = hexStr.slice(i, i + 2);
            if (!/^[0-9a-fA-F]{2}$/.test(hexByte)) {
                throw new Error(`Cannot parse "${value}" as Blob (invalid hex character)`);
            }
            bytes.push(parseInt(hexByte, 16));
        }

        return variant('Blob', new Uint8Array(bytes));
    } else {
        throw new Error(`Unknown column type: ${typeName}`);
    }
}

/**
 * Converts East LiteralValueType variant to native string for CSV serialization.
 *
 * @param cell - East variant value
 * @param nullString - String to use for null values
 * @returns Native string value for CSV
 * @internal
 */
function convertCellToNative(cell: ValueTypeOf<typeof LiteralValueType>, nullString: string): string {
    return match(cell, {
        Null: () => nullString,
        String: (value) => {
            // String values are used as-is
            return value;
        },
        Integer: (value) => {
            // Convert BigInt to string, handles large integers safely
            return String(value);
        },
        Float: (value) => {
            // Handle special float values
            if (Number.isNaN(value)) {
                return 'NaN';
            } else if (!Number.isFinite(value)) {
                return value > 0 ? 'Infinity' : '-Infinity';
            }
            return String(value);
        },
        Boolean: (value) => {
            // Use lowercase true/false for consistency
            return String(value);
        },
        DateTime: (value) => {
            // Use ISO format for dates (matching East format: YYYY-MM-DDTHH:MM:SS.sss, no 'Z')
            return value.toISOString().substring(0, 23);
        },
        Blob: (value) => {
            // Encode binary data as hex (0x-prefixed, matching East format)
            return `0x${[...value].map(b => b.toString(16).padStart(2, '0')).join('')}`;
        },
    });
}

function serializeCsv(
    data: ValueTypeOf<typeof CsvDataType>,
    config: ValueTypeOf<typeof CsvSerializeConfig>
): Uint8Array {
    const { delimiter, quoteChar, escapeChar, newline, includeHeader, nullString, alwaysQuote } = config;

    // Validation
    if (quoteChar.length !== 1) {
        throw new EastError(`quoteChar must have length 1, got ${JSON.stringify(quoteChar)}`, {
            location: { filename: "csv_serialize", line: 0n, column: 0n }
        });
    }
    if (escapeChar.length !== 1) {
        throw new EastError(`escapeChar must have length 1, got ${JSON.stringify(escapeChar)}`, {
            location: { filename: "csv_serialize", line: 0n, column: 0n }
        });
    }
    if (delimiter.length === 0) {
        throw new EastError(`delimiter must not be empty`, {
            location: { filename: "csv_serialize", line: 0n, column: 0n }
        });
    }

    const lines: string[] = [];

    // Get column names from first row
    if (data.length === 0) {
        return new TextEncoder().encode('');
    }

    const columns = Array.from(data[0]!.keys());

    
    // Escape field value
    const escapeField = (value: string): string => {
        const needsQuoting = alwaysQuote ||
            value.includes(delimiter) ||
            value.includes(quoteChar) ||
            value.includes(escapeChar) ||
            value.includes(newline) ||
            value === nullString;

        if (!needsQuoting) {
            return value;
        }

        // Escape quotes and escape chars
        let escaped = value;
        if (quoteChar === escapeChar) {
            escaped = escaped.replaceAll(quoteChar, quoteChar + quoteChar);
        } else {
            escaped = escaped.replaceAll(escapeChar, escapeChar + escapeChar);
            escaped = escaped.replaceAll(quoteChar, escapeChar + quoteChar);
        }

        return quoteChar + escaped + quoteChar;
    };

    // Write header
    if (includeHeader) {
        const headerFields = columns.map(col => escapeField(col));
        lines.push(headerFields.join(delimiter));
    }

    // Write rows
    for (const row of data) {
        const fields = columns.map(col => {
            const cell = row.get(col);
            if (!cell) {
                return nullString;
            }
            const value = convertCellToNative(cell, nullString);
            // Don't escape/quote null values - output as-is
            if (value === nullString) {
                return nullString;
            }
            return escapeField(value);
        });
        lines.push(fields.join(delimiter));
    }

    // Join lines with newline and add trailing newline (standard CSV format)
    return new TextEncoder().encode(lines.join(newline) + newline);
}