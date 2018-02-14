// ==UserScript==
// @name        Sonkwo Gimme Key
// @namespace   https://github.com/deluxghost/sonkwo-gimme-key
// @description 在线提取杉果序列号
// @author      deluxghost
// @include     https://www.sonkwo.com/*
// @icon        https://www.sonkwo.com/favicon.ico
// @version     20180213.5
// @run-at      document-end
// @require     https://apps.bdimg.com/libs/jquery/2.1.4/jquery.min.js
// @grant       GM_xmlhttpRequest
// @grant       GM_getValue
// @grant       GM_setValue
// @grant       GM_deleteValue
// @grant       GM_setClipboard
// ==/UserScript==

var product_id = null,
    game_id = null,
    client_removed = false;

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
        "    display: inline-block;",
        "    font-size: 14px;",
        "    margin-bottom: 2px;",
        "}",
        ".sgk_key_copy {",
        "    display: inline-block;",
        "    background-color: #487dd9;",
        "    color: white;",
        "    font-size: 13px;",
        "    border: 0;",
        "    border-radius: 2px;",
        "    padding: 1px 3px;",
        "    margin-left: 3px;",
        "}",
        ".sgk_key_copy:hover {",
        "    background-color: #5693fe;",
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
        "    font-size: 14px;",
        "    margin-bottom: 4px;",
        "}",
        ".sgk_warning_text {",
        "    padding-left: 20px;",
        "    color: #ff6900;",
        "    font-size: 24px;",
        "    font-weight: bold;",
        "    margin-top: 3px;",
        "    margin-bottom: 5px;",
        "}",
        ".sgk_warning_icon {",
        "    font-size: 22px;",
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

function getToken(jsondata) {
    var tokens;
    $.ajax({
        url: '/oauth2/token.json',
        method: 'POST',
        async: false,
        contentType: 'application/json, text/plain, */*',
        data: jsondata,
        complete: function (data) {
            if (data.status == '401') {
                tokens = 401;
            } else {
                tokens = data.responseJSON;
            }
        }
    });
    return tokens;
}

function refresh() {
    var refresh_token = GM_getValue('refresh_token');
    var tokens = getToken(JSON.stringify({
        'grant_type': 'refresh_token',
        'refresh_token': refresh_token
    }));
    if (tokens == 401) {
        if (update() === false)
            return false;
        return refresh();
    } else if (tokens.access_token) {
        GM_setValue('refresh_token', tokens.refresh_token);
        GM_setValue('access_token', tokens.access_token);
    } else {
        alert('错误: ' + tokens.message);
    }
    update_login_ui();
}

function update() {
    var username = GM_getValue('user_name');
    var userpass = GM_getValue('user_pwd');
    if (!username) {
        username = prompt('请输入杉果账号');
        if (!username)
            return false;
        userpass = prompt('请输入密码');
        if (!userpass)
            return false;
    }
    var tokens = getToken(JSON.stringify({
		'grant_type': 'password',
		'login_name': username,
		'password': userpass,
		'type': 'client'
	}));
    if (tokens.access_token) {
        GM_setValue('user_name', username);
        GM_setValue('user_pwd', userpass);
        GM_setValue('refresh_token', tokens.refresh_token);
        GM_setValue('access_token', tokens.access_token);
    } else {
        alert('错误: ' + tokens.message);
        return false;
    }
}

function get_key() {
    var access_token = GM_getValue("access_token");
    var resp;
    if (!access_token) {
        refresh();
    } else {
        $.ajax({
            url: '/api/game_key.json',
            data: {
                'game_id': game_id,
                'access_token': access_token
            },
            method: 'GET',
            async: false,
            complete: function (data) {
                if (data.status == 401)
                    refresh();
                resp = data;
            }
        });
        var keys = resp.responseJSON;
        if (keys.game_keys) {
            keys = keys.game_keys;
            $('#sgk_keybox').remove();
            var keybox = $('<div id="sgk_keybox" style="display:none"></div>');
            for (var i = 0; i < keys.length; i++) {
                var key = keys[i];
                keybox.append('<div class="sgk_key_desc">' + key.type_desc + '</div>');
                keybox.append('<input type="button" class="sgk_key_copy" value="复制" />');
                keybox.append('<input type="text" class="sgk_key_text" readonly="readonly" onfocus="this.select();" value="' + key.code + '" />');
            }
            $('.btns-block').after(keybox);
            $('.sgk_key_copy').click(function () {
                copy_key($(this));
            });
            keybox.slideDown();
        } else if (resp.status === 401) {
            if (refresh() !== false)
                getKey();
        } else {
            alert('错误: ' + keys.message);
        }
    }
}

function clear_user() {
    if (!confirm('将会清除 SGK 插件存储的杉果账号数据。\n继续吗？'))
        return;
    GM_deleteValue('user_name');
    GM_deleteValue('user_pwd');
    GM_deleteValue('refresh_token');
    GM_deleteValue('access_token');
    update_login_ui();
}

function copy_key(copy) {
    var key = $(copy).next('.sgk_key_text').attr('value');
    $(copy).next('.sgk_key_text').select();
    GM_setClipboard(key);
}

function update_login_ui() {
    var username = GM_getValue('user_name');
    if (username) {
        $('#sgk_stored_acc').text('存储的账号: ' + username);
        $('#sgk_get_key').text('点击提取序列号');
    } else {
        $('#sgk_stored_acc').text('存储的账号: 未存储');
        $('#sgk_get_key').text('登录提取序列号');
    }
}

function remove_client() {
    if (client_removed)
        return;
    var navs = $('.SK-header-nav .item a');
    for (var i = 0; i < navs.length; i++) {
        var nav = $(navs[i]);
        if (nav.text() == '客户端' && nav.parent().attr('class') == 'item') {
            nav.remove();
            client_removed = true;
            break;
        }
    }
}

function check_chinese() {
    var lang = $('.game-language .item-content .item a');
    for (var i = 0; i < lang.length; i++) {
        var tag = $(lang[i]);
        if (tag.text().indexOf('中文') !== -1)
            return true;
    }
    return false;
}

$(function () {
    setCSS();
    window.setInterval(function () {
        remove_client();
        if (!location.href.match('^https:\/\/www\.sonkwo\.com\/products\/.'))
            return;
        product_id = /products\/(\d*)/.exec(location.href)[1];
        game_id = /game_id=(\d*)/.exec(location.href);
        if (game_id === null)
            game_id = product_id;
        else
            game_id = game_id[1];
        var purchased = $('div.btn-common-css.already-pur');
        if (purchased.length && !$('#sgk_get_key').length) {
            var buttons = [
                '<div id="sgk_stored_acc" class="sgk_gameinfo_text">存储的账号: 未存储</div>',
                '<a id="sgk_get_key" class="add-cart active btn-common-css">登录提取序列号</a>',
                '<a id="sgk_clear_user" class="one-click active btn-common-css">清除账号数据</a>'
            ].join('\n');
            purchased.replaceWith(buttons);
            update_login_ui();
            $('#sgk_get_key').click(function () {
                get_key();
            });
            $('#sgk_clear_user').click(function () {
                clear_user();
            });
        }
        var warn_icon = '<i class="sgk_warning_icon fa fa-exclamation-triangle"></i> ';
        if ($('.system-tab-content').text().search('【Steam】本游戏运行需通过') <= 0 && !$('#sgk_steam_warning').length) {
            $('.game-sale-block .tag-list').after('<div id="sgk_steam_warning" class="sgk_warning_text">' + warn_icon + '可能非 Steam 激活</div>');
        }
        if (!check_chinese() && !$('#sgk_chn_warning').length) {
            $('.game-sale-block .tag-list').after('<div id="sgk_chn_warning" class="sgk_warning_text">' + warn_icon + '不支持中文语言</div>');
        }
    }, 3000);
});
