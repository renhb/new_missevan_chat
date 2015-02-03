/**
* @Title: room.js
* @Package model
*
* @author 操杰朋, 腾袭
* @create 2014/12/19
* @update 2015/01/16
* @version 0.1.1
*
* @Description:
*/

var config = require('./../config');

var util = require('util');
var _ = require('underscore');
var ModelBase = require('./../lib/base');

function Room(data, socket, bridge) {
	this.socket = socket;
	this.bridge = bridge;

	if (data) {
		this.ticket = data.ticket;
		this.roomId = data.roomId.toString();
	}
}

util.inherits(Room, ModelBase);

Room.prototype.isRoom = function () {
	if (this.roomId) {
		return /^t?[0-9]+$/.test(this.roomId);
	}
	return false;
};

Room.prototype.isLastingRoom = function () {
	if (this.roomId) {
		return /^[0-9]+$/.test(this.roomId);
	}
	return false;
};

//进入房间
Room.prototype.enter = function *(user) {
	var socket = this.socket;
	var yclient = this.yclient;

	if (!this.isRoom()) {
		throw new Error('错误的房间号');
	}

	var lastingRoom = this.isLastingRoom();

	var roomId = this.roomId;
	var memberId = user.id;	///这里获取用户id
	var memberIdInfo = 'member' + memberId + 'Info';

	var roomIdPerson = 'room' + roomId + 'Person';

	socket.roomId = roomId;
	socket.broomId = 'room' + roomId;
	socket.join(socket.broomId);

	if (memberId) {
		var roomIdInfo = 'room' + roomId + 'Info';

		var roomInfo = yield yclient.HGETALL(roomIdInfo);
		if (!exists) throw new Error('没有找到该房间');

		yield yclient.PERSIST(roomIdInfo);
		yield yclient.HSET(memberIdInfo,user);
		
		if (!lastingRoom)
			if(roomInfo)
				yield yclient.HSET('roomNameIndexType' + roomInfo.type, roomName,roomInfo.id);

		if (this.ticket) {
			socket.ticket = this.ticket;
		}

		socket.roomName = roomName;

		socket.userId = memberId;
		socket.buserId = 'room' + roomId + 'user' + memberId;
		socket.join(socket.buserId);

		var num = yield yclient.ZINCRBY(roomIdPerson, 1,memberId );
		if (num == 1) {
			var member = yield yclient.HGETALL(memberIdInfo);
			if (member) {
				socket.broadcast.to(socket.broomId).emit('add new member', member);
				this.bridge.emit('enter room', {
					room: socket.roomId,
					number: '+1',
					personInfo: member
				});
			}
			if (!lastingRoom) {
				yield yclient.ZINCRBY('roomIdIndex' + TypeNum, 1, roomId);
			}
		}
	}

	// 获取所有在线人员信息
	var keys = yield yclient.ZRANGE(roomIdPerson,0,-1);
	var multi = yclient.multi();
	for (var i = 0; i < keys.length; i++) {
		multi.HGETALL(keys[i])();
	}
	var userInfos = yield multi.exec();

	return { state: true, member: userInfos };
};

//离开房间
Room.prototype.leave = function *() {
		var socket = this.socket;
		var yclient = this.yclient;

		if (!socket.userId) {
			socket.leave(socket.broomId);
			return;
		}

		var roomIdInfo = "room"+socket.roomId+"Info";
		var roomIdPerson = "room"+socket.roomId+"Person";
		var memberIdInfo = "member"+socket.userId+"Info";

		var num = yield yclient.ZINCRBY(roomIdPerson,-1,memberIdInfo);

		if (num <= 0) {
			if (socket.ticket) {
				yield yclient.SETEX('ticket' + socket.ticket, config.redis.time, socket.roomId);
			}
			socket.leave(socket.broomId);
			socket.leave(socket.buserId);
			yield yclient.HDEL(roomIdPerson, memberIdInfo);
			yield yclient.ZINCRBY('roomIdIndex'+TypeNum, -1, socket.roomId);
			var exist = yield yclient.EXISTS(roomIdPerson);
			if (!exist) {
				if(socket.roomId[0] == 't'){
					var roomInfo = yield yclient.HGETALL(roomIdInfo);
					yield yclient.SETEX('Type'+roomInfo.type+'Rn'+socket.roomName+, config.redis.time, socket.roomId);
					yield yclient.HDEL('roomNameIndexType'+roomInfo.type, socket.roomName);
					yield yclient.ZREM('roomIdIndexType'+roomInfo.type, socket.roomId);
				}
				yield yclient.EXPIRE(roomIdInfo, config.redis.time);
				var messages = [];
				[1,3,4].forEach(function(value){
					var roomIdMessage = 'room' + socket.roomId + 'MessageType' + value;
					messages.push(yclient.EXPIRE(roomIdMessage, config.redis.time));
				});
				yield messages;
			}

			//yield yclient.HINCRBY(roomIdPerson, memberIdInfo, -1);
			var userInfo = yield yclient.HGETALL(memberIdInfo);
			socket.broadcast.to(socket.broomId).emit('leave room', userInfo);
			this.bridge.emit('leave room', {
				room: socket.roomId,
				number: "-1",
				personInfo: userInfo
			});

			var keys = yield yclient.KEYS("room*Person");
			var multi = yclient.multi();
			for (var i = 0; i < keys.length; i++) {
				multi.ZSCORE(keys[i], memberIdInfo)();
			};
			var exists = yield multi.exec();
			if (exists.every(function (ex) {
				return ex == null;
			})) {
				yield yclient.DEL(memberIdInfo);
			}
		}
};

//创建房间
Room.prototype.newRoom = function *(room,user) {
	var TypeNumRnroomName = 'Type'+room.type+'Rn'+room.name;
	var roomNameIndexTypeNum = 'roomNameIndexType' + room.type;
	var yclient = this.yclient;
	var roomId = yield yclient.GET(TypeNumRnroomName);
	var roomIdInfo = 'room'+roomId+'Info';
	if(roomId){
		var roomInfo = yield yclient.HGETALL(roomIdInfo);
		if(roomInfo) return roomInfo;
		yield yclient.DEL(TypeNumRnroomName);
	}
	
	roomId = yield yclient.HGET(roomNameIndexTypeNum,room.name);
	roomIdInfo = 'room'+roomId+'Info';
	if(roomId){
		var roomInfo = yield yclient.HGETALL(roomIdInfo);
		if(roomInfo) throw new Error('该房间已存在');
		yield yclient.HDEL(roomNameIndexTypeNum,room.name);
	}
	
	var roomIdType = 'room'+roomId+'Type';
	var roomInfo = {};
	roomId = yield yclient.INCR('roomId');
	roomId = 't'+ roomId;
	roomInfo.id = roomId;
	roomInfo.name = room.name;
	roomInfo.type = room.type;
	roomInfo.maxNum = parseInt(room.maxNum);
	roomInfo.userId = user.id;
	roomInfo.userName = user.name;
	roomIdInfo = 'room'+roomId+'Info';
	var q = [ yclient.HSET(roomIdInfo,roomInfo),
	          yclient.EXPIRE(roomIdInfo,config.redis.time),
	          yclient.SETEX(TypeNumRnroomName,config.redis.time,roomId) ];
	yield q;
	return roomInfo;
}

//检查临时房间
Room.prototype.checkTempRoom = function *(roomId,user) {
	var yclient = this.yclient;
	var roomIdInfo = 'room'+ roomId+ 'Info';
	var roomIdPerson = 'room'+roomId+'Person';
	
	var roomInfo = yield yclient.HGETALL(roomIdInfo);
	if(!roomInfo) throw new Error('该房间不存在');
	
	var exist = yield yclient.HEXISTS(roomIdPerson,user.id);
	if(exist) return roomInfo.name;
	
	var maxNum = roomInfo.maxNum;
	var nowNum = (yield yclient.HKEYS(roomIdPerson)).length;
	
	if(maxNum>nowNum) return roomInfo.name;
	throw new Error('该房间人数已满');
}

//检查私房凭证
Room.prototype.checkTicket = function *(ticket){
	var yclient = this.yclient;
	var roomId = yield yclient.GET('ticket'+ticket);
	if(!roomId) throw new Error('无效的ticket！');
	var roomIdInfo = 'room'+ $roomId+ 'Info';
	var roomInfo = yield yclient.HGETALL(roomIdInfo);
	if(!roomInfo) throw new Error('该房间已经没有成员在了！');
	return roomInfo;
}

//检查小组房间
Room.prototype.checkTeamRoom = function *(user){
	if(!user.teamid) throw new Exception('该房间不存在！');
	var yclient = this.yclient;
	var roomIdInfo = 'room'+ user.teamid+ 'Info';
	$roomInfo = array('id' => user.teamid,'name' =>user.teamname);
	yield yclient.HSET(roomIdInfo,$roomInfo);
	yield yclient.EXPIRE(roomIdInfo,config.redis.time)
	return true;
}

module.exports = Room;

ModelBase.register('room', Room);
