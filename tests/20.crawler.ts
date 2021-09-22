#!/usr/bin/env mocha -R spec

import {strict as assert} from "assert";
import {promises as fs} from "fs";
import {wgetR} from "../lib/wget-r";

const TITLE = __filename.split("/").pop();

describe(TITLE, function () {
    const readFile = async (url: string) => {
        const file = url.split("/").pop() || "index.html";
        const content = await fs.readFile(__dirname + "/sample/" + file, "utf-8");
        return {data: content};
    };

    const webdumpConfig = {
        fetcher: {get: readFile},
        logger: console,
    };

    it("getLinks()", async () => {
        const wr = wgetR(webdumpConfig);

        wr.addPage("http://127.0.0.1:3000/sample/links.html");

        await wr.forEach(async (item) => {
            const links = await item.getLinks();
            assert.equal(links.length, 2, "should find 2 links");
        });
    });

    it("crawlAll()", async () => {
        const wr = wgetR(webdumpConfig);
        wr.addPage("http://127.0.0.1:3000/sample/links.html");
        await wr.crawlAll();

        let count = 0;
        await wr.forEach(_item => count++);
        assert.equal(count, 5, "sould find 5 links");
    });
});
