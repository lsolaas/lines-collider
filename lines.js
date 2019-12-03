var tickers = new Set();
var t = 0;

var instanceVar = 0.02;
var timeVar = 0.005;
var noiseScale = 3.5;
var ahead = 5;
var seed;


var density;
var paint = true;
var pen;

// pi/2 = 1.5707
// pi/3 = 1.047
// pi/4 = 0.7853
var defs = [];
var opts1 = [];

opts1.push (
    { "type": "brownian", "num": 1, "pos": [ 500, 400 ], "angStep": "pi,0.1", "every": 0, "step": 60, "child":
        { "type": "stroke", "ix": 0,  "stop": 1, "mod": 0.8, "num": 80, "dir": "seed,0.01", "dirVar": "ix,0.04", "every": 5, "brush": { "type": "curl-noise", "every": 40, "limit": 0.01, "iVar": 0, "tVar": 0.1, "range": "pi,0.02" } }
    }
);

opts1.push (
    { "type": "stroke", "ix": 11, "stop": 1, "mod": 0.8, "num": 12, "dir": "mod,4,1.5707", "every": 5, "brush": { "type": "noise", "every": 40, "limit": 0.01, "iVar": 0.2, "tVar": 0.1, "range": "pi,0.2" } }
);





function setup() {
    canvas = createCanvas(windowWidth, windowHeight);
    canvas.parent('container');
    background("#FFFFFF");
    //frameRate(30);
    stroke(0, 128);
    strokeWeight(1);
    smooth();

    density = pixelDensity();

    pen = createVector();

    opts1[0].wait = 400;
    defs.push( opts1[0] );
    defs.push( opts1[1] );

  reset();

}



function reset() {
  tickers.clear();
  background("#FFFFFF");
  t = 0;
  seed = int(random(999999));
  randomSeed(seed);
  noiseSeed(seed);

  for(let df of defs) {
    let num = df.num || 1;
    for(let i=0; i<num; i++) {
      df.ix = i;
      let thing = makeThing(df);
    }
  }

  //text(defString, 20, 20);
}

function makeThing(args = {}) {
  if(args.type == "line") return new Line(args);
  if(args.type == "arc") return new Arc(args);
  if(args.type == "brownian") return new Brownian(args);
  if(args.type == "grid") return new Grid(args);
  return new Stroke(args);
}

function draw() {
  if(paint) {

    loadPixels();
    for(let tkr of tickers) {
      tkr.tick();
    }

    t ++;

    if(t%30 == 29){
        let ts = tickers.size;
        console.log(t, ts);
        if(ts == 0) paint = false;
    }
  }

  if(mouseIsPressed) {
    stroke(0, 128);
    strokeWeight(1);
    //line(pmouseX, pmouseY, mouseX, mouseY);
    let np = createVector( pen.x + (mouseX - pen.x)/3, pen.y + (mouseY - pen.y)/3 );
    line(pen.x, pen.y, np.x, np.y);

    pen.set(np);
  }

}

/***** THING *****/
class Thing {

  constructor(args = {}) {
    this.type =       args.type   || "line";
    this.ix =         args.ix     || 0;
    this.dix =        args.dix    || 0;
    this.pos =        args.pos    || [random(width*0.15, width*0.85), random(height*0.15, height*0.85)];
    this.num =        args.num    || 1;
    this.child =      args.child  || null;
    //this.wait =       args.wait   || 0;
    this.wait =       (args.wait || 0) + (args.every || 0) * this.ix;
    this.created =    t;
    this.activated =  0;

    this.dir =        this.read(args.dir, 0);
    let dirVar =     this.read(args.dirVar, 0);
    let posVar =     this.read(args.posVar, 0);

    this.pos[0] += posVar * cos(this.dir);
    this.pos[1] += posVar * sin(this.dir);
    this.dir += dirVar;
  }

  read(s, df = 0) {
    if(s === undefined || s === null) s = df;
    if(! isNaN(Number(s))) return Number(s);

    let terms = s.split('+');
    let out = 0;

    for(let t of terms) {
      let parts = t.split(',');

      if(! isNaN(parts[0])) out += parseFloat(parts[0]);
      if(parts[0] == "ix") out += this.ix * parseFloat(parts[1] || 1);
      if(parts[0] == "dix") out += this.dix * parseFloat(parts[1] || 1);
      if(parts[0] == "pi") out += Math.PI * parseFloat(parts[1] || 1);
      if(parts[0] == "mod") out += this.ix % parseFloat(parts[1] || 1) * parseFloat(parts[2] || 1);
      if(parts[0] == "rand") out += random( parseFloat(parts[1] || 0), parseFloat(parts[2] || 1) );
      if(parts[0] == "noise") out += (noise( parseFloat(parts[1] || 0) * this.dix, parseFloat(parts[2] || 0) * this.ix ) - 0.5) * parseFloat(parts[3] || 1);
      if(parts[0] == "sin") out += Math.cos( parseFloat(parts[1] || 0) * this.ix/this.num * Math.PI*2 ) * 0.5 * parseFloat(parts[2] || 1);
      if(parts[0] == "seed") out += seed * parseFloat(parts[1] || 1);

      //console.log(parts[0] , out);
    }

    return out;
  }

}


/***** STROKE *****/
class Stroke extends Thing {
  constructor(args = {}) {
    super(args);


    this.vdir =       this.read(args.vdir, 0);
    this.mod =        this.read(args.mod, 0.8);
    this.life =       this.read(args.life, Infinity);
    this.stop =       args.stop   || 0;
    this.weight =     this.read(args.weight, 1);
    this.alpha =      this.read(args.alpha, 0.5);

    if(args.brush === undefined ) this.brush = {type: "noise2"};
    else this.brush = { ...args.brush };

    if(this.brush.type === "broken") {
      this.brush.turn =     this.read(this.brush.turn, 50);
      this.brush.arcs =     this.read(this.brush.arcs, 4);
    } else if(this.brush.type === "noise" || this.brush.type === "noise2" || this.brush.type === "sin") {
      this.brush.dVar =     this.read(this.brush.dVar, 0);
      this.brush.iVar =     this.read(this.brush.iVar, 0.01);
      this.brush.tVar =     this.read(this.brush.tVar, 0.01);
      this.brush.range =    this.read(this.brush.range, Math.PI*2);
    } else if(this.brush.type === "noise-var") {
        this.brush.dVar =     this.read(this.brush.dVar, 0);
        this.brush.iVar =     this.read(this.brush.iVar, 0.01);
        this.brush.tVar =     this.read(this.brush.tVar, 0.01);
        this.brush.range =    this.read(this.brush.range, Math.PI*2);
        this.brush.pow =      this.read(this.brush.pow, 3);
    } else if(this.brush.type === "arc") {
      this.brush.vdir =     this.read(this.brush.vdir, random(-0.05, 0.05));
      this.brush.vvdir =    this.read(this.brush.vvdir, random(-0.001, 0.001));
    } else if(this.brush.type === "curl") {
      this.brush.range =     this.read(this.brush.range, 0.1);
      this.brush.limit =    this.read(this.brush.limit, 0.1);
      this.brush.every =    this.read(this.brush.every, 1);
      this.brush.bounce =    this.read(this.brush.bounce, 0.8);
    } else if(this.brush.type === "curl-noise" || this.brush.type === "geometric") {
      this.brush.range =     this.read(this.brush.range, 0.1);
      this.brush.limit =    this.read(this.brush.limit, 0.1);
      this.brush.every =    this.read(this.brush.every, 1);
      this.brush.dVar =     this.read(this.brush.dVar, 0.01);
      this.brush.iVar =     this.read(this.brush.iVar, 0.01);
      this.brush.tVar =     this.read(this.brush.tVar, 0.01);
      this.brush.bounce =    this.read(this.brush.bounce, -0.8);
  }  else if(this.brush.type === "curl-smart") {
      this.brush.range =     this.read(this.brush.range, 0.1);
      this.brush.every =    this.read(this.brush.every, 1);
      this.brush.dVar =     this.read(this.brush.dVar, 0.01);
      this.brush.iVar =     this.read(this.brush.iVar, 0.01);
      this.brush.tVar =     this.read(this.brush.tVar, 0.01);
      this.brush.bounce =    this.read(this.brush.bounce, -0.8);
      this.brush.curve =    0;
      this.brush.sign =     1;
    }

    this.story =  [];
    this.action = this.hold;
    this.white = true;
    this.painting = true;
    this.childCount = 0;
    //this.mt = 0;
    //console.log("dix", this.dix, this.brush.dVar);

    tickers.add(this);
  }

  tick() {
    this.action();
  }


  hold() {
    if( this.wait > 0 && t-this.created < this.wait ) return;
    this.activated = t;
    this.mt = 0;
    this.action = this.update;
  }

  update() {
    let age = this.mt / this.life;
    if(age >= 1) tickers.delete(this);

    let dir = this.dir;
    let b = this.brush;
    if(b.type == "broken") {
      if( (t-this.activated) % b.turn == b.turn-1 ){
        //dir = this.dir + Math.floor(random(b.arcs)) * (Math.PI*2 / b.arcs);
        //dir = this.dir + Math.round((noise(this.dix, t*0.01)-0.5) * b.arcs) * (Math.PI*2 / b.arcs);
        dir = this.dir + Math.round((noise(this.ix*0.01, this.mt*0.1)-0.5) * (b.arcs/2)) * (Math.PI*2 / b.arcs);
        this.dir = dir;
      }
    } else if(b.type == "sin") {
      dir += (sin((this.dix* b.dVar + this.ix*b.iVar + this.mt*b.tVar)*Math.PI*2) * 0.5) * b.range;
    } else if(b.type == "noise") {
      dir += (noise(this.dix* b.dVar, this.ix*b.iVar, this.mt*b.tVar) - 0.5) * b.range;
    } else if(b.type == "noise2") {
      dir += (noise(this.dix* b.dVar, this.ix*b.iVar, this.mt*b.tVar) - 0.5) * b.range;
      this.dir = dir;
  } else if(b.type == "noise-var") {
      let vr = contrast( noise(this.mt*0.01, b.pow), 8) * b.range;
      //dir += (noise(this.dix* b.dVar, this.ix*b.iVar, this.mt*b.tVar) - 0.5) * vr;
      //let vr = contrast( noise(this.mt*0.01, 8), 3) * b.tVar;
      //dir += (noise(this.dix* b.dVar, this.ix*b.iVar, this.mt*vr) - 0.5) * b.range;
      dir += (noise(this.dix* b.dVar, this.ix*b.iVar, this.mt*b.tVar) - 0.5) * vr;
      this.dir = dir;
    } else if(b.type == "arc") {
      b.vdir += b.vvdir;
      dir += b.vdir;
      this.dir = dir;
    } else if(b.type == "curl") {
      if( Math.floor(random(b.every)) == 0 ) this.vdir += random(-0.5, 0.5) * b.range;
      if(Math.abs(this.vdir) > b.limit) this.vdir *= b.bounce
      dir += this.vdir;
      this.dir = dir;
    } else if(b.type == "curl-noise") {
      // if( this.mt % b.every == 0 ) this.vdir += (noise(this.dix* b.dVar, this.ix*b.iVar, this.mt*b.tVar) - 0.5) * b.range;
      // if(Math.abs(this.vdir) > b.limit) this.vdir *= b.bounce
      // dir += this.vdir;
      // this.dir = dir;

      let vr = contrast( noise(this.mt*0.01, 8), 6) * b.tVar;
      this.vdir += (noise(this.dix* b.dVar, this.ix*b.iVar, this.mt*vr) - 0.5) * b.range;
      if(Math.abs(this.vdir) > b.limit) this.vdir *= b.bounce
      dir += this.vdir;
      this.dir = dir;
    }  else if(b.type == "geometric") {
      if( this.mt % b.every == 0 ){
        this.vdir = noise(this.mt) < 0.5 ? 0 : (noise(this.dix* b.dVar, this.ix*b.iVar, this.mt*b.tVar) - 0.5) * b.range;
      }
      dir += this.vdir;
      this.dir = dir;
    } else if(b.type == "curl-smart") {
      if( this.mt % b.every == 0 ) this.vdir += (noise(this.dix* b.dVar, this.ix*b.iVar, this.mt*b.tVar) - 0.5) * b.range;
      if( (this.vdir > 0 && b.curve < 0) || (this.vdir < 0 && b.curve > 0) ) b.curve = 0;
      b.curve += this.vdir;
      if(Math.abs(b.curve) > Math.PI) this.vdir *= b.bounce;

      dir += this.vdir;
      this.dir = dir;
    }


    this.pos[0] += this.mod * cos(dir);
    this.pos[1] += this.mod * sin(dir);
    this.pos[2] = 1; // to paint or not

    if(this.pos[0] <= 0 || this.pos[0] >= width || this.pos[1] <= 0 || this.pos[1] >= height){
      tickers.delete(this);
      //this.action = this.finish;
    }
    this.story.push([...this.pos]);
    //if(this.ix === 9) console.log(this.story);

    if(this.story.length >= ahead) {
      if(this.stop > 0) {
        let m = Math.ceil(this.mod);
        let prev = this.story[ahead-2];
        for(let i=0; i<m; i++) {
          let vx = this.pos[0] - prev[0];
          let vy = this.pos[1] - prev[1];
          let pnum = (Math.floor(prev[0] + (vx/m) * i) + Math.floor(prev[1] + (vy/m) * i)*width) * density * 4;
          let px = pixels[ pnum ];
          if(this.stop === 1) {
            if( px < 220 ) this.action = this.finish;
          } else {
            if( px < 220 ){
              this.white = false;
            } else {
              if(!this.white) {
                this.white = true;
                this.painting = ! this.painting;
              }
            }
          }
        }
        this.story[ahead-2][2] = this.painting ? 1 : 0;
      }
      /*let pnum = (Math.floor(this.pos[0]) + Math.floor(this.pos[1])*width) * density * 4;
      let px = pixels[ pnum ];
      if( px < 220 ) this.action = this.finish;*/


      if(this.story[1][2] === 1) {
        strokeWeight(this.weight);
        stroke(0, this.alpha * 255);
        line(this.story[0][0], this.story[0][1], this.story[1][0], this.story[1][1]);
      }
      this.story.shift();
    }

    if(this.child && this.mt % this.child.every == this.child.every-1) {
      let args = {...this.child};

      args.pos = [...this.pos];
      if(this.child.dir === undefined || this.child.dir === null) args.dir = this.dir + Math.PI/2;
      args.ix = this.childCount;
      args.dix = this.ix;

      let thing = makeThing( args );

      this.childCount ++;
    }

    this.mt ++;

  }

  finish() {
    line(this.story[0][0], this.story[0][1], this.story[1][0], this.story[1][1]);
    this.story.shift();

    if(this.story.length < 2) tickers.delete(this);
  }


}


/***** LINE *****/
class Line extends Thing {

  constructor(args = {}) {
    super(args);

    this.end =   args.end   || [random(width), random(height)];

    if(this.wait > 0) tickers.add(this);
    else this.make();
  }

  tick() {
    if( this.wait > 0 && t-this.created < this.wait ) return;
    if( this.activated == 0 ) this.activated = t;
    this.make();
    tickers.delete(this);
  }

  make() {
    if( this.child === null) return;

    let num = this.child.num;
    let step = [ (this.end[0] - this.pos[0]) / num, (this.end[1] - this.pos[1]) / num ];
    let dir = Math.atan2(this.end[1] - this.pos[1], this.end[0] - this.pos[0]);
    //let dirVar = read(this.child.dirVar, 0);

    let args = {...this.child};
    for(let i=0; i<num; i++) {
      args.pos = [this.pos[0] + step[0]*i, this.pos[1] + step[1]*i];
      if(this.child.dir === undefined || this.child.dir === null) args.dir = dir + Math.PI/2;
      args.ix = i;
      args.dix = this.ix;

      let thing = makeThing( args );
    }
  }
}

/***** ARC *****/
class Arc extends Thing {

  constructor(args = {}) {
    super(args);

    this.rad =    this.read(args.rad, random(20, 200));
    this.from =   this.read(args.from, 0);
    this.to =     this.read(args.to, Math.PI*2);

    if(this.wait > 0) tickers.add(this);
    else this.make();
  }

  tick() {
    if( this.wait > 0 && t-this.created < this.wait ) return;
    if( this.activated == 0 ) this.activated = t;
    this.make();
    tickers.delete(this);
  }

  make() {
    if( this.child === null) return;

    let num = this.child.num;
    let arc = this.to-this.from;
    let step = arc / num;

    let args = {...this.child};
    for(let i=0; i<num; i++) {
      let x = this.rad * cos(this.from+step*i);
      let y = this.rad * sin(this.from+step*i);
      args.pos = [this.pos[0] + x, this.pos[1] + y];
      if(this.child.dir === undefined || this.child.dir === null) args.dir = Math.atan2(y, x);
      args.ix = i;
      args.dix = this.ix;

      let thing = makeThing( args );
    }
  }
}

/***** BROWNIAN *****/
class Brownian extends Thing {

  constructor(args = {}) {
    super(args);

    //this.len =        this.read(args.len, 20);
    this.step =       this.read(args.step, random(20, 200));
    this.angStep =    this.read(args.angStep, Math.PI/180);

    if(this.wait > 0) tickers.add(this);
    else this.make();
  }

  tick() {
    if( this.wait > 0 && t-this.created < this.wait ) return;
    if( this.activated == 0 ) this.activated = t;
    this.make();
    tickers.delete(this);
  }

  make() {
    if( this.child === null) return;

    let num = this.child.num;
    let pos = [...this.pos];
    let ang = this.dir;
    let aDivs = (Math.PI*2) / this.angStep;

    let args = {...this.child};
    for(let i=0; i<num; i++) {
      //do {
        ang += Math.round(random(-aDivs/2, aDivs/2)) * this.angStep;
      //} while (ang % Math.PI*2 == Math.PI);

      pos[0] += this.step * cos(ang);
      pos[1] += this.step * sin(ang);
      args.pos = [...pos];
      if(this.child.dir === undefined || this.child.dir === null) args.dir = ang;
      args.ix = i;
      args.dix = this.ix;

      let thing = makeThing( args );
    }
  }
}

/***** GRID *****/
class Grid extends Thing {

  constructor(args = {}) {
    super(args);

    this.w =        this.read(args.w, random(width*0.1, width*0.5));
    this.h =        this.read(args.h, random(height*0.1, height*0.5));
    this.cols =     this.read(args.cols, random(2, 10));
    this.rows =     this.read(args.rows, random(2, 10));
    this.rot =      this.read(args.rot, 0);

    if(this.wait > 0) tickers.add(this);
    else this.make();
  }

  tick() {
    if( this.wait > 0 && t-this.created < this.wait ) return;
    if( this.activated == 0 ) this.activated = t;
    this.make();
    tickers.delete(this);
  }

  make() {
    if( this.child === null) return;

    let num = this.cols * this.rows;
    let gap = [ this.w / this.cols, this.h / this.rows ];
    let ori = [ this.pos[0]-this.w/2, this.pos[1]-this.h/2 ];

    let n = 0;
    let args = {...this.child};
    for(let r=0; r<this.rows; r++) {
      for(let c=0; c<this.cols; c++) {
        args.pos = [ori[0] + gap[0]*c, ori[1] + gap[1]*r];
        if(this.child.dir === undefined || this.child.dir === null) args.dir = Math.atan2( args.pos[1] - this.pos[1], args.pos[0] - this.pos[0] );
        args.ix = n;
        args.dix = this.ix;

        let thing = makeThing( args );
        n++;
      }
    }

  }
}

function mousePressed() {
  pen.set(mouseX, mouseY);
}

function keyTyped() {
  if (key === ' ') {
    paint = !paint;
  } else if(key === 'r') {
    reset();
  } else if(key === 's') {
      let gt = getTime();
    saveCanvas("collider-"+ gt +".jpg");
    saveJSON(defs, "collider-"+ gt +".jpg", false);
  }/* else if(key === 'g') {
    seeGui = !seeGui;
    if(seeGui) gui.show();
    else gui.hide();
  }*/
  // uncomment to prevent any default behavior
  //return false;
}

function contrast(n, f) {
  return constrain(f*(n-0.5) + 0.5, 0, 1);
}

function getTime() {
  let now = new Date();
  return now.getFullYear().toString().substring(2,4) +
        (now.getMonth() + 1).toString().padStart(2, "0") +
        (now.getDate()).toString().padStart(2, "0") + "-" +
        (now.getHours()).toString().padStart(2, "0") +
        (now.getMinutes()).toString().padStart(2, "0") +
        (now.getSeconds()).toString().padStart(2, "0");
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  canvas.parent('container');
  background("#FFFFFF");
}
