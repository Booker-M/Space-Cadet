const context = new window.AudioContext();
const types = { SHIP: 'Ship', PLANET: 'Planet', BULLET: 'Bullet'};
let ship = {};
const moveSpeed = 0.3,
      rotateSpeed = 0.4;
const totalStars = 200,
      totalPlanets = 6,
      totalShips = 7,
      totalBullets = 100;
let maxPlanetSize,
    minPlanetSize;
let flameSize = 5;
let flameGrow = true;
let stars = [];
let objects = [];
let bulletWait = 24,
    missileWait = 24*15;

const music = [
  new Audio('http://soundimage.org/wp-content/uploads/2016/11/Automation.mp3')
];
let trackLength = 0.0;
let elapsed = Number.MAX_SAFE_INTEGER;

const sounds = { //https://freesound.org/people/ProjectsU012/packs/18837/?page=3#sound
  SHOOT: new Audio('https://freesound.org/data/previews/459/459145_6142149-lq.mp3'),
  EXPLODE: new Audio('https://audiosoundclips.com/wp-content/uploads/2019/10/8-Bit-SFX_Explosion-2.mp3'),
  MISSILE: new Audio('https://freesound.org/data/previews/404/404754_140737-lq.mp3')
};

function setup() {
  createCanvas(windowWidth - 20, windowHeight - 20);
  maxPlanetSize = height,
      minPlanetSize = height/10;
  noStroke();
  rectMode(CENTER);
  reset();
}

function reset() {
  ship = {type: types.SHIP, xPos: 0, yPos: 0, dir: 0, xVel: 0, yVel: 0, dVel: 0, friction: 0.997, spinFriction: 0.96, maxSpeed: 10, maxRotation: 15, size: height/16, color: randomColor(), end: false, bulletWait: 0, missileWait: 0, flame: {back: false, left: false, right: false}, kills: 0};
  objects = [ship];
  generateStars();
  generatePlanets();
  generateShips();
}

function windowResized() {
  resizeCanvas(windowWidth - 20, windowHeight - 20);
}

function playSound(sound, object) {
  distance = getDistance(object.xPos, object.yPos, ship.xPos, ship.yPos);
  if (distance < width*2) {
    sound.volume = (width*2-distance)/(width*2);
    sound.play();
  }
}

function draw() {
  background("black");
  keys();
  refresh();
  drawUI();
  playMusic();
  // console.log(ship.xPos, ship.yPos, ship.dir);
}

function keys() {
  if (keyIsDown(UP_ARROW) || keyIsDown(87)) {
    accelerate(ship, moveSpeed);
    ship.flame.back = true;
  } else { ship.flame.back = false; }
  if (keyIsDown(DOWN_ARROW) || keyIsDown(83)) {
    accelerate(ship, -0.1);
  }
  if (keyIsDown(LEFT_ARROW) || keyIsDown(65)) {
    spin(ship, -rotateSpeed);
    ship.flame.left = true;
  } else { ship.flame.left = false; }
  if (keyIsDown(RIGHT_ARROW) || keyIsDown(68)) {
    spin(ship, rotateSpeed);
    ship.flame.right = true;
  } else { ship.flame.right = false; }
  if (ship.bulletWait === 0 && (keyIsDown(32) || keyIsDown(85))) {
    fireBullet(ship, false);
  }
  if (ship.missileWait === 0 && (keyIsDown(73) || keyIsDown(86))) {
    fireBullet(ship, true);
  }
  if (keyIsDown(90)) { reset(); }
}

function refresh() {
  drawStars();
  for (let i = 0; i < objects.length; i++) {
    if (objects[i].end === true && endObject(i)) { i--; continue; }
    if (objects[i].type === types.SHIP) {
      if (objects[i].bulletWait > 0) { objects[i].bulletWait--; }
      if (objects[i].missileWait > 0) { objects[i].missileWait--; }
      if (objects[i] !== ship) { trackShips(objects[i]); }
    }
    if (objects[i].type===types.BULLET && objects[i].missile) { trackShips(objects[i]); }
    if (objects[i].type === types.PLANET) { calcGravity(objects[i]); }
    else { move(i); }
    if (outOfBounds(objects[i].xPos, objects[i].yPos, objects[i].size)) { fix(i); }
    else {
      for (let j = 0; j < objects.length; j++) {
        if (objects[i] === objects[j]) { continue; }
        if (collision(objects[i].xPos, objects[i].yPos, objects[i].size, objects[j].xPos, objects[j].yPos, objects[j].size)) { collide(i, j); }
      }
      drawObject(objects[i]);
    }
  }
}

function drawUI() {
  resetMatrix();
  fill("red");
  let s = 15;
  translate(15,21);
  rotate(-PI/5);
  triangle(s/2, -s/4, s/2, s/4, s, 0);
  fill(200);
  rect(0, 0, s, s/2);
  
  resetMatrix();
  fill(100);
  rect(110, 20, 150, 10);
  fill("cyan");
  let length = ((360-ship.missileWait)/360)*150;
  rect(35 + length/2, 20, length, 10);
  
  fill("white")
  textSize(32);
  text(ship.kills, width - 30 - (ship.kills > 9 ? parseInt(ship.kills/10).toString().length*16 : 0), 35);
}

function move(i) {
  objects[i].dVel = objects[i].dVel * objects[i].spinFriction;
  objects[i].xVel = objects[i].xVel * objects[i].friction;
  objects[i].yVel = objects[i].yVel * objects[i].friction;
  objects[i].dir += radians(objects[i].dVel);
  if (Math.abs(objects[i].dir) > PI) { objects[i].dir -= Math.sign(objects[i].dir)*2*PI; }
  objects[i].xPos += objects[i].xVel;
  objects[i].yPos += objects[i].yVel;
}

function playMusic() {
    if (elapsed > trackLength) {
      let i = parseInt(Math.random()*music.length);
      music[i].play();
      elapsed = 0.0;
      trackLength = music[i].duration;
    } else {
      elapsed += 1/frameRate();
    }
}

function drawObject(object) {
  let x = object.xPos - ship.xPos + width/2,
      y = object.yPos - ship.yPos + height/2;
  resetMatrix();
  translate(x, y);
  rotate(object.dir);
  switch (object.type) {
    case types.SHIP: drawShip(object); break;
    case types.PLANET: drawPlanet(object); break;
    case types.BULLET: drawBullet(object); break;
  }
}

function drawShip(object) {
  if (typeof(object.explosion) !== "undefined") {
    drawExplosion(object);
    return;
  }
  let size = object.size;
  fill(object.color);
  triangle(-size/2, -size/5, -size/2, size/5, size/4, 0);
  triangle(-size/3.5, -size/1.5, -size/3.5, size/1.5, size/3, 0);
  fill(200);
  rect(0, 0, size/1.4, size/3.7);
  fill(object.color);
  triangle(size/3, -size/7, size/3, size/7, size/1.7, 0);
  fill(100);
  ellipse(size/20,0,size/6,size/6);
  fill(175);
  ellipse(size/20,0,size/7,size/7);
  drawFlames(object);
}

function drawFlames(object) {
  resetMatrix();
  translate(object.xPos - ship.xPos + width/2, object.yPos - ship.yPos + height/2);
  rotate(object.dir);
  fill("red");
  let size = object.size;
  if (object.flame.back) {
    triangle(-size/2, -flameSize*size/40, -size/2, flameSize*size/40, -size/2 - flameSize*size/40*2, 0);
  }
  if (object.flame.left) {
    fill("red");
    triangle(-size/3.5, -flameSize*size/80 + size/2, -size/3.5, flameSize*size/80 + size/2, -size/3.5 - flameSize*size/80*2, size/2);
  }
  if (object.flame.right) {
    fill("red");
    triangle(-size/3.5, -flameSize*size/80 - size/2, -size/3.5, flameSize*size/80 - size/2, -size/3.5 - flameSize*size/80*2, -size/2);
  }
  flameFlicker();
}

function flameFlicker() {
  if (flameGrow) {
      flameSize += 0.2;
      if (flameSize >= 10) {
        flameGrow = false;
      }
    } else {
      flameSize -= 0.2;
      if (flameSize <= 5) {
        flameGrow = true;
      }
    }
}

function drawExplosion(object) {
  fill(`rgba(200,0,0, ${(object.size*2-object.explosion)/(object.size*2)+0.5})`);
  ellipse(0, 0, object.explosion);
}

function accelerate(object, amount, dir = object.dir) {
  if (typeof(object.explosion) !== "undefined") { return; }
  object.xVel += Math.cos(dir)*amount;
  object.yVel += Math.sin(dir)*amount;
  let speed = getDistance(object.xVel, object.yVel, 0, 0);
  if (speed > object.maxSpeed) {
    object.xVel -= (object.xVel/speed)*(speed - object.maxSpeed);
    object.yVel -= (object.yVel/speed)*(speed - object.maxSpeed);
  }
}

function spin(object, amount) {
  if (typeof(object.explosion) !== "undefined") { return; }
  object.dVel += amount;
  if (Math.abs(object.dVel) > object.maxRotation) {
    object.dVel = Math.sign(object.dVel)*object.maxRotation;
  }
}

function outOfBounds(xPos, yPos, size) {
  return (xPos > width*5 + ship.xPos + size/2 || xPos < -width*4 + ship.xPos - size/2 || yPos > height*5 + ship.yPos + size/2 || yPos < -height*4 + ship.yPos - size/2);
}

function getDistance(x1, y1, x2, y2) {
  return Math.sqrt(Math.pow(x1 - x2, 2) + Math.pow(y1 - y2, 2));
}

function getDir(x1, y1, x2, y2) {
  return Math.atan2(y1 - y2, x1 - x2);
}


function collision(x1, y1, s1, x2, y2, s2) {
  return getDistance(x1, y1, x2, y2) < s1/2 + s2/2;
}

function fix(i) {
  if (objects[i] === ship) { return; }
  if (objects[i].type === types.PLANET) { objects[i] = genPlanet(); }
  else { objects[i].end = true; }
}

function collide(i, j) {
  let both = [objects[i], objects[j]];
  for (a = 0; a < 2; a ++) {
    if (both[a].end) { continue; }
    if (both[a].type !== types.PLANET) {
      if (both[a].type === types.BULLET && both[a===0?1:0].type === types.SHIP) {
        both[a].parent.kills++;
      }
      if (both[a===0?1:0].type === types.PLANET) {
        both[a].xVel = 0;
        both[a].yVel = 0;
        both[a].dVel = 0;
      }
      both[a].end = true;
    }
  }
}

function endObject(i) {
  if (objects[i].type === types.SHIP || (objects[i].type === types.BULLET && objects[i].missile)) {
    if(typeof(objects[i].explosion) === "undefined") {
      playSound(sounds.EXPLODE, objects[i]);
      objects[i].explosion = objects[i].size/2;
      return false;
    } else {
       if (objects[i].explosion > objects[i].size*2) {
         if (objects[i]. type === types.BULLET) { return removeObject(i); }
         if (objects[i] === ship) { reset(); }
         else { objects[i] = genShip(); }
         return false;
       } else {
         objects[i].explosion += (objects[i].size*2-objects[i].explosion)/10 + 0.1;
         return false;
       }
    }
  }
  else { 
    return removeObject(i);
  }
}

function removeObject(i) {
  if (objects[i] === ship) { reset(); }
  else { objects.splice(i, 1); }
  return true;
}

function randomColor() {
  return [Math.random()*255, Math.random()*255, Math.random()*255];
}

function generateStars() {
  stars = [];
  for (let i=0; i < totalStars; i++) {
   stars.push({xPos: Math.random() * width, yPos: Math.random() * height, color:"white"});
  }
}

function drawStars() {
  let size = 10;
  fill(200);
  let t = 10;
  for (let j = 0; j < t; j++) {
    for (let i = stars.length * j/t; i < stars.length * (j+1)/t; i++) {
      if (stars[i].xPos > width + ship.xPos/j + 2.5) { stars[i].xPos = ship.xPos/j}
      if (stars[i].xPos < ship.xPos/j - 2.5) { stars[i].xPos = ship.xPos/j + width}
      if (stars[i].yPos > height + ship.yPos/j + 2.5) { stars[i].yPos = ship.yPos/j}
      if (stars[i].yPos < ship.yPos/j - 2.5) { stars[i].yPos = ship.yPos/j + height}
      ellipse(stars[i].xPos - ship.xPos/j, stars[i].yPos - ship.yPos/j, size/2, size/2);
    }
  }
}

function generatePlanets() {
  for (let i=0; i < totalPlanets; i++) {
   objects.push(genPlanet());
  }
}

function genPlanet() {
  let xOrY = parseInt(Math.random()+0.5);
  let newPlanet = {type: types.PLANET, xPos: ((Math.random()*2+xOrY)*width + maxPlanetSize/2) * Math.sign(Math.random()-0.5) + ship.xPos, yPos: ((Math.random()*2+(1-xOrY))*height + maxPlanetSize/2) * Math.sign(Math.random()-0.5) + ship.yPos, dir: 0, xVel: 0, yVel: 0, dVel: 0, friction: 0, spinFriction: 0, maxSpeed: 0, maxRotation: 0, size: Math.random() * (maxPlanetSize-minPlanetSize) + minPlanetSize, color: randomColor(), end: false};
  for (let i = 0; i < objects.length; i++) {
    if (collision(newPlanet.xPos, newPlanet.yPos, newPlanet.size, objects[i].xPos, objects[i].yPos, objects[i].size)) { return genPlanet(); }
  }
  return newPlanet;
}

function drawPlanet(object) {
  fill(object.color);
  ellipse(0, 0, object.size);
}

function calcGravity(object) {
  for (let i = 0; i < objects.length; i++) {
    if (object === objects[i]) { continue; }
    let distance = getDistance(object.xPos, object.yPos, objects[i].xPos, objects[i].yPos);
    if (distance < object.size*3) {
      let gravity = (object.size/4)/(distance+object.size);
      let dir = getDir(object.xPos, object.yPos, objects[i].xPos, objects[i].yPos);
      accelerate(objects[i], gravity, dir);
      let velDir = getDir(objects[i].xVel, objects[i].yVel, 0, 0);
      let diff = velDir - objects[i].dir;
      if (Math.abs(diff) > PI) { diff-= Math.sign(diff)*2*PI; }
      spin(objects[i], diff*gravity*3/PI);
    }
  }
}

function fireBullet(object, missile) {
  let speed = 13;
  if (missile) {
    let size = height/35;
    playSound(sounds.MISSILE, object);
    object.missileWait = object === ship ? missileWait : missileWait*2;
    objects.push({type: types.BULLET, xPos: object.xPos + Math.cos(object.dir)*size*4, yPos: object.yPos + Math.sin(object.dir)*size*4, dir: object.dir, xVel: object.xVel + Math.cos(object.dir)*speed, yVel: object.yVel + Math.sin(object.dir)*speed, dVel: 0, friction: ship.friction, spinFriction: ship.spinFriction, maxSpeed: ship.maxSpeed, maxRotation: ship.maxRotation, size: size, color: "red", end: false, missile: true, parent: object});
  } else {
    let size = height/70;
    playSound(sounds.SHOOT, object);
    object.bulletWait = object === ship ? bulletWait : bulletWait*2;
    objects.push({type: types.BULLET, xPos: object.xPos + Math.cos(object.dir)*size*6, yPos: object.yPos + Math.sin(object.dir)*size*6, dir: object.dir, xVel: object.xVel + Math.cos(object.dir)*speed, yVel: object.yVel + Math.sin(object.dir)*speed, dVel: 0, friction: 1, spinFriction: 1, maxSpeed: 40, maxRotation: 25, size: size, color: "cyan", end: false, missile: false, parent: object});
  }
}

function drawBullet(object) {
  fill(object.color);
  if (object.missile) {
    if (typeof(object.explosion) !== "undefined") {
      drawExplosion(object);
      return;
    }
    let size = object.size;
    fill(200);
    rect(0, 0, size, size/2);
    fill(object.color);
    triangle(size/2, -size/4, size/2, size/4, size, 0);
  } else { ellipse(0, 0, object.size, object.size); }
}

function generateShips() {
  for (let i=0; i < totalShips; i++) {
   objects.push(genShip());
  }
}

function genShip() {
  let xOrY = parseInt(Math.random()+0.5);
  let size = ship.size;
  let newShip = {type: types.SHIP, xPos: ((Math.random()*2+xOrY)*width + size/2) * Math.sign(Math.random()-0.5) + ship.xPos, yPos: ((Math.random()*2+(1-xOrY))*height + size/2) * Math.sign(Math.random()-0.5) + ship.yPos, dir: 0, xVel: 0, yVel: 0, dVel: 0, friction: ship.friction, spinFriction: ship.spinFriction, maxSpeed: ship.maxSpeed, maxRotation: ship.maxRotation, size: size, color: randomColor(), end: false, bulletWait: 0, missileWait: 0, flame: {back: false, left: false, right: false}, kills: 0};
  for (let i = 0; i < objects.length; i++) {
    if (collision(newShip.xPos, newShip.yPos, newShip.size, objects[i].xPos, objects[i].yPos, objects[i].size)) { return genShip(); }
  }
  return newShip;
}

function trackShips(object) {
  if (object === ship) { return; }
  let minDistance = Number.MAX_SAFE_INTEGER;
  let target = {};
  for (let i = 0; i < objects.length; i++) {
    if (object === objects[i] || objects[i].type !== types.SHIP || (object.type === types.BULLET && object.parent === objects[i])) { continue; }
    let distance = getDistance(objects[i].xPos, objects[i].yPos, object.xPos, object.yPos);
    if (minDistance > distance) {
      minDistance = distance;
      target = objects[i];
    }
  }
  if (object.type === types.SHIP) { object.flame = {back: false, left: false, right: false}; };
  if (target === {}) { return; }
  let dir = getDir(target.xPos, target.yPos, object.xPos, object.yPos);
  let speed = ((minDistance > target.size*10) || object.type === types.BULLET) ? moveSpeed*0.7 : getDistance(target.xVel, target.yVel, object.xVel, object.yVel);
  let diff = dir - object.dir;
  if (Math.abs(diff) > PI) { diff-= Math.sign(diff)*2*PI; }
  spin(object, diff/(2*PI));
  accelerate(object, speed);
  if (object.type === types.SHIP) {
    object.flame.back = true;
    diff > 0 ? object.flame.right = true : object.flame.left = true;
    if (minDistance < height/2 && object.bulletWait === 0) {fireBullet(object, false); }
    if (minDistance < height/2 && object.missileWait === 0) {fireBullet(object, true); }
  }
}