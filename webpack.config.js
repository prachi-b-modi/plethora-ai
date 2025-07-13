const path = require('path');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const webpack = require('webpack');
const dotenv = require('dotenv');

// Load environment variables
const env = dotenv.config().parsed || {};

const isProduction = process.env.NODE_ENV === 'production';
const isDevelopment = !isProduction;

module.exports = {
  mode: isProduction ? 'production' : 'development',
  devtool: isDevelopment ? 'cheap-module-source-map' : 'source-map',
  
  entry: {
    // Background service worker
    'background/service-worker': './extension/background/service-worker.ts',
    
    // Content scripts
    'content/content-script': './extension/content/content-script.ts',
    
    // Popup
    'popup': './extension/popup.js'
  },
  
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].js',
    clean: true,
    publicPath: '/'
  },
  
  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.jsx', '.json'],
    alias: {
      '@': path.resolve(__dirname, 'extension'),
      '@/background': path.resolve(__dirname, 'extension/background'),
      '@/content': path.resolve(__dirname, 'extension/content'),
      '@/sidebar': path.resolve(__dirname, 'extension/sidebar'),
      '@/shared': path.resolve(__dirname, 'extension/shared'),
      '@/types': path.resolve(__dirname, 'extension/shared/types'),
      '@/utils': path.resolve(__dirname, 'extension/shared/utils')
    }
  },
  
  module: {
    rules: [
      // TypeScript and JavaScript
      {
        test: /\.(ts|tsx|js|jsx)$/,
        exclude: /node_modules/,
        use: {
          loader: 'ts-loader',
          options: {
            configFile: path.resolve(__dirname, 'tsconfig.json'),
            transpileOnly: isDevelopment, // Faster builds in development
            compilerOptions: {
              noEmit: false,
              declaration: false,
              declarationMap: false
            }
          }
        }
      },
      
      // CSS and SCSS
      {
        test: /\.(css|scss|sass)$/,
        use: [
          isDevelopment ? 'style-loader' : MiniCssExtractPlugin.loader,
          {
            loader: 'css-loader',
            options: {
              modules: {
                auto: true, // Enable CSS modules for files with .module.css
                localIdentName: isDevelopment 
                  ? '[name]__[local]--[hash:base64:5]'
                  : '[hash:base64:8]'
              },
              sourceMap: isDevelopment
            }
          },
          {
            loader: 'postcss-loader',
            options: {
              postcssOptions: {
                plugins: [
                  ['autoprefixer'],
                  ['postcss-preset-env', { stage: 1 }]
                ]
              }
            }
          },
          'sass-loader'
        ]
      },
      
      // Images and assets
      {
        test: /\.(png|jpg|jpeg|gif|svg|ico)$/,
        type: 'asset/resource',
        generator: {
          filename: 'assets/images/[name][ext]'
        }
      },
      
      // Fonts
      {
        test: /\.(woff|woff2|eot|ttf|otf)$/,
        type: 'asset/resource',
        generator: {
          filename: 'assets/fonts/[name][ext]'
        }
      },
      
      // HTML files
      {
        test: /\.html$/,
        use: ['html-loader']
      },
      {
        test: /\.wasm$/,
        type: 'asset/resource',
      },
    ]
  },
  
  plugins: [
    // Clean dist folder
    new CleanWebpackPlugin(),
    
    // Copy static files
    new CopyWebpackPlugin({
      patterns: [
        // Copy manifest.json
        {
          from: 'extension/manifest.json',
          to: 'manifest.json'
        },
        
        // Copy popup HTML
        {
          from: 'extension/popup.html',
          to: 'popup.html'
        },
        
        // Copy content styles
        {
          from: 'extension/content/content-styles.css',
          to: 'content/content-styles.css'
        },
        
        // Copy icons
        {
          from: 'extension/icons',
          to: 'icons',
          noErrorOnMissing: true
        },
        
        // Copy any static assets
        {
          from: 'extension/assets',
          to: 'assets',
          noErrorOnMissing: true
        },
        
        // Copy Next.js build output
        {
          from: 'extension/sidebar/out',
          to: 'sidebar/out',
          noErrorOnMissing: true
        },
        // Copy sidebar HTML and JS files
        {
          from: 'extension/sidebar/public/index.html',
          to: 'sidebar/index.html',
          noErrorOnMissing: true
        },
        {
          from: 'extension/sidebar/public/index-with-agent.html',
          to: 'sidebar/index-with-agent.html',
          noErrorOnMissing: true
        },
        {
          from: 'extension/sidebar/public/chat.js',
          to: 'sidebar/chat.js',
          noErrorOnMissing: true
        },
        {
          from: 'extension/sidebar/public/agent.js',
          to: 'sidebar/agent.js',
          noErrorOnMissing: true
        },
        { 
          from: 'extension/userscripts', 
          to: 'userscripts',
          noErrorOnMissing: true 
        }
      ]
    }),
    
    // Extract CSS
    new MiniCssExtractPlugin({
      filename: 'content/[name].css',
      chunkFilename: 'content/[id].css'
    }),
    
    // Define environment variables
    new webpack.DefinePlugin({
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
      'process.env.EXTENSION_VERSION': JSON.stringify(process.env.npm_package_version || '1.0.0'),
      'process.env.CLAUDE_API_KEY': JSON.stringify(env.CLAUDE_API_KEY || ''),
              'process.env.CLAUDE_MODEL': JSON.stringify(env.CLAUDE_MODEL || 'claude-3-5-sonnet-20241022'),
      '__DEV__': isDevelopment
    }),
    
    // Bundle analyzer for production
    ...(process.env.ANALYZE ? [new (require('webpack-bundle-analyzer')).BundleAnalyzerPlugin()] : [])
  ],
  
  optimization: {
    minimize: isProduction,
    minimizer: [
      // JavaScript minification
      new (require('terser-webpack-plugin'))({
        terserOptions: {
          compress: {
            drop_console: isProduction,
            drop_debugger: isProduction
          },
          mangle: {
            safari10: true
          }
        }
      }),
      
      // CSS minification
      new (require('css-minimizer-webpack-plugin'))()
    ],
    
    splitChunks: {
      chunks: 'all',
      cacheGroups: {
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          chunks: 'all',
          enforce: true
        },
        shared: {
          name: 'shared',
          minChunks: 2,
          chunks: 'all',
          enforce: true
        }
      }
    }
  },
  
  // Chrome extension specific settings
  externals: {
    // Chrome APIs are provided by the browser
    'chrome': 'chrome'
  },
  
  // Development server (not used for extension, but useful for sidebar development)
  devServer: {
    static: {
      directory: path.join(__dirname, 'dist')
    },
    compress: true,
    port: 3001,
    hot: false, // HMR doesn't work well with extensions
    liveReload: false
  },
  
  // Performance hints
  performance: {
    hints: isProduction ? 'warning' : false,
    maxEntrypointSize: 512000,
    maxAssetSize: 512000
  },
  
  // Stats configuration
  stats: {
    colors: true,
    modules: false,
    chunks: false,
    chunkModules: false,
    chunkOrigins: false,
    assets: true,
    entrypoints: false
  }
}; 