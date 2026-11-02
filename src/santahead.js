// santahead.js: Santa's head: face, laugh faces, beard, moustache, and his hat (or his bald head
// when the hat flew off in a crash). Used by santa.js.

import { INK, lin, shape } from './drawkit.js';

// Head, beard and hat. mouth: 0 = closed, 1 = laughing wide open, 2 = laughing half open.
// When he laughs his head tips back a little and his eyes close happily. hat = false: he lost it.
export function head(g, mouth, hat = true) {
  g.save();
  if (mouth) { g.translate(150, 70); g.rotate(mouth === 1 ? -0.14 : -0.07); g.translate(-150, -70); }
  // face
  shape(g, (gg) => gg.arc(150, 44, 20, 0, Math.PI * 2), lin(g, 132, 30, 170, 60, [[0, '#ffd9bd'], [1, '#e8a27c']]), 3);
  g.fillStyle = mouth ? 'rgba(255,70,90,0.8)' : 'rgba(255,90,110,0.55)';
  g.beginPath(); g.ellipse(160, 50, 7, 5, 0, 0, Math.PI * 2); g.fill();
  if (mouth) { // happy closed eye
    g.strokeStyle = INK; g.lineWidth = 3;
    g.beginPath(); g.moveTo(155, 42); g.quadraticCurveTo(160, 35, 165, 42); g.stroke();
  } else {
    g.fillStyle = INK;
    g.beginPath(); g.ellipse(160, 40, 3, 4, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#ffffff';
    g.fillRect(160, 38, 1.5, 1.5);
  }
  g.strokeStyle = '#f2ebe0'; g.lineWidth = 3;
  g.beginPath(); g.moveTo(154, mouth ? 31 : 33); g.quadraticCurveTo(161, 28, 167, 33); g.stroke(); // eyebrow
  shape(g, (gg) => gg.arc(170, 46, 5.5, 0, Math.PI * 2), '#ff7f7f', 2); // nose
  // beard: big and curly, warm white with soft shading strands
  const beard = (gg) => {
    gg.moveTo(132, 48);
    gg.bezierCurveTo(128, 64, 132, 84, 146, 92);
    gg.bezierCurveTo(150, 98, 158, 98, 162, 92);
    gg.bezierCurveTo(176, 86, 180, 66, 174, 52);
    gg.bezierCurveTo(168, 58, 160, 58, 156, 54);
    gg.bezierCurveTo(150, 58, 140, 56, 132, 48);
  };
  shape(g, beard, lin(g, 0, 48, 0, 98, [[0, '#ffffff'], [1, '#e2d6c4']]), 3, 'hair');
  g.strokeStyle = 'rgba(160,130,105,0.45)';
  g.lineWidth = 2;
  for (let i = 0; i < 6; i++) {
    g.beginPath();
    g.moveTo(138 + i * 6, 62 + (i % 2) * 4);
    g.quadraticCurveTo(140 + i * 6, 76, 146 + i * 3, 88);
    g.stroke();
  }
  // open mouth (ho ho ho!): dark inside, red tongue, white teeth
  if (mouth) {
    const ry = mouth === 1 ? 9 : 5;
    shape(g, (gg) => gg.ellipse(162, 64, 9, ry, 0, 0, Math.PI * 2), '#3a0a14', 2.5);
    g.fillStyle = '#e8435a';
    g.beginPath(); g.ellipse(162, 64 + ry * 0.5, 6, ry * 0.45, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#ffffff';
    g.fillRect(155, 64 - ry + 1, 14, 2.5);
  }
  // moustache
  shape(g, (gg) => { gg.moveTo(146, 54); gg.bezierCurveTo(156, 47, 170, 49, 180, 58); gg.bezierCurveTo(170, 59, 162, 61, 158, 56); gg.bezierCurveTo(154, 61, 144, 61, 146, 54); }, '#ffffff', 2.5, 'hair');
  if (hat) drawHat(g);
  else baldTop(g);
  g.restore();
}

// The hat on its own (also used when it flies off in a crash).
export function drawHat(g) {
  // hat: ONE piece of red cloth: it rises from the brim, peaks, then flops back and down to the pompom.
  const hat = (gg) => {
    gg.moveTo(178, 30);
    gg.bezierCurveTo(182, 14, 170, 0, 152, 0);
    gg.bezierCurveTo(132, 0, 112, 6, 98, 24);
    gg.bezierCurveTo(104, 24, 114, 24, 122, 28);
    gg.bezierCurveTo(124, 30, 126, 32, 126, 34);
    gg.closePath();
  };
  shape(g, hat, lin(g, 100, 2, 180, 36, [[0, '#8e0f22'], [0.45, '#d61f35'], [0.75, '#ff4a5e'], [1, '#c8182e']]), 3, 'hat');
  g.save(); g.beginPath(); hat(g); g.clip();
  g.strokeStyle = 'rgba(90,0,20,0.55)'; g.lineWidth = 3; // the fold where the hat bends back
  g.beginPath(); g.moveTo(160, 8); g.quadraticCurveTo(140, 12, 120, 24); g.stroke();
  g.strokeStyle = 'rgba(255,200,200,0.35)'; g.lineWidth = 3; // light on the top
  g.beginPath(); g.moveTo(170, 12); g.quadraticCurveTo(158, 5, 140, 7); g.stroke();
  g.restore();
  // fur brim and pompom
  shape(g, (gg) => { gg.moveTo(122, 31); gg.bezierCurveTo(140, 21, 166, 21, 182, 27); gg.lineTo(181, 36); gg.bezierCurveTo(162, 30, 142, 32, 126, 44); gg.closePath(); },
    lin(g, 0, 24, 0, 47, [[0, '#ffffff'], [1, '#e2d6c4']]), 3, 'fur');
  shape(g, (gg) => gg.arc(96, 26, 9, 0, Math.PI * 2), lin(g, 88, 18, 104, 34, [[0, '#ffffff'], [1, '#e2d6c4']]), 3, 'fur');
}

// No hat: a shiny bald top with fluffy white hair around it.
function baldTop(g) {
  g.fillStyle = 'rgba(255,255,255,0.45)';
  g.beginPath(); g.ellipse(146, 30, 7, 3.5, -0.4, 0, Math.PI * 2); g.fill();
  for (const [x, y, r] of [[131, 40, 7], [134, 31, 6], [168, 30, 5], [173, 37, 5]]) {
    shape(g, (gg) => gg.arc(x, y, r, 0, Math.PI * 2), lin(g, x - r, y - r, x + r, y + r, [[0, '#ffffff'], [1, '#e2d6c4']]), 2, 'hair');
  }
}
