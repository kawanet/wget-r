/**
 * wget-r
 */
export interface WgetRConfig {
    include?: RegExp | {
        test: (path: string) => boolean;
    };
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
export declare class WgetR {
    protected config: WgetRConfig;
    protected items: WgetRItem[];
    protected stored: {
        [url: string]: boolean;
    };
    constructor(config?: WgetRConfig);
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
    forEach(fn: (item: WgetRItem, idx?: number, array?: WgetRItem[]) => any): Promise<void>;
    getTotalItems(): number;
    writePagesTo(prefix: string): Promise<void>;
    /**
     * Generate sitemap.xml
     */
    getSitemapXML(): Promise<string>;
    /**
     * Write sitemap.xml file to local
     */
    writeSitemapTo(path: string): Promise<void>;
    /**
     * Crawl
     */
    crawlAll(): Promise<void>;
    protected log(message: string): void;
}
export declare class SitemapItem {
    loc: string;
    priority?: string;
    lastmod?: string;
}
export declare class WgetRItemBase {
    protected item: SitemapItem;
    protected config: WgetRConfig;
    constructor(item: SitemapItem, config: WgetRConfig);
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
    /**
     * list of URLs linked by the page.
     */
    getLinks(sameHost?: boolean): Promise<string[]>;
    protected log(message: string): void;
}
/**
 * cached content
 */
export declare class WgetRItem extends WgetRItemBase {
    private _content;
    getContent(): Promise<string>;
}
