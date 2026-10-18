const normalizeVersion = (version: string) => version.replace(/^v/, '');

const parseVersion = (version: string) => {
  const match = version.match(/^v?(\d+)\.(\d+)\.(\d+)/);
  return match ? match.slice(1).map(Number) : null;
};

// Kubespray 2.32.0 的 Calico 版本白名单。
const calicoVersions = new Set(
  ['3.29', '3.30', '3.31'].flatMap(minor =>
    Array.from({ length: 8 }, (_, patch) => `${minor}.${patch}`)
  )
);

export const isNetworkPluginCompatible = (
  k8sVersion: string,
  pluginName: string,
  pluginVersion: string
): boolean => {
  const k8s = parseVersion(k8sVersion);
  const name = pluginName.toLowerCase();

  if (name === 'flannel') {
    // 将各后端对应的 Kubespray 默认版本作为项目的 Flannel 筛选规则。
    if (k8s?.[0] === 1) {
      const minor = k8s[1];
      if (minor >= 25 && minor <= 30) {
        return normalizeVersion(pluginVersion) === '0.22.0';
      }
      if (minor >= 31 && minor <= 33) {
        return normalizeVersion(pluginVersion) === '0.27.3';
      }
      if (minor >= 34 && minor <= 36) {
        return normalizeVersion(pluginVersion) === '0.28.9';
      }
    }
    return true;
  }

  if (name !== 'calico') return true;
  if (!k8s) return false;

  const [k8sMajor, k8sMinor] = k8s;
  if (k8sMajor === 1 && k8sMinor >= 34 && k8sMinor <= 36) {
    return calicoVersions.has(normalizeVersion(pluginVersion));
  }

  // 保留旧版 Calico 筛选范围。
  const calico = parseVersion(pluginVersion);
  if (!calico || calico[0] !== 3) return false;
  const [, minor, patch] = calico;

  if (k8sMajor === 1) {
    if (k8sMinor >= 25 && k8sMinor <= 27) return minor <= 25;
    if (k8sMinor >= 28 && k8sMinor <= 30) {
      return minor >= 26 && minor <= 28 && (minor !== 28 || patch <= 1);
    }
    if (k8sMinor >= 31 && k8sMinor <= 33) {
      return minor >= 28 && minor <= 30 && (minor !== 30 || patch <= 3);
    }
    if (k8sMinor < 25) return minor <= 24;
  } else if (k8sMajor >= 2) {
    return minor >= 30;
  }
  return false;
};
