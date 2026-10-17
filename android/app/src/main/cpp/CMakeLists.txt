# JNI wrapper around MNN's LLM engine (prebuilt libllm.so) for the on-device model.
cmake_minimum_required(VERSION 3.22.1)
project(wordsnap_llm CXX)

set(CMAKE_CXX_STANDARD 17)
set(MNN_DIR ${CMAKE_SOURCE_DIR}/third_party/mnn)
set(MNN_LIBS ${CMAKE_SOURCE_DIR}/../jniLibs/${ANDROID_ABI})

add_library(wordsnap_llm SHARED llm_jni.cpp)
target_include_directories(wordsnap_llm PRIVATE ${MNN_DIR}/include)

foreach(name MNN MNN_Express llm)
  add_library(${name} SHARED IMPORTED)
  set_target_properties(${name} PROPERTIES IMPORTED_LOCATION ${MNN_LIBS}/lib${name}.so)
endforeach()

target_link_libraries(wordsnap_llm llm MNN_Express MNN log android)
# 16 KB pages (Android 15+ devices).
target_link_options(wordsnap_llm PRIVATE "-Wl,-z,max-page-size=16384")
