/**
 * Copyright (c) 2025 Elara AI Pty Ltd
 * Dual-licensed under AGPL-3.0 and commercial license. See LICENSE for details.
 */

/**
 * Access platform function tests
 *
 * These tests use describeEast following east-node conventions.
 * Tests compile East functions and run them to validate platform function behavior.
 *
 * The tests fetch a public Access database (Sakila sample) at runtime,
 * making them fully defined in East and exportable to other runtimes.
 */
import { East, IntegerType, OptionType, StringType, StructType, variant } from "@elaraai/east";
import { describeEast, Assert, NodePlatform, Fetch } from "@elaraai/east-node-std";
import { access_open_blob, access_tables, access_query, access_close, access_close_all, AccessImpl, AccessBlobConfigType } from "./access.js";

// Public test database: Sakila sample database (Access port)
// https://github.com/ozzymcduff/sakila-sample-database-ports
const TEST_DB_URL = "https://raw.githubusercontent.com/ozzymcduff/sakila-sample-database-ports/master/ms-access-sakila-db/access-sakila.mdb";

// Define the expected row type for actor table
const ActorRowType = StructType({
    actor_id: IntegerType,
    first_name: StringType,
    last_name: StringType,
});

await describeEast("Access platform functions", (test) => {
    test("open database from blob and list tables", $ => {
        // Fetch database bytes from URL
        const bytes = $.let(Fetch.getBytes(TEST_DB_URL));

        const config = $.let({
            data: bytes,
            password: variant('none', null),
        }, AccessBlobConfigType);

        const handle = $.let(access_open_blob(config));

        // Handle should be non-empty string
        $(Assert.greater(handle.length(), East.value(0n)));

        // List tables
        const result = $.let(access_tables(handle));

        // Should have tables (Sakila has many tables)
        $(Assert.greater(result.tables.size(), East.value(0n)));

        $(access_close(handle));
    });

    test("query actor table returns rows", $ => {
        const bytes = $.let(Fetch.getBytes(TEST_DB_URL));
        const config = $.let({
            data: bytes,
            password: variant('none', null),
        }, AccessBlobConfigType);

        const handle = $.let(access_open_blob(config));

        // Query with typed row results, limit to 5 rows
        const options = $.let({
            table: "actor",
            columns: variant('none', null),
            rowOffset: variant('none', null),
            rowLimit: variant('some', 5n),
        });

        const rows = $.let(access_query([ActorRowType], handle, options));

        // Should return between 1 and 5 rows
        $(Assert.greater(rows.size(), East.value(0n)));
        $(Assert.lessEqual(rows.size(), East.value(5n)));

        $(access_close(handle));
    });

    test("query with column selection returns rows", $ => {
        const bytes = $.let(Fetch.getBytes(TEST_DB_URL));
        const config = $.let({
            data: bytes,
            password: variant('none', null),
        }, AccessBlobConfigType);

        const handle = $.let(access_open_blob(config));

        // Query with specific columns only
        const PartialActorType = StructType({
            actor_id: IntegerType,
            first_name: StringType,
        });

        const options = $.let({
            table: "actor",
            columns: variant('some', ["actor_id", "first_name"]),
            rowOffset: variant('none', null),
            rowLimit: variant('some', 3n),
        });

        const rows = $.let(access_query([PartialActorType], handle, options));

        // Should return between 1 and 3 rows
        $(Assert.greater(rows.size(), East.value(0n)));
        $(Assert.lessEqual(rows.size(), East.value(3n)));

        $(access_close(handle));
    });

    test("query with pagination returns correct count", $ => {
        const bytes = $.let(Fetch.getBytes(TEST_DB_URL));
        const config = $.let({
            data: bytes,
            password: variant('none', null),
        }, AccessBlobConfigType);

        const handle = $.let(access_open_blob(config));

        // Query with offset and limit
        const options = $.let({
            table: "actor",
            columns: variant('none', null),
            rowOffset: variant('some', 5n),
            rowLimit: variant('some', 3n),
        });

        const rows = $.let(access_query([ActorRowType], handle, options));

        // Should return at most 3 rows
        $(Assert.lessEqual(rows.size(), East.value(3n)));

        $(access_close(handle));
    });

    // Error case tests

    test("query throws error when field type does not match column type", $ => {
        const bytes = $.let(Fetch.getBytes(TEST_DB_URL));
        const config = $.let({
            data: bytes,
            password: variant('none', null),
        }, AccessBlobConfigType);

        const handle = $.let(access_open_blob(config));

        // Define row type with wrong type for 'actor_id' column (String instead of Integer)
        const WrongActorType = StructType({
            actor_id: StringType,  // Wrong! Column is integer
            first_name: StringType,
            last_name: StringType,
        });

        const options = $.let({
            table: "actor",
            columns: variant('none', null),
            rowOffset: variant('none', null),
            rowLimit: variant('some', 1n),
        });

        // Should throw error about type mismatch
        $(Assert.throws(
            access_query([WrongActorType], handle, options),
            /Type mismatch.*actor_id/
        ));

        $(access_close(handle));
    });

    test("query throws error when column not found", $ => {
        const bytes = $.let(Fetch.getBytes(TEST_DB_URL));
        const config = $.let({
            data: bytes,
            password: variant('none', null),
        }, AccessBlobConfigType);

        const handle = $.let(access_open_blob(config));

        // Define row type with non-existent column
        // Note: actor_id is nullable in this database, so use OptionType
        const BadActorType = StructType({
            actor_id: OptionType(IntegerType),
            nonexistent_column: StringType,  // This column doesn't exist
        });

        const options = $.let({
            table: "actor",
            columns: variant('none', null),
            rowOffset: variant('none', null),
            rowLimit: variant('some', 1n),
        });

        // Should throw error about column not found
        $(Assert.throws(
            access_query([BadActorType], handle, options),
            /Column.*nonexistent_column.*not found/
        ));

        $(access_close(handle));
    });
}, {
    platformFns: [...AccessImpl, ...NodePlatform],
    afterEach: $ => {
        // Close all connections after each test
        $(access_close_all());
    }
});
