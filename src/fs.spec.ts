/**
 * Copyright (c) 2025 Elara AI Pty Ltd
 * Licensed under AGPL-3.0. See LICENSE file for details.
 */
import { East } from "@elaraai/east";
import { describeEast, Test } from "./test.js";
import { FileSystem, FileSystemImpl } from "./fs.js";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const testDir = mkdtempSync(join(tmpdir(), 'east-fs-test-'));

await describeEast("FileSystem platform functions", (test) => {
    test("writeFile and readFile work", $ => {
        const path = $.let(East.value(join(testDir, "test.txt")));
        const content = $.let(East.value("Hello, World!"));

        $(FileSystem.writeFile(path, content));
        const read = $.let(FileSystem.readFile(path));

        $(Test.equal(read, "Hello, World!"));
    });

    test("appendFile appends content", $ => {
        const path = $.let(East.value(join(testDir, "append.txt")));

        $(FileSystem.writeFile(path, "Line 1\n"));
        $(FileSystem.appendFile(path, "Line 2\n"));

        const content = $.let(FileSystem.readFile(path));
        $(Test.equal(content, "Line 1\nLine 2\n"));
    });

    test("exists returns true for existing files", $ => {
        const path = $.let(East.value(join(testDir, "exists.txt")));

        $(FileSystem.writeFile(path, "content"));
        const exists = $.let(FileSystem.exists(path));

        $(Test.equal(exists, true));
    });

    test("exists returns false for non-existing files", $ => {
        const path = $.let(East.value(join(testDir, "does-not-exist.txt")));
        const exists = $.let(FileSystem.exists(path));

        $(Test.equal(exists, false));
    });

    test("isFile returns true for files", $ => {
        const path = $.let(East.value(join(testDir, "file.txt")));

        $(FileSystem.writeFile(path, "content"));
        const isFile = $.let(FileSystem.isFile(path));

        $(Test.equal(isFile, true));
    });

    test("isDirectory returns true for directories", $ => {
        const path = $.let(East.value(join(testDir, "subdir")));

        $(FileSystem.createDirectory(path));
        const isDir = $.let(FileSystem.isDirectory(path));

        $(Test.equal(isDir, true));
    });

    test("createDirectory creates nested directories", $ => {
        const path = $.let(East.value(join(testDir, "a", "b", "c")));

        $(FileSystem.createDirectory(path));
        const exists = $.let(FileSystem.exists(path));

        $(Test.equal(exists, true));
    });

    test("readDirectory lists directory contents", $ => {
        const dir = $.let(East.value(join(testDir, "listdir")));

        $(FileSystem.createDirectory(dir));
        $(FileSystem.writeFile(dir.concat("/file1.txt"), "a"));
        $(FileSystem.writeFile(dir.concat("/file2.txt"), "b"));

        const entries = $.let(FileSystem.readDirectory(dir));
        const count = $.let(entries.size());

        $(Test.equal(count, 2n));
    });

    test("deleteFile removes a file", $ => {
        const path = $.let(East.value(join(testDir, "delete-me.txt")));

        $(FileSystem.writeFile(path, "content"));
        $(FileSystem.deleteFile(path));

        const exists = $.let(FileSystem.exists(path));
        $(Test.equal(exists, false));
    });

    test("writeFileBytes and readFileBytes work with binary data", $ => {
        const path = $.let(East.value(join(testDir, "binary.dat")));
        const data = $.let(new Uint8Array([0, 1, 2, 255]));

        $(FileSystem.writeFileBytes(path, data));
        const read = $.let(FileSystem.readFileBytes(path));

        $(Test.equal(read, data));
    });
}, { platformFns: FileSystemImpl });

// Cleanup test directory after tests
rmSync(testDir, { recursive: true, force: true });
