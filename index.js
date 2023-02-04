const qs = require('qs')
const { writeFileSync, existsSync, readFileSync } = require('fs')
const fetch = require('fetch')
const { join } = require('path')


const CONFIG_FILENAME = '.env'
const CONFIG_FILEPATH = join(__dirname, CONFIG_FILENAME)

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.45 Safari/537.36'
const CONTENT_TYPE = 'application/x-www-form-urlencoded'
const CONTENT_TYPE_XML = 'application/ssml+xml'

var config
var cookies;

function loadConfig() {
  let exist = existsSync(CONFIG_FILEPATH)
  if (exist) {
    try {
      var configStr = readFileSync(CONFIG_FILEPATH)
      config = JSON.parse(configStr)
    } catch (error) {
      config = {}
    }
  }
  if (config && config['ig'] && config['iid'] && config['token']) {
    cookies = config.cookies
    return config;
  }
  return getRequestParams()
}

function setConfig(param, value) {
  if (!config) config = {}
  config[param] = value
  writeFileSync(CONFIG_FILEPATH, JSON.stringify(config, null, 2))
}


/**
 * 获取请求参数
 * @returns 
 */
function getRequestParams() {
  if (config) {
    let tokenTime = config.token[0]
    let expires = config.token[2]
    if (Date.now() - tokenTime < expires) {
      return Promise.resolve(config)
    }
  }
  return new Promise((resolve, reject) => {
    const url = 'https://cn.bing.com/translator'
    fetch.fetchUrl(url, function(error, meta, body) {
      var responseText = Buffer.from(body).toString();
      let ig = responseText.match(/IG:"([^"]+)"/)[1]
      let iid = responseText.match(/data-iid="([^"]+)"/)[1]
      var tokenStr = responseText.match(/params_AbusePreventionHelper\s?=\s?([^\]]+\])/g)[0].replace(/params_AbusePreventionHelper|\=/g, '')
      let token = JSON.parse(tokenStr)

      cookies = meta.responseHeaders['set-cookie']

      setConfig('ig', ig)
      setConfig('iid', iid)
      setConfig('count', 0)
      setConfig('token', token)
      setConfig('cookies', cookies)

      resolve(config)
    })
  })
}

/**
 * 
 * @returns 
 */
function getRequertParamsUrl() {
  setConfig('count', ++config.count)
  return `&IG=${config.ig}&IID=${config.iid}.${config.count}`
}

/**
 * Token
 */
function getSpeechToken() {
  if (config && config.token && config.token.length == 4 && config.authorization) {
    let tokenTime = config.token[0]
    if ((Date.now() - tokenTime) / 10 < config.authorization.expiryDurationInMS) {
      return Promise.resolve(config.authorization)
    }
  }
  return new Promise((resolve, reject) => {
    getRequestParams().then(res => {
      const url = `https://cn.bing.com/tfetspktok?isVertical=1&${getRequertParamsUrl()}`
      fetch.fetchUrl(url, {
        method: 'POST',
        headers: {
          'user-agent': USER_AGENT,
          'content-type': CONTENT_TYPE,
        },
        cookie: cookies,
        payload: qs.stringify({
          token: config.token[1],
          key: config.token[0]
        })
      },
        function(error, meta, body) {
          let responseStr = Buffer.from(body).toString()
          setConfig('authorization', JSON.parse(responseStr))
          resolve(config.authorization)
        }
      )
    });
  });
}

/**
 * 翻译
 * zh-CN / en
 * @param {string} text 
 * @param {string} to   
 * @param {string} from 
 * @returns 
 */

function translate(text, to = "en", from = "auto-detect") {
  return new Promise((resolve, reject) => {
    getRequestParams().then(res => {
      const url = `https://cn.bing.com/ttranslatev3?isVertical=1&${getRequertParamsUrl()}`
      fetch.fetchUrl(url, {
        method: 'POST',
        headers: {
          'user-agent': USER_AGENT,
          'content-type': CONTENT_TYPE,
        },
        cookie: config.cookies,
        payload: qs.stringify({
          fromLang: from,
          text: text,
          to: to,
          token: config.token[1],
          key: config.token[0],
        })
      },
        function(error, meta, body) {
          if (error || meta.status != 200) {
            reject(error || meta)
          }
          let responseStr = Buffer.from(body).toString()
          let response = JSON.parse(responseStr)
          if (response.statusCode === 205) {
            reject("无效的token")
          }
          else {
            resolve({
              source: text,
              text: response[0].translations[0].text,
              to: response[0].translations[0].to,
              language: response[0].detectedLanguage.language,
              inputTransliteration: response[1].inputTransliteration
            })
          }
        }
      )

    })
  })
}

/**
 *  xml
 *  <speak version='1.0' xml:lang='" + r + "'><voice xml:lang='" + r + "' xml:gender='" + u + "' name='" + f + "'><prosody rate='" + c + "'>" + n + "<\/prosody><\/voice><\/speak>
 * @param {string} text 
 * @returns 
 */
function speechXml(text) {
  return `<speak version='1.0' xml:lang='zh-CN'><voice xml:lang='zh-CN' xml:gender='Female' name='zh-CN-XiaoxiaoNeural'><prosody rate='-20.00%'>${text}</prosody></voice></speak>`
}

/**
 * tts
 * @param {string} text 
 * @returns 
 */
function speech(text, outType = 'base64') {
  return new Promise((resolve, reject) => {
    getSpeechToken().then(res => {
      const url = `https://southeastasia.tts.speech.microsoft.com/cognitiveservices/v1?`
      fetch.fetchUrl(url, {
        method: 'POST',
        headers: {
          'user-agent': USER_AGENT,
          'content-type': CONTENT_TYPE_XML,
          'authorization': `Bearer ${config.authorization.token}`,
          'x-microsoft-outputformat': 'audio-16khz-32kbitrate-mono-mp3'
        },
        cookie: cookies,
        payload: speechXml(text)
      },
        function(error, meta, body) {
          if (error || meta.status != 200) {
            reject(error || meta)
          }
          if (outType === 'base64') {
            let base64 = Buffer.from(body).toString('base64')
            resolve(`data:audio/mp3;base64,${base64}`)
          }
          else {
            resolve(Buffer.from(body))
          }
        }
      )

    })
  })

}


loadConfig()

module.exports = {
  translate,
  speech
}