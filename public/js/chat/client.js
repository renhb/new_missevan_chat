
var socket;

$(function(){
	socket = io(chatSocketUrl + '/chatRoom').connect();

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

	var userinfo = $.parseJSON($("#info").text());
	//Object.freeze(userinfo);
	if (userinfo && userinfo.userId) {
		initImageUpload();
	}

	//进入房间
	socket.on("connect", function (data) {
		socket.emit("enter room", userinfo, function(data) {
			firstTimeEnter(data);
		});
	});

	//进房间拉信息
	socket.on("get message", function (data) {
		getMessage(data);
	});

	//收到新信息
	socket.on("new message", function (data) {
		newMessage(data);
	});

	//当有新成员加入房间
	socket.on('add new member', function (data) {
		NewGuyEnter(data)
	});

	//有成员离开房间
	socket.on("leave room", function (data) {
		leavingRoom(data)
	});

	//监听返回的错误信息
	socket.on("errorinfo", function (data) {
		socketGetError(data);
		socket.disconnect();
	});

	socket.on("disconnect", function (data) {
		socketDiscon();
	});

	socket.on("reconnecting",function (data) {
		socketRecon();
	});
});
//可能需要用到的代码
//event.preventDefault() 取消事件的默认动作

var initImageUpload = function (userId, el) {
	var type = userId ? 8 : 7;
	var dz = el ? $(el) : $('#chattop');

	$('#imagefile input', el).fileupload({
		url: 'http://backend1.missevan.cn/mimage/chatimage',
		dropZone: dz,
		dataType: 'json',
		multipart: true,
		done: function (e, data) {
			if (data && data.result) {
				var result = data.result;
				if (result.code === 0) {
					var d = {
						type: type, //图片类型
						msg: result.url
					};
					if (userId) {
						d.userId = userId;
					}
					sendMessage(d, function (data) {
						if (data && data.state) {
							chatBox.loadBubble({
								msg: d.msg,
								type: d.type,
								sender: index.mo.sender,
								userId: userId
							});
						}
					});
				}
			}
		}
	});

	$(document).bind('dragover', function (e) {
		var dropZone = dz,
			timeout = window.dropZoneTimeout;
		if (!timeout) {
			dropZone.addClass('in');
		} else {
			clearTimeout(timeout);
		}
		var found = false,
			node = e.target;
		do {
			if (node === dropZone[0]) {
				found = true;
				break;
			}
			node = node.parentNode;
		} while (node != null);
		if (found) {
			dropZone.addClass('hover');
		} else {
			dropZone.removeClass('hover');
		}
		window.dropZoneTimeout = setTimeout(function () {
			window.dropZoneTimeout = null;
			dropZone.removeClass('in hover');
		}, 100);
	});

	$('#fileuploadbtn', el).click(function () {
		$('#imagefile input', el).click();
	});

};
