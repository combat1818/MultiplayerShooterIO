var config = {
  type: Phaser.AUTO,
  parent: "phaser-example",
  width: 3840,
  height: 1874,
  scale: {
    mode: Phaser.Scale.RESIZE,
    //width: window.innerWidth,
    //height: window.innerHeight,
  },
  physics: {
    default: "arcade",
    arcade: {
      debug: false,
      gravity: { y: 0 },
    },
  },
  scene: {
    preload: preload,
    create: create,
    update: update,
  },
};

var game = new Phaser.Game(config);

var stars = [];
var movementSpeed = 500;
var camera;
var flag = true;
var lastShot = 0;
var canAddCollider = true;
var canShoot = true;
var bulletSpeed = 700;
var inGame = false;
var characterSelected = 1;
var w, a, s, d;
var bulletsShot = 0;
var globalSocket

function preload() {
  this.load.image("star", "assets/star.png");
  this.load.image("character", "assets/character.png");
  this.load.image("character1", "assets/character1.png");
  this.load.image("character2", "assets/character2.png");
  this.load.image("character3", "assets/character3.png");
  this.load.image("bullet", "assets/bullet.png");
}

function create() {
  this.socket = io(); //Inicjalizujemy socketa
  globalSocket=this.socket
  camera = this.cameras.main; //.startFollow(this.ship, true, 0.1, 0.1);

  //Add stars
  for (let i = 0; i < 100; i++) {
    stars[i] = this.physics.add.image(
      Phaser.Math.Between(0, config.width),
      Phaser.Math.Between(0, config.height),
      "star"
    );
  }

  //Camera and world bounds
  this.cameras.main.setBounds(0, 0, config.width, config.height);
  this.physics.world.setBounds(0, 0, config.width, config.height);
  //Cursors
  //this.cursors = this.input.keyboard.createCursorKeys();

  this.cameras.main.setZoom(1);
  this.cameras.main.setBackgroundColor("#246810");

  //this.score = 0;
  //Score text
  //this.scoreText = this.add.text(1800, 50, "");

  //STRZELANIE
  this.input.on(
    "pointerdown",
    function (pointer) {
      if (canShoot && this.ship) {
        shootBullet(this);
        canShoot = false;
        bulletsShot++;
        setTimeout(() => {
          canShoot = true;
        }, 1000);
      }
      //this.add.image(pointer.x, pointer.y, 'logo');
    },
    this
  );

  //Bullets group and otherPlayersGroup
  this.bullets = this.physics.add.group();
  this.otherPlayers = this.physics.add.group();

  // Name form and proper entry point to the game
  document.getElementById("button").addEventListener("click", () => {
    document.querySelector(".bg-modal").style.display = "none";
    // Ustawiamy flage inGame na true - WAZNE
    inGame = true;
    // włączamy cursorKeys

    w = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W, false);
    a = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A, false);
    s = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S, false);
    d = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D, false);
    //ULTRA Ważne żeby wyczyścić planszę z dotychczaswoych graczy- inaczej po ponownym zaczęciu gry pojawią się 'sobowtóry'- 2 tekstury na sobie
    this.otherPlayers.getChildren().forEach((otherPlayer) => {
      otherPlayer.destroy();
    });
    //console.log(document.getElementById('nameInput').value)
    console.log(this.socket.id);
    this.socket.emit("newPlayerConfirmed", {
      id: this.socket.id,
      name: document.getElementById("nameInput").value ? document.getElementById("nameInput").value: "Hackerman",
      playerCharacter: characterSelected,
    });
  });

  //Socket io
  var self = this; //zeby przesylac zmienną self do funkcji

  //Collider bulletsGroup, otherPlayers(Group)

  /*
  this.physics.add.collider(
    this.otherPlayers,
    this.bullets,
    (otherPlayer, bullet) => {
      console.log("Hit");
      bullet.destroy();
      otherPlayer.getAt(0).destroy(); //otherPlayer to kontener zawierający sprite i napis- stąd otherPlayer.getAt(0)
      //otherPlayer.getAt(1).destroy()
      otherPlayer.destroy(); //chyba na wszelki wypadek

      
    self.socket.emit("playerDestroyed", {
      id: self.socket.id,
      bulletTag: bullet.type,
    });
    }
  );*/

  //Dodaj starych graczy u nowego gracza
  this.socket.on("currentPlayers", function (players) {
    if (inGame) {
      Object.keys(players).forEach(function (id) {
        if (players[id].playerId === self.socket.id) {
          addPlayer(self, players[id]);
        } else {
          addOtherPlayers(self, players[id]);
        }
      });
    }
  });

  //Dodaj nowego gracza u starych graczy
  this.socket.on("newPlayer", function (playerInfo) {
    if (inGame) {
      addOtherPlayers(self, playerInfo);
      //updateLeaderBoard1(playerInfo)
    }
  });

  this.socket.on("playerMoved", function (playerInfo) {
    self.otherPlayers.getChildren().forEach(function (otherPlayer) {
      if (playerInfo.playerId === otherPlayer.getAt(0).playerId) {
        //TUTAJ
        //otherPlayer.setRotation(playerInfo.rotation);
        console.log("jestem tutaj");
        otherPlayer.setPosition(playerInfo.x, playerInfo.y);
      }
    });
  });

  this.socket.on("bulletShot", function (bulletData) {
    // Add bullet sprite
    if (inGame) {
      // Wazne zeby sprawdzic czy jestesmy w grze
      self.bullet = self.physics.add.sprite(
        bulletData.x,
        bulletData.y,
        "bullet"
      );
      self.bullet.type = bulletData.tag;
      self.bullet.bulletNr = bulletData.bulletNr; //PROBLEM TU
      self.bullet.setScale(0.02);
      // Add bullet to the bullets group
      self.bullets.add(self.bullet); // tutaj ustawia nam się collider
      // Set bullets velocity
      self.bullet.setVelocityX(bulletData.velocityX);
      self.bullet.setVelocityY(bulletData.velocityY);

      console.log("Received bullet data shot by someone");
    }
  });

  this.socket.on("bulletHit", (data) => {
    console.log(data.bulletId);

    if (data.bulletId == this.socket.id) {
      console.log(this.socket.id);
      console.log(data.bulletID);
      //this.score++;
    }

    this.otherPlayers.getChildren().forEach((otherPlayer) => {
      if (otherPlayer.getAt(0).playerId == data.destroyedPlayerId) {
        otherPlayer.destroy();
      }
    });

    this.bullets.getChildren().forEach((bullet) => {
      if (bullet.bulletNr == data.bulletNr) {
        bullet.destroy();
      }
    });
  });

  //UPDATE LEADERBOARD

  this.socket.on("updateLeaderBoard", (data) => {
    if (inGame) {
      console.log("UPDATING LEADERBOARD");
      updateLeaderBoard(data);
    }
  });

  /*
  this.socket.on("playerShotWithBullet", (data) => {
    // Update all other players about someones demise
    console.log("Someone was killed but not me!");
    //Problem z data.tag- dostajemy undefined
    console.log("Bullets type: " + data.tag);
    // Iterate through bulltsGroup and delete the one which killed someone, delete killed player avatar
    var activeBullets = this.bullets.getChildren();
    activeBullets.forEach((bullet) => {
      if (bullet.type == data.bulletTag) {
        bullet.destroy();
      }
    });

    this.otherPlayers.getChildren().forEach((player) => {
      if (player.type === data.id) {
        console.log(player.type);
        console.log(data.id);
        player.destroy();
        player = null;
      }
    });
  });
  */

  this.socket.on("disconnect", function (playerId) {
    self.otherPlayers.getChildren().forEach(function (otherPlayer) {
      if (playerId === otherPlayer.getAt(0).playerId) {
        //znowu otherPlayer to kontener a playerId jest zapisane w obiekcie sprite
        otherPlayer.destroy();
      }
    });
  });
}

function update(time, delta) {
  //this.scoreText.setText("Score: " + this.score);
  if (this.ship) {
    if (this.ship) {
      if (a.isDown) {
        this.container.body.setVelocityX(-movementSpeed);
      } else if (d.isDown) {
        this.container.body.setVelocity(movementSpeed);
      } else {
        this.container.body.setVelocity(0);
      }

      if (s.isDown) {
        this.container.body.setVelocityY(movementSpeed);
      } else if (w.isDown) {
        this.container.body.setVelocityY(-movementSpeed);
      } else {
        this.container.body.setVelocityY(0);
      }

      // emit player movement
      var x = this.container.x;
      var y = this.container.y;
      var r = this.container.rotation;
      if (
        this.container.oldPosition &&
        (x !== this.container.oldPosition.x ||
          y !== this.container.oldPosition.y ||
          r !== this.container.oldPosition.rotation)
      ) {
        console.log("Detecting movement on client side");
        this.socket.emit("playerMovement", {
          x: this.container.x,
          y: this.container.y,
          rotation: this.container.rotation,
        });
      }

      // save old position data
      this.container.oldPosition = {
        x: this.container.x,
        y: this.container.y,
        rotation: this.container.rotation,
      };
    }
  }
}

function addPlayer(self, playerInfo) {
  console.log("Player character number is: " + playerInfo.playerCharacter);
  self.container = self.add.container(playerInfo.x, playerInfo.y);

  self.ship = self.physics.add
    .image(0, 0, "character" + playerInfo.playerCharacter)
    .setOrigin(0.5, 0.5)
    .setScale(0.25);

  self.nameText = self.add.text(
    0,
    -40,
    playerInfo.playerName
  );
  self.nameText.setOrigin(0.5, 0.5);
  self.container.setSize(
    self.ship.getBounds().width,
    self.ship.getBounds().height
  );
  self.container.add(self.ship);
  self.container.add(self.nameText);
  self.physics.world.enable(self.container); //włączamy arcade fizyke -wazne

  self.container.body.setCollideWorldBounds(true); //włączamy kolizje z worldBounds dla całego kontenera

  self.ship.type = playerInfo.playerId;

  self.cameras.main.startFollow(self.container, true, 0.1, 0.1);

  self.physics.add.collider(self.container, self.bullets, (ship, bullet) => {
    console.log("Hit");

    bullet.destroy();

    //komentarz dla commita mozna usunac
    //Wazne zeby przypisac null, samo destroy() tego nie robi, a jest to potrzebne żeby nie wejść w listenery wejscia wasd w petli update
    self.container.destroy();
    self.container = null;
    self.ship = null;

    self.otherPlayers.getChildren().forEach((otherPlayer) => {
      otherPlayer.destroy();
    });

    inGame = false;
    updateLeaderBoard({});
    //self.score = 0;
    document.querySelector(".bg-modal").style.display = "flex";

    self.socket.emit("playerDestroyed", {
      id: self.socket.id,
      bulletId: bullet.type,
      bulletNr: bullet.bulletNr,
    });
  });
}

function addOtherPlayers(self, playerInfo) {
  console.log("adding some player");
  const otherPlayerContainer = self.add.container(playerInfo.x, playerInfo.y);

  const otherPlayer = self.physics.add
    .sprite(0, 0, "character" + playerInfo.playerCharacter)
    .setOrigin(0.5, 0.5)
    .setScale(0.25);
  console.log(playerInfo.playerName);
  const otherPlayerNameText = self.add.text(0, -40, playerInfo.playerName);

  otherPlayerNameText.setOrigin(0.5, 0.5);
  otherPlayerContainer.setSize(
    otherPlayer.getBounds().width,
    otherPlayer.getBounds().height
  );
  otherPlayerContainer.add(otherPlayer);
  otherPlayerContainer.add(otherPlayerNameText);
  self.physics.world.enable(otherPlayerContainer);

  otherPlayer.type = playerInfo.playerId;

  otherPlayer.playerId = playerInfo.playerId;
  self.otherPlayers.add(otherPlayerContainer);
}

//STRZELANIE
function shootBullet(self) {
  self.bullet = self.physics.add.sprite(
    self.container.x,
    self.container.y,
    "bullet"
  );
  self.bullet.setScale(0.02);

  var rad = Phaser.Math.Angle.Between(
    self.container.x - camera.scrollX,
    self.container.y - camera.scrollY,
    game.input.mousePointer.x,
    game.input.mousePointer.y
  );

  velocityX = bulletSpeed * Math.cos(rad);
  velocityY = bulletSpeed * Math.sin(rad);

  self.bullets.add(self.bullet);
  self.bullet.setVelocity(velocityX, velocityY);
  self.bullet.type = self.socket.id;
  self.bullet.bulletNr = self.socket.id + bulletsShot;
  //console.log(self.bullet.bulletNr)

  self.socket.emit("bulletShoting", {
    x: self.container.x,
    y: self.container.y,
    velocityX: velocityX,
    velocityY: velocityY,
    tag: self.bullet.type,
    bulletNr: self.bullet.bulletNr,
    //rotation: this.ship.rotation,
  });

  //OKRESLENIE POZYCJI LEWEGO GORNEGO ROGU EKRANU: camera.scrollX, camera.scrollY
}

document.getElementById("character1").onclick = function () {
  // Change other 2 images background
  document.getElementById("character2").style.backgroundColor = "white";
  document.getElementById("character3").style.backgroundColor = "white";

  document.getElementById("character1").style.backgroundColor = "#e0e0e0";
  characterSelected = 1;
};

document.getElementById("character2").onclick = function () {
  // Change other 2 images background
  document.getElementById("character1").style.backgroundColor = "white";
  document.getElementById("character3").style.backgroundColor = "white";

  document.getElementById("character2").style.backgroundColor = "#e0e0e0";
  characterSelected = 2;
};

document.getElementById("character3").onclick = function () {
  // Change other 2 images background
  document.getElementById("character1").style.backgroundColor = "white";
  document.getElementById("character2").style.backgroundColor = "white";

  document.getElementById("character3").style.backgroundColor = "#e0e0e0";
  characterSelected = 3;
};

function updateLeaderBoard(data) {
  var theDiv = document.getElementById("leaderBoard");
  theDiv.innerHTML = "";
  var content = document.createTextNode("Leaderboard");

  //theDiv.appendChild(br);
  theDiv.appendChild(content);

  /*
  var array=Object.keys(data)
  console.log(array)
  array.forEach((e)=>{
    console.log(e.score)
  })*/
  var array = [];

  Object.keys(data).forEach((id) => {
    array.push(data[id]);
  });
  array.sort(compare);
  /*
  array.forEach((e)=>{
    console.log(e)
  })*/

  var i = 1;
  array.forEach((e) => {
    var span=document.createElement('span');
    if(e.playerId==globalSocket.id)
      span.style.backgroundColor='rgba(238,222,77,0.65)'
    var content = document.createTextNode(
      i++ + ". " + e.playerName + " : " + e.score
    );
    span.appendChild(content)
    var br1 = document.createElement("br");
    theDiv.appendChild(br1);
    theDiv.appendChild(span);
  });
/*
  var i = 1;
  Object.keys(data).forEach((id) => {
    var content = document.createTextNode(
      i++ + ". " + data[id].playerName + " : " + data[id].score
    );
    var br1 = document.createElement("br");
    theDiv.appendChild(br1);
    theDiv.appendChild(content);
  });*/
}

/*
function updateLeaderBoard1(data) {
  var theDiv = document.getElementById("leaderBoard");
  //theDiv.innerHTML = "";
  //theDiv.appendChild(content);
  var content = document.createTextNode(
    data.playerName + " : " + data.score
  );
  theDiv.appendChild(content);

}
*/

function compare(a, b) {
  if (a.score > b.score) return -1;
  if (b.score > a.score) return 1;

  return 0;
}
