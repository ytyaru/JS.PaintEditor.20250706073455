window.addEventListener('DOMContentLoaded', (event) => {
    console.log('DOMContentLoaded!!');
    const editor = new PaintEditor();
});
window.addEventListener('beforeunload', (event) => {
    console.log('beforeunload!!');
});

