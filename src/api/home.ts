import {http_get} from "../utils";

const API = {
    dreamCategory: '/dream/category',
    dreamDetail: '/dream/detail',
    laohuanglid: '/laohuangli/d',
    laohuanglih: '/laohuangli/h',
    yunshi: '/constellation/getAll',
    qqevaluate: '/qqevaluate/qq',
    todayOnhistory: '/todayOnhistory/queryEvent.php',
    todayOnhistoryDetail: '/todayOnhistory/queryDetail.php',
    xzqb: '/xzpd/query' // 星座配对
}

export function getDreamCategory(data) {
    return http_get(API.dreamCategory, data)
}

export function getDreamDetail(data) {
    return http_get(API.dreamDetail, data)
}

export function yunshi(data) {
    return http_get(API.yunshi, data)
}

export default {}
