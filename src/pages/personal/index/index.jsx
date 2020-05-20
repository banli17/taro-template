import Taro, {Component} from '@tarojs/taro'
import {connect} from "@tarojs/redux";
import {View, Image} from '@tarojs/components'
import {AtList, AtListItem, AtGrid} from 'taro-ui'
import {Container, Tabbar,} from '@/components';
import {SignBox} from '@/pages/_components'
import './index.less'
import {buildCdnPath} from "../../../utils";

@connect(store => {
    return {}
})

export default class Index extends Component {

    state = {
        menu: [
            {
                title: '我的收藏'
            },
            {
                title: '我的合同'
            },
            {
                title: '推广赚钱',
                url: '/pages/personal/campaign/index/index'
            },
            {
                title: '帮助与反馈'
            },
            {
                title: '联系客服'
            }
        ]
    }

    componentWillMount() {
    }

    componentDidMount() {
    }

    componentWillUnmount() {
    }

    componentDidShow() {
    }

    componentDidHide() {
    }

    config = {
        navigationBarTitleText: '首页'
    }

    test = () => {
        this.props.dispatch({
            type: 'common/x'
        })
    }

    handleClick = (m) => {
        if (m.url) {
            Taro.navigateTo({url: m.url})
        }
    }


    render() {
        return (
            <Container>
                <View className='personal_index'>
                    <View className='top'>
                        <View className='avatar'>
                            <Image className='img' src={buildCdnPath('imgs/avatar.png')}/>
                        </View>
                        <View className='info_wrap'>
                            <View className='name'>米谢兜兜转</View>
                            <View className='tel'>183 **** 2262</View>
                        </View>
                    </View>

                    <View className='banner'>
                        <Image/>
                    </View>
                </View>
            </Container>
        )
    }
}
