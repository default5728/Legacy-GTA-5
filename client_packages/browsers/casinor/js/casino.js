const casino = new Vue({
    el:'#app',
    data:{
        show: false,
        betList:[100000,250000,500000,1000000,2500000,5000000,10000000],
        minbet: 100000,
        maxbet: 10000000,
        bet: 100000,
		balance: 100000,
		timer: -1,
        notifyList:[],
        parallax3d: null
    },
    methods:{
        outString(e){
            return (e!==undefined)?`${e.toLocaleString('de-DE')}`:``;
        },
        getChip(e){
            return (e!==undefined)?`background-image:url('./img/icon_chip${e}.svg')`:``;
        },
        addNotify(notifyObject){
            let type = notifyObject.type;
            let time = notifyObject.time;
            let chip = notifyObject.flag;
            let value = notifyObject.msg;
            let id = 0;
            while(this.notifyList.some(x=>x.id===id)){
                id++;
            }
            let notify = (value!==undefined)?{id,type,value,chip}:{id,type,chip}
            this.notifyList.push(notify);
            setTimeout(() => {
                this.notifyList.splice(this.notifyList.indexOf(notify),1);
            }, (time===undefined)?500:time);
        },
        getMessage(notify){
            let notifyText = notify.value;
            if(notify.chip) notifyText = notifyText + '<div></div>';
            return notifyText ;
        },
        modal() {
            modalUniversal.openModal('confirmation', {
                title: 'Вы уверены что хотите покинуть стол?',
                subtitle: `Если вы выйдете сейчас, вы потеряете вашу ставку.`,
                action: [
                    {
                        title: 'Подтвердить',
                        click: 'exitRoulette()',
                        code: function exitRoulette() {
                            try {
                                mp.trigger('Casino.Roulette.ConfirmEx');
                            } catch {
                                stackMessage('Error', 3);
                            }
                            modalUniversal.closeModal(modalUniversal.count);
                        }
                    },
                    {
                        title: 'Отменить',
                        close: true,
                        click: 'denyExit()',
                        code: function denyExit () {
                            mp.trigger('Casino.Roulette.DisableCursor');
                            modalUniversal.closeModal(modalUniversal.count);

                        }
                    }
                ],
                parallax3d: {
                    frequencyX: 65,
                    frequencyY: 65
                }
            });
        },
    },
    mounted(){
        this.parallax3d = new Parallax3d();
    }
});
