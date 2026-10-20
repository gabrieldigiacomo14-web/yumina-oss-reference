// @ts-nocheck
// Heraldry for the world map: realm and guild emblems, realm cartouches and the
// compass rose, drawn with the 2D canvas so they stay crisp at every zoom.

export var REALM_HERALDRY = {
  "Aurelia": { title: "Kingdom of Aurelia", field: "#5a2410", rim: "#d8aa4a", fg: "#f0c45a", sigil: "lion", plate: "#3a2410" },
  "Stonehold": { title: "Stonehold Confederacy", field: "#3e2e22", rim: "#c89a5a", fg: "#e0b878", sigil: "hammers", plate: "#2e241c" },
  "Sylvanor": { title: "Sylvanor", field: "#1d4a24", rim: "#c8b46a", fg: "#eef4dc", sigil: "tree", plate: "#1a3a1e" },
  "Drakmor": { title: "Drakmor Dominion", field: "#1d4c96", rim: "#c8d4e4", fg: "#f2f6fb", sigil: "stag", plate: "#18305a" },
  "Sunscar": { title: "Sunscar Sultanate", field: "#6a2210", rim: "#e0a84a", fg: "#f6962a", sigil: "sun", plate: "#4a1e10" },
  "Velkar": { title: "Velkar Free Cities", field: "#0f4a52", rim: "#c8b46a", fg: "#eef2ea", sigil: "ship", plate: "#123a40" },
  "Umbral Reach": { title: "Umbral Reach", field: "#2a1438", rim: "#a07ac8", fg: "#c48af0", sigil: "crystal", plate: "#22122e" }
};
export var GUILDS = [
  { id: "golden-lion", name: "Golden Lion Guild", hq: "aurelia-city", hqName: "Aurelia City", motto: "Discipline. Honor. Protection.", field: "#5a2410", fg: "#f0c45a", sigil: "lion" },
  { id: "silver-moon", name: "Silver Moon Society", hq: "luminor", hqName: "Luminor", motto: "Knowledge. Magic. Discovery.", field: "#22283a", fg: "#e6ecf6", sigil: "moon" },
  { id: "iron-vanguard", name: "Iron Vanguard", hq: "karak-borgor", hqName: "Karak Borgor", motto: "Strength. Duty. Monster Slaying.", field: "#3e2e22", fg: "#e0b878", sigil: "hammers" },
  { id: "shadow-ravens", name: "Shadow Ravens", hq: "grayhaven-central", hqName: "Grayhaven Central", motto: "Information. Stealth. Precision.", field: "#1a1c22", fg: "#cfd4dc", sigil: "raven" },
  { id: "sea-drake", name: "Sea Drake Company", hq: "port-meridian", hqName: "Port Meridian", motto: "Exploration. Trade. Dominance.", field: "#0f4a52", fg: "#eef2ea", sigil: "ship" }
];

function shieldPath(ctx, x, y, s) { var w = s * 0.86, h = s; ctx.beginPath(); ctx.moveTo(x - w / 2, y - h / 2); ctx.lineTo(x + w / 2, y - h / 2); ctx.lineTo(x + w / 2, y + h * 0.05); ctx.quadraticCurveTo(x + w / 2, y + h * 0.36, x, y + h / 2); ctx.quadraticCurveTo(x - w / 2, y + h * 0.36, x - w / 2, y + h * 0.05); ctx.closePath(); }
export function drawSigil(ctx, kind, x, y, s, col) {
  ctx.save(); ctx.fillStyle = col; ctx.strokeStyle = col; ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.lineWidth = Math.max(1, s * 0.07);
  if (kind === "lion") {
    // crowned lion's head: scalloped mane, ears, muzzle — distinct from Sunscar's sun
    for (var i = 0; i < 11; i++) { var a = Math.PI * 0.15 + i / 10 * Math.PI * 1.7; ctx.beginPath(); ctx.arc(x + Math.cos(a + Math.PI / 2) * s * 0.3, y + s * 0.04 + Math.sin(a + Math.PI / 2) * s * 0.3, s * 0.11, 0, 7); ctx.fill(); }
    ctx.beginPath(); ctx.arc(x, y + s * 0.04, s * 0.3, 0, 7); ctx.fill();
    ctx.fillStyle = "rgba(70,26,8,0.9)"; ctx.beginPath(); ctx.ellipse(x, y + s * 0.07, s * 0.19, s * 0.22, 0, 0, 7); ctx.fill();
    ctx.fillStyle = col; ctx.beginPath(); ctx.ellipse(x, y + s * 0.08, s * 0.15, s * 0.19, 0, 0, 7); ctx.fill();
    [-1, 1].forEach(function (k) { ctx.beginPath(); ctx.arc(x + k * s * 0.15, y - s * 0.12, s * 0.06, 0, 7); ctx.fill(); });
    ctx.fillStyle = "rgba(60,20,8,0.95)"; ctx.beginPath(); ctx.arc(x - s * 0.065, y + s * 0.02, s * 0.028, 0, 7); ctx.arc(x + s * 0.065, y + s * 0.02, s * 0.028, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.moveTo(x - s * 0.05, y + s * 0.11); ctx.lineTo(x + s * 0.05, y + s * 0.11); ctx.lineTo(x, y + s * 0.17); ctx.closePath(); ctx.fill();
    ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(x - s * 0.2, y - s * 0.3); ctx.lineTo(x - s * 0.2, y - s * 0.44); ctx.lineTo(x - s * 0.1, y - s * 0.36); ctx.lineTo(x, y - s * 0.48); ctx.lineTo(x + s * 0.1, y - s * 0.36); ctx.lineTo(x + s * 0.2, y - s * 0.44); ctx.lineTo(x + s * 0.2, y - s * 0.3); ctx.closePath(); ctx.fill();
  } else if (kind === "tree") {
    ctx.lineWidth = s * 0.06; ctx.beginPath(); ctx.moveTo(x, y + s * 0.38); ctx.lineTo(x, y - s * 0.02); ctx.stroke();
    (function br(px, py, a, len, d) { if (!d) { ctx.beginPath(); ctx.arc(px, py, s * 0.035, 0, 7); ctx.fill(); return; } var nx = px + Math.cos(a) * len, ny = py + Math.sin(a) * len; ctx.lineWidth = s * 0.012 * (d + 1); ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(nx, ny); ctx.stroke(); br(nx, ny, a - 0.45, len * 0.72, d - 1); br(nx, ny, a + 0.45, len * 0.72, d - 1); })(x, y, -Math.PI / 2, s * 0.13, 4);
    ctx.lineWidth = s * 0.03; for (var k = -1; k <= 1; k += 2) { ctx.beginPath(); ctx.moveTo(x, y + s * 0.34); ctx.quadraticCurveTo(x + k * s * 0.14, y + s * 0.36, x + k * s * 0.26, y + s * 0.42); ctx.stroke(); }
  } else if (kind === "hammers") {
    for (var k = -1; k <= 1; k += 2) { ctx.save(); ctx.translate(x, y); ctx.rotate(k * 0.75); ctx.fillRect(-s * 0.035, -s * 0.36, s * 0.07, s * 0.72); ctx.fillRect(-s * 0.17, -s * 0.42, s * 0.34, s * 0.16); ctx.restore(); }
  } else if (kind === "stag") {
    ctx.beginPath(); ctx.moveTo(x - s * 0.1, y - s * 0.02); ctx.lineTo(x + s * 0.1, y - s * 0.02); ctx.lineTo(x + s * 0.05, y + s * 0.3); ctx.lineTo(x - s * 0.05, y + s * 0.3); ctx.closePath(); ctx.fill();
    for (var k = -1; k <= 1; k += 2) { ctx.lineWidth = s * 0.05; ctx.beginPath(); ctx.moveTo(x + k * s * 0.08, y - s * 0.02); ctx.quadraticCurveTo(x + k * s * 0.32, y - s * 0.1, x + k * s * 0.3, y - s * 0.42); ctx.stroke(); for (var t = 0; t < 3; t++) { var px = x + k * s * (0.2 + t * 0.04), py = y - s * (0.1 + t * 0.1); ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px + k * s * 0.12, py - s * 0.08); ctx.stroke(); } }
  } else if (kind === "sun") {
    ctx.beginPath(); ctx.arc(x, y, s * 0.19, 0, 7); ctx.fill(); for (var i = 0; i < 16; i++) { var a = i / 16 * Math.PI * 2; var r1 = s * 0.24, r2 = i % 2 ? s * 0.36 : s * 0.44; ctx.beginPath(); ctx.moveTo(x + Math.cos(a - 0.1) * r1, y + Math.sin(a - 0.1) * r1); ctx.lineTo(x + Math.cos(a) * r2, y + Math.sin(a) * r2); ctx.lineTo(x + Math.cos(a + 0.1) * r1, y + Math.sin(a + 0.1) * r1); ctx.fill(); }
  } else if (kind === "ship") {
    ctx.beginPath(); ctx.moveTo(x - s * 0.36, y + s * 0.12); ctx.lineTo(x + s * 0.36, y + s * 0.12); ctx.quadraticCurveTo(x + s * 0.26, y + s * 0.32, x, y + s * 0.32); ctx.quadraticCurveTo(x - s * 0.26, y + s * 0.32, x - s * 0.36, y + s * 0.12); ctx.fill();
    ctx.fillRect(x - s * 0.02, y - s * 0.38, s * 0.04, s * 0.5);
    ctx.beginPath(); ctx.moveTo(x + s * 0.03, y - s * 0.34); ctx.quadraticCurveTo(x + s * 0.3, y - s * 0.12, x + s * 0.03, y + s * 0.06); ctx.fill(); ctx.beginPath(); ctx.moveTo(x - s * 0.03, y - s * 0.28); ctx.quadraticCurveTo(x - s * 0.24, y - s * 0.1, x - s * 0.03, y + s * 0.06); ctx.fill();
  } else if (kind === "crystal") {
    ctx.shadowColor = col; ctx.shadowBlur = s * 0.3; ctx.beginPath(); ctx.moveTo(x, y - s * 0.42); ctx.lineTo(x + s * 0.16, y - s * 0.05); ctx.lineTo(x, y + s * 0.42); ctx.lineTo(x - s * 0.16, y - s * 0.05); ctx.closePath(); ctx.fill();
    ctx.shadowBlur = 0; ctx.lineWidth = s * 0.035; ctx.beginPath(); ctx.moveTo(x - s * 0.36, y - s * 0.22); ctx.lineTo(x - s * 0.2, y); ctx.lineTo(x - s * 0.34, y + s * 0.22); ctx.moveTo(x + s * 0.36, y - s * 0.22); ctx.lineTo(x + s * 0.2, y); ctx.lineTo(x + s * 0.34, y + s * 0.22); ctx.stroke();
  } else if (kind === "moon") {
    ctx.beginPath(); ctx.arc(x, y, s * 0.36, 0, 7); ctx.fill(); ctx.globalCompositeOperation = "destination-out"; ctx.beginPath(); ctx.arc(x + s * 0.16, y - s * 0.08, s * 0.32, 0, 7); ctx.fill(); ctx.globalCompositeOperation = "source-over";
  } else if (kind === "raven") {
    ctx.beginPath(); ctx.ellipse(x, y + s * 0.04, s * 0.07, s * 0.2, 0, 0, 7); ctx.fill(); ctx.beginPath(); ctx.arc(x, y - s * 0.18, s * 0.07, 0, 7); ctx.fill();
    for (var k = -1; k <= 1; k += 2) { ctx.beginPath(); ctx.moveTo(x, y - s * 0.05); for (var f = 0; f < 4; f++) { ctx.lineTo(x + k * s * (0.14 + f * 0.08), y - s * (0.28 - f * 0.05)); ctx.lineTo(x + k * s * (0.1 + f * 0.08), y - s * (0.1 - f * 0.08)); } ctx.lineTo(x, y + s * 0.15); ctx.closePath(); ctx.fill(); }
  }
  ctx.restore();
}
export function drawShield(ctx, x, y, s, field, rim, fg, sigil) {
  ctx.save(); shieldPath(ctx, x, y, s); var g = ctx.createLinearGradient(x, y - s / 2, x, y + s / 2); g.addColorStop(0, shade(field, 1.35)); g.addColorStop(1, shade(field, 0.7)); ctx.fillStyle = g; ctx.shadowColor = "rgba(0,0,0,0.6)"; ctx.shadowBlur = s * 0.15; ctx.fill(); ctx.shadowBlur = 0;
  ctx.lineWidth = Math.max(1.2, s * 0.06); ctx.strokeStyle = rim; ctx.stroke(); shieldPath(ctx, x, y, s * 0.84); ctx.lineWidth = Math.max(0.6, s * 0.018); ctx.strokeStyle = shade(rim, 0.8); ctx.stroke();
  drawSigil(ctx, sigil, x, y - s * 0.02, s * 0.62, fg); ctx.restore();
}
export function emblemURL(kind, size) {
  var c = document.createElement("canvas"); c.width = c.height = size || 64; var ctx = c.getContext("2d"); var s = (size || 64) * 0.9;
  var r = REALM_HERALDRY[kind]; var gl = GUILDS.find(function (g) { return g.id === kind; });
  if (r) drawShield(ctx, c.width / 2, c.height / 2, s, r.field, r.rim, r.fg, r.sigil); else if (gl) drawShield(ctx, c.width / 2, c.height / 2, s, gl.field, "#c9a85a", gl.fg, gl.sigil);
  return c.toDataURL();
}
// Realm banner: shield above a name plate, as on the reference map.
export function drawCartouche(ctx, realm, x, y, k, alpha, subtitle) {
  var r = REALM_HERALDRY[realm]; if (!r) return; ctx.save(); ctx.globalAlpha = alpha; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  var titleSize = 19 * k, subSize = 11.5 * k; var words = r.title.toUpperCase(); ctx.font = "700 " + titleSize + "px Cinzel, Georgia, serif"; var tw = ctx.measureText(words).width; ctx.font = "600 " + subSize + "px Cinzel, Georgia, serif"; var sw = subtitle ? ctx.measureText(subtitle).width : 0;
  var w = Math.max(tw, sw) + 34 * k, h = (subtitle ? 50 : 34) * k, px = x - w / 2, py = y - h / 2;
  var g = ctx.createLinearGradient(px, py, px, py + h); g.addColorStop(0, shade(r.plate, 1.5)); g.addColorStop(1, shade(r.plate, 0.85));
  ctx.shadowColor = "rgba(0,0,0,0.7)"; ctx.shadowBlur = 12 * k; ctx.fillStyle = g; plate(ctx, px, py, w, h, 6 * k); ctx.fill(); ctx.shadowBlur = 0;
  ctx.strokeStyle = r.rim; ctx.lineWidth = 2 * k; plate(ctx, px, py, w, h, 6 * k); ctx.stroke(); ctx.lineWidth = 0.8 * k; ctx.strokeStyle = shade(r.rim, 0.75); plate(ctx, px + 4 * k, py + 4 * k, w - 8 * k, h - 8 * k, 4 * k); ctx.stroke();
  ctx.fillStyle = "#f4e6c0"; ctx.font = "700 " + titleSize + "px Cinzel, Georgia, serif"; ctx.shadowColor = "rgba(0,0,0,0.8)"; ctx.shadowBlur = 3 * k; ctx.fillText(words, x, py + (subtitle ? 19 : 17) * k);
  if (subtitle) { ctx.font = "600 " + subSize + "px Cinzel, Georgia, serif"; ctx.fillStyle = "#e0d4b0"; ctx.fillText(subtitle, x, py + 37 * k); }
  ctx.shadowBlur = 0; drawShield(ctx, x, py - 22 * k, 52 * k, r.field, r.rim, r.fg, r.sigil);
  ctx.restore();
}
function plate(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r); ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h); ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r); ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.closePath(); }
export function drawCompass(ctx, x, y, R) {
  ctx.save(); ctx.translate(x, y);
  ctx.strokeStyle = "rgba(224,190,110,0.75)"; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(0, 0, R * 0.62, 0, 7); ctx.stroke(); ctx.beginPath(); ctx.arc(0, 0, R * 0.7, 0, 7); ctx.stroke();
  for (var i = 0; i < 8; i++) { var a = i / 8 * Math.PI * 2 - Math.PI / 2; var long = i % 2 === 0; var L = long ? R : R * 0.55, W = long ? R * 0.14 : R * 0.1; for (var side = -1; side <= 1; side += 2) { ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a) * L, Math.sin(a) * L); ctx.lineTo(Math.cos(a + side * Math.PI / 2) * W, Math.sin(a + side * Math.PI / 2) * W); ctx.closePath(); ctx.fillStyle = side < 0 ? "#f2cf6e" : "#a87a2a"; ctx.fill(); } }
  ctx.fillStyle = "#3a2a10"; ctx.beginPath(); ctx.arc(0, 0, R * 0.07, 0, 7); ctx.fill();
  ctx.font = "700 " + Math.round(R * 0.32) + "px Cinzel, Georgia, serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillStyle = "#f2e2b8"; ctx.shadowColor = "#000"; ctx.shadowBlur = 4;
  ctx.fillText("N", 0, -R * 1.22); ctx.fillText("S", 0, R * 1.22); ctx.fillText("E", R * 1.22, 0); ctx.fillText("W", -R * 1.22, 0);
  ctx.restore();
}
export function shade(hx, k) { var n = parseInt(String(hx).replace("#", ""), 16); var r = Math.min(255, Math.round(((n >> 16) & 255) * k)), g = Math.min(255, Math.round(((n >> 8) & 255) * k)), b = Math.min(255, Math.round((n & 255) * k)); return "rgb(" + r + "," + g + "," + b + ")"; }
