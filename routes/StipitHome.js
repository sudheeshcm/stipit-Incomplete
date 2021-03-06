// Provides endpoints for Stip_iT home page
module.exports = function(){
  var express = require('express');
  var app = express();
  var router = express.Router();
  // var http = require('http');
  var fs = require('fs');
  var AdmZip = require('adm-zip');
  var moment = require('moment');
  var csv = require("fast-csv");
  var Stock = require('../models/stocks');
  var fsthen = require('fs-then');

  var downloadDate, month, year;
  var rowCount = 0;

  app.set('view engine', 'ejs');

  // Populates the Current User
  app.get('/CurrentUser', function(req, res) {
      if(req.user){
       var user = req.user;
       console.log("User logged in, ID:" +user._id+", Username: "+ user.username+" , Date: "+Date.now());
       res.json(user); 
      }
  });

var getDownloadDates = function(){
    var downloadDay = moment().subtract(1, 'days').format('dddd');
    console.log("Download Day: ",downloadDay);
    if (downloadDay == "Sunday") {
        downloadDate = moment().subtract(3, 'days').format('DDMMMMYYYY');
        month = moment().subtract(3, 'days').format('MMMM');
        year = moment().subtract(3, 'days').format('YYYY');
    }
    else if (downloadDay == "Saturday") {
        downloadDate = moment().subtract(2, 'days').format('DDMMMMYYYY');
        month = moment().subtract(2, 'days').format('MMMM');
        year = moment().subtract(2, 'days').format('YYYY');
    }
    else{
        downloadDate = moment().subtract(1, 'days').format('DDMMMMYYYY');
        month = moment().subtract(1, 'days').format('MMMM');
        year = moment().subtract(1, 'days').format('YYYY');
    }
    month = month.toUpperCase();
    downloadDate = downloadDate.toUpperCase();
    console.log("Download date: ",downloadDate);
}

var readCSVFile = function(downloadDate)
{
      console.log("Reading NSE India Stock CSV..");
      var lineList = fs.readFileSync('./public/downloads/cm'+downloadDate+'bhav.csv').toString().split('\n');
      lineList.shift(); // Shift the headings off the list of records.
      var schemaKeyList = ['SYMBOL','SERIES','OPEN','HIGH','LOW','CLOSE','LAST','PREVCLOSE','TOTTRDQTY','TOTTRDVAL','TIMESTAMP','TOTALTRADES','ISIN'];
      console.log("Number of rows: ", lineList.length);
      rowCount = lineList.length;
      // Recursively go through list adding documents.
      function createDocRecurse (err) {
          if (err) {
              console.log("create Doc Recurse Error: ",err);
              status = "failure";
              //process.exit(1);
              return false;
          }
          if (lineList.length) {
              var line = lineList.shift();
              var doc = new Stock();
              line.split(',').forEach(function (entry, i) {
                  doc[schemaKeyList[i]] = entry;
              });
              doc.save(createDocRecurse);
          } else {
              // After the last entry,
              console.log(rowCount + " entries pushed to stipit.stocks DB.");
              return true;
          }
      }

      createDocRecurse(null);
}

var zip, zipEntries;

app.get('/fetchStockDetails', function(req, res) {
    var status;
    var unzipAll = function(){
                req.on('end', function() {
                        console.log("Trying to unzip.");
                    try {   
                        zip = new AdmZip("./public/downloads/nsebhav.zip");
                        zipEntries = zip.getEntries();
                        zip.extractAllTo(/*target path*/"./public/downloads/", /*overwrite*/true);
                        status = true;
                    } catch ( err ) { 
                                console.log( 'Caught exception: ', err );
                                status =  false;
                    }      
                });
       // }, function(){        
                if (status == false) {
                  console.log("False");
                  //return false;
                }
                else if (status == true){
                  console.log("True"); 
                  //return true;
                }     
                else{
                  console.log("Invalid"); 
                  //return false;
                }
        }//);

    console.log("FetchStockDetails called");
            getDownloadDates();
            var request = require('request'),
            out = fs.createWriteStream('./public/downloads/nsebhav.zip'); // For saving NSE Equity bhavcopy
     
            // Downloading NSE Bhavcopy
            // Sample URL: http://www.nseindia.com/content/historical/EQUITIES/2015/MAY/cm22MAY2015bhav.csv.zip
            var req = request(
                {
                    method: 'GET',
                    uri: 'http://www.nseindia.com/content/historical/EQUITIES/'+year+'/'+month+'/cm'+downloadDate+'bhav.csv.zip',
                    headers: { "User-Agent": "Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.11 (KHTML, like Gecko) Chrome/23.0.1271.97 Safari/537.11",
                        "Referer": "http://www.nseindia.com/products/content/all_daily_reports.htm",
                        "Accept-Encoding": "gzip,deflate,sdch",
                        "encoding": "null",
                        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*;q=0.8",
                        "Cookie": "cookie"
                    }
                }
            );
            req.pipe(out);
            var isSuccess = unzipAll();
                if (isSuccess == false) {
                    res.json({"status": "failure", "Download Date": downloadDate});
                }
                else if (isSuccess == true){
                    res.json({"status": "success", "Download Date": downloadDate});
                }  
            
});

app.get('/populateStockDetails', function(req, res) {

    console.log("populateStockDetails called");    
    var isSuccess = false;
    getDownloadDates();
    var isSuccess = readCSVFile(downloadDate);
          if(isSuccess == false){
                console.log('Error while parsing the CSV file. ', err);
                res.json({"status": "failure", "Download Date": downloadDate, "Rows processed": rowCount});
          }
          else{
                  console.log('CSV file parsed. Data: '); 
                  res.json({"status": "success", "Download Date": downloadDate, "Rows processed": rowCount});  
          }
});
return app;
}();
