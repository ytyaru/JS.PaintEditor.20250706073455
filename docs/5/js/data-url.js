(function(){
class Base64 {
    static fromText(text) {return this.fromU8a(new TextEncoder().encode(text))}
    static toText(base64) {return new TextDecoder().decode(this.toU8a(base64))}
    static fromU8a(bytes) {return btoa(String.fromCodePoint(...bytes))}
    static toU8a(base64) {return Uint8Array.from(atob(base64), m=>m.codePointAt(0))}
    static is(base64) {return /^[A-Za-z0-9+/]+={0,2}$/.test(base64);}
    static toBase64Url(base64){return base64.replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/, '')}
    static toBase64UrlFromU8a(bytes){return this.toBase64Url(this.fromU8a(bytes))}
    static toBase64UrlFromText(text){return this.toBase64UrlFromU8a(new TextEncoder().encode(text))}
}
class Base64Url {
    static fromText(text) {return this.fromU8a(new TextEncoder().encode(text))}
    static toText(base64url) {return new TextDecoder().decode(this.toU8a(base64url))}
    static fromU8a(bytes) {return Base64.fromU8a(bytes).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/, '')}
    static toU8a(base64url) {return Base64.toU8a(this.#toBase64(base64url));}
    static is(base64url) {return /^[A-Za-z0-9\-_]+$/.test(base64url);}
    static #toBase64(base64url) {
        const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
        let B = base64;
        while (B.length % 4) {B += '=';}
        console.log(B)
        return B;
    }
    static toBase64(base64url) {
        for (let i=0; i<3; i++) {
            const padding = '='.repeat(i);
            const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/') + padding;
            console.log(base64)
            try {return Base64.fromU8a(Base64.toU8a(base64))}
            catch(e){console.warn(e)}
        }
        throw new TypeError('引数が不正値です。');
    }
}
//data:text/plain;charset=utf8;base64,44KE44GC8J+YgQ==
const REG_B = /^data:([A-Za-z0-9\/+\-_]+)(;charset=[A-Za-z0-9\-_]+)?;base64,([A-Za-z0-9+\/]+={0,2})$/; // Base64
const REG_P = /^data:([A-Za-z0-9\/+\-_]+)(;charset=[A-Za-z0-9\-_]+)?,([0-9A-Fa-f%]+={0,2})$/; // Percent
class DataUrl {
    static is(dataUrl) {return this.isBase64(dataUrl) || this.isPercent(dataUrl);}
    static isBase64(dataUrl) {return REG_B.test(dataUrl);}
    static isPercent(dataUrl) {return REG_P.test(dataUrl);}
    static async fromFile(file) {
        if (!(file instanceof File)){throw new TypeError(`引数はFile型であるべきです。`)}
        const u8a = new Uint8Array(await file.arrayBuffer());
        return `data:${file.type || 'application/octet-stream'};charset=utf8;base64,${Base64.fromU8a(u8a)}`;
    }
    static toBlob(dataUrl) {// fetch(dataUri)だとHTTPS上でしか動作しないため不採用
        console.log(this.isBase64(dataUrl), this.isPercent(dataUrl), dataUrl);
        if (!this.is(dataUrl)){throw new TypeError(`引数はDataURL形式であるべきです。`)}
        const is64 = this.isBase64(dataUrl); //Base64とPercentEncodingの二種類ある
        const match = dataUrl.match(is64 ? REG_B : REG_P);
        console.log((is64 ? Base64.toU8a : decodeURIComponent)(match[3]));
        const data = (is64 ? Base64.toU8a : decodeURIComponent)(match[3]);
        return new Blob(this.#isText(match) ? (is64 ? [...textDecoder.decode(data)] : [...data]) : data, {type:match[1]});
    }
    static #isText(match) {// base64データがテキストかバイナリか（完璧な区別をつけるのは実質不可能。imgage/svg+xmlもテキストの可能性があるがsvgz(gzip)の場合も同じMIMEで表されるのに、その内容はバイナリである。よってテキスト／バイナリの区別をMIMEでするのは不可能。base64文字列をバイナリ解析してそれっぽく判断することも不可能ではないが完璧な判断は不可能）
        return match[1].startsWith('text/');
    }
}
window.Base64 = Base64;
window.Base64Url = Base64Url;
window.DataUrl = DataUrl;
})();
