//VARIABLES

let newGame = true; //true
let gameStart, deathTime, waveTime, currentTime;
let bounds;
const types = { STAR: 'Star', SHIP: 'Ship', PLANET: 'Planet', BULLET: 'Bullet', DEBRIS: 'Debris', LOOT: 'Loot', Effect: 'Effect'};
const effects = { BLUR: 'Blur', SMOKE: 'Smoke', EXPLOSION: 'Explosion'};
const planetStyles = ['Crater', 'Gas'];
let ship = {}, multiplier;
const moveSpeed = 0.25, rotateSpeed = 0.3, boostSpeed = 10, friction = 0.996, spinFriction = 0.97, bulletSpeed = 13, maxSpeed = 10, maxRotation = 10, gravSize = 3, gravConstant = 1/8, teamAttack = false;
const totalStars = 400, starLayers = 10, totalPlanets = 6, totalLoot = 3;
let maxPlanetSize, minPlanetSize, shadeAngle;
let flameSize = 5, flameGrow = true;
let stars = [], objects = [];
let allies = 0, enemies = 0, wave = 0; //wave = 0
const textTime = 1000*5, boostTime = 1000, shieldTime = 1000*15, missileTime = 1000*15, hitTime = 1000*3;
const bulletWait = 1000/4, missileWait = 1000*4, boostWait = 1000*4, CPUwait = 4, CPUgap = 8;

let lastKey = {up: false, down: false, left: false, right: false, bullet: false};
let lastKeyTime = {up: 0, down: 0, left: 0, right: 0, bullet: 0};
const delta = 150;

let musicStart, trackLength;
const music = [
  new Audio('https://soundimage.org/wp-content/uploads/2016/11/Automation.mp3')
];
const sounds = {
  SHOOT: new Audio('https://freesound.org/data/previews/459/459145_6142149-lq.mp3'),
  EXPLODE: new Audio('https://audiosoundclips.com/wp-content/uploads/2019/10/8-Bit-SFX_Explosion-2.mp3'),
  MISSILE: new Audio('https://freesound.org/data/previews/404/404754_140737-lq.mp3'),
  BOOST: new Audio('https://freesound.org/data/previews/340/340956_5858296-lq.mp3'),
  HIT: new Audio('https://freesound.org/data/previews/386/386862_6891102-lq.mp3'),
  SHIELD: new Audio('https://freesound.org/data/previews/397/397766_3905081-lq.mp3'),
  SHIELDHIT: new Audio('https://freesound.org/data/previews/221/221418_3905081-lq.mp3'),
  LIFE: new Audio('https://freesound.org/data/previews/397/397743_3905081-lq.mp3'),
  VICTORY: new Audio('https://freesound.org/data/previews/138/138485_758593-lq.mp3'),
  LOSE: new Audio('https://freesound.org/data/previews/362/362012_3905081-lq.mp3')
};

//SETUP FUNCTIONS

function setup() {
  noStroke();
  rectMode(CENTER);
  createCanvas(Math.max(windowWidth - 20, 480), Math.max(windowHeight - 20, 320));
  adjustSizes();
  reset();
}

function adjustSizes() {
  bounds = 480*8 + width*2;
  maxPlanetSize = width;
  minPlanetSize = width/4;
  multiplier = width/960;
  ship.size = width/30;
}

function reset() {
  gameStart = new Date();
  musicStart = new Date();
  trackLength = -1
  allies = 0, enemies = 0;
  shadeAngle = PI+PI/5;
  ship = {type: types.SHIP, xPos: 0, yPos: 0, dir: 0, xVel: 0, yVel: 0, dVel: 0, friction: friction, spinFriction: spinFriction, maxSpeed: maxSpeed, maxRotation: maxRotation, size: ship.size, color: randomColor(), end: false, wait: {bullet: new Date(), missile: new Date(), boost: new Date()}, time: {boost: null, shield: null, hit: new Date()}, flame: {back: false, left: false, right: false}, kills: 0, team: 1, lives: 3};
  objects = [ship];
  generateStars();
  if (!newGame) { generation(); }
}

function generation() {
  generatePlanets();
  generateLoot();
  wave--;
  newWave();
}

function playSound(sound, object) {
  distance = Math.max(0, getDistance(object, ship));
  if (distance < bounds/2) {
    sound.volume = (bounds/2-distance)/(bounds/2);
    sound.play();
  }
}

function playMusic() {
  let timeDiff = currentTime - musicStart;
  if (timeDiff > trackLength) {
    let i = parseInt(Math.random()*music.length);
    trackLength = music[i].duration;
    music[i].play();
    musicStart = new Date();
  }
}

function randomColor() {
  let min = [0,0,0];
  min[parseInt(Math.random()*3)] = 50;
  return [min[0]+Math.random()*200, min[1]+Math.random()*200, min[2]+Math.random()*200];
}

function newWave() {
  playSound(sounds.VICTORY, ship);
  wave++;
  let totalShips = 1 + 2 * wave;
  let teams = totalShips - 1;
  while (totalShips % teams !== 0) { teams--; }
  if (teams === 1) { teams = totalShips; }
  let teamSize = totalShips/teams;
  for (t = 1; t <= teams; t++) {
    generateShips(teamSize - (t===ship.team ? 1 : 0), t, t===ship.team ? ship.color : randomColor());
  }
  waveTime = new Date();
}

//MAIN LOOP

function draw() {
  currentTime = new Date();
  background('black');
  keys();
  refresh();
  drawUI();
  playMusic();
}

//CONTROLS

function keys() {
  if (ship.lives === 0) {
    if(keyIsDown(keyCode) && new Date() - deathTime > 500) { reset(); }
    return;
  }
  if (keyIsDown(UP_ARROW) || keyIsDown(87)) {
    if (currentTime - lastKeyTime.up <= delta && !lastKey.up) {
      if (currentTime - ship.wait.boost >= boostWait) { boost(ship, 'Up'); }
      currentTime = 0;
      lastKeyTime.up = currentTime;
    } else {
      accelerate(ship, moveSpeed);
    ship.flame.back = true;
      lastKeyTime.up = currentTime;
    }
    lastKey.up = true;
  } else {
    ship.flame.back = false;
    lastKey.up = false;
  }
  if (keyIsDown(LEFT_ARROW) || keyIsDown(65)) {
    if (currentTime - lastKeyTime.left <= delta && !lastKey.left) {
      if (currentTime - ship.wait.boost >= boostWait) { boost(ship, 'Left'); }
      currentTime = 0;
      lastKeyTime.left = currentTime;
    } else {
      spin(ship, -rotateSpeed);
      ship.flame.left = true;
      lastKeyTime.left = currentTime;
    }
    lastKey.left = true;
  } else {
    ship.flame.left = false;
    lastKey.left = false;
  }
  if (keyIsDown(RIGHT_ARROW) || keyIsDown(68)) {
    if (currentTime - lastKeyTime.right <= delta && !lastKey.right) {
      if (currentTime - ship.wait.boost >= boostWait) { boost(ship, 'Right'); }
      currentTime = 0;
      lastKeyTime.right = currentTime;
    } else {
      spin(ship, rotateSpeed);
      ship.flame.right = true;
      lastKeyTime.right = currentTime;
    }
    lastKey.right = true;
  } else {
    ship.flame.right = false;
    lastKey.right = false;
  }
  if ((keyIsDown(32) || keyIsDown(73))) {
    if (currentTime - lastKeyTime.bullet <= delta && !lastKey.bullet) {
      if (currentTime - ship.wait.missile >= missileWait) { fireBullet(ship, true); }
      currentTime = 0;
      lastKeyTime.bullet = currentTime;
    } else if (currentTime - lastKeyTime.bullet > delta && lastKey.bullet) {
      if (currentTime - ship.wait.bullet >= bulletWait) { fireBullet(ship, false); }
      lastKeyTime.bullet = currentTime;
    }
    lastKey.bullet = true;
  } else {
    lastKey.bullet = false;
  }
  if (keyIsDown(90)) {
    if (currentTime - gameStart > 500) { reset(); }
  }
}

//REFRESH OBJECTS

function refresh() {
  if (!newGame && ship.lives > 0 && enemies === 0) { newWave(); }
  drawStars();
  flameFlicker();
  for (let i = 0; i < objects.length; i++) {
    if (objects[i] === ship && ship.lives === 0) { continue; }
    if (objects[i].type === types.SHIP || objects[i].type === types.BULLET || objects[i].type === types.DEBRIS) {
      move(objects[i]);
      trackTarget(objects[i]);
    }
    if (outOfBounds(objects[i])) { fix(i); }
    checkSpeed(objects[i]);
    adjust(objects[i]);
    if (objects[i].end === true && endObject(i)) { i--; continue; }
    for (let j = i + 1; j < objects.length; j++) {
      if (collision(objects[i], objects[j])) { collide(objects[i], objects[j]); }
      calcGravity(objects[i], objects[j]);
      lockTarget(objects[i], objects[j]);
      lockTarget(objects[j], objects[i]);
      if (objects[j].end === true && endObject(j)) { j--; continue; }
    }
    drawObject(objects[i]);
  }
}

//UI

function drawUI() {
  resetMatrix();
  fill('red');
  let s = 15;
  translate(40,40);
  rotate(-PI/5);
  triangle(s/2, -s/4, s/2, s/4, s, 0);
  fill(200);
  rect(0, 0, s, s/2);
  
  resetMatrix();
  translate(0,10);
  fill(100);
  rect(135, 30, 150, 10);
  fill('red');
  let length = (Math.min(1, ((new Date() - ship.wait.missile)/missileWait)))*150;
  rect(60 + length/2, 30, length, 10);
  
  fill(0, 150, 255);
  triangle(32, 53, 32, 68, 42, 60);
  triangle(32+10, 53, 32+10, 68, 42+10, 60);
  
  fill(100);
  rect(135, 60, 150, 10);
  fill(0, 150, 255);
  length = (Math.min(1, ((new Date() - ship.wait.boost)/boostWait)))*150;
  rect(60 + length/2, 60, length, 10);
  
  hearts();
  
  if (ship.lives === 0) { writeText(255, 255, 255, Math.min(new Date()-deathTime, 255), 'You died on ' + (wave === 0 ? 'the tutorial' : 'wave ' + wave) + '. You had ' + ship.kills + ' kill' + (ship.kills === 1 ? '' : 's') +'. Press any key to restart.'); }
  else if (newGame) { tutorial(); }
  else {
    let gap = currentTime - waveTime;
    if (gap < textTime) { writeText(255, 255, 255, Math.min(gap, textTime - gap), 'Wave ' + wave + ': Defeat ' + enemies + ' enemies.'); }
  }
  if (!newGame) { shipCount(); }
}

function writeTitle(a) {
  resetMatrix();
  textFont('Consolas');
  textStyle(BOLD);
  textSize(width/10);
  fill(200, a);
  textAlign(RIGHT, CENTER);
  text('Space', width/2-10, height/3);
  fill(ship.color[0], ship.color[1], ship.color[2], a);
  textAlign(LEFT, CENTER);
  text('Cadet', width/2+10, height/3);
}

function writeText(a, b, c, d, string) {
  resetMatrix();
  textFont('Consolas');
  textStyle(BOLD);
  textSize(Math.min(width/40, 30));
  fill(a, b, c, d);
  textAlign(CENTER, CENTER);
  text(string, width/2-10, ship.lives === 0 ? height/2 : height/3);
}

function hearts() {
  resetMatrix();
  fill(200,0,0);
  let s = 12;
  translate(40 + s/2, 95);
  for (i = 0; i < ship.lives; i++) {
    ellipse(-s/2*0.9, s/2, s);
    ellipse(s/2*0.9, s/2, s);
    triangle(-s*0.92, s*0.72, s*0.92, s*0.72, 0, s*1.6);
    translate(2.5*s, 0);
  }
}

function shipCount() {
  resetMatrix();
  fill('white');
  textFont('Consolas');
  textSize(Math.min(width/50, 25));
  textAlign(RIGHT);
  text("Enemies: " + enemies, width - 40, 40);
  if (allies > 0) { text("Allies: " + allies, width - 40, 40 + 1.5*Math.min(width/50, 25)); }
}

function tutorial() {
  let gap = currentTime - gameStart;
  if (gap < textTime) {
    writeTitle(Math.min(gap, textTime - gap));
  } else if (gap < textTime*2) {
    writeText(255, 255, 255, Math.min(gap, textTime*2 - gap), 'Press [↑] or [W] to accelerate and [←] [→] or [A] [D] to rotate');
  } else if (gap < textTime*3) {
    writeText(255, 255, 255, Math.min(gap, textTime*3 - gap), 'Press [Space] or [I] to shoot');
  } else if (gap < textTime*4) {
    writeText(255, 255, 255, Math.min(gap, textTime*4 - gap), 'Double-tap [↑] [←] [→] or [W] [A] [D] to boost');
  } else if (gap < textTime*5) {
    writeText(255, 255, 255, Math.min(gap, textTime*5 - gap), 'Double-tap [Space] or [I] to fire a missile');
  } else if (gap < textTime*6) {
    writeText(255, 255, 255, Math.min(gap, textTime*6 - gap), 'Defeat enemies, collect shields, and avoid planets');
  } else {
    newGame = false;
    generation();
  }
}

//OBJECT FUNCTIONS

function move(object) {
  object.dVel = object.dVel * object.spinFriction;
  object.xVel = object.xVel * object.friction;
  object.yVel = object.yVel * object.friction;
  object.dir += radians(object.dVel);
  object.dir = checkDir(object.dir);
  object.xPos += object.xVel * multiplier;
  object.yPos += object.yVel * multiplier;
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
    case types.DEBRIS: drawDebris(object); break;
    case types.EFFECT: switch (object.effect) {
        case effects.BLUR: drawBlur(object); break;
        case effects.SMOKE: drawSmoke(object); break;
        case effects.EXPLOSION: drawExplosion(object); break;
    }; break;
    case types.LOOT: drawLoot(object); break;
    case types.STAR: drawStar(object); break;
  }
}

function accelerate(object, amount, dir = object.dir) {
  dir = checkDir(dir);
  object.xVel += Math.cos(dir)*amount;
  object.yVel += Math.sin(dir)*amount;
  let speed = getSpeed(object);
  if (speed > object.maxSpeed) {
    object.xVel -= (object.xVel/speed)*(speed - object.maxSpeed);
    object.yVel -= (object.yVel/speed)*(speed - object.maxSpeed);
  }
}

function spin(object, amount) {
  object.dVel += amount;
  if (Math.abs(object.dVel) > object.maxRotation) {
    object.dVel = Math.sign(object.dVel)*object.maxRotation;
  }
}

function outOfBounds(object) {
  return (object.xPos > bounds + ship.xPos + object.size/2 || object.xPos < -bounds + ship.xPos - object.size/2 || object.yPos > bounds + ship.yPos + object.size/2 || object.yPos < -bounds + ship.yPos - object.size/2);
}

function offScreen(object) {
  if (object.type === types.PLANET && object.ring) {
    return (object.xPos > width/2 + ship.xPos + object.size || object.xPos < -width/2 + ship.xPos - object.size || object.yPos > height/2 + ship.yPos + object.size/2 || object.yPos < -height/2 + ship.yPos - object.size/2);
  }
  return (object.xPos > width/2 + ship.xPos + object.size/2 || object.xPos < -width/2 + ship.xPos - object.size/2 || object.yPos > height/2 + ship.yPos + object.size/2 || object.yPos < -height/2 + ship.yPos - object.size/2);
}

function regenRange(object) {
  return (object.xPos > width + ship.xPos + object.size/2 || object.xPos < -width + ship.xPos - object.size/2 || object.yPos > height + ship.yPos + object.size/2 || object.yPos < -height + ship.yPos - object.size/2);
}

function getDistance(a, b) {
  return Math.sqrt(Math.pow(a.xPos - b.xPos, 2) + Math.pow(a.yPos - b.yPos, 2)) - a.size/2 - b.size/2;
}

function getGravDistance(a, b) {
  return Math.sqrt(Math.pow(a.xPos - b.xPos, 2) + Math.pow(a.yPos - b.yPos, 2)) - (minGravDistance(a, b));
}

function getGravSize(object) {
  return (object.type === types.PLANET ? gravSize : 1)*object.size;
}

function minGravDistance(a, b) {
  return (getGravSize(a) + getGravSize(b))/2;
}

function getSpeed(object) {
  return Math.sqrt(Math.pow(object.xVel, 2) + Math.pow(object.yVel, 2));
}

function getDir(a, b) {
  return Math.atan2(b.yPos - a.yPos, b.xPos - a.xPos);
}

function getVelDir(a) {
  return Math.atan2(a.yVel, a.xVel);
}

function dirDiff(dir1, dir2) {
  return checkDir(dir1 - dir2);
}

function velDiff(a, b) {
  return (b.xVel*Math.cos(a.dir) + b.yVel*Math.sin(a.dir)) - getSpeed(a);
}

function checkDir(dir) {
  if (Math.abs(dir) > PI) { dir-= Math.sign(dir)*2*PI; }
  return dir;
}

function collision(a, b, checkGrav = false) {
  if (a === b) { return false; }
  if (checkGrav) { return getGravDistance(a, b) <= 0; }
  return getDistance(a, b) <= 0;
}

function inFront(a, b) {
  let direction = getDir(a, b);
  let diff = dirDiff(direction, a.dir);
  return (Math.abs(diff) < PI/2);
}

function directFront(a, b) {
  let direction = getDir(a, b);
  let diff = dirDiff(direction, a.dir);
  return (Math.abs(diff) < PI/5);
}

function onRight(a, b) {
  let direction = getDir(a, b);
  let diff = dirDiff(direction, a.dir);
  return (diff > 0);
}

function fix(i) {
  if (objects[i] === ship) { return; }
  if (objects[i].type === types.SHIP) { genCoords(objects[i]); }
  else { objects[i].end = true; }
}

function checkSpeed(object) {
  if (((object.type === types.BULLET && !object.missile) || object.type === types.DEBRIS) && parseInt(getSpeed(object)) < 3) { object.end = true; }
}

function adjust(object) {
  if (object.type === types.EFFECT) { adjustEffect(object); }
  if (object.type === types.BULLET && object.missile) { adjustMissile(object); }
}

function adjustEffect(object) {
  if (object.fade > 0) {
    object.effect === effects.SMOKE ? object.fade-- : object.fade-= 10;
    if (object.effect === effects.EXPLOSION) { object.size+= 7 }
  }
  else { object.end = true; }
}

function adjustMissile(object) {
  if (currentTime - missileTime > object.time) { object.end = true; }
}

function collide(a, b) {
  if (a.end || b.end || a.type === types.EFFECT || b.type === types.EFFECT) { return; }
  let resultA = bump(a, b);
  let resultB = bump(b, a);
  if (resultA.end) {
    a.end = true;
    if (a.type === types.SHIP) {
      if (b.type === types.SHIP) { b.kills++; }
      if (b.type == types.BULLET && b.parent != null) { b.parent.kills++ }
    }
  }
  if (resultB.end) {
    b.end = true;
    if (b.type === types.SHIP) {
      if (a.type === types.SHIP) { a.kills++; }
      if (a.type == types.BULLET && a.parent != null) { a.parent.kills++ }
    }
  }
  if (resultA.backup || resultB.backup) {
    backup(a, b, true);
    backup(b, a, true);
    let xTemp = b.xVel, yTemp = b.yVel;
    b.xVel = a.xVel*0.5, b.yVel = a.yVel*0.5, a.xVel = xTemp*0.5, a.yVel = yTemp*0.5
  }
  if (resultA.shield) { shield(a, true); }
  if (resultB.shield) { shield(b, true); }
  if (resultA.hit) { a.lastHit = new Date(); }
  if (resultB.hit) { b.lastHit = new Date(); }
}

function bump(a, b) {
  let result = {end: false, shield: false, hit: false, backup: false};
  if (b.type === types.PLANET) {
    a.xVel = 0;
    a.yVel = 0;
    a.dVel = 0;
  }
  if (b.type === types.LOOT || b.type === types.DEBRIS) { return result; }
  if (a.type !== types.PLANET) {
      if (a.type === types.SHIP) {
        if (b.type === types.SHIP) {
          if (!isBoost(b)) {
              if (!isBoost(a)) { result.backup = true; }
              if (isHit(b)) { return result; }
          }
        }
        if (onTeam(a, b)) { return result; }
        if (b.type !== types.PLANET) {
          if (isHit(a) || isBoost(a)) { return result; }
          result.hit = true;
          if (isShield(a)) {
            result.shield = true;
            return result;
          }
        } else if (a.lives > 1) {
          result.hit = true;
          backup(a, b);
        }
        if (a.lives > 1) {
          playSound(sounds.HIT, a);
          a.lives--;
          return result;
        }
      }
    else if (a.type === types.LOOT) { giveLoot(b); }
    else if (a.type === types.DEBRIS) { return result; }
    result.end = true;
    } else if (a.style === "Crater") { makeCrater(a, b); }
  return result;
}

function onTeam(a, b) {
  if (a.type === types.BULLET && b.type === types.SHIP) { return onTeam(b, a); }
  if (a.type !== types.SHIP || (b.type !== types.SHIP && b.type !== types.BULLET)) { return false; }
  return !teamAttack && a.team !== 0 && a.team === (b.type === types.BULLET ? b.parent.team : b.team);
}

function isHit(object) {
  return currentTime - object.time.hit < hitTime;
}

function giveLoot(object) {
  if ((object===ship || object.type===types.BULLET && object.parent===ship) && ship.lives <= 10 && Math.random() < 0.2) {
    playSound(sounds.LIFE, object);
    ship.lives++;
    return;
  }
  if (object.type === types.SHIP) { shield(object); }
  if (object.type === types.BULLET) { shield(object.parent); }
}

function endObject(i) {
  if (objects[i].type === types.SHIP || (objects[i].type === types.BULLET && objects[i].missile) || objects[i].type === types.LOOT) { genExplosion(objects[i]); }
  if (objects[i].type === types.SHIP) {
    objects[i].lives = 0;
    for (let j = 0; j < 10; j++) { genDebris(objects[i]); }
    if (objects[i] === ship) {
      deathTime = new Date();
      playSound(sounds.LOSE, ship);
      return false;
    }
    if (regenRange(objects[i])) {
        genCoords(objects[i]);
        objects[i].end = false;
        return false;
    }
    (objects[i].team === ship.team) ? allies-- : enemies--;
  } else if (objects[i].type === types.LOOT) {
    genCoords(objects[i]);
    objects[i].end = false;
    return false;
  } else if (objects[i].type === types.PLANET) {
    objects[i] = genPlanet();
    return false;
  }
  removeObject(i);
  return true;
}

function removeObject(i) {
  if (objects[i] === ship) { console.log("Tried to remove ship"); return; }
  objects.splice(i, 1);
}

function boost(object, dir) {
  object.xVel = 0;
  object.yVel = 0;
  object.dVel = 0;
  let pivot = (dir === 'Up') ? object.dir : (dir === 'Left') ? object.dir-PI/2 : object.dir+PI/2;
  pivot = checkDir(pivot);
  accelerate(object, boostSpeed, pivot);
  playSound(sounds.BOOST, object);
  object.time.boost = new Date();
  object.wait.boost = new Date();
}

function isBoost(object) {
  return currentTime - object.time.boost < boostTime;
}

function stopBoost(object) {
  object.time.boost -= boostTime;
}

function shield(object, end = false) {
  end ? object.time.shield -= shieldTime : object.time.shield = new Date();
  playSound((end ? sounds.SHIELDHIT : sounds.SHIELD), object);
}

function isShield(object) {
  return currentTime - object.time.shield < shieldTime/(object.type !== ship ? CPUwait : 1);
}

function lockTarget(a, b) {
  if ((a.type !== types.SHIP || a===ship) && (a.type !== types.BULLET || !a.missile || a.parent===b) || (b.parent != null && b.parent === a)) { return; }
  if (a.target != null && ((a.target === ship && ship.lives === 0) || a.target.end || (a.target.type !== types.PLANET && getDistance(a, a.target) > width) || (a.target.type === types.PLANET && getDistance(a, a.target) > a.target.size))) { a.target = (a.type === types.SHIP && ship.lives > 0) ? ship : null; }
  if (b.type !== types.SHIP && b.type !== types.LOOT && (b.type !== types.BULLET || !b.missile) && (b.type !== types.PLANET || a.type === types.BULLET)) { return; }
  let distance = getDistance(a, b);
  if (b.type === types.PLANET) {
    if (a.target != null && a.target.type === types.PLANET) {
      if (distance >= getDistance(a, a.target)) { return; }
    } else if (distance > b.size) { return; }
  } else {
    if (distance > width) { return; }
    if (a.type === types.SHIP) {
      if ((b.type !== types.SHIP || (a.team === 0 || a.team !== b.team)) && inFront(a, b)) { attackTarget(a, b); }
    } else if (a.type === types.BULLET && b.type === types.SHIP && a.parent.team === b.team) { return; }
    if (a.target != null && a.target.type !== types.PLANET) {
      if (a.type === types.SHIP && a.team > 0 && b.type === types.SHIP && a.target === types.SHIP && b.team !== a.target.team && (a.team === b.team || a.team === a.target.team)) {
        if (a.team === b.team) { return; }
      } else if (distance >= getDistance(a, a.target)*1.3) { return; }
    }
  }
  a.target = b;
}

function trackTarget(object) {
  let slow = object.type === types.BULLET ? 0.8 : 0.4;
  let speed = moveSpeed*(object.type === types.BULLET ? 0.9 : slow);
  if ((object.type !== types.SHIP || object === ship) && (object.type !== types.BULLET || !object.missile)) { return; }
  if (object.target == null) {
    accelerate(object, speed, object.dir);
    return;
  }
  object.flame = {back: false, left: false, right: false};
  let direction = getDir(object, object.target);
  if (object.target.type === types.PLANET || (object.type === types.SHIP && object.target.type === types.BULLET)) { direction += !inFront(object, object.target) ? (onRight(object, object.target) ? -PI/3: PI/3) : (directFront(object, object.target) ? PI : (onRight(object, object.target) ? -PI/2 : PI/2)); }
  direction = checkDir(direction);
  let distance = getDistance(object, object.target);
  let diff = dirDiff(direction, object.dir);
  spin(object, diff/(PI));
  if (object.target.type === types.PLANET) {speed = moveSpeed; }
  else if (object.target.type === types.SHIP) {
    let velDifference = velDiff(object, object.target);
    if (distance < object.target.size*CPUgap && object.type !== types.BULLET) { speed = Math.min(speed, Math.max(0, velDifference)); }
  }
  if (speed > 0) {
    object.flame.back = true;
    accelerate(object, speed, direction);
  }
  if (object.type === types.SHIP && Math.abs(diff) > 0.05) {
    diff > 0 ? object.flame.right = true : object.flame.left = true;
  }
}

function attackTarget(a, b) {
  let distance = getDistance(a, b);
  currentTime = new Date();
  if (distance < a.size*CPUgap && currentTime - a.wait.boost >= boostWait*CPUwait) { boost(a, directFront(a, b) ? 'Up' : onRight(a, b) ? 'Right' : 'Left'); }
  else if (distance < width/2) {
    if (currentTime - a.wait.missile >= missileWait*CPUwait) { fireBullet(a, true); }
    else if (currentTime - a.wait.bullet >= bulletWait*CPUwait && currentTime - a.wait.missile >= missileWait*CPUwait*0.1) { fireBullet(a, false); }
  }
}

function calcGravity(a, b) {
  if (a.type === types.PLANET && b.type === types.PLANET) { return; }
  if (a.type !== types.PLANET) {
    if (b.type === types.PLANET) { temp = a; a = b; b = temp; }
    else { return; }
  }
  if (collision(a, b, true)) {
    let gravity = ((minGravDistance(a, b) - getDistance(a, b))/minGravDistance(a, b))*gravConstant;
    let direction = getDir(b, a);
    accelerate(b, gravity, direction);
    let velDir = getVelDir(b);
    let diff = dirDiff(velDir, b.dir);
    spin(b, diff*gravity*4.5/PI);
  }
}

function genCoords(object) {
  let size = object.size;
  let xOrY = parseInt(Math.random()+0.5);
  object.xPos = Math.sign(Math.random()-0.5) * (Math.random()*bounds + (width + getGravSize(object))*xOrY)/2 + ship.xPos;
  object.yPos = Math.sign(Math.random()-0.5) * (Math.random()*bounds + (height + getGravSize(object))*(1-xOrY))/2 + ship.yPos;
  for (i = 0; i < objects.length; i++) {
    if (collision(object, objects[i], true)) { return backup(object, objects[i]); }
  }
  if (object === ship) { generateStars(); }
}

function backup(a, b, both = false, start = 0) {
  if (Math.abs(start) >= 2*PI) { return genCoords(a); }
  let angle = (start === 0) ? getDir(b, a) : checkDir(start);
  let distance = (both ? getGravSize(a) : minGravDistance(a, b)) + 1;
  a.xPos = b.xPos + Math.cos(angle)*distance;
  a.yPos = b.yPos + Math.sin(angle)*distance;
  if (a.type === types.SHIP) {
    if (b.type === types.PLANET) {
      stopBoost(a);
      a.dir = angle, a.xVel = 0, a.yVel = 0, a.dVel = 0;
    }
    else { 
      return;
    }
  }
  for (i = 0; i < objects.length; i++) {
    if (collision(a, objects[i], true)) {
      if (a.type === types.PLANET) { return backup(a, objects[i], false, angle + PI/4); }
      else {
        distance = (minGravDistance(a, b) + minGravDistance(a, objects[i]))/2;
        a.xPos = b.xPos + Math.cos(angle)*distance;
        a.yPos = b.yPos + Math.sin(angle)*distance;
      }
    }
  }
}

//OBJECT INDICATORS

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
  a.dir = getDir(object, ship);
  return a;
}

//STARS

function generateStars() {
  stars = [];
  perLayer = totalStars/starLayers;
  for (i = 0; i < totalStars; i++) {
    stars.push(genStar(1 + parseInt(i/perLayer)));
  }
}

function genStar(layer) {
  size = width/250 + Math.random()*2;
  let xPos = Math.sign(Math.random()-0.5) * (Math.random()*width - size/2)*layer + ship.xPos;
  let yPos = Math.sign(Math.random()-0.5) * (Math.random()*height - size/2)*layer + ship.yPos;
  newStar = {type: types.STAR, xPos: xPos, yPos: yPos, dir: 0, size: size, color: (200), layer: layer};
  return newStar;
}

function genStarCoords(object) {
  let size = object.size;
  let xOrY = parseInt(Math.random()+0.5);
  object.xPos = (Math.sign(Math.random()-0.5) * (Math.random()*width + (width + size)*xOrY)/2)*object.layer + ship.xPos;
  object.yPos = (Math.sign(Math.random()-0.5) * (Math.random()*height + (height + size)*(1-xOrY))/2)*object.layer + ship.yPos;
}

function drawStars() {
  for (i = 0; i < stars.length; i++) {
    stars[i].xPos = (stars[i].xPos-ship.xPos)/stars[i].layer + ship.xPos;
    stars[i].yPos = (stars[i].yPos-ship.yPos)/stars[i].layer + ship.yPos;
    if (regenRange(stars[i])) {
      genStarCoords(stars[i]);
      continue;
    }
    drawObject(stars[i]);
    stars[i].xPos = (stars[i].xPos-ship.xPos)*stars[i].layer + ship.xPos;
    stars[i].yPos = (stars[i].yPos-ship.yPos)*stars[i].layer + ship.yPos;
  }
}

function drawStar(object) {
  let size = object.size;
  fill(object.color, 200);
  ellipse(0, 0, size, size);
}

//SHIPS

function generateShips(number, team, color) {
  for (let i=0; i < number; i++) {
   objects.push(genShip(team, color));
  }
}

function genShip(team = 0, color = randomColor(), lives = 1) {
  let size = ship.size;
  let newShip = {type: types.SHIP, xPos: 0, yPos: 0, dir: 0, xVel: 0, yVel: 0, dVel: 0, friction: friction, spinFriction: spinFriction, maxSpeed: maxSpeed, maxRotation: maxRotation, size: size, color: color, end: false, wait: {bullet: new Date(), missile: new Date(), boost: new Date()}, time: {boost: null, shield: null, hit: new Date()}, flame: {back: false, left: false, right: false}, kills: 0, target: null, team: team, lives: lives};
  genCoords(newShip);
  newShip.dir = getDir(newShip, ship);
 (team === ship.team) ? allies++ : enemies++;
  return newShip;
}

function drawShip(object) {
  if (!isHit(object) || flameGrow === true) {
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
  if (isBoost(object)) { drawBoost(object); }
  else if (isShield(object)) { drawShield(object); }
}

function drawBoost(object) {
  resetMatrix();
  translate(object.xPos - ship.xPos + width/2, object.yPos - ship.yPos + height/2);
  rotate(getVelDir(object));
  fill(0, 160, 255, 110-flameSize);
  let size = object.size;
  ellipse(-10, 0, flameSize + size*2.3, flameSize + size*1.3);
  if (flameSize === 10 || flameSize === 7.5 || flameSize === 5) {
    genSmoke(object);
    genBlur(object);
  }
}

function drawShield(object) {
  fill(255, 0, 255, 60-flameSize);
  let size = object.size;
  ellipse(-3, 0, flameSize + size*1.7, flameSize + size*1.3);
}

//FLAMES

function drawFlames(object) {
  fill(255, 0, 0, 200-flameSize);
  let size = object.size;
  let time = new Date();
  if (object.flame.back) {
    triangle(-size/2, -flameSize*size/40, -size/2, flameSize*size/40, -size/2 - flameSize*size/40*2, 0);
    if (flameSize === 10 || flameSize === 7.5 || flameSize === 5) { genSmoke(object); }
  }
  if (object.flame.left) {
    triangle(-size/3.5, -flameSize*size/80 + size/2, -size/3.5, flameSize*size/80 + size/2, -size/3.5 - flameSize*size/80*2, size/2);
  }
  if (object.flame.right) {
    triangle(-size/3.5, -flameSize*size/80 - size/2, -size/3.5, flameSize*size/80 - size/2, -size/3.5 - flameSize*size/80*2, -size/2);
  }
}

function flameFlicker() {
  if (flameGrow) {
      flameSize += 0.5;
      if (flameSize >= 10) { flameGrow = false; }
    } else {
      flameSize -= 0.5;
      if (flameSize <= 5) { flameGrow = true; }
    }
}

//PLANETS

function generatePlanets() {
  for (let i=0; i < totalPlanets; i++) {
   objects.push(genPlanet());
  }
}

function genPlanet() {
  let size = Math.random() * (maxPlanetSize-minPlanetSize) + minPlanetSize;
  let style = planetStyles[parseInt(Math.random()*planetStyles.length)];
  // let style = 'Gas';
  let ring = parseInt(Math.random()+0.2) === 0 ? false : true;
  let newPlanet = {type: types.PLANET, xPos: 0, yPos: 0, dir: 0, xVel: 0, yVel: 0, dVel: 0, friction: 0, spinFriction: 0, maxSpeed: 0, maxRotation: 0, size: size, color: randomColor(), end: false, style: style, ring: ring};
  genCoords(newPlanet);
  if (ring) { newPlanet.ringColor = randomColor(); }
  if (style === 'Crater') { generateCraters(newPlanet); }
  if (style === 'Gas') { gasCoords(newPlanet); }
  return newPlanet;
}

function generateCraters(object) {
  object.craters = [];
  for (i = 0; i < 5 + parseInt(object.size/200); i++) { genCrater(object); }
}

function genCrater(object, attempt = 1) {
  if (attempt > 5) { return; }
  size = Math.random()*object.size/5 + object.size/15;
  dir = Math.random()*2*PI - PI;
  distance = Math.random()*((dir > shadeAngle - PI || dir < shadeAngle - 2*PI) ? object.size/4 : (object.size/2 - size/2));
  newCrater = {xPos: Math.cos(dir)*distance, yPos: Math.sin(dir)*distance, size: size};
  for (i = 0; i < object.craters.length; i++) {
    if (collision(newCrater, object.craters[i])) { return genCrater(object, attempt++); }
  }
  object.craters.push(newCrater);
}

function makeCrater(a, b) {
  size = b.size;
  dir = getDir(a, b);
  distance = a.size/2-b.size/2;
  newCrater = {xPos: Math.cos(dir)*distance, yPos: Math.sin(dir)*distance, size: size};
  for (i = 0; i < a.craters.length; i++) {
    if (collision(newCrater, a.craters[i])) {
      if (a.craters[i].size > size) { return; }
      else { a.craters.splice(i, 1); }
    }
  }
  a.craters.push(newCrater);
}

function gasCoords(object) {
  let angle1 = -(PI/4+PI/8) + Math.random()*PI/4;
  let angle2 = angle1 + Math.random()*PI/8;
  let angle4 = PI + (PI/4+PI/8) - Math.random()*PI/4;
  let angle3 = angle4 - Math.random()*PI/8;
  
  let a = [object.size/2*Math.cos(angle1), object.size/2*Math.sin(angle1)];
  let b = [object.size/2*Math.cos(angle2), object.size/2*Math.sin(angle2)];
  let c = [object.size/2*Math.cos(angle3), object.size/2*Math.sin(angle3)];
  let d = [object.size/2*Math.cos(angle4), object.size/2*Math.sin(angle4)];
  
  let pivot = angle2 + Math.random()*(-PI/2 - angle2);
  let radius = Math.random()*object.size/2*0.9;
  let p1 = [radius*Math.cos(pivot), radius*Math.sin(pivot)];
  pivot = angle1 + Math.random()*(-PI/2 - angle1);
  radius = radius + Math.random()*(object.size/2 - radius);
  let p4 = [radius*Math.cos(pivot), radius*Math.sin(pivot)];
  pivot = angle3 + Math.random()*(3*PI/2 - angle3);
  radius = Math.random()*object.size/2*0.9;
  let p2 = [radius*Math.cos(pivot), radius*Math.sin(pivot)];
  pivot = angle4 + Math.random()*(3*PI/2 - angle4);
  radius = radius + Math.random()*(object.size/2 - radius);
  let p3 = [radius*Math.cos(pivot), radius*Math.sin(pivot)];
  
  let angle5 = (PI/4+PI/8) - Math.random()*PI/4;
  let angle6 = angle5 - Math.random()*PI/8;
  let angle8 = PI - (PI/4+PI/8) + Math.random()*PI/4;
  let angle7 = angle8 + Math.random()*PI/8;
  
  let e = [object.size/2*Math.cos(angle5), object.size/2*Math.sin(angle5)];
  let f = [object.size/2*Math.cos(angle6), object.size/2*Math.sin(angle6)];
  let g = [object.size/2*Math.cos(angle7), object.size/2*Math.sin(angle7)];
  let h = [object.size/2*Math.cos(angle8), object.size/2*Math.sin(angle8)];
  
  pivot = angle6 + Math.random()*(PI/2 - angle6);
  radius = Math.random()*object.size/2*0.9;
  let p5 = [radius*Math.cos(pivot), radius*Math.sin(pivot)];
  pivot = angle5 + Math.random()*(PI/2 - angle5);
  radius = radius + Math.random()*(object.size/2*0.9 - radius);
  let p8 = [radius*Math.cos(pivot), radius*Math.sin(pivot)];
  pivot = angle7 + Math.random()*(PI/2 - angle7);
  radius = Math.random()*object.size/2*0.9;
  let p6 = [radius*Math.cos(pivot), radius*Math.sin(pivot)];
  pivot = angle8 + Math.random()*(PI/2 - angle8);
  radius = radius + Math.random()*(object.size/2*0.9 - radius);
  let p7 = [radius*Math.cos(pivot), radius*Math.sin(pivot)];
  
  object.gas = {a: a, b: b, c: c, d: d, e: e, f: f, g: g, h: h, p1: p1, p2: p2, p3: p3, p4: p4, p5: p5, p6: p6, p7: p7, p8: p8, angle1: angle1, angle2: angle2, angle3: angle3, angle4: angle4, angle5: angle5, angle6: angle6, angle7: angle7, angle8: angle8};
}

function drawPlanet(object) {
  if (object.ring) { drawRing(object, false); }
  fill(object.color);
  ellipse(0, 0, object.size);
  if (object.style === 'Gas') { drawGas(object); }
  drawPlanetShadow(object);
  if (object.style === 'Crater') { drawCraters(object); }
  if (object.ring) { drawRing(object, true); }
}

function drawPlanetShadow(object) {
  let angle1 = shadeAngle;
  let angle2 = angle1+PI;
  let midAngle = (angle1+angle2)/2;
  let start = [object.size/2*Math.sin(angle1), object.size/2*Math.cos(angle1)];
  let end = [object.size/2*Math.sin(angle2), object.size/2*Math.cos(angle2)];
  let midPoint = [object.size/2*Math.sin(midAngle), object.size/2*Math.cos(midAngle)];
  let a = [start[0] + (object.size/2)*(4/3)*Math.tan(PI/8)*Math.sin(angle1 + PI/2), start[1] + (object.size/2)*(4/3)*Math.tan(PI/8)*Math.cos(angle1 + PI/2)];
  let b = [midPoint[0] + (object.size/2)*(4/3)*Math.tan(PI/8)*Math.sin(midAngle - PI/2), midPoint[1] + (object.size/2)*(4/3)*Math.tan(PI/8)*Math.cos(midAngle - PI/2)];
  let c = [midPoint[0] + (object.size/2)*(4/3)*Math.tan(PI/8)*Math.sin(midAngle + PI/2), midPoint[1] + (object.size/2)*(4/3)*Math.tan(PI/8)*Math.cos(midAngle + PI/2)];
  let d = [end[0] + (object.size/2)*(4/3)*Math.tan(PI/8)*Math.sin(angle2 - PI/2), end[1] + (object.size/2)*(4/3)*Math.tan(PI/8)*Math.cos(angle2 - PI/2)];
  fill(0, 100);
  beginShape();
  vertex(start[0], start[1]);
  bezierVertex(a[0], a[1], b[0], b[1], midPoint[0], midPoint[1]);
  bezierVertex(c[0], c[1], d[0], d[1], end[0], end[1]);
  bezierVertex(c[0]/2, c[1]/2, b[0]/2, b[1]/2, start[0], start[1]);
  endShape();
}

function drawRing(object, front) {
  let ringSize = (object.size/2)*(width - (ship.yPos - object.yPos))/width;
  let radii = [1, 0.78, 0.57, 0.4];
  if (!front) { for (i = 0; i < radii.length; i++) { radii[i] = radii[i] * -0.6; } }
  
  fill(object.ringColor[0], object.ringColor[1], object.ringColor[2], 100);
  beginShape();
  vertex(object.size, 0);
  bezierVertex(object.size*3/4, ringSize*radii[0], -object.size*3/4, ringSize*radii[0], -object.size, 0);
  vertex(-object.size*0.9, 0);
  bezierVertex(-object.size*2/3, ringSize*radii[1], object.size*2/3, ringSize*radii[1], object.size*0.9, 0);
  endShape();
    
  fill(object.ringColor[0], object.ringColor[1], object.ringColor[2], 200);
  beginShape();
  vertex(object.size*0.9, 0);
  bezierVertex(object.size*2/3, ringSize*radii[1], -object.size*2/3, ringSize*radii[1], -object.size*0.9, 0);
  vertex(-object.size*0.8, 0);
  bezierVertex(-object.size*2/3, ringSize*radii[2], object.size*2/3, ringSize*radii[2], object.size*0.8, 0);
  endShape();
    
  fill(object.ringColor[0], object.ringColor[1], object.ringColor[2], 150);
  beginShape();
  vertex(object.size*0.8, 0);
  bezierVertex(object.size*2/3, ringSize*radii[2], -object.size*2/3, ringSize*radii[2], -object.size*0.8, 0);
  vertex(-object.size*0.7, 0);
  bezierVertex(-object.size*2/3, ringSize*radii[3], object.size*2/3, ringSize*radii[3], object.size*0.7, 0);
  endShape();
}

function drawCraters(object) {
  for (i = 0; i < object.craters.length; i++) {
    fill(object.color);
    ellipse(object.craters[i].xPos, object.craters[i].yPos, object.craters[i].size);
    fill(0, 200);
    ellipse(object.craters[i].xPos, object.craters[i].yPos, object.craters[i].size*0.9);
    fill(object.color);
    ellipse(object.craters[i].xPos - Math.cos(shadeAngle + PI/2)*object.craters[i].size*(1/18), object.craters[i].yPos - Math.sin(shadeAngle + PI/2)*object.craters[i].size*(1/18), object.craters[i].size*0.8);
    fill(0, 100);
    ellipse(object.craters[i].xPos - Math.cos(shadeAngle + PI/2)*object.craters[i].size*(1/18), object.craters[i].yPos - Math.sin(shadeAngle + PI/2)*object.craters[i].size*(1/18), object.craters[i].size*0.8);
  }
}

function drawGas(object) {
  fill(object.color[0]+50, object.color[1]+50, object.color[2]+50);
  beginShape();
  vertex(object.gas.a[0], object.gas.a[1]);
  vertex(object.gas.b[0], object.gas.b[1]);
  bezierVertex(object.gas.p1[0], object.gas.p1[1], object.gas.p2[0], object.gas.p2[1], object.gas.c[0], object.gas.c[1]);
  vertex(object.gas.d[0], object.gas.d[1]);
  bezierVertex(object.gas.p3[0], object.gas.p3[1], object.gas.p4[0], object.gas.p4[1], object.gas.a[0], object.gas.a[1]);
  endShape();
  arc(0, 0, object.size, object.size, object.gas.angle1, object.gas.angle2, CHORD);
  arc(0, 0, object.size, object.size, object.gas.angle3, object.gas.angle4, CHORD);
  
  fill(object.color[0]+20, object.color[1]+20, object.color[2]+20);
  beginShape();
  vertex(object.gas.e[0], object.gas.e[1]);
  vertex(object.gas.f[0], object.gas.f[1]);
  bezierVertex(object.gas.p5[0], object.gas.p5[1], object.gas.p6[0], object.gas.p6[1], object.gas.g[0], object.gas.g[1]);
  vertex(object.gas.h[0], object.gas.h[1]);
  bezierVertex(object.gas.p7[0], object.gas.p7[1], object.gas.p8[0], object.gas.p8[1], object.gas.e[0], object.gas.e[1]);
  endShape();
  arc(0, 0, object.size, object.size, object.gas.angle6, object.gas.angle5, CHORD);
  arc(0, 0, object.size, object.size, object.gas.angle8, object.gas.angle7, CHORD);
}

//BULLETS

function fireBullet(object, missile) {
  let speed = bulletSpeed;
  object.wait.bullet = new Date();
  if (missile) {
    let size = width/60;
    playSound(sounds.MISSILE, object);
    object.wait.missile = new Date();
    objects.push({type: types.BULLET, xPos: object.xPos + Math.cos(object.dir)*(object.size + size), yPos: object.yPos + Math.sin(object.dir)*(object.size + size), dir: object.dir, xVel: object.xVel + Math.cos(object.dir)*speed, yVel: object.yVel + Math.sin(object.dir)*speed, dVel: 0, friction: friction, spinFriction: 0.94, maxSpeed: maxSpeed, maxRotation: maxRotation, size: size, color: 'red', end: false, missile: true, parent: object, target: null, flame: {back: false, left: false, right: false}, time: new Date()});
  } else {
    let size = width/130;
    playSound(sounds.SHOOT, object);
    objects.push({type: types.BULLET, xPos: object.xPos + Math.cos(object.dir)*(object.size + size), yPos: object.yPos + Math.sin(object.dir)*(object.size + size), dir: object.dir, xVel: object.xVel + Math.cos(object.dir)*speed, yVel: object.yVel + Math.sin(object.dir)*speed, dVel: 0, friction: 0.998, spinFriction: spinFriction, maxSpeed: 40, maxRotation: 25, size: size, color: [0, 255, 255, 245], end: false, missile: false, parent: object});
  }
}

function drawBullet(object) {
  fill(object.color);
  if (object.missile) {
    let size = object.size;
    fill(200);
    rect(0, 0, size, size/2);
    fill(object.color);
    triangle(size/2, -size/4, size/2, size/4, size, 0);
    drawFlames(object);
  } else { ellipse(0, 0, object.size, object.size); }
}

//LOOT

function generateLoot() {
  for (let i=0; i < totalLoot; i++) {
   objects.push(genLoot());
  }
}

function genLoot() {
  let xOrY = parseInt(Math.random()+0.5);
  let newLoot = {type: types.LOOT, xPos: 0, yPos: 0, dir: 0, xVel: 0, yVel: 0, dVel: 0, friction: 0, spinFriction: 0, maxSpeed: 0, maxRotation: 0, size: ship.size, end: false};
  genCoords(newLoot);
  return newLoot;
}

function drawLoot(object) {
  fill(100);
  rect(0, 0, object.size, object.size, object.size/10);
  fill(175);
  rect(0, 0, object.size*0.9, object.size*0.9, object.size*0.9/10);
  fill(100);
  rect(0, 0, object.size, object.size/20);
  rect(0, 0, object.size/25, object.size);
}

//DEBRIS

function genDebris(object) {
  let size = object.size/4;
  let dir = Math.random()*2*PI - PI,
      x = object.xPos + size*cos(dir)/2,
      y = object.yPos + size*sin(dir)/2,
      xVel = object.xVel + (Math.random()+1)*2*cos(dir),
      yVel = object.yVel + (Math.random()+1)*2*sin(dir),
      dVel = Math.random()*10 - 5;
  let color = parseInt(Math.random() + 0.5) === 0 ? object.color : 200;
  let shape = parseInt(Math.random() + 0.5) === 0 ? 'Triangle' : 'Rectangle';
  let newDebris = {type: types.DEBRIS, xPos: x, yPos: y, dir: dir, xVel: xVel, yVel: yVel, dVel: dVel, friction: 0.995, spinFriction: 0.998, maxSpeed: ship.maxSpeed, maxRotation: ship.maxRotation, size: size, color: color, end: false, shape: shape};
  objects.push(newDebris);
}

function drawDebris(object) {
  let size = object.size;
  fill(object.color);
  if (object.shape === 'Triangle') {
    triangle(-size/2, -size/2, -size/2, size/2, size/2, 0);
  } else {
    rect(0, 0, size, size);
  }
}

//EFFECTS

function genBlur(object) {
  let newBlur = {type: types.EFFECT, effect: effects.BLUR, xPos: object.xPos, yPos: object.yPos, dir: object.dir, xVel: 0, yVel: 0, dVel: 0, friction: 0, spinFriction: 0, maxSpeed: 0, maxRotation: 0, size: object.size, color: object.color, end: false, fade: 250};
  objects.push(newBlur);
}

function drawBlur(object) {
  let size = object.size;
  fill(object.color[0], object.color[1], object.color[2], object.fade);
  triangle(-size/2, -size/5, -size/2, size/5, size/4, 0);
  triangle(-size/3.5, -size/1.5, -size/3.5, size/1.5, size/3, 0);
  fill(200, object.fade);
  rect(0, 0, size/1.4, size/3.7);
  fill(object.color[0], object.color[1], object.color[2], object.fade);
  triangle(size/3, -size/7, size/3, size/7, size/1.7, 0);
  fill(100, object.fade);
  ellipse(size/20,0,size/6,size/6);
  fill(175, object.fade);
  ellipse(size/20,0,size/7,size/7);
}

function genSmoke(object) {
  let size = object.size/5 + Math.random()*object.size/7;
  let dir = object.dir,
      x = object.xPos - object.size/1.5*cos(dir),
      y = object.yPos - object.size/1.5*sin(dir);
  let newSmoke = {type: types.EFFECT, effect: effects.SMOKE, xPos: x, yPos: y, dir: dir, xVel: 0, yVel: 0, dVel: 0, friction: 0, spinFriction: 0, maxSpeed: 0, maxRotation: 0, size: size, end: false, fade: 255};
  objects.push(newSmoke);
}

function drawSmoke(object) {
  fill(100, 100, 100, object.fade);
  ellipse(0, 0, object.size);
}

function genExplosion(object) {
  let size = object.size/2;
  let newExplosion = {type: types.EFFECT, effect: effects.EXPLOSION, xPos: object.xPos, yPos: object.yPos, dir: 0, xVel: 0, yVel: 0, dVel: 0, friction: 0, spinFriction: 0, maxSpeed: 0, maxRotation: 0, size: size, end: false, fade: 220};
  objects.push(newExplosion);
  playSound(sounds.EXPLODE, object);
}

function drawExplosion(object) {
  fill(200, 0, 0, object.fade);
  ellipse(0, 0, object.size);
}
