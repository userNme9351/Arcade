const canvas = document.querySelector('canvas');
const ctx = canvas.getContext('2d');

let displayMultiplier;

let keys = {};
let lastKeys = {};

function keyDown(event) {
    keys[event.key.toLowerCase()] = true;
}

function keyUp(event) {
    if (typeof(keys[event.key.toLowerCase()]) !== 'undefined') {
        delete keys[event.key.toLowerCase()];
    }
}

function onBlur(event) {
    keys = {};
}

window.onkeydown = keyDown;
window.onkeyup = keyUp;

window.onblur = onBlur;

window.onresize = () => {
    displayMultiplier = Math.floor(Math.min(
    window.innerWidth, window.innerHeight) / 128);

    canvas.width = 128 * displayMultiplier;
    canvas.height = 128 * displayMultiplier;
}

window.onresize();

function drawRect(ctx, x, y, w, h) {
    ctx.fillRect(x*displayMultiplier, y*displayMultiplier,
        w*displayMultiplier, h*displayMultiplier);
}

function drawPoly(ctx, offX, offY, points) {
    ctx.beginPath();
    ctx.moveTo(
        (points[0][0] + offX)*displayMultiplier,
        (points[0][1] + offY)*displayMultiplier);
    for (let i = 1; i < points.length; i++) {
        ctx.lineTo(
            (points[i][0]+offX)*displayMultiplier,
            (points[i][1]+offY)*displayMultiplier);
    }
    ctx.closePath();
    ctx.fill();
}

function setColor(ctx, index) {
    ctx.fillStyle = COLORS[index];
    if (doGlow) {
        ctx.shadowBlur = displayMultiplier * 2;
        ctx.shadowColor = COLORS[index];
    } else {
        ctx.shadowBlur = 0;
        ctx.shadowColor = 'rgba(0,0,0,0)';
    }
}

function drawImage(ctx, image, x, y, w, h, u = 0, v = 0, uW = 0, vH = 0) {
    if (vH > 0) {
        ctx.drawImage(image, u, v, uW, vH, x * displayMultiplier, y * displayMultiplier, w * displayMultiplier, h * displayMultiplier);
        return;
    }
    ctx.drawImage(image, x * displayMultiplier, y * displayMultiplier, w * displayMultiplier, h * displayMultiplier);
}

function drawText(ctx, x, y, str, size, bold = false) {
    ctx.font = `${bold?'bold ':''}${size * displayMultiplier}px 'Trebuchet MS'`;
    ctx.fillText(str, x * displayMultiplier, y * displayMultiplier);
}

function getTextSize(ctx, str, size, bold = false) {
    ctx.font = `${bold?'bold ':''}${size}px 'Trebuchet MS'`;
    return ctx.measureText(str);
}

const level = [];

let levelWidth = 0;
let levelHeight = 0;

let levelXOffset = 0;
let levelYOffset = 0;

let levelScale = 1;

let playerX = 0;
let playerY = 0;

let moveCooldown = 0;

const levels = [
    's ww  www/ 3w  w w/ 4w www/6 www/  ww  ww /3w3 www'
];

const boxes = [];

const levelDrawCalls = [];

function getTileFromChar(letter, xPos, yPos) {
    switch (letter) {
        case ' ':
            return 0;
        case 'w':
            return 1;
        case 's':
            playerX = xPos;
            playerY = yPos;
            return 0;
        case 'e':
            return 2;
        case 'b':
            boxes.push([xPos, yPos, 0]);
            return 0;
    }
}

function isSolid(tileType) {
    switch (tileType) {
        case 0:
            return false;
        case 1:
            return true;
        case 2:
            return false;
        default:
            return false;
    }
}

function parseLevelToken(token, yPos) {
    const arr = [];
    let xPos = 0;
    for (let i = 0; i < token.length; i++) {
        const first = token.charAt(i);
        if (/\d/.test(first)) {
            const count = parseInt(first);
            i++;
            const tile = getTileFromChar(token.charAt(i), xPos, yPos);
            for (let j = 0; j < count; j++) {
                arr.push(tile);
                xPos++;
            }
        } else {
            arr.push(getTileFromChar(token.charAt(i), xPos, yPos));
            xPos++;
        }
    }

    return arr;
}

function startGameLevel(ctx, index) {
    level.length = 0;
    boxes.length = 0;

    const tokens = levels[index].split('/');

    levelHeight = tokens.length;

    for (let i = 0; i < tokens.length; i++) {
        level.push(...parseLevelToken(tokens[i], i));
        if (i === 0) {
            levelWidth = level.length;
        }
    }

    levelScale = Math.floor(128 / (Math.max(levelWidth, levelHeight) + 2));

    levelXOffset = 64 - levelWidth * levelScale * 0.5;
    levelYOffset = 64 - levelHeight * levelScale * 0.5;

    generateWallDrawCalls(levelDrawCalls);

    drawCycle(ctx, 0);
}

function getTile(x, y) {
    if (x < 0 || x >= levelWidth || y < 0 || y >= levelHeight) {
        return 1;
    }
    return level[y * levelWidth + x];
}

/**
 * @param {number[]} drawCalls Each call is stored in series as ...[x, y, width, height]
 */
function generateWallDrawCalls(drawCalls) {
    drawCalls.length = 0;

    const tileCoverData = []; // Each tile is stored in series as ...[right, down]

    function setTileCoverData(x, y, index, value) {
        tileCoverData[((x + 1) * (levelWidth + 2) + y + 1) * 2 + index] = value;
    }

    function getTileCoverData(x, y, index) {
        return tileCoverData[((x + 1) * (levelWidth + 2) + y + 1) * 2 + index];
    }

    for (let x = -1; x <= levelWidth; x++) {
        for (let y = -1; y <= levelHeight; y++) {
            const self = getTile(x, y) !== 1;
            const right = getTile(x + 1, y) !== 1 || self || x === levelWidth;
            const down = getTile(x, y + 1) !== 1 || self || y === levelHeight;
            tileCoverData.push(right, down);
        }
    }

    // TODO: Greedy meshing

    for (let i = 0; i < drawCalls.length; i += 4) {
        console.log(i/4, drawCalls[i], drawCalls[i + 1], drawCalls[i + 2], drawCalls[i + 3]);
    }
}

function moveBoxes(x, y, dx, dy) {
    if (!isSolid(getTile(x + dx, y + dy))) {
        for (let i = 0; i < boxes.length; i++) {
            if (boxes[i][0] === x + dx && boxes[i][1] === y + dy) {
                if (moveBoxes(x + dx, y + dy, dx, dy)) {
                    boxes[i][0] += dx;
                    boxes[i][1] += dy;

                    return true;
                }
                return false;
            }
        }
        return true;
    }

    return false;
}

function update(time) {
    moveCooldown = Math.max(moveCooldown - time, 0);

    let dx = 0;
    let dy = 0;

    if (moveCooldown === 0) {
        if ((keys.w && !lastKeys.w) || (keys.arrowup && !lastKeys.arrowup)) {
            moveCooldown = 500;
            dy--;
        }
    
        if ((keys.s && !lastKeys.s) || (keys.arrowdown && !lastKeys.arrowdown)) {
            moveCooldown = 500;
            dy++;
        }
    
        if ((keys.a && !lastKeys.a) || (keys.arrowleft && !lastKeys.arrowleft)) {
            moveCooldown = 500;
            dx--;
        }
    
        if ((keys.d && !lastKeys.d) || (keys.arrowright && !lastKeys.arrowright)) {
            moveCooldown = 500;
            dx++;
        }
    }

    if (moveBoxes(playerX, playerY, dx, dy)) { // moveBoxes doubles as a general collision check
        playerX += dx;
        playerY += dy;
    }

    lastKeys = structuredClone(keys); // Duplicate keys into lastKeys
}

/**
 * @param {CanvasRenderingContext2D} ctx 
 * @param {number} time 
 */
function drawCycle(ctx, time) {
    window.requestAnimationFrame(time => {
        drawCycle(ctx, time);
    });

    update(time);

    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    drawWalls(ctx, levelDrawCalls);

    for (let i = 0; i < level.length; i++) {
        const xCoord = i % levelWidth;
        const yCoord = Math.floor(i / levelWidth);
        if (level[i] === 2) {
            drawEnd(ctx, xCoord, yCoord);
        }
    }
    
    for (let i = 0; i < boxes.length; i++) {
        drawBox(ctx, boxes[i][0], boxes[i][1], i)
    }
    
    drawPlayer(ctx, playerX, playerY);
}

function drawPlayer(ctx, x, y) {
    ctx.fillStyle = '#ffffff';
    drawRect(ctx,
        x * levelScale + levelXOffset + levelScale * 0.125,
        y * levelScale + levelYOffset + levelScale * 0.125,
        levelScale * 0.75,
        levelScale * 0.75);
}

function drawEnd(ctx, x, y) {
    ctx.fillStyle = '#10121C';
    drawRect(ctx,
        (x + 3/32) * levelScale + levelXOffset,
        (y - 0.5) * levelScale + levelYOffset,
        levelScale * 13/16,
        levelScale * 0.5);
}

function drawWalls(ctx, drawCalls) {
    ctx.fillStyle = '#1E1E25';
    for (let i = 0; i < drawCalls.length; i+=4) {
        drawRect(ctx,
            drawCalls[i]   * levelScale + levelXOffset,
            drawCalls[i+1] * levelScale + levelYOffset,
            drawCalls[i+2] * levelScale,
            drawCalls[i+3] * levelScale);
    }

    ctx.fillStyle = '#787887';
    for (let i = 0; i < drawCalls.length; i+=4) {
        drawRect(ctx,
            (drawCalls[i]   + 0.125) * levelScale + levelXOffset,
            (drawCalls[i+1] + 0.125) * levelScale + levelYOffset,
            (drawCalls[i+2] - 0.25) * levelScale,
            (drawCalls[i+3] - 0.25) * levelScale);
    }
}

function drawBox(ctx, x, y, index) {
    ctx.fillStyle = '#ffffff';
    drawRect(ctx,
        x * levelScale + levelXOffset + levelScale * 0.125,
        y * levelScale + levelYOffset + levelScale * 0.125,
        levelScale * 0.75,
        levelScale * 0.75);
}

startGameLevel(ctx, 0);