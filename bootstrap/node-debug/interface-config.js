/* global $:true*/
var ndjs={};
(function(){
  'use strict';

  if(typeof(Storage) === 'undefined') {
    window.alert('ERROR:debugging requires an HTML5 supporting browser');
}

  ndjs.hasFinishedLoading=hasFinishedLoading;
  ndjs.getUiActions=getUiActions;
  ndjs.callUiAction=callUiAction;
  ndjs.getLogger=getLogger;
  ndjs.setPersistent=setPersistent;
  ndjs.getPersistent=getPersistent;

function getPersistent(key)
{
  var current=localStorage['ndjs.'+key];
  if(!current){return null;}
  return JSON.parse(current);
}
function setPersistent(key,value)
{
  localStorage['ndjs.'+key]=JSON.stringify(value);
}
function callUiAction(actionName,actionParams)
{
  if(!actionParams){actionParams=[];}
  actionParams=$.map(actionParams, function(value){return value;});//weird bug in chrome got actionParams as object...
  var almostPromise= $.ajax( {type:'POST',
                  cache:false,
                  url:'/api/uiaction/'+actionName,
                  contentType: 'application/json',
                  dataType:'text json',
                  data:JSON.stringify(actionParams) });
  almostPromise.catch=almostPromise.fail;
  return almostPromise;
}
function getUiActions()
{
  var almostPromise= $.ajax( {type:'GET',cache:false,url:'/api/getUIactions'});
  almostPromise.catch=almostPromise.fail;
  return almostPromise;
}
function hasFinishedLoading()
{
  var almostPromise= $.ajax( {url:'/api/hasFinishedLoading' });
  almostPromise.catch=almostPromise.fail;
  return almostPromise;
}
function log(level,msg)
{
  console.log(level+': '+msg);
  //return $.ajax( {url:'/api/log',data:{level:level,msg:msg} });
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
