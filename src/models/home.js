import {API_HOME} from '../api'

export default {
    namespace: 'home',

    state: {
        yunshi_query: {
            consName: '天秤座',
            type: 'today'
        },
        yunshi_today: {},
    },

    reducers: {
        save(state, {payload}) {
            return {...state, ...payload}
        }
    },

    effects: {
        * getYunshiSaga(action, {call, put, select}) {
            let query = yield select(state => state.home.yunshi_query)
            let res = yield call(API_HOME.yunshi, query)
            yield put({
                type: 'save',
                payload: {
                    yunshi_today: res
                }
            })
        },

        * updateConstellSaga(action, {call, put, select}) {
            yield put({
                type: 'save',
                payload: {
                    yunshi_query: {
                        consName: action.payload.consName,
                        type: action.payload.type
                    }
                }
            })
            yield put({
                type: 'getYunshiSaga'
            })
        }
    }
}
