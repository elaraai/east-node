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
import { describeEast, Assert, NodePlatform } from "@elaraai/east-node-std";
import { East, IntegerType, StringType, FloatType, BooleanType, StructType, OptionType, variant, type ValueTypeOf } from "@elaraai/east";
import { postgres_connect, postgres_query, postgres_select, postgres_close, postgres_close_all, PostgresImpl } from "./postgres.js";
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
        $(Assert.greater(handle.length(), East.value(0n)));

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
                $(Assert.equal(selectResult.rows, East.value([expectedRow])));
            },
            insert: ($, _) => $(Assert.fail("Expected select, got insert")),
            update: ($, _) => $(Assert.fail("Expected select, got update")),
            delete: ($, _) => $(Assert.fail("Expected select, got delete")),
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
            select: ($, _) => $(Assert.fail("Expected insert, got select")),
            insert: ($, insertResult) => {
                // Verify rowsAffected
                $(Assert.equal(insertResult.rowsAffected, East.value(1n)));
            },
            update: ($, _) => $(Assert.fail("Expected insert, got update")),
            delete: ($, _) => $(Assert.fail("Expected insert, got delete")),
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
            select: ($, _) => $(Assert.fail("Expected update, got select")),
            insert: ($, _) => $(Assert.fail("Expected update, got insert")),
            update: ($, updateResult) => {
                $(Assert.equal(updateResult.rowsAffected, East.value(1n)));
            },
            delete: ($, _) => $(Assert.fail("Expected update, got delete")),
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
            select: ($, _) => $(Assert.fail("Expected delete, got select")),
            insert: ($, _) => $(Assert.fail("Expected delete, got insert")),
            update: ($, _) => $(Assert.fail("Expected delete, got update")),
            delete: ($, deleteResult) => {
                $(Assert.equal(deleteResult.rowsAffected, East.value(1n)));
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
                $(Assert.equal(selectResult.rows, East.value([expectedRow])));
            },
            insert: ($, _) => $(Assert.fail("Expected select, got insert")),
            update: ($, _) => $(Assert.fail("Expected select, got update")),
            delete: ($, _) => $(Assert.fail("Expected select, got delete")),
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
                $(Assert.equal(selectResult.rows, East.value([expectedRow])));
            },
            insert: ($, _) => $(Assert.fail("Expected select, got insert")),
            update: ($, _) => $(Assert.fail("Expected select, got update")),
            delete: ($, _) => $(Assert.fail("Expected select, got delete")),
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
                $(Assert.equal(selectResult.rows, East.value([expectedRow])));
            },
            insert: ($, _) => $(Assert.fail("Expected select, got insert")),
            update: ($, _) => $(Assert.fail("Expected select, got update")),
            delete: ($, _) => $(Assert.fail("Expected select, got delete")),
        });

        $(postgres_close(conn));
    });

    // Tests for postgres_select (generic platform function)

    test("select with typed row returns correct structure", $ => {
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

        // Create temporary table and populate
        $(postgres_query(conn, "CREATE TEMPORARY TABLE test_select_users (id INTEGER, name TEXT, active BOOLEAN)", []));
        $(postgres_query(conn, "INSERT INTO test_select_users VALUES (1, 'Alice', true)", []));
        $(postgres_query(conn, "INSERT INTO test_select_users VALUES (2, 'Bob', false)", []));

        // Define expected row type
        const UserRowType = StructType({
            id: IntegerType,
            name: StringType,
            active: BooleanType,
        });

        // Query with typed results
        const users = $.let(postgres_select([UserRowType], conn, "SELECT id, name, active FROM test_select_users ORDER BY id", []));

        // Verify row count
        $(Assert.equal(users.size(), East.value(2n)));

        $(postgres_close(conn));
    });

    test("select with partial columns", $ => {
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

        // Create temporary table and populate
        $(postgres_query(conn, "CREATE TEMPORARY TABLE test_select_products (id INTEGER, name TEXT, price FLOAT8, stock INTEGER)", []));
        $(postgres_query(conn, "INSERT INTO test_select_products VALUES (1, 'Widget', 9.99, 100)", []));

        // Define partial row type (only some columns)
        const PartialProductType = StructType({
            name: StringType,
            price: FloatType,
        });

        // Query with only selected columns
        const products = $.let(postgres_select([PartialProductType], conn, "SELECT name, price FROM test_select_products", []));

        // Verify we got results
        $(Assert.equal(products.size(), East.value(1n)));

        $(postgres_close(conn));
    });

    test("select with parameters", $ => {
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

        // Create temporary table and populate
        $(postgres_query(conn, "CREATE TEMPORARY TABLE test_select_orders (id INTEGER, customer TEXT, total FLOAT8)", []));
        $(postgres_query(conn, "INSERT INTO test_select_orders VALUES (1, 'Alice', 50.00)", []));
        $(postgres_query(conn, "INSERT INTO test_select_orders VALUES (2, 'Bob', 75.50)", []));
        $(postgres_query(conn, "INSERT INTO test_select_orders VALUES (3, 'Alice', 25.00)", []));

        const OrderType = StructType({
            id: IntegerType,
            customer: StringType,
            total: FloatType,
        });

        // Query with parameter (PostgreSQL uses $1, $2, etc.)
        const aliceOrders = $.let(postgres_select([OrderType], conn,
            "SELECT id, customer, total FROM test_select_orders WHERE customer = $1",
            [variant("String", "Alice")]
        ));

        // Alice has 2 orders
        $(Assert.equal(aliceOrders.size(), East.value(2n)));

        $(postgres_close(conn));
    });

    test("select with LIMIT returns correct count", $ => {
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

        // Create temporary table with many rows
        $(postgres_query(conn, "CREATE TEMPORARY TABLE test_select_items (id INTEGER, value TEXT)", []));
        $(postgres_query(conn, "INSERT INTO test_select_items VALUES (1, 'a'), (2, 'b'), (3, 'c'), (4, 'd'), (5, 'e')", []));

        const ItemType = StructType({
            id: IntegerType,
            value: StringType,
        });

        // Query with LIMIT
        const items = $.let(postgres_select([ItemType], conn, "SELECT id, value FROM test_select_items LIMIT 3", []));

        // Should return exactly 3 rows
        $(Assert.equal(items.size(), East.value(3n)));

        $(postgres_close(conn));
    });

    test("select empty result returns empty array", $ => {
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

        // Create empty temporary table
        $(postgres_query(conn, "CREATE TEMPORARY TABLE test_select_empty (id INTEGER, name TEXT)", []));

        const RowType = StructType({
            id: IntegerType,
            name: StringType,
        });

        // Query empty table
        const rows = $.let(postgres_select([RowType], conn, "SELECT id, name FROM test_select_empty", []));

        // Should return empty array
        $(Assert.equal(rows.size(), East.value(0n)));

        $(postgres_close(conn));
    });

    // Error case tests

    test("select throws error when null value encountered for non-optional field", $ => {
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

        // Create temporary table and insert row with NULL value
        $(postgres_query(conn, "CREATE TEMPORARY TABLE test_null_error (id INTEGER, name TEXT)", []));
        $(postgres_query(conn, "INSERT INTO test_null_error VALUES (1, NULL)", []));

        // Define row type WITHOUT OptionType for nullable column
        const RowType = StructType({
            id: IntegerType,
            name: StringType,  // Not optional, but column has NULL
        });

        // Should throw error about null value for required field
        $(Assert.throws(
            postgres_select([RowType], conn, "SELECT id, name FROM test_null_error", []),
            /null value.*required field.*name.*OptionType/
        ));

        $(postgres_close(conn));
    });

    test("select succeeds when null value encountered for optional field", $ => {
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

        // Create temporary table and insert row with NULL value
        $(postgres_query(conn, "CREATE TEMPORARY TABLE test_null_ok (id INTEGER, name TEXT)", []));
        $(postgres_query(conn, "INSERT INTO test_null_ok VALUES (1, NULL)", []));

        // Define row type WITH OptionType for nullable column
        const RowType = StructType({
            id: IntegerType,
            name: OptionType(StringType),  // Optional - can handle NULL
        });

        // Should succeed
        const rows = $.let(postgres_select([RowType], conn, "SELECT id, name FROM test_null_ok", []));
        $(Assert.equal(rows.size(), East.value(1n)));

        $(postgres_close(conn));
    });

    test("select throws error when field type does not match column type", $ => {
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

        // Create temporary table with INTEGER column
        $(postgres_query(conn, "CREATE TEMPORARY TABLE test_type_error (id INTEGER, count INTEGER)", []));
        $(postgres_query(conn, "INSERT INTO test_type_error VALUES (1, 42)", []));

        // Define row type with wrong type for 'count' column (String instead of Integer)
        const WrongRowType = StructType({
            id: IntegerType,
            count: StringType,  // Wrong! Column is INTEGER
        });

        // Should throw error about type mismatch
        $(Assert.throws(
            postgres_select([WrongRowType], conn, "SELECT id, count FROM test_type_error", []),
            /Type mismatch.*count/
        ));

        $(postgres_close(conn));
    });
}, {
    platformFns: [...PostgresImpl, ...NodePlatform],
    afterEach: $ => {
        // Close all connections after each test (even on failure)
        $(postgres_close_all());
    }
});
