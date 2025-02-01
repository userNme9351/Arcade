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
    '7w/w3 e w/w5 w/w  b  w/w s3 w/w5 w/7w'
];

const boxes = [];

function getLevelTile(letter, xPos, yPos) {
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
            const tile = getLevelTile(token.charAt(i), xPos, yPos);
            for (let j = 0; j < count; j++) {
                arr.push(tile);
                xPos++;
            }
        } else {
            arr.push(getLevelTile(token.charAt(i), xPos, yPos));
            xPos++;
        }
    }

    return arr;
}

function startGameLevel(ctx, index) {
    for (let i = 0; i < level.length; level.pop()) {} // Cursed
    for (let i = 0; i < boxes.length; boxes.pop()) {}

    const tokens = levels[index].split('/');

    levelHeight = tokens.length;

    for (let i = 0; i < tokens.length; i++) {
        level.push(...parseLevelToken(tokens[i], i));
        if (i === 0) {
            levelWidth = level.length;
        }
    }

    levelScale = Math.floor(128 / Math.max(levelWidth, levelHeight));

    levelXOffset = 64 - levelWidth * levelScale * 0.5;
    levelYOffset = 64 - levelHeight * levelScale * 0.5;

    drawCycle(ctx, 0);
}

function getTile(x, y) {
    if (x < 0 || x >= levelWidth || y < 0 || y > levelWidth) {
        return 1;
    }
    return level[y * levelWidth + x];
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

    lastKeys = structuredClone(keys);
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

    for (let i = 0; i < level.length; i++) {
        const xCoord = i % levelWidth;
        const yCoord = Math.floor(i / levelWidth);
        if (level[i] === 1) {
            drawTile(ctx, xCoord, yCoord);
        } else if (level[i] === 2) {
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

function drawTile(ctx, x, y) {
    ctx.fillStyle = '#ffffff';
    drawRect(ctx,
        x * levelScale + levelXOffset,
        y * levelScale + levelYOffset,
        levelScale,
        levelScale);
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