import { createApp, reactive, provide } from 'vue'
// import './style.css'
import App from './App.vue'
import { createRouter, createWebHistory } from 'vue-router';
import axiosPlugin from './plugins/axios';
import HomePage from './components/homepage.vue';
import Teacher from './components/teacher.vue';
import TeacherList from './components/teacherList.vue';
import StudentAnswer from './components/studentAnswer.vue';
import StudentAccountList from './components/studentAccountList.vue';
import StudentAccountItem from './components/studentAccountItem.vue';
import StudentAccountSwipe from './components/studentAccountSwipe.vue';
import StudentAccountAnswer from './components/studentAccountAnswer.vue';
import XlsmList from './components/xlsmList.vue';
import TeacherComment from './components/teacherComment.vue';
import LogList from './components/logList.vue';
import TextbookList from './components/textbookList.vue';
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
        path: '/studentAccountSwipe',
        name: 'studentAccountSwipe',
        component: StudentAccountSwipe,
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
        path: '/teacherComment',
        name: 'teacherComment',
        component: TeacherComment,
        meta: {
            index: 2
        }
    },
    {
        path: '/studentAccountList',
        name: 'studentAccountList',
        component: StudentAccountList,
        meta: {
            index: 1,
            preventBack: true
        }
    },
    {
        path: '/studentAccountItem',
        name: 'studentAccountItem',
        component: StudentAccountItem,
        meta: {
            index: 1,

        }
    },
    {
        path: '/logList',
        name: 'logList',
        component: LogList,
        meta: {
            index: 2,

        }
    },
    {
        path: '/textbookList',
        name: 'textbookList',
        component: TextbookList,
        meta: {
            index: 2,

        }
    },
    {
        path: '/studentAccountAnswer',
        name: 'studentAccountAnswer',
        component: StudentAccountAnswer,
        meta: {
            index: 1,
        }
    },
    {
        path: '/xlsmList',
        name: 'xlsmList',
        component: XlsmList,
        meta: {
            index: 1,
        }
    },
    {
        path: '/studentAnswer',
        name: 'studentAnswer',
        component: StudentAnswer,
        meta: {
            index: 2,
            preventBack: true
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
    let localTeacherPassword = window.localStorage.getItem('teacherPassword');
    localTeacherPassword = atob(localTeacherPassword);
    // console.log('localTeacherPassword: ', localTeacherPassword);
    

    if (localTeacherPassword == "ss27834894") {
        next();
    } else {
        if (from.path === '/homepage') {
            if (to.fullPath === from.fullPath) {
                // 重定向到根目录
                next('/');
            }
        };
        if ((from.path === '/studentAnswer' && to.meta.preventBack) ||
            (from.path === '/studentAccountAnswer' && to.path === '/studentAccountItem') ||
            (from.path === '/studentAccountList' && to.path === '/studentAccountAnswer') ||
            (from.path === '/studentAccountItem' && to.meta.preventBack)) {
            // 如果满足以上任何条件，阻止导航
            next(false);
        } else {
            // 其他情况，正常进行路由导航
            next();
        }
    }



});
// 判断手机还是电脑
function _isMobile() {
    let flag = navigator.userAgent.match(/(phone|pad|pod|iPhone|iPod|ios|iPad|Android|Mobile|BlackBerry|IEMobile|MQQBrowser|JUC|Fennec|wOSBrowser|BrowserNG|WebOS|Symbian|Windows Phone)/i)
    // console.log(flag)
    return flag;
}
// console.log(_isMobile());

// 定义全局变量
const globalState = reactive({
    user: '',
    password: ''
});


import {
    Button, Checkbox, CheckboxGroup, NavBar, Cell, CellGroup, Overlay, Swipe, SwipeItem,
    Loading, Dialog, Field, Notify, Toast, FloatingBubble, Badge, Circle, Grid, GridItem, Col, Row,
    Image as VanImage, Popup, Rate, Tabbar, TabbarItem, Picker, Tag, RollingText,RadioGroup, Radio, Space,
    SwipeCell, Icon, Highlight, FloatingPanel, Sticky, Collapse, CollapseItem, Search, Tab, Tabs, List, Calendar
} from 'vant';
import 'vant/lib/index.css';



// 创建Vue应用实例
const app = createApp(App);
app.provide('globalState', globalState);
// 使用Vant组件
app.use(Button)
    .use(Checkbox)
    .use(Space)
    .use(Col)
    .use(Row)
    .use(Swipe)
    .use(SwipeItem)
    .use(Grid)
    .use(GridItem)
    .use(List)
    .use(RadioGroup)
    .use(Radio)
    .use(Tab)
    .use(Tabs)
    .use(Circle)
    .use(CheckboxGroup)
    .use(NavBar)
    .use(Cell)
    .use(CellGroup)
    .use(Overlay)
    .use(Loading)
    .use(Dialog)
    .use(Field)
    .use(Notify)
    .use(Toast)
    .use(FloatingBubble)
    .use(VanImage)
    .use(Popup)
    .use(Rate)
    .use(Tabbar)
    .use(TabbarItem)
    .use(Picker)
    .use(SwipeCell)
    .use(Icon)
    .use(FloatingPanel)
    .use(Sticky)
    .use(Highlight)
    .use(Collapse)
    .use(Search)
    .use(Tag)
    .use(Badge)
    .use(RollingText)
    .use(CollapseItem)
    .use(Calendar);
// 使用vue-router
app.use(router);
app.use(axiosPlugin);

// 挂载Vue应用实例
app.mount('#app');
