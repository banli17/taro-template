import Taro, {Component} from '@tarojs/taro'
import {View, ScrollView} from '@tarojs/components'
import {AtTabsPane, AtTabs} from 'taro-ui'

import './index.less'

export default class Index extends Component {
    state = {
        current: -1,
        tabOpen: false,
        tabList: [
            {id: 0, title: '区域'},
            {id: 1, title: '价格'},
            {id: 2, title: '户型'},
            {id: 3, title: '更多'},
            {id: 4, title: '顺序'},
        ]
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

    renderHeader = () => {
        let {tabList} = this.state
        return <View className='header'>
            {
                tabList.map(t => {
                    return <View onClick={this.clickTab.bind(this, t)}
                                 className='header_item flex_center'
                                 key={t.id}>{t.title}</View>
                })
            }
        </View>
    }

    renderContent = () => {
        let {current} = this.state

        if (current === 0) {
            return <View className='content content_0'>
                <View className='select_box select_box_padding left'>
                    <View className='item on'>区域</View>
                    <View className='item'>区域</View>
                    <View className='item'>区域</View>
                </View>
                <ScrollView className='select_box select_box_right' scrollY>
                    <View className='list'>
                        <View className='item'>区域</View>
                        <View className='item'>区域</View>
                        <View className='item'>区域</View>
                        <View className='item'>区域</View>
                        <View className='item'>区域</View>
                        <View className='item'>区域</View>
                        <View className='item'>区域</View>
                        <View className='item'>区域</View>
                        <View className='item'>区域</View>
                        <View className='item'>区域</View>
                        <View className='item'>区域</View>
                    </View>
                </ScrollView>
            </View>
        }

        if (current === 1) {
            return <View className='content content_1'>
                content1
            </View>
        }

        if (current === 2) {
            return <View className='content content_2'>
                <ScrollView className='select_box' scrollY>
                    <View className='select_box_padding'>
                        <View className='item on'>区域</View>
                        <View className='item'>区域</View>
                        <View className='item'>区域</View>
                        <View className='item on'>区域</View>
                        <View className='item'>区域</View>
                        <View className='item'>区域</View>
                        <View className='item on'>区域</View>
                        <View className='item'>区域</View>
                        <View className='item'>区域</View>
                        <View className='item on'>区域</View>
                        <View className='item'>区域</View>
                        <View className='item'>区域</View>
                    </View>
                </ScrollView>
            </View>
        }

        if (current === 3) {
            return <View className='content content_3'>
                content1
            </View>
        }

        if (current === 4) {
            return <View className='content_4'>
                content1
            </View>
        }

        return <View></View>
    }

    renderFooter = () => {
        return <View className='search_btn'>
            <View className='btn reset_keyword'>清空</View>
            <View className='btn red set_keyword'>确认</View>
        </View>
    }

    render() {
        let {tabOpen} = this.state
        return (
            <View className={`search_select ${tabOpen ? 'open' : ''}`}>
                {this.renderHeader()}

                {
                    tabOpen && <View className='select_content'>
                        {this.renderContent()}
                        {this.renderFooter()}
                    </View>
                }
            </View>
        )
    }
}
