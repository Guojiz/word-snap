package io.github.guojiz.wordsnap;

/** JNI bindings to app/src/main/cpp/llm_jni.cpp (MNN's LLM engine). Strings are UTF-8 bytes. */
final class LlmNative {
    private static Boolean available;

    private LlmNative() {}

    /** Loads the native library once; false on devices without it (e.g. not arm64). */
    static synchronized boolean available() {
        if (available == null) {
            try {
                System.loadLibrary("wordsnap_llm");
                available = true;
            } catch (Throwable error) {
                available = false;
            }
        }
        return available;
    }

    /** Creates and loads a model from its config.json; 0 on failure. */
    static native long create(byte[] configPath, byte[] extraConfigJson);

    /** One chat completion (blocking). Returns the reply text as UTF-8. */
    static native byte[] generate(long handle, byte[][] roles, byte[][] contents, int maxTokens);

    /** Stops a running generate() after the current token. */
    static native void cancel(long handle);

    static native void release(long handle);
}
