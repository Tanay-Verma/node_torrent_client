"use strict";
import {readFileSync} from "node:fs";
import bencode from "bencode";

import { getPeers } from "./tracker.js";

const torrent = bencode.decode(readFileSync("puppy.torrent"));

getPeers(torrent, peers => {
    console.log('list of peers:', peers);
})