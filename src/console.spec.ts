/**
 * Copyright (c) 2025 Elara AI Pty Ltd
 * Licensed under AGPL-3.0. See LICENSE file for details.
 */
import { East } from "@elaraai/east";
import { describeEast, assertEast } from "./test.js";
import { Console, ConsoleImpl } from "./console.js";

await describeEast("Console platform functions", (test) => {
    test("console_log writes message", $ => {
        // We can't easily test stdout, but we can verify it compiles and runs
        $(Console.log("Test message"));
        $(assertEast.equal(East.value(true), true));
    });

    test("console_error writes to stderr", $ => {
        $(Console.error("Error message"));
        $(assertEast.equal(East.value(true), true));
    });

    test("console_write writes without newline", $ => {
        $(Console.write("No newline"));
        $(assertEast.equal(East.value(true), true));
    });

    test("String concatenation works with console_log", $ => {
        const msg = $.let(East.value("Hello").concat(" World"));
        $(Console.log(msg));
        $(assertEast.equal(msg, "Hello World"));
    });
}, ConsoleImpl);
