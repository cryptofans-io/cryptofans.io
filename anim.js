function createAnimatedElement(className) {
  const element = document.createElement('div');
  element.classList.add(className);
  element.style.left = `${Math.random() * 100}vw`;
  element.style.top = `-80px`;
  document.getElementById('animation-container').appendChild(element);

  gsap.to(element, {
    y: `${window.innerHeight + 80}px`,
    rotation: Math.random() * 720 - 360,
    duration: Math.random() * 10 + 5,
    ease: 'power1.inOut',
    onComplete: () => {
      element.remove();
    }
  });
}

function animateElements() {
  setInterval(() => createAnimatedElement('pancake'), 2000);
  setInterval(() => createAnimatedElement('bunny'), 3000);
  setInterval(() => createAnimatedElement('coin'), 1500);
}

animateElements();