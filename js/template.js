document.addEventListener("DOMContentLoaded", function (event) {
    console.log('open print dialog');
    window.print();
    window.onafterprint = function (event) { 
        console.log('done printing');
        window.close();
    };
});