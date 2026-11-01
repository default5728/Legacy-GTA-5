/**
 * На старых БД в accounts могут отсутствовать колонки bag_*.
 * Не запрашиваем их в SELECT — подставляем значения по умолчанию.
 */
global.mergeAccountRowDonateDefaults = function (row) {
    const d = {
        cobura: 'false',
        coburaw: 'false',
        bag_antisocial: 'false',
        bag_anime: 'false',
        bag_grob: 'false',
        bag_big_black: 'false',
        bag_big_white: 'false',
        bag_waist: 'false'
    };
    return Object.assign({}, d, row || {});
};
