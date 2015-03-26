class GAction
  constructor: (@type) ->
    if @type is 'text'
      @ready = on
    else
      @ready = no

  load: (cb) ->
    if @ready
      cb()
      return

    self = @
    switch @type
      when 'image'
        img = new Image()
        img.onload = ->
          self.ready = on
          cb()
          return
        img.src = @val
        self.img = img
      when 'sound'
        moTool.getAjax
          url: "/sound/getsound?soundid=" + @val,
          showLoad: no,
          callBack: (data2) ->
            sound = data2.successVal.sound
            soundUrl = sound.soundurl
            s = soundManager.createSound
        					id: soundUrl,
        					url: index.mo.soundPath + soundUrl,
        					multiShot: no,
        					onload: ->
                    self.ready = on
                    cb()
                    return
            s.load()
            self.Jsound = sound
            self.sound = s
            return
      else
        cb()

    return

  attachlaststate: ->
    # hack to state
    $cm = $ '#chatbox .chatmessage:first'
    if ($cm and $cm.length is 1)
      @line = index.mo.chatLine
      $cm.attr('id', 'chatline' + @line)
      index.mo.chatLine++
    return

  attacheditor: ->
    if @line >= 0
      $line = $ '#chatline' + @line
      $line.prepend """
                    <div class="line-editor" data-line="#{@line}" data-actionid="">
                      <div class="line-del">x</div>
                    </div>
                    """
      $line.find('.line-del').click (e) ->
        line = $(this).parent().data('line')
        if GG.em.removeLine parseInt(line)
          $line.remove()
        e.stopPropagation()
        return
    return

  run: (cb) ->
    action = @
    @load ->
      if action.chara
        # 切换角色
        GG.chara.selectId action.chara

      callback = ->
        if GG.env is 'dev'
          action.attacheditor()

        cb() if cb?

      switch action.type
        when 'text'
          action.line = index.mo.chatLine
          chatBox.loadBubble
            msg: action.val,
            type: 1,
            sender: index.mo.sender
          callback()
        when 'state'
          chatBox.loadMemberState { username: index.mo.sender.name }, action.val

          if GG.env is 'dev'
            action.attachlaststate()

          callback()
        when 'image'
          chatBox.loadBubble { msg: action.val, type: 7, sender: index.mo.sender }, ->
            action.line = index.mo.chatLine - 1
            callback()
            return
        when 'sound'
          msg = JSON.stringify action.Jsound

          # play sound
          chatBox.loadBubble
            msg: msg,
            type: 6,
            sender: index.mo.sender

          if GG.env is 'dev'
            soundname = if action.Jsound then action.Jsound.soundstr else ''
            chatBox.loadMemberState { username: index.mo.sender.name }, "播放了声音「#{soundname}」"
            action.attachlaststate()

          callback()

    return

class GEvent

  constructor: (@id, @name, @time) ->
    @actions = []

  action: (type, val1, val2, norun) ->
    an = new GAction type

    switch type
      when 'text'
        an.chara = @parseCharaId(val1)
        an.val = val2
        if not norun
          an.run()

      when 'image'
        an.chara = @parseCharaId(val1)
        an.val = val2
        if not norun
          an.run ->
            #image do some thing here

      when 'sound'
        an.chara = @parseCharaId(val1)
        an.val = val2
        if not norun
          an.run ->
            # TODO: show some tips in stage

      when 'state'
        an.chara = @parseCharaId(val1)
        an.val = val2
        if not norun
          an.run()

      else return

    @actions.push an
    return

  removeLine: (line) ->
    found = no
    for ac, i in @actions
      if ac.line is line
        @actions.splice i, 1
        found = on
        break
    found

  run: (i = 0) ->
    if i < @actions.length
      self = @
      @actions[i].run ->
        self.run i + 1
        return

    return

  parseCharaId: (charaid) ->
    if typeof charaid is 'number'
      return charaid
    else if typeof charaid is 'string'
      cids = charaid.split ':'
      if cids.length is 2 and cids[0] is 'chara'
        return parseInt cids[1]

    return -1

  # parse action text
  parseAction: (text) ->
    if text[0] isnt '/'
      @action 'text', GG.chara.currentId(), text
    else
      cmds = GG.util.splitcommand text
      switch cmds[0]
        when 'sound'
          soundid = parseInt cmds[1]
          if soundid
            @action 'sound', GG.chara.currentId(), soundid
        when 'state'
          state = cmds[1]
          if state
            @action 'state', GG.chara.currentId(), state
        # 其他特殊动作
        # do some thing

  showImage: (url) ->
    @action 'image', GG.chara.currentId(), url

  # parse
  parse: (block) ->
    lines = GG.util.splitline block

    if lines.length > 0
      for line in lines
        lineprops = GG.util.splitprop line
        try
          @action lineprops[0], lineprops[1], JSON.parse(lineprops[2]), on

    return

  realtime: () ->
    @time

class GEventManager

  constructor: () ->
    @events = []
    @_lastid = 0
    @_event = null
    @_timecount = 0
    @_curtime = 0
    @_currentIndex = -1

  lastid: ->
    @_lastid

  current: (i = -1) ->
    if i isnt -1
      @_currentIndex = i
      @_event = @events[i]
    @_event

  currentIndex: ->
    @_currentIndex

  next: ->
    if @_currentIndex < @events.length - 1
      @_currentIndex++
      @_event = @events[@_currentIndex]
      return on
    else
      return no

  totaltime: (untili = -1) ->
    if untili isnt -1
      counttime = 0
      for ev, i in @events
        if untili <= i
          return counttime
        counttime += ev.realtime()
    @_timecount

  moveToBegin: ->
    @_currentIndex = 0
    @_event = @events[0]
    return

  getNeedPreload: ->
    tt = 0
    res = []
    total = @totaltime()

    for ev, i in @events
      _ctt = ev.realtime()
      len = ev.actions.length

      # 检查需要预先加载的内容
      for ac, j in ev.actions
        pos = (tt + ((j + 1) * _ctt / len)) / total
        switch ac.type
          when 'image'
            res.push
              pos: pos,
              type: 'image',
              imgurl: ac.val,
              action: ac

          when 'sound'
            res.push
              pos: pos,
              type: 'sound',
              soundid: ac.val,
              action: ac

      tt += _ctt

    res

  setVolume: (volume = -1) ->
    if volume is -1
      volume = GG.gekijou.tb.getVolume()
    _curev = @current()
    if _curev
      for ac in _curev.actions
        if ac.type is 'sound'
          if ac.sound
            ac.sound.setVolume volume
    return

  getClosetIndex: (time) ->
    tt = 0
    for ev, i in @events
      if tt > time
        return i - 1
      tt += ev.realtime()
    return @events.length - 1

  removeLine: (line) ->
    ev = @current()
    found = no

    if ev
      if ev.removeLine line
        found = on

    if not found
      for ev in @events
        if ev.removeLine line
          found = on

    found

  runAtTime: (time) ->
    tt = 0
    for ev, i in @events
      if time >= tt
        if @_currentIndex < i
          if @next() then @run()
      else
        break
      tt += ev.realtime()

    # emit end message
    if time >= @_timecount and @_curtime < @_timecount
      GG.gekijou.emit 'end'

    @_curtime = time
    @_currentIndex

  run: ->
    if @_event
      @setVolume()
      @_event.run()
    return

  length: ->
    @events.length

  get: (i) ->
    @events[i]

  del: (i) ->
    @events.splice i, 1
    return

  insert: (name, time = 2000) ->
    if 0 <= @_currentIndex < @events.length - 1
      id = @_lastid++
      ev = new GEvent id, name, time
      @events.splice @_currentIndex + 1, 0, ev
      @_event = ev
      @_currentIndex++
      @_timecount += ev.realtime()
    else
      ev = @add name, time
    ev

  add: (name, time = 2000, id = -1) ->
    if id is -1
      id = @_lastid++
    else
      @_lastid = id + 1
    ev = new GEvent id, name, time
    @events.push ev
    @_event = ev
    @_currentIndex = @events.length - 1
    @_timecount += ev.realtime()
    ev

  # parse
  parse: (block_script) ->
    @_timecount = 0
    blocks = GG.util.splitblock block_script

    for b in blocks
      props = GG.util.splitprop b.title

      if props.length >= 4 and props[0] is 'define'
        id = parseInt props[1]
        name = JSON.parse props[2]
        time = parseInt props[3]
        ev = @add name, time, id
        ev.parse b.content

    return
