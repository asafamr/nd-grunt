(function(){
  'use strict';
  var express = require('express');
  var app=express();
  var _template = require('lodash.template');
  var fs = require('fs');

  var args=JSON.parse(new Buffer(process.argv[2], 'base64').toString('ascii'));


  var compiledTemplate=null;
  fs.readFile( __dirname + '/index.html', function (err, data) {
    if (err) {
      throw err;
    }
    var template=data.toString();
    compiledTemplate = _template(template);

  });

  app.get('/', function (req, res) {
    res.send(compiledTemplate(getAllParams()));
});


  function getAllParams()
  {
    return {frontendLink:'#',backendLink:'http://localhost:'+args['node-inspector-port'],
    restartLink:'javascript:restart();',args:args};
  }

  var server = app.listen(args['console-port'], function () {
    var host = server.address().address;
    var port = server.address().port;

    console.log('Console app listening at http://%s:%s', host, port);
  });


})();
