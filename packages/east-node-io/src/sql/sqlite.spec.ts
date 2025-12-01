/**
 * Copyright (c) 2025 Elara AI Pty Ltd
 * Licensed under AGPL-3.0. See LICENSE file for details.
 */

/**
 * SQLite platform function tests
 *
 * These tests use describeEast following east-node conventions.
 * Tests compile East functions and run them to validate platform function behavior.
 */
import { East, variant, type ValueTypeOf } from "@elaraai/east";
import { describeEast, Test } from "@elaraai/east-node";
import { sqlite_connect, sqlite_query, sqlite_close, sqlite_close_all, SqliteImpl } from "./sqlite.js";
import { SqlRowType, SqlParameterType } from "./types.js";

await describeEast("SQLite platform functions", (test) => {
    test("connect and close with in-memory database", $ => {
        const config = $.let({
            path: ":memory:",
            readOnly: variant('none', null),
            memory: variant('some', true),
        });

        const handle = $.let(sqlite_connect(config));

        // Handle should be non-empty string
        $(Test.greater(handle.length(), East.value(0n)));

        // Close returns void, use $()
        $(sqlite_close(handle));
    });

    test("query SELECT 1 returns result", $ => {
        console.log("query SELECT 1 returns result")

        const config = $.let({
            path: ":memory:",
            readOnly: variant('none', null),
            memory: variant('some', true),
        });

        const conn = $.let(sqlite_connect(config));

        // Execute a simple query
        const result = $.let(sqlite_query(
            conn,
            "SELECT 1 AS value",
            []
        ));

        // Verify result is select variant using $.match
        $.match(result, {
            select: ($, selectResult) => {
                // Note: SELECT 1 has no column type metadata (null), so it's interpreted as Float
                const expectedRow = $.let(new Map<string, ValueTypeOf<typeof SqlParameterType>>([
                    ["value", variant('Float', 1.0)],
                ]), SqlRowType);
                $(Test.equal(selectResult.rows, East.value([expectedRow])));
            },
            insert: ($, _) => $(Test.fail("Expected select, got insert")),
            update: ($, _) => $(Test.fail("Expected select, got update")),
            delete: ($, _) => $(Test.fail("Expected select, got delete")),
        });

        $(sqlite_close(conn));
    });

    test("INSERT query returns insert variant with lastInsertId", $ => {
        console.log("INSERT query returns insert variant with lastInsertId")
        const config = $.let({
            path: ":memory:",
            readOnly: variant('none', null),
            memory: variant('some', true),
        });

        const conn = $.let(sqlite_connect(config));

        // Create table
        $(sqlite_query(
            conn,
            "CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT)",
            []
        ));

        // Insert a row
        const result = $.let(sqlite_query(
            conn,
            "INSERT INTO users (name) VALUES (?)",
            [variant("String", "Alice")]
        ));

        // Verify result is insert variant using $.match
        $.match(result, {
            select: ($, _) => $(Test.fail("Expected insert, got select")),
            insert: ($, insertResult) => {
                // Verify rowsAffected
                $(Test.equal(insertResult.rowsAffected, East.value(1n)));

                // Verify lastInsertId is Some
                $.match(insertResult.lastInsertId, {
                    some: ($, id) => $(Test.equal(id, East.value(1n))),
                    none: ($) => $(Test.fail("Expected lastInsertId to be Some")),
                });
            },
            update: ($, _) => $(Test.fail("Expected insert, got update")),
            delete: ($, _) => $(Test.fail("Expected insert, got delete")),
        });

        $(sqlite_close(conn));
    });

    test("UPDATE query returns update variant with rowsAffected", $ => {
        console.log("UPDATE query returns update variant with rowsAffected")
        const config = $.let({
            path: ":memory:",
            readOnly: variant('none', null),
            memory: variant('some', true),
        });

        const conn = $.let(sqlite_connect(config));

        // Create table and insert row
        $(sqlite_query(
            conn,
            "CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT)",
            []
        ));

        $(sqlite_query(
            conn,
            "INSERT INTO users (name) VALUES (?)",
            [variant("String", "Alice")]
        ));

        // Update the row
        const result = $.let(sqlite_query(
            conn,
            "UPDATE users SET name = ? WHERE id = ?",
            [variant("String", "Bob"), variant("Integer", 1n)]
        ));

        // Verify result is update variant using $.match
        $.match(result, {
            select: ($, _) => $(Test.fail("Expected update, got select")),
            insert: ($, _) => $(Test.fail("Expected update, got insert")),
            update: ($, updateResult) => {
                $(Test.equal(updateResult.rowsAffected, East.value(1n)));
            },
            delete: ($, _) => $(Test.fail("Expected update, got delete")),
        });

        $(sqlite_close(conn));
    });

    test("DELETE query returns delete variant with rowsAffected", $ => {
        console.log("DELETE query returns delete variant with rowsAffected")
        const config = $.let({
            path: ":memory:",
            readOnly: variant('none', null),
            memory: variant('some', true),
        });

        const conn = $.let(sqlite_connect(config));

        // Create table and insert row
        $(sqlite_query(
            conn,
            "CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT)",
            []
        ));

        $(sqlite_query(
            conn,
            "INSERT INTO users (name) VALUES (?)",
            [variant("String", "Alice")]
        ));

        // Delete the row
        const result = $.let(sqlite_query(
            conn,
            "DELETE FROM users WHERE id = ?",
            [variant("Integer", 1n)]
        ));

        // Verify result is delete variant using $.match
        $.match(result, {
            select: ($, _) => $(Test.fail("Expected delete, got select")),
            insert: ($, _) => $(Test.fail("Expected delete, got insert")),
            update: ($, _) => $(Test.fail("Expected delete, got update")),
            delete: ($, deleteResult) => {
                $(Test.equal(deleteResult.rowsAffected, East.value(1n)));
            },
        });

        $(sqlite_close(conn));
    });

    test("query with parameters handles all SQL types", $ => {
        console.log("query with parameters handles all SQL types")
        const config = $.let({
            path: ":memory:",
            readOnly: variant('none', null),
            memory: variant('some', true),
        });

        const conn = $.let(sqlite_connect(config));

        // Create table
        $(sqlite_query(
            conn,
            "CREATE TABLE test_types (id INTEGER, str TEXT, num INTEGER, flt REAL, bool BOOLEAN, nul TEXT, blob BLOB, dt DATETIME)",
            []
        ));

        const testDate = $.let(new Date("2025-01-15T10:30:00Z"));

        // Insert with all types
        $(sqlite_query(
            conn,
            "INSERT INTO test_types (id, str, num, flt, bool, nul, blob, dt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            [
                variant("Integer", 1n),
                variant("String", "test"),
                variant("Integer", 42n),
                variant("Float", 3.14),
                variant("Boolean", true),
                variant("Null", null),
                variant("Blob", new Uint8Array([1, 2, 3])),
                variant("DateTime", testDate),
            ]
        ));

        // Query back the values
        const result = $.let(sqlite_query(
            conn,
            "SELECT * FROM test_types WHERE id = ?",
            [variant("Integer", 1n)]
        ));

        // Verify we got the row back using $.match
        $.match(result, {
            select: ($, selectResult) => {
                // Column types: id=INTEGER, str=TEXT, num=INTEGER, flt=REAL, bool=BOOLEAN, nul=TEXT, blob=BLOB, dt=DATETIME
                const expectedRow = $.let(new Map<string, ValueTypeOf<typeof SqlParameterType>>([
                    ["id", variant("Integer", 1n)],
                    ["str", variant("String", "test")],
                    ["num", variant("Integer", 42n)],
                    ["flt", variant("Float", 3.14)],
                    ["bool", variant("Boolean", true)],
                    ["nul", variant("Null", null)],
                    ["blob", variant("Blob", new Uint8Array([1, 2, 3]))],
                    ["dt", variant("DateTime", new Date("2025-01-15T10:30:00Z"))],
                ]), SqlRowType);
                $(Test.equal(selectResult.rows, East.value([expectedRow])));
            },
            insert: ($, _) => $(Test.fail("Expected select, got insert")),
            update: ($, _) => $(Test.fail("Expected select, got update")),
            delete: ($, _) => $(Test.fail("Expected select, got delete")),
        });

        $(sqlite_close(conn));
    });
}, {
    platformFns: SqliteImpl,
    afterEach: $ => {
        // Close all connections after each test (even on failure)
        $(sqlite_close_all());
    }
});
