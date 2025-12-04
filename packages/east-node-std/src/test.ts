/**
 * Copyright (c) 2025 Elara AI Pty Ltd
 * Dual-licensed under AGPL-3.0 and commercial license. See LICENSE for details.
 */
import assert from "node:assert/strict";
import util from "node:util";
import { test as testNode, describe as describeNode } from "node:test";
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { AsyncFunctionType, East, Expr, get_location, IRType, NullType, StringType, toJSONFor, type SubtypeExprOrValue } from "@elaraai/east";
import type { BlockBuilder, PlatformFunction, TypeSymbol } from "@elaraai/east/internal";

const { str } = East;

// Force node test to show full stack traces for easier debugging
Error.stackTraceLimit = Infinity

// Force node to print full objects in console.log output
util.inspect.defaultOptions.depth = null

/**
 * Platform function that indicates a test assertion passed.
 *
 * This is used by East test code to signal successful assertions.
 * When running in Node.js, this does nothing. Other platforms may log or track passes.
 */
const testPass = East.platform("testPass", [], NullType);

/**
 * Platform function that indicates a test assertion failed.
 *
 * This is used by East test code to signal failed assertions.
 * When running in Node.js, this throws an assertion error.
 *
 * @param message - The error message describing the assertion failure
 */
const testFail = East.platform("testFail", [StringType], NullType);

/**
 * Platform function that defines a single test case.
 *
 * This is used by East test code to define individual tests.
 * When running in Node.js, this runs the test using Node's test runner.
 *
 * @param name - The name of the test
 * @param body - The test body function
 */
const test = East.asyncPlatform("test", [StringType, AsyncFunctionType([], NullType)], NullType);

/**
 * Platform function that defines a test suite.
 *
 * This is used by East test code to group related tests.
 * When running in Node.js, this runs the suite using Node's describe.
 *
 * @param name - The name of the test suite
 * @param body - A function that calls test() to define tests
 */
const describe = East.asyncPlatform("describe", [StringType, AsyncFunctionType([], NullType)], NullType);

/**
 * Creates a test platform that uses Node.js assertions.
 *
 * @returns A platform object with `testPass`, `testFail`, `test`, and `describe` functions
 */
const testPlatformImpl: PlatformFunction[] = [
    testPass.implement(() => { }), // Assertion passed - do nothing (test continues)
    testFail.implement((message: string) => {
        // Assertion failed - throw to fail the test
        assert.fail(message);
    }),
    test.implement((name: string, body: () => Promise<null>) => testNode(name, async () => { await body(); })),
    describe.implement((name: string, body: () => Promise<null>) => describeNode(name, async () => { await body(); })),
]

const IRToJSON = toJSONFor(IRType);

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
 * Defines and runs an East test suite using platform functions.
 *
 * This creates a single East function that calls `describe` and `test` platform functions.
 * The entire suite can be exported as IR and run on any East implementation that provides
 * the test platform (testPass, testFail, test, describe).
 *
 * When the `EXPORT_TEST_IR` environment variable is set to a directory path, the IR for
 * each test suite is exported to `<path>/<suite_name>.json`.
 *
 * @param suiteName - The name of the test suite
 * @param builder - A function that receives a `test` function for defining tests
 *
 * @example
 * ```ts
 * describeEast("Array tests", (test) => {
 *   test("addition", $ => {
 *     $(assertEast.equal(East.value(1n).add(1n), 2n));
 *   });
 *   test("subtraction", $ => {
 *     $(assertEast.equal(East.value(2n).subtract(1n), 1n));
 *   });
 * });
 * ```
 *
 * @example
 * ```bash
 * # Export test IR to a directory
 * EXPORT_TEST_IR=./test-ir npm test
 * ```
 */
export function describeEast(
    suiteName: string,
    builder: (test: (name: string, body: ($: BlockBuilder<NullType>) => void) => void) => void,
    options?: DescribeEastOptions
) {
    const tests: Array<{ name: string, body: ($: BlockBuilder<NullType>) => void }> = [];

    // Collect all test names and bodies
    builder((name: string, body: ($: BlockBuilder<NullType>) => void) => {
        tests.push({ name, body });
    });

    // Create a single East function that uses describe/test platform functions
    const suiteFunction = East.asyncFunction([], NullType, $ => {
        $(describe.call($, suiteName, East.asyncFunction([], NullType, $ => {
            // beforeAll hook
            if (options?.beforeAll) {
                options.beforeAll($);
            }

            for (const { name, body } of tests) {
                $(test.call($, name, East.asyncFunction([], NullType, $test => {
                    // beforeEach hook (inside test body)
                    if (options?.beforeEach) {
                        options.beforeEach($test);
                    }

                    // Wrap test body in try-finally so afterEach runs even on failure
                    if (options?.afterEach) {
                        $test.try(body).finally(options.afterEach);
                    } else {
                        body($test);
                    }
                })));
            }

            // afterAll hook
            if (options?.afterAll) {
                options.afterAll($);
            }
        })));
    });

    // Auto-export test IR if EXPORT_TEST_IR environment variable is set to a path
    if (process.env.EXPORT_TEST_IR) {
        const outputDir = process.env.EXPORT_TEST_IR;

        try {
            mkdirSync(outputDir, { recursive: true });

            const ir = suiteFunction.toIR();
            const irJSON = IRToJSON(ir.ir);

            const filename = join(outputDir, `${suiteName.replace(/[^a-zA-Z0-9]/g, '_')}.json`);
            writeFileSync(filename, JSON.stringify(irJSON, null, 2));
            console.log(`✓ Exported test IR: ${filename}`);
        } catch (err) {
            console.error(`✗ Failed to export test IR for "${suiteName}":`, err);
        }
    }

    // Run the test suite using the Node.js platform implementation
    const compiled = suiteFunction.toIR().compile([...(options?.platformFns ?? []), ...testPlatformImpl]);
    return compiled();
}

/**
 * East assertion functions that match Node.js assert API naming.
 *
 * These functions generate East expressions that perform runtime assertions
 * using platform functions, enabling testing of East code.
 */
export const Assert = {
    /**
     * Asserts that two values are the same reference (meaning if one is mutated, the other reflects the change - and they are always equal).
     *
     * @typeParam E - The type of the actual expression
     * @param actual - The actual value to test
     * @param expected - The expected value to compare against
     * @returns An East expression that performs the equality check
     */
    is<E extends Expr>(actual: E, expected: SubtypeExprOrValue<NoInfer<E>[TypeSymbol]>) {
        const location = get_location(2);
        const expected_expr = Expr.from(expected, Expr.type(actual));
        return Expr.tryCatch(
            Expr.block($ => {
                const act = $.let(actual);
                const exp = $.let(expected_expr);
                return East.is(act as any, exp as any).ifElse(
                    _$ => testPass(),
                    _$ => testFail(str`Expected ${act} to be ${exp} (${East.value(`${location.filename} ${location.line}:${location.column}`)})`)
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
    equal<E extends Expr>(actual: E, expected: SubtypeExprOrValue<NoInfer<E>[TypeSymbol]>) {
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
    notEqual<E extends Expr>(actual: E, expected: SubtypeExprOrValue<NoInfer<E>[TypeSymbol]>) {
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
    less<E extends Expr>(actual: E, expected: SubtypeExprOrValue<NoInfer<E>[TypeSymbol]>) {
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
    lessEqual<E extends Expr>(actual: E, expected: SubtypeExprOrValue<NoInfer<E>[TypeSymbol]>) {
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
    greater<E extends Expr>(actual: E, expected: SubtypeExprOrValue<NoInfer<E>[TypeSymbol]>) {
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
    greaterEqual<E extends Expr>(actual: E, expected: SubtypeExprOrValue<NoInfer<E>[TypeSymbol]>) {
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
    between<E extends Expr>(actual: E, min: SubtypeExprOrValue<NoInfer<E>[TypeSymbol]>, max: SubtypeExprOrValue<NoInfer<E>[TypeSymbol]>) {
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
    throws(fn: Expr<any>, pattern?: RegExp) {
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

    /**
     * Fails a test with the given message.
     * 
     * @param message 
     * @returns An East expression that unconditionally fails the test
     */
    fail(message: SubtypeExprOrValue<StringType>) {
        const location = get_location(2);
        const message_expr = Expr.from(message, StringType);
        return testFail(str`${message_expr} (${East.value(`${location.filename} ${location.line}:${location.column}`)})`);
    }
};







// /**
//  * Copyright (c) 2025 Elara AI Pty Ltd
//  * Dual-licensed under AGPL-3.0 and commercial license. See LICENSE for details.
//  */
// import assert from "node:assert/strict";
// import { test as testNode, describe as describeNode } from "node:test";
// import { East, Expr, get_location, NullType, StringType, BlockBuilder, type SubtypeExprOrValue, type ExprType, type EastType, AsyncFunctionType } from "@elaraai/east";
// import type { PlatformFunction } from "@elaraai/east/internal";

// const { str } = East;

// /**
//  * Signals that a test assertion passed.
//  *
//  * This platform function is used internally by East test assertions to indicate
//  * successful validation. When executed in Node.js, it performs no action (the test
//  * continues normally). Other platform implementations may log or track passes.
//  *
//  * This function is primarily used within the {@link Test} assertion helpers rather
//  * than being called directly in test code.
//  *
//  * @returns `null` - Has no meaningful return value
//  *
//  * @example
//  * ```ts
//  * import { East, NullType } from "@elaraai/east";
//  * import { Test } from "@elaraai/east-node-std";
//  *
//  * // Used internally by Test assertions
//  * const myTest = East.function([], NullType, $ => {
//  *     // Test.equal internally calls testPass when the assertion succeeds
//  *     $(Test.equal(East.value(42n), 42n));
//  * });
//  *
//  * const compiled = East.compile(myTest.toIR(), Test.Implementation);
//  * compiled();  // Test passes silently
//  * ```
//  *
//  * @remarks
//  * - Does not throw or produce output in Node.js implementation
//  * - Used by all {@link Test} assertion methods to signal success
//  * - Can be called directly for custom assertion logic
//  */
// export const testPass = East.platform("testPass", [], NullType);

// /**
//  * Signals that a test assertion failed with a message.
//  *
//  * This platform function is used internally by East test assertions to indicate
//  * validation failures. When executed in Node.js, it throws an assertion error with
//  * the provided message, causing the test to fail.
//  *
//  * This function is primarily used within the {@link Test} assertion helpers rather
//  * than being called directly, though it can be used for custom failure conditions.
//  *
//  * @param message - The error message describing why the assertion failed
//  * @returns `null` - Never actually returns (throws in implementation)
//  *
//  * @throws {AssertionError} Always throws with the provided message (Node.js implementation)
//  *
//  * @example
//  * ```ts
//  * import { East, StringType, NullType } from "@elaraai/east";
//  * import { Test } from "@elaraai/east-node-std";
//  *
//  * // Used internally by Test assertions
//  * const myTest = East.function([], NullType, $ => {
//  *     // Test.equal internally calls testFail when the assertion fails
//  *     $(Test.equal(East.value(42n), 99n));
//  *     // Throws: "Expected 42 to equal 99 (...)"
//  * });
//  * ```
//  *
//  * @example
//  * ```ts
//  * // Direct usage for custom validation
//  * const validatePositive = East.function([IntegerType], NullType, ($, n) => {
//  *     return n.greater(0n).ifElse(
//  *         _ => Test.pass(),
//  *         _ => Test.fail("Number must be positive")
//  *     );
//  * });
//  *
//  * const compiled = East.compile(validatePositive.toIR(), Test.Implementation);
//  * compiled(-5n);  // Throws: "Number must be positive"
//  * ```
//  *
//  * @remarks
//  * - Always throws in Node.js implementation (test fails immediately)
//  * - Used by all {@link Test} assertion methods to signal failure
//  * - Accepts location information in message for debugging
//  */
// const testFail = East.platform("testFail", [StringType], NullType);

// const test = East.asyncPlatform("test", [StringType, AsyncFunctionType([], NullType)], NullType);

// const describe = East.asyncPlatform("describe", [StringType, AsyncFunctionType([], NullType)], NullType);

// export const NodeTestTypes: any[] = [
//     testPass,
//     testFail,
//     test,
//     describe,
// ];

// export const NodeTest: PlatformFunction[] = [
//     testPass.implement(() => { }), // Assertion passed - do nothing (test continues)
//     testFail.implement((message: string) => {
//         // Assertion failed - throw to fail the test
//         assert.fail(message);
//     }),
//     test.implement(async (name: string, body: () => Promise<null>) => {
//         testNode(name, async () => {
//             await body();
//         });
//     }),
//     describe.implement(async (
//         name: string,
//         body: () => Promise<null>,
//     ) => {
//         describeNode(name, async () => {
//             await body();
//         });
//     }),
// ];


// /**
//  * Configuration options for East test suites.
//  */
// export interface DescribeEastOptions {
//     /**
//      * Platform functions to include in all tests and hooks.
//      */
//     platformFns?: PlatformFunction[];

//     /**
//      * Setup function run once before all tests.
//      * Use for opening database connections, initializing resources, etc.
//      */
//     beforeAll?: ($: BlockBuilder<NullType>) => void;

//     /**
//      * Cleanup function run once after all tests.
//      * Use for closing database connections, cleaning up resources, etc.
//      * Runs even if tests fail.
//      */
//     afterAll?: ($: BlockBuilder<NullType>) => void;

//     /**
//      * Setup function run before each test.
//      */
//     beforeEach?: ($: BlockBuilder<NullType>) => void;

//     /**
//      * Cleanup function run after each test.
//      * Runs even if the test fails.
//      */
//     afterEach?: ($: BlockBuilder<NullType>) => void;
// }

// /**
//  * Wrapper around Node.js `describe` that also exports test IR for cross-platform testing.
//  *
//  * This function behaves exactly like Node.js `describe` - it runs all the tests normally.
//  * Additionally, it creates a single East function that runs all tests in sequence,
//  * making it easy to export the entire test suite for running in other East implementations.
//  *
//  * Supports lifecycle hooks (beforeAll, afterAll, beforeEach, afterEach) as East functions
//  * to properly set up and tear down resources like database connections.
//  *
//  * @param suiteName - The name of the test suite
//  * @param builder - A function that receives a `test` function for defining tests
//  * @param options - Configuration options including platform functions and lifecycle hooks
//  *
//  * @example
//  * ```ts
//  * // Basic usage with platform functions
//  * describeEast("Array tests", (test) => {
//  *   test("addition", $ => {
//  *     $(Test.equal(East.value(1n).add(1n), 2n));
//  *   });
//  * }, { platformFns: [] });
//  * ```
//  *
//  * @example
//  * ```ts
//  * // With database cleanup hooks
//  * import { SQL } from "@elaraai/east-node-io";
//  *
//  * describeEast("Database tests", (test) => {
//  *   test("query users", $ => {
//  *     const conn = $.let(SQL.Postgres.connect(config));
//  *     const result = $.let(SQL.Postgres.query(conn, "SELECT * FROM users", []));
//  *     $(Test.equal(result.rows.length(), 2n));
//  *   });
//  * }, {
//  *   platformFns: SQL.Postgres.Implementation,
//  *   afterEach: $ => {
//  *     // Close connections even if test fails
//  *     const conn = $.let(SQL.Postgres.connect(config));
//  *     $(SQL.Postgres.close(conn));
//  *   }
//  * });
//  * ```
//  */
// export function describeEast(
//     suiteName: string,
//     builder: (test: (name: string, body: ($: BlockBuilder<NullType>) => void) => void) => void,
//     options: DescribeEastOptions = {}
// ) {
//     const platformFns = options.platformFns ?? [];
//     const tests: Array<{ name: string, body: ($: BlockBuilder<NullType>) => void }> = [];

//     // Collect all test names and bodies
//     builder((name: string, body: ($: BlockBuilder<NullType>) => void) => tests.push({ name, body }));

//     // Create a single East function that uses describe/test platform functions
//     const suiteFunction = East.asyncFunction([], NullType, $ => {
//         $(describe.call(
//             $,
//             suiteName,
//             East.asyncFunction([], NullType, $ => {
//                 if (options.beforeAll) $(test.call($, "beforeAll", East.asyncFunction([], NullType, options.beforeAll)));
//                 for (const { name, body } of tests) {
//                     if (options.beforeEach) $(test.call($, "beforeEach", East.asyncFunction([], NullType, options.beforeEach)));
//                     $(test.call($, name, East.asyncFunction([], NullType, body)));
//                     if (options.afterEach) $(test.call($, "afterEach", East.asyncFunction([], NullType, options.afterEach)));
//                 }
//                 if (options.afterAll) $(test.call($, "afterAll", East.asyncFunction([], NullType, options.afterAll)));
//             }),
//         ));
//     });

//     const funcs = [...NodeTest, ...platformFns]
//     if(funcs.some(f => f.type === 'async')) {
//         suiteFunction.toIR().compile([...NodeTest, ...platformFns]);
//     } else {
//         suiteFunction.toIR().compile([...NodeTest, ...platformFns]);
//     }
//     // Run the test suite using the Node.js platform implementation
// }

// /**
//  * East assertion functions that match Node.js assert API naming.
//  *
//  * These functions generate East expressions that perform runtime assertions
//  * using platform functions, enabling testing of East code.
//  */

// /**
//  * East assertion functions that match Node.js assert API naming.
//  *
//  * These functions generate East expressions that perform runtime assertions
//  * using platform functions, enabling testing of East code.
//  */
// export const Test = {
//     /**
//      * Platform function that signals a test assertion passed.
//      *
//      * Used internally by assertion methods to indicate successful validation.
//      * Does nothing in Node.js implementation - test continues normally.
//      *
//      * @returns An East expression that returns `null`
//      *
//      * @example
//      * ```ts
//      * import { East, NullType } from "@elaraai/east";
//      * import { Test } from "@elaraai/east-node-std";
//      *
//      * const customAssertion = East.function([], NullType, $ => {
//      *     return East.value(true).ifElse(
//      *         _ => Test.pass(),
//      *         _ => Test.fail("Condition was false")
//      *     );
//      * });
//      * ```
//      */
//     pass: testPass,

//     /**
//      * Platform function that signals a test assertion failed.
//      *
//      * Used internally by assertion methods to indicate validation failures.
//      * Throws an assertion error in Node.js implementation - test fails immediately.
//      *
//      * @param message - Error message describing the failure
//      * @returns An East expression that returns `null` (never actually returns - throws)
//      *
//      * @example
//      * ```ts
//      * import { East, StringType, NullType } from "@elaraai/east";
//      * import { Test } from "@elaraai/east-node-std";
//      *
//      * const validateRange = East.function([IntegerType], NullType, ($, value) => {
//      *     return value.between(0n, 100n).ifElse(
//      *         _ => Test.pass(),
//      *         _ => Test.fail("Value must be between 0 and 100")
//      *     );
//      * });
//      * ```
//      */
//     fail: testFail,

//     /**
//      * Asserts that two values are the same reference (meaning if one is mutated, the other reflects the change - and they are always equal).
//      *
//      * @typeParam E - The type of the actual expression
//      * @param actual - The actual value to test
//      * @param expected - The expected value to compare against
//      * @returns An East expression that performs the equality check
//      */
//     is<E extends EastType>(actual: Expr<E>, expected: SubtypeExprOrValue<NoInfer<E>>): ExprType<NullType> {
//         const location = get_location(2);
//         const expected_expr = Expr.from(expected, Expr.type(actual));
//         return Expr.tryCatch(
//             Expr.block($ => {
//                 const act = $.let(actual);
//                 const exp = $.let(expected_expr);
//                 return East.is(act as any, exp as any).ifElse(
//                     _$ => testPass(),
//                     _$ => testFail(str`Expected ${act} to equal ${exp} (${East.value(`${location.filename} ${location.line}:${location.column}`)})`)
//                 );
//             }),
//             (_$, message, stack) => testFail(East.String.printError(message, stack))
//         );
//     },

//     /**
//      * Asserts that two values are equal.
//      *
//      * @typeParam E - The type of the actual expression
//      * @param actual - The actual value to test
//      * @param expected - The expected value to compare against
//      * @returns An East expression that performs the equality check
//      */
//     equal<E extends EastType>(actual: Expr<E>, expected: SubtypeExprOrValue<NoInfer<E>>): ExprType<NullType> {
//         const location = get_location(2);
//         const expected_expr = Expr.from(expected, Expr.type(actual));
//         return Expr.tryCatch(
//             Expr.block($ => {
//                 const act = $.let(actual);
//                 const exp = $.let(expected_expr);
//                 return East.equal(act as any, exp as any).ifElse(
//                     _$ => testPass(),
//                     _$ => testFail(str`Expected ${act} to equal ${exp} (${East.value(`${location.filename} ${location.line}:${location.column}`)})`)
//                 );
//             }),
//             (_$, message, stack) => testFail(East.String.printError(message, stack))
//         );
//     },

//     /**
//      * Asserts that two values are not equal.
//      *
//      * @typeParam E - The type of the actual expression
//      * @param actual - The actual value to test
//      * @param expected - The value that should not be equal
//      * @returns An East expression that performs the inequality check
//      */
//     notEqual<E extends EastType>(actual: Expr<E>, expected: SubtypeExprOrValue<NoInfer<E>>): ExprType<NullType> {
//         const location = get_location(2);
//         const expected_expr = Expr.from(expected, Expr.type(actual));
//         return Expr.tryCatch(
//             Expr.block($ => {
//                 const act = $.let(actual);
//                 const exp = $.let(expected_expr);
//                 return East.notEqual(act as any, exp as any).ifElse(
//                     _$ => testPass(),
//                     _$ => testFail(str`Expected ${act} to not equal ${exp} (${East.value(`${location.filename} ${location.line}:${location.column}`)})`)
//                 );
//             }),
//             (_$, message, stack) => testFail(East.String.printError(message, stack))
//         );
//     },

//     /**
//      * Asserts that actual is less than expected.
//      *
//      * @typeParam E - The type of the actual expression
//      * @param actual - The actual value to test
//      * @param expected - The value that actual should be less than
//      * @returns An East expression that performs the less-than check
//      */
//     less<E extends EastType>(actual: Expr<E>, expected: SubtypeExprOrValue<NoInfer<E>>): ExprType<NullType> {
//         const location = get_location(2);
//         const expected_expr = Expr.from(expected, Expr.type(actual));
//         return Expr.tryCatch(
//             Expr.block($ => {
//                 const act = $.let(actual);
//                 const exp = $.let(expected_expr);
//                 return East.less(act as any, exp as any).ifElse(
//                     _$ => testPass(),
//                     _$ => testFail(str`Expected ${act} to be less than ${exp} (${`${location.filename} ${location.line}:${location.column}`})`)
//                 );
//             }),
//             (_$, message, stack) => testFail(East.String.printError(message, stack))
//         );
//     },

//     /**
//      * Asserts that actual is less than or equal to expected.
//      *
//      * @typeParam E - The type of the actual expression
//      * @param actual - The actual value to test
//      * @param expected - The value that actual should be less than or equal to
//      * @returns An East expression that performs the less-than-or-equal check
//      */
//     lessEqual<E extends EastType>(actual: Expr<E>, expected: SubtypeExprOrValue<NoInfer<E>>): ExprType<NullType> {
//         const location = get_location(2);
//         const expected_expr = Expr.from(expected, Expr.type(actual));
//         return Expr.tryCatch(
//             Expr.block($ => {
//                 const act = $.let(actual);
//                 const exp = $.let(expected_expr);
//                 return East.lessEqual(act as any, exp as any).ifElse(
//                     _$ => testPass(),
//                     _$ => testFail(str`Expected ${act} to be less than or equal to ${exp} (${`${location.filename} ${location.line}:${location.column}`})`)
//                 );
//             }),
//             (_$, message, stack) => testFail(East.String.printError(message, stack))
//         );
//     },

//     /**
//      * Asserts that actual is greater than expected.
//      *
//      * @typeParam E - The type of the actual expression
//      * @param actual - The actual value to test
//      * @param expected - The value that actual should be greater than
//      * @returns An East expression that performs the greater-than check
//      */
//     greater<E extends EastType>(actual: Expr<E>, expected: SubtypeExprOrValue<NoInfer<E>>): ExprType<NullType> {
//         const location = get_location(2);
//         const expected_expr = Expr.from(expected, Expr.type(actual));
//         return Expr.tryCatch(
//             Expr.block($ => {
//                 const act = $.let(actual);
//                 const exp = $.let(expected_expr);
//                 return East.greater(act as any, exp as any).ifElse(
//                     _$ => testPass(),
//                     _$ => testFail(str`Expected ${act} to be greater than ${exp} (${`${location.filename} ${location.line}:${location.column}`})`)
//                 );
//             }),
//             (_$, message, stack) => testFail(East.String.printError(message, stack))
//         );
//     },

//     /**
//      * Asserts that actual is greater than or equal to expected.
//      *
//      * @typeParam E - The type of the actual expression
//      * @param actual - The actual value to test
//      * @param expected - The value that actual should be greater than or equal to
//      * @returns An East expression that performs the greater-than-or-equal check
//      */
//     greaterEqual<E extends EastType>(actual: Expr<E>, expected: SubtypeExprOrValue<NoInfer<E>>): ExprType<NullType> {
//         const location = get_location(2);
//         const expected_expr = Expr.from(expected, Expr.type(actual));
//         return Expr.tryCatch(
//             Expr.block($ => {
//                 const act = $.let(actual);
//                 const exp = $.let(expected_expr);
//                 return East.greaterEqual(act as any, exp as any).ifElse(
//                     _$ => testPass(),
//                     _$ => testFail(str`Expected ${act} to be greater than or equal to ${exp} (${`${location.filename} ${location.line}:${location.column}`})`)
//                 );
//             }),
//             (_$, message, stack) => testFail(East.String.printError(message, stack))
//         );
//     },

//     /**
//      * Asserts that actual is between min and max (inclusive).
//      *
//      * @typeParam E - The type of the actual expression
//      * @param actual - The actual value to test
//      * @param min - The minimum value (inclusive)
//      * @param max - The maximum value (inclusive)
//      * @returns An East expression that performs the range check
//      */
//     between<E extends EastType>(actual: Expr<E>, min: SubtypeExprOrValue<NoInfer<E>>, max: SubtypeExprOrValue<NoInfer<E>>): ExprType<NullType> {
//         const location = get_location(2);
//         const min_expr = Expr.from(min, Expr.type(actual));
//         const max_expr = Expr.from(max, Expr.type(actual));
//         return Expr.tryCatch(
//             East.greaterEqual(actual, min_expr as any).ifElse(
//                 _$ => East.lessEqual(actual, max_expr as any).ifElse(
//                     _$ => testPass(),
//                     _$ => testFail(str`Expected ${actual} to be less than or equal to ${max_expr} (${`${location.filename} ${location.line}:${location.column}`})`)
//                 ),
//                 _$ => testFail(str`Expected ${actual} to be greater than or equal to ${min_expr}`)
//             ),
//             (_$, message, stack) => testFail(East.String.printError(message, stack))
//         );
//     },

//     /**
//      * Asserts that an expression throws an error.
//      *
//      * @param fn - The expression that should throw an error when evaluated
//      * @param pattern - Optional regex pattern to match against the error message
//      * @returns An East expression that verifies an error is thrown
//      */
//     throws(fn: Expr<any>, pattern?: RegExp): ExprType<NullType> {
//         const location = get_location(2);
//         return Expr.tryCatch(
//             Expr.block($ => {
//                 const result = $.let(fn);
//                 $(testFail(str`Expected error, got ${result} (${East.value(`${location.filename} ${location.line}:${location.column}`)})`));
//                 return null;
//             }),
//             ($, message, stack) => {
//                 if (pattern) {
//                     // Validate error message matches the pattern
//                     return message.contains(pattern).ifElse(
//                         _$ => testPass(),
//                         _$ => testFail(str`Expected error message to match ${East.value(pattern.source)}, but got: ${East.String.printError(message, stack)}`)
//                     );
//                 } else {
//                     // Just verify it threw
//                     return testPass();
//                 }
//             }
//         );
//     },
// };

