/* global $:true*/
var ndjs={};
(function(){
  'use strict';
  ndjs.uiAction=ndjsUiAction;
  ndjs.isLoaded=isLoaded;
function ndjsUiAction(actionName,actionParams)
{
  return $.ajax( {type:'POST',cache:false,url:'/api/uiaction/'+actionName,data:actionParams });
}
function isLoaded()
{
  return $.ajax( {url:'/api/isLoaded' });
}

})();
