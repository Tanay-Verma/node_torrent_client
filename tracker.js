import { Socket, createSocket } from "node:dgram";
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

  socket.on("message", (response) => {
    if (respType(response) === "connect") {
      // receive and parse connect response
      const connResp = parseConnResp(response);
      // send announce request
      const announceReq = buildAnnounceReq(connResp.connectionId);
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
function udpSend(socket, message, rawUrlString, callback = () => {}) {
  const url = new URL(rawUrlString);
  socket.send(message, 0, message.length, url.port, url.hostname, callback);
}

function respType(resp) {}

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

function buildAnnounceReq() {}

function parseAnnounceResp() {}
