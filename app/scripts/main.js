function getCookie(cname) {
    var name = cname + "=";
    var ca = document.cookie.split(';');
    for(var i = 0; i <ca.length; i++) {
        var c = ca[i];
        while (c.charAt(0)==' ') {
            c = c.substring(1);
        }
        if (c.indexOf(name) == 0) {
            return c.substring(name.length,c.length);
        }
    }
    return "";
}

function filterClockResults(array, prop, value){
    var filtered = [];
    for(var i = 0; i < array.length; i++){
        var obj = array[i];
        for (var i = 0; i < obj.length; i++) {
            if (obj[prop] == value) {
                filtered.push(obj);
            }
        }
    }
    return filtered;
}

function deleteAllCookies() {
    var cookies = document.cookie.split(";");

    for (var i = 0; i < cookies.length; i++) {
        var cookie = cookies[i];
        var eqPos = cookie.indexOf("=");
        var name = eqPos > -1 ? cookie.substr(0, eqPos) : cookie;
        document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT";
    }
}

function getClockValues () {
    $.ajax({
        url: '/getClockData',
        type: 'POST',
        contentType: 'application/json'
    }).done(function(data) {
        console.log(filterClockResults(data, 9, "roope"));
    });
}

$(document).ready(function() {
    $('.modal-trigger').leanModal();
    $.ajax({
        url: '/isValidToken',
        type: 'POST',
        contentType: 'application/json',
        data: JSON.stringify({'sessionID':getCookie('sessionID')})}
    ).done(function(data) {
        if(data.code !== 1)
        {
            window.location.replace("/login");
        }
    });
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
    , toastTimeout = window.setTimeout(function setToastTimeout() {
        Materialize.toast('Welcome back Admin', 4000);
        window.clearTimeout(toastTimeout);
    }, 3000)
    , secondToastTimeout = window.setTimeout(function setSecondToastTimeout() {
        window.clearTimeout(secondToastTimeout);
    }, 5000);
})();

function showHelp(field) {
    $('.'+field+'_help').removeClass('hidden');
    $('.'+field+'_help').addClass('fadeIn animated');
}

function hideHelp(field) {
    setTimeout(function()
    {
        $('.'+field+'_help').addClass('hidden');
    }, 100);
}

function viewContents(filename) {
    $('#fileContents').openModal();
    $('.view_filename').text(filename);
    $('.view_filecontents').text("");
    $.ajax({
        url: '/getContents',
        type: 'POST',
        contentType: 'application/json',
        data: JSON.stringify({'filename':filename})}
    ).done(function(data) {
        $('.csvContents').empty();
        Papa.parse(data, {
            complete: function(results) {
                var tableRows;
                results.data.forEach(function (row) {
                    tableRows += '<tr><td>'+row[0]+'</td>'+'<td>'+row[3]+'</td>'+'<td>'+row[4]+'</td>'+'<td>'+row[5]+'</td></tr>';
                });
                $('.csvContents').html(tableRows);
            }
        });
    });
}

function logoutDialog() {
    $('#logoutDialog').openModal();
}

function licenseInfo() {
    $('#licenseDialog').openModal();
}

function performLogout() {
    deleteAllCookies();
    location.reload();
}

function restartService() {
    NProgress.start();
    $.ajax({
        url: '/control',
        type: 'POST',
        contentType: 'application/json',
        data: JSON.stringify({'eventid':4})}
    );
    NProgress.done();
}

function refreshStatus() {
    NProgress.start();
    $('.statusBar').removeClass('hidden');
    $('.statusBar').addClass('fadeIn animated');
    $.ajax({
        url: '/control',
        type: 'POST',
        contentType: 'application/json',
        data: JSON.stringify({'eventid':1})}
    );
    setTimeout(function()
    {
        $('.pollTime').addClass('fadeIn animated');
        $('.statusBar').addClass('hidden');
        $('.pollTime').text(moment().format('MMMM Do YYYY, h:mm:ss a'));
    }, 1500);
    NProgress.done();
}

function saveConfigForm() {
    var $inputs = $('#configForm :input');
    var values = {};
    $inputs.each(function() {
        values[this.id] = $(this).val();
    });
    $.ajax({
        url: '/saveConfig',
        type: 'POST',
        contentType: 'application/json',
        data: JSON.stringify(values)}
    );
};

function acknowledge() {
    NProgress.start();
    $('.message').addClass('hidden');
    $.ajax({
        url: '/control',
        type: 'POST',
        contentType: 'application/json',
        data: JSON.stringify({'eventid':3})}
    );
    NProgress.done();
}

function revert() {
    var $inputs = $('#configForm :input');
    var values = {};
    $inputs.each(function() {
        values[this.id] = $(this).val();
    });
    $.ajax({
        url: '/saveConfig',
        type: 'POST',
        contentType: 'application/json',
        data: JSON.stringify(values)}
    );
    $.ajax({
        url: '/control',
        type: 'POST',
        contentType: 'application/json',
        data: JSON.stringify({'eventid':3})}
    );
}

function refreshValue() {
    NProgress.start();
    $('.incrementStatus').removeClass('hidden');
    $('.incrementStatus').addClass('fadeIn animated');
    $.ajax({
        url: '/control',
        type: 'POST',
        contentType: 'application/json',
        data: JSON.stringify({'eventid':2})}
    );
    setTimeout(function()
    {
        $('.incFile').addClass('fadeIn animated');
        $('.incrementStatus').addClass('hidden');
        $('.incFile').text('Please refresh.');
    }, 1500);
    NProgress.done();
}

var data = {
    labels: ['Clocking', 'Enrollment', 'Admin'],
    series: [5, 3, 4]
};

var sum = function(a, b) { return a + b };

new Chartist.Pie('.ct-chart', data, {
    width: '400px',
    height: '400px',
});

new Chartist.Line('.clock-chart', {
    labels: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
    series: [
        [0, 0, 0, 0, 0]
    ]
}, {
    width: '900px',
    height: '400px',
    chartPadding: {
        right: 40
    }
});
