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
}
export declare class WebsiteDump {
    protected config: WebsiteDumpConfig;
    protected items: WebsiteDumpItem[];
    protected stored: {
        [url: string]: boolean;
    };
    protected fetched: {
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
export declare class SitemapItem {
    loc: string;
    priority?: string;
    lastmod?: string;
}
export declare class WebsiteDumpItemBase {
    protected item: SitemapItem;
    protected config: WebsiteDumpConfig;
    constructor(item: SitemapItem, config: WebsiteDumpConfig);
    /**
     * Get sitemap item
     */
    getSitemapItem(): Promise<SitemapItem>;
    /**
     * Fetch HTML source from server
     */
    getContent(): Promise<string>;
    /**
     * Fetch HTML page from server and write to local
     */
    writePageTo(prefix: string): Promise<void>;
    getPath(): Promise<string>;
}
/**
 * cached content
 */
export declare class WebsiteDumpItem extends WebsiteDumpItemBase {
    private _content;
    getContent(): Promise<string>;
}
