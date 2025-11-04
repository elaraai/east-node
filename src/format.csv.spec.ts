/**
 * Copyright (c) 2025 Elara AI Pty Ltd
 * Licensed under AGPL-3.0. See LICENSE file for details.
 */
import { East, variant, OptionType, StringType, type ValueTypeOf } from "@elaraai/east";
import { describeEast, Test } from "./test.js";
import { csv_parse, csv_serialize, CsvDataType, FormatImpl } from "./format.js";

await describeEast("CSV Platform Functions", (test) => {
    test("parses simple CSV with header", $ => {
        const csvData = $.let(East.value("name,age,city\nAlice,30,NYC\nBob,25,LA"));
        const blob = $.let(csvData.encodeUtf8());
        const config = $.let(East.value({
            delimiter: variant('none', null),
            quoteChar: variant('none', null),
            escapeChar: variant('none', null),
            newline: variant('none', null),
            hasHeader: true,
            nullString: variant('none', null),
            skipEmptyLines: false,
            trimFields: false,
        }));

        const result = $.let(csv_parse(blob, config));
        const length = $.let(result.size());
        $(Test.equal(length, 2n));

        const row0 = $.let(result.get(0n));
        const name0 = $.let(row0.get("name"));
        const nameValue0 = $.let(name0.unwrap("some"));
        $(Test.equal(nameValue0, "Alice"));

        const age0 = $.let(row0.get("age"));
        const ageValue0 = $.let(age0.unwrap("some"));
        $(Test.equal(ageValue0, "30"));
    });

    test("parses CSV without header", $ => {
        const csvData = $.let(East.value("Alice,30,NYC\nBob,25,LA"));
        const blob = $.let(csvData.encodeUtf8());
        const config = $.let(East.value({
            delimiter: variant('none', null),
            quoteChar: variant('none', null),
            escapeChar: variant('none', null),
            newline: variant('none', null),
            hasHeader: false,
            nullString: variant('none', null),
            skipEmptyLines: false,
            trimFields: false,
        }));

        const result = $.let(csv_parse(blob, config));
        const length = $.let(result.size());
        $(Test.equal(length, 2n));

        const row0 = $.let(result.get(0n));
        const col0 = $.let(row0.get("column_0"));
        const col0Value = $.let(col0.unwrap("some"));
        $(Test.equal(col0Value, "Alice"));
    });

    test("handles quoted fields with delimiters", $ => {
        const csvData = $.let(East.value('name,description\n"Alice","Hello, World"\n"Bob","Test, Data"'));
        const blob = $.let(csvData.encodeUtf8());
        const config = $.let(East.value({
            delimiter: variant('none', null),
            quoteChar: variant('none', null),
            escapeChar: variant('none', null),
            newline: variant('none', null),
            hasHeader: true,
            nullString: variant('none', null),
            skipEmptyLines: false,
            trimFields: false,
        }));

        const result = $.let(csv_parse(blob, config));
        const row0 = $.let(result.get(0n));
        const desc0 = $.let(row0.get("description"));
        const descValue0 = $.let(desc0.unwrap("some"));
        $(Test.equal(descValue0, "Hello, World"));
    });

    test("handles quoted fields with quotes (double-quote escape)", $ => {
        const csvData = $.let(East.value('name,quote\n"Alice","She said ""hello"""\n"Bob","He said ""goodbye"""'));
        const blob = $.let(csvData.encodeUtf8());
        const config = $.let(East.value({
            delimiter: variant('none', null),
            quoteChar: variant('none', null),
            escapeChar: variant('none', null),
            newline: variant('none', null),
            hasHeader: true,
            nullString: variant('none', null),
            skipEmptyLines: false,
            trimFields: false,
        }));

        const result = $.let(csv_parse(blob, config));
        const row0 = $.let(result.get(0n));
        const quote0 = $.let(row0.get("quote"));
        const quoteValue0 = $.let(quote0.unwrap("some"));
        $(Test.equal(quoteValue0, 'She said "hello"'));
    });

    test("handles null values", $ => {
        const csvData = $.let(East.value("name,age,city\nAlice,30,\nBob,,LA"));
        const blob = $.let(csvData.encodeUtf8());
        const config = $.let(East.value({
            delimiter: variant('none', null),
            quoteChar: variant('none', null),
            escapeChar: variant('none', null),
            newline: variant('none', null),
            hasHeader: true,
            nullString: variant('some', ""),
            skipEmptyLines: false,
            trimFields: false,
        }));

        const result = $.let(csv_parse(blob, config));
        const row0 = $.let(result.get(0n));
        const city0 = $.let(row0.get("city"));
        $(Test.equal(city0, variant('none', null)));

        const row1 = $.let(result.get(1n));
        const age1 = $.let(row1.get("age"));
        $(Test.equal(age1, variant('none', null)));
    });

    test("serializes simple data with header", $ => {
        const data = $.let(East.value([
            new Map([
                ["name", variant("some", "Alice")],
                ["age", variant("some", "30")],
            ]),
            new Map([
                ["name", variant("some", "Bob")],
                ["age", variant("some", "25")],
            ]),
        ], CsvDataType));

        const config = $.let(East.value({
            delimiter: ",",
            quoteChar: '"',
            escapeChar: '"',
            newline: "\n",
            includeHeader: true,
            nullString: "",
            alwaysQuote: false,
        }));

        const result = $.let(csv_serialize(data, config));
        const text = $.let(result.decodeUtf8());
        // Note: Dict keys are sorted alphabetically, so columns will be "age,name" not "name,age"
        $(Test.equal(text, "age,name\n30,Alice\n25,Bob"));
    });

    test("quotes fields with delimiters when serializing", $ => {
        const data = $.let(East.value([
            new Map([
                ["name", variant("some", "Alice")],
                ["description", variant("some", "Hello, World")],
            ]),
        ], CsvDataType));

        const config = $.let(East.value({
            delimiter: ",",
            quoteChar: '"',
            escapeChar: '"',
            newline: "\n",
            includeHeader: true,
            nullString: "",
            alwaysQuote: false,
        }));

        const result = $.let(csv_serialize(data, config));
        const text = $.let(result.decodeUtf8());
        // Note: Dict keys are sorted alphabetically, so columns will be "description,name" not "name,description"
        $(Test.equal(text, 'description,name\n"Hello, World",Alice'));
    });

    test("round-trip: parse and serialize", $ => {
        const originalCsv = $.let(East.value("name,age,city\nAlice,30,NYC\nBob,25,LA"));
        const blob = $.let(originalCsv.encodeUtf8());

        const parseConfig = $.let(East.value({
            delimiter: variant('none', null),
            quoteChar: variant('none', null),
            escapeChar: variant('none', null),
            newline: variant('none', null),
            hasHeader: true,
            nullString: variant('none', null),
            skipEmptyLines: false,
            trimFields: false,
        }));

        const parsed = $.let(csv_parse(blob, parseConfig));

        const serializeConfig = $.let(East.value({
            delimiter: ",",
            quoteChar: '"',
            escapeChar: '"',
            newline: "\n",
            includeHeader: true,
            nullString: "",
            alwaysQuote: false,
        }));

        const serialized = $.let(csv_serialize(parsed, serializeConfig));
        const text = $.let(serialized.decodeUtf8());
        $(Test.equal(text, originalCsv));
    });

    // Error handling tests
    test("errors on unclosed quote", $ => {
        const csvData = $.let(East.value('name,value\n"Alice,30'));
        const blob = $.let(csvData.encodeUtf8());
        const config = $.let(East.value({
            delimiter: variant('none', null),
            quoteChar: variant('none', null),
            escapeChar: variant('none', null),
            newline: variant('none', null),
            hasHeader: true,
            nullString: variant('none', null),
            skipEmptyLines: false,
            trimFields: false,
        }));

        $(Test.throws(csv_parse(blob, config), /Unclosed quote in row 2, column 1/));
    });

    test("errors on too many fields in row", $ => {
        const csvData = $.let(East.value("name,age\nAlice,30\nBob,25,Extra"));
        const blob = $.let(csvData.encodeUtf8());
        const config = $.let(East.value({
            delimiter: variant('none', null),
            quoteChar: variant('none', null),
            escapeChar: variant('none', null),
            newline: variant('none', null),
            hasHeader: true,
            nullString: variant('none', null),
            skipEmptyLines: false,
            trimFields: false,
        }));

        $(Test.throws(csv_parse(blob, config), /Too many fields in row 3.*expected 2 columns/));
    });

    test("errors on too few fields in row", $ => {
        const csvData = $.let(East.value("name,age,city\nAlice,30,NYC\nBob,25"));
        const blob = $.let(csvData.encodeUtf8());
        const config = $.let(East.value({
            delimiter: variant('none', null),
            quoteChar: variant('none', null),
            escapeChar: variant('none', null),
            newline: variant('none', null),
            hasHeader: true,
            nullString: variant('none', null),
            skipEmptyLines: false,
            trimFields: false,
        }));

        $(Test.throws(csv_parse(blob, config), /Too few fields in row 3.*expected 3 columns, got 2/));
    });

    test("errors on invalid escape sequence", $ => {
        const csvData = $.let(East.value('name,value\n"Alice","test\\x"'));
        const blob = $.let(csvData.encodeUtf8());
        const config = $.let(East.value({
            delimiter: variant('none', null),
            quoteChar: variant('none', null),
            escapeChar: variant('some', "\\"),
            newline: variant('none', null),
            hasHeader: true,
            nullString: variant('none', null),
            skipEmptyLines: false,
            trimFields: false,
        }));

        $(Test.throws(csv_parse(blob, config), /Invalid escape sequence in row 2, column 2/));
    });

    test("errors on text after closing quote", $ => {
        const csvData = $.let(East.value('name,value\n"Alice","test"extra'));
        const blob = $.let(csvData.encodeUtf8());
        const config = $.let(East.value({
            delimiter: variant('none', null),
            quoteChar: variant('none', null),
            escapeChar: variant('none', null),
            newline: variant('none', null),
            hasHeader: true,
            nullString: variant('none', null),
            skipEmptyLines: false,
            trimFields: false,
        }));

        $(Test.throws(csv_parse(blob, config), /Expected delimiter or newline after closing quote in row 2, column 2/));
    });

    test("errors on invalid delimiter length", $ => {
        const data = $.let(East.value([
            new Map([["name", variant("some", "Alice")]]),
        ], CsvDataType));

        const config = $.let(East.value({
            delimiter: "",
            quoteChar: '"',
            escapeChar: '"',
            newline: "\n",
            includeHeader: true,
            nullString: "",
            alwaysQuote: false,
        }));

        $(Test.throws(csv_serialize(data, config), /delimiter must not be empty/));
    });

    test("errors on invalid quote char length", $ => {
        const data = $.let(East.value([
            new Map([["name", variant("some", "Alice")]]),
        ], CsvDataType));

        const config = $.let(East.value({
            delimiter: ",",
            quoteChar: '""',
            escapeChar: '"',
            newline: "\n",
            includeHeader: true,
            nullString: "",
            alwaysQuote: false,
        }));

        $(Test.throws(csv_serialize(data, config), /quoteChar must have length 1/));
    });

    // Configuration option tests
    test("parses CSV with custom delimiter (tab)", $ => {
        const csvData = $.let(East.value("name\tage\tcity\nAlice\t30\tNYC"));
        const blob = $.let(csvData.encodeUtf8());
        const config = $.let(East.value({
            delimiter: variant('some', "\t"),
            quoteChar: variant('none', null),
            escapeChar: variant('none', null),
            newline: variant('none', null),
            hasHeader: true,
            nullString: variant('none', null),
            skipEmptyLines: false,
            trimFields: false,
        }));

        const result = $.let(csv_parse(blob, config));
        const row0 = $.let(result.get(0n));
        const city0 = $.let(row0.get("city"));
        const cityValue0 = $.let(city0.unwrap("some"));
        $(Test.equal(cityValue0, "NYC"));
    });

    test("parses CSV with custom delimiter (semicolon)", $ => {
        const csvData = $.let(East.value("name;age;city\nAlice;30;NYC"));
        const blob = $.let(csvData.encodeUtf8());
        const config = $.let(East.value({
            delimiter: variant('some', ";"),
            quoteChar: variant('none', null),
            escapeChar: variant('none', null),
            newline: variant('none', null),
            hasHeader: true,
            nullString: variant('none', null),
            skipEmptyLines: false,
            trimFields: false,
        }));

        const result = $.let(csv_parse(blob, config));
        const length = $.let(result.size());
        $(Test.equal(length, 1n));
    });

    test("parses CSV with custom quote char (single quote)", $ => {
        const csvData = $.let(East.value("name,value\n'Alice','Hello, World'"));
        const blob = $.let(csvData.encodeUtf8());
        const config = $.let(East.value({
            delimiter: variant('none', null),
            quoteChar: variant('some', "'"),
            escapeChar: variant('some', "'"),
            newline: variant('none', null),
            hasHeader: true,
            nullString: variant('none', null),
            skipEmptyLines: false,
            trimFields: false,
        }));

        const result = $.let(csv_parse(blob, config));
        const row0 = $.let(result.get(0n));
        const value0 = $.let(row0.get("value"));
        const valueText = $.let(value0.unwrap("some"));
        $(Test.equal(valueText, "Hello, World"));
    });

    test("parses CSV with backslash escape char", $ => {
        const csvData = $.let(East.value('name,value\n"Alice","test\\"quote"'));
        const blob = $.let(csvData.encodeUtf8());
        const config = $.let(East.value({
            delimiter: variant('none', null),
            quoteChar: variant('some', '"'),
            escapeChar: variant('some', "\\"),
            newline: variant('none', null),
            hasHeader: true,
            nullString: variant('none', null),
            skipEmptyLines: false,
            trimFields: false,
        }));

        const result = $.let(csv_parse(blob, config));
        const row0 = $.let(result.get(0n));
        const value0 = $.let(row0.get("value"));
        const valueText = $.let(value0.unwrap("some"));
        $(Test.equal(valueText, 'test"quote'));
    });

    test("parses CSV with explicit CRLF newline", $ => {
        const csvData = $.let(East.value("name,age\r\nAlice,30\r\nBob,25"));
        const blob = $.let(csvData.encodeUtf8());
        const config = $.let(East.value({
            delimiter: variant('none', null),
            quoteChar: variant('none', null),
            escapeChar: variant('none', null),
            newline: variant('some', "\r\n"),
            hasHeader: true,
            nullString: variant('none', null),
            skipEmptyLines: false,
            trimFields: false,
        }));

        const result = $.let(csv_parse(blob, config));
        const length = $.let(result.size());
        $(Test.equal(length, 2n));
    });

    test("skipEmptyLines ignores blank rows", $ => {
        const csvData = $.let(East.value("name,age\nAlice,30\n\nBob,25\n\n"));
        const blob = $.let(csvData.encodeUtf8());
        const config = $.let(East.value({
            delimiter: variant('none', null),
            quoteChar: variant('none', null),
            escapeChar: variant('none', null),
            newline: variant('none', null),
            hasHeader: true,
            nullString: variant('none', null),
            skipEmptyLines: true,
            trimFields: false,
        }));

        const result = $.let(csv_parse(blob, config));
        const length = $.let(result.size());
        $(Test.equal(length, 2n)); // Only Alice and Bob, empty lines skipped
    });

    test("trimFields removes whitespace", $ => {
        const csvData = $.let(East.value("name,age\n  Alice  ,  30  \n  Bob  ,  25  "));
        const blob = $.let(csvData.encodeUtf8());
        const config = $.let(East.value({
            delimiter: variant('none', null),
            quoteChar: variant('none', null),
            escapeChar: variant('none', null),
            newline: variant('none', null),
            hasHeader: true,
            nullString: variant('none', null),
            skipEmptyLines: false,
            trimFields: true,
        }));

        const result = $.let(csv_parse(blob, config));
        const row0 = $.let(result.get(0n));
        const name0 = $.let(row0.get("name"));
        const nameValue0 = $.let(name0.unwrap("some"));
        $(Test.equal(nameValue0, "Alice")); // Trimmed, not "  Alice  "
    });

    test("serializes with custom delimiter", $ => {
        const data = $.let(East.value([
            new Map([["name", variant("some", "Alice")], ["age", variant("some", "30")]]),
        ], CsvDataType));

        const config = $.let(East.value({
            delimiter: "\t",
            quoteChar: '"',
            escapeChar: '"',
            newline: "\n",
            includeHeader: true,
            nullString: "",
            alwaysQuote: false,
        }));

        const result = $.let(csv_serialize(data, config));
        const text = $.let(result.decodeUtf8());
        $(Test.equal(text, "age\tname\n30\tAlice"));
    });

    test("serializes with CRLF newline", $ => {
        const data = $.let(East.value([
            new Map([["name", variant("some", "Alice")]]),
        ], CsvDataType));

        const config = $.let(East.value({
            delimiter: ",",
            quoteChar: '"',
            escapeChar: '"',
            newline: "\r\n",
            includeHeader: true,
            nullString: "",
            alwaysQuote: false,
        }));

        const result = $.let(csv_serialize(data, config));
        const text = $.let(result.decodeUtf8());
        $(Test.equal(text, "name\r\nAlice"));
    });

    test("serializes without header", $ => {
        const data = $.let(East.value([
            new Map([["name", variant("some", "Alice")], ["age", variant("some", "30")]]),
        ], CsvDataType));

        const config = $.let(East.value({
            delimiter: ",",
            quoteChar: '"',
            escapeChar: '"',
            newline: "\n",
            includeHeader: false,
            nullString: "",
            alwaysQuote: false,
        }));

        const result = $.let(csv_serialize(data, config));
        const text = $.let(result.decodeUtf8());
        $(Test.equal(text, "30,Alice")); // No header line
    });

    test("serializes with alwaysQuote", $ => {
        const data = $.let(East.value([
            new Map([["name", variant("some", "Alice")], ["age", variant("some", "30")]]),
        ], CsvDataType));

        const config = $.let(East.value({
            delimiter: ",",
            quoteChar: '"',
            escapeChar: '"',
            newline: "\n",
            includeHeader: true,
            nullString: "",
            alwaysQuote: true,
        }));

        const result = $.let(csv_serialize(data, config));
        const text = $.let(result.decodeUtf8());
        $(Test.equal(text, '"age","name"\n"30","Alice"')); // All fields quoted
    });

    // Edge case tests
    test("handles empty CSV (no data rows)", $ => {
        const csvData = $.let(East.value("name,age,city"));
        const blob = $.let(csvData.encodeUtf8());
        const config = $.let(East.value({
            delimiter: variant('none', null),
            quoteChar: variant('none', null),
            escapeChar: variant('none', null),
            newline: variant('none', null),
            hasHeader: true,
            nullString: variant('none', null),
            skipEmptyLines: false,
            trimFields: false,
        }));

        const result = $.let(csv_parse(blob, config));
        const length = $.let(result.size());
        $(Test.equal(length, 0n)); // No data rows
    });

    test("handles CSV with all null values", $ => {
        const csvData = $.let(East.value("name,age,city\n,,\n,,"));
        const blob = $.let(csvData.encodeUtf8());
        const config = $.let(East.value({
            delimiter: variant('none', null),
            quoteChar: variant('none', null),
            escapeChar: variant('none', null),
            newline: variant('none', null),
            hasHeader: true,
            nullString: variant('some', ""),
            skipEmptyLines: false,
            trimFields: false,
        }));

        const result = $.let(csv_parse(blob, config));
        const row0 = $.let(result.get(0n));
        const name0 = $.let(row0.get("name"));
        $(Test.equal(name0, variant('none', null)));

        const age0 = $.let(row0.get("age"));
        $(Test.equal(age0, variant('none', null)));
    });

    test("distinguishes empty string from null", $ => {
        const csvData = $.let(East.value("name,value\nAlice,\"\"\nBob,NULL"));
        const blob = $.let(csvData.encodeUtf8());
        const config = $.let(East.value({
            delimiter: variant('none', null),
            quoteChar: variant('none', null),
            escapeChar: variant('none', null),
            newline: variant('none', null),
            hasHeader: true,
            nullString: variant('some', "NULL"),
            skipEmptyLines: false,
            trimFields: false,
        }));

        const result = $.let(csv_parse(blob, config));

        const row0 = $.let(result.get(0n));
        const value0 = $.let(row0.get("value"));
        const valueText0 = $.let(value0.unwrap("some"));
        $(Test.equal(valueText0, "")); // Empty string, not null

        const row1 = $.let(result.get(1n));
        const value1 = $.let(row1.get("value"));
        $(Test.equal(value1, variant('none', null))); // NULL string becomes none
    });

    test("serializes empty dataset", $ => {
        const data = $.let(East.value([], CsvDataType));

        const config = $.let(East.value({
            delimiter: ",",
            quoteChar: '"',
            escapeChar: '"',
            newline: "\n",
            includeHeader: true,
            nullString: "",
            alwaysQuote: false,
        }));

        const result = $.let(csv_serialize(data, config));
        const text = $.let(result.decodeUtf8());
        $(Test.equal(text, "")); // Empty output
    });

    test("serializes with all none values", $ => {
        const data = $.let(East.value([
            new Map([
                ["name", variant("none", null)],
                ["age", variant("none", null)],
            ]),
        ], CsvDataType));

        const config = $.let(East.value({
            delimiter: ",",
            quoteChar: '"',
            escapeChar: '"',
            newline: "\n",
            includeHeader: true,
            nullString: "NULL",
            alwaysQuote: false,
        }));

        const result = $.let(csv_serialize(data, config));
        const text = $.let(result.decodeUtf8());
        $(Test.equal(text, "age,name\nNULL,NULL"));
    });

    test("serializes mixed some and none values", $ => {
        const data = $.let(East.value([
            new Map<string, ValueTypeOf<OptionType<StringType>>>([
                ["name", variant("some", "Alice")],
                ["city", variant("none", null)],
            ]),
            new Map<string, ValueTypeOf<OptionType<StringType>>>([
                ["name", variant("none", null)],
                ["city", variant("some", "LA")],
            ]),
        ], CsvDataType));

        const config = $.let(East.value({
            delimiter: ",",
            quoteChar: '"',
            escapeChar: '"',
            newline: "\n",
            includeHeader: true,
            nullString: "",
            alwaysQuote: false,
        }));

        const result = $.let(csv_serialize(data, config));
        const text = $.let(result.decodeUtf8());
        $(Test.equal(text, "city,name\n,Alice\nLA,"));
    });
}, { platformFns: FormatImpl });
