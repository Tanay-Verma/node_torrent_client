"use strict";

const { randomBytes } = await import("node:crypto");

let id = null;

/**
 * Generates a unique ID using the randomBytes function from the crypto module.
 *
 * @return {Buffer} The generated ID as a Buffer object.
 */
const genId = () => {
  if (!id) {
    id = randomBytes(20);
    Buffer.from("-NT0001-").copy(id, 0);
  }
  return id;
};

export default {genId};
