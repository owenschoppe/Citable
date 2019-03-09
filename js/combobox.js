var combobox = (function(combobox){
    //TODO: This whole thing should be a class...
    var pillContainer = '';

    document.addEventListener("DOMContentLoaded", init);

    function init() {
        console.log('init');
        var inputs = document.querySelectorAll('.slds-combobox_container .slds-combobox__input');
        for (var i = 0; i < inputs.length; i++) {
            inputs[i].addEventListener('keypress', handlePress);
        }
        pillContainer = document.querySelector('.slds-listbox_selection-group ul');
    }

    function handlePress(e){
        console.log('handlePress',e);
        if (e.key == 'Enter' && e.target.value.length){
            // Add the value to the pill container
            addPill(e.target.value,e.target)
            e.stopPropagation();
            e.preventDefault();
        } else if (e.key == 'ArrowUp'){
            // Arrow through the list box
            e.stopPropagation();
            e.preventDefault();
        } else if (e.key == 'ArrowDown') {
            // Arrow through the list box
            e.stopPropagation();
            e.preventDefault();
        } 
    }

    function addPill(string,input) {
        //TODO: need to escape the string before putting it in the template.
        console.log('addPill');
        var pillTemplate = `<span class="slds-pill" role="option" aria-selected="true">
                                <span class="slds-pill__label" title="${string}">${string}</span> <span class="slds-icon_container slds-pill__remove" title="Remove">
                                    <svg class="slds-icon slds-icon_x-small slds-icon-text-default" aria-hidden="true">
                                        <use xlink:href="/assets/icons/utility-sprite/svg/symbols.svg#close"></use>
                                    </svg> <span class="slds-assistive-text">Press delete or backspace to remove</span> </span>
                            </span> </li>`;
        var pill = document.createElement('li');
        pill.className = "slds-listbox-item";
        pill.role = "presentation";
        pill.innerHTML = pillTemplate;
        pillContainer.appendChild(pill);
        pill.querySelector('.slds-icon_container.slds-pill__remove').addEventListener('click', removePill);
        pill.addEventListener('keydown', pillPress);
        input.value = '';
        updatePillIndex();

        function pillPress(e) {
            if (e.key == 'Backspace') {
                removePill(e);
            } else if (e.key == 'ArrowDown' || e.key == 'ArrowRight') {
                nextPill(e,1);
            } else if (e.key == 'ArrowUp' || e.key == 'ArrowLeft') {
                nextPill(e,-1);
            }
        }

        function removePill(e) {
            var index = [].slice.call(pillContainer.children).indexOf(pill);
            var next = nextIndex(index, -1, pillContainer.children.length, false);
            pill.remove();
            updatePillIndex(next, true);
        }

        function nextPill(e,dir) {
            var index = [].slice.call(pillContainer.children).indexOf(pill);
            var next = nextIndex(index, dir, pillContainer.children.length, false);
            updatePillIndex(next,true);
        }
    }

    function nextIndex(index,dir,length,loop){
        var next_index = 0;
        if (loop) {
            next_index = (index + dir + length) % length;
        } else {
            next_index = Math.max(Math.min(index + dir, length - 1), 0);
        }
        console.log(next_index);
        return next_index;
    }

    function updatePillIndex(index, focus) {
        index = index || 0;
        focus = focus || false;
        console.log('updatePillIndex');
        pillContainer.querySelectorAll('.slds-pill').forEach((pill,i)=>{
            if (i == index) {
                pill.tabIndex = 0;
                if (focus) {
                    pill.focus();
                }
            } else {
                pill.tabIndex = -1;
            }
        });
    }

    return combobox;
})(combobox || {});