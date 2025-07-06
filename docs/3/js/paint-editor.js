(function(){
class PaintEditor {
    constructor() {
        this.#makeEl();
        document.body.append(this._canvas.el, this._palette.el, this._export.el, this._maker.el);
    }
    #makeEl() {
        this._maker = new CanvasMaker();
        this._maker.el.addEventListener('make', async(e)=>{
            if (confirm('既存のキャンバスを破棄して宜しいですか？')) {
                console.log(e.detail.el)
                this._canvas.el = e.detail.el;
                console.log(e.detail.el, document.querySelector('canvas'));
                document.querySelector('canvas').replaceWith(e.detail.el);
            }
        });
        this._canvas = new PaintCanvas(this._maker.make());
        this._palette = new Palette();
        this._palette.el.addEventListener('choice', async(e)=>{
            this._canvas.pen = e.detail.pen;
            console.log(e.detail.pen, this._canvas.pen, e)
        });
        this._canvas.pen = this._palette.pens[0];
        this._export = new Exporter(this._canvas, this._palette);
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
class CanvasMaker {
    constructor(width=640, height=480, rateW=4, rateH=3, isEven=true) {
        this._width = isValidSize(width) ? width : 640;
        this._height = isValidSize(height) ? height : 480;
        if (document.body.clientWidth < this._width) {this._width = document.body.clientWidth}
        if (document.documentElement.clientHeight < this._height) {this._height = document.documentElement.clientHeight}
        [this._rateW, this._rateH] = calcAspectRatio(this._width, this._height);
        this.isEven = isEven;
        this._el = this.#makeEl();
    }
    get el() {return this._el}
    get width() {return this._width}
    set width(v) {if(isValidSize(v)){this._width=v}}
    get height() {return this._height}
    set height(v) {if(isValidSize(v)){this._height=v}}
    get isEven() {return this._isEven}
    set isEven(v) {this._isEven=!!v}
    make(width, height) {
        const canvas = document.createElement('canvas');
        canvas.width = width ?? this._width;
        canvas.height = height ?? this._height;
        canvas.style = `border: solid 1px #000; box-sizing: content-box;`;
        return canvas;
    }
    #makeEl() {
        const div = document.createElement('div');
        const W = this.#makeSize(false);
        const H = this.#makeSize(true);
        W.addEventListener('input', (e)=>this._width = e.target.value);
        H.addEventListener('input', (e)=>this._height = e.target.value);
        div.append(W, H, this.#makeButton());
        return div;
    }
    #makeSize(isHeight=false) {
        const input = document.createElement('input');
        input.type = 'number';
        input.step = this._isEven ? 2 : 1;
        input.min = this._isEven ? 2 : 1;
        input.max = isHeight ? document.documentElement.clientHeight : document.body.clientWidth;
        input.name = isHeight ? 'height' : 'width';
        input.value = this[`_${input.name}`];
        return input;
    }
    #makeButton() {
        const button = document.createElement('button');
        button.textContent = '🔨';
        button.addEventListener('click', (e)=>{
            this.el.dispatchEvent(new CustomEvent('make', {detail:{el:this.make(), width:this.width, height:this.height}}))
        });
        return button;
    }
}
class PaintCanvas {
    constructor(canvas) {
        this._isDown = false;
        this._pen = null;
        this.el = canvas;
    }
    get el() {return this._canvas}
    set el(v) {
        if (v instanceof HTMLCanvasElement){
            this._canvas = v;
            this._ctx = this._canvas.getContext('2d');
            this.#addListener();
            console.log(this._ctx);
        }
    }
    get ctx() {return this._ctx}
    get pen() {return this._pen}
    set pen(v) {if (v instanceof Pen){this._pen=v}}
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
    get json() {return this._pens.map(pen=>[pen.lineWidth, pen.strokeStyle, pen.lineCap])}
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
    constructor(canvas, palette) {
        this._canvas = canvas;
        this._palette = palette;
        this._fileName = 'some.png';
        this._mimeType = 'image/png'; // jpeg/gif/webp/avif
        this._quality = 0.7;
        //this._exts = new Map([['png', 'png'], ['gif', 'gif'], ['jpeg', 'jpg'], ['webp', 'webp'], ['avif', 'avif']]);
        this._exts = new Map([['png', 'png'], ['gif', 'gif'], ['jpg', 'jpeg'], ['webp', 'webp'], ['avif', 'avif']]);//ext:mime
        this._ext = 'png';
        /*
        this._exts = {// mimieType:extention
            png:'png',
            gif:'gif',
            jpeg:'jpg',
            webp:'webp'
            avif:'avif',
        }
        */
        this._el = this.#makeEl();
    }
    get el() {return this._el}
    get fileName() {return this._fileName}
    set fileName(v) {this._fileName=v || 'some'}
    //get ext() {return this._exts[this.mimeType]}
    get ext() {return this._ext}
    set ext(v) {if (this._exts.has(v)) {this._ext=v}}
    /*
    set ext(v) {if (this._exts.has(v)) {[this._ext, this._mimeType]=[v,this._exts.get(v)]}}
    set ext(v) {
        if (this._exts.has(v)) {
            this._ext = v;
            this._mimeType = this._exts.get(v);
        }
    }
    */
    get mimeType() {return `image/${this._exts[this.ext]}`}
    /*
    get mimeType() {return this._mimeType}
    //set mimeType(v) {this._mimeType=v}
    set mimeType(v) {
        for (let [K,V] of this._exts) {
            if (v===V) {[this._ext, this._mimeType]=[K,V]}
        }
    }
    */
    get quality() {return this._quality}
    set quality(v) {if(Number.isSafeInteger(v) && 0<=v && v<=1){this._quality=v}}
    get format() {return }
    #makeEl() {
        const div = document.createElement('div');
        div.style.display = 'flex';
        div.style.flexDirection = 'row';
        div.style.flexWrap= 'wrap'; // nowrap/wrap/wrap-reverse
        div.append(this.#makeDownloadButton(), this.#makeFileName(), this.#makeExt(), this.#makeQuality());
        return div;
    }
    #makeDownloadButton() {
        const button = document.createElement('button');
        button.textContent = '⬇';
        button.addEventListener('click', (e)=>this.download());
        return button;
    }
    #makeFileName() {
        const input = document.createElement('input');
        input.name = 'fileName';
        input.type = 'text';
        input.value = 'some';
        input.addEventListener('input', (e)=>{
            this.fileName = e.target.value;
        });
        return input;
    }
    #makeExt() {
        const select = document.createElement('select');
        select.name = 'ext';
        const options = [...this._exts.keys()].map((v,i)=>{
            const option = document.createElement('option');
            option.value = v;
            option.textContent = v;
            if ('png'===v) {option.selected = true}
            return option;
        });
        select.append(...options);
        select.addEventListener('input', (e)=>{
            this.ext = e.target.value;
        });
        return select;
    }
    #makeQuality() {
        const input = document.createElement('input');
        input.name = 'quality';
        input.type = 'number';
        input.value = 0.7;
        input.min = 0;
        input.max = 1;
        input.step = 0.01;
        input.addEventListener('input', (e)=>this.quality=e.target.value);
        return input;
    }
    download(name, mimeType, quality) {
        this.downloadImage(name, mimeType, quality);
        this.downloadJson(name, mimeType, quality);
    }
    downloadImage(name, mimeType, quality) {
        const url = this._canvas.el.toDataURL(mimeType ?? this._mimeType, quality ?? this._quality);
        const a = document.createElement('a');
        document.body.appendChild(a);
        a.download = name ?? this._fileName;
        a.href = url;
        a.click();
        a.remove();
    }
    downloadJson(name, mimeType, quality) {
        const text = JSON.stringify(this.#makeJson(name, mimeType, quality))
        this.#downloadBlob(name, new Blob([new TextEncoder().encode(text)], {type:'application/json'}));
    }
    #downloadBlob(name, blob) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        document.body.appendChild(a);
        a.download = name ?? 'some.json';
        a.href = url;
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
    }
    #makeJson(name, mimeType, quality) {return {
        name: name ?? this.fileName,
        mimeType: mimeType ?? this.mimeType,
        quality: quality ?? this.quality,
        pens: this._palette.json,
        data: this._canvas.el.toDataURL(mimeType ?? this._mimeType, quality ?? this._quality),
    }}
}
window.PaintEditor = PaintEditor;
})();
