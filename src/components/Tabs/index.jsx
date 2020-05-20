import Taro, {Component} from '@tarojs/taro'
import {AtTabBar, AtTabs, AtTabsPane} from 'taro-ui'

import './index.less'
import {View} from "@tarojs/components";

export default class Index extends Component {
    state = {
        current: 0,
        tabList: [
            {title: '标签页1'},
            {title: '标签页2'},
            {title: '标签页3'}
        ]
    }

    handleClick = (current) => {
        this.setState({
            current
        })
    }

    // renderContent = (t, i) => {
    //     return <View>hello</View>
    //     return this.props.renderContent(t, i) || <View>没有renderContent函数</View>
    // }

    render() {
        let {current} = this.state
        let {tabList} = this.props
        return (
            <View>
                <AtTabs
                    animated={false}
                    current={current}
                    tabList={tabList}
                    onClick={this.handleClick}>
                    {
                        tabList.map((t, i) => {
                            return <AtTabsPane current={current} index={i}>
                                {this.renderContent(t, i)}
                            </AtTabsPane>
                        })
                    }
                </AtTabs>
            </View>
        )
    }
}
