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
        const logger = this.config.logger || defaults.logger;
        logger.log("reading sitemap: " + url);

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
        if (this.stored[loc]) return;
        this.stored[loc] = true;
        this.items.push(new WebsiteDumpItem(item, this.config));
    }

    /**
     * Run loop for each page
     */

    async forEach(fn: (item: WebsiteDumpItem, idx: number) => any): Promise<void> {
        let idx = 0;
        for (const item of this.items) {
            await fn(item, idx++);
        }
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

        const logger = this.config.logger || defaults.logger;
        logger.log("writing sitemap: " + path);

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
        let count = 1;

        while (count) {
            count = 0;

            await this.forEach(async item => {
                const path = await item.getPath();
                if (check[path]) return;
                check[path] = true;

                const links = await item.getLinks();
                if (!links) return;

                links.forEach(url => this.addPage(url));
                count += links.length;
            });
        }
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
        const url = this.item.loc;

        const logger = this.config.logger || defaults.logger;
        logger.log("reading: " + url);

        const fetcher = this.config.fetcher || defaults.fetcher;
        const res = await fetcher.get(url);
        const {data} = res;
        return data;
    }

    /**
     * Fetch HTML page from server and write to local
     */

    async writePageTo(prefix: string): Promise<void> {
        const content = await this.getContent();
        const path = prefix + await this.getPath();

        const logger = this.config.logger || defaults.logger;
        logger.log("writing: " + path);

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

    async getLinks(): Promise<string[]> {
        const content = await this.getContent();
        const $ = cheerio.load(content);
        const links = [] as string[];
        const check = {} as { [href: string]: boolean };
        $("a").each((idx, a) => {
            const href = $(a).attr("href");
            if (!href) return;
            const url = (new URL(href, this.item.loc)).toString();
            const path = pathFilter(url);
            if (check[path]) return;
            links.push(url);
            check[path] = true;
        });
        return links;
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