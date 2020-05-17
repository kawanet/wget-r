"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebsiteDumpItem = exports.WebsiteDumpItemBase = exports.SitemapItem = exports.WebsiteDump = void 0;
const axios_1 = require("axios");
const cheerio = require("cheerio");
const fs_1 = require("fs");
const url_1 = require("url");
const fromXML = require("from-xml").fromXML;
const toXML = require("to-xml").toXML;
const defaults = {
    logger: { log: through },
    fetcher: axios_1.default,
    mkdir: fs_1.promises,
    writer: fs_1.promises,
};
function pathFilter(path) {
    path = decodeURIComponent(path);
    return path
        .replace(/^([\w\-]+\:)?\/\/[^\/]+\//, "")
        .replace(/[\?\#].*$/, "")
        .replace(/\/[^\/]+?(\.html?)?$/i, (match, ext) => (ext ? match : match + "/"))
        .replace(/\/$/, "/index.html");
}
function sitemapFilter(item) {
    const { loc, lastmod, priority } = item;
    return { loc, lastmod, priority };
}
class WebsiteDump {
    constructor(config) {
        this.items = [];
        this.stored = {};
        this.config = config || {};
    }
    async addSitemap(url) {
        var _a, _b;
        this.log("reading sitemap: " + url);
        let data;
        const fetcher = this.config.fetcher || defaults.fetcher;
        try {
            const res = await fetcher.get(url);
            data = res.data;
        }
        catch (e) {
            this.log("fetcher: " + e + " " + url);
            return;
        }
        const sitemap = fromXML(data);
        const sitemapList = getItemList((_a = sitemap.sitemapindex) === null || _a === void 0 ? void 0 : _a.sitemap);
        if (sitemapList === null || sitemapList === void 0 ? void 0 : sitemapList.length) {
            for (const item of sitemapList) {
                await this.addSitemap(item.loc);
            }
        }
        const urlList = getItemList((_b = sitemap.urlset) === null || _b === void 0 ? void 0 : _b.url);
        if (urlList === null || urlList === void 0 ? void 0 : urlList.length) {
            urlList.forEach(item => this.addSitemapItem(item));
        }
    }
    addPage(url) {
        this.addSitemapItem({ loc: url });
    }
    addSitemapItem(item) {
        let { loc } = item;
        const url = new url_1.URL(loc);
        const { include } = this.config;
        if (include && !include.test(url.pathname))
            return;
        const path = pathFilter(loc);
        if (this.stored[path])
            return;
        this.stored[path] = true;
        this.items.push(new WebsiteDumpItem(item, this.config));
    }
    async forEach(fn) {
        let idx = 0;
        const { items } = this;
        for (const item of items) {
            await fn(item, idx++, items);
        }
    }
    getTotalItems() {
        return this.items.length;
    }
    async writePagesTo(prefix) {
        const check = {};
        await this.forEach(async (item) => {
            const path = await item.getPath();
            if (check[path])
                return;
            check[path] = true;
            await item.writePageTo(prefix);
        });
    }
    async getSitemapXML() {
        const data = { '?': 'xml version="1.0" encoding="utf-8"' };
        const urlset = data.urlset = { "@xmlns": "http://www.sitemaps.org/schemas/sitemap/0.9" };
        const list = urlset.url = [];
        await this.forEach(async (item) => {
            const row = await item.getSitemapItem();
            list.push(row);
        });
        return toXML(data, null, 1);
    }
    async writeSitemapTo(path) {
        const xml = await this.getSitemapXML();
        this.log("writing sitemap: " + path);
        const mkdir = this.config.mkdir || defaults.mkdir;
        const dir = path.replace(/[^\/]+$/, "");
        await mkdir.mkdir(dir, { recursive: true });
        const writer = this.config.writer || defaults.writer;
        await writer.writeFile(path, xml);
    }
    async crawlAll() {
        const check = {};
        let loop = 1;
        while (1) {
            const prev = this.getTotalItems();
            const buf = [];
            await this.forEach(async (item, idx, items) => {
                const path = await item.getPath();
                if (check[path])
                    return;
                check[path] = true;
                const links = await item.getLinks(true);
                if (!links)
                    return;
                buf.push.apply(buf, links);
            });
            buf.forEach(url => this.addPage(url));
            const total = this.getTotalItems();
            const found = total - prev;
            this.log("crawl: #" + loop + " " + found + " found");
            loop++;
            if (!found)
                break;
        }
    }
    log(message) {
        const logger = this.config.logger || defaults.logger;
        logger.log(message);
    }
}
exports.WebsiteDump = WebsiteDump;
class SitemapItem {
}
exports.SitemapItem = SitemapItem;
class WebsiteDumpItemBase {
    constructor(item, config) {
        this.item = item;
        this.config = config;
    }
    async getSitemapItem() {
        return sitemapFilter(this.item);
    }
    async getContent() {
        let url = this.item.loc;
        this.log("reading: " + url);
        const fetcher = this.config.fetcher || defaults.fetcher;
        try {
            const res = await fetcher.get(url);
            const { data } = res;
            return data;
        }
        catch (e) {
            this.log("fetcher: " + e + " " + url);
            return;
        }
    }
    async writePageTo(prefix) {
        const content = await this.getContent();
        const path = prefix + await this.getPath();
        this.log("writing: " + path);
        const mkdir = this.config.mkdir || defaults.mkdir;
        const dir = path.replace(/[^\/]+$/, "");
        await mkdir.mkdir(dir, { recursive: true });
        const writer = this.config.writer || defaults.writer;
        await writer.writeFile(path, content);
    }
    async getPath() {
        return pathFilter(this.item.loc);
    }
    async getLinks(sameHost) {
        const base = new url_1.URL(this.item.loc);
        const content = await this.getContent();
        const links = [];
        if (!content)
            return;
        let $;
        try {
            $ = cheerio.load(content);
        }
        catch (e) {
            this.log("cheerio: " + e);
            return;
        }
        const check = {};
        $("a").each((idx, a) => {
            const href = $(a).attr("href");
            if (!href)
                return;
            const urlObj = new url_1.URL(href, base);
            if (sameHost && base.hostname !== urlObj.hostname)
                return;
            const url = urlObj.toString().replace(/#.*$/, "");
            const path = pathFilter(url);
            if (check[path])
                return;
            links.push(url);
            check[path] = true;
        });
        return links;
    }
    log(message) {
        const logger = this.config.logger || defaults.logger;
        logger.log(message);
    }
}
exports.WebsiteDumpItemBase = WebsiteDumpItemBase;
class WebsiteDumpItem extends WebsiteDumpItemBase {
    async getContent() {
        return this._content || (this._content = super.getContent());
    }
}
exports.WebsiteDumpItem = WebsiteDumpItem;
function getItemList(list) {
    const item = list;
    if ("string" === typeof (item === null || item === void 0 ? void 0 : item.loc))
        return [item];
    return list;
}
function through(input) {
    return input;
}
