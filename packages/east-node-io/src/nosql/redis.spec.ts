/**
 * Copyright (c) 2025 Elara AI Pty Ltd
 * Dual-licensed under AGPL-3.0 and commercial license. See LICENSE for details.
 */

/**
 * Redis platform function tests
 *
 * These tests use describeEast following east-node conventions.
 * Tests compile East functions and run them to validate platform function behavior.
 *
 * Note: These tests require Redis running on localhost:6379.
 * Run `npm run dev:services` to start Docker containers.
 */
import { East, variant } from "@elaraai/east";
import { describeEast, Test } from "@elaraai/east-node";
import { redis_connect, redis_get, redis_set, redis_setex, redis_del, redis_close, redis_close_all, RedisImpl } from "./redis.js";

// Redis test configuration
const TEST_CONFIG = {
    host: "localhost",
    port: 6379n,
    password: variant('none', null),
    db: variant('none', null),
    keyPrefix: variant('none', null),
};

await describeEast("Redis platform functions", (test) => {
    test("connect and close Redis connection", $ => {
        console.log("connect and close Redis connection");

        const config = $.let(TEST_CONFIG);
        const handle = $.let(redis_connect(config));

        // Handle should be non-empty string
        $(Test.greater(handle.length(), East.value(0n)));

        // Close connection
        $(redis_close(handle));
    });

    test("set stores value successfully", $ => {
        console.log("set stores value successfully");

        const config = $.let(TEST_CONFIG);
        const conn = $.let(redis_connect(config));

        $(redis_set(conn, "test:set", "test-value"));

        $(redis_close(conn));
    });

    test("get retrieves stored value", $ => {
        console.log("get retrieves stored value");

        const config = $.let(TEST_CONFIG);
        const testValue = $.let("test-get-value");

        const conn = $.let(redis_connect(config));

        // Store value first
        $(redis_set(conn, "test:get", testValue));

        // Retrieve it
        const retrieved = $.let(redis_get(conn, "test:get"));

        // Verify value matches
        $.match(retrieved, {
            some: ($, value) => {
                $(Test.equal(value, testValue));
            },
            none: ($) => $(Test.fail("Expected to find value")),
        });

        $(redis_close(conn));
    });

    test("get returns None for non-existent key", $ => {
        console.log("get returns None for non-existent key");

        const config = $.let(TEST_CONFIG);
        const conn = $.let(redis_connect(config));

        // Get non-existent key
        const result = $.let(redis_get(conn, "test:nonexistent"));

        // Verify it's None
        $.match(result, {
            some: ($) => $(Test.fail("Expected None for non-existent key")),
        });

        $(redis_close(conn));
    });

    test("set overwrites existing value", $ => {
        console.log("set overwrites existing value");

        const config = $.let(TEST_CONFIG);
        const value1 = $.let("first-value");
        const value2 = $.let("second-value");

        const conn = $.let(redis_connect(config));

        // Set first value
        $(redis_set(conn, "test:overwrite", value1));

        // Set second value
        $(redis_set(conn, "test:overwrite", value2));

        // Verify second value
        const retrieved = $.let(redis_get(conn, "test:overwrite"));

        $.match(retrieved, {
            some: ($, value) => {
                $(Test.equal(value, value2));
            },
            none: ($) => $(Test.fail("Expected to find value")),
        });

        $(redis_close(conn));
    });

    test("del removes stored value", $ => {
        console.log("del removes stored value");

        const config = $.let(TEST_CONFIG);
        const conn = $.let(redis_connect(config));

        // Store value first
        $(redis_set(conn, "test:del", "to-be-deleted"));

        // Delete it
        const deleted = $.let(redis_del(conn, "test:del"));

        // Verify deletion count is 1
        $(Test.equal(deleted, East.value(1n)));

        // Verify key no longer exists
        const retrieved = $.let(redis_get(conn, "test:del"));

        $.match(retrieved, {
            some: ($) => $(Test.fail("Expected None after deletion")),
        });

        $(redis_close(conn));
    });

    test("del returns 0 for non-existent key", $ => {
        console.log("del returns 0 for non-existent key");

        const config = $.let(TEST_CONFIG);
        const conn = $.let(redis_connect(config));

        // Delete non-existent key
        const deleted = $.let(redis_del(conn, "test:del-nonexistent"));

        // Verify deletion count is 0
        $(Test.equal(deleted, East.value(0n)));

        $(redis_close(conn));
    });

    test("setex stores value with expiration", $ => {
        console.log("setex stores value with expiration");

        const config = $.let(TEST_CONFIG);
        const conn = $.let(redis_connect(config));

        // Store value with 10 second TTL
        $(redis_setex(conn, "test:setex", "expiring-value", 10n));

        // Verify value exists
        const retrieved = $.let(redis_get(conn, "test:setex"));

        $.match(retrieved, {
            some: ($, value) => {
                $(Test.equal(value, East.value("expiring-value")));
            },
            none: ($) => $(Test.fail("Expected to find value")),
        });

        $(redis_close(conn));
    });

    test("setex overwrites existing value", $ => {
        console.log("setex overwrites existing value");

        const config = $.let(TEST_CONFIG);
        const value1 = $.let("first-expiring");
        const value2 = $.let("second-expiring");

        const conn = $.let(redis_connect(config));

        // Set first value
        $(redis_setex(conn, "test:setex-overwrite", value1, 10n));

        // Set second value
        $(redis_setex(conn, "test:setex-overwrite", value2, 20n));

        // Verify second value
        const retrieved = $.let(redis_get(conn, "test:setex-overwrite"));

        $.match(retrieved, {
            some: ($, value) => {
                $(Test.equal(value, value2));
            },
            none: ($) => $(Test.fail("Expected to find value")),
        });

        $(redis_close(conn));
    });

    test("handles special characters in keys and values", $ => {
        console.log("handles special characters in keys and values");

        const config = $.let(TEST_CONFIG);
        const specialValue = $.let("hello:world/test@#$%");

        const conn = $.let(redis_connect(config));

        $(redis_set(conn, "test:special:key/with@chars", specialValue));

        const retrieved = $.let(redis_get(conn, "test:special:key/with@chars"));

        $.match(retrieved, {
            some: ($, value) => {
                $(Test.equal(value, specialValue));
            },
            none: ($) => $(Test.fail("Expected to find value")),
        });

        $(redis_close(conn));
    });
}, {
    platformFns: RedisImpl,
    afterEach: $ => {
        // Close all connections after each test (even on failure)
        $(redis_close_all());
    }
});
