const context = new window.AudioContext();
const types = { SHIP: 'Ship', PLANET: 'Planet', BULLET: 'Bullet'};
let ship = {};
const moveSpeed = 0.25,
      rotateSpeed = 0.4,
      boostSpeed = 12;
const totalStars = 200,
      totalPlanets = 6,
      totalShips = 7;
let bounds;
let maxPlanetSize,
    minPlanetSize;
let flameSize = 5;
let flameGrow = true;
let stars = [];
let objects = [];
let bulletWait = 250,
    missileWait = 250*15,
    boostWait = 250*15;

let lastKey = {up: false, down: false, left: false, right: false, bullet: false};
let lastKeyTime = {up: 0, down: 0, left: 0, right: 0, bullet: 0};
let delta = 150;

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
  ship = {type: types.SHIP, xPos: 0, yPos: 0, dir: 0, xVel: 0, yVel: 0, dVel: 0, friction: 0.996, spinFriction: 0.97, maxSpeed: 10, maxRotation: 10, size: height/16, color: randomColor(), end: false, wait: {bullet: new Date(), missile: new Date(), boost: new Date()}, flame: {back: false, left: false, right: false}, kills: 0};
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
  if (distance < bounds/2) {
    sound.volume = (bounds/2-distance)/(bounds/2);
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
    let thisKeyTime = new Date();
    if (thisKeyTime - lastKeyTime.up <= delta && !lastKey.up) {
      if (thisKeyTime - ship.wait.boost >= boostWait) {
        accelerate(ship, boostSpeed, ship.dir);
        ship.wait.boost = new Date();
      }
      thisKeyTime = 0;
      lastKeyTime.up = thisKeyTime;
    } else {
      accelerate(ship, moveSpeed);
    ship.flame.back = true;
      lastKeyTime.up = thisKeyTime;
    }
    lastKey.up = true;
  } else {
    ship.flame.back = false;
    lastKey.up = false;
  }
  if (keyIsDown(DOWN_ARROW) || keyIsDown(83)) {
    accelerate(ship, -0.1);
    lastKey.down = true;
  } else {
    lastKey.down = false;
  }
  if (keyIsDown(LEFT_ARROW) || keyIsDown(65)) {
    let thisKeyTime = new Date();
    if (thisKeyTime - lastKeyTime.left <= delta && !lastKey.left) {
      if (thisKeyTime - ship.wait.boost >= boostWait) {
        accelerate(ship, boostSpeed, ship.dir-PI/2.5);
        ship.wait.boost = new Date();
      }
      thisKeyTime = 0;
      lastKeyTime.left = thisKeyTime;
    } else {
      spin(ship, -rotateSpeed);
      ship.flame.left = true;
      lastKeyTime.left = thisKeyTime;
    }
    lastKey.left = true;
  } else {
    ship.flame.left = false;
    lastKey.left = false;
  }
  if (keyIsDown(RIGHT_ARROW) || keyIsDown(68)) {
    let thisKeyTime = new Date();
    if (thisKeyTime - lastKeyTime.right <= delta && !lastKey.right) {
      if (thisKeyTime - ship.wait.boost >= boostWait) {
        accelerate(ship, boostSpeed, ship.dir+PI/2.5);
        ship.wait.boost = new Date();
      }
      thisKeyTime = 0;
      lastKeyTime.right = thisKeyTime;
    } else {
      spin(ship, rotateSpeed);
      ship.flame.right = true;
      lastKeyTime.right = thisKeyTime;
    }
    lastKey.right = true;
  } else {
    ship.flame.right = false;
    lastKey.right = false;
  }
  if ((keyIsDown(32) || keyIsDown(85))) {
    let thisKeyTime = new Date();
    if (thisKeyTime - lastKeyTime.bullet <= delta && !lastKey.bullet) {
      if (thisKeyTime - ship.wait.missile >= missileWait) { fireBullet(ship, true); }
      thisKeyTime = 0;
      lastKeyTime.bullet = thisKeyTime;
    } else if (thisKeyTime - lastKeyTime.bullet > delta && lastKey.bullet) {
      if (thisKeyTime - ship.wait.bullet >= bulletWait) { fireBullet(ship, false); }
      lastKeyTime.bullet = thisKeyTime;
    }
    lastKey.bullet = true;
  } else {
    lastKey.bullet = false;
  }
  // if (ship.wait.missile === 0 && (keyIsDown(73) || keyIsDown(86))) {
  //   fireBullet(ship, true);
  // }
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
  translate(40,31);
  rotate(-PI/5);
  triangle(s/2, -s/4, s/2, s/4, s, 0);
  fill(200);
  rect(0, 0, s, s/2);
  
  resetMatrix();
  fill(100);
  rect(135, 30, 150, 10);
  fill("red");
  let length = (Math.min(1, ((new Date() - ship.wait.missile)/missileWait)))*150;
  rect(60 + length/2, 30, length, 10);
  
  fill("cyan");
  triangle(32, 53, 32, 68, 42, 60);
  triangle(32+10, 53, 32+10, 68, 42+10, 60);
  
  fill(100);
  rect(135, 60, 150, 10);
  fill("cyan");
  length = (Math.min(1, ((new Date() - ship.wait.boost)/boostWait)))*150;
  rect(60 + length/2, 60, length, 10);
  
  fill("white")
  textSize(32);
  text(ship.kills, width - 50 - (ship.kills > 9 ? parseInt(ship.kills/10).toString().length*16 : 0), 50);
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
  if (Math.abs(dir) > PI) { dir-= Math.sign(dir)*2*PI; }
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
      flameSize += 0.5;
      if (flameSize >= 10) {
        flameGrow = false;
      }
    } else {
      flameSize -= 0.5;
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
  object.wait.bullet = new Date();
  if (missile) {
    let size = height/35;
    playSound(sounds.MISSILE, object);
    object.wait.missile = new Date();
    objects.push({type: types.BULLET, xPos: object.xPos + Math.cos(object.dir)*size*4, yPos: object.yPos + Math.sin(object.dir)*size*4, dir: object.dir, xVel: object.xVel + Math.cos(object.dir)*speed, yVel: object.yVel + Math.sin(object.dir)*speed, dVel: 0, friction: ship.friction, spinFriction: ship.spinFriction, maxSpeed: ship.maxSpeed, maxRotation: ship.maxRotation, size: size, color: "red", end: false, missile: true, parent: object, target: null});
  } else {
    let size = height/70;
    playSound(sounds.SHOOT, object);
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
  let newShip = {type: types.SHIP, xPos: x, yPos: y, dir: 0, xVel: 0, yVel: 0, dVel: 0, friction: ship.friction, spinFriction: ship.spinFriction, maxSpeed: ship.maxSpeed, maxRotation: ship.maxRotation, size: size, color: randomColor(), end: false, wait: {bullet: new Date(), missile: new Date(), boost: new Date()}, flame: {back: false, left: false, right: false}, kills: 0, target: null};
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
  let speed = ((distance > object.target.size*10) || object.type === types.BULLET) ? moveSpeed*0.6 : Math.min(moveSpeed*0.3, speedDiff + 0);
  accelerate(object, speed, direction);
  if (object.type === types.SHIP) {
    object.flame.back = true;
    diff > 0 ? object.flame.right = true : object.flame.left = true;
    if (distance < height/2) {
      currentTime = new Date();
      if (currentTime - object.wait.missile >= missileWait*2) { fireBullet(object, true); }
      else if (currentTime - object.wait.bullet >= bulletWait*2 && currentTime - object.wait.missile >= missileWait*2*0.05) { fireBullet(object, false); }
    }
  }
}
