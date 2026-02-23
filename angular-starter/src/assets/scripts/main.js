(function() {
  "use strict";

  window.addEventListener('load', () => {
    on_page_load()
  });

  /**
   * Function gets called when page is loaded.
   */
   var navbar = document.getElementById('header-nav')
  var body = document.getElementsByTagName("body")[0]
  var scrollTop = document.getElementById('scrolltop')
  function on_page_load() {
     navbar = document.getElementById('header-nav')
     body = document.getElementsByTagName("body")[0]
     scrollTop = document.getElementById('scrolltop')
    // Initialize On-scroll Animations
    AOS.init({
      anchorPlacement: 'top-left',
      duration: 600,
      easing: "ease-in-out",
      once: true,
      mirror: false,
      disable: 'mobile'
    });
  }

  /**
   * Navbar effects and scrolltop buttons upon scrolling
   */
 
  window.onscroll = () => {
    // This project uses an Angular fixed header; avoid toggling Bootstrap's fixed-top
    // on #header-nav (it can cause flicker/disappear with smooth-scroll containers).
    const scrollRoot = document.getElementById('my-scrollbar');
    const y = scrollRoot ? (scrollRoot.scrollTop || 0) : (window.scrollY || 0);

    if (scrollTop) {
      if (y > 0) {
        scrollTop.style.visibility = "visible";
        scrollTop.style.opacity = 1;
      } else {
        scrollTop.style.visibility = "hidden";
        scrollTop.style.opacity = 0;
      }
    }
  };

  /**
   * Masonry Grid
   */
  var elem = document.querySelector('.grid');
  if(elem) {
    imagesLoaded(elem, function() {
      new Masonry(elem, {
        itemSelector: '.grid-item',
        percentPosition: true,
        horizontalOrder: true
      });
    })
  }

  /**
   * Big Picture Popup for images and videos
   */
   document.querySelectorAll("[data-bigpicture]").forEach((function(e) {
     e.addEventListener("click", (function(t){
       t.preventDefault();
       const data =JSON.parse(e.dataset.bigpicture)
       BigPicture({
        el: t.target,
        ...data
      })
     })
    )
  }))

  /**
   * Big Picture Popup for Photo Gallary
   */
   document.querySelectorAll(".bp-gallery a").forEach((function(e) {
    var caption = e.querySelector('figcaption')
    var img = e.querySelector('img')
    // set the link present on the item to the caption in full view
    img.dataset.caption = '<a class="link-light" target="_blank" href="' + e.href + '">' + caption.innerHTML + '</a>';
    window.console.log(caption, img)
     e.addEventListener("click", (function(t){
       t.preventDefault();
       BigPicture({
        el: t.target,
        gallery: '.bp-gallery',
      })
     })
    )
  }))

  // Add your javascript here


})();