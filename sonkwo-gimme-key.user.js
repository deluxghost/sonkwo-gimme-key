// ==UserScript==
// @name        Sonkwo Gimme Key
// @namespace   https://github.com/deluxghost/sonkwo-gimme-key
// @description 在线提取杉果序列号
// @author      deluxghost
// @include     https://www.sonkwo.com/*
// @icon        https://www.sonkwo.com/favicon.ico
// @version     20180712.2
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
    var css = [
        "#sgk_show_box {",
        "    padding: 10px 20px 0 20px;",
        "}",
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
        ".sgk_normal_button {",
        "    display: inline-block;",
        "    background-color: #487dd9;",
        "    color: white;",
        "    font-size: 13px;",
        "    border: 0;",
        "    border-radius: 2px;",
        "    padding: 1px 3px;",
        "}",
        ".sgk_normal_button:hover {",
        "    background-color: #5693fe;",
        "}",
        ".sgk_key_copy {",
        "    margin-left: 3px;",
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

function getToken(user, pass) {
    var tokens;
    $.ajax({
        url: '/api/sign_in.json?sonkwo_client=client&sonkwo_version=2.5.1.0517&locale=js',
        method: 'POST',
        async: false,
        contentType: 'application/json, text/plain, */*',
        data: '{"account":{"email_or_phone_number_eq":"' + user + '","password":"' + pass + '"},"_code":"","_key":""}',
        headers: {
            'Accept': 'application/vnd.sonkwo.v5+json'
        },
        complete: function (data) {
            if (data.status == '401') {
                tokens = 401;
                alert('登录失败！\n插件建议：检查用户名和密码是否正确，清除账号数据后重试。');
            } else {
                tokens = data.responseJSON;
            }
        }
    });
    return tokens;
}

/*function refresh() {
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
        alert('来自杉果的错误: ' + tokens.message + '\n插件建议：检查用户名和密码是否正确，清除账号数据后重试。');
    }
    update_login_ui();
}*/

function update() {
    var username = GM_getValue('username');
    var userpass = GM_getValue('password');
    if (!username) {
        username = prompt('请输入杉果账号');
        if (!username)
            return false;
        userpass = prompt('请输入密码');
        if (!userpass)
            return false;
    }
    var tokens = getToken(username, userpass);
    if (tokens.access_token) {
        GM_setValue('username', username);
        GM_setValue('password', userpass);
        GM_setValue('refresh_token', tokens.refresh_token);
        GM_setValue('access_token', tokens.access_token);
    } else {
        alert('来自杉果的错误: ' + tokens.message + '\n插件建议：检查用户名和密码是否正确，清除账号数据后重试。');
        return false;
    }
    update_login_ui();
}

function get_key() {
    var access_token = GM_getValue("access_token");
    var resp;
    if (!access_token) {
        if (update() !== false)
                getKey();
    } else {
        $.ajax({
            url: '/api/game_key.json',
            data: {
                'game_id': game_id,
                'sonkwo_client': 'client',
                'sonkwo_version': '2.5.1.0517',
                'from': 'client'
            },
            headers: {
                'Accept': 'application/vnd.sonkwo.v5+json',
                'Authorization': 'Bearer ' + access_token
            },
            method: 'GET',
            async: false,
            complete:
            function (data) {
                resp = data;
            }
        });
        var keys = resp.responseJSON;
        if (keys && keys.game_keys) {
            keys = keys.game_keys;
            $('#sgk_keybox').remove();
            $('#sgk_keyboxdown').remove();
            var keybox = $('<div id="sgk_keybox" style="display:none"></div>');
            for (var i = 0; i < keys.length; i++) {
                var key = keys[i];
                keybox.append('<div class="sgk_key_desc">' + key.type_desc + '</div>');
                keybox.append('<input type="button" class="sgk_normal_button sgk_key_copy" value="复制" />');
                keybox.append('<input type="text" class="sgk_key_text" readonly="readonly" onfocus="this.select();" value="' + key.code + '" />');
            }
            $('.btns-block').after(keybox);
            $('#sgk_keybox').after('<div id="sgk_keyboxdown" style="height:20px"></div>');
            $('.sgk_key_copy').click(function () {
                copy_key($(this));
            });
            keybox.slideDown();
        } else if (resp.status === 401) {
            if (update() !== false)
                getKey();
        } else {
            alert('提取失败！\n插件建议：\n 1. 首先重试一下\n 2. 检查该账号是否确实购买了此物品\n 3. 检查插件的账号与杉果登录的账号是否一致\n 4. 清除账号数据后重试\n如果一切尝试皆无效，请到插件原帖或者 GitHub 反馈。');
        }
    }
}

function clear_user() {
    if (!confirm('将会清除 SGK 插件存储的杉果账号数据。\n继续吗？'))
        return;
    GM_deleteValue('username');
    GM_deleteValue('password');
    GM_deleteValue('refresh_token');
    GM_deleteValue('access_token');
    update_login_ui();
}

function copy_key(copy) {
    var key = $(copy).next('.sgk_key_text').attr('value');
    $(copy).next('.sgk_key_text').select();
    GM_setClipboard(key);
}

function open_sgk() {
    var buttons = [
        '<div id="sgk_stored_acc" class="sgk_gameinfo_text">存储的账号: 未存储</div>',
        '<a id="sgk_get_key" class="add-cart active btn-common-css">登录提取序列号</a>',
        '<a id="sgk_clear_user" class="one-click active btn-common-css">清除账号数据</a>'
    ].join('\n');
    $('.game-sale-block.common-bg .btns-block').html(buttons);
    update_login_ui();
    $('#sgk_get_key').click(function () {
        get_key();
    });
    $('#sgk_clear_user').click(function () {
        clear_user();
    });
}

function add_toggle_button() {
    var show_buttons = [
        '<div id="sgk_show_box"><input type="button" class="sgk_normal_button sgk_open" value="如果已购买，点此提取激活码" /></div>'
    ].join('\n');
    $('.game-sale-block.common-bg .btns-block').before(show_buttons);
    $('#sgk_show_box').click(function () {
        if ($('#sgk_show_box .sgk_open').attr('value') == '如果已购买，点此提取激活码') {
            open_sgk();
            $('#sgk_show_box .sgk_open').attr('value', '刷新页面恢复购买按钮');
        } else {
            location.reload();
        }
    });
}

function update_login_ui() {
    var username = GM_getValue('username');
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

function update_version() {
    if (GM_getValue('user_name')) {
        GM_setValue('username', GM_getValue('user_name'));
        GM_setValue('password', GM_getValue('user_pwd'));
        GM_deleteValue('user_name');
        GM_deleteValue('user_pwd');
    }
}


$(function () {
    update_version();
    setCSS();
    var mainFunc = function () {
        remove_client();
        if ($('.tag-list .brief-info-placeholder').text().trim() == '')
            $('.tag-list .brief-info-placeholder').remove();
        $('.new-order-complete-action-block .right.btn').remove();
        if (!location.href.match('^https:\/\/www\.sonkwo\.com\/products\/.'))
            return;
        product_id = /products\/(\d*)/.exec(location.href)[1];
        game_id = /game_id=(\d*)/.exec(location.href);
        if (game_id === null)
            game_id = product_id;
        else
            game_id = game_id[1];
        var purchased = $('.btn-common-css.already-pur');
        if (!$('#sgk_get_key').length && !$('#sgk_show_box').length || purchased.length) {
            if (purchased.length) {
                $('#sgk_show_box').remove();
                open_sgk();
            } else {
                add_toggle_button();
            }
        }
        var warn_icon = '<i class="sgk_warning_icon fa fa-exclamation-triangle"></i> ';
        if (!$('#sgk_chn_warning').length && !check_chinese()) {
            $('.game-sale-block .tag-list').after('<div id="sgk_chn_warning" class="sgk_warning_text">' + warn_icon + '不支持中文语言</div>');
        }
        if (!$('#sgk_cantunredeem_warning').length && $('.new-content-left').text().search('不支持反激活') >= 0) {
            $('.game-sale-block .tag-list').after('<div id="sgk_cantunredeem_warning" class="sgk_warning_text">' + warn_icon + '不支持反激活</div>');
        }
        if (!$('#sgk_securom_warning').length && $('.new-content-left').text().search('【激活】 游戏为Securom加密') >= 0) {
            var max_redeem = /(\d*)台计算机激活/.exec($('.new-content-left').text());
            var max_redeem_str = '';
            if (max_redeem !== null)
                max_redeem_str = ' (×' + max_redeem[1] + ')';
            $('.game-sale-block .tag-list').after('<div id="sgk_securom_warning" class="sgk_warning_text">' + warn_icon + 'Securom 加密' + max_redeem_str + '</div>');
        }
        if (!$('#sgk_steam_warning').length && $('.new-content-left').text().search('【激活】 Steam平台安装激活') < 0) {
            var platform = '可能非 Steam 激活';
            if ($('.new-content-left').text().search('【激活】 Uplay平台安装激活') >= 0)
                platform = 'Uplay 激活';
            $('.game-sale-block .tag-list').after('<div id="sgk_steam_warning" class="sgk_warning_text">' + warn_icon + platform + '</div>');
        }
    }
    var mainLoop = setInterval(mainFunc, 1200);
    var fireOnHashChangesToo = true;
    var pageURLCheckTimer = setInterval(
        function () {
            if (this.lastPathStr !== location.pathname
                || this.lastQueryStr !== location.search
                || (fireOnHashChangesToo && this.lastHashStr !== location.hash)
               ) {
                this.lastPathStr = location.pathname;
                this.lastQueryStr = location.search;
                this.lastHashStr = location.hash;
                clearInterval(mainLoop);
                $('#sgk_keybox').remove();
                $('#sgk_keyboxdown').remove();
                $('.sgk_warning_text').remove();
                mainLoop = setInterval(mainFunc, 1200);
            }
        }, 200);
});
