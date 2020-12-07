const express = require("express");
const app = express();
const server = require("http").Server(app);
const io = require("socket.io")(server);
const { v4: uuidV4 } = require("uuid");

app.set("views", "./views");
app.set("view engine", "ejs");
app.use(express.static("public"));
app.use(express.urlencoded({ extended: true }));

const rooms = {};

app.get("/", (req, res) => {
  res.render("index", { rooms: rooms });
});

app.get("/newRoom", (req, res) => {
  res.redirect(`/${uuidV4()}`);
});

app.get("/:room", (req, res) => {
  if (rooms[req.params.room] == null) {
    return res.redirect("/");
  }
  res.render("room", { roomId: req.params.room, roomName: req.params.room });
});

app.post("/room", (req, res) => {
  if (rooms[req.body.room] != null) {
    return res.redirect("/");
  }
  rooms[req.body.room] = { users: {}, peers: {} };
  res.redirect(req.body.room);
  // Send message that new room was created
  io.emit("room-created", req.body.room);
});

io.on("connection", (socket) => {
  socket.on("new-user", (roomName, userName, peerId) => {
    socket.join(roomName);
    rooms[roomName].users[socket.id] = userName;
    rooms[roomName].peers[socket.id] = peerId;
    socket
      .to(roomName)
      .broadcast.emit("user-connected", socket.id, userName, peerId);
    console.log(
      "user with name:",
      userName,
      "socket ID:",
      socket.id,
      "connected to room",
      roomName,
      "with peerId",
      peerId
    );
  });
  socket.on("media-ready", (roomName, myPeerId) => {
    socket.to(roomName).broadcast.emit("new-media", {
      peerId: myPeerId,
    });
    console.log(
      "in room",
      roomName,
      "with peerId",
      myPeerId,
      "started streaming"
    );
  });
  socket.on("media-changed", (roomName, myPeerId) => {
    socket.to(roomName).broadcast.emit("change-media", {
      peerId: myPeerId,
    });
    console.log(
      "in room",
      roomName,
      "with peerId",
      myPeerId,
      "Changed streaming media"
    );
  });
  socket.on("new-file-share", (roomName, myPeerId) => {
    socket.to(roomName).broadcast.emit("new-file", {
      peerId: myPeerId,
    });
    console.log(
      "in room",
      roomName,
      "with peerId",
      myPeerId,
      "Wants to send a file"
    );
  });
  socket.on("send-chat-message", (room, message) => {
    socket.to(room).broadcast.emit("chat-message", {
      message: message,
      name: rooms[room].users[socket.id],
    });
  });
  socket.on("disconnect", () => {
    getUserRooms(socket).forEach((room) => {
      socket
        .to(room)
        .broadcast.emit(
          "user-disconnected",
          socket.id,
          rooms[room].users[socket.id],
          rooms[room].peers[socket.id]
        );
      console.log(
        "user socket ID:",
        socket.id,
        "disconnected from room",
        "with peerId",
        rooms[room].peers[socket.id]
      );
      delete rooms[room].users[socket.id];
      delete rooms[room].peers[socket.id];
    });
  });
});

server.listen(process.env.PORT || 3000, () =>
  console.log("Server is running...")
);

function getUserRooms(socket) {
  return Object.entries(rooms).reduce((names, [name, room]) => {
    if (room.users[socket.id] != null) {
      names.push(name);
    }
    return names;
  }, []);
}
