import Taro, { Component } from "@tarojs/taro";
import { Provider } from "@tarojs/redux";
import models from "@/models";
import { View } from "@tarojs/components";
import { Tabbar, Container } from "@components";
import "taro-ui/dist/style/index.scss"; // taro-ui css

import Index from "./pages/index";
import dva from "./dva";

import "./app.less";
import { buildCdnPath } from "./utils";

// 如果需要在 h5 环境中开启 React Devtools
// 取消以下注释：
// if (process.env.NODE_ENV !== 'production' && process.env.TARO_ENV === 'h5')  {
//   require('nerv-devtools')
// }

const dvaApp = dva.createApp({
    initialState: {},
    models: models,
});

const store = dvaApp.getStore();

class App extends Component {
    componentDidMount() {}

    componentDidShow() {}

    componentDidHide() {}

    componentDidCatchError() {}

    config = {
        pages: [
            "pages/index/index",
            "pages/personal/index/index",
        ],
        window: {
            backgroundTextStyle: "light",
            navigationBarBackgroundColor: "#fff",
            navigationBarTitleText: "WeChat",
            navigationBarTextStyle: "black",
        },
        tabBar: {
            list: [
                {
                    pagePath: "pages/index/index",
                    // iconPath: "./assets/imgs/tab/home.png",
                    // selectedIconPath: ("./assets/imgs/tab/home_on.png"),
                    text: "首页",
                },
                {
                    pagePath: "pages/personal/index/index",
                    // iconPath: "./assets/imgs/tab/i.png",
                    // selectedIconPath: "./assets/imgs/tab/i_on.png",
                    text: "我的",
                },
            ],
        },
    };

    // 在 App 类中的 render() 函数没有实际作用
    // 请勿修改此函数
    render() {
        return (
            <Provider store={store}>
                <Index />
            </Provider>
        );
    }
}

Taro.render(<App />, document.getElementById("app"));
