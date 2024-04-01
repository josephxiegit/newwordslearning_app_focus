import { createApp } from 'vue'
// import './style.css'
import App from './App.vue'
import { createRouter, createWebHistory } from 'vue-router';
import axiosPlugin from './plugins/axios';
import HomePage from './components/homepage.vue';
import Teacher from './components/teacher.vue';
import TeacherList from './components/teacherList.vue';
import StudentAnswer from './components/studentAnswer.vue';
import 'vant/lib/index.css';


// 定义你的路由配置
const routes = [
    {
        path: '/',
        redirect: '/homepage'
    },
    {
        path: '/homepage',
        name: 'homepage',
        component: HomePage,
        meta: {
            index: 1,
            preventBack: true
        }
    },
    {
        path: '/teacher',
        name: 'teacher',
        component: Teacher,
        meta: {
            index: 1
        }
    },
    {
        path: '/teacherList',
        name: 'teacherList',
        component: TeacherList,
        meta: {
            index: 2
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
    {
        path: '/studentAnswer',
        name: 'studentAnswer',
        component: StudentAnswer,
        meta: {
            index: 2
        }
    },
];
// 创建router实例
const router = createRouter({
    history: createWebHistory(),
    routes, // 使用路由配置
});
// 设置全局前置守卫
router.beforeEach((to, from, next) => {
    if (from.path === '/homepage') {
        // 检测到刷新行为，可以通过判断 to 和 from 是否相同，或者其他方式
        // 这里以to和from完全相同来模拟刷新行为的检测
        if (to.fullPath === from.fullPath) {
          // 重定向到根目录
          next('/');
        } 
    }
    if (from.path === '/studentAnswer' && to.meta.preventBack) {
        next(false);
    } else {
        next(); // 确保正常的路由跳转继续进行
    }
  
});
// 判断手机还是电脑
function _isMobile() {
    let flag = navigator.userAgent.match(/(phone|pad|pod|iPhone|iPod|ios|iPad|Android|Mobile|BlackBerry|IEMobile|MQQBrowser|JUC|Fennec|wOSBrowser|BrowserNG|WebOS|Symbian|Windows Phone)/i)
    // console.log(flag)
    return flag;
}
console.log(_isMobile());


import { Button, Checkbox, CheckboxGroup, NavBar, Cell, CellGroup, Overlay, Loading, Dialog, Field, Notify, Toast, FloatingBubble, Image as VanImage } from 'vant';
import 'vant/lib/index.css';



// 创建Vue应用实例
const app = createApp(App);
// 使用Vant组件
app.use(Button).use(Checkbox).use(CheckboxGroup).use(NavBar).use(Cell).use(CellGroup).use(Overlay).use(Loading).use(Dialog).use(Field).use(Notify).use(Toast).use(FloatingBubble).use(VanImage);
// 使用vue-router
app.use(router);
app.use(axiosPlugin);

// 挂载Vue应用实例
app.mount('#app');
