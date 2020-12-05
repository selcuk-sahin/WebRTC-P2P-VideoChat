const socket = io("http://localhost:3000");
const videoGrid = document.getElementById("video-grid");
const myPeer = new Peer(undefined, {
  host: "/",
  port: "3001",
});

const PeerMediaConnections = {};
const PeerDataConnections = {};

//Compability with other browsers
navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia;

//If room is created create chat boxes
socket.on("room-created", (room) => {
  const roomElement = document.createElement("div");
  roomElement.innerText = room;
  const roomLink = document.createElement("a");
  roomLink.href = `/${room}`;
  roomLink.innerText = "join";
  roomContainer.append(roomElement);
  roomContainer.append(roomLink);
});

//A new user connected to channel
socket.on("user-connected", (socketId, userName, peerId) => {
  appendMessage(`${userName} connected`);
  connectToNewUser(peerId, myStream);
});

//If we receive incoming connection from a peer
myPeer.on("connection", (dataConnection) => {
  appendMessage("incoming conn established");
});

//If a user disconnects, closes connection to other peers
socket.on("user-disconnected", (userId, userName, peerId) => {
  appendMessage(`${userName} disconnected`);
  if (PeerMediaConnections[peerId]) PeerMediaConnections[peerId].close();
  if (PeerDataConnections[peerId]) PeerDataConnections[peerId].close();
});

//connect and call the user, store the call reference in peers array
function connectToNewUser(peerId, stream) {
  if (stream) {
    var streamexists = 1;
  } else {
    streamexists = 0;
  }
  const dataConn = myPeer.connect(peerId);
  PeerDataConnections[peerId] = dataConn;
  appendMessage("Connection to " + peerId + " stream:" + streamexists);
  const call = myPeer.call(peerId, stream);
  call.on("stream", (peerStream) => {
    const video = document.createElement("video");
    addVideoStream(video, peerStream);
  });
  PeerMediaConnections[peerId] = call;
}

//Audio/ Video Functions

// If we receive incoming call
myPeer.on("call", (mediaConnection) => {
  mediaConnection.answer(myStream);
  const video = document.createElement("video");
  mediaConnection.on("stream", (remoteStream) => {
    addVideoStream(video, remoteStream);
  });
  mediaConnection.on("close", () => {
    video.remove();
    appendMessage("call on close");
  });
  mediaConnection.on("error", (err) => {
    appendMessage("call on error" + err);
  });
});

const myVideo = document.createElement("video");
var myStream; // Reference to stream
myVideo.muted = true;

//Get User Video and keep reference as stream
navigator.mediaDevices
  .getUserMedia({
    video: true,
    audio: true,
  })
  .then((stream) => {
    addVideoStream(myVideo, stream);
    myStream = stream;
  });

//add
function addVideoStream(video, stream) {
  video.srcObject = stream;
  video.addEventListener("loadedmetadata", () => {
    video.play();
  });
  videoGrid.append(video);
}

//Text functions

const messageContainer = document.getElementById("message-container");
const roomContainer = document.getElementById("room-container");
const messageForm = document.getElementById("send-container");
const messageInput = document.getElementById("message-input");

if (messageForm != null) {
  const name = prompt("What is your name?");
  appendMessage("You joined");

  myPeer.on("open", (peerId) => {
    appendMessage("Peer Id:" + peerId);
    socket.emit("new-user", roomName, name, peerId);
  });

  messageForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const message = messageInput.value;
    appendMessage(`You: ${message}`);
    socket.emit("send-chat-message", roomName, message);
    messageInput.value = "";
  });
}

socket.on("chat-message", (data) => {
  appendMessage(`${data.name}: ${data.message}`);
});

function appendMessage(message) {
  const messageElement = document.createElement("div");
  messageElement.innerText = message;
  messageContainer.append(messageElement);
}
