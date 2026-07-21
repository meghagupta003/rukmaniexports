// Rukmani Exports — shared interactions
// Kept deliberately minimal: a scroll-reveal for section entries, nothing ambient.

document.addEventListener('DOMContentLoaded', () => {
  const reveals = document.querySelectorAll('.reveal');

  if ('IntersectionObserver' in window && reveals.length) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15 });

    reveals.forEach(el => io.observe(el));
  } else {
    reveals.forEach(el => el.classList.add('in'));
  }

  // Close mobile nav when a link is clicked
  document.querySelectorAll('.primary-nav a').forEach(a => {
    a.addEventListener('click', () => {
      document.querySelector('.primary-nav')?.classList.remove('open');
    });
  });
});
