(function(){
  'use strict';
  var http = require('http');
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
  var backProc=null;
  function RestartBack()
  {

  }
  function getAllParams()
  {
    return {inspectorlink:'#',args:args};
  }
  http.createServer(function(request, response) {
    response.writeHead(200, {'Content-Type': 'text/html'});
    var allParams=getAllParams();
    response.write(compiledTemplate(allParams));
    response.end();
  }).listen(args['console-port']);
})();
