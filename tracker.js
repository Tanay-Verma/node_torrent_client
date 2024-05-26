import {Socket, createSocket} from "node:dgram";

export const getPeers = (torrent, callback) => {
  const socket = createSocket("udp4");

  const textDecoder = new TextDecoder("utf-8");
  const url = textDecoder.decode(torrent.announce);

  udpSend(socket, buildConnReq(), url);

  socket.on("message", (response) => {
    if (resType(response) === "connect") {
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

function buildConnReq() {}

function parseConnResp() {}

function buildAnnounceReq() {}

function parseAnnounceResp() {}
