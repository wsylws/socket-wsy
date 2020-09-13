var btn = document.getElementById('submit');
var input = document.getElementsByClassName('name')[0]; // 用户名
var roleInput = document.getElementsByName("role"); //角色


// 点击登陆
btn.addEventListener('click', function (e) {
  e.preventDefault();

  var selectvalue = null;   //  selectvalue为radio中选中的值
  for (var i = 0; i < roleInput.length; i++) {
    if (roleInput[i].checked == true) {
      selectvalue = roleInput[i].value;
      break;
    }
  }

  if (!(input.value).trim()) {
    alert('请输入名字');
    return false;
  } else if (strLen(input.value.trim()) > 20) {
    alert('名字的长度不能超过20');
    return false;
  } else if (!selectvalue) {
    alert('请选择角色');
    return false;
  }

  var xhr = new XMLHttpRequest();
  xhr.onreadystatechange = function () {
    if (xhr.readyState == 4 && xhr.status == 200) {
      if (xhr.response == -1) {
        alert('用户名被占用');
      } else {
        window.location.pathname = '/'
      }
    }
  }
  xhr.open('post', '/login');

  xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
  var data = 'name=' + input.value.trim() + '&role=' + selectvalue;
  xhr.send(data)
}, false)

function strLen(str) {
  return str.replace(/[^\x00-\xff]/g, '00').length
}