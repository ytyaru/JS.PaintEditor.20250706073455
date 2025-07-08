(function(){
function isStr(v){return 'string'===typeof v||v instanceof String}
//function isRate(v){return Number.isSafeInteger(v) && 0<=v && v<=1}
function isRate(v){return 'number'===typeof v && 0<=v && v<=1}
function timestamp(dt) {
    const D = dt instanceof Date ? dt : new Date();
    return [`${D.getFullYear()}`, `${D.getMonth()+1}`.padStart(2, '0'), `${D.getDate()}`.padStart(2, '0')
        `${D.getHours()}`.padStart(2, '0'), `${D.getMinutes()}`.padStart(2, '0'), `${D.getSeconds()}`.padStart(2, '0')].join('');
}
class FileData {// name,ext,mimeType,quality
    constructor(name, ext) {
        this._exts = new Map([['json', 'application/json'], ['png', 'image/png'], ['gif', 'image/gif'], ['jpg', 'image/jpeg'], ['webp', 'image/webp'], ['avif', 'image/avif']]);//ext:mime
        this._name = `some-{now}`;
        this._ext = `png`;
        this._quality = 0.7;
    }
    get map() {return this._exts}
    get exts() {return [...this._exts.keys()]}
    get types() {return [...this._exts.values()]}
    getType(ext) {return this._exts.get(ext)}//指定キーが無いならundefinedを返す
    hasExt(v) {return this._exts.has(v)}
    hasType(v) {return !!this.#getExtFromType(v)}

    get fileName() {return `${this._name}.${this._ext}`}
    set fileName(v) {
        if (isStr(v)) {
            const i = v.lastIndexOf('.');
            if (-1===i){console.warn('fileNameには.が必要です。');return}
            const [N, E] = [v.slice(0, i), v.slice(i+1)];
            if (!this._exts.has(E)){console.warn(`拡張子は${[...this._exts.keys()]}のいずれかのみ有効です。`);return}
            [this._name, this._ext] = [N, E];
        }
    }
    get name() {return this._name}
    set name(v) {if(isStr(v)){this._name=(v || `some-{now}`).replace('{now}', timestamp())}}
    get ext() {return this._ext}
    set ext(v) {if (this._exts.has(v)) {this._ext=v}}
    get type() {return this._exts[this.ext]}
    set type(v) {this._ext = this.#getExtFromType(v) ?? this._ext;}
    get quality() {return this._quality}
    set quality(v) {console.log(v,isRate(v));if(isRate(v)){this._quality=v}}
    #getExtFromType(v) {
        for (let [K,V] of this._exts) {
            if (v===V) {return K}
        }
    }
}
class Importer {
    constructor(dndAreaEl, maker, canvas, palette, exporter) {
        this._dndAreaEl = (dndAreaEl instanceof HTMLElement) ? dndAreaEl : document.body;
        this._maker = maker;
        this._canvas = canvas;
        this._palette = palette;
        this._export = exporter;
        this._fileBtn = null;
        this.#init();
    }
    get dndAreaEl() {return this._dndAreaEl}
    set dndAreaEl(v) {if (v instanceof HTMLElement){this._dndAreaEl=v}}
    get fileButton() {return this._fileBtn}
    updateCanvas(canvas, img) {
        if (confirm('既存のキャンバスを破棄して宜しいですか？')) {
            this._canvas.el = canvas; //canvas; // e.detail.el;
            if (img) {this._canvas.ctx.drawImage(img, 0, 0);}
            document.querySelector('canvas').replaceWith(canvas);
        }
    }
    #init() {
        this._fileBtn = this.#makeFileBtn();
        this.#addListener();
    }
    #makeFileBtn() {
        const input = document.createElement('input');
        input.name = 'import';
        input.type = 'file';
        input.listen('click', async(e)=>{
            console.log('click')
            e.target.value = '';
        });
        input.listen('change', async(e)=>{
            console.log('change')
            await this.#loadFile(e.target.files[0]);
        });
        input.style.margin = '0';
        input.style.padding = '0';
        return input;
    }
    #addListener() {
        // drop > load-file > new-canvas
        this._dndAreaEl.listen('dragover', async(e)=>{e.preventDefault();});
        this._dndAreaEl.listen('drop', async(e)=>{
            e.preventDefault();
            const files = !!e.dataTransfer.items ? [...e.dataTransfer.items].filter(item=>'file'===item.kind).map(item=>item.getAsFile()) : [...e.dataTransfer.files];
            this._dndAreaEl.dispatchEvent(new CustomEvent('load-file', {detail:{files:files}}));
        });
        this._dndAreaEl.listen('load-file', async(e)=>{
            if (0===e.detail.files.length){return}
            const file = e.detail.files[0];
            await this.#loadFile(file);
        });
        this._dndAreaEl.listen('new-canvas', async(e)=>{//キャンバス新規作成
            this.updateCanvas(e.detail.canvas, e.detail.img);
        });
    }
    async #loadFile(file) {
        if (file.type.startsWith('image/')) {
            const img = await ImageLoader.fromFile(file);
            this.#newCanvas(img);
        } else if ('type name'.split(' ').some(k=>file[k].endsWith('json'))) {
            const json = JSON.parse(await file.text());
            const img = await ImageLoader.fromSrc(json.data);
            this.#newCanvas(img);
            this._palette.load(json);
            this._export.load(json);
            this._maker.load(json);
        } else {alert('画像かJSONのみ有効です。')}
    }
    #newCanvas(img) {
        this._dndAreaEl.dispatchEvent(new CustomEvent('new-canvas', {detail:{
            img: img,
            canvas: this._maker.make(img.width, img.height),
        }}));
    }
}
class PaintEditor {
    constructor() {this.#init();}
    #init() {
        this._el = this.#makeEl();
        this._maker = new CanvasMaker();
        this._maker.el.listen('make', async(e)=>{
            this._import.updateCanvas(e.detail.el);
        });
        this._canvas = new PaintCanvas(this._maker.make());
        this._palette = new Palette();
        this._palette.el.listen('choice', async(e)=>{
            this._canvas.pen = e.detail.pen;
            console.log(e.detail.pen, this._canvas.pen, e)
        });
        this._canvas.pen = this._palette.pens[0];
        this._export = new Exporter(this._canvas, this._palette);
        this._import = new Importer(this._el, this._maker, this._canvas, this._palette, this._export)
        const div = document.createElement('div');
        div.style.margin = '0';
        div.style.padding = '0';
        div.style.display = 'flex';
        div.style.flexDirection = 'row';
        div.style.flexWrap= 'wrap'; // nowrap/wrap/wrap-reverse
        //div.style.justifyContent = 'center';//align-items
        div.style.alignItems = 'center';//align-items
        div.append(this._maker.el, this._import.fileButton);
        //this._el.append(this._canvas.el, this._palette.el, this._export.el, this._maker.el, this._import.fileButton);
        this._el.append(this._canvas.el, this._palette.el, this._export.el, div);
        document.body.append(this._el);
    }
    #makeEl() {
        const div = document.createElement('div');
        return div;
    }
}
class ImageLoader {
    static async fromFile(file) {
        const dataUrl = await this.#loadFile(file);
        return await this.#loadImageSrc(dataUrl);
    }
    static async fromSrc(src) {return await this.#loadImageSrc(src)}
    static #loadFile(file) {
        return new Promise((resolve, reject)=>{
            const reader = new FileReader();
            reader.onload = (e)=>resolve(e.target.result);
            reader.onerror = (e)=>reject(e);
            reader.readAsDataURL(file);
        });
    }
    static #loadImageSrc(src) {
        return new Promise((resolve, reject)=>{
            const img = new Image();
            img.onload = (e)=>resolve(e.target)
            img.onerror = (e)=>reject(e);
            img.src = src;
        });
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
    load(json) {
        document.querySelector('input[name="width"]').value = json.width;
        document.querySelector('input[name="height"]').value = json.height;
    }
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
        W.listen('input', (e)=>this._width = e.target.value);
        H.listen('input', (e)=>this._height = e.target.value);
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
        button.listen('click', (e)=>{
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
//            this._ctx = this._canvas.getContext('2d', {alpha:true});
            this.#addListener();
            console.log(this._ctx);
        }
    }
    get ctx() {return this._ctx}
    get pen() {return this._pen}
    set pen(v) {if (v instanceof Pen){this._pen=v}}
    #addListener() {
        this._canvas.listen('pointerdown', (e)=>{
            this._isDown = true;
            this._ctx.beginPath();
            console.log(this);
            this._ctx.lineCap = this.pen.lineCap;
            this._ctx.lineWidth = this.pen.lineWidth;
            this._ctx.strokeStyle = this.pen.strokeStyle;
            this._ctx.moveTo(e.offsetX, e.offsetY);
            this._ctx.stroke();
        });
        this._canvas.listen('pointerup', (e)=>{this._isDown = false;});
        this._canvas.listen('pointermove', (e)=>{
            if (!this._isDown) {return false};
            this._ctx.lineTo(e.offsetX, e.offsetY);
            this._ctx.stroke();
        });
    }
}
//消しゴム: ctx.globalCompositeOperation = 'destination-out';
// https://leaysgur.github.io/posts/2015/12/22/172416/
class Palette {
    constructor() {
        this._varPen = new Pen(5,'#000000','round'); // 可変ペン(input要素)
        this._pens = [new Pen(5,'#000000','round'), new Pen(10,'#f00','round')]; // 固定ペン
//        this._pens = [new Pen(5,'rgba(255, 0, 0, 0.0)','round'), new Pen(5,'#000000','round'), new Pen(10,'#f00','round')]; // 固定ペン

        this.#makeEl();
    }
    get el() {return this._el}
    get pens() {return this._pens}
    /*
    set pens(v) {
        if (Array.isArray(v) && v.every(x=>x instanceof Pen)) {
            this._pens = v;
        }
    }
    */
    //get json() {return this._pens.map(pen=>[pen.lineWidth, pen.strokeStyle, pen.lineCap])}
    get json() { return {
        varPen: this._varPen.json,
        pens: this._pens.map(pen=>pen.json),
    } }
    load(json) {// JSONをインポートした時
        if (json.varPen) {
            this._width.value = json.varPen[0];
            this._widthLabel.textContent = `${json.varPen[0]}`;
            this._color.value = json.varPen[1];
            this._cap.value = json.varPen[2];
            this._varPen.lineWidth = json.varPen[0];
            this._varPen.strokeStyle = json.varPen[1];
            this._varPen.lineCap = json.varPen[2];
        }
        if (json.pens) {
            const pens = json.pens.map(p=>new Pen(...p));
            console.log(pens)
            this._pens = pens;
            // util/event/listener.js の実装によりel.remove()でremoveEventListener()を自動実行してくれる。
            console.log(this._penHolder.children.length)
            this._penHolder.removeChildren();
//            while(this._penHolder.firstChild) {this._penHolder.firstChild.remove()}
//            for (let child of this._penHolder.children) {child.unlisten()}; 
//            for (let child of this._penHolder.children) {child.remove()}; 
            console.log(this._penHolder.children.length)
            this._penHolder.append(...this._pens.map(pen=>this.#makePen(pen)));
            console.log(this._penHolder.children.length)
        }
    }
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
        input.listen('input', (e)=>{
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
        input.listen('input', (e)=>{
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
        select.listen('input', (e)=>{
            this._varPen.lineCap = e.target.value;
            this.#choice(-1, this._varPen);
        });
        return select;
    }
    #makeAdd() {
        const button = document.createElement('button');
        button.textContent = '＋';
        button.listen('click', (e)=>{
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
        div.name = 'penHolder'
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
        div.listen('pointerdown', (e)=>{
            if (timer) {clearTimeout(timer);}
            timer = setTimeout(() => {
                if (confirm('指定したペンを削除しますか？')) {
                    const nowEl = ('DIV'===e.target.parentElement.tagName ? e.target.parentElement : e.target);
                    const i = [...this._penHolder.querySelectorAll(`:scope > div`)].findIndex(el=>el===nowEl);
                    this._pens.splice(i,1);
//                    nowEl.removeEventListener();
                    nowEl.remove();
                }
            }, 2000);
        });
        div.listen('pointerup', (e)=>{
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
    get json() {return [this.lineWidth, this.strokeStyle, this.lineCap]}
}
class Exporter extends FileData {
    constructor(canvas, palette) {
        super();
        this._canvas = canvas;
        this._palette = palette;
        //this._data = new FileData();
        /*
        this._fileName = 'some.png';
        this._mimeType = 'image/png'; // jpeg/gif/webp/avif
        this._quality = 0.7;
        this._exts = new Map([['png', 'png'], ['gif', 'gif'], ['jpg', 'jpeg'], ['webp', 'webp'], ['avif', 'avif']]);//ext:mime
        this._ext = 'png';
        this._el = this.#makeEl();
        */
        this._el = this.#makeEl();
    }
    get el() {return this._el}
    /*
    get fileName() {return this._data.fileName}
    set fileName(v) {this._data.fileName=v}
    get ext() {return this._data.ext}
    set ext(v) {this._data.ext=v}
    get mimeType() {return this._data.type}
    set mimeType(v) {this._data.type=v}
    get quality() {return this._data.quality}
    set quality(v) {this._data.quality=v}
    */
    /*
    get fileName() {return this._fileName}
    set fileName(v) {this._fileName=v || 'some'}
    get ext() {return this._ext}
    set ext(v) {if (this._exts.has(v)) {this._ext=v}}
    get mimeType() {return `image/${this._exts[this.ext]}`}
    set mimeType(v) {
        for (let [K,V] of this._exts) {
            if (v===`image/${V}`) {this._ext=K}
        }
    }
    get quality() {return this._quality}
    set quality(v) {if(Number.isSafeInteger(v) && 0<=v && v<=1){this._quality=v}}
    get format() {return }
    */
    load(json) {
        this.fileName = json.name;
        this.quality = json.quality;
        this._el.querySelector('[name="fileName"]').value = this.name;
        this._el.querySelector('[name="ext"]').value = this.ext;
        this._el.querySelector('[name="quality"]').value = this.quality;
        console.log(json, json.quality, this.quality)
    }
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
        button.listen('click', (e)=>this.download());
        return button;
    }
    #makeFileName() {
        const input = document.createElement('input');
        input.name = 'fileName';
        input.type = 'text';
        input.value = this.name ?? 'some-{now}';
        //input.value = 'some-{now}';
        //console.log(input.style.fontSize, parseFloat(input.style.fontSize))
        //input.style.width = parseFloat(input.style.fontSize) * 16;
        //input.style.width = parseFloat(input.style.fontSize) * 16;
//        console.log(getComputedStyle(input), getComputedStyle(input).getPropertyValue('font-size'));
        input.style.width = `${10 * 10}px`;
        input.listen('input', (e)=>{
            this.fileName = e.target.value;
        });
        return input;
    }
    #makeExt() {
        const select = document.createElement('select');
        select.name = 'ext';
        select.value = this.ext ?? 'png';
        //const options = [...this._exts.keys()].map((v,i)=>{
        //const options = this._data.exts.map((v,i)=>{
        const options = this.exts.map((v,i)=>{
            const option = document.createElement('option');
            option.value = v;
            option.textContent = v;
            if ('png'===v) {option.selected = true}
            return option;
        });
        select.append(...options);
        select.listen('input', (e)=>{
            this.ext = e.target.value;
        });
        return select;
    }
    #makeQuality() {
        const input = document.createElement('input');
        input.name = 'quality';
        input.type = 'number';
        //input.value = 0.7;
        input.value = this.quality ?? 0.7;
        input.min = 0;
        input.max = 1;
        input.step = 0.01;
        input.listen('input', (e)=>this.quality=e.target.value);
        return input;
    }
    download(name, mimeType, quality) {
        this.downloadImage(name, mimeType, quality);
        this.downloadJson(name, mimeType, quality);
    }
    downloadImage(name, mimeType, quality) {
        const url = this._canvas.el.toDataURL(mimeType ?? this.mimeType, quality ?? this.quality);
        const a = document.createElement('a');
        document.body.appendChild(a);
        a.download = name ?? this.fileName;
        a.href = url;
        a.click();
        a.remove();
    }
    downloadJson(name, mimeType, quality) {
        const text = JSON.stringify(this.#makeJson(name, mimeType, quality))
        console.log(this.#makeJson(name, mimeType, quality))
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
        width: this._canvas.el.width,
        height: this._canvas.el.height,
        //mimeType: mimeType ?? this.mimeType,
        mimeType: mimeType ?? this.type,
        quality: quality ?? this.quality,
        ...this._palette.json,
//        varPen: [this._palette.],
//        pens: this._palette.json,
        //data: this._canvas.el.toDataURL(mimeType ?? this.mimeType, quality ?? this.quality),
        data: this._canvas.el.toDataURL(mimeType ?? this.type, quality ?? this.quality),
    }}
}
window.PaintEditor = PaintEditor;
})();
