(function(){
'use strict';


var Promise = require('bluebird');
var archiver=require('archiver');
var treeKill=require('tree-kill');
var fs = require('fs-extra');
var path = require('path');
var childProcess =require('child_process');
var open =require('open');

var copyPrmosified=Promise.promisify(fs.copy);
var emptyDirPromisified=Promise.promisify(fs.emptyDir);

var childProcesses=[];



function runAsync(grunt,cmd,name,cwd)
{
	return new Promise(function (resolve, reject) {
		void reject ;
		var me={pid:null,finished:false,name:name};
		grunt.log.debug(name+' running '+cmd );
		var proc = childProcess.exec(cmd,{cwd:cwd, env: process.env});

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
function copyFileThenRun(grunt,filePath,toPath,cmd)
{
	grunt.log.debug('copying ' + filePath +' '+toPath);
	return copyPrmosified(filePath,toPath+'/'+path.basename(filePath)).then(function(){
		return runAsync(grunt,cmd,'copy',toPath);
	});
}

function zipDir(grunt,dir,destPath)
{
	function removePrefixDir(file,basedir)
	{
		return file.substr(basedir.length+1).replace('\\','/');
	}

	return new Promise(function(resolve,reject){
		var output = fs.createWriteStream(destPath);
		var archive = archiver('zip');

		output.on('close', function() {
			grunt.log.debug('Zip closed, ' + archive.pointer() + ' total bytes written');
			resolve();
		});

		archive.on('error', function(err) {
			reject(err);
		});

		archive.pipe(output);

		grunt.file.expand(dir+'/**/*.*').forEach(function(file) {
			grunt.log.debug('compressing '+file);
			if(grunt.file.isFile(file))
			{
				archive.append(fs.createReadStream(file), { name: removePrefixDir(file,dir) });
			}
		});
		archive.finalize();

	});
}

function doRegexReplaceOnfile(grunt,filePath,regex,replace)
{
	return new Promise(function(resolve,reject){
		fs.readFile(filePath, 'utf8', function (err,data) {
			if (err) {
				reject(err);
				return;
			}
			var result = data.replace(regex,replace);// /"..\/bower_components/g, '"bower_components');

			fs.writeFile(filePath, result, 'utf8', function (errWrite) {
				if (errWrite)
				{
					reject(errWrite);
					return;
				}
				resolve();
			});
		});
	});
}

function createNWPackage(grunt,appDir,tempDir,toZip)
{
	return emptyDirPromisified(tempDir)
	.then(function(){
		//copy production node_modules
		grunt.log.debug('copying production node_modules');
		var packageJsonPath=process.cwd()+'/package.json';
		return copyFileThenRun(grunt,packageJsonPath,tempDir,'npm install --production');
	})
	.then(function(){
		//copy production bower_components
		grunt.log.debug('copying production bower_components');
		var packageJsonPath=process.cwd()+'/bower.json';
		return copyFileThenRun(grunt,packageJsonPath,tempDir,'bower install --production --force-latest');
	})
	.then (function(){
		//copy main app
		grunt.log.debug('copying from '+appDir +' to '+tempDir);
		return copyPrmosified(appDir,tempDir);})
		.then(function()
		{return doRegexReplaceOnfile(grunt,tempDir+'/index.html',/"..\/bower_components/g,'"bower_components');
	})
	.then(function()
	{return doRegexReplaceOnfile(grunt,tempDir+'/index.html',/"..\/duck_client_modules/g,'"duck_client_modules');
})
.then (function(){
	return zipDir(grunt,tempDir,toZip);
});
}

function createBuildDir(grunt,nwPackage,buildDir,nwjsDir)
{

	grunt.log.debug('Ensuring empty build dir...');
	return  emptyDirPromisified(buildDir)
	.then(function (){
		grunt.log.debug('Copying nwjs to build dir...');
		return copyPrmosified(nwjsDir,buildDir);	})
		.then(function (){
			grunt.log.debug('Copying package to build dir...');
			return copyPrmosified(nwPackage,buildDir+'/package.nw');	}
		)
		;
	}
	var compile=function(grunt,compilerPath,args)
	{
		return new Promise(function (resolve, reject) {
			void(reject);//remove jshint unused param warning
			var comp=childProcess.spawn(compilerPath,args);
			comp.stdout.on('data', function (data) {
				grunt.log.debug('stdout: ' + data);
			});

			comp.stderr.on('data', function (data) {
				grunt.log.error('stderr: ' + data);
			});

			comp.on('close', function (code) {
				grunt.log.debug('child process exited with code ' + code);
				resolve();
			});

		});
	};

	module.exports = function (grunt) {

		grunt.registerTask('nd_pack', 'duck packer grunt task', function () {
			var done = this.async();
			var tmp = require('tmp');
			var options=this.options();

			var nwjsPath=path.normalize(__dirname + '/../nwjs');
			var compilerPath=path.normalize(__dirname+'/../compiler/packer.exe' );


			tmp.dir({unsafeCleanup:true,keep:true},function(err, tmpPath, cleanupCallback)
			{
				void cleanupCallback;
				if (err)
				{
					throw err;
				}
				//tmpPath=options.buildDir;
				//we have a temp directory
				var packZip=path.normalize(tmpPath + '/package.zip');
				var buildappDir=path.normalize(tmpPath + '/buildApp');
				var buildDir=path.normalize(tmpPath + '/build');

				createNWPackage(grunt,options.app,buildappDir,packZip)
				.then(function(){return createBuildDir(grunt,packZip,buildDir,nwjsPath);})
				.then(function(){return Promise.promisify(fs.ensureFile)(options.target);})
				.then(function(){return compile(grunt,compilerPath,['--out',options.target,
				'--in',buildDir,'--exe','nw.exe','--verbose']);})
				//.then(function(){emptyDirWithRetry(grunt,tmpPath,3,300,cleanupCallback);})
				.then(done);

			});



		});

		//loads from local node_modules
		//var cwd = process.cwd();
	  //process.chdir(__dirname+ '/..');
	  //grunt.loadNpmTasks('grunt-node-inspector');
	//  process.chdir(cwd);



		grunt.registerTask('nd_debug','debug as nodejs server', function()
		{
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

			runAsync(grunt,'node '+consolePath + ' '+base64Args,'console').then(function(succ)
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
										'--save-live-edit',true].join(' ');

			runAsync(grunt,['node',nodeDebugPath,nodeDebugArgs,backendPath,base64Args].join(' '),'inspector').then(function(succ)
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
