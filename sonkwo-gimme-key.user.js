// ==UserScript==
// @name        Sonkwo Gimme Key
// @namespace   https://github.com/deluxghost/sonkwo-gimme-key
// @description 在线提取杉果序列号
// @author      deluxghost
// @include     https://www.sonkwo.com/*
// @icon        https://www.sonkwo.com/favicon.ico
// @version     20180213.2
// @run-at      document-end
// @require     https://apps.bdimg.com/libs/jquery/2.1.4/jquery.min.js
// @grant       GM_xmlhttpRequest
// @grant       GM_getValue
// @grant       GM_setValue
// @grant       GM_deleteValue
// ==/UserScript==

var product_id = null,
game_id = null;

function setCSS() {
    css = [
        "#sgk_keybox {",
        "    background-color: #292e41;",
        "    color: #b9c0ef;",
        "    margin: 10px 20px 0 20px;",
        "    padding: 2px 5px 5px 5px;",
        "    border-radius: 2px;",
        "}",
        ".sgk_key_desc {",
        "    font-size: 14px;",
        "    margin-bottom: 2px;",
        "}",
        ".sgk_key_text {",
        "    width: 100%;",
        "    font-size: 16px;",
        "    background-color: #31374e;",
        "    color: #7a80a2;",
        "    border: 0;",
        "    border-radius: 2px;",
        "}",
        ".sgk_gameinfo_text {",
        "    color: #7a80a2;",
        "    margin-bottom: 3px;",
        "}",
        ".sgk_steam_warning {",
        "    padding: 20px;",
        "    color: #ff6900;",
        "    font-size: 24px;",
        "    font-weight: bold;",
        "    margin-top: 3px;",
        "    margin-bottom: 5px;",
        "}"
    ].join('\n');
    if (typeof GM_addStyle != "undefined") {
		GM_addStyle(css);
	} else if (typeof PRO_addStyle != "undefined") {
		PRO_addStyle(css);
	} else if (typeof addStyle != "undefined") {
		addStyle(css);
	} else {
		var node = document.createElement("style");
		node.type = "text/css";
		node.appendChild(document.createTextNode(css));
		var heads = document.getElementsByTagName("head");
		if (heads.length > 0) {
			heads[0].appendChild(node);
		} else {
			document.documentElement.appendChild(node);
		}
	}
}

function getToken(j) {
    var ret;
    jQuery.ajax({
        url: '/oauth2/token.json',
        method: 'POST',
        async: false,
        contentType: 'application/json, text/plain, */*',
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
    var rt = GM_getValue('refresh_token');
    var j = getToken(JSON.stringify({
		'grant_type': 'refresh_token',
		'refresh_token': rt
	}));
    if (j == 401) {
        if (update() === false)
            return false;
        refresh();
    } else if (j.access_token) {
        GM_setValue('refresh_token', j.refresh_token);
        GM_setValue('access_token', j.access_token);
    } else
        alert(j.message);
    var login_info = GM_getValue('user_name') ? GM_getValue('user_name') : '未存储';
    jQuery('#sgk_stored_acc').text('存储的账号: ' + login_info);
    if (GM_getValue('user_name')) {
        jQuery('#sgk_get_key').text('点击提取序列号');
    }
}

function update() {
    var un = GM_getValue('user_name');
    var up = GM_getValue('user_pwd');
    if (!un) {
        un = prompt('请输入杉果账号');
        up = prompt('请输入密码');
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
        GM_setValue('user_name', un);
        GM_setValue('user_pwd', up);
        GM_setValue('refresh_token', j.refresh_token);
        GM_setValue('access_token', j.access_token);
    } else {
        if (confirm(j.message)) {
            un = prompt('请输入杉果账号');
            up = prompt('请输入密码');
            GM_setValue('user_name', un);
            GM_setValue('user_pwd', up);
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
            url: 'https://www.sonkwo.com/api/game_key.json',
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
            jQuery('#sgk_keybox').remove();
            var div = jQuery('<div id="sgk_keybox" style="display:none"></div>');
            for (var i = 0; i < keys.length; ++i) {
                var d = keys[i];
                div.append('<div class="sgk_key_desc">' + d.type_desc + '</div>');
                div.append('<input type="text" class="sgk_key_text" readonly="readonly" onmouseover="this.select();" value="' + d.code + '" /> ');
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
    if (!confirm('清除账号数据？'))
        return;
    GM_deleteValue('user_name');
    GM_deleteValue('user_pwd');
    GM_deleteValue('refresh_token');
    GM_deleteValue('access_token');
    jQuery('#sgk_stored_acc').text('存储的账号: 未存储');
    jQuery('#sgk_get_key').text('登录提取序列号');
    alert("已清除");
}

jQuery(function () {
    setCSS();
    window.setInterval(function () {
        if (!location.href.match('^https:\/\/www\.sonkwo\.com\/products\/.'))
            return;
        product_id = /products\/(\d*)/.exec(location.href)[1];
        game_id = /game_id=(\d*)/.exec(location.href);
        if (game_id === null)
            game_id = product_id;
        else
            game_id = game_id[1];
        var o = jQuery('div.btn-common-css.already-pur');
        if (o.length && !jQuery('#sgk_get_key').length) {
            var login_info = GM_getValue('user_name') ? GM_getValue('user_name') : '未存储';
            o.replaceWith('<div id="sgk_stored_acc" class="sgk_gameinfo_text">存储的账号: '+login_info+'</div><a id="sgk_get_key" class="add-cart active btn-common-css" title="已拥有" style="">点击提取序列号</a> <a id="sgk_clear_user" class="one-click active btn-common-css" style="">清除账号数据</a>');
            if (!GM_getValue('user_name')) {
                jQuery('#sgk_get_key').text('登录提取序列号');
            }
            jQuery('#sgk_get_key').click(function () {
                getKey();
            });
            jQuery('#sgk_clear_user').click(function () {
                clear();
            });
        }
        if (jQuery('.system-tab-content').text().search('【Steam】本游戏运行需通过') <= 0 && !jQuery('.sgk_steam_warning').length) {
            jQuery('.game-sale-block .tag-list').after('<span class="sgk_steam_warning">注意：可能非Steam激活</span>');
        }
    }, 3000);
});
