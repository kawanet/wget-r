/**
 * website-dump
 */

import axios from "axios";
import {promises as fs} from "fs";

const fromXML = require("from-xml").fromXML;
const toXML = require("to-xml").toXML;

export interface WebsiteDumpConfig {
    logger?: { log: (log: string) => void };
    fetcher?: { get: (url: string) => Promise<{ data: string }> };
    mkdir?: { mkdir: (path: string, options: { recursive: true }) => Promise<any> };
    writer?: { writeFile: (path: string, content: string) => Promise<void> };
    pathFilter?: (path: string) => string | Promise<string>;
    htmlFilter?: (html: string, url?: string) => string | Promise<string>;
    sitemapFilter?: (item: WebsiteDumpSitemapItem) => WebsiteDumpSitemapItem | Promise<WebsiteDumpSitemapItem>;
}

const defaults: WebsiteDumpConfig = {
    // logger: console,
    logger: {log: through},

    fetcher: axios,

    mkdir: fs,

    writer: fs,

    pathFilter: (path: string) => path
        .replace(/^([\w\-]+\:)?\/\/[^\/]+\//, "")
        .replace(/[\?\#].*$/, "")
        .replace(/\/[^\/]+?(\.html?)?$/i, (match, ext) => (ext ? match : match + "/"))
        .replace(/\/$/, "/index.html"),
};

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

    private addSitemapItem(item: WebsiteDumpSitemapItem): void {
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
        const list = urlset.url = [] as WebsiteDumpSitemapItem[];

        const sitemapFilter = this.config.sitemapFilter || defaults.sitemapFilter;

        await this.forEach(async item => {
            let row = await item.getSitemapItem();
            if (sitemapFilter) row = await sitemapFilter(row);
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
}

export class WebsiteDumpSitemapItem {
    loc: string;
    priority?: string;
    lastmod?: string;
}

export class WebsiteDumpItemBase {
    constructor(protected item: WebsiteDumpSitemapItem, protected config: WebsiteDumpConfig) {
        //
    }

    /**
     * Get sitemap item
     */

    async getSitemapItem(): Promise<WebsiteDumpSitemapItem> {
        return this.item;
    }

    /**
     * Fetch HTML source from server
     */

    async getRawContent(): Promise<string> {
        const url = this.item.loc;

        const logger = this.config.logger || defaults.logger;
        logger.log("reading: " + url);

        const fetcher = this.config.fetcher || defaults.fetcher;
        const res = await fetcher.get(url);
        const {data} = res;
        return data;
    }

    /**
     * Get filtered HTML source
     */

    async getPageContent(): Promise<string> {
        const source = await this.getRawContent();
        const htmlFilter = this.config.htmlFilter || defaults.htmlFilter || through;
        return await htmlFilter(source, this.item.loc);
    }

    /**
     * Fetch HTML page from server and write to local
     */

    async writePageTo(prefix: string): Promise<void> {
        const content = await this.getPageContent();

        const pathFilter = this.config.pathFilter || defaults.pathFilter || through;
        const path = prefix + await pathFilter(this.item.loc);

        const logger = this.config.logger || defaults.logger;
        logger.log("writing: " + path);

        const mkdir = this.config.mkdir || defaults.mkdir;
        const dir = path.replace(/[^\/]+$/, "");
        await mkdir.mkdir(dir, {recursive: true});

        const writer = this.config.writer || defaults.writer;
        await writer.writeFile(path, content);
    }
}

export class WebsiteDumpItem extends WebsiteDumpItemBase {
    private _raw: Promise<string>;
    private _page: Promise<string>;

    async getRawContent(): Promise<string> {
        return this._raw || (this._raw = super.getRawContent());
    }

    async getPageContent(): Promise<string> {
        return this._page || (this._page = super.getPageContent());
    }
}

/**
 * @private
 */

function getItemList(list: WebsiteDumpSitemapItem | WebsiteDumpSitemapItem[]): WebsiteDumpSitemapItem[] {
    const item = list as WebsiteDumpSitemapItem;
    if ("string" === typeof item?.loc) return [item];
    return list as WebsiteDumpSitemapItem[];
}

function through(input: any) {
    return input;
}