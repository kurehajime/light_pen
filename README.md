# kiradeco_maker
異常にキラキラする画像をつくれるやつ(要HDR環境)

https://kurehajime.github.io/kiradeco_maker/


## UltraHDR セットアップ

このアプリは`libultrahdr-wasm`のビルド成果物を`public/ultrahdr`から読み込みます。

```
git clone https://github.com/MONOGRID/libultrahdr-wasm.git vendor/libultrahdr-wasm
make ultrahdr
npm install
```

`make ultrahdr`は`vendor/libultrahdr-wasm`で`libultrahdr-esm`のみビルドし、成果物を`public/ultrahdr`へコピーします。
アプリは`public/ultrahdr/libultrahdr-esm.js`を読み込むため、出力ファイル名が異なる場合は`src/ultrahdr.ts`と合わせて調整してください。
`emscripten`, `meson`, `ninja`が必要です。必要に応じて`Makefile`の`ULTRAHDR_BUILD_DIR`や`ULTRAHDR_BUILD_CMD`を変更できます。
Emscriptenのキャッシュは`vendor/libultrahdr-wasm/.emscripten_cache`へ作成します。

ネットワークに出られない環境では、以下を`vendor/libultrahdr-wasm/subprojects/packagecache`へ手動で配置してください。

- `libjpeg-turbo-3.0.0.tar.gz` (https://sourceforge.net/projects/libjpeg-turbo/files/3.0.0/libjpeg-turbo-3.0.0.tar.gz)
- `libjpeg-turbo_3.0.0-5_patch.zip` (https://wrapdb.mesonbuild.com/v2/libjpeg-turbo_3.0.0-5/get_patch)

### macOS (Homebrew)

```
brew install emscripten meson ninja
```
