/**
 * website-dump
 */

import axios from "axios";
import * as cheerio from "cheerio";
import {promises as fs} from "fs";
import {URL} from "url";

const fromXML = require("from-xml").fromXML;
const toXML = require("to-xml").toXML;

export interface WebsiteDumpConfig {
    include?: RegExp | { test: (path: string) => boolean };
    logger?: { log: (log: string) => void };
    fetcher?: { get: (url: string) => Promise<{ data: string }> };
    mkdir?: { mkdir: (path: string, options: { recursive: true }) => Promise<any> };
    writer?: { writeFile: (path: string, content: string) => Promise<void> };
}

const defaults: WebsiteDumpConfig = {
    // logger: console,
    logger: {log: through},

    fetcher: axios,

    mkdir: fs,

    writer: fs,
};

function pathFilter(path: string) {
    return path
        .replace(/^([\w\-]+\:)?\/\/[^\/]+\//, "")
        .replace(/[\?\#].*$/, "")
        .replace(/\/[^\/]+?(\.html?)?$/i, (match, ext) => (ext ? match : match + "/"))
        .replace(/\/$/, "/index.html");
}

function sitemapFilter(item: SitemapItem): SitemapItem {
    const {loc, lastmod, priority} = item;
    return {loc, lastmod, priority};
}

export class WebsiteDump {
    protected config: WebsiteDumpConfig;
    protected items: WebsiteDumpItem[] = [];
    protected stored: { [url: string]: boolean } = {};
    protected fetched: { [url: string]: boolean } = {};

    constructor(config?: WebsiteDumpConfig) {
        this.config = config || {} as WebsiteDumpConfig;
    }

    /**
     * Add page items from remote sitemap.xml
     */

    async addSitemap(url: string): Promise<void> {
        this.log("reading sitemap: " + url);

        const fetcher = this.config.fetcher || defaults.fetcher;
        const res = await fetcher.get(url);
        const {data} = res;

        const sitemap = fromXML(data);

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
        const {loc} = item;

        // test pathname is allowed
        const url = new URL(loc);
        const {include} = this.config;
        if (include && !include.test(url.pathname)) return;

        // double check
        if (this.stored[loc]) return;
        this.stored[loc] = true;

        // add item
        this.items.push(new WebsiteDumpItem(item, this.config));
    }

    /**
     * Run loop for each page
     */

    async forEach(fn: (item: WebsiteDumpItem, idx?: number, array?: WebsiteDumpItem[]) => any): Promise<void> {
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
        return this.forEach(item => item.writePageTo(prefix));
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

            await this.forEach(async (item, idx, items) => {
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
            console.warn("crawl: #" + loop + " " + found + " found");
            loop++;
            if (!found) break;
        }
    }

    protected log(message: string): void {
        const logger = this.config.logger || defaults.logger;
        logger.log(message);
    }
}

export class SitemapItem {
    loc: string;
    priority?: string;
    lastmod?: string;
}

export class WebsiteDumpItemBase {
    constructor(protected item: SitemapItem, protected config: WebsiteDumpConfig) {
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

    async getContent(): Promise<string> {
        let url = this.item.loc;

        this.log("reading: " + url);

        const esc = url.replace(/%/g, "%25");
        const fetcher = this.config.fetcher || defaults.fetcher;
        try {
            const res = await fetcher.get(esc);
            const {data} = res;
            return data;
        } catch (e) {
            console.warn("fetcher: " + e + " " + esc);
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

        let $: CheerioStatic;
        try {
            $ = cheerio.load(content);
        } catch (e) {
            this.log("cheerio: " + e);
            return;
        }

        const check = {} as { [href: string]: boolean };
        $("a").each((idx, a) => {
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

export class WebsiteDumpItem extends WebsiteDumpItemBase {
    private _content: Promise<string>;

    async getContent(): Promise<string> {
        return this._content || (this._content = super.getContent());
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

function through(input: any) {
    return input;
}