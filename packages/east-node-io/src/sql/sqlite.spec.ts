/**
 * Copyright (c) 2025 Elara AI Pty Ltd
 * Dual-licensed under AGPL-3.0 and commercial license. See LICENSE for details.
 */

/**
 * SQLite platform function tests
 *
 * These tests use describeEast following east-node conventions.
 * Tests compile East functions and run them to validate platform function behavior.
 */
import { East, IntegerType, StringType, FloatType, BooleanType, StructType, OptionType, variant, type ValueTypeOf } from "@elaraai/east";
import { describeEast, Assert, NodePlatform } from "@elaraai/east-node-std";
import { sqlite_connect, sqlite_query, sqlite_select, sqlite_close, sqlite_close_all, SqliteImpl } from "./sqlite.js";
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
        $(Assert.greater(handle.length(), East.value(0n)));

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
                $(Assert.equal(selectResult.rows, East.value([expectedRow])));
            },
            insert: ($, _) => $(Assert.fail("Expected select, got insert")),
            update: ($, _) => $(Assert.fail("Expected select, got update")),
            delete: ($, _) => $(Assert.fail("Expected select, got delete")),
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
            select: ($, _) => $(Assert.fail("Expected insert, got select")),
            insert: ($, insertResult) => {
                // Verify rowsAffected
                $(Assert.equal(insertResult.rowsAffected, East.value(1n)));

                // Verify lastInsertId is Some
                $.match(insertResult.lastInsertId, {
                    some: ($, id) => $(Assert.equal(id, East.value(1n))),
                    none: ($) => $(Assert.fail("Expected lastInsertId to be Some")),
                });
            },
            update: ($, _) => $(Assert.fail("Expected insert, got update")),
            delete: ($, _) => $(Assert.fail("Expected insert, got delete")),
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
            select: ($, _) => $(Assert.fail("Expected update, got select")),
            insert: ($, _) => $(Assert.fail("Expected update, got insert")),
            update: ($, updateResult) => {
                $(Assert.equal(updateResult.rowsAffected, East.value(1n)));
            },
            delete: ($, _) => $(Assert.fail("Expected update, got delete")),
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
            select: ($, _) => $(Assert.fail("Expected delete, got select")),
            insert: ($, _) => $(Assert.fail("Expected delete, got insert")),
            update: ($, _) => $(Assert.fail("Expected delete, got update")),
            delete: ($, deleteResult) => {
                $(Assert.equal(deleteResult.rowsAffected, East.value(1n)));
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
                $(Assert.equal(selectResult.rows, East.value([expectedRow])));
            },
            insert: ($, _) => $(Assert.fail("Expected select, got insert")),
            update: ($, _) => $(Assert.fail("Expected select, got update")),
            delete: ($, _) => $(Assert.fail("Expected select, got delete")),
        });

        $(sqlite_close(conn));
    });

    // Tests for sqlite_select (generic platform function)

    test("select with typed row returns correct structure", $ => {
        const config = $.let({
            path: ":memory:",
            readOnly: variant('none', null),
            memory: variant('some', true),
        });

        const conn = $.let(sqlite_connect(config));

        // Create and populate table
        $(sqlite_query(conn, "CREATE TABLE users (id INTEGER, name TEXT, active BOOLEAN)", []));
        $(sqlite_query(conn, "INSERT INTO users VALUES (1, 'Alice', 1)", []));
        $(sqlite_query(conn, "INSERT INTO users VALUES (2, 'Bob', 0)", []));

        // Define expected row type
        const UserRowType = StructType({
            id: IntegerType,
            name: StringType,
            active: BooleanType,
        });

        // Query with typed results
        const users = $.let(sqlite_select([UserRowType], conn, "SELECT id, name, active FROM users ORDER BY id", []));

        // Verify row count
        $(Assert.equal(users.size(), East.value(2n)));

        $(sqlite_close(conn));
    });

    test("select with partial columns", $ => {
        const config = $.let({
            path: ":memory:",
            readOnly: variant('none', null),
            memory: variant('some', true),
        });

        const conn = $.let(sqlite_connect(config));

        // Create and populate table
        $(sqlite_query(conn, "CREATE TABLE products (id INTEGER, name TEXT, price REAL, stock INTEGER)", []));
        $(sqlite_query(conn, "INSERT INTO products VALUES (1, 'Widget', 9.99, 100)", []));

        // Define partial row type (only some columns)
        const PartialProductType = StructType({
            name: StringType,
            price: FloatType,
        });

        // Query with only selected columns
        const products = $.let(sqlite_select([PartialProductType], conn, "SELECT name, price FROM products", []));

        // Verify we got results
        $(Assert.equal(products.size(), East.value(1n)));

        $(sqlite_close(conn));
    });

    test("select with parameters", $ => {
        const config = $.let({
            path: ":memory:",
            readOnly: variant('none', null),
            memory: variant('some', true),
        });

        const conn = $.let(sqlite_connect(config));

        // Create and populate table
        $(sqlite_query(conn, "CREATE TABLE orders (id INTEGER, customer TEXT, total REAL)", []));
        $(sqlite_query(conn, "INSERT INTO orders VALUES (1, 'Alice', 50.00)", []));
        $(sqlite_query(conn, "INSERT INTO orders VALUES (2, 'Bob', 75.50)", []));
        $(sqlite_query(conn, "INSERT INTO orders VALUES (3, 'Alice', 25.00)", []));

        const OrderType = StructType({
            id: IntegerType,
            customer: StringType,
            total: FloatType,
        });

        // Query with parameter
        const aliceOrders = $.let(sqlite_select([OrderType], conn,
            "SELECT id, customer, total FROM orders WHERE customer = ?",
            [variant("String", "Alice")]
        ));

        // Alice has 2 orders
        $(Assert.equal(aliceOrders.size(), East.value(2n)));

        $(sqlite_close(conn));
    });

    test("select with LIMIT returns correct count", $ => {
        const config = $.let({
            path: ":memory:",
            readOnly: variant('none', null),
            memory: variant('some', true),
        });

        const conn = $.let(sqlite_connect(config));

        // Create and populate table with many rows
        $(sqlite_query(conn, "CREATE TABLE items (id INTEGER, value TEXT)", []));
        $(sqlite_query(conn, "INSERT INTO items VALUES (1, 'a'), (2, 'b'), (3, 'c'), (4, 'd'), (5, 'e')", []));

        const ItemType = StructType({
            id: IntegerType,
            value: StringType,
        });

        // Query with LIMIT
        const items = $.let(sqlite_select([ItemType], conn, "SELECT id, value FROM items LIMIT 3", []));

        // Should return exactly 3 rows
        $(Assert.equal(items.size(), East.value(3n)));

        $(sqlite_close(conn));
    });

    test("select empty result returns empty array", $ => {
        const config = $.let({
            path: ":memory:",
            readOnly: variant('none', null),
            memory: variant('some', true),
        });

        const conn = $.let(sqlite_connect(config));

        // Create empty table
        $(sqlite_query(conn, "CREATE TABLE empty_table (id INTEGER, name TEXT)", []));

        const RowType = StructType({
            id: IntegerType,
            name: StringType,
        });

        // Query empty table
        const rows = $.let(sqlite_select([RowType], conn, "SELECT id, name FROM empty_table", []));

        // Should return empty array
        $(Assert.equal(rows.size(), East.value(0n)));

        $(sqlite_close(conn));
    });

    // Error case tests

    test("select throws error when null value encountered for non-optional field", $ => {
        const config = $.let({
            path: ":memory:",
            readOnly: variant('none', null),
            memory: variant('some', true),
        });

        const conn = $.let(sqlite_connect(config));

        // Create table and insert row with NULL value
        $(sqlite_query(conn, "CREATE TABLE nullable_test (id INTEGER, name TEXT)", []));
        $(sqlite_query(conn, "INSERT INTO nullable_test VALUES (1, NULL)", []));

        // Define row type WITHOUT OptionType for nullable column
        const RowType = StructType({
            id: IntegerType,
            name: StringType,  // Not optional, but column has NULL
        });

        // Should throw error about null value for required field
        $(Assert.throws(
            sqlite_select([RowType], conn, "SELECT id, name FROM nullable_test", []),
            /null value.*required field.*name.*OptionType/
        ));

        $(sqlite_close(conn));
    });

    test("select succeeds when null value encountered for optional field", $ => {
        const config = $.let({
            path: ":memory:",
            readOnly: variant('none', null),
            memory: variant('some', true),
        });

        const conn = $.let(sqlite_connect(config));

        // Create table and insert row with NULL value
        $(sqlite_query(conn, "CREATE TABLE nullable_test2 (id INTEGER, name TEXT)", []));
        $(sqlite_query(conn, "INSERT INTO nullable_test2 VALUES (1, NULL)", []));

        // Define row type WITH OptionType for nullable column
        const RowType = StructType({
            id: IntegerType,
            name: OptionType(StringType),  // Optional - can handle NULL
        });

        // Should succeed
        const rows = $.let(sqlite_select([RowType], conn, "SELECT id, name FROM nullable_test2", []));
        $(Assert.equal(rows.size(), East.value(1n)));

        $(sqlite_close(conn));
    });

    test("select throws error when field type does not match column type", $ => {
        const config = $.let({
            path: ":memory:",
            readOnly: variant('none', null),
            memory: variant('some', true),
        });

        const conn = $.let(sqlite_connect(config));

        // Create table with INTEGER column
        $(sqlite_query(conn, "CREATE TABLE type_test (id INTEGER, count INTEGER)", []));
        $(sqlite_query(conn, "INSERT INTO type_test VALUES (1, 42)", []));

        // Define row type with wrong type for 'count' column (String instead of Integer)
        const WrongRowType = StructType({
            id: IntegerType,
            count: StringType,  // Wrong! Column is INTEGER
        });

        // Should throw error about type mismatch
        $(Assert.throws(
            sqlite_select([WrongRowType], conn, "SELECT id, count FROM type_test", []),
            /Type mismatch.*count.*INTEGER.*String/
        ));

        $(sqlite_close(conn));
    });
}, {
    platformFns: [...SqliteImpl, ...NodePlatform],
    afterEach: $ => {
        // Close all connections after each test (even on failure)
        $(sqlite_close_all());
    }
});
