
export default {
    namespace: 'loginConfirm',
    state: {
        show: false
    },
    reducers: {
        show(state) {
            return { ...state, show: true }
        },
        hide(state) {
            return { ...state, show: false }
        }
    },
}