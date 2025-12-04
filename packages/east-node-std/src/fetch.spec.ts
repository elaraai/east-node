/**
 * Copyright (c) 2025 Elara AI Pty Ltd
 * Dual-licensed under AGPL-3.0 and commercial license. See LICENSE for details.
 */
import { variant } from "@elaraai/east";
import { describeEast, Assert } from "./test.js";
import { Fetch, FetchRequestConfig, FetchImpl } from "./fetch.js";

describeEast("Fetch platform functions", (test) => {
    // Note: These tests require network access

    test("get fetches data from URL", $ => {
        const response = $.let(Fetch.get("https://www.google.com"));
        const len = $.let(response.length());

        // Response should not be empty
        $(Assert.greater(len, 0n));
    });

    test("post sends data to URL", $ => {
        const response = $.let(Fetch.post("https://httpbin.org/post", "test data"));
        const len = $.let(response.length());

        // Response should not be empty
        $(Assert.greater(len, 0n));

        // Response should contain our data
        $(Assert.equal(response.contains("test data"), true));
    });

    test("request performs GET request", $ => {
        const config = $.let({
            url: "https://www.google.com",
            method: variant("GET", null),
            headers: new Map<string, string>(),
            body: variant("none", null),
        }, FetchRequestConfig);

        const response = $.let(Fetch.request(config));

        $(Assert.equal(response.ok, true));
        $(Assert.equal(response.status, 200n));

        const bodyLen = $.let(response.body.length());
        $(Assert.greater(bodyLen, 0n));
    });

    test("request handles POST with body", $ => {
        const headers = $.let(new Map([["Content-Type", "application/json"]]));
        const config = $.let({
            url: "https://httpbin.org/post",
            method: variant("POST", null),
            headers,
            body: variant("some", '{"test": "data"}'),
        }, FetchRequestConfig);

        const response = $.let(Fetch.request(config));

        $(Assert.equal(response.ok, true));
        $(Assert.equal(response.status, 200n));
    });

    test("request returns response headers", $ => {
        const config = $.let({
            url: "https://www.google.com",
            method: variant("GET", null),
            headers: new Map<string, string>(),
            body: variant("none", null),
        }, FetchRequestConfig);

        const response = $.let(Fetch.request(config));

        // Check that headers map is not empty
        const headersSize = $.let(response.headers.size());
        $(Assert.greater(headersSize, 0n));

        // Check that content-type header exists (Google always returns this)
        const hasContentType = $.let(response.headers.has("content-type"));
        $(Assert.equal(hasContentType, true));
    });
}, { platformFns: FetchImpl });
