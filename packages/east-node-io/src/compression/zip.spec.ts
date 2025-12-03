/**
 * Copyright (c) 2025 Elara AI Pty Ltd
 * Dual-licensed under AGPL-3.0 and commercial license. See LICENSE for details.
 */

import { East, variant } from "@elaraai/east";
import { describeEast, Test } from "@elaraai/east-node-std";
import { zip_compress, zip_decompress, ZipImpl } from "./zip.js";

await describeEast("ZIP Platform Functions", (test) => {
    test("creates and extracts a ZIP archive with single file", $ => {
        const fileContent = "Hello from file1.txt";
        const entries = $.let([
            {
                name: "file1.txt",
                data: East.value(fileContent).encodeUtf8(),
            },
        ]);

        const options = $.let({
            level: variant('some', 6n),
        });

        // Create ZIP
        const zipBlob = $.let(zip_compress(entries, options));

        // Extract ZIP
        const files = $.let(zip_decompress(zipBlob));

        // Verify file was extracted
        $(Test.equal(files.size(), 1n));

        const extractedData = $.let(files.get("file1.txt"));
        const extractedText = $.let(extractedData.decodeUtf8());
        $(Test.equal(extractedText, fileContent));
    });

    test("creates and extracts a ZIP archive with multiple files", $ => {
        const entries = $.let([
            {
                name: "file1.txt",
                data: East.value("Content of file 1").encodeUtf8(),
            },
            {
                name: "file2.txt",
                data: East.value("Content of file 2").encodeUtf8(),
            },
            {
                name: "file3.txt",
                data: East.value("Content of file 3").encodeUtf8(),
            },
        ]);

        const options = $.let({
            level: variant('some', 9n),
        });

        const zipBlob = $.let(zip_compress(entries, options));
        const files = $.let(zip_decompress(zipBlob));

        $(Test.equal(files.size(), 3n));

        const file1 = $.let(files.get("file1.txt").decodeUtf8());
        const file2 = $.let(files.get("file2.txt").decodeUtf8());
        const file3 = $.let(files.get("file3.txt").decodeUtf8());

        $(Test.equal(file1, "Content of file 1"));
        $(Test.equal(file2, "Content of file 2"));
        $(Test.equal(file3, "Content of file 3"));
    });

    test("handles files with directory paths", $ => {
        const entries = $.let([
            {
                name: "dir1/file1.txt",
                data: East.value("File in dir1").encodeUtf8(),
            },
            {
                name: "dir2/subdir/file2.txt",
                data: East.value("File in dir2/subdir").encodeUtf8(),
            },
        ]);

        const options = $.let({
            level: variant('none', null),
        });

        const zipBlob = $.let(zip_compress(entries, options));
        const files = $.let(zip_decompress(zipBlob));

        $(Test.equal(files.size(), 2n));

        const file1 = $.let(files.get("dir1/file1.txt").decodeUtf8());
        const file2 = $.let(files.get("dir2/subdir/file2.txt").decodeUtf8());

        $(Test.equal(file1, "File in dir1"));
        $(Test.equal(file2, "File in dir2/subdir"));
    });

    test("handles empty file", $ => {
        const entries = $.let([
            {
                name: "empty.txt",
                data: East.value("").encodeUtf8(),
            },
        ]);

        const options = $.let({
            level: variant('some', 6n),
        });

        const zipBlob = $.let(zip_compress(entries, options));
        const files = $.let(zip_decompress(zipBlob));

        $(Test.equal(files.size(), 1n));

        const extractedText = $.let(files.get("empty.txt").decodeUtf8());
        $(Test.equal(extractedText, ""));
    });
}, { platformFns: ZipImpl });
