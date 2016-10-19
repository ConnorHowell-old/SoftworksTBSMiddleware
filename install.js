var Service = require('node-windows').Service;

// Create a new service object
var svc = new Service({
  name:'Softworks/TBS Middleware',
  description: 'TBS Clocks and Softworks middleware application',
  script: 'C:\\Program Files\\SoftworksTBSMiddleware\\app.js'
});

// Listen for the "install" event, which indicates the
// process is available as a service.
svc.on('install',function(){
  svc.start();
});

// Just in case this file is run twice.
svc.on('alreadyinstalled',function(){
  console.log('This service is already installed.');
});

// Listen for the "start" event and let us know when the
// process has actually started working.
svc.on('start',function(){
  console.log(svc.name+' started!\nVisit http://127.0.0.1:3000 to see it in action.');
});

// Install the script as a service.
svc.install();
