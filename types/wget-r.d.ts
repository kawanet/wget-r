/**
 * wget-r
 */

export declare namespace wgetr {
    interface Options {
        include?: RegExp | {
            test: (path: string) => boolean;
        };
        logger?: {
            log: (log: string) => void;
        };
        fetcher?: {
            get: (url: string) => Promise<{
                data: (string | Buffer);
            }>;
        };
        mkdir?: {
            mkdir: (path: string, options: {
                recursive: true;
            }) => Promise<any>;
        };
        writer?: {
            writeFile: (path: string, content: (string | Buffer)) => Promise<void>;
        };
    }

    interface WgetR {
        /**
         * Add page items from remote sitemap.xml
         */
        addSitemap(url: string): Promise<void>;

        /**
         * Add a single page item by URL
         */
        addPage(url: string): void;

        /**
         * Run loop for each page
         */
        forEach(fn: (item: Item, idx?: number, array?: Item[]) => void): Promise<void>;

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
    }

    interface SitemapItem {
        loc: string;
        priority?: string;
        lastmod?: string;
    }

    interface ItemRaw {
        /**
         * Get sitemap item
         */
        getSitemapItem(): Promise<SitemapItem>;

        /**
         * Fetch HTML source from server
         */
        getContent(): Promise<string | Buffer>;

        /**
         * Fetch HTML page from server and write to local
         */
        writePageTo(prefix: string): Promise<void>;

        getPath(): Promise<string>;

        /**
         * list of URLs linked by the page.
         */
        getLinks(sameHost?: boolean): Promise<string[]>;
    }

    /**
     * cached content
     */
    interface Item extends ItemRaw {
        getContent(): Promise<string | Buffer>;
    }
}

declare function wgetR(config?: wgetr.Options): wgetr.WgetR;
