<template>
  <div class="login-form-wrapper">
    <a-card :style="{ width: '350px', height: '450px', marginRight: '100px', boxShadow: '0px 4px 6px rgba(0, 0, 0, 0.1)' }">
      <a-card-meta style="margin-top: -20px; text-align: center;">
          <template #description>
            <div style=" font-size: 22px; max-width: 100%; max-height: 100px; margin-bottom: 80px; ">
              <img :src="logo" style="width: 120px; height: 120px; margin-bottom: -120px; margin-top: -10px;" /><br />
              <!-- <span style="font-weight: bold; ">新讯 | {{ $t('login.form.title') }}</span> -->
              <!-- <span style="font-weight: bold; ">新讯 | Kubeaver</span> -->
              <!-- <span style="font-weight: bold; ">Kubeaver</span> -->
            </div>
          </template>
        </a-card-meta>
      <a-form
        ref="loginForm"
        :model="userInfo"
        class="login-form"
        layout="vertical"
        @submit="handleSubmit"
      >
        <a-form-item
          field="username"
          :rules="[{ required: true, message: $t('login.form.userName.errMsg') }]"
          :validate-trigger="['change', 'blur']"
          hide-label
          style="margin-top: 55px; margin-bottom: 10%; margin-left: 4%;  width: 90%;"
        >
          <a-input
            v-model="userInfo.username"
            :placeholder="$t('login.form.userName.placeholder')"
          >
            <template #prefix>
              <icon-user />
            </template>
          </a-input>
        </a-form-item>
        <a-form-item
          field="password"
          :rules="[{ required: true, message: $t('login.form.password.errMsg') }]"
          :validate-trigger="['change', 'blur']"
          hide-label
          style="margin-bottom: 15%; margin-left: 4%; width: 90%;"
        >
          <a-input-password
            v-model="userInfo.password"
            :placeholder="$t('login.form.password.placeholder')"
            allow-clear
          >
            <template #prefix>
              <icon-lock />
            </template>
          </a-input-password>
        </a-form-item>
        <a-space :size="16" direction="vertical">
          <div class="login-form-password-actions">
            <a-checkbox
              style="margin-left: 4%; "
              checked="rememberPassword"
              :model-value="loginConfig.rememberPassword"
              @change="setRememberPassword as any"
            >
              {{ $t('login.form.rememberPassword') }}
            </a-checkbox>
          </div>
          <a-button type="primary" html-type="submit" long :loading="loading"  style=" width: 90%; margin-left: 4%; ">
            {{ $t('login.form.login') }}
          </a-button>
        </a-space>
      </a-form>
    </a-card>
  </div>
</template>

<script lang="ts" setup>
  import { ref, reactive, onMounted  } from 'vue';
  import { useRouter } from 'vue-router';
  import { Message } from '@arco-design/web-vue';
  import { ValidatedError } from '@arco-design/web-vue/es/form/interface';
  import { useI18n } from 'vue-i18n';
  import { useStorage } from '@vueuse/core';
  import { useUserStore } from '@/store';
  import { availableBackend, login } from '@/api/user';
  import useLoading from '@/hooks/loading';

  import type { LoginData } from '@/api/user';
  import logo from '@/assets/images/logo.png';

  const router = useRouter();
  const { t } = useI18n();
  const errorMessage = ref('');
  const { loading, setLoading } = useLoading();
  const userStore = useUserStore();

  const loginConfig = useStorage('login-config', {
    rememberPassword: true,
    username: 'admin', 
    password: 'admin', 
  });

  const userInfo = reactive({
    username: loginConfig.value.username,
    password: loginConfig.value.password,
  });

  const getFirstK8sVersionFromStorage = (key = 'k8sVersionList'): string => {
    const versionArrayStr = localStorage.getItem(key);
    if (versionArrayStr) {
        try {
            const versionArray = JSON.parse(versionArrayStr);
            if (Array.isArray(versionArray) && versionArray.length > 0) {
                return versionArray[0]; // 返回第一个版本
            }
        } catch (parseError) {
            console.error('版本信息解析失败:', parseError);
        }
    }
    return '';
};

  const handleSubmit = async ({
    errors,
    values,
  }: {
    errors?: Record<string, ValidatedError>;
    values: Record<string, any>;
  }) => {
    if (loading.value || errors) return;

    setLoading(true);

    try {
      const k8sVersion = getFirstK8sVersionFromStorage();

      if (!k8sVersion) {
        throw new Error('未检测到可用的 Kubernetes 后端版本，请稍后重试。');
      }

      await userStore.login(values as LoginData, k8sVersion);

      // 成功登录后保存用户信息（根据是否记住密码）
      const { rememberPassword } = loginConfig.value;
      const { username, password } = values;
      loginConfig.value.username = rememberPassword ? username : '';
      loginConfig.value.password = rememberPassword ? password : '';

      Message.success(t('login.form.login.success'));
      router.push('/cluster');
    } catch (err) {
      const msg = `登录失败,${(err as Error).message}`|| '登录失败';
      errorMessage.value = msg;
      Message.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const setRememberPassword = (value: boolean) => {
    loginConfig.value.rememberPassword = value;
  };

  onMounted(async () => {
      // Kubernetes 版本映射
      const versionMap: Record<string, string> = {
        'v1.25': 'v125',
        'v1.26': 'v125',
        'v1.27': 'v125',
        'v1.28': 'v128',
        'v1.29': 'v128',
        'v1.30': 'v128',
      };

      const reverseMap: Record<string, string[]> = {};
      for (const [version, mapped] of Object.entries(versionMap)) {
        if (!reverseMap[mapped]) reverseMap[mapped] = [];
        reverseMap[mapped].push(version);
      }

      const testedVersions = new Set<string>();
      const availableVersions: string[] = [];
      const availableVersionMap: Record<string, string> = {};
      let connected = false;

      // for (const [mappedVersion, versionList] of Object.entries(reverseMap)) {
      //   if (!testedVersions.has(mappedVersion)) {
      //     testedVersions.add(mappedVersion);
      //     try {
      //       const result: any = await availableBackend(mappedVersion);
      //       if (result.status === 'ok') {
      //         connected = true;
      //       }
      //       availableVersions.push(mappedVersion);
      //       versionList.forEach(version => {
      //         availableVersionMap[version] = mappedVersion;
      //       });
      //     } catch (e) {
      //       console.warn(`Failed for version ${mappedVersion}:`, e);
      //     }
      //   }
      // }

      for (const [mappedVersion, versionList] of Object.entries(reverseMap)) {
        if (!testedVersions.has(mappedVersion)) {
          testedVersions.add(mappedVersion);
          try {
            const result: any = await availableBackend(mappedVersion);

            console.log(`Testing version ${mappedVersion}...`, result);
            
            if (
              result.status === 'ok' &&
              typeof result === 'object' &&
              !result.toString().includes('<!DOCTYPE html>') 
            ) {
              connected = true;
              availableVersions.push(mappedVersion);
              versionList.forEach(version => {
                availableVersionMap[version] = mappedVersion;
              });
            } else {
              console.warn(`后端服务响应异常，版本 ${mappedVersion} 被忽略`);
            }
          } catch (e) {
            console.warn(`Failed for version ${mappedVersion}:`, e);
          }
        }
      }

      if (connected) {
        localStorage.setItem('k8sVersionList', JSON.stringify(availableVersions));
        localStorage.setItem('k8sVersionMap', JSON.stringify(availableVersionMap));
        console.log('可用版本:', availableVersions);
        console.log('可用版本映射:', availableVersionMap);
      } 
      else {
        Message.warning('未检测到可用后端,请先启动后端程序！');
      }
    });
</script>

<style lang="less" scoped>
  .login-form-wrapper {
    /* 使用 flex 布局将卡片内容向右对齐 */
    display: flex;
    justify-content: flex-end; /* 将卡片向右对齐 */
    padding-right: 20px; /* 控制右侧间距 */
    height: 100vh; /* 卡片全屏高度 */
    align-items: center; /* 垂直居中卡片 */

    /* 小屏幕适应 */
    @media (max-width: 767px) {
      justify-content: center; /* 小屏幕居中显示 */
      padding-right: 0;
    }
  }

  .login-form {
    width: 320px; /* 控制表单宽度 */
    background-color: #fff; /* 设置背景色以区别布局 */
  }

  .login-form-title {
    color: var(--color-text-1);
    font-weight: 500;
    font-size: 24px;
    line-height: 32px;
    text-align: center;
  }

  .login-form-error-msg {
    height: 32px;
    color: rgb(var(--red-6));
    line-height: 32px;
  }

  .login-form-password-actions {
    display: flex;
    justify-content: space-between;
  }
</style>

