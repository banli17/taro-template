import Taro, {Component} from "@tarojs/taro";
import {connect} from "@tarojs/redux";
import {View, Image, Swiper, SwiperItem, WebView} from "@tarojs/components";
import {Container, Rate} from "@/components";
import "./index.less";
import {buildCdnPath} from "@/utils";

@connect((state) => {
    return {
        yunshi_today: state.home.yunshi_today,
        yunshi_query: state.home.yunshi_query,
    };
})

class Card {
    palette() {
        return {
            width: '654rpx',
            height: '1000rpx',
            background: '#eee',
            views: [{
                type: 'rect',
                css: {
                    width: '200rpx',
                    right: '20rpx',
                    top: '30rpx',
                    height: '100rpx',
                    shadow: '10rpx 10rpx 5rpx #888888',
                    color: 'linear-gradient(-135deg, #fedcba 0%, rgba(18, 52, 86, 1) 20%, #987 80%)',
                },
            },]
        }
    }
}

export default class Index extends Component {
    state = {
        resImg: '',
        onImgOk: '',
        template: {
            width: '600rpx',
            height: '800rpx',
            borderRadius: '20rpx',
            views: [
                {
                    type: 'image',
                    url: 'https://goss.veer.com/creative/vcg/veer/612/veer-306544901.jpg',
                    css: {
                        top: '48rpx',
                        right: '48rpx',
                        width: '520rpx',
                        height: '720rpx',
                    },
                }
            ],
        }
    };

    componentWillMount() {
    }

    componentDidMount() {
        this.setState({
            template: new Card().palette()
        })
    }

    componentWillUnmount() {
    }

    componentDidShow() {
    }

    componentDidHide() {
    }

    config = {
        navigationBarTitleText: "首页",
        usingComponents: {
            'painter': '../../components/painter/painter'
        }
    };

    goDetail = (item) => {
        if (item.url) {
            Taro.navigateTo({
                url: item.url,
            });
        }
    };

    toggleConstell = () => {
        Taro.navigateTo({
            url: "/pages/constell/index/index",
        });
    };

    save = () => {
        let self = this
        Taro.getSetting({
            success(res) {
                if (!res.authSetting['scope.writePhotosAlbum']) {
                    Taro.authorize({
                        scope: 'scope.writePhotosAlbum',
                        success() {
                            self.saveImage();
                        }
                    });
                } else {
                    self.saveImage();
                }
            }
        });
    }

    saveImage() {
        let self = this;
        const ctx = Taro.createCanvasContext('myCanvas');
        console.log(ctx)
        const img1 = require('../../assets/imgs/avatar.png')
        const img2 = require('../../assets/imgs/tab/home.png')
        ctx.drawImage(img1, 0, 0, 100, 117);
        ctx.drawImage(img2, 57, 44, 60, 64);
        ctx.draw(false, function (e) {
            // 保存到本地
            Taro.canvasToTempFilePath({
                x: 0,
                y: 0,
                width: 375,
                height: 417,
                canvasId: 'myCanvas',
                success: function (res) {
                    self.setState({
                        resImg: res.tempFilePath
                    })
                    return
                    let pic = res.tempFilePath;
                    Taro.saveImageToPhotosAlbum({
                        filePath: pic,
                        success(res) {
                            Taro.hideLoading();
                            Taro.showToast({
                                title: '保存成功',
                                icon: 'success',
                                duration: 2000
                            });
                        }
                    });
                }
            });
        });
    }

    onImgOk = (e) => {

    }

    render() {
        return (
            <Container>
                <View className="page_home">
                    <painter customStyle='margin-left:40rpx' imgOK={this.onImgOk} palette={this.state.template}/>
                    <View onClick={this.save}>合成</View>
                </View>
            </Container>
        );
    }
}
