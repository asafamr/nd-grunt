/* globals  Promise:true*/
var ndjs=process.mainModule.exports.ndjs;
(function(){
  'use strict';
  if(!ndjs.backendInstance)
  {
    ndjs.persistent={};
    ndjs.backendInstance=require('nd-node').create(require('path').resolve('ndfile.js'));
    ndjs.backendInstance.registerModulesDir('ndjs_modules');
    ndjs.backendInstance.startLoad();
  }

  ndjs.hasFinishedLoading=hasFinishedLoading;
  ndjs.getUiActions=getUiActions;
  ndjs.callUiAction=callUiAction;
  ndjs.getLogger=getLogger;
  ndjs.setPersistent=setPersistent;
  ndjs.getPersistent=getPersistent;

function getPersistent(key)
{
  var current=ndjs.persistent['ndjs.'+key];
  if(!current){return null;}
  return JSON.parse(localStorage['ndjs.'+key]);
}
function setPersistent(key,value)
{
  ndjs.persistent['ndjs.'+key]=JSON.stringify(value);
}
function callUiAction(actionName,actionParams)
{
  if(!actionParams){actionParams=[];}
  return ndjs.backendInstance.getModule('$uiActions').callAction(actionName,actionParams);
}
function getUiActions()
{
  //we guarenteed to run on realtivly new webkit - native Promise availble
  return Promise.resolve(ndjs.backendInstance.getModule('$uiActions').getRegisteredActions());
}
function hasFinishedLoading()
{
  return Promise.resolve(ndjs.backendInstance.hasFinishedLoading());
}
function log(level,msg)
{
  console.log(level+': '+msg);
}
function getLogger()
{
  return {
    debug:function(msg){log('debug',msg);},
    warn:function(msg){log('warn',msg);},
    info:function(msg){log('info',msg);},
    error:function(msg){log('error',msg);}
  };
}

})();
