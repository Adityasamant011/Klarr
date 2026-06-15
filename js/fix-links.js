// Fix cached .html links - load this before DOMContentLoaded
(function() {
  // Use MutationObserver to fix links as they're added to DOM
  var observer = new MutationObserver(function(mutations) {
    mutations.forEach(function(mutation) {
      mutation.addedNodes.forEach(function(node) {
        if (node.nodeType === 1) { // Element
          if (node.href && node.href.endsWith('.html')) {
            node.href = node.href.replace('.html', '');
          }
          if (node.querySelectorAll) {
            node.querySelectorAll('a[href$=".html"]').forEach(function(a) {
              a.href = a.href.replace('.html', '');
            });
          }
        }
      });
    });
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
  
  // Also fix existing links
  function fixLinks() {
    document.querySelectorAll('a[href$=".html"]').forEach(function(a) {
      a.href = a.href.replace('.html', '');
    });
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', fixLinks);
  } else {
    fixLinks();
  }
})();
