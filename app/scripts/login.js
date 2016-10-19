$(document).ready(function() {
  $('.modal-trigger').leanModal();
});
(function () {
  $('.button-collapse').sideNav();
  $('.currentTime').text(moment().format('DDMMYYYYHHmm'));
  $('.loading img').fadeIn(600).removeClass('hide');
  var bootTimeout = window.setTimeout(function setBootTimeout() {
    $('.page').removeClass('hide');
    $('.loading').fadeOut(1000);
    window.clearTimeout(bootTimeout);
  }, 2000)
})();

function formValidation() {
    $('.errorMessage').addClass('hidden');
    $('.loginStatus').removeClass('hidden');
    $('.loginStatus').addClass('fadeIn animated');
    var username = $('#username').val();
    var password = $('#password').val();
    setTimeout(function()
    {
        $.ajax({
            url: '/checklogin',
            type: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({'username':username, 'password': password})}
        ).done(function(data) {
            if (data.code == 0 || data.code == 1) {
                $('.errorMessage').removeClass('hidden');
                $('.errorMessage').addClass('fadeIn animated');
                $('.errMsg').text('ERROR: Username/Password Incorrect');
            };
            if (data.code == 2) {
                window.location.replace("/");
            }
        });
        $('.loginStatus').addClass('hidden');
    }, 1500);
}
