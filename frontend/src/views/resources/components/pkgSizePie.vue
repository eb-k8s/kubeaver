<template>
    <a-spin :loading="loading" style="width: 100%">
      <a-card
        class="general-card"
        :header-style="{ paddingBottom: '0' }"
        :body-style="{
          padding: '20px',
        }"
      >
        <Chart height="310px" :option="chartOption" />
      </a-card>
    </a-spin>
  </template>
  
  <script lang="ts" setup>
    import useLoading from '@/hooks/loading';
    import useChartOption from '@/hooks/chart-option';
  
    const props: any = defineProps({
      appData: Array,
      itemData: Array,
      title: String,
      resType: String,
    })
  
    const { loading } = useLoading();
    const { chartOption } = useChartOption((isDark: any) => {
      return {
        legend: {
          left: 'center',
          data: ['纯文本', '图文类', '视频类'],
          bottom: 0,
          icon: 'circle',
          itemWidth: 8,
          textStyle: {
            color: isDark ? 'rgba(255, 255, 255, 0.7)' : '#4E5969',
          },
          itemStyle: {
            borderWidth: 0,
          },
        },
        tooltip: {
          show: true,
          trigger: 'item',
        },
        graphic: {
          elements: [
            {
              type: 'text',
              left: 'center',
              top: '40%',
              style: {
                text: 'pieSize',
                textAlign: 'center',
                fill: isDark ? '#ffffffb3' : '#4E5969',
                fontSize: 14,
              },
            },
            {
              type: 'text',
              left: 'center',
              top: '50%',
              style: {
                text: '928,531',
                textAlign: 'center',
                fill: isDark ? '#ffffffb3' : '#1D2129',
                fontSize: 16,
                fontWeight: 500,
              },
            },
          ],
        },
        series: [
          {
            name: 'offlineSize of',
            type: 'pie',
            selectedMode: 'single',
            radius: ['0%', '50%'],
            label: {
              fontSize: 14,
              position: 'inner',
              color: isDark ? 'rgba(255, 255, 255, 0.7)' : '#4E5969',
            },
            itemStyle: {
              borderColor: isDark ? '#232324' : '#fff',
              borderWidth: 1,
            },
            data: props.appData,
          },
          {
            name: 'offlineSize of',
            type: 'pie',
            radius: ['65%', '90%'],
            center: ['50%', '50%'],
            /*
            label: {
              formatter: '',
            },
            labelLine: {
              show: false,
            },
            */
            label: {
              formatter: '{b|{b}}\n{hr|}\n{c}  {per|{d}%}  ',
              backgroundColor: '#F6F8FC',
              borderColor: '#8C8D8E',
              borderWidth: 1,
              borderRadius: 4,
              rich: {
                a: {
                  color: '#6E7079',
                  lineHeight: 22,
                  align: 'center'
                },
                hr: {
                  borderColor: '#8C8D8E',
                  width: '100%',
                  borderWidth: 1,
                  height: 0
                },
                b: {
                  color: '#6E7079',
                  lineHeight: 22,
                  align: 'center'
                },
                per: {
                  color: '#fff',
                  backgroundColor: '#4C5058',
                  padding: [3, 4],
                  borderRadius: 4
                }
              }
            },
            itemStyle: {
              borderColor: isDark ? '#232324' : '#fff',
              borderWidth: 1,
            },
            data: props.itemData,
          },
        ],
      };
    });
  </script>
  
  <style scoped lang="less"></style>
  