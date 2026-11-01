class Parallax3d {
    constructor () {
        this.windowWidth = window.innerWidth;
        this.windowHeight = window.innerHeight;
        this.x = null;
        this.y = null;

        document.addEventListener('mousemove', (e) => {
            for (let p = 0; p < document.querySelectorAll('[data-parallax3d="true"]').length; p++) {
                if (document.querySelectorAll('[data-parallax3d="true"]')[p].dataset.hasOwnProperty('parallax3dFrequencyx') && document.querySelectorAll('[data-parallax3d="true"]')[p].dataset.hasOwnProperty('parallax3dFrequencyy')) {
                    this.x = ((this.windowWidth / 2) - e.pageX) / document.querySelectorAll('[data-parallax3d="true"]')[p].dataset.parallax3dFrequencyx;
                    this.y = ((this.windowHeight / 2) - e.pageY) / document.querySelectorAll('[data-parallax3d="true"]')[p].dataset.parallax3dFrequencyy;
                    document.querySelectorAll('[data-parallax3d="true"]')[p].style.transform = `perspective(${this.toVwConverter(this.windowWidth / 2)}vw) rotateY(${-this.x}deg) rotateX(${this.y}deg)`;
                }
            }
        });

        this.toVwConverter = function (param) {
            return (param / this.windowWidth * 100).toFixed(2);
        };

    }
}