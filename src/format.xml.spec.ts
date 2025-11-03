/**
 * Copyright (c) 2025 Elara AI Pty Ltd
 * Licensed under AGPL-3.0. See LICENSE file for details.
 */
import { East, variant } from "@elaraai/east";
import { describeEast, assertEast } from "./test.js";
import { xml_parse, xml_serialize, XmlNode, FormatImpl } from "./format.js";

await describeEast("XML Platform Functions", (test) => {
    test("parses simple XML element", $ => {
        const xmlData = $.let(East.value("<book>East Guide</book>"));
        const blob = $.let(xmlData.encodeUtf8());
        const config = $.let(East.value({
            preserveWhitespace: false,
            decodeEntities: true,
        }));

        const result = $.let(xml_parse(blob, config));

        // Access tag through struct fields
        const tag = $.let(result.tag);
        $(assertEast.equal(tag, "book"));

        // Access children array
        const children = $.let(result.children);
        const length = $.let(children.size());
        $(assertEast.equal(length, 1n));

        // First child is a TEXT variant
        const child0 = $.let(children.get(0n));
        const textValue = $.let(child0.unwrap("TEXT"));
        $(assertEast.equal(textValue, "East Guide"));
    });

    test("parses XML with attributes", $ => {
        const xmlData = $.let(East.value('<book id="123" lang="en">Content</book>'));
        const blob = $.let(xmlData.encodeUtf8());
        const config = $.let(East.value({
            preserveWhitespace: false,
            decodeEntities: true,
        }));

        const result = $.let(xml_parse(blob, config));
        const attrs = $.let(result.attributes);

        const id = $.let(attrs.get("id"));
        $(assertEast.equal(id, "123"));

        const lang = $.let(attrs.get("lang"));
        $(assertEast.equal(lang, "en"));
    });

    test("parses nested XML elements", $ => {
        const xmlData = $.let(East.value("<book><title>East</title><author>John</author></book>"));
        const blob = $.let(xmlData.encodeUtf8());
        const config = $.let(East.value({
            preserveWhitespace: false,
            decodeEntities: true,
        }));

        const result = $.let(xml_parse(blob, config));
        const children = $.let(result.children);
        const length = $.let(children.size());
        $(assertEast.equal(length, 2n));

        // First child is an ELEMENT variant
        const child0 = $.let(children.get(0n));
        const titleElement = $.let(child0.unwrap("ELEMENT"));
        const titleTag = $.let(titleElement.tag);
        $(assertEast.equal(titleTag, "title"));

        const titleChildren = $.let(titleElement.children);
        const titleText = $.let(titleChildren.get(0n));
        const titleValue = $.let(titleText.unwrap("TEXT"));
        $(assertEast.equal(titleValue, "East"));
    });

    test("parses XML with entities", $ => {
        const xmlData = $.let(East.value("<text>&lt;html&gt; &amp; &quot;quote&quot;</text>"));
        const blob = $.let(xmlData.encodeUtf8());
        const config = $.let(East.value({
            preserveWhitespace: false,
            decodeEntities: true,
        }));

        const result = $.let(xml_parse(blob, config));
        const children = $.let(result.children);
        const child0 = $.let(children.get(0n));
        const text = $.let(child0.unwrap("TEXT"));
        $(assertEast.equal(text, '<html> & "quote"'));
    });

    test("parses self-closing tag", $ => {
        const xmlData = $.let(East.value("<br/>"));
        const blob = $.let(xmlData.encodeUtf8());
        const config = $.let(East.value({
            preserveWhitespace: false,
            decodeEntities: true,
        }));

        const result = $.let(xml_parse(blob, config));
        const tag = $.let(result.tag);
        $(assertEast.equal(tag, "br"));

        const children = $.let(result.children);
        const length = $.let(children.size());
        $(assertEast.equal(length, 0n));
    });

    test("serializes simple XML", $ => {
        const node = $.let(East.value({
            tag: "book",
            attributes: new Map(),
            children: [variant("TEXT", "East Guide")],
        }, XmlNode));

        const config = $.let(East.value({
            indent: variant('none', null),
            includeXmlDeclaration: false,
            encodeEntities: true,
            selfClosingTags: true,
        }));

        const result = $.let(xml_serialize(node, config));
        const text = $.let(result.decodeUtf8());
        $(assertEast.equal(text, "<book>East Guide</book>"));
    });

    test("serializes XML with attributes", $ => {
        const node = $.let(East.value({
            tag: "book",
            attributes: new Map([["id", "123"]]),
            children: [variant("TEXT", "Content")],
        }, XmlNode));

        const config = $.let(East.value({
            indent: variant('none', null),
            includeXmlDeclaration: false,
            encodeEntities: true,
            selfClosingTags: true,
        }));

        const result = $.let(xml_serialize(node, config));
        const text = $.let(result.decodeUtf8());
        $(assertEast.equal(text, '<book id="123">Content</book>'));
    });

    test("serializes nested XML", $ => {
        const node = $.let(East.value({
            tag: "book",
            attributes: new Map(),
            children: [
                variant("ELEMENT", {
                    tag: "title",
                    attributes: new Map(),
                    children: [variant("TEXT", "East")],
                }),
            ],
        }, XmlNode));

        const config = $.let(East.value({
            indent: variant('none', null),
            includeXmlDeclaration: false,
            encodeEntities: true,
            selfClosingTags: true,
        }));

        const result = $.let(xml_serialize(node, config));
        const text = $.let(result.decodeUtf8());
        $(assertEast.equal(text, "<book><title>East</title></book>"));
    });

    test("serializes with entities", $ => {
        const node = $.let(East.value({
            tag: "text",
            attributes: new Map(),
            children: [variant("TEXT", '<html> & "quote"')],
        }, XmlNode));

        const config = $.let(East.value({
            indent: variant('none', null),
            includeXmlDeclaration: false,
            encodeEntities: true,
            selfClosingTags: true,
        }));

        const result = $.let(xml_serialize(node, config));
        const text = $.let(result.decodeUtf8());
        $(assertEast.equal(text, "<text>&lt;html&gt; &amp; &quot;quote&quot;</text>"));
    });

    test("serializes self-closing tag", $ => {
        const node = $.let(East.value({
            tag: "br",
            attributes: new Map(),
            children: [],
        }, XmlNode));

        const config = $.let(East.value({
            indent: variant('none', null),
            includeXmlDeclaration: false,
            encodeEntities: true,
            selfClosingTags: true,
        }));

        const result = $.let(xml_serialize(node, config));
        const text = $.let(result.decodeUtf8());
        $(assertEast.equal(text, "<br/>"));
    });

    test("round-trip: parse and serialize", $ => {
        const originalXml = $.let(East.value('<book id="123"><title>East Guide</title></book>'));
        const blob = $.let(originalXml.encodeUtf8());

        const parseConfig = $.let(East.value({
            preserveWhitespace: false,
            decodeEntities: true,
        }));

        const parsed = $.let(xml_parse(blob, parseConfig));

        const serializeConfig = $.let(East.value({
            indent: variant('none', null),
            includeXmlDeclaration: false,
            encodeEntities: true,
            selfClosingTags: true,
        }));

        const serialized = $.let(xml_serialize(parsed, serializeConfig));
        const text = $.let(serialized.decodeUtf8());
        $(assertEast.equal(text, originalXml));
    });

    // Edge Case Tests

    test("handles XML declaration", $ => {
        const xmlData = $.let(East.value('<?xml version="1.0" encoding="UTF-8"?><root>content</root>'));
        const blob = $.let(xmlData.encodeUtf8());
        const config = $.let(East.value({
            preserveWhitespace: false,
            decodeEntities: true,
        }));

        const result = $.let(xml_parse(blob, config));
        const tag = $.let(result.tag);
        $(assertEast.equal(tag, "root"));
    });

    test("handles namespaces as regular attributes", $ => {
        const xmlData = $.let(East.value('<root xmlns:foo="http://example.com"><foo:element>test</foo:element></root>'));
        const blob = $.let(xmlData.encodeUtf8());
        const config = $.let(East.value({
            preserveWhitespace: false,
            decodeEntities: true,
        }));

        const result = $.let(xml_parse(blob, config));
        const attrs = $.let(result.attributes);
        const xmlns = $.let(attrs.get("xmlns:foo"));
        $(assertEast.equal(xmlns, "http://example.com"));

        const children = $.let(result.children);
        const child0 = $.let(children.get(0n));
        const element = $.let(child0.unwrap("ELEMENT"));
        const childTag = $.let(element.tag);
        $(assertEast.equal(childTag, "foo:element"));
    });

    test("handles numeric entities (decimal)", $ => {
        const xmlData = $.let(East.value("<text>&#65;&#66;&#67;</text>"));
        const blob = $.let(xmlData.encodeUtf8());
        const config = $.let(East.value({
            preserveWhitespace: false,
            decodeEntities: true,
        }));

        const result = $.let(xml_parse(blob, config));
        const children = $.let(result.children);
        const child0 = $.let(children.get(0n));
        const text = $.let(child0.unwrap("TEXT"));
        $(assertEast.equal(text, "ABC"));
    });

    test("handles numeric entities (hexadecimal)", $ => {
        const xmlData = $.let(East.value("<text>&#x41;&#x42;&#x43;</text>"));
        const blob = $.let(xmlData.encodeUtf8());
        const config = $.let(East.value({
            preserveWhitespace: false,
            decodeEntities: true,
        }));

        const result = $.let(xml_parse(blob, config));
        const children = $.let(result.children);
        const child0 = $.let(children.get(0n));
        const text = $.let(child0.unwrap("TEXT"));
        $(assertEast.equal(text, "ABC"));
    });

    test("skips comments", $ => {
        const xmlData = $.let(East.value("<root><!-- comment --><child>text</child></root>"));
        const blob = $.let(xmlData.encodeUtf8());
        const config = $.let(East.value({
            preserveWhitespace: false,
            decodeEntities: true,
        }));

        const result = $.let(xml_parse(blob, config));
        const children = $.let(result.children);
        const length = $.let(children.size());
        $(assertEast.equal(length, 1n)); // Only child element, comment ignored
    });

    test("skips processing instructions", $ => {
        const xmlData = $.let(East.value('<?xml-stylesheet type="text/xsl" href="style.xsl"?><root>content</root>'));
        const blob = $.let(xmlData.encodeUtf8());
        const config = $.let(East.value({
            preserveWhitespace: false,
            decodeEntities: true,
        }));

        const result = $.let(xml_parse(blob, config));
        const tag = $.let(result.tag);
        $(assertEast.equal(tag, "root"));
    });

    test("preserves whitespace when configured", $ => {
        const xmlData = $.let(East.value("<text>  space  </text>"));
        const blob = $.let(xmlData.encodeUtf8());
        const config = $.let(East.value({
            preserveWhitespace: true,
            decodeEntities: true,
        }));

        const result = $.let(xml_parse(blob, config));
        const children = $.let(result.children);
        const child0 = $.let(children.get(0n));
        const text = $.let(child0.unwrap("TEXT"));
        $(assertEast.equal(text, "  space  "));
    });

    test("trims whitespace by default", $ => {
        const xmlData = $.let(East.value("<text>  space  </text>"));
        const blob = $.let(xmlData.encodeUtf8());
        const config = $.let(East.value({
            preserveWhitespace: false,
            decodeEntities: true,
        }));

        const result = $.let(xml_parse(blob, config));
        const children = $.let(result.children);
        const child0 = $.let(children.get(0n));
        const text = $.let(child0.unwrap("TEXT"));
        $(assertEast.equal(text, "space"));
    });

    test("handles multiple attributes", $ => {
        const xmlData = $.let(East.value('<element a="1" b="2" c="3">content</element>'));
        const blob = $.let(xmlData.encodeUtf8());
        const config = $.let(East.value({
            preserveWhitespace: false,
            decodeEntities: true,
        }));

        const result = $.let(xml_parse(blob, config));
        const attrs = $.let(result.attributes);
        const a = $.let(attrs.get("a"));
        const b = $.let(attrs.get("b"));
        const c = $.let(attrs.get("c"));
        $(assertEast.equal(a, "1"));
        $(assertEast.equal(b, "2"));
        $(assertEast.equal(c, "3"));
    });

    test("serializes empty elements with closing tags when selfClosingTags=false", $ => {
        const node = $.let(East.value({
            tag: "br",
            attributes: new Map(),
            children: [],
        }, XmlNode));

        const config = $.let(East.value({
            indent: variant('none', null),
            includeXmlDeclaration: false,
            encodeEntities: true,
            selfClosingTags: false,
        }));

        const result = $.let(xml_serialize(node, config));
        const text = $.let(result.decodeUtf8());
        $(assertEast.equal(text, "<br></br>"));
    });

    test("handles UTF-8 BOM", $ => {
        const bom = new Uint8Array([0xEF, 0xBB, 0xBF]);
        const xmlBytes = new TextEncoder().encode("<root>test</root>");
        const combined = new Uint8Array(bom.length + xmlBytes.length);
        combined.set(bom, 0);
        combined.set(xmlBytes, bom.length);

        const blob = $.let(East.value(combined));
        const config = $.let(East.value({
            preserveWhitespace: false,
            decodeEntities: true,
        }));

        const result = $.let(xml_parse(blob, config));
        const tag = $.let(result.tag);
        $(assertEast.equal(tag, "root"));
    });

    test("handles entities in attribute values", $ => {
        const xmlData = $.let(East.value('<element attr="&lt;value&gt;">content</element>'));
        const blob = $.let(xmlData.encodeUtf8());
        const config = $.let(East.value({
            preserveWhitespace: false,
            decodeEntities: true,
        }));

        const result = $.let(xml_parse(blob, config));
        const attrs = $.let(result.attributes);
        const attr = $.let(attrs.get("attr"));
        $(assertEast.equal(attr, "<value>"));
    });

    test("handles mixed content (text and elements interleaved)", $ => {
        const xmlData = $.let(East.value("<p>Some <b>bold</b> text.</p>"));
        const blob = $.let(xmlData.encodeUtf8());
        const config = $.let(East.value({
            preserveWhitespace: false,
            decodeEntities: true,
        }));

        const result = $.let(xml_parse(blob, config));
        const children = $.let(result.children);
        const length = $.let(children.size());
        $(assertEast.equal(length, 3n));

        const text1 = $.let(children.get(0n));
        const textValue1 = $.let(text1.unwrap("TEXT"));
        $(assertEast.equal(textValue1, "Some"));

        const elem = $.let(children.get(1n));
        const boldElement = $.let(elem.unwrap("ELEMENT"));
        const boldTag = $.let(boldElement.tag);
        $(assertEast.equal(boldTag, "b"));

        const text2 = $.let(children.get(2n));
        const textValue2 = $.let(text2.unwrap("TEXT"));
        $(assertEast.equal(textValue2, "text."));
    });

    test("handles deep nesting", $ => {
        const xmlData = $.let(East.value("<a><b><c><d><e>deep</e></d></c></b></a>"));
        const blob = $.let(xmlData.encodeUtf8());
        const config = $.let(East.value({
            preserveWhitespace: false,
            decodeEntities: true,
        }));

        const result = $.let(xml_parse(blob, config));

        // Navigate to deepest element
        const children1 = $.let(result.children);
        const b = $.let(children1.get(0n).unwrap("ELEMENT"));
        const children2 = $.let(b.children);
        const c = $.let(children2.get(0n).unwrap("ELEMENT"));
        const children3 = $.let(c.children);
        const d = $.let(children3.get(0n).unwrap("ELEMENT"));
        const children4 = $.let(d.children);
        const e = $.let(children4.get(0n).unwrap("ELEMENT"));
        const children5 = $.let(e.children);
        const text = $.let(children5.get(0n).unwrap("TEXT"));

        $(assertEast.equal(text, "deep"));
    });

    test("includes XML declaration when configured", $ => {
        const node = $.let(East.value({
            tag: "root",
            attributes: new Map(),
            children: [],
        }, XmlNode));

        const config = $.let(East.value({
            indent: variant('none', null),
            includeXmlDeclaration: true,
            encodeEntities: true,
            selfClosingTags: true,
        }));

        const result = $.let(xml_serialize(node, config));
        const text = $.let(result.decodeUtf8());
        const expectedStart = $.let(East.value('<?xml version="1.0" encoding="UTF-8"?>'));
        const hasDeclaration = $.let(text.startsWith(expectedStart));
        $(assertEast.equal(hasDeclaration, true));
    });

    test("handles indentation with spaces", $ => {
        const node = $.let(East.value({
            tag: "root",
            attributes: new Map(),
            children: [
                variant("ELEMENT", {
                    tag: "child",
                    attributes: new Map(),
                    children: [variant("TEXT", "content")],
                }),
            ],
        }, XmlNode));

        const config = $.let(East.value({
            indent: variant('some', "  "),
            includeXmlDeclaration: false,
            encodeEntities: true,
            selfClosingTags: true,
        }));

        const result = $.let(xml_serialize(node, config));
        const text = $.let(result.decodeUtf8());
        const expectedSubstring = $.let(East.value("\n  <child>"));
        const hasIndent = $.let(text.contains(expectedSubstring));
        $(assertEast.equal(hasIndent, true));
    });

    // Error Handling Tests

    test("throws error on mismatched tags", $ => {
        const xmlData = $.let(East.value("<root><child>text</other></root>"));
        const blob = $.let(xmlData.encodeUtf8());
        const config = $.let(East.value({
            preserveWhitespace: false,
            decodeEntities: true,
        }));

        $(assertEast.throws(xml_parse(blob, config), /Mismatched closing tag/));
    });

    test("throws error on empty document", $ => {
        const xmlData = $.let(East.value(""));
        const blob = $.let(xmlData.encodeUtf8());
        const config = $.let(East.value({
            preserveWhitespace: false,
            decodeEntities: true,
        }));

        $(assertEast.throws(xml_parse(blob, config), /Empty XML document/));
    });

    test("throws error on unclosed quote in attribute", $ => {
        const xmlData = $.let(East.value('<root attr="value>content</root>'));
        const blob = $.let(xmlData.encodeUtf8());
        const config = $.let(East.value({
            preserveWhitespace: false,
            decodeEntities: true,
        }));

        $(assertEast.throws(xml_parse(blob, config), /Unclosed attribute value/));
    });

    // Special Characters in Attributes

    test("handles newlines in attribute values", $ => {
        const xmlData = $.let(East.value('<element attr="line1&#10;line2">content</element>'));
        const blob = $.let(xmlData.encodeUtf8());
        const config = $.let(East.value({
            preserveWhitespace: false,
            decodeEntities: true,
        }));

        const result = $.let(xml_parse(blob, config));
        const attrs = $.let(result.attributes);
        const attr = $.let(attrs.get("attr"));
        $(assertEast.equal(attr, "line1\nline2"));
    });

    test("handles tabs in attribute values", $ => {
        const xmlData = $.let(East.value('<element attr="col1&#9;col2">content</element>'));
        const blob = $.let(xmlData.encodeUtf8());
        const config = $.let(East.value({
            preserveWhitespace: false,
            decodeEntities: true,
        }));

        const result = $.let(xml_parse(blob, config));
        const attrs = $.let(result.attributes);
        const attr = $.let(attrs.get("attr"));
        $(assertEast.equal(attr, "col1\tcol2"));
    });

    test("serializes special characters in attribute values", $ => {
        const node = $.let(East.value({
            tag: "element",
            attributes: new Map([["attr", "line1\nline2"]]),
            children: [],
        }, XmlNode));

        const config = $.let(East.value({
            indent: variant('none', null),
            includeXmlDeclaration: false,
            encodeEntities: true,
            selfClosingTags: true,
        }));

        const result = $.let(xml_serialize(node, config));
        const text = $.let(result.decodeUtf8());
        // Should preserve the newline character
        const expectedSubstring = $.let(East.value("line1\nline2"));
        const hasNewline = $.let(text.contains(expectedSubstring));
        $(assertEast.equal(hasNewline, true));
    });

    // CDATA Tests

    test("handles CDATA sections", $ => {
        const xmlData = $.let(East.value("<root><![CDATA[<html>content & stuff</html>]]></root>"));
        const blob = $.let(xmlData.encodeUtf8());
        const config = $.let(East.value({
            preserveWhitespace: false,
            decodeEntities: true,
        }));

        const result = $.let(xml_parse(blob, config));
        const children = $.let(result.children);
        const child0 = $.let(children.get(0n));
        const text = $.let(child0.unwrap("TEXT"));
        // CDATA content should be preserved as-is without entity decoding
        $(assertEast.equal(text, "<html>content & stuff</html>"));
    });
}, FormatImpl);
