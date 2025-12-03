/**
 * Copyright (c) 2025 Elara AI Pty Ltd
 * Dual-licensed under AGPL-3.0 and commercial license. See LICENSE for details.
 */
import { East, variant, StringType, type ValueTypeOf, DictType } from "@elaraai/east";
import { LiteralValueType } from "@elaraai/east/internal";
import { describeEast, Test } from "@elaraai/east-node-std";
import { csv_parse, csv_serialize, CsvDataType, CsvColumnType, CsvImpl } from "./csv.js";

await describeEast("CSV Platform Functions", (test) => {
    test("parses simple CSV with header", $ => {
        const csvData = $.let(East.value("name,age,city\nAlice,30,NYC\nBob,25,LA"));
        const blob = $.let(csvData.encodeUtf8());
        const config = $.let(East.value({
            columns: variant('none', null),
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
        const nameValue0 = $.let(name0.unwrap("String"));
        $(Test.equal(nameValue0, "Alice"));

        const age0 = $.let(row0.get("age"));
        const ageValue0 = $.let(age0.unwrap("String"));
        $(Test.equal(ageValue0, "30"));
    });

    test("parses CSV without header", $ => {
        const csvData = $.let(East.value("Alice,30,NYC\nBob,25,LA"));
        const blob = $.let(csvData.encodeUtf8());
        const config = $.let(East.value({
            columns: variant('none', null),
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
        const col0Value = $.let(col0.unwrap("String"));
        $(Test.equal(col0Value, "Alice"));
    });

    test("handles quoted fields with delimiters", $ => {
        const csvData = $.let(East.value('name,description\n"Alice","Hello, World"\n"Bob","Test, Data"'));
        const blob = $.let(csvData.encodeUtf8());
        const config = $.let(East.value({
            columns: variant('none', null),
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
        const descValue0 = $.let(desc0.unwrap("String"));
        $(Test.equal(descValue0, "Hello, World"));
    });

    test("handles quoted fields with quotes (double-quote escape)", $ => {
        const csvData = $.let(East.value('name,quote\n"Alice","She said ""hello"""\n"Bob","He said ""goodbye"""'));
        const blob = $.let(csvData.encodeUtf8());
        const config = $.let(East.value({
            columns: variant('none', null),
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
        const quoteValue0 = $.let(quote0.unwrap("String"));
        $(Test.equal(quoteValue0, 'She said "hello"'));
    });

    test("handles null values", $ => {
        const csvData = $.let(East.value("name,age,city\nAlice,30,\nBob,,LA"));
        const blob = $.let(csvData.encodeUtf8());
        const config = $.let(East.value({
            columns: variant('none', null),
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
        $(Test.equal(city0, variant('Null', null)));

        const row1 = $.let(result.get(1n));
        const age1 = $.let(row1.get("age"));
        $(Test.equal(age1, variant('Null', null)));
    });

    test("serializes simple data with header", $ => {
        const data = $.let(East.value([
            new Map<string, ValueTypeOf<typeof LiteralValueType>>([
                ["name", variant("String", "Alice")],
                ["age", variant("String", "30")],
            ]),
            new Map<string, ValueTypeOf<typeof LiteralValueType>>([
                ["name", variant("String", "Bob")],
                ["age", variant("String", "25")],
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
        $(Test.equal(text, "age,name\n30,Alice\n25,Bob\n"));
    });

    test("quotes fields with delimiters when serializing", $ => {
        const data = $.let(East.value([
            new Map<string, ValueTypeOf<typeof LiteralValueType>>([
                ["name", variant("String", "Alice")],
                ["description", variant("String", "Hello, World")],
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
        $(Test.equal(text, 'description,name\n"Hello, World",Alice\n'));
    });

    test("round-trip: parse and serialize", $ => {
        const originalCsv = $.let(East.value("name,age,city\nAlice,30,NYC\nBob,25,LA\n"));
        const blob = $.let(originalCsv.encodeUtf8());

        const parseConfig = $.let(East.value({
            columns: variant('none', null),
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
            columns: variant('none', null),
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
            columns: variant('none', null),
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
            columns: variant('none', null),
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
            columns: variant('none', null),
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
            columns: variant('none', null),
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
            new Map([["name", variant("String", "Alice")]]),
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
            new Map([["name", variant("String", "Alice")]]),
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
            columns: variant('none', null),
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
        const cityValue0 = $.let(city0.unwrap("String"));
        $(Test.equal(cityValue0, "NYC"));
    });

    test("parses CSV with custom delimiter (semicolon)", $ => {
        const csvData = $.let(East.value("name;age;city\nAlice;30;NYC"));
        const blob = $.let(csvData.encodeUtf8());
        const config = $.let(East.value({
            columns: variant('none', null),
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
            columns: variant('none', null),
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
        const valueText = $.let(value0.unwrap("String"));
        $(Test.equal(valueText, "Hello, World"));
    });

    test("parses CSV with backslash escape char", $ => {
        const csvData = $.let(East.value('name,value\n"Alice","test\\"quote"'));
        const blob = $.let(csvData.encodeUtf8());
        const config = $.let(East.value({
            columns: variant('none', null),
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
        const valueText = $.let(value0.unwrap("String"));
        $(Test.equal(valueText, 'test"quote'));
    });

    test("parses CSV with explicit CRLF newline", $ => {
        const csvData = $.let(East.value("name,age\r\nAlice,30\r\nBob,25"));
        const blob = $.let(csvData.encodeUtf8());
        const config = $.let(East.value({
            columns: variant('none', null),
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
            columns: variant('none', null),
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
            columns: variant('none', null),
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
        const nameValue0 = $.let(name0.unwrap("String"));
        $(Test.equal(nameValue0, "Alice")); // Trimmed, not "  Alice  "
    });

    test("serializes with custom delimiter", $ => {
        const data = $.let(East.value([
            new Map([["name", variant("String", "Alice")], ["age", variant("String", "30")]]),
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
        $(Test.equal(text, "age\tname\n30\tAlice\n"));
    });

    test("serializes with CRLF newline", $ => {
        const data = $.let(East.value([
            new Map([["name", variant("String", "Alice")]]),
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
        $(Test.equal(text, "name\r\nAlice\r\n"));
    });

    test("serializes without header", $ => {
        const data = $.let(East.value([
            new Map([["name", variant("String", "Alice")], ["age", variant("String", "30")]]),
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
        $(Test.equal(text, "30,Alice\n")); // No header line
    });

    test("serializes with alwaysQuote", $ => {
        const data = $.let(East.value([
            new Map([["name", variant("String", "Alice")], ["age", variant("String", "30")]]),
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
        $(Test.equal(text, '"age","name"\n"30","Alice"\n')); // All fields quoted
    });

    // Edge case tests
    test("handles empty CSV (no data rows)", $ => {
        const csvData = $.let(East.value("name,age,city"));
        const blob = $.let(csvData.encodeUtf8());
        const config = $.let(East.value({
            columns: variant('none', null),
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
            columns: variant('none', null),
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
        $(Test.equal(name0, variant('Null', null)));

        const age0 = $.let(row0.get("age"));
        $(Test.equal(age0, variant('Null', null)));
    });

    test("distinguishes empty string from null", $ => {
        const csvData = $.let(East.value("name,value\nAlice,\"\"\nBob,NULL"));
        const blob = $.let(csvData.encodeUtf8());
        const config = $.let(East.value({
            columns: variant('none', null),
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
        const valueText0 = $.let(value0.unwrap("String"));
        $(Test.equal(valueText0, "")); // Empty string, not null

        const row1 = $.let(result.get(1n));
        const value1 = $.let(row1.get("value"));
        $(Test.equal(value1, variant('Null', null))); // NULL string becomes none
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
            new Map<string, ValueTypeOf<typeof LiteralValueType>>([
                ["name", variant("Null", null)],
                ["age", variant("Null", null)],
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
        $(Test.equal(text, "age,name\nNULL,NULL\n"));
    });

    test("serializes mixed some and none values", $ => {
        const data = $.let(East.value([
            new Map<string, ValueTypeOf<typeof LiteralValueType>>([
                ["name", variant("String", "Alice")],
                ["city", variant("Null", null)],
            ]),
            new Map<string, ValueTypeOf<typeof LiteralValueType>>([
                ["name", variant("Null", null)],
                ["city", variant("String", "LA")],
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
        $(Test.equal(text, "city,name\n,Alice\nLA,\n"));
    });

    // Column type tests
    test("parses CSV with Integer column type", $ => {
        const csvData = $.let(East.value("name,age\nAlice,30\nBob,25"));
        const blob = $.let(csvData.encodeUtf8());
        const columns = $.let(new Map<string, ValueTypeOf<typeof CsvColumnType>>([
            ["age", variant('Integer', null)],
        ]), DictType(StringType, CsvColumnType));
        const config = $.let(East.value({
            columns: variant('some', columns),
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

        const name0 = $.let(row0.get("name"));
        const nameValue0 = $.let(name0.unwrap("String"));
        $(Test.equal(nameValue0, "Alice"));

        const age0 = $.let(row0.get("age"));
        const ageValue0 = $.let(age0.unwrap("Integer"));
        $(Test.equal(ageValue0, 30n));
    });

    test("parses CSV with Boolean column type", $ => {
        const csvData = $.let(East.value("name,active\nAlice,true\nBob,false"));
        const blob = $.let(csvData.encodeUtf8());
        const columns = $.let(new Map<string, ValueTypeOf<typeof CsvColumnType>>([
            ["active", variant('Boolean', null)],
        ]), DictType(StringType, CsvColumnType));
        const config = $.let(East.value({
            columns: variant('some', columns),
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

        const active0 = $.let(row0.get("active"));
        const activeValue0 = $.let(active0.unwrap("Boolean"));
        $(Test.equal(activeValue0, true));

        const row1 = $.let(result.get(1n));
        const active1 = $.let(row1.get("active"));
        const activeValue1 = $.let(active1.unwrap("Boolean"));
        $(Test.equal(activeValue1, false));
    });

    test("parses CSV with Float column type", $ => {
        const csvData = $.let(East.value("name,score\nAlice,95.5\nBob,87.3"));
        const blob = $.let(csvData.encodeUtf8());
        const columns = $.let(new Map<string, ValueTypeOf<typeof CsvColumnType>>([
            ["score", variant('Float', null)],
        ]), DictType(StringType, CsvColumnType));
        const config = $.let(East.value({
            columns: variant('some', columns),
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

        const score0 = $.let(row0.get("score"));
        const scoreValue0 = $.let(score0.unwrap("Float"));
        $(Test.equal(scoreValue0, 95.5));
    });

    test("parses CSV with multiple typed columns", $ => {
        const csvData = $.let(East.value("name,age,score,active\nAlice,30,95.5,true\nBob,25,87.3,false"));
        const blob = $.let(csvData.encodeUtf8());
        const columns = $.let(new Map<string, ValueTypeOf<typeof CsvColumnType>>([
            ["age", variant('Integer', null)],
            ["score", variant('Float', null)],
            ["active", variant('Boolean', null)],
        ]), DictType(StringType, CsvColumnType));
        const config = $.let(East.value({
            columns: variant('some', columns),
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

        const name0 = $.let(row0.get("name"));
        const nameValue0 = $.let(name0.unwrap("String"));
        $(Test.equal(nameValue0, "Alice"));

        const age0 = $.let(row0.get("age"));
        const ageValue0 = $.let(age0.unwrap("Integer"));
        $(Test.equal(ageValue0, 30n));

        const score0 = $.let(row0.get("score"));
        const scoreValue0 = $.let(score0.unwrap("Float"));
        $(Test.equal(scoreValue0, 95.5));

        const active0 = $.let(row0.get("active"));
        const activeValue0 = $.let(active0.unwrap("Boolean"));
        $(Test.equal(activeValue0, true));
    });

    test("columns without type specification default to String", $ => {
        const csvData = $.let(East.value("name,age,city\nAlice,30,NYC"));
        const blob = $.let(csvData.encodeUtf8());
        const columns = $.let(new Map<string, ValueTypeOf<typeof CsvColumnType>>([
            ["age", variant('Integer', null)],
            // name and city will default to String
        ]), DictType(StringType, CsvColumnType));
        const config = $.let(East.value({
            columns: variant('some', columns),
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

        const name0 = $.let(row0.get("name"));
        const nameValue0 = $.let(name0.unwrap("String"));
        $(Test.equal(nameValue0, "Alice"));

        const city0 = $.let(row0.get("city"));
        const cityValue0 = $.let(city0.unwrap("String"));
        $(Test.equal(cityValue0, "NYC"));
    });

    // Type parsing error tests
    test("errors on invalid Integer value (empty string)", $ => {
        const csvData = $.let(East.value("name,age\nAlice,\"\""));
        const blob = $.let(csvData.encodeUtf8());
        const columns = $.let(new Map<string, ValueTypeOf<typeof CsvColumnType>>([
            ["age", variant('Integer', null)],
        ]), DictType(StringType, CsvColumnType));
        const config = $.let(East.value({
            columns: variant('some', columns),
            delimiter: variant('none', null),
            quoteChar: variant('none', null),
            escapeChar: variant('none', null),
            newline: variant('none', null),
            hasHeader: true,
            nullString: variant('some', "NULL"),
            skipEmptyLines: false,
            trimFields: false,
        }));

        $(Test.throws(csv_parse(blob, config), /Failed to parse value for header age in row 2, column 2: Cannot parse empty string as Integer/));
    });

    test("errors on invalid Integer value (non-numeric)", $ => {
        const csvData = $.let(East.value("name,age\nAlice,abc"));
        const blob = $.let(csvData.encodeUtf8());
        const columns = $.let(new Map<string, ValueTypeOf<typeof CsvColumnType>>([
            ["age", variant('Integer', null)],
        ]), DictType(StringType, CsvColumnType));
        const config = $.let(East.value({
            columns: variant('some', columns),
            delimiter: variant('none', null),
            quoteChar: variant('none', null),
            escapeChar: variant('none', null),
            newline: variant('none', null),
            hasHeader: true,
            nullString: variant('none', null),
            skipEmptyLines: false,
            trimFields: false,
        }));

        $(Test.throws(csv_parse(blob, config), /Failed to parse value for header age in row 2, column 2: Cannot parse "abc" as Integer/));
    });

    test("errors on Integer out of range (too large)", $ => {
        const csvData = $.let(East.value("name,age\nAlice,9223372036854775808"));
        const blob = $.let(csvData.encodeUtf8());
        const columns = $.let(new Map<string, ValueTypeOf<typeof CsvColumnType>>([
            ["age", variant('Integer', null)],
        ]), DictType(StringType, CsvColumnType));
        const config = $.let(East.value({
            columns: variant('some', columns),
            delimiter: variant('none', null),
            quoteChar: variant('none', null),
            escapeChar: variant('none', null),
            newline: variant('none', null),
            hasHeader: true,
            nullString: variant('some', "NULL"),
            skipEmptyLines: false,
            trimFields: false,
        }));

        $(Test.throws(csv_parse(blob, config), /Failed to parse value for header age in row 2, column 2: Integer out of range \(must be 64-bit signed\)/));
    });

    test("errors on Integer out of range (too small)", $ => {
        const csvData = $.let(East.value("name,age\nAlice,-9223372036854775809"));
        const blob = $.let(csvData.encodeUtf8());
        const columns = $.let(new Map<string, ValueTypeOf<typeof CsvColumnType>>([
            ["age", variant('Integer', null)],
        ]), DictType(StringType, CsvColumnType));
        const config = $.let(East.value({
            columns: variant('some', columns),
            delimiter: variant('none', null),
            quoteChar: variant('none', null),
            escapeChar: variant('none', null),
            newline: variant('none', null),
            hasHeader: true,
            nullString: variant('some', "NULL"),
            skipEmptyLines: false,
            trimFields: false,
        }));

        $(Test.throws(csv_parse(blob, config), /Failed to parse value for header age in row 2, column 2: Integer out of range \(must be 64-bit signed\)/));
    });

    test("errors on invalid Float value (empty string)", $ => {
        const csvData = $.let(East.value("name,score\nAlice,\"\""));
        const blob = $.let(csvData.encodeUtf8());
        const columns = $.let(new Map<string, ValueTypeOf<typeof CsvColumnType>>([
            ["score", variant('Float', null)],
        ]), DictType(StringType, CsvColumnType));
        const config = $.let(East.value({
            columns: variant('some', columns),
            delimiter: variant('none', null),
            quoteChar: variant('none', null),
            escapeChar: variant('none', null),
            newline: variant('none', null),
            hasHeader: true,
            nullString: variant('some', "NULL"),
            skipEmptyLines: false,
            trimFields: false,
        }));

        $(Test.throws(csv_parse(blob, config), /Failed to parse value for header score in row 2, column 2: Cannot parse empty string as Float/));
    });

    test("errors on invalid Float value (non-numeric)", $ => {
        const csvData = $.let(East.value("name,score\nAlice,abc"));
        const blob = $.let(csvData.encodeUtf8());
        const columns = $.let(new Map<string, ValueTypeOf<typeof CsvColumnType>>([
            ["score", variant('Float', null)],
        ]), DictType(StringType, CsvColumnType));
        const config = $.let(East.value({
            columns: variant('some', columns),
            delimiter: variant('none', null),
            quoteChar: variant('none', null),
            escapeChar: variant('none', null),
            newline: variant('none', null),
            hasHeader: true,
            nullString: variant('none', null),
            skipEmptyLines: false,
            trimFields: false,
        }));

        $(Test.throws(csv_parse(blob, config), /Failed to parse value for header score in row 2, column 2: Cannot parse "abc" as Float/));
    });

    test("errors on invalid Boolean value", $ => {
        const csvData = $.let(East.value("name,active\nAlice,yes"));
        const blob = $.let(csvData.encodeUtf8());
        const columns = $.let(new Map<string, ValueTypeOf<typeof CsvColumnType>>([
            ["active", variant('Boolean', null)],
        ]), DictType(StringType, CsvColumnType));
        const config = $.let(East.value({
            columns: variant('some', columns),
            delimiter: variant('none', null),
            quoteChar: variant('none', null),
            escapeChar: variant('none', null),
            newline: variant('none', null),
            hasHeader: true,
            nullString: variant('none', null),
            skipEmptyLines: false,
            trimFields: false,
        }));

        $(Test.throws(csv_parse(blob, config), /Failed to parse value for header active in row 2, column 2: Cannot parse "yes" as Boolean \(expected 'true' or 'false'\)/));
    });

    test("errors on invalid DateTime value (empty string)", $ => {
        const csvData = $.let(East.value("name,created\nAlice,\"\""));
        const blob = $.let(csvData.encodeUtf8());
        const columns = $.let(new Map<string, ValueTypeOf<typeof CsvColumnType>>([
            ["created", variant('DateTime', null)],
        ]), DictType(StringType, CsvColumnType));
        const config = $.let(East.value({
            columns: variant('some', columns),
            delimiter: variant('none', null),
            quoteChar: variant('none', null),
            escapeChar: variant('none', null),
            newline: variant('none', null),
            hasHeader: true,
            nullString: variant('some', "NULL"),
            skipEmptyLines: false,
            trimFields: false,
        }));

        $(Test.throws(csv_parse(blob, config), /Failed to parse value for header created in row 2, column 2: Cannot parse empty string as DateTime/));
    });

    test("errors on invalid DateTime value (invalid format)", $ => {
        const csvData = $.let(East.value("name,created\nAlice,not-a-date"));
        const blob = $.let(csvData.encodeUtf8());
        const columns = $.let(new Map<string, ValueTypeOf<typeof CsvColumnType>>([
            ["created", variant('DateTime', null)],
        ]), DictType(StringType, CsvColumnType));
        const config = $.let(East.value({
            columns: variant('some', columns),
            delimiter: variant('none', null),
            quoteChar: variant('none', null),
            escapeChar: variant('none', null),
            newline: variant('none', null),
            hasHeader: true,
            nullString: variant('none', null),
            skipEmptyLines: false,
            trimFields: false,
        }));

        $(Test.throws(csv_parse(blob, config), /Failed to parse value for header created in row 2, column 2: Cannot parse "not-a-date" as DateTime \(expected ISO 8601 format\)/));
    });

    test("errors on invalid Blob value (invalid hex)", $ => {
        const csvData = $.let(East.value("name,data\nAlice,0xGGGG"));
        const blob = $.let(csvData.encodeUtf8());
        const columns = $.let(new Map<string, ValueTypeOf<typeof CsvColumnType>>([
            ["data", variant('Blob', null)],
        ]), DictType(StringType, CsvColumnType));
        const config = $.let(East.value({
            columns: variant('some', columns),
            delimiter: variant('none', null),
            quoteChar: variant('none', null),
            escapeChar: variant('none', null),
            newline: variant('none', null),
            hasHeader: true,
            nullString: variant('some', "NULL"),
            skipEmptyLines: false,
            trimFields: false,
        }));

        $(Test.throws(csv_parse(blob, config), /Failed to parse value for header data in row 2, column 2: Cannot parse "0xGGGG" as Blob \(invalid hex character\)/));
    });

    // Large dataset test with mixed types and null values
    test("handles large dataset with multiple types and null values", $ => {
        const csvData = $.let(East.value(
            "id,name,age,score,active,city\n" +
            "1,Alice,30,95.5,true,NYC\n" +
            "2,Bob,25,87.3,false,LA\n" +
            "3,Charlie,,92.1,true,\n" +
            "4,Diana,35,,false,Chicago\n" +
            "5,,28,88.9,true,Boston\n" +
            "6,Eve,42,91.2,,Miami\n" +
            "7,Frank,31,85.7,false,\n" +
            "8,Grace,,89.4,true,Seattle\n" +
            "9,Henry,29,,false,Denver\n" +
            "10,,33,93.8,true,\n" +
            "11,Ivy,27,86.5,false,Austin\n" +
            "12,Jack,38,,true,Portland\n" +
            "13,Kate,,90.2,false,Phoenix\n" +
            "14,Leo,45,94.1,,Atlanta\n" +
            "15,,32,87.9,true,\n" +
            "16,Mia,26,91.7,false,Dallas\n" +
            "17,Noah,34,,true,Houston\n" +
            "18,Olivia,,88.3,false,\n" +
            "19,Peter,41,92.6,true,SF\n" +
            "20,Quinn,29,,false,Vegas\n"
        ));
        const blob = $.let(csvData.encodeUtf8());
        const columns = $.let(new Map<string, ValueTypeOf<typeof CsvColumnType>>([
            ["id", variant('Integer', null)],
            ["age", variant('Integer', null)],
            ["score", variant('Float', null)],
            ["active", variant('Boolean', null)],
        ]), DictType(StringType, CsvColumnType));
        const config = $.let(East.value({
            columns: variant('some', columns),
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

        const expected = $.let(East.value([
            new Map<string, ValueTypeOf<typeof LiteralValueType>>([["id", variant('Integer', 1n)], ["name", variant('String', "Alice")], ["age", variant('Integer', 30n)], ["score", variant('Float', 95.5)], ["active", variant('Boolean', true)], ["city", variant('String', "NYC")]]),
            new Map<string, ValueTypeOf<typeof LiteralValueType>>([["id", variant('Integer', 2n)], ["name", variant('String', "Bob")], ["age", variant('Integer', 25n)], ["score", variant('Float', 87.3)], ["active", variant('Boolean', false)], ["city", variant('String', "LA")]]),
            new Map<string, ValueTypeOf<typeof LiteralValueType>>([["id", variant('Integer', 3n)], ["name", variant('String', "Charlie")], ["age", variant('Null', null)], ["score", variant('Float', 92.1)], ["active", variant('Boolean', true)], ["city", variant('Null', null)]]),
            new Map<string, ValueTypeOf<typeof LiteralValueType>>([["id", variant('Integer', 4n)], ["name", variant('String', "Diana")], ["age", variant('Integer', 35n)], ["score", variant('Null', null)], ["active", variant('Boolean', false)], ["city", variant('String', "Chicago")]]),
            new Map<string, ValueTypeOf<typeof LiteralValueType>>([["id", variant('Integer', 5n)], ["name", variant('Null', null)], ["age", variant('Integer', 28n)], ["score", variant('Float', 88.9)], ["active", variant('Boolean', true)], ["city", variant('String', "Boston")]]),
            new Map<string, ValueTypeOf<typeof LiteralValueType>>([["id", variant('Integer', 6n)], ["name", variant('String', "Eve")], ["age", variant('Integer', 42n)], ["score", variant('Float', 91.2)], ["active", variant('Null', null)], ["city", variant('String', "Miami")]]),
            new Map<string, ValueTypeOf<typeof LiteralValueType>>([["id", variant('Integer', 7n)], ["name", variant('String', "Frank")], ["age", variant('Integer', 31n)], ["score", variant('Float', 85.7)], ["active", variant('Boolean', false)], ["city", variant('Null', null)]]),
            new Map<string, ValueTypeOf<typeof LiteralValueType>>([["id", variant('Integer', 8n)], ["name", variant('String', "Grace")], ["age", variant('Null', null)], ["score", variant('Float', 89.4)], ["active", variant('Boolean', true)], ["city", variant('String', "Seattle")]]),
            new Map<string, ValueTypeOf<typeof LiteralValueType>>([["id", variant('Integer', 9n)], ["name", variant('String', "Henry")], ["age", variant('Integer', 29n)], ["score", variant('Null', null)], ["active", variant('Boolean', false)], ["city", variant('String', "Denver")]]),
            new Map<string, ValueTypeOf<typeof LiteralValueType>>([["id", variant('Integer', 10n)], ["name", variant('Null', null)], ["age", variant('Integer', 33n)], ["score", variant('Float', 93.8)], ["active", variant('Boolean', true)], ["city", variant('Null', null)]]),
            new Map<string, ValueTypeOf<typeof LiteralValueType>>([["id", variant('Integer', 11n)], ["name", variant('String', "Ivy")], ["age", variant('Integer', 27n)], ["score", variant('Float', 86.5)], ["active", variant('Boolean', false)], ["city", variant('String', "Austin")]]),
            new Map<string, ValueTypeOf<typeof LiteralValueType>>([["id", variant('Integer', 12n)], ["name", variant('String', "Jack")], ["age", variant('Integer', 38n)], ["score", variant('Null', null)], ["active", variant('Boolean', true)], ["city", variant('String', "Portland")]]),
            new Map<string, ValueTypeOf<typeof LiteralValueType>>([["id", variant('Integer', 13n)], ["name", variant('String', "Kate")], ["age", variant('Null', null)], ["score", variant('Float', 90.2)], ["active", variant('Boolean', false)], ["city", variant('String', "Phoenix")]]),
            new Map<string, ValueTypeOf<typeof LiteralValueType>>([["id", variant('Integer', 14n)], ["name", variant('String', "Leo")], ["age", variant('Integer', 45n)], ["score", variant('Float', 94.1)], ["active", variant('Null', null)], ["city", variant('String', "Atlanta")]]),
            new Map<string, ValueTypeOf<typeof LiteralValueType>>([["id", variant('Integer', 15n)], ["name", variant('Null', null)], ["age", variant('Integer', 32n)], ["score", variant('Float', 87.9)], ["active", variant('Boolean', true)], ["city", variant('Null', null)]]),
            new Map<string, ValueTypeOf<typeof LiteralValueType>>([["id", variant('Integer', 16n)], ["name", variant('String', "Mia")], ["age", variant('Integer', 26n)], ["score", variant('Float', 91.7)], ["active", variant('Boolean', false)], ["city", variant('String', "Dallas")]]),
            new Map<string, ValueTypeOf<typeof LiteralValueType>>([["id", variant('Integer', 17n)], ["name", variant('String', "Noah")], ["age", variant('Integer', 34n)], ["score", variant('Null', null)], ["active", variant('Boolean', true)], ["city", variant('String', "Houston")]]),
            new Map<string, ValueTypeOf<typeof LiteralValueType>>([["id", variant('Integer', 18n)], ["name", variant('String', "Olivia")], ["age", variant('Null', null)], ["score", variant('Float', 88.3)], ["active", variant('Boolean', false)], ["city", variant('Null', null)]]),
            new Map<string, ValueTypeOf<typeof LiteralValueType>>([["id", variant('Integer', 19n)], ["name", variant('String', "Peter")], ["age", variant('Integer', 41n)], ["score", variant('Float', 92.6)], ["active", variant('Boolean', true)], ["city", variant('String', "SF")]]),
            new Map<string, ValueTypeOf<typeof LiteralValueType>>([["id", variant('Integer', 20n)], ["name", variant('String', "Quinn")], ["age", variant('Integer', 29n)], ["score", variant('Null', null)], ["active", variant('Boolean', false)], ["city", variant('String', "Vegas")]]),
        ], CsvDataType));

        $(Test.equal(result, expected));

        // Round-trip: serialize and parse again
        const serializeConfig = $.let(East.value({
            delimiter: ",",
            quoteChar: '"',
            escapeChar: '"',
            newline: "\n",
            includeHeader: true,
            nullString: "",
            alwaysQuote: false,
        }));

        const serialized = $.let(csv_serialize(expected, serializeConfig));
        const reparsed = $.let(csv_parse(serialized, config));

        $(Test.equal(reparsed, expected));
    });
}, { platformFns: CsvImpl });
