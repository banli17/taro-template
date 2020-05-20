import Taro from '@tarojs/taro'

let host = 'https://www.banli17.com/api/guess'
// host = 'http://localhost:9000'

// let host = process.env.NODE_ENV !== 'development' ? 'https://www.banli17.com' : 'http://192.168.1.59:5000'

function http_factory(method) {
    return async (url, data) => {
        url = url.includes('http') ? url : (host + url)
        return new Promise((resolve, reject) => {
            Taro.request({
                url,
                method,
                data
            }).then((res) => {
                resolve(res.data)
            }).catch(err => {
                reject(err)
            })
        })
    }
}

export const http_get = http_factory('GET')
export const http_post = http_factory('POST')
