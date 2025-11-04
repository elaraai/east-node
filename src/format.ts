/**
 * Copyright (c) 2025 Elara AI Pty Ltd
 * Licensed under AGPL-3.0. See LICENSE file for details.
 */

/**
 * Format platform functions for parsing and serializing structured data formats.
 *
 * This module provides platform functions for working with various data formats:
 * - CSV: Comma-Separated Values parsing and serialization
 * - XML: Extensible Markup Language parsing and serialization
 *
 * Future formats may include JSON, YAML, etc.
 */

import type { PlatformFunction } from "@elaraai/east/internal";
import { CSV } from "./format/csv.js";
import { XML } from "./format/xml.js";

// Re-export CSV types and functions
export * from "./format/csv.js";

// Re-export XML types and functions
export * from "./format/xml.js";

/**
 * All format platform function implementations.
 *
 * This array combines all format-related platform functions that can be
 * provided to the East runtime.
 */
const FormatImpl: PlatformFunction[] = [
    ...CSV.Implementation,
    ...XML.Implementation,
];

/**
 * Grouped format platform functions.
 *
 * Provides CSV and XML parsing and serialization operations for East programs.
 *
 * @example
 * ```ts
 * import { East, BlobType } from "@elaraai/east";
 * import { Format, CsvDataType, CsvParseConfig } from "@elaraai/east-node";
 *
 * const parseData = East.function([BlobType], CsvDataType, ($, data) => {
 *     const config = $.const(East.value({
 *         delimiter: variant('some', ','),
 *         hasHeader: true,
 *         skipEmptyLines: true,
 *         trimFields: false,
 *     }, CsvParseConfig));
 *
 *     return Format.CSV.parse(data, config);
 * });
 *
 * const compiled = East.compile(parseData.toIR(), Format.Implementation);
 * const csvData = new TextEncoder().encode("name,age\nAlice,30");
 * compiled(csvData);  // Returns parsed CSV data
 * ```
 */
export const Format = {
    /**
     * CSV parsing and serialization functions.
     *
     * Access CSV.parse and CSV.serialize for working with CSV data.
     */
    CSV,

    /**
     * XML parsing and serialization functions.
     *
     * Access XML.parse and XML.serialize for working with XML data.
     */
    XML,

    /**
     * Node.js implementation of all format platform functions.
     *
     * Pass this to {@link East.compile} to enable all format operations (CSV and XML).
     */
    Implementation: FormatImpl,
} as const;

// Export for backwards compatibility
export { FormatImpl };
