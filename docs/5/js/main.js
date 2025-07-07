window.addEventListener('DOMContentLoaded', (event) => {
    const editor = new PaintEditor();
});
window.addEventListener('beforeunload', (event) => {
    console.log('beforeunload!!');
});

