const express = require('express')
const app = express();

// 客户端请求代理模块
const superagent = require('superagent');

// 为服务器特别定制的，快速、灵活、实施的jQuery核心实现。可以查找到页面元素
// 官方文档：https://cheerio.js.org/
const cheerio = require('cheerio');

// 异步并发处理模块
const async = require('async');

// 数据库模块
const mysql = require('mysql');

const baseUrl = 'https://segmentfault.com'; // 
let urlData = [];     // 地址集合
let totalData = [];   // 数据集合
let databaseData = [];  // 写入数据库的数据

app.get('/', function (req, res) {
  // 异步处理
  fetchControl(finish);

  function finish () {

    // 数据返回给客户端
    res.send(totalData);

    // 将数据写入数据库
    saveToDataBases()
  }
})

// 获取页面数据
let loop = (item, callback) =>{
  superagent.get(item.url).end(async (err, result)=>{
    if(err) {
      callback(err);
    } else {
      let data = await getBolgData(result);
      totalData = totalData.concat(data)
    }
    console.log(totalData.length);
    callback(null);
  })
}

// 把需要爬取的url全部放到集合中
let pushData = () => {
  for (let i = 1; i < 101; i++) {
    urlData.push({url: `${baseUrl}/questions?page=${i}`});
  }
}

// 处理异步并发
let fetchControl = (fn) =>{

  // 处理数据
  pushData();

  /**
   * 异步并发模块处理
   * 文档：https://caolan.github.io/async/v3/docs.html#eachLimit
   * 
   * async.eachLimit(coll,limit,iteratee,callback)
   * coll     要迭代的集合。
   * limit    一次最大异步操作数。
   * iteratee 应用于 coll. 数组索引不会传递给迭代器。
   * callback 可选参数 当所有iteratee功能完成或发生错误时调用的回调。
   */
  async.eachLimit(urlData, urlData.length, (item, callback)=>{
    loop(item, callback);
  }, (results) =>{
    fn()
  })
}

// 获取页面数据
let getBolgData = (result) =>{
  let data = []
  const $ = cheerio.load(result.text);
  $('ul.list-group li').each((index,ele) =>{
    let read = $(ele).find('.num-card').eq(1).find('span').eq(0).text();  // 阅读量
    let title = $(ele).find('.w-100 h6 a').text();  // 标题
    let url = baseUrl +  $(ele).find('.w-100 h6 a').attr('href'); // 地址
    let username = $(ele).find('.w-100').find('.user-info a').eq(0).text(); // 作者
    let userUrl = baseUrl + $(ele).find('.w-100').find('.user-info a').eq(0).attr('href'); // 作者地址
    let tags = []
    $(ele).find('.w-100').find('.m-n1 a').each((index,tag) =>{
      tags.push($(tag).text())
    })
    data.push({
      read,
      title,
      url,
      username,
      userUrl,
      tags
    })
    databaseData.push([
      read,
      title,
      url,
      username,
      userUrl,
      JSON.stringify(tags)
    ])
  })
  return data;
}


/**
 * 存数据库
 * 本来想着一次性插入数据库，为了以防万一，一条一条插入比较保险，就算有某一天数据没有成功插入，其它也还是可以的
 */
let saveToDataBases = () =>{
  var sql = 'INSERT INTO pc_ariticle(`read`,`title`,`url`, `username`, `userUrl`, `tags`) VALUES (?,?,?,?,?,?)';
  databaseData.forEach(element => {
    connection.query(sql,element, function (err, rows, fields) {
      if(err) {
        console.log('插入数据库错误：' + err.message);
      }
    })
  });
}

// 链接数据库
let connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  port: "3306",
  password: '07598817572',
  database: 'pachong'
})
connection.connect((err)=>{
  if(err) {
    console.log('数据库链接失败')
  }
})

let server = app.listen(8090, ()=>{
  let port = server.address().port;
  console.log('Your App is running at http://localhost:' + port);
})