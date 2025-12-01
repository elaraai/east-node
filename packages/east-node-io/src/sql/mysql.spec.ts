/**
 * Copyright (c) 2025 Elara AI Pty Ltd
 * Licensed under AGPL-3.0. See LICENSE file for details.
 */

/**
 * MySQL platform function tests
 *
 * These tests use describeEast following east-node conventions.
 * Tests compile East functions and run them to validate platform function behavior.
 *
 * Requires Docker MySQL service running on localhost:3306
 */
import { describeEast, Test } from "@elaraai/east-node";
import { East, variant, type ValueTypeOf } from "@elaraai/east";
import { mysql_connect, mysql_query, mysql_close, mysql_close_all, MySqlImpl } from "./mysql.js";
import { SqlRowType, SqlParameterType } from "./types.js";

await describeEast("MySQL platform functions", (test) => {
    test("connect and close to MySQL server", $ => {
        const config = $.let({
            host: "localhost",
            port: 3306n,
            database: "testdb",
            user: "testuser",
            password: "testpass",
            ssl: variant('none', null),
            maxConnections: variant('none', null),
        });

        const handle = $.let(mysql_connect(config));

        // Handle should be non-empty string
        $(Test.greater(handle.length(), East.value(0n)));

        // Close returns void, use $()
        $(mysql_close(handle));
    });

    test("query SELECT 1 returns result", $ => {
        const config = $.let({
            host: "localhost",
            port: 3306n,
            database: "testdb",
            user: "testuser",
            password: "testpass",
            ssl: variant('none', null),
            maxConnections: variant('none', null),
        });

        const conn = $.let(mysql_connect(config));

        // Execute a simple query
        const result = $.let(mysql_query(
            conn,
            "SELECT 1 AS value",
            []
        ));

        // Verify result is select variant using $.match
        $.match(result, {
            select: ($, selectResult) => {
                const expectedRow = $.let(new Map<string, ValueTypeOf<typeof SqlParameterType>>([
                    ["value", variant('Integer', 1n)],  // MySQL LONG returns Integer with column metadata
                ]), SqlRowType);
                $(Test.equal(selectResult.rows, East.value([expectedRow])));
            },
            insert: ($, _) => $(Test.fail("Expected select, got insert")),
            update: ($, _) => $(Test.fail("Expected select, got update")),
            delete: ($, _) => $(Test.fail("Expected select, got delete")),
        });

        $(mysql_close(conn));
    });

    test("INSERT query returns insert variant with lastInsertId", $ => {
        const config = $.let({
            host: "localhost",
            port: 3306n,
            database: "testdb",
            user: "testuser",
            password: "testpass",
            ssl: variant('none', null),
            maxConnections: variant('none', null),
        });

        const conn = $.let(mysql_connect(config));

        // Create temporary table
        $(mysql_query(
            conn,
            "CREATE TEMPORARY TABLE test_users (id INT AUTO_INCREMENT PRIMARY KEY, name TEXT)",
            []
        ));

        // Insert a row
        const result = $.let(mysql_query(
            conn,
            "INSERT INTO test_users (name) VALUES (?)",
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

        $(mysql_close(conn));
    });

    test("UPDATE query returns update variant with rowsAffected", $ => {
        const config = $.let({
            host: "localhost",
            port: 3306n,
            database: "testdb",
            user: "testuser",
            password: "testpass",
            ssl: variant('none', null),
            maxConnections: variant('none', null),
        });

        const conn = $.let(mysql_connect(config));

        // Create temporary table and insert row
        $(mysql_query(
            conn,
            "CREATE TEMPORARY TABLE test_users (id INT AUTO_INCREMENT PRIMARY KEY, name TEXT)",
            []
        ));

        $(mysql_query(
            conn,
            "INSERT INTO test_users (name) VALUES (?)",
            [variant("String", "Alice")]
        ));

        // Update the row
        const result = $.let(mysql_query(
            conn,
            "UPDATE test_users SET name = ? WHERE name = ?",
            [variant("String", "Bob"), variant("String", "Alice")]
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

        $(mysql_close(conn));
    });

    test("DELETE query returns delete variant with rowsAffected", $ => {
        const config = $.let({
            host: "localhost",
            port: 3306n,
            database: "testdb",
            user: "testuser",
            password: "testpass",
            ssl: variant('none', null),
            maxConnections: variant('none', null),
        });

        const conn = $.let(mysql_connect(config));

        // Create temporary table and insert row
        $(mysql_query(
            conn,
            "CREATE TEMPORARY TABLE test_users (id INT AUTO_INCREMENT PRIMARY KEY, name TEXT)",
            []
        ));

        $(mysql_query(
            conn,
            "INSERT INTO test_users (name) VALUES (?)",
            [variant("String", "Alice")]
        ));

        // Delete the row
        const result = $.let(mysql_query(
            conn,
            "DELETE FROM test_users WHERE name = ?",
            [variant("String", "Alice")]
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

        $(mysql_close(conn));
    });

    test("query with parameters uses ? placeholders", $ => {
        const config = $.let({
            host: "localhost",
            port: 3306n,
            database: "testdb",
            user: "testuser",
            password: "testpass",
            ssl: variant('none', null),
            maxConnections: variant('none', null),
        });

        const conn = $.let(mysql_connect(config));

        // Create temporary table
        $(mysql_query(
            conn,
            "CREATE TEMPORARY TABLE test_params (id INT, name TEXT)",
            []
        ));

        // Insert with parameters
        $(mysql_query(
            conn,
            "INSERT INTO test_params (id, name) VALUES (?, ?)",
            [variant("Integer", 42n), variant("String", "test")]
        ));

        // Query back with parameter
        const result = $.let(mysql_query(
            conn,
            "SELECT * FROM test_params WHERE id = ?",
            [variant("Integer", 42n)]
        ));

        // Verify we got the row back using $.match
        $.match(result, {
            select: ($, selectResult) => {
                const expectedRow = $.let(new Map<string, ValueTypeOf<typeof SqlParameterType>>([
                    ["id", variant("Integer", 42n)],  // MySQL INT returns Integer with column metadata
                    ["name", variant("String", "test")],
                ]), SqlRowType);
                $(Test.equal(selectResult.rows, East.value([expectedRow])));
            },
            insert: ($, _) => $(Test.fail("Expected select, got insert")),
            update: ($, _) => $(Test.fail("Expected select, got update")),
            delete: ($, _) => $(Test.fail("Expected select, got delete")),
        });

        $(mysql_close(conn));
    });

    test("query with DateTime parameter and result", $ => {
        const config = $.let({
            host: "localhost",
            port: 3306n,
            database: "testdb",
            user: "testuser",
            password: "testpass",
            ssl: variant('none', null),
            maxConnections: variant('none', null),
        });

        const conn = $.let(mysql_connect(config));

        // Create temporary table with timestamp column
        $(mysql_query(
            conn,
            "CREATE TEMPORARY TABLE test_datetime (id INT, created_at DATETIME)",
            []
        ));

        const testDate = $.let(new Date("2025-01-15T10:30:00Z"));

        // Insert with datetime parameter
        $(mysql_query(
            conn,
            "INSERT INTO test_datetime (id, created_at) VALUES (?, ?)",
            [variant("Integer", 1n), variant("DateTime", testDate)]
        ));

        // Query back with datetime
        const result = $.let(mysql_query(
            conn,
            "SELECT * FROM test_datetime WHERE id = ?",
            [variant("Integer", 1n)]
        ));

        // Verify we got the datetime back
        $.match(result, {
            select: ($, selectResult) => {
                const expectedRow = $.let(new Map<string, ValueTypeOf<typeof SqlParameterType>>([
                    ["id", variant("Integer", 1n)],  // MySQL INT returns Integer with column metadata
                    ["created_at", variant("DateTime", new Date("2025-01-15T10:30:00Z"))],
                ]), SqlRowType);
                $(Test.equal(selectResult.rows, East.value([expectedRow])));
            },
            insert: ($, _) => $(Test.fail("Expected select, got insert")),
            update: ($, _) => $(Test.fail("Expected select, got update")),
            delete: ($, _) => $(Test.fail("Expected select, got delete")),
        });

        $(mysql_close(conn));
    });

    test("query with parameters handles all MySQL types", $ => {
        const config = $.let({
            host: "localhost",
            port: 3306n,
            database: "testdb",
            user: "testuser",
            password: "testpass",
            ssl: variant('none', null),
            maxConnections: variant('none', null),
        });

        const conn = $.let(mysql_connect(config));

        // Create temporary table with all data types
        $(mysql_query(
            conn,
            "CREATE TEMPORARY TABLE test_types (id INT, str TEXT, num INT, flt DOUBLE, bool BOOLEAN, nul TEXT, `blob` BLOB, dt DATETIME)",
            []
        ));

        const testDate = $.let(new Date("2025-01-15T10:30:00Z"));

        // Insert with all types
        $(mysql_query(
            conn,
            "INSERT INTO test_types (id, str, num, flt, bool, nul, `blob`, dt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
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
        const result = $.let(mysql_query(
            conn,
            "SELECT * FROM test_types WHERE id = ?",
            [variant("Integer", 1n)]
        ));

        // Verify we got the row back using $.match
        $.match(result, {
            select: ($, selectResult) => {
                // Column types: id=INT(3), str=TEXT(252), num=INT(3), flt=DOUBLE(5), bool=TINYINT(1), nul=TEXT(252), blob=BLOB(252), dt=DATETIME(12)
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

        $(mysql_close(conn));
    });
}, {
    platformFns: MySqlImpl,
    afterEach: $ => {
        // Close all connections after each test (even on failure)
        $(mysql_close_all());
    }
});
    