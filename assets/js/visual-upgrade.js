/* Markipie visual motion + cinematic editorial layer. */
(function(){
  'use strict';
  var PHOTOS = {
    wedding:'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1400&q=88',
    candid:'https://images.unsplash.com/photo-1520854221256-17451cc331bf?auto=format&fit=crop&w=1200&q=88',
    films:'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=1200&q=88',
    haldi:'https://images.unsplash.com/photo-1606800052052-a08af714886e?auto=format&fit=crop&w=1200&q=88',
    mehendi:'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&w=1200&q=88',
    reception:'https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=1200&q=88',
    details:'https://images.unsplash.com/photo-1519225421980-715cb0215aed?auto=format&fit=crop&w=1200&q=88',
    portraits:'https://images.unsplash.com/photo-1524250502761-1ac6f2e30d43?auto=format&fit=crop&w=1200&q=88'
  };

  function addCinematicRail(){
    var body=document.body;
    if(!body || body.classList.contains('page-admin') || body.classList.contains('page-client-access') || body.classList.contains('page-client-gallery')) return;
    if(document.querySelector('.cinematic-rail')) return;
    var main=document.querySelector('main');
    if(!main) return;
    var anchor=main.querySelector('.section');
    if(!anchor) return;
    var rail=document.createElement('section');
    rail.className='cinematic-rail mk-cinematic-reveal';
    rail.setAttribute('aria-label','Markipie visual stories');
    rail.innerHTML=
      '<div class="cinematic-rail__inner">'+
        '<span class="cinematic-rail__badge">Markipie visual stories</span><span class="cinematic-rail__shine"></span>'+
        '<a class="cinematic-tile cinematic-tile--hero" href="/gallery/"><img src="'+PHOTOS.wedding+'" alt="Wedding photography story" loading="eager"><span class="cinematic-tile__copy"><span>Signature weddings</span><b>The moments you never want to forget.</b></span></a>'+
        '<a class="cinematic-tile" href="/gallery/"><img src="'+PHOTOS.candid+'" alt="Candid wedding photography" loading="lazy"><span class="cinematic-tile__copy"><span>Candid</span><b>Unscripted. Emotional. Yours.</b></span></a>'+
        '<a class="cinematic-tile" href="/gallery/"><img src="'+PHOTOS.haldi+'" alt="Haldi celebration photography" loading="lazy"><span class="cinematic-tile__copy"><span>Haldi</span><b>Colour, laughter &amp; chaos.</b></span></a>'+
        '<a class="cinematic-tile" href="/gallery/"><img src="'+PHOTOS.reception+'" alt="Wedding reception photography" loading="lazy"><span class="cinematic-tile__copy"><span>Reception</span><b>Every room has a story.</b></span></a>'+
        '<a class="cinematic-tile" href="/services/"><img src="'+PHOTOS.films+'" alt="Cinematic wedding films" loading="lazy"><span class="cinematic-tile__copy"><span>Cinematic films</span><b>Frames that feel alive.</b></span></a>'+
      '</div>';
    anchor.parentNode.insertBefore(rail,anchor);
  }

  function boot(){
    addCinematicRail();
    var reduced=window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var cards=Array.prototype.slice.call(document.querySelectorAll('.qx-card,.story-card,.card,.pkg-card,.svc-card,.access-teaser,.cta-band,.cinematic-tile'));
    if(!reduced){
      cards.forEach(function(card){
        card.addEventListener('pointermove',function(e){
          if(e.pointerType==='touch') return;
          var r=card.getBoundingClientRect();
          if(!r.width||!r.height)return;
          var x=(e.clientX-r.left)/r.width-.5, y=(e.clientY-r.top)/r.height-.5;
          card.style.setProperty('--mx',(x*100).toFixed(2)+'%');
          card.style.setProperty('--my',(y*100).toFixed(2)+'%');
          if(card.classList.contains('story-card')||card.classList.contains('qx-card')){
            card.style.transform='translateY(-6px) rotateX('+(-y*2.2).toFixed(2)+'deg) rotateY('+(x*2.2).toFixed(2)+'deg)';
          }
        });
        card.addEventListener('pointerleave',function(){
          card.style.removeProperty('--mx');card.style.removeProperty('--my');
          if(card.classList.contains('story-card')||card.classList.contains('qx-card'))card.style.transform='';
        });
      });
    }
    if('IntersectionObserver' in window){
      var sections=Array.prototype.slice.call(document.querySelectorAll('.section,.page-hero,.cinematic-rail'));
      var io=new IntersectionObserver(function(entries){entries.forEach(function(en){if(en.isIntersecting){en.target.classList.add('mk-in-view');io.unobserve(en.target);}})},{threshold:.08});
      sections.forEach(function(s){io.observe(s);});
    }
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
