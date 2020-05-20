import Taro, {Component} from '@tarojs/taro'
import {View} from '@tarojs/components'
import {AtRate} from 'taro-ui'
import './index.less'

export default class Index extends Component {

    constructor() {
        super(...arguments)
    }

    handleChange = (value) => {
        // this.setState({
        //     value
        // })
    }

    render() {
        console.log('start', this.props.value)
        return (
            <View className='component_rate' style={this.props.style}>
                <View className='label'>{this.props.title}</View>

                <View>
                    {
                        this.props.type == 'text' ?
                            <View>
                                {this.props.value}
                            </View> :
                            <AtRate
                                className='rate'
                                value={this.props.value * 5 / 100}
                                onChange={this.handleChange.bind(this)}
                            />
                    }
                </View>
            </View>
        )
    }
}
