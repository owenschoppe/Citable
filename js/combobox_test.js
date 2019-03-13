var tag;

document.addEventListener("DOMContentLoaded", () => {
    tag = new TagInput('Tags','Enter a tag');
    document.querySelector('#tagInput').appendChild(tag.div);
    window.setTimeout(()=>{
        tag.setTagOptions(['foo', 'bar', 'baz']);
    }, 100);
});