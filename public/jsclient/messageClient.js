//线下测试环境
var socket = io('http://192.168.1.128:3000').connect();
//线上真实环境
//var socket = io('http://115.29.235.9:3000').connect();

//监测函数初始化
function NewGuyEnter(data){console.log(data)};
function leavingRoom(data){console.log(data)};
function socketGetError(data){console.log(data)};
function getMessage(data){console.log(data)};
//回调函数初始化
function firstTimeEnter(data){console.log(data)};
function callback(data1){console.log(data1)};
//触发函数
function sendMessage (message,callback) {
	socket.emit('send message',message,callback);
}

function socketDiscon(){console.log("链接断开")};
function socketRecon(){console.log("正在重连")}

$(function(){
	//获取get参数数组
	var $_GET = (function(){
		var urlArray = window.document.location.href.toString().split("?");
		if(typeof(urlArray[1])==="string" ){
			var paramsArray = urlArray[1].split("&");
			var get={};
			for(var i in paramsArray){
				if(typeof(paramsArray[i])=="string"){
					var j = paramsArray[i].split("=");
					get[j[0]] = j[1];
				}
			}
			return get;
		}else{
			return {};
		}
	})();
	
	//进入房间
	socket.on("connect",function(data){
		socket.emit("enter room",$.parseJSON($("#info").text()),function(data){
			firstTimeEnter(data);
		});
	});
	//进房间拉信息
	socket.on("get message",function (data){
		getMessage(data);
	});
	
	//收到新信息
	socket.on("new message",function(data){
		newMessage(data);
	});
	
	//当有新成员加入房间
	socket.on('add new member',function(data){
		NewGuyEnter(data)
	});
	
	//有成员离开房间
	socket.on("leave room",function(data){
		leavingRoom(data)
	});
	
	//监听返回的错误信息
	socket.on("errorinfo",function(data){
		socketGetError(data);
		socket.disconnect();
	});
	
	socket.on("disconnect",function(data){
		socketDiscon();
	});
	
	socket.on("reconnecting",function(data){
		socketRecon();
	});
});
//可能需要用到的代码
//event.preventDefault() 取消事件的默认动作