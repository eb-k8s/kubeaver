<template>
  <div class="login-form-wrapper">
    <a-card :style="{ width: '350px', height: '450px', marginRight: '100px', boxShadow: '0px 4px 6px rgba(0, 0, 0, 0.1)' }">
      <a-card-meta style="margin-top: -20px; text-align: center;">
          <template #description>
            <div style=" font-size: 22px; max-width: 100%; max-height: 100px; margin-bottom: 80px; ">
              <img :src="logo" style="width: 120px; height: 120px; margin-top: -10px;" /><br />
              <!-- <span style="font-weight: bold; ">新讯 | {{ $t('login.form.title') }}</span> -->
              <span style="font-weight: bold; ">新讯 | Kubeaver</span>
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
          style="margin-bottom: 10%; margin-left: 4%;  width: 90%;"
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
  import { ref, reactive } from 'vue';
  import { useRouter } from 'vue-router';
  import { Message } from '@arco-design/web-vue';
  import { ValidatedError } from '@arco-design/web-vue/es/form/interface';
  import { useI18n } from 'vue-i18n';
  import { useStorage } from '@vueuse/core';
  import { useUserStore } from '@/store';
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

  const handleSubmit = async ({
    errors,
    values,
  }: {
    errors: Record<string, ValidatedError> | undefined;
    values: Record<string, any>;
  }) => {
    if (loading.value) return;
    if (!errors) {
      setLoading(true);
      try {
        await userStore.login(values as LoginData);
        // const { redirect, ...othersQuery } = router.currentRoute.value.query;
        // router.push({
          // name: (redirect as string) || 'Workplace',
          // query: {
          //   ...othersQuery,
          // },

        // });
        router.push(`/cluster`);
        Message.success(t('login.form.login.success'));
        const { rememberPassword } = loginConfig.value;
        const { username, password } = values;
        // 实际生产环境需要进行加密存储。
        // The actual production environment requires encrypted storage.
        loginConfig.value.username = rememberPassword ? username : '';
        loginConfig.value.password = rememberPassword ? password : '';
      } catch (err) {
        errorMessage.value = (err as Error).message;
      } finally {
        setLoading(false);
      }
    }
  };
  const setRememberPassword = (value: boolean) => {
    loginConfig.value.rememberPassword = value;
  };
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

