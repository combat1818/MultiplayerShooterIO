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
			debug: true,
			gravity: { y: 0 }
		}
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
var camera
var flag=true
var lastShot=0;
var canAddCollider=true
var canShoot=true
var bulletsShot=0

function preload() {
  this.load.image("star", "assets/star.png");
  this.load.image("character", "assets/character.png");
  this.load.image("bullet", "assets/bullet.png");
}

function create() {
  this.socket = io();

  camera=this.cameras.main//.startFollow(this.ship, true, 0.1, 0.1);

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
  this.cursors=this.input.keyboard.addKeys(
    {up:Phaser.Input.Keyboard.KeyCodes.W,
    down:Phaser.Input.Keyboard.KeyCodes.S,
    left:Phaser.Input.Keyboard.KeyCodes.A,
    right:Phaser.Input.Keyboard.KeyCodes.D,
    space: Phaser.Input.Keyboard.KeyCodes.SPACE});

  this.cameras.main.setZoom(1);
  this.cameras.main.setBackgroundColor("#246810");


  //STRZELANIE
  this.input.on('pointerdown', function (pointer) {

    if(canShoot && this.ship){
      shootBullet(this)
      bulletsShot++
      canShoot=false;
      setTimeout(()=>{canShoot=true}, 1000)
    }
    //this.add.image(pointer.x, pointer.y, 'logo');

  }, this);

  //Bullets group
  this.bullets=this.physics.add.group()
  

  //Socket io
  var self = this;
  this.otherPlayers = this.physics.add.group();

  this.socket.on("currentPlayers", function (players) {
    Object.keys(players).forEach(function (id) {
      if (players[id].playerId === self.socket.id) {
        addPlayer(self, players[id]);
      } else {
        addOtherPlayers(self, players[id]);
      }
    });
  });
  this.socket.on("newPlayer", function (playerInfo) {
    addOtherPlayers(self, playerInfo);
  });

  this.socket.on("playerMoved", function (playerInfo) {
    self.otherPlayers.getChildren().forEach(function (otherPlayer) {
      if (playerInfo.playerId === otherPlayer.playerId) {
        //otherPlayer.setRotation(playerInfo.rotation);
        otherPlayer.setPosition(playerInfo.x, playerInfo.y);
      }
    });
  });

  this.socket.on("bulletShot", function (bulletData) {
    /*
    self.otherPlayers.getChildren().forEach(function (otherPlayer) {
      if (playerInfo.playerId === otherPlayer.playerId) {
        //otherPlayer.setRotation(playerInfo.rotation);
        otherPlayer.setPosition(playerInfo.x, playerInfo.y);
      }
    });*/
    // Add bullet sprite
    self.bullet=self.physics.add.sprite(bulletData.x,bulletData.y,"bullet")
    self.bullet.type=bulletData.tag
    // Add bullet to the bullets group
    self.bullets.add(self.bullet)
    // Set bullets velocity
    self.bullet.setVelocityX(bulletData.velocityX)
    self.bullet.setVelocityY(bulletData.velocityY)
    /*
    self.physics.add.collider(
      self.ship,
      self.bullet,
      (invader, laser) => {
        console.log("Hit")
        //Emit that this player has been shot with a specific bullet
        self.bullet.destroy()
        self.socket.emit("playerDestroyed", {
          id: self.socket.id,
        });
      }
    );*/
    console.log("Received bullet data shot by someone")
  });

  this.socket.on("playerShotWithBullet", (data)=> {
    // Update all other players about someones demise
    console.log("Someone was killed but not me!")
    //Problem z data.tag- dostajemy undefined
    console.log("Bullets type: "+data.tag)
    // Iterate through bulltsGroup and delete the one which killed someone, delete killed player avatar
    var activeBullets=this.bullets.getChildren()
    activeBullets.forEach((bullet)=>{
      if(bullet.type==data.bulletTag){
        bullet.destroy()
      }
    })

    this.otherPlayers.getChildren().forEach((player)=>{
      if(player.type==data.id){
        player.destroy()
      }
    })



  });

  this.socket.on("disconnect", function (playerId) {
    self.otherPlayers.getChildren().forEach(function (otherPlayer) {
      if (playerId === otherPlayer.playerId) {
        otherPlayer.destroy();
      }
    });
  });

  
}

function update(time, delta) {
  if (this.ship) {

    if(flag){
      this.cameras.main.startFollow(this.ship, true, 0.1, 0.1);

      this.physics.add.collider(
        this.ship,
        this.bullets,
        (ship, bullet) => {
          console.log("Hit")
          //Emit that this player has been shot with a specific bullet
          
          // Destroy this player on his client side and emit event to other players
          bullet.destroy()
          
          //Wazne zeby przypisac null, samo destroy() tego nie robi, a jest to potrzebne żeby nie wejść w listenery wejscia wasd w petli update
          this.ship.destroy()
          this.ship=null

          console.log(bullet.type)
          this.socket.emit("playerDestroyed", {
            id: this.socket.id,
            bulletTag: bullet.type
          });
        }
      );
      
      flag=false
    }

    if(this.ship){

      if (this.cursors.left.isDown) {
        this.ship.setVelocityX(-movementSpeed);
      } else if (this.cursors.right.isDown) {
        this.ship.setVelocity(movementSpeed);
      } else {
        this.ship.setVelocity(0);
      }

      if (this.cursors.down.isDown) {
        this.ship.setVelocityY(movementSpeed);
      } else if (this.cursors.up.isDown) {
        this.ship.setVelocityY(-movementSpeed);
      } else {
        this.ship.setVelocityY(0);
      }


      // emit player movement
      var x = this.ship.x;
      var y = this.ship.y;
      var r = this.ship.rotation;
      if (
        this.ship.oldPosition &&
        (x !== this.ship.oldPosition.x ||
          y !== this.ship.oldPosition.y ||
          r !== this.ship.oldPosition.rotation)
      ) {
        this.socket.emit("playerMovement", {
          x: this.ship.x,
          y: this.ship.y,
          rotation: this.ship.rotation,
        });
      }

      // save old position data
      this.ship.oldPosition = {
        x: this.ship.x,
        y: this.ship.y,
        rotation: this.ship.rotation,
      };
    }

  }
}

function addPlayer(self, playerInfo) {
  self.ship = self.physics.add
    .image(playerInfo.x, playerInfo.y, "character")
    .setOrigin(0.5, 0.5)
    .setScale(0.3)

  self.ship.type=playerInfo.playerId
    //.setDisplaySize(60, 60);
    //.setCircle(90)
    
  //self.ship.body.setOffset(20,20)
  //.setDisplaySize(53, 40);
  /*
  if (playerInfo.team === "blue") {
    self.ship.setTint(0x0000ff);
  } else {
    self.ship.setTint(0xff0000);
  }*/

  /*
  self.ship.setDrag(100);
  self.ship.setAngularDrag(100);
  self.ship.setMaxVelocity(200);
  */
}

function addOtherPlayers(self, playerInfo) {
  const otherPlayer = self.physics.add
    .sprite(playerInfo.x, playerInfo.y, "character")
    .setOrigin(0.5, 0.5)
    .setScale(0.3)

  otherPlayer.type=playerInfo.playerId
    //.setCircle(90)
    //.setDisplaySize(60, 60);

  /*
  if (playerInfo.team === "blue") {
    otherPlayer.setTint(0x0000ff);
  } else {
    otherPlayer.setTint(0xff0000);
  }
  */

  otherPlayer.playerId = playerInfo.playerId;
  self.otherPlayers.add(otherPlayer);
}


//STRZELANIE
function shootBullet(self){
  self.bullet=self.physics.add.sprite(self.ship.x,self.ship.y,"bullet")

  //var shipPosY= self.ship.y>960 ? self.ship.y%960 : self.ship.y

  var velocityX=((game.input.mousePointer.x)-(self.ship.x-camera.scrollX ))
  var velocityY=((game.input.mousePointer.y)-(self.ship.y-camera.scrollY))

  

  self.bullets.add(self.bullet)
  self.bullet.setVelocity(velocityX, velocityY)
  self.bullet.type=self.socket.id+bulletsShot
  //console.log(self.bullet.type)
  
  self.socket.emit("bulletShoting", {
    x: self.ship.x,
    y: self.ship.y,
    velocityX: velocityX,
    velocityY: velocityY,
    tag: self.bullet.type,
    //rotation: this.ship.rotation,
  });

  //OKRESLENIE POZYCJI LEWEGO GORNEGO ROGU EKRANU: camera.scrollX, camera.scrollY
  
}
