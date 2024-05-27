"use strict";
import { Socket, createSocket } from "node:dgram";
import util from "./util.js";
import torrentParser from "./torrent-parser.js";
const { randomBytes } = await import("node:crypto");

/**
 * Retrieves peers for a given torrent by sending UDP messages to the tracker specified in the torrent file.
 *
 * @param {Object} torrent - The torrent object containing the announce URL.
 * @param {Function} callback - The callback function to be called with the list of peers.
 * @return {void}
 */
export const getPeers = (torrent, callback) => {
  const socket = createSocket("udp4");

  const textDecoder = new TextDecoder("utf-8");
  const url = textDecoder.decode(torrent.announce);
  udpSend(socket, buildConnReq(), url);

  socket.on("message", (response, rinfo) => {
    console.log("Connected")
    console.log(response);
    if (respType(response) === "connect") {
      // receive and parse connect response
      const connResp = parseConnResp(response);

      console.log("connResp:");
      console.log(connResp);
      // send announce request
      const announceReq = buildAnnounceReq(connResp.connectionId, torrent);
      console.log("announceReq:");
      console.log(announceReq);
      udpSend(socket, announceReq, url);
    } else if (respType(response) === "announce") {
      // parse announce response
      const announceResp = parseAnnounceResp(response);
      // pass peers to callback
      callback(announceResp.peers);
    }
  });
};

/**
 * Sends a UDP message to a specified URL.
 *
 * @param {Socket} socket - The UDP socket to use for sending the message.
 * @param {Buffer} message - The message to send.
 * @param {string} rawUrlString - The URL to send the message to.
 * @return {void} This function does not return anything.
 */
function udpSend(socket, message, rawUrlString) {
  const url = new URL(rawUrlString);
  socket.send(
    message,
    0,
    message.length,
    Number(url.port),
    url.hostname,
    (err, bytes) => {
      console.log("error:", err);
      console.log("bytes:", bytes);
    }
  );
}

function respType(resp) {
  const action = resp.readUInt32BE(0);
  if (action === 0) return "connect";
  if (action === 1) return "announce";
}

/**
 * Builds a connection request buffer.
 *
 * @return {Buffer} The connection request buffer.
 */
function buildConnReq() {
  const buf = Buffer.alloc(16);

  // connection id
  buf.writeUInt32BE(0x417, 0);
  buf.writeUInt32BE(0x27101980, 4);

  // action
  buf.writeUInt32BE(0, 8);

  // transaction id
  randomBytes(4).copy(buf, 12);

  return buf;
}

/**
 * Parses the response from a connection request and returns an object with the action, transaction ID, and connection ID.
 *
 * @param {Buffer} response - The response buffer to parse.
 * @returns {{action: number, transactionId: number, connectionId: Buffer}} An object with the following properties:
 *   - action: The action value as a number.
 *   - transactionId: The transaction ID value as a number.
 *   - connectionId: A buffer containing the connection ID.
 */
function parseConnResp(response) {
  return {
    action: response.readUInt32BE(0),
    transactionId: response.readUInt32BE(4),
    connectionId: response.subarray(8),
  };
}

/**
 * Builds an announce request buffer.
 *
 * @param {Buffer} connectionId - The connection ID.
 * @param {Object} torrent - The torrent object.
 * @param {number} [port=6881] - The port number.
 * @return {Buffer} The announce request buffer.
 */
function buildAnnounceReq(connectionId, torrent, port = 6881) {
  const buf = Buffer.alloc(98);

  // connection id
  connectionId.copy(buf, 0);

  // action
  buf.writeUint32BE(1, 8);

  // transaction id
  randomBytes(4).copy(buf, 12);

  // info hash
  torrentParser.infoHash(torrent).copy(buf, 16);

  // peerId
  util.genId().copy(buf, 36);

  // downloaded
  Buffer.alloc(8).copy(buf, 56);

  // left
  torrentParser.size(torrent).copy(buf, 64);

  // uploaded
  Buffer.alloc(8).copy(buf, 72);

  // event
  buf.writeUInt32BE(0, 80);

  // ip address
  buf.writeUInt32BE(0, 84);

  // key
  randomBytes(4).copy(buf, 88);

  // num want
  buf.writeInt32BE(-1, 92);

  // port
  buf.writeUInt16BE(port, 96);

  return buf;
}

/**
 * Parses the response from an announce request and returns an object with the necessary information.
 *
 * @param {Buffer} resp - The response buffer to parse.
 * @return {Object} An object with the following properties:
 *   - action: The action value as a number.
 *   - transactionId: The transaction ID value as a number.
 *   - leechers: A buffer containing the number of leechers.
 *   - seeders: A buffer containing the number of seeders.
 *   - peers:
 *   -
 */
function parseAnnounceResp(resp) {
  /**
   * Groups the elements of an iterable into sub-arrays of a specified size.
   *
   * @param {Buffer} iterable - The iterable to be grouped.
   * @param {number} groupSize - The size of each group.
   * @return {Array<Buffer>} An array of sub-arrays, each containing groupSize elements from the iterable.
   */
  function group(iterable, groupSize) {
    let groups = [];
    for (let i = 0; i < iterable.length; i += groupSize) {
      groups.push(iterable.subarray(i, i + groupSize));
    }
    return groups;
  }

  return {
    action: resp.readUInt32BE(0),
    transactionId: resp.readUInt32BE(4),
    leechers: resp.readUInt32BE(12),
    seeders: resp.readUInt32BE(16),
    peers: group(resp.subarray(20), 6).map((address) => {
      return {
        ip: address.subarray(0, 4).join("."),
        port: address.readUInt16BE(4),
      };
    }),
  };
}
