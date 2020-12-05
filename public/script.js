const socket = io("http://localhost:3000");
const videoGrid = document.getElementById("video-grid");
const myPeer = new Peer(undefined, {
  host: "/",
  port: "3001",
});

const myVideo = document.createElement("video");
var myStream;
myVideo.muted = true;
const peers = {};

navigator.mediaDevices
  .getUserMedia({
    video: true,
    audio: true,
  })
  .then((stream) => {
    addVideoStream(myVideo, stream);
    myStream = stream;
  });

//userId olabilir.
socket.on("user-disconnected", (userId, userName, peerId) => {
  if (peers[peerId]) peers[peerId].close();
});

myPeer.on("call", (mediaConnection) => {
  mediaConnection.answer(myStream);
  const video = document.createElement("video");
  mediaConnection.on("stream", (remoteStream) => {
    addVideoStream(video, remoteStream);
    appendMessage("stream");
  });
  mediaConnection.on("close", () => {
    video.remove();
    appendMessage("call on close");
  });
  mediaConnection.on("error", (err) => {
    appendMessage("call on error" + err);
  });
});

myPeer.on("connection", () => {
  appendMessage("connection established");
});

socket.on("user-connected", (socketId, userName, peerId) => {
  connectToNewUser(peerId, myStream);
});

myPeer.on("connection", (dataConnection) => {
  appendMessage("connection established " + dataConnection.type);
});

function connectToNewUser(peerId, stream) {
  if (stream) {
    var streamexists = 1;
  } else {
    streamexists = 0;
  }
  myPeer.connect(peerId);
  appendMessage("Connection to " + peerId + " stream:" + streamexists);
  const call = myPeer.call(peerId, stream);
  peers[peerId] = call;
}

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

socket.on("room-created", (room) => {
  const roomElement = document.createElement("div");
  roomElement.innerText = room;
  const roomLink = document.createElement("a");
  roomLink.href = `/${room}`;
  roomLink.innerText = "join";
  roomContainer.append(roomElement);
  roomContainer.append(roomLink);
});

socket.on("chat-message", (data) => {
  appendMessage(`${data.name}: ${data.message}`);
});

socket.on("user-connected", (userId, userName) => {
  appendMessage(`${userName} connected`);
});

socket.on("user-disconnected", (userId, userName) => {
  appendMessage(`${userName} disconnected`);
});

function appendMessage(message) {
  const messageElement = document.createElement("div");
  messageElement.innerText = message;
  messageContainer.append(messageElement);
}
