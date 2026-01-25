// 获取 API 基础 URL
// 使用 VITE_API_URL 中的值作为 API 基础 URL
function getApiBaseUrl(): string {
  // 在构建时，Vercel 的环境变量可以通过 process.env 访问
  const apiUrl = process.env.VITE_API_URL;
  
  if (apiUrl) {
    // 从 VITE_API_URL 中提取基础 URL（去掉路径部分）
    try {
      const url = new URL(apiUrl);
      return `${url.protocol}//${url.host}`;
    } catch {
      // 如果解析失败，使用默认值
      return 'http://api-staging.screna.ai';
    }
  } else {
    // 默认值（用于本地开发或未配置时）
    return 'http://api-staging.screna.ai';
  }
}

const config = {
  rewrites: [
    {
      source: '/api/v1/:path*',
      destination: `${getApiBaseUrl()}/api/v1/:path*`,
    },
    {
      source: '/(.*)',
      destination: '/index.html',
    },
  ],
};

export default config;

