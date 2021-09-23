/**
 * https://github.com/kawanet/wget-r/
 */

import {URL} from "url";
import * as cheerio from "cheerio";

import type {wgetr} from "..";
import {defaults} from "./defaults";
import {pathFilter} from "./util";

type SitemapItem = wgetr.SitemapItem;

class ItermRaw implements wgetr.ItemRaw {
    constructor(protected item: SitemapItem, protected config: wgetr.Options) {
        //
    }

    /**
     * Get sitemap item
     */

    async getSitemapItem(): Promise<SitemapItem> {
        return sitemapFilter(this.item);
    }

    /**
     * Fetch HTML source from server
     */

    async getContent(): Promise<string | Buffer> {
        let url = this.item.loc;

        this.log("reading: " + url);

        const fetcher = this.config.fetcher || defaults.fetcher;
        try {
            const res = await fetcher.get(url);
            const {data} = res;
            return data;
        } catch (e) {
            this.log("fetcher: " + e + " " + url);
            return;
        }
    }

    /**
     * Fetch HTML page from server and write to local
     */

    async writePageTo(prefix: string): Promise<void> {
        const content = await this.getContent();
        const path = prefix + await this.getPath();

        this.log("writing: " + path);

        const mkdir = this.config.mkdir || defaults.mkdir;
        const dir = path.replace(/[^\/]+$/, "");
        await mkdir.mkdir(dir, {recursive: true});

        const writer = this.config.writer || defaults.writer;
        await writer.writeFile(path, content);
    }

    async getPath(): Promise<string> {
        return pathFilter(this.item.loc);
    }

    /**
     * list of URLs linked by the page.
     */

    async getLinks(sameHost?: boolean): Promise<string[]> {
        const base = new URL(this.item.loc);
        const content = await this.getContent();
        const links = [] as string[];
        if (!content) return;

        let $: cheerio.CheerioAPI;
        try {
            $ = cheerio.load(content);
        } catch (e) {
            this.log("cheerio: " + e);
            return;
        }

        const check = {} as { [href: string]: boolean };
        $("a").each((_idx, a) => {
            const href = $(a).attr("href");
            if (!href) return;
            const urlObj = new URL(href, base);
            if (sameHost && base.hostname !== urlObj.hostname) return;
            const url = urlObj.toString().replace(/#.*$/, "");
            const path = pathFilter(url);
            if (check[path]) return;
            links.push(url);
            check[path] = true;
        });

        return links;
    }

    protected log(message: string): void {
        const logger = this.config.logger || defaults.logger;
        logger.log(message);
    }
}

/**
 * cached content
 */

export class Item extends ItermRaw implements wgetr.Item {
    private _content: Promise<string | Buffer>;

    async getContent(): Promise<string | Buffer> {
        return this._content || (this._content = super.getContent());
    }
}

/**
 * @private
 */

function sitemapFilter(item: SitemapItem): SitemapItem {
    const {loc, lastmod, priority} = item;
    return {loc, lastmod, priority};
}
