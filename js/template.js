document.addEventListener("DOMContentLoaded", function (event) {
    console.log('open print dialog');
    window.print();
    console.log('done printing');
    window.close();
});