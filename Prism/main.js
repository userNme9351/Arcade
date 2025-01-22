const canvas = document.querySelector('canvas');
const ctx = canvas.getContext('2d');

let displayMultiplier;

let keys = {};

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
        ctx.drawImage(image, u, v, uW, vH, x, y, w, h);
        return;
    }
    ctx.drawImage(image, x, y, w, h);
}

function drawText(ctx, x, y, str, size, bold = false) {
    ctx.font = `${bold?'bold ':''}${size * displayMultiplier}px 'Trebuchet MS'`;
    ctx.fillText(str, x * displayMultiplier, y * displayMultiplier);
}

function getTextSize(ctx, str, size, bold = false) {
    ctx.font = `${bold?'bold ':''}${size}px 'Trebuchet MS'`;
    return ctx.measureText(str);
}