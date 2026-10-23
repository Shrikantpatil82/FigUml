/**
 * FigUML Custom Diagram Engine — Full Rewrite
 * Pure SVG renderers for: Class, Sequence, Activity, Use Case, ER (Chen), DFD
 */
import dagre from '@dagrejs/dagre';

// ============================================================================
// SHARED UTILITIES
// ============================================================================

const COLORS = {
    primary: '#6366f1', primaryLight: '#e0e1ff',
    accent: '#06b6d4', accentLight: '#cffafe',
    green: '#10b981', greenLight: '#d1fae5',
    orange: '#f59e0b', orangeLight: '#fef3c7',
    pink: '#ec4899', pinkLight: '#fce7f3',
    red: '#ef4444',
    bg: '#ffffff', text: '#1e293b', textLight: '#64748b',
    border: '#cbd5e1', line: '#475569',
};

const CLASS_PALETTE = ['#6366f1', '#06b6d4', '#10b981', '#f59e0b', '#ec4899', '#ef4444', '#8b5cf6', '#14b8a6'];

function esc(str) { return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
function escapeHtml(str) { return esc(str); }
function mt(text, fs = 14) { return text.length * fs * 0.58; }
function measureText(t, f) { return mt(t, f); }

function boxEdge(box, tx, ty) {
    const cx = box.x + box.w / 2, cy = box.y + box.h / 2, dx = tx - cx, dy = ty - cy;
    if (!dx && !dy) return { x: cx, y: cy };
    const s = Math.abs(dx) * (box.h / 2) > Math.abs(dy) * (box.w / 2) ? (box.w / 2) / Math.abs(dx) : (box.h / 2) / Math.abs(dy);
    return { x: cx + dx * s, y: cy + dy * s };
}
function getBoxEdgePoint(b, tx, ty) { return boxEdge(b, tx, ty); }

function wrapSvg(content, w, h) {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" style="font-family:'Inter',-apple-system,sans-serif;">
  <defs>
    <marker id="ah" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto"><polygon points="0 0,10 3.5,0 7" fill="${COLORS.line}"/></marker>
    <marker id="ah-open" markerWidth="12" markerHeight="8" refX="11" refY="4" orient="auto"><polyline points="1 1,11 4,1 7" fill="none" stroke="${COLORS.line}" stroke-width="1.5"/></marker>
    <marker id="ah-tri" markerWidth="14" markerHeight="10" refX="13" refY="5" orient="auto"><polygon points="1 1,13 5,1 9" fill="${COLORS.bg}" stroke="${COLORS.line}" stroke-width="1.5"/></marker>
    <marker id="ah-diamond" markerWidth="14" markerHeight="10" refX="14" refY="5" orient="auto"><polygon points="0 5,7 1,14 5,7 9" fill="${COLORS.line}"/></marker>
    <marker id="ah-diamond-o" markerWidth="14" markerHeight="10" refX="14" refY="5" orient="auto"><polygon points="0 5,7 1,14 5,7 9" fill="${COLORS.bg}" stroke="${COLORS.line}" stroke-width="1"/></marker>
  </defs>
  ${content}
</svg>`;
}

// ============================================================================
// CLASS DIAGRAM
// ============================================================================

function parseClassDiagram(code) {
    const classes = [], relations = [];
    const lines = code.split('\n').map(l => l.trim()).filter(l => l);
    let cur = null, sec = 'attr';
    for (const line of lines) {
        // Relation with optional cardinality: A "1" --> "0..*" B : label
        const rm = line.match(/^(\w+)\s*(?:"([^"]*)")?\s*(--|->|<>--|<>->|\.\.|\.>|<\|--|<\|\.\.)\s*(?:"([^"]*)")?\s*(\w+)(?:\s*:\s*(.+))?$/);
        if (rm) { relations.push({ from: rm[1], to: rm[5], type: rm[3], label: rm[6] || '', cardFrom: rm[2] || '', cardTo: rm[4] || '' }); continue; }
        // Class header with optional color: class Name #hexcolor {
        const cm = line.match(/^class\s+(\w+)(?:\s+(#[0-9a-fA-F]{3,8}))?\s*\{?\s*$/);
        if (cm) { cur = { name: cm[1], color: cm[2] || '', attributes: [], methods: [] }; classes.push(cur); sec = 'attr'; continue; }
        if (line === '}') { cur = null; continue; }
        if (line === '---' && cur) { sec = 'meth'; continue; }
        if (cur && line) {
            if (line.includes('(') || sec === 'meth') { cur.methods.push(line); sec = 'meth'; }
            else cur.attributes.push(line);
        }
    }
    return { classes, relations };
}

function renderClassDiagram(code) {
    const { classes, relations } = parseClassDiagram(code);
    if (!classes.length) return null;
    const HDR = 36, LH = 24, PAD = 16, GAP = 160, MARGIN = 60, MIN_W = 180;

    const boxes = classes.map((c, i) => {
        const nw = mt(c.name, 15) + PAD * 2;
        const aw = c.attributes.reduce((m, a) => Math.max(m, mt(a, 13) + PAD * 2), 0);
        const mw = c.methods.reduce((m, a) => Math.max(m, mt(a, 13) + PAD * 2), 0);
        const w = Math.max(MIN_W, nw, aw, mw);
        const attrH = c.attributes.length ? c.attributes.length * LH + 10 : 16;
        const methH = c.methods.length ? c.methods.length * LH + 10 : 16;
        const h = HDR + attrH + methH;
        const color = c.color || COLORS.primary;
        return { ...c, w, h, attrH, methH, idx: i, color };
    });

    const cols = Math.min(boxes.length, 3), rows = Math.ceil(boxes.length / cols);
    const colW = []; for (let c = 0; c < cols; c++) { let mx = 0; for (let r = 0; r < rows; r++) { const i = r * cols + c; if (i < boxes.length) mx = Math.max(mx, boxes[i].w); } colW.push(mx); }
    const rowH = []; for (let r = 0; r < rows; r++) { let mx = 0; for (let c = 0; c < cols; c++) { const i = r * cols + c; if (i < boxes.length) mx = Math.max(mx, boxes[i].h); } rowH.push(mx); }
    let totalW = MARGIN * 2; colW.forEach(c => totalW += c + GAP); totalW -= GAP;
    let totalH = MARGIN * 2; rowH.forEach(r => totalH += r + GAP); totalH -= GAP;

    boxes.forEach((b, i) => {
        const r = Math.floor(i / cols), c = i % cols;
        let x = MARGIN; for (let cc = 0; cc < c; cc++) x += colW[cc] + GAP;
        let y = MARGIN; for (let rr = 0; rr < r; rr++) y += rowH[rr] + GAP;
        b.x = x; b.y = y;
    });

    let svg = "";
    const cmap = {}; boxes.forEach(b => { cmap[b.name] = b; });

    // Draw boxes
    for (const b of boxes) {
        const { x, y, w, h, name, attributes, methods, attrH, methH, color } = b;
        svg += '<rect x="' + (x + 2) + '" y="' + (y + 2) + '" width="' + w + '" height="' + h + '" rx="6" fill="rgba(0,0,0,0.05)"/>';
        svg += '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="6" fill="' + COLORS.bg + '" stroke="' + color + '" stroke-width="2"/>';
        svg += '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + HDR + '" rx="6" fill="' + color + '"/>';
        svg += '<rect x="' + x + '" y="' + (y + HDR - 6) + '" width="' + w + '" height="6" fill="' + color + '"/>';
        svg += '<text x="' + (x + w / 2) + '" y="' + (y + 23) + '" text-anchor="middle" font-size="14" font-weight="700" fill="white">' + esc(name) + '</text>';
        svg += '<line x1="' + x + '" y1="' + (y + HDR) + '" x2="' + (x + w) + '" y2="' + (y + HDR) + '" stroke="' + color + '" stroke-width="1"/>';
        var ay = y + HDR + 6;
        for (var ai = 0; ai < attributes.length; ai++) { svg += '<text x="' + (x + 12) + '" y="' + (ay + 14) + '" font-size="13" fill="' + COLORS.text + '">' + esc(attributes[ai]) + '</text>'; ay += LH; }
        var methY2 = y + HDR + attrH;
        svg += '<line x1="' + x + '" y1="' + methY2 + '" x2="' + (x + w) + '" y2="' + methY2 + '" stroke="' + COLORS.border + '" stroke-width="1"/>';
        var my2 = methY2 + 6;
        for (var mi = 0; mi < methods.length; mi++) { svg += '<text x="' + (x + 12) + '" y="' + (my2 + 14) + '" font-size="13" fill="' + COLORS.text + '">' + esc(methods[mi]) + '</text>'; my2 += LH; }
    }

    // Draw relations with orthogonal routing
    for (var ri = 0; ri < relations.length; ri++) {
        var rel = relations[ri];
        var from = cmap[rel.from], to = cmap[rel.to];
        if (!from || !to) continue;

        var fc = { x: from.x + from.w / 2, y: from.y + from.h / 2 };
        var tc = { x: to.x + to.w / 2, y: to.y + to.h / 2 };
        var dx = tc.x - fc.x, dy = tc.y - fc.y;

        var marker = 'url(#ah)', dash = "";
        if (rel.type === "--") marker = "";
        if (rel.type === ".." || rel.type === ".>") dash = 'stroke-dasharray="6,4"';
        if (rel.type === "<|--" || rel.type === "<|..") marker = "url(#ah-tri)";
        if (rel.type === "<>--") marker = "url(#ah-diamond)";
        if (rel.type === "<>->") marker = "url(#ah-diamond-o)";

        var fp, tp, labelX, labelY, pathSvg;

        // Helper: check if segment crosses any box
        var segCrossesBox = function(x1, y1, x2, y2) {
            for (var ci = 0; ci < boxes.length; ci++) {
                var cb = boxes[ci];
                if (cb.name === rel.from || cb.name === rel.to) continue;
                var cx1 = cb.x - 5, cy1b = cb.y - 5, cx2 = cb.x + cb.w + 5, cy2b = cb.y + cb.h + 5;
                for (var ct = 0.1; ct <= 0.9; ct += 0.1) {
                    var cpx = x1 + (x2 - x1) * ct, cpy = y1 + (y2 - y1) * ct;
                    if (cpx > cx1 && cpx < cx2 && cpy > cy1b && cpy < cy2b) return true;
                }
            }
            return false;
        };

        // Determine grid position
        var fromRow = Math.floor(from.idx / 3), fromCol = from.idx % 3;
        var toRow = Math.floor(to.idx / 3), toCol = to.idx % 3;
        var sameRow = fromRow === toRow;
        var sameCol = fromCol === toCol;

        if (sameCol && !sameRow) {
            // Same column, different row: straight vertical
            if (dy > 0) {
                fp = { x: fc.x, y: from.y + from.h };
                tp = { x: tc.x, y: to.y };
            } else {
                fp = { x: fc.x, y: from.y };
                tp = { x: tc.x, y: to.y + to.h };
            }
            labelX = fp.x + 10; labelY = (fp.y + tp.y) / 2;
            pathSvg = '<line x1="' + fp.x + '" y1="' + fp.y + '" x2="' + tp.x + '" y2="' + tp.y + '" stroke="' + COLORS.line + '" stroke-width="1.5" ' + dash + ' marker-end="' + marker + '"/>';

        } else if (sameRow && !sameCol) {
            // Same row: try straight horizontal first
            var hfp, htp;
            if (dx > 0) {
                hfp = { x: from.x + from.w, y: fc.y };
                htp = { x: to.x, y: fc.y };
            } else {
                hfp = { x: from.x, y: fc.y };
                htp = { x: to.x + to.w, y: fc.y };
            }

            if (!segCrossesBox(hfp.x, hfp.y, htp.x, htp.y)) {
                // Straight horizontal
                fp = hfp; tp = htp;
                labelX = (fp.x + tp.x) / 2; labelY = fp.y - 12;
                pathSvg = '<line x1="' + fp.x + '" y1="' + fp.y + '" x2="' + tp.x + '" y2="' + tp.y + '" stroke="' + COLORS.line + '" stroke-width="1.5" ' + dash + ' marker-end="' + marker + '"/>';
            } else {
                // Crosses a box: L-shape above or below
                // Try going below first
                var belowY = 0;
                for (var bj = 0; bj < boxes.length; bj++) {
                    belowY = Math.max(belowY, boxes[bj].y + boxes[bj].h);
                }
                belowY += 30;

                var aboveY = Infinity;
                for (var bk = 0; bk < boxes.length; bk++) {
                    aboveY = Math.min(aboveY, boxes[bk].y);
                }
                aboveY -= 30;

                // Check which detour is shorter
                var belowDist = Math.abs(fc.y - belowY) + Math.abs(belowY - tc.y);
                var aboveDist = Math.abs(fc.y - aboveY) + Math.abs(aboveY - tc.y);
                var detourY = belowDist < aboveDist ? belowY : aboveY;

                fp = { x: fc.x, y: detourY < fc.y ? from.y : from.y + from.h };
                tp = { x: tc.x, y: detourY < tc.y ? to.y : to.y + to.h };
                labelX = (fp.x + tp.x) / 2; labelY = detourY - 8;
                pathSvg = '<path d="M ' + fp.x + ' ' + fp.y + ' L ' + fp.x + ' ' + detourY + ' L ' + tp.x + ' ' + detourY + ' L ' + tp.x + ' ' + tp.y + '" fill="none" stroke="' + COLORS.line + '" stroke-width="1.5" ' + dash + ' marker-end="' + marker + '"/>';
            }

        } else {
            // Different row and different column: L-shape routing
            // Try horizontal-first (exit right/left, then go up/down)
            var hfpX = dx > 0 ? from.x + from.w : from.x;
            var hfpY = fc.y;
            var htpX = tc.x;
            var htpY = dy > 0 ? to.y : to.y + to.h;
            var hCornerX = tc.x, hCornerY = fc.y;

            // Try vertical-first (exit top/bottom, then go right/left)
            var vfpX = fc.x;
            var vfpY = dy > 0 ? from.y + from.h : from.y;
            var vtpX = dx > 0 ? to.x : to.x + to.w;
            var vtpY = tc.y;
            var vCornerX = fc.x, vCornerY = tc.y;

            var hCross = segCrossesBox(hfpX, hfpY, hCornerX, hCornerY) || segCrossesBox(hCornerX, hCornerY, htpX, htpY);
            var vCross = segCrossesBox(vfpX, vfpY, vCornerX, vCornerY) || segCrossesBox(vCornerX, vCornerY, vtpX, vtpY);

            if (!hCross) {
                fp = { x: hfpX, y: hfpY }; tp = { x: htpX, y: htpY };
                labelX = hCornerX + 10; labelY = hCornerY - 8;
                pathSvg = '<path d="M ' + fp.x + ' ' + fp.y + ' L ' + hCornerX + ' ' + hCornerY + ' L ' + tp.x + ' ' + tp.y + '" fill="none" stroke="' + COLORS.line + '" stroke-width="1.5" ' + dash + ' marker-end="' + marker + '"/>';
            } else if (!vCross) {
                fp = { x: vfpX, y: vfpY }; tp = { x: vtpX, y: vtpY };
                labelX = vCornerX + 10; labelY = vCornerY - 8;
                pathSvg = '<path d="M ' + fp.x + ' ' + fp.y + ' L ' + vCornerX + ' ' + vCornerY + ' L ' + tp.x + ' ' + tp.y + '" fill="none" stroke="' + COLORS.line + '" stroke-width="1.5" ' + dash + ' marker-end="' + marker + '"/>';
            } else {
                // U-shape detour
                var detX = (dx > 0 ? Math.min(from.x, to.x) - 40 : Math.max(from.x + from.w, to.x + to.w) + 40);
                fp = { x: dx > 0 ? from.x : from.x + from.w, y: fc.y };
                tp = { x: dx > 0 ? to.x : to.x + to.w, y: tc.y };
                labelX = detX + 10; labelY = (fp.y + tp.y) / 2 - 8;
                pathSvg = '<path d="M ' + fp.x + ' ' + fp.y + ' L ' + detX + ' ' + fp.y + ' L ' + detX + ' ' + tp.y + ' L ' + tp.x + ' ' + tp.y + '" fill="none" stroke="' + COLORS.line + '" stroke-width="1.5" ' + dash + ' marker-end="' + marker + '"/>';
            }
        }

        svg += pathSvg;

        // Label near the path
        if (rel.label) {
            var lw = mt(rel.label, 11) + 8;
            svg += '<rect x="' + (labelX - lw / 2) + '" y="' + (labelY - 6) + '" width="' + lw + '" height="16" fill="white" rx="2"/>';
            svg += '<text x="' + labelX + '" y="' + (labelY + 6) + '" text-anchor="middle" font-size="11" font-style="italic" fill="' + COLORS.textLight + '">' + esc(rel.label) + '</text>';
        }
        if (rel.cardFrom) {
            var cf1x = fp.x + (tp.x - fp.x) * 0.06, cf1y = fp.y + (tp.y - fp.y) * 0.06;
            svg += '<text x="' + (cf1x + 8) + '" y="' + (cf1y - 8) + '" font-size="11" fill="' + COLORS.text + '">' + esc(rel.cardFrom) + '</text>';
        }
        if (rel.cardTo) {
            var ct1x = tp.x + (fp.x - tp.x) * 0.06, ct1y = tp.y + (fp.y - tp.y) * 0.06;
            svg += '<text x="' + (ct1x + 8) + '" y="' + (ct1y - 8) + '" font-size="11" fill="' + COLORS.text + '">' + esc(rel.cardTo) + '</text>';
        }
    }
    return wrapSvg(svg, totalW, totalH);
}

// ============================================================================
// SEQUENCE DIAGRAM (with activation boxes)
// ============================================================================

function parseSequenceDiagram(code) {
    const participants = [], messages = [];
    const lines = code.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('#'));
    for (const line of lines) {
        const pm = line.match(/^participant\s+(.+)$/i);
        if (pm) { const n = pm[1].replace(/"/g, '').trim(); if (!participants.includes(n)) participants.push(n); continue; }
        const mm = line.match(/^(.+?)\s*(->|-->|->>{1}|-->>)\s*(.+?):\s*(.+)$/);
        if (mm) { const f = mm[1].trim(), t = mm[3].trim(); if (!participants.includes(f)) participants.push(f); if (!participants.includes(t)) participants.push(t); messages.push({ from: f, to: t, type: mm[2], text: mm[4].trim() }); continue; }
        const nm = line.match(/^note\s+(?:over\s+)?(.+?):\s*(.+)$/i);
        if (nm) messages.push({ type: 'note', over: nm[1].trim(), text: nm[2].trim() });
    }
    return { participants, messages };
}

function renderSequenceDiagram(code) {
    const { participants, messages } = parseSequenceDiagram(code);
    if (!participants.length) return null;
    const PW = 120, PH = 40, GAP = 180, MG = 50, PAD = 50;
    const pp = {}; participants.forEach((p, i) => { pp[p] = PAD + i * GAP + GAP / 2; });
    const totalW = PAD * 2 + participants.length * GAP, totalH = PH + PAD * 2 + messages.length * MG + PAD + 40;
    let svg = '';
    const hY = PAD, slY = hY + PH, elY = totalH - PAD;

    // Activation tracking
    const active = {};
    messages.forEach((m, i) => {
        if (m.type === 'note') return;
        if (!active[m.from]) active[m.from] = [];
        if (!active[m.to]) active[m.to] = [];
        active[m.from].push(i); active[m.to].push(i);
    });

    for (const p of participants) {
        const x = pp[p];
        svg += `<line x1="${x}" y1="${slY}" x2="${x}" y2="${elY}" stroke="${COLORS.border}" stroke-width="1.5" stroke-dasharray="6,4"/>`;
        // Activation box: thin rect where participant is active
        const acts = active[p] || [];
        if (acts.length >= 2) {
            const startI = acts[0], endI = acts[acts.length - 1];
            const ay1 = slY + 30 + startI * MG - 5, ay2 = slY + 30 + endI * MG + 5;
            svg += `<rect x="${x - 5}" y="${ay1}" width="10" height="${ay2 - ay1}" fill="${COLORS.primaryLight}" stroke="${COLORS.primary}" stroke-width="1" rx="2"/>`;
        }
        svg += `<rect x="${x - PW / 2}" y="${hY}" width="${PW}" height="${PH}" rx="8" fill="${COLORS.primary}"/>`;
        svg += `<text x="${x}" y="${hY + 25}" text-anchor="middle" font-size="13" font-weight="600" fill="white">${esc(p)}</text>`;
    }

    let msgY = slY + 30;
    for (const msg of messages) {
        if (msg.type === 'note') {
            const ox = pp[msg.over] || totalW / 2, nw = mt(msg.text, 12) + 20;
            svg += `<rect x="${ox - nw / 2}" y="${msgY - 15}" width="${nw}" height="28" rx="4" fill="${COLORS.orangeLight}" stroke="${COLORS.orange}" stroke-width="1"/>`;
            svg += `<text x="${ox}" y="${msgY + 3}" text-anchor="middle" font-size="12" fill="${COLORS.text}">${esc(msg.text)}</text>`;
            msgY += MG; continue;
        }
        const fx = pp[msg.from], tx = pp[msg.to];
        if (fx === undefined || tx === undefined) { msgY += MG; continue; }
        const self = msg.from === msg.to, dashed = msg.type === '-->' || msg.type === '-->>';
        if (self) {
            svg += `<path d="M ${fx} ${msgY} L ${fx + 45} ${msgY} L ${fx + 45} ${msgY + 25} L ${fx + 5} ${msgY + 25}" fill="none" stroke="${COLORS.line}" stroke-width="1.5" ${dashed ? 'stroke-dasharray="6,4"' : ''} marker-end="url(#ah)"/>`;
            svg += `<text x="${fx + 50}" y="${msgY + 14}" font-size="12" fill="${COLORS.text}">${esc(msg.text)}</text>`;
        } else {
            svg += `<line x1="${fx}" y1="${msgY}" x2="${tx}" y2="${msgY}" stroke="${COLORS.line}" stroke-width="1.5" ${dashed ? 'stroke-dasharray="6,4"' : ''} marker-end="url(#ah)"/>`;
            svg += `<text x="${(fx + tx) / 2}" y="${msgY - 8}" text-anchor="middle" font-size="12" fill="${COLORS.text}">${esc(msg.text)}</text>`;
        }
        msgY += MG;
    }
    return wrapSvg(svg, totalW, totalH);
}

// ============================================================================
// ACTIVITY DIAGRAM
// ============================================================================

function parseActivityDiagram(code) {
    const nodes = [], edges = [];
    const lines = code.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('#'));
    let id = 0; const nmap = {};
    function getNode(name, type = 'action') {
        const k = name.toLowerCase();
        if (nmap[k]) return nmap[k];
        const n = { id: 'n' + (id++), name, type }; nodes.push(n); nmap[k] = n; return n;
    }
    for (const line of lines) {
        if (line.match(/^\(start\)$/i)) { getNode('Start', 'start'); continue; }
        if (line.match(/^\(end\)$/i)) { getNode('End', 'end'); continue; }
        if (line.match(/^\[fork\]$/i)) { getNode('Fork', 'fork'); continue; }
        if (line.match(/^\[join\]$/i)) { getNode('Join', 'join'); continue; }
        const dm = line.match(/^<(.+)>$/);
        if (dm) { getNode(dm[1], 'decision'); continue; }
        const em = line.match(/^(.+?)\s*->\s*(.+?)(?:\s*:\s*(.+))?$/);
        if (em) {
            let fn = em[1].trim(), tn = em[2].trim(), lb = em[3]?.trim() || '';
            let ft = 'action', tt = 'action';
            if (fn.match(/^\(start\)$/i)) { fn = 'Start'; ft = 'start'; }
            if (fn.match(/^\(end\)$/i)) { fn = 'End'; ft = 'end'; }
            if (tn.match(/^\(start\)$/i)) { tn = 'Start'; tt = 'start'; }
            if (tn.match(/^\(end\)$/i)) { tn = 'End'; tt = 'end'; }
            if (fn.match(/^\[fork\]$/i)) { fn = 'Fork'; ft = 'fork'; }
            if (fn.match(/^\[join\]$/i)) { fn = 'Join'; ft = 'join'; }
            if (tn.match(/^\[fork\]$/i)) { tn = 'Fork'; tt = 'fork'; }
            if (tn.match(/^\[join\]$/i)) { tn = 'Join'; tt = 'join'; }
            if (fn.startsWith('<') && fn.endsWith('>')) { fn = fn.slice(1, -1); ft = 'decision'; }
            if (tn.startsWith('<') && tn.endsWith('>')) { tn = tn.slice(1, -1); tt = 'decision'; }
            edges.push({ from: getNode(fn, ft).id, to: getNode(tn, tt).id, label: lb });
        }
    }
    return { nodes, edges };
}

function renderActivityDiagram(code) {
    const { nodes, edges } = parseActivityDiagram(code);
    if (!nodes.length) return null;

    const g = new dagre.graphlib.Graph();
    g.setGraph({ rankdir: 'TB', ranksep: 120, nodesep: 80, marginx: 40, marginy: 40 });
    g.setDefaultEdgeLabel(() => ({}));

    const nmap = {};
    nodes.forEach(n => { nmap[n.id] = n; });

    for (const n of nodes) {
        let w, h;
        if (n.type === 'start' || n.type === 'end') {
            w = 36; h = 36;
        } else if (n.type === 'decision') {
            const ds = Math.max(60, mt(n.name, 12) + 36);
            w = ds; h = ds;
        } else if (n.type === 'fork' || n.type === 'join') {
            w = 160; h = 8;
        } else {
            w = Math.max(140, mt(n.name, 13) + 40); h = 40;
        }
        g.setNode(n.id, { label: n.name, width: w, height: h });
    }

    for (const e of edges) {
        g.setEdge(e.from, e.to, { label: e.label || '' });
    }

    dagre.layout(g);

    const graphInfo = g.graph();
    const totalW = Math.max(graphInfo.width + 80, 400);
    const totalH = Math.max(graphInfo.height + 80, 300);

    let svg = '';

    for (const n of nodes) {
        const nd = g.node(n.id);
        if (!nd) continue;
        const { x, y } = nd;

        if (n.type === 'start') {
            svg += `<circle cx="${x}" cy="${y}" r="14" fill="${COLORS.text}"/>`;
        } else if (n.type === 'end') {
            svg += `<circle cx="${x}" cy="${y}" r="16" fill="none" stroke="${COLORS.text}" stroke-width="3"/>`;
            svg += `<circle cx="${x}" cy="${y}" r="9" fill="${COLORS.text}"/>`;
        } else if (n.type === 'decision') {
            const ds = Math.max(60, mt(n.name, 12) + 36), hd = ds / 2;
            svg += `<polygon points="${x},${y - hd} ${x + hd},${y} ${x},${y + hd} ${x - hd},${y}" fill="${COLORS.orangeLight}" stroke="${COLORS.orange}" stroke-width="2"/>`;
            svg += `<text x="${x}" y="${y + 5}" text-anchor="middle" font-size="12" font-weight="600" fill="${COLORS.text}">${esc(n.name)}</text>`;
        } else if (n.type === 'fork' || n.type === 'join') {
            const bw = nd.width, bh = 6;
            svg += `<rect x="${x - bw / 2}" y="${y - bh / 2}" width="${bw}" height="${bh}" rx="2" fill="${COLORS.text}"/>`;
        } else {
            const w = nd.width, h = nd.height;
            svg += `<rect x="${x - w / 2}" y="${y - h / 2}" width="${w}" height="${h}" rx="20" fill="${COLORS.primaryLight}" stroke="${COLORS.primary}" stroke-width="2"/>`;
            svg += `<text x="${x}" y="${y + 5}" text-anchor="middle" font-size="13" font-weight="600" fill="${COLORS.text}">${esc(n.name)}</text>`;
        }
    }

    // Helper: clip a point to diamond boundary
    function clipToDiamond(cx, cy, halfSize, fromX, fromY) {
        const dx = fromX - cx, dy = fromY - cy;
        if (dx === 0 && dy === 0) return { x: cx, y: cy - halfSize };
        const absDx = Math.abs(dx), absDy = Math.abs(dy);
        const sum = absDx + absDy;
        if (sum === 0) return { x: cx, y: cy - halfSize };
        const scale = halfSize / sum;
        return { x: cx + dx * scale, y: cy + dy * scale };
    }

    for (const e of edges) {
        const edgeData = g.edge(e.from, e.to);
        if (!edgeData || !edgeData.points) continue;
        const pts = edgeData.points.map(p => ({ x: p.x, y: p.y }));

        // Clip start point to source diamond boundary
        const fromNode = nmap[e.from];
        if (fromNode && fromNode.type === 'decision') {
            const nd = g.node(e.from);
            const ds = Math.max(60, mt(fromNode.name, 12) + 36);
            const nextPt = pts[1] || pts[pts.length - 1];
            pts[0] = clipToDiamond(nd.x, nd.y, ds / 2, nextPt.x, nextPt.y);
        }

        // Clip end point to target diamond boundary
        const toNode = nmap[e.to];
        if (toNode && toNode.type === 'decision') {
            const nd = g.node(e.to);
            const ds = Math.max(60, mt(toNode.name, 12) + 36);
            const prevPt = pts[pts.length - 2] || pts[0];
            pts[pts.length - 1] = clipToDiamond(nd.x, nd.y, ds / 2, prevPt.x, prevPt.y);
        }

        if (pts.length >= 3) {
            let d = `M ${pts[0].x} ${pts[0].y}`;
            for (let i = 1; i < pts.length - 1; i += 2) {
                const cp = pts[i];
                const next = pts[i + 1] || pts[pts.length - 1];
                d += ` Q ${cp.x} ${cp.y} ${next.x} ${next.y}`;
            }
            if (pts.length % 2 === 0) {
                d += ` L ${pts[pts.length - 1].x} ${pts[pts.length - 1].y}`;
            }
            svg += `<path d="${d}" fill="none" stroke="${COLORS.line}" stroke-width="1.5" marker-end="url(#ah)"/>`;
        } else {
            svg += `<line x1="${pts[0].x}" y1="${pts[0].y}" x2="${pts[pts.length - 1].x}" y2="${pts[pts.length - 1].y}" stroke="${COLORS.line}" stroke-width="1.5" marker-end="url(#ah)"/>`;
        }

        if (e.label) {
            const lp = pts[1] || pts[0];
            svg += `<text x="${lp.x + 10}" y="${lp.y + 4}" font-size="11" fill="${COLORS.textLight}">${esc(e.label)}</text>`;
        }
    }

    return wrapSvg(svg, totalW, totalH);
}

// ============================================================================
// USE CASE DIAGRAM
// ============================================================================

function parseUseCaseDiagram(code) {
    const actors = [], usecases = [], relations = [];
    let systemName = 'System';
    const lines = code.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('#'));
    for (const line of lines) {
        const sm = line.match(/^system\s+["']?(.+?)["']?\s*$/i);
        if (sm) { systemName = sm[1]; continue; }
        const am = line.match(/^actor\s+(.+)$/i);
        if (am) { const n = am[1].replace(/"/g, '').trim(); if (!actors.includes(n)) actors.push(n); continue; }
        const um = line.match(/^usecase\s+(.+)$/i);
        if (um) { const n = um[1].replace(/"/g, '').trim(); if (!usecases.includes(n)) usecases.push(n); continue; }
        // Relations: A -> B, A ..> B : <<include>>, A ..> B : <<extend>>
        const rm = line.match(/^(.+?)\s*(->|\.\.>)\s*(.+?)(?:\s*:\s*(.+))?$/);
        if (rm) {
            const from = rm[1].replace(/"/g, '').trim(), to = rm[3].replace(/"/g, '').trim();
            const label = rm[4]?.trim() || '', type = rm[2];
            if (!actors.includes(from) && !usecases.includes(from)) {
                if (actors.length === 0 || label.includes('include') || label.includes('extend')) usecases.push(from);
                else if (type === '..>') usecases.push(from);
                else actors.push(from);
            }
            if (!actors.includes(to) && !usecases.includes(to)) usecases.push(to);
            relations.push({ from, to, label, type });
        }
    }
    return { actors: [...new Set(actors)], usecases: [...new Set(usecases)], relations, systemName };
}

function renderUseCaseDiagram(code) {
    const { actors, usecases, relations, systemName } = parseUseCaseDiagram(code);
    if (!actors.length && !usecases.length) return null;
    const UCW = 160, UCH = 50, PAD = 80, GV = 90, AA = 160;
    const ucC = Math.max(usecases.length, 1);
    const totalH = PAD * 2 + ucC * GV + 60, totalW = AA * 2 + UCW + PAD * 3;

    const pos = {};
    // Place use cases in center
    const ucSY = (totalH - ucC * GV) / 2 + GV / 2;
    usecases.forEach((uc, i) => {
        const w = Math.max(UCW, mt(uc, 13) + 40);
        pos[uc] = { x: totalW / 2, y: ucSY + i * GV, type: 'uc', w, h: UCH };
    });

    // Place actors
    const actConn = {};
    for (const r of relations) {
        if (actors.includes(r.from) && pos[r.to]) { if (!actConn[r.from]) actConn[r.from] = []; actConn[r.from].push(pos[r.to].y); }
        if (actors.includes(r.to) && pos[r.from]) { if (!actConn[r.to]) actConn[r.to] = []; actConn[r.to].push(pos[r.from].y); }
    }
    const half = Math.ceil(actors.length / 2);
    actors.forEach((a, i) => {
        const isL = i < half, x = isL ? PAD + AA / 2 : totalW - PAD - AA / 2;
        let y = actConn[a]?.length ? actConn[a].reduce((a, b) => a + b, 0) / actConn[a].length : PAD + (isL ? i : i - half) * GV + GV / 2;
        pos[a] = { x, y, type: 'actor', w: 32, h: 60 };
    });

    let svg = '';
    // System boundary
    const sX = AA + PAD, sW = totalW - 2 * (AA + PAD);
    svg += `<rect x="${sX}" y="${PAD / 2}" width="${sW}" height="${totalH - PAD}" rx="12" fill="none" stroke="${COLORS.border}" stroke-width="2" stroke-dasharray="8,4"/>`;
    svg += `<text x="${sX + sW / 2}" y="${PAD / 2 + 24}" text-anchor="middle" font-size="16" font-weight="700" fill="${COLORS.text}">${esc(systemName)}</text>`;

    // Actors
    for (const a of actors) {
        const p = pos[a]; if (!p) continue;
        const { x, y } = p;
        svg += `<circle cx="${x}" cy="${y - 24}" r="12" fill="none" stroke="${COLORS.primary}" stroke-width="2"/>`;
        svg += `<line x1="${x}" y1="${y - 12}" x2="${x}" y2="${y + 10}" stroke="${COLORS.primary}" stroke-width="2"/>`;
        svg += `<line x1="${x - 16}" y1="${y - 2}" x2="${x + 16}" y2="${y - 2}" stroke="${COLORS.primary}" stroke-width="2"/>`;
        svg += `<line x1="${x}" y1="${y + 10}" x2="${x - 14}" y2="${y + 28}" stroke="${COLORS.primary}" stroke-width="2"/>`;
        svg += `<line x1="${x}" y1="${y + 10}" x2="${x + 14}" y2="${y + 28}" stroke="${COLORS.primary}" stroke-width="2"/>`;
        svg += `<text x="${x}" y="${y + 44}" text-anchor="middle" font-size="12" font-weight="500" fill="${COLORS.text}">${esc(a)}</text>`;
    }
    // Use cases
    for (const uc of usecases) {
        const p = pos[uc]; if (!p) continue;
        const { x, y, w } = p;
        svg += `<ellipse cx="${x}" cy="${y}" rx="${w / 2}" ry="${UCH / 2}" fill="${COLORS.primaryLight}" stroke="${COLORS.primary}" stroke-width="2"/>`;
        // Multi-line text if needed
        const words = uc.split(' ');
        if (words.length > 2 && mt(uc, 13) > w - 20) {
            const m = Math.ceil(words.length / 2);
            svg += `<text x="${x}" y="${y - 3}" text-anchor="middle" font-size="13" font-weight="500" fill="${COLORS.text}">${esc(words.slice(0, m).join(' '))}</text>`;
            svg += `<text x="${x}" y="${y + 13}" text-anchor="middle" font-size="13" font-weight="500" fill="${COLORS.text}">${esc(words.slice(m).join(' '))}</text>`;
        } else {
            svg += `<text x="${x}" y="${y + 4}" text-anchor="middle" font-size="13" font-weight="500" fill="${COLORS.text}">${esc(uc)}</text>`;
        }
    }
    // Relations
    for (const r of relations) {
        const f = pos[r.from], t = pos[r.to]; if (!f || !t) continue;
        let fx = f.x, fy = f.y, tx = t.x, ty = t.y;
        if (f.type === 'actor') { fx = t.x > f.x ? f.x + 16 : f.x - 16; fy = f.y - 2; }
        if (t.type === 'uc') {
            const rx = (t.w || UCW) / 2, ry = UCH / 2, ang = Math.atan2(fy - t.y, fx - t.x);
            tx = t.x + rx * Math.cos(ang); ty = t.y + ry * Math.sin(ang);
        }
        if (f.type === 'uc') {
            const rx = (f.w || UCW) / 2, ry = UCH / 2, ang = Math.atan2(ty - f.y, tx - f.x);
            fx = f.x + rx * Math.cos(ang); fy = f.y + ry * Math.sin(ang);
        }
        const dash = r.type === '..>' ? 'stroke-dasharray="6,4"' : '';
        const marker = r.type === '..>' ? 'marker-end="url(#ah-open)"' : '';
        svg += `<line x1="${fx}" y1="${fy}" x2="${tx}" y2="${ty}" stroke="${COLORS.border}" stroke-width="1.5" ${dash} ${marker}/>`;
        if (r.label) {
            const mx = (fx + tx) / 2, my = (fy + ty) / 2;
            svg += `<text x="${mx}" y="${my - 6}" text-anchor="middle" font-size="10" font-style="italic" fill="${COLORS.textLight}">${esc(r.label)}</text>`;
        }
    }
    return wrapSvg(svg, totalW, totalH);
}

// ============================================================================
// ER DIAGRAM — Chen Notation
// ============================================================================

function parseERDiagram(code) {
    const entities = [], relationships = [];
    const lines = code.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('#'));
    let cur = null;
    for (const line of lines) {
        const em = line.match(/^entity\s+(.+?)(?:\s*\{)?\s*$/i);
        if (em) { cur = { name: em[1].replace(/"/g, '').trim(), attrs: [] }; entities.push(cur); continue; }
        if (line === '}') { cur = null; continue; }
        if (cur && line) {
            const isPK = line.startsWith('*'), isFK = line.startsWith('+');
            const clean = line.replace(/^[*+]\s*/, '').trim();
            const parts = clean.split(':').map(s => s.trim());
            cur.attrs.push({ name: parts[0], type: parts[1] || '', isPK, isFK });
            continue;
        }
        // Relationship: Entity1 -- RelName -- Entity2 : leftCard,rightCard
        const rm = line.match(/^(.+?)\s+--\s+(.+?)\s+--\s+(.+?)(?:\s*:\s*(.+))?$/);
        if (rm) {
            const cards = (rm[4] || '').split(',').map(s => s.trim());
            relationships.push({ from: rm[1].replace(/"/g, '').trim(), name: rm[2].replace(/"/g, '').trim(), to: rm[3].replace(/"/g, '').trim(), cardFrom: cards[0] || '', cardTo: cards[1] || '' });
            continue;
        }
        // Old-style: Entity1 ||--o{ Entity2 : label
        const om = line.match(/^(.+?)\s+([\|o\{]+--[\|o\{]+)\s+(.+?)(?:\s*:\s*(.+))?$/);
        if (om) {
            const c = om[2];
            let cf = '1', ct = 'M';
            if (c.includes('||')) cf = '1'; if (c.includes('o{')) ct = 'M'; if (c.includes('|{')) ct = '1..M';
            relationships.push({ from: om[1].trim(), name: om[4] || '', to: om[3].trim(), cardFrom: cf, cardTo: ct });
        }
    }
    return { entities, relationships };
}

function renderERDiagram(code) {
    const { entities, relationships } = parseERDiagram(code);
    if (!entities.length) return null;

    const EW = 140, EH = 48, AH = 28, DH = 55;
    const ATTR_GAP = 55;

    // Pre-compute attribute layout info for each entity
    const eInfo = {};
    for (const e of entities) {
        const pks = e.attrs.filter(a => a.isPK);
        const fks = e.attrs.filter(a => a.isFK);
        const regs = e.attrs.filter(a => !a.isPK && !a.isFK);
        const pkSpread = pks.length <= 1 ? 0 : Math.max(105, Math.min(120, 400 / pks.length));
        const regSpread = regs.length <= 1 ? 0 : Math.max(105, Math.min(120, 500 / regs.length));
        const entW = Math.max(EW, mt(e.name, 14) + 40);

        // Width needed: max of entity, pk fan, reg fan, plus FK space
        const pkFanW = pks.length > 0 ? (pks.length - 1) * pkSpread + 110 : 0;
        const regFanW = regs.length > 0 ? (regs.length - 1) * regSpread + 110 : 0;
        const fkSpace = fks.length > 0 ? 120 : 0;
        const fullW = Math.max(entW, pkFanW, regFanW) + fkSpace;

        // Height needed: PK space above + entity + reg space below
        const aboveH = pks.length > 0 ? ATTR_GAP + 40 + AH / 2 : 0;
        const belowH = regs.length > 0 ? ATTR_GAP + 40 + AH / 2 : 0;
        const fullH = aboveH + EH + belowH;

        eInfo[e.name] = { pks, fks, regs, pkSpread, regSpread, entW, fullW, fullH, aboveH, belowH };
    }

    // Dagre layout with inflated node sizes
    const g = new dagre.graphlib.Graph();
    g.setGraph({ rankdir: "LR", ranksep: 120, nodesep: 40, marginx: 40, marginy: 40 });
    g.setDefaultEdgeLabel(() => ({}));

    for (const e of entities) {
        const info = eInfo[e.name];
        g.setNode("e_" + e.name, { label: e.name, width: info.fullW, height: info.fullH });
    }

    relationships.forEach((r, ri) => {
        const dId = "r_" + ri;
        const dw = Math.max(100, mt(r.name, 13) + 36);
        g.setNode(dId, { label: r.name, width: dw, height: DH });
        if (r.from === r.to) {
            g.setEdge("e_" + r.from, dId, { minlen: 2 });
            g.setEdge(dId, "e_" + r.to, { minlen: 2 });
        } else {
            g.setEdge("e_" + r.from, dId);
            g.setEdge(dId, "e_" + r.to);
        }
    });

    dagre.layout(g);

    // Compute viewBox from graph bounds
    const graphInfo = g.graph();
    const pad = 50;
    const totalW = Math.max((graphInfo.width || 400) + pad * 2, 400);
    const totalH = Math.max((graphInfo.height || 300) + pad * 2, 300);

    let svg = "";

    // Draw entities and their attributes
    for (const e of entities) {
        const nd = g.node("e_" + e.name);
        if (!nd) continue;
        const info = eInfo[e.name];
        // Entity center: Dagre gives us the center of the inflated bounding box
        // The actual entity rect sits offset by aboveH from the top
        const cx = nd.x + (info.fks.length > 0 ? 30 : 0);
        const cy = nd.y - info.fullH / 2 + info.aboveH + EH / 2;
        const w = info.entW;

        svg += '<rect x="' + (cx - w / 2) + '" y="' + (cy - EH / 2) + '" width="' + w + '" height="' + EH + '" fill="' + COLORS.primaryLight + '" stroke="' + COLORS.primary + '" stroke-width="2"/>';
        svg += '<text x="' + cx + '" y="' + (cy + 5) + '" text-anchor="middle" font-size="14" font-weight="700" fill="' + COLORS.text + '">' + esc(e.name) + '</text>';

        // PK attributes: ABOVE
        info.pks.forEach((a, ai) => {
            const ax = cx + (ai - (info.pks.length - 1) / 2) * info.pkSpread;
            const ay = cy - ATTR_GAP - 35;
            const aw = Math.max(75, mt(a.name, 11) + 22);
            svg += '<line x1="' + cx + '" y1="' + (cy - EH / 2) + '" x2="' + ax + '" y2="' + (ay + AH / 2) + '" stroke="' + COLORS.border + '" stroke-width="1.5"/>';
            svg += '<ellipse cx="' + ax + '" cy="' + ay + '" rx="' + (aw / 2) + '" ry="' + (AH / 2) + '" fill="' + COLORS.accentLight + '" stroke="' + COLORS.accent + '" stroke-width="1.5"/>';
            svg += '<text x="' + ax + '" y="' + (ay + 4) + '" text-anchor="middle" font-size="11" font-weight="600" fill="' + COLORS.text + '" text-decoration="underline">' + esc(a.name) + '</text>';
        });

        // FK attributes: LEFT
        info.fks.forEach((a, ai) => {
            const ax = cx - w / 2 - ATTR_GAP - 15;
            const ay = cy + (ai - (info.fks.length - 1) / 2) * 34;
            const aw = Math.max(75, mt(a.name, 11) + 22);
            svg += '<line x1="' + (cx - w / 2) + '" y1="' + cy + '" x2="' + (ax + aw / 2) + '" y2="' + ay + '" stroke="' + COLORS.accent + '" stroke-width="1.5" stroke-dasharray="5,3"/>';
            svg += '<ellipse cx="' + ax + '" cy="' + ay + '" rx="' + (aw / 2) + '" ry="' + (AH / 2) + '" fill="' + COLORS.bg + '" stroke="' + COLORS.accent + '" stroke-width="1.5" stroke-dasharray="5,3"/>';
            svg += '<text x="' + ax + '" y="' + (ay + 4) + '" text-anchor="middle" font-size="11" fill="' + COLORS.text + '">' + esc(a.name) + '</text>';
        });

        // Regular attributes: BELOW
        info.regs.forEach((a, ai) => {
            const ax = cx + (ai - (info.regs.length - 1) / 2) * info.regSpread;
            const ay = cy + ATTR_GAP + 35;
            const aw = Math.max(75, mt(a.name, 11) + 22);
            svg += '<line x1="' + cx + '" y1="' + (cy + EH / 2) + '" x2="' + ax + '" y2="' + (ay - AH / 2) + '" stroke="' + COLORS.border + '" stroke-width="1.5"/>';
            svg += '<ellipse cx="' + ax + '" cy="' + ay + '" rx="' + (aw / 2) + '" ry="' + (AH / 2) + '" fill="' + COLORS.bg + '" stroke="' + COLORS.border + '" stroke-width="1.5"/>';
            svg += '<text x="' + ax + '" y="' + (ay + 4) + '" text-anchor="middle" font-size="11" fill="' + COLORS.text + '">' + esc(a.name) + '</text>';
        });
    }

    // Draw relationship diamonds and connection lines
    relationships.forEach((r, ri) => {
        const dId = "r_" + ri;
        const dNode = g.node(dId);
        const fNode = g.node("e_" + r.from);
        const tNode = g.node("e_" + r.to);
        if (!dNode || !fNode || !tNode) return;

        const fInfo = eInfo[r.from], tInfo = eInfo[r.to];
        const dx = dNode.x, dy = dNode.y;
        const dw = dNode.width, dh = DH;

        // Entity centers (accounting for above offset and FK shift)
        const fx = fNode.x + (fInfo.fks.length > 0 ? 30 : 0);
        const fy = fNode.y - fInfo.fullH / 2 + fInfo.aboveH + EH / 2;
        const tx = tNode.x + (tInfo.fks.length > 0 ? 30 : 0);
        const ty = tNode.y - tInfo.fullH / 2 + tInfo.aboveH + EH / 2;
        const fW = fInfo.entW, tW = tInfo.entW;

        let fEdgeX, fEdgeY, tEdgeX, tEdgeY;
        if (r.from === r.to) {
            fEdgeX = fx + fW / 2; fEdgeY = fy - EH / 4;
            tEdgeX = tx + tW / 2; tEdgeY = ty + EH / 4;
        } else {
            fEdgeX = fx + fW / 2; fEdgeY = fy;
            tEdgeX = tx - tW / 2; tEdgeY = ty;
        }

        svg += '<line x1="' + fEdgeX + '" y1="' + fEdgeY + '" x2="' + (dx - dw / 2) + '" y2="' + dy + '" stroke="' + COLORS.border + '" stroke-width="1.5"/>';
        svg += '<line x1="' + (dx + dw / 2) + '" y1="' + dy + '" x2="' + tEdgeX + '" y2="' + tEdgeY + '" stroke="' + COLORS.border + '" stroke-width="1.5"/>';

        svg += '<polygon points="' + dx + ',' + (dy - dh / 2) + ' ' + (dx + dw / 2) + ',' + dy + ' ' + dx + ',' + (dy + dh / 2) + ' ' + (dx - dw / 2) + ',' + dy + '" fill="' + COLORS.greenLight + '" stroke="' + COLORS.green + '" stroke-width="2"/>';
        svg += '<text x="' + dx + '" y="' + (dy + 5) + '" text-anchor="middle" font-size="13" font-weight="600" fill="' + COLORS.text + '">' + esc(r.name) + '</text>';

        if (r.cardFrom) {
            svg += '<text x="' + (fEdgeX + 14) + '" y="' + (fEdgeY - 12) + '" font-size="13" font-weight="700" fill="' + COLORS.accent + '">' + esc(r.cardFrom) + '</text>';
        }
        if (r.cardTo) {
            svg += '<text x="' + (tEdgeX - 14) + '" y="' + (tEdgeY - 12) + '" text-anchor="end" font-size="13" font-weight="700" fill="' + COLORS.accent + '">' + esc(r.cardTo) + '</text>';
        }
    });

    return wrapSvg(svg, totalW, totalH);
}

// ============================================================================
// DFD — Circle Processes
// ============================================================================

function parseDFD(code) {
    const processes = [], datastores = [], externals = [], flows = [], errors = [];
    const lines = code.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('#'));
    for (const line of lines) {
        const pm = line.match(/^process\s+(.+)$/i);
        if (pm) { processes.push(pm[1].replace(/"/g, '').trim()); continue; }
        const dm = line.match(/^(?:datastore|store)\s+(.+)$/i);
        if (dm) { datastores.push(dm[1].replace(/"/g, '').trim()); continue; }
        const em = line.match(/^external\s+(.+)$/i);
        if (em) { externals.push(em[1].replace(/"/g, '').trim()); continue; }
        const fm = line.match(/^(.+?)\s*(->|-->)\s*(.+?)(?:\s*:\s*(.+))?$/);
        if (fm) {
            const f = fm[1].replace(/"/g, '').trim(), t = fm[3].replace(/"/g, '').trim();
            const fIsExt = externals.includes(f), tIsExt = externals.includes(t);
            const fIsDs = datastores.includes(f), tIsDs = datastores.includes(t);
            if (fIsExt && tIsExt) { errors.push('Invalid: external to external (' + f + ' to ' + t + ')'); continue; }
            if (fIsDs && tIsDs) { errors.push('Invalid: store to store (' + f + ' to ' + t + ')'); continue; }
            if (fIsExt && tIsDs) { errors.push('Invalid: external to store (' + f + ' to ' + t + ')'); continue; }
            flows.push({ from: f, to: t, label: fm[4]?.trim() || '' });
            if (!processes.includes(f) && !datastores.includes(f) && !externals.includes(f)) processes.push(f);
            if (!processes.includes(t) && !datastores.includes(t) && !externals.includes(t)) processes.push(t);
        }
    }
    return { processes: [...new Set(processes)], datastores: [...new Set(datastores)], externals: [...new Set(externals)], flows, errors };
}

function renderDFD(code) {
    const { processes, datastores, externals, flows, errors } = parseDFD(code);
    if (!processes.length && !datastores.length && !externals.length) {
        if (errors.length) {
            let svg = '';
            errors.forEach((e, i) => {
                svg += '<text x="20" y="' + (30 + i * 24) + '" font-size="14" fill="#c00">' + esc(e) + '</text>';
            });
            return wrapSvg(svg, 600, 30 + errors.length * 24 + 20);
        }
        return null;
    }

    const EW = 140, EH = 50, DSW = 160, DSH = 40;
    const procR = 60;

    const g = new dagre.graphlib.Graph();
    g.setGraph({ rankdir: 'LR', ranksep: 140, nodesep: 80, marginx: 60, marginy: 60 });
    g.setDefaultEdgeLabel(() => ({}));

    const nodeType = {};
    externals.forEach(e => { nodeType[e] = 'ext'; });
    processes.forEach(p => { nodeType[p] = 'proc'; });
    datastores.forEach(d => { nodeType[d] = 'ds'; });

    for (const e of externals) {
        const w = Math.max(EW, mt(e, 15) + 36);
        g.setNode(e, { label: e, width: w, height: EH });
    }
    for (const p of processes) {
        const r = Math.max(procR, mt(p, 14) / 2 + 20);
        g.setNode(p, { label: p, width: r * 2, height: r * 2 });
    }
    for (const d of datastores) {
        const w = Math.max(DSW, mt(d, 14) + 30);
        g.setNode(d, { label: d, width: w, height: DSH });
    }

    for (const f of flows) {
        g.setEdge(f.from, f.to, { label: f.label || '' });
    }

    dagre.layout(g);

    const graphInfo = g.graph();
    const totalW = Math.max(graphInfo.width + 120, 500);
    const totalH = Math.max(graphInfo.height + 120, 300);

    let svg = '';

    if (errors.length) {
        errors.forEach((e, i) => {
            svg += '<text x="20" y="' + (20 + i * 18) + '" font-size="12" fill="#c00">' + esc(e) + '</text>';
        });
    }

    const allNodes = [...externals, ...processes, ...datastores];

    for (const name of allNodes) {
        const nd = g.node(name);
        if (!nd) continue;
        const { x, y } = nd;
        const type = nodeType[name];

        if (type === 'proc') {
            const r = nd.width / 2;
            svg += '<circle cx="' + x + '" cy="' + y + '" r="' + r + '" fill="' + COLORS.pinkLight + '" stroke="' + COLORS.border + '" stroke-width="1.5"/>';
            const words = name.split(' ');
            if (words.length > 1) {
                const tlines = [];
                let cur = '';
                for (const w of words) {
                    if (cur && mt(cur + ' ' + w, 14) > r * 1.4) { tlines.push(cur); cur = w; }
                    else cur = cur ? cur + ' ' + w : w;
                }
                if (cur) tlines.push(cur);
                const startY2 = y - (tlines.length - 1) * 10;
                tlines.forEach((l, i) => {
                    svg += '<text x="' + x + '" y="' + (startY2 + i * 20) + '" text-anchor="middle" font-size="14" font-weight="600" fill="' + COLORS.text + '">' + esc(l) + '</text>';
                });
            } else {
                svg += '<text x="' + x + '" y="' + (y + 5) + '" text-anchor="middle" font-size="14" font-weight="600" fill="' + COLORS.text + '">' + esc(name) + '</text>';
            }
        } else if (type === 'ext') {
            const w = nd.width, h = nd.height;
            svg += '<rect x="' + (x - w / 2) + '" y="' + (y - h / 2) + '" width="' + w + '" height="' + h + '" fill="' + COLORS.primary + '" stroke="' + COLORS.primary + '" stroke-width="2" rx="4"/>';
            svg += '<text x="' + x + '" y="' + (y + 5) + '" text-anchor="middle" font-size="14" font-weight="700" fill="white">' + esc(name) + '</text>';
        } else if (type === 'ds') {
            const w = nd.width, h = nd.height;
            svg += '<rect x="' + (x - w / 2) + '" y="' + (y - h / 2) + '" width="' + w + '" height="' + h + '" fill="' + COLORS.primaryLight + '" stroke="none"/>';
            svg += '<line x1="' + (x - w / 2) + '" y1="' + (y - h / 2) + '" x2="' + (x + w / 2) + '" y2="' + (y - h / 2) + '" stroke="' + COLORS.primary + '" stroke-width="2"/>';
            svg += '<line x1="' + (x - w / 2) + '" y1="' + (y + h / 2) + '" x2="' + (x + w / 2) + '" y2="' + (y + h / 2) + '" stroke="' + COLORS.primary + '" stroke-width="2"/>';
            svg += '<text x="' + x + '" y="' + (y + 5) + '" text-anchor="middle" font-size="13" font-weight="600" fill="' + COLORS.text + '">' + esc(name) + '</text>';
        }
    }

    const pairCount = {};
    flows.forEach(f => {
        const key = [f.from, f.to].sort().join('||');
        pairCount[key] = (pairCount[key] || 0) + 1;
    });
    const pairIdx = {};

    for (const f of flows) {
        const edgeData = g.edge(f.from, f.to);
        if (!edgeData || !edgeData.points) continue;

        const key = [f.from, f.to].sort().join('||');
        const cnt = pairCount[key];
        const idx = pairIdx[key] = (pairIdx[key] || 0) + 1;
        const off = cnt > 1 ? (idx === 1 ? -20 : 20) : 0;

        const pts = edgeData.points.map(p => ({ x: p.x, y: p.y + off }));

        // Clip start point to source shape boundary
        const fromNode = g.node(f.from);
        const fromType = nodeType[f.from];
        if (fromNode && pts.length >= 2) {
            const nextPt = pts[1];
            if (fromType === 'proc') {
                const r = fromNode.width / 2;
                const ang = Math.atan2(nextPt.y - fromNode.y, nextPt.x - fromNode.x);
                pts[0] = { x: fromNode.x + r * Math.cos(ang), y: fromNode.y + r * Math.sin(ang) };
            } else {
                const w = fromNode.width, h = fromNode.height;
                pts[0] = boxEdge({ x: fromNode.x - w / 2, y: fromNode.y - h / 2, w, h }, nextPt.x, nextPt.y);
            }
        }

        // Clip end point to target shape boundary
        const toNode = g.node(f.to);
        const toType = nodeType[f.to];
        if (toNode && pts.length >= 2) {
            const prevPt = pts[pts.length - 2];
            if (toType === 'proc') {
                const r = toNode.width / 2;
                const ang = Math.atan2(prevPt.y - toNode.y, prevPt.x - toNode.x);
                pts[pts.length - 1] = { x: toNode.x + r * Math.cos(ang), y: toNode.y + r * Math.sin(ang) };
            } else {
                const w = toNode.width, h = toNode.height;
                pts[pts.length - 1] = boxEdge({ x: toNode.x - w / 2, y: toNode.y - h / 2, w, h }, prevPt.x, prevPt.y);
            }
        }

        if (pts.length >= 3) {
            let d = 'M ' + pts[0].x + ' ' + pts[0].y;
            for (let i = 1; i < pts.length - 1; i += 2) {
                const cp = pts[i];
                const next = pts[i + 1] || pts[pts.length - 1];
                d += ' Q ' + cp.x + ' ' + cp.y + ' ' + next.x + ' ' + next.y;
            }
            if (pts.length % 2 === 0) {
                d += ' L ' + pts[pts.length - 1].x + ' ' + pts[pts.length - 1].y;
            }
            svg += '<path d="' + d + '" fill="none" stroke="' + COLORS.line + '" stroke-width="1.5" marker-end="url(#ah)"/>';
        } else {
            svg += '<line x1="' + pts[0].x + '" y1="' + pts[0].y + '" x2="' + pts[pts.length - 1].x + '" y2="' + pts[pts.length - 1].y + '" stroke="' + COLORS.line + '" stroke-width="1.5" marker-end="url(#ah)"/>';
        }

        if (f.label) {
            const mid = pts[Math.floor(pts.length / 2)];
            const labelOff = off <= 0 ? -14 : 20;
            const lw = mt(f.label, 11) + 12;
            const lh = 18;
            svg += '<rect x="' + (mid.x - lw / 2) + '" y="' + (mid.y + labelOff - lh + 4) + '" width="' + lw + '" height="' + lh + '" fill="white" rx="3"/>';
            svg += '<text x="' + mid.x + '" y="' + (mid.y + labelOff) + '" text-anchor="middle" font-size="11" fill="' + COLORS.textLight + '">' + esc(f.label) + '</text>';
        }
    }

    return wrapSvg(svg, totalW, totalH);
}


// ============================================================================
// MAIN RENDER FUNCTION
// ============================================================================

const CUSTOM_RENDERERS = {
    class: renderClassDiagram,
    sequence: renderSequenceDiagram,
    activity: renderActivityDiagram,
    usecase: renderUseCaseDiagram,
    er: renderERDiagram,
    dfd: renderDFD,
};

export function renderCustomDiagram(code, diagramType) {
    const renderer = CUSTOM_RENDERERS[diagramType];
    if (!renderer) return null;
    try { return renderer(code); }
    catch (err) { console.error(`Custom render error (${diagramType}):`, err); return null; }
}

export function hasCustomRenderer(diagramType) {
    return diagramType in CUSTOM_RENDERERS;
}

// ============================================================================
// DIAGRAM TYPES CATALOG
// ============================================================================

export const DIAGRAM_TYPES = {
    class: {
        label: 'Class Diagram',
        defaultCode: `class Person {
  +name: String
  +phoneNumber: String
  +emailAddress: String
  ---
  +purchaseParkingPass()
}

class Address {
  +street: String
  +city: String
  +state: String
  ---
  +validate(): bool
  +outputAsLabel(): String
}

class Student {
  +studentNumber: int
  +averageMark: int
  ---
  +isEligibleToEnroll(str): bool
  +getSeminarsTaken(): int
}

class Professor {
  +salary: int
  +staffNumber: int
  ---
  +numberOfClasses: int
}

Person "0..1" -> "1" Address : lives at
Person <|-- Student
Person <|-- Professor
Professor "1..5" -> "0..*" Student : supervises`
    },

    sequence: {
        label: 'Sequence Diagram',
        defaultCode: `participant Client
participant Server
participant Database

Client -> Server: HTTP Request
Server -> Database: Query Data
Database --> Server: Result Set
Server --> Client: JSON Response
Client -> Server: POST /api/save
Server -> Database: Insert Record
Database --> Server: Success
Server --> Client: 201 Created`
    },

    activity: {
        label: 'Activity Diagram',
        defaultCode: `(start) -> Login Page
Login Page -> <Valid Credentials?>
<Valid Credentials?> -> Dashboard : Yes
<Valid Credentials?> -> Error Message : No
Error Message -> Login Page
Dashboard -> Create Diagram
Create Diagram -> Edit Code
Edit Code -> Preview
Preview -> <Satisfied?>
<Satisfied?> -> Export : Yes
<Satisfied?> -> Edit Code : No
Export -> (end)`
    },

    usecase: {
        label: 'Use Case Diagram',
        defaultCode: `system "Online Shopping System"
actor Customer
actor Admin

Customer -> View Items
Customer -> Make Purchase
Make Purchase ..> Checkout : <<include>>
Customer -> Track Order
Admin -> Manage Products
Admin -> View Reports`
    },

    er: {
        label: 'ER Diagram',
        defaultCode: `entity User {
  *UserID
  Name
  Email
  +CoachID
}

entity Habit {
  *HabitID
  HabitName
}

entity Coach {
  *CoachID
  Name
}

User -- Has -- Habit : 1,M
User -- Has -- Coach : M,1`
    },

    dfd: {
        label: 'Data Flow Diagram',
        defaultCode: `external Customer
external Bank

process "Online Bookstore System"

Customer -> "Online Bookstore System" : Order Details
"Online Bookstore System" -> Customer : Payment Info
"Online Bookstore System" -> Bank : Order Confirmation
Bank -> "Online Bookstore System" : Payment Confirmation`
    },
};

// ============================================================================
// DIAGRAM GUIDES
// ============================================================================

export const DIAGRAM_GUIDES = {
    class: {
        title: 'Class Diagram Syntax Guide',
        sections: [
            { heading: 'Defining a Class', content: 'class ClassName {\n  +publicField: String\n  -privateField: int\n  #protectedField: bool\n  ---\n  +publicMethod(): void\n  -privateMethod()\n}', note: 'Use +, -, # for visibility. --- separates attributes from methods.' },
            { heading: 'Custom Color', content: 'class MyClass #ff6600 {\n  +name: String\n}', note: 'Add a hex color after the class name to set a custom header color.' },
            { heading: 'Relationships', content: 'ClassA -> ClassB : uses\nClassA <|-- ClassB : inherits\nClassA <>-- ClassB : composition\nClassA -- ClassB : association', note: '-> dependency, <|-- inheritance, <>-- composition, -- association' },
            { heading: 'Cardinality', content: 'ClassA "1" -> "0..*" ClassB : has', note: 'Add cardinality in quotes before/after the arrow.' },
        ]
    },
    sequence: {
        title: 'Sequence Diagram Syntax Guide',
        sections: [
            { heading: 'Participants', content: 'participant User\nparticipant Server', note: 'Declare participants at the top.' },
            { heading: 'Messages', content: 'User -> Server : Request\nServer --> User : Response\nUser -> User : Self call', note: '-> solid arrow, --> dashed return. Self-messages supported.' },
            { heading: 'Notes', content: 'note over Server : Processing', note: 'Add notes over a participant.' },
        ]
    },
    activity: {
        title: 'Activity Diagram Syntax Guide',
        sections: [
            { heading: 'Nodes', content: '(start)\n(end)\n<Decision?>\nAction Name', note: '(start)/(end) = circles. <text> = decision diamond. Plain text = action.' },
            { heading: 'Flows', content: '(start) -> Action\nAction -> <Done?>\n<Done?> -> Result : Yes\n<Done?> -> Action : No\nResult -> (end)', note: 'Use -> to connect. Add labels with : after target.' },
        ]
    },
    usecase: {
        title: 'Use Case Diagram Syntax Guide',
        sections: [
            { heading: 'System Name', content: 'system "My Application"', note: 'Sets the system boundary title.' },
            { heading: 'Actors & Use Cases', content: 'actor User\nactor Admin\nusecase Login', note: 'Declare actors and use cases. Undeclared targets auto-detect as use cases.' },
            { heading: 'Relationships', content: 'User -> Login\nLogin ..> Authenticate : <<include>>\nCheckout ..> Apply Coupon : <<extend>>', note: '-> solid line, ..> dashed with stereotype label.' },
        ]
    },
    er: {
        title: 'ER Diagram Syntax Guide (Chen Notation)',
        sections: [
            { heading: 'Entities', content: 'entity User {\n  *UserID\n  Name\n  Email\n  +RoleID\n}', note: '* = Primary Key (underlined oval), + = Foreign Key (dashed oval).' },
            { heading: 'Relationships', content: 'User -- Has -- Habit : 1,M\nUser -- Belongs -- Dept : M,1', note: 'Entity1 -- RelName -- Entity2 : leftCard,rightCard. Diamond is drawn between entities.' },
        ]
    },
    dfd: {
        title: 'Data Flow Diagram Syntax Guide',
        sections: [
            { heading: 'Node Types', content: 'process ProcessName\ndatastore StoreName\nexternal ExternalEntity', note: 'process = circle, datastore = open rectangle, external = solid rectangle.' },
            { heading: 'Data Flows', content: 'External -> Process : Data Label\nProcess -> Datastore : Store Data', note: 'Use -> for data flow arrows. Labels after : describe the data.' },
        ]
    },
};

