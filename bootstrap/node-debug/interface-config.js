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
  return JSON.parse(localStorage['ndjs.'+key]);
}
function setPersistent(key,value)
{
  localStorage['ndjs.'+key]=JSON.stringify(value);
}
function callUiAction(actionName,actionParams)
{
  if(!actionParams){actionParams=[];}
  actionParams=$.map(actionParams, function(value){return value;});//weird bug in chrome got actionParams as object...
  return $.ajax( {type:'POST',cache:false,url:'/api/uiaction/'+actionName,contentType: 'application/json',data:JSON.stringify(actionParams) });
}
function getUiActions()
{
  return $.ajax( {type:'GET',cache:false,url:'/api/getUIactions'});
}
function hasFinishedLoading()
{
  return $.ajax( {url:'/api/hasFinishedLoading' });
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
    error:function(msg){log('error',msg);}
  };
}

})();
