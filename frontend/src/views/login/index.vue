<template>
  <div class="login-container flx-center">
    <div class="login-box">
      <div class="login-left">
        <img class="login-left-img" :src="login" alt="login" />
      </div>
      <div class="content-inner">
        <LoginForm />
      </div>
      <div class="footer">
        <Footer />
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
  import { ref, onMounted } from 'vue';
  import Footer from '@/components/footer/index.vue';
  import LoginForm from './components/login-form.vue';
  import login from '@/assets/images/login_left4.png';
  import { getTest, getVersions } from '@/api/user';
  /*
  const fetchData = async () => {
    try {
      const versions = await getVersions();
      console.log(versions)
        // 假设目标 k8s 版本
        const targetK8sVersion = '1.28';
        // 查找匹配的 kubeaverVersion
        const matchedVersion = versions.data.find(item => item.k8sVersions.includes(targetK8sVersion));
        if (matchedVersion) {
          console.log(`匹配的 kubeaverVersion: ${matchedVersion.kubeaverVersion}`);
        const response = await getTest(matchedVersion.kubeaverVersion);
        console.log(response)
        } else {
          console.log('未找到匹配的 kubeaverVersion');
        }
    } catch (err) {
        console.log('获取版本信息时出错:', err);
    }
  };
  
  onMounted(() => {
    fetchData();
  });
  */
</script>

<style lang="less" scoped>
  .container {
    display: flex;
    height: 100vh;

    .banner {
      width: 550px;
      background: linear-gradient(163.85deg, #1d2129 0%, #00308f 100%);
    }

    .content {
      position: relative;
      display: flex;
      flex: 1;
      align-items: center;
      justify-content: center;
      padding-bottom: 40px;
      background-image: url('@/assets/images/login.png');
      background-size: cover; 
      background-position: center;
    }

    .footer {
      position: absolute;
      right: 0;
      bottom: 0;
      width: 100%;
    }
  }

  .logo {
    position: fixed;
    top: 24px;
    left: 22px;
    z-index: 1;
    display: inline-flex;
    align-items: center;

    &-text {
      margin-right: 4px;
      margin-left: 4px;
      color: var(--color-fill-1);
      font-size: 20px;
    }
  }
</style>

<style lang="less" scoped>
  // responsive
  @media (max-width: @screen-lg) {
    .container {
      .banner {
        width: 25%;
      }
    }
  }

  .login-container {
  background-color: #eeeeee;
  background-image: url('@/assets/images/login_bg.svg');
  background-size: 100% 100%;
  background-size: cover;
  height: 100vh;
  position: fixed;
  top: 0;
  left: 0;
  right: 0;

  .login-box {
    display: flex;
    align-items: center;
    justify-content: space-around;
    width: 96.5%;
    height: 94%;
    margin: 30px 0 0 34px;
    background-color: rgb(255 255 255 / 80%);
    border-radius: 10px;

    .login-left {
      width: 800px;
      margin-right: 0px;

      .login-left-img {
        width: 100%;
        height: 100%;
      }
    }
  }

  @media screen and (max-width: 1500px) {
    .login-box {
      margin: 20px 0 0 22px;
    }
  }
}

.login-tabs {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
}

.tab-pane {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  margin-top: -10px;
}

.div-login-file {
  height: 250px;
}

.footer {
  position: absolute;
  bottom: 30px;
  width: 100%;
}

@media screen and (max-width: 1500px) {
  .login-left-img {
    max-width: 80%;
  }

  .footer {
    bottom: 15px;
  }
}

.separator {
  border-bottom: 1px solid #ccc;
  /* 实线样式，可以根据需要调整颜色和样式 */
  margin: -20px 10px 25px 10px;
  /* 调整间距 */
}
</style>
