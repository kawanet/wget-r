/**
 * website-dump
 */
export interface WebsiteDumpConfig {
    logger?: {
        log: (log: string) => void;
    };
    fetcher?: {
        get: (url: string) => Promise<{
            data: string;
        }>;
    };
    mkdir?: {
        mkdir: (path: string, options: {
            recursive: true;
        }) => Promise<any>;
    };
    writer?: {
        writeFile: (path: string, content: string) => Promise<void>;
    };
    pathFilter?: (path: string) => string | Promise<string>;
    htmlFilter?: (html: string, url?: string) => string | Promise<string>;
    sitemapFilter?: (item: WebsiteDumpSitemapItem) => WebsiteDumpSitemapItem | Promise<WebsiteDumpSitemapItem>;
}
export declare class WebsiteDump {
    protected config: WebsiteDumpConfig;
    protected items: WebsiteDumpItem[];
    protected stored: {
        [url: string]: boolean;
    };
    constructor(config?: WebsiteDumpConfig);
    /**
     * Add page items from remote sitemap.xml
     */
    addSitemap(url: string): Promise<void>;
    /**
     * Add a single page item by URL
     */
    addPage(url: string): void;
    private addSitemapItem;
    /**
     * Run loop for each page
     */
    forEach(fn: (item: WebsiteDumpItem, idx: number) => any): Promise<void>;
    writePagesTo(prefix: string): Promise<void>;
    /**
     * Generate sitemap.xml
     */
    getSitemapXML(): Promise<string>;
    /**
     * Write sitemap.xml file to local
     */
    writeSitemapTo(path: string): Promise<void>;
}
export declare class WebsiteDumpSitemapItem {
    loc: string;
    priority?: string;
    lastmod?: string;
}
export declare class WebsiteDumpItem {
    protected item: WebsiteDumpSitemapItem;
    protected config: WebsiteDumpConfig;
    private content;
    constructor(item: WebsiteDumpSitemapItem, config: WebsiteDumpConfig);
    /**
     * Get sitemap item
     */
    getSitemapItem(): Promise<WebsiteDumpSitemapItem>;
    /**
     * Fetch HTML source from server
     */
    getContent(): Promise<string>;
    private _getContent;
    /**
     * Fetch HTML page from server and write to local
     */
    writePageTo(prefix: string): Promise<void>;
}
