// ==UserScript==
// @name        Sonkwo Gimme Key
// @namespace   https://github.com/deluxghost/sonkwo-gimme-key
// @description 在线提取杉果序列号
// @author      deluxghost
// @include     https://www.sonkwo.com/*
// @icon        https://www.sonkwo.com/favicon.ico
// @version     20180213.1
// @run-at      document-end
// @require     http://libs.baidu.com/jquery/1.10.1/jquery.min.js
// @grant       GM_xmlhttpRequest
// @grant       GM_getValue
// @grant       GM_setValue
// @grant       GM_deleteValue
// ==/UserScript==

var product_id = null,
game_id = null;

function getToken(j) {
    var ret;
    jQuery.ajax({
        url: "/oauth2/token.json",
        method: "POST",
        async: false,
        contentType: "application/json, text/plain, */*",
        data: j,
        complete: function (d) {
            if (d.status == '401') {
                ret = 401;
            } else
                ret = d.responseJSON;
        }
    });
    return ret;
}

function refresh() {
    var rt = GM_getValue("refresh_token");
    var j = getToken(JSON.stringify({
		'grant_type': 'refresh_token',
		'refresh_token': rt
	}));
    if (j == 401) {
        if (update() === false)
            return false;
        refresh();
    } else if (j.access_token) {
        GM_setValue("refresh_token", j.refresh_token);
        GM_setValue("access_token", j.access_token);
    } else
        alert(j.message);
    var login_info = GM_getValue('user_name') ? GM_getValue('user_name') : '未存储';
    jQuery('#stored_acc').text('存储的账号: ' + login_info);
    if (GM_getValue('user_name')) {
        jQuery('#get_serial_number').text('点击提取序列号');
    }
}

function update() {
    var un = GM_getValue("user_name");
    var up = GM_getValue("user_pwd");
    if (!un) {
        un = prompt("请输入杉果账号");
        up = prompt("请输入密码");
    }
    if (!un) {
        return false;
    }
    var j = getToken(JSON.stringify({
		'grant_type': 'password',
		'login_name': un,
		'password': up,
		'type': 'client'
	}));
    if (j.access_token) {
        GM_setValue("user_name", un);
        GM_setValue("user_pwd", up);
        GM_setValue("refresh_token", j.refresh_token);
        GM_setValue("access_token", j.access_token);
    } else {
        if (confirm(j.message)) {
            un = prompt("请输入杉果账号");
            up = prompt("请输入密码");
            GM_setValue("user_name", un);
            GM_setValue("user_pwd", up);
            update();
        } else {
            return false;
        }
    }
}

function getKey() {
    var at = GM_getValue("access_token");
    var rep;
    if (!at) {
        refresh();
    } else {
        jQuery.ajax({
            url: "https://www.sonkwo.com/api/game_key.json",
            data: {
                'game_id': game_id,
                'access_token': at
            },
            mthod: 'get',
            async: false,
            complete: function (data) {
                if (data.status == 401)
                    refresh();
                rep = data;
            }
        });
        var keys = rep.responseJSON;
        if (keys.game_keys) {
            keys = keys.game_keys;
            jQuery('#serial_number').remove();
            var div = jQuery('<div id="serial_number" style="display:none;background-color:#292e41;color:#b9c0ef;height:initial;width:initial;margin:10px 20px 0 20px;padding:2px 5px 5px 5px;border-radius:2px;"></div>');
            for (var i = 0; i < keys.length; ++i) {
                var d = keys[i];
                div.append('<div style="margin-bottom:2px;font-size:14px">' + d.type_desc + '</div>');
                div.append('<input type="text" style="width:100%;font-size:16px;color:#7a80a2;background-color:#31374e;border:0;border-radius:2px" readonly="readonly" onmouseover="this.select();" value="' + d.code + '" /> ');
            }
            jQuery('.btns-block').after(div);
            div.slideDown();
        } else if (rep.status === 401) {
            if (refresh() !== false)
                getKey();
        } else
            alert(keys.message);
    }
}

function clear() {
    if (!confirm("清除账号数据？"))
        return;
    GM_deleteValue("user_name");
    GM_deleteValue("user_pwd");
    GM_deleteValue("refresh_token");
    GM_deleteValue("access_token");
    jQuery('#stored_acc').text('存储的账号: 未存储');
    jQuery('#get_serial_number').text('登录提取序列号');
    alert("已清除");
}

jQuery(function () {
    window.setInterval(function () {
        if (!location.href.match('^https:\/\/www\.sonkwo\.com\/products\/.'))
            return;
        product_id = /products\/(\d*)/.exec(location.href)[1];
        game_id = /game_id=(\d*)/.exec(location.href);
        if (game_id === null)
            game_id = product_id;
        else
            game_id = game_id[1];
        var o = jQuery("div.btn-common-css.already-pur");
        if (o.length && !jQuery('#get_serial_number').length) {
            var login_info = GM_getValue('user_name') ? GM_getValue('user_name') : '未存储';
            o.replaceWith('<div id="stored_acc" style="color:#7a80a2;margin-bottom:3px">存储的账号: '+login_info+'</div><a id="get_serial_number" class="add-cart active btn-common-css" title="已拥有" style="">点击提取序列号</a> <a id="clear_user" class="one-click active btn-common-css" style="">清除账号数据</a>');
            if (!GM_getValue('user_name')) {
                jQuery('#get_serial_number').text('登录提取序列号');
            }
            jQuery('#get_serial_number').click(function () {
                getKey();
            });
            jQuery('#clear_user').click(function () {
                clear();
            });
        }
        if (jQuery('.system-tab-content').text().search('【Steam】本游戏运行需通过') <= 0 && !jQuery('.game-sale-block.common-bg span.my-evaluation.my-evaluation-title').length) {
            jQuery('.game-sale-block .tag-list').after(' <span class="my-evaluation my-evaluation-title" style="color:#ff6900;font-size:24px;font-weight:bold;margin-top:3px">注意：可能非Steam激活</span>');
        }
    }, 3000);
});
