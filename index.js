const cheerio = require('cheerio')
const urlModule = require("url")
const fetchWithCookie = require("./fetch.cookie.js")

class Time {
    constructor(time) {
        this.hr = Math.floor(time / 100)
        this.min = time % 100
        this.time = this.hr * 60 + this.min
    }
}

class During {
    constructor(start, end) {
        start = new Time(start)
        end = new Time(end)
        if (start.time > end.time) {
            throw new Error("end Time MUST be bigger then start")
        }
        Object.assign(this, {start, end})
    }
    conflict(target) {
        const start1 = this.start.time
        const end1 = this.end.time
        
        if (target instanceof Time) {
            const {time} = target
            if (start1 <= time && time <= end1) {
                return true
            }
        } else if (target instanceof During) {
            const start2 = target.start.time
            const end2 = target.end.time
            if (!(end2 <= start1 || end1 <= start2)) {
                return true
            }
        } else {
            throw new Error("args MUST be instanceof Time or During ")
        }
        return false
    }
    toString() {
        const {start, end} = this
        return `shour=${start.hr}&smin=${start.min}&ehour=${end.hr}&emin=${end.min}`
    }
}

const type = require('./type.json')

const user = {
    account: "403530003",
    password: ""
}


const target = {
    year: 106,
    month: 10,
    day: 14,
    type: type["輔導中心"],
    doWhat: "生活輔導及學習適應活動活動推廣報名系統相關維護及學習",
    workingHours: 26
}


const availableTime = {
    "1": [
        new During(1200, 1600),
        new During(1700, 2100)
    ],
    "3": [
        new During(1200, 1600),
        new During(1700, 2100)
    ],
    "5": [
        new During(1200, 1600),
        new During(1700, 2100)
    ]
}

const main = async() => {
    const session = new fetchWithCookie()
    const {account, password} = user
    const credentials = "same-origin"
    let  {year, month, day, type, doWhat} = target

    await session.fetch(`http://mis.cc.ccu.edu.tw/parttime/index.php`, {credentials})
    await session.fetch(`http://mis.cc.ccu.edu.tw/parttime/control.php`, {
        method: 'POST',
        body: `staff_cd=${account}&passwd=${password}`,
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        credentials
    })
    await session.fetch(`http://mis.cc.ccu.edu.tw/parttime/control2.php`, {credentials})
    await session.fetch(`http://mis.cc.ccu.edu.tw/parttime/main2.php`, {credentials})
    const sid = session.get(`http://mis.cc.ccu.edu.tw/`, `PHPSESSID`)

    let pending = []
    let {workingHours} = target
    while (workingHours > 0) {
        const week = new Date(year+1911, month - 1, day).getDay()
        let todayAvailableTime=availableTime[week]||[]

        for(let i=0;i<todayAvailableTime.length;i++){
            let during=todayAvailableTime[0]
        }
        todayAvailableTime.forEach(during=>{
            if(workingHours<0){
                return 
            }
            else if (workingHours < 4) {
                during = new During(during.start.time, during.start.time + workingHours * 100)
            }
            
            workingHours -= 4
           
            let fetching=session.fetch(`http://mis.cc.ccu.edu.tw/parttime/next.php`, {
                method: 'POST',
                body: `yy=${year}&mm=${month}&dd=${day}&type=${type}&workin=${doWhat}&sid=${sid}&${during.toString()}`,
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                credentials
            })
            pending.push(fetching)
        })
        day+=1
    }
    await Promise.all(pending)
    await session.fetch(`http://mis.cc.ccu.edu.tw/parttime/todb.php`, {credentials})
}

main()