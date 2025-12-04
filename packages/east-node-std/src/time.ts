/**
 * Copyright (c) 2025 Elara AI Pty Ltd
 * Dual-licensed under AGPL-3.0 and commercial license. See LICENSE for details.
 */
import { East, IntegerType, NullType } from "@elaraai/east";
import type { PlatformFunction } from "@elaraai/east/internal";
import { EastError } from "@elaraai/east/internal";

/**
 * Gets the current Unix timestamp in milliseconds.
 *
 * Returns the number of milliseconds elapsed since the Unix epoch
 * (January 1, 1970 00:00:00 UTC). This is useful for timestamping events,
 * measuring durations, and working with date/time data.
 *
 * This is a platform function for the East language, enabling time access
 * in East programs running on Node.js.
 *
 * @returns The current time as milliseconds since epoch (January 1, 1970 UTC)
 *
 * @example
 * ```ts
 * const getTimestamp = East.function([], IntegerType, $ => {
 *     return Time.now();
 *     // Returns: 1735689600000n (example)
 * });
 * ```
 */
export const time_now = East.platform("time_now", [], IntegerType);

/**
 * Sleeps for the specified number of milliseconds.
 *
 * Pauses execution asynchronously for the given duration. This is a non-blocking
 * sleep that allows other operations to run during the wait period. Useful for
 * rate limiting, delays, and timing control.
 *
 * This is a platform function for the East language, enabling timed delays
 * in East programs running on Node.js.
 *
 * @param ms - The number of milliseconds to sleep (must be non-negative)
 * @returns Null after sleeping completes
 *
 * @throws {EastError} When sleep fails (e.g., negative duration)
 *
 * @example
 * ```ts
 * const delayedTask = East.function([], NullType, $ => {
 *     $(Console.log("Starting..."));
 *     $(Time.sleep(1000n));  // Wait 1 second
 *     $(Console.log("Done!"));
 * });
 * ```
 */
export const time_sleep = East.asyncPlatform("time_sleep", [IntegerType], NullType);

/**
 * Node.js implementation of time platform functions.
 *
 * Pass this array to {@link East.compileAsync} to enable time operations.
 */
const TimeImpl: PlatformFunction[] = [
    time_now.implement(() => {
        try {
            return BigInt(Date.now());
        } catch (err: any) {
            throw new EastError(`Failed to get current time: ${err.message}`, {
                location: { filename: "time_now", line: 0n, column: 0n },
                cause: err
            });
        }
    }),
    time_sleep.implement(async (ms: bigint) => {
        try {
            await new Promise(resolve => setTimeout(resolve, Number(ms)));
        } catch (err: any) {
            throw new EastError(`Failed to sleep: ${err.message}`, {
                location: { filename: "time_sleep", line: 0n, column: 0n },
                cause: err
            });
        }
    }),
];

/**
 * Grouped time platform functions.
 *
 * Provides time and sleep operations for East programs.
 *
 * @example
 * ```ts
 * import { East, NullType } from "@elaraai/east";
 * import { Time } from "@elaraai/east-node-std";
 *
 * const timedTask = East.function([], NullType, $ => {
 *     const start = $.let(Time.now());
 *     $(Time.sleep(1000n)); // Sleep for 1 second
 *     const end = $.let(Time.now());
 * });
 *
 * const compiled = await East.compileAsync(timedTask.toIR(), Time.Implementation);
 * await compiled();
 * ```
 */
export const Time = {
    /**
     * Gets the current Unix timestamp in milliseconds.
     *
     * Returns the number of milliseconds elapsed since the Unix epoch
     * (January 1, 1970 00:00:00 UTC). Useful for timestamping and measuring durations.
     *
     * @returns The current time as milliseconds since epoch
     *
     * @example
     * ```ts
     * const getTimestamp = East.function([], IntegerType, $ => {
     *     return Time.now();
     * });
     *
     * const compiled = await East.compileAsync(getTimestamp.toIR(), Time.Implementation);
     * await compiled();  // Returns: 1735689600000n (example timestamp)
     * ```
     */
    now: time_now,

    /**
     * Sleeps for the specified number of milliseconds.
     *
     * Pauses execution asynchronously for the given duration. Non-blocking sleep
     * that allows other operations to run during the wait period.
     *
     * @param ms - The number of milliseconds to sleep (must be non-negative)
     * @returns Null after sleeping completes
     * @throws {EastError} When sleep fails
     *
     * @example
     * ```ts
     * const delayedTask = East.function([], NullType, $ => {
     *     $(Console.log("Starting..."));
     *     $(Time.sleep(1000n));
     *     $(Console.log("Done!"));
     * });
     *
     * const compiled = await East.compileAsync(delayedTask.toIR(), Time.Implementation);
     * await compiled();  // Waits 1 second between log messages
     * ```
     */
    sleep: time_sleep,

    /**
     * Node.js implementation of time platform functions.
     *
     * Pass this to {@link East.compileAsync} to enable time operations.
     */
    Implementation: TimeImpl,
} as const;

// Export for backwards compatibility
export { TimeImpl };
