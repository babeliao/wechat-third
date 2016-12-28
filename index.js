/**
 * Created by liaoyunda on 16/12/27.
 */

const https = require('https');

const wxcrypto = require('./lib/wxcrypto');
const parseString = require('xml2js').parseString;

const newCrypto = new wxcrypto(this.aesToken, this.aesKey, this.appid);

/**
 * 根据appid和appsecret以及相应参数创建Wxthird的构造函数
 *
 * @param {String} appid 在开放平台申请得到的第三方平台appid
 * @param {String} appsecret 在开放平台申请得到的第三方平台appsecret
 * @param {String} 公众号消息校验Token
 * @param {String} 公众号消息加解密Key
 * 以下function类型的参数意在兼容使用者的多种数据持久化方案，可以放到redis或database中，但要确定全局唯一
 * @param {Function param {String}} saveVerifyTicket 保存全局component_verify_ticket的方法，建议存放在缓存中, 必填项
 * @param {Function return {String}} getVerifyTicket 获取全局component_verify_ticket的方法，建议存放在缓存中, 必填项
 * @param {Function param {Object}} saveTokenObj 保存全局component_access_token和component_access_token_update_time的方法，必填项。 saveTokenObj参数：{component_access_token:'', component_access_token_update_time:''}
 * @param {Function return {Object}} getTokenObj 获取全局component_access_token和component_access_token_update_time的方法，必填项。 getTokenObj返回值：{component_access_token:'', component_access_token_update_time:''}
 *
 * @constructor
 */
var Wxthird = function (appid, appsecret, aesToken, aesKey, saveVerifyTicket, getVerifyTicket, saveTokenObj, getTokenObj) {

    this.appid = appid;
    this.appsecret = appsecret;
    this.aesToken = aesToken;
    this.aesKey = aesKey;
    this.saveVerifyTicket = saveVerifyTicket;
    this.getVerifyTicket = getVerifyTicket;
    this.saveTokenObj = saveTokenObj;
    this.getTokenObj = getTokenObj;
}

/**
 * 供授权事件接收接口调用
 * 接受request body解压后调用saveVerifyTicket方法保存ComponentVerifyTicket
 *
 * @param {String} request body
 */
Wxthird.prototype.eventAuth = async function (body) {

    var bodyJson = await new Promise(function (resolve, reject) {
        parseString(body,{explicitArray : false}, function (err, result) {
            resolve(result);
        });
    });
    console.log(JSON.stringify(bodyJson));
    var encryptXml = newCrypto.decrypt(bodyJson.xml.Encrypt).message;
    console.log("第三方平台全网发布-----------------------解密后 Xml="+encryptXml);
    var encryptJson = await new Promise(function (resolve, reject) {
        parseString(encryptXml,{explicitArray : false}, function (err, result) {
            resolve(result);
        });
    });
    console.log(JSON.stringify(encryptJson));
    this.saveVerifyTicket(encryptJson.xml.ComponentVerifyTicket);
}

/**
 * 供消息与事件接收接口调用
 * 全网发布测试时微信服务器会发送3次测试消息和时间，分别为：模拟粉丝触发专用测试公众号的事件、模拟粉丝发送文本消息、模拟粉丝发送文本消息
 * 并且要求根据对应信息作出相应响应，调用后此方法后开发者无需考虑繁琐的加解密和逻辑处理
 *
 * @param {String} request body
 */
Wxthird.prototype.wxcallback = async function (body) {

    var bodyJson = await new Promise(function (resolve, reject) {
        parseString(body,{explicitArray : false}, function (err, result) {
            resolve(result);
        });
    });
    console.log(JSON.stringify(bodyJson));
    var encryptXml = newCrypto.decrypt(bodyJson.xml.Encrypt).message;
    console.log("第三方平台全网发布-----------------------解密后 Xml="+encryptXml);
    var encryptJson = await new Promise(function (resolve, reject) {
        parseString(encryptXml,{explicitArray : false}, function (err, result) {
            resolve(result);
        });
    });
    console.log(JSON.stringify(encryptJson));

    var toUserName = encryptJson.xml.ToUserName;
    var fromUserName = encryptJson.xml.FromUserName;
    var timeStamp = parseInt(new Date().getTime()/1000);
    var nonce = 'srtgs';

    if("event" == encryptJson.xml.MsgType){
        console.log("---全网发布接入检测-------------事件消息--------");
        var returnContent = encryptJson.xml.Event + "from_callback";

        var sb = '';
        sb += "<xml>";
        sb += "<ToUserName><![CDATA["+fromUserName+"]]></ToUserName>";
        sb += "<FromUserName><![CDATA["+toUserName+"]]></FromUserName>";
        sb += "<CreateTime>"+timeStamp+"</CreateTime>";
        sb += "<MsgType><![CDATA[text]]></MsgType>";
        sb += "<Content><![CDATA["+returnContent+"]]></Content>";
        sb += "</xml>";

        var encrypt = newCrypto.encrypt(sb);
        var signature = newCrypto.getSignature(timeStamp,nonce,encrypt);
        var resdata = "<xml>\n" + "<Encrypt><![CDATA["+encrypt+"]]></Encrypt>\n"
            + "<MsgSignature><![CDATA["+signature+"]]></MsgSignature>\n"
            + "<TimeStamp>"+timeStamp+"</TimeStamp>\n" + "<Nonce><![CDATA["+nonce+"]]></Nonce>\n" + "</xml>";
        return resdata;
    }else if("text" == encryptJson.xml.MsgType){
        console.log("---全网发布接入检测-------------文本消息--------");
        var content = encryptJson.xml.Content;

        if("TESTCOMPONENT_MSG_TYPE_TEXT" == content){
            var returnContent = content+"_callback";

            var sb = '';
            sb += "<xml>";
            sb += "<ToUserName><![CDATA["+fromUserName+"]]></ToUserName>";
            sb += "<FromUserName><![CDATA["+toUserName+"]]></FromUserName>";
            sb += "<CreateTime>"+timeStamp+"</CreateTime>";
            sb += "<MsgType><![CDATA[text]]></MsgType>";
            sb += "<Content><![CDATA["+returnContent+"]]></Content>";
            sb += "</xml>";
            console.log('普通文本回复加密sb：'+sb);
            var encrypt = newCrypto.encrypt(sb);
            console.log('普通文本回复加密encrypt：'+encrypt);
            var signature = newCrypto.getSignature(timeStamp,nonce,encrypt);
            var resdata = "<xml>\n" + "<Encrypt><![CDATA["+encrypt+"]]></Encrypt>\n"
                + "<MsgSignature><![CDATA["+signature+"]]></MsgSignature>\n"
                + "<TimeStamp>"+timeStamp+"</TimeStamp>\n" + "<Nonce><![CDATA["+nonce+"]]></Nonce>\n" + "</xml>";
            console.log('普通文本回复加密resdata：'+resdata);
            return resdata;

        }else if(content.substring(0, 15) == "QUERY_AUTH_CODE"){

            //接下来客服API再回复一次消息
            var auth_code = content.split(':')[1];

            var token = await getComponentAccessToken();
            var jsonRes = await new Promise(function (resolve, reject) {

                var data = JSON.stringify({
                    component_appid: this.appid,
                    authorization_code: auth_code
                });
                var options = {
                    hostname: 'api.weixin.qq.com',
                    path: "/cgi-bin/component/api_query_auth?component_access_token="+token,
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json; encoding=utf-8',
                        'Content-Length': Buffer.byteLength(data)
                    }
                };

                var req = https.request(options, function (res) {
                    console.log('STATUS: ' + res.statusCode);
                    console.log('HEADERS: ' + JSON.stringify(res.headers));
                    res.setEncoding('utf8');
                    res.on('data', function (chunk) {
                        console.log('BODY: ' + chunk);
                        resolve(JSON.parse(chunk));
                    });
                });
                req.on('error', function (e) {
                    console.log('problem with request: ' + e.message);
                    reject(new Error('http failed'));
                });
                req.write(data);
                req.end();
            });

            var msg = auth_code + "_from_api";

            var data = JSON.stringify({
                'touser': fromUserName,
                'msgtype': 'text',
                'text': {'content': msg}
            });
            var options = {
                hostname: 'api.weixin.qq.com',
                path: "/cgi-bin/message/custom/send?access_token="+jsonRes.authorization_info.authorizer_access_token,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json; encoding=utf-8',
                    'Content-Length': Buffer.byteLength(data)
                }
            };

            var req = https.request(options, function (res) {
                console.log('STATUS: ' + res.statusCode);
                console.log('HEADERS: ' + JSON.stringify(res.headers));
                res.setEncoding('utf8');
                res.on('data', function (chunk) {
                    console.log('BODY: ' + chunk);
                });
            });
            req.on('error', function (e) {
                console.log('problem with request: ' + e.message);
            });
            req.write(data);
            req.end();

            return "";
        }
    }
}

function async getComponentAccessToken(){

    var wxthirdModel = await this.getTokenObj();
    var verifyTicket = await this.getVerifyTicket();
    console.log('wxthirdModel.component_access_token_update_time: '+wxthirdModel.component_access_token_update_time+'   new Date().getTime(): '+new Date().getTime())
    if(wxthirdModel.component_access_token == null || new Date().getTime() > wxthirdModel.component_access_token_update_time){
        console.log('start https');
        var jsonRes = await new Promise(function (resolve, reject) {

            var data = JSON.stringify({
                component_appid: this.appid,
                component_appsecret: this.appsecret,
                component_verify_ticket: verifyTicket
            });
            var options = {
                hostname: 'api.weixin.qq.com',
                path: "/cgi-bin/component/api_component_token",
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json; encoding=utf-8',
                    'Content-Length': Buffer.byteLength(data)
                }
            };

            var req = https.request(options, function (res) {
                console.log('STATUS: ' + res.statusCode);
                console.log('HEADERS: ' + JSON.stringify(res.headers));
                res.setEncoding('utf8');
                res.on('data', function (chunk) {
                    console.log('BODY: ' + chunk);
                    resolve(JSON.parse(chunk));
                });
            });
            req.on('error', function (e) {
                console.log('problem with request: ' + e.message);
                reject(new Error('http failed'));
            });
            req.write(data);
            req.end();

        });
        console.log('end https');
        var expireTime = (new Date().getTime()) + (jsonRes.expires_in - 100) * 1000;
        console.log('model.t_wxthird_base.update component_access_token_update_time: '+expireTime);
        var newwxthirdModel = {
            component_access_token: jsonRes.component_access_token,
            component_access_token_update_time: expireTime
        }
        this.saveTokenObj(newwxthirdModel);

        return jsonRes.component_access_token;
    }
    return wxthirdModel.component_access_token;
}

module.exports = Wxthird;