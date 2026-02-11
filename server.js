const User = require("./models/User");
const GroupMessage = require("./models/GroupMessage");
const PrivateMessage = require("./models/PrivateMessage");

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");

require("dotenv").config();

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(cors());
app.use(express.json());
app.use(express.static("public"));
app.use(express.static("views"));


mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB Connected Successfully"))
  .catch(err => console.log("MongoDB Connection Error:", err));


server.listen(3000, () => {
  console.log("Server running on port 3000");
});

app.post("/signup", async (req, res) => {
  try {
    const user = new User(req.body);
    await user.save();
    res.send("User Registered");
  } catch (err) {
    res.status(400).send("Username already exists");
  }
});

app.post("/login", async (req, res) => {
  const { username, password } = req.body;

  const user = await User.findOne({ username, password });

  if (user) {
    res.send("success");
  } else {
    res.status(400).send("Invalid credentials");
  }
});

io.on("connection", (socket) => {

  socket.on("joinRoom", ({ username, room }) => {
    socket.join(room);
    io.to(room).emit("message", username + " joined " + room);
  });

  socket.on("leaveRoom", (room) => {
    socket.leave(room);
  });

  socket.on("chatMessage", async (data) => {

    await GroupMessage.create({
      from_user: data.from_user,
      room: data.room,
      message: data.message
    });

    console.log("Message saved to DB");

    io.to(data.room).emit(
      "message",
      data.from_user + ": " + data.message
    );

  });

  socket.on("typing", (data) => {
    socket.to(data.room).emit("typing", data.username);
  });

  socket.on("disconnect", () => {
  console.log("User disconnected");
  });


});

