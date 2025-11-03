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
import { CsvImpl } from "./format/csv.js";
import { XmlImpl } from "./format/xml.js";

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
export const FormatImpl: PlatformFunction[] = [
    ...CsvImpl,
    ...XmlImpl,
];
