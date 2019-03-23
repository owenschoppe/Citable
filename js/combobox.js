var Tags = (function () {
    'use strict';

    class TagInput {

        constructor(label, placeholder, callback) {
            // console.log('init');
            var tagInputTemplate = `<div class="form-element">
                                    <label class="form-element__label visuallyhidden" for="combobox-id-24"></label>
                                    <div class="form-element__control">
                                        <div class="combobox_container has-selection">
                                            <div class="combobox dropdown-trigger dropdown-trigger_click" aria-expanded="false"
                                                aria-haspopup="listbox" role="combobox">
                                                <div class="combobox__form-element input-has-icon input-has-icon_right" role="none">
                                                    <input type="text" class="input combobox__input" id="combobox-id-24" aria-autocomplete="list"
                                                        aria-controls="listbox-id-13" autocomplete="off" role="textbox" ng-disabled="data.menu || !data.auth"/>
                                                </div>
                                                <div id="listbox-id-13" class="dropdown dropdown_length-with-icon-7 dropdown_fluid" role="listbox">
                                                <!-- Autocomplete Items -->
                                                </div>
                                            </div>
                                        </div>
                                        <div class="listbox_selection-group">
                                            <!-- Pills -->
                                        </div>
                                    </div>
                                </div>`;
            this.div = document.createElement('div');
            this.div.innerHTML = tagInputTemplate;
            // $compile(div)($scope);
            // rootNode.appendChild(div);
            this.div.querySelector('.form-element__label').textContent = label;
            this.combobox = this.div.querySelector('.combobox');
            this.input = this.div.querySelector('.combobox_container .combobox__input');
            this.input.setAttribute('placeholder', placeholder);
            this.pillList = new PillList(this.div.querySelector('.listbox_selection-group'), this.input, callback);
            this.dropdown = new DropdownList(this.div.querySelector('.dropdown'), this.input, this.combobox, this.addPill.bind(this));
            this.input.addEventListener('keydown', this.handlePress.bind(this), true);
            this.input.addEventListener('input', this.searchOptions.bind(this, true));
            this.input.addEventListener('click', this.searchOptions.bind(this, true));
            this.input.addEventListener('blur', this.handleBlur.bind(this), false);
            this.tagOptions = [];
            this.tags = [];
            return this;
        }

        addPill(value) {
            this.pillList.addPill(value, this.input);
        }

        getTags() {
            return this.pillList.items.map(el => el.value);
        }

        setTagOptions(options) {
            this.tagOptions = options;
        }

        handleBlur(e) {
            if (e.target.value.trim().length > 0) {
                //To increase discoverability of the feature, if someone leaves the field with data in it, treat it like a tag.
                this.pillList.addPill(e.target.value, e.target);
            }
            this.dropdown.hideDropdown();
        }

        handlePress(e) {
            // console.log('handlePress',e);
            //Minimal Polyfill for e.key in Chrome <51
            var key = '';
            if (!e.hasOwnProperty('key')) {
                key = keyboardEventKeyPolyfill(e);
            } else {
                key = e.key;
            }
            //process key press
            if (key == 'Enter') {
                this.dropdown.selectItem();
            }
            if (key == 'Enter' && e.target.value.length) {
                e.stopPropagation();
                e.preventDefault();
                // Add the value to the pill container
                this.pillList.addPill(e.target.value, e.target);
                //Hide the dropdown
                this.dropdown.hideDropdown();
            } else if (key == 'Enter' && !e.target.value.length && !e.ctrlKey && !e.altKey) {
                e.stopPropagation();
                e.preventDefault();
                this.searchOptions(true, e);
            } else if (key == 'ArrowUp') {
                // Arrow through the list box
                // Show the dropdown and move
                e.stopPropagation();
                e.preventDefault();
                this.dropdown.nextItem(e, -1);
            } else if (key == 'ArrowDown') {
                // Arrow through the list box
                // Show the dropdown and move
                e.stopPropagation();
                e.preventDefault();
                this.searchOptions(false, e);
                this.dropdown.nextItem(e, 1);
            } else if (key == 'Escape') {
                if (this.combobox.getAttribute('aria-expanded') == 'true') {
                    e.stopPropagation();
                    e.preventDefault();
                    this.dropdown.hideDropdown();
                }
            } else {

            }
        }

        searchOptions(select, e) {
            //Should we only search if e.target.value.length > 2?
            var matching = [];
            for (var option of this.tagOptions) {
                if (option.toLowerCase().includes(e.target.value.toLowerCase()) && (this.pillList.items.map(i => i.value).indexOf(option) == -1)) {
                    matching.push(option);
                }
            }
            this.dropdown.showDropdown(matching, select);
        }

    }

    ////////////////////
    // Utils          //
    ////////////////////

    class List extends Array {

        constructor() {
            super();
            this.items = [];
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

        constructor(rootNode, input, callback) {
            super();
            this.pillContainer = document.createElement('ul');
            this.pillContainer.classList.add("listbox", "listbox_horizontal");
            this.pillContainer.setAttribute("role", "listbox");
            this.pillContainer.setAttribute("aria-label", "Selected Options:");
            this.pillContainer.setAttribute("aria-orientation", "horizontal");
            this.input = input;
            rootNode.appendChild(this.pillContainer);
            this.callback = callback;
        }

        addPill(string, input) {
            string = string.trim();
            if (string) {
                var pill = new Pill(string, this.pillContainer, this.removePill.bind(this), this.nextPill.bind(this));
                this.items.push(pill);
                this.updatePillIndex();
                this.updateCallback();
            }
            input.value = '';
        }

        updatePillIndex(index, focus) {
            index = index || 0;
            focus = focus || false;
            this.pillContainer.querySelectorAll('.pill').forEach((pill, i) => {
                if (i == index) {
                    pill.tabIndex = 0;
                    pill.setAttribute('aria-selected', true);
                    if (focus) {
                        pill.focus();
                    }
                } else {
                    pill.tabIndex = -1;
                    pill.setAttribute('aria-selected', false);
                }
            });
        }

        removePill(e, pill) {
            var index = this.items.indexOf(pill);
            var next = this.nextIndex(index, -1, false);
            this.items.splice(index, 1);
            if (this.items.length) {
                this.updatePillIndex(next, true);
            } else {
                this.input.focus();
            }
            this.updateCallback();
        }

        nextPill(e, dir, pill) {
            var index = this.items.indexOf(pill);
            var next = this.nextIndex(index, dir, false);
            this.updatePillIndex(next, true);
        }

        updateCallback() {
            if (this.callback) {
                // this.scope.tags = this.items.map(e => e.value);
                // this.scope.$apply();
                this.callback(this.items.map(e => e.value));
            }
        }
    }

    class Pill {

        constructor(string, pillContainer, removePill, nextPill) {
            // console.log('addPill', string);
            var pillTemplate = `<span class="pill" role="option" aria-selected="true">
                    <span class="pill__label"></span> <span class="icon_container pill__remove" title="Remove">
                        <span class="assistive-text visuallyhidden">Press delete or backspace to remove</span> </span>
                </span> </li>`;
            this.pill = document.createElement('li');
            this.pill.classList.add("listbox-item");
            this.pill.setAttribute("role", "presentation");
            this.pill.innerHTML = pillTemplate;
            pillContainer.appendChild(this.pill);
            var pillLabel = this.pill.querySelector('.pill__label');
            pillLabel.title = string;
            pillLabel.textContent = string;
            this.pill.querySelector('.pill__remove').addEventListener('click', this.remove.bind(this));
            this.pill.addEventListener('keydown', this.pillPress.bind(this));
            this.value = string;
            this.removePill = removePill;
            this.nextPill = nextPill;
        }

        pillPress(e) {
            var key = '';
            if (!e.hasOwnProperty('key')) {
                key = keyboardEventKeyPolyfill(e);
            } else {
                key = e.key;
            }

            if (key == 'Backspace') {
                this.remove(e);
                e.stopPropagation();
                e.preventDefault();
            } else if (key == 'ArrowDown' || key == 'ArrowRight') {
                this.nextPill(e, 1, this);
                e.stopPropagation();
                e.preventDefault();
            } else if (key == 'ArrowUp' || key == 'ArrowLeft') {
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

        constructor(rootNode, input, combobox, addPill) {
            super();
            // <ul class="listbox listbox_vertical" role="presentation"></ul>
            this.input = input;
            this.addPill = addPill;
            this.combobox = combobox;
            this.dropdown = document.createElement('ul');
            this.dropdown.setAttribute('role', 'presentation');
            this.dropdown.classList.add("listbox", "listbox_vertical"); //hidden
            rootNode.appendChild(this.dropdown);

            this.results = [];
            this.selectedItem = null;
        }

        addItem(string) {
            var item = new ListItem(string, this.dropdown, this.selectItem.bind(this), this.hoverItem.bind(this));
            this.items.push(item);
            this.dropdown.appendChild(item);
        }

        selectItem(item) {
            if (this.combobox.getAttribute('aria-expanded') == 'true') {
                if (item) {
                    //clicked item
                    this.input.value = item;
                    this.addPill(this.input.value, this.input);
                    window.setTimeout(() => {
                        this.input.focus();
                    }, 0);
                } else {
                    //enter in input
                    this.input.value = this.selectedItem.querySelector('.listbox__option-text').textContent;
                }
                this.hideDropdown();
            }
        }

        showDropdown(results, select) {
            // console.log(results);
            if (results.length > 0) {
                //compare for strict equality.
                var equals = results.length == this.results.length;
                for (var j in results) {
                    if (this.results[j] != results[j]) {
                        equals = false;
                    }
                }
                if (!equals) {
                    //new search results
                    //update dropdown
                    this.results = results;
                    this.dropdown.innerHTML = '';
                    this.items = [];
                    results.forEach((item, index) => {
                        if (index > 1000) {
                            return; //What should the limit be?
                        }
                        this.addItem(item);
                    });
                    this.updateIndex(0);
                } else if (equals && select) {
                    //same results with prior selection
                    //restore selection
                    var index = this.selectedItem ? this.items.indexOf(this.selectedItem) : 0;
                    this.updateIndex(index);
                }
                //make sure dropdown is visible
                // this.dropdown.classList.remove('hidden');
                // this.dropdown.setAttribute("role", "listbox");
                this.combobox.setAttribute('aria-expanded', true);
                this.combobox.classList.add('is-open');
            } else {
                //no results
                //clear everything and hide dropdown
                this.results = results;
                this.selectedItem = null;
                this.hideDropdown();
            }
        }

        hideDropdown() {
            // this.dropdown.classList.add('hidden');
            // this.dropdown.setAttribute("role", "presentation");
            this.combobox.setAttribute('aria-expanded', false);
            this.combobox.classList.remove('is-open');
            this.input.removeAttribute('aria-activedescendant');
            this.selectedItem = null;
        }

        nextItem(e, dir) {
            var index = this.items.indexOf(this.selectedItem);
            var next = this.nextIndex(index, dir, true);
            this.updateIndex(next);
        }

        hoverItem(e, item) {
            this.selectedItem = item;
            var index = this.items.indexOf(this.selectedItem);
            this.updateIndex(index);
        }

        updateIndex(index) {
            index = index || 0;
            this.dropdown.querySelectorAll('.listbox__option').forEach((item, i) => {
                item.id = 'option' + i;
                if (i == index) {
                    item.setAttribute('aria-selected', true);
                    item.scrollIntoView({
                        block: "nearest",
                        inline: "nearest"
                    });
                    this.selectedItem = item.parentNode;
                    this.input.setAttribute('aria-activedescendant', item.id);
                } else {
                    item.setAttribute('aria-selected', false);
                }
            });
        }
    }

    class ListItem {

        constructor(string, dropdown, selectItem, hoverItem) {
            this.selectItem = selectItem;
            this.hoverItem = hoverItem;
            this.value = string;
            var optionTemplate = `<div class="media listbox__option listbox__option_entity media_center"
                                role="option"> <span class="listbox__option-text listbox__option-text_entity"></span> </div>`;
            this.item = document.createElement('li');
            this.item.innerHTML = optionTemplate;
            this.item.classList.add('listbox__item');
            this.item.setAttribute('role', 'presentation');
            this.item.querySelector('.listbox__option-text').textContent = string;
            this.item.addEventListener('mousedown', this.handleClick.bind(this), true);
            this.item.addEventListener('mouseover', this.handleHover.bind(this), true);
            return this.item;
        }

        handleClick(e) {
            this.selectItem(this.value);
        }

        handleHover(e) {
            this.hoverItem(e, this.item);
        }
    }

    function keyboardEventKeyPolyfill(e) {
        var keys = {
            3: 'Cancel',
            6: 'Help',
            8: 'Backspace',
            9: 'Tab',
            12: 'Clear',
            13: 'Enter',
            16: 'Shift',
            17: 'Control',
            18: 'Alt',
            19: 'Pause',
            20: 'CapsLock',
            27: 'Escape',
            28: 'Convert',
            29: 'NonConvert',
            30: 'Accept',
            31: 'ModeChange',
            32: ' ',
            33: 'PageUp',
            34: 'PageDown',
            35: 'End',
            36: 'Home',
            37: 'ArrowLeft',
            38: 'ArrowUp',
            39: 'ArrowRight',
            40: 'ArrowDown',
            41: 'Select',
            42: 'Print',
            43: 'Execute',
            44: 'PrintScreen',
            45: 'Insert',
            46: 'Delete',
            48: ['0', ')'],
            49: ['1', '!'],
            50: ['2', '@'],
            51: ['3', '#'],
            52: ['4', '$'],
            53: ['5', '%'],
            54: ['6', '^'],
            55: ['7', '&'],
            56: ['8', '*'],
            57: ['9', '('],
            91: 'OS',
            93: 'ContextMenu',
            106: '*',
            107: '+',
            109: '-',
            110: '.',
            111: '/',
            144: 'NumLock',
            145: 'ScrollLock',
            181: 'VolumeMute',
            182: 'VolumeDown',
            183: 'VolumeUp',
            186: [';', ':'],
            187: ['=', '+'],
            188: [',', '<'],
            189: ['-', '_'],
            190: ['.', '>'],
            191: ['/', '?'],
            192: ['`', '~'],
            219: ['[', '{'],
            220: ['\\', '|'],
            221: [']', '}'],
            222: ["'", '"'],
            224: 'Meta',
            225: 'AltGraph',
            246: 'Attn',
            247: 'CrSel',
            248: 'ExSel',
            249: 'EraseEof',
            250: 'Play',
            251: 'ZoomOut'
        };
        var key = keys[e.which || e.keyCode];
        if (Array.isArray(key)) {
            key = key[0 + e.shiftKey];
        }
        return key;
    }

    return {
        TagInput: TagInput
    };
}());

//Polyfill for es5
if (window.NodeList && !NodeList.prototype.forEach) {
    NodeList.prototype.forEach = Array.prototype.forEach;
}