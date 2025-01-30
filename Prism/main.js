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

let levelScaleConstant = 1;

let playerX = 0;
let playerY = 0;

let moveCooldown = 0;

const levels = [
    '7w/w4 ew/w5 w/w5 w/w5 w/w5 w/w5 w/ws4 w/7w'
];

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

    const tokens = levels[index].split('/');

    levelHeight = tokens.length;

    for (let i = 0; i < tokens.length; i++) {
        level.push(...parseLevelToken(tokens[i], i));
        if (i === 0) {
            levelWidth = level.length;
        }
    }

    levelScaleConstant = Math.floor(128 / Math.max(levelWidth, levelHeight));

    levelXOffset = 64 - levelWidth * levelScaleConstant * 0.5;
    levelYOffset = 64 - levelHeight * levelScaleConstant * 0.5;

    drawCycle(ctx, 0);
}

function getTile(x, y) {
    if (x < 0 || x >= levelWidth || y < 0 || y > levelWidth) {
        return 1;
    }
    return level[y * levelWidth + x];
}

function update(time) {
    moveCooldown = Math.max(moveCooldown - time, 0);
    if (moveCooldown === 0) {
        if ((keys.w && !lastKeys.w) || (keys.arrowup && !lastKeys.arrowup)) {
            moveCooldown = 500;
            if (getTile(playerX, playerY - 1) !== 1) {
                playerY--;  
            }
        }
    
        if ((keys.s && !lastKeys.s) || (keys.arrowdown && !lastKeys.arrowdown)) {
            moveCooldown = 500;
            if (getTile(playerX, playerY + 1) !== 1) {
                playerY++;  
            }
        }
    
        if ((keys.a && !lastKeys.a) || (keys.arrowleft && !lastKeys.arrowleft)) {
            moveCooldown = 500;
            if (getTile(playerX - 1, playerY) !== 1) {
                playerX--;  
            }
        }
    
        if ((keys.d && !lastKeys.d) || (keys.arrowright && !lastKeys.arrowright)) {
            moveCooldown = 500;
            if (getTile(playerX + 1, playerY) !== 1) {
                playerX++;  
            }
        }
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
        if (level[i] === 1) {
            ctx.fillStyle = '#ffffff';
            drawTile(ctx, (i % levelWidth), Math.floor(i / levelWidth));
        }
    }

    ctx.fillStyle = '#ffffff';
    drawPlayer(ctx, playerX, playerY);
}

function drawPlayer(ctx, x, y) {
    console.log(x, y)
    drawRect(ctx,
        x * levelScaleConstant + levelXOffset + levelScaleConstant * 0.125,
        y * levelScaleConstant + levelYOffset + levelScaleConstant * 0.125,
        levelScaleConstant * 0.75,
        levelScaleConstant * 0.75);
}

function drawTile(ctx, x, y) {
    drawRect(ctx, x * levelScaleConstant + levelXOffset, y * levelScaleConstant + levelYOffset, levelScaleConstant, levelScaleConstant);
}

startGameLevel(ctx, 0);