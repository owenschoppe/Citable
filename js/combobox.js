'use strict';

var tag;

document.addEventListener("DOMContentLoaded", () => {
    tag = new TagInput(document.querySelector('#tagInput'),'Tags','Enter tags...');
    window.setTimeout(()=>{
        tag.setTagOptions(['foo', 'bar', 'baz']);
    }, 100);
});

class TagInput {
    combobox = '';
    dropdown = '';
    tagOptions = [];
    tags = [];
    pillList = '';
    input = null;

    constructor(rootNode, label, placeholder) {
        console.log('init');
        var tagInputTemplate = `<div class="slds-form-element">
                                    <label class="slds-form-element__label visuallyhidden" for="combobox-id-24"></label>
                                    <div class="slds-form-element__control">
                                        <div class="slds-combobox_container slds-has-selection">
                                            <div class="slds-combobox slds-dropdown-trigger slds-dropdown-trigger_click" aria-expanded="false"
                                                aria-haspopup="listbox" role="combobox">
                                                <div class="slds-combobox__form-element slds-input-has-icon slds-input-has-icon_right" role="none">
                                                    <input type="text" class="slds-input slds-combobox__input" id="combobox-id-24" aria-autocomplete="list"
                                                        aria-controls="listbox-id-13" autoComplete="off" role="textbox" />
                                                    <span class="slds-icon_container slds-icon-utility-search slds-input__icon slds-input__icon_right">
                                                        <svg class="slds-icon slds-icon slds-icon_x-small slds-icon-text-default" aria-hidden="true">
                                                            <use xlink:href="/assets/icons/utility-sprite/svg/symbols.svg#search"></use>
                                                        </svg> 
                                                    </span> 
                                                </div>
                                                <div id="listbox-id-13" class="slds-dropdown slds-dropdown_length-with-icon-7 slds-dropdown_fluid" role="listbox">
                                                <!-- Autocomplete Items -->
                                                </div>
                                            </div>
                                        </div>
                                        <div class="slds-listbox_selection-group">
                                            <!-- Pills -->
                                        </div>
                                    </div>
                                </div>`
        rootNode.innerHTML = tagInputTemplate;
        rootNode.querySelector('.slds-form-element__label').textContent = label;
        this.combobox = rootNode.querySelector('.slds-combobox');
        this.input = rootNode.querySelector('.slds-combobox_container .slds-combobox__input');
        this.input.setAttribute('placeholder',placeholder);
        this.pillList = new PillList(rootNode.querySelector('.slds-listbox_selection-group'));
        this.dropdown = new DropdownList(rootNode.querySelector('.slds-dropdown'), this.input, this.combobox, this.addPill.bind(this));
        this.input.addEventListener('keydown', this.handlePress.bind(this), true);
        this.input.addEventListener('input', this.searchOptions.bind(this, true));
        this.input.addEventListener('click', this.searchOptions.bind(this, true));
        this.input.addEventListener('blur', ((e)=>{
            this.dropdown.hideDropdown();
        }).bind(this),false);
    }

    addPill(value) {
        this.pillList.addPill(value,this.input);
    }

    getTags() {
        return pillList.items;
    }

    setTagOptions(options) {
        this.tagOptions = options;
    }

    handlePress(e) {
        // console.log('handlePress',e);
        if (e.key == 'Enter') {
            this.dropdown.selectItem();
        }
        if (e.key == 'Enter' && e.target.value.length){
            e.stopPropagation();
            e.preventDefault(); 
            // Add the value to the pill container
            this.pillList.addPill(e.target.value, e.target);
            //Hide the dropdown
            this.dropdown.hideDropdown();
        } else if (e.key == 'Enter' && !e.target.value.length) {
            e.stopPropagation();
            e.preventDefault();
            this.searchOptions(true, e);
        } else if (e.key == 'ArrowUp'){
            // Arrow through the list box
            // Show the dropdown and move
            e.stopPropagation();
            e.preventDefault();
            this.dropdown.nextItem(e, -1);
        } else if (e.key == 'ArrowDown') {
            // Arrow through the list box
            // Show the dropdown and move
            e.stopPropagation();
            e.preventDefault();
            this.searchOptions(false, e);
            this.dropdown.nextItem(e, 1);
        } else if (e.key == 'Escape') {
            this.dropdown.hideDropdown();
        } else {

        }
    }

    searchOptions(select, e) {
        //Should we only search if e.target.value.length > 2?
        var matching = [];
        for (var option of this.tagOptions) {
            if (option.includes(e.target.value)) {
                matching.push(option)
            }
        }
        this.dropdown.showDropdown(matching, select);
    }

};

////////////////////
// Utils          //
////////////////////

class List extends Array {
    items = [];

    constructor() {
        super();
    }

    nextIndex(index, dir, loop) {
        var next_index = 0;
        if (loop) {
            next_index = (index + dir + this.items.length) % this.items.length;
        } else {
            next_index = Math.max(Math.min(index + dir, this.items.length - 1), 0);
        }
        return next_index;
    }
}

////////////////////
// Pill List      //
////////////////////

class PillList extends List {

    pillContainer = '';

    constructor(rootNode) {
        super();
        this.pillContainer = document.createElement('ul');
        this.pillContainer.classList = "slds-listbox slds-listbox_horizontal";
        this.pillContainer.setAttribute("role", "listbox");
        this.pillContainer.setAttribute("aria-label", "Selected Options:");
        this.pillContainer.setAttribute("aria-orientation", "horizontal");
        rootNode.appendChild(this.pillContainer);
    }

    addPill(string, input) {
        var pill = new Pill(string, this.pillContainer, this.removePill.bind(this), this.nextPill.bind(this));
        this.items.push(pill);
        input.value = '';
        this.updatePillIndex();
    }

    updatePillIndex(index, focus) {
        index = index || 0;
        focus = focus || false;
        this.pillContainer.querySelectorAll('.slds-pill').forEach((pill, i) => {
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

    removePill(e, pill) {
        var index = this.items.indexOf(pill);
        var next = this.nextIndex(index, -1, false);
        this.items.splice(index, 1);
        this.updatePillIndex(next, true);
    }

    nextPill(e, dir, pill) {
        var index = this.items.indexOf(pill);
        var next = this.nextIndex(index, dir, false);
        this.updatePillIndex(next, true);
    }
}

class Pill {

    pill = null;
    value = '';

    constructor(string, pillContainer, removePill, nextPill) {
        // console.log('addPill', string);
        var pillTemplate = `<span class="slds-pill" role="option" aria-selected="true">
                    <span class="slds-pill__label"></span> <span class="slds-icon_container slds-pill__remove" title="Remove">
                        <svg class="slds-icon slds-icon_x-small slds-icon-text-default" aria-hidden="true">
                            <use xlink:href="/assets/icons/utility-sprite/svg/symbols.svg#close"></use>
                        </svg> <span class="slds-assistive-text">Press delete or backspace to remove</span> </span>
                </span> </li>`;
        var pill = document.createElement('li');
        pill.classList = "slds-listbox-item";
        pill.setAttribute("role", "presentation");
        pill.innerHTML = pillTemplate;
        pillContainer.appendChild(pill);
        var pillLabel = pill.querySelector('.slds-pill__label');
        pillLabel.title = string;
        pillLabel.textContent = string;
        pill.querySelector('.slds-icon_container.slds-pill__remove').addEventListener('click', this.remove.bind(this));
        pill.addEventListener('keydown', this.pillPress.bind(this));
        this.value = string;
        this.pill = pill;
        this.removePill = removePill;
        this.nextPill = nextPill;
    }

    pillPress(e) {
        if (e.key == 'Backspace') {
            this.remove(e);
            e.stopPropagation();
            e.preventDefault();
        } else if (e.key == 'ArrowDown' || e.key == 'ArrowRight') {
            this.nextPill(e, 1, this);
            e.stopPropagation();
            e.preventDefault();
        } else if (e.key == 'ArrowUp' || e.key == 'ArrowLeft') {
            this.nextPill(e, -1, this);
            e.stopPropagation();
            e.preventDefault();
        }
    }

    remove(e) {
        this.pill.remove();
        this.removePill(e, this);
    }
}

////////////////////
// Dropdown       //
////////////////////

class DropdownList extends List {
    combobox = null;
    dropdown = null;
    input = null;
    results = [];
    selectedItem = null;

    constructor(rootNode, input, combobox, addPill) {
        super();
        // <ul class="slds-listbox slds-listbox_vertical" role="presentation"></ul>
        this.combobox = combobox;
        this.dropdown = document.createElement('ul');
        this.dropdown.classList = "slds-listbox slds-listbox_vertical";
        rootNode.appendChild(this.dropdown);
        this.input = input;
        this.addPill = addPill;
    }

    addItem(string) {
        var item = new ListItem(string, this.dropdown, this.selectItem.bind(this));
        this.items.push(item);
        this.dropdown.appendChild(item);
    }

    selectItem(item) {
        if (this.combobox.getAttribute('aria-expanded') == 'true'){
            if(item) {
                this.input.value = item;
                this.addPill(this.input.value, this.input);
                window.setTimeout(()=>{this.input.focus();},0);
            } else {
                this.input.value = this.selectedItem.querySelector('.slds-listbox__option-text').textContent;
            }
            this.hideDropdown();
        }
    }

    showDropdown(results, select) {
        if (results.length > 0) {
            //compare for strict equality.
            var equals = results.length == this.results.length;
            for (var j in results) {
                if (this.results[j] != results[j]) {
                    equals = false;
                }
            }
            if (!equals) {
                this.results = results;
                this.dropdown.innerHTML = '';
                this.items = [];
                results.forEach((item,index)=>{
                    if(index > 1000) {
                        break; //What should the limit be?
                    }
                    this.addItem(item);
                })
                this.updateIndex(0);
            } else if (equals && select) {
                var index = this.selectedItem ? this.items.indexOf(this.selectedItem) : 0;
                this.updateIndex(index);
            }
            this.dropdown.classList.remove('hidden');
            this.dropdown.setAttribute("role", "listbox");
            this.combobox.setAttribute('aria-expanded', true);
        } else {
            this.results = results;
            this.selectedItem = null;
        }
    }

    hideDropdown() {
        this.dropdown.classList.add('hidden');
        this.dropdown.setAttribute("role", "presentation");
        this.combobox.setAttribute('aria-expanded', false);
        this.input.removeAttribute('aria-activedescentant');
        this.selectedItem = null;
    }

    nextItem(e, dir) {
        var index = this.items.indexOf(this.selectedItem);
        var next = this.nextIndex(index, dir, true);
        this.updateIndex(next);
    }

    updateIndex(index) {
        index = index || 0;
        this.dropdown.querySelectorAll('.slds-listbox__option').forEach((item, i) => {
            item.id = 'option'+i;
            if (i == index) {
                item.setAttribute('aria-selected',true);
                this.selectedItem = item.parentNode;
                this.input.setAttribute('aria-activedescentant',item.id);
            } else {
                item.setAttribute('aria-selected', false);
            }
        });
    }
}

class ListItem {

    item = null;
    value = '';

    constructor(string, dropdown, selectItem) {
        var optionTemplate = `<div class="slds-media slds-listbox__option slds-listbox__option_entity slds-media_center"
                                role="option"> <span class="slds-listbox__option-text slds-listbox__option-text_entity"></span> </div>`;
        this.item = document.createElement('li');
        this.item.innerHTML = optionTemplate;
        this.item.classList = 'slds-listbox__item';
        this.item.setAttribute('role','presentation');
        var option_text = this.item.querySelector('.slds-listbox__option-text');
        option_text.textContent = string;
        this.selectItem = selectItem;
        this.item.addEventListener('mousedown',this.handleClick.bind(this),true);
        this.value = string;
        // this.input = input;
        return this.item;
    }

    handleClick(e) {
        this.selectItem(this.value);
    }
}