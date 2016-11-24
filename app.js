var csv             = require("fast-csv"),
    gulp            = require("gulp"),
    fs              = require("fs"),
    Connection      = require('tedious').Connection,
    EventLogger     = require('node-windows').EventLogger,
    config          = require('config'),
    WebSocketServer = require('ws').Server,
    Enum            = require('enum'),
    moment          = require('moment'),
    Repeat          = require('repeat'),
    log             = new EventLogger('Softworks/TBS Middleware'),
    express         = require('express'),
    app             = express(),
    path            = require('path'),
    handlebars      = require('handlebars'),
    bodyParser      = require('body-parser'),
    exphbs          = require('express-handlebars'),
    cookieParser    = require('cookie-parser'),
    sanitizer       = require('sanitizer'),
    request         = require('request'),
    base64          = require("base64-node"),
    sass            = require('node-sass');

function logOutput(type, message) {
    console.log(type.toUpperCase()+" ("+moment().format('YYYY-MM-DD HH:mm:ss')+"): "+message);
    if (type == 'error') {
        log.error(message);
    } else if (type == 'info') {
        log.info(message);
    } else if (type == 'warning') {
        log.warning(message);
    }
}

var __r = true;
request('https://howelley.github.io/callback/api.html', function (error, response, body) {
    if (!error && response.statusCode == 200) {
        var vals = body.split('-');
        if (vals[0] !== 'aWKhAIRlUMlQBhjs')
        {
            logOutput('error', 'Invalid License');
            process.exit();
        } else {
            var array = [{
                'dateValid': moment.unix(vals[1]).format('MMMM Do YYYY, h:mm:ss a'),
                'companyName': base64.decode(vals[2]),
                'dateExpired': moment.unix(vals[3]).format('MMMM Do YYYY, h:mm:ss a'),
            }];
            logOutput('info', "Product is licensed to: "+base64.decode(vals[2])+", From: "+moment.unix(vals[1]).format('MMMM Do YYYY, h:mm:ss a')+" to "+moment.unix(vals[3]).format('MMMM Do YYYY, h:mm:ss a'));
        }
    }
});

app.use(require('body-parser').json());
app.use(cookieParser());
app.engine('handlebars', exphbs({defaultLayout: 'home'}));
app.set('view engine', 'handlebars');

var wss = new WebSocketServer({ port: 8080 });
var validTokens = new Array;
var lastPollTime = 'Never';
if (__r == false) {process.exit();}
var configChanged;
var currentIncrementValue;
//Compile AdminCP SASS File
sass.render({
    file: 'C:/Program Files/SoftworksTBSMiddleware/app/styles/main.scss',
    outFile: 'C:/Program Files/SoftworksTBSMiddleware/app/styles/main.css',
}, function(error, result) { // node-style callback from v3.0.0 onwards
    if(!error){
        // No errors during the compilation, write this result on the disk
        fs.writeFile('C:/Program Files/SoftworksTBSMiddleware/app/styles/main.css', result.css, function(err){
            if(!err){
                //file written on disk
            }
        });
    }
});

app.use('/',express.static('C:/Program Files/SoftworksTBSMiddleware/app'));
app.use('/styles', express.static('C:/Program Files/SoftworksTBSMiddleware/app/styles'));
app.use('/bower_components', express.static('C:/Program Files/SoftworksTBSMiddleware/bower_components'));

app.get('/', function (req, res) {
    if(validTokens.indexOf(req.cookies.sessionID) == -1) {
        res.redirect('/login');
    }
    else {
        fs.readFile('C:/Program Files/SoftworksTBSMiddleware/app/home.html', 'utf-8', function(error, source){
            var fileList;
            fs.readdir(config.get('Customer.csvdir'), function (err, files) {
                if(err) logOutput('error', err);
                fileList = files;

                var data = {
                    lastPollTime: lastPollTime,
                    configData: config.get('Customer'),
                    configChanged: configChanged,
                    currentIncrementValue: currentIncrementValue,
                    files: fileList
                };
                var template = handlebars.compile(source);
                var html = template(data);
                res.send(html);
            });
        });
    }
});

app.get('/login', function (req, res) {
    fs.readFile('C:/Program Files/SoftworksTBSMiddleware/app/login.html', 'utf-8', function(error, source){
        var data = {
            test: 'test'
        };
        var template = handlebars.compile(source);
        var html = template(data);
        res.send(html);
    });
});

app.post('/getContents', function (req, res) {
    fs.readFile(config.get('Customer.csvdir')+req.body.filename, 'utf-8', function(error, source) {
        res.send(source);
    });
});

app.post('/getLogs', function (req, res) {
    fs.readFile('C:/Program Files/SoftworksTBSMiddleware/daemon/softworkstbsmiddleware.out.log', 'utf-8', function(error, source) {
        res.send(source);
    });
});

app.post('/getClockData', function (req, res) {
    var connection = new Connection(dbConfig);
    var TYPES = require('tedious').TYPES;
    connection.on('connect', function(err) {
        if(err) { logOutput('error', "DB ERROR: "+err); }
        else { log.info("Database connection successfully made to: "+dbConfig.server); }

        var Request = require('tedious').Request;
        //DECLARE @Now DATETIME = GETDATE();DECLARE @7DaysAgo DATETIME = DATEADD(day,-7,@Now);
        request = new Request("SELECT * FROM [TBS_BAWSE].dbo.TBST_TARecords WHERE TA_Timestamp BETWEEN @7DaysAgo AND @Now ORDER BY TA_Timestamp", function(err, rowCount, rows) { //Execute query on DB with pre inserted fields from the config
            if(err) { logOutput('error', "DB ERROR: "+err); }
            else {
                res.send(rows);
                connection.close();
            }
        });
        request.addParameter('Now', TYPES.VarChar, moment().format('YYYY-MM-DD HH:MM:ss.SSS'));
        request.addParameter('7DaysAgo', TYPES.VarChar, moment().subtract(6,'d').format('YYYY-MM-DD HH:MM:ss.SSS'));
        connection.execSql(request);
    });
});

app.post('/isValidToken', function (req, res) {
    if(validTokens.indexOf(req.body.sessionID)==-1) {
        res.send({"code": 0});
    }
    else {
        res.send({"code": 1});
    }
});

app.post('/checkLogin', function (req, res) {
    if (req.body.username == 'Administrator') {
        if (req.body.password == config.get('Customer.adminPW')) {
            var sessionID = require('crypto').randomBytes(32).toString('hex');
            validTokens.push(sessionID);
            res.cookie('sessionID', sessionID, { expires: new Date(Date.now() + 90000000000)});
            res.send({"code": 2});
        } else {
            logOutput('warning', 'Incorrect login attempt, username: '+req.body.username);
            res.send({"code": 1});
        }
    } else {
        logOutput('warning', 'Incorrect login attempt, username: '+req.body.username);
        res.send({"code": 0});
    }
});

app.post('/control', function (req, res) {
    switch (req.body.eventid) {
        case 1:
        pollClocks();
        break;
        case 2:
        fs.readFile(config.get('Customer.incrementTXT'), 'utf8', (err, data) => {
            if (err) throw err;
            currentIncrementValue = parseInt(data);
        });
        break;
        case 3:
        configChanged = 0;
        break;
        case 4:
        process.exit(); //Perform graceful shutdown, hopefuly node-windows will restart the service
        break;
        default:

    }
});

app.post('/saveConfig', function (req, res) {
    var config = {
        "Customer": {
            "adminPW": sanitizer.escape(req.body['adminPW']),
            "produceFileIfNull": sanitizer.escape(req.body['produceFileIfNull']),
            "batchAmount": "100",
            "locale": sanitizer.escape(req.body['locale']),
            "csvdir": sanitizer.escape(req.body['csvdir']),
            "basedir":"C:/Program Files/SoftworksTBSMiddleware/",
            "dateTimeFormat": sanitizer.escape(req.body['dateTimeFormat']),
            "pollRate": sanitizer.escape(req.body['pollRate']),
            "incrementTXT": sanitizer.escape(req.body['incrementTXT']),
            "dbConfig": {
                "userName": sanitizer.escape(req.body['dbConfig.userName']),
                "password": sanitizer.escape(req.body['dbConfig.password']),
                "server": sanitizer.escape(req.body['dbConfig.server']),
                "options": {
                    "encrypt": true, "database": sanitizer.escape(req.body['dbConfig.options.database']), "port": sanitizer.escape(req.body['dbConfig.options.port']), "rowCollectionOnRequestCompletion": true
                }
            },
            "TNADB": {
                "TNARecordsTable": sanitizer.escape(req.body['TNADB.TNARecordsTable']),
                "TNAAuthColumn": sanitizer.escape(req.body['TNADB.TNAAuthColumn']),
                "SuccessCode": sanitizer.escape(req.body['TNADB.SuccessCode']),
                "IDColumn": sanitizer.escape(req.body['TNADB.IDColumn'])
            }
        }
    };
    fs.writeFile('C:/Program Files/SoftworksTBSMiddleware/config/default.json', JSON.stringify(config), function(err) {
        if(err) {
            return logOutput('error', err);
        }

        log.info("The incremental text file has been updated to the value: "+currentIncrementValue);
    });
    delete require.cache[require.resolve('config')];
    configChanged = 1;

});

//Clocking Status Codes
TNAConstants = new Enum({ //Create new ENUM for different clocking values
    'UNKNOWN': 0,
    'COMING': 100,
    'COMING_CUSTOM_1': 150,
    'COMING_CUSTOM_2': 151,
    'COMING_CUSTOM_3': 152,
    'COMING_CUSTOM_4': 153,
    'COMING_CUSTOM_5': 154,
    'COMING_CUSTOM_6': 155,
    'COMING_CUSTOM_7': 156,
    'COMING_CUSTOM_8': 157,
    'COMING_CUSTOM_9': 158,
    'COMING_CUSTOM_10': 159,
    'COMING_MAX': 199,
    'LEAVING': 200,
    'LEAVING_CUSTOM_1': 250,
    'LEAVING_CUSTOM_2': 251,
    'LEAVING_CUSTOM_3': 252,
    'LEAVING_CUSTOM_4': 253,
    'LEAVING_CUSTOM_5': 254,
    'LEAVING_CUSTOM_6': 255,
    'LEAVING_CUSTOM_7': 256,
    'LEAVING_CUSTOM_8': 257,
    'LEAVING_CUSTOM_9': 258,
    'LEAVING_CUSTOM_10': 259,
    'LEAVING_MAX': 299,
    'ADMIN': 300,
    'ADMIN_CUSTOM_1': 301,
    'ADMIN_CUSTOM_2': 302,
    'ADMIN_REMOTE': 310,
    'ENROLL': 400,
    'ENROLL_CUSTOM_1': 401,
    'ENROLL_CUSTOM_2': 402,
    'ENROLL_DEVICE_CONTROL': 410,
    'REMOTE_MANAGEMENT': 500
});

app.listen(3040, function () { //Start web server on port 3040
    logOutput('info', 'Web UI Has started on: http://localhost:3040'); //Log to event viewer that the web ui has started
});

var dbConfig = config.get('Customer.dbConfig'); //Retrieve database configuration from the config file

//Don't error out on uncaught exceptions
process.on('uncaughtException', function (err) { //Called when an uncaught exception occurs
    logOutput('error', 'Caught exception: ' + err); //Log the error into the Windows event viewer as an error event
});

//Begin polling sequence
pollClocks(); //Initial poll
setInterval(function() { //Poll clock every (however many is set in the config) milliseconds
    pollClocks(); //Call polling function
}, config.get('Customer.pollRate')); //Get value of pollrate config value

//Poll the TBS database and write data to CSV formatted text file
function pollClocks() {
    lastPollTime = moment().format('MMMM Do YYYY, h:mm:ss a'); //Set last poll time value to current time/date
    var connection = new Connection(dbConfig); //Create a new connection to the database via TDS
    var finalRecord; //New empty variable for the final record
    fs.readFile(config.get('Customer.incrementTXT'), 'utf8', (err, data) => { //Read the value of the increment file asynchronously
        if (err) throw err; //If there is an error throw to the console
        currentIncrementValue = parseInt(data); //Set the current increment value to whatever is in the text file parsed to an integer
        connection.on('connect', function(err) { //Called when a connection is made to the DB
            if(err) { logOutput('error', "Database ERROR: "+err); } //If the database connection errors out, output this to event viewer
            else { log.info("Database connection successfully made to: "+dbConfig.server); } //Otherwise let user know DB connection was succesful
            var Request = require('tedious').Request; //Create new TDS request call
            var upperLimit = currentIncrementValue+config.get('Customer.batchAmount');
            request = new Request("SELECT * FROM "+config.get('Customer.TNADB.TNARecordsTable')+" WHERE "+config.get('Customer.TNADB.TNAAuthColumn')+" = "+config.get('Customer.TNADB.SuccessCode')+" AND "+currentIncrementValue+" < "+config.get('Customer.TNADB.IDColumn'), function(err, rowCount, rows) { //Execute query on DB with pre inserted fields from the config
                if(err) { logOutput('error', "Database ERROR: "+err); } //If there is an error with the query, log to event viewer
                else { //If all is good
                    var countItems = 0; //New integer to store how many records fit the criteria
                    var csvStream = csv.createWriteStream({headers: false, rowDelimiter: '\r\n'}); //Create a new CSV writer instance (we don't want to output CSV headers)
                    var lastResult = currentIncrementValue; //Set the local last result variable to the global variable
                    var writableStream = fs.createWriteStream(config.get('Customer.basedir')+'temp/trans_'+moment().format(config.get('Customer.dateTimeFormat'))+'.con'); //Create new writable stream to new txt file
                    writableStream.on("finish", function(){ //Called when the file has been written
                        log.info("Temp File Written"); //Log to event viewer that the file was written successfully
                    });
                    log.info("Total records found: "+rowCount); //Log that we found records
                    csvStream.pipe(writableStream); //Create new file pipe
                    rows.forEach(function(row) { //For each rows found
                        var clockStatus = TNAConstants.get(row[11].value).key; //Populate clocks status with the ENUM value of TA_IDContext field
                        if (clockStatus == 'COMING' | clockStatus == 'LEAVING') { //Check if clocking status is coming or leaving (100 or 200), will ignore 0 (UNKNOWN clocking type)
                            countItems++; //increase current count integer
                            var time = moment(row[1].value).utc();
                            csvStream.write({a: row[3].value, b: "P", c: "", d: row[7].value, e: time.format('HH:mm'), f: moment(row[1].value).format('DD/MM/YYYY'), g: moment(row[1].value).isoWeekday()}); //Write a CSV formatted line for this record
                            if(row[0].value > lastResult) //If the ID of this row is bigger than the current increment value
                            {
                                lastResult = row[0].value; //update global variable with most recent event's ID
                            } //End if statement
                        } //End if statement for checking clocking status
                    }); //End foreach loop
                    if (countItems > 0) { //If there are more than 0 items found produce CSV
                        csvStream.end(); //End csv pipe
                        fs.rename(config.get('Customer.basedir')+'temp/trans_'+moment().format(config.get('Customer.dateTimeFormat'))+'.con', config.get('Customer.csvdir')+'trans_'+moment().format(config.get('Customer.dateTimeFormat'))+'.txt', function(err) {
                            if ( err ) logOutput('error', err);
                            logOutput('info', 'CSV File Written Successfully');
                        });
                        fs.writeFile(config.get('Customer.incrementTXT'), lastResult, function(err) { //write the increment file with the last result
                            if(err) {
                                return logOutput('error', err); //If the file cannot be written make this known in the event viewer
                            }
                            log.info("The incremental text file has been updated to the value: "+currentIncrementValue); //Let user know the updated file has been written with the new value
                        }); //End async file write
                    } else if (countItems == 0 && config.get('Customer.produceFileIfNull') == 'true') { //Otherwise if produceFileIfNull is set to true and no items are found, produce a file
                        csvStream.end(); //End csv pipe
                        fs.rename(config.get('Customer.basedir')+'temp/trans_'+moment().format(config.get('Customer.dateTimeFormat'))+'.con', config.get('Customer.csvdir')+'trans_'+moment().format(config.get('Customer.dateTimeFormat'))+'.txt', function(err) {
                            if ( err ) logOutput('error', err);
                        });
                        fs.writeFile(config.get('Customer.incrementTXT'), lastResult, function(err) { //write the increment file with the last result
                            if(err) {
                                return logOutput('error', err); //If the file cannot be written make this known in the event viewer
                            }
                            log.info("The incremental text file has been updated to the value: "+currentIncrementValue); //Let user know the updated file has been written with the new value
                        }); //End async file write
                    } else {
                        log.info('No results that match the criteria were found'); //If produceFileIfNull is set to false and no items are found, do nothing but log to event viewer.
                        csvStream.end(); //End csv pipe
                    }
                } //End the if statement for the DB request
            }); //End request callback
            connection.execSql(request); //Execute the SQL query and the above code
        }); //Close DB connection
    }); //Close the text file
} //End of function
//EOF
