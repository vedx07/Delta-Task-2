const canvas = document.querySelector("#canvas");
const c = canvas.getContext("2d");
canvas.width = 2000;
canvas.height = 1000;

const rows = 5;
const cols = 10;
const boxWidth = canvas.width / cols;
const boxHeight = canvas.height / rows;

// Storage for map state
const map = [];
const buildingRects = [];
const key = [];
const surveillanceTowers = [];
//bullet
const bullets = [];
const maxBounces = 1;
//system
const system = {
  health: 79,
};
//player
const player = {
  x: 200,
  y: 200,
  size: 25,
  speed: 15,
  collectedKey: 0,
  health: 100,
  dataShardsDelivered: 0,
  collectedDataShards: 0,
  highScore: 0,
};

const center = (x, w) => x + w / 2;

// Generate a mini building pattern inside each tile (5x5 grid)
function generateBuildingPattern(size = 5) {
  const pattern = [];
  for (let y = 0; y < size; y++) {
    pattern[y] = [];
    for (let x = 0; x < size; x++) {
      pattern[y][x] =
        x > 0 && x < size - 1 && y > 0 && y < size - 1 && Math.random() > 0.3
          ? 1
          : 0;
    }
  }
  return pattern;
}

// Draw buildings and store rectangles for collision
function drawBuildingPattern(pattern, col, row) {
  const subSize = pattern.length;
  const cellW = (boxWidth - 20) / subSize;
  const cellH = (boxHeight - 20) / subSize;

  for (let y = 0; y < subSize; y++) {
    for (let x = 0; x < subSize; x++) {
      if (pattern[y][x] === 1) {
        const rectX = col * boxWidth + 10 + x * cellW;
        const rectY = row * boxHeight + 10 + y * cellH;
        c.fillStyle = "black";
        c.fillRect(rectX, rectY, cellW, cellH);

        buildingRects.push({ x: rectX, y: rectY, w: cellW, h: cellH });
      }
    }
  }
}

// Draw key
function drawKey(col, row) {
  x = center(col * boxWidth, boxWidth);
  y = center(row * boxHeight, boxHeight);
  c.beginPath();
  c.fillStyle = "magenta";
  c.arc(x, y, 10, 0, Math.PI * 2);
  c.fill();

  return {
    x: center(col * boxWidth, boxWidth),
    y: center(row * boxHeight, boxHeight),
  };
}

// Draw data shard
function drawDataShard(col, row) {
  const x = center(col * boxWidth, boxWidth);
  const y = center(row * boxHeight, boxHeight);
  c.beginPath();
  c.fillStyle = "blue";
  c.arc(x, y, 15, 0, Math.PI * 2);
  c.fill();
}
function drawAurex(col, row) {
  const x = center(col * boxWidth, boxWidth);
  const y = center(row * boxHeight, boxHeight);
  c.beginPath();
  c.fillStyle = "red";
  c.arc(x, y, 15, 0, Math.PI * 2);
  c.fill();
}

// Generate map once
function generateMap() {
  for (let row = 0; row < rows; row++) {
    map[row] = [];
    for (let col = 0; col < cols; col++) {
      const isCentralHub = row === 2 && col === 7;
      const isBase = row === 2 && col === 2;
      let tile = {
        type: "grass",
        hasKey: false,
        key: null,
        building: null,
        hasSurveillance: false,
      };

      if (isCentralHub) {
        tile.type = "hub";
        tile.hasKey = "dataShard";
        tile.building = generateBuildingPattern();
      } else if (isBase) {
        tile.type = "base";
        tile.hasKey = "aurex";
        tile.building = generateBuildingPattern();
      } else {
        tile.building = generateBuildingPattern();
         if (Math.random() < 0.3) {
          tile.hasKey = true;
          const k = {
            x: center(col * boxWidth, boxWidth),
            y: center(row * boxHeight, boxHeight),
          };
          tile.key = k;
          key.push(k);
        }
        if (Math.random() < 0.8) {
          tile.hasSurveillance = true;
          surveillanceTowers.push({
            col,
            row,
            angle: Math.random() * Math.PI * 2,
            sweep: Math.PI / 4,
            radius: 100,
          });
        }
      }

      map[row][col] = tile;
    }
  }
}
function drawSurveillanceTowers() {
  surveillanceTowers.forEach((tower) => {
    const cx = center(tower.col * boxWidth, boxWidth);
    const cy = center(tower.row * boxHeight, boxHeight);

    // Draw rotating vision arc
    c.beginPath();
    c.moveTo(cx, cy);
    c.fillStyle = "rgba(255, 0, 0, 0.3)";
    c.arc(cx, cy, tower.radius, tower.angle, tower.angle + tower.sweep);
    c.lineTo(cx, cy);
    c.fill();
  

    // Rotate angle slightly
    tower.angle += 0.02;
  });
}
function isPlayerInSurveillanceArc(tower) {
  const cx = center(tower.col * boxWidth, boxWidth);
  const cy = center(tower.row * boxHeight, boxHeight);

  const dx = player.x - cx;
  const dy = player.y - cy;
  const distance = Math.sqrt(dx * dx + dy * dy);
  if (distance > tower.radius) return false; // Outside radius

  const playerAngle = Math.atan2(dy, dx);
  const startAngle = tower.angle;
  const endAngle = tower.angle + tower.sweep;

  // Normalize angles between 0 to 2PI
  const normalize = (a) => (a + 2 * Math.PI) % (2 * Math.PI);
  const pAngle = normalize(playerAngle);
  const sAngle = normalize(startAngle);
  const eAngle = normalize(endAngle);

  if (sAngle < eAngle) {
    return pAngle >= sAngle && pAngle <= eAngle;
  } else {
    return pAngle >= sAngle || pAngle <= eAngle; // arc crosses 0
  }
}
function checkSurveillanceDamage() {
  for (const tower of surveillanceTowers) {
    if (isPlayerInSurveillanceArc(tower)) {
      player.health -= 1;
      if (player.health < 0) player.health = 0;
      return; // Only take damage from one tower at a time
    }
  }
}


// Render map using stored data
function renderMap() {
  buildingRects.length = 0;

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const tile = map[row][col];
      // Outline
      c.strokeStyle = "#3ef01f";
      c.strokeRect(col * boxWidth, row * boxHeight, boxWidth, boxHeight);

      // Fill
      if (tile.type === "hub") {
        c.fillStyle = "#00FFFF";
      } else if (tile.type === "base") {
        c.fillStyle = "#FFA500";
      } else {
        c.fillStyle = "#3ef01f";
      }

      c.fillRect(
        col * boxWidth + 10,
        row * boxHeight + 10,
        boxWidth - 20,
        boxHeight - 20
      );

      if (tile.building) {
        drawBuildingPattern(tile.building, col, row);
      }

      if (tile.hasKey === true) {
         drawKey(col, row);
      }

      if (tile.hasKey === "dataShard") {
        drawDataShard(col, row);
      }
      if (tile.hasKey === "aurex") {
        drawAurex(col, row);
      }
    }
  }
}

// Draw player
function drawPlayer() {
  c.fillStyle = "white";
  c.beginPath();
  c.arc(player.x, player.y, player.size / 2, 0, Math.PI * 2);
  c.fill();
}

// Check player collision with buildings
function checkCollision(newX, newY) {
  for (let b of buildingRects) {
    if (
      newX + player.size / 2 > b.x &&
      newX - player.size / 2 < b.x + b.w &&
      newY + player.size / 2 > b.y &&
      newY - player.size / 2 < b.y + b.h
    ) {
      return true;
    }
  }
  if (
    newX - player.size / 2 < 0 ||
    newY - player.size / 2 < 0 ||
    newX + player.size / 2 > canvas.width ||
    newY + player.size / 2 > canvas.height
  ) {
    return true;
  }
  return false;
}

function collectKey() {
  for (let i = key.length - 1; i >= 0; i--) {
    const k = key[i];
    const dx = player.x - k.x;
    const dy = player.y - k.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance < player.size) {
      // Mark the tile's hasKey as false
      const col = Math.floor(k.x / boxWidth);
      const row = Math.floor(k.y / boxHeight);
      const tile = map[row][col];
      if (tile.hasKey === true) {
        tile.hasKey = false;
        tile.key = null;
        player.collectedKey += 1;

        // Important: remove this key so it doesn't get counted again
        key.splice(i, 1);
      }
    }
  }
}

function drawHUD() {
  const hud = document.getElementById("hud");
  hud.innerHTML = `
    <div><strong>Player health:</strong> ${player.health}</div>
    <div><strong>System health:</strong> ${system.health}</div>
    <div><strong>Keys:</strong> ${player.collectedKey}</div>
    <div><strong>Shards Collected:</strong> ${player.collectedDataShards}</div>
    <div><strong>Shards Delivered:</strong> ${player.dataShardsDelivered}</div>
    <div><strong>High Score:</strong> ${player.highScore}</div>
  `;
}

// Redraw everything
function redraw() {
  c.clearRect(0, 0, canvas.width, canvas.height);
  renderMap();
  drawSurveillanceTowers();
  drawPlayer();
  drawHUD();

  // Update and draw bullets
  for (let i = bullets.length - 1; i >= 0; i--) {
    const b = bullets[i];
    b.update();
    b.draw();
    if (b.bounces > maxBounces) bullets.splice(i, 1);
  }
}

// Movement controls
document.addEventListener("keydown", (e) => {
  let newX = player.x;
  let newY = player.y;

  if (e.key === "w" || e.key === "ArrowUp") newY -= player.speed;
  if (e.key === "s" || e.key === "ArrowDown") newY += player.speed;
  if (e.key === "a" || e.key === "ArrowLeft") newX -= player.speed;
  if (e.key === "d" || e.key === "ArrowRight") newX += player.speed;

  if (!checkCollision(newX, newY)) {
    player.x = newX;
    player.y = newY;
  }
  // console.log(player)
  redraw();
  collectKey();
  // console.log(player.collectedKey)
});

//bullet
class Bullet {
  constructor(x, y, dx, dy) {
    this.x = x;
    this.y = y;
    this.dx = dx;
    this.dy = dy;
    this.radius = 5;
    this.bounces = 0;
  }

  update() {
    this.x += this.dx;
    this.y += this.dy;

    // Reflect off canvas walls
    if (this.x <= 0 || this.x >= canvas.width) {
      this.dx *= -1;
      this.bounces++;
    }
    if (this.y <= 0 || this.y >= canvas.height) {
      this.dy *= -1;
      this.bounces++;
    }

    // Check collision with buildings
    // Check collision with surveillance towers
    for (let i = surveillanceTowers.length - 1; i >= 0; i--) {
      const tower = surveillanceTowers[i];
      const cx = center(tower.col * boxWidth, boxWidth);
      const cy = center(tower.row * boxHeight, boxHeight);

      const dx = this.x - cx;
      const dy = this.y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < 15) {
        // Adjust this radius if needed
        surveillanceTowers.splice(i, 1); // Remove the tower
        this.bounces++; // Count as a bounce
        return;
      }
    }

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const tile = map[row][col];
        if (!tile.building) continue;

        const subSize = tile.building.length;
        const cellW = (boxWidth - 20) / subSize;
        const cellH = (boxHeight - 20) / subSize;

        for (let y = 0; y < subSize; y++) {
          for (let x = 0; x < subSize; x++) {
            if (tile.building[y][x] === 1) {
              const rx = col * boxWidth + 10 + x * cellW;
              const ry = row * boxHeight + 10 + y * cellH;

              if (
                this.x + this.radius > rx &&
                this.x - this.radius < rx + cellW &&
                this.y + this.radius > ry &&
                this.y - this.radius < ry + cellH
              ) {
                // Destroy building block
                tile.building[y][x] = 0;
                this.bounces++;

                // Reflect: simple horizontal/vertical bounce
                const overlapX = Math.min(this.x - rx, rx + cellW - this.x);
                const overlapY = Math.min(this.y - ry, ry + cellH - this.y);
                if (overlapX < overlapY) this.dx *= -1;
                else this.dy *= -1;

                return;
              }
            }
          }
        }
      }
    }
  }

  draw() {
    c.beginPath();
    c.fillStyle = "white";
    c.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    c.fill();
  }
}
canvas.addEventListener("click", (e) => {
  const rect = canvas.getBoundingClientRect();
  const mouseX = e.clientX - rect.left;
  const mouseY = e.clientY - rect.top;

  const angle = Math.atan2(mouseY - player.y, mouseX - player.x);
  const speed = 15;

  const bullet = new Bullet(
    player.x,
    player.y,
    Math.cos(angle) * speed,
    Math.sin(angle) * speed
  );

  bullets.push(bullet);
});

function hub() {
  const dx = player.x - center(7 * boxWidth, boxWidth);
  const dy = player.y - center(2 * boxHeight, boxHeight);
  const distance = Math.sqrt(dx * dx + dy * dy);

  if (
    distance < player.size &&
    player.collectedKey >= 2 &&
    player.collectedDataShards == 0
  ) {
    player.collectedDataShards = 1;
    player.collectedKey -= 2;
  }

  if (player.collectedDataShards == 1) {
    map[2][7].hasKey = false;
  }
  if (player.collectedDataShards == 0) {
    map[2][7].hasKey = "dataShard";
  }
}

function base() {
  const dx = player.x - center(2 * boxWidth, boxWidth);
  const dy = player.y - center(2 * boxHeight, boxHeight);
  const distance = Math.sqrt(dx * dx + dy * dy);

  if (distance < player.size && player.collectedDataShards == 1) {
    player.collectedDataShards = 0;
    player.dataShardsDelivered++;
    system.health += 20;
    
  }
}

// Init
generateMap(); // Only once
redraw(); // Initial render



function gameLoop() {
  redraw();
  hub();
  base();
  checkWin();
  requestAnimationFrame(gameLoop);
}
gameLoop(); // Start the loop

function tick() {
  system.health--;
  if(system.health<0){system.health=0};
  
}
setInterval(tick,2*1000);
setInterval(checkSurveillanceDamage,100)


function checkWin() {
  if(system.health>=100)
    {
      alert("You WIN!!!");
    }
   if(system.health==0)
    {
      alert("You Lost !! Aurex health is Zero");
    }
    if(player.health==0)
    {
      alert("You Lost !! Player health is Zero");
    }
    if(!(isSufficientKeys()))
    {
     alert("You Lost !! Keys are not Sufficeint in Number");
    }
}
function isSufficientKeys() {
  console.log(system.health + 20*player.collectedDataShards + 10*key.length + 10*player.collectedKey);
  if(system.health + 20*player.collectedDataShards + 10*key.length + 10*player.collectedKey>= 100){
    return true;
  }
  else{
    return false;
  }
}