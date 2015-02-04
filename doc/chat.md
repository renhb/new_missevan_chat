# Chat Room HTTP API

## Overall Fail State

```
{
  "code": <error code (< 0)>,
  "message": "<error message>"
}
```

## Overall Room Info

```
<room info>
{
  "id": <room id>,
  "name": "<room name>",
  "type": <room type>,
  "maxNum": <room members max number>,
  "userId": <room creator user id>,
  "userName": <room creator user name>
}
```

## Overall User Info

```
{
  "id": <user id>,
  "username": "<user username>",
  "iconid": <user iconid>,
  "iconurl": "<user iconurl>",
  "iconcolor": "<user iconcolor>",
  "subtitle": "<user subtitle>"
}
```

iconurl 只包含了基本图片路径，请加上URL前缀：

```
正常: http://static.missevan.cn/mimagesmini/
小图: http://static.missevan.cn/mimages/
```

## 创建房间

``` POST /room/new ```

```
{
  "code": 0,
  "roominfo": <room info>
}
```

### 获取房间列表

```GET /room/list```

```
{
  "code": 0,
  "roomlist": [
    <room info>, ...
  ],
  "members": {
    "<room id>": [
      <user info>
    ], ...
  }
}
```