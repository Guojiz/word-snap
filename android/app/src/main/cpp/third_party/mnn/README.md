# MNN (prebuilt)

- Libraries in `app/src/main/jniLibs/arm64-v8a/` come unchanged from the MNN 3.6.1 release
  `mnn_3.6.1_android_armv7_armv8_cpu_opencl_vulkan.zip` (https://github.com/alibaba/MNN/releases/tag/3.6.1).
  They were built with NDK r27c (clang 18.0.3), the same NDK this app uses, so the app's
  `libc++_shared.so` matches.
- Headers in `include/` are `include/MNN/` and `transformers/llm/engine/include/llm/llm.hpp` from the same tag.
- License: Apache-2.0 (`LICENSE.txt`).
