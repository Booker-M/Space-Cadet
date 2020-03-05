const context = new window.AudioContext();
const types = { SHIP: 'Ship', PLANET: 'Planet', BULLET: 'Bullet'};
let ship = {};
const moveSpeed = 0.25,
      rotateSpeed = 0.4;
const totalStars = 200,
      totalPlanets = 6,
      totalShips = 7,
      totalBullets = 100;
let bounds;
let maxPlanetSize,
    minPlanetSize;
let flameSize = 5;
let flameGrow = true;
let stars = [];
let objects = [];
let bulletWait = 12,
    missileWait = 24*15;

const music = [
  new Audio('http://soundimage.org/wp-content/uploads/2016/11/Automation.mp3')
];
var startTime,
    elapsedTime = Number.MAX_SAFE_INTEGER;
let trackLength = 0.0;

const sounds = { //https://freesound.org/people/ProjectsU012/packs/18837/?page=3#sound
  SHOOT: new Audio('https://freesound.org/data/previews/459/459145_6142149-lq.mp3'),
  EXPLODE: new Audio('https://audiosoundclips.com/wp-content/uploads/2019/10/8-Bit-SFX_Explosion-2.mp3'),
  MISSILE: new Audio('https://freesound.org/data/previews/404/404754_140737-lq.mp3')
};

function setup() {
  createCanvas(windowWidth - 20, windowHeight - 20);
  adjustSizes();
  noStroke();
  rectMode(CENTER);
  reset();
}

function reset() {
  startTime = new Date();
  ship = {type: types.SHIP, xPos: 0, yPos: 0, dir: 0, xVel: 0, yVel: 0, dVel: 0, friction: 0.996, spinFriction: 0.97, maxSpeed: 10, maxRotation: 10, size: height/16, color: randomColor(), end: false, bulletWait: 0, missileWait: 0, flame: {back: false, left: false, right: false}, kills: 0};
  stars = [];
  objects = [ship];
  generateStars();
  generatePlanets();
  generateShips();
}

function windowResized() {
  resizeCanvas(windowWidth - 20, windowHeight - 20);
  adjustSizes();
}

function adjustSizes() {
  bounds = width*5;
  maxPlanetSize = height;
  minPlanetSize = height/5;
}

function playSound(sound, object) {
  distance = getDistance(object, ship);
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
  flameFlicker();
  for (let i = 0; i < objects.length; i++) {
    if (objects[i].type !== types.PLANET) {
      move(objects[i]);
      trackTarget(objects[i]);
    }
    if (outOfBounds(objects[i])) { fix(i); }
    if (objects[i].type === types.BULLET && !objects[i].missile && parseInt(getSpeed(objects[i])) === 0) { objects[i].end = true; }
    if (objects[i].end === true && endObject(i)) { i--; continue; }
    if (objects[i].type === types.SHIP) { cooldown(objects[i]); }
    for (let j = i + 1; j < objects.length; j++) {
      if (collision(objects[i], objects[j])) { collide(objects[i], objects[j]); }
      calcGravity(objects[i], objects[j]);
      lockTarget(objects[i], objects[j]);
      lockTarget(objects[j], objects[i]);
    }
    drawObject(objects[i]);
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

function playMusic() {
  elapsedTime = new Date();
  var timeDiff = elapsedTime - startTime;
  if (timeDiff > trackLength) {
    let i = parseInt(Math.random()*music.length);
    trackLength = music[i].duration;
    music[i].play();
    startTime = new Date();
  }
}

function move(object) {
  object.dVel = object.dVel * object.spinFriction;
  object.xVel = object.xVel * object.friction;
  object.yVel = object.yVel * object.friction;
  object.dir += radians(object.dVel);
  if (Math.abs(object.dir) > PI) { object.dir -= Math.sign(object.dir)*2*PI; }
  object.xPos += object.xVel;
  object.yPos += object.yVel;
}

function drawObject(object) {
  resetMatrix();
  if (offScreen(object)) { drawArrow(object); return; }
  let x = object.xPos - ship.xPos + width/2,
      y = object.yPos - ship.yPos + height/2;
  translate(x, y);
  rotate(object.dir);
  switch (object.type) {
    case types.SHIP: drawShip(object); break;
    case types.PLANET: drawPlanet(object); break;
    case types.BULLET: drawBullet(object); break;
  }
}

function accelerate(object, amount, dir = object.dir) {
  if (typeof(object.explosion) !== "undefined") { return; }
  object.xVel += Math.cos(dir)*amount;
  object.yVel += Math.sin(dir)*amount;
  let speed = getSpeed(object);
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

function outOfBounds(object) {
  return (object.xPos > bounds + ship.xPos + object.size/2 || object.xPos < -bounds + ship.xPos - object.size/2 || object.yPos > bounds + ship.yPos + object.size/2 || object.yPos < -bounds + ship.yPos - object.size/2);
}

function offScreen(object) {
  return (object.xPos > width/2 + ship.xPos + object.size/2 || object.xPos < -width/2 + ship.xPos - object.size/2 || object.yPos > height/2 + ship.yPos + object.size/2 || object.yPos < -height/2 + ship.yPos - object.size/2);
}

function getDistance(a, b) {
  return Math.sqrt(Math.pow(a.xPos - b.xPos, 2) + Math.pow(a.yPos - b.yPos, 2));
}

function getSpeed(a, b) {
  return Math.sqrt(Math.pow(a.xVel, 2) + Math.pow(a.yVel, 2));
}

function getDir(a, b) {
  return Math.atan2(a.yPos - b.yPos, a.xPos - b.xPos);
}

function getVelDir(a) {
  return Math.atan2(a.yVel, a.xVel);
}

function collision(a, b) {
  return getDistance(a, b) < a.size/2 + b.size/2;
}

function fix(i) {
  if (objects[i] === ship) { return; }
  if (objects[i].type === types.PLANET) { objects[i] = genPlanet(); }
  else { objects[i].end = true; }
}

function collide(a, b) {
  let both = [a, b];
  for (i = 0; i < 2; i++) {
    if (both[i].type !== types.PLANET && both[i===0?1:0].type === types.PLANET) {
      both[i].xVel = 0;
      both[i].yVel = 0;
      both[i].dVel = 0;
    }
  }
  if (a.end || b.end) { return; }
  for (i = 0; i < 2; i++) {
    if (both[i].type !== types.PLANET) {
      if (both[i].type === types.BULLET && both[i===0?1:0].type === types.SHIP) {
        both[i].parent.kills++;
      }
      both[i].end = true;
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

function cooldown(object) {
  if (object.type !== types.SHIP) { return; }
  if (object.bulletWait > 0) { object.bulletWait--; }
  if (object.missileWait > 0) { object.missileWait--; }
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
}

function flameFlicker() {
  if (flameGrow) {
      flameSize += 0.05;
      if (flameSize >= 10) {
        flameGrow = false;
      }
    } else {
      flameSize -= 0.05;
      if (flameSize <= 5) {
        flameGrow = true;
      }
    }
}

function drawExplosion(object) {
  fill(200, 0, 0, 255*((object.size*2-object.explosion)/(object.size*2)+0.5));
  ellipse(0, 0, object.explosion);
}

function drawArrow(object) {
  if (object.type !== types.PLANET && object.type !== types.SHIP) { return; }
  a = getArrow(object);
  fill(object.color[0], object.color[1], object.color[2], 255*(bounds-getDistance(ship, object))/bounds);
  translate(a.xPos, a.yPos);
  rotate(a.dir);
  if ( object.type === types.SHIP) { triangle(10, 10, 10, -10, -10, 0); }
  if ( object.type === types.PLANET) { ellipse(0, 0, 20); }
}

function getArrow(object) {
  let a = {xPos: object.xPos, yPos: object.yPos, dir: 0};
  if (a.xPos > width/2 - 20 + ship.xPos) { a.xPos = width - 20; }
  else if (a.xPos < -width/2 + 20 + ship.xPos) { a.xPos = 20; }
  else { a.xPos += -ship.xPos + width/2; }
  if (a.yPos > height/2 - 20 + ship.yPos) { a.yPos = height - 20; }
  else if (a.yPos < -height/2 + 20 + ship.yPos) { a.yPos = 20; }
  else { a.yPos += -ship.yPos + height/2; }
  a.dir = getDir(ship, object);
  return a;
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
  let size = Math.random() * (maxPlanetSize-minPlanetSize) + minPlanetSize;
  let x = Math.sign(Math.random()-0.5) * (Math.random()*bounds + (width + size)*xOrY)/2 + ship.xPos;
  let y = Math.sign(Math.random()-0.5) * (Math.random()*bounds + (height + size)*(1-xOrY))/2 + ship.yPos;
  let newPlanet = {type: types.PLANET, xPos: x, yPos: y, dir: 0, xVel: 0, yVel: 0, dVel: 0, friction: 0, spinFriction: 0, maxSpeed: 0, maxRotation: 0, size: size, color: randomColor(), end: false};
  for (let i = 0; i < objects.length; i++) {
    if (collision(newPlanet, objects[i])) { return genPlanet(); }
  }
  return newPlanet;
}

function drawPlanet(object) {
  fill(object.color);
  ellipse(0, 0, object.size);
}

function calcGravity(a, b) {
  if (a.type === types.PLANET && b.type === types.PLANET) { return; }
  if (a.type !== types.PLANET) {
    if (b.type === types.PLANET) { temp = a; a = b; b = temp; }
    else { return; }
  }
  let distance = getDistance(a, b);
  if (distance < a.size*3) {
    let gravity = (a.size/6)/(distance + a.size);
    let direction = getDir(a, b);
    accelerate(b, gravity, direction);
    let velDir = getVelDir(b);
    let diff = velDir - b.dir;
    if (Math.abs(diff) > PI) { diff-= Math.sign(diff)*2*PI; }
    spin(b, diff*gravity*5/PI);
  }
}

function fireBullet(object, missile) {
  let speed = 13;
  if (missile) {
    let size = height/35;
    playSound(sounds.MISSILE, object);
    object.missileWait = object === ship ? missileWait : missileWait*2;
    objects.push({type: types.BULLET, xPos: object.xPos + Math.cos(object.dir)*size*4, yPos: object.yPos + Math.sin(object.dir)*size*4, dir: object.dir, xVel: object.xVel + Math.cos(object.dir)*speed, yVel: object.yVel + Math.sin(object.dir)*speed, dVel: 0, friction: ship.friction, spinFriction: ship.spinFriction, maxSpeed: ship.maxSpeed, maxRotation: ship.maxRotation, size: size, color: "red", end: false, missile: true, parent: object, target: null});
  } else {
    let size = height/70;
    playSound(sounds.SHOOT, object);
    object.bulletWait = object === ship ? bulletWait : bulletWait*4;
    objects.push({type: types.BULLET, xPos: object.xPos + Math.cos(object.dir)*size*6, yPos: object.yPos + Math.sin(object.dir)*size*6, dir: object.dir, xVel: object.xVel + Math.cos(object.dir)*speed, yVel: object.yVel + Math.sin(object.dir)*speed, dVel: 0, friction: 0.998, spinFriction: ship.spinFriction, maxSpeed: 40, maxRotation: 25, size: size, color: "cyan", end: false, missile: false, parent: object});
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
    let x = Math.sign(Math.random()-0.5) * (Math.random()*bounds + (width + size)*xOrY)/2 + ship.xPos;
  let y = Math.sign(Math.random()-0.5) * (Math.random()*bounds + (height + size)*(1-xOrY))/2 + ship.yPos;
  let newShip = {type: types.SHIP, xPos: x, yPos: y, dir: 0, xVel: 0, yVel: 0, dVel: 0, friction: ship.friction, spinFriction: ship.spinFriction, maxSpeed: ship.maxSpeed, maxRotation: ship.maxRotation, size: size, color: randomColor(), end: false, bulletWait: 0, missileWait: 0, flame: {back: false, left: false, right: false}, kills: 0, target: null};
  for (let i = 0; i < objects.length; i++) {
    if (collision(newShip, objects[i])) { return genShip(); }
  }
  return newShip;
}

function lockTarget(a, b) {
  if ((a.type !== types.SHIP || a === ship) && (a.type !== types.BULLET || !a.missile || a.parent === b)) { return; }
  if (a.target != null) {
    if (a.target === b) { return; }
    let distance = getDistance(a, b);
    if (distance >= a.size*4 + getDistance(a, a.target)) { return; }
  }
  let direction = getDir(b, a);
  let diff = direction - a.dir;
  if (Math.abs(diff) > PI) { diff-= Math.sign(diff)*2*PI; }
  if (diff < PI/2) { a.target = b; }
  // a.target = ship;
}

function trackTarget(object) {
  if (((object.type !== types.SHIP || object === ship) && (object.type !== types.BULLET || !object.missile)) || object.target == null) { return; }
  if (object.type === types.SHIP) { object.flame = {back: false, left: false, right: false}; };
  let direction = getDir(object.target, object);
  let distance = getDistance(object, object.target);
  let diff = direction - object.dir;
  if (Math.abs(diff) > PI) { diff-= Math.sign(diff)*2*PI; }
  spin(object, diff/(PI));
  let speedDiff = Math.max(0, getSpeed(object.target) - getSpeed(object));
  let speed = ((distance > object.target.size*10) || object.type === types.BULLET) ? moveSpeed*0.6 : Math.min(moveSpeed*0.3, speedDiff + 0.1);
  accelerate(object, speed, direction);
  if (object.type === types.SHIP) {
    object.flame.back = true;
    diff > 0 ? object.flame.right = true : object.flame.left = true;
    if (distance < height/2) {
      if (object.missileWait === 0) { fireBullet(object, true); }
      else if (object.bulletWait === 0 && object.missile < missileWait*0.95) { fireBullet(object, false); }
    }
  }
}
