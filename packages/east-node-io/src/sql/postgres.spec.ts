/**
 * Copyright (c) 2025 Elara AI Pty Ltd
 * Dual-licensed under AGPL-3.0 and commercial license. See LICENSE for details.
 */

/**
 * PostgreSQL platform function tests
 *
 * These tests use describeEast following east-node conventions.
 * Tests compile East functions and run them to validate platform function behavior.
 *
 * Requires Docker PostgreSQL service running on localhost:5432
 */
import { describeEast, Test } from "@elaraai/east-node-std";
import { East, variant, type ValueTypeOf } from "@elaraai/east";
import { postgres_connect, postgres_query, postgres_close, postgres_close_all, PostgresImpl } from "./postgres.js";
import { SqlRowType, SqlParameterType } from "./types.js";

await describeEast("PostgreSQL platform functions", (test) => {
    test("connect and close to PostgreSQL server", $ => {
        const config = $.let({
            host: "localhost",
            port: 5432n,
            database: "testdb",
            user: "testuser",
            password: "testpass",
            ssl: variant('none', null),
            maxConnections: variant('none', null),
        });

        const handle = $.let(postgres_connect(config));

        // Handle should be non-empty string
        $(Test.greater(handle.length(), East.value(0n)));

        // Close returns void, use $()
        $(postgres_close(handle));
    });

    test("query SELECT 1 returns result", $ => {
        const config = $.let({
            host: "localhost",
            port: 5432n,
            database: "testdb",
            user: "testuser",
            password: "testpass",
            ssl: variant('none', null),
            maxConnections: variant('none', null),
        });

        const conn = $.let(postgres_connect(config));

        // Execute a simple query
        const result = $.let(postgres_query(
            conn,
            "SELECT 1 AS value",
            []
        ));

        // Verify result is select variant using $.match
        $.match(result, {
            select: ($, selectResult) => {
                const expectedRow = $.let(new Map<string, ValueTypeOf<typeof SqlParameterType>>([
                    ["value", variant('Integer', 1n)],  // PostgreSQL int4 returns Integer with column metadata
                ]), SqlRowType);
                $(Test.equal(selectResult.rows, East.value([expectedRow])));
            },
            insert: ($, _) => $(Test.fail("Expected select, got insert")),
            update: ($, _) => $(Test.fail("Expected select, got update")),
            delete: ($, _) => $(Test.fail("Expected select, got delete")),
        });

        $(postgres_close(conn));
    });

    test("INSERT query returns insert variant", $ => {
        const config = $.let({
            host: "localhost",
            port: 5432n,
            database: "testdb",
            user: "testuser",
            password: "testpass",
            ssl: variant('none', null),
            maxConnections: variant('none', null),
        });

        const conn = $.let(postgres_connect(config));

        // Create temporary table
        $(postgres_query(
            conn,
            "CREATE TEMPORARY TABLE test_users (id SERIAL PRIMARY KEY, name TEXT)",
            []
        ));

        // Insert a row
        const result = $.let(postgres_query(
            conn,
            "INSERT INTO test_users (name) VALUES ($1)",
            [variant("String", "Alice")]
        ));

        // Verify result is insert variant using $.match
        $.match(result, {
            select: ($, _) => $(Test.fail("Expected insert, got select")),
            insert: ($, insertResult) => {
                // Verify rowsAffected
                $(Test.equal(insertResult.rowsAffected, East.value(1n)));
            },
            update: ($, _) => $(Test.fail("Expected insert, got update")),
            delete: ($, _) => $(Test.fail("Expected insert, got delete")),
        });

        $(postgres_close(conn));
    });

    test("UPDATE query returns update variant with rowsAffected", $ => {
        const config = $.let({
            host: "localhost",
            port: 5432n,
            database: "testdb",
            user: "testuser",
            password: "testpass",
            ssl: variant('none', null),
            maxConnections: variant('none', null),
        });

        const conn = $.let(postgres_connect(config));

        // Create temporary table and insert row
        $(postgres_query(
            conn,
            "CREATE TEMPORARY TABLE test_users (id SERIAL PRIMARY KEY, name TEXT)",
            []
        ));

        $(postgres_query(
            conn,
            "INSERT INTO test_users (name) VALUES ($1)",
            [variant("String", "Alice")]
        ));

        // Update the row
        const result = $.let(postgres_query(
            conn,
            "UPDATE test_users SET name = $1 WHERE name = $2",
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

        $(postgres_close(conn));
    });

    test("DELETE query returns delete variant with rowsAffected", $ => {
        const config = $.let({
            host: "localhost",
            port: 5432n,
            database: "testdb",
            user: "testuser",
            password: "testpass",
            ssl: variant('none', null),
            maxConnections: variant('none', null),
        });

        const conn = $.let(postgres_connect(config));

        // Create temporary table and insert row
        $(postgres_query(
            conn,
            "CREATE TEMPORARY TABLE test_users (id SERIAL PRIMARY KEY, name TEXT)",
            []
        ));

        $(postgres_query(
            conn,
            "INSERT INTO test_users (name) VALUES ($1)",
            [variant("String", "Alice")]
        ));

        // Delete the row
        const result = $.let(postgres_query(
            conn,
            "DELETE FROM test_users WHERE name = $1",
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

        $(postgres_close(conn));
    });

    test("query with parameters uses $1, $2 placeholders", $ => {
        const config = $.let({
            host: "localhost",
            port: 5432n,
            database: "testdb",
            user: "testuser",
            password: "testpass",
            ssl: variant('none', null),
            maxConnections: variant('none', null),
        });

        const conn = $.let(postgres_connect(config));

        // Create temporary table
        $(postgres_query(
            conn,
            "CREATE TEMPORARY TABLE test_params (id INTEGER, name TEXT)",
            []
        ));

        // Insert with parameters
        $(postgres_query(
            conn,
            "INSERT INTO test_params (id, name) VALUES ($1, $2)",
            [variant("Integer", 42n), variant("String", "test")]
        ));

        // Query back with parameter
        const result = $.let(postgres_query(
            conn,
            "SELECT * FROM test_params WHERE id = $1",
            [variant("Integer", 42n)]
        ));

        // Verify we got the row back using $.match
        $.match(result, {
            select: ($, selectResult) => {
                const expectedRow = $.let(new Map<string, ValueTypeOf<typeof SqlParameterType>>([
                    ["id", variant("Integer", 42n)],  // PostgreSQL int4 returns Integer with column metadata
                    ["name", variant("String", "test")],
                ]), SqlRowType);
                $(Test.equal(selectResult.rows, East.value([expectedRow])));
            },
            insert: ($, _) => $(Test.fail("Expected select, got insert")),
            update: ($, _) => $(Test.fail("Expected select, got update")),
            delete: ($, _) => $(Test.fail("Expected select, got delete")),
        });

        $(postgres_close(conn));
    });

    test("query with DateTime parameter and result", $ => {
        const config = $.let({
            host: "localhost",
            port: 5432n,
            database: "testdb",
            user: "testuser",
            password: "testpass",
            ssl: variant('none', null),
            maxConnections: variant('none', null),
        });

        const conn = $.let(postgres_connect(config));

        // Create temporary table with timestamp column
        $(postgres_query(
            conn,
            "CREATE TEMPORARY TABLE test_datetime (id INTEGER, created_at TIMESTAMP)",
            []
        ));

        const testDate = $.let(new Date("2025-01-15T10:30:00Z"));

        // Insert with datetime parameter
        $(postgres_query(
            conn,
            "INSERT INTO test_datetime (id, created_at) VALUES ($1, $2)",
            [variant("Integer", 1n), variant("DateTime", testDate)]
        ));

        // Query back with datetime
        const result = $.let(postgres_query(
            conn,
            "SELECT * FROM test_datetime WHERE id = $1",
            [variant("Integer", 1n)]
        ));

        // Verify we got the datetime back
        $.match(result, {
            select: ($, selectResult) => {
                const expectedRow = $.let(new Map<string, ValueTypeOf<typeof SqlParameterType>>([
                    ["id", variant("Integer", 1n)],  // PostgreSQL int4 returns Integer with column metadata
                    ["created_at", variant("DateTime", new Date("2025-01-15T10:30:00Z"))],
                ]), SqlRowType);
                $(Test.equal(selectResult.rows, East.value([expectedRow])));
            },
            insert: ($, _) => $(Test.fail("Expected select, got insert")),
            update: ($, _) => $(Test.fail("Expected select, got update")),
            delete: ($, _) => $(Test.fail("Expected select, got delete")),
        });

        $(postgres_close(conn));
    });

    test("query with parameters handles all PostgreSQL types", $ => {
        const config = $.let({
            host: "localhost",
            port: 5432n,
            database: "testdb",
            user: "testuser",
            password: "testpass",
            ssl: variant('none', null),
            maxConnections: variant('none', null),
        });

        const conn = $.let(postgres_connect(config));

        // Create temporary table with all data types
        $(postgres_query(
            conn,
            "CREATE TEMPORARY TABLE test_types (id INTEGER, str TEXT, num INTEGER, flt FLOAT8, bool BOOLEAN, nul TEXT, blob BYTEA, dt TIMESTAMP)",
            []
        ));

        const testDate = $.let(new Date("2025-01-15T10:30:00Z"));

        // Insert with all types
        $(postgres_query(
            conn,
            "INSERT INTO test_types (id, str, num, flt, bool, nul, blob, dt) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)",
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
        const result = $.let(postgres_query(
            conn,
            "SELECT * FROM test_types WHERE id = $1",
            [variant("Integer", 1n)]
        ));

        // Verify we got the row back using $.match
        $.match(result, {
            select: ($, selectResult) => {
                // Column types: id=INTEGER(23), str=TEXT(25), num=INTEGER(23), flt=FLOAT8(701), bool=BOOLEAN(16), nul=TEXT(25), blob=BYTEA(17), dt=TIMESTAMP(1114)
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

        $(postgres_close(conn));
    });
}, {
    platformFns: PostgresImpl,
    afterEach: $ => {
        // Close all connections after each test (even on failure)
        $(postgres_close_all());
    }
});
