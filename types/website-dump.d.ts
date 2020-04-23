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
    constructor(config?: WebsiteDumpConfig);
    static defaults: WebsiteDumpConfig;
    addSitemap(url: string): Promise<void>;
    addPage(url: string): void;
    forEach(fn: (item: WebsiteDumpItem, idx: number) => any): Promise<void>;
    writePagesTo(prefix: string): Promise<void>;
    getSitemapXML(): Promise<string>;
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
    private source;
    constructor(item: WebsiteDumpSitemapItem, config: WebsiteDumpConfig);
    getSource(): Promise<string>;
    getItem(): Promise<WebsiteDumpSitemapItem>;
    private _getSource;
    writePageTo(prefix: string): Promise<void>;
}
