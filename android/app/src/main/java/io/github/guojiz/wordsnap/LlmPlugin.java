package io.github.guojiz.wordsnap;

import android.app.ActivityManager;
import android.content.Context;
import android.os.Build;
import android.os.StatFs;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicBoolean;

/**
 * On-device model for Word Snap: Qwen3.5-4B (4-bit, MNN) from ModelScope.
 * download() fetches the files once (resumable) into the app's private storage;
 * load() starts the engine; generate() answers one chat request at a time.
 * The web side (js/ai-native.js) wraps this as the same engine shape as the API key.
 */
@CapacitorPlugin(name = "WordSnapLlm")
public class LlmPlugin extends Plugin {
    static final String MODEL_ID = "qwen3.5-4b-mnn";
    static final String REPO = "MNN/Qwen3.5-4B-MNN";
    static final String FILES_API = "https://modelscope.cn/api/v1/models/" + REPO + "/repo/files?Recursive=true";
    static final String FILE_URL = "https://modelscope.cn/models/" + REPO + "/resolve/master/";
    /** Files the engine does not need. */
    static final List<String> SKIP = Arrays.asList(".gitattributes", "README.md", "configuration.json", "export_args.json");
    static final long MIN_RAM_BYTES = 12L * 1000 * 1000 * 1000; // marketed "12 GB" phones report a little less than 12 GiB

    private final ExecutorService engineThread = Executors.newSingleThreadExecutor();
    private final ExecutorService downloadThread = Executors.newSingleThreadExecutor();
    private final AtomicBoolean downloading = new AtomicBoolean(false);
    private final AtomicBoolean stopDownload = new AtomicBoolean(false);
    private volatile long handle = 0;

    private File modelDir() {
        return new File(getContext().getFilesDir(), "models/" + MODEL_ID);
    }

    private File completeMarker() {
        return new File(modelDir(), ".complete");
    }

    @PluginMethod
    public void deviceInfo(PluginCall call) {
        ActivityManager am = (ActivityManager) getContext().getSystemService(Context.ACTIVITY_SERVICE);
        ActivityManager.MemoryInfo info = new ActivityManager.MemoryInfo();
        am.getMemoryInfo(info);
        StatFs stat = new StatFs(getContext().getFilesDir().getAbsolutePath());
        boolean arm64 = Arrays.asList(Build.SUPPORTED_ABIS).contains("arm64-v8a");
        JSObject out = new JSObject();
        out.put("totalRam", info.totalMem);
        out.put("freeStorage", stat.getAvailableBytes());
        out.put("arm64", arm64);
        out.put("native", arm64 && LlmNative.available());
        out.put("capable", arm64 && info.totalMem >= MIN_RAM_BYTES);
        out.put("model", MODEL_ID);
        call.resolve(out);
    }

    @PluginMethod
    public void status(PluginCall call) {
        JSObject out = new JSObject();
        out.put("downloaded", completeMarker().exists());
        out.put("downloading", downloading.get());
        out.put("loaded", handle != 0);
        out.put("bytes", dirSize(modelDir()));
        call.resolve(out);
    }

    /** Downloads every model file (resuming partial ones); emits "progress" { progress, bytes, total }. */
    @PluginMethod
    public void download(PluginCall call) {
        if (completeMarker().exists()) {
            call.resolve(new JSObject().put("ok", true));
            return;
        }
        if (!downloading.compareAndSet(false, true)) {
            call.reject("busy");
            return;
        }
        stopDownload.set(false);
        downloadThread.execute(() -> {
            try {
                List<String[]> files = fileList();
                long total = 0;
                for (String[] f : files) total += Long.parseLong(f[1]);
                File dir = modelDir();
                if (!dir.exists() && !dir.mkdirs()) throw new IOException("cannot create " + dir);
                long done = 0;
                for (String[] f : files) {
                    done = fetch(f[0], Long.parseLong(f[1]), dir, done, total);
                }
                try (OutputStream marker = new FileOutputStream(completeMarker())) {
                    marker.write(String.valueOf(total).getBytes(StandardCharsets.UTF_8));
                }
                call.resolve(new JSObject().put("ok", true));
            } catch (Exception error) {
                call.reject(stopDownload.get() ? "cancelled" : String.valueOf(error.getMessage()));
            } finally {
                downloading.set(false);
            }
        });
    }

    @PluginMethod
    public void cancelDownload(PluginCall call) {
        stopDownload.set(true);
        call.resolve();
    }

    /** [path, size] of the files to download, from ModelScope's file list. */
    private List<String[]> fileList() throws Exception {
        JSONObject json = new JSONObject(new String(get(FILES_API), StandardCharsets.UTF_8));
        JSONArray files = json.getJSONObject("Data").getJSONArray("Files");
        List<String[]> out = new ArrayList<>();
        for (int i = 0; i < files.length(); i++) {
            JSONObject f = files.getJSONObject(i);
            String path = f.getString("Path");
            if ("tree".equals(f.optString("Type")) || SKIP.contains(path)) continue;
            out.add(new String[] { path, String.valueOf(f.getLong("Size")) });
        }
        if (out.isEmpty()) throw new IOException("empty file list");
        return out;
    }

    private byte[] get(String url) throws IOException {
        HttpURLConnection conn = (HttpURLConnection) new URL(url).openConnection();
        conn.setConnectTimeout(20000);
        conn.setReadTimeout(30000);
        try (InputStream in = conn.getInputStream(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            byte[] buf = new byte[16384];
            int n;
            while ((n = in.read(buf)) > 0) out.write(buf, 0, n);
            return out.toByteArray();
        } finally {
            conn.disconnect();
        }
    }

    /** One file, resumed from a .part file when there is one. Returns bytes done overall. */
    private long fetch(String path, long size, File dir, long doneBefore, long total) throws IOException {
        File target = new File(dir, path);
        if (target.exists() && target.length() == size) {
            report(doneBefore + size, total);
            return doneBefore + size;
        }
        File parent = target.getParentFile();
        if (parent != null && !parent.exists() && !parent.mkdirs()) throw new IOException("cannot create " + parent);
        File part = new File(dir, path + ".part");
        long have = part.exists() ? part.length() : 0;
        if (have > size) {
            part.delete();
            have = 0;
        }
        if (have < size) {
            HttpURLConnection conn = (HttpURLConnection) new URL(FILE_URL + path).openConnection();
            conn.setConnectTimeout(20000);
            conn.setReadTimeout(60000);
            if (have > 0) conn.setRequestProperty("Range", "bytes=" + have + "-");
            int code = conn.getResponseCode();
            if (code == 200 && have > 0) have = 0; // server ignored the range: start over
            else if (code != 200 && code != 206) throw new IOException("HTTP " + code + " for " + path);
            try (InputStream in = conn.getInputStream(); OutputStream out = new FileOutputStream(part, have > 0)) {
                byte[] buf = new byte[1 << 16];
                int n;
                long lastReport = 0;
                while ((n = in.read(buf)) > 0) {
                    if (stopDownload.get()) throw new IOException("cancelled");
                    out.write(buf, 0, n);
                    have += n;
                    if (have - lastReport > (4 << 20)) {
                        lastReport = have;
                        report(doneBefore + have, total);
                    }
                }
            } finally {
                conn.disconnect();
            }
        }
        if (part.length() != size) throw new IOException("incomplete " + path);
        if (!part.renameTo(target)) throw new IOException("cannot rename " + path);
        report(doneBefore + size, total);
        return doneBefore + size;
    }

    private void report(long bytes, long total) {
        JSObject data = new JSObject();
        data.put("bytes", bytes);
        data.put("total", total);
        data.put("progress", total > 0 ? (double) bytes / total : 0);
        notifyListeners("progress", data);
    }

    @PluginMethod
    public void load(PluginCall call) {
        if (handle != 0) {
            call.resolve(new JSObject().put("ok", true));
            return;
        }
        if (!completeMarker().exists()) {
            call.reject("not downloaded");
            return;
        }
        if (!LlmNative.available()) {
            call.reject("native library unavailable");
            return;
        }
        engineThread.execute(() -> {
            try {
                JSONObject extra = new JSONObject();
                extra.put("backend_type", "cpu");
                extra.put("thread_num", 4);
                extra.put("precision", "low");
                extra.put("memory", "low");
                extra.put("sampler_type", "greedy"); // JSON answers: no sampling
                extra.put("max_new_tokens", 4096);
                extra.put("jinja", new JSONObject().put("context", new JSONObject().put("enable_thinking", false)));
                String config = new File(modelDir(), "config.json").getAbsolutePath();
                long created = LlmNative.create(config.getBytes(StandardCharsets.UTF_8), extra.toString().getBytes(StandardCharsets.UTF_8));
                if (created == 0) {
                    call.reject("load failed");
                    return;
                }
                handle = created;
                call.resolve(new JSObject().put("ok", true));
            } catch (Exception error) {
                call.reject(String.valueOf(error.getMessage()));
            }
        });
    }

    /** { messages: [{ role, content }], maxTokens } → { text } */
    @PluginMethod
    public void generate(PluginCall call) {
        JSArray messages = call.getArray("messages");
        int maxTokens = call.getInt("maxTokens", 400);
        if (messages == null) {
            call.reject("messages required");
            return;
        }
        engineThread.execute(() -> {
            long current = handle;
            if (current == 0) {
                call.reject("not loaded");
                return;
            }
            try {
                byte[][] roles = new byte[messages.length()][];
                byte[][] contents = new byte[messages.length()][];
                for (int i = 0; i < messages.length(); i++) {
                    JSONObject m = messages.getJSONObject(i);
                    roles[i] = m.optString("role", "user").getBytes(StandardCharsets.UTF_8);
                    contents[i] = m.optString("content", "").getBytes(StandardCharsets.UTF_8);
                }
                byte[] reply = LlmNative.generate(current, roles, contents, maxTokens);
                JSObject out = new JSObject();
                out.put("text", reply == null ? "" : new String(reply, StandardCharsets.UTF_8));
                call.resolve(out);
            } catch (Exception error) {
                call.reject(String.valueOf(error.getMessage()));
            }
        });
    }

    /** Stops the running generate() (it resolves with what it has so far). */
    @PluginMethod
    public void interrupt(PluginCall call) {
        long current = handle;
        if (current != 0) LlmNative.cancel(current);
        call.resolve();
    }

    @PluginMethod
    public void unload(PluginCall call) {
        long current = handle;
        if (current != 0) LlmNative.cancel(current);
        engineThread.execute(() -> {
            releaseEngine();
            call.resolve();
        });
    }

    @PluginMethod
    public void remove(PluginCall call) {
        stopDownload.set(true);
        long current = handle;
        if (current != 0) LlmNative.cancel(current);
        engineThread.execute(() -> {
            releaseEngine();
            deleteTree(modelDir());
            call.resolve(new JSObject().put("bytes", dirSize(modelDir())));
        });
    }

    private void releaseEngine() {
        long current = handle;
        handle = 0;
        if (current != 0) LlmNative.release(current);
    }

    @Override
    protected void handleOnDestroy() {
        releaseEngine();
        engineThread.shutdown();
        downloadThread.shutdownNow();
    }

    private static long dirSize(File f) {
        if (f == null || !f.exists()) return 0;
        if (f.isFile()) return f.length();
        long sum = 0;
        File[] children = f.listFiles();
        if (children != null) for (File c : children) sum += dirSize(c);
        return sum;
    }

    private static void deleteTree(File f) {
        if (f == null || !f.exists()) return;
        File[] children = f.listFiles();
        if (children != null) for (File c : children) deleteTree(c);
        f.delete();
    }
}
