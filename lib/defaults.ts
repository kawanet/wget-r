/**
 * https://github.com/kawanet/wget-r/
 */

import axios from "axios";
import {promises as fs} from "fs";

import type {wgetr} from "..";

export const defaults: wgetr.Options = {
    // logger: console,
    logger: {log: NOP},

    fetcher: axios,

    mkdir: fs,

    writer: fs,
};

function NOP(_: any) {
    //
}