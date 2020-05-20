import Taro, {Component} from '@tarojs/taro'
import {View, Button} from '@tarojs/components'
import {connect} from "@tarojs/redux";
import {AtModal, AtModalHeader, AtModalContent, AtModalAction} from 'taro-ui'

import './index.less'

@connect(store => {
    console.log(store)
    return {
        modal: store.components.modal
    }
})

export default class Index extends Component {
    handleClick = () => {

    }

    cancel = () => {
        this.props.dispatch({
            type: 'components/modalHide'
        })
    }

    sure = () => {
        this.cancel()
    }


    render() {
        let {modal} = this.props
        console.log(modal)
        return (
            <View className='component_modal'>
                <AtModal isOpened={modal.show} onClose={this.cancel}>
                    {
                        modal.type == 'normal' ?
                            <View>
                                <AtModalHeader>{modal.title}</AtModalHeader>
                                <AtModalContent>{modal.content}</AtModalContent>
                                <AtModalAction>
                                    <Button onClick={this.cancel}>取消</Button>
                                    <Button onClick={this.sure}>确定</Button>
                                </AtModalAction>
                            </View> :
                            <View>
                                {modal.content}
                            </View>
                    }
                </AtModal>
            </View>
        )
    }
}
