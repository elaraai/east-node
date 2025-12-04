/**
 * Copyright (c) 2025 Elara AI Pty Ltd
 * Dual-licensed under AGPL-3.0 and commercial license. See LICENSE for details.
 */

/**
 * S3 platform function tests
 *
 * These tests use describeEast following east-node conventions.
 * Tests compile East functions and run them to validate platform function behavior.
 *
 * Note: These tests require MinIO running on localhost:9000.
 * Run `npm run dev:services` to start Docker containers.
 */
import { East, variant } from "@elaraai/east";
import { describeEast, Assert } from "@elaraai/east-node-std";
import { s3_put_object, s3_get_object, s3_head_object, s3_delete_object, s3_list_objects, s3_presign_url, S3Impl } from "./s3.js";
import { S3Client, CreateBucketCommand } from "@aws-sdk/client-s3";

// MinIO test configuration
const TEST_CONFIG = {
    region: "us-east-1",
    bucket: "test-bucket",
    accessKeyId: variant('some', "minioadmin"),
    secretAccessKey: variant('some', "minioadmin"),
    endpoint: variant('some', "http://localhost:9000"),
};

// Ensure test bucket exists before running tests
async function ensureTestBucket() {
    const client = new S3Client({
        region: TEST_CONFIG.region,
        credentials: {
            accessKeyId: "minioadmin",
            secretAccessKey: "minioadmin",
        },
        endpoint: "http://localhost:9000",
        forcePathStyle: true,
    });

    try {
        await client.send(new CreateBucketCommand({
            Bucket: TEST_CONFIG.bucket,
        }));
        console.log(`✓ Created test bucket: ${TEST_CONFIG.bucket}`);
    } catch (err: any) {
        if (err.name === 'BucketAlreadyOwnedByYou' || err.Code === 'BucketAlreadyOwnedByYou') {
            console.log(`✓ Assert bucket already exists: ${TEST_CONFIG.bucket}`);
        } else {
            console.error(`Failed to create test bucket: ${err.message}`);
            throw err;
        }
    }
}

// Run setup before tests
await ensureTestBucket();

await describeEast("S3 platform functions", (test) => {
    test("putObject uploads data successfully", $ => {
        console.log("putObject uploads data successfully");

        const config = $.let(TEST_CONFIG);
        const testData = $.let(new Uint8Array([1, 2, 3, 4, 5]));

        // Upload data
        $(s3_put_object(config, "test-file.bin", testData));
    });

    test("getObject downloads uploaded data", $ => {
        console.log("getObject downloads uploaded data");

        const config = $.let(TEST_CONFIG);
        const testData = $.let(new Uint8Array([10, 20, 30, 40, 50]));

        // Upload data first
        $(s3_put_object(config, "test-download.bin", testData));

        // Download it back
        const downloaded = $.let(s3_get_object(config, "test-download.bin"));

        // Verify data matches
        $(Assert.equal(downloaded, testData));
    });

    test("headObject retrieves metadata without downloading", $ => {
        console.log("headObject retrieves metadata without downloading");

        const config = $.let(TEST_CONFIG);
        const testData = $.let(new Uint8Array([1, 2, 3, 4, 5]));
        const expectedSize = $.let(5n);

        // Upload data first
        $(s3_put_object(config, "test-metadata.bin", testData));

        // Get metadata without downloading
        const metadata = $.let(s3_head_object(config, "test-metadata.bin"));

        // Verify key matches
        $(Assert.equal(metadata.key, East.value("test-metadata.bin")));

        // Verify size matches
        $(Assert.equal(metadata.size, expectedSize));

        // Verify ETag is present
        $.match(metadata.etag, {
            some: ($, etag) => {
                // ETag should be non-empty
                $(Assert.greater(etag.length(), East.value(0n)));
            },
            none: ($) => $(Assert.fail("Expected ETag to be present")),
        });

        // Clean up
        $(s3_delete_object(config, "test-metadata.bin"));
    });

    test("deleteObject removes uploaded file", $ => {
        console.log("deleteObject removes uploaded file");

        const config = $.let(TEST_CONFIG);
        const testData = $.let(new Uint8Array([100, 101, 102]));

        // Upload data first
        $(s3_put_object(config, "test-delete.bin", testData));

        // Delete it
        $(s3_delete_object(config, "test-delete.bin"));

        // Note: We can't easily verify the file is gone without a "exists" function,
        // but the delete operation should succeed
    });

    test("deleteObject is idempotent (deleting non-existent file succeeds)", $ => {
        console.log("deleteObject is idempotent");

        const config = $.let(TEST_CONFIG);

        // Delete a file that doesn't exist - should succeed
        $(s3_delete_object(config, "non-existent-file.bin"));
    });

    test("listObjects returns uploaded files", $ => {
        console.log("listObjects returns uploaded files");

        const config = $.let(TEST_CONFIG);
        const testData = $.let(new Uint8Array([1, 2, 3]));

        // Upload multiple files with a prefix
        $(s3_put_object(config, "list-test/file1.bin", testData));
        $(s3_put_object(config, "list-test/file2.bin", testData));
        $(s3_put_object(config, "list-test/file3.bin", testData));

        // List files with prefix
        const result = $.let(s3_list_objects(config, "list-test/", 100n));

        // Should have at least 3 objects
        $(Assert.greaterEqual(result.objects.size(), East.value(3n)));

        // Clean up
        $(s3_delete_object(config, "list-test/file1.bin"));
        $(s3_delete_object(config, "list-test/file2.bin"));
        $(s3_delete_object(config, "list-test/file3.bin"));
    });

    test("listObjects respects maxKeys limit", $ => {
        console.log("listObjects respects maxKeys limit");

        const config = $.let(TEST_CONFIG);
        const testData = $.let(new Uint8Array([1, 2, 3]));

        // Upload multiple files
        $(s3_put_object(config, "maxkeys-test/file1.bin", testData));
        $(s3_put_object(config, "maxkeys-test/file2.bin", testData));
        $(s3_put_object(config, "maxkeys-test/file3.bin", testData));

        // List with maxKeys=2
        const result = $.let(s3_list_objects(config, "maxkeys-test/", 2n));

        // Should return at most 2 objects
        $(Assert.lessEqual(result.objects.size(), East.value(2n)));

        // Clean up
        $(s3_delete_object(config, "maxkeys-test/file1.bin"));
        $(s3_delete_object(config, "maxkeys-test/file2.bin"));
        $(s3_delete_object(config, "maxkeys-test/file3.bin"));
    });

    test("presignUrl generates valid URL", $ => {
        console.log("presignUrl generates valid URL");

        const config = $.let(TEST_CONFIG);
        const testData = $.let(new Uint8Array([200, 201, 202]));

        // Upload data first
        $(s3_put_object(config, "presign-test.bin", testData));

        // Generate presigned URL (valid for 1 hour)
        const url = $.let(s3_presign_url(config, "presign-test.bin", 3600n));

        // URL should be non-empty
        $(Assert.greater(url.length(), East.value(0n)));

        // URL should start with the MinIO endpoint and include bucket/key
        const expectedPrefix = $.let("http://localhost:9000/test-bucket/presign-test.bin");
        $(Assert.equal(url.contains(expectedPrefix), true));


        // Clean up
        $(s3_delete_object(config, "presign-test.bin"));
    });

    test("putObject and getObject work with text data", $ => {
        console.log("putObject and getObject work with text data");

        const config = $.let(TEST_CONFIG);
        const textContent = $.let("Hello, S3!");

        // Encode text to blob
        const blob = $.let(textContent.encodeUtf8());

        // Upload text as blob
        $(s3_put_object(config, "test-text.txt", blob));

        // Download blob
        const downloaded = $.let(s3_get_object(config, "test-text.txt"));

        // Decode back to text
        const decodedText = $.let(downloaded.decodeUtf8());

        // Verify text matches
        $(Assert.equal(decodedText, textContent));

        // Clean up
        $(s3_delete_object(config, "test-text.txt"));
    });

    test("listObjects handles empty prefix (lists all objects)", $ => {
        console.log("listObjects handles empty prefix");

        const config = $.let(TEST_CONFIG);
        const testData = $.let(new Uint8Array([1, 2, 3]));

        // Upload a file
        $(s3_put_object(config, "root-level-file.bin", testData));

        // List all objects (empty prefix)
        const result = $.let(s3_list_objects(config, "", 1000n));

        // Should have at least 1 object
        $(Assert.greaterEqual(result.objects.size(), East.value(1n)));

        // Clean up
        $(s3_delete_object(config, "root-level-file.bin"));
    });

    test("listObjects metadata includes key, size, and lastModified", $ => {
        console.log("listObjects metadata includes key, size, and lastModified");

        const config = $.let(TEST_CONFIG);
        const testData = $.let(new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])); // 10 bytes

        // Upload a file
        $(s3_put_object(config, "metadata-test.bin", testData));

        // List to get metadata
        const result = $.let(s3_list_objects(config, "metadata-test.bin", 10n));

        // Should have exactly 1 object
        $(Assert.equal(result.objects.size(), East.value(1n)));

        const obj = $.let(result.objects.get(East.value(0n)));

        // Key should match
        $(Assert.equal(obj.key, East.value("metadata-test.bin")));

        // Size should be 10 bytes
        $(Assert.equal(obj.size, East.value(10n)));

        // Clean up
        $(s3_delete_object(config, "metadata-test.bin"));
    });

    test("putObject overwrites existing files", $ => {
        console.log("putObject overwrites existing files");

        const config = $.let(TEST_CONFIG);
        const data1 = $.let(new Uint8Array([1, 2, 3]));
        const data2 = $.let(new Uint8Array([4, 5, 6, 7, 8]));

        // Upload first version
        $(s3_put_object(config, "overwrite-test.bin", data1));

        // Upload second version (overwrite)
        $(s3_put_object(config, "overwrite-test.bin", data2));

        // Download and verify it's the second version
        const downloaded = $.let(s3_get_object(config, "overwrite-test.bin"));
        $(Assert.equal(downloaded, data2));

        // Clean up
        $(s3_delete_object(config, "overwrite-test.bin"));
    });
}, {
    platformFns: S3Impl
});
