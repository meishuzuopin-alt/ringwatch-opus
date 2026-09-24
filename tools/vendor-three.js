// 把 Three.js 与用到的后处理插件打包成一个经典脚本 vendor/three.min.js（全局变量 THREE）。
// 游戏本身没有构建步骤；只有升级 Three.js 版本时才需要重跑：node tools/vendor-three.js
const esbuild = require('esbuild');
const path = require('path');
const fs = require('fs');

const root = path.resolve(__dirname, '..');
const entry = `
export * from 'three';
export { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
export { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
export { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
export { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
export { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
export { FXAAShader } from 'three/addons/shaders/FXAAShader.js';
`;
const version = JSON.parse(fs.readFileSync(path.join(root, 'node_modules/three/package.json'), 'utf8')).version;
esbuild.build({
  stdin: { contents: entry, resolveDir: root, loader: 'js' },
  bundle: true, minify: true, format: 'iife', globalName: 'THREE', target: 'es2019',
  banner: { js: `/* three.js r${version.split('.')[1]} + postprocessing addons · MIT License · https://github.com/mrdoob/three.js */` },
  outfile: path.join(root, 'vendor/three.min.js')
}).then(() => {
  fs.copyFileSync(path.join(root, 'node_modules/three/LICENSE'), path.join(root, 'vendor/three.LICENSE'));
  const kb = fs.statSync(path.join(root, 'vendor/three.min.js')).size / 1024;
  console.log(`vendor/three.min.js  ${kb.toFixed(0)} KB  (three ${version})`);
}).catch(e => { console.error(e); process.exit(1); });
