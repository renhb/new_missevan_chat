/**
* @Title: config.example.js
* @Package bin
*
* @author 操杰朋、腾袭
* @create 2014/12/19
* @version 0.2.1
*
* @Description:
* 	configure of our application
*/

var path = require('path');

//'..' for config folder, '.' for config.js file
var root_dir = path.resolve(__dirname, '.') + '/';
var public_dir = root_dir + 'public/';

var upload_dir = public_dir + 'data/';
var tmp_dir = public_dir + 'data/tmp/';

var dev_mode = true;

//线上数据
//module.exports.redis = {url:"10.162.72.20",port:"6379",password:"missevan_chat_password_tom"};
//module.exports.port = "3000";
//线下数据
var config = {
  sys: {
    public_dir: public_dir,
    upload_dir: upload_dir,
    root_dir: root_dir,
    tmp_dir: tmp_dir
  },

  app: {
    dev_mode: dev_mode
  },

  security: {
    /* Security settings */
    keyGrip: [
      'phahMi0Pue3fohPae8Kohboo7phoAuy7ohnuqui9OhRoo3siLuEo1epi',
      'reihet5Yhs3xaeDhee0ieken0HoxahV8zahthah0Wahhree3KauaPh2i'
    ]
  },

  web: {
    address: '0.0.0.0',
    port: 3000
  },
  redis: {
    url: '192.168.1.138',
    port: 6379,
    password: "missevan_chat_password_tom",
    time: 180
  },
  db: {
    host: '192.168.1.138',
    port: 27017,
    name: 'missevan',
    username: '',
    password: ''
  },
  cache: {
    enable: false
  }
};

module.exports = config;