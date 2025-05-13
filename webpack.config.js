const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const webpack = require('webpack');

module.exports = {
  // 打包入口文件
  entry: './index.js',

  // 打包出口文件
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'index.js',
    clean: true,
  },

  module: {
    rules: [
      {
        // 配置 js 文件
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env']
          }
        }
      },
      {
        // 匹配 .html 文件
        test: /\.html$/,
        use: 'html-loader'
      },
      {
        test: /\.less$/,  // 检测 .css结尾的文件
        use: [
          // 执行顺序：从下到上
          'style-loader',
          'css-loader',
          'less-loader',
        ]
      }
    ]
  },

  plugins: [
    new HtmlWebpackPlugin({
      template: './pages/index/index.html',
      filename: 'index.html'
    }),
    new webpack.HotModuleReplacementPlugin()
  ],

  // 开发服务器
  devServer: {
    static: {
      directory: path.join(__dirname, 'dist'),
    },
    host: "localhost",
    port: 3001,
    open: true,
  },

  mode: 'development'

}