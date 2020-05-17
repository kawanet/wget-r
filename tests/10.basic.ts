#!/usr/bin/env mocha -R spec

import {strict as assert} from "assert";
import {promises as fs} from "fs";
import {WebsiteDump} from "../lib/wget-r";

const TITLE = __filename.split("/").pop();

describe(TITLE, function () {
    it("basic tests", async () => {

        const readFile = async (url: string) => {
            const file = url.split("/").pop();
            const content = await fs.readFile(__dirname + "/sample/" + file, "utf-8");
            return {data: content};
        };

        const webdumpConfig = {
            fetcher: {get: readFile},
            logger: console,
        };

        const webdump = new WebsiteDump(webdumpConfig);
        await webdump.addSitemap("http://127.0.0.1:3000/sample/sitemapindex.xml");

        const xml = await webdump.getSitemapXML();
        assert.ok(xml, "sitemap.xml should not be empty");
        assert.ok(xml.indexOf("<loc>"), "sitemap.xml should have <loc>");

        let count = 0;
        await webdump.forEach(async (item) => {
            const content = await item.getContent();
            assert.ok(content, "content should not be empty");
            assert.ok((content.indexOf("</html>") > -1), "content have </html>");
            count++;
        });

        assert.equal(count, 2, "should find 2 items");
    });
});
