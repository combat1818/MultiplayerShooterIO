var express = require("express");
var app = express();
var server = require("http").Server(app);
var io = require("socket.io").listen(server);

var players = {};

app.use(express.static(__dirname + "/public"));

app.get("/", function (req, res) {
  res.sendFile(__dirname + "/index.html");
});

io.on("connection", function (socket) {
  console.log("a user connected");

  /*
  // create a new player and add it to our players object
  players[socket.id] = {
    rotation: 0,
    x: Math.floor(Math.random() * 700) + 50,
    y: Math.floor(Math.random() * 500) + 50,
    playerId: socket.id,
  };
  // send the players object to the new player
  socket.emit('currentPlayers', players);
  // update all other players of the new player
  socket.broadcast.emit('newPlayer', players[socket.id]);
  */
  socket.on("newPlayerConfirmed", (data) => {
    console.log("someone wats to join the game!");

    // create a new player and add it to our players object
    players[data.id] = {
      rotation: 0,
      x: Math.floor(Math.random() * 700) + 50,
      y: Math.floor(Math.random() * 500) + 50,
      playerId: data.id,
      playerName: data.name,
    };

    // send the players object to the new player
    socket.emit("currentPlayers", players);
    // update all other players of the new player
    socket.broadcast.emit("newPlayer", players[data.id]);
  });

  // when a player moves, update the player data
  socket.on("playerMovement", function (movementData) {
    players[socket.id].x = movementData.x;
    players[socket.id].y = movementData.y;
    players[socket.id].rotation = movementData.rotation;
    //console.log("XD")
    // emit a message to all players about the player that moved
    socket.broadcast.emit("playerMoved", players[socket.id]);
  });

  
  socket.on("bulletShoting", function (bulletData) {
    //players[socket.id].x = movementData.x;
    //players[socket.id].y = movementData.y;
    //players[socket.id].rotation = movementData.rotation;
    //console.log("XD")
    // emit a message to all players about the player that moved
    socket.broadcast.emit("bulletShot", bulletData);
  });

  socket.on("playerDestroyed", (data)=>{
    console.log(data.id+"has been destroyed")
    if(players[data.id])
      delete players[data.id]
  })


  /*
  //Shot with a bullet with specific tag
  socket.on("playerDestroyed", (data) => {
    console.log("przed usunieciem:"+players);
    delete players[data.id];
    console.log("po usunieciu:" +players)
    socket.broadcast.emit("playerShotWithBullet", data);
  });
  */

  //komentarz dla commita- mozna usunac
  // when a player disconnects, remove them from our players object
  socket.on("disconnect", function () {
    console.log("user disconnected");
    console.log(players)
    // remove this player from our players object
    if(players[socket.id])
    delete players[socket.id];
    // emit a message to all players to remove this player
    io.emit("disconnect", socket.id);
  });
});

server.listen(process.env.PORT || 8081, function () {
  console.log(`Listening on ${server.address().port}`);
});
