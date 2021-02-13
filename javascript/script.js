//CREATE CANVAS
const gameCanvas = document.getElementById('gameCanvas');
const ctx = gameCanvas.getContext('2d');

//SET UP SOUND EFFECTS
let fxExplode = new Sound("./sounds/explode.m4a");
let fxHit = new Sound("./sounds/hit.m4a", 5);
let fxLaser = new Sound("./sounds/laser.m4a", 5, 0.5);
let fxThrust = new Sound("./sounds/thrust.m4a");

//SET UP THE MUSIC
let music = new Music("./sounds/music-low.m4a", "./sounds/music-high.m4a");
let roidsLeft, roidsTotal;

//FPS(GAME FLAMERATE)
const FPS = 30; //GAME FLAMES PER SECOND
const FRICTION = 0.7;//FRICTION COEFFICIENT OF SPACE
const GAME_LIVES = 3;//STARTING NUMBER OF LIVES
const LASER_EXPLODE_DUR = 0.1;//DURATION OF THE LASER'S EXPLOSION
const LASER_DIST = 0.6;//MAX DISTANCE LASER CAN TRAVEL AS FRACTION OF SCREEN WIDTH
const LASER_MAX = 10;//MAXIMUM NUMBER OF LASERS ON SCREEN AT ONCE
const LASER_SPD = 500;//SPEED OF LASERS IN PIXELS PER SECOND
const ROIDS_PTS_LGE = 20;//POINTS SCORED FOR A LARGE ASTEROID
const ROIDS_PTS_MED = 50;//POINTS SCORED FOR A MIDIUM ASTEROID
const ROIDS_PTS_SML = 100;//POINTS SCORED FOR A SMALL ASTEROID
const ROIDS_NUM = 1;//STARTING NUMBER OF ASTEROIDS
const ROIDS_JAG = 0.4;//JAGGEDNESS OF THE ASTEROIDS(0 = NONE, 1 = LOTS)
const ROIDS_SIZE = 100;//STARTING SIZES OF ASTEROIDS IN PIXELS
const ROIDS_SPD = 50;//MAX STARTING SPEED OF ASTEROIDS IN PIXELS PER SECOND
const ROIDS_VERT = 10;//AVERAGE NUMBER OF VERTICES ON EACH ASTEROID
const SHIP_EXPLODE_DUR = 0.3;//DURATION OF THE SHIP'S EXPLOSION
const SAVE_KEY_SCORE = "highscore";//SAVE KEY FOR LOCAL STORAGE OF HIGH SCORE
const SHIP_BLINK_DUR = 0.1;//DURATION OF THE SHIP'S BLINK DURING INVISIBILITY IN SECONDS
const SHIP_INV_DUR = 3;//DURATION OF THE SHIP'S INVISIBILITY IN SECONDS
const SHIP_SIZE = 30; //SHIP HEIGHT IN PIXELS
const SHIP_THRUST = 5;//ACCELETTION OF THE SHIP IN PIXELS PER SECOND PER SECOND
const SHIP_TURN_SPEED = 360;//TURN SPEED IN DEGREES PER SECOND
const SHOW_BOUNDING = false; // SHOW OR HIDE COLLISION BOUNDING
const SHOW_CENTRE_DOT = false; //SHOW OR HIDE SHIP'S CENTRE DOT
const SOUND_ON = true;
const MUSIC_ON = false;
const TEXT_FADE_TIME = 2.5; //TEXT FADE TIME IN SECONDS
const TEXT_SIZE = 40; //TEXT FONT HEIGHT IN PIXELS

//SET UP THE GAME PARAMETERS
let level, lives, roids, score, scoreHigh, ship, text, textAlpha;
newGame();

//SET UP EVENT HANDLERS
document.addEventListener("keydown", keyDown);
document.addEventListener("keyup", keyUp);


//SET UP THE GAME LOOP
setInterval(update, 1000 / FPS);

function createAsteroidBelt() {
  roids = [];
  roidsTotal = (ROIDS_NUM + level) * 7;
  roidsLeft = roidsTotal;
  let x, y;
  for (let i = 0; i < ROIDS_NUM + level; i++) {
    do {
      x = Math.floor(Math.random() * gameCanvas.width);
      y = Math.floor(Math.random() * gameCanvas.height);
    } while(distBetweenPoints(ship.x, ship.y, x, y) < ROIDS_SIZE * 2 + ship.r); 
    roids.push(newAsteroid(x, y, Math.ceil(ROIDS_SIZE / 2)));
  }
}

function destroyAsteroid(index) {
  let x = roids[index].x;
  let y = roids[index].y;
  let r = roids[index].r;

  //SPRITE THE ASTEROID IN TOW IF NECESSARY
  if(r == Math.ceil(ROIDS_SIZE / 2)) {
    roids.push(newAsteroid(x, y, Math.ceil(ROIDS_SIZE / 4)));
    roids.push(newAsteroid(x, y, Math.ceil(ROIDS_SIZE / 4)));
    score += ROIDS_PTS_LGE;
  } else if(r == Math.ceil(ROIDS_SIZE / 4)) {
    roids.push(newAsteroid(x, y, Math.ceil(ROIDS_SIZE / 8)));
    roids.push(newAsteroid(x, y, Math.ceil(ROIDS_SIZE / 8)));
    score += ROIDS_PTS_MED;
  } else{
    score += ROIDS_PTS_SML;
  }

  //CHECK HIGH SCORE
  if(score > scoreHigh) {
    scoreHigh = score;
    localStorage.setItem(SAVE_KEY_SCORE, scoreHigh);
  }

  //DESTROY THE ASTEROID
  roids.splice(index, 1);
  fxHit.play();

  //CALCULATE THE RATIO OF REMAINING ASTEROIDS TO DETERMINE MUSIC TEMPO
  roidsLeft--;
  music.setAsteroidRatio(roidsLeft == 0 ? 1 : roidsLeft / roidsTotal);

  //new level when no more asteroids
  if(roids.length == 0) {
    level++;
    newLevel();
  }
}

function distBetweenPoints(x1, y1, x2, y2) {
  return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
}

function drawShip(x, y, a, color = "white") {
  ctx.strokeStyle = color;
  ctx.lineWidth = SHIP_SIZE / 20;
  ctx.beginPath();
  ctx.moveTo(//NOSE OF THE SHIP
    x + 4 / 3 * ship.r * Math.cos(a),
    y - 4 / 3 * ship.r * Math.sin(a)
  );
  ctx.lineTo(//THE SHIP REAR LEFT
    x - ship.r * (2 / 3 * Math.cos(a) + Math.sin(a)),
    y + ship.r * (2 / 3 * Math.sin(a) - Math.cos(a))
  );
  ctx.lineTo(//THE SHIP REAR RIGHT
    x - ship.r * (2 / 3 * Math.cos(a) - Math.sin(a)),
    y + ship.r * (2 / 3 * Math.sin(a) + Math.cos(a))
  );
  ctx.closePath();
  ctx.stroke();
}

function explodeShip() {
  ship.explodeTime = Math.ceil(SHIP_EXPLODE_DUR * FPS);
  fxExplode.play();
}

function gameOver() {
  ship.dead = true;
  text = "GAME OVER";
  textAlpha = 1.0;
}

//SET UP KEYDOWN EVENT
function keyDown(e) {

  if(ship.dead) {
    return;
  }

  switch(e.keyCode) {
    case 32://SPACE BAR(SHOOT THE LASER)
    shootLaser();
    break;

    case 37://LEFT ARROW(ROTATE SHIP LEFT)
    ship.rot = SHIP_TURN_SPEED / 180 * Math.PI / FPS;
    break;

    case 38://UP ARROW(THRUST THE SHIP FORWARD)
    ship.thrusting = true;
    break;

    case 39://RIGHT ARROW(ROTATE SHIP RIGHT)
    ship.rot = -SHIP_TURN_SPEED / 180 * Math.PI / FPS;
    break;
  }
}

function keyUp(e) {
  if(ship.dead) {
    return;
  }
  switch(e.keyCode) {
    case 32://SPACE BAR(ALLOW SHOOTING AGAIN)
    ship.canShoot = true;
    break;

    case 37://LEFT ARROW(STOP ROTATING LEFT)
    ship.rot = 0;
    break;

    case 38://UP ARROW(STOP THRUSTING)
    ship.thrusting = false;
    break;

    case 39://RIGHT ARROW(STOP ROTATING RIGHT)
    ship.rot = 0;
    break;
  }
}

function newAsteroid(x, y, r) {
  let lvlMult = 1 + 0.1 * level;
  let roid = {
    x: x,
    y: y,
    xv: Math.random() * ROIDS_SPD * lvlMult / FPS * (Math.random() < 0.5 ? 1 : -1),
    yv: Math.random() * ROIDS_SPD * lvlMult / FPS * (Math.random() < 0.5 ? 1 : -1),
    r: r,
    a: Math.random() * Math.PI * 2, // IN RADIANS
    vert: Math.floor(Math.random() * (ROIDS_VERT + 1) + ROIDS_VERT / 2),
    offs: []
  };
//CREATE THE VERTEX OFFSETS ARRAY
for (let i = 0; i < roid.vert; i++) {
  roid.offs.push(Math.random() * ROIDS_JAG * 2 + 1 - ROIDS_JAG);
}

  return roid;
}

function newGame() {
  level = 0;
  lives = GAME_LIVES;
  score = 0;
  ship = newShip();

  //GET THE HIGH SCORE FROM LOCAL STORAGE
  let scoreStr = localStorage.getItem(SAVE_KEY_SCORE);
  if(scoreStr == null) {
    scoreHigh = 0;
  } else {
    scoreHigh = parseInt(scoreStr);
  }
  newLevel();
}

function newLevel() {
  text = "Level" + (level + 1);
  textAlpha = 1.0;
  createAsteroidBelt();
}

function newShip() {
  return {
    x : gameCanvas.width / 2,
    y : gameCanvas.height / 2,
    r : SHIP_SIZE / 2,//FRICTION COEFFICIENT OF SPACE(0 = NO FRICTION, 1 = LOTS OF FRICTION)
    a : 90 / 180 * Math.PI,//CONVERT TO RADIANS
    blinkNum: Math.ceil(SHIP_INV_DUR / SHIP_BLINK_DUR),
    blinkTime: Math.ceil(SHIP_BLINK_DUR * FPS),
    canShoot: true,
    dead: false,
    explodeTime: 0,
    lasers:[],
    rot: 0, //ROTATION SHIP
    thrusting: false,
    thrust: {
      x: 0,
      y: 0,
    }
  }
}

function shootLaser() {
  //CREATE THE LASER OBJECT
  if(ship.canShoot && ship.lasers.length < LASER_MAX) {
    ship.lasers.push({//FROM THE NOSE OF THE SHIP
      x: ship.x + 4 / 3 * ship.r * Math.cos(ship.a),
      y: ship.y - 4 / 3 * ship.r * Math.sin(ship.a),
      xv: LASER_SPD * Math.cos(ship.a) / FPS,
      yv: -LASER_SPD * Math.sin(ship.a) / FPS,
      dist: 0,
      explodeTime: 0
    });
    fxLaser.play();
  }

  //PREVENT FURTHER SHOOTING
  ship.canShoot = false;
}

function Music(srcLow, srcHigh) {
  this.soundLow = new Audio(srcLow);
  this.soundHigh = new Audio(srcHigh);
  this.low = true;
  this.tempo = 1.0;//SECONDS PER BEAT
  this.beatTime = 0;//FRAMES LEFT UNTIL NEXT BEAT

  this.play = function () {
    if(MUSIC_ON) {
      if(this.low) {
        this.soundLow.play();
      } else {
        this.soundHigh.play();
      }
      this.low = !this.low;
    }
  }

  this.setAsteroidRatio = function (ratio) {
    this.tempo = 1.0 - 0.75 * (1.0 - ratio);
  }

  this.tick = function () {
    if(this.beatTime == 0) {
      this.play();
      this.beatTime = Math.ceil(this.tempo * FPS);
    } else{
      this.beatTime--;
    }
  }
}

function Sound(src, maxStreams = 1, vol = 1.0) {
  this.streamNum = 0;
  this.streams = [];
  for (let i = 0; i < maxStreams; i++) {
    this.streams.push(new Audio(src));
    this.streams[i].volume = vol;
  }

  this.play = function () {
    if(SOUND_ON) {
      this.streamNum = (this.streamNum + 1) % maxStreams;
      this.streams[this.streamNum].play();
    }
  }

  this.stop = function () {
    this.streams[this.streamNum].pause();
    this.streams[this.streamNum].currentTime = 0;
  }
}

function update() {
  let blinkOn = ship.blinkNum % 2 == 0;
  let exploding = ship.explodeTime > 0;

  //TICK THE MUSIC
  music.tick();

  //DRAW THE SPACE
  ctx.fillStyle = "black";
  ctx.fillRect(0, 0, gameCanvas.width, gameCanvas.height);

  //THRUST THE SHIP
  if(ship.thrusting && !ship.dead) {
    ship.thrust.x += SHIP_THRUST * Math.cos(ship.a) / FPS;
    ship.thrust.y -= SHIP_THRUST * Math.sin(ship.a) / FPS;
    fxThrust.play();

    //DRAW THE THRUSTER
    if(!exploding && blinkOn){
      ctx.fillStyle = "red";
      ctx.strokeStyle = "yellow";
      ctx.lineWidth = SHIP_SIZE / 10;
      ctx.beginPath();
      ctx.moveTo(//REAR LEFT
        ship.x - ship.r * (2 / 3 * Math.cos(ship.a) + 0.5 * Math.sin(ship.a)),
        ship.y + ship.r * (2 / 3 * Math.sin(ship.a) - 0.5 * Math.cos(ship.a))
      );
      ctx.lineTo(//REAR CENTRE BEHIND THE SHIP
        ship.x - ship.r * 6 / 3 * Math.cos(ship.a),
        ship.y + ship.r * 6 / 3 * Math.sin(ship.a) 
      );
      ctx.lineTo(//THE SHIP REAR RIGHT
        ship.x - ship.r * (2 / 3 * Math.cos(ship.a) - 0.5 * Math.sin(ship.a)),
        ship.y + ship.r * (2 / 3 * Math.sin(ship.a) + 0.5 * Math.cos(ship.a))
      );
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      }
  } else {
    ship.thrust.x -= FRICTION * ship.thrust.x / FPS;
    ship.thrust.y -= FRICTION * ship.thrust.y / FPS;
    fxThrust.stop();
  }


  if(SHOW_BOUNDING) {
    ctx.strokeStyle = "lime";
    ctx.beginPath();
    ctx.arc(ship.x, ship.y , ship.r, 0, Math.PI * 2, false);
    ctx.stroke();
  }

  //DRAW THE ASTEROIDS
  let x, y, r, a, vert, offs;
  for (let i = 0; i < roids.length; i++) {
    ctx.strokeStyle = "slategrey";
    ctx.lineWidth = SHIP_SIZE / 20;

    //GET THE ASTEROID PROPERTIES
    x = roids[i].x;
    y = roids[i].y;
    r = roids[i].r;
    a = roids[i].a;
    vert = roids[i].vert;
    offs = roids[i].offs;

    //DRAW A PATH
    ctx.beginPath();
    ctx.moveTo(
      x + r * offs[0] * Math.cos(a),
      y + r * offs[0] * Math.sin(a)
    );

    //DRAW THE POLYGON
    for (let j = 1; j < vert; j++) {
      ctx.lineTo(
        x + r * offs[j] *  Math.cos(a + j * Math.PI * 2 / vert),
        y + r * offs[j] *  Math.sin(a + j * Math.PI * 2 / vert)
      );
    }

    ctx.closePath();
    ctx.stroke();

    if(SHOW_BOUNDING) {
      ctx.strokeStyle = "lime";
      ctx.beginPath();
      ctx.arc(x, y , r, 0, Math.PI * 2, false);
      ctx.stroke();
    }
  }

  //DRAW THE SHIP
  if(!exploding) {
    if(blinkOn && !ship.dead) {
      drawShip(ship.x, ship.y, ship.a);
    }

    //HANDLE BLINKING
     if(ship.blinkNum > 0) {
      //REDUCE THE BLINK TIME
      ship.blinkTime--;
      //REDUCE THE BLINK NUM
      if(ship.blinkTime == 0) {
        ship.blinkTime = Math.ceil(SHIP_BLINK_DUR * FPS);
        ship.blinkNum--;
      }
     }
  } else {
    //DRAW THE EXPLOSION
    ctx.fillStyle = "darkred";
    ctx.beginPath();
    ctx.arc(ship.x, ship.y , ship.r * 1.7, 0, Math.PI * 2, false);
    ctx.fill();
    ctx.fillStyle = "red";
    ctx.beginPath();
    ctx.arc(ship.x, ship.y , ship.r * 1.4, 0, Math.PI * 2, false);
    ctx.fill();
    ctx.fillStyle = "orange";
    ctx.beginPath();
    ctx.arc(ship.x, ship.y , ship.r * 1.1, 0, Math.PI * 2, false);
    ctx.fill();
    ctx.fillStyle = "yellow";
    ctx.beginPath();
    ctx.arc(ship.x, ship.y , ship.r * 0.8, 0, Math.PI * 2, false);
    ctx.fill();
    ctx.fillStyle = "white";
    ctx.beginPath();
    ctx.arc(ship.x, ship.y , ship.r * 0.5, 0, Math.PI * 2, false);
    ctx.fill();
  }

  //CENTRE DOT
  if(SHOW_CENTRE_DOT) {
    ctx.fillStyle = "red";
    ctx.fillRect(ship.x - 1, ship.y -1 , 2, 2);
  }

  //DRAW THE LASERS
  for (let i = 0; i < ship.lasers.length; i++) {
    if(ship.lasers[i].explodeTime == 0) {
      ctx.fillStyle = "salmon";
      ctx.beginPath();
      ctx.arc(ship.lasers[i].x, ship.lasers[i].y, SHIP_SIZE / 15, 0, 
      Math.PI * 2, false);
      ctx.fill();
    } else {
      //DRAW THE EXPLOSION
      ctx.fillStyle = "orangered";
      ctx.beginPath();
      ctx.arc(ship.lasers[i].x, ship.lasers[i].y, ship.r * 0.75, 0, 
      Math.PI * 2, false);
      ctx.fill();
      ctx.fillStyle = "salmon";
      ctx.beginPath();
      ctx.arc(ship.lasers[i].x, ship.lasers[i].y, ship.r * 0.5, 0, 
      Math.PI * 2, false);
      ctx.fill();
      ctx.fillStyle = "pink";
      ctx.beginPath();
      ctx.arc(ship.lasers[i].x, ship.lasers[i].y, ship.r * 0.25, 0, 
      Math.PI * 2, false);
      ctx.fill();
    }
  }

  //DRAW THE GAME TEXT
  if(textAlpha >= 0) {
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "rgba(255, 255, 255, " + textAlpha + ")";
    ctx.font = "small-caps " + TEXT_SIZE + "px dejavu sans mono";
    ctx.fillText(text, gameCanvas.width / 2, gameCanvas.height * 0.75);
    textAlpha -= (1.0 / TEXT_FADE_TIME / FPS);
  } else if(ship.dead){
    newGame();
  }

  //DRAW THE LIVES
  let lifeColor;
  for (let i = 0; i < lives; i++) {
    lifeColor = exploding  && i == lives - 1 ? "red" : "white";
    drawShip(SHIP_SIZE + i * SHIP_SIZE * 1.2, SHIP_SIZE, 0.5 * Math.PI, lifeColor);
  }

  //DRAW THE SCORE
  ctx.textAlign = "right";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "white";
  ctx.font = TEXT_SIZE + "px dejavu sans mono";
  ctx.fillText(score, gameCanvas.width - SHIP_SIZE / 2, SHIP_SIZE);

  //DRAW THE HIGHSCORE
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "white";
  ctx.font = (TEXT_SIZE * 0.75) + "px dejavu sans mono";
  ctx.fillText("BEST " + scoreHigh, gameCanvas.width / 2, SHIP_SIZE);

  //DETECT LASER HIT ON ASTEROIDS
  let ax, ay, ar, lx, ly;
  for (let i = roids.length - 1; i >= 0; i--) {
    
    //GRAB THE ASTEROID PROPERTIES
    ax = roids[i].x;
    ay = roids[i].y;
    ar = roids[i].r;

    //LOOP OVER THE LASERS
    for (let j = ship.lasers.length - 1; j >= 0; j--) {
      //GRAB THE LASER PROPERTIES
      lx = ship.lasers[j].x;
      ly = ship.lasers[j].y;

      //DETECT HITS
      if(ship.lasers[j].explodeTime == 0 && distBetweenPoints(ax, ay, lx, ly) < ar) {

        //DESTROY THE ASTEROID AND ACTIVATE THE LASER EXPLOSION
        destroyAsteroid(i);
        ship.lasers[j].explodeTime = Math.ceil(LASER_EXPLODE_DUR * FPS)
        break;
      }
    }
  }

  //CHECK FOR ASTEROID COLLISIONS
  if(!exploding) {
    if(ship.blinkNum == 0 && !ship.dead) {
      for (let i = 0; i < roids.length; i++) {
        if(distBetweenPoints(ship.x, ship.y, roids[i].x, roids[i].y) < ship.r + roids[i].r) {
          explodeShip();
          destroyAsteroid(i);
          break;
        }
      }
    }
    //ROTATE THE SHIP
    ship.a += ship.rot;
  
    //MOVE THE SHIP
    ship.x += ship.thrust.x;
    ship.y += ship.thrust.y;
  } else {
    ship.explodeTime--;

    if(ship.explodeTime == 0) {
      lives--;
      if(lives == 0) {
        gameOver();
      } else {
        ship = newShip();
      }
    }
  }


  //HANDLE EDGE OF SCREEN
  if(ship.x < 0 - ship.r) {
    ship.x = gameCanvas.width + ship.r;
  } else if(ship.x > gameCanvas.width + ship.r) {
    ship.x = 0 - ship.r;
  }
  if(ship.y < 0 - ship.r) {
    ship.y = gameCanvas.height + ship.r;
  } else if(ship.y > gameCanvas.height + ship.r) {
    ship.y = 0 - ship.r;
  }

  //MOVE THE LASERS
  for (let i = ship.lasers.length -1; i >= 0; i--) {
    //CHECK DISTANCE TRAVELLED
    if(ship.lasers[i].dist > LASER_DIST * gameCanvas.width) {
      ship.lasers.splice(i, 1);
      continue;
    }

    //HANDLE THE EXPLOSION
    if(ship.lasers[i].explodeTime > 0) {
      ship.lasers[i].explodeTime--;

      //DESTROY THE LASER AFTER THE DURATION IS UP
      if(ship.lasers[i].explodeTime == 0) {
        ship.lasers.splice(i, 1);
        continue;
      }
    } else {
      //MOVE THE LASERS
      ship.lasers[i].x += ship.lasers[i].xv;
      ship.lasers[i].y += ship.lasers[i].yv;
  
      //CALCULATE THE DISTANCE TRAVELLED
      ship.lasers[i].dist += Math.sqrt(Math.pow(ship.lasers[i].xv, 2) + 
      Math.pow(ship.lasers[i].yv, 2));
    }

    //HANDLE EDGE OF SCREEN
    if(ship.lasers[i].x < 0) {
      ship.lasers[i].x = gameCanvas.width;
    } else if(ship.lasers[i].x > gameCanvas.width) {
      ship.lasers[i].x = 0;
    }
    if(ship.lasers[i].y < 0) {
      ship.lasers[i].y = gameCanvas.height;
    } else if(ship.lasers[i].y > gameCanvas.height) {
      ship.lasers[i].y = 0;
    }
  }

  //MOVE THE ASTEROIDS
  for (let i = 0; i < roids.length; i++) {
    roids[i].x += roids[i].xv;
    roids[i].y += roids[i].yv;

    //HANDLE EDEGE OF SCREEN
    if(roids[i].x < 0 - roids[i].r) {
      roids[i].x = gameCanvas.width + roids[i].r;
    } else if(roids[i].x > gameCanvas.width + roids[i].r){
      roids[i].x = 0 - roids[i].r;
    }
    if(roids[i].y < 0 - roids[i].r) {
      roids[i].y = gameCanvas.height + roids[i].r;
    } else if(roids[i].y > gameCanvas.height + roids[i].r){
      roids[i].y = 0 - roids[i].r;
    }
  }
}