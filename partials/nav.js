/* Shared nav — edit here, every page updates.
   {{root}} is replaced with the path to the site root, so links work from any page.
   Style matches the homepage's top bar (.intro-sheet__top): dark, name left, links right. */
window.SITE_PARTIALS = window.SITE_PARTIALS || {};
window.SITE_PARTIALS.nav = `
<nav class="nav" aria-label="Primary">
  <div class="container nav__inner">
    <a class="nav__logo" href="{{root}}index.html">Chandik A Chandran</a>
    <div class="nav__links intro-sheet__links">
      <a class="nav__link--hide-sm" href="{{root}}index.html#work" data-nav="work">Work</a>
      <a class="nav__link--hide-sm" href="{{root}}index.html#about">About</a>
      <a href="{{root}}files/chandik-chandran-resume.pdf" target="_blank" rel="noopener">Resume</a>
      <a class="nav__link--hide-sm" href="https://www.linkedin.com/in/chandik/" target="_blank" rel="noopener">LinkedIn</a>
      <a class="nav__link--hide-sm" href="https://www.instagram.com/chandik_/" target="_blank" rel="noopener">Instagram</a>
      <a href="mailto:chandikachandran@gmail.com">Get in touch</a>
    </div>
  </div>
</nav>`;
