export default {
    namespace: 'components',
    state: {
        modal: {
            show: false,
            title: null,
            content: null
        }
    },
    reducers: {
        save(state, {payload}) {
            return {...state, ...payload}
        },
        modalShow(state, {payload}) {
            return {...state, modal: {...payload, show: true}}
        },
        modalHide(state) {
            return {...state, modal: {...state.modal, show: false}}
        }
    },

    effects: {
        x() {
            console.log('xxxxxxxxxxx')
        }
    }
}
