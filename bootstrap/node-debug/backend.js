(function(){
  'use strict';
  var args=JSON.parse(new Buffer(process.argv[2], 'base64').toString('ascii'));
  function RestartBackend()
  {
    backendReq=require(args.basePath+'/node_modules/nd-node').create(path.normalize(__dirname+'/backend-config.js'));
    backendReq.startLoad();
  }
  function RunUiAction(actionName,actionParam)
  {
    if(backendReq===null)
    {
      RestartBackend();
    }
    backendReq.callUiAction(actionName,actionParam);
  }

  try {


  var fs = require('fs');
  var path = require('path');
  var express = require('express');
  var app=express();




  var backendConfig=fs.readFileSync(path.normalize(__dirname+'/backend-config.js'));

  var backendReq=null;
  //RestartBackend();
  app.get('/api/restart', function (req, res) {
    debugger;
    RestartBackend();
    res.send('OK');
});

app.post('/api/uiaction/:uiaction', function (req, res) {
  RunUiAction(req.param('uiaction'));
  res.send('OK');
});

app.get('/config.js', function (req, res) {
  res.send(backendConfig);
});




  var server = app.listen(args['backend-port'], function () {
    var host = server.address().address;
    var port = server.address().port;

    console.log('NDJS backend listening at http://%s:%s', host, port);
  });

} catch (e) {
  console.log('Backend error: '+e +e.stack);
}


})();
