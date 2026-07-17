const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add("show");
        }
    });
}, {
    threshold: 0.2
});

document.querySelectorAll(".fade-up").forEach(el => {
    observer.observe(el);
});

const counters = document.querySelectorAll(".counter");
counters.forEach(counter => {
    let target = +counter.dataset.target;
    let current = 0;
    let speed = 60;
    let update = () => {
        current++;
        counter.innerHTML = current;
        if (current < target) {
            requestAnimationFrame(update);
        } else {
            counter.innerHTML = target;
        }
    }
    update();
});