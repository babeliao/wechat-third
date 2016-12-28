wechat-third
===============

公众号第三方平台模块，五分钟通过微信全网发布检测
## Install

[![NPM](https://nodei.co/npm/wechat-third.png?downloads=true)](https://nodei.co/npm/wechat-third/)

将模块放到dependencies中

```
npm install wechat-third --save
```

## Getting Start

该模块使用了async/await，请使用node7+或者使用babel。这里展示模块在koa2中的使用

```
const wechat-third = require('wechat-third');

const wxthird = new wechat-third(component_appid, component_appsecret, component_token, component_encodingaeskey, saveVerifyTicket, getVerifyTicket, saveTokenObj, getTokenObj);

component_appid = 'XXXXXXX';
component_appsecret = 'XXXXXXX';
//公众号消息校验Token
component_token = 'XXXXX';
//公众号消息加解密Key
component_encodingaeskey = 'XXXXX';

//此处使用数据库存储component_verify_ticket、component_access_token和component_access_token_update_time
async function saveVerifyTicket(component_verify_ticket){
    await model.t_wxthird_base.update({
        component_verify_ticket: component_verify_ticket
    }, {
        where: {
            id: 1
        }
    });
}
async function getVerifyTicket(){
    var wxthird_base = await model.t_wxthird_base.findOne({
        where: {
            id: 1
        }
    });
    return wxthird_base;
}
async function saveTokenObj(tokenObj){
    await model.t_wxthird_base.update({
        component_access_token: tokenObj.component_access_token,
        component_access_token_update_time: tokenObj.component_access_token_update_time
    }, {
        where: {
            id: 1
        }
    });
}
async function getTokenObj(){
    var wxthird_base = await model.t_wxthird_base.findOne({
        where: {
            id: 1
        }
    });
    return wxthird_base;
}

//授权事件接收URL
router.post('/event/authorize', async function (ctx, next) {

	await wxthird.eventAuth(ctx.request.body);
    ctx.body = "success";
});

//公众号消息与事件接收URL
router.post('/event/authorize', async function (ctx, next) {

    //判断是微信全网测试专用公众号
    if(ctx.params.APPID == 'wx570bc396a51b8ff8'){
	    var res = await wxthird.wxcallback(ctx.request.body);
        ctx.body = res;
    }
});


```
随可通过微信全网检测
