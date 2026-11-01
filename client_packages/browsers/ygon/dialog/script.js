document.addEventListener("DOMContentLoaded", function () {
    const interactions = document.querySelector(".intercations");
    
    function showMainMenu() {
        interactions.innerHTML = `
            <p class="tittle-txt">Привет, что хотел?</p>
            <button class="button" id="earnButton">Заработать</button>
            <button class="button-bottom" onclick="mp.trigger('closeygon')">Ничего я пойду</button>
        `;
        document.getElementById("earnButton").addEventListener("click", showOptions);
    }
    
    function showOptions() {
        interactions.innerHTML = `
            <p class="tittle-txt">Могу тебе предложить несколько вариантов..</p>
            <button class="button" id="stealCarButton">Угон транспорта</button>
            <button class="button-bottom" id="backButton">Назад</button>
        `;
        document.getElementById("stealCarButton").addEventListener("click", showStealCarDetails);
        document.getElementById("backButton").addEventListener("click", showMainMenu);
    }
    
    function showStealCarDetails() {
        interactions.innerHTML = `
            <p class="tittle-txt">Условия:</p>
            <p class="description">Тебе нужно угнать транспорт и доставить его в указанное место. Плачу - 100.000$ Будь осторожен, полиция на чеку!</p>
            <button class="button" onclick="mp.trigger('quest:ygon:start:client')">Начать квест</button>
            <button class="button-bottom" id="backToOptions">Назад</button>
        `;
        document.getElementById("backToOptions").addEventListener("click", showOptions);
    }
    
    showMainMenu();
});