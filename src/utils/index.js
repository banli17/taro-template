import Taro from "@tarojs/taro";

const {windowWidth, windowHeight} = Taro.getSystemInfoSync()


export {
    windowWidth,
    windowHeight
}

export {http_get, http_post} from './http'


export {buildCdnPath} from './url'
