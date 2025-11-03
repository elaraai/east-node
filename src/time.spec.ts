/**
 * Copyright (c) 2025 Elara AI Pty Ltd
 * Licensed under AGPL-3.0. See LICENSE file for details.
 */
import { describeEast, assertEast } from "./test.js";
import { Time, TimeImpl } from "./time.js";

await describeEast("Time platform functions", (test) => {
    test("now returns a timestamp", $ => {
        const timestamp = $.let(Time.now());

        // Should be a reasonable timestamp (after 2020)
        $(assertEast.greater(timestamp, 1577836800000n)); // Jan 1, 2020
    });

    test("now returns increasing values", $ => {
        const time1 = $.let(Time.now());
        const time2 = $.let(Time.now());

        // time2 should be >= time1
        $(assertEast.greaterEqual(time2, time1));
    });

    test("sleep pauses execution", $ => {
        const start = $.let(Time.now());
        $(Time.sleep(100n)); // Sleep for 100ms
        const end = $.let(Time.now());

        const elapsed = $.let(end.subtract(start));

        // Should have slept at least 90ms (allowing for some timing variance)
        $(assertEast.greaterEqual(elapsed, 90n));
    });
}, TimeImpl);
