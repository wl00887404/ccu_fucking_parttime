const fetch = require("node-fetch")
const url = require("url")
const clc = require('cli-color');
Array.prototype.head = function () {
    return this[0]
}
class fetchWithCookie {
    constructor() {
        this.cookieStore = {}
        this.history = []
        this.redirectTimes = 0

    }
    get(host, name) {
        host = url
            .parse(host)
            .host

        let target = this
            .cookieStore[host]
            .split(';')
            .map(c => c.trim())
            .find(c => c.split("=").head() == name)

        return target !== undefined
            ? target.slice(name.length + 1)
            : target
    }
    async fetch(target, opt = {}) {
        console.log(clc.yellow("fetch " + `"${target}"`))
        let cookie
        let host = url
            .parse(target)
            .host

        switch (opt.credentials) {
            case "same-origin":
                if (this.cookieStore[host] === undefined) {
                    this.cookieStore[host] = ""
                }
                cookie = this.cookieStore[host]
                break;
            case "include":
            default:
                break;
        }
        if (!opt.headers) {
            opt.headers = {}
        }
        opt.headers.cookie = cookie
        opt.redirect = 'manual'
        let res = await fetch(target, opt).then(res => {
            //setCookie
            if (res.headers.has("Set-Cookie")) {
                this.cookieStore[host] += res
                    .headers
                    .get("Set-Cookie")
            }
            return res
        })

        //redirect
        let statusCode = res.status
        if (statusCode === 303 || ((statusCode === 301 || statusCode === 302) && opt.method === 'POST')) {

            let next
            opt.method = 'GET';
            delete opt.body;
            delete opt.headers['content-length'];
            if (res.headers.has("Location")) {
                next = url.resolve(target, res.headers.get("Location"))
            } else {
                throw "miss Location"
            }
            if (this.redirectTimes <= 5) {
                res = await this.fetch(next, opt)
            } else {
                throw "redirection to much times"
            }

        }
        this
            .history
            .push(res.url)
        return res
    }
    nowUrl() {
        return this.history[this.history.length - 1]
    }
}

module.exports = fetchWithCookie
