# wget-r

`wget -r` for Node.js

[![Node.js CI](https://github.com/kawanet/wget-r/workflows/Node.js%20CI/badge.svg?branch=master)](https://github.com/kawanet/wget-r/actions/)

## SYNOPSIS

```js
const WgetR = require("wget-r").WgetR;
const axios = require("axios");

async function CLI() {
    const options = {
        fetcher: axios.create(),
        include: /^\/blog\//,
        logger: console
    };

    const wgetR = new WgetR(options);

    await wgetR.addSitemap("https://example.com/blog/sitemap.xml");

    await wgetR.writePagesTo("htdocs/");

    await wgetR.writeSitemapTo("htdocs/blog/sitemap.xml");
}

Promise.resolve().then(CLI).catch(console.warn);
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
