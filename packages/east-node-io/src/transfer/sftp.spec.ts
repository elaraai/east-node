/**
 * Copyright (c) 2025 Elara AI Pty Ltd
 * Dual-licensed under AGPL-3.0 and commercial license. See LICENSE for details.
 */

/**
 * SFTP platform function tests
 *
 * These tests use describeEast following east-node conventions.
 * Tests compile East functions and run them to validate platform function behavior.
 *
 * Note: These tests require SFTP server running on localhost:2222.
 * Run `npm run dev:services` to start Docker containers.
 */
import { East, variant } from "@elaraai/east";
import { describeEast, Test } from "@elaraai/east-node";
import { sftp_connect, sftp_put, sftp_get, sftp_list, sftp_delete, sftp_close, sftp_close_all, SftpImpl } from "./sftp.js";

// SFTP test configuration
const TEST_CONFIG = {
    host: "localhost",
    port: 2222n,
    username: "testuser",
    password: variant('some', "testpass"),
    privateKey: variant('none', null),
};

await describeEast("SFTP platform functions", (test) => {
    test("connect and close SFTP connection", $ => {
        console.log("connect and close SFTP connection");

        const config = $.let(TEST_CONFIG);
        const handle = $.let(sftp_connect(config));

        // Handle should be non-empty string
        $(Test.greater(handle.length(), East.value(0n)));

        // Close connection
        $(sftp_close(handle));
    });

    test("put uploads file successfully", $ => {
        console.log("put uploads file successfully");

        const config = $.let(TEST_CONFIG);
        const testData = $.let(new Uint8Array([1, 2, 3, 4, 5]));

        const conn = $.let(sftp_connect(config));
        $(sftp_put(conn, "/upload/test-upload.bin", testData));
        $(sftp_close(conn));
    });

    test("get downloads uploaded file", $ => {
        console.log("get downloads uploaded file");

        const config = $.let(TEST_CONFIG);
        const testData = $.let(new Uint8Array([10, 20, 30, 40, 50]));

        const conn = $.let(sftp_connect(config));

        // Upload file first
        $(sftp_put(conn, "/upload/test-download.bin", testData));

        // Download it back
        const downloaded = $.let(sftp_get(conn, "/upload/test-download.bin"));

        // Verify data matches
        $(Test.equal(downloaded, testData));

        $(sftp_close(conn));
    });

    test("delete removes uploaded file", $ => {
        console.log("delete removes uploaded file");

        const config = $.let(TEST_CONFIG);
        const testData = $.let(new Uint8Array([100, 101, 102]));

        const conn = $.let(sftp_connect(config));

        // Upload file first
        $(sftp_put(conn, "/upload/test-delete.bin", testData));

        // Delete it
        $(sftp_delete(conn, "/upload/test-delete.bin"));

        $(sftp_close(conn));
    });

    test("list returns uploaded files", $ => {
        console.log("list returns uploaded files");

        const config = $.let(TEST_CONFIG);
        const testData = $.let(new Uint8Array([1, 2, 3]));

        const conn = $.let(sftp_connect(config));

        // Upload test files
        $(sftp_put(conn, "/upload/list-test-1.bin", testData));
        $(sftp_put(conn, "/upload/list-test-2.bin", testData));

        // List files in upload directory
        const files = $.let(sftp_list(conn, "/upload"));

        // Should have at least 2 files
        $(Test.greaterEqual(files.size(), East.value(2n)));

        // Clean up
        $(sftp_delete(conn, "/upload/list-test-1.bin"));
        $(sftp_delete(conn, "/upload/list-test-2.bin"));

        $(sftp_close(conn));
    });

    test("put and get work with text data", $ => {
        console.log("put and get work with text data");

        const config = $.let(TEST_CONFIG);
        const textContent = $.let("Hello, SFTP World!");

        const conn = $.let(sftp_connect(config));

        // Encode text to blob
        const blob = $.let(textContent.encodeUtf8());

        // Upload text as blob
        $(sftp_put(conn, "/upload/test-text.txt", blob));

        // Download blob
        const downloaded = $.let(sftp_get(conn, "/upload/test-text.txt"));

        // Decode back to text
        const decodedText = $.let(downloaded.decodeUtf8());

        // Verify text matches
        $(Test.equal(decodedText, textContent));

        // Clean up
        $(sftp_delete(conn, "/upload/test-text.txt"));

        $(sftp_close(conn));
    });

    test("list returns file metadata", $ => {
        console.log("list returns file metadata");

        const config = $.let(TEST_CONFIG);
        const testData = $.let(new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])); // 10 bytes

        const conn = $.let(sftp_connect(config));

        // Upload a file
        $(sftp_put(conn, "/upload/metadata-test.bin", testData));

        // List to get metadata
        const files = $.let(sftp_list(conn, "/upload"));

        // Find our file in the list
        const foundFile = $.let(files.findFirst("metadata-test.bin", ($, v) => v.name));


        // Verify file was found (option should be Some)
        $.match(foundFile, {
            some: ($, idx) => {
                const file = $.let(files.get(idx));

                // Verify size is 10 bytes
                $(Test.equal(file.size, East.value(10n)));

                // Verify name matches
                $(Test.equal(file.name, East.value("metadata-test.bin")));

                // Verify it's a file (not a directory)
                $(Test.equal(file.isDirectory, East.value(false)));
            },
            none: ($) => $(Test.fail("Expected to find file in listing")),
        });

        // Clean up
        $(sftp_delete(conn, "/upload/metadata-test.bin"));

        $(sftp_close(conn));
    });

    test("put overwrites existing files", $ => {
        console.log("put overwrites existing files");

        const config = $.let(TEST_CONFIG);
        const data1 = $.let(new Uint8Array([1, 2, 3]));
        const data2 = $.let(new Uint8Array([4, 5, 6, 7, 8]));

        const conn = $.let(sftp_connect(config));

        // Upload first version
        $(sftp_put(conn, "/upload/overwrite-test.bin", data1));

        // Upload second version (overwrite)
        $(sftp_put(conn, "/upload/overwrite-test.bin", data2));

        // Download and verify it's the second version
        const downloaded = $.let(sftp_get(conn, "/upload/overwrite-test.bin"));
        $(Test.equal(downloaded, data2));

        // Clean up
        $(sftp_delete(conn, "/upload/overwrite-test.bin"));

        $(sftp_close(conn));
    });
}, {
    platformFns: SftpImpl,
    afterEach: $ => {
        // Close all connections after each test (even on failure)
        $(sftp_close_all());
    }
});
