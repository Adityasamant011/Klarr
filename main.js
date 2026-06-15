// Scroll-triggered fade-in animations
document.addEventListener('DOMContentLoaded', function() {
  var observer = new IntersectionObserver(function(entries) {
    entries.forEach(function(entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

  document.querySelectorAll('.fade-in').forEach(function(el) {
    observer.observe(el);
  });

  // Smooth scroll for anchor links
  document.querySelectorAll('a[href^="#"]').forEach(function(anchor) {
    anchor.addEventListener('click', function(e) {
      e.preventDefault();
      var target = document.querySelector(this.getAttribute('href'));
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });

  // FAQ accordion
  document.querySelectorAll('.faq-q').forEach(function(q) {
    q.style.cursor = 'pointer';
    q.addEventListener('click', function() {
      var item = this.parentElement;
      var answer = item.querySelector('.faq-a');
      var icon = this.querySelector('.faq-q-icon');
      var isOpen = answer.style.display === 'block';

      // Close all
      document.querySelectorAll('.faq-a').forEach(function(a) { a.style.display = 'none'; });
      document.querySelectorAll('.faq-q-icon').forEach(function(i) { i.textContent = '+'; });

      // Toggle current
      if (!isOpen) {
        answer.style.display = 'block';
        if (icon) icon.textContent = '−';
      }
    });
  });
});
