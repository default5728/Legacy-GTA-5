const stackMessage = (message, type) => {
    switch(+type) {
        case 1:
            console.log(`%c ${message}`, 'color: #38ad69; font-size: 16px;');
            break;
        case 2:
            console.log(`%c ${message}`, 'color: #ffc107; font-size: 16px;');
            break;
        case 3:
            console.log(`%c ${message}`, 'color: #dc3545; font-size: 16px;');
            break;
    }
};