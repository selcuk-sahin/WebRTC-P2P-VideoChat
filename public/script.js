const socket = io();
const myVideoGrid = document.getElementById("my-video-grid");
const videoGrid = document.getElementById("video-grid");
const myPeer = new Peer(undefined, {});
var myPeerId = ""; // will set when peer connection is established

const messageContainer = document.getElementById("message-container");
const roomContainer = document.getElementById("room-container");
const messageForm = document.getElementById("send-container");
const messageInput = document.getElementById("message-input");
const fileInput = document.getElementById("file-input");
const PeerMediaConnections = {};
const PeerDataConnections = {};
const streams = [];

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

//connect and call the user, store the call reference in peers array
// function connectToNewUser(peerId, stream) {
//   if (stream) {
//     var streamexists = 1;
//   } else {
//     streamexists = 0;
//   }
//   const dataConn = myPeer.connect(peerId);
//   PeerDataConnections[peerId] = dataConn;
//   appendMessage("Data Connection to " + peerId + "established");
// appendMessage("Connection to " + peerId + " stream:" + streamexists);
// const call = myPeer.call(peerId, stream);
// call.on("stream", (peerStream) => {
//   console.log(peerStream);
//   if (!streams.includes(peerStream.id)) {
//     const video = document.createElement("video");
//     video.setAttribute("id", peerId);
//     addVideoStream(video, peerStream);
//     streams.push(peerStream.id);
//   }
// });
// call.on("close", () => {
//   const video = document.getElementById(peerId);
//   videoGrid.removeChild(video);
// });
// PeerMediaConnections[peerId] = call;
// }

function shareFile(peerId, file) {
  // Split data channel message in chunks of this byte length.
  var CHUNK_LEN = 64000;
  var len = file.data.byteLength;
  var n = (len / CHUNK_LEN) | 0;
  //create a new data type connection and store the reference
  const dataConn = myPeer.connect(peerId);
  PeerDataConnections[peerId] = dataConn;
  if (file) {
    console.log("file exists");
  }
  console.log("Sending a total of " + len + " byte(s)");
  for (var i = 0; i < n; i++) {
    var start = i * CHUNK_LEN,
      end = (i + 1) * CHUNK_LEN;
    console.log(start + " - " + (end - 1));
    dataConn.send(file.data.subarray(start, end));
  }
  if (len % CHUNK_LEN) {
    console.log("last " + (len % CHUNK_LEN) + " byte(s)");
    dataConn.send(file.data.subarray(n * CHUNK_LEN));
  }
  socket.emit("new-file-share", roomName, peerId);
}

socket.on("new-file", (peerIdObject) => {
  appendMessage(`${peerIdObject.peerId} started a new file transfer`);
  //mediaCallToNewUser(peerIdObject.peerId, myStream);
  // var dataConnection = PeerDataConnections[peerIdObject.peerId];
  // if (!dataConnection) {
  //   dataConnection = myPeer.connect(peerIdObject.peerId);
  // }
  // dataConnection.on("data", (file) => {
  //   console.log("someone wants to send me data");
  //   console.log(file)
  // });
});

//connect and call the user, store the call reference in peers array
function mediaCallToNewUser(peerId, myStream) {
  //We are calling the other side with our own video
  if (myStream) {
    var streamexists = 1;
  } else {
    streamexists = 0;
  }
  // const dataConn = myPeer.connect(peerId);
  // PeerDataConnections[peerId] = dataConn;
  appendMessage("Connection to " + peerId + " stream:" + streamexists);
  const call = myPeer.call(peerId, myStream);
  call.on("stream", (peerStream) => {
    console.log(peerStream);
    if (!streams.includes(peerStream.id)) {
      const video = document.createElement("video");
      video.setAttribute("id", peerId);
      addVideoStream(video, peerStream);
      streams.push(peerStream.id);
    }
  });
  call.on("close", () => {
    const video = document.getElementById(peerId);
    videoGrid.removeChild(video);
  });
  PeerMediaConnections[peerId] = call;
}

//A new user connected to channel
socket.on("user-connected", (socketId, userName, peerId) => {
  appendMessage(`${userName} connected`);
  // connectToNewUser(peerId, myStream);
});

socket.on("new-media", (peerIdObject) => {
  appendMessage(`${peerIdObject.peerId} started a video stream`);
  mediaCallToNewUser(peerIdObject.peerId, myStream);
});

socket.on("change-media", (peerIdObject) => {
  appendMessage(`${peerIdObject.peerId} started a video stream`);
  //streamType = "screen" or "video"
  removeFromGrid(peerIdObject.peerId);
  mediaCallToNewUser(peerIdObject.peerId, myStream);
});

socket.on("new-data", (peerId) => {
  appendMessage(`${peerId} started a data stream`);
  connectToNewUser(peerId, myStream);
});

//If we receive incoming connection from a peer
myPeer.on("connection", (dataConnection) => {
  appendMessage("data connection established");
  dataConnection.on("data", (file) => {
    console.log(file);
  });
});

//If a user disconnects, closes connection to other peers
socket.on("user-disconnected", (userId, userName, peerId) => {
  appendMessage(`${userName} disconnected`);
  if (PeerMediaConnections[peerId]) PeerMediaConnections[peerId].close();
  if (PeerDataConnections[peerId]) PeerDataConnections[peerId].close();
});

//Audio/ Video Functions

// If we receive incoming call
myPeer.on("call", (mediaConnection) => {
  PeerMediaConnections[mediaConnection.peer] = mediaConnection;
  mediaConnection.answer(myStream);
  mediaConnection.on("stream", (remoteStream) => {
    console.log(remoteStream);
    if (!streams.includes(remoteStream.id)) {
      const video = document.createElement("video");
      video.setAttribute("id", mediaConnection.peer);
      video.controls = true;
      addVideoStream(video, remoteStream);
      streams.push(remoteStream.id);
    }
  });
  mediaConnection.on("close", () => {
    appendMessage("call on close");
    const video = document.getElementById(mediaConnection.peer);
    videoGrid.removeChild(video);
  });
  mediaConnection.on("error", (err) => {
    appendMessage("call on error" + err);
  });
});

const myVideo = document.createElement("video");
myVideo.setAttribute("id", "MyOwnVideoStream");
var myStream; // Reference to stream
var myMediaStream;
myVideo.muted = true;

const qualitySettings = document.getElementById("qualitySettings");
const vgaButton = document.querySelector("#vga");
const qvgaButton = document.querySelector("#qvga");
const hdButton = document.querySelector("#hd");
const fullHdButton = document.querySelector("#full-hd");
const sharescreenButton = document.querySelector("#share-screen");
const videoButton = document.querySelector("#videoButton");
const audioButton = document.querySelector("#audioButton");

const qvgaConstraints = {
  video: { width: { exact: 320 }, height: { exact: 240 } },
};
const vgaConstraints = {
  video: { width: { exact: 640 }, height: { exact: 480 } },
};
const hdConstraints = {
  video: { width: { exact: 1280 }, height: { exact: 720 } },
};
const fullHdConstraints = {
  video: { width: { exact: 1920 }, height: { exact: 1080 } },
};

var isVideoShared = false;
var isAudioShared = false;
var currentConstraints = fullHdConstraints;

vgaButton.onclick = () => {
  currentConstraints = vgaConstraints;
  getMedia();
};
qvgaButton.onclick = () => {
  currentConstraints = qvgaConstraints;
  getMedia();
};
hdButton.onclick = () => {
  currentConstraints = hdConstraints;
  getMedia();
};
fullHdButton.onclick = () => {
  currentConstraints = fullHdConstraints;
  getMedia();
};

videoButton.onclick = () => {
  if (isVideoShared) {
    videoButton.innerText = "Open Camera";
    isVideoShared = false;
    qualitySettings.hidden = true;
    getMedia();
  } else {
    videoButton.innerText = "Close Camera";
    isVideoShared = true;
    qualitySettings.hidden = false;
    getMedia();
  }
};

audioButton.onclick = () => {
  if (isAudioShared) {
    audioButton.innerText = "Open Microphone";
    isAudioShared = false;
    getMedia();
  } else {
    audioButton.innerText = "Close Microphone";
    isAudioShared = true;
    qualitySettings.hidden = false;
    getMedia();
  }
};

const isScreenShared = false;
sharescreenButton.onclick = () => {
  startCaptureScreen().then(
    (stream) => {
      sendVideoReadySignal();
      if (myStream) {
        changeVideoSignal(); //Tell other peers that i am changing my stream
      }
      addMyVideoStream(myVideo, stream);
      myStream = stream;
    },
    (err) => {
      console.log(err);
    }
  );
};

function sendVideoReadySignal() {
  socket.emit("media-ready", roomName, myPeerId);
  appendMessage("media-ready signal sent");
}

//switching from screen share to video vice versa.
function changeVideoSignal() {
  socket.emit("media-changed", roomName, myPeerId);
  appendMessage("media-change signal sent");
}

//streamType = "screen" or "video"
function removeFromGrid(peerId, streamType) {
  const video = document.getElementById(peerId);
  videoGrid.removeChild(video);
}

function sendDataReadySignal() {
  socket.emit("data-ready", roomName, myPeerId);
}

function gotStream(myStream) {
  const track = myStream.getVideoTracks()[0];
  const constraints = track.getConstraints();
  console.log("Result constraints: " + JSON.stringify(constraints));
}

function displayVideoDimensions(whereSeen) {
  if (myVideo.videoWidth) {
    console.log(
      "Actual video dimensions: " +
        myVideo.videoWidth +
        "x" +
        myVideo.videoHeight +
        "px."
    );
    console.log(whereSeen + ": ");
  } else {
    ("video not ready");
  }
}

myVideo.onloadedmetadata = () => {
  displayVideoDimensions("loadedmetadata");
};

myVideo.onresize = () => {
  displayVideoDimensions("resize");
};

function getMedia() {
  if (myStream) {
    myStream.getTracks().forEach(function (track) {
      track.stop();
    });
  }
  //Get User Video and keep reference as stream
  if (isVideoShared || isAudioShared) {
    navigator.mediaDevices
      .getUserMedia({
        video: isVideoShared ? currentConstraints : false,
        audio: isAudioShared,
      })
      .then((stream) => {
        if (myStream) {
          changeVideoSignal(); //Tell other peers that i am changing my stream
        }
        sendVideoReadySignal();
        addMyVideoStream(myVideo, stream);
        myStream = stream;
      });
  } else {
    const video = document.getElementById("MyOwnVideoStream");
    videoGrid.removeChild(video);
  }
}

function addMyVideoStream(video, stream) {
  video.srcObject = stream;
  video.addEventListener("loadedmetadata", () => {
    video.play();
  });
  myVideoGrid.append(video);
}
//add
function addVideoStream(video, stream) {
  video.srcObject = stream;
  video.addEventListener("loadedmetadata", () => {
    video.play();
  });
  videoGrid.append(video);
}

//Share Screen

async function startCaptureScreen() {
  //we also want to keep audio attached
  const screenShareOptions = {
    video: true,
    audio: true,
  };
  let captureStream = null;
  try {
    captureStream = await navigator.mediaDevices.getDisplayMedia(
      screenShareOptions
    );
  } catch (err) {
    console.error("Error: " + err);
  }
  return captureStream;
}

//add

//Text functions

if (messageForm != null) {
  const name = prompt("What is your name?");
  appendMessage("You joined");

  myPeer.on("open", (peerId) => {
    appendMessage("Peer Id:" + peerId);
    socket.emit("new-user", roomName, name, peerId);
    myPeerId = peerId;
  });

  messageForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const message = messageInput.value;
    if (message != "") {
      appendMessage(`You: ${message}`);
      socket.emit("send-chat-message", roomName, message);
    }
    if (fileInput.value) {
      const file = fileInput.value;
      shareFile(myPeerId, file);
    }
    messageInput.value = "";
    fileInput.value = "";
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
