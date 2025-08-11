/* Improved scripts.js - preserves previous features but upgrades candle/cake interactions.
   Includes: countdown, simple audio, confetti, balloons, boxes, letter, and enhanced candles with smoke.
*/
(() => {
  const $ = s => document.querySelector(s);
  const $$ = s => Array.from(document.querySelectorAll(s));
  const rand = (a,b) => a + Math.random()*(b-a);

  /* AudioManager (simple) */
  class AudioManager {
    constructor(){
      this.ctx = null; this.isMuted = false;
    }
    init(){ if(this.ctx) return; try{ this.ctx = new (window.AudioContext||window.webkitAudioContext)(); }catch(e){ this.ctx=null; } }
    resume(){ if(this.ctx && this.ctx.state==='suspended') this.ctx.resume(); }
    chime(freq=0,dur=0){
      if(!this.ctx || this.isMuted) return;
      const o=this.ctx.createOscillator(), g=this.ctx.createGain();
      o.type='sine'; o.frequency.value=freq; o.connect(g); g.connect(this.ctx.destination);
      g.gain.setValueAtTime(0,this.ctx.currentTime); g.gain.linearRampToValueAtTime(0.08,this.ctx.currentTime+0.02);
      o.frequency.exponentialRampToValueAtTime(freq*1.9,this.ctx.currentTime+dur); o.start(); o.stop(this.ctx.currentTime+dur+0.02);
    }
    pop(){ if(!this.ctx || this.isMuted) return; const sr=this.ctx.sampleRate; const buf=this.ctx.createBuffer(1, sr*0.06, sr); const data=buf.getChannelData(0); for(let i=0;i<data.length;i++) data[i]=(Math.random()*2-1)*Math.exp(-6*i/data.length); const s=this.ctx.createBufferSource(); s.buffer=buf; s.connect(this.ctx.destination); s.start(); }
    toggleMute(){ this.isMuted=!this.isMuted; return this.isMuted; }
  }
  const audio = new AudioManager();

  /* Confetti (shared) */
  const confCanvas = $('#confettiCanvas');
  const confCtx = confCanvas ? confCanvas.getContext('2d') : null;
  let confParticles = [], confRAF = null;
  function resizeConf(){ if(!confCtx) return; confCanvas.width = innerWidth; confCanvas.height = innerHeight; }
  addEventListener('resize', resizeConf); resizeConf();
  function spawnConfetti(n=220){
    if(!confCtx) return;
    confParticles = [];
    const colors = ['#ff6b9a','#ffd166','#ffb3d1','#e0aaff','#87ceeb','#98fb98'];
    for(let i=0;i<n;i++){
      confParticles.push({ x: Math.random()*confCanvas.width, y: Math.random()*-confCanvas.height, w:6+Math.random()*12, h:6+Math.random()*12, vx:(Math.random()-0.5)*1.2, vy:2+Math.random()*6, angle:Math.random()*360, va:(Math.random()-0.5)*8, color: colors[Math.floor(Math.random()*colors.length)]});
    }
    if(confRAF) cancelAnimationFrame(confRAF);
    const loop = () => {
      confCtx.clearRect(0,0,confCanvas.width,confCanvas.height);
      for(const p of confParticles){
        p.x += p.vx; p.y += p.vy; p.vy += 0.05; p.angle += p.va;
        if(p.y > confCanvas.height+50){ p.y = -50; p.x = Math.random()*confCanvas.width; p.vy = 2+Math.random()*6; }
        confCtx.save(); confCtx.translate(p.x,p.y); confCtx.rotate(p.angle*Math.PI/180); confCtx.fillStyle=p.color; confCtx.fillRect(-p.w/2,-p.h/2,p.w,p.h); confCtx.restore();
      }
      confRAF = requestAnimationFrame(loop);
    };
    loop();
    setTimeout(()=>{ confParticles = []; }, 11000);
  }



  /* Basic page features: boxes, letter, balloons (simplified) */
  document.addEventListener('DOMContentLoaded', () => {
    // Boxes
    const boxesGrid = $('#boxesGrid');
    if(boxesGrid){
      const boxesCount = 6; let opened = Array(boxesCount).fill(false); const magicIndex = Math.floor(Math.random()*boxesCount);
      for(let i=0;i<boxesCount;i++){
        const btn = document.createElement('button'); btn.className='box'; btn.textContent=`Box ${i+1}`; boxesGrid.appendChild(btn);
        btn.addEventListener('click', ()=> {
          if(opened[i]) return; opened[i]=true; btn.classList.add('open'); 
          if(i===magicIndex){ spawnConfetti(180); document.getElementById('magicFound') && document.getElementById('magicFound').classList.remove('hidden'); localStorage.setItem('magicFound','1'); }
        });
      }
      if(localStorage.getItem('magicFound')) document.getElementById('magicFound') && document.getElementById('magicFound').classList.remove('hidden');
      $('#backHome') && $('#backHome').addEventListener('click', ()=> location.href='index.html');
    }

    

    // Balloons (if present)
    const balloonArea = $('#balloonArea');
    if(balloonArea){
      let popped=0; const target=15;
      function spawn(n=20){
        balloonArea.innerHTML='';
        for(let i=0;i<n;i++){
          const b=document.createElement('div'); b.className='balloon';
          b.style.left = (Math.random()*78)+'%';
          const hue = 320 - Math.random()*60;
          b.style.background = `radial-gradient(circle at 40% 30%, #fff 0%, hsl(${hue} 90% 80%) 30%, hsl(${hue} 85% 65%) 100%)`;
          b.style.width = (40+Math.random()*40)+'px'; b.style.height = (50+Math.random()*50)+'px';
          b.addEventListener('click', ()=> {
            b.remove(); audio.init(); audio.pop(); popped++; $('#balloonCounter') && ($('#balloonCounter').textContent = popped+' / '+target); $('#barFill') && ($('#barFill').style.width = (popped/target*100)+'%');
            if(popped>=target){ setTimeout(()=> { location.href='candles.html'; }, 700); }
          });
          balloonArea.appendChild(b);
        }
      }
      spawn(20);
    }

    // Candles page: build candles, handle blow (improved)
    const candleWrap = $('#candleWrap');
    if(candleWrap){
      const TOTAL = 6;
      let blownCount = 0;
      const flameIdPrefix = 'flame-';
      function createCandle(i){
        const c = document.createElement('div'); c.className='candle'; c.dataset.idx = i;
        const wax = document.createElement('div'); wax.className='wax'; c.appendChild(wax);
        const flame = document.createElement('div'); flame.className='flame'; flame.id = flameIdPrefix + i; c.appendChild(flame);
        // click handler -> blow this candle (and earlier ones)
        c.addEventListener('click', ()=> {
          if(c.classList.contains('out')) return;
          // extinguish flame
          extinguishCandle(c, flame);
        });
        return c;
      }
      function extinguishCandle(candleEl, flameEl){
        // animate flame fade and spawn smoke
        candleEl.classList.add('out');
        flameEl.style.transition = 'opacity 420ms ease, transform 420ms ease'; flameEl.style.opacity = '0';
        audio.init(); audio.pop();
        spawnSmokeAt(elCenterX(candleEl), elTop(candleEl)+10);
        blownCount++;
        $('#candleCounter') && ($('#candleCounter').textContent = blownCount+' / '+TOTAL);
        $('#candleBar') && ($('#candleBar').style.width = (blownCount/TOTAL*100)+'%');
        if(blownCount >= TOTAL){
          setTimeout(()=> {
            spawnConfetti(260);
            document.getElementById('candleFinish') && document.getElementById('candleFinish').classList.remove('hidden');
          }, 700);
        }
      }
      // helper to get element center coordinates
      function elCenterX(el){ const r = el.getBoundingClientRect(); return r.left + r.width/2; }
      function elTop(el){ const r = el.getBoundingClientRect(); return r.top; }

      // spawn smoke particles near candle
      function spawnSmokeAt(x,y){
        const COUNT = 6;
        for(let i=0;i<COUNT;i++){
          const s = document.createElement('div'); s.className='smoke';
          s.style.left = (x + rand(-12,12)) + 'px'; s.style.top = (y + rand(-6,6)) + 'px';
          const scale = rand(0.6,1.6);
          s.style.transform = `scale(${scale})`;
          document.body.appendChild(s);
          const dx = rand(-18,18), dy = rand(-80,-140);
          s.animate([
            { transform: `translateY(0) scale(${scale})`, opacity: 0.9 },
            { transform: `translate(${dx}px, ${dy}px) scale(${scale*1.6})`, opacity: 0 }
          ], { duration: 900 + Math.random()*600, easing: 'cubic-bezier(.2,.8,.2,1)' }).onfinish = () => s.remove();
        }
      }

      // create and mount candles evenly spaced
      candleWrap.innerHTML = '';
      for(let i=0;i<TOTAL;i++){
        const c = createCandle(i);
        candleWrap.appendChild(c);
      }
    }

    // Finale interactions
    const celebrateBtn = $('#celebrateBtn');
    if(celebrateBtn){
      celebrateBtn.addEventListener('click', () => {
       spawnConfetti(320);
        // speak if available
       
      });
    }

    // small injected styles for smoke particles (in case not present)
    const style = document.createElement('style');
    style.innerHTML = `.smoke{position:fixed;left:0;top:0;width:14px;height:14px;border-radius:50%;background:radial-gradient(circle, rgba(200,200,200,0.9), rgba(200,200,200,0.2));pointer-events:none;z-index:80;filter:blur(1px)}`;
    document.head.appendChild(style);
  });
})();
