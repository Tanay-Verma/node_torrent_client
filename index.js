"use strict";

import torrentParser from "./torrent-parser.js";
import { getPeers } from "./tracker.js";

const torrent = torrentParser.open("GoLang_Book.torrent");
// console.log(torrent)
getPeers(torrent, (peers) => {
  console.log("list of peers:", peers);
});
