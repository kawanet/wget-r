/**
 * https://github.com/kawanet/wget-r/
 */

export function pathFilter(path: string) {
    path = decodeURIComponent(path);
    return path
        .replace(/^([\w\-]+\:)?\/\/[^\/]+\//, "")
        .replace(/[\?\#].*$/, "")
        .replace(/\/[^\/]+?(\.html?)?$/i, (match, ext) => (ext ? match : match + "/"))
        .replace(/\/$/, "/index.html");
}
