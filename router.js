const Router = require('koa-router');
const fetch = require('node-fetch');

const LoginModel = require('./mongo_model/loginModel');
const documentModel = require('./mongo_model/documentModel');

const router = new Router();

router.get('/login', async (ctx) => {
  const { code } = ctx.query;
  if (code) {
    let token = '';
    await fetch(`https://github.com/login/oauth/access_token?code=${code}&client_id=a9a11fbab7c3d5fe46e9&client_secret=694a8a99bcc413711f2463615d4326a0f7bee526`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    })
      .then(response => response.text())
      .then(data => {
        token = data.match(/access_token=(.*?)&/i);
      })
    const responseUserData = token
      ? await fetch(`https://api.github.com/user?access_token=${token[1]}`, {
        method: 'GET'
      })
      : {};
    const userData = await retrieveAuthor(await responseUserData.json());
    if (userData) {
      ctx.cookies.set(
        'id',
        userData.id,
        {
          domain: 'localhost',
          // domain: 'gljblog.com',
          maxAge: 1000 * 60 * 60 * 24,
          httpOnly: false
        }
      )
    }
    ctx.body = userData;
  }
});

// 检索个人信息
function retrieveAuthor (message) {
  const { id, name, email, avatar_url } = message;
  const authorMessage = new LoginModel({
    id,
    name,
    email,
    avatar_url
  });
  return getAuthor({ id, name, email, avatar_url }, authorMessage);
}

function getAuthor (message, authorMessage) {
  return new Promise((resolve, reject) => {
    LoginModel.findOne({ id: message.id }, (err, data) => {
      if (err) {
        reject('serverError');
      }
      if (data) {
        return resolve(data);
      }
      resolve(saveAuthor(authorMessage, message));
    });
  });
}

// 存储个人信息
function saveAuthor (authorMessage, message) {
  return new Promise((resolve, reject) => {
    authorMessage.save((err) => {
      if (err) {
        reject('serverError');
      }
      resolve(message);
    });
  });
}

// 通过用户id获取用户信息
router.get('/user', async (ctx) => {
  const id = ctx.cookies.get('id');
  ctx.body = await userMessage(id);
});

function userMessage (id) {
  return new Promise((resolve, reject) => {
    LoginModel.findOne({ id }, (err, data) => {
      if (err) {
        reject('serverError');
      }
      return resolve(data);
    });
  });
}

// 登出
router.get('/logout', async (ctx) => {
  ctx.cookies.set(
    'id',
    '',
    {
      domain: 'localhost',
      // domain: 'gljblog.com',
      maxAge: 0,
      httpOnly: false
    }
  );
  ctx.body = 'ok';
});

// 加入文档
router.get('/join', async (ctx) => {
  const { id, name } = ctx.query;
  const userId = ctx.cookies.get('id');
  const haveDocument = await isDocument(`id=${id}&name=${name}`);
  if (userId && haveDocument) {
    const oldDocuments = (await userMessage(userId)).documents;
    const addDocument = {
      name,
      joinURL: `id=${id}&name=${name}`,
      time: new Date()
    }
    // 判断用户是否老用户
    const noHave = oldDocuments.every((document) => {
      return document.name !== name;
    });
    if (noHave) {
      ctx.body = await updateUser(userId, [...oldDocuments, addDocument]);
    } else {
      ctx.body = 'isHave';
    }
  } else {
    ctx.body = 'noDucument';
  }
})

// 更新用户
function updateUser (id, documents) {
  return new Promise((resolve, reject) => {
    LoginModel.updateOne({ id }, { $set: { documents } }, { multi: false }, (err) => {
      if (err) {
        reject('serverError');
      }
      resolve('isHave');
    });
  })
}

// 建立文档
router.post('/create', async (ctx) => {
  const { name, username } = ctx.request.body;
  const id = ctx.cookies.get('id');
  const documentMessage = new documentModel({
    name,
    joinURL: `id=${id}&name=${name}`,
    users: [{
      index: 1,
      name: username,
      note: '文档开创者',
      content: '开始你的创作吧',
      time: new Date()
    }]
  });
  const isHave = await isDocument(`id=${id}&name=${name}`);
  if (isHave) {
    ctx.body = 'repeat';
  } else {
    const oldDocuments = (await userMessage(id)).documents;
    const addDocument = {
      name,
      joinURL: `id=${id}&name=${name}`,
      time: new Date()
    }
    updateUser(id, [...oldDocuments, addDocument]);
    ctx.body = await createDocument(documentMessage, `id=${id}&name=${name}`);
  }
});

// 查询文档是否存在
function isDocument (joinURL) {
  return new Promise((resolve, reject) => {
    documentModel.findOne({joinURL}, (err, data) => {
      if (err) {
        reject('serverError');
      }
      data ? resolve(true) : resolve(false);
    });
  });
}

function createDocument (documentMessage, joinURL) {
  return new Promise((resolve, reject) => {
    documentMessage.save((err) => {
      if (err) {
        reject('serverError');
      }
      resolve(joinURL);
    });
  });
}

// 查询文档
router.get('/getDocument', async (ctx) => {
  const { id, name } = ctx.query;
  if (ctx.cookies.get('id')) {
    ctx.body = await getDocument(`id=${id}&name=${name}`);
  }
});

function getDocument (joinURL) {
  return new Promise((resolve, reject) => {
    documentModel.findOne({ joinURL }, (err, data) => {
      if (err) {
        reject('serverError');
      }
      resolve(data);
    });
  });
}

// 提交版本
router.post('/submit', async (ctx) => {
  const { joinURL, index, username, note, content } = ctx.request.body;
  const id = ctx.cookies.get('id');
  if (id) {
    const oldDocuments = (await getDocument(joinURL)).users;
    const addDocument = {
      index,
      name: username,
      note,
      content,
      time: new Date()
    };
    const updateResult = await updateSubmit(joinURL, [...oldDocuments, addDocument]);
    ctx.body = updateResult
  }
});

// 更新版本
function updateSubmit (joinURL, users) {
  return new Promise((resolve, reject) => {
    documentModel.updateOne({ joinURL }, { $set: { users } }, { multi: false }, (err) => {
      if (err) {
        reject('serverError');
      }
      resolve('submitSuccess');
    });
  });
}

module.exports = router;