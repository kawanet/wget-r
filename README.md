# website-dump

[![Node.js CI](https://github.com/kawanet/website-dump/workflows/Node.js%20CI/badge.svg?branch=master)](https://github.com/kawanet/website-dump/actions/)

## SYNOPSIS

```js
const WebsiteDump = require("website-dump").WebsiteDump;
const axios = require("axios");

async function CLI() {
    const options = {
        logger: console,
        fetcher: axios.create(),
        htmlFilter: (html) => html.replace(/(<\/body)/, '<script src="example.js"></script>\n$1'),
    };

    const webdump = new WebsiteDump(options);

    await webdump.addSitemap("https://example.com/sitemap.xml");

    await webdump.writePagesTo("htdocs/");

    await webdump.writeSitemapTo("htdocs/sitemap.xml");
}

Promise.resolve().then(CLI).then(console.log, console.warn);
```

## LICENSE

The MIT License (MIT)

Copyright (c) 2020 Yusuke Kawasaki

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
