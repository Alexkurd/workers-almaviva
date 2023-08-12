/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run "npm run dev" in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run "npm run deploy" to publish your worker
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

export default {
  async fetch(request, env, ctx) {
    await this.checkSite(env);//
    const status = await env.KV.get('Last');
    const last_auth = await env.KV.get('Last_auth');
    const last_dates = await env.KV.get('Last_dates');
    
    return new Response("Last check "+status + "\nLast auth " + last_auth + "\nLast dates " + last_dates);
  },

  async scheduled(event, env, ctx) {
    ctx.waitUntil(this.checkSite(env));
  },

  async auth(env) {
    console.log("Auth");
    let email = env.email;
    let password = env.password;

    const loginUrl = "https://ru.almaviva-visa.services/api/login";
    const loginInit = {
      headers: {
        "Accept": "application/json, text/plain, */*",
        "Accept-Language": "en-US,en;q=0.5",
        "Content-Type": "application/json",
        "Authorization": "Bearer",
		    Origin: "https://ru.almaviva-visa.services",
		    Referer: "https://ru.almaviva-visa.services/signin?returnUrl=%2Fappointment"
      },
      body: "{\"email\":\""+email+"\",\"password\":\""+password+"\"}",
      method: "POST",
    }
    console.log("Before Login");
    const loginResponse = await fetch(loginUrl, loginInit);
    console.log(loginResponse.status);
    const json_data = await loginResponse.json();
    await env.KV.put("Cookie", JSON.stringify(json_data), {expirationTtl: 8*60*60});
    await env.KV.put("Last_auth", new Date().toLocaleString('RU', {timeZone: "Europe/Moscow"}));
  },

  async checkSite(env){
      let cookie = await env.KV.get('Cookie', { type: "json" });
      if (cookie == null) {
        await this.auth(env);
        cookie = await env.KV.get('Cookie', { type: "json" });
        return false;
      }
      
      let month = "08";
      let persons = 1;
      const datesUrl = "https://ru.almaviva-visa.services/api/sites/disabled-dates/?start=01/08/2023&end=31/08/2023&siteId=16&persons="+persons;
      const dates = await fetch(datesUrl, {
      "headers": {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/116.0",
          "Accept": "application/json, text/plain, */*",
          "Accept-Language": "en-US,en;q=0.5",
          "Authorization": "Bearer "+ cookie.accessToken +"",
          "Sec-Fetch-Dest": "empty",
          "Sec-Fetch-Mode": "cors",
          "Sec-Fetch-Site": "same-origin",
          "Sec-GPC": "1",
          "Cookie": this.prepareCookie(cookie)
      },
      "method": "GET",
      });
      if (dates.status == 200) {
        env.KV.put('Last', dates.status +":"+ new Date().toLocaleString('RU', {timeZone: "Europe/Moscow"}));
        const json_dates = await dates.json();
        let availableDates = this.parseDates(json_dates, parseInt(month));
        console.log(availableDates);
        if (availableDates.length > 0) {
          this.notify(JSON.stringify(availableDates));
          await env.KV.put('Last_dates', availableDates, JSON.stringify(availableDates));
          return availableDates;
        }
      } else {
        env.KV.delete('Cookie');
        env.KV.put('Last', dates.status +":"+ new Date().toLocaleString('RU', {timeZone: "Europe/Moscow"}));
        this.auth(env);
      }
  },
  
  async notify(text) {
    if (text.length > 6 && text != null) {
      const result = await fetch(env.pushURL+encodeURI(text))
    }
  },

  parseDates(dates, month){
    month = month-1;
    var date = new Date(Date.UTC(2023, month, 0));
    var days = [];
    while (date.getUTCMonth() === month) {
      days.push(date.toISOString().substring(0, 10));
      date.setUTCDate(date.getUTCDate() + 1);
    }
    dates.forEach(function(item){
      days.splice(days.indexOf(item.date), 1);
    });
    return days;
  },

  prepareCookie(cookie) {
    var template = {
      "auth-token": cookie.accessToken, 
      "auth-user": JSON.stringify(cookie),
      "cookie-consent": true}
    let result = this.objectToCookieString(template);
    return result;
  },

   objectToCookieString(obj) {
    var cookies = [];
    for (var key in obj) {
      if (obj.hasOwnProperty(key)) {
        var cookie = encodeURIComponent(key) + "=" + encodeURIComponent(obj[key]);
        cookies.push(cookie);
      }
    }
    return cookies.join("; ");
  }
};
