var path = require('path');
// 展示首页
exports.showIndex = function (req, res, next) {
  // res.render('index')
  res.sendFile(path.join(__dirname, '../views', 'index.html'));

}

// 展示登录页面
exports.showLogin = function (req, res, next) {
  res.sendFile(path.join(__dirname, '../views', 'login.html'));
}

// 登录
exports.login = function (req, res, next) {
  console.log(req.body)
  res.send(req.body)
}