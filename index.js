const Koa = require('koa');
const bodyParser = require('koa-bodyparser');
const router = require('./router');
const app = new Koa();

app.use(bodyParser());
app.use(router.routes());
app.use(router.allowedMethods());

// 连接数据库
const mongoose = require('mongoose');
mongoose.connect('mongodb://localhost/test', {useNewUrlParser: true}, (err) => {
  if (err) {
    console.log(err);
  } else {
    console.log('连接数据库成功');
  }
});

app.listen(8000, () => {
  console.log('服务开启');
});