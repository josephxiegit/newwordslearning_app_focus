import { createApp } from 'vue'
// import './style.css'
import App from './App.vue'
import { createRouter, createWebHistory } from 'vue-router';
import axiosPlugin from './plugins/axios';
import HomePage from './components/homepage.vue';
import 'vant/lib/index.css';


// 定义你的路由配置
    const routes = [
        // 例: { path: '/home', component: Home },
        {
            path: '/homepage',
            name: 'homepage',
            component: HomePage,
            meta: {
                index: 0
            }
        },
        {
            path: '/teacher',
            name: 'teacher',
            // component: Teacher,
            meta: {
                index: 1
            }
        },
        {
            path: '/student',
            name: 'student',
            // component: Student,
            meta: {
                index: 1
            }
        },
    ];
    // 创建router实例
    const router = createRouter({
    history: createWebHistory(),
    routes, // 使用路由配置
    });
  // 判断手机还是电脑
    function _isMobile() {
        let flag = navigator.userAgent.match(/(phone|pad|pod|iPhone|iPod|ios|iPad|Android|Mobile|BlackBerry|IEMobile|MQQBrowser|JUC|Fennec|wOSBrowser|BrowserNG|WebOS|Symbian|Windows Phone)/i)
        // console.log(flag)
        return flag;
    }
    console.log(_isMobile());


import { Button, Checkbox, CheckboxGroup, NavBar, Cell, CellGroup, Overlay, Loading, Dialog, Field, Notify } from 'vant';
import 'vant/lib/index.css';



// 创建Vue应用实例
const app = createApp(App);
// 使用Vant组件
app.use(Button).use(Checkbox).use(CheckboxGroup).use(NavBar).use(Cell).use(CellGroup).use(Overlay).use(Loading).use(Dialog).use(Field).use(Notify);
// 使用vue-router
app.use(router);
app.use(axiosPlugin);

// 挂载Vue应用实例
app.mount('#app');
