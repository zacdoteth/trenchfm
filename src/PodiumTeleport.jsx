import { startTransition, useState, useEffect, useRef, useCallback } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import GUI from "lil-gui";
import { Connection, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } from "@solana/web3.js";
import {
  getWalletBalance, executeTrade, getSolPrice, usdToSol, getWalletAddress,
  connectWebSocket, disconnectWebSocket, solscanTx, searchTokens, lookupToken, fetchTrendingSolana,
  fetchTokenChart, findPoolAddress,
  fetchTokenDetail, fetchTokenHolders, fetchTokenTraders, fetchRecentTrades,
} from "./frontrun.js";

// ═══════════════════════════════════════════════════════
// trench.fm — Teleport Edition + Live Chart
// Beam in/out VFX + Price chart on call
// ═══════════════════════════════════════════════════════

const isMobile = /Android|iPhone|iPad/i.test(navigator.userAgent);
const CHAR_COUNT = isMobile ? 200 : 400;
const ROOM_RADIUS = 26;
const PODIUM_RADIUS = 3.2;
const INNER_RING = 5.5;

const PFP_NAMES = ["abhi","AzFlin","bandit","biz","ferengi","frostyflakes","icobeast","jin","phanes","pupul","rekt","rob","shinkiro14","skely","Tintin","ultra","vn","zac"];
const NAMES = PFP_NAMES;
const CHAT_MSGS = ["LFG 🔥🔥🔥","ser this is the play","already 10x'd","wen moon??","chart looking bullish af","SEND IT 🚀","ngmi","ape in","few","this is it","NFA but buying","diamond hands only","already in","massive bags","gm gm","wagmi","just aped 5 SOL","dev is based","easy 100x","we're so early","floor is in","🚀🚀🚀","HODL","zoom out"];
const COINS = [
  { ticker: "$BONK", name: "Bonk", ca: "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263", mcap: "$1.2B", fdv: "$1.8B", liq: "$24.5M", vol: "$89.2M", change: "+12.4%", positive: true, price: "0.00002847", supply: "56.2T", created: "2 yr ago", launchpad: "Bonk", holders: 835200, priceChanges: { m5: 0.3, h1: 2.1, h6: 5.8, h24: 12.4 }, dex: "raydium", headerUrl: null, imageUrl: null },
  { ticker: "$WIF", name: "dogwifhat", ca: "EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm", mcap: "$890M", fdv: "$890M", liq: "$18.3M", vol: "$52.1M", change: "+8.7%", positive: true, price: "2.34", supply: "998M", created: "1 yr ago", launchpad: "Meteora", holders: 218400, priceChanges: { m5: -0.4, h1: 1.8, h6: 4.2, h24: 8.7 }, dex: "meteora", headerUrl: null, imageUrl: null },
  { ticker: "$POPCAT", name: "Popcat", ca: "7GCihgDB8fe6KNjn2MYtkzZcRjQy3t9GHdC8uHYmW2hr", mcap: "$540M", fdv: "$540M", liq: "$8.9M", vol: "$41.8M", change: "+31.2%", positive: true, price: "0.89", supply: "979M", created: "11 mo", launchpad: "Pump.fun", holders: 142800, priceChanges: { m5: 1.2, h1: 8.7, h6: 15.2, h24: 31.2 }, dex: "pump", headerUrl: null, imageUrl: null },
  { ticker: "$JITO", name: "Jito", ca: "J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn", mcap: "$2.1B", fdv: "$2.9B", liq: "$35.1M", vol: "$127M", change: "-3.2%", positive: false, price: "3.12", supply: "1B", created: "1.5 yr", launchpad: "—", holders: 94300, priceChanges: { m5: -0.8, h1: -1.5, h6: -2.1, h24: -3.2 }, dex: "raydium", headerUrl: null, imageUrl: null },
];

// ═══ SVG ICONS (inline, no emoji) ═══
const Icon = ({ d, size = 14, color = "currentColor", style = {} }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: "inline-block", verticalAlign: "middle", flexShrink: 0, ...style }}>
    <path d={d} />
  </svg>
);
const Icons = {
  mic: "M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3zM19 10v2a7 7 0 0 1-14 0v-2M12 19v4M8 23h8",
  record: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z",
  rocket: "M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09zM12 15l-3-3M22 2l-7.5 7.5M9.5 2A18.4 18.4 0 0 0 2 9.5l4.5 4.5 8-8L19 2z",
  skull: "M9 12h.01M15 12h.01M12 2a8 8 0 0 0-8 8c0 3.2 1.9 6 4.6 7.3.3.1.4.4.4.7v2h6v-2c0-.3.2-.6.4-.7A8 8 0 0 0 12 2zM10 22v-2M14 22v-2",
  zap: "M13 2L3 14h9l-1 8 10-12h-9l1-8z",
  copy: "M8 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-2M16 2h-8v0a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2z",
  check: "M20 6L9 17l-5-5",
  users: "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 7a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75",
  trending: "M23 6l-9.5 9.5-5-5L1 18",
  wallet: "M21 12V7H5a2 2 0 0 1 0-4h14v4M3 5v14a2 2 0 0 0 2 2h16v-5M18 12a1 1 0 1 0 0 2 1 1 0 0 0 0-2z",
  chevDown: "M6 9l6 6 6-6",
  chevUp: "M18 15l-6-6-6 6",
  x: "M18 6L6 18M6 6l12 12",
  send: "M22 2L11 13M22 2l-7 20-4-9-9-4z",
  flame: "M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z",
  barChart: "M12 20V10M18 20V4M6 20v-4",
  shield: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z",
  clock: "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zM12 6v6l4 2",
  arrowUp: "M12 19V5M5 12l7-7 7 7",
  arrowDown: "M12 5v14M19 12l-7 7-7-7",
  dollarSign: "M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6",
  pieChart: "M21.21 15.89A10 10 0 1 1 8 2.83M22 12A10 10 0 0 0 12 2v10z",
  lock: "M19 11H5a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2zM7 11V7a5 5 0 0 1 10 0v4",
  search: "M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z",
  compass: "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zM16.24 7.76l-2.12 6.36-6.36 2.12 2.12-6.36z",
  activity: "M22 12h-4l-3 9L9 3l-3 9H2",
  home: "M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z",
  maximize: "M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3",
  minimize: "M4 14h6v6M20 10h-6V4M14 10l7-7M3 21l7-7",
  trophy: "M8 21h8M12 17v4M17 3H7v5a5 5 0 0 0 10 0V3zM7 5H5a2 2 0 0 0 0 4h2M17 5h2a2 2 0 0 0 0 4h-2",
  play: "M5 3l14 9-14 9V3z",
  pause: "M6 4h4v16H6zM14 4h4v16h-4z",
};

// Generate fake but realistic chart data
function generateChart(positive, count = 48) {
  const points = [];
  let val = 50 + Math.random() * 20;
  for (let i = 0; i < count; i++) {
    const trend = positive ? 0.3 : -0.2;
    val += (Math.random() - 0.48 + trend) * 3;
    val = Math.max(10, Math.min(95, val));
    points.push(val);
  }
  const half = Math.floor(count / 2);
  if (positive && points[count - 1] < points[0]) {
    const boost = points[0] - points[count - 1] + 10;
    for (let i = half; i < count; i++) points[i] += boost * ((i - half) / half);
  }
  if (!positive && points[count - 1] > points[0]) {
    const drop = points[count - 1] - points[0] + 10;
    for (let i = half; i < count; i++) points[i] -= drop * ((i - half) / half);
  }
  return points;
}
function parseMcap(s) {
  if (!s || s === "\u2014") return 0;
  const n = parseFloat(s.replace(/[$,]/g, ""));
  if (s.includes("B")) return n * 1e9;
  if (s.includes("M")) return n * 1e6;
  if (s.includes("K")) return n * 1e3;
  return n;
}

// Format sub-penny degen prices: $0.00000712 → $0.0₅712
function fmtPrice(raw) {
  const n = typeof raw === "string" ? parseFloat(raw) : raw;
  if (!n || !isFinite(n)) return "$0";
  if (n >= 1) return "$" + n.toFixed(2);
  if (n >= 0.01) return "$" + n.toFixed(4);
  // Count leading zeros after "0."
  const s = n.toFixed(20);
  const afterDot = s.slice(2); // strip "0."
  let zeros = 0;
  for (let i = 0; i < afterDot.length; i++) { if (afterDot[i] === "0") zeros++; else break; }
  const significant = afterDot.slice(zeros, zeros + 3).replace(/0+$/, "") || "0";
  const sub = String(zeros).split("").map(d => "₀₁₂₃₄₅₆₇₈₉"[d]).join("");
  return `$0.0${sub}${significant}`;
}

function generateAllTimeframes(positive) {
  return { "1m": generateChart(positive, 48), "5m": generateChart(positive, 60), "1h": generateChart(positive, 36), "1d": generateChart(positive, 24) };
}

function mergeCoinData(current, incoming) {
  return {
    ...current,
    ...incoming,
    ticker: incoming.ticker || current.ticker,
    ca: incoming.ca || current.ca,
    name: incoming.name || current.name || "",
    mcap: incoming.mcap || current.mcap || "—",
    fdv: incoming.fdv || current.fdv || incoming.mcap || current.mcap || "—",
    liq: incoming.liq || current.liq || "—",
    vol: incoming.vol || current.vol || "—",
    change: incoming.change || current.change || "0.0%",
    positive: incoming.positive ?? current.positive ?? true,
    price: incoming.price || current.price || "0",
    imageUrl: incoming.imageUrl || current.imageUrl || null,
    pairUrl: incoming.pairUrl || current.pairUrl || null,
    priceChanges: incoming.priceChanges || current.priceChanges || { m5: 0, h1: 0, h6: 0, h24: 0 },
    dex: incoming.dex || current.dex || "—",
    headerUrl: incoming.headerUrl || current.headerUrl || null,
  };
}

function makeCoinRegistry(seedCoins) {
  const registry = new Map();
  seedCoins.forEach((coin) => {
    if (!coin?.ca) return;
    registry.set(coin.ca, mergeCoinData({}, coin));
  });
  return registry;
}

function findCoinInRegistry(registry, query) {
  const normalizedQuery = String(query || "").trim().toLowerCase();
  if (!normalizedQuery) return null;

  for (const coin of registry.values()) {
    if (coin.ca?.toLowerCase() === normalizedQuery) return coin;
    if (coin.ticker?.toLowerCase() === normalizedQuery) return coin;
    if (coin.ticker?.toLowerCase() === `$${normalizedQuery.replace(/^\$/, "")}`) return coin;
  }

  return null;
}

// ═══ SHARED ANADOL GLSL ═══
const ANADOL_GLSL = `
  vec3 mod289(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}
  vec2 mod289(vec2 x){return x-floor(x*(1.0/289.0))*289.0;}
  vec3 permute(vec3 x){return mod289(((x*34.0)+1.0)*x);}
  float snoise(vec2 v){
    const vec4 C=vec4(0.211324865405187,0.366025403784439,-0.577350269189626,0.024390243902439);
    vec2 i=floor(v+dot(v,C.yy));vec2 x0=v-i+dot(i,C.xx);
    vec2 i1=(x0.x>x0.y)?vec2(1.0,0.0):vec2(0.0,1.0);
    vec4 x12=x0.xyxy+C.xxzz;x12.xy-=i1;i=mod289(i);
    vec3 p=permute(permute(i.y+vec3(0.0,i1.y,1.0))+i.x+vec3(0.0,i1.x,1.0));
    vec3 m=max(0.5-vec3(dot(x0,x0),dot(x12.xy,x12.xy),dot(x12.zw,x12.zw)),0.0);
    m=m*m;m=m*m;
    vec3 x=2.0*fract(p*C.www)-1.0;vec3 h=abs(x)-0.5;vec3 ox=floor(x+0.5);vec3 a0=x-ox;
    m*=1.79284291400159-0.85373472095314*(a0*a0+h*h);
    vec3 g;g.x=a0.x*x0.x+h.x*x0.y;g.yz=a0.yz*x12.xz+h.yz*x12.yw;
    return 130.0*dot(m,g);
  }
  float fbm(vec2 p,int oct){float v=0.0;float a=0.5;float f=1.0;
    for(int i=0;i<6;i++){if(i>=oct)break;v+=a*snoise(p*f);f*=2.1;a*=0.48;}return v;}
  float domainWarp(vec2 p,float t,int oct){
    vec2 q=vec2(fbm(p+t*0.15,oct),fbm(p+vec2(5.2,1.3)+t*0.12,oct));
    vec2 r=vec2(fbm(p+4.0*q+vec2(1.7,9.2)+t*0.09,oct),fbm(p+4.0*q+vec2(8.3,2.8)+t*0.11,oct));
    return fbm(p+4.0*r,oct);}
  vec3 cosPal(float t,vec3 a,vec3 b,vec3 c,vec3 d){return a+b*cos(6.28318*(c*t+d));}
`;

function seededRandom(seed){let s=seed;return()=>{s=(s*16807)%2147483647;return(s-1)/2147483646;};}

function generateChars(count){
  const chars=[];
  // Concert layout — clear rings radiating from stage, no overlap
  // Each ring gets enough circumference for its characters with ~1.2 unit spacing
  const MIN_RADIUS = INNER_RING + 1.5; // clear gap around podium
  const RING_GAP = 1.8; // space between rings (character is ~0.5 wide)
  const CHAR_SPACING = 1.2; // min arc-length between characters in a ring

  // Pre-compute rings: figure out how many fit per ring at each radius
  const rings = [];
  let placed = 0;
  let radius = MIN_RADIUS;
  while (placed < count && radius < ROOM_RADIUS - 1) {
    const circumference = 2 * Math.PI * radius;
    const capacity = Math.max(1, Math.floor(circumference / CHAR_SPACING));
    const inThisRing = Math.min(capacity, count - placed);
    rings.push({ radius, count: inThisRing, startIdx: placed });
    placed += inThisRing;
    radius += RING_GAP;
  }

  for (const ring of rings) {
    const r0 = seededRandom(ring.startIdx * 7919 + 31);
    const angleStep = (2 * Math.PI) / ring.count;
    const ringOffset = r0() * Math.PI * 2; // random rotation per ring
    for (let j = 0; j < ring.count; j++) {
      const i = ring.startIdx + j;
      const r = seededRandom(i * 7919 + 31);
      // Even angle distribution + tiny jitter (not enough to overlap)
      const angle = ringOffset + j * angleStep + (r() - 0.5) * angleStep * 0.3;
      // Tiny radius jitter (keeps rows organic, not robotic)
      const rad = ring.radius + (r() - 0.5) * 0.4;
      const x = Math.cos(angle) * rad, z = Math.sin(angle) * rad;
      chars.push({id:i,x,z,homeX:x,homeZ:z,hue:r()*360,bobSpeed:1.5+r()*1.5,
        bobOffset:r()*Math.PI*2,armPhase:r()*Math.PI*2,
        skinTone:[0.95,0.85,0.72,0.58,0.42,0.3][Math.floor(r()*6)],
        name:PFP_NAMES[i % PFP_NAMES.length],visible:true,emoteTimer:0,emoteType:null});
    }
  }
  return chars;
}

// ═══ MINI CHART COMPONENT ═══
function MiniChart({ data, positive, width = 280, height = 50 }) {
  const canvasRef = useRef(null);
  const animRef = useRef(null);
  const prevDataRef = useRef(null);
  useEffect(() => {
    const c = canvasRef.current; if (!c) return;
    const ctx = c.getContext("2d");
    const dpr = Math.min(window.devicePixelRatio, 2);
    c.width = width * dpr; c.height = height * dpr;
    c.style.width = width + "px"; c.style.height = height + "px";
    ctx.scale(dpr, dpr);

    const padX = 6, padY = 8;
    const drawW = width - padX * 2, drawH = height - padY * 2;
    const min = Math.min(...data), max = Math.max(...data);
    const range = max - min || 1;
    const targetPts = data.map((v, i) => ({
      x: padX + (i / (data.length - 1)) * drawW,
      y: padY + drawH - ((v - min) / range) * drawH,
    }));

    // Spring animation — points bounce from flat/previous to target
    const prevData = prevDataRef.current;
    const startPts = targetPts.map((tp, i) => {
      if (prevData && prevData.length === data.length) {
        const pMin = Math.min(...prevData), pMax = Math.max(...prevData);
        const pRange = pMax - pMin || 1;
        return { x: tp.x, y: padY + drawH - ((prevData[i] - pMin) / pRange) * drawH };
      }
      return { x: tp.x, y: padY + drawH * 0.5 }; // start flat from center
    });
    prevDataRef.current = data;

    let startTime = null;
    const DURATION = 600; // ms
    if (animRef.current) cancelAnimationFrame(animRef.current);

    const draw = (progress) => {
      // Spring easing — overshoot then settle
      const t = Math.min(progress, 1);
      const spring = t < 1 ? 1 - Math.pow(1 - t, 3) * Math.cos(t * Math.PI * 1.2) : 1;

      ctx.clearRect(0, 0, width, height);

      // Subtle grid
      ctx.strokeStyle = "rgba(255,255,255,0.02)";
      ctx.lineWidth = 0.5;
      for (let r = 0.25; r < 1; r += 0.25) {
        ctx.beginPath(); ctx.moveTo(0, height * r); ctx.lineTo(width, height * r); ctx.stroke();
      }

      // Interpolate points
      const pts = targetPts.map((tp, i) => ({
        x: tp.x,
        y: startPts[i].y + (tp.y - startPts[i].y) * spring,
      }));

      const drawCurve = () => {
        ctx.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < pts.length; i++) {
          const xc = (pts[i - 1].x + pts[i].x) / 2;
          const yc = (pts[i - 1].y + pts[i].y) / 2;
          ctx.quadraticCurveTo(pts[i - 1].x, pts[i - 1].y, xc, yc);
        }
        ctx.quadraticCurveTo(pts[pts.length - 2].x, pts[pts.length - 2].y, pts[pts.length - 1].x, pts[pts.length - 1].y);
      };

      // Gradient fill
      const grad = ctx.createLinearGradient(0, 0, 0, height);
      const alpha = 0.18 * spring;
      if (positive) {
        grad.addColorStop(0, `rgba(0,255,136,${alpha})`);
        grad.addColorStop(0.6, `rgba(0,255,136,${alpha * 0.33})`);
        grad.addColorStop(1, "rgba(0,255,136,0)");
      } else {
        grad.addColorStop(0, `rgba(255,68,68,${alpha})`);
        grad.addColorStop(0.6, `rgba(255,68,68,${alpha * 0.33})`);
        grad.addColorStop(1, "rgba(255,68,68,0)");
      }
      ctx.beginPath(); drawCurve();
      ctx.lineTo(width, height); ctx.lineTo(0, height); ctx.closePath();
      ctx.fillStyle = grad; ctx.fill();

      // Glow stroke
      ctx.beginPath(); drawCurve();
      ctx.strokeStyle = positive ? "rgba(0,255,136,0.12)" : "rgba(255,68,68,0.12)";
      ctx.lineWidth = 4; ctx.stroke();

      // Main stroke
      ctx.beginPath(); drawCurve();
      ctx.strokeStyle = positive ? "#00ff88" : "#ff4444";
      ctx.lineWidth = 1.5; ctx.stroke();

      // Current price dot + glow rings (pulse with spring)
      const last = pts[pts.length - 1];
      const dotScale = 0.5 + spring * 0.5;
      ctx.beginPath(); ctx.arc(last.x, last.y, 8 * dotScale, 0, Math.PI * 2);
      ctx.fillStyle = positive ? "rgba(0,255,136,0.1)" : "rgba(255,68,68,0.1)"; ctx.fill();
      ctx.beginPath(); ctx.arc(last.x, last.y, 5 * dotScale, 0, Math.PI * 2);
      ctx.fillStyle = positive ? "rgba(0,255,136,0.25)" : "rgba(255,68,68,0.25)"; ctx.fill();
      ctx.beginPath(); ctx.arc(last.x, last.y, 2.5 * dotScale, 0, Math.PI * 2);
      ctx.fillStyle = positive ? "#00ff88" : "#ff4444"; ctx.fill();

      // Dashed price line
      ctx.setLineDash([2, 3]);
      ctx.beginPath(); ctx.moveTo(0, last.y); ctx.lineTo(last.x - 10, last.y);
      ctx.strokeStyle = positive ? "rgba(0,255,136,0.08)" : "rgba(255,68,68,0.08)";
      ctx.lineWidth = 0.5; ctx.stroke();
      ctx.setLineDash([]);
    };

    const animate = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const progress = (timestamp - startTime) / DURATION;
      draw(progress);
      if (progress < 1) animRef.current = requestAnimationFrame(animate);
    };
    animRef.current = requestAnimationFrame(animate);

    return () => { if (animRef.current) cancelAnimationFrame(animRef.current); };
  }, [data, positive, width, height]);

  return <canvas ref={canvasRef} style={{ width, height, display: "block", borderRadius: 4 }} />;
}

export default function PodiumTeleport({ user, wallets: _wallets }) {
  const mountRef = useRef(null);
  const stateRef = useRef({
    chars: generateChars(CHAR_COUNT), speaker: null,
    teleportPhase: "idle", // idle, beam_out, beam_in, active, beam_return
    teleportTimer: 0, teleportCharIdx: null, prevSpeaker: null,
    cameraAngle: 0, cameraHeight: 5.5, cameraDist: 22.5, autoRotate: true, spinVelocity: 0, clock: 0,
    // Cinematic intro sweep — wide establishing shot → swoop down to seat
    introTimer: 0, introDuration: 4.5, introActive: true,
    introStartHeight: 35, introStartDist: 45, introStartLookY: 3,
    introEndHeight: 5.5, introEndDist: 22.5, introEndLookY: 3.5,
    // Jumbotron debug params (live-tunable via GUI)
    jmboY: 6.9, jmboScale: 0.5, jmboRotSpeed: 0.0,
    // Speaker params
    speakerScale: 1.8, speakerX: 0, speakerY: 1.2, speakerZ: 0, stageScale: 1.0, stageRotOffset: 0,
    // Mic stand params
    micScale: 2.4, micY: 1.25, micZ: 2.1,
    // DJ booth params
    djScale: 0.45, djX: 0, djY: 2.35, djZ: 1.2, djRotY: -3.1415,
    // DJ table params (butter slab under DJ booth)
    dtW: 3.5, dtH: 0.35, dtD: 1.6, dtY: 2.2, dtZoff: -0.049,
    // LED TV screen params
    tvScale: 1.3, tvY: 3.8, tvZ: 1.2,
    // Jumbotron intro animation (Mario Party style)
    jmboIntroTimer: 0, jmboIntroName: "", jmboIntroTicker: "", jmboIntroCharIdx: -1,
    // Dome / sky (Anadol)
    domeHueShift: 0.62, domeSpeed: 0.01, domeIntensity: 0.5, domeBottomHalf: true,
    // Top calls leaderboard — prefilled for demo
    topCallsToday: [
      { ticker: "$BONK", change: "+4.2x", caller: "zac", followers: "127K", timeAgo: "12m ago", fdv: "$1.8B", price: "0.00002847" },
      { ticker: "$WIF", change: "+2.8x", caller: "jin", followers: "45.2K", timeAgo: "28m ago", fdv: "$890M", price: "2.34" },
      { ticker: "$POPCAT", change: "+1.6x", caller: "rekt", followers: "33.1K", timeAgo: "41m ago", fdv: "$540M", price: "0.89" },
    ],
  });
  const rendererRef = useRef(null);
  const frameRef = useRef(null);
  const threeRef = useRef(null);
  const viewerName = user?.username || user?.first_name || "you";
  const coinRegistryRef = useRef(makeCoinRegistry(COINS));
  const positionsRef = useRef([]);

  const [chatMessages, setChatMessages] = useState([
    { user: "frostyflakes", msg: "room is PACKED tonight 🔥" },
    { user: "abhi", msg: "who's stepping up?" },
    { user: "bandit", msg: "gm degens" },
  ]);
  const [chatInput, setChatInput] = useState("");
  const [liveCount, setLiveCount] = useState(CHAR_COUNT + 47);
  const [speakerInfo, setSpeakerInfo] = useState(null);
  const [chartData, setChartData] = useState(null);
  const [chartTimeframe, setChartTimeframe] = useState("1h"); // "1m","5m","1h"
  const chartTFDataRef = useRef({}); // { "1m": [...], "5m": [...], "1h": [...] }
  const chartTFRef = useRef("1h");
  const [votes, setVotes] = useState({ up: 0, down: 0 });
  const [userVoted, setUserVoted] = useState(null);
  // Throw inventory — roses (bullish) & tomatoes (bearish), earned via trading + daily free
  const [throwInv, setThrowInv] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("trench_throws") || "null");
      const today = new Date().toDateString();
      if (saved && saved.day === today) return saved;
      return { roses: 3, tomatoes: 3, day: today };
    } catch { return { roses: 3, tomatoes: 3, day: new Date().toDateString() }; }
  });
  const [tokenScores, setTokenScores] = useState({}); // { [ca]: { roses: N, tomatoes: N } }
  const [, setTeleportVFX] = useState(null);
  const chatEndRef = useRef(null);
  const chatInputRef = useRef(null);

  // Voice notes — hold-to-record
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const micHoldTimerRef = useRef(null);
  const recordingTimerRef = useRef(null);
  const recordingStartRef = useRef(0);
  const voiceAudioRef = useRef(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [playingVoiceNote, setPlayingVoiceNote] = useState(null);
  const touchRef = useRef({ active: false, startX: 0, startY: 0, sa: 0, sh: 0, lastX: 0, lastY: 0, lastTime: 0, velX: 0, velY: 0 });
  const fpsBuf = useRef([]);
  const pfpImgsRef = useRef([]); // PFP images for announcements
  const coinImgRef = useRef(null); // Loaded coin logo for jumbotron canvas
  const headerImgRef = useRef(null); // Banner image for billboard main face
  // Refs for jumbotron (animate loop needs current values)
  const chartDataRef = useRef(null);
  const speakerInfoRef = useRef(null);
  const selectedCoinRef = useRef(null);
  const votesRef = useRef({ up: 0, down: 0 });
  // Throwables — projectiles flying from crowd to speaker
  const throwablesRef = useRef([]); // { type:"tomato"|"diamond", pos:[x,y,z], vel:[x,y,z], life:0, maxLife:0.8 }
  const MAX_THROWABLES = 15;
  const splatsRef = useRef([]); // { pos:[x,y,z], vel:[vx,vy,vz], life:0, maxLife:0.6 }
  const MAX_SPLATS = 40;

  // Velvet curtain intro
  const [curtainsOpen, setCurtainsOpen] = useState(false);
  const [sceneReady, setSceneReady] = useState(false);
  const curtainTimerRef = useRef(null);
  const curtainsOpenRef = useRef(false); // for animate loop

  // Intro HUD fade — hidden during camera sweep, fades in after curtains open
  const [hudVisible, setHudVisible] = useState(false);
  useEffect(() => {
    curtainsOpenRef.current = curtainsOpen;
    if (!curtainsOpen) return;
    // Reset intro timer so cinematic sweep starts fresh on curtain open
    stateRef.current.introActive = true;
    stateRef.current.introTimer = 0;
    const timer = setTimeout(() => setHudVisible(true), 4500);
    const consoleTimer = setTimeout(() => setConsoleRevealed(true), 5800); // Miyamoto entrance — 1.3s after HUD
    return () => { clearTimeout(timer); clearTimeout(consoleTimer); };
  }, [curtainsOpen]);

  // ═══ FRONTRUN API — real wallet + trades ═══
  useEffect(() => {
    let dead = false;
    // Fetch wallet balance + SOL price
    async function init() {
      try {
        const [wallet, price] = await Promise.all([getWalletBalance(), getSolPrice()]);
        if (dead) return;
        setWalletBalance(wallet.sol);
        setSolPrice(price);
        console.log(`[frontrun] wallet ${wallet.address}: ${wallet.sol} SOL ($${(wallet.sol * price).toFixed(2)})`);
      } catch (e) {
        console.warn("[frontrun] init failed, using mock balance:", e.message);
        if (!dead) { setWalletBalance(0); setSolPrice(180); }
      }
    }
    init();
    // Fetch trending Solana tokens
    fetchTrendingSolana().then((tokens) => { if (!dead && tokens.length) setTrendingTokens(tokens); }).catch(() => {});
    const trendingIv = setInterval(() => {
      fetchTrendingSolana().then((tokens) => { if (!dead && tokens.length) setTrendingTokens(tokens); }).catch(() => {});
    }, 60000);
    // Refresh SOL price every 30s
    const priceIv = setInterval(async () => {
      try {
        const p = await getSolPrice();
        if (!dead) setSolPrice(p);
      } catch (error) {
        console.debug("[frontrun] price refresh skipped:", error.message);
      }
    }, 30000);
    // WebSocket — real-time balance updates after trades
    connectWebSocket((data) => {
      if (dead) return;
      const newSol = parseInt(data.balance, 10) / 1e9;
      setWalletBalance(newSol);
      if (Array.isArray(data.tokenBalances) && data.tokenBalances.length > 0) {
        setUserPositions((prev) => prev.map((position) => {
          const nextBalance = data.tokenBalances.find((tokenBalance) => tokenBalance.mint === position.mint);
          if (!nextBalance) return position;

          const uiAmount = Number.parseFloat(nextBalance.uiAmount);
          return {
            ...position,
            tokenAmount: Number.isFinite(uiAmount) ? uiAmount : position.tokenAmount,
            status: data.signature === position.txSig ? "confirmed" : position.status,
          };
        }));
      }
      // Match pending trade signature
      if (pendingSigRef.current && data.signature === pendingSigRef.current) {
        setTradeStatus("confirmed");
        pendingSigRef.current = null;
        setUserPositions((prev) => prev.map((position) => (
          position.txSig === data.signature
            ? { ...position, status: "confirmed" }
            : position
        )));
        // Reward: +2 roses, +2 tomatoes for confirmed trade
        setThrowInv(p => ({ ...p, roses: p.roses + 2, tomatoes: p.tomatoes + 2 }));
        // Auto-clear status after 3s
        setTimeout(() => setTradeStatus(null), 3000);
      }
    });
    return () => { dead = true; clearInterval(priceIv); clearInterval(trendingIv); disconnectWebSocket(); };
  }, []);

  // Thesis modal
  const [showCallInput, setShowCallInput] = useState(false);
  const [stepUpCA, setStepUpCA] = useState("");
  const [stepUpCoinPreview, setStepUpCoinPreview] = useState(null);
  const [stepUpLookupLoading, setStepUpLookupLoading] = useState(false);
  const stepUpLookupTimerRef = useRef(null);
  // Buy sheet
  const [showBuySheet, setShowBuySheet] = useState(false);
  const [walletBalance, setWalletBalance] = useState(0);
  const [solPrice, setSolPrice] = useState(180); // USD per SOL, fetched on mount
  const [tradeStatus, setTradeStatus] = useState(null); // null | "pending" | "confirmed" | "error"
  const [lastTxSig, setLastTxSig] = useState(null);
  const pendingSigRef = useRef(null);
  // Queue — populated from trending tokens once loaded
  const [queue, setQueue] = useState([]);
  // Activity feed
  const [activityFeed, setActivityFeed] = useState([
    { user: "ultra", action: "bought", amount: "$200", coin: "$BONK" },
    { user: "phanes", action: "up", amount: "340%", coin: "$WIF" },
    { user: "icobeast", action: "bought", amount: "$1.2K", coin: "$WIF" },
  ]);
  // Positions
  const [userPositions, setUserPositions] = useState([]);
  // Fee tracking — the flywheel (1% total, 50% back to caller)
  // Believe does 50-70% to creator. Bags does 50%. We do 50%.
  // Terminals (BullX/Axiom/Photon) give 0% — we're the anti-terminal.
  const _FEE_TOTAL = 0.01;    // 1% total fee on every trade
  const FEE_CALLER = 0.005;   // 0.5% → Caller (50% of fees — the flywheel)
  const FEE_PLATFORM = 0.004; // 0.4% → trench.fm
  const _FEE_TREASURY = 0.001; // 0.1% → Protocol treasury / referrals
  const [callerEarnings, setCallerEarnings] = useState({}); // { callerName: totalUSD }
  const [platformRevenue, setPlatformRevenue] = useState(0);
  const [callVolume, setCallVolume] = useState(0); // total volume through buy button
  // Speaker card expand + tabs
  const [, setCardExpanded] = useState(false);
  // Privacy mode — hide your wallet from public trades feed
  const [privacyMode, setPrivacyMode] = useState(false);
  // Speaker screen position for 3D speech bubble
  const [speakerScreenPos, setSpeakerScreenPos] = useState(null);
  const [bubbleExpanded, setBubbleExpanded] = useState(false);
  const [chatExpanded, setChatExpanded] = useState(false);
  const [typewriterIdx, setTypewriterIdx] = useState(0); // chars revealed so far
  const [typewriterDone, setTypewriterDone] = useState(false); // fully typed + collapsed
  const typewriterRef = useRef(null); // interval handle
  // Console state
  const [consoleOpen, setConsoleOpen] = useState(false);
  const [consoleTab, setConsoleTab] = useState("discover");
  const [consoleSearchQuery, setConsoleSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState(null); // null = not searching, [] = no results
  const [searchLoading, setSearchLoading] = useState(false);
  const [selectedCoin, setSelectedCoin] = useState(null); // override speakerInfo.coin for buy
  const [tokenHolders, setTokenHolders] = useState(null);
  const [tokenTraders, setTokenTraders] = useState(null);
  const [recentTrades, setRecentTrades] = useState(null);
  const [trendingTokens, setTrendingTokens] = useState(null); // null = loading, [] = failed
  const trendingEnrichedRef = useRef(false);
  const rememberCoin = useCallback((coin) => {
    if (!coin?.ca) return null;
    const current = coinRegistryRef.current.get(coin.ca);
    const merged = mergeCoinData(current || {}, coin);
    coinRegistryRef.current.set(merged.ca, merged);
    return merged;
  }, []);
  const rememberCoins = useCallback((coins) => coins.map((coin) => rememberCoin(coin)).filter(Boolean), [rememberCoin]);
  const resolveCoin = useCallback(async (query) => {
    const cached = findCoinInRegistry(coinRegistryRef.current, query);
    if (cached) return cached;
    try {
      const liveCoin = await lookupToken(query);
      return liveCoin ? rememberCoin(liveCoin) : null;
    } catch (error) {
      console.warn("[token] lookup failed:", error.message);
      return null;
    }
  }, [rememberCoin]);
  // Enrich trending tokens with DexScreener logos + seed demo callers
  useEffect(() => {
    if (!trendingTokens || trendingTokens.length < 4 || trendingEnrichedRef.current) return;
    trendingEnrichedRef.current = true;
    // Seed demo caller queue from top trending
    const theses = [
      (t) => `${t.ticker} is pumping hard. Volume is insane. Loading up heavy.`,
      (t) => `${t.ticker} just broke out. Chart is textbook. This is the play right now.`,
      (t) => `${t.ticker} fundamentals are unmatched. Accumulating before the masses catch on.`,
    ];
    setQueue([
      { name: "biz", coin: trendingTokens[1], thesis: theses[0](trendingTokens[1]) },
      { name: "skely", coin: trendingTokens[2], thesis: theses[1](trendingTokens[2]) },
      { name: "Tintin", coin: trendingTokens[3], thesis: theses[2](trendingTokens[3]) },
    ]);
    // Enrich top 6 with DexScreener logos + banners (async, sequential)
    (async () => {
      let updated = false;
      for (const token of trendingTokens.slice(0, 6)) {
        if (token.imageUrl && token.headerUrl) continue;
        try {
          const match = await lookupToken(token.ca);
          if (match?.imageUrl && !token.imageUrl) {
            token.imageUrl = match.imageUrl;
            updated = true;
          }
          if (match?.headerUrl && !token.headerUrl) {
            token.headerUrl = match.headerUrl;
            updated = true;
          }
          if (updated) rememberCoin({ ...token });
        } catch {}
      }
      if (updated) setTrendingTokens(prev => prev ? [...prev] : null);
    })();
  }, [trendingTokens, rememberCoin]);
  const searchTimerRef = useRef(null);
  // Mini device
  const [quickBuyUSD, setQuickBuyUSD] = useState(5);
  const [buyConfirming, setBuyConfirming] = useState(false);
  const buyConfirmTimer = useRef(null);
  const [caCopied, setCaCopied] = useState(false);
  const [addrCopied, setAddrCopied] = useState(false);
  const [fundStatus, setFundStatus] = useState(null); // null | "pending" | "sent" | "error"
  const [miniTab, setMiniTab] = useState(null); // null until user picks — no false promises
  const [miniOpen, setMiniOpen] = useState(false); // starts collapsed — surprise when they first open
  const [consoleRevealed, setConsoleRevealed] = useState(false); // Miyamoto entrance — slides up after delay
  const [miniSearch, setMiniSearch] = useState("");
  const [miniExpanded, setMiniExpanded] = useState(false); // theater mode
  const [homeSortMode, setHomeSortMode] = useState("trending"); // trending | gainers | volume | mcap
  // Call tracking + anti-spam
  const [callHistory, setCallHistory] = useState([]);
  const [lastCallTime, setLastCallTime] = useState(0);
  const [sessionCallCount, setSessionCallCount] = useState(0);
  const CALL_COOLDOWN_MS = 5 * 60 * 1000; // 5 min between calls
  const MAX_CALLS_PER_SESSION = 10;
  const copyCA = useCallback((e, coinOverride) => {
    e.stopPropagation();
    const coin = coinOverride || selectedCoin || speakerInfo?.coin;
    if (!coin?.ca) return;
    navigator.clipboard.writeText(coin.ca).catch(() => {});
    setCaCopied(true);
    setTimeout(() => setCaCopied(false), 1500);
  }, [selectedCoin, speakerInfo]);
  useEffect(() => {
    setCaCopied(false);
  }, [selectedCoin, showBuySheet, speakerInfo?.coin?.ca]);
  // Reactions
  const [reactionBursts, setReactionBursts] = useState([]);
  const reactionTimerRef = useRef({ count: 0, lastReset: Date.now() });
  // Announcement overlay
  // Announcement overlay removed — jumbotron intro IS the announcement (Miyamoto principle)

  useEffect(() => {
    positionsRef.current = userPositions;
  }, [userPositions]);

  useEffect(() => {
    if (stepUpLookupTimerRef.current) clearTimeout(stepUpLookupTimerRef.current);
    let active = true;

    const query = stepUpCA.trim();
    if (!query) {
      setStepUpCoinPreview(null);
      setStepUpLookupLoading(false);
      return;
    }

    setStepUpLookupLoading(true);
    stepUpLookupTimerRef.current = setTimeout(async () => {
      const coin = await resolveCoin(query);
      if (!active) return;
      setStepUpCoinPreview(coin);
      setStepUpLookupLoading(false);
    }, 250);

    return () => {
      active = false;
      if (stepUpLookupTimerRef.current) clearTimeout(stepUpLookupTimerRef.current);
    };
  }, [resolveCoin, stepUpCA]);

  useEffect(() => {
    const i = setInterval(() => {
      const c = stateRef.current.chars[Math.floor(Math.random() * CHAR_COUNT)];
      if (!c || !c.name) return;
      setChatMessages(p => [...p.slice(-25), { user: c.name, msg: CHAT_MSGS[Math.floor(Math.random() * CHAT_MSGS.length)] }]);
    }, 2200 + Math.random() * 2000);
    return () => clearInterval(i);
  }, []);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [chatMessages]);
  useEffect(() => { const i = setInterval(() => setLiveCount(p => p + Math.floor(Math.random() * 7) - 3), 4000); return () => clearInterval(i); }, []);
  // ═══ THROWABLES — spawn projectiles from crowd toward speaker ═══
  const spawnThrow = useCallback((type, count = 1) => {
    const throws = throwablesRef.current;
    const chars = stateRef.current.chars;
    for (let n = 0; n < count; n++) {
      if (throws.length >= MAX_THROWABLES) throws.shift(); // evict oldest
      // Pick a random crowd character as the origin
      const c = chars[Math.floor(Math.random() * chars.length)];
      const startX = c.homeX;
      const startZ = c.homeZ;
      const startY = 2.5 + Math.random() * 0.5; // head-height of crowd
      // Target: speaker chest area (center stage + stageY offset)
      const stageY = stateRef.current.speakerY || 1.2;
      const targetY = stageY + 1.5 + (Math.random() - 0.5) * 0.6;
      const targetX = (Math.random() - 0.5) * 0.4;
      const targetZ = (Math.random() - 0.5) * 0.4;
      // Ballistic arc: compute velocity for a nice parabola
      const flightTime = 0.5 + Math.random() * 0.3;
      const dx = targetX - startX, dy = targetY - startY, dz = targetZ - startZ;
      const vx = dx / flightTime;
      const vz = dz / flightTime;
      const vy = dy / flightTime + 4.9 * flightTime; // compensate for gravity (g=9.8 → half=4.9)
      throws.push({
        type, pos: [startX, startY, startZ], vel: [vx, vy, vz],
        life: 0, maxLife: flightTime,
        spin: (Math.random() - 0.5) * 12, spinAxis: [Math.random()-0.5, Math.random()-0.5, Math.random()-0.5],
      });
    }
  }, []);

  useEffect(() => {
    if (!speakerInfo) return;
    const i = setInterval(() => {
      const u = Math.random() > 0.3;
      const upAdd = u ? Math.ceil(Math.random() * 3) : 0;
      const downAdd = !u ? 1 : 0;
      setVotes(p => ({ up: p.up + upAdd, down: p.down + downAdd }));
      // Spawn throwables from simulated crowd votes
      if (upAdd > 0) spawnThrow("diamond", 1);
      if (downAdd > 0) spawnThrow("tomato", 1);
      // Trigger crowd emotes — random subset reacts
      const chars = stateRef.current.chars;
      const emoteType = upAdd > 0 ? "up" : "down";
      const emoteCount = 3 + Math.floor(Math.random() * 8);
      for (let e = 0; e < emoteCount; e++) {
        const ci = Math.floor(Math.random() * chars.length);
        chars[ci].emoteTimer = 1.2 + Math.random() * 0.5;
        chars[ci].emoteType = emoteType;
      }
      // Track vote rate for reaction bursts
      const rt = reactionTimerRef.current;
      rt.count += upAdd + downAdd;
      const now = Date.now();
      if (now - rt.lastReset > 2000) {
        if (rt.count > 5) {
          const emoji = upAdd > 0 ? "🚀" : "💀";
          const bursts = Array.from({ length: 6 }, (_, i) => ({
            id: now + i, emoji, x: 15 + Math.random() * 70,
          }));
          setReactionBursts(p => [...p, ...bursts]);
          setTimeout(() => setReactionBursts(p => p.filter(b => b.id !== now && b.id !== now + 1 && b.id !== now + 2 && b.id !== now + 3 && b.id !== now + 4 && b.id !== now + 5)), 2200);
        }
        rt.count = 0;
        rt.lastReset = now;
      }
    }, 900);
    return () => clearInterval(i);
  }, [speakerInfo, spawnThrow]);

  // Sync refs for jumbotron (animate loop reads these)
  useEffect(() => { chartDataRef.current = chartData; }, [chartData]);

  // Fetch real chart data for a coin (falls back to fake data on failure)
  const loadRealChart = useCallback(async (coin) => {
    if (!coin?.ca) return;
    let pool = coin.poolAddress;
    if (!pool) { pool = await findPoolAddress(coin.ca); }
    if (!pool) return; // keep fake data as fallback
    const tfs = ["1m", "5m", "1h"];
    const results = await Promise.all(tfs.map(tf => fetchTokenChart(pool, tf)));
    const tfd = {};
    tfs.forEach((tf, i) => { tfd[tf] = results[i] || chartTFDataRef.current[tf]; });
    chartTFDataRef.current = tfd;
    setChartData(tfd[chartTFRef.current]);
  }, []);

  // Fetch enriched token data (holders, traders, trades) when active coin changes
  const enrichedMintRef = useRef(null);
  useEffect(() => {
    const activeCoin = selectedCoin || speakerInfo?.coin;
    const mint = activeCoin?.ca;
    if (!mint || mint === enrichedMintRef.current) return;
    enrichedMintRef.current = mint;
    setTokenHolders(null);
    setTokenTraders(null);
    setRecentTrades(null);
    Promise.all([
      fetchTokenHolders(mint),
      fetchTokenTraders(mint),
      fetchRecentTrades(mint),
    ]).then(([holders, traders, trades]) => {
      if (enrichedMintRef.current !== mint) return; // stale
      setTokenHolders(holders);
      setTokenTraders(traders);
      setRecentTrades(trades);
    });
  }, [selectedCoin, speakerInfo]);

  // Debounced token search
  useEffect(() => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    if (!consoleSearchQuery || consoleSearchQuery.length < 2) {
      setSearchResults(null);
      setSearchLoading(false);
      return;
    }
    setSearchLoading(true);
    searchTimerRef.current = setTimeout(async () => {
      const results = await searchTokens(consoleSearchQuery);
      if (results !== null) {
        const mergedResults = rememberCoins(results);
        startTransition(() => setSearchResults(mergedResults));
        setSearchLoading(false);
      }
    }, 350);
    return () => { if (searchTimerRef.current) clearTimeout(searchTimerRef.current); };
  }, [consoleSearchQuery, rememberCoins]);
  useEffect(() => {
    speakerInfoRef.current = speakerInfo;
    setBubbleExpanded(false);
    // Coin image loading moved to selectedCoin sync effect below
    // Load header/banner image for main face background
    headerImgRef.current = null;
    if (speakerInfo?.coin?.headerUrl) {
      const himg = new Image();
      himg.crossOrigin = "anonymous";
      himg.onload = () => { headerImgRef.current = himg; };
      himg.src = speakerInfo.coin.headerUrl;
    }
    // Reset typewriter for new speaker
    setTypewriterIdx(0); setTypewriterDone(false);
    if (typewriterRef.current) clearInterval(typewriterRef.current);
    if (!speakerInfo?.thesis) return;
    const thesis = speakerInfo.thesis;
    // Start typewriter after intro (6s) + small buffer
    const startDelay = setTimeout(() => {
      let idx = 0;
      typewriterRef.current = setInterval(() => {
        idx++;
        setTypewriterIdx(idx);
        if (idx >= thesis.length) {
          clearInterval(typewriterRef.current);
          // Pause 3s at full reveal, then collapse
          setTimeout(() => { setTypewriterDone(true); }, 3000);
        }
      }, 35);
    }, 6300); // 6s intro + 300ms buffer
    return () => { clearTimeout(startDelay); if (typewriterRef.current) clearInterval(typewriterRef.current); };
  }, [speakerInfo]);
  // Sync jumbotron coin logo when user selects a different coin in console
  // Uses fetch+blob to bypass CORS (DexScreener CDN doesn't send CORS headers)
  const coinImgUrlRef = useRef(null);
  useEffect(() => {
    selectedCoinRef.current = selectedCoin;
    const activeCoin = selectedCoin || speakerInfo?.coin;
    const url = activeCoin?.imageUrl;
    if (!url) { coinImgRef.current = null; coinImgUrlRef.current = null; return; }
    if (coinImgUrlRef.current === url) return; // already loading/loaded this one
    coinImgUrlRef.current = url;
    coinImgRef.current = null;
    // Fetch as blob → objectURL (same-origin, no canvas tainting)
    fetch(url).then(r => r.blob()).then(blob => {
      if (coinImgUrlRef.current !== url) return; // stale
      const blobUrl = URL.createObjectURL(blob);
      const img = new Image();
      img.onload = () => { coinImgRef.current = img; };
      img.onerror = () => URL.revokeObjectURL(blobUrl);
      img.src = blobUrl;
    }).catch(() => {});
    // Also load header/banner image for jumbotron background
    const headerUrl = activeCoin?.headerUrl;
    if (headerUrl) {
      const himg = new Image();
      himg.crossOrigin = "anonymous";
      himg.onload = () => { headerImgRef.current = himg; };
      himg.onerror = () => {};
      himg.src = headerUrl;
    } else if (!speakerInfo?.coin?.headerUrl) {
      headerImgRef.current = null;
    }
  }, [selectedCoin, speakerInfo]);
  // Timeframe switch — update chart from stored timeframe data
  useEffect(() => {
    chartTFRef.current = chartTimeframe;
    const tfd = chartTFDataRef.current;
    if (tfd && tfd[chartTimeframe]) setChartData(tfd[chartTimeframe]);
  }, [chartTimeframe]);
  // Auto-cycle timeframes every 12s
  useEffect(() => {
    const tfs = ["1m", "5m", "1h"];
    const iv = setInterval(() => {
      setChartTimeframe(prev => tfs[(tfs.indexOf(prev) + 1) % tfs.length]);
    }, 12000);
    return () => clearInterval(iv);
  }, []);
  useEffect(() => { votesRef.current = votes; }, [votes]);
  useEffect(() => { try { localStorage.setItem("trench_throws", JSON.stringify(throwInv)); } catch {} }, [throwInv]);
  const callerEarningsRef = useRef({});
  useEffect(() => { callerEarningsRef.current = callerEarnings; }, [callerEarnings]);
  const buyFlashRef = useRef(0); // time of last buy (for green flash VFX)
  const [floatingEmojis, setFloatingEmojis] = useState([]); // buy celebration particles

  // Inject real CoinGecko trades into activity feed when available
  useEffect(() => {
    if (!recentTrades) return;
    const trades = recentTrades?.data?.trades || recentTrades?.trades || [];
    if (!trades.length) return;
    const activeCoin = selectedCoin || speakerInfo?.coin;
    const ticker = activeCoin?.ticker || "?";
    const realItems = trades.slice(0, 8).map(t => {
      const addr = t.maker_address || t.address || t.wallet || "";
      const user = addr ? `${addr.slice(0, 4)}..${addr.slice(-3)}` : "anon";
      const isBuy = (t.kind || t.type || t.side || "").toLowerCase().includes("buy");
      const vol = parseFloat(t.volume_in_usd || t.amount_usd || t.usd || 0);
      const amt = vol >= 1000 ? `$${(vol / 1000).toFixed(1)}K` : `$${vol.toFixed(0)}`;
      return { user, action: isBuy ? "bought" : "sold", amount: amt, coin: ticker, real: true };
    });
    setActivityFeed(p => [...p.slice(-12), ...realItems]);
  }, [recentTrades, selectedCoin, speakerInfo]);

  // Activity feed - mock events + fee flywheel simulation
  useEffect(() => {
    const i = setInterval(() => {
      const name = NAMES[Math.floor(Math.random() * NAMES.length)];
      const coinPool = trendingTokens?.length ? trendingTokens : COINS;
      if (!coinPool.length) return;
      const coin = coinPool[Math.floor(Math.random() * coinPool.length)];
      const isBuy = Math.random() > 0.35;
      const tradeUSD = Math.random() * 2000 + 50;
      const amt = isBuy ? `$${tradeUSD.toFixed(0)}` : `${(Math.random() * 500 + 20).toFixed(0)}%`;
      setActivityFeed(p => [...p.slice(-20), { user: name, action: isBuy ? "bought" : "up", amount: amt, coin: coin.ticker }]);
      // Simulate fee revenue when others buy during a live call
      if (isBuy && speakerInfo) {
        const callerName = speakerInfo.name;
        setCallerEarnings(prev => ({ ...prev, [callerName]: (prev[callerName] || 0) + tradeUSD * FEE_CALLER }));
        setPlatformRevenue(prev => prev + tradeUSD * FEE_PLATFORM);
        setCallVolume(prev => prev + tradeUSD);
      }
    }, 2000 + Math.random() * 2000);
    return () => clearInterval(i);
  }, [speakerInfo]);

  // Auto-trigger first caller on mount — use trending if loaded, else COINS fallback
  const hasAutoStarted = useRef(false);
  const trendingRef = useRef(null);
  useEffect(() => { trendingRef.current = trendingTokens; }, [trendingTokens]);
  useEffect(() => {
    if (hasAutoStarted.current) return;
    hasAutoStarted.current = true;
    const timer = setTimeout(() => {
      const st = stateRef.current;
      const coins = trendingRef.current;
      const firstCoin = rememberCoin(coins?.[0] || COINS[0]);
      const idx = st.chars.findIndex(c => c.name === "zac") ?? 0;
      const c = st.chars[idx];
      if (!c) return;
      st.teleportCharIdx = idx;
      st.teleportPhase = "beam_out";
      st.teleportTimer = 0;
      setTeleportVFX("out");
      const txStats = { buys: 212, sells: 87, buyVol: "35.6", sellVol: "12.4", holders: 1855, topHolding: "27.8" };
      const charName = c.name;
      const thesis = `${firstCoin.ticker} is pumping hard. Volume is insane. Loading up heavy.`;
      setSpeakerInfo({ name: charName, coin: firstCoin, idx, thesis, txStats, followers: "127K", callMcap: firstCoin.mcap });
      setCardExpanded(false);
      { const tfd = generateAllTimeframes(firstCoin.positive); chartTFDataRef.current = tfd; setChartData(tfd[chartTFRef.current]); loadRealChart(firstCoin); }
      setVotes({ up: 24, down: 3 });
      st.jmboIntroTimer = 6.0;
      st.jmboIntroName = charName;
      st.jmboIntroTicker = firstCoin.ticker;
      st.jmboIntroCharIdx = idx;
      setChatMessages(p => [...p, { user: "trench.fm", msg: `⚡ ${charName} is teleporting to the stage...` }]);
    }, 2000);
    return () => clearTimeout(timer);
  }, [rememberCoin]);

  // Queue auto-advance: 45s per caller, countdown timer
  const SPEAKER_DURATION = 45; // seconds
  const [speakerTimeLeft, setSpeakerTimeLeft] = useState(SPEAKER_DURATION);
  const speakerTimeRef = useRef(45);
  useEffect(() => { speakerTimeRef.current = speakerTimeLeft; }, [speakerTimeLeft]);
  const speakerStartRef = useRef(null);

  // Countdown tick
  useEffect(() => {
    if (!speakerInfo) { setSpeakerTimeLeft(SPEAKER_DURATION); return; }
    speakerStartRef.current = Date.now();
    setSpeakerTimeLeft(SPEAKER_DURATION);
    const i = setInterval(() => {
      const elapsed = (Date.now() - speakerStartRef.current) / 1000;
      const remaining = Math.max(0, SPEAKER_DURATION - elapsed);
      setSpeakerTimeLeft(remaining);
    }, 250);
    return () => clearInterval(i);
  }, [speakerInfo]);

  // Auto-advance when timer hits 0
  useEffect(() => {
    if (!speakerInfo || queue.length === 0) return;
    const timer = setTimeout(() => {
      const next = queue[0];
      setQueue(q => q.slice(1));
      const st = stateRef.current;
      // Record outgoing speaker in top calls leaderboard
      if (speakerInfo) {
        const gain = speakerInfo.coin.positive ? "+" + (1 + Math.random() * 5).toFixed(1) + "x" : "-" + (Math.random() * 0.5).toFixed(1) + "x";
        const callEntry = {
          ticker: speakerInfo.coin.ticker,
          change: gain,
          caller: speakerInfo.name,
          followers: speakerInfo.followers || "?",
          timeAgo: "just now",
          fdv: speakerInfo.coin.fdv || speakerInfo.coin.mcap,
          price: speakerInfo.coin.price,
        };
        st.topCallsToday = [callEntry, ...(st.topCallsToday || [])].slice(0, 3);
      }
      if (st.speaker !== null) chars_ref_restore(st);
      // Match character to queued name, fallback to random
      let idx = next.name ? st.chars.findIndex(c => c.name === next.name) : -1;
      if (idx < 0) idx = Math.floor(Math.random() * st.chars.length);
      const c = st.chars[idx];
      st.teleportCharIdx = idx;
      st.teleportPhase = "beam_out";
      st.teleportTimer = 0;
      setTeleportVFX("out");
      const txStats = { buys: Math.floor(80 + Math.random() * 200), sells: Math.floor(30 + Math.random() * 120), buyVol: (Math.random() * 80 + 10).toFixed(1), sellVol: (Math.random() * 50 + 5).toFixed(1), holders: Math.floor(500 + Math.random() * 3000), topHolding: (15 + Math.random() * 20).toFixed(1) };
      const followers = ["12.5K", "45.2K", "127K", "892K", "33.1K", "8.4K"][Math.floor(Math.random() * 6)];
      setSpeakerInfo({ name: next.name || c.name, coin: next.coin, idx, thesis: next.thesis, txStats, followers, callMcap: next.coin.mcap });
      setCardExpanded(false);
      { const tfd = generateAllTimeframes(next.coin.positive); chartTFDataRef.current = tfd; setChartData(tfd[chartTFRef.current]); loadRealChart(next.coin); }
      setVotes({ up: Math.floor(Math.random() * 20) + 5, down: Math.floor(Math.random() * 5) });
      setUserVoted(null);
      // Jumbotron IS the announcement — start intro during teleport beam
      const spkName = next.name || c.name;
      st.jmboIntroTimer = 6.0;
      st.jmboIntroName = spkName;
      st.jmboIntroTicker = next.coin.ticker;
      st.jmboIntroCharIdx = idx;
      setChatMessages(p => [...p, { user: "trench.fm", msg: `⚡ ${spkName} is teleporting to the stage...` }]);
      setTimeout(() => setChatMessages(p => [...p, { user: next.name || c.name, msg: `Calling ${next.coin.ticker} — ${next.coin.mcap} mcap, ${next.coin.change}. LFG.` }]), 1500);
    }, SPEAKER_DURATION * 1000);
    return () => clearTimeout(timer);
  }, [speakerInfo, queue]);

  // ═══ THREE.JS ═══
  useEffect(() => {
    if (!mountRef.current) return;
    const container = mountRef.current;
    function init() {
      const isIPhone = /iPhone/i.test(navigator.userAgent);
      const w = container.clientWidth, h = container.clientHeight;
      const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: "high-performance" });
      renderer.setSize(w, h); renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 1.5 : 2));
      renderer.setClearColor(0x0a0008);
      container.appendChild(renderer.domElement); rendererRef.current = renderer;

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(50, w / h, 0.5, 150);

      // Lighting
      scene.add(new THREE.AmbientLight(0x553366, 1.5));
      const spotPink = new THREE.PointLight(0xff2d78, 3, 25, 1.2); spotPink.position.set(0, 10, 0); scene.add(spotPink);
      const warm1 = new THREE.PointLight(0xff6622, 1.5, 30, 1.5); warm1.position.set(-15, 8, -10); scene.add(warm1);
      const warm2 = new THREE.PointLight(0xff2288, 1.2, 30, 1.5); warm2.position.set(15, 6, 15); scene.add(warm2);
      const cool1 = new THREE.PointLight(0x6622ff, 0.8, 25, 1.5); cool1.position.set(10, 9, -15); scene.add(cool1);

      // ═══ ANADOL SKY DOME — full sphere, same beautiful flowing pink ═══
      const domeMat = new THREE.ShaderMaterial({
        uniforms: {
          uTime: { value: 0 },
          uHueShift: { value: 0.0 },
          uIntensity: { value: 0.6 },
          uSpeed: { value: 0.2 },
          uBottomHalf: { value: 1.0 },
        },
        side: THREE.BackSide,
        vertexShader: `varying vec3 vP;varying vec2 vU;void main(){vP=position;vU=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
        fragmentShader: `uniform float uTime;uniform float uHueShift;uniform float uIntensity;uniform float uSpeed;uniform float uBottomHalf;
          varying vec3 vP;varying vec2 vU;${ANADOL_GLSL}
          void main(){
            float t = uTime * uSpeed;
            float autoHue = uHueShift + t * 0.0083;
            float th=atan(vP.x,vP.z);
            float ph=acos(clamp(vP.y/70.0,-1.0,1.0));
            vec2 p=vec2(th*2.0,ph*3.0);

            // Triple-layer domain warping — deep organic complexity
            float w1=domainWarp(p*0.35,t*0.7,${isMobile ? 2 : 3});
            float w2=domainWarp(p*0.65+vec2(3.3,7.7),t*0.55,${isMobile ? 2 : 3});
            ${isMobile ? '' : 'float w3=domainWarp(p*1.1+vec2(11.1,4.4),t*0.9,3);'}
            float w4=domainWarp(p*0.2+vec2(7.7,13.3),t*0.3,${isMobile ? 2 : 2});
            float comp=(w1*0.35+w2*0.30+${isMobile ? '' : 'w3*0.20+'}w4*0.15)*0.5+0.5;

            // ═══ NEON ANADOL PALETTE — BRIGHT hot pink / electric cyan / lime ═══
            // palA: Hot neon pink (primary — BRIGHT, not muddy)
            vec3 palA=cosPal(w1*0.5+0.5+t*0.02,
              vec3(0.45,0.08,0.35),vec3(0.55,0.12,0.45),vec3(0.8,0.4,0.9),
              vec3(autoHue*0.3,0.08,0.15+autoHue*0.2));
            // palB: Electric cyan → blue (secondary — vivid)
            vec3 palB=cosPal(w2*0.5+0.5+t*0.015,
              vec3(0.05,0.25,0.40),vec3(0.15,0.55,0.60),vec3(0.7,0.9,0.8),
              vec3(0.7+autoHue*0.2,0.25,0.05));
            // palC: Neon lime sparks
            vec3 palC=cosPal(w4*0.5+0.5+t*0.012,
              vec3(0.05,0.30,0.05),vec3(0.15,0.65,0.12),vec3(0.5,1.0,0.4),
              vec3(0.0,0.33+autoHue*0.2,0.67));

            // ═══ LAYERED COMPOSITION — BRIGHT additive, generous masks ═══
            float maskA=smoothstep(0.1,0.6,w1*0.5+0.5);
            float maskB=smoothstep(0.15,0.65,w2*0.5+0.5);
            float maskC=pow(max(0.0,comp),3.0);
            vec3 col=palA*maskA*0.85+palB*maskB*0.45+palC*maskC*0.25;

            // ═══ FILAMENT TENDRILS — sharp neon ridges ═══
            float ridge=pow(abs(w1*w2),3.5);
            col+=vec3(1.0,0.2,0.6)*ridge*0.18;

            // ═══ EDGE GLOW — cyan at form boundaries ═══
            float edgeDet=abs(comp-0.5)*2.0;
            float edgeGl=pow(1.0-edgeDet,2.5);
            col+=vec3(0.0,0.85,1.0)*edgeGl*0.10;

            // ═══ BLOOM — generous neon peaks ═══
            float hs=pow(max(0.0,domainWarp(p*0.8+vec2(5.5,2.2),t*0.6,${isMobile ? 1 : 2})*0.5+0.5),3.0);
            col+=vec3(1.0,0.15,0.55)*hs*0.40;
            float hs2=pow(max(0.0,(1.0-comp)*w2*0.5+0.3),2.5);
            col+=vec3(0.1,0.75,1.0)*hs2*0.12;
            float limeBloom=pow(max(0.0,w4*0.5+0.5),4.0);
            col+=vec3(0.2,1.0,0.08)*limeBloom*0.10;

            // ═══ SHADOWS — rich deep purple (never flat black) ═══
            float valley=pow(1.0-comp,2.0);
            col+=vec3(0.15,0.04,0.25)*valley*0.50;

            // ═══ IRIDESCENT SHIMMER ═══
            vec3 iri=cosPal(comp*2.0+t*0.01,
              vec3(0.50,0.15,0.50),vec3(0.45,0.30,0.50),vec3(1.0,0.8,1.0),
              vec3(autoHue*0.3,0.5+autoHue*0.2,0.15+autoHue*0.3));
            col=mix(col,col+iri*0.15,smoothstep(0.35,0.75,comp));

            // ═══ MICRO GRAIN ═══
            float gr=snoise(p*15.0+t*0.4)*0.5+0.5;
            col*=(0.92+gr*0.16);

            // ═══ BREATHING — gentle, not dimming ═══
            float br=(0.92+sin(t*0.55)*0.08)*uIntensity;
            // BRIGHT: dark areas at 0.55 (never black), peaks at full — Vegas Sphere energy
            float ii=br*(0.70+comp*0.30);

            // ═══ WARM BASE — pink-tinted, never cold black ═══
            vec3 base=vec3(0.12,0.04,0.14)+cosPal(autoHue,
              vec3(0.06,0.02,0.08),vec3(0.04,0.02,0.05),
              vec3(1.0,1.0,1.0),vec3(0.0,0.33,0.67));
            vec3 f=base+col*ii;

            // ═══ NEON BLOOM OVERLAY — extra hot ═══
            f+=vec3(1.0,0.15,0.55)*hs*0.25;
            f+=vec3(0.15,0.7,0.06)*limeBloom*0.06;

            // Equatorial brightness boost — pattern must come 100% down to crowd, zero black
            float polarT=ph/3.14159;  // 0 at top, 1 at bottom
            float eqBoost=smoothstep(0.15,0.55,polarT);
            f*=(1.0+eqBoost*1.2);  // up to +120% brightness in equatorial/lower regions

            // Bottom hemisphere fade — only when bottom half is disabled
            float hNorm=vP.y/70.0;
            if(uBottomHalf<0.5){
              float fade=smoothstep(-0.3,-0.05,hNorm);
              f*=fade;
            }

            // Absolute brightness floor — rich purple, never dark, extends fully to equator
            f=max(f,vec3(0.30,0.11,0.35));
            f=min(f,vec3(1.0));
            gl_FragColor=vec4(f,1.0);
          }`,
      });
      scene.add(new THREE.Mesh(new THREE.SphereGeometry(70, isMobile ? 16 : 20, isMobile ? 12 : 16), domeMat));

      // ═══ ANADOL FLOOR — synced with dome hue ═══
      const floorMat = new THREE.ShaderMaterial({
        transparent: true,
        uniforms: { uTime: { value: 0 }, uHue: { value: 0 }, uSpd: { value: 0.2 } },
        vertexShader: `varying vec3 vP;void main(){vP=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
        fragmentShader: `uniform float uTime;uniform float uHue;uniform float uSpd;varying vec3 vP;${ANADOL_GLSL}
          void main(){float t=uTime*uSpd;float ah=uHue+t*0.0083;vec2 p=vP.xz*0.06;
          float w1=domainWarp(p*0.5,t*0.6,${isMobile ? 2 : 3});float w2=domainWarp(p*0.8+vec2(3.0,7.0),t*0.5,${isMobile ? 2 : 3});
          float s=(w1*0.6+w2*0.4)*0.5+0.5;
          // Neon Anadol floor — BRIGHT pink/cyan/lime matching dome
          vec3 c=cosPal(s+ah,vec3(0.35,0.06,0.28),vec3(0.50,0.10,0.40),vec3(0.8,0.4,0.9),vec3(ah*0.3,0.08,0.15+ah*0.2));
          vec3 c2=cosPal(w2*0.5+0.5+ah,vec3(0.04,0.20,0.32),vec3(0.12,0.50,0.55),vec3(0.7,0.9,0.8),vec3(0.7+ah*0.2,0.25,0.05));
          c=mix(c,c2,smoothstep(0.3,0.7,w1*0.5+0.5));
          // Lime accent in bright floor areas
          float limeMask=pow(s,3.0);
          vec3 lime=cosPal(w1*0.5+0.5+ah,vec3(0.03,0.20,0.03),vec3(0.10,0.55,0.08),vec3(0.5,1.0,0.4),vec3(0.0,0.33+ah*0.2,0.67));
          c+=lime*limeMask*0.18;
          float d=length(vP.xz);float pg=smoothstep(10.0,1.0,d)*0.7;float ef=smoothstep(28.0,10.0,d);
          float r=(s*0.55+0.20)+pg;r*=ef;
          // Neon grid lines — hot pink
          float gx=smoothstep(0.03,0.0,abs(fract(vP.x*0.5)-0.5));
          float gz=smoothstep(0.03,0.0,abs(fract(vP.z*0.5)-0.5));
          float g=max(gx,gz)*0.06*ef;
          vec3 gridCol=vec3(1.0,0.1,0.5)*g;
          // Breathing sync
          float flBr=0.92+sin(uTime*uSpd*0.55)*0.08;
          float floorAlpha=smoothstep(28.0,20.0,d);
          vec3 b=vec3(0.02,0.008,0.035);vec3 fCol=min(b+c*r*flBr+gridCol,vec3(1.0));gl_FragColor=vec4(fCol,floorAlpha);}`,
      });
      const fg = new THREE.CircleGeometry(ROOM_RADIUS + 4, 32); fg.rotateX(-Math.PI / 2);
      scene.add(new THREE.Mesh(fg, floorMat));

      // Walls removed — dome sphere covers everything beautifully
      const wallMat = { uniforms: { uTime: { value: 0 }, uHue: { value: 0 }, uSpd: { value: 0 } } }; // stub for refs

      // ═══ SHADER FACTORIES — reusable Anadol materials for stage GLB ═══
      function makePodiumShader() {
        return new THREE.ShaderMaterial({
          uniforms: { uTime: { value: 0 }, uHue: { value: 0 }, uSpd: { value: 0.2 } },
          transparent: true,
          vertexShader: `varying vec3 vW;varying vec3 vN;void main(){vW=(modelMatrix*vec4(position,1.0)).xyz;vN=normalize(normalMatrix*normal);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
          fragmentShader: `uniform float uTime;uniform float uHue;uniform float uSpd;varying vec3 vW;varying vec3 vN;${ANADOL_GLSL}
            void main(){float t=uTime*uSpd;float ah=uHue+t*0.0083;
            float topMix=smoothstep(0.85,1.1,vN.y);
            vec2 pFloor=vW.xz*0.06;
            float a=atan(vW.x,vW.z);float h=vW.y;
            vec2 pSide=vec2(a*4.0,h*3.0);
            vec2 p=mix(pSide,pFloor*16.0,topMix);
            float w1=domainWarp(p*0.5,t*0.6,${isMobile ? 2 : 4});float w2=domainWarp(p*0.8+vec2(3.0,7.0),t*0.5,${isMobile ? 2 : 3});
            float s=(w1*0.6+w2*0.4)*0.5+0.5;
            vec3 c=cosPal(s+ah,vec3(0.35,0.06,0.28),vec3(0.50,0.10,0.40),vec3(0.8,0.4,0.9),vec3(ah*0.3,0.08,0.15+ah*0.2));
            vec3 c2=cosPal(w2*0.5+0.5+ah,vec3(0.04,0.20,0.32),vec3(0.12,0.50,0.55),vec3(0.7,0.9,0.8),vec3(0.7+ah*0.2,0.25,0.05));
            c=mix(c,c2,smoothstep(0.3,0.7,w1*0.5+0.5));
            float limeMask=pow(s,3.0);
            vec3 lime=cosPal(w1*0.5+0.5+ah,vec3(0.03,0.20,0.03),vec3(0.10,0.55,0.08),vec3(0.5,1.0,0.4),vec3(0.0,0.33+ah*0.2,0.67));
            c+=lime*limeMask*0.18;
            float topGlow=smoothstep(1.0,1.22,h)*1.5;
            float side=(s*0.7+0.2);float i=side+topGlow;
            float gr=snoise(p*12.0+t*0.5)*0.5+0.5;c*=(0.92+gr*0.16);
            vec3 bloom=cosPal(ah*2.0+t*0.01,vec3(0.5,0.08,0.4),vec3(0.5,0.25,0.5),vec3(1.0,0.8,1.0),vec3(0.0,0.5,0.2));
            vec3 cyanEdge=vec3(0.0,0.7,1.0)*topGlow*0.15;
            float podBr=0.88+sin(t*0.55/0.2)*0.12;
            vec3 f=vec3(0.01,0.004,0.02)+c*i*podBr+bloom*topGlow*0.35+cyanEdge;
            gl_FragColor=vec4(min(f,vec3(1.0)),1.0);}`,
        });
      }
      function _makeLEDWallShader() {
        return new THREE.ShaderMaterial({
          uniforms: { uTime: { value: 0 }, uHue: { value: 0 }, uSpd: { value: 0.2 } },
          transparent: true,
          vertexShader: `varying vec3 vW;varying vec2 vUv;void main(){vW=(modelMatrix*vec4(position,1.0)).xyz;vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
          fragmentShader: `uniform float uTime;uniform float uHue;uniform float uSpd;varying vec3 vW;varying vec2 vUv;${ANADOL_GLSL}
            void main(){float t=uTime*uSpd;float ah=uHue+t*0.0083;
            vec2 p=vW.xz*0.08;
            float w1=domainWarp(p*0.4,t*0.5,${isMobile ? 2 : 3});
            float w2=domainWarp(p*0.7+vec2(2.0,5.0),t*0.4,${isMobile ? 2 : 3});
            float s=(w1*0.5+w2*0.5)*0.5+0.5;
            vec3 c=cosPal(s+ah,vec3(0.35,0.06,0.28),vec3(0.50,0.10,0.40),vec3(0.8,0.4,0.9),vec3(ah*0.3,0.08,0.15+ah*0.2));
            vec3 c2=cosPal(w2*0.5+0.5+ah,vec3(0.04,0.20,0.32),vec3(0.12,0.50,0.55),vec3(0.7,0.9,0.8),vec3(0.7+ah*0.2,0.25,0.05));
            c=mix(c,c2,smoothstep(0.3,0.7,w1*0.5+0.5));
            // Scanlines
            float scan=sin(vW.y*40.0+t*5.0)*0.06+0.94;
            c*=scan;
            // LED pixel grid
            vec2 px=fract(vW.xz*8.0);
            float grid=smoothstep(0.04,0.12,px.x)*smoothstep(0.04,0.12,px.y);
            c*=grid*0.85+0.15;
            float br=0.90+sin(t*0.55/0.2)*0.10;
            gl_FragColor=vec4(min(c*(s*0.8+0.3)*br*1.3,vec3(1.0)),1.0);}`,
        });
      }

      function makeTVShader() {
        return new THREE.ShaderMaterial({
          uniforms: { uTime: { value: 0 }, uHue: { value: 0 } },
          vertexShader: `varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
          fragmentShader: `uniform float uTime;uniform float uHue;varying vec2 vUv;${ANADOL_GLSL}
            void main(){
              float t=uTime;
              // ═══ VJ MODE OSCILLATORS — continuously evolving parameters ═══
              // Slow LFOs at irrational ratios → never repeats
              float lfo1=sin(t*0.037)*0.5+0.5;  // ~27s cycle
              float lfo2=sin(t*0.053)*0.5+0.5;  // ~19s
              float lfo3=sin(t*0.071)*0.5+0.5;  // ~14s
              float lfo4=sin(t*0.023)*0.5+0.5;  // ~43s
              float lfo5=cos(t*0.041)*0.5+0.5;  // ~24s
              // Hue complementary to venue — opposite side of color wheel + gentle drift
              float ah=uHue+0.5+t*0.0083+lfo4*0.12;

              // Barrel distortion — CRT curvature
              vec2 uv=vUv-0.5;
              float r2=dot(uv,uv);
              uv*=1.0+r2*0.15;

              // ═══ EVOLVING WARP — scale + speed modulated by LFOs ═══
              float warpScale=2.0+lfo1*3.0;       // 2-5: tight tendrils ↔ sweeping clouds
              float warpSpeed=0.3+lfo2*0.6;        // 0.3-0.9: slow drift ↔ rushing flow
              float warpSeed=floor(t*0.02)*7.7;    // shift warp origin every ~50s
              vec2 p=uv*warpScale;

              float w1=domainWarp(p*0.45+vec2(1.1+warpSeed,2.2),t*warpSpeed*0.7,${isMobile ? 2 : 4});
              float w2=domainWarp(p*0.7+vec2(6.6,3.3+warpSeed),t*warpSpeed*0.55,${isMobile ? 2 : 3});
              float w3=domainWarp(p*0.25+vec2(9.9+warpSeed,14.1),t*warpSpeed*0.35,${isMobile ? 2 : 3});
              float comp=(w1*0.4+w2*0.35+w3*0.25)*0.5+0.5;

              // ═══ PALETTE BLEND — crossfade between 3 color moods ═══
              // Mood A: Hot pink / magenta fire
              vec3 palA=cosPal(w1*0.5+0.5+t*0.02,
                vec3(0.45,0.08,0.35),vec3(0.55,0.12,0.45),vec3(0.8,0.4,0.9),
                vec3(ah*0.3,0.08,0.15+ah*0.2));
              // Mood B: Electric cyan / deep ocean
              vec3 palB=cosPal(w2*0.5+0.5+t*0.015,
                vec3(0.05,0.25,0.40),vec3(0.15,0.55,0.60),vec3(0.7,0.9,0.8),
                vec3(0.7+ah*0.2,0.25,0.05));
              // Mood C: Neon lime / acid green
              vec3 palC=cosPal(w3*0.5+0.5+t*0.012,
                vec3(0.05,0.30,0.05),vec3(0.15,0.65,0.12),vec3(0.5,1.0,0.4),
                vec3(0.0,0.33+ah*0.2,0.67));
              // Mood D: Gold / amber (warm accent)
              vec3 palD=cosPal(comp+t*0.018,
                vec3(0.50,0.35,0.05),vec3(0.45,0.35,0.10),vec3(0.9,0.7,0.3),
                vec3(0.1,0.15+ah*0.1,0.7));

              // LFO-driven palette weights — each mood rises and falls
              float mA=0.3+lfo1*0.7;
              float mB=0.3+lfo3*0.7;
              float mC=0.2+lfo5*0.5;
              float mD=lfo2*lfo4*0.4;
              float maskA=smoothstep(0.1,0.6,w1*0.5+0.5);
              float maskB=smoothstep(0.15,0.65,w2*0.5+0.5);
              float maskC=pow(max(0.0,comp),3.0);
              vec3 col=palA*maskA*mA+palB*maskB*mB+palC*maskC*mC+palD*maskC*mD;

              // ═══ EVOLVING EFFECTS — intensity modulated by LFOs ═══
              // Filament tendrils — sharpness varies
              float ridgePow=2.0+lfo3*3.0; // 2-5
              float ridge=pow(abs(w1*w2),ridgePow);
              vec3 ridgeCol=mix(vec3(1.0,0.2,0.6),vec3(0.2,0.6,1.0),lfo4);
              col+=ridgeCol*ridge*(0.10+lfo2*0.20);

              // Edge glow — color shifts
              float edgeDet=abs(comp-0.5)*2.0;
              vec3 edgeCol=mix(vec3(0.0,0.85,1.0),vec3(1.0,0.3,0.8),lfo1);
              col+=edgeCol*pow(1.0-edgeDet,2.5)*(0.06+lfo5*0.12);

              // Bloom hotspots — position and color drift
              float hs=pow(max(0.0,domainWarp(p*0.9+vec2(5.5+lfo4*3.0,2.2),t*warpSpeed*0.6,${isMobile ? 1 : 2})*0.5+0.5),3.0);
              vec3 bloomCol=mix(vec3(1.0,0.15,0.55),vec3(0.1,1.0,0.6),lfo3);
              col+=bloomCol*hs*(0.20+lfo1*0.25);

              // Secondary bloom
              float hs2=pow(max(0.0,(1.0-comp)*w2*0.5+0.3),2.5);
              col+=vec3(0.1,0.75,1.0)*hs2*(0.08+lfo2*0.12);

              // Iridescent shimmer — intensity breathes
              vec3 iri=cosPal(comp*2.0+t*0.01,
                vec3(0.50,0.15,0.50),vec3(0.45,0.30,0.50),vec3(1.0,0.8,1.0),
                vec3(ah*0.3,0.5+ah*0.2,0.15+ah*0.3));
              col=mix(col,col+iri*(0.10+lfo4*0.15),smoothstep(0.35,0.75,comp));

              // Micro grain
              float gr=snoise(p*15.0+t*0.4)*0.5+0.5;
              col*=(0.92+gr*0.16);

              // ═══ TV EFFECTS ═══
              float scan=sin(vUv.y*256.0+t*3.0)*0.04+0.96;
              col*=scan;
              vec2 px=fract(vUv*vec2(192.0,108.0));
              float grid=smoothstep(0.03,0.10,px.x)*smoothstep(0.03,0.10,px.y);
              col*=grid*0.88+0.12;
              col+=col*dot(col,vec3(0.33))*0.1;

              // Vignette
              float vig=1.0-r2*2.5;
              col*=clamp(vig,0.0,1.0)*0.7+0.3;

              // Deep purple shadows
              col+=vec3(0.12,0.03,0.20)*pow(1.0-comp,2.0)*0.45;

              // Breathing
              col*=(0.90+sin(t*0.55)*0.10)*1.3;
              gl_FragColor=vec4(min(col,vec3(1.0)),1.0);}`,
        });
      }

      // ═══ PODIUM — raised circular stage with Anadol surface + glowing rings ═══
      const stageMats = [];
      const stageGroup = new THREE.Group();

      // Main platform — Anadol shader surface
      const podMat = makePodiumShader();
      stageMats.push(podMat);
      const podium = new THREE.Mesh(
        new THREE.CylinderGeometry(PODIUM_RADIUS, PODIUM_RADIUS + 0.4, 1.2, isMobile ? 16 : 24),
        podMat);
      podium.position.y = 0.6;
      stageGroup.add(podium);

      // Glowing edge rings — cyan bottom, pink top
      const ringGeo = new THREE.TorusGeometry(PODIUM_RADIUS + 0.1, 0.04, 8, 24);
      const cyanRing = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color: 0x00d4ff }));
      cyanRing.rotation.x = Math.PI / 2; cyanRing.position.y = 0.08;
      stageGroup.add(cyanRing);
      const pinkRing = new THREE.Mesh(
        new THREE.TorusGeometry(PODIUM_RADIUS - 0.1, 0.035, 8, 24),
        new THREE.MeshBasicMaterial({ color: 0xff2d78 }));
      pinkRing.rotation.x = Math.PI / 2; pinkRing.position.y = 1.2;
      stageGroup.add(pinkRing);

      // Inner accent ring at mid-height
      const midRing = new THREE.Mesh(
        new THREE.TorusGeometry(PODIUM_RADIUS + 0.25, 0.025, 6, 24),
        new THREE.MeshBasicMaterial({ color: 0x8844ff, transparent: true, opacity: 0.6 }));
      midRing.rotation.x = Math.PI / 2; midRing.position.y = 0.6;
      stageGroup.add(midRing);

      const st0 = stateRef.current;
      stageGroup.scale.setScalar(st0.stageScale);
      stageGroup.position.y = 0;
      scene.add(stageGroup);

      // ═══ MICROPHONE STAND — loaded from GLB, positioned in front of caller ═══
      let micGroup = null;
      new GLTFLoader().load("/3d/microphone.glb", (gltf) => {
        micGroup = gltf.scene;
        micGroup.traverse(child => {
          if (child.isMesh && child.material) {
            const m = child.material;
            if (m.map) { m.emissiveMap = m.map; m.emissive = new THREE.Color(1, 1, 1); m.emissiveIntensity = 0.6; }
            m.metalness = 0.3; m.roughness = 0.5; m.needsUpdate = true;
          }
        });
        const st = stateRef.current;
        micGroup.scale.setScalar(st.micScale);
        micGroup.position.set(0, st.micY, st.micZ);
        scene.add(micGroup);
        threeRef.current.micGroup = micGroup;
      });

      // ═══ 4-SIDED JUMBOTRON — stadium scoreboard, fixed in space ═══
      // Helper: create one screen face with canvas, texture, LED shader, and curved mesh
      function makeScreenFace(geoW, geoH, canvasW, canvasH, curveAmt) {
        const canvas = document.createElement("canvas");
        canvas.width = canvasW; canvas.height = canvasH;
        const ctx = canvas.getContext("2d");
        const tex = new THREE.CanvasTexture(canvas);
        tex.minFilter = THREE.LinearFilter;
        const geo = new THREE.PlaneGeometry(geoW, geoH, 16, 1);
        // Concave curve
        const positions = geo.attributes.position;
        for (let i = 0; i < positions.count; i++) {
          const x = positions.getX(i);
          positions.setZ(i, (x * x) * curveAmt);
        }
        geo.computeVertexNormals();
        // Grid density: ~256-512 subdivisions across each axis (same as original)
        const gridX = Math.min(canvasW, 512);
        const gridY = Math.min(canvasH, 256);
        const mat = new THREE.ShaderMaterial({
          uniforms: { uScreen: { value: tex }, uTime: { value: 0 }, uGrid: { value: new THREE.Vector2(gridX, gridY) } },
          vertexShader: `
            varying vec2 vUv; varying vec3 vN;
            void main(){
              vUv = uv; vN = normalize(normalMatrix * normal);
              gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }`,
          fragmentShader: `
            uniform sampler2D uScreen; uniform float uTime; uniform vec2 uGrid;
            varying vec2 vUv; varying vec3 vN;
            void main(){
              vec4 screen = texture2D(uScreen, vUv);
              // LED pixel grid — tighter gaps for neon pop
              vec2 px = fract(vUv * uGrid);
              float grid = smoothstep(0.04, 0.12, px.x) * smoothstep(0.04, 0.12, px.y);
              // Boost saturation + brightness (LED screens are emissive)
              vec3 color = screen.rgb;
              float lum = dot(color, vec3(0.299, 0.587, 0.114));
              color = mix(vec3(lum), color, 1.25); // +25% saturation
              color = color * grid * 1.5;
              // Edge bloom — softer vignette
              float edge = pow(1.0 - abs(vUv.x - 0.5) * 2.0, 0.25);
              color *= 0.75 + edge * 0.5;
              // Phosphor bleed — subtle glow around bright pixels
              float bloom = dot(color, vec3(0.33)) * 0.12;
              color += color * bloom;
              // Scanline — faster, more visible
              float scan = sin(vUv.y * uGrid.y * 0.5 + uTime * 4.0) * 0.04 + 0.96;
              color *= scan;
              // Breathing sync
              float breathe = 0.92 + sin(uTime * 0.55) * 0.08;
              color *= breathe;
              gl_FragColor = vec4(color, 1.0);
            }`,
          side: THREE.DoubleSide,
        });
        const mesh = new THREE.Mesh(geo, mat);
        return { canvas, ctx, tex, mat, mesh };
      }

      // ═══ NBA/NHL SCOREBOARD LAYOUT ═══
      // Main 4 faces: chart + call data (same on all sides — readable from every angle)
      // Bottom ribbon: 4 detail strips (different data per side)
      // Top ribbon: ticker/price strip (same on all sides)
      const mainH = 6, botH = 1.8, topH = 2.8;
      // All 4 sides equal — square cross-section like a real NBA jumbotron
      const faceW = 11, halfD = faceW / 2;
      const mainY = 0, botY = mainY - mainH / 2 - botH / 2 - 0.15, topY = mainY + mainH / 2 + topH / 2 + 0.15;

      // Main screens (all same content — chart from any angle)
      const jmboFront = makeScreenFace(faceW, mainH, 1024, 512, 0.008);
      const jmboBack  = makeScreenFace(faceW, mainH, 1024, 512, 0.008);
      const jmboLeft  = makeScreenFace(faceW, mainH, 1024, 512, 0.008);
      const jmboRight = makeScreenFace(faceW, mainH, 1024, 512, 0.008);
      const jmboFaces = [jmboFront, jmboBack, jmboLeft, jmboRight];

      // Bottom ribbon strips — tall canvas for big text
      const botFront = makeScreenFace(faceW, botH, 1024, 320, 0.005);
      const botBack  = makeScreenFace(faceW, botH, 1024, 320, 0.005);
      const botLeft  = makeScreenFace(faceW, botH, 1024, 320, 0.005);
      const botRight = makeScreenFace(faceW, botH, 1024, 320, 0.005);
      const jmboBotFaces = [botFront, botBack, botLeft, botRight];

      // Top ribbon strips — tall canvas for big text
      const topFront = makeScreenFace(faceW, topH, 1024, 200, 0.005);
      const topBack  = makeScreenFace(faceW, topH, 1024, 200, 0.005);
      const topLeft  = makeScreenFace(faceW, topH, 1024, 200, 0.005);
      const topRight = makeScreenFace(faceW, topH, 1024, 200, 0.005);
      const jmboTopFaces = [topFront, topBack, topLeft, topRight];

      // Assemble into group — square box, faces at halfD from center
      const jmboGroup = new THREE.Group();
      const faceLayout = [
        // Main screens
        [jmboFront.mesh, 0, mainY, halfD, 0],
        [jmboBack.mesh, 0, mainY, -halfD, Math.PI],
        [jmboRight.mesh, halfD, mainY, 0, Math.PI / 2],
        [jmboLeft.mesh, -halfD, mainY, 0, -Math.PI / 2],
        // Bottom ribbon
        [botFront.mesh, 0, botY, halfD, 0],
        [botBack.mesh, 0, botY, -halfD, Math.PI],
        [botRight.mesh, halfD, botY, 0, Math.PI / 2],
        [botLeft.mesh, -halfD, botY, 0, -Math.PI / 2],
        // Top ribbon
        [topFront.mesh, 0, topY, halfD, 0],
        [topBack.mesh, 0, topY, -halfD, Math.PI],
        [topRight.mesh, halfD, topY, 0, Math.PI / 2],
        [topLeft.mesh, -halfD, topY, 0, -Math.PI / 2],
      ];
      faceLayout.forEach(([mesh, x, y, z, ry]) => {
        mesh.position.set(x, y, z);
        mesh.rotation.y = ry;
        jmboGroup.add(mesh);
      });

      // Metallic frame structure — square cross-section
      const frameMat = new THREE.MeshStandardMaterial({ color: 0x1a1228, metalness: 0.9, roughness: 0.2 });
      const totalH = mainH + botH + topH + 0.6;
      const plateSize = faceW + 1;
      // Top/bottom plates
      const topPlate = new THREE.Mesh(new THREE.BoxGeometry(plateSize, 0.25, plateSize), frameMat);
      topPlate.position.y = topY + topH / 2 + 0.15;
      topPlate.matrixAutoUpdate = false; topPlate.updateMatrix();
      jmboGroup.add(topPlate);
      const midTopPlate = new THREE.Mesh(new THREE.BoxGeometry(plateSize - 0.5, 0.15, plateSize - 0.5), frameMat);
      midTopPlate.position.y = mainY + mainH / 2 + 0.075;
      midTopPlate.matrixAutoUpdate = false; midTopPlate.updateMatrix();
      jmboGroup.add(midTopPlate);
      const midBotPlate = new THREE.Mesh(new THREE.BoxGeometry(plateSize - 0.5, 0.15, plateSize - 0.5), frameMat);
      midBotPlate.position.y = mainY - mainH / 2 - 0.075;
      midBotPlate.matrixAutoUpdate = false; midBotPlate.updateMatrix();
      jmboGroup.add(midBotPlate);
      const bottomPlate = new THREE.Mesh(new THREE.BoxGeometry(plateSize, 0.25, plateSize), frameMat);
      bottomPlate.position.y = botY - botH / 2 - 0.15;
      bottomPlate.matrixAutoUpdate = false; bottomPlate.updateMatrix();
      jmboGroup.add(bottomPlate);
      // Corner pillars — square corners
      const cp = halfD + 0.3;
      [[-cp, cp], [cp, cp], [-cp, -cp], [cp, -cp]].forEach(([px, pz]) => {
        const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.25, totalH + 0.5, 0.25), frameMat);
        pillar.position.set(px, (topY + topH / 2 + botY - botH / 2) / 2, pz);
        pillar.matrixAutoUpdate = false; pillar.updateMatrix();
        jmboGroup.add(pillar);
      });
      // Mounting pole
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 5, 8), frameMat);
      pole.position.y = topY + topH / 2 + 2.8;
      pole.matrixAutoUpdate = false; pole.updateMatrix();
      jmboGroup.add(pole);

      jmboGroup.position.set(0, stateRef.current.jmboY, 0);
      jmboGroup.rotation.y = 0;
      scene.add(jmboGroup);

      // ═══ CLUB SPEAKERS — horizontal line arrays hanging from jumbotron (desktop only) ═══
      if (!isMobile) {
      function makeLineArraySpeaker(unitCount) {
        const spkGroup = new THREE.Group();
        const unitW = 3.2, unitH = 0.55, unitD = 0.8; // wide, short, shallow — line array style
        const cabMat = new THREE.MeshStandardMaterial({ color: 0x1a0e28, metalness: 0.85, roughness: 0.2 });
        const grillMat = new THREE.MeshStandardMaterial({ color: 0x0a0418, metalness: 0.3, roughness: 0.8 });
        const cyanGlow = new THREE.MeshBasicMaterial({ color: 0x00d4ff });
        const pinkGlow = new THREE.MeshBasicMaterial({ color: 0xff2d78 });
        // Mounting yoke on top
        const yokeMat = new THREE.MeshStandardMaterial({ color: 0x1a1228, metalness: 0.9, roughness: 0.15 });
        const yoke = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.25, 0.5), yokeMat);
        yoke.position.y = unitCount * (unitH + 0.06) / 2 + 0.15;
        spkGroup.add(yoke);
        const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 1.2, 6), yokeMat);
        rod.position.y = yoke.position.y + 0.72;
        spkGroup.add(rod);
        for (let i = 0; i < unitCount; i++) {
          const yOff = (unitCount / 2 - i - 0.5) * (unitH + 0.06);
          // Cabinet body
          const cab = new THREE.Mesh(new THREE.BoxGeometry(unitW, unitH, unitD), cabMat);
          cab.position.y = yOff;
          spkGroup.add(cab);
          // Front grill
          const grill = new THREE.Mesh(new THREE.BoxGeometry(unitW - 0.1, unitH - 0.08, 0.04), grillMat);
          grill.position.set(0, yOff, unitD / 2 + 0.01);
          spkGroup.add(grill);
          // Horizontal driver slot — glowing cyan line across the front
          const slot = new THREE.Mesh(new THREE.BoxGeometry(unitW * 0.75, 0.06, 0.05), cyanGlow);
          slot.position.set(0, yOff, unitD / 2 + 0.025);
          spkGroup.add(slot);
          // Small driver circles (2 woofers per unit)
          [-unitW * 0.28, unitW * 0.28].forEach(dx => {
            const driver = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.02, 6, 16), cyanGlow);
            driver.position.set(dx, yOff, unitD / 2 + 0.025);
            spkGroup.add(driver);
          });
          // Pink LED strip on bottom edge of each unit
          const led = new THREE.Mesh(new THREE.BoxGeometry(unitW - 0.2, 0.025, 0.04), pinkGlow);
          led.position.set(0, yOff - unitH / 2 + 0.02, unitD / 2 + 0.01);
          spkGroup.add(led);
        }
        // Side accent strips — cyan vertical on each side
        const totalH = unitCount * (unitH + 0.06);
        [-unitW / 2 + 0.03, unitW / 2 - 0.03].forEach(lx => {
          const sled = new THREE.Mesh(new THREE.BoxGeometry(0.03, totalH, 0.04), cyanGlow);
          sled.position.set(lx, 0, unitD / 2 + 0.01);
          spkGroup.add(sled);
        });
        return spkGroup;
      }
      // Hang line arrays from the front 2 jumbotron corners (audience-facing)
      const spkCornerX = halfD - 0.5;
      const spkHangY = botY - botH / 2 - 0.15 - 2.0; // below bottom plate
      [[-spkCornerX, halfD], [spkCornerX, halfD]].forEach(([sx, sz]) => {
        const spk = makeLineArraySpeaker(4); // 4-unit stack
        spk.position.set(sx, spkHangY, sz);
        spk.rotation.y = Math.PI; // face outward (toward audience)
        jmboGroup.add(spk);
      });
      // Back 2 corners — smaller 3-unit stacks
      [[-spkCornerX, -halfD], [spkCornerX, -halfD]].forEach(([sx, sz]) => {
        const spk = makeLineArraySpeaker(3);
        spk.position.set(sx, spkHangY, sz);
        spk.rotation.y = 0;
        jmboGroup.add(spk);
      });
      } // end !isMobile speakers

      // ═══ TELEPORT BEAM VFX ═══
      // Vertical beam cylinder (scales up/down during teleport)
      const beamGeo = new THREE.CylinderGeometry(0.6, 0.8, 8, 16, 1, true);
      const beamMat = new THREE.ShaderMaterial({
        uniforms: { uTime: { value: 0 }, uProgress: { value: 0 }, uColor: { value: new THREE.Color(0xff2d78) } },
        transparent: true, depthWrite: false, side: THREE.DoubleSide,
        vertexShader: `varying vec2 vUv;varying vec3 vP;void main(){vUv=uv;vP=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
        fragmentShader: `uniform float uTime;uniform float uProgress;uniform vec3 uColor;varying vec2 vUv;varying vec3 vP;
          void main(){
            float t=uTime;
            // Vertical scan lines
            float scan=sin(vUv.y*40.0-t*8.0)*0.5+0.5;
            // Horizontal ring pulses
            float rings=sin(vUv.y*8.0-t*5.0)*0.5+0.5;
            // Fade at edges
            float edgeFade=1.0-abs(vUv.y-0.5)*2.0;
            edgeFade=pow(edgeFade,0.5);
            // Intensity based on progress
            float intensity=uProgress*edgeFade*(0.3+scan*0.3+rings*0.4);
            // Sparkle
            float sparkle=fract(sin(dot(vUv,vec2(12.9898,78.233))+t*3.0)*43758.5453);
            intensity+=sparkle*0.1*uProgress*edgeFade;
            vec3 col=mix(uColor,vec3(1.0),0.3+scan*0.2);
            gl_FragColor=vec4(col,intensity*0.7);
          }`,
      });
      const beam = new THREE.Mesh(beamGeo, beamMat);
      beam.position.set(0, 5.2, 0); beam.visible = false;
      scene.add(beam);

      // Teleport ring burst (flat ring that expands)
      const burstGeo = new THREE.RingGeometry(0.1, 1.5, 32);
      const burstMat = new THREE.MeshBasicMaterial({ color: 0xff2d78, transparent: true, opacity: 0, side: THREE.DoubleSide });
      const burst = new THREE.Mesh(burstGeo, burstMat);
      burst.rotation.x = -Math.PI / 2; burst.position.y = 1.25; burst.visible = false;
      scene.add(burst);

      // Teleport particles
      const tpCount = 200;
      const tpGeo = new THREE.BufferGeometry();
      const tpPos = new Float32Array(tpCount * 3);
      const tpVel = new Float32Array(tpCount * 3);
      for (let i = 0; i < tpCount; i++) {
        tpPos[i * 3] = 0; tpPos[i * 3 + 1] = -10; tpPos[i * 3 + 2] = 0;
      }
      tpGeo.setAttribute("position", new THREE.BufferAttribute(tpPos, 3));
      const tpMat = new THREE.PointsMaterial({ color: 0xff88aa, size: 0.12, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
      const tpParts = new THREE.Points(tpGeo, tpMat);
      scene.add(tpParts);

      // Ambient particles
      const PC = isMobile ? 300 : 600;
      const ppArr = new Float32Array(PC * 3); const ppLife = new Float32Array(PC);
      for (let i = 0; i < PC; i++) {
        const a = Math.random() * Math.PI * 2, r = 1 + Math.random() * ROOM_RADIUS * 0.8;
        ppArr[i * 3] = Math.cos(a) * r; ppArr[i * 3 + 1] = Math.random() * 15; ppArr[i * 3 + 2] = Math.sin(a) * r;
        ppLife[i] = Math.random();
      }
      const ppGeo = new THREE.BufferGeometry();
      ppGeo.setAttribute("position", new THREE.BufferAttribute(ppArr, 3));
      scene.add(new THREE.Points(ppGeo, new THREE.PointsMaterial({ color: 0xff4488, size: 0.06, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false })));
      const pp2Arr = new Float32Array(PC * 3); const pp2Life = new Float32Array(PC);
      for (let i = 0; i < PC; i++) {
        const a = Math.random() * Math.PI * 2, r = 2 + Math.random() * ROOM_RADIUS * 0.6;
        pp2Arr[i * 3] = Math.cos(a) * r; pp2Arr[i * 3 + 1] = Math.random() * 12; pp2Arr[i * 3 + 2] = Math.sin(a) * r;
        pp2Life[i] = Math.random();
      }
      const pp2Geo = new THREE.BufferGeometry();
      pp2Geo.setAttribute("position", new THREE.BufferAttribute(pp2Arr, 3));
      scene.add(new THREE.Points(pp2Geo, new THREE.PointsMaterial({ color: 0x8844ff, size: 0.05, transparent: true, opacity: 0.25, blending: THREE.AdditiveBlending, depthWrite: false })));

      // ═══ CONCERT LASERS — emanate from jumbotron structure ═══
      const LASER_COUNT = 6;
      const laserGroup = new THREE.Group();
      const laserColors = [0xff1a6e, 0x39ff14, 0x00d4ff, 0xff1a6e, 0x39ff14, 0x00d4ff];
      const lasers = [];
      const laserGeo = new THREE.CylinderGeometry(0.02, 0.02, 30, 4);
      for (let i = 0; i < LASER_COUNT; i++) {
        const mat = new THREE.MeshBasicMaterial({
          color: laserColors[i], transparent: true, opacity: 0.15,
          blending: THREE.AdditiveBlending, depthWrite: false,
        });
        const beam = new THREE.Mesh(laserGeo, mat);
        beam.position.set((i - LASER_COUNT / 2 + 0.5) * 2.5, 2, 0);
        lasers.push({ mesh: beam, speed: 0.3 + Math.random() * 0.5, phase: i * 1.1 });
        laserGroup.add(beam);
      }
      jmboGroup.add(laserGroup);

      // ═══ CROWD — Miyamoto Edition ═══
      // Design: Big head (35% of height), chunky limbs, bright colors, PFP mapped onto 3D sphere
      const chars = stateRef.current.chars; const count = chars.length;

      // ═══ TOON SHADER — self-lit cel shader for bodies/arms/legs ═══
      // Doesn't depend on scene lights (like head matcap shader)
      // Rim glow + 2-tone cel bands + hue-matched vibrancy
      const toonShader = () => new THREE.ShaderMaterial({
        vertexShader: `
          varying vec3 vVN;
          varying vec3 vColor;
          varying float vPulse;
          uniform float uTime;
          void main(){
            // Instance color from attribute
            vColor = vec3(instanceColor);
            // View-space normal for lighting
            vec3 wNorm = normalize(mat3(instanceMatrix) * normal);
            vVN = normalize(mat3(modelViewMatrix) * wNorm);
            // Subtle emissive pulse synced with bob
            vPulse = sin(uTime * 1.5 + instanceColor.r * 6.28) * 0.5 + 0.5;
            gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0);
          }`,
        fragmentShader: `
          varying vec3 vVN;
          varying vec3 vColor;
          varying float vPulse;
          void main(){
            // Hemisphere light — self-lit, no scene dependency
            float light = dot(vVN, normalize(vec3(0.0, 1.0, 0.5))) * 0.5 + 0.5;
            // 2-tone cel bands (light → shadow)
            float toon = smoothstep(0.3, 0.35, light) * 0.4 + 0.6;
            vec3 color = vColor * toon;
            // Rim glow — hue-matched edges (Nintendo signature)
            float rim = pow(1.0 - max(0.0, vVN.z), 3.0) * 0.25;
            color += vColor * rim * 1.5;
            // Subtle emissive pulse
            color += vColor * vPulse * 0.06;
            gl_FragColor = vec4(color, 1.0);
          }`,
        uniforms: { uTime: { value: 0 } },
      });

      // Torso — wide, rounded, hoodie-shaped (Nintendo proportions)
      const bodyMat = toonShader();
      const bodies = new THREE.InstancedMesh(
        new THREE.CylinderGeometry(0.18, 0.22, 0.55, 8, 1),
        bodyMat, count);
      bodies.instanceMatrix.setUsage(THREE.DynamicDrawUsage); scene.add(bodies);

      // PFP atlas — procedural fallback, then real TG/X profile pics
      const PFP_FILES = ["abhi.jpg","AzFlin.jpg","bandit.jpg","biz.jpg","ferengi.jpg","frostyflakes.jpg","icobeast.jpg","jin.jpg","phanes.jpg","pupul.jpg","rekt.jpg","rob.jpg","shinkiro14.jpg","skely.jpg","Tintin.jpg","ultra.png","vn.jpg","zac.jpg"];
      const A = 2048, P = 64, CO = A / P;
      const ac = document.createElement("canvas"); ac.width = ac.height = A;
      const ax = ac.getContext("2d");
      chars.forEach((c, i) => {
        const col = i % CO, row = Math.floor(i / CO), ox = col * P, oy = row * P;
        ax.clearRect(ox, oy, P, P);
        const g = ax.createRadialGradient(ox + 32, oy + 32, 5, ox + 32, oy + 32, 30);
        g.addColorStop(0, `hsl(${c.hue},80%,65%)`); g.addColorStop(1, `hsl(${c.hue},70%,45%)`);
        ax.fillStyle = g; ax.beginPath(); ax.arc(ox + 32, oy + 32, 30, 0, Math.PI * 2); ax.fill();
        ax.strokeStyle = `hsl(${c.hue},90%,70%)`; ax.lineWidth = 2.5; ax.stroke();
        const sk = Math.floor(c.skinTone * 180 + 75);
        ax.fillStyle = `rgb(${sk},${Math.floor(sk * .85)},${Math.floor(sk * .72)})`;
        ax.beginPath(); ax.arc(ox + 32, oy + 34, 13, 0, Math.PI * 2); ax.fill();
        ax.fillStyle = "#222";
        ax.beginPath(); ax.arc(ox + 26, oy + 32, 3, 0, Math.PI * 2); ax.fill();
        ax.beginPath(); ax.arc(ox + 38, oy + 32, 3, 0, Math.PI * 2); ax.fill();
        ax.fillStyle = "#fff";
        ax.beginPath(); ax.arc(ox + 27, oy + 31, 1.2, 0, Math.PI * 2); ax.fill();
        ax.beginPath(); ax.arc(ox + 39, oy + 31, 1.2, 0, Math.PI * 2); ax.fill();
      });
      const aT = new THREE.CanvasTexture(ac); aT.minFilter = THREE.LinearFilter; aT.magFilter = THREE.LinearFilter;

      // Load real PFPs from /public/pfp/ (TG/X profile pics)
      const pfpImgs = PFP_FILES.map(f => { const img = new Image(); img.src = `/pfp/${f}`; return img; });
      pfpImgsRef.current = pfpImgs;
      Promise.all(pfpImgs.map(img => new Promise(r => { img.onload = () => r(true); img.onerror = () => r(false); }))).then(() => {
        chars.forEach((c, i) => {
          const img = pfpImgs[i % pfpImgs.length];
          if (!img.naturalWidth) return;
          const col = i % CO, row = Math.floor(i / CO), ox = col * P, oy = row * P;
          ax.clearRect(ox, oy, P, P);
          ax.save();
          ax.beginPath(); ax.arc(ox + 32, oy + 32, 30, 0, Math.PI * 2); ax.clip();
          ax.drawImage(img, ox, oy, P, P);
          ax.restore();
          ax.strokeStyle = `hsl(${c.hue},85%,65%)`; ax.lineWidth = 3;
          ax.beginPath(); ax.arc(ox + 32, oy + 32, 30, 0, Math.PI * 2); ax.stroke();
        });
        aT.needsUpdate = true;
      });

      // Head — 3D sphere with PFP mapped via matcap projection
      const headGeo = new THREE.InstancedBufferGeometry().copy(new THREE.SphereGeometry(0.34, isMobile ? 8 : 12, isMobile ? 6 : 10));
      const uo = new Float32Array(count * 2), us = new Float32Array(count * 2);
      for (let i = 0; i < count; i++) { uo[i * 2] = (i % CO) / CO; uo[i * 2 + 1] = 1 - (Math.floor(i / CO) + 1) / CO; us[i * 2] = 1 / CO; us[i * 2 + 1] = 1 / CO; }
      headGeo.setAttribute("uvO", new THREE.InstancedBufferAttribute(uo, 2));
      headGeo.setAttribute("uvS", new THREE.InstancedBufferAttribute(us, 2));
      const headMat = new THREE.ShaderMaterial({
        uniforms: { atlas: { value: aT } },
        vertexShader: `
          attribute vec2 uvO; attribute vec2 uvS;
          varying vec2 vAUv; varying vec3 vVN;
          void main(){
            vec3 wn=normalize(mat3(instanceMatrix)*normal);
            vec3 vn=normalize(mat3(modelViewMatrix)*wn);
            vVN=vn;
            vAUv=vn.xy*0.48+0.5; // matcap UV — PFP projects onto front of sphere
            vAUv=vAUv*uvS+uvO;
            gl_Position=projectionMatrix*modelViewMatrix*instanceMatrix*vec4(position,1.0);
          }`,
        fragmentShader: `
          uniform sampler2D atlas;
          varying vec2 vAUv; varying vec3 vVN;
          void main(){
            vec4 tex=texture2D(atlas,vAUv);
            float facing=max(0.0,vVN.z);
            float mask=smoothstep(-0.05,0.35,vVN.z);
            vec3 base=vec3(0.12,0.06,0.16);
            vec3 lit=tex.rgb*(0.7+0.3*facing);
            vec3 color=mix(base,lit,mask*step(0.05,tex.a));
            float rim=pow(1.0-facing,2.5)*0.35;
            color+=vec3(0.5,0.2,0.7)*rim;
            gl_FragColor=vec4(color,1.0);
          }`,
      });
      const heads = new THREE.InstancedMesh(headGeo, headMat, count);
      heads.instanceMatrix.setUsage(THREE.DynamicDrawUsage); scene.add(heads);

      // Dummy pfps (billboard removed — PFP is on head sphere now)
      const pfps = { setMatrixAt(){}, instanceMatrix:{ needsUpdate:false } };

      // Arms — chunky, bright, hue-matched (Nintendo thick limbs) — toon shader
      const armMat = toonShader();
      const aL = new THREE.InstancedMesh(
        new THREE.CylinderGeometry(0.07, 0.08, 0.4, 6),
        armMat, count);
      const aR = new THREE.InstancedMesh(
        new THREE.CylinderGeometry(0.07, 0.08, 0.4, 6),
        armMat, count);
      aL.instanceMatrix.setUsage(THREE.DynamicDrawUsage); aR.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      scene.add(aL); scene.add(aR);

      // Legs — chunky, slightly darker hue (jeans/pants) — toon shader
      const legMat = toonShader();
      const lL = new THREE.InstancedMesh(
        new THREE.CylinderGeometry(0.09, 0.07, 0.42, 6),
        legMat, count);
      const lR = new THREE.InstancedMesh(
        new THREE.CylinderGeometry(0.09, 0.07, 0.42, 6),
        legMat, count);
      lL.instanceMatrix.setUsage(THREE.DynamicDrawUsage); lR.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      scene.add(lL); scene.add(lR);

      // Instance colors — BRIGHT (Miyamoto rule: 65-80% lightness, 70-90% saturation)
      const cc = new THREE.Color();
      chars.forEach((c, i) => {
        cc.setHSL(c.hue / 360, 0.8, 0.65); bodies.setColorAt(i, cc); // bright hoodie
        cc.setHSL(c.hue / 360, 0.75, 0.6); aL.setColorAt(i, cc); aR.setColorAt(i, cc); // matching sleeves
        cc.setHSL(c.hue / 360, 0.4, 0.3); lL.setColorAt(i, cc); lR.setColorAt(i, cc); // darker pants
      });
      bodies.instanceColor.needsUpdate = true;
      aL.instanceColor.needsUpdate = true; aR.instanceColor.needsUpdate = true;
      lL.instanceColor.needsUpdate = true; lR.instanceColor.needsUpdate = true;

      // Speaker — same Miyamoto proportions as crowd, but bigger (1.8x scale)
      // Uses self-lit toon shader so it matches the crowd perfectly
      const speakerToonMat = (color) => {
        const c = new THREE.Color(color);
        return new THREE.ShaderMaterial({
          uniforms: { uColor: { value: c }, uTime: { value: 0 } },
          vertexShader: `
            varying vec3 vVN;
            uniform float uTime;
            void main(){
              vVN = normalize(normalMatrix * normal);
              gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }`,
          fragmentShader: `
            varying vec3 vVN;
            uniform vec3 uColor;
            uniform float uTime;
            void main(){
              float light = dot(vVN, normalize(vec3(0.0, 1.0, 0.5))) * 0.5 + 0.5;
              float toon = smoothstep(0.3, 0.35, light) * 0.4 + 0.6;
              vec3 color = uColor * toon;
              float rim = pow(1.0 - max(0.0, vVN.z), 3.0) * 0.3;
              color += uColor * rim * 1.5;
              color += uColor * (sin(uTime * 1.5) * 0.5 + 0.5) * 0.08;
              gl_FragColor = vec4(color, 1.0);
            }`,
        });
      };
      // ═══ THROWABLES — instanced spheres for tomatoes & diamonds ═══
      const throwGeo = new THREE.SphereGeometry(0.12, 6, 6);
      const tomatoMat = new THREE.MeshBasicMaterial({ color: 0xff2222 });
      const diamondMat = new THREE.MeshBasicMaterial({ color: 0x00d4ff, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending });
      const tomatoMeshes = new THREE.InstancedMesh(throwGeo, tomatoMat, MAX_THROWABLES);
      const diamondMeshes = new THREE.InstancedMesh(throwGeo, diamondMat, MAX_THROWABLES);
      tomatoMeshes.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      diamondMeshes.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      // Start all instances hidden (scale 0)
      const zeroMat = new THREE.Matrix4().makeScale(0, 0, 0);
      for (let i = 0; i < MAX_THROWABLES; i++) { tomatoMeshes.setMatrixAt(i, zeroMat); diamondMeshes.setMatrixAt(i, zeroMat); }
      scene.add(tomatoMeshes); scene.add(diamondMeshes);
      // Splat particles — small flat circles that burst on tomato impact
      const splatGeo = new THREE.CircleGeometry(0.06, 6);
      const splatMat = new THREE.MeshBasicMaterial({ color: 0xff3333, transparent: true, opacity: 0.9, side: THREE.DoubleSide });
      const splatMeshes = new THREE.InstancedMesh(splatGeo, splatMat, MAX_SPLATS);
      splatMeshes.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      for (let i = 0; i < MAX_SPLATS; i++) splatMeshes.setMatrixAt(i, zeroMat);
      scene.add(splatMeshes);

      // Load tomato.glb → swap instanced mesh with real tomato geometry
      new GLTFLoader().load("/3d/tomato.glb", (gltf) => {
        let tGeo = null, tMatSrc = null;
        gltf.scene.traverse(child => {
          if (child.isMesh && !tGeo) { tGeo = child.geometry.clone(); tMatSrc = child.material; }
        });
        if (!tGeo) return;
        // Scale geometry down to throwable size (~0.12 unit radius like the original sphere)
        tGeo.computeBoundingBox();
        const bb = tGeo.boundingBox;
        const extent = Math.max(bb.max.x - bb.min.x, bb.max.y - bb.min.y, bb.max.z - bb.min.z);
        const targetSize = 0.24; // diameter — same scale as the old sphere (radius 0.12)
        if (extent > 0) tGeo.scale(targetSize / extent, targetSize / extent, targetSize / extent);
        if (tMatSrc) {
          if (tMatSrc.map) { tMatSrc.emissiveMap = tMatSrc.map; tMatSrc.emissive = new THREE.Color(1, 1, 1); tMatSrc.emissiveIntensity = 0.6; }
          tMatSrc.metalness = 0.3; tMatSrc.roughness = 0.5; tMatSrc.needsUpdate = true;
        }
        const newMesh = new THREE.InstancedMesh(tGeo, tMatSrc || tomatoMat, MAX_THROWABLES);
        newMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        const z = new THREE.Matrix4().makeScale(0, 0, 0);
        for (let i = 0; i < MAX_THROWABLES; i++) newMesh.setMatrixAt(i, z);
        scene.remove(tomatoMeshes);
        scene.add(newMesh);
        threeRef.current.tomatoMeshes = newMesh;
      });

      // Load rose.glb → swap diamond instanced mesh with real rose geometry
      new GLTFLoader().load("/3d/rose.glb", (gltf) => {
        let rGeo = null, rMatSrc = null;
        gltf.scene.traverse(child => {
          if (child.isMesh && !rGeo) { rGeo = child.geometry.clone(); rMatSrc = child.material; }
        });
        if (!rGeo) return;
        rGeo.computeBoundingBox();
        const bb = rGeo.boundingBox;
        const extent = Math.max(bb.max.x - bb.min.x, bb.max.y - bb.min.y, bb.max.z - bb.min.z);
        const targetSize = 0.24;
        if (extent > 0) rGeo.scale(targetSize / extent, targetSize / extent, targetSize / extent);
        if (rMatSrc) {
          if (rMatSrc.map) { rMatSrc.emissiveMap = rMatSrc.map; rMatSrc.emissive = new THREE.Color(1, 1, 1); rMatSrc.emissiveIntensity = 0.6; }
          rMatSrc.metalness = 0.3; rMatSrc.roughness = 0.5; rMatSrc.needsUpdate = true;
        }
        const newMesh = new THREE.InstancedMesh(rGeo, rMatSrc || diamondMat, MAX_THROWABLES);
        newMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        const z = new THREE.Matrix4().makeScale(0, 0, 0);
        for (let i = 0; i < MAX_THROWABLES; i++) newMesh.setMatrixAt(i, z);
        scene.remove(diamondMeshes);
        scene.add(newMesh);
        threeRef.current.diamondMeshes = newMesh;
      });

      // ═══ CROWD EMOTES — small colored circles that pop above heads ═══
      const emoteGeo = new THREE.PlaneGeometry(0.22, 0.22);
      const emoteUpMat = new THREE.MeshBasicMaterial({ color: 0x00ff88, transparent: true, opacity: 0.9, side: THREE.DoubleSide, depthWrite: false });
      const emoteDownMat = new THREE.MeshBasicMaterial({ color: 0xff4444, transparent: true, opacity: 0.9, side: THREE.DoubleSide, depthWrite: false });
      const emoteUpMeshes = new THREE.InstancedMesh(emoteGeo, emoteUpMat, count);
      const emoteDownMeshes = new THREE.InstancedMesh(emoteGeo, emoteDownMat, count);
      emoteUpMeshes.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      emoteDownMeshes.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      for (let i = 0; i < count; i++) { emoteUpMeshes.setMatrixAt(i, zeroMat); emoteDownMeshes.setMatrixAt(i, zeroMat); }
      scene.add(emoteUpMeshes); scene.add(emoteDownMeshes);

      const sg = new THREE.Group(); sg.visible = false; sg.position.set(0, 1.2, 0);
      // Head — BIG sphere with PFP mapped via matcap (Nintendo: head = 40% of character)
      // Billboard: always faces camera. Matcap projection gives natural 3D curvature.
      // Rim glow is hue-matched to caller color for that Smash Bros character select vibe.
      const sh = new THREE.Mesh(
        new THREE.SphereGeometry(0.8, 16, 16),
        new THREE.ShaderMaterial({
          uniforms: {
            atlas: { value: aT },
            uvO: { value: new THREE.Vector2(0, 0) },
            uvS: { value: new THREE.Vector2(1/CO, 1/CO) },
            uRimColor: { value: new THREE.Color(1, 0.18, 0.47) },
            uTime: { value: 0 },
          },
          vertexShader: `
            varying vec2 vAUv; varying vec3 vVN; varying vec3 vWorldNorm;
            uniform vec2 uvO; uniform vec2 uvS;
            void main(){
              vec3 vn = normalize(mat3(modelViewMatrix) * normalize(normalMatrix * normal));
              vVN = vn;
              vWorldNorm = normalize(normalMatrix * normal);
              // Wider PFP coverage — 0.55 maps more of the face onto the sphere
              vAUv = vn.xy * 0.55 + 0.5;
              vAUv = vAUv * uvS + uvO;
              gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }`,
          fragmentShader: `
            uniform sampler2D atlas;
            uniform vec3 uRimColor;
            uniform float uTime;
            varying vec2 vAUv; varying vec3 vVN; varying vec3 vWorldNorm;
            void main(){
              vec4 tex = texture2D(atlas, vAUv);
              float facing = max(0.0, vVN.z);
              // Wider visible area — PFP is readable from more angles
              float mask = smoothstep(-0.1, 0.25, vVN.z);
              // Brighter base — no dark backs, always readable
              vec3 base = vec3(0.08, 0.04, 0.12);
              vec3 lit = tex.rgb * (0.8 + 0.2 * facing);
              vec3 color = mix(base, lit, mask * step(0.05, tex.a));
              // Hue-matched rim glow — Nintendo character outline feel
              float rim = pow(1.0 - facing, 2.0);
              float rimPulse = 0.35 + sin(uTime * 2.0) * 0.08;
              color += uRimColor * rim * rimPulse;
              // Subtle specular highlight on top — gives spherical 3D pop
              float spec = pow(max(0.0, dot(vVN, normalize(vec3(0.2, 0.8, 0.5)))), 12.0) * 0.3;
              color += vec3(1.0) * spec;
              // Thin dark outline at silhouette edge
              float outline = smoothstep(0.08, 0.15, facing);
              color *= outline * 0.7 + 0.3;
              gl_FragColor = vec4(color, 1.0);
            }`,
        })
      );
      sh.position.y = 2.55; sg.add(sh);
      // Body — hoodie torso
      const sb = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.4, 1.0, 8), speakerToonMat(0xff2d78));
      sb.position.y = 1.7; sg.add(sb);
      // Left arm
      const sal = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 0.72, 6), speakerToonMat(0xff2d78));
      sal.position.set(-0.45, 2.0, 0); sal.rotation.z = Math.PI / 4; sg.add(sal);
      // Right arm
      const sar = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 0.72, 6), speakerToonMat(0xff2d78));
      sar.position.set(0.45, 2.0, 0); sar.rotation.z = -Math.PI / 4; sg.add(sar);
      // Left leg
      const sll = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.12, 0.8, 6), speakerToonMat(0x2a2a4a));
      sll.position.set(-0.18, 0.6, 0); sg.add(sll);
      // Right leg
      const slr = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.12, 0.8, 6), speakerToonMat(0x2a2a4a));
      slr.position.set(0.18, 0.6, 0); sg.add(slr);
      scene.add(sg);

      // ═══ DJ BOOTH — loaded from dj.glb, Anadol shader on table ═══
      new GLTFLoader().load("/3d/djset.glb", (gltf) => {
        const djGroup = gltf.scene;
        djGroup.traverse(child => {
          if (!child.isMesh || !child.material) return;
          const n = (child.name || "").toLowerCase();
          const geo = child.geometry;
          // Heuristic: large box-like mesh = table body → Anadol shader
          if (/table|desk|console|body|booth/.test(n) || (!n && geo && geo.boundingBox === null && (geo.computeBoundingBox(), true) && geo.boundingBox && (geo.boundingBox.max.x - geo.boundingBox.min.x) > 0.5 && (geo.boundingBox.max.z - geo.boundingBox.min.z) > 0.3)) {
            const podShader = makePodiumShader();
            stageMats.push(podShader);
            child.material = podShader;
          } else if (/speaker|cabinet|stack|woofer/.test(n)) {
            child.material = new THREE.MeshStandardMaterial({ color: 0x1a0e28, metalness: 0.85, roughness: 0.2 });
          } else if (/cyan|led|strip|glow/.test(n) && !/pink|red/.test(n)) {
            child.material = new THREE.MeshBasicMaterial({ color: 0x00d4ff });
          } else if (/pink|red|strip/.test(n) && !/cyan/.test(n)) {
            child.material = new THREE.MeshBasicMaterial({ color: 0xff2d78 });
          } else if (/screen|display|monitor/.test(n)) {
            // Skip — standalone LED screen built separately
            child.visible = false;
          } else {
            // Self-illuminate fallback (like mic pattern)
            const m = child.material;
            if (m.map) { m.emissiveMap = m.map; m.emissive = new THREE.Color(1, 1, 1); m.emissiveIntensity = 0.6; }
            m.metalness = 0.3; m.roughness = 0.5; m.needsUpdate = true;
          }
        });
        const dst = stateRef.current;
        djGroup.position.set(dst.djX, dst.djY, dst.djZ);
        djGroup.scale.setScalar(dst.djScale);
        scene.add(djGroup);
        threeRef.current.djBooth = djGroup;
      });

      // ═══ DJ TABLE — butter-slab Anadol table with corner posts ═══
      {
        const tableMat = makePodiumShader();
        stageMats.push(tableMat);
        // Unit box — scaled via stateRef params in animate loop
        const tableMesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), tableMat);
        const tableGroup = new THREE.Group();
        tableGroup.add(tableMesh);
        // Corner posts — cyan glow pillars at each corner (legs)
        const postMat = new THREE.MeshBasicMaterial({ color: 0x00d4ff, transparent: true, opacity: 0.7 });
        const postGeo = new THREE.CylinderGeometry(0.04, 0.04, 1, 6);
        const posts = [];
        for (let i = 0; i < 4; i++) {
          const post = new THREE.Mesh(postGeo, postMat);
          tableGroup.add(post);
          posts.push(post);
        }
        // Pink edge trim on the top surface
        const trimMat = new THREE.MeshBasicMaterial({ color: 0xff2d78, transparent: true, opacity: 0.5 });
        const trimMesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), trimMat);
        tableGroup.add(trimMesh);
        scene.add(tableGroup);
        var djTable = { group: tableGroup, mesh: tableMesh, posts, trimMesh };
      }

      // ═══ LED SCREEN — GLSL Anadol shader art + canvas overlay for intros ═══
      {
        const tvMat = makeTVShader();
        // NOT pushed to stageMats — TV runs on its own clock, not dome speed
        const ledShaderMesh = new THREE.Mesh(new THREE.PlaneGeometry(4.5, 2.5, 1, 1), tvMat);
        // Canvas overlay — sits in front, shown only during intros
        const LED_W = 1024, LED_H = 512;
        const ledCanvas = document.createElement("canvas");
        ledCanvas.width = LED_W; ledCanvas.height = LED_H;
        const ledCtx = ledCanvas.getContext("2d");
        ledCtx.fillStyle = "#08041a"; ledCtx.fillRect(0, 0, LED_W, LED_H);
        const ledTex = new THREE.CanvasTexture(ledCanvas);
        ledTex.minFilter = THREE.LinearFilter;
        const ledOverlay = new THREE.Mesh(
          new THREE.PlaneGeometry(4.5, 2.5),
          new THREE.MeshBasicMaterial({ map: ledTex, transparent: true }));
        ledOverlay.position.z = 0.01; // just in front of shader
        ledOverlay.visible = false;
        // Frame border — dark purple with pink edge glow
        const frame = new THREE.Mesh(
          new THREE.BoxGeometry(4.7, 2.7, 0.08),
          new THREE.MeshStandardMaterial({ color: 0x1a0e28, metalness: 0.85, roughness: 0.2 }));
        frame.position.z = -0.05;
        // Pink edge glow strip
        const edge = new THREE.Mesh(
          new THREE.BoxGeometry(4.8, 2.8, 0.02),
          new THREE.MeshBasicMaterial({ color: 0xff2d78, transparent: true, opacity: 0.6 }));
        edge.position.z = -0.09;
        const ledGroup = new THREE.Group();
        ledGroup.add(ledShaderMesh); ledGroup.add(ledOverlay); ledGroup.add(frame); ledGroup.add(edge);
        ledGroup.position.set(0, 3.5, -(PODIUM_RADIUS + 0.5));
        scene.add(ledGroup);
        var ledScreen = { mesh: ledGroup, overlay: ledOverlay, canvas: ledCanvas, ctx: ledCtx, tex: ledTex, tvMat };
      }

      // Reusable vectors for per-frame jumbotron auto-positioning
      const _pv1 = new THREE.Vector3();
      const _pv2 = new THREE.Vector3();
      const JMBO_TOP_LOCAL = 6.225; // top plate top edge in local space

      threeRef.current = { scene, camera, renderer, spotPink, warm1, warm2, domeMat, floorMat, wallMat,
        bodies, heads, pfps, aL, aR, lL, lR, sg, sal, sar, sb,
        beam, beamMat, burst, burstMat, tpParts, tpMat, tpPos, tpVel,
        ppArr, ppLife, ppGeo, pp2Arr, pp2Life, pp2Geo,
        bodyMat, armMat, legMat,
        jmboGroup, jmboFaces, jmboBotFaces, jmboTopFaces, tomatoMeshes, diamondMeshes, splatMeshes, emoteUpMeshes, emoteDownMeshes,
        lasers, laserGroup, stageGroup, stageMats, ledScreen, djTable };

      // ═══ DEBUG GUI — only visible with ?debug in URL ═══
      const showDebug = window.location.search.toLowerCase().includes("debug");
      if (showDebug) {
        const gui = new GUI({ title: "Stage Controls" });
        gui.domElement.style.position = "fixed";
        gui.domElement.style.top = "4px";
        gui.domElement.style.right = "4px";
        gui.domElement.style.zIndex = "9999";
        gui.domElement.style.opacity = "0.85";
        gui.domElement.style.maxHeight = "95vh";
        gui.domElement.style.overflowY = "auto";
        const st2 = stateRef.current;
        const guiObj = {
          JmboY: st2.jmboY, JmboScale: st2.jmboScale, JmboSpin: st2.jmboRotSpeed || 0,
          CamH: st2.cameraHeight, CamD: st2.cameraDist,
          SpeakerScale: st2.speakerScale || 1.8, SpeakerX: st2.speakerX || 0, SpeakerY: st2.speakerY || 1.2, SpeakerZ: st2.speakerZ || 0,
          AmbientInt: 1.5, SpotInt: 3,
        };
        const jf = gui.addFolder("Jumbotron");
        jf.add(guiObj, "JmboY", 4, 20, 0.1).onChange(v => { stateRef.current.jmboY = v; });
        jf.add(guiObj, "JmboScale", 0.3, 2, 0.05).onChange(v => { stateRef.current.jmboScale = v; });
        jf.add(guiObj, "JmboSpin", 0, 0.5, 0.01).onChange(v => { stateRef.current.jmboRotSpeed = v; });
        const cf = gui.addFolder("Camera");
        cf.add(guiObj, "CamH", 2, 25, 0.5).onChange(v => { stateRef.current.cameraHeight = v; });
        cf.add(guiObj, "CamD", 10, 45, 0.5).onChange(v => { stateRef.current.cameraDist = v; });
        const sf = gui.addFolder("Speaker");
        sf.add(guiObj, "SpeakerScale", 1, 3, 0.1).onChange(v => { stateRef.current.speakerScale = v; });
        sf.add(guiObj, "SpeakerX", -5, 5, 0.1).onChange(v => { stateRef.current.speakerX = v; });
        sf.add(guiObj, "SpeakerY", 0.5, 3, 0.1).onChange(v => { stateRef.current.speakerY = v; });
        sf.add(guiObj, "SpeakerZ", -5, 5, 0.1).onChange(v => { stateRef.current.speakerZ = v; });
        const mf = gui.addFolder("Mic Stand");
        guiObj.MicScale = st2.micScale || 1.0;
        guiObj.MicY = st2.micY || 1.2;
        guiObj.MicZ = st2.micZ || 1.8;
        mf.add(guiObj, "MicScale", 0.1, 5, 0.05).onChange(v => { stateRef.current.micScale = v; });
        mf.add(guiObj, "MicY", 0, 5, 0.05).onChange(v => { stateRef.current.micY = v; });
        mf.add(guiObj, "MicZ", -3, 5, 0.05).onChange(v => { stateRef.current.micZ = v; });
        const gf = gui.addFolder("DJ Booth");
        guiObj.DJScale = st2.djScale;
        guiObj.DJX = st2.djX;
        guiObj.DJY = st2.djY;
        guiObj.DJZ = st2.djZ;
        guiObj.DJRotY = st2.djRotY;
        gf.add(guiObj, "DJScale", 0.1, 5, 0.05).onChange(v => { stateRef.current.djScale = v; });
        gf.add(guiObj, "DJX", -3, 3, 0.05).onChange(v => { stateRef.current.djX = v; });
        gf.add(guiObj, "DJY", -2, 5, 0.05).onChange(v => { stateRef.current.djY = v; });
        gf.add(guiObj, "DJZ", -3, 3, 0.05).onChange(v => { stateRef.current.djZ = v; });
        gf.add(guiObj, "DJRotY", -Math.PI, Math.PI, 0.05).onChange(v => { stateRef.current.djRotY = v; });
        const tf = gui.addFolder("DJ Table");
        guiObj.DTW = st2.dtW; guiObj.DTH = st2.dtH; guiObj.DTD = st2.dtD; guiObj.DTY = st2.dtY; guiObj.DTZoff = st2.dtZoff;
        tf.add(guiObj, "DTW", 0.5, 8, 0.1).onChange(v => { stateRef.current.dtW = v; }).name("Width");
        tf.add(guiObj, "DTH", 0.05, 2, 0.05).onChange(v => { stateRef.current.dtH = v; }).name("Height");
        tf.add(guiObj, "DTD", 0.3, 5, 0.1).onChange(v => { stateRef.current.dtD = v; }).name("Depth");
        tf.add(guiObj, "DTY", 0, 5, 0.05).onChange(v => { stateRef.current.dtY = v; }).name("Y Pos");
        tf.add(guiObj, "DTZoff", -3, 3, 0.05).onChange(v => { stateRef.current.dtZoff = v; }).name("Z Offset");
        const tvf = gui.addFolder("LED TV");
        guiObj.TVScale = st2.tvScale; guiObj.TVY = st2.tvY; guiObj.TVZ = st2.tvZ;
        tvf.add(guiObj, "TVScale", 0.1, 3, 0.05).onChange(v => { stateRef.current.tvScale = v; }).name("Scale");
        tvf.add(guiObj, "TVY", 0, 8, 0.05).onChange(v => { stateRef.current.tvY = v; }).name("Y Pos");
        tvf.add(guiObj, "TVZ", -3, 5, 0.05).onChange(v => { stateRef.current.tvZ = v; }).name("Z Offset");
        const df = gui.addFolder("Stage Model");
        guiObj.StageScale = st2.stageScale || 1.0;
        guiObj.StageRotOffset = st2.stageRotOffset || 0;
        df.add(guiObj, "StageScale", 0.1, 5, 0.05).onChange(v => { stateRef.current.stageScale = v; });
        df.add(guiObj, "StageRotOffset", -Math.PI, Math.PI, 0.05).onChange(v => { stateRef.current.stageRotOffset = v; });
        const bf = gui.addFolder("Background");
        bf.add(guiObj, "AmbientInt", 0, 5, 0.1).onChange(v => { scene.children.find(c => c.isAmbientLight).intensity = v; });
        bf.add(guiObj, "SpotInt", 0, 8, 0.1).onChange(v => { spotPink.intensity = v; });
        guiObj.DomeHue = 0.62; guiObj.DomeSpeed = 0.2; guiObj.DomeInt = 1.0; guiObj.DomeBtm = true;
        bf.add(guiObj, "DomeHue", 0, 1, 0.01).onChange(v => { stateRef.current.domeHueShift = v; }).name("Hue Shift");
        bf.add(guiObj, "DomeSpeed", 0.01, 3, 0.01).onChange(v => { stateRef.current.domeSpeed = v; }).name("Dome Speed");
        bf.add(guiObj, "DomeInt", 0.1, 2, 0.05).onChange(v => { stateRef.current.domeIntensity = v; }).name("Dome Bright");
        bf.add(guiObj, "DomeBtm").onChange(v => { stateRef.current.domeBottomHalf = v; }).name("Bottom Half");
        container.appendChild(gui.domElement);
      }

      // ═══ RENDER ═══
      const dm = new THREE.Matrix4(); const pos = new THREE.Vector3();
      const q = new THREE.Quaternion(); const sc = new THREE.Vector3(1, 1, 1);
      const zAxis = new THREE.Vector3(0, 0, 1);
      const xAxis = new THREE.Vector3(1, 0, 0);
      const idQ = new THREE.Quaternion();
      const yAxis = new THREE.Vector3(0, 1, 0);
      const camDir = new THREE.Vector3();
      const headLookQ = new THREE.Quaternion();
      const headLookMat = new THREE.Matrix4();
      const bodyFaceQ = new THREE.Quaternion();
      const bodyArmQ = new THREE.Quaternion();
      const _origin = new THREE.Vector3(0, 0, 0);
      const _up = new THREE.Vector3(0, 1, 0);
      const _headWorld = new THREE.Vector3();
      const crowdBillboardQ = new THREE.Quaternion();
      let last = performance.now();

      function animate() {
        frameRef.current = requestAnimationFrame(animate);
        const now = performance.now(); const dt = Math.min((now - last) / 1000, 0.05); last = now;
        const st = stateRef.current; st.clock += dt; const t = st.clock;

        fpsBuf.current.push(now);
        while (fpsBuf.current.length > 0 && now - fpsBuf.current[0] > 1000) fpsBuf.current.shift();

        // ═══ CINEMATIC INTRO SWEEP — bird's eye → gameplay position ═══
        if (st.introActive && !curtainsOpenRef.current) {
          // Curtains closed — hold at bird's-eye establishing shot, slow orbit for peek
          st.cameraAngle += dt * 0.08;
          camera.position.x = Math.sin(st.cameraAngle) * st.introStartDist;
          camera.position.z = Math.cos(st.cameraAngle) * st.introStartDist;
          camera.position.y = st.introStartHeight;
          camera.lookAt(0, st.introStartLookY, 0);
        } else if (st.introActive && curtainsOpenRef.current) {
          // Curtains open — sweep down from bird's eye to seat level
          st.introTimer += dt;
          const p = Math.min(st.introTimer / st.introDuration, 1);
          const e = 1 - Math.pow(1 - p, 3);
          const iH = st.introStartHeight + (st.introEndHeight - st.introStartHeight) * e;
          const iD = st.introStartDist + (st.introEndDist - st.introStartDist) * e;
          const iLY = st.introStartLookY + (st.introEndLookY - st.introStartLookY) * e;
          st.cameraAngle += dt * 0.15;
          camera.position.x = Math.sin(st.cameraAngle) * iD;
          camera.position.z = Math.cos(st.cameraAngle) * iD;
          camera.position.y = iH;
          camera.lookAt(0, iLY, 0);
          if (p >= 1) st.introActive = false;
        } else {
          // Spin physics — zen mode: smooth momentum, capped speed, gentle friction
          const MAX_SPIN = 0.04; // max radians/frame — prevents wild spinning
          if (!touchRef.current.active) {
            if (Math.abs(st.spinVelocity) > 0.0001) {
              st.spinVelocity = Math.max(-MAX_SPIN, Math.min(MAX_SPIN, st.spinVelocity));
              st.cameraAngle += st.spinVelocity;
              st.spinVelocity *= 0.975;
            } else if (st.autoRotate) {
              st.cameraAngle += dt * 0.06;
            } else if (Math.abs(st.spinVelocity) <= 0.0001) {
              st.autoRotate = true;
            }
          }
          camera.position.x = Math.sin(st.cameraAngle) * st.cameraDist;
          camera.position.z = Math.cos(st.cameraAngle) * st.cameraDist;
          camera.position.y = st.cameraHeight;
          camera.lookAt(0, 3.5, 0);
        }
        camera.updateMatrixWorld();

        domeMat.uniforms.uTime.value = t;
        domeMat.uniforms.uHueShift.value = st.domeHueShift;
        domeMat.uniforms.uSpeed.value = st.domeSpeed;
        domeMat.uniforms.uIntensity.value = st.domeIntensity;
        domeMat.uniforms.uBottomHalf.value = st.domeBottomHalf ? 1.0 : 0.0;
        floorMat.uniforms.uTime.value = t;
        floorMat.uniforms.uHue.value = st.domeHueShift;
        floorMat.uniforms.uSpd.value = st.domeSpeed;
        wallMat.uniforms.uTime.value = t;
        wallMat.uniforms.uHue.value = st.domeHueShift;
        wallMat.uniforms.uSpd.value = st.domeSpeed;
        // Stage GLB — update shader uniforms + rotation
        if (threeRef.current.stageMats) {
          threeRef.current.stageMats.forEach(m => {
            if (m.uniforms) { m.uniforms.uTime.value = t; m.uniforms.uHue.value = st.domeHueShift; m.uniforms.uSpd.value = st.domeSpeed; }
          });
        }
        if (threeRef.current.stageGroup) {
          const camAngle = Math.atan2(camera.position.x, camera.position.z);
          threeRef.current.stageGroup.rotation.y = camAngle + st.stageRotOffset;
          threeRef.current.stageGroup.scale.setScalar(st.stageScale);
        }
        // Toon shader time for emissive pulse
        if (threeRef.current.bodyMat) threeRef.current.bodyMat.uniforms.uTime.value = t;
        if (threeRef.current.armMat) threeRef.current.armMat.uniforms.uTime.value = t;
        if (threeRef.current.legMat) threeRef.current.legMat.uniforms.uTime.value = t;
        spotPink.intensity = 2.5 + Math.sin(t * 2) * 1;
        warm1.intensity = 1.2 + Math.sin(t * 0.7) * 0.5;
        warm2.intensity = 1 + Math.sin(t * 0.9 + 1) * 0.4;

        // ═══ 4-SIDED JUMBOTRON — fixed position, optional slow spin ═══
        if (threeRef.current.jmboGroup) {
          const T = threeRef.current;
          const jScale = st.jmboScale;
          // Auto-position: pin jumbotron top plate to viewport top (all frames, including intro)
          _pv1.set(0, 10, 0).project(camera);
          _pv2.set(0, 20, 0).project(camera);
          const ndcPerY = (_pv2.y - _pv1.y) / 10;
          const topNDC = isIPhone ? 0.83 : 1.0;
          const topVisY = 10 + (topNDC - _pv1.y) / ndcPerY;
          const jY = topVisY - JMBO_TOP_LOCAL * jScale;
          T.jmboGroup.position.y = jY;
          T.jmboGroup.scale.setScalar(jScale);
          // Optional slow spin
          if (st.jmboRotSpeed) {
            T.jmboGroup.rotation.y += st.jmboRotSpeed * dt;
          }
          // Update shader time on all faces (main + ribbons)
          T.jmboFaces.forEach(f => { f.mat.uniforms.uTime.value = t; });
          T.jmboBotFaces.forEach(f => { f.mat.uniforms.uTime.value = t; });
          T.jmboTopFaces.forEach(f => { f.mat.uniforms.uTime.value = t; });

          // Count down intro timer
          if (st.jmboIntroTimer > 0) st.jmboIntroTimer -= dt;
        }

        // ═══ MICROPHONE — hidden for now ═══
        if (threeRef.current.micGroup) {
          threeRef.current.micGroup.visible = false;
        }

        // ═══ DJ BOOTH — always on the table ═══
        if (threeRef.current.djBooth) {
          const djBooth = threeRef.current.djBooth;
          djBooth.visible = true;
          const camAngle = Math.atan2(camera.position.x, camera.position.z);
          djBooth.rotation.y = camAngle + st.djRotY;
          djBooth.position.set(
            Math.sin(camAngle) * st.djZ + Math.cos(camAngle) * st.djX,
            st.djY,
            Math.cos(camAngle) * st.djZ - Math.sin(camAngle) * st.djX
          );
          djBooth.scale.setScalar(st.djScale);
        }

        // ═══ DJ TABLE — butter slab, rotates with camera under DJ booth ═══
        if (threeRef.current.djTable) {
          const dtRef = threeRef.current.djTable;
          const camAngle = Math.atan2(camera.position.x, camera.position.z);
          const hw = st.dtW / 2, hd = st.dtD / 2, legH = st.dtY - 0.6;
          dtRef.mesh.scale.set(st.dtW, st.dtH, st.dtD);
          dtRef.mesh.position.set(0, st.dtY, st.dtZoff);
          // Corner posts — from stage floor up to table bottom
          const corners = [[-hw, -hd], [hw, -hd], [-hw, hd], [hw, hd]];
          dtRef.posts.forEach((p, i) => {
            p.scale.set(1, legH, 1);
            p.position.set(corners[i][0], st.dtY - st.dtH / 2 - legH / 2, st.dtZoff + corners[i][1]);
          });
          // Trim — thin outline on top edge
          dtRef.trimMesh.scale.set(st.dtW + 0.06, st.dtH * 0.3, st.dtD + 0.06);
          dtRef.trimMesh.position.set(0, st.dtY + st.dtH * 0.4, st.dtZoff);
          dtRef.group.rotation.y = camAngle;
          dtRef.group.position.set(
            Math.sin(camAngle) * st.djZ + Math.cos(camAngle) * st.djX,
            0,
            Math.cos(camAngle) * st.djZ - Math.sin(camAngle) * st.djX
          );
        }

        // ═══ LED SCREEN — behind DJ booth, facing audience ═══
        if (threeRef.current.ledScreen) {
          const led = threeRef.current.ledScreen;
          const camAngle = Math.atan2(camera.position.x, camera.position.z);
          // Place behind the DJ (opposite of camera direction from stage center)
          const ledR = st.djZ + st.tvZ;
          led.mesh.position.set(
            -Math.sin(camAngle) * ledR + Math.cos(camAngle) * st.djX,
            st.tvY,
            -Math.cos(camAngle) * ledR - Math.sin(camAngle) * st.djX
          );
          led.mesh.scale.setScalar(st.tvScale);
          // Face toward camera (audience) — plane normal is +Z, so camAngle faces it at camera
          led.mesh.rotation.y = camAngle;
          // TV shader runs on its own clock — fast, complementary hue to venue
          if (led.tvMat) { led.tvMat.uniforms.uTime.value = t; led.tvMat.uniforms.uHue.value = st.domeHueShift; }
        }

        // ═══ RENDER CANVASES AT 5FPS (3FPS mobile) — dot-product cull back-facing faces ═══
        if (threeRef.current.jmboGroup) {
          const T = threeRef.current;
          const jmboFPS = isMobile ? 3 : 5;
          if (Math.floor(t * jmboFPS) !== Math.floor((t - dt) * jmboFPS)) {
            const cd = chartDataRef.current;
            const si = speakerInfoRef.current;
            const activeCoin = selectedCoinRef.current || si?.coin;
            const vt = votesRef.current || { up: 0, down: 0 };

            // ═══ GOLDEN RATIO TYPE SCALE (φ = 1.618) ═══
            const φ = 1.618;
            const T_XS = 17;
            const T_S  = 27;
            const T_M  = 44;
            const T_L  = 72;
            const F_DISPLAY = "'Inter', sans-serif";
            const F_DATA = "'JetBrains Mono', monospace";

            // ── MARIO PARTY INTRO FACE — speaker CALLS $TOKEN splash ──
            function renderIntroFace(jx, W, H) {
              jx.clearRect(0, 0, W, H);
              const introT = st.jmboIntroTimer;
              const p = 1 - (introT / 6); // 0→1 over 6 seconds
              const cx = W / 2, cy = H * 0.38;

              // ── PHASE 0: Black void + radial burst ──
              jx.fillStyle = "#02000a"; jx.fillRect(0, 0, W, H);

              // Radial speed lines (zoom burst)
              if (p > 0.05) {
                const burstP = Math.min((p - 0.05) * 3, 1);
                for (let r = 0; r < 24; r++) {
                  const ang = (r / 24) * Math.PI * 2 + p * 1.5;
                  const inner = 60 + burstP * 40;
                  const outer = inner + 80 + burstP * W * 0.6;
                  jx.save(); jx.translate(cx, cy);
                  jx.rotate(ang);
                  const lg = jx.createLinearGradient(0, inner, 0, outer);
                  const c = r % 3 === 0 ? "255,45,120" : r % 3 === 1 ? "0,212,255" : "57,255,20";
                  lg.addColorStop(0, `rgba(${c},${0.15 * burstP})`);
                  lg.addColorStop(1, "rgba(0,0,0,0)");
                  jx.fillStyle = lg;
                  jx.fillRect(-2.5, inner, 5, outer - inner);
                  jx.restore();
                }
              }

              // Sweeping spotlight beams
              for (let b = 0; b < 4; b++) {
                const bAng = p * Math.PI * 3 + b * Math.PI / 2;
                const bx = cx + Math.cos(bAng) * W * 0.5;
                const by = cy + Math.sin(bAng) * H * 0.4;
                const bg = jx.createRadialGradient(cx, cy, 0, bx, by, W * 0.45);
                bg.addColorStop(0, b % 2 === 0 ? "rgba(255,45,120,0.12)" : "rgba(0,212,255,0.10)");
                bg.addColorStop(1, "rgba(0,0,0,0)");
                jx.fillStyle = bg; jx.fillRect(0, 0, W, H);
              }

              // ── PHASE 1 (0-0.3): PFP SLAMS in — fast scale + overshoot bounce ──
              const pfpImg = pfpImgsRef.current[st.jmboIntroCharIdx % pfpImgsRef.current.length];
              const maxPfp = 220;
              let pfpScale = 0;
              if (p < 0.15) pfpScale = 0;
              else if (p < 0.28) { const t2 = (p - 0.15) / 0.13; pfpScale = t2 < 0.6 ? t2 / 0.6 * 1.3 : 1.3 - (t2 - 0.6) / 0.4 * 0.3; }
              else pfpScale = 1;
              const pfpSz = maxPfp * pfpScale;

              if (pfpImg && pfpImg.naturalWidth && pfpSz > 5) {
                // Outer shockwave rings
                if (p > 0.2 && p < 0.6) {
                  const ringP = (p - 0.2) / 0.4;
                  for (let rr = 0; rr < 3; rr++) {
                    const rDelay = rr * 0.15;
                    const rP = Math.max(0, Math.min(1, (ringP - rDelay) * 2));
                    if (rP > 0) {
                      const rRad = pfpSz / 2 + 20 + rP * 180;
                      jx.beginPath(); jx.arc(cx, cy, rRad, 0, Math.PI * 2);
                      jx.strokeStyle = `rgba(255,45,120,${0.5 * (1 - rP)})`;
                      jx.lineWidth = 3 * (1 - rP); jx.stroke();
                    }
                  }
                }

                // Hot pink glow behind PFP
                const glowRad = pfpSz / 2 + 30;
                const gGrad = jx.createRadialGradient(cx, cy, pfpSz / 4, cx, cy, glowRad);
                gGrad.addColorStop(0, "rgba(255,45,120,0.35)");
                gGrad.addColorStop(0.6, "rgba(255,45,120,0.1)");
                gGrad.addColorStop(1, "rgba(0,0,0,0)");
                jx.fillStyle = gGrad; jx.beginPath(); jx.arc(cx, cy, glowRad, 0, Math.PI * 2); jx.fill();

                // Spinning ring
                jx.save(); jx.translate(cx, cy); jx.rotate(p * 6);
                jx.beginPath(); jx.arc(0, 0, pfpSz / 2 + 12, 0, Math.PI * 1.5);
                jx.strokeStyle = "#ff2d78"; jx.lineWidth = 4;
                jx.shadowColor = "#ff2d78"; jx.shadowBlur = 20; jx.stroke(); jx.shadowBlur = 0;
                jx.restore();

                // Static ring
                jx.beginPath(); jx.arc(cx, cy, pfpSz / 2 + 6, 0, Math.PI * 2);
                jx.strokeStyle = "rgba(0,212,255,0.5)"; jx.lineWidth = 2; jx.stroke();

                // PFP clipped to circle
                jx.save();
                jx.beginPath(); jx.arc(cx, cy, pfpSz / 2, 0, Math.PI * 2); jx.clip();
                jx.drawImage(pfpImg, cx - pfpSz / 2, cy - pfpSz / 2, pfpSz, pfpSz);
                jx.restore();
              }

              // ── PHASE 2 (0.3-0.55): NAME slams up from below ──
              if (p > 0.3) {
                const nameP = Math.min((p - 0.3) / 0.15, 1);
                const eased = nameP < 1 ? 1 - Math.pow(1 - nameP, 3) : 1; // ease-out cubic
                const slideUp = (1 - eased) * 80;
                const nameY = cy + maxPfp / 2 + 55 + slideUp;

                jx.globalAlpha = eased;
                jx.font = "bold 72px 'Inter', sans-serif";
                jx.fillStyle = "#fff"; jx.textAlign = "center";
                jx.shadowColor = "rgba(255,255,255,0.5)"; jx.shadowBlur = 16;
                jx.fillText(st.jmboIntroName, cx, nameY);
                jx.shadowBlur = 0;

                // ── PHASE 2b: "C A L L S" flies in ──
                if (p > 0.45) {
                  const callsP = Math.min((p - 0.45) / 0.1, 1);
                  jx.globalAlpha = callsP;
                  jx.font = "bold 36px 'Inter', sans-serif";
                  jx.fillStyle = "#ff2d78";
                  jx.shadowColor = "#ff2d78"; jx.shadowBlur = 12;
                  const spacing = 8 + (1 - callsP) * 20; // letters fly apart then tighten
                  jx.letterSpacing = spacing + "px";
                  jx.fillText("C A L L S", cx, nameY + 48);
                  jx.letterSpacing = "0px";
                  jx.shadowBlur = 0;
                }

                // ── PHASE 3 (0.55+): $TICKER — BIG, punchy, glowing green ──
                if (p > 0.55) {
                  const tickP = Math.min((p - 0.55) / 0.15, 1);
                  const tickEase = tickP < 1 ? 1 - Math.pow(1 - tickP, 3) : 1;
                  const tickScale = 0.5 + tickEase * 0.5;
                  const tickY = nameY + 110;

                  jx.globalAlpha = tickEase;
                  jx.save(); jx.translate(cx, tickY); jx.scale(tickScale, tickScale);
                  jx.font = "bold 120px 'Inter', sans-serif";
                  jx.fillStyle = "#00ff88";
                  jx.shadowColor = "#00ff88"; jx.shadowBlur = 40;
                  jx.fillText(st.jmboIntroTicker, 0, 0);
                  // Double glow
                  jx.shadowBlur = 80; jx.globalAlpha = tickEase * 0.3;
                  jx.fillText(st.jmboIntroTicker, 0, 0);
                  jx.shadowBlur = 0;
                  jx.restore();
                }
                jx.globalAlpha = 1;
              }

              // ── Scanlines overlay ──
              jx.fillStyle = "rgba(0,0,0,0.08)";
              for (let sl = 0; sl < H; sl += 4) { jx.fillRect(0, sl, W, 2); }

              // ── Sparkle particles (more + bigger) ──
              jx.textAlign = "left";
              if (p > 0.15) {
                for (let s = 0; s < 20; s++) {
                  const sx = (Math.sin(s * 2.1 + t * 3.5) * 0.5 + 0.5) * W;
                  const sy = (Math.cos(s * 1.7 + t * 3) * 0.5 + 0.5) * H;
                  const ss = 3 + Math.sin(t * 6 + s * 1.3) * 2;
                  jx.beginPath(); jx.arc(sx, sy, ss, 0, Math.PI * 2);
                  const sc = s % 3 === 0 ? "255,45,120" : s % 3 === 1 ? "0,255,136" : "0,212,255";
                  jx.fillStyle = `rgba(${sc},0.7)`;
                  jx.shadowColor = `rgba(${sc},0.8)`; jx.shadowBlur = 8;
                  jx.fill(); jx.shadowBlur = 0;
                }
              }

              // ── Edge vignette ──
              const vig = jx.createRadialGradient(cx, H / 2, H * 0.3, cx, H / 2, H * 0.8);
              vig.addColorStop(0, "rgba(0,0,0,0)"); vig.addColorStop(1, "rgba(2,0,10,0.6)");
              jx.fillStyle = vig; jx.fillRect(0, 0, W, H);
            }

            // ── renderMainFace — chart hero (shown after intro) ──
            function renderMainFace(jx, W, H) {
              jx.clearRect(0, 0, W, H);
              const bg = jx.createLinearGradient(0, 0, 0, H);
              bg.addColorStop(0, "#08041a"); bg.addColorStop(1, "#050210");
              jx.fillStyle = bg; jx.fillRect(0, 0, W, H);

              if (si) {
                // Banner background image (low opacity)
                const hdrImg = headerImgRef.current;
                if (hdrImg && hdrImg.naturalWidth) {
                  jx.save(); jx.globalAlpha = 0.15;
                  const scale = Math.max(W / hdrImg.naturalWidth, H / hdrImg.naturalHeight);
                  const dw = hdrImg.naturalWidth * scale, dh = hdrImg.naturalHeight * scale;
                  jx.drawImage(hdrImg, (W - dw) / 2, (H - dh) / 2, dw, dh);
                  jx.restore();
                }
                const ac2 = si.coin;
                const pos2 = ac2.positive;
                const priceColor = pos2 ? "#00ff88" : "#ff4444";
                const glowC = pos2 ? "rgba(0,255,136," : "rgba(255,68,68,";
                const pad = 30;

                // ── HEADER: $TICKER by caller @ mcap ──
                const hdrY = 50;
                let hx = pad;
                // Coin logo
                const coinImg2 = coinImgRef.current;
                const logoSz = 38;
                if (coinImg2 && coinImg2.naturalWidth) {
                  jx.save();
                  jx.beginPath(); jx.arc(hx + logoSz / 2, hdrY - logoSz * 0.25, logoSz / 2, 0, Math.PI * 2); jx.clip();
                  jx.drawImage(coinImg2, hx, hdrY - logoSz * 0.75, logoSz, logoSz);
                  jx.restore();
                  hx += logoSz + 8;
                }
                // $TICKER
                jx.font = `800 42px ${F_DISPLAY}`;
                jx.fillStyle = "#fff"; jx.textAlign = "left";
                jx.fillText(ac2.ticker, hx, hdrY);
                hx += jx.measureText(ac2.ticker).width + 10;
                // "by caller"
                jx.font = `500 20px ${F_DISPLAY}`;
                jx.fillStyle = "#555";
                jx.fillText("by", hx, hdrY);
                hx += jx.measureText("by").width + 6;
                jx.font = `bold 22px ${F_DISPLAY}`;
                jx.fillStyle = "#ff2d78";
                jx.fillText(si.name, hx, hdrY);
                hx += jx.measureText(si.name).width + 10;
                // "@ $43.7M"
                jx.font = `500 20px ${F_DATA}`;
                jx.fillStyle = "#555";
                jx.fillText("@ " + (ac2.mcap || "—"), hx, hdrY);

                // ── PRICE + CHANGE — big line below header ──
                const priceY = hdrY + 48;
                const rawP2 = parseFloat(ac2.price) || 0;
                const pFmt = fmtPrice(rawP2);
                jx.font = `bold 40px ${F_DATA}`;
                jx.fillStyle = "#fff"; jx.textAlign = "left";
                jx.fillText(pFmt, pad, priceY);
                const pW = jx.measureText(pFmt).width;
                jx.font = `bold 32px ${F_DATA}`;
                jx.fillStyle = priceColor;
                jx.shadowColor = priceColor; jx.shadowBlur = 8;
                jx.fillText(ac2.change || "+0.0%", pad + pW + 12, priceY);
                jx.shadowBlur = 0;

                // ── CHART with axes — stats row + pills below ──
                const headerH = priceY + 16;
                const axisR = 80, axisB = 36; // space for Y-axis RIGHT, X-axis bottom
                const statsRowH = 60; // space for LIQ/VOL/FDV/MC below chart
                const cx2 = pad, cy2 = headerH, cw2 = W - pad - axisR, ch2 = H - cy2 - axisB - statsRowH;
                const price = parseFloat(si.coin.price) || 0.001;

                if (cd && cd.length > 1) {
                  const minV = Math.min(...cd), maxV = Math.max(...cd), range = maxV - minV || 1;

                  // ── Y-axis: price labels (RIGHT side, like TradingView) ──
                  jx.font = "500 13px 'JetBrains Mono', monospace";
                  jx.fillStyle = "#444"; jx.textAlign = "left";
                  const yTicks = 5;
                  for (let yt = 0; yt <= yTicks; yt++) {
                    const frac = yt / yTicks;
                    const yPos = cy2 + ch2 - frac * ch2;
                    const priceAtY = price * (minV + frac * range) / cd[cd.length - 1];
                    jx.fillText("$" + priceAtY.toPrecision(3), cx2 + cw2 + 8, yPos + 4);
                    // Grid line
                    jx.strokeStyle = "rgba(255,255,255,0.04)"; jx.lineWidth = 1;
                    jx.beginPath(); jx.moveTo(cx2, yPos); jx.lineTo(cx2 + cw2, yPos); jx.stroke();
                  }

                  // ── X-axis: time labels ──
                  jx.textAlign = "center"; jx.fillStyle = "#444";
                  jx.font = "500 12px 'JetBrains Mono', monospace";
                  const tf = chartTFRef.current;
                  const xTicks = 5;
                  for (let xt = 0; xt <= xTicks; xt++) {
                    const frac = xt / xTicks;
                    const xPos = cx2 + frac * cw2;
                    // Time labels relative to now
                    const minsAgo = tf === "1h" ? Math.round((1 - frac) * 60) : tf === "5m" ? Math.round((1 - frac) * 5) : Math.round((1 - frac) * 1);
                    const label = minsAgo === 0 ? "now" : tf === "1h" ? minsAgo + "m" : minsAgo > 0 ? minsAgo * 60 + "s" : "now";
                    jx.fillText(label === "0s" ? "now" : label, xPos, cy2 + ch2 + 18);
                  }

                  // ── Chart area fill ──
                  jx.beginPath(); jx.moveTo(cx2, cy2 + ch2);
                  cd.forEach((v, i) => { jx.lineTo(cx2 + (i / (cd.length - 1)) * cw2, cy2 + ch2 - ((v - minV) / range) * ch2); });
                  jx.lineTo(cx2 + cw2, cy2 + ch2); jx.closePath();
                  const grd = jx.createLinearGradient(0, cy2, 0, cy2 + ch2);
                  grd.addColorStop(0, glowC + "0.3)"); grd.addColorStop(1, glowC + "0.0)");
                  jx.fillStyle = grd; jx.fill();

                  // ── Chart line ──
                  jx.beginPath();
                  cd.forEach((v, i) => {
                    const x2 = cx2 + (i / (cd.length - 1)) * cw2;
                    const y2 = cy2 + ch2 - ((v - minV) / range) * ch2;
                    i === 0 ? jx.moveTo(x2, y2) : jx.lineTo(x2, y2);
                  });
                  jx.strokeStyle = priceColor; jx.lineWidth = 4;
                  jx.shadowColor = priceColor; jx.shadowBlur = 16; jx.stroke(); jx.shadowBlur = 0;

                  // Current price dot
                  const lastX = cx2 + cw2;
                  const lastY = cy2 + ch2 - ((cd[cd.length - 1] - minV) / range) * ch2;
                  jx.beginPath(); jx.arc(lastX, lastY, 6, 0, Math.PI * 2);
                  jx.fillStyle = priceColor; jx.shadowColor = priceColor; jx.shadowBlur = 20; jx.fill(); jx.shadowBlur = 0;

                  // ── Current price horizontal dashed line ──
                  jx.setLineDash([4, 4]);
                  jx.strokeStyle = priceColor + "44"; jx.lineWidth = 1;
                  jx.beginPath(); jx.moveTo(cx2, lastY); jx.lineTo(cx2 + cw2, lastY); jx.stroke();
                  jx.setLineDash([]);
                }

                // ── LIQ · VOL · FDV · MC — stats bar below chart ──
                const ac = si.coin;
                const statsY = cy2 + ch2 + axisB + 8;
                const jStats = [
                  { label: "LIQ", val: ac.liq || "—", color: "#00d4ff" },
                  { label: "VOL", val: ac.vol || "—", color: "#b24dff" },
                  { label: "FDV", val: ac.fdv || ac.mcap || "—", color: "#fff" },
                  { label: "MC", val: ac.mcap || "—", color: "#fff" },
                ];
                const jStatW = (W - pad * 2) / jStats.length;
                jStats.forEach((s, i) => {
                  const sx = pad + i * jStatW;
                  jx.font = `600 18px ${F_DISPLAY}`;
                  jx.fillStyle = "rgba(255,255,255,0.3)"; jx.textAlign = "center";
                  jx.letterSpacing = "2px";
                  jx.fillText(s.label, sx + jStatW / 2, statsY);
                  jx.letterSpacing = "0px";
                  jx.font = `800 34px ${F_DATA}`;
                  jx.fillStyle = s.color;
                  jx.fillText(s.val, sx + jStatW / 2, statsY + 34);
                });
                jx.textAlign = "left";

                // ── %Change pills (bottom of chart area) ──
                const tf = chartTFRef.current;
                const pc = si.coin.priceChanges || { m5: 0, h1: 0, h6: 0, h24: 0 };
                const changePills = [
                  { label: "5M", val: pc.m5, chartTf: "1m" },
                  { label: "1H", val: pc.h1, chartTf: "5m" },
                  { label: "6H", val: pc.h6, chartTf: "1h" },
                  { label: "24H", val: pc.h24, chartTf: "1h" },
                ];
                const pillW = 80, pillH = 20, pillGap = 6;
                const totalPillW = (pillW + pillGap) * changePills.length - pillGap;
                const pillStartX = (W - totalPillW) / 2;
                const pillY = H - 30;
                changePills.forEach((p, pi) => {
                  const px = pillStartX + pi * (pillW + pillGap);
                  const isPos = p.val >= 0;
                  const active = p.chartTf === tf;
                  const valStr = `${isPos ? "+" : ""}${p.val.toFixed(1)}%`;
                  jx.fillStyle = active ? "rgba(255,45,120,0.2)" : "rgba(255,255,255,0.04)";
                  jx.beginPath(); jx.roundRect(px, pillY, pillW, pillH, 4); jx.fill();
                  if (active) { jx.strokeStyle = "#ff2d78"; jx.lineWidth = 1; jx.beginPath(); jx.roundRect(px, pillY, pillW, pillH, 4); jx.stroke(); }
                  jx.font = "bold 11px 'JetBrains Mono', monospace";
                  jx.fillStyle = isPos ? "#00ff88" : "#ff4444"; jx.textAlign = "center";
                  jx.fillText(`${p.label}: ${valStr}`, px + pillW / 2, pillY + 14);
                });
                jx.textAlign = "left";

              } else {
                // No active call — clean white logo on jumbotron
                jx.font = "400 72px 'Inter', sans-serif";
                jx.letterSpacing = "12px";
                jx.textAlign = "center";
                jx.shadowColor = "rgba(255,255,255,0.25)"; jx.shadowBlur = 20;
                jx.fillStyle = "#ffffff";
                jx.fillText("trench.fm", W / 2, H / 2 - 20);
                jx.shadowBlur = 0;
                jx.letterSpacing = "0px";
                jx.font = "300 18px 'Inter', sans-serif";
                jx.letterSpacing = "4px";
                jx.fillStyle = "rgba(255,255,255,0.3)";
                jx.fillText("step up to the mic", W / 2, H / 2 + 30);
                jx.letterSpacing = "0px";
                const earn = callerEarningsRef.current;
                const topCallers = Object.entries(earn).sort((a, b) => b[1] - a[1]).slice(0, 3);
                if (topCallers.length > 0) {
                  jx.font = "bold 16px 'Inter', sans-serif"; jx.fillStyle = "#444";
                  jx.fillText("TOP CALLERS", W / 2, H / 2 + 80);
                  topCallers.forEach(([name, amt], idx) => {
                    const medal = idx === 0 ? "1." : idx === 1 ? "2." : "3.";
                    jx.font = "500 18px 'Inter', sans-serif"; jx.fillStyle = "#888";
                    jx.fillText(medal + " " + name + " · $" + amt.toFixed(2), W / 2, H / 2 + 110 + idx * 30);
                  });
                }
                jx.font = "500 16px 'JetBrains Mono', monospace";
                jx.fillStyle = "#00ff88";
                jx.fillText("● " + (400 + Math.floor(Math.random() * 50)) + " watching", W / 2, H - 25);
                jx.textAlign = "left";
              }
            }

            // ── renderSideFace — "TOP CALLS TODAY" JUMBOTRON leaderboard ──
            function renderSideFace(jx, W, H) {
              jx.clearRect(0, 0, W, H);
              const bg2 = jx.createLinearGradient(0, 0, 0, H);
              bg2.addColorStop(0, "#0a041e"); bg2.addColorStop(1, "#060212");
              jx.fillStyle = bg2; jx.fillRect(0, 0, W, H);

              const calls = st.topCallsToday || [];
              const pad = 28;

              // Title — T_L hero
              jx.font = `bold ${T_L}px ${F_DISPLAY}`;
              jx.fillStyle = "#ff2d78"; jx.textAlign = "center";
              jx.shadowColor = "#ff2d78"; jx.shadowBlur = 20;
              jx.fillText("TOP CALLS TODAY", W / 2, T_L + 10);
              jx.shadowBlur = 0;

              // Divider
              jx.strokeStyle = "rgba(255,45,120,0.4)"; jx.lineWidth = 2;
              jx.beginPath(); jx.moveTo(pad, T_L + 28); jx.lineTo(W - pad, T_L + 28); jx.stroke();

              if (calls.length === 0) {
                jx.font = `500 ${T_M}px ${F_DISPLAY}`;
                jx.fillStyle = "#444"; jx.textAlign = "center";
                jx.fillText("Waiting for calls...", W / 2, H / 2);
                jx.font = `bold ${T_S}px ${F_DATA}`;
                jx.fillStyle = "#00ff88";
                jx.fillText("\u25CF LIVE", W / 2, H / 2 + T_M);
                jx.textAlign = "left";
                return;
              }

              const startY = T_L + 48;
              const rowH = (H - startY - 10) / 3;
              const medals = ["#FFD700", "#C0C0C0", "#CD7F32"];

              calls.forEach((call, idx) => {
                const rowY = startY + idx * rowH + rowH * 0.55;

                if (idx % 2 === 0) {
                  jx.fillStyle = "rgba(255,255,255,0.02)";
                  jx.fillRect(0, startY + idx * rowH, W, rowH);
                }

                jx.textAlign = "left";
                let lx = pad;

                // Rank — T_M body
                jx.font = `bold ${T_M}px ${F_DATA}`;
                jx.fillStyle = medals[idx] || "#888";
                jx.fillText((idx + 1) + ".", lx, rowY);
                lx += jx.measureText((idx + 1) + ".").width + 10;

                // $TICKER — T_L hero
                jx.font = `bold ${T_L}px ${F_DISPLAY}`;
                jx.fillStyle = "#fff";
                jx.fillText(call.ticker, lx, rowY);
                lx += jx.measureText(call.ticker).width + 12;

                // "by" — T_S metadata
                jx.font = `500 ${T_S}px ${F_DISPLAY}`;
                jx.fillStyle = "#666";
                jx.fillText("by", lx, rowY);
                lx += jx.measureText("by").width + 8;

                // Caller — T_M body
                jx.font = `bold ${T_M}px ${F_DISPLAY}`;
                jx.fillStyle = "#ff2d78";
                jx.fillText(call.caller, lx, rowY);
                lx += jx.measureText(call.caller).width + 10;

                // @ fdv · time — T_S metadata
                jx.font = `500 ${T_S}px ${F_DATA}`;
                jx.fillStyle = "#555";
                jx.fillText("@ " + call.fdv + " · " + call.timeAgo, lx, rowY);

                // Change — T_L hero, neon glow
                const isPos2 = call.change.startsWith("+");
                jx.font = `bold ${T_L}px ${F_DATA}`;
                jx.fillStyle = isPos2 ? "#00ff88" : "#ff4444";
                jx.shadowColor = isPos2 ? "#00ff88" : "#ff4444";
                jx.shadowBlur = 14; jx.textAlign = "right";
                jx.fillText(call.change, W - pad, rowY);
                jx.shadowBlur = 0;

                if (idx < calls.length - 1) {
                  jx.strokeStyle = "rgba(255,45,120,0.15)"; jx.lineWidth = 1;
                  jx.beginPath(); jx.moveTo(pad, startY + (idx + 1) * rowH); jx.lineTo(W - pad, startY + (idx + 1) * rowH); jx.stroke();
                }
              });
              jx.textAlign = "left";
            }

            // ── TRENCH.FM ARENA INTRO — shows during camera sweep ──
            function renderArenaIntro(jx, W, H) {
              jx.clearRect(0, 0, W, H);
              const ip = Math.min(st.introTimer / st.introDuration, 1);
              // Dark background
              jx.fillStyle = "#04010e"; jx.fillRect(0, 0, W, H);
              const cx = W / 2, cy = H * 0.42;
              // Warm theatrical glow — amber spotlight on dark stage
              const burstR = 80 + ip * W * 0.35;
              const rg = jx.createRadialGradient(cx, cy, 0, cx, cy, burstR);
              rg.addColorStop(0, `rgba(210,160,120,${0.12 + Math.sin(t * 2) * 0.04})`);
              rg.addColorStop(0.5, `rgba(180,130,100,${0.04 + Math.sin(t * 1.5) * 0.02})`);
              rg.addColorStop(1, "rgba(0,0,0,0)");
              jx.fillStyle = rg; jx.fillRect(0, 0, W, H);
              // Subtle radial rays — warm gold, not neon
              if (ip > 0.15) {
                for (let r = 0; r < 12; r++) {
                  const ang = (r / 12) * Math.PI * 2 + t * 0.3;
                  const inner = 60; const outer = inner + ip * W * 0.35;
                  jx.save(); jx.translate(cx, cy); jx.rotate(ang);
                  const lg = jx.createLinearGradient(0, inner, 0, outer);
                  lg.addColorStop(0, `rgba(196,168,142,${0.06 * ip})`);
                  lg.addColorStop(1, "rgba(0,0,0,0)");
                  jx.fillStyle = lg;
                  jx.fillRect(-1.5, inner, 3, outer - inner);
                  jx.restore();
                }
              }
              // "trench.fm" logo — rose gold gradient, scale up with bounce
              const logoScale = ip < 0.3 ? Math.pow(ip / 0.3, 0.5) * 1.1 : 1 + Math.sin((ip - 0.3) * 6) * 0.02 * (1 - ip);
              const fontSize = Math.floor(64 * logoScale);
              jx.save(); jx.globalAlpha = Math.min(ip * 3.5, 1);
              jx.font = `400 ${fontSize}px "Inter", sans-serif`;
              jx.letterSpacing = `${Math.floor(fontSize * 0.18)}px`;
              jx.textAlign = "center"; jx.textBaseline = "middle";
              // Clean white text on jumbotron
              jx.shadowColor = "rgba(255,255,255,0.3)"; jx.shadowBlur = 20;
              jx.fillStyle = "#ffffff"; jx.fillText("trench.fm", cx, cy);
              jx.shadowBlur = 0;
              // Hairline rule
              const ruleAlpha = Math.max(0, (ip - 0.25) * 3);
              if (ruleAlpha > 0) {
                jx.globalAlpha = Math.min(ruleAlpha, 0.35);
                const ruleGrad = jx.createLinearGradient(cx - 50, 0, cx + 50, 0);
                ruleGrad.addColorStop(0, "transparent");
                ruleGrad.addColorStop(0.3, "rgba(255,255,255,0.4)");
                ruleGrad.addColorStop(0.5, "rgba(255,255,255,0.6)");
                ruleGrad.addColorStop(0.7, "rgba(255,255,255,0.4)");
                ruleGrad.addColorStop(1, "transparent");
                jx.fillStyle = ruleGrad;
                jx.fillRect(cx - 50, cy + fontSize * 0.55, 100, 1);
              }
              // Subtitle
              const subAlpha = Math.max(0, (ip - 0.4) * 2.5);
              if (subAlpha > 0) {
                jx.globalAlpha = Math.min(subAlpha, 0.4);
                jx.font = `300 ${Math.floor(14 * logoScale)}px "Inter", sans-serif`;
                jx.letterSpacing = `${Math.floor(6)}px`;
                jx.fillStyle = "rgba(255,255,255,0.6)";
                jx.fillText("LIVE CRYPTO CALLS", cx, cy + fontSize * 0.8);
              }
              jx.letterSpacing = "0px";
              jx.restore();
            }

            // FRONT/BACK = chart, LEFT/RIGHT = leaderboard
            const showSpeakerIntro = st.jmboIntroTimer > 0;
            const showArenaIntro = st.introActive;
            [0, 1].forEach(i => {
              const f = T.jmboFaces[i];
              if (showArenaIntro) {
                renderArenaIntro(f.ctx, f.canvas.width, f.canvas.height);
              } else if (showSpeakerIntro) {
                renderIntroFace(f.ctx, f.canvas.width, f.canvas.height);
              } else {
                renderMainFace(f.ctx, f.canvas.width, f.canvas.height);
              }
              f.tex.needsUpdate = true;
            });
            [2, 3].forEach(i => {
              const f = T.jmboFaces[i];
              if (showArenaIntro) {
                renderArenaIntro(f.ctx, f.canvas.width, f.canvas.height);
              } else if (showSpeakerIntro) {
                renderIntroFace(f.ctx, f.canvas.width, f.canvas.height);
              } else {
                renderSideFace(f.ctx, f.canvas.width, f.canvas.height);
              }
              f.tex.needsUpdate = true;
            });

            // ── TOP RIBBON ──
            // ROW 1: [COIN LOGO 48px] $TICKER / SOL   on DEX_NAME
            // ROW 2: LIQ $X · VOL $X · FDV $X · MC $X
            function renderTopRibbon(jx, W, H) {
              jx.clearRect(0, 0, W, H);
              jx.fillStyle = "#06021a"; jx.fillRect(0, 0, W, H);
              const edgeG = jx.createLinearGradient(0, H - 6, 0, H);
              edgeG.addColorStop(0, "rgba(255,45,120,0)"); edgeG.addColorStop(1, "rgba(255,45,120,0.35)");
              jx.fillStyle = edgeG; jx.fillRect(0, H - 6, W, 6);

              const ac = activeCoin || si?.coin;
              if (si && ac) {
                const pad = 12;
                const iconSz = 48;
                const row1Y = H * 0.38;
                const row2Y = H * 0.88;

                // ── ROW 1: [LOGO] $TICKER / SOL   on DEX ──
                let lx = pad;
                const coinImg = coinImgRef.current;
                const cy1 = row1Y - iconSz * 0.25;
                if (coinImg && coinImg.naturalWidth) {
                  jx.save();
                  jx.beginPath(); jx.arc(lx + iconSz / 2, cy1, iconSz / 2, 0, Math.PI * 2); jx.clip();
                  jx.drawImage(coinImg, lx, cy1 - iconSz / 2, iconSz, iconSz);
                  jx.restore();
                  jx.strokeStyle = "rgba(255,255,255,0.15)"; jx.lineWidth = 2;
                  jx.beginPath(); jx.arc(lx + iconSz / 2, cy1, iconSz / 2 + 1, 0, Math.PI * 2); jx.stroke();
                } else {
                  jx.fillStyle = ac.positive ? "#00ff88" : "#ff4444";
                  jx.beginPath(); jx.arc(lx + iconSz / 2, cy1, iconSz / 2, 0, Math.PI * 2); jx.fill();
                  jx.font = `bold ${iconSz * 0.5 | 0}px ${F_DISPLAY}`;
                  jx.fillStyle = "#000"; jx.textAlign = "center";
                  jx.fillText(ac.ticker[1] || "?", lx + iconSz / 2, cy1 + iconSz * 0.15);
                  jx.textAlign = "left";
                }
                lx += iconSz + 10;
                // $TICKER — T_L hero
                jx.font = `800 ${T_L}px ${F_DISPLAY}`;
                jx.fillStyle = "#fff"; jx.textAlign = "left";
                jx.fillText(ac.ticker, lx, row1Y);
                lx += jx.measureText(ac.ticker).width + 6;
                // / SOL
                jx.font = `500 ${T_S}px ${F_DISPLAY}`;
                jx.fillStyle = "#555";
                jx.fillText("/ SOL", lx, row1Y);
                lx += jx.measureText("/ SOL").width + 14;
                // DEX badge — small rounded rect
                const dexName = (ac.dex && ac.dex !== "—") ? ac.dex.toUpperCase() : null;
                if (dexName && lx < W - 200) {
                  jx.font = `bold ${T_XS}px ${F_DATA}`;
                  const badgeW = jx.measureText(dexName).width + 16;
                  const badgeH = 24;
                  const badgeY = row1Y - badgeH + 4;
                  jx.fillStyle = "rgba(255,45,120,0.12)";
                  jx.beginPath(); jx.roundRect(lx, badgeY, badgeW, badgeH, 6); jx.fill();
                  jx.strokeStyle = "rgba(255,45,120,0.3)"; jx.lineWidth = 1;
                  jx.beginPath(); jx.roundRect(lx, badgeY, badgeW, badgeH, 6); jx.stroke();
                  jx.fillStyle = "#ff2d78"; jx.textAlign = "center";
                  jx.fillText(dexName, lx + badgeW / 2, badgeY + 16);
                  jx.textAlign = "left";
                }
                // ── Price + change — right-aligned on row 1 ──
                const rawPrice = parseFloat(ac.price) || 0;
                const priceFmt2 = fmtPrice(rawPrice);
                const chg = ac.change || "+0.0%";
                const chgP = ac.positive;
                jx.font = `bold ${T_M}px ${F_DATA}`;
                jx.fillStyle = chgP ? "#00ff88" : "#ff4444"; jx.textAlign = "right";
                jx.fillText(chg, W - pad, row1Y);
                const chgW = jx.measureText(chg).width;
                jx.font = `bold ${T_M}px ${F_DATA}`;
                jx.fillStyle = "#fff";
                jx.fillText(priceFmt2, W - pad - chgW - 10, row1Y);
                jx.textAlign = "left";

                // (stats moved to main face, below chart)
              } else {
                jx.font = `400 ${T_L}px "Inter", sans-serif`;
                jx.letterSpacing = "6px";
                jx.fillStyle = "#ffffff"; jx.textAlign = "center";
                jx.fillText("trench.fm", W / 2, H * 0.6);
                jx.letterSpacing = "0px"; jx.textAlign = "left";
              }
            }
            T.jmboTopFaces.forEach(f => {
              renderTopRibbon(f.ctx, f.canvas.width, f.canvas.height);
              f.tex.needsUpdate = true;
            });

            // ── BOTTOM RIBBON: caller info + timer (stats moved to top ribbon) ──
            function renderBotRibbon(jx, W, H, side) {
              jx.clearRect(0, 0, W, H);
              jx.fillStyle = "#04010e"; jx.fillRect(0, 0, W, H);
              const edgeGlow = jx.createLinearGradient(0, 0, 0, 6);
              edgeGlow.addColorStop(0, "rgba(255,45,120,0.35)"); edgeGlow.addColorStop(1, "rgba(255,45,120,0)");
              jx.fillStyle = edgeGlow; jx.fillRect(0, 0, W, 6);

              if (!si) {
                jx.font = `bold ${T_M}px ${F_DATA}`;
                jx.fillStyle = "#00ff88"; jx.textAlign = "center";
                jx.fillText("\u25CF " + (400 + Math.floor(Math.random() * 50)) + " watching", W / 2, H / 2 + 16);
                jx.textAlign = "left";
                return;
              }
              const pad = 24;
              const tx2 = si.txStats || {};
              const midY = H / 2 + 6;

              // ── Timer bar (shared all faces) ──
              const timeLeft = speakerTimeRef.current;
              const secs = Math.ceil(timeLeft);
              const timeStr = String(secs).padStart(2, "0");
              const clockColor = timeLeft > 15 ? "#ff2d78" : timeLeft > 7 ? "#ffa500" : "#ff4444";
              jx.fillStyle = "rgba(255,255,255,0.04)"; jx.fillRect(0, H - 6, W, 6);
              jx.fillStyle = clockColor; jx.fillRect(0, H - 6, W * (timeLeft / 45), 6);

              // ── Helper: draw caller PFP + name (T_S "by", T_M name) ──
              const drawCaller = (startX, y) => {
                let lx = startX;
                jx.font = `500 ${T_S}px ${F_DISPLAY}`;
                jx.fillStyle = "#666"; jx.textAlign = "left";
                jx.fillText("by", lx, y);
                lx += jx.measureText("by").width + 8;
                const callerPfpIdx = PFP_NAMES.indexOf(si.name);
                const callerPfpImg = callerPfpIdx >= 0 ? pfpImgsRef.current[callerPfpIdx % pfpImgsRef.current.length] : null;
                const cpSz = T_S;
                const cy2 = y - cpSz / 3;
                if (callerPfpImg && callerPfpImg.naturalWidth) {
                  jx.save();
                  jx.beginPath(); jx.arc(lx + cpSz / 2, cy2, cpSz / 2, 0, Math.PI * 2); jx.clip();
                  jx.drawImage(callerPfpImg, lx, cy2 - cpSz / 2, cpSz, cpSz);
                  jx.restore();
                  jx.strokeStyle = "#ff2d78"; jx.lineWidth = 2;
                  jx.beginPath(); jx.arc(lx + cpSz / 2, cy2, cpSz / 2 + 1, 0, Math.PI * 2); jx.stroke();
                  lx += cpSz + 7;
                } else {
                  jx.fillStyle = "#ff2d78";
                  jx.beginPath(); jx.arc(lx + cpSz / 2, cy2, cpSz / 2, 0, Math.PI * 2); jx.fill();
                  jx.font = `bold ${cpSz * 0.6 | 0}px ${F_DISPLAY}`;
                  jx.fillStyle = "#fff"; jx.textAlign = "center";
                  jx.fillText((si.name[0] || "?").toUpperCase(), lx + cpSz / 2, cy2 + cpSz * 0.18);
                  jx.textAlign = "left";
                  lx += cpSz + 7;
                }
                jx.font = `bold ${T_M}px ${F_DISPLAY}`;
                jx.fillStyle = "#ff2d78";
                jx.fillText(si.name, lx, y);
                return lx + jx.measureText(si.name).width;
              };

              // ── Helper: parseMcap ──
              const parseMc = (s) => { if (!s || s === "\u2014") return 0; const n = parseFloat(s.replace(/[$,]/g, "")); if (s.includes("B")) return n * 1e9; if (s.includes("M")) return n * 1e6; if (s.includes("K")) return n * 1e3; return n; };

              if (side === 0) {
                // ── FRONT: by [PFP] caller · @ $XM → ROI | timer | buys/sells ──
                const cy = midY - 6;
                let rx = drawCaller(pad, cy);
                rx += 12;
                const callMcStr = "@ " + (si.callMcap || si.coin.mcap || "?");
                jx.font = `500 ${T_S}px ${F_DATA}`;
                jx.fillStyle = "#666"; jx.textAlign = "left";
                jx.fillText(callMcStr, rx, cy);
                rx += jx.measureText(callMcStr).width + 12;
                // ROI
                const callVal = parseMc(si.callMcap);
                const curVal = parseMc(si.coin.mcap);
                if (callVal > 0 && curVal > 0) {
                  const roi = curVal / callVal;
                  const roiStr = roi >= 1 ? roi.toFixed(1) + "x" : (roi * 100).toFixed(0) + "%";
                  jx.font = `bold ${T_M}px ${F_DATA}`;
                  jx.fillStyle = roi >= 1 ? "#00ff88" : "#ff4444";
                  jx.shadowColor = roi >= 1 ? "#00ff88" : "#ff4444"; jx.shadowBlur = 6;
                  jx.fillText(roiStr, rx, cy);
                  jx.shadowBlur = 0;
                }
                // Timer right
                jx.font = `bold ${T_L}px ${F_DATA}`;
                jx.fillStyle = clockColor; jx.textAlign = "right";
                jx.shadowColor = clockColor; jx.shadowBlur = 12;
                jx.fillText(timeStr, W - pad, midY + 14);
                jx.shadowBlur = 0;
                // Buys/sells below
                const buys = tx2.buys || 0, sells = tx2.sells || 0;
                jx.font = `bold ${T_S}px ${F_DATA}`;
                jx.fillStyle = "#00ff88"; jx.textAlign = "left";
                jx.fillText("\u25B2" + buys, pad, midY + 38);
                jx.fillStyle = "#ff4444";
                jx.fillText("\u25BC" + sells, pad + 120, midY + 38);
                jx.textAlign = "left";

              } else if (side === 1) {
                // ── BACK: by [PFP] caller · "thesis..." | timer ──
                const cy = midY - 6;
                let rx = drawCaller(pad, cy);
                rx += 14;
                if (si.thesis) {
                  const thesis = si.thesis.length > 40 ? si.thesis.slice(0, 40) + "..." : si.thesis;
                  jx.font = `italic 500 ${T_S}px ${F_DISPLAY}`;
                  jx.fillStyle = "#888"; jx.textAlign = "left";
                  jx.fillText('"' + thesis + '"', rx, cy);
                }
                jx.font = `bold ${T_L}px ${F_DATA}`;
                jx.fillStyle = clockColor; jx.textAlign = "right";
                jx.shadowColor = clockColor; jx.shadowBlur = 12;
                jx.fillText(timeStr, W - pad, midY + 14);
                jx.shadowBlur = 0; jx.textAlign = "left";

              } else if (side === 2) {
                // ── LEFT: Vote bar + % BULLISH + earned | timer ──
                const totalV3 = vt.up + vt.down || 1;
                const upPct = vt.up / totalV3;
                const upP2 = ((upPct) * 100).toFixed(0);
                const barW3 = W - pad * 2 - 140;
                jx.font = `bold ${T_L}px ${F_DATA}`;
                jx.fillStyle = "#00ff88"; jx.textAlign = "left";
                jx.shadowColor = "#00ff88"; jx.shadowBlur = 8;
                jx.fillText("\u25B2" + vt.up, pad, midY - 4);
                jx.shadowBlur = 0;
                jx.fillStyle = "#fff"; jx.textAlign = "center";
                jx.font = `bold ${T_M}px ${F_DISPLAY}`;
                jx.fillText(upP2 + "% BULLISH", pad + barW3 / 2, midY - 4);
                jx.fillStyle = "#ff4444"; jx.textAlign = "right";
                jx.font = `bold ${T_L}px ${F_DATA}`;
                jx.shadowColor = "#ff4444"; jx.shadowBlur = 8;
                jx.fillText(vt.down + "\u25BC", pad + barW3, midY - 4);
                jx.shadowBlur = 0;
                const barH3 = 18, barY3 = midY + 20;
                jx.fillStyle = "#00ff88";
                jx.beginPath(); jx.roundRect(pad, barY3, barW3 * upPct - 2, barH3, 6); jx.fill();
                jx.fillStyle = "#ff4444";
                jx.beginPath(); jx.roundRect(pad + barW3 * upPct + 2, barY3, barW3 * (1 - upPct) - 2, barH3, 6); jx.fill();
                const earned = callerEarningsRef.current[si.name] || 0;
                if (earned > 0) {
                  jx.font = `bold ${T_M}px ${F_DATA}`;
                  jx.fillStyle = "#00ff88"; jx.textAlign = "left";
                  jx.fillText("earned $" + earned.toFixed(2), pad, barY3 + barH3 + 28);
                }
                jx.font = `bold ${T_L}px ${F_DATA}`;
                jx.fillStyle = clockColor; jx.textAlign = "right";
                jx.shadowColor = clockColor; jx.shadowBlur = 12;
                jx.fillText(timeStr, W - pad, midY + 22);
                jx.shadowBlur = 0; jx.textAlign = "left";

              } else {
                // ── RIGHT: TOP CALLS leaderboard | timer ──
                const calls = st.topCallsToday || [];
                if (calls.length > 0) {
                  jx.font = `bold ${T_S}px ${F_DISPLAY}`;
                  jx.fillStyle = "#ff2d78"; jx.textAlign = "left";
                  jx.fillText("TOP CALLS", pad, midY - 18);
                  calls.slice(0, 3).forEach((call, idx) => {
                    const ry = midY + 8 + idx * (T_M * 0.9);
                    const medals = ["#FFD700", "#C0C0C0", "#CD7F32"];
                    jx.font = `bold ${T_S}px ${F_DATA}`;
                    jx.fillStyle = medals[idx] || "#888"; jx.textAlign = "left";
                    jx.fillText((idx + 1) + ".", pad, ry);
                    jx.font = `bold ${T_M}px ${F_DISPLAY}`;
                    jx.fillStyle = "#fff";
                    jx.fillText(call.ticker + " " + (call.change || ""), pad + 40, ry);
                  });
                } else {
                  jx.font = `500 ${T_S}px ${F_DISPLAY}`;
                  jx.fillStyle = "#444"; jx.textAlign = "center";
                  jx.fillText("Waiting for calls...", W / 2, midY);
                }
                jx.font = `bold ${T_L}px ${F_DATA}`;
                jx.fillStyle = clockColor; jx.textAlign = "right";
                jx.shadowColor = clockColor; jx.shadowBlur = 12;
                jx.fillText(timeStr, W - pad, midY + 22);
                jx.shadowBlur = 0; jx.textAlign = "left";
              }
            }
            T.jmboBotFaces.forEach((f, i) => {
              renderBotRibbon(f.ctx, f.canvas.width, f.canvas.height, i);
              f.tex.needsUpdate = true;
            });

            // ── LED SCREEN — show intro overlay on top of shader, hide when idle ──
            if (threeRef.current.ledScreen) {
              const led = threeRef.current.ledScreen;
              if (showArenaIntro || showSpeakerIntro) {
                led.overlay.visible = true;
                const lx = led.ctx, LW = led.canvas.width, LH = led.canvas.height;
                if (showArenaIntro) {
                  renderArenaIntro(lx, LW, LH);
                } else {
                  renderIntroFace(lx, LW, LH);
                }
                led.tex.needsUpdate = true;
              } else {
                led.overlay.visible = false;
              }
            }
          }
        }

        // ═══ CONCERT LASERS — emanate from jumbotron structure ═══
        if (threeRef.current.lasers) {
          threeRef.current.lasers.forEach(l => {
            const sweep = Math.sin(t * l.speed + l.phase) * 0.6;
            const tilt = Math.cos(t * l.speed * 0.7 + l.phase * 2) * 0.3;
            l.mesh.rotation.x = -0.3 + sweep;
            l.mesh.rotation.z = tilt;
            l.mesh.material.opacity = 0.08 + Math.sin(t * 2 + l.phase) * 0.06;
          });
        }

        // sg no longer used — speaker is the same instanced crowd character scaled up

        // ═══ TELEPORT STATE MACHINE ═══
        if (st.teleportPhase !== "idle") {
          st.teleportTimer += dt;
          const tp = st.teleportTimer;
          const T = threeRef.current;

          if (st.teleportPhase === "beam_out") {
            // Beam at crowd position for 0.6s, then switch
            const ci = st.teleportCharIdx;
            const c = chars[ci];
            T.beam.position.set(c.homeX, 5.2, c.homeZ);
            T.beam.visible = true;
            T.beamMat.uniforms.uTime.value = t;
            T.beamMat.uniforms.uProgress.value = Math.min(tp / 0.3, 1);
            T.beamMat.uniforms.uColor.value.setHSL(c.hue / 360, 0.8, 0.6);
            // Burst ring
            T.burst.visible = true;
            T.burst.position.set(c.homeX, 0.05, c.homeZ);
            T.burstMat.opacity = Math.max(0, 1 - tp / 0.5) * 0.6;
            T.burst.scale.setScalar(1 + tp * 4);
            // Hide char
            c.visible = false;
            // Teleport particles fly up from position
            T.tpMat.opacity = Math.min(tp / 0.2, 1) * 0.8;
            const tpp = T.tpPos;
            for (let i = 0; i < tpp.length / 3; i++) {
              if (tp < 0.05) {
                const a = Math.random() * Math.PI * 2, r = Math.random() * 1;
                tpp[i * 3] = c.homeX + Math.cos(a) * r;
                tpp[i * 3 + 1] = Math.random() * 0.5;
                tpp[i * 3 + 2] = c.homeZ + Math.sin(a) * r;
                T.tpVel[i * 3] = (Math.random() - 0.5) * 2;
                T.tpVel[i * 3 + 1] = 3 + Math.random() * 5;
                T.tpVel[i * 3 + 2] = (Math.random() - 0.5) * 2;
              }
              tpp[i * 3] += T.tpVel[i * 3] * dt;
              tpp[i * 3 + 1] += T.tpVel[i * 3 + 1] * dt;
              tpp[i * 3 + 2] += T.tpVel[i * 3 + 2] * dt;
              T.tpVel[i * 3 + 1] -= 2 * dt; // gravity-ish
            }
            T.tpParts.geometry.attributes.position.needsUpdate = true;

            if (tp > 0.6) { st.teleportPhase = "beam_in"; st.teleportTimer = 0; T.beam.visible = false; T.burst.visible = false; }
          }

          if (st.teleportPhase === "beam_in") {
            const ci = st.teleportCharIdx;
            const c = chars[ci];
            // Beam at podium
            T.beam.position.set(0, 5.2, 0);
            T.beam.visible = true;
            T.beamMat.uniforms.uTime.value = t;
            T.beamMat.uniforms.uProgress.value = Math.min(tp / 0.3, 1);
            T.beamMat.uniforms.uColor.value.setHSL(c.hue / 360, 0.8, 0.6);
            // Burst at podium
            T.burst.visible = true;
            T.burst.position.set(0, 1.25, 0);
            T.burstMat.opacity = Math.min(tp / 0.15, 1) * 0.6;
            T.burst.scale.setScalar(1 + tp * 3);
            // Particles rain down onto podium
            T.tpMat.opacity = Math.max(0, 1 - tp / 0.5) * 0.8;
            const tpp = T.tpPos;
            for (let i = 0; i < tpp.length / 3; i++) {
              if (tp < 0.05) {
                const a = Math.random() * Math.PI * 2, r = Math.random() * 2;
                tpp[i * 3] = Math.cos(a) * r;
                tpp[i * 3 + 1] = 8 + Math.random() * 4;
                tpp[i * 3 + 2] = Math.sin(a) * r;
                T.tpVel[i * 3] = (Math.random() - 0.5) * 1;
                T.tpVel[i * 3 + 1] = -4 - Math.random() * 4;
                T.tpVel[i * 3 + 2] = (Math.random() - 0.5) * 1;
              }
              tpp[i * 3] += T.tpVel[i * 3] * dt;
              tpp[i * 3 + 1] += T.tpVel[i * 3 + 1] * dt;
              tpp[i * 3 + 2] += T.tpVel[i * 3 + 2] * dt;
            }
            T.tpParts.geometry.attributes.position.needsUpdate = true;

            // Speaker appears on stage via instanced mesh (crowd loop handles scale-up)
            // No separate sg group needed — the crowd character IS the speaker at 1.8x

            if (tp > 0.7) {
              st.teleportPhase = "active"; st.teleportTimer = 0;
              st.speaker = ci;
              T.beam.visible = false; T.burst.visible = false;
              T.tpMat.opacity = 0;
              setTeleportVFX(null);
            }
          }
        }

        // Ambient particles (throttled to 30fps — imperceptible for slow-floating particles)
        if (Math.floor(t * 30) !== Math.floor((t - dt) * 30)) {
        const pp = ppGeo.attributes.position.array;
        for (let i = 0; i < pp.length / 3; i++) {
          ppLife[i] += dt * 0.12;
          if (ppLife[i] > 1) { ppLife[i] = 0; const a = Math.random() * Math.PI * 2, r = 1 + Math.random() * 8; pp[i * 3] = Math.cos(a) * r; pp[i * 3 + 1] = 0.5; pp[i * 3 + 2] = Math.sin(a) * r; }
          const ang = Math.atan2(pp[i * 3 + 2], pp[i * 3]) + dt * (0.2 + Math.sin(i * 0.05 + t * 0.5) * 0.1);
          const rad = Math.sqrt(pp[i * 3] * pp[i * 3] + pp[i * 3 + 2] * pp[i * 3 + 2]);
          pp[i * 3] = Math.cos(ang) * rad; pp[i * 3 + 1] += dt * (0.6 + Math.sin(i * 0.08 + t) * 0.4); pp[i * 3 + 2] = Math.sin(ang) * rad;
        }
        ppGeo.attributes.position.needsUpdate = true;
        const pp2 = pp2Geo.attributes.position.array;
        for (let i = 0; i < pp2.length / 3; i++) {
          pp2Life[i] += dt * 0.08;
          if (pp2Life[i] > 1) { pp2Life[i] = 0; const a = Math.random() * Math.PI * 2, r = 3 + Math.random() * 15; pp2[i * 3] = Math.cos(a) * r; pp2[i * 3 + 1] = Math.random() * 2; pp2[i * 3 + 2] = Math.sin(a) * r; }
          pp2[i * 3 + 1] += dt * 0.3;
          const a = Math.atan2(pp2[i * 3 + 2], pp2[i * 3]) - dt * 0.08;
          const r = Math.sqrt(pp2[i * 3] * pp2[i * 3] + pp2[i * 3 + 2] * pp2[i * 3 + 2]);
          pp2[i * 3] = Math.cos(a) * r; pp2[i * 3 + 2] = Math.sin(a) * r;
        }
        pp2Geo.attributes.position.needsUpdate = true;
        } // end 30fps particle gate

        // Crowd — Nintendo physics (squash & stretch, head lag, arm follow-through, mini-jumps)
        // Pre-compute billboard quaternion once from camera (crowd reuses, speaker gets per-position lookAt)
        camDir.set(camera.position.x, 0, camera.position.z).normalize();
        headLookMat.lookAt(camDir, _origin, _up);
        crowdBillboardQ.setFromRotationMatrix(headLookMat);
        for (let i = 0; i < count; i++) {
          const c = chars[i];

          // ── Is this character the active speaker on stage?
          const isOnStage = (st.speaker === i && st.teleportPhase === "active") ||
            (st.teleportCharIdx === i && st.teleportPhase === "beam_in" && st.teleportTimer > 0.25);

          // ── Position & scale — speaker is centered on stage, scale from stateRef
          const spkScale = st.speakerScale || 1.8;
          let cx, cz, sv;
          if (isOnStage) {
            cx = st.speakerX || 0; cz = st.speakerZ || 0;
            if (st.teleportPhase === "beam_in") {
              const s = Math.min((st.teleportTimer - 0.25) / 0.3, 1);
              sv = 0.001 + s * (spkScale - 0.001);
            } else {
              sv = spkScale;
            }
          } else {
            const hide = !c.visible;
            sv = hide ? 0.001 : 1;
            cx = c.homeX; cz = c.homeZ;
          }

          // ── Gravity bob — fast drop, floaty rise (Mario landing feel)
          const rawBob = Math.sin(t * c.bobSpeed + c.bobOffset);
          const bob = rawBob >= 0
            ? Math.pow(rawBob, 0.7) * (isOnStage ? 0.04 : 0.07)
            : -Math.pow(-rawBob, 1.4) * (isOnStage ? 0.02 : 0.05);

          // ── Squash & stretch
          const bobVel = Math.cos(t * c.bobSpeed + c.bobOffset) * c.bobSpeed;
          const stretch = 1 + bobVel * 0.01;
          const squish = 1 / Math.sqrt(Math.max(stretch, 0.5));

          // ── Wave & jump (crowd only — speaker stands still on stage)
          let jumpH = 0, jumpStr = 1, jumping = false;
          if (!isOnStage) {
            const charAngle = Math.atan2(c.homeX, c.homeZ);
            const wavePos = (t * 1.2) % (Math.PI * 2);
            const waveDist = Math.abs(((charAngle - wavePos + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
            const waveH = waveDist < 0.6 ? Math.sin((1 - waveDist / 0.6) * Math.PI) * 0.35 : 0;
            const jt = Math.sin(t * 0.17 + i * 2.39) * Math.sin(t * 0.29 + i * 1.73);
            jumping = jt > 0.92;
            jumpH = (jumping ? Math.sin((jt - 0.92) / 0.08 * Math.PI) * 0.25 : 0) + waveH;
            jumpStr = jumping || waveH > 0.1 ? 1.12 : 1;
          }

          // ── Head bob & tilt
          const headBob = Math.sin(t * c.bobSpeed + c.bobOffset - 0.25) * (isOnStage ? 0.04 : 0.08);
          const headTilt = Math.sin(t * c.bobSpeed * 0.4 + c.armPhase) * 0.06;

          // ── Arms — speaker gets expressive gesture, crowd gets pendulum
          let armL, armR;
          if (isOnStage) {
            armL = Math.PI / 4 + Math.sin(t * 2.5) * 0.35;
            armR = -Math.PI / 4 + Math.sin(t * 2.5 + 1.2) * 0.35;
          } else {
            const a1 = Math.sin(t * c.bobSpeed * 0.7 + c.armPhase);
            const a2 = Math.sin(t * c.bobSpeed * 1.4 + c.armPhase) * 0.25;
            const arm = (a1 + a2) * 0.2;
            const jArm = jumping ? -0.6 : 0;
            armL = 0.15 + arm + jArm;
            armR = -0.15 - arm - jArm;
          }

          // ── Legs — speaker has subtle weight shift, crowd walks
          const legSwing = isOnStage
            ? Math.sin(t * 0.5) * 0.03
            : Math.sin(t * c.bobSpeed * 0.35 + c.armPhase) * 0.12;

          // ── Scale factor for speaker: positions scale proportionally
          const pScale = isOnStage ? sv : 1;
          const stageY = isOnStage ? (st.speakerY || 1.2) : 0;

          // ── Torso (speaker faces camera, crowd stays neutral)
          sc.set(squish * sv, stretch * jumpStr * sv, squish * sv);
          pos.set(cx, (0.70 + bob + jumpH) * pScale + stageY, cz);
          if (isOnStage) {
            const faceAngle = Math.atan2(camera.position.x - cx, camera.position.z - cz);
            bodyFaceQ.setFromAxisAngle(yAxis, faceAngle);
            dm.compose(pos, bodyFaceQ, sc);
          } else {
            dm.compose(pos, idQ, sc);
          }
          bodies.setMatrixAt(i, dm);

          // ── Head — billboard toward camera + gentle tilt
          sc.set(sv, sv, sv);
          const headBaseY = isOnStage ? 1.24 : 1.32; // stage head slightly lower to not float
          pos.set(cx + headTilt * 0.12 * pScale, (headBaseY + headBob + jumpH) * pScale + stageY, cz);
          if (isOnStage) {
            // Speaker gets precise per-position lookAt
            camDir.set(camera.position.x - pos.x, 0, camera.position.z - pos.z).normalize();
            headLookMat.lookAt(camDir, _origin, _up);
            headLookQ.setFromRotationMatrix(headLookMat);
          } else {
            // Crowd reuses pre-computed billboard quaternion
            headLookQ.copy(crowdBillboardQ);
          }
          const tiltQ = q.setFromAxisAngle(zAxis, headTilt * 0.5);
          headLookQ.multiply(tiltQ);
          dm.compose(pos, headLookQ, sc); heads.setMatrixAt(i, dm);
          pfps.setMatrixAt(i, dm);

          // ── Track speaker head world pos for speech bubble
          if (isOnStage) {
            stateRef.current._speakerHeadY = pos.y;
            stateRef.current._speakerHeadX = pos.x;
            stateRef.current._speakerHeadZ = pos.z;
          }

          // ── Arms (speaker: rotate with body facing camera)
          sc.set(squish * sv, stretch * sv, squish * sv);
          if (isOnStage) {
            const fAngle = Math.atan2(camera.position.x - cx, camera.position.z - cz);
            // Left arm — offset to the left of the camera-facing direction
            const sinF = Math.sin(fAngle), cosF = Math.cos(fAngle);
            const armDist = 0.20 * pScale;
            pos.set(cx + cosF * armDist, (0.85 + bob) * pScale + stageY, cz - sinF * armDist);
            bodyArmQ.setFromAxisAngle(yAxis, fAngle);
            q.setFromAxisAngle(zAxis, armL);
            bodyArmQ.multiply(q);
            dm.compose(pos, bodyArmQ, sc); aL.setMatrixAt(i, dm);
            // Right arm
            pos.set(cx - cosF * armDist, (0.85 + bob) * pScale + stageY, cz + sinF * armDist);
            bodyArmQ.setFromAxisAngle(yAxis, fAngle);
            q.setFromAxisAngle(zAxis, armR);
            bodyArmQ.multiply(q);
            dm.compose(pos, bodyArmQ, sc); aR.setMatrixAt(i, dm);
          } else {
            pos.set(cx - 0.20 * pScale, (0.85 + bob + jumpH) * pScale + stageY, cz);
            q.setFromAxisAngle(zAxis, armL);
            dm.compose(pos, q, sc); aL.setMatrixAt(i, dm);
            pos.set(cx + 0.20 * pScale, (0.85 + bob + jumpH) * pScale + stageY, cz);
            q.setFromAxisAngle(zAxis, armR);
            dm.compose(pos, q, sc); aR.setMatrixAt(i, dm);
          }

          // ── Legs (speaker: rotate with body facing camera)
          const jLeg = jumping ? 0.4 : 0;
          sc.set(sv, sv * (jumping ? 0.85 : 1), sv);
          if (isOnStage) {
            const fAngle = Math.atan2(camera.position.x - cx, camera.position.z - cz);
            const sinF = Math.sin(fAngle), cosF = Math.cos(fAngle);
            const legDist = 0.07 * pScale;
            pos.set(cx + cosF * legDist, (0.21) * pScale + stageY, cz - sinF * legDist);
            bodyArmQ.setFromAxisAngle(yAxis, fAngle);
            q.setFromAxisAngle(xAxis, legSwing);
            bodyArmQ.multiply(q);
            dm.compose(pos, bodyArmQ, sc); lL.setMatrixAt(i, dm);
            pos.set(cx - cosF * legDist, (0.21) * pScale + stageY, cz + sinF * legDist);
            bodyArmQ.setFromAxisAngle(yAxis, fAngle);
            q.setFromAxisAngle(xAxis, -legSwing);
            bodyArmQ.multiply(q);
            dm.compose(pos, bodyArmQ, sc); lR.setMatrixAt(i, dm);
          } else {
            pos.set(cx - 0.07 * pScale, (0.21 + jumpH * 0.3) * pScale + stageY, cz);
            q.setFromAxisAngle(xAxis, legSwing + jLeg);
            dm.compose(pos, q, sc); lL.setMatrixAt(i, dm);
            pos.set(cx + 0.07 * pScale, (0.21 + jumpH * 0.3) * pScale + stageY, cz);
            q.setFromAxisAngle(xAxis, -legSwing - jLeg);
            dm.compose(pos, q, sc); lR.setMatrixAt(i, dm);
          }
        }
        bodies.instanceMatrix.needsUpdate = true; heads.instanceMatrix.needsUpdate = true;
        aL.instanceMatrix.needsUpdate = true; aR.instanceMatrix.needsUpdate = true;
        lL.instanceMatrix.needsUpdate = true; lR.instanceMatrix.needsUpdate = true;

        // ═══ CROWD EMOTES — green/red pips above heads based on mood ═══
        if (threeRef.current.emoteUpMeshes) {
          const eUp = threeRef.current.emoteUpMeshes;
          const eDown = threeRef.current.emoteDownMeshes;
          for (let i = 0; i < count; i++) {
            const c = st.chars[i];
            if (!c.visible || c.emoteTimer <= 0) {
              sc.set(0, 0, 0); dm.compose(pos, idQ, sc);
              eUp.setMatrixAt(i, dm); eDown.setMatrixAt(i, dm);
              continue;
            }
            c.emoteTimer -= dt;
            const life = c.emoteTimer;
            // Pop up + float + fade: scale in fast, float up, shrink out
            const prog = 1 - (life / 1.5); // 0→1 over lifespan
            const popScale = prog < 0.15 ? prog / 0.15 : prog > 0.7 ? (1 - prog) / 0.3 : 1;
            const floatY = prog * 0.6; // drift upward
            const sz = popScale * 0.8;
            pos.set(c.homeX, 1.8 + floatY, c.homeZ);
            sc.set(sz, sz, sz);
            dm.compose(pos, crowdBillboardQ, sc);
            if (c.emoteType === "up") {
              eUp.setMatrixAt(i, dm);
              sc.set(0, 0, 0); dm.compose(pos, idQ, sc); eDown.setMatrixAt(i, dm);
            } else {
              eDown.setMatrixAt(i, dm);
              sc.set(0, 0, 0); dm.compose(pos, idQ, sc); eUp.setMatrixAt(i, dm);
            }
          }
          eUp.instanceMatrix.needsUpdate = true;
          eDown.instanceMatrix.needsUpdate = true;
        }

        // ═══ THROWABLES — gravity arcs from crowd → speaker ═══
        if (threeRef.current.tomatoMeshes) {
          const throws = throwablesRef.current;
          const splats = splatsRef.current;
          let tIdx = 0, dIdx = 0;
          for (let i = throws.length - 1; i >= 0; i--) {
            const tr = throws[i];
            tr.life += dt;
            if (tr.life >= tr.maxLife) {
              // Tomato splat! Juicy burst of particles on impact
              if (tr.type === "tomato") {
                for (let s = 0; s < 12; s++) {
                  if (splats.length >= MAX_SPLATS) splats.shift();
                  const sp = 1.5 + Math.random() * 4;
                  const ang = Math.random() * Math.PI * 2;
                  const elev = (Math.random() - 0.3) * Math.PI * 0.5;
                  splats.push({
                    pos: [tr.pos[0], tr.pos[1], tr.pos[2]],
                    vel: [Math.cos(ang) * Math.cos(elev) * sp, Math.sin(elev) * sp + 2 + Math.random() * 3, Math.sin(ang) * Math.cos(elev) * sp],
                    life: 0, maxLife: 0.5 + Math.random() * 0.4,
                    scale: 0.8 + Math.random() * 2.5,
                  });
                }
              }
              throws.splice(i, 1); continue;
            }
            tr.pos[0] += tr.vel[0] * dt;
            tr.pos[1] += tr.vel[1] * dt;
            tr.pos[2] += tr.vel[2] * dt;
            tr.vel[1] -= 9.8 * dt;
            const lr = tr.life / tr.maxLife;
            const s = lr < 0.1 ? lr / 0.1 : lr > 0.85 ? (1 - lr) / 0.15 : 1;
            pos.set(tr.pos[0], tr.pos[1], tr.pos[2]);
            sc.set(s, s, s);
            if (tr.type === "tomato" && tr.spin && tIdx < MAX_THROWABLES) {
              // Tumbling spin
              const spinAng = tr.life * tr.spin;
              const ax = tr.spinAxis;
              const axLen = Math.sqrt(ax[0]*ax[0]+ax[1]*ax[1]+ax[2]*ax[2]) || 1;
              q.setFromAxisAngle(xAxis.set(ax[0]/axLen,ax[1]/axLen,ax[2]/axLen), spinAng);
              dm.compose(pos, q, sc);
              threeRef.current.tomatoMeshes.setMatrixAt(tIdx++, dm);
            } else if (tr.type === "tomato" && tIdx < MAX_THROWABLES) {
              dm.compose(pos, idQ, sc);
              threeRef.current.tomatoMeshes.setMatrixAt(tIdx++, dm);
            } else if (tr.type === "diamond" && tr.spin && dIdx < MAX_THROWABLES) {
              const spinAng = tr.life * tr.spin;
              const ax = tr.spinAxis;
              const axLen = Math.sqrt(ax[0]*ax[0]+ax[1]*ax[1]+ax[2]*ax[2]) || 1;
              q.setFromAxisAngle(xAxis.set(ax[0]/axLen,ax[1]/axLen,ax[2]/axLen), spinAng);
              dm.compose(pos, q, sc);
              threeRef.current.diamondMeshes.setMatrixAt(dIdx++, dm);
            } else if (tr.type === "diamond" && dIdx < MAX_THROWABLES) {
              dm.compose(pos, idQ, sc);
              threeRef.current.diamondMeshes.setMatrixAt(dIdx++, dm);
            }
          }
          sc.set(0, 0, 0); dm.compose(pos, idQ, sc);
          for (let i = tIdx; i < MAX_THROWABLES; i++) threeRef.current.tomatoMeshes.setMatrixAt(i, dm);
          for (let i = dIdx; i < MAX_THROWABLES; i++) threeRef.current.diamondMeshes.setMatrixAt(i, dm);
          threeRef.current.tomatoMeshes.instanceMatrix.needsUpdate = true;
          threeRef.current.diamondMeshes.instanceMatrix.needsUpdate = true;

          // ═══ SPLAT PARTICLES — tomato juice flying outward ═══
          let sIdx = 0;
          for (let i = splats.length - 1; i >= 0; i--) {
            const sp = splats[i];
            sp.life += dt;
            if (sp.life >= sp.maxLife) { splats.splice(i, 1); continue; }
            sp.pos[0] += sp.vel[0] * dt;
            sp.pos[1] += sp.vel[1] * dt;
            sp.pos[2] += sp.vel[2] * dt;
            sp.vel[1] -= 12 * dt; // heavy drip gravity
            const lr = sp.life / sp.maxLife;
            const fade = lr < 0.1 ? lr / 0.1 : 1 - (lr - 0.1) / 0.9; // quick in, slow fade
            const sz = sp.scale * fade;
            if (sIdx < MAX_SPLATS) {
              pos.set(sp.pos[0], sp.pos[1], sp.pos[2]);
              sc.set(sz, sz, sz);
              dm.compose(pos, idQ, sc);
              threeRef.current.splatMeshes.setMatrixAt(sIdx++, dm);
            }
          }
          sc.set(0, 0, 0); dm.compose(pos, idQ, sc);
          for (let i = sIdx; i < MAX_SPLATS; i++) threeRef.current.splatMeshes.setMatrixAt(i, dm);
          threeRef.current.splatMeshes.instanceMatrix.needsUpdate = true;
        }

        renderer.render(scene, camera);

        // Project speaker head to screen for speech bubble (throttled to 10fps)
        const hasSpeaker = st.speaker !== null && st.teleportPhase === "active";
        if (hasSpeaker && Math.floor(t * 10) !== Math.floor((t - dt) * 10)) {
          _headWorld.set(
            st._speakerHeadX || 0,
            (st._speakerHeadY || 3) + 1.0, // above the scaled-up head
            st._speakerHeadZ || 0
          );
          _headWorld.project(camera);
          const hw = renderer.domElement.clientWidth;
          const hh = renderer.domElement.clientHeight;
          const sx = (_headWorld.x * 0.5 + 0.5) * hw;
          const sy = (-_headWorld.y * 0.5 + 0.5) * hh;
          setSpeakerScreenPos({ x: sx, y: sy });
        } else if (!hasSpeaker) {
          setSpeakerScreenPos(null);
        }
      }
      renderer.compile(scene, camera);
      animate();

      const onR = () => { const nw = container.clientWidth, nh = container.clientHeight; camera.aspect = nw / nh; camera.updateProjectionMatrix(); renderer.setSize(nw, nh); };
      window.addEventListener("resize", onR);
      return () => window.removeEventListener("resize", onR);
    }
    const cleanupResize = init();
    return () => { cleanupResize?.(); if (frameRef.current) cancelAnimationFrame(frameRef.current); if (rendererRef.current?.domElement && container.contains(rendererRef.current.domElement)) { container.removeChild(rendererRef.current.domElement); rendererRef.current.dispose(); } };
  }, []);

  // ═══ STEP UP (from +CA in console) ═══
  const handleCallCoin = useCallback(async () => {
    const st = stateRef.current;
    const query = stepUpCA.trim();
    if (!query) return;
    const matchedCoin = (
      stepUpCoinPreview?.ca?.toLowerCase() === query.toLowerCase()
        ? rememberCoin(stepUpCoinPreview)
        : await resolveCoin(query)
    );

    if (!matchedCoin) {
      setChatMessages((prev) => [...prev, { user: "trench.fm", msg: `Could not find a Solana token for "${query}" yet.` }]);
      return;
    }

    // Auto-generate thesis
    const thesis = `${matchedCoin.ticker} is looking strong. ${matchedCoin.mcap} mcap, ${matchedCoin.change} today. Loading up.`;

    // ── Anti-spam checks ──
    const now = Date.now();
    if (sessionCallCount >= MAX_CALLS_PER_SESSION) {
      setChatMessages(p => [...p, { user: "trench.fm", msg: `Session call limit reached (${MAX_CALLS_PER_SESSION}). Take a breather.` }]);
      return;
    }
    const recentCalls = callHistory.slice(-5);
    const avgRoses = recentCalls.length > 0 ? recentCalls.reduce((s, c) => s + (c.roses / Math.max(1, c.roses + c.tomatoes)), 0) / recentCalls.length : 1;
    const effectiveCooldown = avgRoses < 0.3 ? CALL_COOLDOWN_MS * 2 : CALL_COOLDOWN_MS;
    if (lastCallTime > 0 && now - lastCallTime < effectiveCooldown) {
      const remaining = Math.ceil((effectiveCooldown - (now - lastCallTime)) / 1000);
      setChatMessages(p => [...p, { user: "trench.fm", msg: `Cooldown: wait ${remaining}s before your next call.` }]);
      return;
    }

    // If speaker active, join queue
    if (st.speaker !== null && st.teleportPhase === "active") {
      const name = viewerName;
      setQueue(q => [...q, { name, coin: matchedCoin, thesis }]);
      setChatMessages(p => [...p, { user: "trench.fm", msg: `🎤 ${name} joined the queue (${queue.length + 1} waiting)` }]);
      setShowCallInput(false);
      setStepUpCA("");
      setStepUpCoinPreview(null);
      return;
    }

    if (st.teleportPhase !== "idle" && st.teleportPhase !== "active") return;

    if (st.speaker !== null) chars_ref_restore(st);

    const idx = Math.floor(Math.random() * st.chars.length);
    const c = st.chars[idx];
    st.teleportCharIdx = idx;
    st.teleportPhase = "beam_out";
    st.teleportTimer = 0;
    setTeleportVFX("out");

    const txStats = { buys: Math.floor(80 + Math.random() * 200), sells: Math.floor(30 + Math.random() * 120), buyVol: (Math.random() * 80 + 10).toFixed(1), sellVol: (Math.random() * 50 + 5).toFixed(1), holders: Math.floor(500 + Math.random() * 3000), topHolding: (15 + Math.random() * 20).toFixed(1) };
    const followers = ["12.5K", "45.2K", "127K", "892K", "33.1K", "8.4K"][Math.floor(Math.random() * 6)];
    const speakerName = viewerName === "you" ? c.name : viewerName;
    setSpeakerInfo({ name: speakerName, coin: matchedCoin, idx, thesis, txStats, followers, callMcap: matchedCoin.mcap });
    setCallHistory(prev => [...prev, { caller: speakerName, coinCA: matchedCoin.ca, ticker: matchedCoin.ticker, callMcap: matchedCoin.mcap, callPrice: matchedCoin.price, callTimestamp: Date.now(), thesis, currentMcap: matchedCoin.mcap, roi: 1, roses: 0, tomatoes: 0 }]);
    setLastCallTime(Date.now());
    setSessionCallCount(c => c + 1);
    setCardExpanded(false);
    { const tfd = generateAllTimeframes(matchedCoin.positive); chartTFDataRef.current = tfd; setChartData(tfd[chartTFRef.current]); loadRealChart(matchedCoin); }
    setVotes({ up: Math.floor(Math.random() * 20) + 5, down: Math.floor(Math.random() * 5) });
    setUserVoted(null);
    setShowCallInput(false);
    setStepUpCA("");
    setStepUpCoinPreview(null);
    st.jmboIntroTimer = 6.0;
    st.jmboIntroName = speakerName;
    st.jmboIntroTicker = matchedCoin.ticker;
    st.jmboIntroCharIdx = idx;

    setChatMessages(p => [...p, { user: "trench.fm", msg: `⚡ ${speakerName} is teleporting to the stage...` }]);
    setTimeout(() => setChatMessages(p => [...p, { user: speakerName, msg: `Calling ${matchedCoin.ticker} — ${matchedCoin.mcap} mcap, ${matchedCoin.change}. LFG.` }]), 1500);
  }, [queue.length, rememberCoin, resolveCoin, stepUpCA, stepUpCoinPreview, viewerName]);

  function chars_ref_restore(st) {
    if (st.speaker !== null) {
      st.chars[st.speaker].visible = true;
      st.speaker = null;
    }
  }

  const handleVote = useCallback((d) => {
    if (userVoted) return;
    // Check inventory
    const hasAmmo = d === "up" ? throwInv.roses > 0 : throwInv.tomatoes > 0;
    if (!hasAmmo) return;
    setUserVoted(d);
    setVotes(p => ({ up: p.up + (d === "up" ? 1 : 0), down: p.down + (d === "down" ? 1 : 0) }));
    // Consume from inventory
    setThrowInv(p => ({
      ...p,
      roses: d === "up" ? p.roses - 1 : p.roses,
      tomatoes: d === "down" ? p.tomatoes - 1 : p.tomatoes,
    }));
    // Track score for current token
    const ca = speakerInfo?.coin?.ca;
    if (ca) {
      setTokenScores(p => {
        const cur = p[ca] || { roses: 0, tomatoes: 0 };
        return { ...p, [ca]: { roses: cur.roses + (d === "up" ? 1 : 0), tomatoes: cur.tomatoes + (d === "down" ? 1 : 0) } };
      });
    }
    // Your vote launches a burst of 3 throwables
    spawnThrow(d === "up" ? "diamond" : "tomato", 3);
  }, [userVoted, spawnThrow, throwInv, speakerInfo]);
  const handleSend = useCallback(() => {
    if (!chatInput.trim()) return;
    setChatMessages(p => [...p, { user: viewerName, msg: chatInput.trim() }]);
    setChatInput("");
    // Keep keyboard open — re-focus input after send
    setTimeout(() => chatInputRef.current?.focus(), 10);
  }, [chatInput, viewerName]);

  // ═══ VOICE NOTES — iPhone/Signal hold-to-record ═══
  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus") ? "audio/webm;codecs=opus" : "audio/webm";
      const recorder = new MediaRecorder(stream, { mimeType });
      audioChunksRef.current = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      recorder.onstop = () => {
        stream.getTracks().forEach(t => t.stop());
        const dur = (Date.now() - recordingStartRef.current) / 1000;
        const blob = new Blob(audioChunksRef.current, { type: mimeType });
        if (blob.size > 0 && dur >= 0.5) {
          const url = URL.createObjectURL(blob);
          setChatMessages(p => [...p, { user: viewerName, msg: "Voice note", voiceNote: { url, duration: dur } }]);
        }
        setIsRecording(false);
        setRecordingDuration(0);
      };
      mediaRecorderRef.current = recorder;
      recordingStartRef.current = Date.now();
      recorder.start();
      setIsRecording(true);
      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration((Date.now() - recordingStartRef.current) / 1000);
      }, 100);
    } catch (e) {
      console.warn("[voice] mic access denied:", e.message);
      setIsRecording(false);
    }
  }, [viewerName]);

  const stopRecording = useCallback(() => {
    if (recordingTimerRef.current) { clearInterval(recordingTimerRef.current); recordingTimerRef.current = null; }
    if (mediaRecorderRef.current?.state === "recording") mediaRecorderRef.current.stop();
  }, []);

  const handleMicDown = useCallback((e) => {
    e.preventDefault();
    micHoldTimerRef.current = setTimeout(() => {
      micHoldTimerRef.current = "recording";
      startRecording();
    }, 300);
  }, [startRecording]);

  const handleMicUp = useCallback(() => {
    if (micHoldTimerRef.current === "recording" || isRecording) {
      stopRecording();
    } else {
      if (micHoldTimerRef.current) clearTimeout(micHoldTimerRef.current);
      // Short tap — no action (hold to record)
    }
    micHoldTimerRef.current = null;
  }, [isRecording, stopRecording]);

  const playVoiceNote = useCallback((url) => {
    if (voiceAudioRef.current) { voiceAudioRef.current.pause(); voiceAudioRef.current = null; }
    if (playingVoiceNote === url) { setPlayingVoiceNote(null); return; }
    const audio = new Audio(url);
    audio.onended = () => { setPlayingVoiceNote(null); voiceAudioRef.current = null; };
    voiceAudioRef.current = audio;
    setPlayingVoiceNote(url);
    audio.play();
  }, [playingVoiceNote]);

  const handleQuickBuy = useCallback(async (usd) => {
    const coin = rememberCoin(selectedCoin || (speakerInfo && speakerInfo.coin));
    if (!coin) return;
    const solAmt = usdToSol(usd, solPrice);
    if (solAmt > walletBalance) {
      setMiniOpen(true);
      setMiniTab("fund");
      setChatMessages(p => [...p, { user: "trench.fm", msg: `Need ${(solAmt - walletBalance).toFixed(4)} more SOL to buy $${usd} of ${coin.ticker}` }]);
      return;
    }

    // Optimistic UI — close tooltip, show pending
    setShowBuySheet(false);
    setQuickBuyUSD(null);
    setSelectedCoin(null);
    setTradeStatus("pending");
    setChatMessages(p => [...p, { user: "trench.fm", msg: `⚡ Swapping $${usd} → ${coin.ticker}...` }]);

    try {
      const result = await executeTrade({
        tokenMint: coin.ca,
        side: "BUY",
        uiInputAmount: solAmt.toFixed(9),
        slippageBasisPoint: 500,
        confirmationMode: "ASYNC",
      });

      // Track signature for WebSocket confirmation
      setLastTxSig(result.signature);
      pendingSigRef.current = result.signature;

      // Optimistic balance deduction (WebSocket will correct)
      setWalletBalance(prev => Math.max(0, prev - solAmt));

      // Update local state
      const entryPrice = parseFloat(coin.price);
      const callerName = speakerInfo?.name || "direct";
      const callerFee = usd * FEE_CALLER;
      setCallerEarnings(prev => ({ ...prev, [callerName]: (prev[callerName] || 0) + callerFee }));
      setPlatformRevenue(prev => prev + usd * FEE_PLATFORM);
      setCallVolume(prev => prev + usd);
      setUserPositions((prev) => {
        const existing = prev.find((position) => position.mint === coin.ca);
        const previousCost = existing?.notionalUsd || 0;
        const nextCost = previousCost + usd;
        const nextEntry = nextCost > 0
          ? (((existing?.entry || entryPrice) * previousCost) + (entryPrice * usd)) / nextCost
          : entryPrice;
        const nextPosition = {
          mint: coin.ca,
          coin: coin.ticker,
          name: coin.name || existing?.name || coin.ticker,
          imageUrl: coin.imageUrl || existing?.imageUrl || null,
          amount: (existing?.amount || 0) + solAmt,
          notionalUsd: nextCost,
          entry: nextEntry,
          current: entryPrice,
          caller: callerName,
          txSig: result.signature,
          tokenAmount: existing?.tokenAmount || null,
          status: "pending",
        };

        if (!existing) return [...prev, nextPosition];
        return prev.map((position) => (
          position.mint === coin.ca ? nextPosition : position
        ));
      });
      const displayName = privacyMode ? "anon" : viewerName;
      setActivityFeed(p => [...p, { user: displayName, action: "bought", amount: `$${usd}`, coin: coin.ticker }]);
      setChatMessages(p => [...p, { user: "trench.fm", msg: `⚡ Sent! ${coin.ticker} buy tx: ${result.signature.slice(0, 8)}...` }]);

      buyFlashRef.current = performance.now() / 1000;
      const emojis = ["💰", "🤑", "💵", "🚀", "⚡", "💎", "🔥"];
      const burst = Array.from({ length: 8 }, (_, i) => ({
        id: Date.now() + i, emoji: emojis[Math.floor(Math.random() * emojis.length)],
        x: 30 + Math.random() * (window.innerWidth - 100),
        delay: Math.random() * 0.4, speed: 2 + Math.random() * 2.5, size: 16 + Math.random() * 12,
      }));
      setFloatingEmojis(prev => [...prev, ...burst]);
      setTimeout(() => setFloatingEmojis(prev => prev.filter(e => !burst.includes(e))), 4000);

      // If WebSocket doesn't confirm in 15s, refresh balance manually
      setTimeout(async () => {
        if (pendingSigRef.current === result.signature) {
          pendingSigRef.current = null;
          setTradeStatus("confirmed");
          setTimeout(() => setTradeStatus(null), 3000);
          setUserPositions((prev) => prev.map((position) => (
            position.txSig === result.signature
              ? { ...position, status: "confirmed" }
              : position
          )));
          try {
            const w = await getWalletBalance();
            setWalletBalance(w.sol);
          } catch (error) {
            console.debug("[frontrun] balance refresh skipped:", error.message);
          }
        }
      }, 15000);

    } catch (e) {
      console.error("[frontrun] buy failed:", e);
      setTradeStatus("error");
      setChatMessages(p => [...p, { user: "trench.fm", msg: `Trade failed: ${e.message}` }]);
      // Restore balance on failure
      setWalletBalance(prev => prev + solAmt);
      setTimeout(() => setTradeStatus(null), 4000);
    }
  }, [privacyMode, rememberCoin, selectedCoin, solPrice, speakerInfo, viewerName, walletBalance]);

  const handleSell = useCallback(async (tokenMint) => {
    const pos = positionsRef.current.find((position) => position.mint === tokenMint);
    if (!pos) return;

    setTradeStatus("pending");
    setChatMessages(p => [...p, { user: "trench.fm", msg: `⚡ Selling 100% of ${pos.coin}...` }]);

    try {
      const result = await executeTrade({
        tokenMint,
        side: "SELL",
        sellPercent: 100,
        slippageBasisPoint: 500,
        confirmationMode: "ASYNC",
      });

      pendingSigRef.current = result.signature;
      setLastTxSig(result.signature);

      const pnl = pos.entry > 0 ? ((pos.current - pos.entry) / pos.entry) * 100 : 0;
      setUserPositions(p => p.filter(pp => pp.mint !== tokenMint));
      setActivityFeed(p => [...p, { user: privacyMode ? "anon" : viewerName, action: pnl >= 0 ? "up" : "sold", amount: `${pnl >= 0 ? "+" : ""}${pnl.toFixed(0)}%`, coin: pos.coin }]);
      setChatMessages(p => [...p, { user: "trench.fm", msg: `💰 Sold ${pos.coin} tx: ${result.signature.slice(0, 8)}...` }]);

      // Refresh balance after a delay (WebSocket or fallback)
      setTimeout(async () => {
        if (pendingSigRef.current === result.signature) {
          pendingSigRef.current = null;
          setTradeStatus("confirmed");
          setTimeout(() => setTradeStatus(null), 3000);
        }
        try {
          const w = await getWalletBalance();
          setWalletBalance(w.sol);
        } catch (error) {
          console.debug("[frontrun] balance refresh skipped:", error.message);
        }
      }, 10000);

    } catch (e) {
      console.error("[frontrun] sell failed:", e);
      setTradeStatus("error");
      setChatMessages(p => [...p, { user: "trench.fm", msg: `Sell failed: ${e.message}` }]);
      setTimeout(() => setTradeStatus(null), 4000);
    }
  }, [privacyMode, viewerName]);

  useEffect(() => {
    if (userPositions.length === 0) return;
    let dead = false;

    const refreshPrices = async () => {
      const heldMints = [...new Set(positionsRef.current.map((position) => position.mint).filter(Boolean))];
      if (heldMints.length === 0) return;

      const refreshedCoins = await Promise.all(heldMints.map(async (mint) => {
        try {
          const liveCoin = await lookupToken(mint);
          return liveCoin ? rememberCoin(liveCoin) : null;
        } catch (error) {
          console.debug("[token] position refresh skipped:", error.message);
          return null;
        }
      }));

      if (dead) return;

      const latestByMint = new Map(
        refreshedCoins
          .filter(Boolean)
          .map((coin) => [coin.ca, coin])
      );

      if (latestByMint.size === 0) return;

      setUserPositions((prev) => prev.map((position) => {
        const latest = latestByMint.get(position.mint);
        if (!latest) return position;

        const nextPrice = Number.parseFloat(latest.price);
        return {
          ...position,
          coin: latest.ticker || position.coin,
          name: latest.name || position.name,
          imageUrl: latest.imageUrl || position.imageUrl || null,
          current: Number.isFinite(nextPrice) ? nextPrice : position.current,
        };
      }));
    };

    refreshPrices();
    const intervalId = setInterval(refreshPrices, 30_000);

    return () => {
      dead = true;
      clearInterval(intervalId);
    };
  }, [rememberCoin, userPositions.length]);

  // ═══ PHYSICS SPIN — flick to spin with momentum + friction ═══
  const onDragStart = useCallback((x, y, e) => {
    if (e?.target?.closest?.("[data-ui]")) return;
    const tr = touchRef.current;
    tr.active = true; tr.startX = x; tr.startY = y;
    tr.lastX = x; tr.lastY = y; tr.lastTime = performance.now();
    tr.sa = stateRef.current.cameraAngle; tr.sh = stateRef.current.cameraHeight;
    tr.velX = 0; tr.velY = 0;
    stateRef.current.autoRotate = false;
    stateRef.current.spinVelocity = 0;
    // Skip intro on any touch — user wants in NOW
    if (stateRef.current.introActive) {
      stateRef.current.introActive = false;
      stateRef.current.cameraHeight = stateRef.current.introEndHeight;
      stateRef.current.cameraDist = stateRef.current.introEndDist;
    }
  }, []);
  const onDragMove = useCallback((x, y, e) => {
    const tr = touchRef.current;
    if (!tr.active) return;
    if (e?.target?.closest?.("[data-ui]")) return;
    const now = performance.now();
    const dt = Math.max(now - tr.lastTime, 1);
    const dx = x - tr.lastX;
    const dy = y - tr.lastY;
    // Smooth velocity tracking (weighted average)
    tr.velX = tr.velX * 0.4 + (dx / dt) * 0.6;
    tr.velY = tr.velY * 0.4 + (dy / dt) * 0.6;
    tr.lastX = x; tr.lastY = y; tr.lastTime = now;
    stateRef.current.cameraAngle = tr.sa - (x - tr.startX) * 0.006;
    stateRef.current.cameraHeight = Math.max(3.5, Math.min(6, tr.sh + (y - tr.startY) * 0.015));
  }, []);
  const onDragEnd = useCallback(() => {
    const tr = touchRef.current;
    tr.active = false;
    // Launch spin with flick velocity — capped for zen feel
    const rawSpin = -tr.velX * 0.004;
    stateRef.current.spinVelocity = Math.max(-0.04, Math.min(0.04, rawSpin));
    // Auto-rotate resumes once momentum dies
  }, []);
  // Touch events
  const onTS = useCallback((e) => { const t = e.touches[0]; onDragStart(t.clientX, t.clientY, e); }, [onDragStart]);
  const onTM = useCallback((e) => { const t = e.touches[0]; onDragMove(t.clientX, t.clientY, e); }, [onDragMove]);
  const onTE = useCallback(() => { onDragEnd(); }, [onDragEnd]);
  // Mouse events (desktop drag to spin)
  const onMD = useCallback((e) => { onDragStart(e.clientX, e.clientY, e); }, [onDragStart]);
  const onMM = useCallback((e) => { onDragMove(e.clientX, e.clientY, e); }, [onDragMove]);
  const onMU = useCallback(() => { onDragEnd(); }, [onDragEnd]);

  const vr = votes.up + votes.down > 0 ? (votes.up / (votes.up + votes.down)) * 100 : 50;

  return (
    <div style={{ width: "100%", height: "100vh", background: "#0a0008", position: "relative", overflow: "hidden", fontFamily: "'Segoe UI',system-ui,sans-serif", maxWidth: 430, margin: "0 auto" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500;600;700&display=swap');
        @import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap');
        @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}
        @keyframes blink{0%,100%{opacity:1}50%{opacity:0}}
        @keyframes slideIn{from{transform:translateY(8px);opacity:0}to{transform:translateY(0);opacity:1}}
        @keyframes gentleBounce{0%,100%{transform:translateY(0)}50%{transform:translateY(2px)}}
        @keyframes chartIn{from{transform:scaleX(0);opacity:0}to{transform:scaleX(1);opacity:1}}
        @keyframes ticker{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}
        @keyframes modalUp{from{transform:translateY(100%)}to{transform:translateY(0)}}
        @keyframes floatUp{0%{transform:translateY(0) scale(1);opacity:1}100%{transform:translateY(-300px) scale(1.5);opacity:0}}
        @keyframes copyFlash{0%{background:rgba(0,255,136,0.2)}100%{background:transparent}}
        @keyframes liveDot{0%,100%{box-shadow:0 0 0 0 rgba(0,255,136,0.5)}50%{box-shadow:0 0 0 4px rgba(0,255,136,0)}}
        @keyframes marqueeLight{0%,75%{background-position:200% 50%}100%{background-position:-100% 50%}}
        @keyframes announceOverlay{0%{opacity:0}8%{opacity:1}75%{opacity:1}100%{opacity:0}}
        @keyframes announceLine{0%{width:0}15%{width:100%}75%{width:100%}100%{width:0}}
        @keyframes announceLabel{0%{opacity:0;transform:translateY(10px)}10%{opacity:1;transform:translateY(0)}75%{opacity:1;transform:translateY(0)}90%{opacity:0;transform:translateY(-5px)}}
        *::-webkit-scrollbar{display:none}
        @keyframes announceName{0%{opacity:0;transform:scale(1.4) translateY(8px);filter:blur(8px)}12%{opacity:1;transform:scale(1) translateY(0);filter:blur(0)}75%{opacity:1;transform:scale(1);filter:blur(0)}90%{opacity:0;transform:scale(0.95) translateY(-3px);filter:blur(4px)}}
        @keyframes announceSub{0%{opacity:0;transform:translateY(12px)}15%{opacity:0;transform:translateY(12px)}25%{opacity:1;transform:translateY(0)}75%{opacity:1;transform:translateY(0)}90%{opacity:0}}
        @keyframes announceGlow{0%{opacity:0;transform:scale(0.5)}15%{opacity:0.6;transform:scale(1)}50%{opacity:0.3;transform:scale(1.2)}100%{opacity:0;transform:scale(1.5)}}
        @keyframes announcePulse{0%,100%{opacity:0.4}50%{opacity:1}}
        @keyframes chatBubbleUp{0%{opacity:0;transform:translateX(-12px)}6%{opacity:1;transform:translateX(0)}78%{opacity:0.9;transform:translateX(0)}100%{opacity:0;transform:translateX(4px)}}
        @keyframes neonPulse{0%,100%{box-shadow:0 0 8px rgba(255,45,120,0.3),inset 0 0 8px rgba(255,45,120,0.05)}50%{box-shadow:0 0 16px rgba(255,45,120,0.5),inset 0 0 12px rgba(255,45,120,0.08)}}
        @keyframes inputGlow{0%,100%{border-color:rgba(255,45,120,0.3);box-shadow:0 0 6px rgba(255,45,120,0.15)}50%{border-color:rgba(255,45,120,0.6);box-shadow:0 0 12px rgba(255,45,120,0.3)}}
        @keyframes buyGlow{0%,100%{box-shadow:0 0 8px rgba(0,255,136,0.3)}50%{box-shadow:0 0 20px rgba(0,255,136,0.5)}}
        @keyframes micGlow{0%,100%{box-shadow:0 0 8px rgba(255,45,120,0.3)}50%{box-shadow:0 0 20px rgba(255,45,120,0.5)}}
        @keyframes chatSlideIn{from{transform:translateX(-16px);opacity:0}to{transform:translateX(0);opacity:1}}
        @keyframes chartShimmer{0%{transform:translateX(-100%)}100%{transform:translateX(100%)}}
        @keyframes consoleUp{from{transform:translateY(100%);opacity:0.8}to{transform:translateY(0);opacity:1}}
        @keyframes tabSlide{from{opacity:0;transform:translateX(8px)}to{opacity:1;transform:translateX(0)}}
        @keyframes consoleGlow{0%,100%{box-shadow:0 0 8px rgba(0,212,255,0.3)}50%{box-shadow:0 0 20px rgba(0,212,255,0.5)}}
        @keyframes consoleHello{
          0%{opacity:0;transform:translateY(80px) scale(0.7) rotate(2deg);filter:blur(6px)}
          25%{opacity:0.6;transform:translateY(-8px) scale(1.02) rotate(-0.5deg);filter:blur(0)}
          42%{opacity:0.9;transform:translateY(4px) scale(0.99) rotate(0.3deg);filter:blur(0)}
          58%{opacity:1;transform:translateY(-2px) scale(1.005) rotate(0deg);filter:blur(0)}
          72%{transform:translateY(1px) scale(1) rotate(0deg)}
          100%{opacity:1;transform:translateY(0) scale(1) rotate(0deg);filter:blur(0)}
        }
        @keyframes consoleShimmer{
          0%{background-position:-200% 0}
          100%{background-position:200% 0}
        }
        @keyframes chatHello{
          0%{opacity:0;transform:translateX(-40px) scale(0.9)}
          40%{opacity:0.8;transform:translateX(4px) scale(1.01)}
          70%{opacity:1;transform:translateX(-1px) scale(1)}
          100%{opacity:1;transform:translateX(0) scale(1)}
        }
        @keyframes curtainSwayL{
          0%{transform:translateX(0) scaleX(1)}
          12%{transform:translateX(1.8%) scaleX(1.008)}
          28%{transform:translateX(-0.6%) scaleX(0.997)}
          42%{transform:translateX(1.2%) scaleX(1.004)}
          58%{transform:translateX(-0.9%) scaleX(0.998)}
          72%{transform:translateX(1.5%) scaleX(1.006)}
          88%{transform:translateX(-0.4%) scaleX(0.999)}
          100%{transform:translateX(0) scaleX(1)}
        }
        @keyframes curtainSwayR{
          0%{transform:translateX(0) scaleX(1)}
          15%{transform:translateX(-1.6%) scaleX(1.007)}
          32%{transform:translateX(0.7%) scaleX(0.998)}
          48%{transform:translateX(-1.3%) scaleX(1.005)}
          62%{transform:translateX(0.5%) scaleX(0.997)}
          78%{transform:translateX(-1.0%) scaleX(1.003)}
          92%{transform:translateX(0.3%) scaleX(0.999)}
          100%{transform:translateX(0) scaleX(1)}
        }
        @keyframes foldShimmerL{0%{background-position:0% 0%}30%{background-position:1% 5%}60%{background-position:-0.5% 2%}100%{background-position:0% 0%}}
        @keyframes foldShimmerR{0%{background-position:0% 0%}35%{background-position:-1% 3%}70%{background-position:0.5% 6%}100%{background-position:0% 0%}}
        @keyframes curtainGlowPulse{0%,100%{opacity:0.3;box-shadow:0 0 40px rgba(255,45,120,0.2),0 0 80px rgba(0,212,255,0.12)}50%{opacity:0.6;box-shadow:0 0 60px rgba(255,45,120,0.4),0 0 100px rgba(0,212,255,0.22)}}
        @keyframes curtainFadeUI{0%{opacity:1}100%{opacity:0;pointer-events:none}}
        @keyframes curtainEnterPulse{0%,100%{box-shadow:0 0 12px rgba(255,45,120,0.4),inset 0 0 8px rgba(255,45,120,0.1)}50%{box-shadow:0 0 24px rgba(255,45,120,0.6),inset 0 0 12px rgba(255,45,120,0.15)}}
        @keyframes curtainOpenL{
          0%{transform:translateX(0) scaleX(1)}
          4%{transform:translateX(1.2%) scaleX(1.02)}
          10%{transform:translateX(0.5%) scaleX(1.01)}
          18%{transform:translateX(-8%) scaleX(0.99)}
          35%{transform:translateX(-45%) scaleX(0.97)}
          55%{transform:translateX(-82%) scaleX(0.98)}
          72%{transform:translateX(-100%) scaleX(0.995)}
          85%{transform:translateX(-103%) scaleX(1.003)}
          93%{transform:translateX(-104.5%) scaleX(1)}
          100%{transform:translateX(-105%) scaleX(1)}
        }
        @keyframes curtainOpenR{
          0%{transform:translateX(0) scaleX(1)}
          4%{transform:translateX(-1.2%) scaleX(1.02)}
          10%{transform:translateX(-0.5%) scaleX(1.01)}
          18%{transform:translateX(8%) scaleX(0.99)}
          35%{transform:translateX(45%) scaleX(0.97)}
          55%{transform:translateX(82%) scaleX(0.98)}
          72%{transform:translateX(100%) scaleX(0.995)}
          85%{transform:translateX(103%) scaleX(1.003)}
          93%{transform:translateX(104.5%) scaleX(1)}
          100%{transform:translateX(105%) scaleX(1)}
        }
        @keyframes curtainGlowFade{
          0%{opacity:1}
          30%{opacity:1.5}
          100%{opacity:0}
        }
        @keyframes recordPulse{
          0%,100%{box-shadow:0 0 8px rgba(255,45,120,0.3);transform:scale(1)}
          50%{box-shadow:0 0 22px rgba(255,45,120,0.6);transform:scale(1.12)}
        }
        .chat-input:focus{border-color:rgba(255,45,120,0.5)!important;box-shadow:0 0 12px rgba(255,45,120,0.2)!important;background:rgba(255,45,120,0.04)!important}
      `}</style>

      <div ref={mountRef} style={{ width: "100%", height: "100%", touchAction: "none", cursor: "grab" }} onTouchStart={onTS} onTouchMove={onTM} onTouchEnd={onTE} onMouseDown={onMD} onMouseMove={onMM} onMouseUp={onMU} onMouseLeave={onMU} />

      {/* ═══ VELVET CURTAIN — single persistent element, animates open on click ═══ */}
      {!sceneReady && (
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, zIndex: 100, pointerEvents: curtainsOpen ? "none" : "auto", overflow: "hidden" }}>
          {/* Left curtain — swaying idle, sweeps left on open */}
          <div style={{
            position: "absolute", top: "-3%", left: "-18%", width: "67%", height: "106%",
            animation: curtainsOpen
              ? "curtainOpenL 2.2s cubic-bezier(0.16, 1, 0.3, 1) forwards"
              : "curtainSwayL 9s ease-in-out infinite",
            transformOrigin: "top right",
            zIndex: 2,
          }}>
            {/* Base velvet — rich asymmetric folds */}
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, background: `linear-gradient(90deg, #06000d 0%, #0e021a 3%, #1c0520 5.5%, #0d0215 7.5%, #28081e 10%, #180420 13%, #0a0112 15%, #1e0620 18%, #2e0a22 20.5%, #1a051a 22%, #0f0316 24.5%, #28081e 27.5%, #3a0c24 30%, #200620 32%, #120318 35%, #0c0214 37.5%, #200720 40.5%, #32091e 43%, #1e0520 45.5%, #140418 48.5%, #28081c 51%, #38091e 54%, #2a0718 57%, #180520 59.5%, #0e0316 62%, #220720 64.5%, #3c0b24 67.5%, #2c081c 70%, #100318 73%, #340a22 76.5%, #220620 79%, #160420 82%, #2e091e 85%, #3e0c26 88.5%, #2a081c 91.5%, #380b22 95%, #220720 97.5%, #140418 100%), linear-gradient(180deg, rgba(0,0,0,0.4) 0%, rgba(0,0,0,0.1) 3%, transparent 7%, transparent 88%, rgba(0,0,0,0.08) 94%, rgba(0,0,0,0.3) 100%)` }} />
            {/* Velvet sheen on fold peaks */}
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, background: `linear-gradient(90deg, transparent 0%, transparent 9%, rgba(255,160,180,0.07) 10.5%, transparent 12%, transparent 19%, rgba(255,140,170,0.09) 20.5%, rgba(255,180,200,0.04) 22%, transparent 23%, transparent 29%, rgba(200,140,220,0.06) 30.5%, transparent 32%, transparent 42.5%, rgba(255,160,190,0.08) 44%, transparent 46%, transparent 53%, rgba(220,150,240,0.07) 54.5%, transparent 57.5%, transparent 65%, rgba(255,150,180,0.09) 66.5%, transparent 69%, transparent 78%, rgba(200,130,220,0.06) 79.5%, transparent 81.5%, transparent 87.5%, rgba(255,160,190,0.08) 89%, transparent 91%, transparent 96%, rgba(255,140,180,0.04) 97.5%, transparent 100%), linear-gradient(170deg, rgba(255,200,240,0.04) 0%, transparent 15%, rgba(255,160,200,0.025) 35%, transparent 55%, rgba(200,140,255,0.02) 78%, transparent 95%)`, backgroundSize: "100% 120%", animation: curtainsOpen ? "none" : "foldShimmerL 14s ease-in-out infinite", mixBlendMode: "screen" }} />
            {/* Fold valley shadows */}
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, background: `linear-gradient(90deg, transparent 0%, rgba(0,0,0,0.3) 7%, transparent 9%, transparent 14%, rgba(0,0,0,0.22) 15.5%, transparent 17%, transparent 23.5%, rgba(0,0,0,0.2) 24.5%, transparent 26%, transparent 36.5%, rgba(0,0,0,0.25) 38%, transparent 40%, transparent 47.5%, rgba(0,0,0,0.18) 49%, transparent 50.5%, transparent 60.5%, rgba(0,0,0,0.22) 62%, transparent 63.5%, transparent 72%, rgba(0,0,0,0.2) 73.5%, transparent 75.5%, transparent 84.5%, rgba(0,0,0,0.25) 86%, transparent 88%, transparent 93.5%, rgba(0,0,0,0.18) 95%, transparent 97%)` }} />
            {/* Inner edge — soft shadow */}
            <div style={{ position: "absolute", top: 0, right: 0, width: "12%", height: "100%", background: "linear-gradient(to left, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.15) 50%, transparent 100%)" }} />
            {/* Top gather */}
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "3.5%", background: "linear-gradient(180deg, #060010 0%, rgba(15,3,20,0.95) 40%, rgba(20,4,24,0.6) 70%, transparent 100%)", boxShadow: "0 6px 25px rgba(0,0,0,0.6)", zIndex: 1 }} />
            {/* Bottom weight */}
            <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "8%", background: "linear-gradient(0deg, rgba(6,0,13,0.7) 0%, rgba(10,1,18,0.3) 40%, transparent 100%)" }} />
          </div>
          {/* Right curtain — mirrored folds, sweeps right on open */}
          <div style={{
            position: "absolute", top: "-3%", right: "-18%", width: "67%", height: "106%",
            animation: curtainsOpen
              ? "curtainOpenR 2.2s cubic-bezier(0.16, 1, 0.3, 1) forwards"
              : "curtainSwayR 12s ease-in-out infinite 1.2s",
            transformOrigin: "top left",
            zIndex: 2,
          }}>
            {/* Base velvet */}
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, background: `linear-gradient(90deg, #140418 0%, #380b22 3%, #2a081c 5.5%, #1c051c 8%, #0e0316 11%, #26071e 13.5%, #3c0b24 16.5%, #1e0620 19%, #100318 22%, #200720 25%, #2e0a22 28%, #180520 30.5%, #0c0214 33.5%, #320a20 37%, #240720 40%, #140418 43%, #0a0112 45.5%, #1e0620 48.5%, #2c091e 51.5%, #380b22 54.5%, #200620 57%, #120318 60%, #280820 63%, #3a0c24 66.5%, #1e0520 69%, #100316 72%, #220720 75.5%, #2e091e 78.5%, #180520 81%, #260820 84%, #3c0c26 87.5%, #280820 90.5%, #1a0520 93%, #200720 96%, #0d0215 98%, #06000d 100%), linear-gradient(180deg, rgba(0,0,0,0.4) 0%, rgba(0,0,0,0.1) 3%, transparent 7%, transparent 88%, rgba(0,0,0,0.08) 94%, rgba(0,0,0,0.3) 100%)` }} />
            {/* Velvet sheen */}
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, background: `linear-gradient(90deg, transparent 0%, transparent 4%, rgba(220,150,240,0.06) 5.5%, transparent 7%, transparent 14.5%, rgba(255,160,190,0.08) 16%, transparent 18%, transparent 26%, rgba(255,140,170,0.07) 27.5%, transparent 29.5%, transparent 37.5%, rgba(200,140,220,0.09) 39%, transparent 41%, transparent 50%, rgba(255,170,200,0.06) 51.5%, transparent 54%, transparent 60.5%, rgba(255,150,180,0.08) 62%, transparent 64.5%, transparent 70.5%, rgba(220,160,240,0.07) 72%, transparent 74.5%, transparent 83.5%, rgba(255,160,190,0.09) 85%, transparent 87.5%, transparent 93.5%, rgba(200,140,220,0.05) 95%, transparent 97%), linear-gradient(190deg, rgba(200,180,255,0.03) 0%, transparent 12%, rgba(255,170,220,0.025) 42%, transparent 58%, rgba(200,140,255,0.015) 82%, transparent 96%)`, backgroundSize: "100% 120%", animation: curtainsOpen ? "none" : "foldShimmerR 17s ease-in-out infinite 2.5s", mixBlendMode: "screen" }} />
            {/* Fold valley shadows */}
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, background: `linear-gradient(90deg, transparent 0%, transparent 9.5%, rgba(0,0,0,0.25) 10.5%, transparent 12%, transparent 20%, rgba(0,0,0,0.2) 21%, transparent 22.5%, transparent 31.5%, rgba(0,0,0,0.22) 33%, transparent 34.5%, transparent 44%, rgba(0,0,0,0.18) 45.5%, transparent 47%, transparent 57%, rgba(0,0,0,0.24) 58.5%, transparent 60.5%, transparent 68%, rgba(0,0,0,0.2) 69.5%, transparent 71.5%, transparent 79.5%, rgba(0,0,0,0.22) 81%, transparent 83%, transparent 89%, rgba(0,0,0,0.2) 90.5%, transparent 92.5%, transparent 97%, rgba(0,0,0,0.15) 98.5%, transparent 100%)` }} />
            {/* Inner edge — soft shadow */}
            <div style={{ position: "absolute", top: 0, left: 0, width: "12%", height: "100%", background: "linear-gradient(to right, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.15) 50%, transparent 100%)" }} />
            {/* Top gather */}
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "3.5%", background: "linear-gradient(180deg, #060010 0%, rgba(15,3,20,0.95) 40%, rgba(20,4,24,0.6) 70%, transparent 100%)", boxShadow: "0 6px 25px rgba(0,0,0,0.6)", zIndex: 1 }} />
            {/* Bottom weight */}
            <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "8%", background: "linear-gradient(0deg, rgba(6,0,13,0.7) 0%, rgba(10,1,18,0.3) 40%, transparent 100%)" }} />
          </div>
          {/* Center gap — soft light bleeding through, brightens on open */}
          <div style={{ position: "absolute", top: 0, left: "47.5%", width: "5%", height: "100%", background: "linear-gradient(180deg, rgba(0,212,255,0.02) 0%, rgba(255,45,120,0.06) 20%, rgba(0,212,255,0.04) 45%, rgba(255,45,120,0.06) 70%, rgba(0,212,255,0.03) 100%)", boxShadow: "0 0 60px 25px rgba(255,45,120,0.06), 0 0 120px 50px rgba(0,212,255,0.04)", animation: curtainsOpen ? "curtainGlowFade 1.5s ease-out forwards" : "curtainGlowPulse 5s ease-in-out infinite", mixBlendMode: "screen", zIndex: 1 }} />
          <div style={{ position: "absolute", top: "5%", left: "49.5%", width: "1%", height: "90%", background: "linear-gradient(180deg, transparent 0%, rgba(255,45,120,0.15) 15%, rgba(0,212,255,0.2) 45%, rgba(255,45,120,0.15) 80%, transparent 100%)", borderRadius: 3, filter: "blur(3px)", animation: curtainsOpen ? "curtainGlowFade 1.2s ease-out forwards" : "curtainGlowPulse 3.5s ease-in-out infinite 0.8s", mixBlendMode: "screen", zIndex: 1 }} />
          {/* UI overlay — fades out when opening */}
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", zIndex: 3, gap: 0, ...(curtainsOpen ? { animation: "curtainFadeUI 0.5s ease-out forwards", pointerEvents: "none" } : {}) }}>
            {/* ── Ambient warm halo — theater spotlight on velvet ── */}
            <div style={{ position: "absolute", top: "35%", left: "25%", right: "25%", bottom: "35%", background: "radial-gradient(ellipse at 50% 45%, rgba(212,168,130,0.07) 0%, rgba(180,120,90,0.03) 50%, transparent 75%)", filter: "blur(50px)", pointerEvents: "none" }} />
            {/* ── Logo mark ── */}
            <div style={{ position: "relative", marginBottom: 16 }}>
              {/* Backlight — warm amber, like marquee lighting hitting velvet */}
              <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", width: "120%", height: "300%", background: "radial-gradient(ellipse, rgba(210,160,120,0.1) 0%, rgba(180,130,100,0.04) 40%, transparent 70%)", filter: "blur(25px)", pointerEvents: "none" }} />
              {/* Logo text — rose gold base, single theatrical spotlight sweep */}
              <div style={{
                fontFamily: "'Inter'", fontSize: 34, fontWeight: 400, letterSpacing: 14, textTransform: "lowercase",
                color: "transparent",
                background: "linear-gradient(105deg, #b89a7e 0%, #c4a88e 20%, #d4bca6 35%, #f2e8de 44%, #ffffff 50%, #f2e8de 56%, #d4bca6 65%, #c4a88e 80%, #b89a7e 100%)",
                backgroundSize: "400% 100%",
                animation: "marqueeLight 12s cubic-bezier(0.4, 0, 0.2, 1) infinite",
                WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
                filter: "drop-shadow(0 2px 12px rgba(180,130,90,0.25))",
              }}>trench.fm</div>
            </div>
            {/* ── Hairline rule — gold thread ── */}
            <div style={{ width: 80, height: "0.5px", background: "linear-gradient(90deg, transparent 0%, rgba(196,168,142,0.4) 30%, rgba(210,180,150,0.6) 50%, rgba(196,168,142,0.4) 70%, transparent 100%)", marginBottom: 16 }} />
            {/* ── Descriptor ── */}
            <div style={{ fontFamily: "'Inter'", fontSize: 9, fontWeight: 300, letterSpacing: 5, color: "rgba(196,168,142,0.45)", textTransform: "uppercase", marginBottom: 10 }}>live crypto calls</div>
            {/* ── Live indicator — understated ── */}
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 36 }}>
              <div style={{ width: 4, height: 4, borderRadius: "50%", background: "rgba(0,255,136,0.7)", animation: "liveDot 2.5s ease-in-out infinite", boxShadow: "0 0 4px rgba(0,255,136,0.4)" }} />
              <span style={{ fontFamily: "'Inter'", fontSize: 9, fontWeight: 400, color: "rgba(0,255,136,0.4)", letterSpacing: 1.5 }}>{liveCount} listening</span>
            </div>
            {/* ── Enter — barely there, the curtain gap is the real invitation ── */}
            <button onClick={() => { setCurtainsOpen(true); curtainTimerRef.current = setTimeout(() => setSceneReady(true), 2800); }} style={{
              fontFamily: "'Inter'", fontSize: 10, fontWeight: 300, letterSpacing: 5, textTransform: "lowercase",
              color: "rgba(210,180,150,0.5)", background: "transparent",
              border: "1px solid rgba(196,168,142,0.15)", borderRadius: 0, padding: "12px 36px",
              cursor: "pointer",
              transition: "all 0.6s cubic-bezier(0.16, 1, 0.3, 1)",
            }} onMouseEnter={e => { e.target.style.color = "rgba(242,232,222,0.9)"; e.target.style.borderColor = "rgba(210,180,150,0.4)"; e.target.style.boxShadow = "0 0 30px rgba(180,130,90,0.1)"; e.target.style.letterSpacing = "7px"; }} onMouseLeave={e => { e.target.style.color = "rgba(210,180,150,0.5)"; e.target.style.borderColor = "rgba(196,168,142,0.15)"; e.target.style.boxShadow = "none"; e.target.style.letterSpacing = "5px"; }}>enter</button>
          </div>
        </div>
      )}

      {/* TOP BAR — transparent, text glows over Anadol */}
      <div data-ui="1" style={{ position: "absolute", top: 0, left: 0, right: 0, zIndex: 10, padding: "10px 14px", background: "none", display: "flex", alignItems: "center", justifyContent: "space-between", opacity: hudVisible ? 1 : 0, transition: "opacity 0.8s ease", pointerEvents: hudVisible ? "auto" : "none" }}>
        <div style={{ position: "relative" }}>
          <div style={{
            fontFamily: "'Inter'", fontSize: 13, fontWeight: 400, letterSpacing: 3,
            color: "transparent",
            background: "linear-gradient(105deg, #b89a7e, #d4bca6 40%, #f2e8de 50%, #d4bca6 60%, #b89a7e)",
            backgroundSize: "400% 100%",
            animation: "marqueeLight 14s cubic-bezier(0.4, 0, 0.2, 1) infinite",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
            filter: "drop-shadow(0 1px 6px rgba(0,0,0,0.6))",
            position: "relative", zIndex: 1,
          }}>trench.fm</div>
        </div>
        <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
          {queue.length > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: 4, padding: "4px 10px", borderRadius: 20, background: "rgba(10,0,8,0.45)", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)", border: "1px solid rgba(255,45,120,0.25)", boxShadow: "0 0 8px rgba(255,45,120,0.15)" }}>
              <Icon d={Icons.mic} size={11} color="#ff2d78" />
              <span style={{ fontFamily: "'Inter'", fontSize: 11, fontWeight: 600, color: "#ff2d78", textShadow: "0 0 6px rgba(255,45,120,0.4)" }}>{queue.length}</span>
            </div>
          )}
          <div style={{ display: "flex", alignItems: "center", gap: 5, padding: "4px 10px", borderRadius: 20, background: "rgba(10,0,8,0.45)", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)", border: "1px solid rgba(0,255,136,0.2)", boxShadow: "0 0 8px rgba(0,255,136,0.1)" }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#00ff88", animation: "liveDot 2s infinite", boxShadow: "0 0 6px rgba(0,255,136,0.6)" }} />
            <span style={{ fontFamily: "'JetBrains Mono'", fontSize: 10, fontWeight: 600, color: "#00ff88", letterSpacing: -0.3, textShadow: "0 0 6px rgba(0,255,136,0.4)" }}>{liveCount}</span>
          </div>
          <div onClick={() => { setMiniOpen(true); setMiniTab("fund"); }} style={{ display: "flex", alignItems: "center", gap: 4, padding: "4px 10px", borderRadius: 20, background: "rgba(10,0,8,0.45)", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)", cursor: "pointer", border: walletBalance === 0 ? "1px solid rgba(0,212,255,0.3)" : "1px solid rgba(255,255,255,0.1)", boxShadow: walletBalance === 0 ? "0 0 8px rgba(0,212,255,0.15)" : "none", transition: "all 0.2s" }}>
            {walletBalance === 0 && <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#00d4ff", boxShadow: "0 0 6px #00d4ff", animation: "pulse 2s infinite" }} />}
            <Icon d={Icons.wallet} size={11} color={walletBalance === 0 ? "#00d4ff" : "#aaa"} />
            <span style={{ fontFamily: "'JetBrains Mono'", fontSize: 10, fontWeight: 600, color: walletBalance === 0 ? "#00d4ff" : "#ccc", letterSpacing: -0.3, textShadow: walletBalance === 0 ? "0 0 6px rgba(0,212,255,0.4)" : "0 0 4px rgba(255,255,255,0.2)" }}>{walletBalance === 0 ? "Fund" : walletBalance.toFixed(walletBalance < 1 ? 4 : 2)}</span>
          </div>
        </div>
      </div>

      {/* Activity ticker removed — was cluttering top bar, hard to read */}

      {/* Lobby/speaker info now lives on the jumbotron — no 2D card overlay */}

      {/* Token data lives on jumbotron — no 2D overlay needed */}

      {/* ═══ BUY CELEBRATION — floating money emojis ═══ */}
      {floatingEmojis.map(e => (
        <div key={e.id} style={{
          position: "absolute", left: e.x, bottom: 70, zIndex: 30,
          fontSize: e.size, pointerEvents: "none",
          animation: `floatUp ${e.speed}s ease-out ${e.delay}s forwards`,
          opacity: 0, animationFillMode: "forwards",
        }}>{e.emoji}</div>
      ))}

      {/* ═══ SPEECH BUBBLE — inline like chat: "name · thesis..." ═══ */}
      {speakerInfo?.thesis && speakerScreenPos && (stateRef.current?.jmboIntroTimer || 0) <= 0 && stateRef.current?.teleportPhase === "active" && typewriterIdx > 0 && (
        <div data-ui="1" onMouseEnter={() => typewriterDone && setBubbleExpanded(true)} onMouseLeave={() => typewriterDone && setBubbleExpanded(false)} style={{
          position: "absolute",
          left: Math.max(8, Math.min(speakerScreenPos.x - 140, window.innerWidth - 300)),
          top: Math.max(40, speakerScreenPos.y - 36),
          maxWidth: (typewriterDone && !bubbleExpanded) ? 280 : 300,
          zIndex: 8,
          pointerEvents: "auto",
          cursor: "default",
          animation: "slideIn 0.3s ease",
          background: "rgba(12,6,16,0.85)",
          backdropFilter: "blur(14px)",
          WebkitBackdropFilter: "blur(14px)",
          borderRadius: 8,
          padding: "5px 10px",
          border: "1.5px solid rgba(255,255,255,0.12)",
          boxShadow: "0 3px 12px rgba(0,0,0,0.4)",
          fontFamily: "'Inter'",
          fontSize: 11,
          lineHeight: 1.35,
          letterSpacing: -0.15,
          transition: "max-width 0.4s ease",
          ...((typewriterDone && !bubbleExpanded) ? { whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" } : {}),
        }}>
          <span style={{ fontWeight: 700, color: "#ff2d78" }}>{speakerInfo.name}</span>
          <span style={{ color: "#555", margin: "0 6px" }}>·</span>
          <span style={{ fontWeight: 500, color: "#ddd" }}>
            {(typewriterDone && !bubbleExpanded) ? speakerInfo.thesis : speakerInfo.thesis.slice(0, typewriterIdx)}
          </span>
          {!typewriterDone && <span style={{ color: "#ff2d78", animation: "blink 0.6s step-end infinite", fontWeight: 700 }}>|</span>}
          {/* Caret pointing down — centered with border */}
          <div style={{
            position: "absolute",
            bottom: -7,
            left: "50%", transform: "translateX(-50%)",
            width: 0, height: 0,
            borderLeft: "7px solid transparent",
            borderRight: "7px solid transparent",
            borderTop: "7px solid rgba(255,255,255,0.12)",
          }} />
          <div style={{
            position: "absolute",
            bottom: -5,
            left: "50%", transform: "translateX(-50%)",
            width: 0, height: 0,
            borderLeft: "5px solid transparent",
            borderRight: "5px solid transparent",
            borderTop: "5px solid rgba(12,6,16,0.85)",
          }} />
        </div>
      )}

      {/* ═══ CHAT FEED — TikTok Live style floating pills ═══ */}
      <div data-ui="1" style={{
        position: "absolute", bottom: 46, left: 4, width: "46%", zIndex: 8,
        padding: "0 2px",
        display: "flex", flexDirection: "column", justifyContent: "flex-end", gap: 3,
        maxHeight: "55vh", overflow: "auto",
        background: "transparent",
        maskImage: "linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.4) 8%, rgba(0,0,0,0.75) 15%, black 25%, black 100%)",
        WebkitMaskImage: "linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.4) 8%, rgba(0,0,0,0.75) 15%, black 25%, black 100%)",
        scrollbarWidth: "none", msOverflowStyle: "none",
        WebkitOverflowScrolling: "touch",
        opacity: hudVisible ? 1 : 0, pointerEvents: hudVisible ? "auto" : "none",
        animation: hudVisible ? "chatHello 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards" : "none",
      }}>
        {chatMessages.slice(-30).map((m, i) => {
          const isSystem = m.user === "trench.fm";
          const isMe = m.user === viewerName;
          const userColor = isSystem ? "#ff2d78" : isMe ? "#00ff88" : `hsl(${(m.user.charCodeAt(0) * 47 + m.user.charCodeAt(m.user.length - 1) * 83) % 360},65%,60%)`;
          return (
            <div key={chatMessages.length - 30 + i} style={{
              display: "inline-flex", alignItems: "center", gap: 4,
              padding: "4px 10px 4px 4px",
              background: isSystem ? "rgba(255,45,120,0.12)" : "rgba(0,0,0,0.35)",
              backdropFilter: "blur(12px)",
              WebkitBackdropFilter: "blur(12px)",
              borderRadius: 20,
              alignSelf: "flex-start",
              maxWidth: "95%",
              animation: "chatSlideIn 0.3s ease-out",
              fontFamily: "'Inter'", fontSize: 12, lineHeight: 1.3, letterSpacing: -0.2,
            }}>
              {(() => { const pfpIdx = PFP_NAMES.indexOf(m.user); const ext = m.user === "ultra" ? "png" : "jpg"; return pfpIdx >= 0 ? <img src={`/pfp/${m.user}.${ext}`} style={{ width: 18, height: 18, borderRadius: "50%", objectFit: "cover", flexShrink: 0, border: `1.5px solid ${userColor}40` }} /> : <div style={{ width: 18, height: 18, borderRadius: "50%", background: `${userColor}25`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontWeight: 800, fontSize: 8, color: userColor }}>{m.user[0]?.toUpperCase()}</div>; })()}
              <span style={{ color: userColor, fontWeight: 700, fontSize: 11, flexShrink: 0 }}>{m.user}</span>
              {m.voiceNote ? (() => {
                const vn = m.voiceNote;
                const playing = playingVoiceNote === vn.url;
                const durSec = Math.floor(vn.duration);
                return (
                  <div style={{ display: "flex", alignItems: "center", gap: 3, cursor: "pointer" }} onClick={() => playVoiceNote(vn.url)}>
                    <div style={{ width: 18, height: 18, borderRadius: "50%", background: `${userColor}25`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "all 0.2s" }}>
                      <Icon d={playing ? Icons.pause : Icons.play} size={8} color={userColor} />
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 1, height: 14 }}>
                      {Array.from({ length: 16 }, (_, j) => {
                        const h = 3 + Math.abs(Math.sin(j * 0.8 + (m.user.charCodeAt(0) || 0) * 0.3 + j * 0.2)) * 8;
                        return <div key={j} style={{ width: 1.5, height: h, borderRadius: 1, background: playing ? userColor : `${userColor}50`, transition: "background 0.3s" }} />;
                      })}
                    </div>
                    <span style={{ fontFamily: "'JetBrains Mono'", fontSize: 9, color: "rgba(255,255,255,0.35)", flexShrink: 0, letterSpacing: -0.3 }}>
                      {Math.floor(durSec / 60)}:{String(durSec % 60).padStart(2, "0")}
                    </span>
                  </div>
                );
              })() : (
                <span style={{ color: "rgba(255,255,255,0.75)", fontWeight: 400, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.msg}</span>
              )}
            </div>
          );
        })}
        <div ref={chatEndRef} />
      </div>

      {/* ═══ TRADE STATUS TOAST ═══ */}
      {tradeStatus && (
        <div data-ui="1" style={{
          position: "absolute", bottom: 60, left: "50%", transform: "translateX(-50%)", zIndex: 55,
          padding: "6px 14px", borderRadius: 20, animation: "slideIn 0.2s ease",
          background: tradeStatus === "pending" ? "rgba(0,212,255,0.15)" : tradeStatus === "confirmed" ? "rgba(0,255,136,0.15)" : "rgba(255,68,68,0.15)",
          border: `1px solid ${tradeStatus === "pending" ? "rgba(0,212,255,0.3)" : tradeStatus === "confirmed" ? "rgba(0,255,136,0.3)" : "rgba(255,68,68,0.3)"}`,
          backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)",
          display: "flex", alignItems: "center", gap: 6,
        }}>
          {tradeStatus === "pending" && <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#00d4ff", animation: "pulse 1s infinite" }} />}
          {tradeStatus === "confirmed" && <Icon d={Icons.check} size={12} color="#00ff88" />}
          {tradeStatus === "error" && <Icon d={Icons.x} size={12} color="#ff4444" />}
          <span style={{ fontFamily: "'Inter'", fontSize: 11, fontWeight: 600, letterSpacing: -0.2, color: tradeStatus === "pending" ? "#00d4ff" : tradeStatus === "confirmed" ? "#00ff88" : "#ff4444" }}>
            {tradeStatus === "pending" ? "Tx pending..." : tradeStatus === "confirmed" ? "Confirmed!" : "Failed"}
          </span>
          {lastTxSig && tradeStatus === "confirmed" && (
            <span onClick={() => window.open(solscanTx(lastTxSig), "_blank")} style={{ fontFamily: "'JetBrains Mono'", fontSize: 9, color: "#00d4ff", cursor: "pointer", textDecoration: "underline", letterSpacing: -0.3 }}>view</span>
          )}
        </div>
      )}

      {/* ═══ VOTE BUTTONS — TikTok-style vertical stack, right edge ═══ */}
      {speakerInfo && (
        <div data-ui="1" style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", zIndex: 12, display: "flex", flexDirection: "column", alignItems: "center", gap: 10, opacity: hudVisible ? 1 : 0, transition: "all 0.3s ease", pointerEvents: hudVisible ? "auto" : "none" }}>
          {/* Rose (upvote) */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
            <button onClick={() => handleVote("up")} style={{
              width: 42, height: 42, borderRadius: "50%", border: "none", cursor: "pointer",
              background: userVoted === "up" ? "rgba(0,255,136,0.15)" : "transparent",
              display: "flex", alignItems: "center", justifyContent: "center",
              transition: "all 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
              transform: userVoted === "up" ? "scale(1.15)" : "scale(1)",
              filter: userVoted === "up" ? "drop-shadow(0 0 8px rgba(0,255,136,0.4))" : "none",
              opacity: userVoted === "down" ? 0.25 : throwInv.roses === 0 && !userVoted ? 0.3 : 0.7,
            }}>
              <Icon d={Icons.arrowUp} size={22} color={userVoted === "up" ? "#00ff88" : "rgba(255,255,255,0.5)"} />
            </button>
            <span style={{ fontFamily: "'JetBrains Mono'", fontSize: 10, fontWeight: 700, color: userVoted === "up" ? "#00ff88" : "rgba(255,255,255,0.25)", letterSpacing: -0.5 }}>{votes.up}</span>
          </div>
          {/* Freshness % */}
          <span style={{ fontFamily: "'JetBrains Mono'", fontSize: 11, fontWeight: 800, color: vr >= 50 ? "rgba(0,255,136,0.5)" : "rgba(255,68,68,0.5)", letterSpacing: -0.3 }}>{vr.toFixed(0)}%</span>
          {/* Tomato (downvote) */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
            <button onClick={() => handleVote("down")} style={{
              width: 42, height: 42, borderRadius: "50%", border: "none", cursor: "pointer",
              background: userVoted === "down" ? "rgba(255,68,68,0.15)" : "transparent",
              display: "flex", alignItems: "center", justifyContent: "center",
              transition: "all 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
              transform: userVoted === "down" ? "scale(1.15)" : "scale(1)",
              filter: userVoted === "down" ? "drop-shadow(0 0 8px rgba(255,68,68,0.4))" : "none",
              opacity: userVoted === "up" ? 0.25 : throwInv.tomatoes === 0 && !userVoted ? 0.3 : 0.7,
            }}>
              <Icon d={Icons.arrowDown} size={22} color={userVoted === "down" ? "#ff4444" : "rgba(255,255,255,0.5)"} />
            </button>
            <span style={{ fontFamily: "'JetBrains Mono'", fontSize: 10, fontWeight: 700, color: userVoted === "down" ? "#ff4444" : "rgba(255,255,255,0.25)", letterSpacing: -0.5 }}>{votes.down}</span>
          </div>
        </div>
      )}

      {/* ═══ BOTTOM BAR — chat+mic LEFT 46%, device occupies right 48% separately ═══ */}
      <div data-ui="1" style={{ position: "absolute", bottom: 0, left: 0, width: "46%", zIndex: 10, paddingBottom: "max(6px, env(safe-area-inset-bottom))", opacity: hudVisible ? 1 : 0, transition: "opacity 0.8s ease", pointerEvents: hudVisible ? "auto" : "none" }}>
        <div style={{ display: "flex", gap: 4, padding: "4px 6px", alignItems: "center" }}>
          <input ref={chatInputRef} className="chat-input" value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key === "Enter" && handleSend()} placeholder="Say something..." style={{ flex: 1, minWidth: 0, padding: "9px 12px", borderRadius: 10, background: "rgba(6,2,10,0.65)", backdropFilter: "blur(20px) saturate(1.4)", WebkitBackdropFilter: "blur(20px) saturate(1.4)", border: "1px solid rgba(255,255,255,0.08)", color: "#fff", fontFamily: "'Inter'", fontSize: 12, fontWeight: 400, outline: "none", letterSpacing: -0.2, transition: "all 0.25s ease", boxShadow: "0 2px 12px rgba(0,0,0,0.4)" }} />
          <button onTouchStart={handleMicDown} onTouchEnd={handleMicUp} onMouseDown={handleMicDown} onMouseUp={handleMicUp} onMouseLeave={() => { if (isRecording) stopRecording(); if (micHoldTimerRef.current && micHoldTimerRef.current !== "recording") { clearTimeout(micHoldTimerRef.current); micHoldTimerRef.current = null; } }} style={{ width: 30, height: 30, flexShrink: 0, borderRadius: 8, border: "none", background: isRecording ? "#ff2d78" : "linear-gradient(135deg,#ff2d78,#ff6622)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", transition: "all 0.2s", animation: isRecording ? "recordPulse 1s ease infinite" : "micGlow 2.5s ease infinite", boxShadow: isRecording ? "0 0 20px rgba(255,45,120,0.5)" : "0 0 8px rgba(255,45,120,0.25)" }}>
            <Icon d={Icons.record} size={12} color="#fff" />
          </button>
        </div>
        {/* Recording indicator — slides up when holding mic */}
        {isRecording && (
          <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 10px", animation: "chatSlideIn 0.2s ease-out" }}>
            <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#ff2d78", animation: "pulse 1s infinite", flexShrink: 0 }} />
            <span style={{ fontFamily: "'JetBrains Mono'", fontSize: 11, fontWeight: 700, color: "#ff2d78", letterSpacing: -0.3 }}>
              {Math.floor(recordingDuration / 60)}:{String(Math.floor(recordingDuration % 60)).padStart(2, "0")}
            </span>
            <span style={{ fontFamily: "'Inter'", fontSize: 10, color: "rgba(255,255,255,0.3)", letterSpacing: -0.2 }}>release to send</span>
          </div>
        )}
      </div>


      {/* ═══ MINI DEVICE — Apple Watch 42mm glass terminal ═══ */}
      {(() => {
        const bc = selectedCoin || speakerInfo?.coin;
        if (!bc) return null;
        const lastPos = userPositions.filter(p => p.mint === bc.ca).slice(-1)[0];
        const pnl = lastPos && lastPos.entry > 0 ? ((lastPos.current - lastPos.entry) / lastPos.entry * 100) : null;
        const rawP = parseFloat(bc.price) || 0;
        const priceFmt = fmtPrice(rawP);
        const handleBuyTap = () => {
          if (buyConfirming) { clearTimeout(buyConfirmTimer.current); setBuyConfirming(false); if (quickBuyUSD) handleQuickBuy(quickBuyUSD); }
          else { setBuyConfirming(true); buyConfirmTimer.current = setTimeout(() => setBuyConfirming(false), 2000); }
        };
        const switchTF = (tf) => { chartTFRef.current = tf; setChartTimeframe(tf); const d = chartTFDataRef.current[tf]; if (d) setChartData(d); const pool = bc.poolAddress; if (pool) fetchTokenChart(pool, tf).then(r => { if (r) { chartTFDataRef.current[tf] = r; setChartData(r); } }); };
        const lowBal = walletBalance * solPrice < (quickBuyUSD || 5);
        const liveTokens = trendingTokens || COINS;
        const DW_PX = 184;
        const SCREEN_H = 140;
        const topCalls = (stateRef.current.topCallsToday || []);
        const sortedTokens = (() => {
          const tokens = [...liveTokens];
          const pv = (s) => { if (!s || s === "\u2014") return 0; const n = parseFloat(s.replace(/[$,]/g, "")); if (s.includes("B")) return n*1e9; if (s.includes("M")) return n*1e6; if (s.includes("K")) return n*1e3; return n; };
          if (homeSortMode === "gainers") return tokens.sort((a, b) => parseFloat(b.change) - parseFloat(a.change));
          if (homeSortMode === "volume") return tokens.sort((a, b) => pv(b.vol) - pv(a.vol));
          if (homeSortMode === "mcap") return tokens.sort((a, b) => pv(b.mcap) - pv(a.mcap));
          return tokens;
        })();
        return (
        <div data-ui="1" style={{
          position: "absolute", zIndex: 50,
          bottom: 0, right: 4, width: "48%",
          paddingBottom: "max(6px, env(safe-area-inset-bottom))",
          visibility: consoleRevealed ? "visible" : "hidden",
          animation: consoleRevealed ? "consoleHello 1.1s cubic-bezier(0.16, 1, 0.3, 1) forwards" : "none",
          pointerEvents: consoleRevealed ? "auto" : "none",
          transition: "width 0.3s ease, left 0.3s ease",
        }}>
          <div style={{
            borderRadius: 16, padding: 1.5,
            background: "linear-gradient(165deg, rgba(80,60,120,0.4) 0%, rgba(20,10,35,0.8) 30%, rgba(12,6,20,0.95) 50%, rgba(20,10,35,0.8) 70%, rgba(60,40,100,0.3) 100%)",
            boxShadow: "0 16px 48px rgba(0,0,0,0.85), 0 4px 16px rgba(0,0,0,0.6), 0 0 1px rgba(255,255,255,0.1), inset 0 1px 0 rgba(255,255,255,0.1)",
            position: "relative", overflow: "hidden",
          }}>
            {/* Greeting shimmer — one-time glass shine on entrance */}
            {consoleRevealed && <div style={{ position: "absolute", inset: 0, zIndex: 10, pointerEvents: "none", borderRadius: 16, background: "linear-gradient(105deg, transparent 40%, rgba(0,212,255,0.12) 45%, rgba(255,255,255,0.06) 50%, rgba(0,212,255,0.12) 55%, transparent 60%)", backgroundSize: "200% 100%", animation: "consoleShimmer 1.4s ease-out 0.3s both" }} />}
            <div style={{
              borderRadius: 14.5, overflow: "hidden", position: "relative",
              background: "rgba(8,4,18,0.18)",
              backdropFilter: "blur(32px) saturate(1.6)", WebkitBackdropFilter: "blur(32px) saturate(1.6)",
              boxShadow: "inset 0 0 24px rgba(0,212,255,0.02), inset 0 1px 0 rgba(255,255,255,0.06), inset 0 -1px 0 rgba(0,0,0,0.2)",
            }}>
              <div style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 2, opacity: 0.015, backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.5) 2px, rgba(255,255,255,0.5) 3px)", mixBlendMode: "overlay" }} />
              <div style={{ position: "absolute", top: 0, left: "10%", right: "10%", height: 1, background: "linear-gradient(90deg, transparent, rgba(0,212,255,0.35), transparent)", zIndex: 2 }} />
              <div style={{ position: "absolute", bottom: 0, left: "20%", right: "20%", height: 1, background: "linear-gradient(90deg, transparent, rgba(255,45,120,0.15), transparent)", zIndex: 2 }} />

              {/* Header — always visible, shows sparkline even when collapsed */}
              <div onClick={() => setMiniOpen(p => !p)} style={{ padding: "4px 8px 2px", cursor: "pointer", position: "relative", zIndex: 1 }}>
                <div style={{ position: "absolute", top: 4, right: 8, display: "flex", alignItems: "center", gap: 4 }}>
                  <button onClick={(e) => { e.stopPropagation(); setShowCallInput(true); setMiniOpen(true); setMiniTab("trade"); }} style={{
                    padding: "2px 6px", borderRadius: 8, border: "none", cursor: "pointer",
                    background: "linear-gradient(135deg,#00d4ff,#0099cc)",
                    fontFamily: "'JetBrains Mono'", fontSize: 7, fontWeight: 800, color: "#fff",
                    letterSpacing: -0.3, display: "flex", alignItems: "center", gap: 2,
                    boxShadow: "0 0 8px rgba(0,212,255,0.3), 0 2px 4px rgba(0,0,0,0.3)",
                    transition: "all 0.15s",
                  }}><Icon d={Icons.mic} size={7} color="#fff" />+CA</button>
                  <div style={{ width: 4, height: 4, borderRadius: "50%", background: "#00ff88", boxShadow: "0 0 6px #00ff88, 0 0 2px #00ff88", animation: "pulse 2s infinite" }} />
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  {bc.imageUrl && <img src={bc.imageUrl} style={{ width: 18, height: 18, borderRadius: 5, objectFit: "cover", flexShrink: 0, boxShadow: "0 0 8px rgba(0,212,255,0.15), 0 2px 4px rgba(0,0,0,0.4)", border: "1px solid rgba(255,255,255,0.06)" }} />}
                  <span style={{ fontFamily: "'Inter'", fontWeight: 800, fontSize: 12, color: "#fff", letterSpacing: -0.5 }}>{bc.ticker}</span>
                  <span onClick={(e) => { e.stopPropagation(); copyCA(e, bc); }} style={{ display: "inline-flex", alignItems: "center", gap: 2, fontFamily: "'JetBrains Mono'", fontSize: 7, color: caCopied ? "#00ff88" : "rgba(255,255,255,0.15)", cursor: "pointer", transition: "color 0.2s, background 0.2s", padding: "1px 3px", borderRadius: 3, background: caCopied ? "rgba(0,255,136,0.06)" : "transparent" }}>{bc.ca.slice(0, 4)}..{bc.ca.slice(-3)}<Icon d={caCopied ? Icons.check : Icons.copy} size={7} color={caCopied ? "#00ff88" : "rgba(255,255,255,0.2)"} /></span>
                </div>
                <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginTop: 0 }}>
                  <span style={{ fontFamily: "'JetBrains Mono'", fontWeight: 800, fontSize: 17, color: "#fff", letterSpacing: -0.8, textShadow: "0 0 20px rgba(255,255,255,0.06)" }}>{priceFmt}</span>
                  <span style={{ fontFamily: "'JetBrains Mono'", fontWeight: 700, fontSize: 10, color: bc.positive ? "#00ff88" : "#ff4444", padding: "1px 4px", borderRadius: 3, background: bc.positive ? "rgba(0,255,136,0.06)" : "rgba(255,68,68,0.06)" }}>{bc.change}</span>
                </div>
                {/* Stats row — MC / LIQ / VOL — stretch full width */}
                <div style={{ display: "flex", marginTop: 1, justifyContent: "space-between" }}>
                  {[{ l: "MC", v: bc.mcap, c: "#fff" }, { l: "LIQ", v: bc.liq, c: "#00d4ff" }, { l: "VOL", v: bc.vol, c: "#b24dff" }].map(s => (
                    <div key={s.l} style={{ display: "flex", alignItems: "center", gap: 2, minWidth: 0 }}>
                      <span style={{ fontFamily: "'Inter'", fontSize: 7, fontWeight: 600, color: "#444", flexShrink: 0 }}>{s.l}</span>
                      <span style={{ fontFamily: "'JetBrains Mono'", fontSize: 7, fontWeight: 700, color: s.c, opacity: 0.7, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s.v || "—"}</span>
                    </div>
                  ))}
                </div>
                {/* Full-width chart — always visible, even collapsed */}
                <div style={{ margin: "2px -10px 0", padding: "0 2px", position: "relative", height: 32 }}>
                  {chartData && chartData.length > 2 ? (
                    <MiniChart data={chartData} positive={bc.positive} width={180} height={32} />
                  ) : (
                    <div style={{ width: "100%", height: 32, borderRadius: 4, background: "rgba(0,212,255,0.04)", position: "relative", overflow: "hidden" }}>
                      <div style={{
                        position: "absolute", inset: 0,
                        background: "linear-gradient(90deg, transparent 0%, rgba(0,212,255,0.06) 30%, rgba(0,212,255,0.12) 50%, rgba(0,212,255,0.06) 70%, transparent 100%)",
                        animation: "chartShimmer 1.5s ease-in-out infinite",
                      }} />
                      {[0.33, 0.66].map(p => (
                        <div key={p} style={{ position: "absolute", left: 0, right: 0, top: `${p * 100}%`, height: 1, background: "rgba(255,255,255,0.03)" }} />
                      ))}
                    </div>
                  )}
                  <div style={{ position: "absolute", bottom: 2, right: 4, display: "flex", gap: 2 }}>
                    {["1h", "1d"].map(tf => (
                      <button key={tf} onClick={(e) => { e.stopPropagation(); switchTF(tf); }} style={{
                        padding: "1px 4px", borderRadius: 3, cursor: "pointer", border: "none",
                        fontFamily: "'JetBrains Mono'", fontSize: 6, fontWeight: 700,
                        background: chartTimeframe === tf ? "rgba(0,212,255,0.25)" : "rgba(0,0,0,0.5)",
                        color: chartTimeframe === tf ? "#00d4ff" : "rgba(255,255,255,0.3)",
                      }}>{tf.toUpperCase()}</button>
                    ))}
                  </div>
                </div>
                {lastPos && pnl !== null && <div style={{ fontFamily: "'JetBrains Mono'", fontSize: 8, color: pnl >= 0 ? "rgba(0,255,136,0.6)" : "rgba(255,68,68,0.6)", letterSpacing: -0.2, marginTop: 1 }}>{pnl >= 0 ? "+" : ""}{pnl.toFixed(1)}% position</div>}
              </div>

              {/* LIVE pill — "Navi" notification when stage coin differs from console coin */}
              {selectedCoin && speakerInfo?.coin && speakerInfo.coin.ca !== selectedCoin.ca && (
                <div style={{ display: "flex", alignItems: "center", gap: 4, margin: "2px 6px", padding: "3px 6px", borderRadius: 8, background: "rgba(255,45,120,0.08)", border: "1px solid rgba(255,45,120,0.2)", animation: "chatSlideIn 0.3s ease-out", cursor: "pointer" }}
                  onClick={(e) => { e.stopPropagation(); setSelectedCoin(null); setChartData(null); const tfd = generateAllTimeframes(speakerInfo.coin.positive); chartTFDataRef.current = tfd; setChartData(tfd[chartTFRef.current]); loadRealChart(speakerInfo.coin); }}>
                  <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#ff2d78", animation: "liveDot 2s infinite", boxShadow: "0 0 4px rgba(255,45,120,0.6)", flexShrink: 0 }} />
                  <span style={{ fontFamily: "'Inter'", fontSize: 7, fontWeight: 700, color: "#ff2d78" }}>LIVE</span>
                  {speakerInfo.coin.imageUrl && <img src={speakerInfo.coin.imageUrl} style={{ width: 12, height: 12, borderRadius: 3, objectFit: "cover" }} />}
                  <span style={{ fontFamily: "'Inter'", fontSize: 8, fontWeight: 700, color: "#fff", letterSpacing: -0.3 }}>{speakerInfo.coin.ticker}</span>
                  <span style={{ fontFamily: "'JetBrains Mono'", fontSize: 7, color: "rgba(255,255,255,0.3)" }}>{speakerInfo.coin.mcap}</span>
                  <button onClick={(e) => { e.stopPropagation(); setSelectedCoin(null); if (quickBuyUSD) handleQuickBuy(quickBuyUSD); }} style={{ marginLeft: "auto", background: "rgba(0,255,136,0.1)", border: "1px solid rgba(0,255,136,0.25)", borderRadius: 5, padding: "1px 5px", cursor: "pointer", display: "flex", alignItems: "center", gap: 2 }}>
                    <Icon d={Icons.zap} size={7} color="#00ff88" />
                    <span style={{ fontFamily: "'Inter'", fontSize: 7, fontWeight: 700, color: "#00ff88" }}>Ape</span>
                  </button>
                </div>
              )}

              {/* ── Quick buy strip — always visible under chart ── */}
              <div style={{ display: "flex", gap: 3, padding: "3px 8px", borderTop: "1px solid rgba(255,255,255,0.03)", background: "linear-gradient(180deg, rgba(0,0,0,0.08) 0%, rgba(0,0,0,0.15) 100%)" }}>
                {walletBalance === 0 ? (
                  <button onClick={() => { setMiniOpen(true); setMiniTab("fund"); }} style={{
                    flex: 1, padding: "5px 0", borderRadius: 6, cursor: "pointer", border: "none",
                    fontFamily: "'Inter'", fontSize: 9, fontWeight: 800, letterSpacing: -0.3,
                    background: "linear-gradient(135deg,#00d4ff,#0099cc)",
                    color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", gap: 4,
                    boxShadow: "0 0 12px rgba(0,212,255,0.3), inset 0 1px 0 rgba(255,255,255,0.2)",
                  }}>
                    <Icon d={Icons.wallet} size={9} color="#fff" />
                    <span>Fund Wallet to Start Trading</span>
                    <svg width="6" height="9" viewBox="0 0 6 9" style={{ animation: "gentleBounce 2s ease-in-out infinite" }}><path d="M1 1l3.5 3.5L1 8" fill="none" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  </button>
                ) : (<>
                  <button onClick={() => { setMiniOpen(true); setMiniTab("fund"); }} style={{
                    padding: "4px 5px", borderRadius: 6, cursor: "pointer", border: "none",
                    background: "transparent", display: "flex", alignItems: "center", gap: 2,
                    transition: "all 0.15s",
                  }}>
                    <Icon d={Icons.wallet} size={7} color={lowBal ? "#ffaa00" : "rgba(255,255,255,0.25)"} />
                    {lowBal && <div style={{ width: 4, height: 4, borderRadius: "50%", background: "#ffaa00", boxShadow: "0 0 4px #ffaa00", animation: "pulse 2s infinite" }} />}
                    <span style={{ fontFamily: "'JetBrains Mono'", fontSize: 8, fontWeight: 600, color: lowBal ? "#ffaa00" : "rgba(255,255,255,0.25)", letterSpacing: -0.3 }}>{walletBalance.toFixed(walletBalance < 1 ? 3 : 2)}</span>
                  </button>
                  {[5, 10, 25].map(usd => (
                    <button key={usd} onClick={() => { setQuickBuyUSD(usd); setBuyConfirming(false); clearTimeout(buyConfirmTimer.current); }} style={{
                      flex: 1, padding: "4px 0", borderRadius: 6, cursor: "pointer",
                      fontFamily: "'JetBrains Mono'", fontSize: 9, fontWeight: 700, letterSpacing: -0.5,
                      border: quickBuyUSD === usd ? "1px solid rgba(0,255,136,0.35)" : "1px solid rgba(255,255,255,0.03)",
                      background: quickBuyUSD === usd ? "rgba(0,255,136,0.1)" : "rgba(255,255,255,0.015)",
                      color: quickBuyUSD === usd ? "#00ff88" : "rgba(255,255,255,0.2)",
                      boxShadow: quickBuyUSD === usd ? "0 0 8px rgba(0,255,136,0.12), inset 0 1px 0 rgba(0,255,136,0.1)" : "none",
                      transition: "all 0.15s",
                    }}>${usd}</button>
                  ))}
                  {lowBal ? (
                    <button onClick={() => { setMiniOpen(true); setMiniTab("fund"); }} style={{
                      flex: 1.4, padding: "4px 0", borderRadius: 6, cursor: "pointer", border: "none",
                      fontFamily: "'Inter'", fontSize: 9, fontWeight: 800, letterSpacing: -0.3,
                      background: "rgba(0,212,255,0.08)", color: "#00d4ff",
                      transition: "all 0.15s", display: "flex", alignItems: "center", justifyContent: "center", gap: 2,
                    }}>
                      <Icon d={Icons.wallet} size={8} color="#00d4ff" />Fund
                    </button>
                  ) : (
                    <button onClick={handleBuyTap} style={{
                      flex: 1.4, padding: "4px 0", borderRadius: 6, cursor: "pointer", border: "none",
                      fontFamily: "'Inter'", fontSize: 9, fontWeight: 800, letterSpacing: -0.3,
                      background: buyConfirming ? "linear-gradient(135deg,#00ff88,#00cc66)" : "rgba(0,255,136,0.06)",
                      color: buyConfirming ? "#000" : "#00ff88",
                      boxShadow: buyConfirming ? "0 0 16px rgba(0,255,136,0.4), inset 0 1px 0 rgba(255,255,255,0.2)" : "none",
                      transition: "all 0.15s", display: "flex", alignItems: "center", justifyContent: "center", gap: 2,
                      animation: buyConfirming ? "buyGlow 1s infinite" : "none",
                    }}>
                      {buyConfirming ? <><Icon d={Icons.zap} size={8} color="#000" />GO</> : <><Icon d={Icons.zap} size={8} color="#00ff88" />Buy</>}
                    </button>
                  )}
                </>)}
              </div>

              {/* Expandable screen */}
              <div style={{ maxHeight: miniOpen ? SCREEN_H + 28 : 0, overflow: "hidden", transition: "max-height 0.3s cubic-bezier(0.16, 1, 0.3, 1)" }}>
                <div style={{ height: 1, margin: "0 6px", background: "linear-gradient(90deg, transparent, rgba(0,212,255,0.08), transparent)" }} />
                <div style={{ height: SCREEN_H, overflow: "auto", padding: "4px 6px", scrollbarWidth: "none", msOverflowStyle: "none", position: "relative", zIndex: 1 }}>

                  {/* ── Inline Call Input ── */}
                  {showCallInput && (
                    <div style={{ padding: "4px 0 6px", animation: "chatSlideIn 0.2s ease-out" }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                        <span style={{ fontFamily: "'JetBrains Mono'", fontSize: 7, fontWeight: 700, color: "rgba(255,45,120,0.7)", letterSpacing: 0.8 }}>CALL A COIN</span>
                        <button onClick={() => { setShowCallInput(false); setStepUpCA(""); setStepUpCoinPreview(null); }} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, lineHeight: 0 }}><Icon d={Icons.x} size={9} color="#555" /></button>
                      </div>
                      <input value={stepUpCA} onChange={e => setStepUpCA(e.target.value)} placeholder="Paste CA or ticker..." style={{ width: "100%", padding: "6px 8px", borderRadius: 7, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#fff", fontFamily: "'JetBrains Mono'", fontSize: 9, fontWeight: 500, outline: "none", boxSizing: "border-box", letterSpacing: -0.3 }} />
                      {stepUpCA.length > 2 && (
                        <div style={{ fontFamily: "'JetBrains Mono'", fontSize: 8, color: stepUpCoinPreview ? "#00ff88" : "#ff9f5a", padding: "3px 0", display: "flex", alignItems: "center", gap: 3 }}>
                          {stepUpLookupLoading ? (
                            <>
                              <div style={{ width: 8, height: 8, border: "1.5px solid rgba(0,212,255,0.25)", borderTopColor: "#00d4ff", borderRadius: "50%", animation: "spin 0.6s linear infinite" }} />
                              <span>Looking up...</span>
                            </>
                          ) : stepUpCoinPreview ? (
                            <>
                              <Icon d={Icons.check} size={8} color="#00ff88" />
                              <span>{stepUpCoinPreview.ticker} · {stepUpCoinPreview.mcap} · {stepUpCoinPreview.change}</span>
                            </>
                          ) : (
                            <>
                              <Icon d={Icons.x} size={8} color="#ff9f5a" />
                              <span>No match yet</span>
                            </>
                          )}
                        </div>
                      )}
                      <button onClick={() => handleCallCoin()} disabled={!stepUpCA.trim() || !stepUpCoinPreview || stepUpLookupLoading} style={{
                        width: "100%", padding: "5px 0", borderRadius: 7, border: "none", marginTop: 3, cursor: stepUpCA.trim() && stepUpCoinPreview && !stepUpLookupLoading ? "pointer" : "default",
                        background: stepUpCA.trim() && stepUpCoinPreview && !stepUpLookupLoading ? "linear-gradient(135deg,#ff2d78,#ff6622)" : "rgba(255,255,255,0.04)",
                        color: stepUpCA.trim() && stepUpCoinPreview && !stepUpLookupLoading ? "#fff" : "#444",
                        fontFamily: "'Inter'", fontSize: 9, fontWeight: 800, letterSpacing: -0.3,
                        display: "flex", alignItems: "center", justifyContent: "center", gap: 4,
                        boxShadow: stepUpCA.trim() && stepUpCoinPreview && !stepUpLookupLoading ? "0 0 12px rgba(255,45,120,0.3)" : "none",
                        transition: "all 0.15s",
                      }}>
                        <Icon d={speakerInfo ? Icons.users : Icons.mic} size={9} color={stepUpCA.trim() && stepUpCoinPreview && !stepUpLookupLoading ? "#fff" : "#444"} />
                        {speakerInfo ? "Join Queue" : "Call This"}
                      </button>
                    </div>
                  )}

                  {/* HOME — fomo-style feed */}
                  {miniTab === "home" && (<>
                    <div style={{ display: "flex", alignItems: "center", gap: 4, padding: "3px 6px", borderRadius: 7, background: "rgba(0,212,255,0.02)", border: "1px solid rgba(0,212,255,0.06)", marginBottom: 4 }}>
                      <Icon d={Icons.search} size={9} color="rgba(0,212,255,0.3)" />
                      <input value={miniSearch} onChange={e => { setMiniSearch(e.target.value); setConsoleSearchQuery(e.target.value); }} placeholder="Search" style={{ flex: 1, background: "none", border: "none", color: "#fff", fontFamily: "'Inter'", fontSize: 9, outline: "none", padding: 0 }} />
                      {miniSearch && <button onClick={() => { setMiniSearch(""); setConsoleSearchQuery(""); }} style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}><Icon d={Icons.x} size={8} color="#555" /></button>}
                    </div>
                    {speakerInfo && (
                      <div onClick={() => { setSelectedCoin(speakerInfo.coin); setMiniTab("trade"); }} style={{ display: "flex", alignItems: "center", gap: 4, padding: "4px 6px", borderRadius: 7, background: "rgba(255,45,120,0.06)", border: "1px solid rgba(255,45,120,0.12)", marginBottom: 4, cursor: "pointer" }}>
                        <div style={{ width: 4, height: 4, borderRadius: "50%", background: "#ff2d78", boxShadow: "0 0 6px #ff2d78", animation: "pulse 1.5s infinite", flexShrink: 0 }} />
                        <span style={{ fontFamily: "'Inter'", fontSize: 7, fontWeight: 800, color: "#ff2d78", letterSpacing: 0.5, flexShrink: 0 }}>LIVE</span>
                        {speakerInfo.coin?.imageUrl && <img src={speakerInfo.coin.imageUrl} style={{ width: 14, height: 14, borderRadius: 4, objectFit: "cover", flexShrink: 0 }} />}
                        <span style={{ fontFamily: "'Inter'", fontSize: 8, fontWeight: 700, color: "#fff", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{speakerInfo.name} · {speakerInfo.coin.ticker}</span>
                        <span style={{ fontFamily: "'JetBrains Mono'", fontSize: 8, color: "rgba(255,255,255,0.3)" }}>{Math.ceil(speakerTimeLeft)}s</span>
                      </div>
                    )}
                    {topCalls.length > 0 && !miniSearch && (<>
                      <div style={{ fontFamily: "'JetBrains Mono'", fontSize: 7, color: "rgba(255,45,120,0.6)", letterSpacing: 0.5, marginBottom: 3, fontWeight: 700 }}>TOP CALLS</div>
                      {topCalls.slice(0, 3).map((call, i) => {
                        const callToken = liveTokens.find(c => c.ticker === call.ticker);
                        return (
                        <div key={i} style={{ display: "flex", alignItems: "center", gap: 3, padding: "3px 2px", borderBottom: "1px solid rgba(255,255,255,0.02)" }}>
                          <span style={{ fontFamily: "'JetBrains Mono'", fontSize: 8, fontWeight: 700, color: ["#FFD700","#C0C0C0","#CD7F32"][i] || "#666", width: 10, flexShrink: 0 }}>{i+1}</span>
                          {callToken?.imageUrl ? (
                            <img src={callToken.imageUrl} style={{ width: 14, height: 14, borderRadius: 4, objectFit: "cover", flexShrink: 0 }} />
                          ) : (
                            <div style={{ width: 14, height: 14, borderRadius: 4, background: "rgba(255,255,255,0.04)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Inter'", fontWeight: 800, fontSize: 6, color: "rgba(255,255,255,0.2)", flexShrink: 0 }}>{call.ticker?.[1] || "?"}</div>
                          )}
                          <span style={{ fontFamily: "'Inter'", fontSize: 9, fontWeight: 700, color: "#fff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{call.ticker}</span>
                          <span style={{ fontFamily: "'Inter'", fontSize: 7, color: "#ff2d78", flexShrink: 0 }}>{call.caller}</span>
                          <span style={{ marginLeft: "auto", fontFamily: "'JetBrains Mono'", fontSize: 9, fontWeight: 700, color: call.change?.startsWith("+") ? "#00ff88" : "#ff4444", flexShrink: 0 }}>{call.change}</span>
                        </div>
                        );
                      })}
                      <div style={{ height: 1, margin: "4px 0", background: "rgba(255,255,255,0.03)" }} />
                    </>)}
                    {!miniSearch && (
                      <div style={{ display: "flex", gap: 0, marginBottom: 3 }}>
                        {[{ id: "trending", label: "Trending" }, { id: "gainers", label: "Gainers" }, { id: "volume", label: "Volume" }, { id: "mcap", label: "MC" }].map(s => (
                          <button key={s.id} onClick={() => setHomeSortMode(s.id)} style={{
                            flex: 1, padding: "3px 0", border: "none", cursor: "pointer",
                            fontFamily: "'Inter'", fontSize: 8, fontWeight: homeSortMode === s.id ? 700 : 500, letterSpacing: -0.2,
                            background: "none", color: homeSortMode === s.id ? "#fff" : "#555",
                            borderBottom: homeSortMode === s.id ? "1.5px solid #00d4ff" : "1.5px solid transparent",
                            transition: "all 0.15s",
                          }}>{s.label}</button>
                        ))}
                      </div>
                    )}
                    {(miniSearch.length >= 2 ? (searchResults || []) : sortedTokens).slice(0, 12).map((coin, i) => (
                      <div key={coin.ca || i} onClick={() => { setSelectedCoin(coin); setMiniTab("trade"); setMiniSearch(""); setConsoleSearchQuery(""); }} style={{
                        display: "flex", alignItems: "center", gap: 4, padding: "3px 1px", cursor: "pointer",
                        borderBottom: "1px solid rgba(255,255,255,0.02)",
                      }}>
                        {coin.imageUrl ? (
                          <img src={coin.imageUrl} style={{ width: 20, height: 20, borderRadius: 6, objectFit: "cover", flexShrink: 0 }} />
                        ) : (
                          <div style={{ width: 20, height: 20, borderRadius: 6, background: "rgba(255,255,255,0.04)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Inter'", fontWeight: 800, fontSize: 8, color: "rgba(255,255,255,0.3)", flexShrink: 0 }}>{coin.ticker?.[1] || "?"}</div>
                        )}
                        <div style={{ flex: 1, minWidth: 0, overflow: "hidden" }}>
                          <div style={{ fontFamily: "'Inter'", fontSize: 9, fontWeight: 700, color: "#fff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{coin.ticker}</div>
                          <div style={{ fontFamily: "'JetBrains Mono'", fontSize: 7, color: "#555" }}>{coin.mcap}</div>
                        </div>
                        <div style={{ textAlign: "right", flexShrink: 0 }}>
                          <div style={{ fontFamily: "'JetBrains Mono'", fontSize: 9, fontWeight: 700, color: "#fff" }}>{fmtPrice(coin.price)}</div>
                          <div style={{ fontFamily: "'JetBrains Mono'", fontSize: 8, fontWeight: 700, color: coin.positive ? "#00ff88" : "#ff4444" }}>{coin.change}</div>
                        </div>
                      </div>
                    ))}
                    {miniSearch.length >= 2 && searchLoading && <div style={{ fontFamily: "'JetBrains Mono'", fontSize: 8, color: "rgba(255,255,255,0.15)", textAlign: "center", padding: 8 }}>searching...</div>}
                    {!miniSearch && !trendingTokens && <div style={{ fontFamily: "'JetBrains Mono'", fontSize: 8, color: "#444", textAlign: "center", padding: 8 }}>loading...</div>}
                  </>)}

                  {/* TRADE */}
                  {miniTab === "trade" && (<>
                    {/* Multi-timeframe % change pills */}
                    <div style={{ display: "flex", gap: 3, marginBottom: 5 }}>
                      {[{ label: "5M", val: bc.priceChanges?.m5 }, { label: "1H", val: bc.priceChanges?.h1 }, { label: "6H", val: bc.priceChanges?.h6 }, { label: "24H", val: bc.priceChanges?.h24 }].map(tf => {
                        const v = parseFloat(tf.val) || 0;
                        const pos = v >= 0;
                        return (
                          <div key={tf.label} style={{ flex: 1, padding: "3px 0", borderRadius: 5, background: pos ? "rgba(0,255,136,0.04)" : "rgba(255,68,68,0.04)", border: `1px solid ${pos ? "rgba(0,255,136,0.1)" : "rgba(255,68,68,0.1)"}`, textAlign: "center" }}>
                            <div style={{ fontFamily: "'Inter'", fontSize: 6, fontWeight: 600, color: "rgba(255,255,255,0.25)", letterSpacing: 0.5, marginBottom: 1 }}>{tf.label}</div>
                            <div style={{ fontFamily: "'JetBrains Mono'", fontSize: 8, fontWeight: 700, color: pos ? "#00ff88" : "#ff4444" }}>{pos ? "+" : ""}{v.toFixed(1)}%</div>
                          </div>
                        );
                      })}
                    </div>
                    {/* Bloomberg-style detail rows */}
                    <div style={{ margin: "0 0 4px" }}>
                      {[
                        { l: "Market cap", v: bc.mcap, c: "#fff" },
                        { l: "Fully diluted", v: bc.fdv || bc.mcap, c: "#fff" },
                        { l: "Liquidity", v: bc.liq, c: "#00d4ff" },
                        { l: "24h volume", v: bc.vol, c: "#b24dff" },
                        { l: "DEX", v: bc.dex && bc.dex !== "—" ? bc.dex.toUpperCase() : "—", c: "#ff2d78" },
                      ].map(s => (
                        <div key={s.l} style={{ display: "flex", alignItems: "baseline", padding: "1.5px 0" }}>
                          <span style={{ fontFamily: "'Inter'", fontSize: 7.5, color: "rgba(255,255,255,0.3)", whiteSpace: "nowrap" }}>{s.l}</span>
                          <span style={{ flex: 1, borderBottom: "1px dotted rgba(255,255,255,0.04)", margin: "0 4px", minWidth: 8, alignSelf: "center" }} />
                          <span style={{ fontFamily: "'JetBrains Mono'", fontSize: 8, fontWeight: 700, color: s.c, whiteSpace: "nowrap" }}>{s.v || "—"}</span>
                        </div>
                      ))}
                    </div>
                    {/* Top Holders */}
                    {tokenHolders && (() => {
                      const holders = tokenHolders?.data?.top_holders || tokenHolders?.top_holders || [];
                      if (!holders.length) return null;
                      return (
                        <div style={{ margin: "4px 0 2px" }}>
                          <div style={{ fontFamily: "'JetBrains Mono'", fontSize: 7, color: "rgba(0,212,255,0.5)", letterSpacing: 0.8, fontWeight: 700, marginBottom: 3 }}>TOP HOLDERS</div>
                          {holders.slice(0, 5).map((h, i) => {
                            const addr = h.owner_address || h.address || "";
                            const pct = parseFloat(h.percentage_of_top_10 || h.percentage || h.balance_percentage || 0);
                            return (
                              <div key={i} style={{ display: "flex", alignItems: "center", gap: 3, padding: "1.5px 0" }}>
                                <span style={{ fontFamily: "'JetBrains Mono'", fontSize: 7, color: "rgba(255,255,255,0.15)", width: 8, flexShrink: 0 }}>{i + 1}</span>
                                <span style={{ fontFamily: "'JetBrains Mono'", fontSize: 7.5, color: "rgba(255,255,255,0.5)", flex: 1, overflow: "hidden", textOverflow: "ellipsis" }}>{addr.slice(0, 4)}...{addr.slice(-4)}</span>
                                <div style={{ width: 40, height: 3, borderRadius: 1.5, background: "rgba(255,255,255,0.04)", overflow: "hidden", flexShrink: 0 }}>
                                  <div style={{ width: `${Math.min(pct, 100)}%`, height: "100%", borderRadius: 1.5, background: "linear-gradient(90deg, #00d4ff, #00d4ff88)" }} />
                                </div>
                                <span style={{ fontFamily: "'JetBrains Mono'", fontSize: 7, fontWeight: 700, color: "#00d4ff", width: 28, textAlign: "right", flexShrink: 0 }}>{pct.toFixed(1)}%</span>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}
                    {/* Top Traders */}
                    {tokenTraders && (() => {
                      const traders = tokenTraders?.data?.top_traders || tokenTraders?.top_traders || [];
                      if (!traders.length) return null;
                      return (
                        <div style={{ margin: "4px 0 2px" }}>
                          <div style={{ fontFamily: "'JetBrains Mono'", fontSize: 7, color: "rgba(178,77,255,0.5)", letterSpacing: 0.8, fontWeight: 700, marginBottom: 3 }}>TOP TRADERS</div>
                          {traders.slice(0, 5).map((t, i) => {
                            const addr = t.owner_address || t.address || "";
                            const bought = parseFloat(t.bought_usd || t.total_buy_usd || 0);
                            const sold = parseFloat(t.sold_usd || t.total_sell_usd || 0);
                            const pnl = sold > 0 && bought > 0 ? ((sold - bought) / bought * 100) : 0;
                            return (
                              <div key={i} style={{ display: "flex", alignItems: "center", gap: 3, padding: "1.5px 0" }}>
                                <span style={{ fontFamily: "'JetBrains Mono'", fontSize: 7, color: "rgba(255,255,255,0.15)", width: 8, flexShrink: 0 }}>{i + 1}</span>
                                <span style={{ fontFamily: "'JetBrains Mono'", fontSize: 7.5, color: "rgba(255,255,255,0.5)", overflow: "hidden", textOverflow: "ellipsis" }}>{addr.slice(0, 4)}...{addr.slice(-4)}</span>
                                <span style={{ fontFamily: "'JetBrains Mono'", fontSize: 7, color: "rgba(0,212,255,0.4)", flexShrink: 0 }}>B:{bought >= 1000 ? `$${(bought/1000).toFixed(0)}K` : `$${bought.toFixed(0)}`}</span>
                                <span style={{ fontFamily: "'JetBrains Mono'", fontSize: 7, color: "rgba(255,45,120,0.4)", flexShrink: 0 }}>S:{sold >= 1000 ? `$${(sold/1000).toFixed(0)}K` : `$${sold.toFixed(0)}`}</span>
                                <span style={{ marginLeft: "auto", fontFamily: "'JetBrains Mono'", fontSize: 7, fontWeight: 700, color: pnl >= 0 ? "#00ff88" : "#ff4444", flexShrink: 0 }}>{pnl >= 0 ? "+" : ""}{pnl.toFixed(0)}%</span>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}
                    {/* Caller + votes + timer */}
                    {speakerInfo && (
                      <div style={{ display: "flex", alignItems: "center", gap: 4, padding: "3px 5px", borderRadius: 6, background: "rgba(255,45,120,0.04)", border: "1px solid rgba(255,45,120,0.08)", marginTop: 4 }}>
                        <span style={{ fontFamily: "'Inter'", fontSize: 8, fontWeight: 700, color: "#ff2d78" }}>{speakerInfo.name}</span>
                        <span style={{ fontFamily: "'JetBrains Mono'", fontSize: 7, color: "rgba(255,255,255,0.15)" }}>called @ {bc.mcap || "?"}</span>
                        <span style={{ marginLeft: "auto", display: "flex", gap: 3 }}>
                          <span style={{ fontFamily: "'JetBrains Mono'", fontSize: 8, color: "#00ff88" }}>{votes.up}</span>
                          <span style={{ fontFamily: "'JetBrains Mono'", fontSize: 8, color: "#ff4444" }}>{votes.down}</span>
                        </span>
                        <span style={{ fontFamily: "'JetBrains Mono'", fontSize: 7, color: "rgba(255,255,255,0.2)" }}>{Math.ceil(speakerTimeLeft)}s</span>
                      </div>
                    )}
                  </>)}

                  {/* BAG */}
                  {miniTab === "bag" && (<>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, padding: "2px 0" }}>
                      <div>
                        <div style={{ fontFamily: "'JetBrains Mono'", fontSize: 7, color: "rgba(255,255,255,0.2)", letterSpacing: 0.5, marginBottom: 1 }}>VALUE</div>
                        <div style={{ fontFamily: "'JetBrains Mono'", fontSize: 15, fontWeight: 800, color: "#fff", letterSpacing: -0.5 }}>${userPositions.reduce((s, p) => s + (p.notionalUsd || 0) * (p.entry > 0 ? (p.current / p.entry) : 1), 0).toFixed(2)}</div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontFamily: "'JetBrains Mono'", fontSize: 7, color: "rgba(255,255,255,0.2)", letterSpacing: 0.5, marginBottom: 1 }}>TOKENS</div>
                        <div style={{ fontFamily: "'JetBrains Mono'", fontSize: 15, fontWeight: 800, color: "#fff" }}>{userPositions.length}</div>
                      </div>
                    </div>
                    {userPositions.length > 0 ? userPositions.map((pos, i) => {
                      const pp = pos.entry > 0 ? ((pos.current - pos.entry) / pos.entry * 100) : 0;
                      const posToken = liveTokens.find(c => c.ca === pos.mint);
                      return (
                        <div key={i} style={{ display: "flex", alignItems: "center", gap: 4, padding: "4px 0", borderBottom: "1px solid rgba(255,255,255,0.02)" }}>
                          {posToken?.imageUrl ? (
                            <img src={posToken.imageUrl} style={{ width: 18, height: 18, borderRadius: 5, objectFit: "cover", flexShrink: 0, border: "1px solid rgba(255,255,255,0.04)" }} />
                          ) : (
                            <div style={{ width: 18, height: 18, borderRadius: 5, background: "rgba(255,255,255,0.04)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Inter'", fontWeight: 800, fontSize: 7, color: "rgba(255,255,255,0.25)", flexShrink: 0 }}>{(pos.coin || "?")[0]}</div>
                          )}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontFamily: "'Inter'", fontSize: 9, fontWeight: 700, color: "#fff" }}>{pos.coin}</div>
                            <div style={{ fontFamily: "'JetBrains Mono'", fontSize: 7, color: "rgba(255,255,255,0.2)" }}>{pos.tokenAmount ? `${pos.tokenAmount.toLocaleString()} tkns` : `${pos.amount.toFixed(3)} SOL`}</div>
                          </div>
                          <span style={{ fontFamily: "'JetBrains Mono'", fontSize: 9, fontWeight: 700, color: pp >= 0 ? "#00ff88" : "#ff4444" }}>{pp >= 0 ? "+" : ""}{pp.toFixed(1)}%</span>
                          <button onClick={() => handleSell(pos.mint)} style={{ padding: "2px 5px", borderRadius: 4, border: "1px solid rgba(255,68,68,0.12)", background: "rgba(255,68,68,0.04)", color: "#ff4444", fontFamily: "'Inter'", fontWeight: 700, fontSize: 7, cursor: "pointer" }}>Sell</button>
                        </div>
                      );
                    }) : (
                      <div style={{ fontFamily: "'Inter'", fontSize: 9, color: "rgba(255,255,255,0.15)", textAlign: "center", padding: 16 }}>No positions yet</div>
                    )}
                  </>)}

                  {miniTab === "fund" && (() => {
                    const addr = _wallets?.[0]?.address || getWalletAddress() || "";
                    const shortAddr = addr ? `${addr.slice(0, 5)}...${addr.slice(-4)}` : "—";
                    const deficit = lowBal ? Math.max(0, usdToSol(quickBuyUSD || 5, solPrice) - walletBalance) : 0;
                    return (<>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                        <span style={{ fontFamily: "'JetBrains Mono'", fontSize: 7, fontWeight: 700, color: "rgba(0,212,255,0.7)", letterSpacing: 0.8 }}>FUND WALLET</span>
                        <button onClick={() => setMiniTab("trade")} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, lineHeight: 0 }}><Icon d={Icons.x} size={9} color="#555" /></button>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
                        <div>
                          <span style={{ fontFamily: "'JetBrains Mono'", fontSize: 15, fontWeight: 800, color: "#fff" }}>{walletBalance.toFixed(4)}</span>
                          <span style={{ fontFamily: "'JetBrains Mono'", fontSize: 8, color: "rgba(255,255,255,0.3)", marginLeft: 3 }}>SOL</span>
                        </div>
                        {lowBal && <span style={{ fontFamily: "'JetBrains Mono'", fontSize: 7, fontWeight: 700, color: "#ffaa00", padding: "1px 4px", borderRadius: 3, background: "rgba(255,170,0,0.08)", border: "1px solid rgba(255,170,0,0.15)" }}>NEED</span>}
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                        <span style={{ fontFamily: "'JetBrains Mono'", fontSize: 8, color: "rgba(255,255,255,0.25)" }}>${(walletBalance * solPrice).toFixed(2)} USD</span>
                        {lowBal && <span style={{ fontFamily: "'JetBrains Mono'", fontSize: 8, color: "#ffaa00" }}>+{deficit.toFixed(4)} SOL</span>}
                      </div>
                      {/* Address row */}
                      <div onClick={() => { if (!addr) return; navigator.clipboard.writeText(addr); setAddrCopied(true); setTimeout(() => setAddrCopied(false), 1500); }} style={{
                        display: "flex", alignItems: "center", gap: 4, padding: "5px 6px", borderRadius: 6,
                        background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)",
                        cursor: "pointer", marginBottom: 8, transition: "all 0.15s",
                      }}>
                        <Icon d={Icons.wallet} size={9} color="rgba(255,255,255,0.2)" />
                        <span style={{ fontFamily: "'JetBrains Mono'", fontSize: 8, color: "rgba(255,255,255,0.35)", flex: 1 }}>{shortAddr}</span>
                        <span style={{ fontFamily: "'Inter'", fontSize: 7, fontWeight: 600, color: addrCopied ? "#00ff88" : "rgba(255,255,255,0.2)" }}>{addrCopied ? "Copied!" : ""}</span>
                        <Icon d={addrCopied ? Icons.check : Icons.copy} size={8} color={addrCopied ? "#00ff88" : "rgba(255,255,255,0.15)"} />
                      </div>
                      {/* Action buttons */}
                      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                        <button onClick={async () => {
                          const provider = window.phantom?.solana;
                          if (!provider) { window.open("https://phantom.app/", "_blank"); return; }
                          try {
                            setFundStatus("pending");
                            const resp = await provider.connect();
                            const fromPubkey = resp.publicKey;
                            const toPubkey = new PublicKey(addr);
                            const lamports = deficit > 0 ? Math.ceil((deficit + 0.005) * LAMPORTS_PER_SOL) : Math.ceil(0.05 * LAMPORTS_PER_SOL);
                            const connection = new Connection("https://api.mainnet-beta.solana.com");
                            const { blockhash } = await connection.getLatestBlockhash();
                            const tx = new Transaction().add(SystemProgram.transfer({ fromPubkey, toPubkey, lamports }));
                            tx.feePayer = fromPubkey;
                            tx.recentBlockhash = blockhash;
                            const { signature } = await provider.signAndSendTransaction(tx);
                            setFundStatus("sent");
                            setChatMessages(p => [...p, { user: "trench.fm", msg: `Funding TX sent! ${(lamports / LAMPORTS_PER_SOL).toFixed(4)} SOL incoming` }]);
                            setTimeout(() => { setFundStatus(null); getWalletBalance(_wallets?.[0]?.address || getWalletAddress()).then(b => { if (typeof b === "number") setWalletBalance(b); }); }, 8000);
                          } catch (e) {
                            setFundStatus(e.message?.includes("User rejected") ? null : "error");
                            if (fundStatus === "error") setTimeout(() => setFundStatus(null), 3000);
                          }
                        }} style={{
                          width: "100%", padding: "6px 0", borderRadius: 6, border: "none", cursor: "pointer",
                          background: fundStatus === "sent" ? "linear-gradient(135deg,#00ff88,#00cc66)" : fundStatus === "error" ? "linear-gradient(135deg,#ff4444,#cc2222)" : "linear-gradient(135deg,#7B61FF,#6246ea)", color: "#fff",
                          fontFamily: "'Inter'", fontSize: 9, fontWeight: 700, letterSpacing: -0.3,
                          display: "flex", alignItems: "center", justifyContent: "center", gap: 4,
                          boxShadow: "0 0 12px rgba(123,97,255,0.25), 0 2px 4px rgba(0,0,0,0.3)",
                          opacity: fundStatus === "pending" ? 0.7 : 1, transition: "all 0.2s",
                        }}>
                          {fundStatus === "pending" ? (<><div style={{ width: 10, height: 10, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 0.6s linear infinite" }} />Confirm in Phantom...</>) : fundStatus === "sent" ? (<><Icon d={Icons.check} size={10} color="#fff" />Sent!</>) : fundStatus === "error" ? "Failed — try again" : (<><span style={{ fontSize: 11 }}>👻</span> Fund via Phantom</>)}
                        </button>
                        <button onClick={() => { if (addr) window.open(`https://solscan.io/account/${addr}`, "_blank"); }} style={{
                          width: "100%", padding: "5px 0", borderRadius: 6, cursor: "pointer",
                          background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)",
                          color: "rgba(255,255,255,0.35)", fontFamily: "'Inter'", fontSize: 8, fontWeight: 600,
                          display: "flex", alignItems: "center", justifyContent: "center", gap: 3,
                        }}>
                          View on Solscan
                          <svg width="6" height="6" viewBox="0 0 6 6"><path d="M1 5L5 1M5 1H2M5 1v3" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="0.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
                        </button>
                      </div>
                    </>);
                  })()}
                </div>
              </div>

              {/* Tab bar — always visible shell (Game Boy D-pad) */}
              <div style={{
                display: "flex", height: 30,
                borderTop: "1px solid rgba(255,255,255,0.04)",
                background: "linear-gradient(180deg, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.18) 100%)",
                position: "relative",
              }}>
                {[
                  { id: "home", icon: Icons.trophy, label: "Top", accent: "#ffb800", glow: "rgba(255,184,0,0.5)" },
                  { id: "trade", icon: Icons.zap, label: "Trade", center: true, accent: "#00d4ff", glow: "rgba(0,212,255,0.5)" },
                  { id: "bag", icon: Icons.wallet, label: miniTab === "fund" ? "Fund" : "Bag", accent: miniTab === "fund" ? "#00d4ff" : "#c68642", glow: miniTab === "fund" ? "rgba(0,212,255,0.5)" : "rgba(198,134,66,0.5)" },
                ].map(t => {
                  const active = miniTab === t.id || (t.id === "bag" && miniTab === "fund");
                  const lit = active && miniOpen; // only "lit up" when open
                  return (
                    <button key={t.id} onClick={() => { if (t.id === "bag" && miniTab === "fund" && miniOpen) { setMiniTab("bag"); } else if (active && miniOpen) { setMiniOpen(false); } else { setMiniTab(t.id || "home"); setMiniOpen(true); } }} style={{
                      flex: 1, border: "none", cursor: "pointer", padding: 0,
                      background: lit ? `${t.accent}08` : "transparent",
                      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 0,
                      transition: "all 0.2s", position: "relative",
                    }}>
                      {/* Active indicator line — only when console is open */}
                      {lit && <div style={{ position: "absolute", top: 0, left: "20%", right: "20%", height: 2, borderRadius: 1, background: t.accent, boxShadow: `0 0 8px ${t.glow}`, transition: "all 0.2s" }} />}
                      {/* Expand chevron on active tab when collapsed */}
                      {active && !miniOpen && (
                        <svg width="10" height="5" viewBox="0 0 10 5" style={{ marginBottom: -1, animation: "gentleBounce 2s ease-in-out infinite" }}>
                          <path d="M1 4.5 L5 1 L9 4.5" fill="none" stroke={t.accent} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.7" />
                        </svg>
                      )}
                      {t.center ? (
                        <div style={{
                          width: 24, height: 16, borderRadius: 5,
                          background: lit ? `linear-gradient(135deg, ${t.accent}, ${t.accent}88)` : "rgba(255,255,255,0.04)",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          boxShadow: lit ? `0 0 12px ${t.glow}` : "none",
                          border: lit ? "none" : "1px solid rgba(255,255,255,0.06)",
                          transition: "all 0.2s",
                        }}>
                          <Icon d={t.icon} size={10} color={lit ? "#fff" : "rgba(255,255,255,0.25)"} />
                        </div>
                      ) : (
                        <Icon d={t.icon} size={11} color={lit ? t.accent : "rgba(255,255,255,0.15)"} style={lit ? { filter: `drop-shadow(0 0 4px ${t.glow})` } : {}} />
                      )}
                      <span style={{
                        fontFamily: "'Inter'", fontSize: 6, fontWeight: lit ? 700 : 500,
                        color: lit ? t.accent : "rgba(255,255,255,0.15)",
                        letterSpacing: 0.3, transition: "all 0.15s",
                      }}>{t.label}</span>
                    </button>
                  );
                })}
              </div>

            </div>
          </div>
        </div>
        );
      })()}
      {/* ═══ REACTION BURSTS ═══ */}
      {reactionBursts.map(b => (
        <div key={b.id} style={{ position: "absolute", bottom: 80, left: `${b.x}%`, zIndex: 20, animation: "floatUp 2s ease-out forwards", pointerEvents: "none" }}>
          <Icon d={b.emoji === "🚀" ? Icons.rocket : Icons.skull} size={22} color={b.emoji === "🚀" ? "#00ff88" : "#ff4444"} />
        </div>
      ))}

      {/* Announcement overlay removed — jumbotron intro IS the announcement */}
    </div>
  );
}
