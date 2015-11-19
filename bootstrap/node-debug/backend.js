(function(){
  'use strict';
  var args=JSON.parse(new Buffer(process.argv[2], 'base64').toString('ascii'));

  var backendInstance=null;
  function RestartBackend()
  {
    backendInstance=require(args.basePath+'/node_modules/nd-node').create(path.normalize(args.basePath+'/ndfile.js'));
    backendInstance.startLoad();
  }
  function CallUiAction(actionName,actionParam)
  {
    //wait for load?
    return backendInstance.getModule('$uiActions').callAction(actionName,actionParam);
  }

  try {


  var fs = require('fs');
  var path = require('path');
  var express = require('express');
  var app=express();




  var interfaceConfig=fs.readFileSync(path.normalize(__dirname+'/interface-config.js'));

  //RestartBackend();
  app.get('/api/restart', function (req, res) {
    RestartBackend();
    res.send('OK');
});

var frontapp=express();
frontapp.use(require('body-parser').json());

frontapp.get('/config.js',
function (req, res) {
  res.send(interfaceConfig);
});


frontapp.post('/api/uiaction/:uiaction', function (req, res) {
  if(backendInstance===null || !backendInstance.hasFinishedLoading())
  {
    return res.status(500).send('failed');
  }

  CallUiAction(req.params.uiaction,req.body).then(function(ret){
     res.json(ret);
  }).catch(function(err){
    res.status(500).send(err);
  });

});

frontapp.get('/api/getUIActions', function (req, res) {
  if(backendInstance===null || !backendInstance.hasFinishedLoading())
  {
    return res.status(500).send('failed');
  }
  else {
    res.json(backendInstance.getModule('$uiActions').getRegisteredActions());
  }
});

frontapp.get('/api/hasFinishedLoading', function (req, res) {
  if(backendInstance===null )
  {
    return res.json(false);
    //return res.status(500).send('failed');
  }
  res.json(backendInstance.hasFinishedLoading());
});


frontapp.use(express.static(path.normalize(args['basePath']+'/'+args.ndoptions['frontend'])));
var fronserver=frontapp.listen(args['frontend-port'],function () {
  var host = fronserver.address().address;
  var port = fronserver.address().port;

  console.log('NDJS frontend listening at http://%s:%s', host, port);
});

  var backserver = app.listen(args['backend-port'], function () {
    var host = backserver.address().address;
    var port = backserver.address().port;

    console.log('NDJS backend listening at http://%s:%s', host, port);
  });

} catch (e) {
  console.log('Backend error: '+e +e.stack);
}


})();
