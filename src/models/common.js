export default {
    namespace: 'common',
    state: {
        isConnected: true,
        networkType: '',
        userInfo: {
            consName: '天秤座'
        }
    },
    reducers: {
        save(state, {payload}) {
            return {...state, ...payload}
        },
    },

    effects: {}
}
