"use strict";

import { readFileSync } from "node:fs";
import bencode from "bencode";
import { createHash } from "node:crypto";
import bignum from "bignum";

/**
 * Opens a file at the specified filepath and decodes its contents using the bencode format.
 *
 * @param {string} filepath - The path of the file to be opened.
 * @return {Object} - The decoded bencode object.
 */
const open = (filepath) => {
  return bencode.decode(readFileSync(filepath));
};

const size = (torrent) => {
  const size = torrent.info.files
    ? torrent.info.files.map((file) => file.length).reduce((a, b) => a + b)
    : torrent.info.length;

  return bignum.toBuffer(size, { size: 8 });
};

const infoHash = (torrent) => {
  const info = bencode.encode(torrent.info);
  return createHash("sha1").update(info).digest();
};

export default { open, size, infoHash };
