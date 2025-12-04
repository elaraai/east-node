/**
 * Copyright (c) 2025 Elara AI Pty Ltd
 * Dual-licensed under AGPL-3.0 and commercial license. See LICENSE for details.
 */

/**
 * FTP platform function tests
 *
 * These tests use describeEast following east-node conventions.
 * Tests compile East functions and run them to validate platform function behavior.
 *
 * Note: These tests require FTP server running on localhost:21.
 * Run `npm run dev:services` to start Docker containers.
 */
import { East } from "@elaraai/east";
import { describeEast, Assert, Console, NodePlatform } from "@elaraai/east-node-std";
import { ftp_connect, ftp_put, ftp_get, ftp_list, ftp_delete, ftp_close, ftp_close_all, FtpImpl } from "./ftp.js";

// FTP test configuration
const TEST_CONFIG = {
    host: "localhost",
    port: 21n,
    user: "testuser",
    password: "testpass",
    secure: false,
};

await describeEast("FTP platform functions", (test) => {
    test("connect and close FTP connection", $ => {
        $(Console.log("connect and close FTP connection"));

        const config = $.let(TEST_CONFIG);
        const handle = $.let(ftp_connect(config));

        // Handle should be non-empty string
        $(Assert.greater(handle.length(), East.value(0n)));

        // Close connection
        $(ftp_close(handle));
    });

    test("put uploads file successfully", $ => {
        $(Console.log("put uploads file successfully"));

        const config = $.let(TEST_CONFIG);
        const testData = $.let(new Uint8Array([1, 2, 3, 4, 5]));

        const conn = $.let(ftp_connect(config));
        $(ftp_put(conn, "test-upload.bin", testData));
        $(ftp_close(conn));
    });

    test("get downloads uploaded file", $ => {
        $(Console.log("get downloads uploaded file"));

        const config = $.let(TEST_CONFIG);
        const testData = $.let(new Uint8Array([10, 20, 30, 40, 50]));

        const conn = $.let(ftp_connect(config));

        // Upload file first
        $(ftp_put(conn, "test-download.bin", testData));

        // Download it back
        const downloaded = $.let(ftp_get(conn, "test-download.bin"));

        // Verify data matches
        $(Assert.equal(downloaded, testData));

        $(ftp_close(conn));
    });

    test("delete removes uploaded file", $ => {
        $(Console.log("delete removes uploaded file"));

        const config = $.let(TEST_CONFIG);
        const testData = $.let(new Uint8Array([100, 101, 102]));

        const conn = $.let(ftp_connect(config));

        // Upload file first
        $(ftp_put(conn, "test-delete.bin", testData));

        // Delete it
        $(ftp_delete(conn, "test-delete.bin"));

        $(ftp_close(conn));
    });

    test("list returns uploaded files", $ => {
        $(Console.log("list returns uploaded files"));

        const config = $.let(TEST_CONFIG);
        const testData = $.let(new Uint8Array([1, 2, 3]));

        const conn = $.let(ftp_connect(config));

        // Upload test files
        $(ftp_put(conn, "list-test-1.bin", testData));
        $(ftp_put(conn, "list-test-2.bin", testData));

        // List files in root directory
        const files = $.let(ftp_list(conn, "/"));

        // Should have at least 2 files
        $(Assert.greaterEqual(files.size(), East.value(2n)));

        // Clean up
        $(ftp_delete(conn, "list-test-1.bin"));
        $(ftp_delete(conn, "list-test-2.bin"));

        $(ftp_close(conn));
    });

    test("put and get work with text data", $ => {
        $(Console.log("put and get work with text data"));

        const config = $.let(TEST_CONFIG);
        const textContent = $.let("Hello, FTP World!");

        const conn = $.let(ftp_connect(config));

        // Encode text to blob
        const blob = $.let(textContent.encodeUtf8());

        // Upload text as blob
        $(ftp_put(conn, "test-text.txt", blob));

        // Download blob
        const downloaded = $.let(ftp_get(conn, "test-text.txt"));

        // Decode back to text
        const decodedText = $.let(downloaded.decodeUtf8());

        // Verify text matches
        $(Assert.equal(decodedText, textContent));

        // Clean up
        $(ftp_delete(conn, "test-text.txt"));

        $(ftp_close(conn));
    });

    test("list returns file metadata", $ => {
        $(Console.log("list returns file metadata"));

        const config = $.let(TEST_CONFIG);
        const testData = $.let(new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])); // 10 bytes

        const conn = $.let(ftp_connect(config));

        // Upload a file
        $(ftp_put(conn, "metadata-test.bin", testData));

        // List to get metadata
        const files = $.let(ftp_list(conn, "/"));

        // Find our file in the list
        const foundFile = $.let(files.findFirst("metadata-test.bin", ($, v) => v.name));

        // Verify file was found (option should be Some)
        $.match(foundFile, {
            some: ($, idx) => {
                const file = $.let(files.get(idx));
                // Verify size is 10 bytes
                $(Assert.equal(file.size, East.value(10n)));

                // Verify name matches
                $(Assert.equal(file.name, East.value("metadata-test.bin")));

                // Verify it's a file (not a directory)
                $(Assert.equal(file.isDirectory, East.value(false)));
            },
            none: ($) => $(Assert.fail("Expected to find file in listing")),
        });

        // Clean up
        $(ftp_delete(conn, "metadata-test.bin"));

        $(ftp_close(conn));
    });

    test("put overwrites existing files", $ => {
        $(Console.log("put overwrites existing files"));

        const config = $.let(TEST_CONFIG);
        const data1 = $.let(new Uint8Array([1, 2, 3]));
        const data2 = $.let(new Uint8Array([4, 5, 6, 7, 8]));

        const conn = $.let(ftp_connect(config));

        // Upload first version
        $(ftp_put(conn, "overwrite-test.bin", data1));

        // Upload second version (overwrite)
        $(ftp_put(conn, "overwrite-test.bin", data2));

        // Download and verify it's the second version
        const downloaded = $.let(ftp_get(conn, "overwrite-test.bin"));
        $(Assert.equal(downloaded, data2));

        // Clean up
        $(ftp_delete(conn, "overwrite-test.bin"));

        $(ftp_close(conn));
    });
}, {
    platformFns: [ ...FtpImpl, ...NodePlatform],
    afterEach: $ => {
        // Close all connections after each test (even on failure)
        $(ftp_close_all());
    }
});
