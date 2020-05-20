import Taro, {Component} from '@tarojs/taro'
import {View} from '@tarojs/components'
import Modal from '../Modal'

import './index.less'

export default class Index extends Component {
    state = {
        loading: true
    }

    componentWillMount() {
        setTimeout(() => {
            this.setState({
                loading: false
            })
        }, 200)
    }

    handleClick = () => {

    }

    render() {
        return (
            <View className={`${this.props.className} container`}>
                {
                    this.state.loading ?

                        <View className='flex_center loading'>加载中</View> :
                        this.props.children
                }

                {/*<Modal/>*/}
            </View>
        )
    }
}
