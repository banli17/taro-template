import Taro, {Component} from '@tarojs/taro'
import {View, Image,} from '@tarojs/components'

import './index.less'
import {buildCdnPath} from "../../../utils";

export default class Index extends Component {
    constructor(props) {
        super(props)
    }

    render() {
        let {name} = this.props
        return (
            <View className='component_constell'
                  style={{background: `url(${buildCdnPath('imgs/圆形底框-切图@2x.png')}) no-repeat center center / contain`}}>
                {
                    name && <View className='constell_img' style={{background: `url(${buildCdnPath(`imgs/constell/符号_星座_${name}备份@2x.png`)}) no-repeat center center / contain`}}></View>
                }
            </View>
        )
    }
}
