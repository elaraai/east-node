/**
 * Copyright (c) 2025 Elara AI Pty Ltd
 * Licensed under AGPL-3.0. See LICENSE file for details.
 */
import assert from "node:assert/strict";
import { test, describe } from "node:test";
import { East, Expr, get_location, NullType, StringType, BlockBuilder, type SubtypeExprOrValue, type ExprType, type EastType, FunctionType, StructType, OptionType, variant, option } from "@elaraai/east";
import type { PlatformFunction, PlatformFunctionDef } from "@elaraai/east/internal";

const { str } = East;

/**
 * Signals that a test assertion passed.
 *
 * This platform function is used internally by East test assertions to indicate
 * successful validation. When executed in Node.js, it performs no action (the test
 * continues normally). Other platform implementations may log or track passes.
 *
 * This function is primarily used within the {@link Test} assertion helpers rather
 * than being called directly in test code.
 *
 * @returns `null` - Has no meaningful return value
 *
 * @example
 * ```ts
 * import { East, NullType } from "@elaraai/east";
 * import { Test } from "@elaraai/east-node";
 *
 * // Used internally by Test assertions
 * const myTest = East.function([], NullType, $ => {
 *     // Test.equal internally calls testPass when the assertion succeeds
 *     $(Test.equal(East.value(42n), 42n));
 * });
 *
 * const compiled = East.compile(myTest.toIR(), Test.Implementation);
 * compiled();  // Test passes silently
 * ```
 *
 * @remarks
 * - Does not throw or produce output in Node.js implementation
 * - Used by all {@link Test} assertion methods to signal success
 * - Can be called directly for custom assertion logic
 */
export const testPass: PlatformFunctionDef<[], typeof NullType> = East.platform("testPass", [], NullType);

/**
 * Signals that a test assertion failed with a message.
 *
 * This platform function is used internally by East test assertions to indicate
 * validation failures. When executed in Node.js, it throws an assertion error with
 * the provided message, causing the test to fail.
 *
 * This function is primarily used within the {@link Test} assertion helpers rather
 * than being called directly, though it can be used for custom failure conditions.
 *
 * @param message - The error message describing why the assertion failed
 * @returns `null` - Never actually returns (throws in implementation)
 *
 * @throws {AssertionError} Always throws with the provided message (Node.js implementation)
 *
 * @example
 * ```ts
 * import { East, StringType, NullType } from "@elaraai/east";
 * import { Test } from "@elaraai/east-node";
 *
 * // Used internally by Test assertions
 * const myTest = East.function([], NullType, $ => {
 *     // Test.equal internally calls testFail when the assertion fails
 *     $(Test.equal(East.value(42n), 99n));
 *     // Throws: "Expected 42 to equal 99 (...)"
 * });
 * ```
 *
 * @example
 * ```ts
 * // Direct usage for custom validation
 * const validatePositive = East.function([IntegerType], NullType, ($, n) => {
 *     return n.greater(0n).ifElse(
 *         _ => Test.pass(),
 *         _ => Test.fail("Number must be positive")
 *     );
 * });
 *
 * const compiled = East.compile(validatePositive.toIR(), Test.Implementation);
 * compiled(-5n);  // Throws: "Number must be positive"
 * ```
 *
 * @remarks
 * - Always throws in Node.js implementation (test fails immediately)
 * - Used by all {@link Test} assertion methods to signal failure
 * - Accepts location information in message for debugging
 */
const testFail: PlatformFunctionDef<[typeof StringType], typeof NullType> = East.platform("testFail", [StringType], NullType);


export const test_: PlatformFunctionDef<[typeof StringType, FunctionType<[], typeof NullType>], typeof NullType> = East.platform("test", [StringType, FunctionType([], NullType, ["testPass", "testFail"]),], NullType);

export const describe_: PlatformFunctionDef<[typeof StringType, FunctionType<[], typeof NullType>], typeof NullType> = East.platform("describe", [StringType, FunctionType([], NullType, ["test"]),], NullType);


export const NodeTestTypes: any[] = [
    testPass,
    testFail,
    test_,
    describe_,
];

export const NodeTest: PlatformFunction[] = [
    testPass.implement(() => { }), // Assertion passed - do nothing (test continues)
    testFail.implement((message: string) => {
        // Assertion failed - throw to fail the test
        assert.fail(message);
    }),
    test_.implement((name: string, body: () => null) => {
        test(name, () => {
            body();
        });
    }),
    describe_.implement((
        name: string,
        body: () => null,
        hooks: option<{
            beforeAll: () => null,
            afterAll: () => null,
        }>
    ) => {
        describe(name, () => {
            try {
                if (hooks.type === 'some') hooks.value.beforeAll();
                body();
            } finally {
                if (hooks.type === 'some') hooks.value.afterAll();
            }
        });
    }),
];


/**
 * Configuration options for East test suites.
 */
export interface DescribeEastOptions {
    /**
     * Platform functions to include in all tests and hooks.
     */
    platformFns?: PlatformFunction[];

    /**
     * Setup function run once before all tests.
     * Use for opening database connections, initializing resources, etc.
     */
    beforeAll?: ($: BlockBuilder<NullType>) => void;

    /**
     * Cleanup function run once after all tests.
     * Use for closing database connections, cleaning up resources, etc.
     * Runs even if tests fail.
     */
    afterAll?: ($: BlockBuilder<NullType>) => void;

    /**
     * Setup function run before each test.
     */
    beforeEach?: ($: BlockBuilder<NullType>) => void;

    /**
     * Cleanup function run after each test.
     * Runs even if the test fails.
     */
    afterEach?: ($: BlockBuilder<NullType>) => void;
}

/**
 * Wrapper around Node.js `describe` that also exports test IR for cross-platform testing.
 *
 * This function behaves exactly like Node.js `describe` - it runs all the tests normally.
 * Additionally, it creates a single East function that runs all tests in sequence,
 * making it easy to export the entire test suite for running in other East implementations.
 *
 * Supports lifecycle hooks (beforeAll, afterAll, beforeEach, afterEach) as East functions
 * to properly set up and tear down resources like database connections.
 *
 * @param suiteName - The name of the test suite
 * @param builder - A function that receives a `test` function for defining tests
 * @param options - Configuration options including platform functions and lifecycle hooks
 *
 * @example
 * ```ts
 * // Basic usage with platform functions
 * describeEast("Array tests", (test) => {
 *   test("addition", $ => {
 *     $(Test.equal(East.value(1n).add(1n), 2n));
 *   });
 * }, { platformFns: [] });
 * ```
 *
 * @example
 * ```ts
 * // With database cleanup hooks
 * import { SQL } from "@elaraai/east-node-io";
 *
 * describeEast("Database tests", (test) => {
 *   test("query users", $ => {
 *     const conn = $.let(SQL.Postgres.connect(config));
 *     const result = $.let(SQL.Postgres.query(conn, "SELECT * FROM users", []));
 *     $(Test.equal(result.rows.length(), 2n));
 *   });
 * }, {
 *   platformFns: SQL.Postgres.Implementation,
 *   afterEach: $ => {
 *     // Close connections even if test fails
 *     const conn = $.let(SQL.Postgres.connect(config));
 *     $(SQL.Postgres.close(conn));
 *   }
 * });
 * ```
 */
export async function describeEast(
    suiteName: string,
    builder: (test: (name: string, body: ($: BlockBuilder<NullType>) => void) => void) => void,
    options: DescribeEastOptions = {}
) {
    const platformFns = options.platformFns ?? [];
    const allPlatformFns = [...NodeTest, ...platformFns];
    const tests: Array<{ name: string, body: ($: BlockBuilder<NullType>) => void }> = [];

    // Collect all test names and bodies
    builder((name: string, body: ($: BlockBuilder<NullType>) => void) => tests.push({ name, body }));

    // const hasAsync = allPlatformFns.some((fn) => fn.type === 'async');


    // Create a single East function that uses describe/test platform functions
    const suiteFunction = East.function([], NullType, $ => {
        $(describe_.call(
            $,
            suiteName,
            East.function([], NullType, $ => {
                if (options.beforeAll) $(test_.call($, "beforeAll", East.function([], NullType, options.beforeAll)));
                for (const { name, body } of tests) {
                    if (options.beforeEach) $(test_.call($, "beforeEach", East.function([], NullType, options.beforeEach)));
                    $(test_.call($, name, East.function([], NullType, body)));
                    if (options.afterEach) $(test_.call($, "afterEach", East.function([], NullType, options.afterEach)));
                }
                if (options.afterAll) $(test_.call($, "afterAll", East.function([], NullType, options.afterAll)));
            }),
        ));
    });

    // Run the test suite using the Node.js platform implementation
    const compiled = suiteFunction.toIR().compile(NodeTest);
    compiled();
}

/**
 * East assertion functions that match Node.js assert API naming.
 *
 * These functions generate East expressions that perform runtime assertions
 * using platform functions, enabling testing of East code.
 */

/**
 * East assertion functions that match Node.js assert API naming.
 *
 * These functions generate East expressions that perform runtime assertions
 * using platform functions, enabling testing of East code.
 */
export const Test = {
    /**
     * Platform function that signals a test assertion passed.
     *
     * Used internally by assertion methods to indicate successful validation.
     * Does nothing in Node.js implementation - test continues normally.
     *
     * @returns An East expression that returns `null`
     *
     * @example
     * ```ts
     * import { East, NullType } from "@elaraai/east";
     * import { Test } from "@elaraai/east-node";
     *
     * const customAssertion = East.function([], NullType, $ => {
     *     return East.value(true).ifElse(
     *         _ => Test.pass(),
     *         _ => Test.fail("Condition was false")
     *     );
     * });
     * ```
     */
    pass: testPass,

    /**
     * Platform function that signals a test assertion failed.
     *
     * Used internally by assertion methods to indicate validation failures.
     * Throws an assertion error in Node.js implementation - test fails immediately.
     *
     * @param message - Error message describing the failure
     * @returns An East expression that returns `null` (never actually returns - throws)
     *
     * @example
     * ```ts
     * import { East, StringType, NullType } from "@elaraai/east";
     * import { Test } from "@elaraai/east-node";
     *
     * const validateRange = East.function([IntegerType], NullType, ($, value) => {
     *     return value.between(0n, 100n).ifElse(
     *         _ => Test.pass(),
     *         _ => Test.fail("Value must be between 0 and 100")
     *     );
     * });
     * ```
     */
    fail: testFail,

    /**
     * Asserts that two values are the same reference (meaning if one is mutated, the other reflects the change - and they are always equal).
     *
     * @typeParam E - The type of the actual expression
     * @param actual - The actual value to test
     * @param expected - The expected value to compare against
     * @returns An East expression that performs the equality check
     */
    is<E extends EastType>(actual: Expr<E>, expected: SubtypeExprOrValue<NoInfer<E>>): ExprType<NullType> {
        const location = get_location(2);
        const expected_expr = Expr.from(expected, Expr.type(actual));
        return Expr.tryCatch(
            Expr.block($ => {
                const act = $.let(actual);
                const exp = $.let(expected_expr);
                return East.is(act as any, exp as any).ifElse(
                    _$ => testPass(),
                    _$ => testFail(str`Expected ${act} to equal ${exp} (${East.value(`${location.filename} ${location.line}:${location.column}`)})`)
                );
            }),
            (_$, message, stack) => testFail(East.String.printError(message, stack))
        );
    },

    /**
     * Asserts that two values are equal.
     *
     * @typeParam E - The type of the actual expression
     * @param actual - The actual value to test
     * @param expected - The expected value to compare against
     * @returns An East expression that performs the equality check
     */
    equal<E extends EastType>(actual: Expr<E>, expected: SubtypeExprOrValue<NoInfer<E>>): ExprType<NullType> {
        const location = get_location(2);
        const expected_expr = Expr.from(expected, Expr.type(actual));
        return Expr.tryCatch(
            Expr.block($ => {
                const act = $.let(actual);
                const exp = $.let(expected_expr);
                return East.equal(act as any, exp as any).ifElse(
                    _$ => testPass(),
                    _$ => testFail(str`Expected ${act} to equal ${exp} (${East.value(`${location.filename} ${location.line}:${location.column}`)})`)
                );
            }),
            (_$, message, stack) => testFail(East.String.printError(message, stack))
        );
    },

    /**
     * Asserts that two values are not equal.
     *
     * @typeParam E - The type of the actual expression
     * @param actual - The actual value to test
     * @param expected - The value that should not be equal
     * @returns An East expression that performs the inequality check
     */
    notEqual<E extends EastType>(actual: Expr<E>, expected: SubtypeExprOrValue<NoInfer<E>>): ExprType<NullType> {
        const location = get_location(2);
        const expected_expr = Expr.from(expected, Expr.type(actual));
        return Expr.tryCatch(
            Expr.block($ => {
                const act = $.let(actual);
                const exp = $.let(expected_expr);
                return East.notEqual(act as any, exp as any).ifElse(
                    _$ => testPass(),
                    _$ => testFail(str`Expected ${act} to not equal ${exp} (${East.value(`${location.filename} ${location.line}:${location.column}`)})`)
                );
            }),
            (_$, message, stack) => testFail(East.String.printError(message, stack))
        );
    },

    /**
     * Asserts that actual is less than expected.
     *
     * @typeParam E - The type of the actual expression
     * @param actual - The actual value to test
     * @param expected - The value that actual should be less than
     * @returns An East expression that performs the less-than check
     */
    less<E extends EastType>(actual: Expr<E>, expected: SubtypeExprOrValue<NoInfer<E>>): ExprType<NullType> {
        const location = get_location(2);
        const expected_expr = Expr.from(expected, Expr.type(actual));
        return Expr.tryCatch(
            Expr.block($ => {
                const act = $.let(actual);
                const exp = $.let(expected_expr);
                return East.less(act as any, exp as any).ifElse(
                    _$ => testPass(),
                    _$ => testFail(str`Expected ${act} to be less than ${exp} (${`${location.filename} ${location.line}:${location.column}`})`)
                );
            }),
            (_$, message, stack) => testFail(East.String.printError(message, stack))
        );
    },

    /**
     * Asserts that actual is less than or equal to expected.
     *
     * @typeParam E - The type of the actual expression
     * @param actual - The actual value to test
     * @param expected - The value that actual should be less than or equal to
     * @returns An East expression that performs the less-than-or-equal check
     */
    lessEqual<E extends EastType>(actual: Expr<E>, expected: SubtypeExprOrValue<NoInfer<E>>): ExprType<NullType> {
        const location = get_location(2);
        const expected_expr = Expr.from(expected, Expr.type(actual));
        return Expr.tryCatch(
            Expr.block($ => {
                const act = $.let(actual);
                const exp = $.let(expected_expr);
                return East.lessEqual(act as any, exp as any).ifElse(
                    _$ => testPass(),
                    _$ => testFail(str`Expected ${act} to be less than or equal to ${exp} (${`${location.filename} ${location.line}:${location.column}`})`)
                );
            }),
            (_$, message, stack) => testFail(East.String.printError(message, stack))
        );
    },

    /**
     * Asserts that actual is greater than expected.
     *
     * @typeParam E - The type of the actual expression
     * @param actual - The actual value to test
     * @param expected - The value that actual should be greater than
     * @returns An East expression that performs the greater-than check
     */
    greater<E extends EastType>(actual: Expr<E>, expected: SubtypeExprOrValue<NoInfer<E>>): ExprType<NullType> {
        const location = get_location(2);
        const expected_expr = Expr.from(expected, Expr.type(actual));
        return Expr.tryCatch(
            Expr.block($ => {
                const act = $.let(actual);
                const exp = $.let(expected_expr);
                return East.greater(act as any, exp as any).ifElse(
                    _$ => testPass(),
                    _$ => testFail(str`Expected ${act} to be greater than ${exp} (${`${location.filename} ${location.line}:${location.column}`})`)
                );
            }),
            (_$, message, stack) => testFail(East.String.printError(message, stack))
        );
    },

    /**
     * Asserts that actual is greater than or equal to expected.
     *
     * @typeParam E - The type of the actual expression
     * @param actual - The actual value to test
     * @param expected - The value that actual should be greater than or equal to
     * @returns An East expression that performs the greater-than-or-equal check
     */
    greaterEqual<E extends EastType>(actual: Expr<E>, expected: SubtypeExprOrValue<NoInfer<E>>): ExprType<NullType> {
        const location = get_location(2);
        const expected_expr = Expr.from(expected, Expr.type(actual));
        return Expr.tryCatch(
            Expr.block($ => {
                const act = $.let(actual);
                const exp = $.let(expected_expr);
                return East.greaterEqual(act as any, exp as any).ifElse(
                    _$ => testPass(),
                    _$ => testFail(str`Expected ${act} to be greater than or equal to ${exp} (${`${location.filename} ${location.line}:${location.column}`})`)
                );
            }),
            (_$, message, stack) => testFail(East.String.printError(message, stack))
        );
    },

    /**
     * Asserts that actual is between min and max (inclusive).
     *
     * @typeParam E - The type of the actual expression
     * @param actual - The actual value to test
     * @param min - The minimum value (inclusive)
     * @param max - The maximum value (inclusive)
     * @returns An East expression that performs the range check
     */
    between<E extends EastType>(actual: Expr<E>, min: SubtypeExprOrValue<NoInfer<E>>, max: SubtypeExprOrValue<NoInfer<E>>): ExprType<NullType> {
        const location = get_location(2);
        const min_expr = Expr.from(min, Expr.type(actual));
        const max_expr = Expr.from(max, Expr.type(actual));
        return Expr.tryCatch(
            East.greaterEqual(actual, min_expr as any).ifElse(
                _$ => East.lessEqual(actual, max_expr as any).ifElse(
                    _$ => testPass(),
                    _$ => testFail(str`Expected ${actual} to be less than or equal to ${max_expr} (${`${location.filename} ${location.line}:${location.column}`})`)
                ),
                _$ => testFail(str`Expected ${actual} to be greater than or equal to ${min_expr}`)
            ),
            (_$, message, stack) => testFail(East.String.printError(message, stack))
        );
    },

    /**
     * Asserts that an expression throws an error.
     *
     * @param fn - The expression that should throw an error when evaluated
     * @param pattern - Optional regex pattern to match against the error message
     * @returns An East expression that verifies an error is thrown
     */
    throws(fn: Expr<any>, pattern?: RegExp): ExprType<NullType> {
        const location = get_location(2);
        return Expr.tryCatch(
            Expr.block($ => {
                const result = $.let(fn);
                $(testFail(str`Expected error, got ${result} (${East.value(`${location.filename} ${location.line}:${location.column}`)})`));
                return null;
            }),
            ($, message, stack) => {
                if (pattern) {
                    // Validate error message matches the pattern
                    return message.contains(pattern).ifElse(
                        _$ => testPass(),
                        _$ => testFail(str`Expected error message to match ${East.value(pattern.source)}, but got: ${East.String.printError(message, stack)}`)
                    );
                } else {
                    // Just verify it threw
                    return testPass();
                }
            }
        );
    },
};

