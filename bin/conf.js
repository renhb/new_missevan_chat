/**
* @Title: conf.js
* @Package bin
*
* @author 操杰朋
* @create 2014/12/19
* @version 0.0.1
*
* @Description:
* 	configure of our application
*/

var config = {
  dev_mode: true,
  redis: {url:"192.168.1.136",port:"6379",password:"missevan_chat_password_tom" },
  port: 3000
};

module.exports = config;
