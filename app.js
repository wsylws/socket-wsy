var express = require('express');
var app = express();
var server = require('http').Server(app);
var io = require('socket.io')(server);
var router = require('./router/router.js');
var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');
var qs = require('querystring');
const common = require('./libs/common.js');

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use(cookieParser());

app.use(express.static('./public'));

var users = {}; // //存储在线用户列表的对象
var offUsers = []; // 下线对象
var rooms = {
  '大厅': []
};

app.get('/', function (req, res, next) {
  if (req.cookies.name) {
    router.showIndex(req, res, next);
  } else {
    res.redirect('/login');
  }
});

app.get('/login', router.showLogin);

app.post('/login', function (req, res, next) {
  console.log(req.body)
  if (users[req.body.name]) {
    res.send('-1')
    return;
  } else {
    res.cookie('name', req.body.name);
    res.cookie('role', req.body.role);
    res.redirect('/');
  }
})

io.sockets.on('connection', function (socket) {
  // 登陆成功
  socket.on('online', function (name, role) {
    socket.user = name;
    socket.role = role;

    if (name in users) { // 用户名存在
      socket.emit('existed user');
      return;
    }
    users[name] = socket;
    socket.leaveAll(); // 离开所有的房间
    socket.room = '大厅';
    socket.join('大厅');
    rooms['大厅'].push(socket.user);

    // 如果是刷新进来的用户，则进入大厅
    if (offUsers.includes(name)) {
      offUsers = offUsers.filter(offUser => {
        return !(offUser == name)
      })
      socket.to(socket.room)
        .emit('system', socket.user + '进入' + socket.room)
      socket.emit('system', '欢迎您进入' + socket.room)
    } else {
      // 如果不是，广播其他用户该用户已上线
      socket.emit('system', '欢迎您加入聊天室');
      socket.broadcast.emit('system', socket.user + '上线了');
    }

    // 刷新房间列表
    for (let i in users) {
      users[i].emit('refresh rooms', {
        rooms: rooms,
        active: users[i].room
      })
    }

    // 更新用户列表
    io.emit('online number', Object.keys(users).length);
    socket.emit('refresh users', rooms[socket.room]);
    socket.to(socket.room).emit('refresh users', rooms[socket.room])
  })

  // 发送消息
  socket.on('send msg', function (content) {
    console.log(socket.room, socket.user, socket.role)
    socket.to(socket.room).emit('send msg', {// 发送给一个房间的所有客户端，除了发送者
      name: socket.user,
      role: socket.role,
      content: content,
      time: common.getTime()
    })
  })

  // 发送大喇叭
  socket.on('send horn', function (content) {
    socket.broadcast.emit('send msg', { // 发送给所有客户端，除了发送者
      name: socket.user,
      role: socket.role,
      content: content,
      time: common.getTime()
    })
  })

  // 添加房间
  socket.on('add room', function (room) {
    rooms[room] = [];
  })

  // 用户离线
  socket.on('disconnect', function () {
    delete users[socket.user]; //从 users 对象中删除该用户名
    offUsers.push(socket.user); //从下线对象中加入该用户名

    common.removeItem(rooms[socket.room], socket.user) //如果房间存在该用户，房间移除该用户

    socket.to(socket.room)
      .emit('refresh users', rooms[socket.room]); // 刷新房间列表

    if (!rooms[socket.room]) return;
    if (rooms[socket.room].length > 0 || socket.room == '大厅') {
      socket.to(socket.room)
        .emit('system', socket.user + '离开' + socket.room);
    } else {
      delete rooms[socket.room];
    }
    for (let i in users) {
      users[i].emit('refresh rooms', {
        rooms: rooms,
        active: users[i].room
      })
    }

    setTimeout(function () {
      if (offUsers.includes(socket.user)) { // 如果下线的用户里 包括当前用户
        offUsers = offUsers.filter(offUser => { //过滤
          return !(offUser == socket.user)
        })

        socket.broadcast.emit('system', socket.user + '下线了'); // 发送给所有客户端下线了，除了发送者
        io.emit('online number', Object.keys(users).length); // 用户人数
      }
    }, 3000);
  })

  // 切换房间
  socket.on('change room', function (to) {
    let from = socket.room; // 前一个房间
    common.removeItem(rooms[from], socket.user); // 移除前一个房间

    rooms[to].push(socket.user);
    socket.room = to; // 加入的房间

    // 离开房间通知
    if (rooms[from].length > 0 || from == '大厅') {
      socket.to(from)
        .emit('system', socket.user + '离开' + from);
    } else {
      delete rooms[from];
    }
    for (let i in users) {
      users[i].emit('refresh rooms', {
        rooms: rooms,
        active: users[i].room
      })
    }

    socket.leaveAll();
    socket.join(socket.room);

    socket.to(from)
      .emit('refresh users', rooms[from]);

    // 进入房间通知
    io.to(socket.room)
      .emit('refresh users', rooms[socket.room]);
    socket.to(socket.room)
      .emit('system', socket.user + '进入' + socket.room);
    socket.emit('system', '欢迎您进入' + to);
  })
})

// function removeItem (items, item) {
//   if (!items) return;
//   let index = items.indexOf(item);
//   if (index == -1) return;
//   items.splice(index, 1)
// }

server.listen(3333, () => {
  console.log('listening at 3333');
})