$(window).scroll(function() {
  if ($(document).scrollTop() > 50) {
    $('nav').addClass('transparent');
  } else {
    $('nav').removeClass('transparent');
  }
});
