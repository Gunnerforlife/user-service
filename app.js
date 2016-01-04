module.exports = function(){

    //Express.
    var express = require('express');
    global.app = express();

    var pjson = require('./package.json'); 
    var bodyParser = require('body-parser');   
    var cookieParser = require('cookie-parser');
    var passport = require('passport');
    var session = require('express-session');
    var RedisStore = require('connect-redis')(session);
    var CronJob = require('cron').CronJob;
    var Q = require('q');
   
    global.app.use(function(req, res, next) {
        
        //if req body is a string, convert it to JSON. 
        if(typeof(req.body)==="string"){
            req.body = JSON.parse(req.body);
        }

        res.header('Access-Control-Allow-Credentials', true);
        res.header('Access-Control-Allow-Origin', req.headers.origin);
        res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
        res.header('Access-Control-Allow-Headers', 'X-Requested-With, X-HTTP-Method-Override, Content-Type, Accept');
        if ('OPTIONS' === req.method) {
            res.sendStatus(200);
        } else {
            next();
        }
    });

    //connect to db
    addConnections(passport);
    
    global.app.use(function(req, res, next){
        if (req.is('text/*')) {
            req.text = '';
            req.setEncoding('utf8');
            req.on('data', function(chunk){ req.text += chunk });
            req.on('end', next);
        } else {
            next();
        }
    });   
    
    global.app.get('/', function(req, res) {
        res.setHeader('Content-Type', 'application/json');
        res.send(JSON.stringify({ status : 200, version : pjson.version }));
    });

    //this fucntion add connections to the DB.
    function addConnections(passport){ 
       //setUp Redis
       setUpRedis();

       //MONGO DB
       setUpMongoDB(passport);       
    }

    function setUpRedis(){
        try{
      
            //Set up Redis.
            var hosts = [];
            
            var isCluster = false;
            
            if(global.config.redis.length>0){
                //take from config file
                for(var i=0;i<global.config.redis.length;i++){
                    hosts.push({
                        host : global.config.redis[i].host,
                        port : global.config.redis[i].port,                            
                    });
                    
                    if(global.config.redis[i].password){
                        hosts[i].password = global.config.redis[i].password;
                    }
                }
                
                if(global.config.redis.length>1){
                    isCluster = true;
                }
                
            }else{
                //take from env variables.
                var i=1;
                
                while(process.env["DOCKER_REDIS_"+i+"_PORT_6379_TCP_ADDR"] && process.env["REDIS_"+i+"_PORT_6379_TCP_PORT"]){
                    if(i>1){
                        isCluster = true;
                    }
                    var obj = {
                        host : process.env["DOCKER_REDIS_"+i+"_PORT_6379_TCP_ADDR"],
                        port : process.env["REDIS_"+i+"_PORT_6379_TCP_PORT"]
                    };
                    hosts.push(obj);       
                    i++;
                }
            }

            //console.log("Redis Connection String");
            //
            //console.log(hosts);
            
            var Redis = require('ioredis');
            
            if(isCluster){
                global.redisClient = new Redis.Cluster(hosts);
            }else{
                global.redisClient = new Redis(hosts[0]);
            }
            //Configure Session,Passport,bodyparse after redisClient
            sessionConfiguration();            

        }catch(e){
           console.log("Error connecting to Redis : ");
           console.log(e);
        }
    }


    function setUpMongoDB(passport){
       //MongoDB connections. 
       var mongoConnectionString = "mongodb://";
       
       var isReplicaSet = false;
       
       if(global.config.mongo.length>0){
           //take from config file
           
            if(global.config.mongo.length>1){
               isReplicaSet = true;
            }
           
            for(var i=0;i<global.config.mongo.length;i++){
                mongoConnectionString+=global.config.mongo[i].host +":"+global.config.mongo[i].port;
                mongoConnectionString+=",";
            }
       }else{
            var i=1;
            while(process.env["DOCKER_MONGO_"+i+"_PORT_27017_TCP_ADDR"] && process.env["MONGO_"+i+"_PORT_27017_TCP_PORT"]){
                if(i>1){
                    isReplicaSet = true;
                }
                mongoConnectionString+=process.env["DOCKER_MONGO_"+i+"_PORT_27017_TCP_ADDR"]+":"+process.env["MONGO_"+i+"_PORT_27017_TCP_PORT"]; 
                mongoConnectionString+=",";
                i++;
            }
       }

      
       mongoConnectionString = mongoConnectionString.substring(0, mongoConnectionString.length - 1);
       mongoConnectionString += "/"; //de limitter. 
       
       global.keys.db = mongoConnectionString+global.keys.globalDb;

        if(isReplicaSet){
          global.db+="?replicaSet=cloudboost&slaveOk=true";
        }

        global.keys.mongoConnectionString = global.keys.db; 
        console.log("Mongo DB : "+global.keys.db);       
        global.mongoose = require('./config/db.js')();      

        //Models
        var Project = require('./model/project.js')();
        var Subscriber = require('./model/subscriber.js')();
        var User = require('./model/user.js')();    
        var ProjectDetails = require('./model/projectDetails.js')();
        var StripeCustomer = require('./model/stripeCustomer.js')();
        var CreditCardInfo = require('./model/creditCardInfo.js')();
        var Invoice = require('./model/invoice.js')();
        var InvoiceSettings = require('./model/invoiceSettings.js')();
        var Beacon = require('./model/beacon.js')();
        var Tutorial = require('./model/tutorial.js')();
        var CbServer = require('./model/cbserver.js')();
        var Notification = require('./model/notification.js')();

        //Services
        global.beaconService  = require('./services/beaconService.js')(Beacon);        
        global.userService = require('./services/userService')(User);
        global.subscriberService  = require('./services/subscriberService.js')(Subscriber);
        global.invoiceService  = require('./services/invoiceService.js')(Invoice,InvoiceSettings);
        global.projectService  = require('./services/projectService.js')(Project);    
        global.projectDetailsService  = require('./services/projectDetailsService.js')(ProjectDetails);
        global.paymentService  = require('./services/paymentService.js')(StripeCustomer,CreditCardInfo); 
        global.tutorialService  = require('./services/tutorialService.js')(Tutorial);
        global.fileService  = require('./services/fileService.js')();
        global.mailChimpService  = require('./services/mailChimpService.js')();
        global.mandrillService  = require('./services/mandrillService.js')();
        global.notificationService  = require('./services/notificationService.js')(Notification);
        global.cbServerService = require('./services/cbServerService.js')(CbServer);

        //Routes(API)
        global.app.use('/', require('./routes/auth')(passport));
        global.app.use('/', require('./routes/subscriber.js')());
        global.app.use('/', require('./routes/project.js')());    
        global.app.use('/', require('./routes/projectDetails.js')());
        global.app.use('/', require('./routes/payment.js')());
        global.app.use('/', require('./routes/invoice.js')());
        global.app.use('/', require('./routes/beacon.js')());
        global.app.use('/', require('./routes/tutorial.js')());
        global.app.use('/', require('./routes/file.js')());
        global.app.use('/', require('./routes/cloudboost.js')());
        global.app.use('/', require('./routes/notification.js')());

        console.log("Models,Services,Routes Status : OK.");
        
        require('./framework/config')(passport, User);        
        require('./config/mongoConnect')().connect().then(function(db){
            global.mongoClient = db;
            //init encryption Key. 
            initSecureKey();
            initClusterKey();
        }, function(error){
            //error
            console.log("Error  : MongoDB failed to connect.");
            console.log(error);
        });
    }

    function sessionConfiguration(){
        global.app.use(cookieParser());
        global.app.use(bodyParser.json());
        global.app.use(bodyParser.urlencoded({extended:true}));
        global.app.use(session({        
            key: 'session',
            resave: false, //does not forces session to be saved even when unmodified
            saveUninitialized: false, //doesnt forces a session that is "uninitialized"(new but unmodified) to be saved to the store
            secret: 'azuresample',       
            store: new RedisStore({
                client: global.redisClient,
                ttl   : 30 * 24 * 60 * 60 // 30 * 24 * 60 * 60 = 30 days.
            }),
            cookie:{maxAge: (2600000000)}// 2600000000 is for 1 month
        }));

        global.app.use(passport.initialize());
        global.app.use(passport.session());
    }
 
}

function initSecureKey(){
    require('./config/keyService.js')().initSecureKey();
}

function initClusterKey(){
    require('./config/keyService.js')().initClusterKey();
}