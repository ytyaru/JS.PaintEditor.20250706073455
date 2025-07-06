(function(){
class PaintEditor {
    constructor() {
        this.#makeEl();
        document.body.append(this._canvas.el, this._palette.el, this._export.el);
    }
    #makeEl() {
        this._canvas = new PaintCanvas();
        this._palette = new Palette();
        this._palette.el.addEventListener('choice', async(e)=>{
            this._canvas.pen = e.detail.pen;
            console.log(e.detail.pen, this._canvas.pen, e)
        });
        this._canvas.pen = this._palette.pens[0];
        this._export = new Exporter(this._canvas.el);
    }
}

function isValidSize(size) {return Number.isSafeInteger(size) && 0<size}
function calcAspectRatio(width, height) {
    function gcd(a, b) {return b === 0 ? a : gcd(b, a % b);}
    const commonDivisor = gcd(width, height);
    const aspectRatioWidth = width / commonDivisor;
    const aspectRatioHeight = height / commonDivisor;
    return [aspectRatioWidth, aspectRatioHeight];
}
/*
class CanvasMaker {
    constructor(width=640, height=480, rateW=4, rateH=3, isEven=true) {
        this._width = isValidSize(width) ? width : 640;
        this._height = isValidSize(height) ? height : 480;
        [this._rateW, this._rateH] = calcAspectRatio(this._width, this._height);
        //this._rateW = rateW;
        //this._rateH = rateH;
    }
    get width() {return this._width}
    set width(v) {if(isValidSize(v)){this._width=v}}
    get height() {return this._height}
    set height(v) {if(isValidSize(v)){this._height=v}}
    make() {
        const canvas = document.createElement('canvas');
        canvas.width = this._width;
        canvas.height = this._height;
        canvas.style = `border: solid 1px #000; box-sizing: content-box;`;
        return canvas;
    }
    #makeEl() {
        const div = document.createElement('div');
        div.append(this.#makeSize(false), this.#makeSize(true));
        return div;
    }
    #makeSize(isHeight=false) {
        const input = document.createElement('input');
        input.type = 'number';
        input.step = this._isEven ? 2 : 1;
        input.min = this._isEven ? 2 : 1;
        //input.max = Math.max(isHeight ? document.body.clientHeight : document.documentElement.clientWidth);
        input.max = isHeight ? document.body.clientHeight : document.documentElement.clientWidth;
        input.name = isHeight ? 'height' : 'width'; 
    }
    #makeButton(isHeight=false) {
        const button = document.createElement('button');
        button.addEventListener('click', (e)=>{
            this.make();
        });
        return button;
    }
}
*/
class PaintCanvas {
    constructor(width=640, height=480) {
        this._width = isValidSize(width) ? width : 640;
        this._height = isValidSize(height) ? height : 480;
        this._isDown = false;
        this._pen = null;
        this.#makeEl();
    }
    get el() {return this._canvas}
    get ctx() {return this._ctx}
    get pen() {return this._pen}
    set pen(v) {if (v instanceof Pen){this._pen=v}}
    #makeEl() {
        this._canvas = document.createElement('canvas');
        this._canvas.width = this._width;
        this._canvas.height = this._height;
        this._canvas.style = `border: solid 1px #000; box-sizing: content-box;`;
        this._ctx = this._canvas.getContext('2d');
        this.#addListener();
    }
    #addListener() {
        this._canvas.addEventListener('pointerdown', (e)=>{
            this._isDown = true;
            this._ctx.beginPath();
            console.log(this);
            this._ctx.lineCap = this.pen.lineCap;
            this._ctx.lineWidth = this.pen.lineWidth;
            this._ctx.strokeStyle = this.pen.strokeStyle;
            this._ctx.moveTo(e.offsetX, e.offsetY);
            this._ctx.stroke();
        });
        this._canvas.addEventListener('pointerup', (e)=>{this._isDown = false;});
        this._canvas.addEventListener('pointermove', (e)=>{
            if (!this._isDown) {return false};
            this._ctx.lineTo(e.offsetX, e.offsetY);
            this._ctx.stroke();
        });
    }
}
class Palette {
    constructor() {
        this._varPen = new Pen(5,'#000','round'); // 可変ペン(input要素)
        this._pens = [new Pen(5,'#000','round'), new Pen(10,'#f00','round')]; // 固定ペン
        this.#makeEl();
    }
    get el() {return this._el}
    get pens() {return this._pens}
    #makeEl() {
        this._el = this.#makePalette();
        this._color = this.#makeColorEl();
        this._width = this.#makeLineWidthEl();
        this._widthLabel = this.#makeLineWidthLabel()
        this._cap = this.#makeLineCapEl();
        this._add = this.#makeAdd();
        this._penHolder = this.#makePenHolder();
        this._el.append(this._width, this._widthLabel, this._color, this._cap, this._add, this._penHolder)
    }
    #choice(i, pen) {this._el.dispatchEvent(new CustomEvent('choice', {detail:{i:i, pen:pen}}))}//ペンを選択した時のイベント
    #makePalette() {
        const div = document.createElement('div');
        div.style.display = 'flex';
        div.style.flexDirection = 'row';
        div.style.flexWrap= 'wrap'; // nowrap/wrap/wrap-reverse
        return div;
    }
    #makeColorEl() {
        const input = document.createElement('input');
        input.type = 'color';
        input.value = 'red';
        input.addEventListener('input', (e)=>{
            this._varPen.strokeStyle = e.target.value;
            this.#choice(-1, this._varPen);
        });
        return input;
    }
    #makeLineWidthEl() {
        const input = document.createElement('input');
        input.type = 'range'; // number
        input.min = 1;
        input.max = 20;
        input.value = 5;
        input.addEventListener('input', (e)=>{
            this._widthLabel.textContent = `${e.target.value}`;
            this._varPen.lineWidth = parseInt(e.target.value);
            console.log(this._varPen.lineWidth , e.target.value)
            this.#choice(-1, this._varPen);
        });
        return input;
    }
    #makeLineWidthLabel() {
        const span = document.createElement('span');
        span.textContent = '5';
        return span;
    }
    #makeLineCapEl() {
        const select = document.createElement('select');
        const options = 'butt round square'.split(' ').map((v,i)=>{
            const option = document.createElement('option');
            option.value = v;
            option.textContent = v;
            if ('round'===v) {option.selected = true}
            return option;
        });
        select.append(...options);
        select.addEventListener('input', (e)=>{
            this._varPen.lineCap = e.target.value;
            this.#choice(-1, this._varPen);
        });
        return select;
    }
    #makeAdd() {
        const button = document.createElement('button');
        button.textContent = '＋';
        button.addEventListener('click', (e)=>{
            e.target.disabled = true;
            setTimeout(() => {e.target.disabled = false;}, 1000);
            const pen = new Pen(this._width.value, this._color.value, this._cap.value);
            this._pens.push(pen);
            this._penHolder.appendChild(this.#makePen(pen));
        });
        return button;
    }
    #makePenHolder() {
        const div = document.createElement('div');
        div.style.display = 'flex';
        div.style.flexDirection = 'row';
        div.style.flexWrap= 'wrap'; // nowrap/wrap/wrap-reverse
        div.append(...this._pens.map(pen=>this.#makePen(pen)));
        return div;
    }
    #makePen(pen) {
        const div = document.createElement('div');
        div.className = 'holded-pen'
        div.style.margin = '0';
        div.style.padding = '0';
        div.style.display = 'flex';
        div.style.flexDirection = 'column';
        div.style.alignItems = 'center';
        div.style.justifyContent = 'center';
        const box = document.createElement('div');
        box.style.width = '32px';
        box.style.height = '32px';
        box.style.backgroundColor = pen.strokeStyle;
        const span = document.createElement('span');
        span.style.margin = '0';
        span.style.padding = '0';
        span.textContent = pen.abbrCapWid;
        span.style.fontSize = '0.5em';
        span.style.lineHeight = '1em';
        span.style.letterSpacing = '0em';
        div.append(box, span);
        let timer = null;
        div.addEventListener('pointerdown', (e)=>{
            timer = setTimeout(() => {
                if (confirm('指定したペンを削除しますか？')) {
                    const nowEl = ('DIV'===e.target.parentElement.tagName ? e.target.parentElement : e.target);
                    const i = [...this._penHolder.querySelectorAll(`:scope > div`)].findIndex(el=>el===nowEl);
                    this._pens.splice(i,1);
                    nowEl.remove();
                }
            }, 2000);
        });
        div.addEventListener('pointerup', (e)=>{
            clearTimeout(timer);
            const nowEl = ('DIV'===e.target.parentElement.tagName ? e.target.parentElement : e.target);
            const i = [...this._penHolder.querySelectorAll(`:scope > div`)].findIndex(el=>el===nowEl);
            this.#choice(i, this._pens[i]);
        });
        return div;
    }
}
class Pen {
    constructor(W,S,C) {
        this._lineWidth = W ?? 5;
        this._strokeStyle = S ?? '#000';
        this._lineCap = C ?? 'round';
    }
    get lineWidth() {return this._lineWidth}
    set lineWidth(v) {if (Number.isSafeInteger(v) && 0<v) {this._lineWidth=v}}
    get strokeStyle() {return this._strokeStyle}
    set strokeStyle(v) {this._strokeStyle=v}
    get lineCap() {return this._lineCap}
    set lineCap(v) {if ('butt round square'.split(' ').some(n=>n===v)){this._lineCap=v}}
    get abbrCapWid() {return `${this._lineCap[0].toUpperCase()}${this._lineWidth}`}
}
class Exporter {
    constructor(canvas) {
        this._canvas = canvas;
        this._fileName = 'some.png';
        this._mimeType = 'image/png'; // jpeg/gif/webp/avif
        this._quality = 0.7;
        this._el = this.#makeEl();
    }
    get el() {return this._el}
    get fileName() {return this._fileName}
    set fileName(v) {this._fileName=v}
    get mimeType() {return this._mimeType}
    set mimeType(v) {this._mimeType=v}
    get quality() {return this._quality}
    set quality(v) {if(Number.isSafeInteger(v) && 0<=v && v<=1){this._quality=v}}
    #makeEl() {
        const button = document.createElement('button');
        button.textContent = '⬇';
        button.addEventListener('click', (e)=>this.download());
        return button;
    }
    download(name, mimeType, quality) {
        const url = this._canvas.toDataURL(mimeType ?? this._mimeType, quality ?? this._quality);
        const a = document.createElement('a');
        document.body.appendChild(a);
        a.download = name ?? this._fileName;
        a.href = url;
        a.click();
        a.remove();
    }
}
window.PaintEditor = PaintEditor;
})();
