#!/usr/bin/env mocha -R spec
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const assert_1 = require("assert");
const fs_1 = require("fs");
const __1 = require("../");
const TITLE = __filename.split("/").pop();
describe(TITLE, function () {
    it("basic tests", async () => {
        const readFile = async (url) => {
            const file = url.split("/").pop();
            const content = await fs_1.promises.readFile(__dirname + "/sample/" + file, "utf-8");
            return { data: content };
        };
        const webdumpConfig = {
            fetcher: { get: readFile },
            logger: console,
        };
        const webdump = new __1.WebsiteDump(webdumpConfig);
        await webdump.addSitemap("http://127.0.0.1:3000/sample/sitemapindex.xml");
        const xml = await webdump.getSitemapXML();
        assert_1.strict.ok(xml, "sitemap.xml should not be empty");
        assert_1.strict.ok(xml.indexOf("<loc>"), "sitemap.xml should have <loc>");
        webdump.forEach(async (item) => {
            const content = await item.getContent();
            assert_1.strict.ok(content, "content should not be empty");
            assert_1.strict.ok((content.indexOf("</html>") > -1), "content have </html>");
        });
    });
});
