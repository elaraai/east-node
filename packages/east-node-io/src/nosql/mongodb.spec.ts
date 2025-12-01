/**
 * Copyright (c) 2025 Elara AI Pty Ltd
 * Dual-licensed under AGPL-3.0 and commercial license. See LICENSE for details.
 */

/**
 * MongoDB platform function tests
 *
 * These tests use describeEast following east-node conventions.
 * Tests compile East functions and run them to validate platform function behavior.
 *
 * Note: These tests require MongoDB running on localhost:27017.
 * Run `npm run dev:services` to start Docker containers.
 */
import { East, variant } from "@elaraai/east";
import type { ValueTypeOf } from "@elaraai/east";
import { Console, describeEast, Test } from "@elaraai/east-node";
import { mongodb_connect, mongodb_find_one, mongodb_find_many, mongodb_insert_one, mongodb_update_one, mongodb_delete_one, mongodb_delete_many, mongodb_close, mongodb_close_all, MongoDBImpl, BsonDocumentType } from "./mongodb.js";
import { BsonValueType } from "./types.js";

// MongoDB test configuration
const TEST_CONFIG = {
    uri: "mongodb://testuser:testpass@localhost:27017",
    database: "test",
    collection: "east_test",
};

await describeEast("MongoDB platform functions", (test) => {
    test("connect and close MongoDB connection", $ => {
        Console.log("connect and close MongoDB connection");

        const config = $.let(TEST_CONFIG);
        const handle = $.let(mongodb_connect(config));

        // Handle should be non-empty string
        $(Test.greater(handle.length(), East.value(0n)));

        // Close connection
        $(mongodb_close(handle));
    });

    test("insertOne creates document successfully", $ => {
        Console.log("insertOne creates document successfully");

        const config = $.let(TEST_CONFIG);
        const conn = $.let(mongodb_connect(config));

        // Create document
        const doc = $.let(new Map<string, ValueTypeOf<typeof BsonValueType>>([
            ["name", variant('String', "Alice")],
            ["age", variant('Integer', 30n)],
            ["active", variant('Boolean', true)],
        ]), BsonDocumentType);

        $(mongodb_insert_one(conn, doc));

        $(mongodb_close(conn));
    });

    test("findOne retrieves inserted document", $ => {

        const config = $.let(TEST_CONFIG);
        
        const conn = $.let(mongodb_connect(config));

        // Insert document
        const doc = $.let(new Map<string, ValueTypeOf<typeof BsonValueType>>([
            ["username", variant('String', "bob123")],
            ["email", variant('String', "bob@example.com")],
            ["score", variant('Integer', 42n)],
        ]), BsonDocumentType);

        const insertedId = $.let(mongodb_insert_one(conn, doc));

        // Query for it
        const query = $.let(new Map<string, ValueTypeOf<typeof BsonValueType>>([
            ["username", variant('String', "bob123")],
        ]), BsonDocumentType);

        const result = $.let(mongodb_find_one(conn, query));

        // Verify document was found with all fields
        $.match(result, {
            some: ($, foundDoc) => {
                $(Test.equal(foundDoc, East.value(new Map<string, ValueTypeOf<typeof BsonValueType>>([
                    ["_id", variant('String', insertedId)],
                    ["email", variant('String', "bob@example.com")],
                    ["score", variant('Integer', 42n)],
                    ["username", variant('String', "bob123")],
                ]), BsonDocumentType)));
            },
            none: ($) => $(Test.fail("Expected to find document")),
        });

        $(mongodb_close(conn));
    });

    test("findOne returns None for non-existent document", $ => {

        const config = $.let(TEST_CONFIG);
        const conn = $.let(mongodb_connect(config));

        // Query for non-existent document
        const query = $.let(new Map<string, ValueTypeOf<typeof BsonValueType>>([
            ["nonexistent_field", variant('String', "nonexistent_value")],
        ]), BsonDocumentType);

        const result = $.let(mongodb_find_one(conn, query));

        // Verify None
        $.match(result, {
            some: ($) => $(Test.fail("Expected None for non-existent document")),
        });

        $(mongodb_close(conn));
    });

    test("findMany retrieves multiple documents", $ => {

        const config = $.let(TEST_CONFIG);
        const conn = $.let(mongodb_connect(config));

        // Insert multiple documents
        const doc1 = $.let(new Map<string, ValueTypeOf<typeof BsonValueType>>([
            ["category", variant('String', "test-category")],
            ["value", variant('Integer', 1n)],
        ]), BsonDocumentType);

        const doc2 = $.let(new Map<string, ValueTypeOf<typeof BsonValueType>>([
            ["category", variant('String', "test-category")],
            ["value", variant('Integer', 2n)],
        ]), BsonDocumentType);

        $(mongodb_insert_one(conn, doc1));
        $(mongodb_insert_one(conn, doc2));

        // Query for all documents in category
        const query = $.let(new Map<string, ValueTypeOf<typeof BsonValueType>>([
            ["category", variant('String', "test-category")],
        ]), BsonDocumentType);

        const options = $.let({
            limit: variant('none', null),
            skip: variant('none', null),
        });

        const results = $.let(mongodb_find_many(conn, query, options));

        // Should have at least 2 documents
        $(Test.greaterEqual(results.size(), East.value(2n)));

        $(mongodb_close(conn));
    });

    test("findMany supports limit option", $ => {

        const config = $.let(TEST_CONFIG);
        const conn = $.let(mongodb_connect(config));

        // Insert multiple documents
        const doc1 = $.let(new Map<string, ValueTypeOf<typeof BsonValueType>>([
            ["limit_test", variant('String', "yes")],
            ["index", variant('Integer', 1n)],
        ]), BsonDocumentType);

        const doc2 = $.let(new Map<string, ValueTypeOf<typeof BsonValueType>>([
            ["limit_test", variant('String', "yes")],
            ["index", variant('Integer', 2n)],
        ]), BsonDocumentType);

        const doc3 = $.let(new Map<string, ValueTypeOf<typeof BsonValueType>>([
            ["limit_test", variant('String', "yes")],
            ["index", variant('Integer', 3n)],
        ]), BsonDocumentType);

        $(mongodb_insert_one(conn, doc1));
        $(mongodb_insert_one(conn, doc2));
        $(mongodb_insert_one(conn, doc3));

        // Query with limit
        const query = $.let(new Map<string, ValueTypeOf<typeof BsonValueType>>([
            ["limit_test", variant('String', "yes")],
        ]), BsonDocumentType);

        const options = $.let({
            limit: variant('some', 2n),
            skip: variant('none', null),
        });

        const results = $.let(mongodb_find_many(conn, query, options));

        // Should have exactly 2 documents
        $(Test.equal(results.size(), East.value(2n)));

        $(mongodb_close(conn));
    });

    test("updateOne modifies document successfully", $ => {

        const config = $.let(TEST_CONFIG);
        const conn = $.let(mongodb_connect(config));

        // Insert document
        const doc = $.let(new Map<string, ValueTypeOf<typeof BsonValueType>>([
            ["update_test", variant('String', "original")],
            ["counter", variant('Integer', 10n)],
        ]), BsonDocumentType);

        const insertedId = $.let(mongodb_insert_one(conn, doc));

        // Update it
        const query = $.let(new Map<string, ValueTypeOf<typeof BsonValueType>>([
            ["update_test", variant('String', "original")],
        ]), BsonDocumentType);

        const update = $.let(new Map<string, ValueTypeOf<typeof BsonValueType>>([
            ["$set", variant('Object', new Map<string, ValueTypeOf<typeof BsonValueType>>([
                ["counter", variant('Integer', 20n)],
            ]))],
        ]), BsonDocumentType);

        const modified = $.let(mongodb_update_one(conn, query, update));

        // Should have modified 1 document
        $(Test.equal(modified, East.value(1n)));

        // Verify update
        const result = $.let(mongodb_find_one(conn, query));

        $.match(result, {
            some: ($, foundDoc) => {
                $(Test.equal(foundDoc, East.value(new Map<string, ValueTypeOf<typeof BsonValueType>>([
                    ["_id", variant('String', insertedId)],
                    ["counter", variant('Integer', 20n)],
                    ["update_test", variant('String', "original")],
                ]), BsonDocumentType)));
            },
            none: ($) => $(Test.fail("Expected to find updated document")),
        });

        $(mongodb_close(conn));
    });

    test("updateOne returns 0 for non-existent document", $ => {

        const config = $.let(TEST_CONFIG);
        const conn = $.let(mongodb_connect(config));

        // Try to update non-existent document
        const query = $.let(new Map<string, ValueTypeOf<typeof BsonValueType>>([
            ["nonexistent", variant('String', "document")],
        ]), BsonDocumentType);

        const update = $.let(new Map<string, ValueTypeOf<typeof BsonValueType>>([
            ["$set", variant('Object', new Map<string, ValueTypeOf<typeof BsonValueType>>([
                ["field", variant('String', "value")],
            ]))],
        ]), BsonDocumentType);

        const modified = $.let(mongodb_update_one(conn, query, update));

        // Should have modified 0 documents
        $(Test.equal(modified, East.value(0n)));

        $(mongodb_close(conn));
    });

    test("deleteOne removes document successfully", $ => {

        const config = $.let(TEST_CONFIG);
        const conn = $.let(mongodb_connect(config));

        // Insert document
        const doc = $.let(new Map<string, ValueTypeOf<typeof BsonValueType>>([
            ["delete_test", variant('String', "to-be-deleted")],
            ["value", variant('Integer', 99n)],
        ]), BsonDocumentType);

        $(mongodb_insert_one(conn, doc));

        // Delete it
        const query = $.let(new Map<string, ValueTypeOf<typeof BsonValueType>>([
            ["delete_test", variant('String', "to-be-deleted")],
        ]), BsonDocumentType);

        const deleted = $.let(mongodb_delete_one(conn, query));

        // Should have deleted 1 document
        $(Test.equal(deleted, East.value(1n)));

        // Verify deletion
        const result = $.let(mongodb_find_one(conn, query));

        $.match(result, {
            some: ($) => $(Test.fail("Expected None after deletion")),
        });

        $(mongodb_close(conn));
    });

    test("deleteOne returns 0 for non-existent document", $ => {

        const config = $.let(TEST_CONFIG);
        const conn = $.let(mongodb_connect(config));

        // Try to delete non-existent document
        const query = $.let(new Map<string, ValueTypeOf<typeof BsonValueType>>([
            ["nonexistent", variant('String', "document")],
        ]), BsonDocumentType);

        const deleted = $.let(mongodb_delete_one(conn, query));

        // Should have deleted 0 documents
        $(Test.equal(deleted, East.value(0n)));

        $(mongodb_close(conn));
    });

    test("handles nested documents", $ => {

        const config = $.let(TEST_CONFIG);
        const conn = $.let(mongodb_connect(config));

        // Insert document with nested object
        const doc = $.let(new Map<string, ValueTypeOf<typeof BsonValueType>>([
            ["nested_test", variant('String', "parent")],
            ["metadata", variant('Object', new Map<string, ValueTypeOf<typeof BsonValueType>>([
                ["created_by", variant('String', "admin")],
                ["version", variant('Integer', 1n)],
            ]))],
        ]), BsonDocumentType);

        const insertedId = $.let(mongodb_insert_one(conn, doc));

        // Query for it
        const query = $.let(new Map<string, ValueTypeOf<typeof BsonValueType>>([
            ["nested_test", variant('String', "parent")],
        ]), BsonDocumentType);

        const result = $.let(mongodb_find_one(conn, query));

        // Verify nested object
        $.match(result, {
            some: ($, foundDoc) => {
                $(Test.equal(foundDoc, East.value(new Map<string, ValueTypeOf<typeof BsonValueType>>([
                    ["_id", variant('String', insertedId)],
                    ["metadata", variant('Object', new Map<string, ValueTypeOf<typeof BsonValueType>>([
                        ["created_by", variant('String', "admin")],
                        ["version", variant('Integer', 1n)],
                    ]))],
                    ["nested_test", variant('String', "parent")],
                ]), BsonDocumentType)));
            },
            none: ($) => $(Test.fail("Expected to find document")),
        });

        $(mongodb_close(conn));
    });
}, {
    platformFns: MongoDBImpl,
    beforeEach: $ => {
        // Clear the collection before each test for isolation
        const config = $.let(TEST_CONFIG);
        const conn = $.let(mongodb_connect(config));

        // Delete all documents (empty query matches all)
        const emptyQuery = $.let(new Map<string, ValueTypeOf<typeof BsonValueType>>([]), BsonDocumentType);
        $(mongodb_delete_many(conn, emptyQuery));

        // Close this connection (afterEach will close all)
        $(mongodb_close(conn));
    },
    afterEach: $ => {
        // Close all connections after each test (even on failure)
        $(mongodb_close_all());
    }
});
