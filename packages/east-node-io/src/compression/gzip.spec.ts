/**
 * Copyright (c) 2025 Elara AI Pty Ltd
 * Dual-licensed under AGPL-3.0 and commercial license. See LICENSE for details.
 */

import { East, variant } from "@elaraai/east";
import { describeEast, Test } from "@elaraai/east-node";
import { gzip_compress, gzip_decompress, GzipImpl } from "./gzip.js";

await describeEast("Gzip Platform Functions", (test) => {
    test("compresses and decompresses data correctly", $ => {
        const originalText = "Hello, World! This is a test of gzip compression.";
        const data = $.let(East.value(originalText).encodeUtf8());

        const options = $.let({
            level: variant('some', 6n),
        });

        // Compress
        const compressed = $.let(gzip_compress(data, options));

        // Decompress
        const decompressed = $.let(gzip_decompress(compressed));

        // Verify decompressed data matches original
        const result = $.let(decompressed.decodeUtf8());
        $(Test.equal(result, originalText));
    });

    test("uses default compression level when none specified", $ => {
        const data = $.let(East.value("Test data").encodeUtf8());

        const options = $.let({
            level: variant('none', null),
        });

        const compressed = $.let(gzip_compress(data, options));
        const decompressed = $.let(gzip_decompress(compressed));
        const result = $.let(decompressed.decodeUtf8());

        $(Test.equal(result, "Test data"));
    });

    test("handles maximum compression level", $ => {
        const data = $.let(East.value("Test data with maximum compression").encodeUtf8());

        const options = $.let({
            level: variant('some', 9n),
        });

        const compressed = $.let(gzip_compress(data, options));
        const decompressed = $.let(gzip_decompress(compressed));
        const result = $.let(decompressed.decodeUtf8());

        $(Test.equal(result, "Test data with maximum compression"));
    });

    test("handles minimum compression level (no compression)", $ => {
        const data = $.let(East.value("No compression test").encodeUtf8());

        const options = $.let({
            level: variant('some', 0n),
        });

        const compressed = $.let(gzip_compress(data, options));
        const decompressed = $.let(gzip_decompress(compressed));
        const result = $.let(decompressed.decodeUtf8());

        $(Test.equal(result, "No compression test"));
    });

    test("handles empty data", $ => {
        const data = $.let(East.value("").encodeUtf8());

        const options = $.let({
            level: variant('some', 6n),
        });

        const compressed = $.let(gzip_compress(data, options));
        const decompressed = $.let(gzip_decompress(compressed));
        const result = $.let(decompressed.decodeUtf8());

        $(Test.equal(result, ""));
    });

    test("handles large data", $ => {
        const largeText = "A".repeat(10000);
        const data = $.let(East.value(largeText).encodeUtf8());

        const options = $.let({
            level: variant('some', 6n),
        });

        const compressed = $.let(gzip_compress(data, options));

        // Compressed data should be much smaller for repetitive content
        $(Test.less(compressed.size(), data.size()));

        const decompressed = $.let(gzip_decompress(compressed));
        const result = $.let(decompressed.decodeUtf8());

        $(Test.equal(result, largeText));
    });
}, { platformFns: GzipImpl });
