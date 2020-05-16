"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebsiteDumpItem = exports.WebsiteDumpSitemapItem = exports.WebsiteDump = void 0;
const axios_1 = require("axios");
const fs_1 = require("fs");
const fromXML = require("from-xml").fromXML;
const toXML = require("to-xml").toXML;
const defaults = {
    logger: { log: through },
    fetcher: axios_1.default,
    mkdir: fs_1.promises,
    writer: fs_1.promises,
    pathFilter: (path) => path
        .replace(/^([\w\-]+\:)?\/\/[^\/]+\//, "")
        .replace(/[\?\#].*$/, "")
        .replace(/\/[^\/]+?(\.html?)?$/i, (match, ext) => (ext ? match : match + "/"))
        .replace(/\/$/, "/index.html"),
};
class WebsiteDump {
    constructor(config) {
        this.items = [];
        this.config = config || {};
    }
    async addSitemap(url) {
        var _a, _b;
        const logger = this.config.logger || defaults.logger;
        logger.log("reading sitemap: " + url);
        const fetcher = this.config.fetcher || defaults.fetcher;
        const res = await fetcher.get(url);
        const { data } = res;
        const sitemap = fromXML(data);
        const sitemapList = getItemList((_a = sitemap.sitemapindex) === null || _a === void 0 ? void 0 : _a.sitemap);
        if (sitemapList === null || sitemapList === void 0 ? void 0 : sitemapList.length) {
            for (const item of sitemapList) {
                await this.addSitemap(item.loc);
            }
        }
        const urlList = getItemList((_b = sitemap.urlset) === null || _b === void 0 ? void 0 : _b.url);
        if (urlList === null || urlList === void 0 ? void 0 : urlList.length) {
            urlList.forEach(item => this.items.push(new WebsiteDumpItem(item, this.config)));
        }
    }
    addPage(url) {
        const item = new WebsiteDumpItem({ loc: url }, this.config);
        this.items.push(item);
    }
    async forEach(fn) {
        let idx = 0;
        for (const item of this.items) {
            await fn(item, idx++);
        }
    }
    async writePagesTo(prefix) {
        return this.forEach(item => item.writePageTo(prefix));
    }
    async getSitemapXML() {
        const data = { '?': 'xml version="1.0" encoding="utf-8"' };
        const urlset = data.urlset = { "@xmlns": "http://www.sitemaps.org/schemas/sitemap/0.9" };
        const list = urlset.url = [];
        const sitemapFilter = this.config.sitemapFilter || defaults.sitemapFilter;
        await this.forEach(async (item) => {
            let row = await item.getSitemapItem();
            if (sitemapFilter)
                row = await sitemapFilter(row);
            list.push(row);
        });
        return toXML(data, null, 1);
    }
    async writeSitemapTo(path) {
        const xml = await this.getSitemapXML();
        const logger = this.config.logger || defaults.logger;
        logger.log("writing sitemap: " + path);
        const mkdir = this.config.mkdir || defaults.mkdir;
        const dir = path.replace(/[^\/]+$/, "");
        await mkdir.mkdir(dir, { recursive: true });
        const writer = this.config.writer || defaults.writer;
        await writer.writeFile(path, xml);
    }
}
exports.WebsiteDump = WebsiteDump;
class WebsiteDumpSitemapItem {
}
exports.WebsiteDumpSitemapItem = WebsiteDumpSitemapItem;
class WebsiteDumpItem {
    constructor(item, config) {
        this.item = item;
        this.config = config;
    }
    async getSitemapItem() {
        return this.item;
    }
    async getContent() {
        return this.content || (this.content = this._getContent());
    }
    async _getContent() {
        const url = this.item.loc;
        const logger = this.config.logger || defaults.logger;
        logger.log("reading: " + url);
        const fetcher = this.config.fetcher || defaults.fetcher;
        const res = await fetcher.get(url);
        const { data } = res;
        return data;
    }
    async writePageTo(prefix) {
        const htmlFilter = this.config.htmlFilter || defaults.htmlFilter || through;
        const source = await this.getContent();
        const content = await htmlFilter(source, this.item.loc);
        const pathFilter = this.config.pathFilter || defaults.pathFilter || through;
        const path = prefix + await pathFilter(this.item.loc);
        const logger = this.config.logger || defaults.logger;
        logger.log("writing: " + path);
        const mkdir = this.config.mkdir || defaults.mkdir;
        const dir = path.replace(/[^\/]+$/, "");
        await mkdir.mkdir(dir, { recursive: true });
        const writer = this.config.writer || defaults.writer;
        await writer.writeFile(path, content);
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
