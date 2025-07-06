window.addEventListener('DOMContentLoaded', (event) => {
    console.log('DOMContentLoaded!!');
    /*
    const author = 'ytyaru';
    van.add(document.querySelector('main'), 
        van.tags.h1(van.tags.a({href:`https://github.com/${author}/JS.PaintEditor.20250706073455/`}, 'PaintEditor')),
        van.tags.p('ラスタ画像を描画する簡易エディタ。'),
//        van.tags.p('A simple editor for drawing raster images.'),
    );
    van.add(document.querySelector('footer'),  new Footer('ytyaru', '../').make());

    const a = new Assertion();
    a.t(true);
    a.f(false);
    a.e(TypeError, `msg`, ()=>{throw new TypeError(`msg`)});
    a.fin();
    */
    const editor = new PaintEditor();
});
window.addEventListener('beforeunload', (event) => {
    console.log('beforeunload!!');
});

