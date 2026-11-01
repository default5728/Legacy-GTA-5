let topMenu = new Vue({
    el: '#topMenu',
    data: {
        active: true,
        activeTab: 'top',
        online: {
            real: 456,
            max: 456
        },
        kills: [],
        deaths: [],
        onlines: [],
        moneys: []
    },
    methods: {
        setActiveTab(tab) {
            this.activeTab = tab;
        },
        loadData(jsonData) {
            this.kills = jsonData.kills;
            this.deaths = jsonData.deaths;
            this.onlines = jsonData.onlines;
            this.moneys = jsonData.moneys;
            this.online = jsonData.online;
        }
    }
});