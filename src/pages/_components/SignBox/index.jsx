import Taro, {Component} from '@tarojs/taro'
import {View, ScrollView, Image, Text} from '@tarojs/components'
import {AtInput, AtForm} from 'taro-ui'

import style from './index.less'

export default class Index extends Component {
    config = {
        navigationBarTitleText: '房子详情页'
    }

    constructor(props) {
        super(props)
    }

    clickTab = (item) => {
        console.log(item)
        this.setState({
            current: item.id,
            tabOpen: true
        })
    }

    goDetail = () => {
        Taro.navigateTo({
            url: '/pages/house/detail/index'
        })
    }

    handleChange = () => {

    }

    render() {
        return (
            <View className={style.sign_box}>
                <AtInput
                    clear
                    type='text'
                    length='11'
                    placeholder='请输入手机号'
                    value={this.state.value}
                    onChange={this.handleChange}
                >
                    <Text className={style.btn_code}>获取验证码</Text>
                </AtInput>
                <AtInput
                    clear
                    type='text'
                    maxLength='4'
                    placeholder='验证码'
                    value={this.state.value}
                    onChange={this.handleChange}
                >
                </AtInput>
            </View>
        )
    }
}
