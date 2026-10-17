// JNI bridge: io.github.guojiz.wordsnap.LlmNative ↔ MNN::Transformer::Llm.
// Strings cross as UTF-8 byte arrays (JNI's "modified UTF-8" mangles emoji).
// One generation at a time per session; cancel() stops it between tokens.
#include <jni.h>
#include <android/log.h>

#include <atomic>
#include <mutex>
#include <sstream>
#include <string>
#include <vector>

#include "llm/llm.hpp"

using MNN::Transformer::ChatMessages;
using MNN::Transformer::Llm;
using MNN::Transformer::LlmContext;
using MNN::Transformer::LlmStatus;

#define LOG_TAG "WordSnapLlm"
#define LOGE(...) __android_log_print(ANDROID_LOG_ERROR, LOG_TAG, __VA_ARGS__)

namespace {

struct Session {
    Llm* llm = nullptr;
    std::atomic<bool> cancel{false};
    std::mutex run;
};

std::string utf8(JNIEnv* env, jbyteArray bytes) {
    if (bytes == nullptr) return {};
    const jsize n = env->GetArrayLength(bytes);
    std::string out(static_cast<size_t>(n), '\0');
    if (n > 0) env->GetByteArrayRegion(bytes, 0, n, reinterpret_cast<jbyte*>(&out[0]));
    return out;
}

jbyteArray toBytes(JNIEnv* env, const std::string& s) {
    jbyteArray out = env->NewByteArray(static_cast<jsize>(s.size()));
    if (out != nullptr && !s.empty()) {
        env->SetByteArrayRegion(out, 0, static_cast<jsize>(s.size()), reinterpret_cast<const jbyte*>(s.data()));
    }
    return out;
}

// The prebuilt runtime marks every generate(1) step as finished; decoding one
// token at a time needs the status set back to running (as MNN's own Android app does).
void resumeStepping(Llm* llm) {
    auto* context = const_cast<LlmContext*>(llm->getContext());
    if (context == nullptr) return;
    if (context->status == LlmStatus::MAX_TOKENS_FINISHED || context->status == LlmStatus::NORMAL_FINISHED) {
        context->status = LlmStatus::RUNNING;
    }
}

bool failed(Llm* llm) {
    const auto* context = llm->getContext();
    if (context == nullptr) return true;
    return context->status == LlmStatus::INTERNAL_ERROR || context->status == LlmStatus::TIMEOUT ||
           context->status == LlmStatus::USER_CANCEL || context->status == LlmStatus::NOT_LOADED;
}

}  // namespace

extern "C" JNIEXPORT jlong JNICALL
Java_io_github_guojiz_wordsnap_LlmNative_create(JNIEnv* env, jclass, jbyteArray configPath, jbyteArray extraConfig) {
    const std::string path = utf8(env, configPath);
    Llm* llm = Llm::createLLM(path);
    if (llm == nullptr) {
        LOGE("createLLM failed: %s", path.c_str());
        return 0;
    }
    const std::string extra = utf8(env, extraConfig);
    if (!extra.empty()) llm->set_config(extra);
    if (!llm->load()) {
        LOGE("load failed: %s", path.c_str());
        Llm::destroy(llm);
        return 0;
    }
    auto* session = new Session();
    session->llm = llm;
    return reinterpret_cast<jlong>(session);
}

extern "C" JNIEXPORT jbyteArray JNICALL
Java_io_github_guojiz_wordsnap_LlmNative_generate(JNIEnv* env, jclass, jlong handle, jobjectArray roles,
                                                 jobjectArray contents, jint maxTokens) {
    auto* session = reinterpret_cast<Session*>(handle);
    if (session == nullptr || session->llm == nullptr) return nullptr;
    std::lock_guard<std::mutex> lock(session->run);
    session->cancel = false;

    ChatMessages messages;
    const jsize n = env->GetArrayLength(roles);
    for (jsize i = 0; i < n; i++) {
        auto role = static_cast<jbyteArray>(env->GetObjectArrayElement(roles, i));
        auto content = static_cast<jbyteArray>(env->GetObjectArrayElement(contents, i));
        messages.emplace_back(utf8(env, role), utf8(env, content));
        env->DeleteLocalRef(role);
        env->DeleteLocalRef(content);
    }

    Llm* llm = session->llm;
    std::ostringstream out;
    llm->reset();  // every request stands alone
    resumeStepping(llm);
    llm->response(messages, &out, "", 0);  // prefill only
    int produced = 0;
    while (!session->cancel.load() && produced < maxTokens && !llm->stoped()) {
        resumeStepping(llm);
        llm->generate(1);
        produced++;
        if (failed(llm)) break;
    }
    return toBytes(env, out.str());
}

extern "C" JNIEXPORT void JNICALL
Java_io_github_guojiz_wordsnap_LlmNative_cancel(JNIEnv*, jclass, jlong handle) {
    auto* session = reinterpret_cast<Session*>(handle);
    if (session != nullptr) session->cancel = true;
}

extern "C" JNIEXPORT void JNICALL
Java_io_github_guojiz_wordsnap_LlmNative_release(JNIEnv*, jclass, jlong handle) {
    auto* session = reinterpret_cast<Session*>(handle);
    if (session == nullptr) return;
    session->cancel = true;
    {
        std::lock_guard<std::mutex> lock(session->run);
        if (session->llm != nullptr) Llm::destroy(session->llm);
        session->llm = nullptr;
    }
    delete session;
}
