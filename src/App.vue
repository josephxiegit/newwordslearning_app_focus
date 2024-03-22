<script setup>
  import { watch, onMounted, ref } from 'vue';
  import { useRoute, useRouter } from 'vue-router';
  import { getCurrentInstance } from 'vue';

  const instance = getCurrentInstance();
  const axios = instance.appContext.config.globalProperties.$ajax;
  const route = useRoute();
  const router = useRouter(); 
  const transitionName = ref('slide-right');


  watch(route, (to, from) => {
    const arr = ['/homepage', '/student', '/teacher'];
    transitionName.value = arr.indexOf(to.path) > arr.indexOf(from.path) ? 'slide-left' : 'slide-right';
  });

  // onMounted(async () => {
  //     console.log("app.vue");
  //     async function queryLogout(){
  //       let params = new URLSearchParams();
  //       params.append('method', 'queryData');
  //       return await axios.post('words/', params).then( (ret) => {
  //         console.log(ret.data);
  //         return ret.data;
  //       })
  //     }
  //     queryLogout();
  //     router.push('/homepage');
      
  // });
</script>

<template>
  <!-- <div class="background"> -->
    <div id="app">
     
      <router-view v-slot="{ Component }">
        <keep-alive>
          <component :is="Component" />
        </keep-alive>
      </router-view>
      
    </div>
  <!-- </div> -->

</template>




<style>
/* .transitionBody {
  position: absolute;
  width: 100%;
  transition: all 0.4s ease;
}

.slide-left-enter{
  opacity: 0;
  -webkit-transform: translate(100%, 0);
  transform: translate(100%, 0);
}
.slide-right-leave-to,.slide-right-leave-active{
  display: none;
}
.slide-left-leave-active{
  opacity: 0;
  -webkit-transform: translate(-100%, 0);
  transform: translate(-100%, 0);
} */
</style>
