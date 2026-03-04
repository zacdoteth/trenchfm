import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import * as THREE from "three";
import GUI from "lil-gui";

// ═══════════════════════════════════════════════════════
// trench.fm — Teleport Edition + Live Chart
// Beam in/out VFX + Price chart on call
// ═══════════════════════════════════════════════════════

const CHAR_COUNT = 400;
const ROOM_RADIUS = 26;
const PODIUM_RADIUS = 3.2;
const INNER_RING = 5.5;

const PFP_NAMES = ["AzFlin","biz","ferengi","frostyflakes","icobeast","jin","phanes","pupul","rekt","rob","shinkiro14","skely","Tintin","ultra","vn","zac"];
const NAMES = PFP_NAMES;
const CHAT_MSGS = ["LFG 🔥🔥🔥","ser this is the play","already 10x'd","wen moon??","chart looking bullish af","SEND IT 🚀","ngmi","ape in","few","this is it","NFA but buying","diamond hands only","already in","massive bags","gm gm","wagmi","just aped 5 SOL","dev is based","easy 100x","we're so early","floor is in","🚀🚀🚀","HODL","zoom out"];
const COINS = [
  { ticker: "$BONK", ca: "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263", mcap: "$1.2B", fdv: "$1.8B", liq: "$24.5M", vol: "$89.2M", change: "+12.4%", positive: true, price: "0.00002847", supply: "56.2T", created: "2 yr ago", launchpad: "Bonk", holders: 835200 },
  { ticker: "$WIF", ca: "EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm", mcap: "$890M", fdv: "$890M", liq: "$18.3M", vol: "$52.1M", change: "+8.7%", positive: true, price: "2.34", supply: "998M", created: "1 yr ago", launchpad: "Meteora", holders: 218400 },
  { ticker: "$POPCAT", ca: "7GCihgDB8fe6KNjn2MYtkzZcRjQy3t9GHdC8uHYmW2hr", mcap: "$540M", fdv: "$540M", liq: "$8.9M", vol: "$41.8M", change: "+31.2%", positive: true, price: "0.89", supply: "979M", created: "11 mo", launchpad: "Pump.fun", holders: 142800 },
  { ticker: "$JITO", ca: "J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn", mcap: "$2.1B", fdv: "$2.9B", liq: "$35.1M", vol: "$127M", vol: "$127M", change: "-3.2%", positive: false, price: "3.12", supply: "1B", created: "1.5 yr", launchpad: "—", holders: 94300 },
];

// ═══ SVG ICONS (inline, no emoji) ═══
const Icon = ({ d, size = 14, color = "currentColor", style = {} }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: "inline-block", verticalAlign: "middle", flexShrink: 0, ...style }}>
    <path d={d} />
  </svg>
);
const Icons = {
  mic: "M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3zM19 10v2a7 7 0 0 1-14 0v-2M12 19v4M8 23h8",
  rocket: "M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09zM12 15l-3-3M22 2l-7.5 7.5M9.5 2A18.4 18.4 0 0 0 2 9.5l4.5 4.5 8-8L19 2z",
  skull: "M9 12h.01M15 12h.01M12 2a8 8 0 0 0-8 8c0 3.2 1.9 6 4.6 7.3.3.1.4.4.4.7v2h6v-2c0-.3.2-.6.4-.7A8 8 0 0 0 12 2zM10 22v-2M14 22v-2",
  zap: "M13 2L3 14h9l-1 8 10-12h-9l1-8z",
  copy: "M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2M9 2h6v4H9z",
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
function generateAllTimeframes(positive) {
  return { "1m": generateChart(positive, 48), "5m": generateChart(positive, 60), "1h": generateChart(positive, 36) };
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
        name:PFP_NAMES[i % PFP_NAMES.length],visible:true});
    }
  }
  return chars;
}

// ═══ MINI CHART COMPONENT ═══
function MiniChart({ data, positive, width = 280, height = 50 }) {
  const canvasRef = useRef(null);
  useEffect(() => {
    const c = canvasRef.current; if (!c) return;
    const ctx = c.getContext("2d");
    const dpr = Math.min(window.devicePixelRatio, 2);
    c.width = width * dpr; c.height = height * dpr;
    c.style.width = width + "px"; c.style.height = height + "px";
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, height);

    const min = Math.min(...data), max = Math.max(...data);
    const range = max - min || 1;
    const pts = data.map((v, i) => ({
      x: (i / (data.length - 1)) * width,
      y: height - ((v - min) / range) * (height - 6) - 3,
    }));

    // Gradient fill
    const grad = ctx.createLinearGradient(0, 0, 0, height);
    if (positive) {
      grad.addColorStop(0, "rgba(0,255,136,0.25)");
      grad.addColorStop(1, "rgba(0,255,136,0.0)");
    } else {
      grad.addColorStop(0, "rgba(255,68,68,0.25)");
      grad.addColorStop(1, "rgba(255,68,68,0.0)");
    }

    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) {
      const xc = (pts[i - 1].x + pts[i].x) / 2;
      const yc = (pts[i - 1].y + pts[i].y) / 2;
      ctx.quadraticCurveTo(pts[i - 1].x, pts[i - 1].y, xc, yc);
    }
    ctx.quadraticCurveTo(pts[pts.length - 2].x, pts[pts.length - 2].y, pts[pts.length - 1].x, pts[pts.length - 1].y);

    // Fill under curve
    ctx.lineTo(width, height);
    ctx.lineTo(0, height);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();

    // Stroke line
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) {
      const xc = (pts[i - 1].x + pts[i].x) / 2;
      const yc = (pts[i - 1].y + pts[i].y) / 2;
      ctx.quadraticCurveTo(pts[i - 1].x, pts[i - 1].y, xc, yc);
    }
    ctx.quadraticCurveTo(pts[pts.length - 2].x, pts[pts.length - 2].y, pts[pts.length - 1].x, pts[pts.length - 1].y);
    ctx.strokeStyle = positive ? "#00ff88" : "#ff4444";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Current price dot
    const last = pts[pts.length - 1];
    ctx.beginPath();
    ctx.arc(last.x, last.y, 3, 0, Math.PI * 2);
    ctx.fillStyle = positive ? "#00ff88" : "#ff4444";
    ctx.fill();

    // Glow on dot
    ctx.beginPath();
    ctx.arc(last.x, last.y, 6, 0, Math.PI * 2);
    ctx.fillStyle = positive ? "rgba(0,255,136,0.3)" : "rgba(255,68,68,0.3)";
    ctx.fill();
  }, [data, positive, width, height]);

  return <canvas ref={canvasRef} style={{ width, height, display: "block" }} />;
}

export default function PodiumTeleport() {
  const mountRef = useRef(null);
  const stateRef = useRef({
    chars: generateChars(CHAR_COUNT), speaker: null,
    teleportPhase: "idle", // idle, beam_out, beam_in, active, beam_return
    teleportTimer: 0, teleportCharIdx: null, prevSpeaker: null,
    cameraAngle: 0, cameraHeight: 5, cameraDist: 24, autoRotate: true, spinVelocity: 0, clock: 0,
    // Jumbotron debug params (live-tunable via GUI)
    jmboY: 9, jmboScale: 0.5, jmboRotSpeed: 0.0,
    // Speaker params
    speakerScale: 2.2, speakerY: 1.2,
    // Jumbotron intro animation (Mario Party style)
    jmboIntroTimer: 0, jmboIntroName: "", jmboIntroTicker: "", jmboIntroCharIdx: -1,
    // Dome / sky (Anadol)
    domeHueShift: 0.62, domeSpeed: 0.2, domeIntensity: 1.0, domeBottomHalf: true,
    // Top calls leaderboard — prefilled for demo
    topCallsToday: [
      { ticker: "$BONK", change: "+4.2x", caller: "whale_alert", followers: "127K", timeAgo: "12m ago", fdv: "$1.8B", price: "0.00002847" },
      { ticker: "$WIF", change: "+2.8x", caller: "alpha_leak", followers: "45.2K", timeAgo: "28m ago", fdv: "$890M", price: "2.34" },
      { ticker: "$POPCAT", change: "+1.6x", caller: "chad_caller", followers: "33.1K", timeAgo: "41m ago", fdv: "$540M", price: "0.89" },
    ],
  });
  const rendererRef = useRef(null);
  const frameRef = useRef(null);
  const threeRef = useRef(null);

  const [chatMessages, setChatMessages] = useState([
    { user: "whale_alert", msg: "room is PACKED tonight 🔥" },
    { user: "alpha_leak", msg: "who's stepping up?" },
    { user: "diamond_hand", msg: "gm degens" },
  ]);
  const [chatInput, setChatInput] = useState("");
  const [liveCount, setLiveCount] = useState(CHAR_COUNT + 47);
  const [speakerInfo, setSpeakerInfo] = useState(null);
  const [chartData, setChartData] = useState(null);
  const [chartTimeframe, setChartTimeframe] = useState("1m"); // "1m","5m","1h"
  const chartTFDataRef = useRef({}); // { "1m": [...], "5m": [...], "1h": [...] }
  const chartTFRef = useRef("1m");
  const [votes, setVotes] = useState({ up: 0, down: 0 });
  const [userVoted, setUserVoted] = useState(null);
  const [teleportVFX, setTeleportVFX] = useState(null);
  const chatEndRef = useRef(null);
  const touchRef = useRef({ active: false, startX: 0, startY: 0, sa: 0, sh: 0, lastX: 0, lastY: 0, lastTime: 0, velX: 0, velY: 0 });
  const fpsBuf = useRef([]);
  const pfpImgsRef = useRef([]); // PFP images for announcements
  // Refs for jumbotron (animate loop needs current values)
  const chartDataRef = useRef(null);
  const speakerInfoRef = useRef(null);
  const votesRef = useRef({ up: 0, down: 0 });

  // Thesis modal
  const [showStepUpModal, setShowStepUpModal] = useState(false);
  const [stepUpCA, setStepUpCA] = useState("");
  const [stepUpThesis, setStepUpThesis] = useState("");
  // Buy sheet
  const [showBuySheet, setShowBuySheet] = useState(false);
  const [buyAmount, setBuyAmount] = useState("");
  const [walletBalance] = useState(2.4);
  // Queue — pre-seeded with 3 callers for demo rotation
  const [queue, setQueue] = useState([
    { name: "whale_alert", coin: COINS[1], thesis: "WIF is the cultural play. Disney of crypto. Every normie recognizes a dog in a hat. Easy 5x before EOY." },
    { name: "alpha_leak", coin: COINS[2], thesis: "POPCAT just got listed on Bybit. Volume is insane. Cat meta is back and this leads the pack. Loading." },
    { name: "chad_caller", coin: COINS[3], thesis: "JITO staking yields are mooning. Only liquid staking play on Solana with real revenue. Institutional grade." },
  ]);
  // Activity feed
  const [activityFeed, setActivityFeed] = useState([
    { user: "sol_maxi", action: "bought", amount: "$200", coin: "$BONK" },
    { user: "whale_alert", action: "up", amount: "340%", coin: "$WIF" },
    { user: "diamond_hand", action: "bought", amount: "$1.2K", coin: "$WIF" },
  ]);
  // Positions
  const [userPositions, setUserPositions] = useState([]);
  // Fee tracking — the flywheel (1% total, 50% back to caller)
  // Believe does 50-70% to creator. Bags does 50%. We do 50%.
  // Terminals (BullX/Axiom/Photon) give 0% — we're the anti-terminal.
  const FEE_TOTAL = 0.01;     // 1% total fee on every trade
  const FEE_CALLER = 0.005;   // 0.5% → Caller (50% of fees — the flywheel)
  const FEE_PLATFORM = 0.004; // 0.4% → trench.fm
  const FEE_TREASURY = 0.001; // 0.1% → Protocol treasury / referrals
  const [callerEarnings, setCallerEarnings] = useState({}); // { callerName: totalUSD }
  const [platformRevenue, setPlatformRevenue] = useState(0);
  const [callVolume, setCallVolume] = useState(0); // total volume through buy button
  // Speaker card expand + tabs
  const [cardExpanded, setCardExpanded] = useState(false);
  const [expandedTab, setExpandedTab] = useState("holders"); // "holders" | "traders" | "trades"
  // Privacy mode — hide your wallet from public trades feed
  const [privacyMode, setPrivacyMode] = useState(false);
  // Speaker screen position for 3D speech bubble
  const [speakerScreenPos, setSpeakerScreenPos] = useState(null);
  const [bubbleExpanded, setBubbleExpanded] = useState(false);
  const [typewriterIdx, setTypewriterIdx] = useState(0); // chars revealed so far
  const [typewriterDone, setTypewriterDone] = useState(false); // fully typed + collapsed
  const typewriterRef = useRef(null); // interval handle
  const [caCopied, setCaCopied] = useState(false);
  const copyCA = useCallback((e) => {
    e.stopPropagation();
    if (!speakerInfo) return;
    navigator.clipboard.writeText(speakerInfo.coin.ca).catch(() => {});
    setCaCopied(true);
    setTimeout(() => setCaCopied(false), 1500);
  }, [speakerInfo]);
  // Reactions
  const [reactionBursts, setReactionBursts] = useState([]);
  const reactionTimerRef = useRef({ count: 0, lastReset: Date.now() });
  // Announcement overlay
  // Announcement overlay removed — jumbotron intro IS the announcement (Miyamoto principle)

  useEffect(() => {
    const i = setInterval(() => {
      const c = stateRef.current.chars[Math.floor(Math.random() * CHAR_COUNT)];
      setChatMessages(p => [...p.slice(-25), { user: c.name, msg: CHAT_MSGS[Math.floor(Math.random() * CHAT_MSGS.length)] }]);
    }, 2200 + Math.random() * 2000);
    return () => clearInterval(i);
  }, []);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [chatMessages]);
  useEffect(() => { const i = setInterval(() => setLiveCount(p => p + Math.floor(Math.random() * 7) - 3), 4000); return () => clearInterval(i); }, []);
  useEffect(() => {
    if (!speakerInfo) return;
    const i = setInterval(() => {
      const u = Math.random() > 0.3;
      const upAdd = u ? Math.ceil(Math.random() * 3) : 0;
      const downAdd = !u ? 1 : 0;
      setVotes(p => ({ up: p.up + upAdd, down: p.down + downAdd }));
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
  }, [speakerInfo]);

  // Sync refs for jumbotron (animate loop reads these)
  useEffect(() => { chartDataRef.current = chartData; }, [chartData]);
  useEffect(() => {
    speakerInfoRef.current = speakerInfo;
    setBubbleExpanded(false);
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
  const callerEarningsRef = useRef({});
  useEffect(() => { callerEarningsRef.current = callerEarnings; }, [callerEarnings]);
  const buyFlashRef = useRef(0); // time of last buy (for green flash VFX)
  const [floatingEmojis, setFloatingEmojis] = useState([]); // buy celebration particles

  // Activity feed - mock events + fee flywheel simulation
  useEffect(() => {
    const i = setInterval(() => {
      const name = NAMES[Math.floor(Math.random() * NAMES.length)];
      const coin = COINS[Math.floor(Math.random() * COINS.length)];
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

  // Auto-trigger first caller on mount after a brief delay
  const hasAutoStarted = useRef(false);
  useEffect(() => {
    if (hasAutoStarted.current) return;
    hasAutoStarted.current = true;
    const timer = setTimeout(() => {
      // Kick off the first caller automatically
      const st = stateRef.current;
      const firstCoin = COINS[0];
      const idx = Math.floor(Math.random() * st.chars.length);
      const c = st.chars[idx];
      st.teleportCharIdx = idx;
      st.teleportPhase = "beam_out";
      st.teleportTimer = 0;
      setTeleportVFX("out");
      const txStats = { buys: 212, sells: 87, buyVol: "35.6", sellVol: "12.4", holders: 1855, topHolding: "27.8" };
      const charName = c.name;
      setSpeakerInfo({ name: charName, coin: firstCoin, idx, thesis: "Bonk just flipped Myro. Dev shipping daily. Binance listing rumored. Easy 3x from here.", txStats, followers: "127K" });
      setCardExpanded(false);
      { const tfd = generateAllTimeframes(firstCoin.positive); chartTFDataRef.current = tfd; setChartData(tfd[chartTimeframe]); }
      setVotes({ up: 24, down: 3 });
      // Jumbotron IS the announcement — start intro during teleport
      st.jmboIntroTimer = 6.0;
      st.jmboIntroName = charName;
      st.jmboIntroTicker = firstCoin.ticker;
      st.jmboIntroCharIdx = idx;
      setChatMessages(p => [...p, { user: "trench.fm", msg: `⚡ ${charName} is teleporting to the stage...` }]);
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

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
      const idx = Math.floor(Math.random() * st.chars.length);
      const c = st.chars[idx];
      st.teleportCharIdx = idx;
      st.teleportPhase = "beam_out";
      st.teleportTimer = 0;
      setTeleportVFX("out");
      const txStats = { buys: Math.floor(80 + Math.random() * 200), sells: Math.floor(30 + Math.random() * 120), buyVol: (Math.random() * 80 + 10).toFixed(1), sellVol: (Math.random() * 50 + 5).toFixed(1), holders: Math.floor(500 + Math.random() * 3000), topHolding: (15 + Math.random() * 20).toFixed(1) };
      const followers = ["12.5K", "45.2K", "127K", "892K", "33.1K", "8.4K"][Math.floor(Math.random() * 6)];
      setSpeakerInfo({ name: next.name || c.name, coin: next.coin, idx, thesis: next.thesis, txStats, followers });
      setCardExpanded(false);
      { const tfd = generateAllTimeframes(next.coin.positive); chartTFDataRef.current = tfd; setChartData(tfd[chartTimeframe]); }
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
      const w = container.clientWidth, h = container.clientHeight;
      const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: "high-performance" });
      renderer.setSize(w, h); renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setClearColor(0x0a0008);
      container.appendChild(renderer.domElement); rendererRef.current = renderer;

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(50, w / h, 0.5, 80);

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
            float ph=acos(clamp(vP.y/50.0,-1.0,1.0));
            vec2 p=vec2(th*2.0,ph*3.0);

            // Triple-layer domain warping — deep organic complexity
            float w1=domainWarp(p*0.35,t*0.7,5);
            float w2=domainWarp(p*0.65+vec2(3.3,7.7),t*0.55,4);
            float w3=domainWarp(p*1.1+vec2(11.1,4.4),t*0.9,3);
            float w4=domainWarp(p*0.2+vec2(7.7,13.3),t*0.3,4);
            float comp=(w1*0.35+w2*0.30+w3*0.20+w4*0.15)*0.5+0.5;

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
            float hs=pow(max(0.0,domainWarp(p*0.8+vec2(5.5,2.2),t*0.6,3)*0.5+0.5),3.0);
            col+=vec3(1.0,0.15,0.55)*hs*0.40;
            float hs2=pow(max(0.0,(1.0-comp)*w2*0.5+0.3),2.5);
            col+=vec3(0.1,0.75,1.0)*hs2*0.12;
            float limeBloom=pow(max(0.0,w4*0.5+0.5),4.0);
            col+=vec3(0.2,1.0,0.08)*limeBloom*0.10;

            // ═══ SHADOWS — rich deep purple (never flat black) ═══
            float valley=pow(1.0-comp,2.0);
            col+=vec3(0.08,0.02,0.14)*valley*0.40;

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
            // BRIGHT: dark areas at 0.45 (not black), peaks at full
            float ii=br*(0.45+comp*0.55);

            // ═══ WARM BASE — pink-tinted, never cold black ═══
            vec3 base=vec3(0.04,0.012,0.06)+cosPal(autoHue,
              vec3(0.02,0.008,0.03),vec3(0.015,0.008,0.02),
              vec3(1.0,1.0,1.0),vec3(0.0,0.33,0.67));
            vec3 f=base+col*ii;

            // ═══ NEON BLOOM OVERLAY — extra hot ═══
            f+=vec3(1.0,0.15,0.55)*hs*0.25;
            f+=vec3(0.15,0.7,0.06)*limeBloom*0.06;

            // Bottom hemisphere fade
            float hNorm=vP.y/50.0;
            if(uBottomHalf<0.5){
              float fade=smoothstep(-0.3,0.15,hNorm);
              f*=fade;
            }

            gl_FragColor=vec4(f,1.0);
          }`,
      });
      scene.add(new THREE.Mesh(new THREE.SphereGeometry(50, 32, 32), domeMat));

      // ═══ ANADOL FLOOR — synced with dome hue ═══
      const floorMat = new THREE.ShaderMaterial({
        uniforms: { uTime: { value: 0 }, uHue: { value: 0 }, uSpd: { value: 0.2 } },
        vertexShader: `varying vec3 vP;void main(){vP=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
        fragmentShader: `uniform float uTime;uniform float uHue;uniform float uSpd;varying vec3 vP;${ANADOL_GLSL}
          void main(){float t=uTime*uSpd;float ah=uHue+t*0.0083;vec2 p=vP.xz*0.06;
          float w1=domainWarp(p*0.5,t*0.6,3);float w2=domainWarp(p*0.8+vec2(3.0,7.0),t*0.5,3);
          float s=(w1*0.6+w2*0.4)*0.5+0.5;
          // Neon Anadol floor — BRIGHT pink/cyan/lime matching dome
          vec3 c=cosPal(s+ah,vec3(0.35,0.06,0.28),vec3(0.50,0.10,0.40),vec3(0.8,0.4,0.9),vec3(ah*0.3,0.08,0.15+ah*0.2));
          vec3 c2=cosPal(w2*0.5+0.5+ah,vec3(0.04,0.20,0.32),vec3(0.12,0.50,0.55),vec3(0.7,0.9,0.8),vec3(0.7+ah*0.2,0.25,0.05));
          c=mix(c,c2,smoothstep(0.3,0.7,w1*0.5+0.5));
          // Lime accent in bright floor areas
          float limeMask=pow(s,3.0);
          vec3 lime=cosPal(w1*0.5+0.5+ah,vec3(0.03,0.20,0.03),vec3(0.10,0.55,0.08),vec3(0.5,1.0,0.4),vec3(0.0,0.33+ah*0.2,0.67));
          c+=lime*limeMask*0.18;
          float d=length(vP.xz);float pg=smoothstep(10.0,1.0,d)*0.7;float ef=smoothstep(35.0,8.0,d);
          float r=(s*0.55+0.20)+pg;r*=ef;
          // Neon grid lines — hot pink
          float gx=smoothstep(0.03,0.0,abs(fract(vP.x*0.5)-0.5));
          float gz=smoothstep(0.03,0.0,abs(fract(vP.z*0.5)-0.5));
          float g=max(gx,gz)*0.06*ef;
          vec3 gridCol=vec3(1.0,0.1,0.5)*g;
          // Breathing sync
          float flBr=0.92+sin(uTime*uSpd*0.55)*0.08;
          vec3 b=vec3(0.02,0.008,0.035);gl_FragColor=vec4(b+c*r*flBr+gridCol,1.0);}`,
      });
      const fg = new THREE.CircleGeometry(ROOM_RADIUS + 5, 48); fg.rotateX(-Math.PI / 2);
      scene.add(new THREE.Mesh(fg, floorMat));

      // Walls removed — dome sphere covers everything beautifully
      const wallMat = { uniforms: { uTime: { value: 0 }, uHue: { value: 0 }, uSpd: { value: 0 } } }; // stub for refs

      // ═══ PODIUM — full Anadol treatment ═══
      const podiumMat = new THREE.ShaderMaterial({
        uniforms: { uTime: { value: 0 }, uHue: { value: 0 }, uSpd: { value: 0.2 } },
        transparent: true,
        vertexShader: `varying vec3 vW;varying vec3 vN;void main(){vW=(modelMatrix*vec4(position,1.0)).xyz;vN=normalize(normalMatrix*normal);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
        fragmentShader: `uniform float uTime;uniform float uHue;uniform float uSpd;varying vec3 vW;varying vec3 vN;${ANADOL_GLSL}
          void main(){float t=uTime*uSpd;float ah=uHue+t*0.0083;
          float a=atan(vW.x,vW.z);float h=vW.y;
          vec2 p=vec2(a*4.0,h*3.0);
          float w1=domainWarp(p*1.0,t*1.0,4);float w2=domainWarp(p*1.5+vec2(2.0,5.0),t*0.7,3);
          float s=(w1*0.6+w2*0.4)*0.5+0.5;
          // Neon Anadol podium — hottest version of the palette (stage is the focal point)
          vec3 c=cosPal(s+ah,vec3(0.12,0.01,0.10),vec3(0.85,0.12,0.55),vec3(0.8,0.4,0.9),vec3(ah*0.3,0.08,0.15+ah*0.2));
          vec3 c2=cosPal(w2*0.5+0.5+ah,vec3(0.01,0.08,0.16),vec3(0.10,0.65,0.70),vec3(0.7,0.9,0.8),vec3(0.7+ah*0.2,0.25,0.05));
          c=mix(c,c2,smoothstep(0.3,0.7,w1*0.5+0.5));
          // Neon lime tendrils on podium surface
          float limePod=pow(max(0.0,domainWarp(p*2.0+vec2(4.0,6.0),t*0.8,3)*0.5+0.5),3.0);
          c+=vec3(0.12,0.85,0.06)*limePod*0.18;
          // Bright top surface — neon glow platform
          float topGlow=smoothstep(1.0,1.22,h)*1.5;
          float side=(s*0.7+0.2);
          float i=side+topGlow;
          // Micro grain
          float gr=snoise(p*12.0+t*0.5)*0.5+0.5;c*=(0.92+gr*0.16);
          // Neon bloom on top — hot pink with cyan edge
          vec3 bloom=cosPal(ah*2.0+t*0.01,vec3(0.5,0.08,0.4),vec3(0.5,0.25,0.5),vec3(1.0,0.8,1.0),vec3(0.0,0.5,0.2));
          vec3 cyanEdge=vec3(0.0,0.7,1.0)*topGlow*0.15;
          // Breathing
          float podBr=0.88+sin(t*0.55/0.2)*0.12;
          vec3 f=vec3(0.01,0.004,0.02)+c*i*podBr+bloom*topGlow*0.35+cyanEdge;
          gl_FragColor=vec4(f,1.0);}`,
      });
      const podiumMesh = new THREE.Mesh(new THREE.CylinderGeometry(PODIUM_RADIUS, PODIUM_RADIUS + 0.4, 1.2, 24), podiumMat);
      podiumMesh.position.y = 0.6; scene.add(podiumMesh);
      podiumMesh.matrixAutoUpdate = false;
      podiumMesh.updateMatrix();
      // ═══ ANADOL RINGS — glowing shader torus rings ═══
      const ringShader = new THREE.ShaderMaterial({
        uniforms: { uTime: { value: 0 }, uHue: { value: 0 }, uSpd: { value: 0.2 } },
        transparent: true,
        vertexShader: `varying vec3 vW;void main(){vW=(modelMatrix*vec4(position,1.0)).xyz;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
        fragmentShader: `uniform float uTime;uniform float uHue;uniform float uSpd;varying vec3 vW;${ANADOL_GLSL}
          void main(){float t=uTime*uSpd;float ah=uHue+t*0.0083;
          float a=atan(vW.x,vW.z);
          float w1=domainWarp(vec2(a*4.0,t*0.5),t*1.2,3);
          float s=w1*0.5+0.5;
          // Neon ring — alternating pink/cyan pulse
          vec3 c=cosPal(s+ah+t*0.02,vec3(0.12,0.02,0.10),vec3(0.80,0.10,0.50),vec3(0.8,0.4,0.9),vec3(ah*0.3,0.08,0.15+ah*0.2));
          vec3 c2=vec3(0.0,0.7,1.0)*smoothstep(0.4,0.8,s); // cyan accent
          float pulse=0.7+0.3*sin(t*3.0+a*2.0);
          vec3 f=(c+c2*0.3)*pulse*1.4;
          // Lime sparkle on ring
          float limeS=pow(max(0.0,sin(a*8.0+t*4.0)*0.5+0.5),8.0)*0.15;
          f+=vec3(0.1,1.0,0.05)*limeS;
          gl_FragColor=vec4(f,0.9);}`,
      });
      const ringShader2 = ringShader.clone();
      const ringMats = [ringShader, ringShader2];
      [PODIUM_RADIUS + 0.2, PODIUM_RADIUS + 0.8].forEach((r, i) => {
        const ring = new THREE.Mesh(new THREE.TorusGeometry(r, 0.04, 6, 48), ringMats[i]);
        ring.rotation.x = -Math.PI / 2; ring.position.y = 1.22; scene.add(ring);
        ring.matrixAutoUpdate = false;
        ring.updateMatrix();
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
      const topFront = makeScreenFace(faceW, topH, 1024, 480, 0.005);
      const topBack  = makeScreenFace(faceW, topH, 1024, 480, 0.005);
      const topLeft  = makeScreenFace(faceW, topH, 1024, 480, 0.005);
      const topRight = makeScreenFace(faceW, topH, 1024, 480, 0.005);
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
      const frameMat = new THREE.MeshStandardMaterial({ color: 0x0a0a12, metalness: 0.9, roughness: 0.2 });
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
      const PC = 600;
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
      const PFP_FILES = ["AzFlin.jpg","biz.jpg","ferengi.jpg","frostyflakes.jpg","icobeast.jpg","jin.jpg","phanes.jpg","pupul.jpg","rekt.jpg","rob.jpg","shinkiro14.jpg","skely.jpg","Tintin.jpg","ultra.png","vn.jpg","zac.jpg"];
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
      const headGeo = new THREE.InstancedBufferGeometry().copy(new THREE.SphereGeometry(0.34, 16, 16));
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

      threeRef.current = { scene, camera, renderer, spotPink, warm1, warm2, domeMat, floorMat, wallMat,
        bodies, heads, pfps, aL, aR, lL, lR, sg, sal, sar, sb,
        beam, beamMat, burst, burstMat, tpParts, tpMat, tpPos, tpVel,
        ppArr, ppLife, ppGeo, pp2Arr, pp2Life, pp2Geo,
        bodyMat, armMat, legMat,
        jmboGroup, jmboFaces, jmboBotFaces, jmboTopFaces,
        lasers, laserGroup, podiumMat, ringMats };

      // ═══ DEBUG GUI — only visible with ?debug in URL ═══
      const showDebug = window.location.search.includes("debug");
      if (showDebug) {
        const gui = new GUI({ title: "Stage Controls" });
        gui.domElement.style.position = "absolute";
        gui.domElement.style.top = "40px";
        gui.domElement.style.right = "4px";
        gui.domElement.style.zIndex = "100";
        const st2 = stateRef.current;
        const guiObj = {
          JmboY: st2.jmboY, JmboScale: st2.jmboScale, JmboSpin: st2.jmboRotSpeed || 0,
          CamH: st2.cameraHeight, CamD: st2.cameraDist,
          SpeakerScale: st2.speakerScale || 1.8, SpeakerY: st2.speakerY || 1.2,
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
        sf.add(guiObj, "SpeakerY", 0.5, 3, 0.1).onChange(v => { stateRef.current.speakerY = v; });
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
      let last = performance.now();

      function animate() {
        frameRef.current = requestAnimationFrame(animate);
        const now = performance.now(); const dt = Math.min((now - last) / 1000, 0.05); last = now;
        const st = stateRef.current; st.clock += dt; const t = st.clock;

        fpsBuf.current.push(now);
        while (fpsBuf.current.length > 0 && now - fpsBuf.current[0] > 1000) fpsBuf.current.shift();

        // Spin physics — zen mode: smooth momentum, capped speed, gentle friction
        const MAX_SPIN = 0.04; // max radians/frame — prevents wild spinning
        if (!touchRef.current.active) {
          if (Math.abs(st.spinVelocity) > 0.0001) {
            // Clamp spin speed for zen feel
            st.spinVelocity = Math.max(-MAX_SPIN, Math.min(MAX_SPIN, st.spinVelocity));
            st.cameraAngle += st.spinVelocity;
            // Smooth exponential decay — like a well-oiled turntable
            st.spinVelocity *= 0.975;
          } else if (st.autoRotate) {
            st.cameraAngle += dt * 0.06;
          } else if (Math.abs(st.spinVelocity) <= 0.0001) {
            st.autoRotate = true;
          }
        }
        camera.position.x = Math.sin(st.cameraAngle) * st.cameraDist;
        camera.position.z = Math.cos(st.cameraAngle) * st.cameraDist;
        camera.position.y = st.cameraHeight; camera.lookAt(0, 3, 0);

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
        // Podium GLSL shader syncs with dome
        if (threeRef.current.podiumMat && threeRef.current.podiumMat.uniforms) {
          threeRef.current.podiumMat.uniforms.uTime.value = t;
          threeRef.current.podiumMat.uniforms.uHue.value = st.domeHueShift;
          threeRef.current.podiumMat.uniforms.uSpd.value = st.domeSpeed;
        }
        // Rings — GLSL shader uniforms
        if (threeRef.current.ringMats) {
          threeRef.current.ringMats.forEach(m => {
            if (m.uniforms) { m.uniforms.uTime.value = t; m.uniforms.uHue.value = st.domeHueShift; m.uniforms.uSpd.value = st.domeSpeed; }
          });
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
          const jY = st.jmboY;
          const jScale = st.jmboScale;
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

          // ═══ RENDER CANVASES AT 5FPS — dot-product cull back-facing faces ═══
          if (Math.floor(t * 5) !== Math.floor((t - dt) * 5)) {
            const cd = chartDataRef.current;
            const si = speakerInfoRef.current;
            const vt = votesRef.current || { up: 0, down: 0 };

            // ── MARIO PARTY INTRO FACE — "degen_ape CALLS $BONK" splash ──
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
                const pos2 = si.coin.positive;
                const priceColor = pos2 ? "#00ff88" : "#ff4444";
                const glowC = pos2 ? "rgba(0,255,136," : "rgba(255,68,68,";
                const pad = 30;

                // ── CHART with axes — fills the main face ──
                const axisR = 80, axisB = 36; // space for Y-axis RIGHT, X-axis bottom
                const cx2 = pad, cy2 = 16, cw2 = W - pad - axisR, ch2 = H - cy2 - axisB;
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

                // ── Timeframe pills (bottom-right) ──
                const tf = chartTFRef.current;
                const pills = ["1m", "5m", "1h"];
                const pillW = 36, pillH = 18, pillGap = 6;
                const pillStartX = W - pad - (pillW + pillGap) * pills.length;
                const pillY = H - 28;
                pills.forEach((p, pi) => {
                  const px = pillStartX + pi * (pillW + pillGap);
                  const active = p === tf;
                  jx.fillStyle = active ? "rgba(255,45,120,0.3)" : "rgba(255,255,255,0.05)";
                  jx.beginPath(); jx.roundRect(px, pillY, pillW, pillH, 4); jx.fill();
                  if (active) { jx.strokeStyle = "#ff2d78"; jx.lineWidth = 1; jx.beginPath(); jx.roundRect(px, pillY, pillW, pillH, 4); jx.stroke(); }
                  jx.font = "bold 11px 'JetBrains Mono', monospace";
                  jx.fillStyle = active ? "#ff2d78" : "#555"; jx.textAlign = "center";
                  jx.fillText(p, px + pillW / 2, pillY + 13);
                });
                jx.textAlign = "left";

              } else {
                // No active call — big logo, chart-area sized
                jx.font = "bold 80px 'Inter', sans-serif";
                jx.fillStyle = "#ff2d78"; jx.textAlign = "center";
                jx.shadowColor = "#ff2d78"; jx.shadowBlur = 40;
                jx.fillText("trench.fm", W / 2, H / 2 - 20);
                jx.shadowBlur = 0;
                jx.font = "400 24px 'Inter', sans-serif";
                jx.fillStyle = "#444";
                jx.fillText("step up to the mic", W / 2, H / 2 + 30);
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
              const fSz = 72; // 2x the ribbon text — JUMBOTRON

              // Title
              jx.font = `bold ${fSz}px 'Inter', sans-serif`;
              jx.fillStyle = "#ff2d78"; jx.textAlign = "center";
              jx.shadowColor = "#ff2d78"; jx.shadowBlur = 20;
              jx.fillText("TOP CALLS TODAY", W / 2, fSz + 10);
              jx.shadowBlur = 0;

              // Divider
              jx.strokeStyle = "rgba(255,45,120,0.4)"; jx.lineWidth = 2;
              jx.beginPath(); jx.moveTo(pad, fSz + 28); jx.lineTo(W - pad, fSz + 28); jx.stroke();

              if (calls.length === 0) {
                jx.font = `500 ${fSz * 0.6 | 0}px 'Inter', sans-serif`;
                jx.fillStyle = "#444"; jx.textAlign = "center";
                jx.fillText("Waiting for calls...", W / 2, H / 2);
                jx.font = `bold ${fSz * 0.5 | 0}px 'JetBrains Mono', monospace`;
                jx.fillStyle = "#00ff88";
                jx.fillText("● LIVE", W / 2, H / 2 + fSz * 0.7);
                jx.textAlign = "left";
                return;
              }

              const startY = fSz + 48;
              const rowH = (H - startY - 10) / 3;
              const medals = ["#FFD700", "#C0C0C0", "#CD7F32"];

              calls.forEach((call, idx) => {
                const rowY = startY + idx * rowH + rowH * 0.55;

                // Alternating row bg
                if (idx % 2 === 0) {
                  jx.fillStyle = "rgba(255,255,255,0.02)";
                  jx.fillRect(0, startY + idx * rowH, W, rowH);
                }

                // SINGLE ROW: #rank $TICKER by caller @ fdv · time · +Xx
                jx.textAlign = "left";
                let lx = pad;

                // Rank medal
                jx.font = `bold ${fSz * 0.7 | 0}px 'JetBrains Mono', monospace`;
                jx.fillStyle = medals[idx] || "#888";
                jx.fillText((idx + 1) + ".", lx, rowY);
                lx += jx.measureText((idx + 1) + ".").width + 10;

                // $TICKER
                jx.font = `bold ${fSz}px 'Inter', sans-serif`;
                jx.fillStyle = "#fff";
                jx.fillText(call.ticker, lx, rowY);
                lx += jx.measureText(call.ticker).width + 14;

                // "by"
                jx.font = `500 ${fSz * 0.45 | 0}px 'Inter', sans-serif`;
                jx.fillStyle = "#666";
                jx.fillText("by", lx, rowY);
                lx += jx.measureText("by").width + 10;

                // Caller name
                jx.font = `bold ${fSz * 0.75 | 0}px 'Inter', sans-serif`;
                jx.fillStyle = "#ff2d78";
                jx.fillText(call.caller, lx, rowY);
                lx += jx.measureText(call.caller).width + 12;

                // @ fdv · time
                jx.font = `500 ${fSz * 0.45 | 0}px 'JetBrains Mono', monospace`;
                jx.fillStyle = "#555";
                jx.fillText("@ " + call.fdv + " · " + call.timeAgo, lx, rowY);

                // Change — far right, neon glow
                const isPos2 = call.change.startsWith("+");
                jx.font = `bold ${fSz}px 'JetBrains Mono', monospace`;
                jx.fillStyle = isPos2 ? "#00ff88" : "#ff4444";
                jx.shadowColor = isPos2 ? "#00ff88" : "#ff4444";
                jx.shadowBlur = 14; jx.textAlign = "right";
                jx.fillText(call.change, W - pad, rowY);
                jx.shadowBlur = 0;

                // Row separator
                if (idx < calls.length - 1) {
                  jx.strokeStyle = "rgba(255,45,120,0.15)"; jx.lineWidth = 1;
                  jx.beginPath(); jx.moveTo(pad, startY + (idx + 1) * rowH); jx.lineTo(W - pad, startY + (idx + 1) * rowH); jx.stroke();
                }
              });
              jx.textAlign = "left";
            }

            // FRONT/BACK = chart, LEFT/RIGHT = leaderboard
            const showIntro = st.jmboIntroTimer > 0;
            [0, 1].forEach(i => {
              const f = T.jmboFaces[i];
              if (showIntro) {
                renderIntroFace(f.ctx, f.canvas.width, f.canvas.height);
              } else {
                renderMainFace(f.ctx, f.canvas.width, f.canvas.height);
              }
              f.tex.needsUpdate = true;
            });
            [2, 3].forEach(i => {
              const f = T.jmboFaces[i];
              if (showIntro) {
                renderIntroFace(f.ctx, f.canvas.width, f.canvas.height);
              } else {
                renderSideFace(f.ctx, f.canvas.width, f.canvas.height);
              }
              f.tex.needsUpdate = true;
            });

            // ── TOP RIBBON: scrolling marquee — PFP $TICKER %chg 🔵caller @foll ──
            function renderTopRibbon(jx, W, H) {
              jx.clearRect(0, 0, W, H);
              jx.fillStyle = "#06021a"; jx.fillRect(0, 0, W, H);
              const edgeG = jx.createLinearGradient(0, H - 6, 0, H);
              edgeG.addColorStop(0, "rgba(255,45,120,0)"); edgeG.addColorStop(1, "rgba(255,45,120,0.35)");
              jx.fillStyle = edgeG; jx.fillRect(0, H - 6, W, 6);

              if (si) {
                const fSz = 90;
                const pfpSize = 90;
                const cpSz = fSz * 0.75;
                const row1Y = H * 0.36;
                const row2Y = H * 0.82;
                const scrollSpeed = 60; // px/sec
                const gap = 120; // space between repeats

                // ── Row 1 draw helper: returns total width ──
                const pfpImg = pfpImgsRef.current[st.jmboIntroCharIdx >= 0 ? st.jmboIntroCharIdx % pfpImgsRef.current.length : 0];
                const callerPfpIdx = PFP_NAMES.indexOf(si.name);
                const callerPfpImg = callerPfpIdx >= 0 ? pfpImgsRef.current[callerPfpIdx % pfpImgsRef.current.length] : null;
                const drawRow1 = (ox) => {
                  let lx = ox;
                  // Coin PFP
                  if (pfpImg && pfpImg.naturalWidth) {
                    jx.save();
                    jx.beginPath(); jx.arc(lx + pfpSize / 2, row1Y - pfpSize / 4, pfpSize / 2, 0, Math.PI * 2); jx.clip();
                    jx.drawImage(pfpImg, lx, row1Y - pfpSize / 4 - pfpSize / 2, pfpSize, pfpSize);
                    jx.restore();
                    jx.strokeStyle = "#ff2d78"; jx.lineWidth = 3;
                    jx.beginPath(); jx.arc(lx + pfpSize / 2, row1Y - pfpSize / 4, pfpSize / 2 + 3, 0, Math.PI * 2); jx.stroke();
                    lx += pfpSize + 18;
                  }
                  // $TICKER
                  jx.font = `bold ${fSz}px 'Inter', sans-serif`;
                  jx.fillStyle = "#fff"; jx.textAlign = "left";
                  jx.fillText(si.coin.ticker, lx, row1Y);
                  lx += jx.measureText(si.coin.ticker).width + 14;
                  // % change
                  const chgTxt = si.coin.change;
                  jx.font = `bold ${fSz}px 'JetBrains Mono', monospace`;
                  jx.fillStyle = si.coin.positive ? "#00ff88" : "#ff4444";
                  jx.shadowColor = si.coin.positive ? "#00ff88" : "#ff4444";
                  jx.shadowBlur = 14;
                  jx.fillText(chgTxt, lx, row1Y);
                  jx.shadowBlur = 0;
                  lx += jx.measureText(chgTxt).width + 18;
                  // Caller PFP circle
                  const cpCy = row1Y - cpSz / 3;
                  if (callerPfpImg && callerPfpImg.naturalWidth) {
                    jx.save();
                    jx.beginPath(); jx.arc(lx + cpSz / 2, cpCy, cpSz / 2, 0, Math.PI * 2); jx.clip();
                    jx.drawImage(callerPfpImg, lx, cpCy - cpSz / 2, cpSz, cpSz);
                    jx.restore();
                    jx.strokeStyle = "#ff2d78"; jx.lineWidth = 2;
                    jx.beginPath(); jx.arc(lx + cpSz / 2, cpCy, cpSz / 2 + 2, 0, Math.PI * 2); jx.stroke();
                    lx += cpSz + 10;
                  }
                  // Caller name
                  jx.font = `bold ${fSz}px 'Inter', sans-serif`;
                  jx.fillStyle = "#ff2d78";
                  jx.fillText(si.name, lx, row1Y);
                  lx += jx.measureText(si.name).width + 12;
                  // @followers
                  jx.font = `500 ${fSz * 0.45 | 0}px 'JetBrains Mono', monospace`;
                  jx.fillStyle = "#555";
                  jx.fillText("@" + (si.followers || "?"), lx, row1Y);
                  lx += jx.measureText("@" + (si.followers || "?")).width;
                  return lx - ox; // total width
                };

                // ── Row 2 draw helper ──
                const r2Stats = [
                  [si.coin.mcap, "#fff"], ["$" + si.coin.price, "#ccc"],
                  [si.coin.liq || "—", "#00d4ff"], [si.coin.supply || "1B", "#777"],
                ];
                const drawRow2 = (ox) => {
                  let sx = ox;
                  r2Stats.forEach(([val, color]) => {
                    jx.font = `bold ${fSz}px 'JetBrains Mono', monospace`;
                    jx.fillStyle = color; jx.textAlign = "left";
                    jx.fillText(val, sx, row2Y);
                    sx += jx.measureText(val).width + 24;
                  });
                  return sx - ox;
                };

                // Measure widths (dry run outside clip)
                jx.save(); jx.globalAlpha = 0;
                const w1 = drawRow1(0); const w2 = drawRow2(0);
                jx.restore();

                // ── Scroll + clip each row ──
                jx.save();
                jx.beginPath(); jx.rect(0, 0, W, H * 0.55); jx.clip();
                if (w1 > W - 20) {
                  const loop1 = w1 + gap;
                  const off1 = -((st.clock * scrollSpeed) % loop1);
                  drawRow1(off1); drawRow1(off1 + loop1);
                } else { drawRow1(24); }
                jx.restore();

                jx.save();
                jx.beginPath(); jx.rect(0, H * 0.55, W, H * 0.5); jx.clip();
                if (w2 > W - 20) {
                  const loop2 = w2 + gap;
                  const off2 = -((st.clock * scrollSpeed * 0.8) % loop2); // slightly slower
                  drawRow2(off2); drawRow2(off2 + loop2);
                } else { drawRow2(24); }
                jx.restore();
              } else {
                jx.font = "bold 100px 'Inter', sans-serif";
                jx.fillStyle = "#ff2d78"; jx.textAlign = "center";
                jx.fillText("trench.fm", W / 2, H / 2 + 20);
                jx.textAlign = "left";
              }
            }
            T.jmboTopFaces.forEach(f => {
              renderTopRibbon(f.ctx, f.canvas.width, f.canvas.height);
              f.tex.needsUpdate = true;
            });

            // ── BOTTOM RIBBON: 4 different detail strips (SAME text size as top) ──
            function renderBotRibbon(jx, W, H, side) {
              jx.clearRect(0, 0, W, H);
              jx.fillStyle = "#04010e"; jx.fillRect(0, 0, W, H);
              // Top edge glow
              const edgeGlow = jx.createLinearGradient(0, 0, 0, 6);
              edgeGlow.addColorStop(0, "rgba(255,45,120,0.35)"); edgeGlow.addColorStop(1, "rgba(255,45,120,0)");
              jx.fillStyle = edgeGlow; jx.fillRect(0, 0, W, 6);

              if (!si) {
                jx.font = "bold 48px 'JetBrains Mono', monospace";
                jx.fillStyle = "#00ff88"; jx.textAlign = "center";
                jx.fillText("● " + (400 + Math.floor(Math.random() * 50)) + " watching", W / 2, H / 2 + 16);
                jx.textAlign = "left";
                return;
              }
              const pad = 24;
              const fSz = 80; // JUMBOTRON — big readable text (320px canvas)
              const tx2 = si.txStats || {};
              const midY = H / 2;

              // ── NBA countdown timer (shared) ──
              const timeLeft = speakerTimeRef.current;
              const secs = Math.ceil(timeLeft);
              const timeStr = String(secs).padStart(2, "0");
              const clockColor = timeLeft > 15 ? "#ff2d78" : timeLeft > 7 ? "#ffa500" : "#ff4444";

              // Timer progress bar
              jx.fillStyle = "rgba(255,255,255,0.04)"; jx.fillRect(0, H - 6, W, 6);
              jx.fillStyle = clockColor; jx.fillRect(0, H - 6, W * (timeLeft / 45), 6);

              if (side === 0) {
                // ── FRONT: NBA Clock center + Buy/Sell ──
                const clockW2 = 120, clockH2 = H - 28, clockX2 = W / 2 - clockW2 / 2;
                jx.fillStyle = "rgba(0,0,0,0.6)";
                jx.beginPath(); jx.roundRect(clockX2, 10, clockW2, clockH2, 8); jx.fill();
                jx.strokeStyle = clockColor; jx.lineWidth = 2;
                jx.beginPath(); jx.roundRect(clockX2, 10, clockW2, clockH2, 8); jx.stroke();
                jx.font = "bold 64px 'JetBrains Mono', monospace";
                jx.fillStyle = clockColor; jx.textAlign = "center";
                jx.shadowColor = clockColor; jx.shadowBlur = 20;
                jx.fillText(timeStr, W / 2, midY + 22);
                jx.shadowBlur = 0;

                // Buy/sell flanking the clock
                const buys = tx2.buys || 0, sells = tx2.sells || 0;
                jx.font = `bold ${fSz}px 'JetBrains Mono', monospace`;
                jx.fillStyle = "#00ff88"; jx.textAlign = "right";
                jx.shadowColor = "#00ff88"; jx.shadowBlur = 8;
                jx.fillText("▲" + buys, clockX2 - 18, midY + 6);
                jx.shadowBlur = 0;
                jx.font = `bold ${fSz * 0.6 | 0}px 'JetBrains Mono', monospace`;
                jx.fillText("$" + (tx2.buyVol || "0") + "K", clockX2 - 18, midY + 42);
                jx.font = `bold ${fSz}px 'JetBrains Mono', monospace`;
                jx.fillStyle = "#ff4444"; jx.textAlign = "left";
                jx.shadowColor = "#ff4444"; jx.shadowBlur = 8;
                jx.fillText(sells + "▼", clockX2 + clockW2 + 18, midY + 6);
                jx.shadowBlur = 0;
                jx.font = `bold ${fSz * 0.6 | 0}px 'JetBrains Mono', monospace`;
                jx.fillText("$" + (tx2.sellVol || "0") + "K", clockX2 + clockW2 + 18, midY + 42);
                // Buy/sell bars
                const barW2 = clockX2 - pad - 18;
                jx.fillStyle = "#00ff88";
                jx.beginPath(); jx.roundRect(pad, midY + 52, barW2, 12, 6); jx.fill();
                jx.fillStyle = "#ff4444";
                jx.beginPath(); jx.roundRect(W - pad - barW2, midY + 52, barW2, 12, 6); jx.fill();
                jx.textAlign = "left";

              } else if (side === 1) {
                // ── BACK: MC · FDV · LIQ · VOL ──
                jx.textAlign = "left";
                let rx = pad;
                const stat = (label, val, color) => {
                  jx.font = `bold ${fSz * 0.5 | 0}px 'Inter', sans-serif`;
                  jx.fillStyle = "#666";
                  jx.fillText(label, rx, midY - 14);
                  jx.font = `bold ${fSz}px 'JetBrains Mono', monospace`;
                  jx.fillStyle = color || "#fff";
                  jx.fillText(val, rx, midY + 28);
                  rx += Math.max(jx.measureText(val).width, 80) + 24;
                };
                stat("MC", si.coin.mcap, "#fff");
                stat("FDV", si.coin.fdv || si.coin.mcap, "#ccc");
                stat("LIQ", si.coin.liq || "—", "#00d4ff");
                stat("VOL", si.coin.vol || "—", "#b24dff");
                // Clock far right
                jx.font = `bold ${fSz * 1.1 | 0}px 'JetBrains Mono', monospace`;
                jx.fillStyle = clockColor; jx.textAlign = "right";
                jx.shadowColor = clockColor; jx.shadowBlur = 12;
                jx.fillText(timeStr, W - pad, midY + 22);
                jx.shadowBlur = 0; jx.textAlign = "left";

              } else if (side === 2) {
                // ── LEFT: Supply · Holders · Created ──
                const holders = tx2.holders ? tx2.holders.toLocaleString() : "—";
                jx.textAlign = "left";
                let rx = pad;
                const stat = (label, val, color) => {
                  jx.font = `bold ${fSz * 0.5 | 0}px 'Inter', sans-serif`;
                  jx.fillStyle = "#666";
                  jx.fillText(label, rx, midY - 14);
                  jx.font = `bold ${fSz}px 'JetBrains Mono', monospace`;
                  jx.fillStyle = color || "#fff";
                  jx.fillText(val, rx, midY + 28);
                  rx += Math.max(jx.measureText(val).width, 80) + 24;
                };
                stat("HOLDERS", holders, "#fff");
                stat("SUPPLY", si.coin.supply || "1B", "#999");
                stat("LAUNCH", si.coin.launchpad || "—", "#b24dff");
                // Clock far right
                jx.font = `bold ${fSz * 1.1 | 0}px 'JetBrains Mono', monospace`;
                jx.fillStyle = clockColor; jx.textAlign = "right";
                jx.shadowColor = clockColor; jx.shadowBlur = 12;
                jx.fillText(timeStr, W - pad, midY + 22);
                jx.shadowBlur = 0; jx.textAlign = "left";

              } else {
                // ── RIGHT: Votes bar + Caller earned + clock ──
                const totalV3 = vt.up + vt.down || 1;
                const upPct = vt.up / totalV3;
                const upP2 = ((upPct) * 100).toFixed(0);
                const barW3 = W - pad * 2 - 140, barH3 = 18, barY3 = midY + 20;

                jx.font = `bold ${fSz}px 'JetBrains Mono', monospace`;
                jx.fillStyle = "#00ff88"; jx.textAlign = "left";
                jx.shadowColor = "#00ff88"; jx.shadowBlur = 8;
                jx.fillText("▲" + vt.up, pad, midY - 4);
                jx.shadowBlur = 0;
                jx.fillStyle = "#fff"; jx.textAlign = "center";
                jx.font = `bold ${fSz * 0.75 | 0}px 'Inter', sans-serif`;
                jx.fillText(upP2 + "% BULLISH", pad + barW3 / 2, midY - 4);
                jx.fillStyle = "#ff4444"; jx.textAlign = "right";
                jx.font = `bold ${fSz}px 'JetBrains Mono', monospace`;
                jx.shadowColor = "#ff4444"; jx.shadowBlur = 8;
                jx.fillText(vt.down + "▼", pad + barW3, midY - 4);
                jx.shadowBlur = 0;

                // Green/red bar
                jx.fillStyle = "#00ff88";
                jx.beginPath(); jx.roundRect(pad, barY3, barW3 * upPct - 2, barH3, 6); jx.fill();
                jx.fillStyle = "#ff4444";
                jx.beginPath(); jx.roundRect(pad + barW3 * upPct + 2, barY3, barW3 * (1 - upPct) - 2, barH3, 6); jx.fill();

                // Earnings below bar
                const earned = callerEarningsRef.current[si.name] || 0;
                if (earned > 0) {
                  jx.font = `bold ${fSz * 0.6 | 0}px 'JetBrains Mono', monospace`;
                  jx.fillStyle = "#00ff88"; jx.textAlign = "left";
                  jx.fillText("earned $" + earned.toFixed(2), pad, barY3 + barH3 + 28);
                }

                // Clock far right
                jx.font = `bold ${fSz * 1.1 | 0}px 'JetBrains Mono', monospace`;
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
        const zAxis = new THREE.Vector3(0, 0, 1);
        const xAxis = new THREE.Vector3(1, 0, 0);
        const idQ = new THREE.Quaternion();
        // Pre-compute camera-facing quaternion for head billboarding
        const camDir = new THREE.Vector3();
        const headLookQ = new THREE.Quaternion();
        const headLookMat = new THREE.Matrix4();
        const _origin = new THREE.Vector3(0, 0, 0);
        const _up = new THREE.Vector3(0, 1, 0);
        const _headWorld = new THREE.Vector3();
        for (let i = 0; i < count; i++) {
          const c = chars[i];

          // ── Is this character the active speaker on stage?
          const isOnStage = (st.speaker === i && st.teleportPhase === "active") ||
            (st.teleportCharIdx === i && st.teleportPhase === "beam_in" && st.teleportTimer > 0.25);

          // ── Position & scale — speaker is centered on stage, scale from stateRef
          const spkScale = st.speakerScale || 1.8;
          let cx, cz, sv;
          if (isOnStage) {
            cx = 0; cz = 0;
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

          // ── Torso
          sc.set(squish * sv, stretch * jumpStr * sv, squish * sv);
          pos.set(cx, (0.70 + bob + jumpH) * pScale + stageY, cz);
          dm.compose(pos, idQ, sc); bodies.setMatrixAt(i, dm);

          // ── Head — billboard toward camera + gentle tilt
          sc.set(sv, sv, sv);
          const headBaseY = isOnStage ? 1.24 : 1.32; // stage head slightly lower to not float
          pos.set(cx + headTilt * 0.12 * pScale, (headBaseY + headBob + jumpH) * pScale + stageY, cz);
          camDir.set(camera.position.x - pos.x, 0, camera.position.z - pos.z).normalize();
          headLookMat.lookAt(camDir, _origin, _up);
          headLookQ.setFromRotationMatrix(headLookMat);
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

          // ── Arms
          sc.set(squish * sv, stretch * sv, squish * sv);
          pos.set(cx - 0.20 * pScale, (0.85 + bob + jumpH) * pScale + stageY, cz);
          q.setFromAxisAngle(zAxis, armL);
          dm.compose(pos, q, sc); aL.setMatrixAt(i, dm);
          pos.set(cx + 0.20 * pScale, (0.85 + bob + jumpH) * pScale + stageY, cz);
          q.setFromAxisAngle(zAxis, armR);
          dm.compose(pos, q, sc); aR.setMatrixAt(i, dm);

          // ── Legs
          const jLeg = jumping ? 0.4 : 0;
          sc.set(sv, sv * (jumping ? 0.85 : 1), sv);
          pos.set(cx - 0.07 * pScale, (0.21 + jumpH * 0.3) * pScale + stageY, cz);
          q.setFromAxisAngle(xAxis, legSwing + jLeg);
          dm.compose(pos, q, sc); lL.setMatrixAt(i, dm);
          pos.set(cx + 0.07 * pScale, (0.21 + jumpH * 0.3) * pScale + stageY, cz);
          q.setFromAxisAngle(xAxis, -legSwing - jLeg);
          dm.compose(pos, q, sc); lR.setMatrixAt(i, dm);
        }
        bodies.instanceMatrix.needsUpdate = true; heads.instanceMatrix.needsUpdate = true;
        aL.instanceMatrix.needsUpdate = true; aR.instanceMatrix.needsUpdate = true;
        lL.instanceMatrix.needsUpdate = true; lR.instanceMatrix.needsUpdate = true;
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
    init();
    return () => { if (frameRef.current) cancelAnimationFrame(frameRef.current); if (rendererRef.current?.domElement && container.contains(rendererRef.current.domElement)) { container.removeChild(rendererRef.current.domElement); rendererRef.current.dispose(); } };
  }, []);

  // ═══ MIC BUTTON ═══
  const handleMicTap = useCallback(() => {
    const st = stateRef.current;
    // If someone is already speaking, show modal to join queue
    if (st.speaker !== null && st.teleportPhase === "active") {
      setShowStepUpModal(true);
      return;
    }
    // Otherwise show modal for direct step-up
    if (st.teleportPhase === "idle" || st.teleportPhase === "active") {
      setShowStepUpModal(true);
    }
  }, []);

  // ═══ STEP UP (from modal submit) ═══
  const handleStepUp = useCallback((ca, thesis) => {
    const st = stateRef.current;
    // Resolve coin from CA (mock: match or random)
    const matchedCoin = COINS.find(c => ca.toLowerCase().includes(c.ticker.replace("$","").toLowerCase())) || COINS[Math.floor(Math.random() * COINS.length)];

    // If speaker active, join queue
    if (st.speaker !== null && st.teleportPhase === "active") {
      const name = NAMES[Math.floor(Math.random() * NAMES.length)];
      setQueue(q => [...q, { name, coin: matchedCoin, thesis }]);
      setChatMessages(p => [...p, { user: "trench.fm", msg: `🎤 ${name} joined the queue (${queue.length + 1} waiting)` }]);
      setShowStepUpModal(false);
      setStepUpCA("");
      setStepUpThesis("");
      return;
    }

    if (st.teleportPhase !== "idle" && st.teleportPhase !== "active") return;

    // Return prev speaker
    if (st.speaker !== null) {
      chars_ref_restore(st);
    }

    const idx = Math.floor(Math.random() * st.chars.length);
    const c = st.chars[idx];

    st.teleportCharIdx = idx;
    st.teleportPhase = "beam_out";
    st.teleportTimer = 0;
    setTeleportVFX("out");

    const txStats = { buys: Math.floor(80 + Math.random() * 200), sells: Math.floor(30 + Math.random() * 120), buyVol: (Math.random() * 80 + 10).toFixed(1), sellVol: (Math.random() * 50 + 5).toFixed(1), holders: Math.floor(500 + Math.random() * 3000), topHolding: (15 + Math.random() * 20).toFixed(1) };
    const followers = ["12.5K", "45.2K", "127K", "892K", "33.1K", "8.4K"][Math.floor(Math.random() * 6)];
    setSpeakerInfo({ name: c.name, coin: matchedCoin, idx, thesis, txStats, followers });
    setCardExpanded(false);
    { const tfd = generateAllTimeframes(matchedCoin.positive); chartTFDataRef.current = tfd; setChartData(tfd[chartTimeframe]); }
    setVotes({ up: Math.floor(Math.random() * 20) + 5, down: Math.floor(Math.random() * 5) });
    setUserVoted(null);
    setShowStepUpModal(false);
    setStepUpCA("");
    setStepUpThesis("");
    // Jumbotron IS the announcement — start intro during teleport
    st.jmboIntroTimer = 6.0;
    st.jmboIntroName = c.name;
    st.jmboIntroTicker = matchedCoin.ticker;
    st.jmboIntroCharIdx = idx;

    setChatMessages(p => [...p, { user: "trench.fm", msg: `⚡ ${c.name} is teleporting to the stage...` }]);
    setTimeout(() => setChatMessages(p => [...p, { user: c.name, msg: `Calling ${matchedCoin.ticker} — ${matchedCoin.mcap} mcap, ${matchedCoin.change}. LFG.` }]), 1500);
  }, [queue]);

  function chars_ref_restore(st) {
    if (st.speaker !== null) {
      st.chars[st.speaker].visible = true;
      st.speaker = null;
    }
  }

  const handleVote = useCallback((d) => { if (userVoted) return; setUserVoted(d); setVotes(p => ({ up: p.up + (d === "up" ? 1 : 0), down: p.down + (d === "down" ? 1 : 0) })); }, [userVoted]);
  const handleSend = useCallback(() => { if (!chatInput.trim()) return; setChatMessages(p => [...p, { user: "you", msg: chatInput.trim() }]); setChatInput(""); }, [chatInput]);
  const handleBuy = useCallback(() => {
    if (!speakerInfo || !buyAmount) return;
    const amt = parseFloat(buyAmount);
    if (isNaN(amt) || amt <= 0 || amt > walletBalance) return;
    const coin = speakerInfo.coin;
    const entryPrice = parseFloat(coin.price);
    const tradeUSD = amt * 180; // SOL → USD
    // Fee flywheel — 1% split: 0.5% platform, 0.3% caller, 0.2% treasury
    const callerFee = tradeUSD * FEE_CALLER;
    const platformFee = tradeUSD * FEE_PLATFORM;
    const callerName = speakerInfo.name;
    setCallerEarnings(prev => ({ ...prev, [callerName]: (prev[callerName] || 0) + callerFee }));
    setPlatformRevenue(prev => prev + platformFee);
    setCallVolume(prev => prev + tradeUSD);
    setUserPositions(p => [...p, { coin: coin.ticker, amount: amt, entry: entryPrice, current: entryPrice * (1 + (Math.random() * 0.5 - 0.1)), caller: callerName }]);
    const displayName = privacyMode ? "anon" : "you";
    setActivityFeed(p => [...p, { user: displayName, action: "bought", amount: `$${tradeUSD.toFixed(0)}`, coin: coin.ticker }]);
    setChatMessages(p => [
      ...p,
      { user: "trench.fm", msg: privacyMode ? `⚡ anon bought ${amt} SOL of ${coin.ticker}` : `⚡ you bought ${amt} SOL of ${coin.ticker}!` },
      { user: "trench.fm", msg: `💰 ${callerName} earned $${callerFee.toFixed(2)} from this trade` },
    ]);
    setBuyAmount("");
    setShowBuySheet(false);
    buyFlashRef.current = performance.now() / 1000; // trigger green flash
    // Floating money celebration
    const emojis = ["💰", "🤑", "💵", "🚀", "⚡", "💎", "🔥"];
    const burst = Array.from({ length: 12 }, (_, i) => ({
      id: Date.now() + i,
      emoji: emojis[Math.floor(Math.random() * emojis.length)],
      x: 30 + Math.random() * (window.innerWidth - 100),
      delay: Math.random() * 0.5,
      speed: 2 + Math.random() * 3,
      size: 16 + Math.random() * 14,
    }));
    setFloatingEmojis(prev => [...prev, ...burst]);
    setTimeout(() => setFloatingEmojis(prev => prev.filter(e => !burst.includes(e))), 4000);
  }, [speakerInfo, buyAmount, walletBalance]);

  const handleSell = useCallback((coinTicker) => {
    const pos = userPositions.find(p => p.coin === coinTicker);
    if (!pos) return;
    const pnl = ((pos.current - pos.entry) / pos.entry * 100);
    setUserPositions(p => p.filter(pp => pp.coin !== coinTicker));
    setActivityFeed(p => [...p, { user: "you", action: pnl >= 0 ? "up" : "sold", amount: `${pnl >= 0 ? "+" : ""}${pnl.toFixed(0)}%`, coin: coinTicker }]);
    setChatMessages(p => [...p, { user: "trench.fm", msg: `💰 you sold ${pos.amount.toFixed(2)} SOL of ${coinTicker} (${pnl >= 0 ? "+" : ""}${pnl.toFixed(1)}%)` }]);
  }, [userPositions]);

  // Simulate position P&L updates
  useEffect(() => {
    if (userPositions.length === 0) return;
    const i = setInterval(() => {
      setUserPositions(p => p.map(pos => ({ ...pos, current: pos.entry * (1 + (Math.random() * 0.6 - 0.1)) })));
    }, 3000);
    return () => clearInterval(i);
  }, [userPositions.length]);

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
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}
        @keyframes blink{0%,100%{opacity:1}50%{opacity:0}}
        @keyframes slideIn{from{transform:translateY(8px);opacity:0}to{transform:translateY(0);opacity:1}}
        @keyframes chartIn{from{transform:scaleX(0);opacity:0}to{transform:scaleX(1);opacity:1}}
        @keyframes ticker{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}
        @keyframes modalUp{from{transform:translateY(100%)}to{transform:translateY(0)}}
        @keyframes floatUp{0%{transform:translateY(0) scale(1);opacity:1}100%{transform:translateY(-300px) scale(1.5);opacity:0}}
        @keyframes copyFlash{0%{background:rgba(0,255,136,0.2)}100%{background:transparent}}
        @keyframes liveDot{0%,100%{box-shadow:0 0 0 0 rgba(0,255,136,0.5)}50%{box-shadow:0 0 0 4px rgba(0,255,136,0)}}
        @keyframes announceOverlay{0%{opacity:0}8%{opacity:1}75%{opacity:1}100%{opacity:0}}
        @keyframes announceLine{0%{width:0}15%{width:100%}75%{width:100%}100%{width:0}}
        @keyframes announceLabel{0%{opacity:0;transform:translateY(10px)}10%{opacity:1;transform:translateY(0)}75%{opacity:1;transform:translateY(0)}90%{opacity:0;transform:translateY(-5px)}}
        *::-webkit-scrollbar{display:none}
        @keyframes announceName{0%{opacity:0;transform:scale(1.4) translateY(8px);filter:blur(8px)}12%{opacity:1;transform:scale(1) translateY(0);filter:blur(0)}75%{opacity:1;transform:scale(1);filter:blur(0)}90%{opacity:0;transform:scale(0.95) translateY(-3px);filter:blur(4px)}}
        @keyframes announceSub{0%{opacity:0;transform:translateY(12px)}15%{opacity:0;transform:translateY(12px)}25%{opacity:1;transform:translateY(0)}75%{opacity:1;transform:translateY(0)}90%{opacity:0}}
        @keyframes announceGlow{0%{opacity:0;transform:scale(0.5)}15%{opacity:0.6;transform:scale(1)}50%{opacity:0.3;transform:scale(1.2)}100%{opacity:0;transform:scale(1.5)}}
        @keyframes announcePulse{0%,100%{opacity:0.4}50%{opacity:1}}
      `}</style>

      <div ref={mountRef} style={{ width: "100%", height: "100%", touchAction: "none", cursor: "grab" }} onTouchStart={onTS} onTouchMove={onTM} onTouchEnd={onTE} onMouseDown={onMD} onMouseMove={onMM} onMouseUp={onMU} onMouseLeave={onMU} />

      {/* TOP BAR */}
      <div data-ui="1" style={{ position: "absolute", top: 0, left: 0, right: 0, zIndex: 10, padding: "10px 14px", background: "linear-gradient(180deg,rgba(10,0,8,0.92) 60%,transparent 100%)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ fontFamily: "'Press Start 2P'", fontSize: 13, background: "linear-gradient(135deg,#ff2d78,#ff6622)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", letterSpacing: 1, filter: `hue-rotate(${((stateRef.current?.domeHueShift || 0) + (stateRef.current?.clock || 0) * 0.0083) * 360 % 360}deg)` }}>trench.fm</div>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          {queue.length > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: 4, padding: "4px 10px", borderRadius: 20, background: "rgba(255,45,120,0.08)", border: "1px solid rgba(255,45,120,0.2)" }}>
              <Icon d={Icons.mic} size={11} color="#ff2d78" />
              <span style={{ fontFamily: "'Inter'", fontSize: 11, fontWeight: 600, color: "#ff2d78" }}>{queue.length}</span>
            </div>
          )}
          <div style={{ display: "flex", alignItems: "center", gap: 5, padding: "4px 10px", borderRadius: 20, background: "rgba(0,255,136,0.06)", border: "1px solid rgba(0,255,136,0.15)" }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#00ff88", animation: "liveDot 2s infinite" }} />
            <span style={{ fontFamily: "'JetBrains Mono'", fontSize: 10, fontWeight: 500, color: "#00ff88", letterSpacing: -0.3 }}>{liveCount}</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 4, padding: "4px 10px", borderRadius: 20, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
            <Icon d={Icons.wallet} size={11} color="#888" />
            <span style={{ fontFamily: "'JetBrains Mono'", fontSize: 10, fontWeight: 500, color: "#aaa", letterSpacing: -0.3 }}>{walletBalance}</span>
          </div>
        </div>
      </div>

      {/* Activity ticker removed — was cluttering top bar, hard to read */}

      {/* Lobby/speaker info now lives on the jumbotron — no 2D card overlay */}

      {/* Token data lives on jumbotron — no 2D overlay needed */}

      {/* ═══ BUY CELEBRATION — floating money emojis ═══ */}
      {floatingEmojis.map(e => (
        <div key={e.id} style={{
          position: "absolute", left: e.x, bottom: 120, zIndex: 30,
          fontSize: e.size, pointerEvents: "none",
          animation: `floatUp ${e.speed}s ease-out ${e.delay}s forwards`,
          opacity: 0, animationFillMode: "forwards",
        }}>{e.emoji}</div>
      ))}

      {/* ═══ SPEECH BUBBLE — inline like chat: "name · thesis..." ═══ */}
      {speakerInfo?.thesis && speakerScreenPos && (stateRef.current?.jmboIntroTimer || 0) <= 0 && typewriterIdx > 0 && (
        <div data-ui="1" onMouseEnter={() => typewriterDone && setBubbleExpanded(true)} onMouseLeave={() => typewriterDone && setBubbleExpanded(false)} style={{
          position: "absolute",
          left: Math.max(10, Math.min(speakerScreenPos.x - 160, window.innerWidth - 330)),
          top: Math.max(50, speakerScreenPos.y - 45),
          maxWidth: (typewriterDone && !bubbleExpanded) ? 320 : 340,
          zIndex: 8,
          pointerEvents: "auto",
          cursor: "default",
          animation: "slideIn 0.3s ease",
          background: "rgba(12,6,16,0.85)",
          backdropFilter: "blur(14px)",
          WebkitBackdropFilter: "blur(14px)",
          borderRadius: 10,
          padding: "8px 14px",
          border: "1px solid rgba(255,255,255,0.1)",
          boxShadow: "0 4px 16px rgba(0,0,0,0.4)",
          fontFamily: "'Inter'",
          fontSize: 14,
          lineHeight: 1.4,
          letterSpacing: -0.2,
          transition: "max-width 0.4s ease",
          ...((typewriterDone && !bubbleExpanded) ? { whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" } : {}),
        }}>
          <span style={{ fontWeight: 700, color: "#ff2d78" }}>{speakerInfo.name}</span>
          <span style={{ color: "#555", margin: "0 6px" }}>·</span>
          <span style={{ fontWeight: 500, color: "#ddd" }}>
            {(typewriterDone && !bubbleExpanded) ? speakerInfo.thesis : speakerInfo.thesis.slice(0, typewriterIdx)}
          </span>
          {!typewriterDone && <span style={{ color: "#ff2d78", animation: "blink 0.6s step-end infinite", fontWeight: 700 }}>|</span>}
        </div>
      )}

      {/* BOTTOM PANEL */}
      <div data-ui="1" style={{ position: "absolute", bottom: 0, left: 0, right: 0, zIndex: 10, background: "linear-gradient(0deg,rgba(8,4,12,0.96) 55%,rgba(8,4,12,0.6) 85%,transparent 100%)", display: "flex", flexDirection: "column" }}>
        {/* Chat messages */}
        <div style={{ height: 120, overflowY: "auto", padding: "8px 14px", display: "flex", flexDirection: "column", gap: 3, maskImage: "linear-gradient(to bottom,transparent 0%,black 15%,black 100%)", WebkitMaskImage: "linear-gradient(to bottom,transparent 0%,black 15%,black 100%)", scrollbarWidth: "none", msOverflowStyle: "none", WebkitOverflowScrolling: "touch" }}>
          {chatMessages.slice(-20).map((m, i) => (
            <div key={i} style={{ fontFamily: "'Inter'", fontSize: 12, lineHeight: 1.45, animation: "slideIn 0.2s ease", letterSpacing: -0.2 }}>
              <span style={{ color: m.user === "trench.fm" ? "#ff2d78" : m.user === "you" ? "#00ff88" : `hsl(${(m.user.charCodeAt(0) * 47 + m.user.charCodeAt(m.user.length - 1) * 83) % 360},65%,60%)`, fontWeight: 600, fontSize: 11 }}>{m.user}</span>
              <span style={{ color: "#333", margin: "0 4px" }}>·</span>
              <span style={{ color: "#999", fontWeight: 400 }}>{m.msg}</span>
            </div>
          ))}
          <div ref={chatEndRef} />
        </div>
        {/* Action buttons */}
        {(() => {
          const holdingCurrent = speakerInfo && userPositions.some(p => p.coin === speakerInfo.coin.ticker);
          const btnBase = { borderRadius: 10, border: "none", fontFamily: "'Inter'", fontWeight: 700, fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 4, padding: "10px 0", letterSpacing: -0.2, transition: "all 0.15s ease" };
          return (
            <div style={{ display: "flex", gap: 5, padding: "4px 14px 6px" }}>
              <button onClick={() => handleVote("up")} style={{ ...btnBase, flex: 1, border: `1px solid ${userVoted === "up" ? "#00ff88" : "rgba(0,255,136,0.15)"}`, background: userVoted === "up" ? "#00ff88" : "rgba(0,255,136,0.06)", color: userVoted === "up" ? "#000" : "#00ff88", opacity: !speakerInfo ? 0.3 : userVoted && userVoted !== "up" ? 0.3 : 1 }}>
                <Icon d={Icons.rocket} size={13} color={userVoted === "up" ? "#000" : "#00ff88"} />
              </button>
              <button onClick={() => handleVote("down")} style={{ ...btnBase, flex: 1, border: `1px solid ${userVoted === "down" ? "#ff4444" : "rgba(255,68,68,0.15)"}`, background: userVoted === "down" ? "#ff4444" : "rgba(255,68,68,0.06)", color: userVoted === "down" ? "#fff" : "#ff4444", opacity: !speakerInfo ? 0.3 : userVoted && userVoted !== "down" ? 0.3 : 1 }}>
                <Icon d={Icons.skull} size={13} color={userVoted === "down" ? "#fff" : "#ff4444"} />
              </button>
              {holdingCurrent ? (
                <>
                  <button onClick={(e) => { e.stopPropagation(); handleSell(speakerInfo.coin.ticker); }} style={{ ...btnBase, flex: 1, border: "1px solid rgba(255,68,68,0.2)", background: "rgba(255,68,68,0.08)", color: "#ff4444" }}>Sell</button>
                  <button onClick={(e) => { e.stopPropagation(); setShowBuySheet(true); }} style={{ ...btnBase, flex: 1, background: "linear-gradient(135deg,#00ff88,#00cc66)", color: "#000" }}>Buy</button>
                </>
              ) : (
                <button onClick={() => speakerInfo && setShowBuySheet(true)} style={{ ...btnBase, flex: 1.5, background: speakerInfo ? "linear-gradient(135deg,#00ff88,#00cc66)" : "rgba(0,255,136,0.1)", color: speakerInfo ? "#000" : "#00ff8844", opacity: !speakerInfo ? 0.3 : 1 }}>
                  <Icon d={Icons.zap} size={13} color={speakerInfo ? "#000" : "#00ff8844"} />Buy
                </button>
              )}
              <button onClick={handleMicTap} style={{ ...btnBase, flex: 1, background: "linear-gradient(135deg,#ff2d78,#ff6622)", color: "#fff" }}>
                <Icon d={Icons.mic} size={13} color="#fff" />
              </button>
            </div>
          );
        })()}
        {/* Chat input */}
        <div style={{ display: "flex", gap: 6, padding: "0 14px", paddingBottom: "max(12px, env(safe-area-inset-bottom))", borderTop: "1px solid rgba(255,255,255,0.04)", paddingTop: 6 }}>
          <input value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key === "Enter" && handleSend()} placeholder="Say something..." style={{ flex: 1, padding: "9px 12px", borderRadius: 10, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)", color: "#fff", fontFamily: "'Inter'", fontSize: 12, fontWeight: 400, outline: "none", letterSpacing: -0.2 }} />
          <button onClick={handleSend} style={{ padding: "9px 12px", borderRadius: 10, border: "none", background: "rgba(255,255,255,0.06)", color: "#666", cursor: "pointer", display: "flex", alignItems: "center" }}>
            <Icon d={Icons.send} size={14} color="#666" />
          </button>
        </div>
      </div>

      {/* ═══ STEP UP MODAL ═══ */}
      {showStepUpModal && (
        <div data-ui="1" style={{ position: "absolute", bottom: 0, left: 0, right: 0, zIndex: 50, animation: "modalUp 0.3s ease" }}>
          <div style={{ background: "rgba(0,0,0,0.5)", position: "absolute", top: -1000, left: 0, right: 0, bottom: 0 }} onClick={() => setShowStepUpModal(false)} />
          <div style={{ background: "rgba(12,6,16,0.98)", backdropFilter: "blur(24px)", borderRadius: "20px 20px 0 0", padding: "24px 20px", paddingBottom: "max(24px, env(safe-area-inset-bottom))", border: "1px solid rgba(255,255,255,0.06)", borderBottom: "none", position: "relative" }}>
            {/* Handle bar */}
            <div style={{ width: 36, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.15)", margin: "-8px auto 16px" }} />
            <div style={{ textAlign: "center", fontFamily: "'Inter'", fontWeight: 800, fontSize: 18, color: "#fff", marginBottom: 4, letterSpacing: -0.5, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
              <Icon d={Icons.mic} size={20} color="#ff2d78" />Step Up
            </div>
            <div style={{ textAlign: "center", fontFamily: "'Inter'", fontSize: 12, color: "#555", marginBottom: 18 }}>{liveCount} people are listening</div>

            {/* CA input */}
            <div style={{ fontFamily: "'Inter'", fontWeight: 600, fontSize: 10, color: "#666", marginBottom: 6, textTransform: "uppercase", letterSpacing: 1 }}>Contract Address</div>
            <input value={stepUpCA} onChange={e => setStepUpCA(e.target.value)} placeholder="Paste CA address..." style={{ width: "100%", padding: "12px 14px", borderRadius: 12, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#fff", fontFamily: "'JetBrains Mono'", fontSize: 13, fontWeight: 500, outline: "none", boxSizing: "border-box", marginBottom: 4, letterSpacing: -0.3 }} />
            {stepUpCA.length > 3 && (
              <div style={{ fontFamily: "'JetBrains Mono'", fontSize: 11, color: "#00ff88", padding: "4px 2px 8px", animation: "slideIn 0.2s ease", letterSpacing: -0.3, display: "flex", alignItems: "center", gap: 4 }}>
                <Icon d={Icons.check} size={11} color="#00ff88" />
                {(() => { const m = COINS.find(c => stepUpCA.toLowerCase().includes(c.ticker.replace("$","").toLowerCase())); return m ? `${m.ticker} · ${m.mcap} · ${m.change}` : `${COINS[0].ticker} · ${COINS[0].mcap} · ${COINS[0].change}`; })()}
              </div>
            )}

            {/* Thesis */}
            <div style={{ fontFamily: "'Inter'", fontWeight: 600, fontSize: 10, color: "#666", marginBottom: 6, marginTop: 12, textTransform: "uppercase", letterSpacing: 1 }}>Your Thesis</div>
            <textarea value={stepUpThesis} onChange={e => { if (e.target.value.length <= 280) setStepUpThesis(e.target.value); }} placeholder={`Why should they buy this?`} rows={3} style={{ width: "100%", padding: "12px 14px", borderRadius: 12, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#fff", fontFamily: "'Inter'", fontSize: 13, fontWeight: 400, outline: "none", resize: "none", boxSizing: "border-box", lineHeight: 1.6, letterSpacing: -0.2 }} />
            <div style={{ fontFamily: "'JetBrains Mono'", fontSize: 10, color: stepUpThesis.length > 250 ? "#ff2d78" : "#444", textAlign: "right", marginTop: 3, letterSpacing: -0.3 }}>{stepUpThesis.length}/280</div>

            {/* Submit */}
            <button onClick={() => handleStepUp(stepUpCA, stepUpThesis)} disabled={!stepUpCA.trim() || !stepUpThesis.trim()} style={{ width: "100%", padding: "14px", borderRadius: 14, border: "none", background: stepUpCA.trim() && stepUpThesis.trim() ? "linear-gradient(135deg,#ff2d78,#ff6622)" : "rgba(255,255,255,0.06)", color: stepUpCA.trim() && stepUpThesis.trim() ? "#fff" : "#444", fontFamily: "'Inter'", fontWeight: 800, fontSize: 15, cursor: stepUpCA.trim() && stepUpThesis.trim() ? "pointer" : "default", marginTop: 14, letterSpacing: -0.3, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, transition: "all 0.2s ease" }}>
              <Icon d={speakerInfo ? Icons.users : Icons.mic} size={16} color={stepUpCA.trim() && stepUpThesis.trim() ? "#fff" : "#444"} />
              {speakerInfo ? "Join Queue" : "Take the Mic"}
            </button>
          </div>
        </div>
      )}

      {/* ═══ BUY SHEET ═══ */}
      {showBuySheet && speakerInfo && (
        <div data-ui="1" style={{ position: "absolute", bottom: 0, left: 0, right: 0, zIndex: 50, animation: "modalUp 0.3s ease" }}>
          <div style={{ background: "rgba(0,0,0,0.5)", position: "absolute", top: -1000, left: 0, right: 0, bottom: 0 }} onClick={() => setShowBuySheet(false)} />
          <div style={{ background: "rgba(12,6,16,0.98)", backdropFilter: "blur(24px)", borderRadius: "20px 20px 0 0", padding: "20px", paddingBottom: "max(20px, env(safe-area-inset-bottom))", border: "1px solid rgba(255,255,255,0.06)", borderBottom: "none", position: "relative" }}>
            {/* Handle bar */}
            <div style={{ width: 36, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.15)", margin: "-4px auto 16px" }} />
            {/* Coin header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, paddingRight: 32 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: "linear-gradient(135deg,#00ff88,#00cc66)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Inter'", fontWeight: 900, fontSize: 15, color: "#000" }}>{speakerInfo.coin.ticker[1]}</div>
                <div>
                  <div style={{ fontFamily: "'Inter'", fontWeight: 700, fontSize: 16, color: "#fff", letterSpacing: -0.5 }}>{speakerInfo.coin.ticker}</div>
                  <div style={{ fontFamily: "'JetBrains Mono'", fontSize: 10, color: "#666", letterSpacing: -0.3 }}>{speakerInfo.coin.mcap}</div>
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontFamily: "'JetBrains Mono'", fontSize: 16, fontWeight: 700, color: "#fff", letterSpacing: -0.5 }}>${speakerInfo.coin.price}</div>
                <div style={{ fontFamily: "'JetBrains Mono'", fontSize: 11, fontWeight: 600, color: speakerInfo.coin.positive ? "#00ff88" : "#ff4444", letterSpacing: -0.3 }}>{speakerInfo.coin.change}</div>
              </div>
              <button onClick={() => setShowBuySheet(false)} style={{ position: "absolute", top: 20, right: 16, background: "rgba(255,255,255,0.06)", border: "none", color: "#666", width: 28, height: 28, borderRadius: 8, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Icon d={Icons.x} size={14} color="#666" />
              </button>
            </div>

            {/* Amount display */}
            <div style={{ textAlign: "center", padding: "20px 0 16px" }}>
              <div style={{ fontFamily: "'JetBrains Mono'", fontSize: 36, fontWeight: 700, color: buyAmount ? "#fff" : "#333", letterSpacing: -1.5, transition: "color 0.2s" }}>${buyAmount || "0"}</div>
            </div>

            {/* Percentage buttons */}
            <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
              {[10, 25, 50, "Max"].map(pct => (
                <button key={pct} onClick={() => { const v = pct === "Max" ? walletBalance : (walletBalance * pct / 100); setBuyAmount(v.toFixed(2)); }} style={{ flex: 1, padding: "9px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)", color: "#aaa", fontFamily: "'Inter'", fontSize: 12, fontWeight: 600, cursor: "pointer", letterSpacing: -0.2, transition: "all 0.15s" }}>{pct === "Max" ? "Max" : `${pct}%`}</button>
              ))}
            </div>

            {/* Number pad */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 6, marginBottom: 14 }}>
              {[1,2,3,4,5,6,7,8,9,".",0,"del"].map(key => (
                <button key={key} onClick={() => { if (key === "del") setBuyAmount(p => p.slice(0,-1)); else setBuyAmount(p => p + key); }} style={{ padding: "14px", borderRadius: 12, border: "none", background: "rgba(255,255,255,0.04)", color: key === "del" ? "#666" : "#fff", fontFamily: key === "del" ? "'Inter'" : "'JetBrains Mono'", fontSize: key === "del" ? 12 : 18, fontWeight: key === "del" ? 500 : 600, cursor: "pointer", transition: "background 0.1s", letterSpacing: -0.5 }}>
                  {key === "del" ? <Icon d="M21 4H8l-7 8 7 8h13a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2zM18 9l-6 6M12 9l6 6" size={16} color="#666" /> : key}
                </button>
              ))}
            </div>

            {/* Balance */}
            <div style={{ fontFamily: "'Inter'", fontSize: 12, color: "#555", display: "flex", alignItems: "center", justifyContent: "center", gap: 4, marginBottom: 10 }}>
              <Icon d={Icons.wallet} size={12} color="#555" />
              ${(walletBalance * 180).toFixed(2)} available
            </div>

            {/* Fee breakdown — the flywheel */}
            {buyAmount && parseFloat(buyAmount) > 0 && (() => {
              const usd = parseFloat(buyAmount) * 180;
              return (
                <div style={{ marginBottom: 12, padding: "8px 10px", borderRadius: 10, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)" }}>
                  <div style={{ fontFamily: "'Inter'", fontSize: 9, fontWeight: 600, color: "#555", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>Fee Breakdown (1%)</div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                    <span style={{ fontFamily: "'Inter'", fontSize: 11, color: "#777" }}>{speakerInfo.name} earns</span>
                    <span style={{ fontFamily: "'JetBrains Mono'", fontSize: 11, fontWeight: 600, color: "#00ff88", letterSpacing: -0.3 }}>${(usd * FEE_CALLER).toFixed(2)}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                    <span style={{ fontFamily: "'Inter'", fontSize: 11, color: "#777" }}>Platform</span>
                    <span style={{ fontFamily: "'JetBrains Mono'", fontSize: 11, fontWeight: 600, color: "#888", letterSpacing: -0.3 }}>${(usd * FEE_PLATFORM).toFixed(2)}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ fontFamily: "'Inter'", fontSize: 11, color: "#777" }}>Protocol</span>
                    <span style={{ fontFamily: "'JetBrains Mono'", fontSize: 11, fontWeight: 600, color: "#888", letterSpacing: -0.3 }}>${(usd * FEE_TREASURY).toFixed(2)}</span>
                  </div>
                </div>
              );
            })()}

            {/* Privacy mode toggle */}
            <div onClick={() => setPrivacyMode(p => !p)} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 10px", marginBottom: 10, borderRadius: 10, background: privacyMode ? "rgba(255,45,120,0.06)" : "rgba(255,255,255,0.02)", border: `1px solid ${privacyMode ? "rgba(255,45,120,0.15)" : "rgba(255,255,255,0.04)"}`, cursor: "pointer", transition: "all 0.2s" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <Icon d={Icons.shield} size={12} color={privacyMode ? "#ff2d78" : "#555"} />
                <span style={{ fontFamily: "'Inter'", fontSize: 11, fontWeight: 600, color: privacyMode ? "#ff2d78" : "#666", letterSpacing: -0.2 }}>Privacy Mode</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontFamily: "'Inter'", fontSize: 9, color: "#555" }}>{privacyMode ? "Trade as anon" : "Trade publicly"}</span>
                <div style={{ width: 28, height: 16, borderRadius: 8, background: privacyMode ? "#ff2d78" : "rgba(255,255,255,0.1)", position: "relative", transition: "background 0.2s" }}>
                  <div style={{ width: 12, height: 12, borderRadius: 6, background: "#fff", position: "absolute", top: 2, left: privacyMode ? 14 : 2, transition: "left 0.2s" }} />
                </div>
              </div>
            </div>

            {/* Buy button */}
            <button onClick={handleBuy} disabled={!buyAmount || parseFloat(buyAmount) <= 0 || parseFloat(buyAmount) > walletBalance} style={{ width: "100%", padding: "15px", borderRadius: 14, border: "none", background: buyAmount && parseFloat(buyAmount) > 0 && parseFloat(buyAmount) <= walletBalance ? "linear-gradient(135deg,#00ff88,#00cc66)" : "rgba(255,255,255,0.06)", color: buyAmount && parseFloat(buyAmount) > 0 ? "#000" : "#444", fontFamily: "'Inter'", fontWeight: 800, fontSize: 15, cursor: "pointer", letterSpacing: -0.3, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, transition: "all 0.2s ease" }}>
              {buyAmount && parseFloat(buyAmount) > 0 ? <Icon d={Icons.zap} size={16} color="#000" /> : null}
              {buyAmount && parseFloat(buyAmount) > 0 ? (privacyMode ? `Buy ${speakerInfo.coin.ticker} (anon)` : `Buy ${speakerInfo.coin.ticker}`) : "Enter an amount"}
            </button>
          </div>
        </div>
      )}

      {/* ═══ FLOATING POSITION CARD ═══ */}
      {userPositions.length > 0 && (
        <div data-ui="1" style={{ position: "absolute", bottom: 210, right: 10, zIndex: 15 }}>
          {userPositions.slice(-1).map((pos, i) => {
            const pnl = ((pos.current - pos.entry) / pos.entry * 100);
            const pnlColor = pnl >= 0 ? "#00ff88" : "#ff4444";
            return (
              <div key={i} style={{ background: "rgba(8,4,12,0.9)", backdropFilter: "blur(16px)", borderRadius: 12, padding: "8px 12px", border: `1px solid ${pnl >= 0 ? "rgba(0,255,136,0.15)" : "rgba(255,68,68,0.15)"}`, animation: "slideIn 0.3s ease", boxShadow: "0 4px 16px rgba(0,0,0,0.3)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <span style={{ fontFamily: "'Inter'", fontWeight: 700, fontSize: 12, color: "#fff", letterSpacing: -0.3 }}>{pos.coin}</span>
                  <span style={{ fontFamily: "'JetBrains Mono'", fontWeight: 700, fontSize: 11, color: pnlColor, letterSpacing: -0.3 }}>{pnl >= 0 ? "+" : ""}{pnl.toFixed(1)}%</span>
                </div>
                <div style={{ fontFamily: "'JetBrains Mono'", fontSize: 10, color: "#666", letterSpacing: -0.3, marginTop: 2 }}>{pos.amount.toFixed(2)} SOL <span style={{ color: pnlColor }}>${(pos.amount * 180 * (1 + pnl/100)).toFixed(0)}</span></div>
              </div>
            );
          })}
        </div>
      )}

      {/* ═══ REACTION BURSTS ═══ */}
      {reactionBursts.map(b => (
        <div key={b.id} style={{ position: "absolute", bottom: 220, left: `${b.x}%`, zIndex: 20, animation: "floatUp 2s ease-out forwards", pointerEvents: "none" }}>
          <Icon d={b.emoji === "🚀" ? Icons.rocket : Icons.skull} size={22} color={b.emoji === "🚀" ? "#00ff88" : "#ff4444"} />
        </div>
      ))}

      {/* Announcement overlay removed — jumbotron intro IS the announcement */}
    </div>
  );
}
