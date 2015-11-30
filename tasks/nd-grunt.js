(function(){
'use strict';


var Promise = require('bluebird');
var treeKill=require('tree-kill');
var fs = require('fs-extra');
var path = require('path');
var childProcess =require('child_process');
var open =require('open');
var _ =require('lodash');

var copyPrmosified=Promise.promisify(fs.copy);
var emptyDirPromisified=Promise.promisify(fs.emptyDir);

var childProcesses=[];


function escapeShell(cmd) {
	cmd=''+cmd;
  return '"'+cmd.replace(/(["'$`\\])/g,'\\$1')+'"';
}
function runAsync(grunt,cmd,args,name,cwd)
{
	var fullCmd=[cmd].concat(_.map(args,escapeShell)).join(' ');
	return new Promise(function (resolve, reject) {
		void reject ;
		var me={pid:null,finished:false,name:name};
		grunt.log.debug(name+' running '+fullCmd );
		var proc = childProcess.exec(fullCmd,{cwd:cwd, env: process.env});

		proc.stdout.on('data', function (data) {
			grunt.log.debug('running '+name+' stdout: ' + data);
		});

		proc.stderr.on('data', function (data) {
			grunt.log.debug(name+' stderr: ' + data);

		});
		proc.on('close', function (code) {
			grunt.log.debug(name+' child process exited with code ' + code);
			me.finished=true;
			resolve();
		});
		me.pid=proc.pid;
		childProcesses.push(me);


	});
}




function getMetadataParams(config)
{
	var ret=[];
	addToRetIfDefined('--description',config.description);
	addToRetIfDefined('--productname',config.productname);
	addToRetIfDefined('--company',config.company);
	addToRetIfDefined('--comments',config.comments);
	addToRetIfDefined('--copyright',config.copyright);
	addToRetIfDefined('--trademarks',config.trademarks);
	addToRetIfDefined('--internalname',config.internalname);
	addToRetIfDefined('--originalname',config.originalname);
	addToRetIfDefined('--version',config.version);
	if(config.icon)
	{
		ret.push('--icon');
		ret.push(path.resolve(config.etc,config.icon));
	}
	return ret;
	function addToRetIfDefined(argName,configValue)
	{
		if(configValue)
		{
			ret.push(argName);
			ret.push(configValue);
		}
	}
}
function getNwjsPackageContent(config)
{
	var NOT_REQUIRED_TOKEN={};
	var content=
	{
		'name': 'NDJS installer',
		'description': 'NDJS installer',
		'version': '1.0',
		'main': 'index.html',
		'node-main': 'index.js',
		'window': {
			'frame': false,
			'toolbar': false,
			'width': 720,
			'height': 440,
			'icon': NOT_REQUIRED_TOKEN,
			'show': false,
			'title': NOT_REQUIRED_TOKEN,
			'fullscreen':false
		}
	};

	_.merge(content,config,function(a,b){if(a){return b;}return NOT_REQUIRED_TOKEN;});
	content=_.omit(content,function(x){return x===NOT_REQUIRED_TOKEN;});
	content.window=_.omit(content.window,function(x){return x===NOT_REQUIRED_TOKEN;});
	return JSON.stringify(content,null,2);
}




	module.exports = function (grunt) {

		grunt.registerTask('nd_compile', 'ndjs compile grunt task', function () {
			var done = this.async();
			var options=this.options();
			var nwjsPath=path.dirname(require('nw').findpath());
			var buildDir=path.resolve(options.buildDir || 'build');
			var packedDir=path.join(buildDir,'packed');
			var nwPackagePath=path.join(packedDir,'package.nw');
			var compilerPath=path.normalize(__dirname+'/../packer/packer.exe' );
			var distOutPath=path.join(buildDir,options.outFile || 'out.exe');
			var outgoingPath=path.resolve(options.ndoptions.outgoing || 'outgoing');
			var ndDescPath=path.join(buildDir,'ndjs.desc');
			var metdataParams=getMetadataParams(options.ndoptions);

			emptyDirPromisified(buildDir).then(function(){
				grunt.log.debug('creating build directories...');
				return emptyDirPromisified(packedDir);
			}).then(function(){
				return emptyDirPromisified(nwPackagePath);
			}).then(function(){
				return copyPrmosified(nwjsPath,packedDir);
			}).then(function(){
				grunt.log.debug('copying frontend...');
				return copyPrmosified(path.resolve(options.ndoptions.frontend||'front'),nwPackagePath,{ filter:/^((?!node_modules).)*$/ ,dereference: true });
			}).then(function(){
				grunt.log.debug('copying backend modules...');
				return copyPrmosified(path.resolve(options.ndoptions.backend||'back'),path.join(nwPackagePath,'ndjs_modules'));
			}).then(function(){
				grunt.log.debug('copying node_modules...');
				return copyPrmosified(path.resolve('node_modules'),path.join(nwPackagePath,'node_modules'),{filter:/^((?!nd-grunt).)*$/ ,dereference: true });
			}).then(function(){
				grunt.log.debug('copying package.json...');
				return copyPrmosified(path.resolve('package.json'),path.join(nwPackagePath,'package.json'));
			}).then(function(){
				grunt.log.debug('pruning dev node modules...');
				return runAsync(grunt,'npm',['prune','-production'],'npm-prune-task',nwPackagePath);
			}).then(function(){
				grunt.log.debug('deduping node modules...');
				return runAsync(grunt,'npm',['dedupe'],'npm-dedupe-task',nwPackagePath);
			}).then(function(){
				grunt.log.debug('nwjs package.json...');
				return Promise.promisify(fs.writeFile)(path.join(nwPackagePath,'package.json'),getNwjsPackageContent(options.ndoptions));
			}).then(function(){
				grunt.log.debug('copying config files...');
				return copyPrmosified(path.normalize(__dirname+'/../bootstrap/full-compile'),nwPackagePath);
			}).then(function(){
				grunt.log.debug('copying ndfile...');
				return copyPrmosified('ndfile.js',path.join(nwPackagePath,'ndfile.js'));
			}).then(function(){
				grunt.log.debug('writing ndjs run description...');
				return Promise.promisify(fs.writeFile)(ndDescPath,'{"run":"nw.exe"}');
			}).then(function(){
				grunt.log.debug('compiling...');
				return runAsync(grunt,compilerPath,['--out',distOutPath,
			'--block1',packedDir,'--block2',outgoingPath,'--nd-desc',ndDescPath,'--verbose'].concat(metdataParams),'compiler');}).then(done);

			/*
				.then(function(){return compile(grunt,compilerPath,['--out',options.target,
				'--in',buildDir,'--exe','nw.exe','--verbose']);})
				//.then(function(){emptyDirWithRetry(grunt,tmpPath,3,300,cleanupCallback);})
				.then(done);

			});*/



		});

		//loads from local node_modules
		//var cwd = process.cwd();
	  //process.chdir(__dirname+ '/..');
	  //grunt.loadNpmTasks('grunt-node-inspector');
	//  process.chdir(cwd);



		grunt.registerTask('nd_debug','debug as nodejs server', function()
		{
			process.env.BLUEBIRD_LONG_STACK_TRACES =1;
			var done = this.async();
			var options=this.options();


			var path=require('path');
			var consolePath=path.normalize(__dirname+'/../bootstrap/node-debug/console.js');
			var args=options;
			args.basePath=process.cwd();
			grunt.log.debug('NDJS Debug params:'+JSON.stringify(args));
			var base64Args= (new Buffer(JSON.stringify(args))).toString('base64');

			function killChildProc() {
				childProcesses.forEach(function(child) {
					try {
						if(!child.finished)
						{
							grunt.log.debug('killing sub process '+child.name);
							child.finished=true;
							treeKill(child.pid);
						}
					} catch (e) {
						grunt.log.debug('could not kill child process '+e);
					} finally {

					}

			  });
			}
			process.on('SIGINT', process.exit); // catch ctrl-c
			process.on('SIGTERM', process.exit); // catch kill
			process.once('exit', killChildProc);

			runAsync(grunt,'node',[consolePath,base64Args],'console').then(function(succ)
				{
					void succ;
					killChildProc();
					setTimeout(done,1000);
					//done();
				}
			);

			var nodeInspectorModulePath=require.resolve('node-inspector');

			var nodeDebugPath=path.dirname(nodeInspectorModulePath)+'/bin/node-debug.js';
			var backendPath=path.normalize(__dirname+'/../bootstrap/node-debug/backend.js');
			var nodeDebugArgs=['--cli'/* =dont open browser*/,'--debug-port',args['debugger-port'],
											'--web-port',args['node-inspector-port'],'--preload','false','--debug-brk=0',
											'--stack-trace-limit=100',
											//'--hidden','bower'
										'--save-live-edit',true];

			runAsync(grunt,'node',[nodeDebugPath].concat(nodeDebugArgs).concat([backendPath,base64Args]),'inspector').then(function(succ)
				{
					void succ;
					killChildProc();
					setTimeout(done,1000);
					//done();
				}
			);


			setTimeout(function(){

				open('http://localhost:'+options['console-port']);
			},500);


		});

	};
})();
