import { createApp, reactive, provide, ref } from 'vue'
// import './style.css'
import App from './App.vue'
import { createRouter, createWebHistory } from 'vue-router';
import axiosPlugin from './plugins/axios';
import HomePage from './components/homepage.vue';
import Teacher from './components/teacher.vue';
import TeacherList from './components/teacherList.vue';
import StudentAnswer from './components/studentAnswer.vue';
import StudentAccountAnswerChallenge from './components/studentAccountAnswerChallenge.vue';

import StudentAccountList from './components/studentAccountList.vue';
import StudentAccountItem from './components/studentAccountItem.vue';
import StudentAccountSwipe from './components/studentAccountSwipe.vue';
import StudentAccountChallenge from './components/studentAccountChallenge.vue';
import StudentAccountTest from './components/studentAccountTest.vue';
import StudentAccountAnswer from './components/studentAccountAnswer.vue';
import StudentAccountPreExam from './components/studentAccountPreExam.vue';
import StudentAccountDaily from './components/studentAccountDaily.vue';
import XlsmList from './components/xlsmList.vue';
import TeacherComment from './components/teacherComment.vue';
import LogList from './components/logList.vue';
import TextbookList from './components/textbookList.vue';
import UserInformation from './components/userInformation.vue';
import PurchaseLog from './components/purchaseLog.vue';
import Viewers from './components/viewers.vue';
import ViewersHomepage from './components/viewersHomepage.vue';
import Complete3star from './components/complete3star.vue';
import 'vant/lib/index.css';
import Global from "./components/Global.vue";


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
        path: '/studentAccountChallenge',
        name: 'studentAccountChallenge',
        component: StudentAccountChallenge,
        meta: {
            index: 1,
            preventBack: true
        }
    },
    {
        path: '/purchaseLog',
        name: 'purchaseLog',
        component: PurchaseLog,
        meta: {
            index: 1,
            preventBack: true
        }
    },
    {
        path: '/studentAccountTest',
        name: 'studentAccountTest',
        component: StudentAccountTest,
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
        path: '/studentAccountPreExam',
        name: 'studentAccountPreExam',
        component: StudentAccountPreExam,
        meta: {
            index: 1,
            preventBack: true
        }
    },
    {
        path: '/studentAccountDaily',
        name: 'studentAccountDaily',
        component: StudentAccountDaily,
        meta: {
            index: 1,
            preventBack: true
        }
    },
    {
        path: '/userinformation',
        name: 'userinformation',
        component: UserInformation,
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
        {
        path: '/studentAccountAnswerChallenge',
        name: 'studentAccountAnswerChallenge',
        component: StudentAccountAnswerChallenge,
        meta: {
            index: 2,
            preventBack: true
        }
    },
    {
        path: '/viewers',
        name: 'viewers',
        component: Viewers,
        meta: {
            index: 2,
            preventBack: true
        }
    },
    {
        path: '/viewersHomepage',
        name: 'viewersHomepage',
        component: ViewersHomepage,
        meta: {
            index: 2,
            preventBack: true
        }
    },
    {
        path: '/complete3star',
        name: 'complete3star',
        component: Complete3star,
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
    // localTeacherPassword = atob(localTeacherPassword);
    // console.log('localTeacherPassword: ', localTeacherPassword)
    if (localTeacherPassword == "ss654321") {
        // next();
        if (to.path === '/viewers' && !from.name) {
            next('/teacherComment'); // 跳转到 TeacherComment 组件
        } else {
            next();
        }
    } else {
        if (from.path === '/homepage') {
            if (to.fullPath === from.fullPath) {
                // 重定向到根目录
                next('/');
                if (to.path === '/viewers' && !from.name) {
                    next('/teacherComment'); // 跳转到 TeacherComment 组件
                } else {
                    next();
                }
            }
        };
        if ((from.path === '/studentAnswer' && to.meta.preventBack) ||
            (from.path === '/studentAccountAnswer' && to.path === '/studentAccountItem') ||
            (from.path === '/studentAccountList' && to.path === '/studentAccountAnswer') ||
            (from.path === '/studentAccountList' && to.path === '/complete3star') ||
            (from.path === '/studentAccountSwipe' && to.path === '/studentAccountList') ||
            (from.path === '/studentAccountTest' && to.path === '/studentAccountList') ||
            (from.path === '/studentAccountAnswer' && to.path === '/studentAccountSwipe') ||
            (from.path === '/complete3star' && to.path === '/studentAccountAnswer') ||
            (from.path === '/studentAccountAnswer' && to.path === '/studentAccountTest') ||

            (from.path === '/studentAccountAnswerChallenge' && to.path === '/studentAccountChallenge') ||
            (from.path === '/studentAccountList' && to.path === '/studentAccountAnswerChallenge') ||
            (from.path === '/studentAccountItem' && to.meta.preventBack)) {
            // 如果满足以上任何条件，阻止导航
            next(false);
        }

        else {
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
// const flagTheme = ref(1);
const theme_name = localStorage.getItem("theme_name");
const themeMapping = {
    "喜羊羊与灰太狼": 1,
    "熊出没": 2,
};
const flagTheme = ref(themeMapping[theme_name] || 1);
const passive_magic = ref(0);


import {
    Button, Checkbox, CheckboxGroup, NavBar, Cell, CellGroup, Overlay, Swipe, SwipeItem, Card, Progress, Step, Steps, Divider, ActionSheet,
    Loading, Dialog, Field, Notify, Toast, FloatingBubble, Badge, Circle, Grid, GridItem, Col, Row, ConfigProvider, BackTop, DropdownMenu, DropdownItem,
    Image as VanImage, Popup, Rate, Tabbar, TabbarItem, Picker, Tag, RollingText, RadioGroup, Radio, Space, Sidebar, SidebarItem, NoticeBar, Barrage,
    SwipeCell, Icon, Highlight, FloatingPanel, Sticky, Collapse, CollapseItem, Search, Tab, Tabs, List, Calendar, Switch, CountDown, Stepper, Popover
} from 'vant';
import 'vant/lib/index.css';



// 创建Vue应用实例
const app = createApp(App);
app.provide('globalState', globalState);
app.provide('flagTheme', flagTheme);
app.provide('passive_magic', passive_magic);
// 主题路径
app.config.globalProperties.$bonnieBearsSrc = Global.BONNIE_BEARS_SRC;

// 使用Vant组件
app.use(Button)
    .use(Checkbox)
    .use(NoticeBar)
    .use(Barrage)
    .use(Popover)
    .use(ActionSheet)
    .use(DropdownMenu)
    .use(DropdownItem)
    .use(BackTop)
    .use(Divider)
    .use(Sidebar)
    .use(SidebarItem)
    .use(Step)
    .use(Steps)
    .use(Stepper)
    .use(CountDown)
    .use(Switch)
    .use(ConfigProvider)
    .use(Progress)
    .use(Card)
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
