let NPCDialog = new Vue({
    el: "#messages",
    data: {
        NPCDialogActive: 1,
        localName: null,
        NPCName: 'Anton',
        NPCType: 'Скупщик',
        NPCText: '',
        CrimeTasks: 1
    },
    methods: {
        changelocalName: function(_0x1464F) {
            this.localName = _0x1464F;
			this.NPCText = `Привет, ${this.localName}! Что то хотел?`
        },
        NPCIntercation: function(_0x13F19) {
            switch (_0x13F19) {
                case "TakeTaskShipping":
                    this.NPCText = `Хорошо, около офиса стоит машина, тебе необходимо доставить её до порта следуя маршруту. Когда машина будет доставлена, я пополню счёт семьи на 3.000$`;
                    this.OfficeShipping = 2;
                    break;
                case "TakeTaskShippingStart":
                    this.NPCDialogActive = 0;
                    this.OfficeShipping = 0;
                    mp.trigger("changeIteractionWithNPC", "stop");
                    mp.trigger("FamilyTakeTaskShipping");
                    break;
                case "Exit":
                    this.NPCDialogActive = 0;
                    this.OfficeShipping = 0;
                    mp.trigger("changeIteractionWithNPC", "stop");
                    break;
                case "DealerNrkWhat":
                    this.NPCText = `У меня ты можешь купить Вещество RNK, после чего переработать его.`;
                    this.DealNrk = 2;
                    break;
                case "DealerNrkDefault":
                    this.NPCText = `Здарова, ${this.localName}! Что хотел?`;
                    this.DealNrk = 1;
                    break;
                case "DealerNrkSelectBuy":
                    this.NPCText = `Окей, сколько свёрстков тебе нужно?`;
                    this.DealNrk = 3;
                    break;
                case "DealerNrkExit":
                    this.NPCDialogActive = 0;
                    this.DealNrk = 0;
                    mp.trigger("changeIteractionWithNrkNPC", "stop");
                    break;
                case "CrimeTakeTasks":
                    this.NPCText = `Выбирай одно из заданий.`;
                    this.CrimeTasks = 2;
                    break;
                case "CrimeTasksDefault":
                    this.NPCText = `Привет, ${this.localName}! Нужна работа?`;
                    this.CrimeTasks = 1;
                    break;
                case "CrimeTasksSelectBuy":
                    this.NPCText = `Окей, сколько отмечек тебе нужно?`;
                    this.CrimeTasks = 3;
                    break;
                case "CrimeTasksExit":
                    this.NPCDialogActive = 0;
                    this.CrimeTasks = 0;
                    mp.trigger("changeIteractionWithCrimeTasksNPC", "stop");
                    break;
                case "CrimeStartTaskAuto":
                    this.NPCText = `Готов предложить тебе взять заказ прямо сейчас. Дорога дальняя, проходит через опасный район, будь осторожен!`;
                    this.CrimeTasks = 4;
                    break;
                case "CrimeStartTaskHouse":
                    this.NPCText = `Без проблем, я вышлю тебе координаты дома, тебе необходимо взломать дверь дома, вынести оттуда вещи и переложить их в машину. Не забудь купить отмычки и будь осторожен, сотрудники FIB могут поймать тебя.`;
                    this.CrimeTasks = 5;
                    break;
                case "MaterialDeliveryDefault":
                    this.NPCText = `Привет, ${this.localName}! Хочешь что-то заказать?`;
                    this.MaterialDelivery = 1;
                    break;
                case "MaterialDelivery":
                    this.NPCText = `Цена заказа материалов - 25.000$, они спишутся с баланса вашей семьи. После этого в гараже появится 3 матовозки, вам необходимо сесть в них и доехать до места загрузки, оно отобразится при посадке в машину. Перетащите материалы в матовозки и доставьте в гараж.`;
                    this.MaterialDelivery = 2;
                    break;
                case "MaterialDeliveryExit":
                    this.NPCDialogActive = 0;
                    this.MaterialDelivery = 0;
                    mp.trigger("changeIteractionWithNPC", "stop");
                    break;
                case "MaterialDeliveryTakeExit":
                    this.NPCDialogActive = 0;
                    this.MaterialDeliveryStart = 0;
                    mp.trigger("changeIteractionWithDlvryMtrlsNPC", "stop");
                    break;
            }
        },
        startNPCDealNrkDialog: function(_0x13F19) {
            switch (_0x13F19) {
                case "Default":
                    this.OfficeShipping = 0;
                    this.NPCType = "Дилер";
                    this.NPCText = `Здарова, ${this.localName}! Что хотел?`;
                    this.DealNrk = 1;
                    this.NPCDialogActive = 1;
                    break;
                default:
                    break;
            }
        }
    }
});