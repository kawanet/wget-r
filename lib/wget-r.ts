/**
 * https://github.com/kawanet/wget-r/
 */

import {URL} from "url";
import {fromXML} from "from-xml";
import {toXML} from "to-xml";

import type {wgetr} from "..";
import {Item} from "./item";
import {defaults} from "./defaults";
import {pathFilter} from "./util";

type SitemapItem = wgetr.SitemapItem;

export function wgetR(config?: wgetr.Options) {
    return new WgetR(config);
}

class WgetR implements wgetr.WgetR {
    protected config: wgetr.Options;
    protected items: Item[] = [];
    protected stored: { [url: string]: boolean } = {};

    constructor(config?: wgetr.Options) {
        this.config = config || {} as wgetr.Options;
    }

    /**
     * Add page items from remote sitemap.xml
     */

    async addSitemap(url: string): Promise<void> {
        this.log("reading sitemap: " + url);
        let data: string | Buffer;

        const fetcher = this.config.fetcher || defaults.fetcher;
        try {
            const res = await fetcher.get(url);
            data = res.data;
        } catch (e) {
            this.log("fetcher: " + e + " " + url);
            return;
        }

        const sitemap = fromXML("string" === typeof data ? data : String(data));

        const sitemapList = getItemList(sitemap.sitemapindex?.sitemap);
        if (sitemapList?.length) {
            for (const item of sitemapList) {
                await this.addSitemap(item.loc);
            }
        }

        const urlList = getItemList(sitemap.urlset?.url);
        if (urlList?.length) {
            urlList.forEach(item => this.addSitemapItem(item));
        }
    }

    /**
     * Add a single page item by URL
     */

    addPage(url: string): void {
        this.addSitemapItem({loc: url});
    }

    private addSitemapItem(item: SitemapItem): void {
        let {loc} = item;

        // test pathname is allowed
        const url = new URL(loc);
        const {include} = this.config;
        if (include && !include.test(url.pathname)) return;

        // skip when another file stored
        const path = pathFilter(loc);
        if (this.stored[path]) return;
        this.stored[path] = true;

        // add item
        this.items.push(new Item(item, this.config));
    }

    /**
     * Run loop for each page
     */

    async forEach(fn: (item: Item, idx?: number, array?: Item[]) => void): Promise<void> {
        let idx = 0;
        const {items} = this;
        for (const item of items) {
            await fn(item, idx++, items);
        }
    }

    getTotalItems(): number {
        return this.items.length;
    }

    async writePagesTo(prefix: string): Promise<void> {
        const check = {} as { [url: string]: boolean };

        await this.forEach(async item => {
            const path = await item.getPath();
            if (check[path]) return;
            check[path] = true;
            await item.writePageTo(prefix);
        });
    }

    /**
     * Generate sitemap.xml
     */

    async getSitemapXML(): Promise<string> {
        const data = {'?': 'xml version="1.0" encoding="utf-8"'} as any;
        const urlset = data.urlset = {"@xmlns": "http://www.sitemaps.org/schemas/sitemap/0.9"} as any;
        const list = urlset.url = [] as SitemapItem[];

        await this.forEach(async item => {
            const row = await item.getSitemapItem();
            list.push(row);
        });

        return toXML(data, null, 1);
    }

    /**
     * Write sitemap.xml file to local
     */

    async writeSitemapTo(path: string): Promise<void> {
        const xml = await this.getSitemapXML();

        this.log("writing sitemap: " + path);

        const mkdir = this.config.mkdir || defaults.mkdir;
        const dir = path.replace(/[^\/]+$/, "");
        await mkdir.mkdir(dir, {recursive: true});

        const writer = this.config.writer || defaults.writer;
        await writer.writeFile(path, xml);
    }

    /**
     * Crawl
     */

    async crawlAll(): Promise<void> {
        const check = {} as { [url: string]: boolean };
        let loop = 1;

        while (1) {
            const prev = this.getTotalItems();
            const buf = [] as string[];

            await this.forEach(async item => {
                const path = await item.getPath();
                if (check[path]) return;
                check[path] = true;

                const links = await item.getLinks(true);
                // this.log("links: " + links.length + " (" + (idx + 1) + "/" + items.length + ")");
                if (!links) return;

                buf.push.apply(buf, links);
            });

            buf.forEach(url => this.addPage(url));

            const total = this.getTotalItems();
            const found = total - prev;
            this.log("crawl: #" + loop + " " + found + " found");
            loop++;
            if (!found) break;
        }
    }

    protected log(message: string): void {
        const logger = this.config.logger || defaults.logger;
        logger.log(message);
    }
}

/**
 * @private
 */

function getItemList(list: SitemapItem | SitemapItem[]): SitemapItem[] {
    const item = list as SitemapItem;
    if ("string" === typeof item?.loc) return [item];
    return list as SitemapItem[];
}
