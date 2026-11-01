class ModalUniversal {
    constructor () {
        this.count = 0;
    }
    openModal (type, param) {
        this.count++;
        const modalDiv = document.createElement('div');
        modalDiv.classList.add('modal-universal');
        modalDiv.innerHTML = this.modalType(type, param);
        modalDiv.addEventListener('click', function (e) {
           if (e.target.className === 'modal-universal') {
               for (let c = 0; c < e.target.childNodes.length; c++) {
                   if (e.target.childNodes[c].className === 'modal-universal__content') {
                      eval(e.target.childNodes[c].dataset.closeFunction);
                   }
               }
           }
        });
        document.body.appendChild(modalDiv);
    }

    closeModal (id) {
        const modal = document.querySelectorAll('.modal-universal__content');
        const script = document.head.querySelectorAll('script');
        if (modal) {
            for (let m = 0; m < modal.length; m++) {
                if (modal[m].dataset.id === id.toString()) {
                    modal[m].parentElement.remove();
                }
            }
            this.count--;
            if (modal.length === 0) {
                this.count = 0;
            }
        }

        if (script) {
            for (let s = 0; s < script.length; s++) {
                if (script[s].dataset.id === id.toString()) {
                    script[s].remove();
                }
            }
        }
    }

    multipleButtons (data) {
        let buttons = [];
        for (let a = 0; a < data.action.length; a++) {
            this.scriptInjector(data.action[a].code);
            buttons.push(`<button onclick="${data.action[a].click}" class="button button-theme" data-id="${this.count}">${data.action[a].title}</button>`);
        }
        return buttons.join('');
    }

    multipleInputs (data) {
        let inputs = [];
        for (let i = 0; i < data.input.length; i++) {
            inputs.push(`<input type="${data.input[i].type}" class="input input-dotted" placeholder="${data.input[i].placeholder}">`);
        }
        return inputs.join('');
    }

    modalType (type, ...rest) {
        switch (type) {
            case 'confirmation':
                return `
                    <div class="modal-universal__content" data-id="${this.count}" data-close-function="${rest[0].action.find((a) => a.close).click}" ${rest[0].hasOwnProperty('parallax3d') ? `data-parallax3d="true" data-parallax3d-frequencyX="${rest[0].parallax3d.frequencyX}" data-parallax3d-frequencyY="${rest[0].parallax3d.frequencyY}"` : ''}>
                        <div class="modal-universal__content-shadow"></div>
                            <div class="modal-universal__content-confirmation modal-universal__content-background">
                                <div class="modal-universal__content-title">
                                    <span>${rest[0].title}</span>
                                </div>
                                <div class="modal-universal__content-subtitle">
                                    <span>${rest[0].subtitle}</span>
                                </div>
                                <div class="modal-universal__content-confirmation__action">
                                    ${this.multipleButtons(rest[0])}
                                </div>
                            </div>
                        <div class="modal-universal__content-shadow"></div>
                    </div>
                    <div class="modal-universal__subtitle">
                        <p>Нажмите в пустую область,</p>
                        <p> чтобы закрыть окно</p>
                    </div>
                `;

            case 'transaction':
                return `
                    <div class="modal-universal__content" data-id="${this.count}" data-close-function="${rest[0].action.find((a) => a.close).click}" ${rest[0].hasOwnProperty('parallax3d') ? `data-parallax3d="true" data-parallax3d-frequencyX="${rest[0].parallax3d.frequencyX}" data-parallax3d-frequencyY="${rest[0].parallax3d.frequencyY}"` : ''}>
                        <div class="modal-universal__content-shadow"></div>
                            <div class="modal-universal__content-transaction modal-universal__content-background">
                                <div class="modal-universal__content-title">
                                    <span>${rest[0].title}</span>
                                </div>
                                <div class="modal-universal__content-subtitle">
                                    <span>${rest[0].subtitle}</span>
                                </div>
                                <div class="modal-universal__content-transaction__input">
                                    ${this.multipleInputs(rest[0])}
                                </div>
                                <div class="modal-universal__content-transaction__action">
                                    ${this.multipleButtons(rest[0])}
                                </div>
                            </div>
                        <div class="modal-universal__content-shadow"></div>
                    </div>
                    <div class="modal-universal__subtitle">
                        <p>Нажмите в пустую область,</p>
                        <p> чтобы закрыть окно</p>
                    </div>
                `;

            case 'hint':
                return `
                    <div class="modal-universal__content" data-id="${this.count}" data-close-function="${rest[0].action.find((a) => a.close).click}" ${rest[0].hasOwnProperty('parallax3d') ? `data-parallax3d="true" data-parallax3d-frequencyX="${rest[0].parallax3d.frequencyX}" data-parallax3d-frequencyY="${rest[0].parallax3d.frequencyY}"` : ''}>
                        <div class="modal-universal__content-shadow"></div>
                            <div class="modal-universal__content-hint modal-universal__content-background">
                                <div class="modal-universal__content-title">
                                    <span>${rest[0].title}</span>
                                </div>
                                <div class="modal-universal__content-subtitle">
                                    <span>${rest[0].subtitle}</span>
                                </div>
                                <div class="modal-universal__content-hint__checkbox">
                                <label for="remember-not-show-again" class="checkbox-label m-30">
                                    <input type="checkbox" id="remember-not-show-again" name="remember-not-show-again" class="checkbox">
                                    <span>Больше не показывать</span>
                                </label>
                                </div>
                                <div class="modal-universal__content-hint__action">
                                    ${this.multipleButtons(rest[0])}
                                </div>
                            </div>
                        <div class="modal-universal__content-shadow"></div>
                    </div>
                    <div class="modal-universal__subtitle">
                        <p>Нажмите в пустую область,</p>
                        <p> чтобы закрыть окно</p>
                    </div>
                `;

            case 'range':
                this.scriptInjector(rest[0].handler.code);
                return `
                    <div class="modal-universal__content" data-id="${this.count}" data-close-function="${rest[0].action.find((a) => a.close).click}" ${rest[0].hasOwnProperty('parallax3d') ? `data-parallax3d="true" data-parallax3d-frequencyX="${rest[0].parallax3d.frequencyX}" data-parallax3d-frequencyY="${rest[0].parallax3d.frequencyY}"` : ''}>
                        <div class="modal-universal__content-shadow"></div>
                            <div class="modal-universal__content-range modal-universal__content-background">
                                <div class="modal-universal__content-title">
                                    <span>${rest[0].title}</span>
                                </div>
                                <div class="modal-universal__content-subtitle">
                                    <span>${rest[0].subtitle}</span>
                                </div>
                                <div class="modal-universal__content-range__input">
                                    <div class="modal-universal__content-range__input-wrapper">
                                        <span class="input-wrapper__min">${rest[0].range.min}</span>
                                        <input onchange="${rest[0].handler.name}" type="range" class="range" value="${rest[0].range.max / 2}" step="${rest[0].range.step}" min="${rest[0].range.min}" max="${rest[0].range.max}" data-id="${this.count}">
                                        <span class="input-wrapper__max">${rest[0].range.max}</span>
                                    </div>
                                    <div class="modal-universal__content-range__input-value">
                                        <span>${rest[0].roundValue ? Math.round(rest[0].range.max / 2) : rest[0].range.max / 2}</span>
                                    </div>
                                </div>
                                <div class="modal-universal__content-range__action">
                                    ${this.multipleButtons(rest[0])}
                                </div>
                            </div>
                        <div class="modal-universal__content-shadow"></div>
                    </div>
                    <div class="modal-universal__subtitle">
                        <p>Нажмите в пустую область,</p>
                        <p> чтобы закрыть окно</p>
                    </div>
                `;
            default:
                return '<p class="modal-universal__not-found">Universal modal not found 😬</p>'
        }
    }
    scriptInjector (code) {
        const tag = document.createElement('script');
        tag.innerHTML = code;
        tag.dataset.id = this.count;
        document.head.appendChild(tag);
    }
}

const modalUniversal = new ModalUniversal();

// Example

// Confirmation
// modalUniversal.openModal('confirmation', {
//     title: 'Продажа дома',
//     subtitle: 'Вы собираетесь продать дом #0001 гражданину <b>Taras_Nepidoras</b> за <b>1.500.500$</b>.<br> Вы действительно хотите продать его?',
//     action: [
//         {
//             title: 'Подтвердить',
//             click: 'test()',
//             code: function test () {
//                 console.log(1);
//             }
//         },
//         {
//             title: 'Отменить',
//             click: 'test2()',
//             code: function test2 () {
//                 console.log('test2');
//             }
//         },
//         {
//             title: 'Отменить',
//             click: 'test3()',
//             code: function test3 () {
//                 console.log('test3');
//             }
//         },
//         {
//             title: 'Закрыть',
//             close: true,
//             click: 'closess()',
//             code: function closess () {
//                 console.log('close');
//                 modalUniversal.closeModal(modalUniversal.count);
//             }
//         }
//     ],
//     // Addon's or plugin
//     parallax3d: {
//         frequencyX: 65,
//         frequencyY: 65
//     }
// });

// Transaction
// modalUniversal.openModal('transaction', {
//     title: 'Заказ поездки',
//     subtitle: 'Место: Бульвар Дель-Перро <br> Расстояние: 500 км',
//     action: [
//         {
//             title: 'Подтвердить',
//             click: 'test(this)',
//             code: function test (e) {
//                 const inputs = document.querySelectorAll(`.modal-universal__content[data-id="${e.dataset.id}"] .modal-universal__content-transaction__input input`);
//                 let value = [...inputs].reduce((a, b) => {
//                     a.push(b.value);
//                     return a;
//                 }, []);
//                 console.log(value);
//             }
//         },
//         {
//             title: 'Отменить',
//             click: 'test2()',
//             code: function test2 () {
//                 console.log('test2');
//             }
//         },
//         {
//             title: 'Отменить',
//             click: 'test3()',
//             code: function test3 () {
//                 console.log('test3');
//             }
//         },
//         {
//             title: 'Закрыть',
//             close: true,
//             click: 'closes()',
//             code: function closes () {
//                 console.log('close');
//                 modalUniversal.closeModal(modalUniversal.count);
//             }
//         }
//     ],
//     input: [
//         {
//             type: 'text',
//             placeholder: 'Введите имя'
//         },
//         {
//             type: 'text',
//             placeholder: 'Введите цену'
//         }
//     ],
//     // Addon's or plugin
//     parallax3d: {
//         frequencyX: 65,
//         frequencyY: 65
//     }
// });

// Hint
// modalUniversal.openModal('hint', {
//     title: 'Подсказка',
//     subtitle: 'Безусловно, синтетическое тестирование <br> обеспечивает актуальность поставленных <br> обществом задач.',
//     action: [
//         {
//             title: 'Подтвердить',
//             click: 'test(this)',
//             code: function test (e) {
//                 console.log(document.querySelector(`.modal-universal__content[data-id="${e.dataset.id}"] .modal-universal__content-hint__checkbox input`).checked);
//             }
//         },
//         {
//             title: 'Отменить',
//             click: 'test2()',
//             code: function test2 () {
//                 console.log('test2');
//             }
//         },
//         {
//             title: 'Отменить',
//             click: 'test3()',
//             code: function test3 () {
//                 console.log('test3');
//             }
//         },
//         {
//             title: 'Закрыть',
//             close: true,
//             click: 'closes()',
//             code: function closes () {
//                 console.log('close');
//                 modalUniversal.closeModal(modalUniversal.count);
//             }
//         }
//     ],
//     // Addon's or plugin
//     parallax3d: {
//         frequencyX: 65,
//         frequencyY: 65
//     }
// });

// Range
// modalUniversal.openModal('range', {
//     title: 'Выберите количество',
//     subtitle: 'Безусловно, синтетическое тестирование <br> обеспечивает актуальность поставленных <br> обществом задач.',
//     handler: {
//         name: 'rangeHandler(this)',
//         code: function rangeHandler (e) {
//             const value = document.querySelector(`.modal-universal__content[data-id="${e.dataset.id}"] .modal-universal__content-range__input input`).value;
//             document.querySelector(`.modal-universal__content[data-id="${e.dataset.id}"] .modal-universal__content-range__input-value span`).textContent = value;
//         },
//     },
//     action: [
//         {
//             title: 'Подтвердить',
//             click: 'test(this)',
//             code: function test (e) {
//                 const value = document.querySelector(`.modal-universal__content[data-id="${e.dataset.id}"] .modal-universal__content-range__input input`).value;
//                 if (e.type === 'submit') {
//                     console.log(`After click on button submit. Value: ${value}`);
//                 }
//                 modalUniversal.closeModal(modalUniversal.count);
//             }
//         },
//         {
//             title: 'Закрыть',
//             close: true,
//             click: 'closess()',
//             code: function closess () {
//                 console.log('close');
//                 modalUniversal.closeModal(modalUniversal.count);
//             }
//         },
//         {
//             title: 'Закрыть',
//             close: true,
//             click: 'closes()',
//             code: function closes () {
//                 console.log('close');
//                 modalUniversal.closeModal(modalUniversal.count);
//             }
//         }
//     ],
//     roundValue: true,
//     range: {
//         step: 1,
//         min: 0,
//         max: 100,
//     },
//     // Addon's or plugin
//     parallax3d: {
//         frequencyX: 65,
//         frequencyY: 65
//     }
// });